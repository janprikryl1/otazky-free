# 🎉 Narozeninový kvíz

Živý kvíz ve stylu Kahootu pro desítky hostů najednou. Moderátor promítá hru na
televizi nebo projektor, hosté se připojí mobilem přes QR kód nebo PIN a soutěží
o první místo.

Postaveno na **Next.js 16 (App Router)**, **TypeScriptu**, **Tailwindu v4**,
komponentách ve stylu **shadcn/ui** a **Supabase** (PostgreSQL + Realtime).
Aplikace je bezstavová – běží na **Vercelu** bez vlastního Node.js serveru.

---

## Obsah

1. [Jak to funguje](#jak-to-funguje)
2. [Krok 1 – Založení Supabase projektu](#krok-1--založení-supabase-projektu)
3. [Krok 2 – Vytvoření databáze](#krok-2--vytvoření-databáze)
4. [Krok 3 – Naplnění kvízu o Josefovi](#krok-3--naplnění-kvízu-o-josefovi)
5. [Krok 4 – Proměnné prostředí](#krok-4--proměnné-prostředí)
6. [Krok 5 – Spuštění lokálně](#krok-5--spuštění-lokálně)
7. [Krok 6 – Nasazení na Vercel](#krok-6--nasazení-na-vercel)
8. [Jak hru odmoderovat](#jak-hru-odmoderovat)
9. [Bodování](#bodování)
10. [Testy](#testy)
11. [Technické poznámky](#technické-poznámky)
12. [Řešení problémů](#řešení-problémů)

---

## Jak to funguje

| Obrazovka | Adresa | K čemu slouží |
| --- | --- | --- |
| Přihlášení hráče | `/` | Hráč zadá PIN hry |
| Hráčská hra | `/play/[pin]` | Přezdívka, odpovídání, vyhodnocení, výsledky |
| Moderátorská část | `/admin` | Přehled kvízů, editor otázek |
| Editor kvízu | `/admin/quizzes/[quizId]` | Přidání, úprava, mazání a přeřazení otázek |
| Ovládací panel živé hry | `/admin/play/[sessionId]` | QR kód, PIN, odpočet, vyhodnocení, pódium |

Hra má čtyři fáze, které se **okamžitě** propisují na všechna zařízení přes
Supabase Realtime:

1. **Čekárna** – velký QR kód a PIN, jména hráčů naskakují živě.
2. **Otázka** – odpočet času a počítadlo „Odpovědělo: 14 / 22 hráčů“.
3. **Vyhodnocení** – správná odpověď, sloupcový graf hlasů a průběžná tabulka.
   Hráč zároveň na telefonu vidí zelenou nebo červenou kartu a získané body.
4. **Vyhlášení** – pódium pro 1.–3. místo s konfetami a kompletní žebříček.

---

## Krok 1 – Založení Supabase projektu

1. Jdi na [supabase.com](https://supabase.com) a přihlas se (stačí free tarif).
2. Klikni na **New project** a vyplň formulář:

   | Políčko | Co nastavit |
   | --- | --- |
   | **Organization** | tvoje organizace (free tarif stačí) |
   | **GitHub (optional)** | nech **nepřipojené** – schéma pouštíme ručně v SQL editoru, integrace by chtěla navíc `supabase/config.toml` a CLI projekt |
   | **Project name** | třeba `narozeninovy-kviz` |
   | **Database password** | vygeneruj silné a ulož do správce hesel (aplikace ho nepotřebuje, hodí se jen pro přímý přístup k Postgresu) |
   | **Region** | **Central EU (Frankfurt)** kvůli nízké odezvě z Česka |
   | **Enable Data API** | ✅ **zapnuto** – bez něj se aplikace k databázi vůbec nedostane |
   | **Grant API access to new tables automatically** | ✅ zapni; migrace si práva nastavuje i sama, takže projde i bez toho |
   | **Enable RLS on new tables automatically** | ✅ zapni – bezpečnější výchozí stav, migrace RLS stejně zapíná u všech tabulek |

3. Počkej 1–2 minuty, než se projekt vytvoří.

---

## Krok 2 – Vytvoření databáze

1. V Supabase otevři vlevo **SQL Editor** → **New query**.
2. Zkopíruj celý obsah souboru
   [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql)
   a vlož ho do editoru.
3. Klikni na **Run**. Skript vytvoří tabulky `quizzes`, `questions`,
   `game_sessions`, `players` a `answers`, nastaví Row Level Security
   a zapne Realtime.

> Skript je možné spustit opakovaně – nic nepřepíše.

---

## Krok 3 – Naplnění kvízu o Josefovi

1. Znovu **SQL Editor** → **New query**.
2. Vlož obsah souboru [`supabase/seed.sql`](supabase/seed.sql) a spusť ho.
3. Do databáze se vloží kvíz **„Velký kvíz o Josefovi“** s 20 otázkami.

U otázek, kde zadání neurčilo správnou odpověď, zůstane `correct_index`
prázdný. Výpis takových otázek skript vypíše na konci. **Správné odpovědi
doplň v administraci** (`/admin` → *Upravit*) – dokud nejsou vyplněné u všech
otázek, hra se nedá spustit a aplikace ti napíše, které otázky chybí.

---

## Krok 4 – Proměnné prostředí

V Supabase otevři **Project Settings → API** a zkopíruj si tři hodnoty.
Pak v projektu vytvoř soubor `.env.local`:

```powershell
Copy-Item .env.example .env.local
```

A vyplň ho:

| Proměnná | Kde ji vzít | Poznámka |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API → *Project URL* | např. `https://abcdefgh.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API → *anon public* (nebo *Publishable key*) | veřejný klíč, jde do prohlížeče |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API → *service_role* (nebo *Secret key*) | **tajný!** jen na serveru |
| `ADMIN_PASSWORD` | vymyslíš sám | heslo do `/admin` |

> **Nové projekty mají klíče jinak pojmenované.** Supabase přešel z dvojice
> `anon` / `service_role` (dlouhé JWT začínající `eyJ…`) na
> *Publishable key* (`sb_publishable_…`) a *Secret key* (`sb_secret_…`).
> Aplikace funguje s obojím – důležité je, že do `NEXT_PUBLIC_…` patří ten
> veřejný a do `SUPABASE_SERVICE_ROLE_KEY` ten tajný.

> **Proč i `service_role` klíč?**
> Zadání počítalo jen se třemi proměnnými, ale s pouhým `anon` klíčem by si
> kdokoli z hostů mohl v prohlížeči stáhnout tabulku otázek **včetně správných
> odpovědí**. Proto otázky čte výhradně server pomocí `service_role` klíče
> a telefony hráčů dostanou jen text otázky a možnosti. Správná odpověď se
> k hráči dostane až ve fázi vyhodnocení.
>
> Klíč `service_role` nikdy nedávej do proměnné s prefixem `NEXT_PUBLIC_`
> a necommituj ho – soubor `.env.local` je v `.gitignore`.

---

## Krok 5 – Spuštění lokálně

```powershell
pnpm install
```

```powershell
pnpm dev
```

Otevři [http://localhost:3000](http://localhost:3000). Moderátorská část je na
[http://localhost:3000/admin](http://localhost:3000/admin).

Chceš-li si hru vyzkoušet z telefonu ve stejné Wi-Fi, použij síťovou adresu,
kterou `pnpm dev` vypíše (např. `http://10.0.0.90:3000`) – QR kód se vygeneruje
podle adresy, ze které je otevřený ovládací panel.

Další příkazy:

```powershell
pnpm build
```

```powershell
pnpm lint
```

```powershell
pnpm test
```

---

## Krok 6 – Nasazení na Vercel

1. Nahraj projekt na GitHub.
2. Na [vercel.com](https://vercel.com) klikni **Add New → Project** a vyber
   repozitář. Framework **Next.js** se detekuje sám, nic nenastavuj.
3. V sekci **Environment Variables** přidej všechny čtyři proměnné z kroku 4
   (pro prostředí *Production*, *Preview* i *Development*):

   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_PASSWORD`

4. Klikni **Deploy**.
5. Po nasazení otevři `https://tvoje-adresa.vercel.app/admin`, přihlas se
   heslem a spusť hru.

> Při změně proměnných na Vercelu je potřeba projekt **znovu nasadit**
> (Deployments → … → Redeploy), jinak se nové hodnoty neprojeví.

---

## Jak hru odmoderovat

1. Přihlas se na `/admin`.
2. U kvízu klikni na **Spustit živou hru** – vytvoří se nová hra s PINem.
3. Otevřený ovládací panel promítni na televizi nebo projektor.
4. Hosté naskenují QR kód (nebo zadají PIN na úvodní stránce), napíšou
   přezdívku a kliknou na **Vstoupit do hry**. Jejich jména ti naskáčou
   do seznamu.
5. Až jsou všichni, klikni na **Spustit kvíz**.
6. Během otázky vidíš odpočet a kolik lidí už odpovědělo. Můžeš počkat na
   vypršení času, nebo hlasování uzavřít tlačítkem **Ukončit otázku hned**.
7. Po vyhodnocení pokračuj tlačítkem **Další otázka**. U poslední otázky se
   tlačítko změní na **Vyhlásit výsledky**.
8. Na závěr se zobrazí pódium s konfetami.

**Dobré vědět:**

- Zavřel jsi omylem okno moderátora? Na `/admin` najdeš sekci *Rozehrané hry*
  a vrátíš se zpátky.
- Hráči, kterému se uspal telefon nebo obnovil stránku, se hra sama vrátí
  do aktuálního stavu i s dosavadními body (ukládá se do `localStorage`).
- Kdyby moderátorovi spadla obrazovka uprostřed otázky, server otázku po
  vypršení limitu uzavře sám, aby hráči nezůstali viset.
- Tlačítko **Ukončit hru** v hlavičce panelu hru předčasně ukončí a rovnou
  vyhlásí výsledky.

---

## Bodování

| Situace | Body |
| --- | --- |
| Správná odpověď | **500** základ |
| Rychlostní bonus | až **+500** podle toho, kolik času zbývalo |
| Špatná odpověď | 0 |
| Žádná odpověď | 0 |

Odpověď hned na začátku odpočtu tedy vynese skoro 1 000 bodů, odpověď
na poslední chvíli přibližně 500. Body se připisují až ve chvíli, kdy se
otázka uzavře – hráč si tak z vlastního skóre nemůže dopředu odvodit,
jestli odpověděl správně.

---

## Testy

Herní logika a všechny API endpointy mají automatické testy (Vitest).
Spustí se bez Supabase – databáze je v testech nahrazená věrnou pamětovou
atrapou, která hlídá i unikátní indexy a triggery z migrace.

```powershell
pnpm test
```

```powershell
pnpm test:watch
```

Co je pokryté:

| Oblast | Co se ověřuje |
| --- | --- |
| Bodování | základ i rychlostní bonus, nula za špatnou odpověď, odolnost proti rozcházejícím se hodinám |
| Žebříček | řazení, shodné pořadí při rovnosti bodů, přednost dřívějšího příchodu |
| Průběh hry | čekárna → otázka → vyhodnocení → vyhlášení, limity jednotlivých otázek, předčasné ukončení |
| Připisování bodů | body až při vyhodnocení, žádné dvojí připsání ani při opakovaném či souběžném kliknutí |
| Připojení hráče | očista přezdívky, unikátnost v rámci hry, odmítnutí dohrané hry |
| Odpovídání | jedna odpověď na otázku, uzavření po čase, tolerance zpoždění sítě, možnost mimo rozsah |
| Utajení odpovědí | odpověď serveru hráči během otázky neobsahuje správnou možnost ani nepřímo |
| Přihlášení | heslo se neukládá do cookie v čitelné podobě, padělaná cookie neprojde |
| Ochrana API | všech 13 admin endpointů vrací bez přihlášení 401 a data nechá beze změny |
| Vstupy | neplatná UUID, nečitelné JSON, příliš velké tělo, duplicitní možnosti, rozsah časového limitu |
| Chybové hlášky | technické detaily zůstávají v logu, ven jde česká hláška bez vnitřností serveru |

---

## Technické poznámky

### Architektura

```
Telefon hráče ──┐                        ┌── Supabase PostgreSQL
                ├── Next.js (Vercel) ────┤
Panel moderátora┘      route handlery    └── Supabase Realtime
```

- **Veškerá herní logika běží na serveru** v route handlerech pod `/api`.
  Prohlížeč nikdy nepočítá body ani nerozhoduje o fázi hry.
- **Supabase Realtime** přenáší jen změny řádku hry (`game_sessions`) a seznam
  hráčů (`players`). Jakmile klient dostane signál, dotáhne si detail přes
  `/api`. Díky tomu se k hráčům nikdy nedostanou správné odpovědi.
- Jako pojistka proti výpadku WebSocketu běží záložní dotazování
  (hráči po 6 s, moderátor po 4 s) a obnova při probuzení telefonu.
- Žádný vlastní Socket.io server – vše je serverless, tedy kompatibilní
  s Vercelem.

### Row Level Security

| Tabulka | Veřejné čtení (anon klíč) |
| --- | --- |
| `game_sessions` | ✅ stav hry (neobsahuje nic tajného) |
| `players` | ✅ přezdívky a skóre |
| `quizzes`, `questions`, `answers` | ❌ pouze server přes `service_role` |

### Struktura projektu

```
src/
├─ app/
│  ├─ page.tsx                       úvodní stránka s PINem
│  ├─ play/[pin]/                    hráčské rozhraní
│  ├─ admin/                         moderátorská část
│  │  ├─ quizzes/[quizId]/           editor kvízu
│  │  └─ play/[sessionId]/           ovládací panel živé hry
│  └─ api/                           route handlery (herní logika)
├─ components/
│  ├─ ui/                            komponenty ve stylu shadcn/ui
│  └─ game/                          odpočet, graf hlasů, žebříček, pódium
├─ hooks/                            Realtime a odpočet
├─ lib/                              typy, bodování, Supabase klienti
├─ server/                           dotazy, fáze hry, validace
└─ test/                             pamětová atrapa Supabase pro testy
supabase/
├─ migrations/0001_init.sql          schéma, triggery, RLS, Realtime
└─ seed.sql                          kvíz o Josefovi (20 otázek)
```

### Komponenty shadcn/ui

Projekt používá Tailwind v4 bez PostCSS (`@tailwindcss/turbopack`), kde CLI
`shadcn` zatím neumí inicializaci. Komponenty v `src/components/ui/` proto
vznikly ručně, ale drží se konvencí shadcn/ui (`new-york`, Radix primitiva,
`cva`, helper `cn`, `data-slot` atributy) a soubor `components.json` je
připravený, takže `pnpm dlx shadcn@latest add <komponenta>` lze použít
pro doplnění dalších.

---

## Řešení problémů

| Hláška / problém | Co s tím |
| --- | --- |
| *„Nepodařilo se spojit s databází Supabase“* | Chybí nebo je špatně `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`. Po změně `.env.local` restartuj `pnpm dev`, na Vercelu projekt znovu nasaď. |
| *„V databázi chybí tabulky kvízu“* | Nebyl spuštěn `supabase/migrations/0001_init.sql`. |
| *„U těchto otázek není označená správná odpověď“* | Otevři editor kvízu a u vypsaných otázek zaškrtni správnou možnost. |
| *„Chybí proměnná prostředí ADMIN_PASSWORD“* | Doplň ji do `.env.local`, resp. do nastavení Vercelu. |
| Jména hráčů nenaskakují živě | V Supabase → **Database → Replication** ověř, že publikace `supabase_realtime` obsahuje tabulky `game_sessions` a `players`. Migrace je tam přidává automaticky. |
| *„Tuhle přezdívku už někdo používá“* | Přezdívky musí být v rámci jedné hry unikátní – stačí zvolit jinou. |
| *„Identifikátor … má neplatný formát“* | V adrese je poškozené id. Vrať se na `/admin` a otevři kvíz nebo hru znovu. |
| *„Odeslaná data jsou příliš velká“* | Zkrať text otázky nebo možností – limit těla požadavku je 64 kB. |
| *„Možnost … je v otázce dvakrát“* | Dvě možnosti mají stejný text. Hlasy by pak nešly rozlišit, uprav jednu z nich. |
| Moderátora to vyhodilo na přihlášení | Přihlášení platí 12 hodin. Zadej heslo znovu, rozehraná hra zůstává i s body. |
| Hra zamrzla na jedné otázce | Obnov stránku panelu moderátora. Po vypršení limitu se otázka uzavře sama. |
