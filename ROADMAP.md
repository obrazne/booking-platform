# ROADMAP — Booking platform

*Kde sme a čo ostáva. Čo staviame → `ARCHITEKTURA.md`. Prečo → `ROZHODNUTIA.md`.*

**Legenda:** 🧠 = rozhoduje Martin s Claude (návrh, chat) · 🔧 = robí Claude Code (kód, súbory, Git)
☐ otvorené · ☑ hotové

## Aktuálne
- **Kde sme (16. 10.):** kostra platformy stojí lokálne aj na staging databáze — Z3, Z4, Z5 hotové, Z6 hotové okrem nasadenia,
  Z2 hotové okrem Vercelu. CI (typy, lint, formát, unit testy + 44 pgTAP testov oddelenia klientov) prechádza.
- **Ďalší krok pre Claude Code:** po Martinovom prihlásení do Vercel CLI napojiť projekt, nasadiť staging a dokončiť Z2 a Z6;
  Martina pridať ako správcu platformy a majiteľa ukážkových klientov.
- **Ďalší krok pre Martina:** dokončiť prihlásenie Supabase + Vercel CLI (terminál v Claude Code), založiť si účet v Supabase
  (Authentication → Add user, info@obrazne.sk, Auto Confirm) a dať vedieť.
- **Claude chat:** revízia časti B (dostupnosť, cenotvorba, služby, tok, …) → potom zadanie doménových tabuliek.

## Zadanie pre Claude Code
*Sem píše Claude chat konkrétne pokyny. Môže tu byť **fronta viacerých úloh (Z1, Z2, …)** — `/dalej` vezme prvú neoznačenú,
po dokončení ju označí ✅ (text nechá) a ďalšiu začne až pri ďalšom `/dalej`. Keď sú všetky ✅, sekciu vyprázdni.*

### Z1 ✅ — Analýza Rental Van a Credit Managera (LEN ČÍTANIE)

**Cieľ:** zistiť, čo z dvoch existujúcich Martinových aplikácií prevezmeme do platformy, aby sa architektúra v2
písala s reálnou znalosťou kódu. **Nič nestav, nezakladaj kostru aplikácie, nič v tých aplikáciách nemeň.**

**1. Nájdi ich.** Aplikácie sa volajú *Rental Van* a *Credit Manager*. Martin nevie presne, kde sú:
- lokálne skús `~/Antigravity/Projekty` (Windows: `%USERPROFILE%\Antigravity\Projekty`),
- na GitHube môžu byť pod účtom `obrazne` alebo pod Martinovým druhým účtom. Pozri `gh auth status` a `gh repo list <účet>`
  pre všetky prihlásené účty; hľadaj názvy s *rental*, *van*, *credit*.
- Ak ich nenájdeš alebo nájdeš viac kandidátov, **opýtaj sa Martina**, nehádaj.
- Ak treba repozitár stiahnuť, naklonuj ho do dočasného priečinka mimo tohto repozitára. Lokálne kópie len čítaj.

**2. Čo zistiť pri každej aplikácii** (do jedného dokumentu, stručne, s cestami k súborom):
- **Stack a verzie:** framework (Next.js? App Router / Pages? alebo Vite/React?), jazyk (TypeScript?), UI knižnica a štýlovanie,
  formuláre a validácia, správa stavu, dátumové knižnice, ďalšie dôležité balíčky.
- **Štruktúra projektu:** priečinky, ako sú rozdelené stránky, komponenty, prístup k dátam.
- **Supabase:** prihlasovanie a roly, schéma a migrácie (sú v repozitári? ako sa spúšťajú?), použitie RLS, úložisko súborov,
  edge funkcie. **Názvy** premenných prostredia, nikdy hodnoty.
- **Administrácia (hlavne Rental Van):** rozloženie, navigácia, tabuľky a filtre, formuláre, detail záznamu, kalendár, oprávnenia.
- **Bočný panel (hlavne Credit Manager):** kde je implementovaný, ako funguje (URL, história, mobil), čo by sa dalo vziať ako komponent.
- **E-maily (hlavne Rental Van):** cez čo sa posielajú (SMTP? služba?), šablóny, odkiaľ sa spúšťajú.
- **Rezervácie a dostupnosť (Rental Van):** ako sa ukladá obsadenosť a ako sa bráni dvojitej rezervácii (kód aj databáza).
- **Nasadenie:** Vercel, vetvy, náhľady, cron úlohy.
- **Testy, preklady (i18n), kvalita kódu:** čo existuje, čo chýba, zjavný technický dlh.

