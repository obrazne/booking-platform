# Vizuál zóny hosťa — podklad pre Elementor (Fáza 2, prvá časť)

*Claude chat, 2026-10-13. Návrh: plátno, obrazovky 06–10 (`design/navrh-v1/`, náhľady v `nahlady/`).*

**Návrh je zámer, nie doslovná predloha** (pozri `CLAUDE.md` → *Počas práce*). Cieľ: zóna hosťa má pôsobiť ako na náhľadoch,
postavená natívne v Elementore nad tým, čo už vo Fáze 2b funguje. Keď niečo nejde jednoducho, ozvi sa s alternatívou.

## 1. Dizajnové tokeny → Elementor Kit 2271

Kit je jediné miesto, kde sa mení vzhľad krabice. **Žiadne napevno zadané farby ani písma v šablónach** — všetko cez globálne
farby a typografiu Kitu. Test: zmena akcentu v Kite prefarbí celú zónu (aj tlačidlá, odkazy, ikony, odznaky).

| Token | Hodnota | Kam v Kite |
|---|---|---|
| Atrament (text, nadpisy) | `#17211D` | Primary (doteraz `#262A45`) |
| Akcent Smrek (tlačidlá, výber, odkazy) | `#2F5D50` | Secondary (doteraz `#0BA2AC`) |
| Bridlica (bežný sekundárny text) | `#56605B` | Text (doteraz `#5C6773`) |
| Jantár (sezóny, hviezdičky, odznak „Ukážka“) | `#C98A3F` | Accent (doteraz `#F8BC00`) |
| Kameň (pozadie stránky) | `#F6F4EF` | nová vlastná farba |
| Biela (karty, polia) | `#FFFFFF` | nová vlastná |
| Piesok (jemné plochy) | `#ECE8DF` | nová vlastná |
| Linka (okraje, oddeľovače) | `#E2DDD3` | nová vlastná |
| Hmla (druhá veta nadpisu) | `#8A928D` | nová vlastná |
| Akcent jemný (pozadie odznakov, avatar) | `#E3ECE8` | nová vlastná |
| Noc (tmavá karta Pokyny k príchodu) | `#1B2622` | nová vlastná |
| Chyba (Zrušiť účet, chybové hlášky) | `#B4473A` | nová vlastná |

Ostatné vlastné farby BaliRenta nemaž (používajú ich jeho šablóny), len ich nepoužívaj v zóne.

**Písma:** Hanken Grotesk (všetko) a JetBrains Mono (len metadáta — malé štítky „E-MAIL“, „PDF“, „PRÍCHOD“). Obe sú v Google Fonts.
Zapni načítanie písiem lokálne (Elementor → Nastavenia → *Load Google Fonts Locally*), kvôli GDPR.

| Štýl | Písmo | Veľkosť / váha / riadkovanie / prestrkanie |
|---|---|---|
| H1 (nadpis stránky) | Hanken Grotesk | 44 / 700 / 1.08 / −0.03em; mobil 32 |
| H2 (nadpis sekcie, legenda formulára) | Hanken Grotesk | 20 / 700 |
| Kicker (nad nadpisom, názov karty) | Hanken Grotesk | 12 / 600 / VEĽKÉ / 0.16em, farba akcentu |
| Text | Hanken Grotesk | 16 / 400 / 1.55 (menší 15 a 14) |
| Metadáta | JetBrains Mono | 10 / 500 / VEĽKÉ / 0.12em, Bridlica |

**Nadpis z dvoch viet:** prvá v Atramente, druhá v Hmle („Moje údaje. *Pri ďalšej rezervácii ich už nepíšete.*“).
Ak to Elementor nedá natívne inak, stačí `<span>` s globálnou farbou v texte nadpisu.

**Prvky:**
- Karta: biela, okraj 1 px Linka, zaoblenie 20, vnútorný okraj 22–24, bez tieňa.
- Tlačidlo hlavné: akcent, biely text, tvar pilulky, výška 52, 16/600. Vedľajšie: biele s okrajom Linka, výška 44, 14/600.
- Pole formulára: biele, okraj Linka, zaoblenie 12, štítok v mono nad hodnotou (ako v náhľade *Moje údaje*). Ak to formulár
  WooCommerce / JetFormBuilder nedovolí, stačí bežný štítok nad poľom — **nie je to dôvod na vlastný formulár**.
- Fotky: zaoblenie 16–20, `object-fit: cover`.
- Odznak stavu („Zaplatené“): pilulka, pozadie Akcent jemný, text akcent.

Tieto štýly nastav v Kite (tlačidlá, polia, odkazy), aby ich zdedil aj zvyšok webu. Ak Elementor 4 ponúka globálne triedy
a premenné (cez konektor `balirento-elementor`), môžeš ich použiť na karty a odznaky — podmienka: farby v nich odkazujú na
globálne farby Kitu, nie na napevno zadané hodnoty. Ak by kombinácia starých widgetov a nových tried robila problémy, ozvi sa.

## 2. Obrazovky → stránky webu

