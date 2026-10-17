# ROZHODNUTIA

*Denník rozhodnutí: čo, kedy a prečo. Najnovšie hore. Výsledok sa vždy premietne aj do `ARCHITEKTURA.md`.*

## 2026-10-17 — Vizuál administrácie v1

- Administrácia, riadiace centrum a všetky prihlásenia majú **rovnaký vizuálny jazyk ako stránka hosťa v2** (Martin: „nech to všetko ladí“) —
  `docs/vizual-administracia.md`, `docs/navrhy/administracia/`.
- **Bočné panely so záznamom široké (680 px, dva stĺpce)**, nie úzke pásiky — majiteľ vidí celú rezerváciu takmer bez rolovania a naľavo
  stále číslo a meno, takže preskakuje medzi riadkami bez zatvárania. Zatvára ich aj **klik vedľa** (Martin 17. 10.).
- **Polia formulárov ako pilulky** v rovnakej výške ako tlačidlo — formulár pôsobí ako jeden celok (Martin 17. 10.).
- **Kalendár ukazuje ceny vo voľných dňoch** a výber dní rovno počíta cenu a kontroluje minimum nocí aj kolízie — majiteľ pri telefonickej
  rezervácii nemusí otvárať cenník. Výpočet je ten istý ako na webe.
- **Riadiace centrum má vlastné menu bez výberu ubytovania** — je to Martinovo prostredie naprieč klientmi; menu majiteľa by mátlo. (Claude)

## 2026-10-16 — Ukážkové dáta a prehliadka „Čo je nové“

- Martin si chce celý systém preklikať ako majiteľ aj ako správca → **ukážkové dáta pre STRÖMY na stagingu** (pár rezervácií v rôznych
  stavoch, blokácie z iCal, dokumenty, účet hosťa). Dáta sú označené a dajú sa jedným skriptom obnoviť alebo zmazať; na produkciu nikdy.
- Prehliadku robíme **priamo v aplikácii**, nie ako samostatný dokument: rovnaká vec poslúži Martinovi teraz, novým klientom pri štarte (A11)
  a neskôr ako „čo je nové“ po každej verzii. Snímky robí skript (Playwright) z ukážkových dát → po zmene rozhrania sa dajú obnoviť jedným príkazom. (Claude)

## 2026-10-16 — Stránka hosťa v2 (inšpirácia Bookingom, prémiový pokoj)

- Martin schválil **vizuál v2** (`docs/vizual-stranka-hosta.md`, `docs/navrhy/stranka-hosta/`). Hlavné dôvody zmien:
  - **Hosť sa rozhoduje o tisícoch eur** — potrebuje fotky, referencie a polohu hneď hore (vzor Booking), cenu stále na očiach (zelený panel,
    lišta, zelený súhrn v košíku) a fakty namiesto nátlaku (najbližší voľný termín, nie „nezmeškajte“).
  - **Široký košík** s pevným súhrnom vpravo: doplnky môžu byť už v kroku 1, lebo cena a tlačidlo sa neodsunú (v úzkom paneli boli v kroku 2).
  - **Nič neskáče:** výber termínu vždy v bočnom paneli, naraz najviac jedno okno, Späť zatvorí jednu úroveň — aby sa hosť nestratil.
  - **Prémiový dojem = zdržanlivosť:** menšie zaoblenie (10 px), vlasové linky namiesto kariet s medzerami, tichý cenník, jedna doplnková farba
    len na drobnosti, grafitové tlačidlo na farebnej ploche.
- Bez známky typu 9,5 a počtu hodnotení — nemáme overené recenzie (pravidlá EÚ); mapa OpenStreetMap (bez poplatkov a cookies), nie Google.
- Mobil kreslený zvlášť (zelený pás dole namiesto panela, galéria s prepínačom Fotky / Referencie).

## 2026-10-16 — Referencie ako sociálny dôkaz v košíku

- Hosť sa pri rozhodovaní (pobyt za tisíce eur) potrebuje uistiť — preto **fotky a referencie aj v košíku**, nielen na stránke (Martin).
- Referencie **samostatná tabuľka** (nie zoznam v objekte): dajú sa zdieľať medzi objektmi, zvýrazniť do košíka, zoradiť a neskôr ich
  doplní modul Recenzie z overených pobytov. Doterajšie `properties.testimonials` sa skopírujú, stĺpec ostane (migrácie len pridávajú).
- V košíku **jedna naraz, šípky ručne** — automatický karusel ruší a zhoršuje prístupnosť. „Všetky referencie“ najprv **v paneli**,
  externý odkaz na web klienta až potom (nová karta by hosťa vytiahla z rozpracovanej rezervácie). (Claude, Martin súhlasil so smerom.)
