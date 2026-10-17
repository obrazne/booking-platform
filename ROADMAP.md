# ROADMAP — Booking platform

*Kde sme a čo ostáva. Čo staviame → `ARCHITEKTURA.md`. Prečo → `ROZHODNUTIA.md`.*

**Legenda:** 🧠 = rozhoduje Martin s Claude (návrh, chat) · 🔧 = robí Claude Code (kód, súbory, Git)
☐ otvorené · ☑ hotové

## Aktuálne
- **Kde sme (17. 10.):** fronta Z1–Z30 hotová na stagingu — MVP pre Chalet STRÖMY + showroom, stránka hosťa podľa vizuálu v2/v2.1
  (galéria, mapa, košík v2, potvrdenie rezervácie), zóna hosťa, sekcie v administrácii, captcha, **ukážkové dáta** (`npm run demo-data`)
  a **prehliadka „Čo je nové“** pre majiteľa aj správcu, **administrácia a prihlásenia podľa vizuálu v1–v1.2** (menu so skupinami, Štatistiky, zvonček s upozorneniami, drobčeky),
  **riadiace centrum v1.2** (detail klienta so záložkami, katalóg modulov, audit s filtrami) a košík v2.2 pre notebook. Chýba: doklady (čaká na Janin fakturačný nástroj), produkčné prostredie,
  nasadenie u Jany (3e — zatiaľ odložené, teraz len naša aplikácia), Stripe (Fáza 4).
- **Ďalší krok pre Claude Code:** fronta hotová (Z1–Z30) — čaká na ďalšie zadanie z Claude chatu.
- **Ďalší krok pre Martina:** preklikať novú administráciu na stagingu (prehliadka „Čo je nové“ sa po prihlásení otvorí znova) a spísať pripomienky;
  odpovedať na otázky nižšie (mapa, prístup pre Janu, otázky pre Janu).
- **Claude chat:** návrh administrácie v1.2 hotový a uložený (pripomienky 16–24); ďalej Martinove pripomienky zo stagingu (od č. 25), obchodný model, príprava ukážky pre Janu.

## Zadanie pre Claude Code
*Sem píše Claude chat konkrétne pokyny. Môže tu byť **fronta viacerých úloh (Z1, Z2, …)** — `/dalej` vezme prvú neoznačenú,
po dokončení ju označí ✅ (text nechá) a ďalšiu začne až pri ďalšom `/dalej`. Keď sú všetky ✅, sekciu vyprázdni.*

*Hotové Z1–Z30 (analýza, kostra platformy, MVP Chalet STRÖMY, stránka hosťa a košík podľa vizuálu v2–v2.2, potvrdenie rezervácie,
zóna hosťa, sekcie, captcha, ukážkové dáta, prehliadka „Čo je nové“, administrácia v1–v1.2 so štatistikami a upozorneniami,
riadiace centrum v1.2) — detail v Denníku a histórii Gitu.*

*Fronta je prázdna — čaká na ďalšie zadanie z Claude chatu.*

---

## Fáza 0 — Organizácia projektu
- [x] Repozitár `obrazne/booking-platform`, riadiace súbory, podklady prenesené z booking-demo (Claude chat, 16. 10.)
- [x] Martin: lokálny priečinok (mimo `~/Antigravity`) a Claude Code v ňom 🧠 (`G:\!WEBYooking-platform`)

## Fáza 1 — Analýza existujúcich aplikácií 🔧
- [x] Z1 — Rental Van a Credit Manager → `docs/analyza-existujucich-appiek.md`

## Fáza 2 — Architektúra v2 🧠
- [x] Revízia doménových kapitol z v1 (časť B): dostupnosť a iCal, cenotvorba, doplnkové služby, rezervačný tok a stavy,
      platby, komunikácia, zóna hosťa a administrácia majiteľa, legislatíva
- [x] Dátový model v2 (B1; schému tabuliek navrhne Claude Code v Z7)
- [ ] Katalóg modulov, napájacie miesta, priradenie do balíkov
- [ ] Riadiace centrum — obrazovky a údaje
- [ ] Prevádzka: výber transakčnej e-mailovej služby, úložisko pre nezávislú zálohu, upozornenia, postup pri výpadku
- [x] Presný rozsah MVP pre Chalet STRÖMY (časť C) — plán = fronta Z7–Z12
- [ ] Obchodný model platformy: ceny, mikro-provízia (definícia obratu), odporúčací program, fakturácia klientom, DPH (A10)
- [ ] Sprievodca zakladaním klienta a pohľad klienta na stav (A11)
- [ ] Vzhľad: rozsah premenných dizajnového systému, svetlý a tmavý režim (A12)
- [ ] Notifikácie: inštalovateľná administrácia, push ako modul (A13)
- [ ] Meranie: vlastné štatistiky, Google Analytics so súhlasom, ID klienta (A14)
- [ ] Podpora: chatbot (Smartsupp?), návody pre majiteľov, kto rieši čo (A15)
- [ ] Paralelný chod s Bookingom a Airbnb: synchronizácia, kolízie, postup pri dvojitej rezervácii (A16)
- [x] Showroom: zoznam ukážkových objektov rôznych druhov + Chalet STRÖMY s reálnymi údajmi (časť C)

## Fáza 3 — MVP Chalet STRÖMY 🔧 + 🧠 *(cca 4 týždne po uzavretí Fázy 2)*
- [x] 3a0 Kostra platformy (Z2–Z6): projekt, prostredia, klienti a oddelenie dát, preklady, téma, moduly, administrácia, riadiace centrum
- [ ] 3a Doména: objekt, cenník, sezóny, blokované dni (po revízii časti B)
- [ ] 3b Rezervácia pre hostí: dostupnosť, výpočet ceny, služby, údaje hosťa, súhlasy (aj marketingový), dočasná blokácia, iCal
- [ ] 3c Platba prevodom s QR, stavy rezervácie, e-maily
- [ ] 3d Doklady cez fakturačný nástroj, prehľad rezervácií pre majiteľa, export, testovanie, spustenie popri Bookingu
- [ ] 3e Nasadenie u Jany: `rezervacia.chaletstromy.sk`, vyhľadávací pás na jej webe (Elementor HTML widget), tlačidlá „Rezervovať“ (A17)

## Fáza 4 — Po spustení 🔧 + 🧠
- [ ] Stripe (karta), záloha a doplatok
- [ ] Účet a zóna hosťa (B10): pobyty, dokumenty od majiteľa, doklady, pokyny k príchodu, Rezervovať znova, správy, súhlasy
- [ ] Riadiace centrum v plnom rozsahu, skúšobné doby modulov
- [ ] Vkladací widget, ďalšie moduly podľa katalógu

## Fáza 5 — Značka a predajný web 🧠 + 🔧 *(po MVP; cieľ: hotové pred eventom v eXtreme parku Žilina)*
- [ ] Značka produktu: názov, doména, vizuál 🧠
- [ ] Obchodný model a cenník uzavretý (Fáza 2) — až potom texty webu 🧠
- [ ] Predajný web vo WordPresse s CrocoBuilderom na Martinovom hostingu: funkcie, moduly, screenshoty, dopyt 🔧
- [ ] Prepojenie s aplikáciou: rovnaké farby a písma, odkaz na ukážkového klienta, kalkulačka úspor ako widget z aplikácie 🔧

