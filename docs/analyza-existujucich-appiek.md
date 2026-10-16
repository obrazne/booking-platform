# Analýza existujúcich aplikácií — Rental Van a Credit Manager

*Úloha Z1 (Claude Code, 16. 10. 2026). Len čítanie, v aplikáciách sa nič nemenilo. Cesty sú relatívne ku koreňu daného repozitára.*

| | Rental Van | Credit Manager |
|---|---|---|
| Repozitár | `obrazne/van-rental` (`main` = `dev`, 36 commitov) | `obrazne/credit-manager` (`main` = `feature/klientska-zona`, 45 commitov) |
| Čo robí | prenájom dodávky a techniky, dopyty, klientske konto | klientska zóna terapeutky TČM (kredity, starostlivosť, objednávky) |
| Frontend | Next.js 14.2 App Router, React 18, TS 5.7 | Vite 5.4 SPA, React 18, react-router 6, TS 5.8 (**strict vypnutý**), vznikol v Lovable |
| UI | Tailwind 3.4 + shadcn/ui (Radix), lucide | Tailwind 3.4 + shadcn/ui (plná sada Radix), lucide, sonner, vaul |
| Formuláre | server actions + `useState`, ručná validácia | `useState`; react-hook-form a zod sú v závislostiach, ale nepoužívajú sa |
| Dáta | `src/lib/server/*` → vlastné **PHP API** (`server/api/index.php`) nad **MariaDB** na HostCreators | **Supabase** priamo z hookov, TanStack Query 5, RPC `portal_*` |
| Dátumy | vlastné `src/lib/dates.ts` | date-fns 3, react-day-picker 8 |
| Prihlásenie | vlastná HMAC cookie; admin heslo (Argon2id), zákazník magic link; **bez rolí** | Supabase Auth: personál heslo + Google, klient OTP kód; roly admin/manager/executor |
| Peniaze | `DECIMAL(10,2)` / float, natvrdo EUR | `numeric(10,2)`, bez meny |
| i18n | nie, všetko natvrdo po slovensky | nie, všetko natvrdo po slovensky |
| Testy | žiadne | vitest s jedným prázdnym testom; ručný SQL test RLS |
| Nasadenie | Vercel (main → produkcia, vetvy → náhľad), PHP ručne cez `scp`; náhľad a produkcia **zdieľajú DB** | Vercel (len SPA rewrite), dva Supabase projekty (dev a živý) |
| Multi-tenant | nie | nie |

## Rental Van

**Štruktúra.** `src/app/` (verejné stránky, `configurator/`, `konto/`, `admin/`, `api/`), prístup k dátam len v `src/lib/server/*`
(`import "server-only"`) → `api.ts` volá PHP API s kľúčom (`hash_equals`). Celé SQL je v `server/private/lib.php`, schéma
`server/setup/schema.sql`, migrácie `server/setup/migrate-*.sql|php` sa púšťajú ručne. Dokumentácia je nadpriemerná
(`docs/ARCHITEKTURA.md`, `PREVADZKA.md`, `EMAIL.md`, `PRIRUCKA.md`).

**Administrácia** (`src/app/admin`, `src/components/admin`) — to, čo z nej má hodnotu:
- `AdminShell` + `AdminSidebar` — zbaľovací bočný panel navigácie, mobilné menu, tmavý režim.
- `InquiryList` — filtre (stav, hľadanie, od–do), triedenie, export CSV (`src/lib/csv.ts`). Filtruje sa na klientovi, bez stránkovania.
- Detail dopytu `dopyty/[id]` so zmenou stavu a úpravou, história úprav (`inquiry_revisions`).
- Dostupnosť `dostupnost/` — mesačná mriežka (`buildMonthGrid`) a `AvailabilityTable`; výber termínu `RangeCalendar.tsx`.
- `ImageManager` + `src/lib/imageCompress.ts` — zmenšenie fotiek v prehliadači.
- Doménové komponenty `ProductForm` (780 r.), `CategoryManager`, konfigurátor, balíky, sklad — pre ubytovanie nepoužiteľné.
- Generická tabuľka ani obal formulára nie sú; texty sú natvrdo v komponentoch.

**E-maily.** SMTP cez nodemailer (`src/lib/server/mail/transport.ts`, `config.ts`). Šablóny sú HTML reťazce v `src/lib/server/mail/templates.ts`,
register správ a ich spúšťačov v `src/lib/mailCatalog.ts` (nový dopyt zákazníkovi aj prevádzkovateľovi, 4 zmeny stavu, prihlasovací odkaz).
Posiela sa synchrónne v server action, bez fronty a opakovania.
Premenné prostredia (názvy): `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`, `MAIL_TO_OPERATOR`, `MAIL_BRAND_*`,
`MAIL_REDIRECT_TO`, `RENTAL_API_URL`, `RENTAL_API_KEY`, `SESSION_SECRET`, `OPERATOR_ICO`, `OPERATOR_EMAIL`, `APP_URL`.

