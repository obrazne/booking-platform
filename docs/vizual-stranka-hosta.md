# Vizuál stránky hosťa — schválený návrh (16. 10. 2026)

*Návrh vznikol v Claude chate s Martinom na plátne „Rezervačná stránka — návrh“ (Claude Design, súkromné — Martin ho vie ukázať).
Martin ho schválil ako základ („Perfektné“). Tento dokument je jeho popis pre stavbu Z9. Je to **zámer, nie pixelová predloha** —
všetky farby, písma a zaoblenia idú z témy klienta (A12), texty z prekladov.*

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

Hlavička s názvom objektu a odkazom „Späť na web“ → galéria (1 veľká + 4 malé, „Všetkých N fotiek“) → dva stĺpce:

**Ľavý stĺpec:** kicker s lokalitou, H1 z dvoch viet, perex, riadok údajov (kapacita, spálne, kúpeľne, príchod, odchod) medzi linkami,
tri riadky dôvery s ikonou → **Dostupnosť a ceny** (hlavný motív) → cenník sezón (riadky: názov, termíny mono, cena za noc, min. pobyt)
→ v cene pobytu → referencie hostí → storno podmienky.

**Pravý stĺpec (prilepený):** „od X € / noc“, tlačidlo **Rozbaliť** (otvorí košík), polia Príchod/Odchod, hostia, rozpis, Spolu, tlačidlo
„Pokračovať k údajom“, poznámka o platbe prevodom a 24 h.

*Otvorené (návrh Claude, Martin zatiaľ nerozhodol):* služby na stránke zmenšiť na jednu vetu bez tlačidiel a objednávať ich v košíku;
pravý panel zjednodušiť na termín, cenu a tlačidlo do košíka.

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

## Košík (bočný panel sprava, 480 px, na mobile celá obrazovka)

Otvára sa tlačidlom Rozbaliť; stmavené pozadie, zatvára krížik alebo klik mimo. **Tri kroky:** Váš pobyt → Údaje a želania → Platba.
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
- **Spodný pás stále na očiach:** suma, krátky popis („3 noci · so šéfkuchárom“), tlačidlo Rezervovať.
- Výber termínu ako **spodné okno** cez celú obrazovku: mesiace pod sebou, dole suma, nápoveda k minimu a „Potvrdiť termín“.

## Neskôr (zapísané nápady)

- Hlavný upsell **e-mailom 7–14 dní pred príchodom** (modul upsell pred príchodom), košík ostáva čistý.
- „Váš pobyt deň po dni“ po rezervácii s doplnkami na prirodzených miestach (kandidát Premium+).
- Balíky služieb („Zimný pobyt bez starostí“).
- Vlastné správy hosť ↔ majiteľ pri rezervácii (modul), neskôr AI recepčný; živý chat na stránke nie (majiteľ neodpovie 24/7).