**3. Odporúčanie** (dôležitejšie ako opis):
- Čo **prevziať** (konkrétne komponenty, nastavenia, vzory) a čo **nie** a prečo.
- Kde existujúci kód **nezodpovedá dohodnutej architektúre** (`ARCHITEKTURA.md` časť A): viac klientov a `tenant_id` s RLS,
  preklady, peniaze v centoch, moduly. Čo by sa muselo prerobiť.
- Návrh: začať z kópie Rental Van, alebo z čistého Next.js projektu a preniesť vybrané časti? S odôvodnením.

**Výstup:** `docs/analyza-existujucich-appiek.md`. Potom Denník, `Aktuálne`, commit a push. Do kódu tých aplikácií nič necommituj.

### Z2 — Projekt, prostredia a nasadenie

**Kontext pre celú frontu Z2–Z6:** staviame **kostru platformy** podľa `ARCHITEKTURA.md` časť A (A1–A9, A12, A13, A17, A18) a podľa
`docs/analyza-existujucich-appiek.md` (čo preniesť z Rental Van a Credit Managera). **Nie** tabuľky objektov, jednotiek, cien a rezervácií
(časť B ešte nie je zrevidovaná). Názvy v kóde a databáze po anglicky, rozhranie len cez preklady. Detaily riešenia volíš sám a zapisuješ
do *Denníka* (krátko čo a prečo); Martin ich neschvaľuje.

1. Čistý **Next.js** (aktuálna stabilná verzia, App Router, strict TypeScript, ESLint, Prettier), **Tailwind + shadcn/ui** vygenerované nanovo.
   Navrhni štruktúru priečinkov tak, aby jadro a moduly boli oddelené (napr. `src/core`, `src/modules/<modul>`, `src/platform` pre riadiace centrum).
2. **Supabase:** lokálny vývoj cez Supabase CLI (ak na Martinovom počítači nejde Docker, pracuj priamo so stagingom a zapíš to).
   Založ **staging** projekt na účte Obrazne (`booking-platform-staging`, región EÚ). Produkčný projekt zatiaľ nie.
3. **Vercel:** projekt na účte Obrazne napojený na tento repozitár (bezplatný plán počas vývoja), náhľady pre vetvy, `main` → staging.
4. **CI (GitHub Actions):** typová kontrola, lint, testy pri každom pushi.
5. `.env.example` s názvami premenných, postup spustenia a nasadenia do `CLAUDE.md`.

**Martin:** keď treba, požiadaj ho o prihlásenie (Supabase CLI, Vercel) — urob to naraz na začiatku, nie po jednom.

### Z3 ✅ — Klienti, používatelia a oddelenie dát

1. Migrácie: `tenants` (názov, krajina, mena, jazyky, stav), `tenant_domains` (hostname → klient), `profiles`, `memberships`
   (používateľ ↔ klient, M:N, rola `owner` / `reception` / `cleaning`), `platform_admins`, `audit_log`.
2. Pomocné funkcie podľa vzoru Credit Managera (`SECURITY DEFINER`, `search_path=''`): napr. `is_platform_admin()`, `is_tenant_member(tenant_id, roles)`.
   **RLS na každej tabuľke.**
3. **Automatické testy oddelenia** (pgTAP s asserciami): používateľ klienta A nevidí ani nezmení nič z klienta B; rola upratovanie nevidí, čo nemá.
4. **Prihlásenie** cez `@supabase/ssr` (e-mail + heslo pre ľudí klienta a Martina), **určenie klienta podľa domény** (subdoména / vlastná doména,
   pri lokálnom vývoji náhradný spôsob).
5. Seed: Martin (`info@obrazne.sk`) ako správca platformy, klient **„Ukážkový klient“** a klient **„Chalet STRÖMY“** (len záznam klienta, bez objektov).

### Z4 ✅ — Preklady, peniaze, téma

1. **Preklady** (knižnicu vyber sám): slovenčina, štruktúra pripravená na ďalšie jazyky, žiadne natvrdo písané texty. Formátovanie dátumov
   a **súm z centov s menou** cez `Intl` podľa jazyka; pomocné funkcie pre peniaze (sčítanie v centoch, žiadne desatinné čísla).
