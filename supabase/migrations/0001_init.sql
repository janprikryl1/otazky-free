-- =====================================================================
--  Narozeninový kvíz – inicializační migrace
--  Spusť celý tento soubor v Supabase → SQL Editor.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- kvízy
create table if not exists public.quizzes (
  id          uuid primary key default gen_random_uuid(),
  title       text        not null,
  description text,
  created_at  timestamptz not null default now()
);

-- ------------------------------------------------------------- otázky
create table if not exists public.questions (
  id            uuid primary key default gen_random_uuid(),
  quiz_id       uuid        not null references public.quizzes (id) on delete cascade,
  position      integer     not null default 0,
  text          text        not null,
  time_limit    integer     not null default 20,
  options       text[]      not null,
  -- NULL = tvůrce kvízu ještě neoznačil správnou odpověď
  correct_index integer,
  created_at    timestamptz not null default now(),
  constraint questions_options_count check (
    array_length(options, 1) between 2 and 4
  ),
  constraint questions_time_limit check (time_limit between 5 and 300),
  constraint questions_correct_index check (
    correct_index is null
    or (correct_index >= 0 and correct_index < array_length(options, 1))
  )
);

create index if not exists questions_quiz_position_idx
  on public.questions (quiz_id, position);

-- --------------------------------------------------------- herní relace
create table if not exists public.game_sessions (
  id                     uuid primary key default gen_random_uuid(),
  quiz_id                uuid        not null references public.quizzes (id) on delete cascade,
  pin                    text        not null unique,
  -- lobby | question | reveal | finished
  status                 text        not null default 'lobby',
  current_question_index integer     not null default -1,
  question_started_at    timestamptz,
  question_ends_at       timestamptz,
  answers_received       integer     not null default 0,
  player_count           integer     not null default 0,
  created_at             timestamptz not null default now(),
  constraint game_sessions_status check (
    status in ('lobby', 'question', 'reveal', 'finished')
  ),
  constraint game_sessions_pin_format check (pin ~ '^[0-9]{6}$')
);

create index if not exists game_sessions_pin_idx on public.game_sessions (pin);

-- -------------------------------------------------------------- hráči
create table if not exists public.players (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid        not null references public.game_sessions (id) on delete cascade,
  nickname   text        not null,
  score      integer     not null default 0,
  joined_at  timestamptz not null default now(),
  constraint players_nickname_len check (
    char_length(btrim(nickname)) between 1 and 24
  )
);

-- přezdívka musí být v rámci jedné hry unikátní (bez ohledu na velikost písmen)
create unique index if not exists players_session_nickname_uniq
  on public.players (session_id, lower(btrim(nickname)));

create index if not exists players_session_score_idx
  on public.players (session_id, score desc);

-- ----------------------------------------------------------- odpovědi
create table if not exists public.answers (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid        not null references public.game_sessions (id) on delete cascade,
  question_id  uuid        not null references public.questions (id) on delete cascade,
  player_id    uuid        not null references public.players (id) on delete cascade,
  option_index integer     not null,
  is_correct   boolean     not null default false,
  points       integer     not null default 0,
  answered_at  timestamptz not null default now(),
  -- jeden hráč může u jedné otázky odpovědět pouze jednou
  constraint answers_unique_per_player unique (question_id, player_id)
);

create index if not exists answers_session_question_idx
  on public.answers (session_id, question_id);

-- =====================================================================
--  Triggery – počítadla pro živý panel moderátora
-- =====================================================================

create or replace function public.tg_answers_bump_counter()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.game_sessions
     set answers_received = answers_received + 1
   where id = new.session_id;
  return new;
end;
$$;

drop trigger if exists answers_bump_counter on public.answers;
create trigger answers_bump_counter
  after insert on public.answers
  for each row execute function public.tg_answers_bump_counter();

create or replace function public.tg_players_sync_counter()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.game_sessions
       set player_count = player_count + 1
     where id = new.session_id;
    return new;
  end if;

  update public.game_sessions
     set player_count = greatest(player_count - 1, 0)
   where id = old.session_id;
  return old;
end;
$$;

drop trigger if exists players_sync_counter on public.players;
create trigger players_sync_counter
  after insert or delete on public.players
  for each row execute function public.tg_players_sync_counter();

-- =====================================================================
--  Row Level Security
--
--  Veřejně (anon klíčem) jsou čitelné pouze stav hry a seznam hráčů –
--  to je potřeba pro Supabase Realtime na telefonech hráčů.
--  Otázky (a tedy správné odpovědi) veřejné NEJSOU; čtou se výhradně
--  serverem přes service-role klíč.
-- =====================================================================

alter table public.quizzes       enable row level security;
alter table public.questions     enable row level security;
alter table public.answers       enable row level security;
alter table public.game_sessions enable row level security;
alter table public.players       enable row level security;

drop policy if exists game_sessions_public_read on public.game_sessions;
create policy game_sessions_public_read
  on public.game_sessions for select
  to anon, authenticated
  using (true);

drop policy if exists players_public_read on public.players;
create policy players_public_read
  on public.players for select
  to anon, authenticated
  using (true);

-- ---------------------------------------------------------------------
--  Přístupová práva pro Data API
--
--  RLS sama o sobě nestačí – role ještě potřebuje GRANT na tabulku.
--  Zadáváme je výslovně, aby migrace fungovala bez ohledu na volbu
--  „Grant API access to new tables automatically“ při zakládání projektu.
-- ---------------------------------------------------------------------

grant usage on schema public to anon, authenticated, service_role;

-- server (service-role klíč) obsluhuje celou herní logiku
grant select, insert, update, delete on
  public.quizzes,
  public.questions,
  public.game_sessions,
  public.players,
  public.answers
  to service_role;

-- telefony hráčů smí číst jen stav hry a seznam hráčů (kvůli Realtime)
grant select on public.game_sessions to anon, authenticated;
grant select on public.players       to anon, authenticated;

-- =====================================================================
--  Realtime – publikace tabulek, které klienti odebírají
-- =====================================================================

do $$
begin
  begin
    alter publication supabase_realtime add table public.game_sessions;
  exception
    when duplicate_object then null;
    when undefined_object then
      raise notice 'Publikace supabase_realtime neexistuje – zapni Realtime v Supabase.';
    when insufficient_privilege then
      raise notice 'Na publikaci supabase_realtime chybí práva – přidej tabulky ručně v Database → Replication.';
  end;

  begin
    alter publication supabase_realtime add table public.players;
  exception
    when duplicate_object then null;
    when undefined_object then null;
    when insufficient_privilege then null;
  end;
end;
$$;

-- kompletní řádek i u mazání (ať moderátor vidí odchody hráčů)
alter table public.players replica identity full;

-- =====================================================================
--  Hromadné připsání bodů po uzavření otázky
--  (volá se ze serveru jednou, při přechodu otázka → vyhodnocení)
-- =====================================================================

create or replace function public.apply_question_scores(
  p_session_id uuid,
  p_question_id uuid
)
returns void
language sql
security definer
set search_path = public
as $$
  update public.players p
     set score = p.score + a.points
    from public.answers a
   where a.player_id   = p.id
     and a.session_id  = p_session_id
     and a.question_id = p_question_id
     and a.points > 0;
$$;

revoke all on function public.apply_question_scores(uuid, uuid) from public, anon, authenticated;
