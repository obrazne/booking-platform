# Booking platform

Rezervačná platforma pre ubytovateľov („krabica“): jedna aplikácia pre všetkých klientov, balíky ako vypínače modulov,
riadiace centrum pre Martina. Stack: **Next.js + Supabase + Vercel**, GitHub `obrazne/booking-platform`.
Prvý ostrý klient: **Chalet STRÖMY** (Jana Hladká). Predchodca na WordPresse (`obrazne/booking-demo`) je od 16. 10. 2026 zmrazený.

## Zdroj pravdy a postup práce — PREČÍTAJ AKO PRVÉ

Projekt má štyri riadiace súbory. Sú jediným zdrojom pravdy; nič iné (Notion, Projekt v claude.ai, staré chaty) neplatí,
ak to tu nie je zapísané.

| Súbor | Obsah | Smieš meniť? |
|---|---|---|
| `ARCHITEKTURA.md` | ČO staviame — princípy, dátový model, moduly, toky | **Nie**, len na výslovný pokyn Martina |
| `ROADMAP.md` | Fázy, úlohy, aktuálny stav, otázky, denník | Áno — odškrtávať, Denník, Otázky |
| `ROZHODNUTIA.md` | Prečo sa čo rozhodlo | **Nie**, len na výslovný pokyn Martina |
| `CLAUDE.md` | Tento súbor — pravidlá, prístupy, mapa kódu | Áno — dopĺňať mapu kódu a prístupy |

Rozhodnutia a návrh vznikajú v Claude chate s Martinom (úlohy 🧠). Claude Code robí fyzickú prácu (úlohy 🔧).

**Dvaja zapisovatelia, jeden repozitár.** Claude chat posiela zmeny priamo na GitHub (vetva `main`), nie na disk.
Lokálna kópia preto môže byť pozadu — vždy najprv stiahni.

| Kto | Čo mení |
|---|---|
| Claude chat | `ARCHITEKTURA.md`, `ROZHODNUTIA.md`, v `ROADMAP.md` úlohy 🧠, nové úlohy, sekcie *Aktuálne* a *Zadanie pre Claude Code*; `.claude/commands/`; `docs/` podklady |
| Claude Code | v `ROADMAP.md` odškrtáva úlohy 🔧, píše *Denník* a *Otázky pre Martina*; `CLAUDE.md` (mapa kódu, prístupy); kód aplikácie; `docs/` výstupy úloh |

**Martin ti pokyny z chatu nekopíruje.** Claude chat ich zapisuje do `ROADMAP.md` → *Zadanie pre Claude Code*.
Príkaz **`/dalej`** (`.claude/commands/dalej.md`) stiahne novinky a pokračuje ďalšou úlohou.

**Pred každou novou požiadavkou od Martina** (nielen na začiatku session):
0. `git pull --rebase`. Ak zlyhá kvôli lokálnym zmenám, ukáž Martinovi `git status` a nič nezahadzuj bez jeho súhlasu.
   Ak sa stiahnutím zmenil `CLAUDE.md`, prečítaj ho znova.
1. Prečítaj `ROADMAP.md` — *Aktuálne*, *Zadanie pre Claude Code* a ďalšiu otvorenú úlohu 🔧.
2. Pred prácou na kóde si prečítaj relevantnú kapitolu `ARCHITEKTURA.md`.

**Počas práce:**
- Rob len to, čo je v úlohe. Nové požiadavky nevymýšľaj.
- Ak narazíš na rozhodnutie, ktoré nie je v architektúre, alebo na rozpor, **zastav**, zapíš to do *Otázky pre Martina* a povedz mu to.
- **Ozvi sa skôr, nie po dvoch hodinách.** Ak sa niečo nedarí ani po 2 pokusoch alebo zhruba do 30 minút, zastav,
  napíš Martinovi krátko čo nejde, prečo a 1–2 možnosti s odporúčaním. Medzitým pokračuj v častiach, ktoré na tom nezávisia.