- **Pravidlá EÚ (smernica Omnibus):** ak obchodník zobrazuje hodnotenia, musí povedať, či a ako overuje, že sú od skutočných hostí.
  Preto veta o pôvode pri referenciách, žiadne vymyslené hodnotenia ani hviezdičky; mená hostí len so súhlasom (inak iniciála).

## 2026-10-16 — Stránka objektu zo sekcií, nie builder

- Každé ubytovanie je iné, ale **voľný builder (štýl Elementor) nebude** — klient by si rozbil vzhľad a mobil, stránky by sa rozišli,
  preklady by boli chaos a podpora drahá; zmena rozloženia ostáva platená práca (A12).
- Namiesto toho **knižnica pevných typov sekcií** (rovnaké pre všetkých, vzhľad z témy, presne dané polia). Pri objekte sa určuje len
  **ktoré sekcie, v akom poradí a ich texty**. **Predlohy podľa typu ubytovania** (celý objekt, penzión s izbami, apartmány, glamping) =
  prednastavený výber a poradie; volí sa pri zakladaní klienta. Prázdna sekcia sa skryje.
- **Čo vyplýva z dát, sa nepíše:** „platíte za celý objekt“, min. noci, storno, príchod/odchod, vybavenie sa zobrazujú z nastavení cien
  a objektu — klient píše menej a stránka si nemôže protirečiť s výpočtom ceny.
- **Načasovanie:** dátový model a vykresľovanie zo sekcií hneď (Z14); rozhranie na vypínanie a presúvanie sekcií v administrácii po MVP —
  pre STRÖMY sekcie nastavíme my. (Martin súhlasil s návrhom Claude.)
- Súvisiace pravidlo vzhľadu: **zaoblené sú prvky, ktoré na stránke „plávajú“** (karty, tlačidlá, bubliny); **čo je prichytené k okraju
  obrazovky, má rovné rohy** (bočný panel, prilepený pruh, spodný pás na mobile) — platí aj pre bočný panel administrácie.

## 2026-10-16 — Zóna hosťa

- Hosť bude mať **účet a vlastnú zónu** (Martin): pobyty, PDF od majiteľa, doklady, pokyny k príchodu, zopakovanie rezervácie, správy majiteľke.
  Rezervácia ostáva možná aj bez účtu.
- **Účet je u konkrétneho klienta, nie spoločný na platforme** — za údaje hostí zodpovedá každý ubytovateľ zvlášť a platforma ich nesmie
  spájať (Claude, technické/právne). Prihlásenie bez hesla (kód/odkaz na e-mail).
- V MVP prístupový odkaz, účet a zóna hneď po MVP; dátový model sa pripraví hneď (Z13).

## 2026-10-16 — Ručné rezervácie a provízia

- **Ručná rezervácia zapísaná v systéme sa ráta do provízie** rovnako ako priama rezervácia (Martin). Majiteľ dostane všetky výhody
  (faktúry, e-maily, štatistiky, kalendár); kto si rezerváciu vybaví mimo systému, robí všetko dvakrát.
- Do provízie sa **nerátajú** rezervácie importované cez iCal z Bookingu a Airbnb (už platí) ani **blokácie** termínu (osobné použitie, údržba).
  Blokácia preto nesmie mať údaje hosťa ani cenu — inak by sa dala použiť ako obchádzka.
- Ceny služieb a storno pásma STRÖMY zatiaľ orientačne.

## 2026-10-16 — Doména (časť B) a rozsah MVP

- Doménové požiadavky prevzaté z v1 (schválené v auguste) a z rozhodnutí WordPress fázy, prispôsobené aplikácii — `ARCHITEKTURA.md` B1–B9.
  Martin: veci, na ktorých sme sa už zhodli, sa nemajú znova odsúhlasovať; stavia sa ďalej.
- **Obsadenosť ako jedna tabuľka s obmedzením proti prekryvu v databáze**; cena po nociach podľa sezóny každej noci, min. noci podľa dňa príchodu.
- **Výpočet ceny ako čistá funkcia s testami**, server vždy prepočíta a zamrazí.
- **Ručná rezervácia** majiteľom (telefón) je v MVP — inak by majiteľ viedol druhý kalendár mimo systému.
- **Služby bez doplňujúcich polí** (pokračuje rozhodnutie z 13. 10.), poznámka hosťa ostáva.
- **Rozsah MVP** podľa tabuľky v časti C; showroom so 6 vymyslenými objektmi + Chalet STRÖMY s reálnymi údajmi.

