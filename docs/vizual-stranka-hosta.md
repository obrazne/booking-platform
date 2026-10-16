# Vizuál stránky hosťa — v1 (schválené 16. 10. 2026)

*Návrh vznikol v Claude chate s Martinom na plátne „Rezervačná stránka — návrh“ (Claude Design). **Verzia v1 schválená 16. 10. 2026**;
zdroj plátna je v `docs/navrhy/stranka-hosta/` (pozri `docs/navrhy/README.md`). Je to **zámer, nie pixelová predloha** —
všetky farby, písma a zaoblenia idú z témy klienta (A12), texty z prekladov a z dát objektu (sekcie podľa B7).*

## Zmeny oproti prvému popisu (pred v1, podľa neho sa staval Z9)

- **Detail objektu prestavaný na vizuálne sekcie** (menej textu, viac fotiek): galéria → úvod s údajmi a malým panelom → „Čo vás čaká“
  (ikony) → fotka cez celú šírku → kalendár na svetlom páse → tmavý cenník → referencie → časté otázky (rozbaľovacie) → záverečná výzva.
  **Služby na stránke nie sú** — objednávajú sa v košíku (krok 2).
- **Pravý panel zjednodušený:** „od X € / noc“, Príchod/Odchod (odkaz na kalendár), Spolu + cena na osobu a noc, tlačidlo, riadok o storne.
  Tlačidlo „Rozbaliť“ zrušené — hlavné tlačidlo robí to isté.
- **Prilepený pruh hore** pri rolovaní.
- **Texty tlačidiel:** na stránke všade „Pozrieť pobyt“, nie „Rezervovať“ (hosť si pobyt len pozerá, nič neobjednáva).
- **Rovné rohy** pri prvkoch prichytených k okraju obrazovky (bočný panel, prilepený pruh, spodný pás na mobile).

## Vizuálny jazyk (predvolená téma platformy)

Inšpirované webom obrazne.sk, ale s vlastným akcentom:
- Písmo **Roboto** (300, 400, 500, 700, 800) na všetko, **JetBrains Mono** len na štítky a údaje (verzálky, riedke).
- **Kicker** nad každým nadpisom: 12–13 px, 500, verzálky, rozpätie 0,16em.
- **Nadpisy z dvoch viet:** prvá tvrdí (tmavá), druhá dopĺňa (svetlosivá), napr. „Chalet STRÖMY. Celý len pre vás.“
- Plochy biele, tenké linky 1 px (`#e9e5db`) namiesto rámov, karty zaoblenie 24 a jemný tieň len pod spodnou hranou,
  tlačidlá ako pilulky. **Jeden akcent** (predvolene smrekovo zelená `#2f5d50`, nastaviteľný v téme).
- Pokojné animácie (do ~250 ms), vypnuté pri `prefers-reduced-motion`.
- **Žiadny nátlak:** žiadne odpočty, „X ľudí si práve prezerá“, umelá vzácnosť ani predvyplnené platené doplnky (Martin: seriózne,
  pre ľudí s peniazmi; predvyplnené platené doplnky sú v EÚ zakázané).

## Detail objektu (počítač)

Stránka je zložená zo sekcií (B7, úloha Z14) — poradie nižšie je predloha „celý objekt“ (STRÖMY). Nadpisy sekcií v dvoch vetách
(prvá tmavá, druhá svetlosivá), nad nimi kicker.

1. **Hlavička** s názvom objektu a odkazom „Späť na web“.
2. **Galéria:** 1 veľká + 4 malé fotky, na poslednej „Všetkých N fotiek“.
3. **Úvod (dva stĺpce):** vľavo kicker s lokalitou, H1 „Chalet STRÖMY. Celý len pre vás.“, jedna veta perexu, riadok údajov medzi linkami
   (kapacita, spálne, kúpeľne, príchod, odchod — z dát objektu). Vpravo **malý panel** (karta, zaoblenie 24): „od 700 € / noc“, polia
   Príchod | Odchod (klik → posun na kalendár), Spolu veľkou sumou + „X € na osobu a noc · daň v cene“, tlačidlo **Pozrieť pobyt**
   (otvorí košík), pod ním „Storno zdarma do 30 dní pred príchodom“ (z nastavení storna).
4. **Čo vás čaká:** 6 položiek v mriežke — tenká ikona v akcente, názov, jeden riadok (sauna, vírivka, skibus, lyžiareň, terasy, parkovanie).
   Položky z vybavenia objektu (zvýraznené).
