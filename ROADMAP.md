# ROADMAP — Booking platform

*Kde sme a čo ostáva. Čo staviame → `ARCHITEKTURA.md`. Prečo → `ROZHODNUTIA.md`.*

**Legenda:** 🧠 = rozhoduje Martin s Claude (návrh, chat) · 🔧 = robí Claude Code (kód, súbory, Git)
☐ otvorené · ☑ hotové

## Aktuálne
- **Kde sme (16. 10.):** kostra platformy Z2–Z6 hotová na stagingu https://booking-platform-obrazne.vercel.app. Časť B (doména) a rozsah MVP
  sú v `ARCHITEKTURA.md` (B1–B9, časť C). **Stavia sa MVP pre Chalet STRÖMY + showroom** (Z7–Z12).
- **Ďalší krok pre Claude Code:** fronta Z10 → Z15, za sebou bez prerušenia (`CLAUDE.md` → *Režim práce*).
- **Ďalší krok pre Martina:** preklikať staging; odpovedať na otázky nižšie, keď bude čas (neblokujú prácu).
- **Claude chat:** obchodný model, otázky pre Janu, kontrola výsledkov Z7–Z12.

## Zadanie pre Claude Code
*Sem píše Claude chat konkrétne pokyny. Môže tu byť **fronta viacerých úloh (Z1, Z2, …)** — `/dalej` vezme prvú neoznačenú,
po dokončení ju označí ✅ (text nechá) a ďalšiu začne až pri ďalšom `/dalej`. Keď sú všetky ✅, sekciu vyprázdni.*

*Hotové Z1–Z6 (analýza, projekt, klienti a oddelenie dát, preklady a téma, moduly a administrácia, riadiace centrum) — detail v Denníku a histórii Gitu.*

**Kontext pre celú frontu Z7–Z12:** staviame **MVP pre Chalet STRÖMY a showroom** podľa `ARCHITEKTURA.md` **časť B (B1–B9) a časť C**
(rozsah MVP v tabuľke). Dátový model staviaj **celý podľa B1** (aj veci mimo rozhrania MVP: jednotky, cena za osobu, vekové pásma, poplatky,
zložená jednotka len pripraviť), rozhranie len pre to, čo je v MVP. Všetko s `tenant_id`, RLS a testami; peniaze v centoch; texty cez preklady;
vzhľad podľa A12 a A18. Technické detaily rozhoduješ sám a zapisuješ do Denníka.

### Z7 ✅ — Doménové tabuľky, obsadenosť a výpočet ceny
1. Migrácie podľa B1: objekty, jednotky, fotky (úložisko s cestou podľa klienta), číselníky (typ, vybavenie, región, vhodné pre — s prekladmi),
   sezóny, ceny, poplatky, zľavy (dĺžka pobytu, promo kód), služby (modul `services`), iCal kanály, rezervácia (hlavička, položky, riadky ceny,
   platby, história stavov, súhlasy, prístupový token), **obsadenosť s obmedzením proti prekryvu** (B2).
2. RLS a pgTAP testy: oddelenie klientov, **test, že databáza odmietne dvojitú rezerváciu** aj súbežne vytvorené rezervácie.
3. **Výpočet ceny ako čistá funkcia** (B3) s jednotkovými testmi — vrátane prípadov STRÖMY: 21.–24. 12. = 2 × 850 + 1 × 1 200; min. nocí podľa
   sezóny dňa príchodu; zľava od 6. noci; promo kód; služby za osobu, za noc, za osobu a noc, fixne; daň zahrnutá v cene.
4. **Seed:** Chalet STRÖMY z `docs/podklady/chalet-stromy-podklady.md` (údaje, sezóny opakované každý rok, ceny, služby a poplatok za zviera
   s orientačnými cenami, zľava −10 % od 6 nocí, storno podmienky, 3 referencie). Fotky: Martinove lokálne kópie z booking-demo
   (`podklady/fotky-stromy/`, mimo Gitu), ak nie sú, opýtaj sa. **Prístupové kódy a Wi-Fi do seedu nedávaj.**
   Showroom: 6 vymyslených objektov podľa časti C pod Ukážkovým klientom, fotky z voľne použiteľných zdrojov (zapíš zdroj a licenciu).

### Z8 ✅ — Administrácia: objekty, ceny, služby
Editor objektu a jednotky (texty viacjazyčne, fotky so zmenšením v prehliadači, vybavenie, pravidlá, **neverejné pokyny k príchodu**),
sezóny a ceny (prehľadne, kontrola prekryvov), poplatky a zľavy, služby (modul), blokácie termínov, nastavenia klienta (platobné údaje —
IBAN, príjemca, lehota v hodinách; storno podmienky; odkazy na VOP a ochranu údajov). Všetko v kostre administrácie a s bočným panelom.

### Z9 ✅ — Stránka hosťa a vytvorenie rezervácie
Podľa B7: katalóg s filtrami (showroom), detail objektu s kalendárom dostupnosti a cien, rezervačný tok (termín a osoby aj z parametrov adresy,
služby, údaje, poznámka, súhlasy vrátane nepovinného marketingového, súhrn s rozpisom). Server prepočíta cenu, vytvorí rezerváciu so stavom
*čaká na platbu*, blokáciou do lehoty a zamrazenými riadkami. Potom stránka s platobnými údajmi a **QR PAY by square** (VS = číslo rezervácie)
a **prístupový odkaz** na rezerváciu (stav, platobné údaje, žiadosť o storno). V téme klienta, mobil prvý, neindexovať. Ochrana proti robotom.
**Vizuál: podľa `docs/vizual-stranka-hosta.md`** (schválené 16. 10.) — kalendár s cenami v dňoch a bublinou pri prechode myšou ako
samostatný komponent, košík ako bočný panel v troch krokoch (Váš pobyt → Údaje a želania → Platba), detail služby posunom v paneli,
kontakt na majiteľa (WhatsApp, telefón), na mobile spodný pás a výber termínu v spodnom okne. Bez akýchkoľvek nátlakových prvkov.