2. **Téma klienta** (A12): záznam témy (logo, farby, písma z vybranej ponuky, zaoblenie, svetlý/tmavý režim) → CSS premenné podľa domény;
   **automatická kontrola kontrastu**; predvolená téma platformy podľa vizuálneho smeru (A12: Apple — zaoblené prvky, tenké linky, málo farieb).

### Z5 ✅ — Moduly a kostra administrácie

1. **Register modulov v kóde** (A3): manifest modulu (kľúč, názov, závislosti, položky menu, miesta v rozhraní), tabuľky `modules`
   a `tenant_modules` (stav `trial` / `active` / `off`, koniec skúšky), funkcia „je modul zapnutý pre klienta“; miesta v rozhraní (sloty)
   a **udalosti** (zatiaľ kostra, jadro o moduloch nevie). Vypnutie skryje, nič nemaže.
2. **Kostra administrácie** (A18): rozloženie s bočnou navigáciou (preniesť z RV `AdminShell`/`AdminSidebar` a CM pásu ikon), mobilné menu,
   tmavý režim, menu skladané z modulov, prepínanie klienta pre používateľa s viacerými členstvami.
3. **Spoločný bočný panel so záznamom** (A18): stav v URL, Späť zavrie, Esc a klik mimo, na mobile celá obrazovka.
4. Spoločné komponenty: zoznam s filtrami, triedením, stránkovaním na serveri a CSV exportom (vzor RV `InquiryList`).
5. Ukážkový modul (napr. prázdny modul „Doplnkové služby“ s jednou položkou menu), aby bolo vidno, že zapínanie funguje.

### Z6 — Riadiace centrum (kostra)

1. Prístup len pre správcu platformy. Zoznam klientov, založenie klienta (minimálne údaje + doména), detail klienta.
2. **Vypínače modulov** so stavom a dátumom konca skúšky; každá zmena do `audit_log` (kto, kedy, čo).
3. Ukážka témy klienta (náhľad farieb a písma).
4. Na konci: nasadené na staging, Martinovi pošli adresu a krátky postup, čo si môže preklikať (prihlásenie, založenie klienta, zapnutie modulu).

---

## Fáza 0 — Organizácia projektu
- [x] Repozitár `obrazne/booking-platform`, riadiace súbory, podklady prenesené z booking-demo (Claude chat, 16. 10.)
- [x] Martin: lokálny priečinok (mimo `~/Antigravity`) a Claude Code v ňom 🧠 (`G:\!WEBYooking-platform`)

## Fáza 1 — Analýza existujúcich aplikácií 🔧
- [x] Z1 — Rental Van a Credit Manager → `docs/analyza-existujucich-appiek.md`

## Fáza 2 — Architektúra v2 🧠
- [ ] Revízia doménových kapitol z v1 (časť B): dostupnosť a iCal, cenotvorba, doplnkové služby, rezervačný tok a stavy,
      platby, komunikácia, zóna hosťa a administrácia majiteľa, legislatíva
- [ ] Dátový model v2 (schéma tabuliek s `tenant_id`, členstvá, moduly)
- [ ] Katalóg modulov, napájacie miesta, priradenie do balíkov
- [ ] Riadiace centrum — obrazovky a údaje
- [ ] Prevádzka: výber transakčnej e-mailovej služby, úložisko pre nezávislú zálohu, upozornenia, postup pri výpadku
- [ ] Presný rozsah MVP pre Chalet STRÖMY a plán 4 týždňov (časť C)
- [ ] Obchodný model platformy: ceny, mikro-provízia (definícia obratu), odporúčací program, fakturácia klientom, DPH (A10)
- [ ] Sprievodca zakladaním klienta a pohľad klienta na stav (A11)
- [ ] Vzhľad: rozsah premenných dizajnového systému, svetlý a tmavý režim (A12)
- [ ] Notifikácie: inštalovateľná administrácia, push ako modul (A13)
- [ ] Meranie: vlastné štatistiky, Google Analytics so súhlasom, ID klienta (A14)
- [ ] Podpora: chatbot (Smartsupp?), návody pre majiteľov, kto rieši čo (A15)
- [ ] Paralelný chod s Bookingom a Airbnb: synchronizácia, kolízie, postup pri dvojitej rezervácii (A16)
- [ ] Showroom: zoznam ukážkových objektov rôznych druhov + Chalet STRÖMY s reálnymi údajmi (časť C)