5. **Fotka cez celú šírku** (~560 px), bez textu.
6. **Dostupnosť a ceny** (kotva `#termin`) na svetlom páse: „Vyberte si termín. Cenu uvidíte hneď.“, šípky mesiacov, karta s **kalendárom
   (dva mesiace)**, pod ním nápoveda, legenda sezón, vpravo Spolu + cena na osobu a **Pozrieť pobyt**.
7. **Cenník na tmavom páse** (`#11212f`, jemný farebný opar): „Cena za celý chalet. Nie za osobu.“ (veta podľa spôsobu účtovania —
   z dát, nie písaná). Tri stĺpce sezón: veľká cena, názov, termíny (mono), „za noc · od N nocí“. Pod tým mono riadok „V cene pobytu ·
   od 6 nocí zľava 10 % · daň za ubytovanie v cene“ a „pilulky“ s fajkou (čo je v cene).
8. **Referencie:** centrovaný nadpis „Vracajú sa. A hovoria prečo.“, tri karty s citátom a menom (mono).
9. **Dobré vedieť:** rozbaľovacie riadky (storno podmienky, príchod a odchod, domáci poriadok) — obsah z nastavení, riadky „hodnota vľavo,
   údaj vpravo“.
10. **Záverečná výzva:** „Chalet je pripravený. Vyberte si termín.“, tlačidlá **Vybrať termín** (posun na kalendár) a **Napísať Jane** (obrys).

**Prilepený pruh:** keď hosť zroluje pod úvodnú časť, zhora sa vysunie tmavý pruh (`#11212f`, cez celú šírku, rovné rohy): názov objektu,
pilulka s termínom a počtom nocí, vpravo Spolu + cena na osobu a biele tlačidlo **Pozrieť pobyt**. Klik kdekoľvek na pruh otvorí košík.
Keď je košík otvorený, pruh sa skryje. Bez termínu ukáže „Vyberte termín“ a tlačidlo posunie na kalendár.

**Texty tlačidiel podľa záväznosti:** stránka „Pozrieť pobyt“ → krok 1 „Pokračovať“ → krok 2 „K platbe“ → krok 3 záväzné tlačidlo, ktoré
jednoznačne hovorí o objednávke s povinnosťou platby (presné znenie spolu s právnymi textami).

**Tvary:** zaoblené sú prvky, ktoré na stránke plávajú (karty, tlačidlá — pilulky, bubliny, fotky v galérii). Prvky prichytené k okraju
obrazovky (bočný panel, prilepený pruh, spodný pás na mobile) majú **rovné rohy**; bočný panel má tenkú linku na ľavom okraji.

## Kalendár (samostatný komponent, používa sa na stránke aj v košíku)

- Na počítači **dva mesiace vedľa seba**, listovanie šípkami; v košíku a na mobile jeden mesiac.
- Každý deň je tlačidlo s **číslom dňa a cenou noci** (mono, malé). **Sezóny jemne podfarbené** (celoročne biela s linkou, zima
  studený tón, Vianoce teplý tón) + legenda pod kalendárom. **Obsadené dni prečiarknuté**, sivé, nedajú sa vybrať.
- Výber: klik príchod → klik odchod. Krajné dni plné v akcente, dni medzi nimi akcent 13 %. Pri výbere odchodu sa rozsah od príchodu
  po kurzor **jemne podfarbí** (náhľad). Cez obsadené dni sa pobyt predĺžiť nedá; klik na neskorší deň za obsadeným začne nový výber.
- **Bublina pri prechode myšou** (aj pri fokuse klávesnicou), tmavá (`#11212f`), zaoblenie 14, 220 px, nad dňom; na krajných stĺpcoch
  zarovnaná k okraju, aby nevyšla mimo. Obsah podľa situácie:
  - bežne: deň v týždni + dátum (mono), „Zimná sezóna · 850 € / noc“, „Príchod v tento deň: minimálne 3 noci. Od 6 nocí zľava 10 %.“
  - pri výbere odchodu: „Odchod v tento deň: 3 noci za 2 900 €“ (+ upozornenie, ak je to pod minimom)
  - obsadený deň: „Obsadené“; deň za obsadeným pri výbere odchodu: „Pobyt sa nedá predĺžiť cez obsadené dni.“
- Bublina sa zobrazuje **len v kalendári, ktorý sa práve používa** (keď je otvorený košík, nie na stránke pod ním).
- Pod kalendárom nápoveda: „Vyberte deň príchodu.“ / „Príchod 21. 12. — vyberte odchod. Minimálny pobyt 3 noci (zimná sezóna).“ /
  pri krátkom pobyte upozornenie v tehlovej farbe.