**Režim práce — za sebou bez prerušenia** (Martin 16. 10.: „nech robí viacero fáz za sebou, nech sa ma nepýta na každú vec“).
Úlohy z fronty rob jednu za druhou, kým nie je fronta prázdna. Technické detaily rozhoduj sám rozumne podľa `ARCHITEKTURA.md`,
zapíš ich do *Denníka* (čo a prečo) a pokračuj. Neblokujúce otázky zapíš do *Otázky pre Martina* a pracuj ďalej.
**Zastav a opýtaj sa Martina len vtedy, keď:**
- by si mazal alebo nevratne menil dáta, ktoré nie sú testovacie,
- ide o nasadenie do produkcie alebo o reálne dáta klienta či hostí,
- niečo stojí peniaze (platený plán, nová platená služba),
- ide o právne texty, osobné údaje alebo by sa oslabila bezpečnosť (RLS, kľúče),
- riešenie by bolo v rozpore s `ARCHITEKTURA.md` alebo by menilo to, čo uvidí klient (mimo už dohodnutého),
- si zaseknutý (2 pokusy / ~30 minút) a nedá sa to obísť ani odložiť.
Po každej dokončenej úlohe commit a push, aby Claude chat videl priebeh.

**Po dokončení úlohy:**
1. Odškrtni ju v `ROADMAP.md` (`- [x]`) a aktualizuj sekciu *Aktuálne*.
2. Pridaj riadok do *Denníka* (najnovšie hore): `RRRR-MM-DD — čo sa spravilo a kde (Claude Code)`.
3. `git pull --rebase`, potom commit (správa po slovensky, stručne čo a prečo) a `git push`.

## Pravidlá kódu (platia od prvého riadku — podrobnosti v `ARCHITEKTURA.md`)

- **Kód, databáza a názvy v angličtine, rozhranie cez preklady** (slovenčina pri štarte, ďalšie jazyky bez prestavby).
  Žiadne natvrdo zapísané texty v komponentoch.
- **Každá tabuľka s dátami klienta má `tenant_id`** a oddelenie klientov vynucuje databáza (RLS). Nikdy žiadny dotaz naprieč klientmi
  mimo riadiaceho centra. Oddelenie sa testuje automaticky.
- **Peniaze v centoch (celé čísla) s menou pri sume.** Cena sa pri rezervácii zamrazí; vystavené doklady sa nemenia.
- **Jadro nevie o moduloch.** Moduly sa napájajú cez definované miesta (výpočet ceny, udalosti rezervácie, miesta v rozhraní)
  a zapínajú sa per klient v databáze. Nikdy nekopírovať kód pre jedného klienta.
- **Úpravy databázy len pridávajú** (migrácie verzované v repozitári, nič nemažú ani neprepisujú bez odsúhlasenia).
- **Nikdy necommituj** `.env`, kľúče, heslá, tokeny ani výpisy databázy. Do dokumentov píš len názvy premenných, nie hodnoty.
- Do repozitára nepatria osobné údaje hostí ani prístupové kódy objektov (Wi-Fi, dvere).

## Prostredia a účty

Všetky účty sú na Obrazne s.r.o. (GitHub `obrazne`, Supabase účet info@obrazne.sk, Vercel). Počas vývoja stačia bezplatné plány;
pred spustením prvého platiaceho klienta sa prechádza na platené. Prostredia: lokálne → staging → produkcia (dva Supabase projekty).
| Prostredie | Kde | Poznámka |
|---|---|---|
| Lokálne | `npm run dev` → http://ukazka.localhost:3000, http://stromy.localhost:3000 | Docker na Martinovom PC nie je → lokálna databáza nebeží, aplikácia sa pripája na staging |
| Staging DB | Supabase `booking-platform-staging` (ref `uzsuwokyiprkzfirvrmb`, Frankfurt), organizácia Obrazne sro | bezplatný plán; limit 2 aktívne projekty → `credit-manager-dev` pozastavený (Martin 16. 10.) |
| Staging app | Vercel projekt `booking-platform` (tím obrazne): https://booking-platform-obrazne.vercel.app — za prihlásením do Vercelu (Deployment Protection) | `main` → staging, vetvy → náhľady; premenné `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Hostname je priradený Ukážkovému klientovi. Vercel ani Supabase CLI sa z Martinovho PC neprihlásia (sieťová chyba) — Vercel sa napojil cez web, DB cez Supabase MCP |
| Produkcia | zatiaľ nie | |

**Spustenie lokálne:** `npm install` (pri chybe `EALLOWSCRIPTS` dočasne `NPM_CONFIG_USERCONFIG=<prázdny súbor>` — Martinov globálny npm
má `allow-scripts`), skopírovať `.env.example` → `.env.local` a doplniť URL a publishable kľúč stagingu (Supabase → Project Settings → API),
`npm run dev`. Kontroly: `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test`.

