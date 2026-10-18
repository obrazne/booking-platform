# Pravidlá rozhrania — platia všade (v1.4, 18. 10. 2026)

Z Martinových pripomienok 31–44. **Platia naprieč celou aplikáciou:** administrácia majiteľa, riadiace centrum aj stránka a účet hosťa.
Keď pripomienka padla pri jednej časti, uplatní sa všade, kde dáva zmysel (Martin 18. 10.: „spravíme to všade, chcem, aby si takto premýšľal“).
Vizuál ostáva podľa `docs/vizual-administracia.md` a `docs/vizual-stranka-hosta.md` — toto sú pravidlá navrch, nie nový dizajn.

## 1. Plochy a polia (č. 4, 41, 42)
- **Najviac tri úrovne plôch:** pozadie stránky → karta → obsah karty. **Žiadna karta v karte.** Vnorené časti (klienti pri module,
  sezóny, sekcie formulára) oddeľuje len tenká deliaca čiara (`--line`), nie ďalšie pozadie.
- **Karta sa musí odlíšiť od pozadia:** buď jemne iný odtieň, alebo okraj 1 px. Biela na bielej ani krémová na krémovej bez okraja nie.
  Jeden spôsob v celej aplikácii — vyber a zapíš do tokenov (`globals.css`), nepoužívaj farby natvrdo.
- **Polia formulára (input, select, textarea, dátum, čas) sú vždy biele s viditeľným okrajom**, bez ohľadu na plochu okolo.
  Okraj poľa má voči svojmu okoliu **kontrast aspoň 3 : 1** (WCAG 1.4.11). Rovnako zaškrtávacie políčka a prepínače vo vypnutom stave.
- Fokus poľa: zreteľný prstenec v akcentovej farbe (už je `--ring`) — skontroluj kontrast aj pri svetlých témach klientov.
- Kontrolu kontrastu daj do testu (vitest nad tokenmi alebo e2e meranie vypočítaných farieb na niekoľkých obrazovkách).

## 2. Reakcia na myš a klávesnicu (č. 43) — jemne, nie gýč
| Prvok | Pri prejdení myšou (aj `:focus-visible`) |
|---|---|
| Klikateľný riadok zoznamu | jemný podklad cez celý riadok, kurzor ruka |
| Klikateľná karta | tmavší okraj alebo jemný tieň |
| Tlačidlo | o odtieň tmavšie (svetlé tlačidlo → jemne sivé) |
| Textový odkaz | podčiarknutie |
| Ikonové tlačidlo | kruhový podklad |
| Deň v kalendári hosťa | zvýraznenie + cena noci (tooltip) |
| Pobyt v kalendári administrácie | náhľad: hosť / portál, termín, noci, stav, suma (popover) |
- Prechod ~150 ms, **nič sa nehýbe ani nezväčšuje**. Rešpektuj `prefers-reduced-motion`.
- **Na dotykových zariadeniach hover nie je:** čo ukazuje náhľad, musí byť dostupné aj ťuknutím (ťuk = náhľad, druhý ťuk / tlačidlo = detail).

## 3. Ukladanie (č. 36, 44)
- **Tlačidlo Uložiť je tiché, kým sa nič nezmenilo.** Po prvej zmene sa zobrazí **lišta pripnutá dole**: „Máte neuložené zmeny ·
  Zahodiť · Uložiť“ (jedna pre celú stránku/záložku, nie tlačidlo v každej sekcii). Zmenené pole má jemnú značku (bodka alebo ľavý pásik).
- **Odchod zo stránky s neuloženými zmenami** → potvrdenie (`beforeunload` a interná navigácia).
- **Po každom uložení toast vpravo dole** („Zmeny uložené“, „Sezóna pridaná“…), **pri chybe toast s chybou** a pole s chybou zvýraznené.
  Komponent už je (`src/components/ui/sonner.tsx`), používajú ho len správy, upsell a check-in → jeden spoločný pomocník pre serverové akcie.
- Výnimky: okamžité prepínače (zapnúť/vypnúť automatickú správu, modul) sa ukladajú hneď a potvrdia toastom; dialógy majú vlastné tlačidlo.

## 4. Kompaktne, detail na požiadanie (č. 1, 3, 22, 35)
- Zoznamy položiek, ktoré sa upravujú (sezóny, služby, poplatky, klienti pri module, rýchle odpovede…): **zbalený riadok** s názvom a
  2–3 kľúčovými údajmi, šípka rozbalí formulár. Rozbalený riadok má jemne iný podklad.
- **Formulár „Nový …“ nikdy nie je stále otvorený** — skrytý za „+ Pridať …“, otvorí sa ako rozbalený riadok navrchu.
- Riadok, ktorý vedie na detail (klient, rezervácia), sa **otvára klikom na riadok**; šípka vpravo len rozbalí náhľad (č. 32).

## 5. Navigácia (č. 31, 38, 39, 40)
- Kde v menu práve si, musí vždy svietiť presne to miesto; pri detaile záznamu svieti jeho zoznam a nad nadpisom je výrazný
  odkaz späť („← Všetky pobyty“), nielen drobčeky.
- Položka, ktorá sa v menu objaví len pri otvorení (klient v riadiacom centre), **nesmie po odchode zmiznúť** — pozri Z57.
- Tá istá navigácia môže byť na dvoch miestach (karty účtu + podmenu „Môj účet“) — obsah musí byť rovnaký z jedného zdroja.

## Kontrola
Pri každej úlohe, ktorá mení obrazovku: snímka PC 1440 px aj mobil 390 px pred a po, axe bez nových chýb, a prejdenie pravidiel 1–5 na
dotknutých obrazovkách. Na konci fronty linka A prejde **všetky** obrazovky (Z61).