| Návrh | Na webe | Poznámka |
|---|---|---|
| 06 Prihlásenie | `/prihlasenie/` (formulár JFB 6727) | Fotka vľavo, formulár vpravo; na mobile fotka hore nízka alebo vôbec. Rovnaký štýl dostane `/registracia/` (JFB 6728). |
| 07 Prehľad | šablóna 6721 | Pozdrav, karta najbližšieho pobytu, tmavá karta Pokyny k príchodu, kontakt na majiteľa. |
| 08 Moje pobyty | šablóny 6722 + 6723 | V návrhu sú doklady na tej istej stránke; na webe ostáva samostatná podstránka *Na stiahnutie* v rovnakom štýle. |
| 09 Moje údaje | šablóna 6725 | Formulár, ktorý tam už je, len naštýlovať. |
| — Obľúbené | šablóna 6724 | V návrhu nie je; použi kartu objektu v rovnakom štýle (listing 1767 alebo nový jednoduchý). |
| 10 Mobil | všetky podstránky | Menu účtu na mobile ako spodný pás so 4–5 ikonami (sticky). Ak to nejde spoľahlivo, vodorovné menu pod hlavičkou. |
| Menu účtu (vľavo) | stránka 6726, widget menu Profile Buildera | Ikony + text, aktívna položka v bielej karte s okrajom. |

Údaje sú skutočné z webu (ukážková hostka Zuzana Ukážková), nie „Jana“ z návrhu.

**Demo je katalóg objektov, nie web chaletu.** Logo v návrhu je vymyslená značka dema „Horské pobyty“ (pracovný názov, na webe ostáva
názov z nastavení WordPressu). Kontakt v zóne (telefón, e-mail, „Požiadať o storno“) je **kontakt webu**, nie majiteľky chaletu.

## 3. Prvé rozhodnutie: ako dostať údaje pobytu do kariet

Dynamický tag `bk-host` (mu-plugin `bk-ucet-hosta`) dnes vracia **hotové HTML odseky** (napr. celý pobyt v jednom `<p>`).
Taký výstup sa do kariet z návrhu naštýlovať nedá bez krehkého CSS. Možnosti — preskúmaj a odporuč jednu:

- **(a) JetEngine Query Builder s dotazom na rezervácie JetBookingu + Listing** — najnatívnejšie, každý údaj (objekt, fotka, termín,
  osoby, stav, suma) je samostatný dynamický prvok v Elementore. Over, či dotaz vie filtrovať rezervácie prihláseného hosťa
  (podľa používateľa alebo e-mailu) a ako sa dostať k stavu platby z objednávky WooCommerce.
- **(b) Rozdeliť tag `bk-host` na jednotlivé údaje** (`najblizsi_objekt`, `najblizsi_foto`, `najblizsi_termin`, `najblizsi_dni`,
  `najblizsi_stav`, `najblizsi_sluzby`, …) — úprava existujúceho kódu Fázy 2b, výnimka z „najprv natívne“ naň platí.
  Pre zoznamy (viac pobytov, doklady) by stále bol potrebný opakovaný prvok, takže (b) sa hodí skôr na Prehľad.
- **(c) Nechať HTML a štýlovať ho triedami** — len ak (a) aj (b) narazia; vtedy aspoň pridať triedy do výstupu, nie štýlovať holé `<p>`.

## 4. Čo z návrhu **nestavať** (je nad rámec Fázy 2b — vynechať, nič nenahrádzať)

Návrh obsahuje niekoľko vecí, ktoré na webe nie sú a nie sú ani v architektúre. Tie **vynechaj**:

- „Online check-in hostí — Vyplniť“ a celý checklist *Pred príchodom* (ostane len „Platba prijatá“, ak je to jednoduché, inak vynechať).
- Tlačidlo „Do kalendára“ (súbor .ics).
- „Ohodnotiť pobyt“ pri minulom pobyte — zatiaľ vynechať (hodnotenie hosťa cez JetReviews je samostatná téma).
- „Faktúry na firmu (IČO, DIČ, IČ DPH)“ — WooCommerce to natívne nemá.
- Súhlas s marketingom s dátumom udelenia — nie je newsletter ani evidencia súhlasov.
- „Zrušiť účet“ — vynechať, alebo odkaz `mailto:` „Požiadať o vymazanie údajov“ (rovnako ako storno).
- Štyri políčka na číslice kódu v mobile — pokyny sú jedno textové pole; stačí ich vypísať väčším písmom v tmavej karte.
- Hlavička z návrhu (logo STRÖMY. a pilulka s menom) — hlavička webu je samostatná úloha, Claude chat ju práve navrhuje.

„Navigovať“ (odkaz na Google Mapy zo súradníc objektu), „Rezervovať znova“ (odkaz na objekt) a „Požiadať o storno“ (už existuje) stavať.

## 5. Postup

1. **Najprv zoznam, potom stavba.** Prejdi náhľady 06–10 a tento podklad a pošli Martinovi krátku tabuľku prvkov:
   *ide natívne* / *ide s kompromisom (akým)* / *nejde bez kódu*, plus odporúčanie k bodu 3. Zapíš ju aj do *Otázky pre Martina*.
   Stavať začni až po jeho OK.
2. Záloha: export Kitu 2271 do `export/elementor-kit-pred-fazou-2.json` a šablón 6721–6726 (+ stránky prihlásenia a registrácie).
3. Kit: farby, písma, tlačidlá, polia podľa bodu 1. **Pozor:** zmení to vzhľad celého webu (aj detailu chaletu) — to je zámer,
   ale skontroluj, či sa niečo nerozbilo (nečitateľný text na tmavom, biele na bielom) a napíš to do Denníka.
4. Zóna hosťa: prihlásenie a registrácia → menu účtu → Prehľad → Moje pobyty → Na stiahnutie → Moje údaje → Obľúbené.
   Po každej obrazovke over desktop aj mobil (390 px) ako ukážková hostka a commitni.
5. Na konci screenshoty (desktop + mobil) do `design/web-zona-hosta/` — Claude chat ich porovná s návrhom.
