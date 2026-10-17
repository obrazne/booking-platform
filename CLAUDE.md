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

**Vetva: pracuj priamo na `main`** (Martin 17. 10.). Žiadne vlastné vetvy ani pull requesty — aj keď session štartuje na inej vetve
(napr. `claude/…`), prepni sa na `main` (`git checkout main && git pull --rebase`) a po každej dokončenej úlohe `git push origin main`.

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
**Testy prehliadačom (Playwright, `e2e/`):** `npm run e2e:server` (build + `npm start -p 3100` s testovacími kľúčmi Turnstile,
ktoré vždy prejdú — skutočné kľúče z `.env.local` by robotovi ukázali výzvu), potom `npm run e2e` — hosť (PC aj mobil 390 px),
administrácia, prístupnosť (axe). Bežia proti **stagingu** cez `.env.local`, testovacie dáta majú e-mail `@booking-platform.test`
(e-maily sa na túto doménu neposielajú) a po behu sa zmažú. Rýchlosť detailu na mobile: `node scripts/perf-check.mjs`.

**Databáza:** migrácie v `supabase/migrations/` (len pridávajú), testy RLS v `supabase/tests/database/` (pgTAP) — spúšťa ich CI
(`supabase db start` + `supabase test db` v GitHub Actions). Na staging: `npx supabase link --project-ref uzsuwokyiprkzfirvrmb`,
potom `npx supabase db push`. Typy: `npm run db:types`. Seed (`supabase/seed.sql`) je idempotentný.
Do 16. 10. sa migrácie na staging nahrávali cez Supabase MCP a verzie v `supabase_migrations.schema_migrations` sú zosúladené s názvami súborov.

**Testovanie administrácie v prehliadači bez hesla:** `node --env-file=.env.local scripts/qa-login-link.mjs http://localhost:3000` → otvoriť vypísaný odkaz
(používateľ qa@booking-platform.test, majiteľ ukážkových klientov, len staging). Fotky z disku: `scripts/upload-photos.mjs <manifest>`.
**Ukážkové dáta STRÖMY (staging):** `npm run demo-data` (chýbajúce vytvorí), `npm run demo-data -- --reset` (zmaže a vytvorí znova) —
3 rezervácie cez `create_reservation` s cenou z rovnakého výpočtu ako web, dokumenty, iCal udalosti, blokácia, skúška modulu.
Ukážkové = poznámka hosťa „DEMO — …“, e-maily na `stromy-demo.invalid` (hosť b: demo-host@obrazne.sk pre zónu hosťa); e-maily z nich sa neposielajú.
**Štatistiky (Z27):** jedna funkcia `tenant_monthly_stats` (DB, RLS) pre Štatistiky, Prehľad aj riadiace centrum; pomocné výpočty
v `src/core/stats/compute.ts`. **Upozornenia:** vznikajú len v databáze (`notify()` z triggerov a `notify_scheduled` cez pg_cron),
deduplikované cez `dedupe_key`; zvonček `src/core/notifications/`. Nový druh = pridať do kontroly `kind`, trigger, text `notifications.kinds.*`.
**História zmien a kôš (Z31):** každá tabuľka s `tenant_id` má trigger `record_history` (nová tabuľka ho dostane len novou migráciou —
pridaj `create trigger record_history … record_history_capture(<pk stĺpce>)`). Mazanie súborov fotiek a dokumentov nerob v akcii — rieši
ho job worker po 30 dňoch (`purgeTrashFiles`). Obnova a vrátenie: `owner_restore`, `platform_revert_change` (databáza).
**Push (Z33, modul `push`):** zariadenia `push_subscriptions`, fronta `push_queue` z triggeru na `notifications` → pg_net `/api/push/run`
(+ záloha v job workeri); kód `src/core/push/` (výber príjemcov, odoslanie cez `web-push`, nastavenia). Kľúče `NEXT_PUBLIC_VAPID_PUBLIC_KEY`,
`VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`. Endpointy `*.test` sa neodosielajú. Nový druh upozornenia = doplniť aj kontrolu `kinds` v `push_subscriptions`.
**Recenzie (Z34, modul `reviews`):** pravidlá v DB (`review_eligibility`, `submit_review`, `reviews_tick` cez pg_cron), verejne len
`public_reviews`/`review_summary`; administrácia `src/app/admin/reviews`, model `src/modules/reviews/model.ts`. Modul s `ready: false`
v manifeste je v katalógu „v príprave“ a riadiace centrum ho nezapne — po doplnení obrazoviek pre hostí prepnúť na hotový.
**Upsell (Z35, modul `upsell`):** objednávky po rezervácii v `reservation_orders` (zmrazená cena, riadky rezervácie sa nemenia), pravidlá
v DB (`place_order`, `cancel_order`, `decide_order`, `settle_stay_account`); vyúčtovanie je platba s `payments.purpose = 'stay_account'` —
dotazy na platbu rezervácie musia filtrovať `purpose = 'reservation'`. Panel rezervácie dostáva sekcie modulov cez slot `booking.detail.tabs`.
**Prehliadka „Čo je nové“ (A15):** obsah v `src/core/tours/tours.ts` (verzia + snímky; texty `tours.*` v prekladoch). Po zmene snímok
zvýš `version` → každý ju po prihlásení uvidí znova. Snímky: lokálny server proti stagingu + `npm run demo-data`, potom `npm run tour:screens`
→ `public/tours/` (testovacie účty qa@ a qa-admin@booking-platform.test; skutočné e-maily a mená mimo ukážky sa rozmažú).

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
| `src/core/tenant` | klient podľa domény (`tenant_by_host`), aktívny klient v administrácii (cookie, overené členstvom; správca platformy v režime „Prezeráš ako správca“ cez `admin_view_tenant`, vstup `/platform/enter/<id>`) |
| `src/core/security` | ochrana formulárov hosťa: captcha Cloudflare Turnstile (`captcha.tsx` widget, `turnstile.ts` siteverify), limit podľa IP (`guard.ts` → `hit_request_limit`) |
| `src/core/money`, `src/core/format` | peniaze v centoch, formátovanie súm a dátumov cez `Intl` |
| `src/core/theme` | téma klienta → CSS premenné, kontrola kontrastu, ponuka písiem, svetlý/tmavý režim |
| `src/core/modules` | manifest modulu, register, sloty (`ModuleSlot`), udalosti (`emitBookingEvent`), vypínače |
| `src/core/admin` | `AdminShell` (bočné menu podľa vizuálu v1, pripnutie, mobilná lišta), `SidePanel` / `RecordPanel` (680 px, `?panel=typ:id`, `PanelColumns`, `PanelSection`, `data-panel-switch` prepína záznam), `PageHeader`, `status.tsx` (farby stavov a obsadenosti), `occupancy.ts` (obsadenosť, synchronizácia), `brand.ts` (názov platformy, e-mail podpory), `ListSearch`, `FilterPills`, `DateRangePill`, `SortHeader`, `Pagination`, `list-params` |
| `src/core/booking` | stránka hosťa: katalóg a detail (`catalog.ts`), košík a panely (`guest-booking.tsx`), kalendár, galéria, vytvorenie rezervácie |
| `src/core/sections` | detail objektu zo sekcií (B7): typy = komponent + zod schéma (`core-sections.tsx`), register (`registry.ts`, + `sections` v manifeste modulu), `PropertySections`; predlohy v tabuľke `section_templates`; administrácia: záložka Stránka (`src/app/admin/properties/[id]/page`, formulár zo zod schémy `schema-form.tsx`) |
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
