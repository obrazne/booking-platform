# ROZHODNUTIA

*Denník rozhodnutí: čo, kedy a prečo. Najnovšie hore. Výsledok sa vždy premietne aj do `ARCHITEKTURA.md`.*

## 2026-10-20 — Platba kartou pred spustením, v košíku už teraz

- Martin: hosť si v košíku vyberá spôsob platby a **platba kartou tam má byť už teraz**, hoci ešte nefunguje — „kým to pôjde na ostro,
  tak to bude dorobené“. Claude namietal (nedostupná možnosť hosťa sklame a pôsobí nedorobene); Martin rozhodol, lebo na stagingu
  nie sú skutoční hostia a karta bude hotová pred spustením.
- Rozhodnuté: **Stripe (karta) sa presúva z Fázy 4 do vecí, ktoré musia byť hotové pred spustením** (ROADMAP → Pred spustením).
  Do vtedy košík ukazuje kartu ako neaktívnu možnosť „Pripravujeme“; prevod s QR je predvolený. **Ostrý web sa nespustí,
  kým karta funguje len ako „Pripravujeme“** — neaktívnu možnosť hosťom na produkcii neukazovať.

## 2026-10-18 — Mesačný výpis ako predajný argument č. 1 (jadro)

- Martin hľadal niečo jedinečné pre majiteľov, ktorí majú ubytovanie ako investíciu a nechcú s ním robotu. Claude: funkciu „ktorú Booking
  nemá“ Booking dorobí; jedinečné je to, čo Booking **urobiť nemôže** — ukázať, koľko majiteľa stojí (ušetrené provízie) a koľko práce
  za neho urobil systém. Ďalšie nápady (plnenie voľných termínov vlastnými hosťami, riadenie výnimkami vrátane upratovania) sú na neskôr.
- Rozhodnuté: **mesačný výpis v jadre** (každý klient — je to argument pri predaji aj dôvod zostať): stránka, e-mail 1. dňa, PDF pre účtovníka.
  Hodiny sú **priznaný odhad** (minúty na úkon viditeľné a nastaviteľné), úspora len z priamych tržieb × provízia z nastavení — Booking
  a Airbnb posielajú len termíny, ich ceny do peňazí nemiešame. Návrh: dosky 12 a 13 (administrácia v1.4). (Martin + Claude)

## 2026-10-18 — Prepojenie s fakturačným nástrojom je platený modul

- Claude navrhol dať doklady do jadra (potrebuje ich každý). **Martin nesúhlasil:** doklad si klient vie vystaviť ručne z toho, čo mu
  pripraví náš systém; fakturačných nástrojov je veľa a každé prepojenie je práca na mieru — nový nástroj klienta nerobíme zadarmo.
- Rozhodnuté: jadro = **podklad na doklad** (odberateľ, položky, platby, VS; kopírovať / export) + nahranie vystaveného dokladu hosťovi.
  **Adaptér na konkrétny nástroj = platený modul** (SuperFaktúra, iKROS, Billdu, Fakturoid…). Súvisí s modulom automatického párovania platieb. (Martin + Claude)

## 2026-10-17 — Správy s hosťom: konverzácia pri pobyte + automatické správy (modul)

- Martin: Jana píše hosťom, chce, aby si zvykli chodiť do účtu. Rozhodnuté: modul **Správy** — konverzácia pri rezervácii, každá správa
  majiteľa aj e-mailom s tlačidlom „Odpovedať“ (prihlási rovno k pobytu), Reply-To na majiteľa, aby sa odpoveď na e-mail nestratila.
- **Automatické správy nahrádzajú „workflows“ z JetBookingu** (správa X dní pred/po príchode či odchode) — navyše sú v konverzácii, hosť
  na ne môže odpovedať a majiteľ naplánovanú správu pri hosťovi upraví alebo vynechá. Hosť ich vidí ako správu od majiteľa.
- **Jadro vs. modul (Martin: „dobre je to“):** povinné e-maily ostávajú v jadre, konverzácia, automatické správy a rýchle odpovede sú
  platený modul. Riziko: JetBooking mal naplánované e-maily v základe — ak by to klienti namietali, dá sa v jadre ponúknuť jednoduchá verzia len e-mailom.
- **Bez dvojitých e-mailov:** privítanie v potvrdzovacom e-maile, správa v deň pokynov/ponuky ako blok v tom e-maile, poďakovanie
  s odkazom na hodnotenie nahrádza pozvánku modulu Recenzie. SMS nie (platené, neskôr modul). (Martin + Claude) → Z45–Z47.

## 2026-10-17 — Mapa: OpenFreeMap, Google len ako odkaz na navigáciu

- Martin navrhol Google Maps, aby to bolo zadarmo. Vložená Google mapa (Embed API) je síce zadarmo, ale potrebuje Google Cloud účet
  s fakturačným účtom, nedá sa zladiť s témou klienta a posiela údaje návštevníkov Googlu → smela by sa načítať až po súhlase s cookies.
  Interaktívna Google mapa má od 3/2025 len 10 000 načítaní mesačne zadarmo — spoločne pre všetkých klientov.
