# Vizuál administrácie a prihlásení — v1.2 (v1 schválené 17. 10. 2026; v1.1 a v1.2 podľa pripomienok zo stagingu 17. 10.)

*Návrh vznikol v Claude chate s Martinom na plátne „Administrácia — návrh“ (Claude Design). Zdroj plátna: `docs/navrhy/administracia/`
(ako ho čítať: `docs/navrhy/README.md`). Údaje na doskách = ukážkové dáta STRÖMY zo stagingu (Z21).
Je to **zámer, nie pixelová predloha** — rovnaký vizuálny jazyk ako stránka hosťa v2 (`docs/vizual-stranka-hosta.md` → *Pravidlá vzhľadu*),
texty cez preklady, farby z témy (administrácia a riadiace centrum = téma platformy, prihlásenie hosťa = téma klienta).*

| Doska | Obrazovka | Cesta v kóde |
|---|---|---|
| `Sidebar` | bočné menu administrácie so skupinami (komponent, prop `active`; **v1.2**) | `src/core/admin/admin-shell.tsx` |
| `Prihlasenie` | 01 prihlásenie majiteľa a správcu | `src/app/(auth)/login` |
| `Main` | 02 prehľad majiteľa | `src/app/admin/page.tsx` |
| `Rezervacie` | 03 rezervácie + bočný panel (klikací) | `src/app/admin/reservations` |
| `Kalendar` | 04 kalendár obsadenosti (klikací: pobyt, výber dní) | `src/app/admin/calendar` |
| `Platforma` | 05 riadiace centrum — klienti + panel klienta (klikací) | `src/app/platform` |
| `MobilPrehlad` | 06 prehľad na mobile, menu zo strany (klikací) | — |
| `MobilRezervacia` | 07 detail rezervácie na mobile | — |
| `PrihlasenieHost` | 08 prihlásenie hosťa do zóny hosťa (klikací: e-mail → kód) | `src/app/(guest)/ucet/prihlasenie` |
| `Statistiky` | 09 štatistiky + zvonček s upozorneniami (klikací: rok, porovnanie, mesiac, zvonček) — **v1.2** | `src/app/admin/statistics` (nová) |

## Pravidlá vzhľadu administrácie

Platia všetky pravidlá stránky hosťa v2 (farby, grafitové tlačidlo na farebnej ploche, zaoblenie 10/8, rovné rohy pri okraji obrazovky,
čísla pod seba vľavo / v zoznamoch vpravo, animácie do ~250 ms, Roboto + JetBrains Mono, žiadny nátlak). Navyše:

1. **Bočný panel so záznamom (A18) — v1.1:** na počítači **680 px** (max. 100 %), **jeden stĺpec** (dva stĺpce z v1 neplatia — pri
   nerovnakom obsahu vznikla prázdna polovica a zalamovanie, v úzkom paneli sa prvky prekrývali). Poradie zhora:
   **hlavička** (číslo/názov, stav, zavrieť; prilepená) → **súhrnná karta** (jemne sivý podklad podľa pravidla 6: názov 28 px, kontakt,
   kľúčové údaje v mriežke 2–4 stĺpcov, napr. Príchod · Odchod · Noci · Hostia · Suma) → **hlavná akcia** (napr. platba) → sekcie pod sebou
   cez celú šírku (rozpis, poznámky, dokumenty…) → **vedľajšie sekcie zbalené** ako rozbaľovacie riadky s počtom (História (3), Súhlasy (4),
   Posledné zmeny) → **spodná lišta akcií** (prilepená). Dvojica vedľa seba len pri krátkych hodnotách (dátum | dátum, meno | rola),
   nikdy dva stĺpce sekcií. Na mobile cez celú obrazovku (doska 07). Zatvára ho krížik, Esc, Späť a klik vedľa panela; klik na iný riadok
   zoznamu **prepne** záznam. Jeden komponent `RecordPanel` pre celú aplikáciu.
2. **Polia formulárov na jeden riadok = pilulka** (zaoblenie ako tlačidlo) a **rovnaká výška ako tlačidlo vedľa nich** (46 px vo formulároch
   prihlásenia, v administrácii rovnaká výška ako bežné tlačidlo). Viacriadkové polia (poznámka) zaoblenie 10. Martin 17. 10.