## Košík (bočný panel sprava, 480 px, rovné rohy, na mobile celá obrazovka)

Otvára sa tlačidlom **Pozrieť pobyt** (panel, kalendár, prilepený pruh); stmavené pozadie, zatvára krížik alebo klik mimo. **Tri kroky:** Váš pobyt → Údaje a želania → Platba.
Spodok panela je pevný (suma + hlavné tlačidlo), obsah sa posúva.

**Krok 1 · Váš pobyt** (len to, čo treba na rozhodnutie, v tomto poradí):
1. pás fotiek objektu (1 veľká + 2 malé), kicker „Váš pobyt · 1 / 3“, názov
2. karta termínu: „21. 12. – 24. 12. 2026“, „3 noci · 8 hostí“, tlačidlo **Zmeniť** → rozbalí kalendár; kým termín nie je vybraný, kalendár je otvorený; v karte aj riadok Hostia s počítadlom
3. **Spolu** veľkou sumou, pod ňou **cena na osobu a noc** („121 € na osobu a noc · daň v cene“) a odkaz **Rozpis ceny** (rozbalí riadky)
4. tri riadky istoty s fajkou: storno zdarma do 30 dní · termín podržíme 24 hodín · platíte priamo majiteľke, bez poplatkov
5. **kontakt na majiteľa:** fotka (zatiaľ iniciály), „Otázky? Odpovedá Jana.“, tlačidlá **WhatsApp** (predvyplnená správa s termínom
   a počtom hostí) a **telefón** — v MVP odkazy `wa.me` a `tel:` z nastavení klienta
6. **jedno odporúčanie** podľa termínu ako tichý riadok: malá fotka, mono štítok „Pre váš termín“, názov (napr. cez 24. 12.
   „Štedrovečerná večera so šéfkuchárom“), suma pre skupinu, malé tlačidlo Pridať/Pridané; klik na názov otvorí detail
7. pevný spodok: tlačidlo **Pokračovať** (neaktívne bez platného termínu)

**Krok 2 · Údaje a želania:** hore Späť, „Údaje a želania · 2 / 3“, krížik. Nadpis „Kto prichádza? Stačí kontakt na vás.“, polia meno,
e-mail, telefón. Sekcia **„Želáte si niečo pripraviť?“** s podtitulom „Nepovinné. Podrobnosti doladíme e-mailom.“ — služby ako riadky:
krúžok na pridanie, názov + cenový model, suma za pobyt, šípka do detailu. Poznámka pre majiteľa (čas príchodu, alergie, želania).
Pevný spodok: Spolu + **K platbe**. *(Doplnky zámerne nie sú samostatný krok — tón recepcie, nie predavača.)*

**Detail služby** (posun v tom istom paneli, nie druhý panel): veľká fotka, Späť, mono štítok s cenovým modelom, názov, popis,
„čo zahŕňa“ ako riadky s fajkou, pri transfere počet ciest; pevný spodok: **Pridať k pobytu / Odobrať z pobytu**.

**Krok 3 · Platba:** súhrn, súhlasy (VOP a storno povinné, marketingový nepovinný a nezaškrtnutý), odoslanie → platobné údaje s QR
(navrhne sa ďalej).

## Mobil

- Detail: fotka cez celú šírku s tlačidlom späť a počítadlom fotiek, potom rovnaký obsah pod sebou.
- **Spodný pás stále na očiach** (rovné rohy): suma, krátky popis („3 noci · so šéfkuchárom“), tlačidlo **Pozrieť pobyt** (otvorí košík na celú obrazovku).
- Doska mobilu na plátne je staršia (ešte so službami na stránke) — obsah a poradie sekcií sa riadia počítačom, služby len v košíku.
- Výber termínu ako **spodné okno** cez celú obrazovku: mesiace pod sebou, dole suma, nápoveda k minimu a „Potvrdiť termín“.

## Neskôr (zapísané nápady)

- Hlavný upsell **e-mailom 7–14 dní pred príchodom** (modul upsell pred príchodom), košík ostáva čistý.
- „Váš pobyt deň po dni“ po rezervácii s doplnkami na prirodzených miestach (kandidát Premium+).
- Balíky služieb („Zimný pobyt bez starostí“).
- Vlastné správy hosť ↔ majiteľ pri rezervácii (modul), neskôr AI recepčný; živý chat na stránke nie (majiteľ neodpovie 24/7).