### Z10 — Rezervácie v administrácii
Zoznam s filtrami a bočným panelom (B8), **kalendár obsadenosti** (mesiac × jednotky; rezervácie, blokácie, iCal), prehľad na úvodnej stránke
(dnešné príchody, odchody, čakajúce platby), potvrdenie platby, zrušenie, žiadosti o storno, **ručná rezervácia**, poznámky, história stavov,
export CSV. **Plánovaná úloha:** automatické zrušenie po lehote a uvoľnenie termínu.

### Z11 — E-maily
Transakčná služba s API (vyber sám, bezplatný plán; ak by niečo stálo peniaze, opýtaj sa). Šablóny s prekladmi a témou klienta, fronta s opakovaním,
záznam odoslaných. Správy z B6 (bez žiadosti o recenziu); pokyny pred príchodom X dní vopred (nastaviteľné). Na stagingu posielaj z testovacej
domény služby alebo presmeruj všetko na Martinov e-mail; **vlastnú odosielaciu doménu (DNS) nenastavuj bez Martina.**

### Z12 — iCal
Export per jednotka (tajný odkaz), import kanálov (Booking, Airbnb) s pravidelnou synchronizáciou, udalosti do obsadenosti, **kolízia = upozornenie**
majiteľovi (e-mail) a v riadiacom centre (zdravie klienta), stav posledného behu. Na konci: všetko nasadené na staging a Martinovi krátky postup,
čo si preklikať (rezervácia ako hosť na STRÖMY, potvrdenie platby, kalendár, iCal).

### Z13 — Príprava dátového modelu na zónu hosťa (B10)
Len dáta a testy, bez rozhrania: hosť ako záznam klienta (`tenant_id`, e-mail jedinečný v rámci klienta), voliteľné prepojenie na prihlásenie
(Supabase Auth), priradenie rezervácií cez overený e-mail, dokumenty pri objekte a pri rezervácii v súkromnom úložisku (dočasné odkazy),
viditeľnosť prístupových kódov až pri potvrdenom pobyte. RLS: hosť vidí len svoje rezervácie u daného klienta. Ak už niečo z toho Z7 urobila,
len to over a doplň chýbajúce.

### Z14 — Detail objektu zo sekcií
Podľa `ARCHITEKTURA.md` → B7 *Detail objektu sa skladá zo sekcií* a `ROZHODNUTIA.md` (16. 10.).
1. Migrácia: sekcie stránky objektu (`tenant_id`, objekt, typ, poradie, zapnutá, obsah ako JSON s prekladmi) + RLS a pgTAP testy.
   Predlohy podľa typu ubytovania ako dáta (výber a poradie typov), použité pri založení nového objektu.
2. Register typov sekcií v kóde: typ = komponent + zod schéma obsahu; moduly pridávajú typy cez svoj manifest (`services` → služby).
   Neplatný obsah sa nevykreslí a zapíše sa do logu, stránka nespadne.
3. Detail objektu zo Z9 prestav na vykresľovanie zo sekcií (doterajšie časti → typy sekcií). Kalendár s cenami je povinný.
   Prázdna sekcia sa skryje. Údaje zo systému (za objekt / za osobu, min. noci, storno, príchod/odchod, vybavenie, ceny) sa dosadzujú
   z dát, nepíšu sa do obsahu sekcie.
4. Seed: sekcie pre Chalet STRÖMY (predloha „celý objekt“) a pre objekty showroomu (rôzne predlohy, nech je vidieť rozdiel).
5. Rozhranie v administrácii **nestavaj** (príde po MVP). Typy sekcií a ich vzhľad stavaj rovno podľa **vizuálu v1**
   (`docs/vizual-stranka-hosta.md` → *Detail objektu*) — zvyšok vizuálu v1 dorobí Z15.
6. Pravidlo vzhľadu: prvky prichytené k okraju obrazovky (bočný panel na stránke aj v administrácii, prilepený pruh, spodný pás na mobile)
   majú **rovné rohy**; zaoblené sú len prvky, ktoré na stránke plávajú (karty, tlačidlá, bubliny). Uprav, kde to dnes nesedí.

### Z15 — Stránka hosťa podľa vizuálu v1
Martin schválil vizuál **v1 (16. 10.)**: popis `docs/vizual-stranka-hosta.md` (začni sekciou *Zmeny oproti prvému popisu*), zdroj plátna
`docs/navrhy/stranka-hosta/` (ako ho čítať: `docs/navrhy/README.md`). Košík v troch krokoch, kalendár a mobilný pás už sú zo Z9 —
**dorob len rozdiel:** detail objektu ako vizuálne sekcie v poradí podľa popisu (ak to nespravila Z14), **služby na stránke vôbec nie**
(len v košíku), malý pravý panel bez „Rozbaliť“, **prilepený pruh** pri rolovaní (skrytý pri otvorenom košíku), **texty tlačidiel**
(„Pozrieť pobyt“ na stránke aj v pruhu a na mobile, záväzné tlačidlo až v kroku 3), rovné rohy pri okrajoch obrazovky.
Texty cez preklady, farby z témy. Logiku rezervácie a výpočtu ceny nemeň.

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