3. **Štítky sekcií** v paneloch a kartách: JetBrains Mono, 10 px, veľké písmená, sivé. Nadpis stránky: medený kicker (názov ubytovania
   alebo „Riadiace centrum“) + H1 32 px.
4. **Stavy rezervácie ako pilulky:** zaplatená = akcent s bielym textom, čaká na platbu = teplá béžová (`#f6ecdf` / `#8a4a22`),
   ukončená a portál = sivá. Rovnaké farby v kalendári (priama, čaká, Booking/Airbnb sivomodrá `#9aa4b0`, blokácia šrafovaná).
5. **Upozornenie, ktoré čaká na majiteľa** (nezaplatená rezervácia so splatnosťou) = teplá karta s priamymi akciami („Platba prijatá“),
   nie červená. Červená len pri zrušení.
6. **Plochy (v1.1, Martin 17. 10.):** pozadie stránky biele, **karty, sekcie a súhrny na veľmi jemnom sivom podklade** (`#fafaf8`,
   svetlejší než bočné menu `#f7f6f2`) s vlasovou linkou `#ecebe6` a zaoblením 10. Biela karta na bielom pozadí nikde. Jeden token, platí
   na všetkých obrazovkách vrátane tých, ktoré neboli na plátne (Nastavenia, Booking a Airbnb, Objekty, Služby, Referencie, Blokácie, Tím…).
7. **Kompaktne, detaily na požiadanie (v1.1):** **nastavovacie zoznamy** (služby, referencie, importované kalendáre, blokácie, členovia tímu,
   miesta v okolí…) sú **kompaktné riadky** (názov + 1–2 kľúčové údaje + stav + šípka); klik na riadok alebo šípku ho **rozbalí na mieste**
   s formulárom (rozbalený riadok má podklad podľa pravidla 6, naraz rozbalený najviac jeden). **Záznamy s priebehom** (rezervácie, klienti
   v riadiacom centre) otvárajú **bočný panel** (pravidlo 1). **Formulár na pridanie nie je stále otvorený** — tlačidlo „Pridať …“ v hlavičke
   zoznamu otvorí nový rozbalený riadok navrchu.
8. **Akcie v riadku** (stav, Zmazať) sú pri obsahu, nie odtlačené na opačný okraj širokej obrazovky; zmazanie vždy s potvrdením.
9. **Žiadne technické texty:** súhlasy, záznam zmien a stavy vždy cez preklady (nie `terms`, `module.changed`); adresy klientov vždy verejná
   doména (nikdy `*.localhost` — tá je len pre vývoj); testovacie účty (`@booking-platform.test`) sa nezobrazujú ako kontakt klienta.

## 01 Prihlásenie (majiteľ, správca)

Rozdelená obrazovka: vľavo panel v akcente (600 px — názov platformy, kicker „Pre ubytovateľov“, veta „Rezervácie bez provízií. Pod vaším
menom.“, tri výhody, podpora dole), vpravo formulár: kicker „Administrácia“, „Vitajte späť.“, e-mail, heslo s „Zobraziť“ a „Zabudnuté heslo?“,
„Zostať prihlásený“, **Prihlásiť sa** (akcent), „alebo“, **Poslať prihlasovací odkaz na e-mail** (obrys) a poznámka pre hostí, kde nájdu
svoj účet. Na mobile ľavý panel len ako pruh s názvom hore. Názov platformy a e-mail podpory = premenné (značka sa rieši vo Fáze 5).

## 02 Prehľad majiteľa

- Hlavička: hľadanie, „Stránka pre hostí ↗“, **Ručná rezervácia** (akcent).
- Pozdrav podľa dennej doby s dátumom (kicker) a vetou podľa stavu („Jedna vec čaká na vás.“ / „Všetko je vybavené.“).
- **Karta, ktorá čaká na majiteľa:** nezaplatené rezervácie so splatnosťou (Otvoriť, Platba prijatá) — len ak nejaké sú.
- **Štyri čísla:** priame rezervácie v roku, tržby priamo, **ušetrené na províziách** (odhad z nastavenej provízie portálov, jemný podklad
  v akcente, „≈“), obsadené dni v najbližších 90 dňoch.
- **Najbližšie pobyty** (dátum ako dlaždica, meno a počet hostí, termín, stav) a **mini obsadenosť** na 12 týždňov s legendou a riadkom
  „Booking a Airbnb synchronizované pred X min · bez kolízií“ (pri kolízii teplé upozornenie s odkazom).

