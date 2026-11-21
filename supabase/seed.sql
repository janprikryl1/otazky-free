-- =====================================================================
--  Seed: kvíz "Velký kvíz o Josefovi" (20 otázek)
--
--  Spusť v Supabase → SQL Editor AŽ PO migraci 0001_init.sql.
--  Skript je idempotentní – při opakovaném spuštění kvíz přepíše
--  (včetně smazání jeho otázek a běžících her).
--
--  U otázek, kde zadání neurčilo správnou odpověď, je correct_index
--  ponechán jako NULL – doplň ho v administraci (/admin).
-- =====================================================================

begin;

delete from public.quizzes where title = 'Velký kvíz o Josefovi';

with novy_kviz as (
  insert into public.quizzes (title, description)
  values (
    'Velký kvíz o Josefovi',
    'Slavnostní narozeninový kvíz – 20 otázek o oslavenci.'
  )
  returning id
)
insert into public.questions (quiz_id, position, text, time_limit, options, correct_index)
select novy_kviz.id, v.position, v.text, v.time_limit, v.options, v.correct_index
from novy_kviz,
  (
    values
      (1, 'Kolik má Josef dnes let?', 20,
       array['58', '59', '60', '61'], null::integer),

      (2, 'Kolik Josef vážil, když se narodil?', 20,
       array['3,20 kg', '3,55 kg', '3,80 kg', '4,10 kg'], null::integer),

      (3, 'Co Josef nemá rád na jídlo?', 20,
       array['Fazole na smetaně', 'Svíčková na smetaně', 'Koprová omáčka', 'Rajská omáčka'], 0),

      (4, 'Kdo Josefa přinesl na svět?', 20,
       array['Mikuláš', 'Anděl', 'Čert', 'Maruška Přikrylová'], 3),

      (5, 'Jaké oslovení Josef nemá rád?', 20,
       array['Pepa', 'Josef', 'Ty vole', 'Jožínek'], null::integer),

      (6, 'Kolik let pracuje v DT?', 20,
       array['32', '30', '18', '34'], null::integer),

      (7, 'Čeho si nejvíc váží?', 20,
       array['Peníze', 'Rodina', 'Zdraví', 'Klid a pohoda'], null::integer),

      (8, 'Co Josefa dokáže nejvíc nasrat?', 30,
       array['Když Pluto pochčyje bránu', 'Když se doma zbytečně svítí', 'Když Verunka dlouho telefonuje', 'Změna času'], null::integer),

      (9, 'Co patří k Josefovým největším koníčkům?', 20,
       array['Četba knih', 'Chození po horách', 'Nákupy', 'Malování'], null::integer),

      (10, 'Kde Josef ztratil občanský průkaz?', 20,
       array['Při odletu na letišti', 'Na záchodě', 'V kostele', 'Doma'], null::integer),

      (11, 'Kolikáté výročí spolu s Verunkou letos oslavili?', 20,
       array['18', '15', '20', '25'], null::integer),

      (12, 'Z čeho má Josef trauma?', 30,
       array['Když má hovořit před lidmi', 'Zabíjačky', 'Odběr krve', 'Vstávání'], null::integer),

      (13, 'Kolik stál dům, který koupili?', 20,
       array['620 000 Kč', '480 000 Kč', '750 000 Kč', '890 000 Kč'], 0),

      (14, 'Co bylo Josefovo první auto?', 20,
       array['Trabant', 'Škoda 105', 'Lada / Žiguli', 'Wartburg'], 0),

      (15, 'Co má Josef rád na své ženě?', 30,
       array['Jak mu pomáhá se rozhodovat', 'Jak dobře vaří', 'Humor', 'Všechno dohromady'], null::integer),

      (16, 'Na co je Josef ve svém životě nejvíc hrdý?', 30,
       array['Na syny Honzu a Vaška', 'Na svoje elektrikářské schopnosti', 'Na svoji rozvážnost', 'Na motocykl'], null::integer),

      (17, 'Kolik dní šli z letiště do Santiago de Compostela?', 20,
       array['14', '10', '12', '16'], 0),

      (18, 'Kdo je Josefův životní vzor?', 20,
       array['Jeho otec', 'Andrej Babiš', 'Papež František', 'Lenochod'], null::integer),

      (19, 'Kde požádal Josef o ruku svou ženu?', 20,
       array['Ve Vatikánu', 'Na Sněžce', 'U rybníka', 'V katedrále'], null::integer),

      (20, 'Kolik přibral Josef od léta?', 20,
       array['Žádné (0 kg)', '-2 kg', '0,5 kg', '4 kg'], null::integer)
  ) as v (position, text, time_limit, options, correct_index);

commit;

-- Kontrola: kolik otázek ještě nemá označenou správnou odpověď
select
  q.position as "pořadí",
  q.text     as "otázka"
from public.questions q
join public.quizzes z on z.id = q.quiz_id
where z.title = 'Velký kvíz o Josefovi'
  and q.correct_index is null
order by q.position;