**Databáza:** migrácie v `supabase/migrations/` (len pridávajú), testy RLS v `supabase/tests/database/` (pgTAP) — spúšťa ich CI
(`supabase db start` + `supabase test db` v GitHub Actions). Na staging: `npx supabase link --project-ref uzsuwokyiprkzfirvrmb`,
potom `npx supabase db push`. Typy: `npm run db:types`. Seed (`supabase/seed.sql`) je idempotentný.
Do 16. 10. sa migrácie na staging nahrávali cez Supabase MCP a verzie v `supabase_migrations.schema_migrations` sú zosúladené s názvami súborov.

**Testovanie administrácie v prehliadači bez hesla:** `node --env-file=.env.local scripts/qa-login-link.mjs http://localhost:3000` → otvoriť vypísaný odkaz
(používateľ qa@booking-platform.test, majiteľ ukážkových klientov, len staging). Fotky z disku: `scripts/upload-photos.mjs <manifest>`.

**Účty v aplikácii:** registrácia je vypnutá. Ľudia klienta a Martin sa zakladajú v Supabase (Authentication → Add user) alebo neskôr
pozvánkou z riadiaceho centra; správca platformy = riadok v `platform_admins`.

## Mapa kódu

Next.js 16 (App Router, strict TS) · Tailwind 4 + shadcn/ui (Radix) · next-intl · @supabase/ssr · zod · Vitest.

| Kde | Čo |
|---|---|
| `src/proxy.ts` | obnova prihlásenia, ochrana `/admin` a `/platform` |
| `src/app/(auth)/login` | prihlásenie e-mail + heslo |
| `src/app/page.tsx` | vstup rezervačnej stránky klienta podľa domény (zatiaľ len téma a názov) |
| `src/app/admin/*` | administrácia majiteľa: prehľad, tím (vzor zoznamu + bočného panela + CSV), stránky modulov |
| `src/app/platform/*` | riadiace centrum: klienti, založenie, moduly, stav, téma, audit |
| `src/core/auth` | prihlásený používateľ, členstvá, správca platformy |
| `src/core/tenant` | klient podľa domény (`tenant_by_host`), aktívny klient v administrácii (cookie, overené členstvom) |
| `src/core/money`, `src/core/format` | peniaze v centoch, formátovanie súm a dátumov cez `Intl` |
| `src/core/theme` | téma klienta → CSS premenné, kontrola kontrastu, ponuka písiem, svetlý/tmavý režim |
| `src/core/modules` | manifest modulu, register, sloty (`ModuleSlot`), udalosti (`emitBookingEvent`), vypínače |
| `src/core/admin` | `AdminShell` (pás ikon, pripnutie, mobilné menu), `RecordPanel` (`?panel=typ:id`), `DataListToolbar`, `SortHeader`, `Pagination`, `list-params` |
| `src/core/booking` | stránka hosťa: katalóg a detail (`catalog.ts`), košík a panely (`guest-booking.tsx`), kalendár, galéria, vytvorenie rezervácie |
| `src/core/sections` | detail objektu zo sekcií (B7): typy = komponent + zod schéma (`core-sections.tsx`), register (`registry.ts`, + `sections` v manifeste modulu), `PropertySections`; predlohy v tabuľke `section_templates` |
| `src/modules/<kľúč>/` | moduly; zoznam v `src/modules/index.ts` (jediné miesto) — prvý: `services` |
| `src/i18n/` | preklady (`messages/sk.json`, menné priestory `modules.<kľúč>` pre moduly) |
| `src/lib/supabase/` | klienti Supabase (server, prehliadač, admin) a typy DB |
| `supabase/` | migrácie, pgTAP testy, seed, `config.toml` |

**Nový modul:** priečinok `src/modules/<kľúč>/` s `manifest.ts` (navItems, slots, events, sections, dependsOn), preklady pod `modules.<kľúč>`,
riadok v `public.modules` cez migráciu, zápis do `src/modules/index.ts`, stránka v `src/app/admin/<cesta>/page.tsx` s kontrolou `isModuleEnabled`.

## Priečinky

| Priečinok | Obsah |
|---|---|
| `docs/podklady/` | Podklady prevzaté z WordPress dema: Chalet STRÖMY, právne texty, návrhy e-mailov, obsah karty objektu |
| `docs/biznis/` | Biznisová stratégia a predajné argumenty (masterdokument, wireframe predajnej stránky) |
| `docs/archiv-wp/` | Archív z WordPress dema (architektúra v1, návrhy vizuálu, účet hosťa) — **len na čítanie ako zámer**, technické riešenia z WordPressu neplatia |