## 03 Rezervácie

- Hlavička: kicker ubytovania, „Rezervácie“, **Export CSV**, **Ručná rezervácia**.
- Lišta: hľadanie (meno, e-mail, číslo), **filtre stavu ako pilulky s počtom** (Všetky, Čaká na platbu, Zaplatené, Ukončené, Zrušené),
  filter príchodu. Zoznam: číslo (mono), hosť + zdroj, termín + počet nocí, hostia, suma vpravo, stav.
  Pod zoznamom veta, že rezervácie z portálov sú v kalendári ako obsadené dni (údaje hostí ostávajú na portáli).
- **Panel rezervácie:** meno (28 px) a kontakt; karta Príchod | Odchod + noci, hostia, zdroj; **platba** — čaká: teplá karta „Čaká na platbu
  X €“, VS, splatnosť a veta, že sa potom sama zruší, akcie **Platba prijatá** a **Predĺžiť splatnosť**; zaplatené: jemná zelená karta
  s dátumom a „potvrdenie odoslané hosťovi“. Rozpis so Spolu, poznámka hosťa, dokumenty pre hosťa (+ Nahrať), interná poznámka
  („Vidíte len vy a váš tím“), história stavov. Dole **Upraviť** a **Zrušiť rezerváciu** (červený obrys, s potvrdením).

## 04 Kalendár obsadenosti

- Hlavička: „Kalendár“, **Zablokovať termín**, **Ručná rezervácia**. Lišta: šípky mesiacov, názov obdobia, **Dnes**, výber jednotky
  (pri jednej jednotke len text), legenda a stav synchronizácie.
- **Dva mesiace vedľa seba** (na užšej obrazovke pod sebou, na mobile jeden), týždeň od pondelka, víkendy jemne podfarbené.
- **Pobyty ako pásy od poludnia do poludnia** (začínajú v strede dňa príchodu, končia v strede dňa odchodu — vidno striedanie hostí),
  s menom a počtom hostí; zalomené na koniec týždňa s rovným rohom. Farby podľa pravidla 4.
- **Vo voľných dňoch cena za noc** z cenníka (mono, sivá) — majiteľ vidí sezóny bez otvárania cenníka.
- **Klik na pás** → panel: priama rezervácia (stav, platba, Otvoriť rezerváciu), portál (vysvetlenie, že údaje sú na portáli, stav
  synchronizácie, Nastavenia synchronizácie), blokácia (dôvod, Uložiť, Odstrániť blokáciu).
- **Výber voľných dní:** klik na príchod, potom na odchod (pod kalendárom nápoveda, čo urobiť) → panel „Nový termín“: noci, **cena podľa
  cenníka** po sezónach, kontrola **minimálneho počtu nocí** (ak je kratší: hosť by si ho na webe nevybral, ručne sa dá) a **kolízie**
  (vtedy bez akcií), akcie **Vytvoriť ručnú rezerváciu** (predvyplní termín) a **Zablokovať tento termín** (s dôvodom).
  Výpočet ceny a pravidiel = rovnaká funkcia ako na webe (žiadny druhý výpočet v rozhraní).

## 05 Riadiace centrum

- **Vlastné menu riadiaceho centra** (Klienti, Moduly, Stav systému, Audit, odkaz do administrácie) **bez výberu ubytovania** — v štýle
  bočného menu administrácie. Doska používa menu majiteľa len pre jednoduchosť plátna.
- Kicker „Riadiace centrum“ so štítom, „Klienti“, **Založiť klienta**. Štyri čísla: klienti (z toho ukážkoví / pripravujú sa), rezervácie
  za 30 dní naprieč klientmi, skúšobné moduly (najbližší koniec), stav systému (synchronizácia, e-maily, platby).
- Zoznam klientov: farba témy, názov a majiteľ, adresa stránky (mono), **balík a moduly**, rezervácie za 30 dní, stav
  (Pripravuje sa / Aktívny / Ukážka). Pod ním veta, že riadiace centrum nevidí mená ani kontakty hostí.
