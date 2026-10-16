# Vizuál detailu objektu — podklad pre Elementor (Fáza 2)

*Claude chat, 2026-10-14. Návrh: plátno 02 (desktop) a 05 (mobil) → `design/navrh-v1/Detail.dc.html`, `MobilDetail.dc.html`
a náhľady v `nahlady/`. Prilepená lišta po posune: plátno 11, variant D (`Hlavicka.dc.html`).
Obsah karty (texty, sekcie, ceny) je hotový z úlohy 1f2 (`docs/karta-nehnutelnosti.md`, `export/karta-2252-uprava.py`) — tu ide o **vzhľad a poradie**.*

**Návrh je zámer, nie doslovná predloha** (`CLAUDE.md` → *Ozvi sa skôr*). Šablóna 2252 je šablóna JetThemeCore →
**klasické widgety** (pravidlo *Elementor podľa miesta*). Farby a písma z Kitu 2271, triedy `bk-*` v Doplnkových CSS ako pri zóne hosťa.
Je to šablóna pre **všetky objekty krabice**, nie len pre chalet: nič napevno o STRÖMY, všetko z polí objektu; prázdne pole = sekcia sa skryje.
Z funkčných prvkov BaliRenta **nič neodstraňovať** (Martin 13. 10.) — karta hostiteľa ostáva skrytá.

## Poradie sekcií (schválené 13. 10., `ROZHODNUTIA.md`)
1. **Omrvinky** Ubytovanie / typ objektu / názov.
2. **Galéria** — 1 veľká + 4 menšie fotky, posledná dlaždica = video (len keď je `_video-tour-url`), tlačidlo „Všetkých N fotiek a video“ (lightbox).
3. **Názov a údaje** — lokalita (kicker), H1, hodnotenie + počet hodnotení + krátky citát z recenzie, riadok údajov (typ, osoby, spálne, kúpeľne, hlavné vybavenie), srdiečko a zdieľanie.
4. **Pás dôvery** — 3 karty: Žiadne skryté poplatky · Storno podľa podmienok objektu · Priamo u majiteľa. Texty všeobecné, nie o jednom objekte.
5. **Krátky popis** (`_exert` alebo úvod popisu) + „Čítať viac“.
6. **Termín a cena** — kalendár JetBookingu s cenami pri dňoch (už zapnuté) + **cenník sezón** ako dlaždice.
7. **Referencie / recenzie** — priemer veľkým číslom, karty recenzií JetReviews.
8. **Priestory s fotkami** — dlaždice s fotkou a názvom (obývačka a kuchyňa, spálne, wellness…). Ak na to nie je pole, navrhni
   natívne (napr. opakovač JetEngine `priestory`: fotka + názov + krátky popis) a **opýtaj sa** pred pridaním poľa.
9. **V cene je zahrnuté** — tmavá karta (Noc `#1B2622`), zoznam s fajkami.
10. **Doplnkové služby** — karty s cenou (raňajky, šéfkuchár, transfer, zviera); výber je vo formulári vpravo.
11. **Podmienky pobytu** — príchod/odchod, storno pásma, deti, zvieratá, platba.
12. **Podobné ubytovanie** — skryť, ak je prázdne (už je).

**Vpravo rezervačný panel** (formulár 3735), prilepený pri posune: cena za noc + odznak sezóny, Príchod / Odchod, Hostia, služby,
rozpis (Ubytovanie / Doplnkové služby / Spolu), tlačidlo „Rezervovať“, pod ním kontakt na špeciálne požiadavky.
**Mobil:** panel pod obsahom; dole prilepený pás s cenou a tlačidlom, ktoré skočí na formulár.

## Lišta sekcií po posune (variant D) — voliteľné
Pri posune pod galériu sa hore prilepí nižšia lišta: názov objektu, odkazy na sekcie (Galéria, Termíny a ceny, Recenzie, Priestory,
Služby, Podmienky), cena a „Vybrať termín“. Elementor Pro *Sticky* + kotvy. **Ak to s prilepenou hlavičkou webu nejde čisto, vynechaj** —
stačí, že rezervačný panel je prilepený.

## Postup
1. **Zoznam prvkov** (natívne / s kompromisom / nejde) — ak všetko ide natívne alebo s drobným kompromisom, pokračuj bez čakania.
2. Záloha šablóny 2252 do `export/` (pred zmenou).
3. Stavba podľa poradia vyššie; nové polia objektu len po Martinovom OK.
4. Over na chalete 6713 a aspoň na jednom Bali objekte v koncepte (náhľad), či sa prázdne polia skryjú. Desktop + mobil (390 px).
5. Screenshoty do `design/web-detail/`.
