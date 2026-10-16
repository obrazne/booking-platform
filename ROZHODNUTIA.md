# ROZHODNUTIA

*Denník rozhodnutí: čo, kedy a prečo. Najnovšie hore. Výsledok sa vždy premietne aj do `ARCHITEKTURA.md`.*

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
- **Rezervácia v MVP na stránke na subdoméne**, vkladací widget neskôr.
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