- **Panel klienta:** názov, počet objektov a jednotiek, dátum založenia; **Stránka pre hostí ↗** a **Otvoriť administráciu** (grafitové);
  vľavo **Balík a moduly** (balík; modul s vypínačom a stavom skúšky — vypnutie len skryje, A3) a **Ľudia klienta** (rola, stav pozvánky,
  + Pozvať človeka); vpravo **Prevádzka** (vlastná doména, odosielanie e-mailov, synchronizácia, platby — bodka zelená / sivá / teplá),
  **Vzhľad** (farba a písmo, kontrast overený, Upraviť), **Posledné zmeny** z auditu.
  Balík pri STRÖMY „bez balíka“ — obsah balíkov ešte nie je rozhodnutý (A3).

## 06–07 Mobil

- **Prehľad:** horná lišta 56 px (menu, názov ubytovania, hľadať, **+** ručná rezervácia v akcente), pozdrav, karta čakajúcej platby
  s dvoma tlačidlami vedľa seba, čísla 2 × 2, najbližšie pobyty, riadok synchronizácie s odkazom na kalendár.
  **Menu zo strany** (316 px, stmavené pozadie, zatvorí klik vedľa, krížik, Esc) s rovnakými položkami ako bočné menu.
- **Detail rezervácie cez celú obrazovku:** lišta „‹ Rezervácie“, číslo, ďalšie akcie; stav, meno, **Zavolať** a **E-mail**,
  termín, platba, rozpis, poznámka, dokumenty, história; **dole prilepená lišta** Predĺžiť | **Platba prijatá** (len kým čaká na platbu).
  Ciele dotyku min. 44 px.

## 08 Prihlásenie hosťa (zóna hosťa)

V **téme klienta** s jeho hlavičkou a pätou (položka **Účet** zvýraznená). Vľavo fotka objektu (hlavná fotka) s tromi vetami, čo hosť
v účte nájde; vpravo karta: kicker „Účet hosťa“, krok 1 — „Vaše pobyty na jednom mieste.“, e-mail z rezervácie, **Poslať kód**, veta
„Bez hesla…“; krok 2 — „Zadajte kód z e-mailu.“, na aký e-mail išiel, platnosť (podľa skutočnej platnosti kódu), **6 políčok** na kód
(vloženie celého kódu naraz, automatický posun), **Prihlásiť sa**, „‹ Zmeniť e-mail“, „Poslať znova o 0:45“, Zostať prihlásený.
Dole odkaz na voľné termíny. Odpoveď nikdy neprezradí, či e-mail má pobyty (tak, ako to už robí `src/core/guest/auth.ts`).
Na mobile fotka len ako pruh hore.

## Riadiace centrum, roly a vstup správcu (v1.1, pripomienky 17. 10.)

- **Kde som — vždy jasné:** riadiace centrum má odlišné bočné menu (grafitový podklad `#2b3036` s bielym textom namiesto svetlého)
  a pod názvom štítok **„Riadiace centrum · vidíš len ty“**. Administrácia ubytovateľa ostáva svetlá.
- **Menu riadiaceho centra:** Klienti, Moduly, Stav systému, Audit sú **samostatné stránky** (dnes sú Moduly a Záznam zmien pod zoznamom
  klientov — presunúť). Stav systému = kontroly z karty „Stav systému“ (synchronizácia s chybou, neodoslané e-maily, posledný beh úloh)
  po klientoch. Položka „Do administrácie“ z menu **zmizne**.
- **Vstup do administrácie klienta (A4 „Pozrieť sa ako klient“):** len cez konkrétneho klienta — riadok/panel klienta → **Otvoriť
  administráciu**, otvorí sa v **novej karte**. V administrácii je hore pruh **„Prezeráš ako správca: <klient> · Späť do riadiaceho
  centra“** (grafitový, neprehliadnuteľný) a každý vstup sa zapíše do auditu. Správca tak nemusí byť členom klientov.
- **Výber ubytovania** v administrácii sa zobrazí, len ak má používateľ viac ako jedno ubytovanie; inak len názov.
- **Panel klienta** podľa pravidla 1 (jeden stĺpec): súhrn (názov, stav, založený, **verejná adresa** ako odkaz ↗), Balík a moduly
  (riadok modulu: názov, stav skúška/aktívny/vypnutý, dátum konca skúšky na druhom riadku, Uložiť pri riadku), Ľudia klienta
  (meno · e-mail vľavo, rola vpravo; bez testovacích účtov), Prevádzka (riadky so stavovou bodkou), Vzhľad, Posledné zmeny (zbalené,
  preložené). Dole Stránka pre hostí ↗ (nová karta, verejná doména) a Otvoriť administráciu (nová karta).