## 2026-10-16 — Čistý projekt namiesto kópie Rental Van (po analýze Z1)

- **Platforma sa začne čistým Next.js projektom** a z existujúcich aplikácií sa prenášajú vybrané časti. Nahrádza „základ: Rental Van“.
  Dôvody z analýzy (`docs/analyza-existujucich-appiek.md`): Rental Van stojí na vlastnom PHP API nad MariaDB a vlastnom prihlasovaní —
  presne vrstva, ktorá sa mení; Credit Manager je Vite SPA; ani jedna nemá klientov, RLS podľa klienta, preklady, centy ani moduly.
  Z kópie by ostali len vizuálne komponenty, ktoré sa dajú preniesť po jednom (s prekladmi). Na čas to vplyv takmer nemá.
- **Prenáša sa:** kostra administrácie (RV `AdminShell`/`AdminSidebar`, CM pás ikon), zoznam s filtrami a CSV (RV), kalendár obsadenosti (RV,
  prerobiť na noci a jednotky), zmenšenie fotiek a úložisko s podpísanými URL, vzory rezervácie (snímka cien, história úprav, stavový automat
  s e-mailmi, prepočet ceny na serveri), bezpečnostné SQL vzory a postup migrácií (CM).
- **Potvrdené analýzou:** Rental Van dvojitej rezervácii nebráni nič → obmedzenie v databáze (A16) je nutnosť.
- Technické voľby (rozhoduje Claude): aktuálny Next.js, strict TypeScript, shadcn/ui čerstvo, `@supabase/ssr`, Supabase CLI, testy RLS s asserciami (pgTAP),
  e-mailové šablóny s prekladmi a fronta s opakovaním.

## 2026-10-16 — Nasadenie u klienta s vlastným webom

- **Rezervácia beží na subdoméne klienta** (`rezervacia.<domena>`) v jeho vizuáli — hosť stále vidí doménu klienta a nepreľakne sa.
  Celá objednávka vrátane platby prebehne tam.
- **Odporúčaná úroveň: widget na webe klienta** (vyhľadávací pás, neskôr kalendár s cenami) → hosť pokračuje na subdoméne
  s predvyplneným termínom. Pôsobí ako súčasť webu klienta, zložitý tok a platba ostávajú v aplikácii.
- Celá rezervácia vložená cez iframe len na želanie (krehkejšie).
- **Chalet STRÖMY:** web na WordPresse s Elementorom → `rezervacia.chaletstromy.sk` + vyhľadávací pás na jej webe (Martin: „to sa mi páči“).

## 2026-10-16 — Predajný web

- **Predajný web (showcase) vo WordPresse s CrocoBuilderom**, nie v aplikácii. Dôvody: obsahový web, ktorý Martin mení sám bez nasadzovania kódu;
  overený postup (obrazne.sk, MCP, Rank Math, GTM, cookie banner); oddelenie — zmena webu nerozbije rezervácie; využije existujúci hosting.
- **Prepojenie s aplikáciou:** rovnaké farby a písma, skutočné screenshoty, odkaz na ukážkového klienta, kalkulačka úspor ako widget z aplikácie.
- **Poradie:** MVP pre Chalet STRÖMY → značka a obchodný model → predajný web (cieľ pred eventom v Žiline). Texty typu „platíte len za to,
  čo využijete“ musia sedieť s cenníkom.

## 2026-10-16 — Veľký obraz: čo ešte patrí do produktu

- **Spolupráca:** technické detaily rozhoduje Claude a zapisuje sem; Martin rozhoduje o peniazoch, práve a o tom, čo uvidia klienti.
- **Obchodný model platformy** (Martinove faktúry klientom: zriadenie, mesačný poplatok, mikro-provízia, moduly, odporúčací program)
  sa do systému doplní; model sa ešte navrhne tak, aby bol výhodný pre klientov aj pre Martina (`ARCHITEKTURA.md` A10).
- **Predajné materiály** s vymyslenými číslami a citátom sú zatiaľ len pracovná idea; von až s reálnymi číslami. Údaje u Jany
  (podiel priamych rezervácií, provízie OTA) zbierať od začiatku ako východiskový stav.
