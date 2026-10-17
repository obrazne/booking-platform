# Vizuál stránky hosťa — v2.2 (v2.1 schválené 16. 10. 2026, košík v2.2 17. 10.)

*Návrh vznikol v Claude chate s Martinom na plátne „Rezervačná stránka — návrh“ (Claude Design). **v2 schválená 16. 10. 2026.**
Zdroj plátna: `docs/navrhy/stranka-hosta/` (ako ho čítať: `docs/navrhy/README.md`). Platné dosky: `Main.dc.html` (počítač, klikací),
`MobilDetailV2`, `MobilGaleria`, `MobilKosik`, `MobilKosikRozpis`, `MobilKalendar` (výber termínu), **v2.1:** `Potvrdenie` (klikací — stav hore), `MobilPotvrdenie`. **v2.2:** `KosikNotebook` (košík na 13″ notebooku, klikací) — platí pre košík na počítači namiesto košíka v `Main.dc.html`. `Mobil.dc.html` je z v1 — neplatí.
Je to **zámer, nie pixelová predloha** — farby, písma a zaoblenia idú z témy klienta (A12), texty z prekladov a z dát objektu (sekcie B7).*

## Zmeny oproti v1

- Horná časť ako na Bookingu: **galéria vľavo, vpravo referencia + malá mapa + zelený panel s cenou**; klik na fotku otvorí **galériu v okne**.
- **Zelený panel s cenou** (akcent) a **zelená prilepená lišta**; tlačidlá na farebnej ploche **grafitové, na hover čierne**.
- Poradie sekcií zmenené, pribudli **Okolie s mapou**, **Pohľad dovnútra** (mozaika fotiek), **zelená záverečná výzva** s najbližším voľným termínom.
- Cenník už nie je tmavý pás — tichý zoznam. Referencie a časté otázky v rovnakej šírke ako ostatné sekcie.
- **Košík v2:** široký panel (do 1040 px) — vľavo kroky, vpravo **zelený súhrn**; doplnky ako rozbaľovacie riadky už v kroku 1; zbaľovací kalendár.
- **Zaoblenie 10 px** (malé prvky 8 px, tlačidlá pilulky) namiesto 24. Druhá farba témy **medená** na drobné štítky.
- Klik na Príchod/Odchod alebo „Vybrať termín“ **otvorí bočný panel s kalendárom** — stránka sa nikdy sama neposúva.

## Pravidlá vzhľadu (platia v celej aplikácii pre hosťa)

1. **Farby:** hlavný akcent (STRÖMY smrekovo zelená `#2f5d50`) na plochy a hlavné akcie; **doplnková farba** (medená `#ad5a2b`) len na drobnosti —
   štítky nad sekciami (kicker), mená pri referenciách, „Pre skupiny“, špendlík mapy. Doplnková farba nikdy neznamená „klikni“.
   Upozornenia (príliš krátky pobyt) majú vlastnú tehlovú farbu, nie doplnkovú. Obe farby sú v téme klienta s kontrolou kontrastu;
   pri svetlom akcente sa pre zelené plochy s bielym textom použije automaticky tmavší odtieň.
2. **Tlačidlá:** na bielej ploche hlavné tlačidlo v akcente; **na farebnej ploche grafitové `#2b3036`, hover `#0c0e11`**, biely text,
   jemný svetlý okraj, viditeľný fokus. Tlačidlá sú pilulky.
3. **Zaoblenie:** karty, fotky, panely, okná **10 px**; malé prvky (dni v kalendári, náhľady) 8 px. **Prvky prichytené k okraju obrazovky
   majú rovné rohy** (bočný panel, prilepená lišta, spodný pás na mobile).
4. **Ceny:** jedno hlavné číslo sa skladá **pod seba vľavo** (malý štítok · veľké číslo · drobný doplnok); **zoznamy položiek** (rozpis, doplnky,
   cenník) majú hodnotu vpravo. Popis tlačidla cez celú šírku je na stred pod ním.
5. **Rytmus stránky:** sekcie sa striedajú — biela / jemný pás (`linear-gradient(180deg, #f8f7f3, #f1f2ee)`); všetky v rovnakej šírke obsahu
   (1180 px). Nadpisy sekcií: kicker (medený) + dve vety (prvá tmavá, druhá svetlosivá), 40 px. Hlavný nadpis objektu je len názov.
6. **Žiadne skákanie:** tlačidlo hosťa nikdy neposúva stránku; výber termínu vždy v bočnom paneli. **Naraz je otvorené najviac jedno okno**
   (galéria alebo košík); Esc a Späť v prehliadači zatvoria vždy jednu úroveň.