- **Objekty:** formulár „Nový objekt“ ubytovateľ zatiaľ **nevidí** — objekt zakladá správca (v riadiacom centre alebo v režime
  „Prezeráš ako správca“). Či si ho bude môcť pridať sám, rozhodne obchodný model (počet objektov v balíku).

## v1.2 — menu so skupinami, štatistiky, upozornenia, riadiace centrum (pripomienky 16–24, 17. 10.)

### Bočné menu administrácie (doska `Sidebar`)
- **Skupiny s podpoložkami:** Prehľad · **Rezervácie** › Zoznam, Kalendár, Blokácie · **Objekt** › Údaje, Fotky, Ceny a sezóny, Stránka,
  Dokumenty · **Ponuka** › Doplnkové služby, Referencie · Štatistiky · **Prepojenia** › Booking a Airbnb · dole **Nastavenia** › Všeobecné,
  Tím, Platby, E-maily a upozornenia. Moduly pridávajú položky do skupiny cez manifest (`group`); prázdna skupina sa nezobrazí.
- Skupina sa rozbalí klikom (šípka sa otočí), automaticky otvorená je skupina aktívnej stránky; v zbalenom menu (len ikony) sa
  podpoložky ukážu pri prejdení myšou ako vyskakovací zoznam.
- **Položky cez celú šírku menu, bez zaoblenia** (ako WordPress): aktívna = jemný podklad v akcente + **3 px čiara vľavo** v akcente,
  hover = o odtieň tmavší podklad. **Medzi hlavnými položkami tenká čiara** `#e7e4dc` cez celú šírku; podpoložky bez čiar, odsadené.
- Pod názvom platformy len **názov ubytovania** (výber len pri viac ubytovaniach — Z25).

### Tmavé menu riadiaceho centra
- Rovnaký vzor ako svetlé menu: položky cez celú šírku, bez zaoblenia; **hover = biela 6 %**, **aktívna = biela 10 % + 3 px čiara vľavo**
  (svetlejší odtieň akcentu); **text a ikony vždy biele/svetlé** — žiadny svetlý podklad s bielym textom (dnes nečitateľné).
- **Hierarchia:** **Klienti** › Všetci klienti, Založiť klienta, a keď si v detaile klienta, pod tým **<názov klienta>** › Prehľad,
  Moduly, Vzhľad, Domény, Ľudia, Záznam zmien · **Moduly** › Katalóg, Skúšobné doby · Stav systému · Audit.
- **Drobčeková navigácia** hore na podstránkach: `Klienti › Chalet STRÖMY › Vzhľad` (pravidlo nižšie).

### Drobčeková navigácia — spoločné pravidlo (administrácia aj riadiace centrum, Martin 17. 10.)
- **V hlavičke stránky, malým písmom nad nadpisom** (namiesto malého štítku nad nadpisom) — žiadny samostatný pás ani stavový riadok dole.
- **Len od druhej úrovne:** na stránkach prvej úrovne (Prehľad, Rezervácie › Zoznam, Štatistiky…) nič — menu s aktívnou položkou
  a nadpis stačia. Príklady: `Objekt › Chalet STRÖMY › Ceny a sezóny`, `Nastavenia › E-maily a upozornenia`, `Klienti › Chalet STRÖMY › Domény`.
- Všetky články okrem posledného sú odkazy; posledný = aktuálna stránka (`aria-current="page"`), celé v `<nav aria-label>`.
- **V bočných paneloch nie** — panel je vrstva nad zoznamom, nie ďalšia stránka.
- **Mobil:** len „‹ Späť na <rodič>“ (o úroveň vyššie), celá cesta sa nezobrazuje.
- Jeden spoločný komponent (`PageHeader` dostane `breadcrumbs`), cestu skladá stránka, nie ručne písané texty (preklady).

### Štatistiky majiteľa (doska `Statistiky`)
- **Stránka Štatistiky:** výber obdobia (rok, posledných 12 mesiacov), prepínač **Porovnať s predchádzajúcim rokom** (druhá sivá čiara).
- **Päť čísel** na jemne sivej karte: tržby priamo, rezervácie, obsadenosť (vrátane Booking/Airbnb), Ø cena za noc, ušetrené na províziách
  (≈, podľa nastavenej provízie); pri každom zmena oproti minulému roku (▲ zelená / ▼ tehlová).