**Rezervácie a dostupnosť.** Obsadenosť nemá vlastnú tabuľku — počíta sa v JS z dopytov (`src/lib/availability.ts`: `peakDemand`, `conflictsOf`);
blokujú stavy `confirmed` a `issued`, rátajú sa oba krajné dni. **Dvojitej rezervácii nič nebráni:** v DB nie je obmedzenie, pri potvrdení
nie je zámok ani transakcia, konflikt sa adminovi len zobrazí ako varovanie. Dobré vzory: dopyt si ukladá **snímku cien, sadzieb DPH a zľavy**,
server cenu prepočíta z ID (neverí prehliadaču), stavový automat `new → confirmed → issued → returned / cancelled` s e-mailom pri prechode
(dá sa vypnúť), honeypot vo formulári, číslovanie `DOP-RRRR-NNNN` so zámkom.

**Dlh.** Bez testov, i18n, rolí a klientov; rate limit v pamäti procesu (na serverless nespoľahlivý); jedna DB pre náhľad aj produkciu;
ID sú textové slugy.

## Credit Manager

**Štruktúra.** Routy v `src/App.tsx`, stránky `src/pages/*`, komponenty `src/components/{layout,workspace,zona,care,orders,…}`.
Dátová vrstva je trojaká a nejednotná: priame `supabase.from()` v hookoch (`src/hooks/use*.ts`), starý `src/services/databaseService.ts`
(1526 r.) a `src/lib/portal.ts` (klient len cez RPC). Veľa mŕtveho kódu z predchodcov (filmová produkcia, Web Manager: `Storyboards/*`,
`planner/*`, `MoodBoard`, `mock-data.ts`). V `src/pages/Index.tsx` komentár „Bypassing auth“.

**Supabase — tu je hlavná hodnota.**
- Migrácie v `supabase/migrations/` (baseline zo živej DB + aditívne), Supabase CLI (`docs/FAZA-0.md`, `docs/HANDOFF.md`), seed `supabase/seed.sql`.
- Roly a pomocné funkcie (`20261014200001_roles_and_accounts.sql`): `is_staff()`, `is_superadmin()`, `current_client_id()` ako
  `SECURITY DEFINER` so `search_path=''`, revoke/grant na funkcie.