7. **Žiadny nátlak:** žiadne odpočty, „X ľudí si prezerá“, „nezmeškajte“, predvyplnené platené doplnky ani známka bez zdroja.
   Namiesto toho fakty (najbližší voľný termín, storno zdarma, bez poplatkov).
8. Pokojné animácie do ~250 ms, vypnuté pri `prefers-reduced-motion`. Písmo Roboto, údaje a štítky JetBrains Mono.

## Detail objektu — počítač (poradie sekcií = predloha „celý objekt“)

1. **Hlavička** — názov objektu, „Späť na web“.
2. **Úvod** (jemný prechod na pozadí, celý blok je jedna sekcia):
   - Riadok 1: **galéria** (1 veľká + 2 menšie, pod nimi 5 náhľadov, na poslednom „+N fotiek“) | **pravý stĺpec 360 px**: karta
     **„Hostia hovoria“** (jedna referencia, šípky ručne, „1 / 3“, odkaz „Všetky referencie a fotky →“), pod ňou **malá mapa** so
     „Zobraziť na mape“ (posun na Okolie — jediná výnimka z pravidla 6, je to kotva na tej istej stránke ako odkaz, nie tlačidlo rezervácie).
   - Riadok 2: kicker s lokalitou, **H1 len názov**, perex, **karta údajov** (kapacita, spálne, kúpeľne, príchod, odchod — ikona 34 px hore,
     popis a hodnota pod ňou, všetko na stred, jemné zvislé čiary, takmer biela karta) | **zelený panel** v pravom stĺpci, ktorý nadväzuje
     na mapu (rovnaká medzera 16 px) a je **rovnako vysoký** ako ľavá strana (karta údajov prilepená dole, tlačidlo prilepené dole):
     štítok „Váš termín“, pole Príchod | Odchod (klik → bočný panel s kalendárom), cenový blok (bez termínu „Cena za celý chalet · od 700 € ·
     za noc, podľa sezóny“, s termínom „Spolu za 3 noci · 2 900 € · 121 € na osobu a noc · daň v cene“), grafitové „Pozrieť pobyt“ cez celú šírku,
     pod ním na stred „✓ Storno zdarma do 30 dní pred príchodom“.
3. **Čo vás čaká** — mriežka 3 stĺpcov s vlasovými linkami (bez vonkajšieho rámu), šachovnica jemného pozadia, ikona 38 px, názov a riadok
   popisu na stred. Položky = zvýraznené vybavenie, **počet deliteľný 3** (3, 6, 9).
4. **Dostupnosť a ceny** (pás) — kalendár s dvoma mesiacmi, legenda, Spolu, „Pozrieť pobyt“.
5. **Fotka cez celú šírku.**
6. **Okolie** — veľká mapa + zoznam miest (názov, ako sa tam dostať, vzdialenosť/čas mono), veta „Presnú adresu pošleme po potvrdení rezervácie“
   (ak majiteľ zvolí približnú polohu).
7. **Cenník** (pás) — vľavo nadpis „Cena za celý chalet. Nie za osobu.“ (veta podľa cenového modelu) a „V cene pobytu“ v dvoch stĺpcoch;
   vpravo sezóny ako riadky (názov, termíny mono | cena / noc, min. nocí), pod tým zľava a daň.
8. **Pohľad dovnútra** — nadpis + „Všetky fotky“, mozaika 5 fotiek (1 vysoká + 4), klik otvorí galériu.
9. **Referencie** (pás) — nadpis vľavo, tri karty.
10. **Dobré vedieť** — vľavo nadpis, vpravo rozbaľovacie riadky (storno, príchod a odchod, domáci poriadok) — z nastavení.
11. **Záverečná výzva** (akcent cez celú šírku, jemný svetlý opar) — kicker „Rezervácia“, nadpis, 4 istoty s fajkou, grafitové „Vybrať termín“
    (bočný panel s kalendárom) + obrysové „Napísať Jane“; vpravo fotka a cez jej roh biela kartička **„Najbližší voľný termín (N nocí)“**
    s dátumom a sumou — vypočítaná z obsadenosti a cien, klik otvorí košík s týmto termínom.

**Prilepená lišta** (po zrolovaní pod úvod): akcent cez celú šírku, rovné rohy — názov, pilulka s termínom a nocami, Spolu + cena na osobu,
grafitové „Pozrieť pobyt“. Klik kamkoľvek otvorí košík; **bez termínu otvorí košík s kalendárom** (nie posun na kalendár). Pri otvorenom košíku skrytá.