## Fáza 3 — MVP Chalet STRÖMY 🔧 + 🧠 *(cca 4 týždne po uzavretí Fázy 2)*
- [ ] 3a0 Kostra platformy (Z2–Z6): projekt, prostredia, klienti a oddelenie dát, preklady, téma, moduly, administrácia, riadiace centrum
- [ ] 3a Doména: objekt, cenník, sezóny, blokované dni (po revízii časti B)
- [ ] 3b Rezervácia pre hostí: dostupnosť, výpočet ceny, služby, údaje hosťa, súhlasy (aj marketingový), dočasná blokácia, iCal
- [ ] 3c Platba prevodom s QR, stavy rezervácie, e-maily
- [ ] 3d Doklady cez fakturačný nástroj, prehľad rezervácií pre majiteľa, export, testovanie, spustenie popri Bookingu
- [ ] 3e Nasadenie u Jany: `rezervacia.chaletstromy.sk`, vyhľadávací pás na jej webe (Elementor HTML widget), tlačidlá „Rezervovať“ (A17)

## Fáza 4 — Po spustení 🔧 + 🧠
- [ ] Stripe (karta), záloha a doplatok
- [ ] Riadiace centrum v plnom rozsahu, skúšobné doby modulov
- [ ] Vkladací widget, ďalšie moduly podľa katalógu

## Fáza 5 — Značka a predajný web 🧠 + 🔧 *(po MVP; cieľ: hotové pred eventom v eXtreme parku Žilina)*
- [ ] Značka produktu: názov, doména, vizuál 🧠
- [ ] Obchodný model a cenník uzavretý (Fáza 2) — až potom texty webu 🧠
- [ ] Predajný web vo WordPresse s CrocoBuilderom na Martinovom hostingu: funkcie, moduly, screenshoty, dopyt 🔧
- [ ] Prepojenie s aplikáciou: rovnaké farby a písma, odkaz na ukážkového klienta, kalkulačka úspor ako widget z aplikácie 🔧

## Otázky pre Martina
- Prihlásenie do Supabase CLI a Vercel CLI (blokuje nasadenie na Vercel; migrácie zatiaľ idú cez Supabase MCP).
- Tvoj účet na stagingu: Supabase → Authentication → Add user (info@obrazne.sk, vlastné heslo, Auto Confirm). Potom ťa Claude Code pridá ako správcu.
- Doména platformy pre subdomény klientov (napr. `*.booking.obrazne.sk`) — na staging stačí adresa Vercelu, na rezerváciu cez subdomény treba wildcard DNS.
- V akom fakturačnom nástroji fakturuje Jana? (prvý adaptér na doklady)
- Ponúka tvoj hosting úložisko (S3 alebo SFTP) na nezávislú zálohu? A so zmluvou o spracúvaní údajov?
- Supabase platený plán: pri objednávke pozrieť limity a nastaviť strop výdavkov.
- Účtovník: DPH pri nákupe zahraničných služieb (Supabase, Vercel, e-mailová služba) pri registrácii podľa §7a.
- Jana: začať zbierať východiskové čísla (podiel priamych rezervácií, provízie Bookingu a Airbnb za posledný rok).
- Jana: súhlas s použitím fotiek a údajov chaletu v ukážke pre ďalších záujemcov.
- Kto spravuje doménu chaletstromy.sk (DNS záznam pre subdoménu) a kto upraví jej web (vyhľadávací pás, tlačidlá)?

## Denník
*Najnovšie hore. Formát: `RRRR-MM-DD — čo sa spravilo (kto)`.*
- 2026-10-16 — Z6 (bez nasadenia): riadiace centrum `/platform` — klienti, založenie (funkcia `platform_create_tenant`: klient + doména + téma + audit
  v jednej transakcii), vypínače modulov so skúškou, stav klienta, náhľad témy, záznam zmien. Akcie sú DB funkcie s kontrolou správcu,
  bez service kľúča — aplikácia nepotrebuje `SUPABASE_SECRET_KEY` na nič. (Claude Code)