- Rozhodnuté: podklady **OpenFreeMap** (zadarmo aj komerčne, bez registrácie, kľúča a cookies; bez SLA — URL štýlu je jedno nastavenie,
  dá sa prejsť na vlastné hostovanie) + tlačidlo **„Navigovať v Google Mapách“** ako obyčajný odkaz. (Martin + Claude) → Z40.

## 2026-10-17 — Obrazovky modulov pre hostí v2.3 schválené

- Martin schválil dosky `UcetPobyt`, `MobilPobyt`, `Checkin`, `Recenzie` („môže byť“). Detail pobytu v účte hosťa je jedno miesto pre
  check-in, doobjednanie, účet pobytu a po odchode hodnotenie; recenzie na stránke ukazujú aj kritické s odpoveďou majiteľky. → Z37–Z39.

## 2026-10-17 — Online check-in nečaká na Janu

- Martin: „Prečo by mal check-in čakať na Janu? Nechcem čakať.“ Má pravdu — povinnosti (kniha ubytovaných, hlásenie cudzincov, daň
  za ubytovanie) sú zo zákona rovnaké pre všetkých; obec, sadzba a oslobodenia sú nastavenie klienta. Jane otázky ostávajú len na
  doplnenie jej nastavení. Základ ide do fronty ako Z36 (B11). Odoslanie hlásenia polícii elektronicky (eID) zatiaľ robí ubytovateľ sám. (Martin + Claude)

## 2026-10-17 — Moduly po MVP: základ teraz, rozhranie po plátne

- Martin nechal postup na Claude: **Claude Code hneď stavia dátový a technický základ** (Z33 push celý — rozhranie z existujúcich vzorov;
  Z34 recenzie a Z35 upsell bez obrazoviek pre hostí), **Claude chat medzitým kreslí** obrazovky upsellu a recenzií; rozhranie potom
  podľa plátna. Online check-in čaká na Janu (zákonné údaje, citlivé dáta). (Claude)
- Predvolené voľby Claude (Martin môže zmeniť): upsell od potvrdenia rezervácie do odchodu, uzávierka a potvrdenie majiteľom per služba,
  „na účet pobytu“ do 300 € na pobyt, inak platba vopred; recenzie sa zverejnia samy po 72 h, ak majiteľ nezasiahne; ručné referencie
  ostávajú ako „z iných zdrojov“ mimo priemeru. Detail v ARCHITEKTURA B11.

## 2026-10-17 — Recenzie: overené recenzie z pobytov, nie výber majiteľa

- Hodnotiť môže len hosť po odchode (účet + e-mail). **Zverejnia sa všetky**; majiteľ zamietne len porušenie pravidiel (vulgarizmy,
  osobné údaje, mimo témy) so zapísaným dôvodom, môže verejne odpovedať a vybrať niekoľko recenzií navrch. Zobrazuje sa priemer
  a veta o overení. Dôvod: Omnibus (zákon o ochrane spotrebiteľa) — skrývať negatívne a ukazovať priemer by bolo klamlivé; „overené
  od skutočných hostí“ je navyše silnejší predajný argument. Odkaz na Google recenzie dostanú všetci, nie len spokojní. (Martin + Claude)

## 2026-10-17 — Vrátenie chyby jedného klienta bez vracania celej databázy

- Martin: „Ak klient niečo pokazí alebo sa v appke niečo pokazí, nemôžem vrátiť databázu všetkých týždeň dozadu — ostatným by zmizli
  objednávky. Toto nemáme dobre vymyslené.“ Má pravdu — obnova k okamihu z A9 platí pre celú databázu.
- Riešenie po vrstvách (A9): **kôš** pre majiteľa (30 dní), **história zmien** každého záznamu s vrátením konkrétnej zmeny,
  **chirurgická obnova jedného klienta** zo zálohy bokom (vďaka `tenant_id` na každom riadku), celá databáza len pri katastrofe. (Martin + Claude)
- História sa zapína **hneď, ešte pred ostrými dátami** — história spred zapnutia neexistuje. Obnova ostáva ručný zákrok (Claude Code
  po Martinovom potvrdení), nie tlačidlo — jeden zlý klik by prepísal skutočné rezervácie. Export dát klienta a stav záloh v riadiacom centre. (Claude)

## 2026-10-17 — Košík: Pokračovať hneď po výbere termínu

- Martin si nevšimol „Hotovo“ pod kalendárom a nevedel, prečo je Pokračovať neaktívne. Namiesto správy „najprv kliknite Hotovo“ krok
  navyše **rušíme**: platný termín = Pokračovať je aktívne (zavrie kalendár a ukáže doplnky). Neaktívne je len bez platného termínu
  a vtedy je dôvod napísaný priamo nad tlačidlom, nie až po kliknutí. (Martin + Claude)