## Galéria (okno nad stránkou)

- Okno s okrajom 32/40 px od krajov obrazovky, zaoblenie 10, stmavená stránka za ním (klik mimo zatvorí). Hore názov, počet fotiek a referencií,
  „Pozrieť pobyt“ (zatvorí galériu a otvorí košík), „Zavrieť ×“.
- Vľavo **albumy** (náhľad + názov + počet: Všetky, Exteriér, Interiér, Spálne, Wellness, Okolie — z kategórie fotky) a **mriežka všetkých fotiek**
  (4–5 v rade). Klik na fotku na stránke otvorí mriežku a tú fotku zvýrazní rámikom.
- Klik na fotku v mriežke → **veľká fotka** na tmavom pozadí, šípky, počítadlo, popis, **pás 6 náhľadov** (~170 × 104 px, aktívny zvýraznený,
  ostatné stlmené, pás sa posúva s aktuálnou fotkou), „Všetky fotky“ späť.
- Vpravo stĺpec 360 px **„Hostia hovoria“**: všetky zverejnené referencie so zdrojom, veta o pôvode hodnotení, odkaz na web klienta (nová karta).

## Kalendár (samostatný komponent, na stránke aj v košíku)

- Na počítači **dva mesiace vedľa seba**, listovanie šípkami; na mobile jeden mesiac.
- Deň = tlačidlo s číslom a cenou noci (mono). Sezóny jemne podfarbené + legenda. Obsadené dni prečiarknuté, nedajú sa vybrať.
- Výber: príchod → odchod; krajné dni plné v akcente, medzi nimi akcent 13 %; náhľad rozsahu pri výbere odchodu; cez obsadené dni nie.
- **Bublina** pri prechode myšou aj fokuse (tmavá `#11212f`, zaoblenie 10, 220 px, pri krajných stĺpcoch zarovnaná k okraju):
  deň a dátum, „Zimná sezóna · 850 € / noc“, „Príchod v tento deň: minimálne 3 noci. Od 6 nocí zľava 10 %.“; pri odchode „3 noci za 2 900 €“
  (+ upozornenie pod minimom); obsadené „Obsadené“; za obsadeným „Pobyt sa nedá predĺžiť cez obsadené dni.“
- Bublina len v kalendári, ktorý sa práve používa. Pod kalendárom nápoveda (pri krátkom pobyte tehlová).

## Košík v2.2 (bočný panel) — upravené 17. 10. podľa 13″ MacBooku

**Princíp:** na notebooku 1440 × ~800 sa musí **zelený súhrn vojsť celý bez posúvania** a krok 1 bez posúvania aspoň po prvé služby.
Vpravo len to, **čo kupujem a koľko**; vľavo **práca aktuálneho kroku**. Ostatné ide do kroku, kde to hosť potrebuje.
Rovnaké rozloženie na všetkých veľkostiach (žiadna zvláštna verzia pre malé obrazovky).

- Sprava, **do 1040 px** (na menšom notebooku cez celú šírku), rovné rohy, tenká linka vľavo, stmavená stránka.
- **Lišta krokov 52 px:** čísla 22 px, text 13 px, **1 Váš pobyt — 2 Údaje — 3 Platba** spojené krátkou čiarkou; hotový krok má fajku
  a dá sa naň kliknúť späť; krížik 34 px.
- **Vľavo kroky, vpravo zelený súhrn (320 px)** — súhrn sa neposúva s obsahom, tlačidlo je v ňom vždy dole.
- **Súhrn (akcent, biely text):** lokalita + názov; karta termínu (dátum, noci · hostia, **„Zmeniť“ vo všetkých krokoch** — otvorí
  kalendár vľavo v kroku 1) a pod ňou riadok Dospelí s počítadlom + „+ deti, zvieratá“; cenový blok (pravidlo 4) + „Rozpis ceny“;
  **„Vaše doplnky“** s cenami, keď nejaké sú. **Dole** linka, v kroku 2 a 3 „← Späť na …“, grafitové tlačidlo
  („Pokračovať“ / „Skontrolovať a zaplatiť“ / záväzné „Objednať s povinnosťou platby“ — presné znenie s právnymi textami),
  pod ním **jeden riadok** „✓ Storno zdarma do 30 dní · bez poplatkov“ (z podmienok objektu). Tlačidlo stlmené bez platného termínu.