## Otázky pre Martina
- **Riadiace centrum v produkcii (pripomienka 17. 10.):** vlastná adresa (subdoména) s vlastným prihlásením a dvojstupňovým overením pre správcu — rozhodnúť pri príprave produkcie (DNS).
- **Nový objekt:** zatiaľ ho zakladá len správca; či si ho ubytovateľ pridá sám (a či je počet objektov súčasťou balíka), rozhodne obchodný model.
- **Kód hosťa (Z23):** návrh má 6 políčok, ale staging posiela **8-miestny** kód (nastavenie Supabase Auth → Email OTP length).
  Políčka sa riadia skutočnou dĺžkou kódu, takže to funguje. Ak chceš 6 ako na návrhu, treba prepnúť dĺžku v Supabase (staging aj neskôr produkcia).
- **Z23 — čo som vynechal, lebo to v aplikácii zatiaľ nie je:** „Zostať prihlásený“ (prihlásenie ostáva ako doteraz), „Upraviť“
  v paneli rezervácie (úprava rezervácie neexistuje — dá sa zrušiť a vytvoriť ručne), „+ Pozvať človeka“ v riadiacom centre (pozvánky
  ešte nie sú), štítok „Ukážka“ pri klientovi (v databáze nie je príznak ukážkového klienta). „Zabudnuté heslo?“ pošle prihlasovací odkaz.
  E-mail podpory na prihlasovacej obrazovke sa zobrazí, keď nastavíš `NEXT_PUBLIC_SUPPORT_EMAIL` (Vercel). Chceš niektoré z toho doplniť?