- **Klient nikdy nečíta tabuľky priamo**, len cez funkcie `portal_*` (`20261014200009_portal_functions.sql`); nové tabuľky len pre personál.
- `20261015100000_launch_tighten_legacy_access.sql` ruší staré politiky `using (true)`.
- Test RLS `supabase/tests/rls_check.sql` — prepína roly a `jwt.claims` v transakcii s rollbackom; výsledok sa ale kontroluje okom, nie asserciami.
- Log zmien s autorom (`20261014200010_change_logging.sql`).
- Úložisko: súkromný bucket `client-files` (20 MB, povolené typy), `src/lib/storage/` (zmenšenie fotiek, podpísané URL, pripravené na výmenu poskytovateľa).
- Edge funkcie `voice-parser`, `image-generator` (Gemini) — vedľajšie.
- Premenné (názvy): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_DEV_ADMIN_EMAIL`, `VITE_DEV_ADMIN_PASSWORD`, `VITE_DEV_CLIENT_EMAIL`, `GOOGLE_AI_KEY`.

**Bočný panel.** Panel so záznamom (napr. rezervácia vysunutá sprava) tu **nie je**. Sú tu tri iné veci:
1. `src/components/layout/AppLayout.tsx` — **navigačný** pás ikon (52 px), pri prejdení myšou sa rozbalí na 224 px ako prekrytie, dá sa pripnúť
   (localStorage), odznaky, `sidebarSlot` pre obsah stránky; na mobile shadcn `Sheet` zľava. Nie je v URL, tlačidlo Späť ho nezatvára.
2. `src/components/workspace/ClientWorkspaceManager.tsx` — detail klienta v záložkách ako v IDE (flexlayout-react), rozloženie v localStorage;
   `?client=<id>` sa hneď zmaže. Späť nefunguje, na mobil nevhodné.
3. `src/pages/ClientZone.tsx` — záložky `?tab=` a `?osoba=` v URL, ale s `replace`, takže Späť ich neprechádza.

**Administrácia.** shadcn `Table` s textovým filtrom (`ClientsDashboardView.tsx`), detail cez `Tabs` vo veľkom komponente
(`ClientDetailsView.tsx`, 788 r.), formuláre v `Dialog` s ručným stavom, prehľady a log zmien (`OverviewPage.tsx`, `ChangeLogList.tsx`).

## Odporúčanie

### Prevziať
| Čo | Odkiaľ | Ako |
|---|---|---|
| Kostra administrácie (rozloženie, navigácia, mobilné menu, tmavý režim) | RV `AdminShell`, `AdminSidebar`; CM `AppLayout` (pás ikon, pripnutie) | prepísať do jedného konfigurovateľného komponentu: položky menu z modulov, texty z prekladov |
| Zoznam s filtrami, triedením a CSV exportom | RV `InquiryList`, `src/lib/csv.ts` | ako vzor; filtrovanie a stránkovanie presunúť na server |
| Kalendár obsadenosti a výber termínu | RV `dostupnost/`, `buildMonthGrid`, `RangeCalendar.tsx` | ako východisko, prerobiť na noci (`[)`) a jednotky |
| Zmenšenie fotiek, úložisko s podpísanými URL | RV `imageCompress.ts`, `ImageManager`; CM `src/lib/storage/` | skopírovať a upraviť (cesty s `tenant_id`) |
| Vzory rezervácie | RV: snímka cien a DPH, história úprav, stavový automat s e-mailmi, register e-mailov `mailCatalog`, prepočet ceny na serveri, honeypot | prevziať princíp, napísať nanovo nad Postgres |
| Bezpečnosť v databáze | CM: funkcie `SECURITY DEFINER` so `search_path=''`, revoke/grant, prístup hosťa len cez RPC, test RLS v transakcii, log zmien | rozšíriť o `tenant_id` a `is_tenant_member(tenant_id)`; testy s asserciami (pgTAP) |
| Postup migrácií | CM: Supabase CLI, aditívne migrácie, seed, dva projekty | priamo |
| shadcn/ui + Tailwind | obe | vygenerovať čerstvo cez shadcn CLI, nekopírovať staré verzie |

### Neprevziať
- **PHP API a MariaDB** (RV) — nahradí Supabase/Postgres.
- **Vlastné prihlásenie** (RV HMAC cookie) — nahradí Supabase Auth (`@supabase/ssr`) s členstvami a rolami na klientovi.
- **Dostupnosť počítaná v JS** — pre ubytovanie treba tabuľku obsadenosti a obmedzenie v databáze
  (`EXCLUDE USING gist (unit_id WITH =, daterange(check_in, check_out, '[)') WITH &&)` pre blokujúce stavy). Dvojitá rezervácia je pri paralelnom
  chode s Bookingom hlavné riziko (A16), musí ju zastaviť databáza.
- **Peniaze ako desatinné čísla** (obe) — nahradiť celými centami + `currency`, formátovanie cez `Intl` podľa jazyka.
- **E-maily ako HTML reťazce posielané synchrónne** (RV) — šablóny s prekladmi a brandom klienta (napr. React Email) a fronta s opakovaním
  cez transakčnú službu (A7).
- **flexlayout pracovný priestor, dátová vrstva a mŕtvy kód** (CM), **doménové komponenty** (RV produkty, konfigurátor, CM kredity).
- **Nastavenia TypeScriptu** (CM bez strict), in-memory rate limit (RV), AI edge funkcie (CM).

### Nesúlad s architektúrou (časť A)
Ani jedna aplikácia nemá **klientov (`tenant_id`) a RLS podľa klienta**, **preklady**, **peniaze v centoch s menou** ani **moduly** —
navigácia a routy sú natvrdo. Všetko by sa muselo prerobiť; z kódu by ostali hlavne vizuálne komponenty.

### Začať z kópie Rental Van, alebo načisto?
**Odporúčam čistý Next.js projekt (aktuálna verzia, App Router, strict TypeScript) a preniesť vybrané časti z tabuľky vyššie.** Dôvody:
- Rental Van má celý dátový a prihlasovací základ v PHP/MariaDB a vlastnej cookie — to je presne vrstva, ktorá sa mení. Po jej výmene by
  z kópie ostal Next.js 14, shadcn a niekoľko komponentov s natvrdo písanými textmi.
- Základ platformy (klienti, členstvá, RLS, preklady, moduly, centy) musí byť od prvého riadku; dopĺňať ho do kópie je pracnejšie
  a rizikovejšie ako ho postaviť a komponenty preniesť po jednom (s prekladmi).
- Credit Manager je Vite SPA — prenos do Next.js je drobná práca, ale hodnotné je z neho hlavne SQL, nie React kód.

## Na rozhodnutie (zapísané aj v *Otázky pre Martina*)
- `ARCHITEKTURA.md` A1 uvádza „vzor bočného panelu z Credit Managera“. Credit Manager má však len **navigačný** panel a záložky detailu,
  nie panel so záznamom (rezervácia, hosť) vysunutý sprava. Ak bol myslený taký panel, treba ho navrhnúť nanovo: stav v URL
  (napr. `?panel=booking:123`) so zápisom do histórie, aby ho zavrelo tlačidlo Späť, na mobile cez celú obrazovku.
  Rovnaké správanie (Esc, klik mimo, Späť) malo bočné okno na detaile objektu vo WordPress deme (`booking-demo`, `docs/bocny-panel-jetpopup.md`;
  do `docs/archiv-wp/` sa nepreniesol).