- **Zo súhrnu preč:** tri istoty (→ krok 3), referencia (→ krok 1 vľavo), Jana s WhatsApp a telefónom (→ krok 2).
- **Krok 1:** **bez fotiek** (hosť ich má na stránke pod panelom). Termín sa vľavo **neopakuje** — ak hosť prišiel s termínom, krok začína
  rovno „**K pobytu môžete pridať.** Nepovinné.“; bez termínu alebo po „Zmeniť“ je vľavo **kalendár s dvoma mesiacmi** a pod ním
  „**Potvrdiť termín**“ (vtedy služby skryté). **Úprava 17. 10. (pripomienka 28):** keď je vybraný platný termín, **„Pokračovať“ vpravo je
  hneď aktívne** a robí to isté ako „Potvrdiť termín“ — zavrie kalendár a ukáže doplnky (krok 1 ostáva). Bez platného termínu je
  „Pokračovať“ stlmené a **nad ním je vždy viditeľná krátka veta prečo**: „Vyberte deň príchodu“ → „Vyberte deň odchodu“ →
  „V tomto termíne je minimum 3 noci“ (z pravidiel ceny). Klik na stlmené tlačidlo (`aria-disabled`, nie `disabled`) vetu zvýrazní
  a posunie kalendár do pohľadu. Kým je kalendár otvorený, „Zmeniť“ v súhrne sa neukazuje.
  Termín v súhrne krátko, aby sa nezalamoval: `24. – 26. 11. 2026` (rovnaký mesiac), `29. 11. – 2. 12. 2026`, cez rok celé dátumy.
  Riadok istoty pod tlačidlom sa **nesmie orezať** — krátke znenie z podmienok objektu (napr. „Storno zdarma do 30 dní · bez poplatkov“),
  pri dlhšom sa zalomí na dva riadky.
  **Doplnky = jednoriadkové riadky (~54 px):** krúžok na pridanie, názov, sivo cenový model („15 € za osobu a noc“), vpravo suma pre pobyt
  („+ 90 €“, po pridaní bez „+“), šípka. Klik na riadok alebo šípku **rozbalí detail na mieste** (jemne sivý podklad): fotka 150 × 100,
  štítok („Pre skupiny“ / „Pre váš termín“), popis, čo zahŕňa, počet ciest pri transfere, „Pridať k pobytu · 90 €“ / „Odobrať z pobytu“.
  Naraz otvorený jeden. Viac ako 6 služieb → prvých 5 + „Zobraziť ďalšie (N)“. Pod službami **referencia** na sivej karte so šípkami.
- **Krok 2:** „Kto prichádza? Stačí kontakt na vás.“, meno (celá šírka), e-mail | telefón, poznámka (nepovinné); pod tým sivá karta
  **„Otázky pred rezerváciou? Odpovedá Jana.“** s WhatsApp a Zavolať (údaje majiteľa objektu, len ak sú vyplnené). Doplnky sú vidieť vpravo.
- **Krok 3:** „Skontrolujte a potvrďte.“, sivá karta s **tromi istotami** (podržanie termínu, storno, platba priamo — z podmienok objektu), súhlasy (VOP a storno povinné, marketing nepovinný a nezaškrtnutý), **záväzné tlačidlo** jednoznačne o objednávke
  s povinnosťou platby (presné znenie s právnymi textami) → platobné údaje s QR.

## Mobil

- **Stránka** (`MobilDetailV2`): rovnaké poradie sekcií pod sebou, okraje 20 px. Úvod: fotka cez celú šírku (posun prstom, „Všetky fotky · N“),
  názov, perex, karta údajov **3 + 2** (ikona hore, na stred, čiary), referencia, malá mapa. Čo vás čaká **2 stĺpce** so šachovnicou.
  Kalendár jeden mesiac. Pohľad dovnútra 1 široká + 4. Referencie jedna naraz (posun prstom). Záverečná výzva pod sebou, kartička
  s voľným termínom nad tlačidlami.
- **Zelený panel nahrádza pevný zelený pás dole:** termín a hostia (mono), suma (alebo „od 700 € / noc“), grafitové „Pozrieť pobyt“.
- **Galéria** (`MobilGaleria`): cez celú obrazovku — prepínač **Fotky · N | Referencie · N**, albumy ako vodorovné pilulky, mriežka po 2;
  ťuk → fotka cez celú obrazovku, posun prstom, pás náhľadov; zatvorenie krížikom aj gestom späť. Dole zelený pás.