- **Prístupnosť (Z23):** sivé štítky z návrhu (#8b929b) nesplnili kontrast AA, v administrácii sú preto tmavšie (#5a6672).
- **Mapa (Z19):** zatiaľ dlaždice priamo z OpenStreetMap (zadarmo, mierne používanie). Pred ostrou prevádzkou s väčšou návštevnosťou
  odporúčam poskytovateľa dlaždíc s bezplatným limitom (MapTiler alebo Stadia — treba účet). Súhlasíš?
- **STRÖMY (Z19):** miesta v okolí a popisy zvýrazneného vybavenia sú orientačné — nech ich Jana skontroluje v administrácii.
- **Captcha:** zapojená (pozri Denník). Pri napojení vlastnej domény klienta treba doménu pridať do widgetu `booking-platform`
  v Cloudflare (Turnstile → Hostname Management), inak sa overenie na tej doméne nenačíta.
- Ochrana stagingu: adresy *.vercel.app sú za prihlásením do Vercelu (aj chalet-stromy-demo.vercel.app). Ak chceš ukázať stránku Jane,
  treba buď vypnúť Vercel Deployment Protection pre produkčné nasadenie (stránka je neindexovaná, dáta ukážkové), alebo napojiť
  vlastnú doménu. Ktoré?
- Fotky showroomu: kľúč Pexels API (zadarmo) do `.env.local` ako `PEXELS_API_KEY` — potom ich doplním. Dovtedy zástupné obrázky.
- Kľúč Resend bol poslaný v chate — po dokončení Z11 ho v Resende vymeň za nový.
- **Jana:** skutočné ceny služieb a poplatku za zviera, storno pásma 11–13 a 15–29 dní, je platiteľka DPH? (zatiaľ orientačne)
- Supabase aj Vercel CLI sa z tvojho PC nevedia spojiť (Transport error / zaseknuté). Nevadí — Vercel je napojený cez web a databáza cez MCP; ak chceš CLI, treba pozrieť firewall/antivírus/proxy pre PowerShell.
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
- 2026-10-17 — Z28 (2. časť, dokončenie): **klik na skupinu v menu** (majiteľ aj riadiace centrum) vedie na prvú viditeľnú podstránku
  a skupinu rozbalí; rozbalená je len skupina aktívnej stránky; šípka je len znak; skupina s jedinou podstránkou je obyčajná položka
  (Prepojenia → Booking a Airbnb). **Drobčeky podľa spoločného pravidla:** `PageHeader` má `breadcrumbs` (malým písmom nad nadpisom,
  namiesto štítku), len od druhej úrovne — Rezervácie › Kalendár / Blokácie / Ručná rezervácia, Ponuka › Referencie, Nastavenia › Tím /
  E-maily a upozornenia, Objekt › <názov> › <záložka>, Klienti › <klient> › <záložka>, Moduly › Katalóg / Skúšobné doby, Klienti › Založiť
  klienta; na mobile len „‹ Späť na <rodič>“. Prehliadka majiteľa: text snímky menu a verzia. Playwright (klik na Rezervácie → Zoznam,
  Prepojenia bez šípky, drobčeky PC aj mobil). Celá sada 46/46. Pozor pri lokálnych testoch: server musí bežať s testovacími kľúčmi
  Turnstile (`npm run e2e:server`), inak padne rezervácia a prihlásenie hosťa. (Claude Code)
- 2026-10-17 — Z30: **košík — Pokračovať hneď po výbere termínu.** Platný termín → Pokračovať aktívne (pri otvorenom kalendári
  ho zbalí a ukáže doplnky, krok 1 ostáva); „Hotovo“ → „Potvrdiť termín“. Bez platného termínu je Pokračovať stlmené cez `aria-disabled`
  a nad ním je vždy veta prečo („Vyberte deň príchodu“ → „Vyberte deň odchodu“ → pravidlo ceny, napr. „V tomto termíne je minimum 3 noci.“;
  `aria-describedby`), klik vetu zvýrazní a posunie kalendár do pohľadu; na mobile veta nad zeleným pásom. „Zmeniť“ v súhrne skryté, kým je
  kalendár otvorený; termín v súhrne krátko (`24. – 26. 11. 2026`, `29. 11. – 2. 12. 2026`). Riadok istoty sa zalamuje, neoreže sa.
  Playwright `cart.spec.ts` (veta, aria-disabled, aktívne po výbere, krátky dátum, istota v okne 1440 × 900; axe). Celá sada 44/44. (Claude Code)
- 2026-10-17 — Z28 (1. časť): **riadiace centrum v1.2.** Zostáva z doplneného zadania: drobčeky podľa spoločného pravidla aj v administrácii
  majiteľa (+ mobil „‹ Späť na …“, `PageHeader` s `breadcrumbs`) a klik na skupinu v menu → prvá podstránka.
  - **Menu:** tmavé, položky cez celú šírku (hover biela 6 %, aktívna 10 % + 3 px čiara, text vždy svetlý — rovnaké premenné ako v Z27).
    Klienti › Všetci klienti, Založiť klienta · v detaile klienta jeho názov › Prehľad, Moduly, Vzhľad, Domény, Ľudia, Záznam zmien ·
    Moduly › Katalóg, Skúšobné doby · Stav systému · Audit. Skupina klienta sa skladá v prehliadači podľa adresy. **Drobčeky** na podstránkach.
  - **Detail klienta so záložkami** `/platform/tenants/[id]/(modules|theme|domains|people|audit)`: hlavička so stavom, Stránka pre hostí ↗,
    Otvoriť administráciu ↗. Domény `*.localhost` so štítkom „len vývoj“; Vzhľad = farby, písmo, zaoblenie a náhľad s menom klienta
    a skutočnými textami (bez zástupného textu); Ľudia s posledným prihlásením (testovacie účty sa neukazujú).
  - **Zoznam klientov = rozbaľovacie riadky** (bočný panel klienta odstránený): tržby tento/minulý mesiac (`tenant_monthly_stats`),
    rezervácie 30 dní a posledná, obsadenosť 90 dní (rovnaký výpočet ako Prehľad majiteľa), zdravie, moduly s koncom skúšky, majiteľ
    (meno, e-mail, telefón, posledné prihlásenie); Otvoriť detail / administráciu ↗ / Stránka pre hostí ↗. Načíta sa pri rozbalení,
    s prednačítaním pri prejdení myšou a fokuse.
  - **Moduly:** katalóg ako rozbaľovacie riadky (popis, závislosti, počet klientov, hotový / v príprave — recenzie, správy s hosťom,
    push, SMS, online check-in, upsell len ako riadky), klienti s prepínačom a **Priradiť klientovi**; to isté v záložke Moduly;
    **Skúšobné doby** zoradené podľa konca. Každá zmena ide do auditu (`platform_set_module`).
  - **Audit:** filtre od–do, kategória (Prihlásenie, Vstup správcu, Moduly a skúšky, Tím a prístupy, Nastavenia, Klienti), klient, osoba,
    hľadanie; 50 na stranu, **CSV** (bodkočiarky, UTF-8 s BOM). **Úspešné prihlásenia** sa zapisujú (`audit_sign_in`: heslom / odkazom,
    nikdy heslo ani zadaný e-mail; pri jednom klientovi patria jemu) + pgTAP. Neúspešné pokusy ostávajú len v limite podľa IP
    (`request_attempts`), v audite sa neukazujú — jednoduchší spôsob nebol.
  - **Drobnosti:** ukážkové kalendáre (`example.invalid`) sa v Stave systému a v zdraví klienta nehlásia ako chyba (štítok „ukážkový“).
  - Playwright `platform-v12.spec.ts` (menu a hover, drobčeky, rozbalenie klienta, priradenie modulu na dočasnom klientovi, filtre auditu
    a CSV; axe), staré testy na panel upravené. Prehliadka správcu: nové snímky a verzia. Celá sada 37/37 (test „02 overview“ na mobile
    občas prekročí čas pri plnej sade, samostatne prechádza — sledovať). (Claude Code)
- 2026-10-17 — Z29: **košík v2.2 pre 13″ notebook.** Zelený súhrn 320 px sa na 1440 × 800 vojde celý (názov, termín + „Zmeniť“
  vo všetkých krokoch, dospelí, cena + rozpis, Vaše doplnky; dole „← Späť na …“, tlačidlo a jeden riadok storna z podmienok objektu);
  istoty, referencia a Jana zo súhrnu presunuté do krokov. Krok 1 bez fotiek: s termínom začína doplnkami (jednoriadkové riadky ~54 px,
  rozbalenie na mieste, jeden naraz), referencia na sivej karte; bez termínu / po „Zmeniť“ kalendár + „Hotovo“ (Pokračovať stlmené).
  Krok 2: karta „Otázky pred rezerváciou? Odpovedá Jana.“ (WhatsApp, Zavolať — len s údajmi majiteľa). Krok 3: tri istoty nad súhlasmi.
  Lišta krokov 52 px, hotové kroky klikateľné späť. Znenie záväzného tlačidla nemenené (právny text). Termín z kalendára na stránke sa
  odovzdá košíku (otvorí sa rovno doplnkami). Prístupnosť: ceny v kalendári tmavšie (kontrast 4,37 → ≥ 4,5), „Zmeniť“ biele.
  Teardown e2e maže podržania termínu (limit 3 na jednotku blokoval opakované behy). Playwright `cart.spec.ts` (1440 × 800 bez posúvania
  súhrnu aj s 2–3 doplnkami, rozbalenie, Zmeniť → Hotovo, kroky 1–3; mobil 390 px; axe). (Claude Code)
- 2026-10-17 — Z27: **administrácia v1.2.**
  - **Menu so skupinami:** Rezervácie › Zoznam, Kalendár, Blokácie · Objekt › Údaje, Fotky, Ceny a sezóny, Stránka, Dokumenty
    (pri viacerých objektoch len „Objekty“ → zoznam) · Ponuka › Doplnkové služby, Referencie · Štatistiky · Prepojenia › Booking a Airbnb ·
    Nastavenia › Všeobecné, Tím, E-maily a upozornenia. Položky cez celú šírku, čiara medzi hlavnými, aktívna s 3 px čiarou,
    `aria-expanded`, skupina aktívnej stránky otvorená; moduly sa zaraďujú cez `group` v manifeste. **Platby** vynechané — nastavenia
    platby sú na stránke Všeobecné, samostatná stránka zatiaľ nie je. Zbalené menu: pri prejdení myšou/fokuse sa rozbalí celé
    (rovnako ako doteraz), takže skupiny sú viditeľné bez samostatného vyskakovacieho zoznamu. Farby menu cez premenné — tmavé menu
    riadiaceho centra má už hover biela 6 % / aktívna 10 % (Z28.1 tým čiastočne hotové).
  - **Štatistiky** (`/admin/statistics`): funkcia `tenant_monthly_stats` (tržby podľa termínu pobytu, noci rozdelené do mesiacov, len priame
    zaplatené; obsadenosť s portálmi bez blokácií; RLS) + pgTAP na prelom mesiaca a roka, zrušené a prázdne mesiace. Obdobie rok / 12 mesiacov,
    porovnanie s minulým rokom, 5 čísel, SVG graf (plná/bodkovaná/sivá, najsilnejší/najslabší, klik na mesiac → bublina + riadok) a tabuľka.
    Provízia portálov už bola v Nastaveniach (`portal_commission_bp`) — použitá. **Prehľad:** malý graf 12 mesiacov a „Tržby priamo“ roka
    teraz z tej istej funkcie (predtým podľa dátumu vytvorenia — čísla sa líšili).
  - **Zvonček** vpravo hore v spoločnej hornej lište (administrácia: hľadanie, Stránka pre hostí, zvonček, + Ručná rezervácia; riadiace
    centrum: zvonček; mobil: v hornej lište). Tabuľky `notifications` + `notification_reads` (RLS: člen tímu len svojho klienta, platformové
    len správca; zapisujú len databázové funkcie) + pgTAP. Vznikajú triggermi z udalostí (nová rezervácia, platba prijatá — kto ju označil,
    má ju prečítanú, žiadosť o storno, zrušenie, obsadenosť z portálu mimo prvého importu, kolízia, zlyhaná synchronizácia, neodoslané
    e-maily, nový klient) a každých 15 min (`notify_scheduled`: splatnosť do 24 h, koniec skúšky 7 a 1 deň). Jedna udalosť = jedno upozornenie;
    so zmazanou rezerváciou/obsadenosťou/kalendárom zmiznú aj jej upozornenia. **Nastavenia → E-maily a upozornenia** (len na čítanie).
  - **Ukážkové dáta:** `npm run demo-data` pridá 22 mesiacov histórie (45 rezervácií cez rovnaký výpočet ceny, zopár zrušených, pobyty
    z portálov, zima a leto silnejšie) a pár upozornení; e-maily z ukážky sa neposielajú.
  - Playwright `admin-v12.spec.ts` (menu, štatistiky, zvonček; PC aj 390 px, axe), prehliadka „Čo je nové“ v1.2 pre majiteľa
    (12 snímok, nové menu/Štatistiky/zvonček na začiatku). Celá sada 35/35. (Claude Code)
- 2026-10-17 — Z26: **rýchlosť bočného panela a dokumenty.** Meranie: funkcie Vercelu bežali v **iad1 (Washington)**
  (`X-Vercel-Id: fra1::iad1`), databáza vo Frankfurte; panel = celé nové vykreslenie stránky (~10–20 dotazov za sebou) → ~3 s
  na stagingu, ~850 ms lokálne bez akejkoľvek odozvy. Úpravy: `vercel.json` región **fra1** (bezplatný plán, jeden región);
  panely rezervácie a klienta sa otvárajú **hneď** — klik len zmení adresu (`history.pushState`), zoznam ani počty sa znova
  nenačítavajú, kostra panela hneď, detail zo samostatnej serverovej funkcie (`UrlPanel`, `loadReservationPanel`,
  `loadTenantPanel`), prednačítanie pri prejdení myšou / fokuse, po zmene sa detail obnoví. Po: panel viditeľný ~45 ms,
  plný detail ~320 ms (znova ~50 ms) — `docs/kontrola-mvp.md`, skript `scripts/perf-panel.mjs`. **Dokumenty v paneli:**
  nahrávanie za „Nahrať dokument“, nová veta „Hosť si ich stiahne vo svojom účte.“, v sekcii aj dokumenty objektu, ktoré hosť
  dostane (podľa viditeľnosti a stavu) s odkazom „upraviť pri objekte →“; pri objekte veta, že dokument pre jedného hosťa sa
  nahráva v jeho rezervácii. Playwright: panel hneď po kliku bez nového načítania zoznamu, dokumenty objektu v paneli. (Claude Code)
- 2026-10-17 — Z25: **riadiace centrum, roly a vstup správcu.** Grafitové bočné menu so štítkom „Riadiace centrum · vidíš len ty“,
  samostatné stránky Klienti / Moduly / Stav systému (kontroly po klientoch: kalendáre, neodoslané e-maily, posledná synchronizácia
  a odoslanie) / Audit (preložené záznamy); „Do administrácie“ z menu preč. **Vstup správcu:** „Otvoriť administráciu“ v paneli klienta
  otvorí novú kartu cez `/platform/enter/<id>` — overí správcu, zapíše `admin.entered` do auditu a nastaví cookie `admin_view_tenant`
  (8 h); administrácia potom beží pre daného klienta **bez členstva**, s grafitovým pruhom „Prezeráš ako správca: … · Späť do riadiaceho
  centra“ (`/platform/leave`). **RLS som nemenil** — všetky politiky už pustia správcu platformy (`or is_platform_admin()`), cookie
  platí len spolu s touto rolou. Výber ubytovania len pri viac ako jednom (inak len názov). Panel klienta v jednom stĺpci: súhrn s verejnou
  adresou ↗ (nikdy `*.localhost`), kontakt = majiteľ bez testovacích účtov, moduly ako riadky (stav, koniec skúšky na druhom riadku,
  Uložiť pri riadku), ľudia (meno · e-mail, rola), prevádzka, vzhľad, posledné zmeny zbalené; Stránka pre hostí a Otvoriť administráciu
  v novej karte. **Nový objekt** vidí a môže založiť len správca (formulár aj serverová akcia). Testovaciemu správcovi
  qa-admin@booking-platform.test som odobral staré členstvo u STRÖMY (aby test overoval vstup bez členstva); členstvá info@obrazne.sk
  nedotknuté. Playwright: vstup správcu (nová karta, pruh, audit, späť), majiteľ info+jana@ (bez výberu, bez riadiaceho centra a „Nový
  objekt“), stránky riadiaceho centra. Prehliadka správcu: nové snímky a texty, verzia 2026-10-17.3. (Claude Code)
- 2026-10-17 — Z24: **vzory administrácie v1.1.** Panel záznamu má **jeden stĺpec**: prilepená hlavička, súhrnná karta
  (`PanelSummary` — meno, kontakt, mriežka Príchod · Odchod · Noci · Hostia · Suma · Zdroj · Ubytovanie), hlavná akcia (platba),
  sekcie pod sebou, História a Súhlasy zbalené s počtom (`PanelCollapsible`), prilepená spodná lišta; dlhé mená, e-maily a slová sa
  zalamujú kdekoľvek (Playwright test s dlhými textmi na PC aj 390 px). Prerobený panel rezervácie a kalendára; `PanelColumns` zrušený.
  **Plochy:** token `--surface-card` #fafaf8 + vlasová linka #ecebe6, trieda `surface`; všetky karty administrácie (`[data-slot=card]`)
  ho majú automaticky, aj natívne `select` sú pilulky. **Rozbaľovacie riadky** `ExpandableList` (naraz jeden, `aria-expanded`,
  formulár „Pridať …“ ako nový riadok navrchu, po uložení sa zavrie): Doplnkové služby, Referencie (namiesto panela), importované
  kalendáre (názov a portál raz), Blokácie, Tím, miesta v okolí. Drobnosti: súhlasy a záznam zmien cez preklady (`auditLabel`),
  dokumenty jedným tlačidlom „Nahrať súbor“ (výber súboru hneď nahrá, bez názvu sa použije meno súboru) a v jednom stĺpci, širšie
  odsadenie bočného menu. Prehliadka „Čo je nové“: nové snímky, verzia 2026-10-17.2. (Claude Code)
- 2026-10-17 — Z23: **administrácia, riadiace centrum a prihlásenia podľa vizuálu v1.** Spoločné: bočné menu podľa dosky Sidebar
  (výber ubytovania, Obsadenosť, Tím/Nastavenia/Riadiace centrum, používateľ s Čo je nové · Odhlásiť, odznak čakajúcich platieb;
  zbaľovanie, pripnutie, rozbalenie aj klávesnicou), **`SidePanel`/`RecordPanel` 680 px, dva stĺpce od 1024 px**, nemodálny — klik na
  iný riadok prepne záznam, klik vedľa / Esc / Späť / krížik zatvorí, na mobile cez celú obrazovku s „‹ späť“ a lištou dole; polia
  ako pilulky (CSS cez `[data-admin-ui]`, košík hosťa nedotknutý); farby stavov a obsadenosti na jednom mieste (`src/core/admin/status.tsx`);
  téma platformy (Roboto, smrekovo zelená) aj v administrácii. **01** `/login` rozdelená obrazovka + prihlasovací odkaz na e-mail len
  pre existujúce účty administrácie (odpoveď neprezradí účet, limit podľa IP `staff_link`, odkaz z `APP_URL`, nie z hlavičky Host);
  názov platformy a e-mail podpory v `src/core/admin/brand.ts`. **02** prehľad: pozdrav, teplé karty čakajúcich platieb (Platba prijatá)
  aj žiadostí o storno, 4 čísla vrátane „Ušetrené na províziách ≈“ (nové `tenant_settings.portal_commission_bp`, predvolene 15 %,
  v Nastaveniach), najbližšie pobyty, obsadenosť 12 týždňov, stav synchronizácie. **03** rezervácie: filtre stavu ako pilulky s počtom,
  hľadanie, filter príchodu, panel podľa dosky vrátane **Predĺžiť splatnosť** (nová funkcia `extend_payment_due`, len personál, len
  čakajúce, max 14 dní). **04** kalendár: 2 mesiace (mobil 1), pásy od poludnia do poludnia, ceny vo voľných dňoch, panel podľa typu
  (rezervácia / portál / blokácia s úpravou dôvodu), výber dní → „Nový termín“ s cenou z toho istého výpočtu ako web, minimum nocí
  a kolízia; šípky a Enter. Ručná rezervácia sa dá predvyplniť z kalendára a **personál ju môže vytvoriť aj mimo pravidiel pobytu**
  (kratšie ako minimum — návrh: „hosť by si ho nevybral, ručne sa dá“), ceny rovnaké. **05** riadiace centrum: vlastné menu, čísla,
  klienti s modulmi, panel klienta (moduly, ľudia, prevádzka, vzhľad, zmeny), len počty bez údajov hostí. **06–07** mobil.
  **08** prihlásenie hosťa: fotka objektu, políčka na kód podľa skutočnej dĺžky kódu (vloženie celého kódu, posun), Zmeniť e-mail,
  Poslať znova po 45 s s novou captchou. 3 migrácie na stagingu, pgTAP (`admin_v1` 6, `request_limits` +1), 2 unit testy, Playwright
  `e2e/admin-v1.spec.ts` (PC aj 390 px, axe bez vážnych nálezov), snímky prehliadky obnovené a verzia zvýšená na 2026-10-17. (Claude Code)
- 2026-10-16 — **Captcha Cloudflare Turnstile** (managed) v kroku Platba košíka (odoslanie rezervácie aj overenie promo kódu)
  a pri žiadosti o kód do zóny hosťa; token sa overuje na serveri cez siteverify popri HMAC tokene a honeypote (`src/core/security/`).
  Token platí raz → po kontrole promo kódu a po odmietnutom odoslaní sa widget obnoví. Overenie zlyhá „nakrátko“ (bez tokenu alebo
  bez spojenia s Cloudflare = nie). Bez `TURNSTILE_SECRET_KEY` / `NEXT_PUBLIC_TURNSTILE_SITE_KEY` sa captcha vynechá (lokálne, CI).
  **Limit podľa IP** za hodinu: rezervácia 10, promo kód 30, žiadosť o kód 10, zadanie kódu 30 (zadanie kódu bez druhej captchy —
  kód je tajomstvo a chyby na e-mail sú už obmedzené). Tabuľka `request_attempts` ukladá len HMAC odtlačok IP, funkcia
  `hit_request_limit` počíta atomicky, prekročené pokusy nezapisuje a staré riadky (> 1 deň) maže; požiadavky bez verejnej IP
  (lokálny server, Playwright) sa neobmedzujú, chyba DB hostí neblokuje. Migrácia na stagingu, pgTAP test (8), unit testy (5).
  Playwright: `npm run e2e:server` (build + štart s verejnými testovacími kľúčmi Turnstile, ktoré vždy prejdú). (Claude Code)
- 2026-10-16 — Z22: **prehliadka „Čo je nové“** pre majiteľa (11 snímok) a správcu (8 snímok, riadiace centrum). Okno so snímkou,
  nadpisom, dvoma vetami, bodkami, Späť / Ďalej / Ukázať mi to, Esc a šípky; na mobile cez celú obrazovku s posunom prstom. Otvorí sa
  samo raz po prihlásení pri novej verzii (`profiles.tours_seen`, funkcia `mark_tour_seen` — každý zapisuje len sebe), znova z menu účtu
  **Čo je nové**. Snímky `npm run tour:screens` z ukážkových dát (1440 px) → `public/tours/`; e-maily a mená mimo ukážky rozmazané,
  karty na spoločnej stránke riadiaceho centra zvýraznené rámikom. Na stagingu pribudol testovací účet qa-admin@booking-platform.test
  (správca platformy, prihlásenie len odkazom cez serverový kľúč) kvôli snímkam. Playwright `tour.spec.ts` (počítač aj 390 px, axe). (Claude Code)
- 2026-10-16 — Z21: **ukážkové dáta STRÖMY na stagingu** (`npm run demo-data`, `-- --reset`). Rezervácie cez tú istú databázovú funkciu
  a výpočet ceny ako web: (a) 2026-0088 12.–15. 2. 2027, čaká na platbu, so šéfkuchárom; (b) 2026-0089 24.–28. 12. 2026, potvrdená
  a zaplatená, s dokumentom k rezervácii; (c) 2026-0090 7.–10. 8. 2026, ukončená. Ubytovací poriadok (PDF) pri objekte, 2 udalosti
  z iCal (Booking, Airbnb — kanály vypnuté, nič sa nesťahuje), blokácia „Údržba sauny“, modul Služby v skúške do 15. 11. + záznam v audite.
  Martin (info@obrazne.sk) už mal na stagingu členstvo **majiteľa** v STRÖMY — ponechané. Zóna hosťa: demo-host@obrazne.sk (kód príde
  cez presmerovanie stagingu na info@obrazne.sk). E-maily z ukážky sa neodoslali (označené „DEMO — neodoslané“). (Claude Code)
- 2026-10-16 — Z20: **potvrdenie rezervácie v2.1** (`/r/<kód>`). Príčina „čistej“ stránky: otvorila sa na adrese, ktorú systém
  nepriradil klientovi (technická adresa stagingu) → stránka teraz vždy presmeruje na verejnú doménu klienta, takže má jeho hlavičku,
  pätu a tému. Úvod s krstným menom a stavom, karta platby (QR, Suma/IBAN/VS s **Kopírovať**, termín úhrady), zelený pruh po zaplatení,
  **Čo bude ďalej** (4 kroky podľa stavu, dni pred príchodom z nastavení), zelený panel s fotkou, sumou, **Pridať do kalendára** (.ics —
  adresa len pri presnej polohe, inak mesto) a kontaktom; rozpis, účet hosťa, zmena plánov (formulár storna až po kliknutí), „Rezervovať
  znova“ po ukončení. Mobil: údaje pred QR + **Uložiť QR** (PNG). Playwright `confirm.spec.ts` (oba stavy, počítač aj 390 px, axe) —
  celá sada 12/12. (Claude Code)
- 2026-10-16 — Úlohy Z21 (ukážkové dáta na stagingu) a Z22 (prehliadka „Čo je nové“ pre majiteľa a správcu); A15, rozhodnutie. (Claude chat)
- 2026-10-16 — Vizuál **v2.1: potvrdenie rezervácie** (počítač aj mobil, stav čaká/zaplatené, Kopírovať, Pridať do kalendára) → `docs/navrhy/stranka-hosta/`, `docs/vizual-stranka-hosta.md`; úloha Z20. (Claude chat)
- 2026-10-16 — Z19: stránka hosťa, galéria a košík podľa **vizuálu v2**. Dáta (migrácia len pridáva): tabuľka **referencií**
  (skopírované z objektov, zvýraznené max. 5, zdroj, mesiac pobytu, zverejnená) + `reviews_url`, **kategória fotky** (albumy),
  **zvýraznené vybavenie** s popisom, **poloha** presná / približná (pri približnej návštevník nevidí ulicu ani súradnice ani cez API —
  funkcia `property_public_location` zaokrúhli na ~1 km) a **miesta v okolí**, téma v2 (doplnková medená farba na štítky, zaoblenie 10,
  tmavší odtieň akcentu pre plochy s bielym textom). Sekcie v2: úvod (galéria 1+2+5, referencia so šípkami, malá mapa, karta údajov,
  zelený panel), čo vás čaká (mriežka 3/2 so šachovnicou), kalendár na páse, okolie s mapou **OpenStreetMap (statické dlaždice, bez
  cookies a kľúča)**, tichý cenník s „v cene“, **pohľad dovnútra** (mozaika), referencie, dobré vedieť, zelená záverečná výzva
  s **najbližším voľným termínom** (počíta server). Predlohy v2 a existujúce stránky prestavané (texty sekcií ostali). **Galéria v okne**
  (albumy, mriežka, veľká fotka s pásom náhľadov, referencie vpravo; mobil prepínač Fotky/Referencie). **Košík v2** (do 1040 px, kroky
  vľavo, zelený súhrn vpravo s tlačidlom dole, doplnky ako rozbaľovacie riadky v kroku 1, zbaľovací kalendár; mobil cez celú obrazovku,
  zelený pás, rozpis zospodu). Správanie: tlačidlá neposúvajú stránku, naraz jedno okno, Esc a Späť zatvoria jednu úroveň.
  Administrácia: Referencie (zoznam + panel), album pri fotkách, záložka Poloha a okolie, zvýraznené vybavenie v záložke Stránka
  (upozornenie, ak počet nie je 3/6/9), odkaz na hodnotenia v Nastaveniach. Seed: kategórie fotiek, okolie (orientačné, ukážkové),
  referencie. 11 nových pgTAP (spolu 139), Playwright 9/9 na PC aj 390 px vrátane axe → `docs/kontrola-mvp.md`. (Claude Code)
- 2026-10-16 — Vizuál stránky hosťa **v2 schválený** (galéria a referencie ako Booking, mapa, košík v2, mobil) → `docs/navrhy/stranka-hosta/`, `docs/vizual-stranka-hosta.md`; architektúra (B1, B7, A12), rozhodnutie; úloha Z19. (Claude chat)
- 2026-10-16 — Z18: v editore objektu záložka **Stránka** — sekcie v poradí s vypínačom (kalendár je povinný, nedá sa vypnúť ani
  odstrániť), presúvanie šípkami aj klávesnicou (Alt + šípka na riadku), úprava v bočnom paneli (A18) cez **formulár generovaný zo zod
  schémy typu** (texty zatiaľ po slovensky, výber fotky z fotiek objektu, položky „Čo vás čaká“ z vybavenia objektu alebo vlastné,
  opakované položky s pridaním/presunom/odstránením; server obsah znova overí schémou), pri sekcii odkaz, kde sa menia údaje zo systému,
  „Pridať sekciu“ z chýbajúcich typov, odstránenie, „Obnoviť podľa predlohy“ s potvrdením (`owner_reset_sections`), náhľad stránky
  v novom okne. 2 nové pgTAP testy (spolu 128), 2 unit, Playwright test (vypínač, poradie klávesnicou, formulár) — stránku STRÖMY
  po sebe vráti do pôvodného stavu. Fronta Z16–Z18 hotová. (Claude Code)
- 2026-10-16 — Martin súhlasí s Cloudflare Turnstile (zadarmo); čaká sa na jeho účet Cloudflare a kľúče — zapísané v Otázkach. (Claude Code)
- 2026-10-16 — Z17: účet a zóna hosťa na doméne klienta (`/ucet`). **Prihlásenie kódom na e-mail** — kód vydá Supabase, ale e-mail
  posiela náš systém v téme klienta (nie spoločné e-maily Supabase); limit 5 kódov a 8 chybných pokusov za hodinu na e-mail,
  odpoveď neprezradí, či e-mail má pobyty; **účtom personálu a správcu platformy sa kód neposiela** (tie sa prihlasujú heslom).
  Po overení sa priradia doterajšie pobyty (overený e-mail). Na stránke rezervácie „Vytvoriť účet“ (kód na e-mail rezervácie).
  Zóna: najbližší pobyt ako karta hore, ďalšie a minulé ako zoznam; detail pobytu — platba s QR kým nie je zaplatené, pokyny
  k príchodu a kódy podľa pravidiel Z13 (inak vysvetlenie kedy), dokumenty (odkaz platný 10 min), rozpis, žiadosť o storno,
  **Rezervovať znova** (objekt, jednotka, hostia a služby predvyplnené); úprava kontaktu, **odvolanie marketingového súhlasu
  jedným klikom s históriou** (`guest_consent_events`), kontakt WhatsApp/telefón, odhlásenie. Doklady skryté. Administrácia:
  záložka Dokumenty pri objekte a dokumenty v paneli rezervácie (vždy / po potvrdení). Pokyny k príchodu sa upravujú v Údajoch
  objektu (zo Z8). 9 pgTAP testov, Playwright test celej zóny (6/6 testov prehliadačom). (Claude Code)
- 2026-10-16 — Z16: kontrola pred ukážkou → `docs/kontrola-mvp.md`. **Playwright** (`npm run e2e`, lokálne proti stagingu): rezervácia
  hosťa na PC aj mobile 390 px (kalendár, košík, služba, súhlasy, QR, odkaz, storno), majiteľ (ručná rezervácia, Platba prijatá,
  blokácia, kolízia z iCal), kalendár klávesnicou, axe bez nálezov — 5/5. **Nezávislá bezpečnostná kontrola** (samostatný agent):
  opravené 2 vážne (hosť si mohol zmeniť e-mail vo svojom zázname a prevziať cudzie budúce rezervácie; holdom sa dal zablokovať
  celý kalendár) a ďalšie (podpísaný čas formulára, SSRF pri iCal, časové pásmo, e-mail v profile, token exportu, presmerovanie
  po prihlásení, bezpečnostné hlavičky) — migrácia + 9 pgTAP testov (spolu 117). Prístupnosť: popisy dní kalendára, fotiek a QR,
  kontrast druhej vety nadpisov (`#84888e`). Rýchlosť: fotky cez `next/image` (AVIF), detail na mobile LCP 2,4 s. Testovacie
  e-maily na `*.test` sa neodosielajú. Ostáva: captcha a limit požiadaviek (otázka). (Claude Code)
- 2026-10-16 — Referencie: samostatná tabuľka, zvýraznené v košíku, pravidlá EÚ o recenziách (B1, rozhodnutie). Úloha príde spolu s košíkom v2. (Claude chat)
- 2026-10-16 — Vyhľadávací pás na web klienta vyradený z fronty (Martin: teraz ladíme len našu aplikáciu); fronta Z16–Z18. (Claude chat)
- 2026-10-16 — Fronta Z16–Z19 (kontrola, vyhľadávací pás, zóna hosťa, sekcie v administrácii). (Claude chat)
- 2026-10-16 — Z15: stránka hosťa podľa vizuálu v1 (rozdiel oproti Z9): **prilepený tmavý pruh** po zrolovaní pod úvod (názov, termín
  a noci, Spolu + cena na osobu, „Pozrieť pobyt“; bez termínu posunie na kalendár; skrytý pri otvorenom košíku), malý panel pri úvode
  bez „Rozbaliť“, **„Pozrieť pobyt“** na stránke, v pruhu aj na mobile (záväzné tlačidlo len v kroku 3), služby na stránke nie sú
  (len v košíku), galéria na mobile cez celú šírku. Overené: STRÖMY 21.–24. 12., 8 osôb = 2 900 € v paneli, pruhu aj košíku. (Claude Code)
- 2026-10-16 — Z14: detail objektu zo sekcií (B7). Tabuľka `property_sections` (typ, poradie, zapnutá, obsah JSON s prekladmi) + RLS,
  kalendár sa nedá vypnúť (aj v DB), **predlohy `section_templates`** (celý objekt, penzión s izbami, apartmány, glamping) — nový objekt
  dostane predlohu automaticky (podľa typu ubytovania, inak podľa režimu), existujúce doplnené. Register typov v kóde
  (`src/core/sections`: komponent + zod schéma; moduly cez `sections` v manifeste — `services` → „Na objednávku“, v predlohách nie je).
  Neplatný obsah alebo neznámy typ sa zapíše do logu a sekcia sa vynechá; prázdna sekcia sa skryje. Údaje zo systému (ceny, min. noci,
  storno, príchod/odchod, vybavenie, spôsob účtovania → nadpis cenníka) idú z dát. 15 typov podľa vizuálu v1 (galéria, úvod s panelom,
  čo vás čaká, fotka cez šírku, kalendár na svetlom páse, tmavý cenník, v cene, jednotky, o objekte, okolie, referencie, časté otázky,
  dobré vedieť, kontakt, záverečná výzva). Seed: STRÖMY s textami sekcií, showroom s rôznymi predlohami. Rovné rohy pri okrajoch
  obrazovky už sedeli (panely, spodný pás). 11 nových pgTAP testov (spolu 108) + 3 unit. (Claude Code)
- 2026-10-16 — Z13: dáta pre zónu hosťa (bez rozhrania). `guests` u klienta (e-mail jedinečný v rámci klienta; ten istý e-mail
  u dvoch klientov = dvaja hostia), rezervácia sa pri vzniku priradí hosťovi (trigger, existujúce doplnené), prepojenie na prihlásenie
  `claim_guest_account` len s overeným e-mailom, RLS: hosť vidí len svoje rezervácie, položky, riadky a platby u daného klienta.
  Dokumenty pri objekte alebo rezervácii v súkromnom buckete `guest-documents` (dočasné odkazy vydá server), viditeľnosť
  „vždy / po potvrdení“. Prístupové kódy `guest_arrival_instructions` len pri potvrdenom pobyte X dní pred príchodom. 12 nových testov. (Claude Code)
- 2026-10-16 — Z12: iCal. Export pre každú jednotku `/ical/<token>.ics` (len „obsadené“, bez údajov hostí); pre každý importovaný kanál
  samostatná adresa bez jeho vlastných udalostí (`?exclude=`), aby sa kalendáre neodrážali. Import kanálov (Booking, Airbnb, iný) —
  `ical_apply` v jednej transakcii: nové udalosti blokujú, **kolízia sa uloží ako neblokujúci konflikt a príde e-mail majiteľovi**
  (len pri novej/zmenenej kolízii, nie pri každej synchronizácii), zmiznuté udalosti termín uvoľnia. Synchronizácia vo workeri
  každých 5 minút, „Synchronizovať teraz“ v administrácii, ochrana pred internými adresami (len https, žiadne IP/localhost).
  Riadiace centrum: zdravie klienta (posledná rezervácia, kalendáre s chybou/kolíziou, neodoslané e-maily). Overené naživo
  (85 udalostí z verejného kalendára, export). CI bolo od Z10 červené kvôli testu predvolenej farby — opravené, 85 pgTAP + 37 unit. (Claude Code)
- 2026-10-16 — Z11: e-maily cez **Resend** (bezplatný plán, kľúč v `.env.local` a vo Verceli). Databáza zapisuje správy do fronty
  `email_outbox` (triggery na históriu stavov a žiadosť o storno; funkcia na pripomienku platby v posledných 6 h a pokyny pred príchodom
  X dní vopred), aplikácia ich vykreslí (preklady, farba témy) a odošle s opakovaním (2–16 min, potom failed). Platobné údaje s QR
  PAY by square ako vložený obrázok. Odkaz na rezerváciu v neskorších e-mailoch: token šifrovaný kľúčom z Vault (lookup ostáva cez hash).
  Worker `/api/jobs/run` volá **pg_cron + pg_net každú minútu** (tajomstvo v Vault; staging chránený Vercelom → vytvorený
  „automation bypass“ token pre tento worker). Na stagingu všetko **presmerované na info@obrazne.sk** (príjemca v predmete), odosielateľ
  testovacia doména Resend — vlastnú doménu (DNS) som nenastavoval. STRÖMY dostal na stagingu adresu `chalet-stromy-demo.vercel.app`
  (odkazy v e-mailoch na doménu klienta). Overené: 2 testovacie e-maily odoslané. (Claude Code)
- 2026-10-16 — Z10: rezervácie v administrácii — zoznam (stav, zdroj, príchod od–do, hľadanie, triedenie, stránkovanie, CSV) a bočný
  panel (rozpis, platba s VS a splatnosťou, **Platba prijatá**, Hosť prišiel / Pobyt ukončený, zrušenie s dôvodom, žiadosť hosťa
  o storno a jej zamietnutie, interné poznámky, história stavov s autorom, súhlasy). Kalendár obsadenosti mesiac × jednotky
  (rezervácie podľa stavu, blokácie, iCal, kolízie, rozpracované). Prehľad: dnešné príchody a odchody, čakajúce platby, žiadosti o storno.
  Ručná rezervácia rovnakým výpočtom ceny a tou istou DB funkciou (zdroj „ručná“, potvrdená alebo čaká na platbu, voliteľne zaplatená).
  **Automatické zrušenie po lehote: pg_cron v databáze každých 5 minút** (`expire_pending_reservations`), nezávisle od webu —
  Vercel Hobby dovoľuje cron len raz denne. Overené: potvrdenie platby 2026-0001, ručná 2026-0003. (Claude Code)
- 2026-10-16 — Vizuál stránky hosťa **v1 schválený** → `docs/navrhy/stranka-hosta/` + `docs/vizual-stranka-hosta.md`; úloha Z15. (Claude chat)
- 2026-10-16 — Z9 prerobená podľa schváleného vizuálu (`docs/vizual-stranka-hosta.md`): Roboto + JetBrains Mono, kicker, nadpis
  z dvoch viet (`properties.tagline`), linky `#e9e5db`, karty 24, jeden akcent (STRÖMY smrekovo zelená). Kalendár: sezóny podfarbené
  (`seasons.color`) s legendou, cena v dni, náhľad rozsahu, tmavá bublina (deň, sezóna a cena, min. noci a zľava; pri odchode cena pobytu,
  upozornenie pod minimom, nedá sa cez obsadené dni), nápoveda pod kalendárom. **Košík** ako bočný panel v troch krokoch (Váš pobyt —
  termín, hostia, Spolu a cena na osobu a noc, rozpis, istoty, kontakt WhatsApp/telefón z `tenant_settings`, jedno odporúčanie;
  Údaje a želania — kontakt, služby ako riadky s detailom posunom v paneli; Platba — súhrn, promo kód, súhlasy). Na mobile spodný pás
  a košík cez celú obrazovku. Bez nátlakových prvkov. Téma klienta platí na celej stránke (aj pre panely mimo stromu stránky).
  Pôvodná samostatná stránka formulára zrušená. Overené: STRÖMY 21.–24. 12. 2026, 8 osôb = 2 900 € (121 € na osobu a noc),
  so šéfkuchárom 3 420 €, rezervácia 2026-0002. Otvorené body návrhu (služby na stránke jednou vetou — tak je, zjednodušenie pravého
  panela) ponechané podľa návrhu Claude. (Claude Code)
- 2026-10-16 — Stránka objektu zo sekcií (B7, rozhodnutie), pravidlo rovných rohov pri okraji obrazovky; úloha Z14. (Claude chat)
- 2026-10-16 — Z9: stránka hosťa v téme klienta, neindexovaná. Katalóg s filtrami (typ, región, hostia, termín cez `free_units`);
  klient s jedným objektom ide rovno na detail aj s parametrami z widgetu. Detail: galéria, údaje, popis, jednotky (výber), vybavenie,
  v cene, cenník sezón, pravidlá, storno, referencie a rezervačný box s **kalendárom ako samostatným komponentom**
  (`src/core/booking/availability-calendar.tsx` — obsadenosť, cena za noc v dni, min. noci podľa dňa príchodu, dni príchodu).
  Rezervačný formulár: osoby, zvieratá, služby (modul), voliteľné poplatky, údaje, poznámka, promo kód (overí server — kódy sa nikdy
  neposielajú do prehliadača), súhlasy (VOP a storno povinné, marketing nepovinný a nezaškrtnutý), živý rozpis. Dočasná blokácia termínu
  pri otvorení formulára (30 min, opakované otvorenie ju neblokuje). Server prepočíta cenu a vytvorí rezerváciu so service kľúčom;
  ochrana proti robotom: skryté pole + minimálny čas vyplnenia. Stránka rezervácie cez tajný odkaz: stav, platobné údaje,
  **QR PAY by square**, rozpis, žiadosť o storno. Overené na stagingu: STRÖMY 5.–8. 2. 2027, 4 osoby, raňajky, kód ZIMAVJASNEJ15
  → 2 347,50 €. Oprava: politika číselníkov odkazovala na `tenants` (hosť nemal prístup) — nová migrácia + test. (Claude Code)
- 2026-10-16 — Zóna hosťa (B10) v architektúre, Fáza 4 a príprava dát Z13. (Claude chat)
- 2026-10-16 — Schválený vizuál stránky hosťa → `docs/vizual-stranka-hosta.md`, odkaz v Z9. (Claude chat)
- 2026-10-16 — Z8: administrácia objektov (zoznam, založenie s predvolenou jednotkou a sezónou; editor s kartami Údaje — údaje, texty
  viacjazyčne, vybavenie z číselníkov, neverejné pokyny k príchodu; Fotky — nahrávanie so zmenšením v prehliadači na 2 000 px, popis,
  poradie, mazanie; Sezóny a ceny — tabuľka cenníka, termíny aj cez Nový rok, dni príchodu, min./max. nocí, ceny po jednotkách,
  upozornenie na prekryv sezón a chýbajúcu predvolenú; Poplatky a zľavy; Jednotky pri režime po jednotkách), služby (modul), blokácie,
  nastavenia klienta (IBAN, lehota, blokácia, storno, právne odkazy, e-mail majiteľa, dni pred príchodom). Testovací prístup bez hesla:
  `scripts/qa-login-link.mjs` vytvorí používateľa qa@booking-platform.test (majiteľ ukážkových klientov) a jednorazový odkaz cez `/auth/confirm`. (Claude Code)
- 2026-10-16 — Z7: dátový model B1 celý (objekty, jednotky, číselníky, fotky, vekové pásma, sezóny s opakovanými rozsahmi aj cez Nový rok,
  ceny, poplatky vrátane vratnej kaucie, zľavy, služby, iCal kanály, rezervácia s položkami/riadkami/platbami/históriou/súhlasmi/poznámkami,
  obsadenosť). **Dvojitej rezervácii bráni `EXCLUDE USING gist` nad obsadenosťou** (aj pre súbežné zápisy); upratovací deň predlžuje rozsah;
  kolízia z iCal sa uloží ako neblokujúci konflikt. Rezervácia vzniká len funkciou `create_reservation` so service kľúčom (server prepočíta cenu),
  stavy len cez funkcie s históriou, hosť cez odkaz s tokenom (uložený len hash). Výpočet ceny `src/core/pricing` — **zľavy sa nesčítavajú,
  vyhráva najvýhodnejšia**; služby sú cenový príspevok modulu. 75 pgTAP + 35 unit testov. Seed: STRÖMY s reálnymi údajmi a 26 fotkami
  v úložisku, showroom 6 vymyslených objektov (zatiaľ bez fotiek — otvorené zdroje sú slabé, viď Otázky), demo IBAN.
  Lokálne PC: AVG skenovanie HTTPS blokovalo CLI — Martin vypol, Supabase a Vercel CLI fungujú. (Claude Code)
- 2026-10-16 — Ručné rezervácie sa rátajú do provízie, blokácie bez údajov hosťa a ceny (ROZHODNUTIA, A10, B2). (Claude chat)
- 2026-10-16 — Časť B (doména B1–B9) a rozsah MVP v architektúre; fronta Z7–Z12 (MVP Chalet STRÖMY + showroom). (Claude chat)
- 2026-10-16 — Z2 a Z6 dokončené: Martin napojil Vercel cez web (CLI sa nepripojí), staging https://booking-platform-obrazne.vercel.app
  priradený Ukážkovému klientovi; Martin (účet si založil sám) pridaný do `platform_admins` a ako `owner` oboch klientov (zapísané v audite). (Claude Code)
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