- 2026-10-16 — Z5: register modulov v kóde (`src/modules/index.ts` jediné miesto; manifest s menu, slotmi, udalosťami, závislosťami),
  tabuľky `modules` + `tenant_modules` (mení len správca), vypnutý modul = stránka 404 a zmizne z menu, dáta ostávajú. Kostra administrácie
  (pás ikon s rozbalením na hover a pripnutím ako v CM, mobilné menu, prepínanie klienta, tmavý režim), bočný panel `?panel=typ:id`
  (Späť zatvorí, zdieľateľný odkaz, na mobile celá obrazovka), zoznam s filtrami/triedením/stránkovaním na serveri a CSV (stredník + BOM
  pre Excel, ochrana pred vzorcami). Ukážka na stránke Tím; modul Doplnkové služby ako prázdna kostra. (Claude Code)
- 2026-10-16 — Z4: next-intl bez jazyka v URL (jazyk z cookie, neskôr z profilu/klienta) — rezervačná stránka beží na doméne klienta,
  prefix v URL netreba. Peniaze: `Money {amount (centy), currency}`, percentá v bázických bodoch, rozdelenie bez straty centu.
  Téma: `tenant_themes`, 5 písiem na výber, kontrast tlačidiel sa dopočíta, nízky kontrast akcentu hlási validácia; predvolená téma
  modrý akcent #0071e3, zaoblenie 12 px. `tenants.timezone` pridané (dátumy v časovom pásme klienta). (Claude Code)
- 2026-10-16 — Z3: tabuľky `tenants`, `tenant_domains`, `profiles`, `memberships`, `platform_admins`, `audit_log`; pomocné funkcie podľa CM
  (`SECURITY DEFINER`, prázdny search_path). Majiteľ nemôže meniť skratku ani stav klienta (trigger). Audit len cez `write_audit()`.
  Supabase advisor hlási, že pomocné funkcie sú volateľné cez API — zámerne (odpovedajú len o volajúcom; `tenant_by_host` a
  `tenant_theme` sú verejné pre rezervačnú stránku). Prihlásenie `@supabase/ssr` + `proxy.ts` (Next 16), overenie cez `getClaims()`.
  Klient podľa domény; lokálne `*.localhost`, mimo produkcie `DEV_TENANT_HOST`. Registrácia vypnutá. (Claude Code)
- 2026-10-16 — Z2 (bez Vercelu): Next.js 16.4, React 19, strict TS, Tailwind 4, shadcn/ui (Radix, preset nova), Prettier, Vitest, CI v GitHub
  Actions (typy, lint, formát, testy + job `database` so `supabase db start` a pgTAP — Docker na Martinovom PC nie je, testy DB beží CI).
  `cacheComponents` vypnuté — aplikácia je celá dynamická (doména, prihlásenie). Staging `booking-platform-staging` (Frankfurt);
  kvôli limitu 2 bezplatných projektov pozastavený `credit-manager-dev` (Martin súhlasil). Postup v `CLAUDE.md`. (Claude Code)
- 2026-10-16 — Fronta Z2–Z6 (kostra platformy), režim práce bez prerušenia, vizuálny smer a bočný panel (A12, A18). (Claude chat)
- 2026-10-16 — Po analýze Z1 rozhodnuté: čistý Next.js projekt namiesto kópie Rental Van (ROZHODNUTIA, ARCHITEKTURA A1). (Claude chat)
- 2026-10-16 — Z1: analýza `obrazne/van-rental` a `obrazne/credit-manager` (len čítanie, klony v dočasnom priečinku) → `docs/analyza-existujucich-appiek.md`.
  Odporúčanie: čistý Next.js, prevziať kostru adminu, vzory rezervácie (RV) a bezpečnostné SQL vzory (CM). (Claude Code)
- 2026-10-16 — Nasadenie u klienta (A17): subdoména klienta + widget s predvyplneným termínom; pre Janu úloha 3e. (Claude chat)
- 2026-10-16 — Predajný web: WordPress + CrocoBuilder po MVP a značke (Fáza 5, ROZHODNUTIA). (Claude chat)
- 2026-10-16 — Veľký obraz: do architektúry doplnené A10–A16 (obchodný model, sprievodca klienta, vzhľad, notifikácie, meranie,
  podpora, paralelný chod s OTA) a showroom; nové body vo Fáze 2 a Otázkach. (Claude chat)
- 2026-10-16 — Založený repozitár (Martin) a riadiace súbory (Claude chat): `ARCHITEKTURA.md` v2 časť A, `ROZHODNUTIA.md` zo 16. 10.,
  podklady z booking-demo v `docs/podklady`, `docs/biznis`, `docs/archiv-wp`. Zadanie Z1. (Claude chat)