- **Showroom:** vývoj s vymyslenými objektmi rôznych druhov + Chalet STRÖMY s reálnymi fotkami a údajmi na prezentáciu Jane.
- **Odchod z OTA je cieľ produktu**; prechodné obdobie sa aj tak musí riešiť (synchronizácia, upozornenia, postup pri dvojitej rezervácii).
- **Sprievodca zakladaním klienta** ako checklist v riadiacom centre; klient vidí, čo od neho čakáme.
- **Podpora cez chatbot** (napr. Smartsupp, vkladá sa kódom) a dokumentáciu, aby Martin netelefonoval celý deň.
- **Vzhľad:** premenné (farby, písma, logo, svetlý/tmavý režim) v cene; zmena rozloženia za príplatok.
- **Push notifikácie na mobil = upsell modul**; e-mail o novej rezervácii ostáva v jadre (inak by majiteľ prehliadol rezerváciu).
- **Meranie povinne:** vlastné štatistiky z databázy + Google Analytics a pod. so súhlasom, aby sa výsledky dali ukazovať klientom.

## 2026-10-16 — Základné rozhodnutia pred stavbou

- **Kto sa prihlasuje:** klient = firma majiteľa a môže mať viac objektov. Na jedného klienta viac používateľov s rolami
  (majiteľ, recepcia, upratovanie); jeden používateľ môže patriť viacerým klientom (napr. správca, ktorý spravuje objekty
  pre viacerých majiteľov). Dôvod: dorábať neskôr je drahé, teraz to stojí málo.
- **Jazyky:** viacjazyčné od začiatku — rozhranie aj obsah (popisy objektov, služby, e-maily hosťom). Pri štarte len slovenčina.
  Dôvod: zahraniční hostia aj budúci zahraniční klienti bez veľkej prestavby.
- **Mena pri každej sume a legislatíva ako balík pravidiel pre krajinu** (daň za ubytovanie, kniha ubytovaných, DPH),
  nie natvrdo v jadre. Dôvod: zahraničný klient môže mať inú menu a iné zákony.
- **Faktúry cez fakturačný nástroj klienta** (napr. SuperFaktúra cez API), nie vlastný generátor daňových dokladov.
  Riešené ako adaptéry: jadro vie „vystaviť doklad“, konkrétny nástroj je adaptér. Prvý adaptér = nástroj, ktorý používa Jana.
  Klient bez nástroja dostane len potvrdenie platby, nie daňový doklad.
- **Kód a databáza v angličtine, rozhranie po slovensky** cez preklady.
- **Stack Next.js** (domény klientov, vyhľadávače). Ak Rental Van beží na inom, preberajú sa z neho administračné komponenty, nie kostra.
- **Pevné poradie výpočtu ceny:** noci podľa sezóny → poplatky → služby → zľavy → daň za ubytovanie; každý krok samostatný riadok rezervácie.
- **Rezervácia v MVP na stránke na subdoméne**, vkladací widget neskôr *(spresnené vyššie: Nasadenie u klienta s vlastným webom)*.
- **Účty na Obrazne s.r.o.**, všade dvojfaktorové overenie, heslá v správcovi hesiel. Platené plány (vrátane Vercelu) až pri spustení
  prvého platiaceho klienta; počas vývoja stačí bezplatný Vercel.
- **E-maily hosťom cez transakčnú službu s API**, nie obyčajné SMTP (overovanie domén klientov cez API, doručiteľnosť).
- **Doména a značka produktu** sa riešia neskôr ako celok.

## 2026-10-16 — Prevádzka a bezpečnosť

- **Poistky jednej databázy:** testovacie prostredie (staging) a automatické testy pred každým nasadením, okamžitý návrat na predchádzajúcu
  verziu cez Vercel, migrácie len pridávajú, zálohy Supabase s obnovou k okamihu, **nezávislá nočná záloha mimo Supabase**
  s mesačným skúšobným obnovením, postupné zapínanie zmien (najprv Jana, potom ostatní).
- **Nezávislá záloha šifrovaná pred odoslaním**, uložená v EÚ v úložisku určenom na zálohy so zmluvou o spracúvaní údajov (nie Google Disk —
  obsahuje osobné údaje hostí). Kľúč mimo Supabase aj mimo úložiska. Kandidát: úložisko u hostingu, ak ponúka S3 alebo SFTP.
- **Upozornenia Martinovi** pri zlyhaní platby, iCal, e-mailu alebo zálohy; **postup pri výpadku** spísaný vopred.
- **Zmluva s klientom:** dostupnosť, obmedzenie zodpovednosti, export dát pri odchode, zmluva o spracúvaní osobných údajov
  (kandidát: právna firma Jany). Preveriť **poistenie zodpovednosti za škodu** pre IT služby.

## 2026-10-16 — Jedna databáza pre všetkých klientov

