# Karta nehnuteľnosti — obsah (MVP Chalet STRÖMY)

*Rozhodnuté 13. 10. 2026 (Martin + Claude chat). Týka sa šablóny JetThemeCore **2252 Single Property**
(Elementor, podmienka single `properties`). Vzhľad (písma, farby, rozloženie) sa rieši až vo Fáze 2 —
tu ide len o to, ČO sa na karte zobrazuje.*

> **Hlavné pravidlo (Martin):** karta je šablóna **celej krabice**, nie len chaletu. **Nič z BaliRenta sa nevyhadzuje.**
> Čo pre chalet nemáme, doplní sa ukážkovými (vymyslenými) dátami, aby každý prvok systému bolo vidno —
> vrátane hodnotenia a recenzií. Obsah slúži na prezentáciu pre majiteľku chaletu.

## Ostáva z BaliRenta (preložiť do SK, napojiť na údaje chaletu)

| Prvok | Widget v 2252 |
|---|---|
| Názov objektu | `jet-listing-dynamic-field` (hlavička) |
| Galéria | `jet-woo-product-gallery-slider` + hlavný obrázok |
| 4 hlavné údaje: typ, spálne, kúpeľne, kapacita | 4× `icon-box` (Type / Bedroom / Bathroom / Accomodation) |
| Popis | sekcia Description |
| Vybavenie | sekcia Facilities |
| Video prehliadka | sekcia Villa Tour (`video`) — zatiaľ bez videa sa sekcia skryje (dynamická viditeľnosť), video dodá Martin neskôr |
| Kalendár dostupnosti + legenda | `jet-booking-calendar` + Availability; **nadpis „Where you'll be“ premenovať** (je to kalendár, nie mapa) |
| Check-in / check-out | sekcia Terms & Rules |
| Rezervačný formulár s cenou | pravý stĺpec, `jet-form-builder-form` 3735 |
| „Similar Villas“ (`jet-listing-grid`) | ostáva — naplní sa, keď pribudnú ďalšie objekty; dovtedy prázdny (skryť, ak je prázdny) |
| Ďalší `jet-listing-grid` v obsahu | ostáva, zistiť čo zobrazuje a naplniť |
| Obľúbené („Add to favorite“) | ostáva, funguje aj s jedným objektom |
| Riadok „ID:“ v Details | ostáva (preložiť) |
| Terms & Rules: vek, zvieratá, platba | ostáva, preložiť a naplniť údajmi chaletu (zvieratá povolené za poplatok, platba prevodom vopred) |
| `star-rating` a `jet-reviews-advanced` | ostávajú — **len skutočné dáta**, pozri *Hodnotenia a recenzie* |

## Hodnotenia a recenzie

- Widgety `star-rating` a `jet-reviews-advanced` ostávajú a naplnia sa.
- Recenzie: tri skutočné referencie z webu chaletu (bod 9) + 3–4 ukážkové recenzie s hodnotením (4–5 hviezdičiek),
  autor ako krstné meno a iniciála (napr. „Lucia K.“), aby sa nezamieňali so skutočnými hosťami.
- Celkové hodnotenie vypočítať z týchto recenzií.
- Demo web musí mať zapnuté **„Odradiť vyhľadávače od indexovania“** (Nastavenia → Čítanie), aby sa ukážkové recenzie
  nedostali do vyhľadávania pod menom chaletu. Over a zapíš do Denníka.

## Pridať

1. **Ceny v kalendári** — zapnúť *Show calendar price* v JetBookingu, aby hosť pri dni videl 700 / 850 / 1 200 €.
2. **Cenník sezón** — tri sezóny s cenou, termínmi a min. počtom nocí (`docs/chalet-stromy-podklady.md`).
   Statický text alebo opakovač na objekte — podľa toho, čo ide natívne jednoduchšie.
3. **Rozpis ceny vo formulári** — ubytovanie (počet nocí × sezónne ceny), jednotlivé služby, spolu.
   Vypočítané polia JetFormBuildera, žiadny kód.
4. **Storno a platba** — pásma storna z webu chaletu, „platba celej sumy vopred bankovým prevodom“,
   „termín držíme 30 minút počas dokončenia objednávky“. Po slovensky, do sekcie Terms & Rules.
5. **Doplnkové služby** — samostatná sekcia s popisom a cenou: raňajky, privátny šéfkuchár, transfer z letiska Poprad,
   pobyt so zvieraťom (orientačné ceny v podkladoch). Hosť ich objedná vo formulári.
6. **V cene je zahrnuté** — posteľná bielizeň, uteráky, župany a plachty do sauny, wellness (sauna, vírivka), energie,
   Wi-Fi, parkovanie, **daň za ubytovanie**, online check-in. Veta „Žiadne skryté poplatky.“
   *Daň za ubytovanie je v cene (Martin) — nič sa nepripočítava.*
7. **Video prehliadka** — ostáva sekcia z BaliRenta, skrytá kým nie je video.
8. **Kontakt na špeciálne požiadavky** — krátky blok pod formulárom: firemné akcie, oslavy, dlhšie pobyty →
   telefón a e-mail chaletu (+421 905 109 393, kontakt@chaletstromy.sk).
9. **Referencie hostí** — tri referencie z webu chaletu ako citácie s menom
   (Elizabeth Kohutova, Patricia Vittek, Eva Milistenferova — texty v `docs/chalet-stromy-podklady.md`
   alebo na https://www.chaletstromy.sk/). **Bez hviezdičiek a bez počtu hodnotení**, ktoré nemáme.

## Zatiaľ nepridávať navyše (Martin 13. 10.)

Mapa a vzdialenosti, rozpis spální a lôžok, odznak „Rezervujte priamo – bez provízií“, ubytovací poriadok na stiahnutie.
*(Toto sú nové prvky, ktoré BaliRento nemá. Ak niečo z nich BaliRento predsa má, platí hlavné pravidlo — ostáva.)*

## Pravidlá

- Všetko po slovensky, ceny v €.
- Žiadne prístupové kódy ani heslo Wi-Fi.
- Úpravy robiť v šablóne 2252 (JetThemeCore), nie v Elementor library kópii 2249.
- Pred zásahom do 2252 exportovať jej aktuálny stav do `export/` (návrat späť).