- **Košík** (`MobilKosik`, `MobilKosikRozpis`): cez celú obrazovku, hore „Krok 1 z 3 · Váš pobyt“ + tri čiarky postupu; **bez fotiek (v2.2)**,
  zbalený termín s hostiami, doplnky ako jednoriadkové riadky (cenový model môže ísť pod názov, ak sa nevojde), referencia; **zelený pás dole** (suma + „Rozpis a podmienky ▴“ | grafitové Pokračovať);
  ťuk na sumu vysunie zospodu rozpis, istoty a Janu (horné rohy zaoblené).
- **Výber termínu** (`MobilKalendar`): spodné okno cez celú obrazovku, mesiace pod sebou, „Potvrdiť termín“.

## Potvrdenie rezervácie (v2.1) — stránka po odoslaní a odkaz z e-mailu (`/r/<kód>`)

Musí vyzerať ako **ten istý web**: rovnaká hlavička (názov, Účet, Späť na web) a päta ako detail objektu, téma klienta.
- **Úvod** (jemný prechod ako horná časť detailu): zelená fajka, číslo rezervácie (mono), štítok stavu (čaká na platbu = teplý tón,
  potvrdená = akcent); nadpis s **krstným menom** hosťa — „Ďakujeme, Peter. Termín vám držíme.“ / po zaplatení „Tešíme sa na vás, Peter.
  Pobyt je potvrdený.“; veta, kam prišiel e-mail a kedy je rezervácia záväzná. Vpravo karta s hlavnou fotkou objektu a termínom.
- **Platba** (len kým čaká na platbu): kicker „Platba prevodom“, nadpis „Naskenujte a zaplaťte. Trvá to minútu.“; karta: vľavo **QR PAY by square**
  (na svetlom pozadí, popis „Otvorte bankovú aplikáciu a naskenujte kód“), vpravo riadky Suma (veľká) · IBAN (mono, po štvoriciach) ·
  Variabilný symbol · Príjemca — pri prvých troch tlačidlo **Kopírovať** (→ „Skopírované“), dole hodiny + „Zaplaťte do … — dovtedy vám termín držíme“.
  Po zaplatení namiesto karty zelený pruh „Platba X € prijatá {dátum}. Rezervácia je záväzná.“
- **Čo bude ďalej** — 4 kroky vedľa seba (na mobile pod sebou s čiarou): zaplatíte (do …) → potvrdíme platbu → pokyny k príchodu
  (X dní vopred podľa nastavenia) → príchod (dátum, čas). Hotové kroky s fajkou v akcente, aktuálny zvýraznený.
- **Rozpis ceny** (zoznam, hodnoty vpravo) + Spolu.
- **Účet hosťa** ako nenápadný riadok „Uložte si údaje na ďalší pobyt“ + „Vytvoriť účet“ (Z17).
- **Zmena plánov** — jedna veta so storno pravidlom a odkazom „Požiadať o zrušenie“ (formulár až po kliknutí).
- **Vpravo zelený panel** (prilepený pri rolovaní): „Váš pobyt“, príchod / odchod s časmi, hostia, doplnky, suma („Na úhradu“ / „Zaplatené“),
  grafitové **Pridať do kalendára** (súbor .ics s pobytom — nie iCal synchronizácia), Jana s WhatsAppom a telefónom.
- Iné stavy: **zrušená** — úvod „Rezervácia je zrušená“ + dôvod/refundácia podľa storna, bez platby a krokov; **prebieha / ukončená** —
  úvod „Príjemný pobyt“ / „Ďakujeme za návštevu“, pri ukončenej „Rezervovať znova“.
- **Mobil:** úvod → **platba: najprv údaje s Kopírovať**, QR až pod nimi s vetou „Platíte z počítača alebo iného telefónu? Naskenujte kód.
  Alebo ho uložte a otvorte v bankovej aplikácii.“ + **Uložiť QR** (obrázok) — QR sa nedá naskenovať tým istým telefónom →
  kroky → zelená karta pobytu → rozpis → účet → zmena plánov → päta.

## Neskôr (zapísané nápady)

- Hlavný upsell **e-mailom 7–14 dní pred príchodom** (modul upsell pred príchodom).
- „Váš pobyt deň po dni“ po rezervácii s doplnkami (kandidát Premium+). Balíky služieb („Zimný pobyt bez starostí“).
- Správy hosť ↔ majiteľ pri rezervácii (modul), neskôr AI recepčný; živý chat nie.
- Fotky od hostí (súhlas a schvaľovanie), známka z overených recenzií (modul Recenzie).