- **Jedna aplikácia a jedna databáza**, nie databáza pre každého klienta. Dôvody: oddelené databázy nechránia pred najčastejšími
  výpadkami (chybná verzia kódu, výpadok Vercelu alebo Supabase, problém s účtom), ale každú zmenu by bolo treba spúšťať 30-krát
  a databázy by sa rozišli (problém 30 WordPressov); každý projekt sa platí zvlášť; zložitosť je pri firme s jedným človekom riziko.
- **Pripravené na presun klienta do vlastnej databázy** bez prestavby (`tenant_id` všade, nič sa nekríži medzi klientmi).
  Väčším klientom sa dá predávať ako prémiová možnosť „vlastná izolovaná databáza“.
- **Odchod klienta** rieši export jeho dát (tabuľky a PDF) dostupný od prvej verzie; formát a lehota v zmluve.

## 2026-10-16 — Moduly, riadiace centrum, skúšobné doby

- **Moduly v jednom kóde, vypínače per klient v databáze.** Balík = preddefinovaná sada modulov, Premium+ = moduly navyše.
  Žiadny dynamický plugin systém. Platby, dostupnosť a e-maily sú jadro, nie moduly.
- **Jadro nevie o moduloch;** napájacie miesta: výpočet ceny (pridá riadok), udalosti rezervácie (vytvorená, zaplatená, check-out),
  miesta v rozhraní (sekcie formulára, menu administrácie). Každý modul má vlastný priečinok, tabuľky, nastavenia a závislosti.
- **Nikdy nekopírovať kód pre jedného klienta** — špeciálna požiadavka = nastavenie alebo modul zapnutý len jemu.
- **Prvý modul: doplnkové služby** (šéfkuchár, transfer) pre Chalet STRÖMY — overí princíp na ostrom prípade.
- **Riadiace centrum** je súčasťou tej istej aplikácie, prístup len pre Martina: klienti, balíky, moduly a skúšobné doby; zdravie
  (posledná rezervácia, zlyhaný iCal, neodoslaný e-mail); obrat klienta za mesiac ako podklad na fakturáciu mikro-provízie;
  „pozrieť sa ako klient“ so záznamom; záznam zmien vypínačov.
- **Skúšobné doby:** stav modulu u klienta skúška / aktívny / vypnutý + dátum konca; denná kontrola; upozornenie klientovi 7 dní
  a 1 deň pred koncom a notifikácia Martinovi; aktivácia najprv ručne, neskôr cez Stripe predplatné.
  **Vypnutie skryje, nikdy nemaže, a zastaví len nové akcie** — objednávky zo skúšobnej doby platia ďalej.

## 2026-10-16 — Platby, základ, repozitár

- **MVP: len bankový prevod** s QR (PAY by square), variabilný symbol = číslo rezervácie, tlačidlo „Platba prijatá“ v administrácii.
  Platby modelované všeobecne s poskytovateľom, Stripe príde ako ďalší poskytovateľ — odporúčané hneď po spustení
  (hosť luxusného objektu čaká kartu, prevod drží termín). Záloha a doplatok neskôr.
- **Základ: Rental Van** — hlavne jeho administrácia (najpokročilejšia) a nastavené odosielanie e-mailov. Z Credit Managera vzor
  **bočného panelu** (detail sa vysunie cez časť stránky); na mobile panel na celú obrazovku — majitelia pracujú z telefónu.
- **Repozitár `obrazne/booking-platform`** (bez „prototyp“ v názve). Dva Supabase projekty: produkcia a staging. Supabase na platenom pláne.
- **MVP do mesiaca pre Chalet STRÖMY:** celý dátový model, rozhranie len pre to, čo STRÖMY potrebuje (celok, cena za noc, služby).

## 2026-10-16 — Krabica ako vlastná aplikácia, nie WordPress

- **Rezervačné jadro sa stavia ako aplikácia** (Next.js + Supabase + Vercel), nie na WordPresse s JetBookingom.
  Dôvody: architektúra v1 presahuje JetBooking (vlastný kód nad cudzími pluginmi), aktualizácie desiatok klientských WordPressov
  sa nedajú bezpečne spravovať, princíp „jedna architektúra, vypínače“ je v aplikácii prirodzený, widget sa dá vložiť do akéhokoľvek webu,
  mikro-províziu vypočíta systém sám.
- **Weby okolo rezervácie** môžu ostať vo WordPresse (ak ich klient chce); rezervácia sa do nich vloží alebo beží na subdoméne.
- Repozitár `obrazne/booking-demo` a web booking.martinolsa.sk sú zmrazené; podklady prenesené do `docs/`.