- **Čiarový graf tržieb po mesiacoch** (SVG, bez knižnice alebo s ľahkou): plná čiara = prebehnuté, **bodkovaná = potvrdené pobyty,
  ktoré ešte neprebehli**, jemná plocha pod čiarou, štítky **najsilnejší / najslabší** mesiac; klik na mesiac → bublina (tržby, minulý rok,
  obsadenosť, rezervácie) a zvýraznený riadok tabuľky.
- **Tabuľka po mesiacoch** (mesiac, tržby, minulý rok, rezervácie, obsadenosť, Ø cena/noc) a veta o pôvode čísel.
- **Pravidlá výpočtu:** tržby **podľa termínu pobytu** (noci rozdelené do mesiacov, v ktorých pripadajú), len **priame** rezervácie
  v stave potvrdená/prebieha/ukončená (čakajúce na platbu nie, zrušené nie); obsadenosť = obsadené noci (priame + portály + **bez** blokácií
  majiteľa) / dostupné noci; Ø cena = tržby / predané noci. Všetko v centoch a v mene klienta. Jedna serverová funkcia pre Prehľad aj Štatistiky.
- **Na Prehľade** malý graf tržieb za posledných 12 mesiacov s odkazom „Všetky štatistiky →“.

### Upozornenia (zvonček)
- **Zvonček vpravo hore** v hlavičke každej stránky administrácie aj riadiaceho centra; **odznak s počtom neprečítaných** (tehlová),
  kým ich človek neprečíta. Klik otvorí zoznam (420 px): ikona podľa druhu, nadpis (tučný = neprečítané), jedna veta, čas; neprečítané
  majú bodku a jemný podklad. Klik na upozornenie ho označí ako prečítané a **otvorí cieľ** (napr. panel rezervácie).
  „Označiť všetko ako prečítané“. Pätička odkazuje na Nastavenia → E-maily a upozornenia (zoznam druhov a čo chodí aj e-mailom).
- **Druhy (majiteľ):** nová rezervácia, blíži sa splatnosť (24 h), platba prijatá (ak ju označil niekto iný z tímu), žiadosť o storno,
  zrušenie, nová obsadenosť z portálu, **kolízia v kalendári**, zlyhaná synchronizácia, koniec skúšobnej doby modulu (7 dní a 1 deň).
  **Správca:** zlyhaná synchronizácia / neodoslané e-maily u klienta, koniec skúšky u klienta, nový klient.
- Prečítanie je **osobné** (každý člen tímu má svoje). Na mobile zvonček v hornej lište, zoznam cez celú obrazovku.

### Riadiace centrum — klienti, moduly, audit
- **Zoznam klientov = rozbaľovacie riadky** (pravidlo 7) namiesto bočného panela. Po rozbalení: tržby priamo tento/minulý mesiac,
  rezervácie za 30 dní a posledná, obsadenosť 90 dní, zdravie (synchronizácia, e-maily — bodky), moduly a koniec skúšok, majiteľ
  (meno, e-mail, telefón, posledné prihlásenie); akcie **Otvoriť detail** · **Otvoriť administráciu ↗** · **Stránka pre hostí ↗**.
- **Detail klienta** = stránka so záložkami Prehľad, Moduly, Vzhľad, Domény, Ľudia, Záznam zmien (dnešný obsah „Všetky nastavenia“
  rozdelený do záložiek). Domény: vývojové `*.localhost` sa nezobrazujú (alebo štítok „len vývoj“); náhľad témy bez zástupného textu.
- **Moduly = správa:** katalóg (riadok: názov, popis, závislosti, počet klientov, stav **hotový / v príprave** — v príprave podľa
  ARCHITEKTURA: recenzie, správy s hosťom, push notifikácie, SMS, online check-in, upsell); rozbalenie → klienti s vypínačom
  skúška/aktívny/vypnutý, dátum konca skúšky, **Priradiť klientovi**. To isté zo záložky Moduly v detaile klienta. Cena až s obchodným modelom.
- **Audit — filtre:** obdobie od–do, **kategória** (Prihlásenie, Vstup správcu, Moduly a skúšky, Tím a prístupy, Nastavenia, Klienti),
  klient, osoba, hľadanie; stránkovanie, export CSV. Prihlásenia do administrácie a riadiaceho centra sa do auditu **zapisujú**
  (úspešné; neúspešné len počtom podľa IP, bez hesla).