## 2026-10-17 — Košík v2.2: všetko sa musí vojsť na 13″ notebook

- Na 13″ MacBooku sa zelený súhrn nevošiel a posúvali sa oba stĺpce — „ak sú dva stĺpce plné a ešte sa posúvajú, nezvládli sme to“ (Martin).
  **Vpravo len to, čo hosť kupuje a koľko; vľavo práca aktuálneho kroku.** Referencia ide do kroku 1 vľavo, kontakt na Janu do kroku 2,
  tri istoty do kroku 3 k záväznému tlačidlu — tam, kde hosť váha. Vpravo ostáva jedna istota pod tlačidlom. (Martin + Claude)
- **Bez fotiek v košíku** — panel je nad stránkou s fotkami, boli by dvakrát (Martin). **Termín len raz** (vpravo so „Zmeniť“) — vľavo
  sa opakoval (Claude). **Služby jednoriadkové**, detail na rozklik (Martin). Lišta krokov kompaktnejšia (Martin).
- **Jedno rozloženie pre všetky obrazovky**, nie zvláštna verzia pre malé — menej testovania a na veľkom monitore len viac vzduchu. (Claude)

## 2026-10-17 — Administrácia v1.2: menu so skupinami, štatistiky, upozornenia, riadiace centrum

- **Menu so skupinami a podpoložkami** (Rezervácie, Objekt, Ponuka, Prepojenia, Nastavenia), položky **cez celú šírku bez zaoblenia**
  s tenkými čiarami medzi hlavnými položkami — ako WordPress, ktorý Martin a klienti poznajú; plochý zoznam by s modulmi rástol bez poriadku.
  Rovnaký vzor má tmavé menu riadiaceho centra (dnes biely text na bielom pri prejdení myšou). (Martin, pripomienky 17, 19, 24)
- **Štatistiky sú v jadre, nie modul** — tržby a podiel priamych rezervácií sú hlavný argument krabice („ušetrené na províziách“, A14);
  klient má hneď vidieť, čo mu systém prináša. Pokročilé prehľady (zdroje návštev, prípadové štúdie) môžu byť neskôr modul. (Martin + Claude)
- **Tržby sa počítajú podľa termínu pobytu a len z priamych rezervácií** — z Booking/Airbnb máme len obsadenosť (iCal nemá sumy);
  obsadenosť zahŕňa všetky kanály. Zmiešať to by klamalo. (Claude)
- **Upozornenia v aplikácii (zvonček) sú v jadre**, čítanie osobné pre každého člena tímu; e-mail o novej rezervácii ostáva v jadre,
  **push na mobil ostáva modul** (A13). Vzor z Martinovho FabLabu. (Martin, pripomienka 18)
- **Riadiace centrum:** klienti ako **rozbaľovacie riadky** s kľúčovými číslami (rýchly prehľad bez klikania), detail klienta ako vlastná
  stránka so záložkami a viacerými cestami k nej (menu, riadok, drobčeky); moduly ako **katalóg so správou priradenia**; audit s filtrami
  podľa obdobia a kategórie. (Martin, pripomienky 20–23)

## 2026-10-17 — Pripomienky zo stagingu: vzory administrácie v1.1

- **Bočný panel má jeden stĺpec** so súhrnnou kartou hore a zbalenými vedľajšími sekciami — dva stĺpce z v1 pri skutočných dátach nefungovali
  (prázdna polovica, zalamovanie, v úzkom paneli prekrývanie). Martin: „nedáva to zmysel… natrieskané, natrepané“. Chyba návrhu (Claude).
- **Kompaktne, detaily na požiadanie:** nastavovacie zoznamy (služby, referencie, kalendáre…) ako riadky, ktoré sa rozbalia na mieste;
  rezervácie a klienti ostávajú v bočnom paneli (majú priebeh a veľa akcií). Formuláre na pridanie nie sú stále otvorené. (Martin + Claude)
- **Karty na jemne sivom podklade** na bielom pozadí — biele na bielom splývalo (Martin).
- **Role oddelene:** jeden účet v troch rolách (správca, majiteľ, hosť) ukazoval súčet všetkého a mýlil. Testuje sa tromi účtami
  v oddelených profiloch prehliadača; riadiace centrum je vizuálne odlíšené a do klienta sa vstupuje len cez „Otvoriť administráciu“
  (nová karta, pruh „Prezeráš ako správca“, záznam v audite — A4). Správca nemusí byť členom klientov.
- **Nový objekt zakladá zatiaľ správca**, nie ubytovateľ — objekt bez fotiek, cien a sezón by na webe vyzeral prázdny a počet objektov môže
  byť súčasťou balíka. Definitívne s obchodným modelom.
- Na neskôr (produkcia): riadiace centrum na vlastnej adrese s vlastným prihlásením a dvojstupňovým overením pre správcu.

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
