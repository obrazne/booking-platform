# Vizuál pokladne a potvrdenia — podklad pre Elementor (Fáza 2)

*Claude chat, 2026-10-14. Návrh: plátno 03 a 04 → `design/navrh-v1/Pokladna.dc.html`, `Potvrdenie.dc.html` (náhľady v `nahlady/`),
upravené podľa rozhodnutí 14. 10. (bez platby kartou, bez IČO, marketingový súhlas je vo formulári rezervácie, nie v pokladni).*

**Návrh je zámer, nie doslovná predloha.** Pokladňa je **klasická** (`[woocommerce_checkout]`, stránka 1343). JetWooBuilder má šablóny
Checkout 5425/5439 a Thank You 5448 — **najprv zisti, či sa používajú**; ak nie, vzhľad rieš Kitom a triedami `bk-*` v Doplnkových CSS
(ako pri zóne hosťa), nie novými šablónami. Hlavička a päta ostávajú webové (184/557).

## Pokladňa (03)
- **Kroky** nad formulárom: ✓ Termín a služby → **2 Údaje a platba** → 3 Potvrdenie (statický pás, len vzhľad).
- **Nadpis z dvoch viet:** „Ešte pár údajov. *Potom je pobyt váš.*“ + „Máte účet? Prihláste sa…“ (natívne WooCommerce pripomenutie prihlásenia).
- **Kontaktné údaje** v mriežke 3 stĺpce (meno, priezvisko, e-mail, telefón, krajina, mesto) — polia s okrajom Linka, zaoblenie 12, štítok nad poľom.
  Skryť polia, ktoré pri ubytovaní netreba, ak to WooCommerce dovolí natívne (firma, adresa 2…). Ak by to chcelo kód alebo plugin, nechaj ich.
- **Poznámka pre ubytovateľa** (natívna poznámka k objednávke).
- **Platba:** len bankový prevod ako vybraná karta s rámčekom v akcente.
- **Účet a súhlasy:** „Vytvoriť účet“ (natívne), obchodné podmienky s textom na rozkliknutie (hotové v Z1), text o ochrane údajov.
- **Tlačidlo** cez celú šírku: „Objednať s povinnosťou platby · {suma}“ (text tlačidla WooCommerce + suma, ak ide natívne; inak bez sumy).
- **Súhrn vpravo** (prilepený): objekt + termín + hostia + položky (ubytovanie, služby) + Spolu + storno poznámka.
  Fotka objektu len ak ide natívne (položka košíka je produkt *Booking*, nie objekt) — inak bez fotky.
- „Termín držíme 30 minút“ ako **statický text** (podľa držania JetBookingu), nie odpočet.

## Potvrdenie objednávky (04, stránka *Objednávka prijatá*)
- Ikona fajky, „Rezervácia č. …“, nadpis „Ďakujeme, {meno}. *Termín je pre vás podržaný.*“, veta o e-maile.
- **Platobné údaje** v rámčeku: suma, VS (= číslo objednávky), IBAN, príjemca, splatnosť — natívne údaje prevodu WooCommerce, len štýl.
- **Súhrn pobytu** vedľa (natívne detaily objednávky, štýlom karty).
- **Čo bude nasledovať** — 3 karty: Potvrdenie platby · Doladenie služieb · Pokyny k príchodu (2 dni vopred e-mailom aj v účte).
- **Tmavý pás „Váš účet je pripravený“** — len ak si hosť účet vytvoril (ak sa podmienka nedá natívne, vynechaj pás).

## Postup
Zoznam prvkov → ak natívne, pokračuj. Záloha dotknutých šablón/CSS. Test celej rezervácie ako hosť (desktop + mobil), testovaciu objednávku
potom zruš. Screenshoty do `design/web-pokladna/`.
