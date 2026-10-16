# ARCHITEKTÚRA — Booking platform (v2, rozpracovaná)

*ČO staviame. Prečo → `ROZHODNUTIA.md`. Stav a úlohy → `ROADMAP.md`.*
*Verzia v2 vzniká od 16. 10. 2026 po prechode z WordPressu na vlastnú aplikáciu. Časť A je dohodnutá.
Časť B (doménové požiadavky) sa preberá z v1 a reviduje po kapitolách.*

---

# ČASŤ A — TECHNICKÉ ZÁKLADY (dohodnuté 16. 10. 2026)

## A1. Čo staviame

Jedna aplikácia pre všetkých klientov (ubytovateľov). Každý klient má zapnuté to, čo si objednal. Tri pohľady v jednej aplikácii:

| Pohľad | Kto | Kde |
|---|---|---|
| Rezervácia | hosť | stránka na subdoméne (MVP), neskôr vkladací widget do akéhokoľvek webu |
| Administrácia majiteľa | majiteľ a jeho ľudia | prihlásenie, funguje aj na mobile |
| Riadiace centrum | Martin | prihlásenie, len rola platformy |

Weby okolo rezervácie (prezentácia objektu, blog) nie sú súčasťou aplikácie — môžu byť vo WordPresse alebo kdekoľvek inde.

**Stack:** Next.js · Supabase (Postgres, prihlasovanie, úložisko) · Vercel · GitHub `obrazne/booking-platform`.
Základ administrácie z aplikácie Rental Van, vzor bočného panelu z Credit Managera (podľa analýzy v `docs/`).

## A2. Klienti a používatelia

```
PLATFORMA (Martin)
  └── KLIENT (tenant) = firma majiteľa — fakturačné údaje, balík, moduly, krajina, mena, jazyky
        ├── OBJEKT ── JEDNOTKA ... (časť B)
        └── ČLENSTVO ── POUŽÍVATEĽ  (M:N — jeden človek môže patriť viacerým klientom)
               └── rola: majiteľ / recepcia / upratovanie
```

- Hosť nie je používateľ klienta. Účet hosťa je dobrovoľný; doklady a pokyny dostane aj cez jednorazový odkaz.
- **Oddelenie klientov:** každá tabuľka s dátami klienta má `tenant_id`; databáza (RLS) nedovolí čítať ani meniť cudzie riadky.
  Riadiace centrum je jediné miesto s pohľadom naprieč klientmi. Oddelenie sa overuje automatickými testami.
- Klient sa dá neskôr presunúť do vlastnej databázy bez prestavby (nič sa nekríži medzi klientmi).

## A3. Moduly a balíky

- Všetky moduly sú v jednom kóde. Klient má v databáze vypínače: **skúška / aktívny / vypnutý** + dátum konca skúšky.
- **Balík** = preddefinovaná sada modulov. **Premium+** = moduly navyše.
- **Jadro o moduloch nevie.** Moduly sa napájajú cez:
  1. **výpočet ceny** — modul pridá riadok (služba, poplatok, zľava, daň),
  2. **udalosti rezervácie** — vytvorená, zaplatená, zrušená, check-in, check-out (napr. upratovanie pošle správu po check-oute),
  3. **miesta v rozhraní** — sekcia rezervačného formulára, položka menu administrácie, karta v detaile rezervácie.
- Každý modul: vlastný priečinok, tabuľky, nastavenia, zoznam závislostí (upsell potrebuje služby).
- **Jadro (nie moduly):** objekty a jednotky, dostupnosť a iCal, cenník a sezóny, rezervácie, platby, e-maily, administrácia, export dát.
- **Vypnutie modulu skryje, nikdy nemaže, a zastaví len nové akcie** — už objednané veci platia ďalej.
- Žiadny dynamický plugin systém. Žiadna kópia kódu pre jedného klienta — špeciálna požiadavka = nastavenie alebo modul zapnutý len jemu.
- Nové moduly a zmeny sa zapínajú postupne: najprv jeden klient (Chalet STRÖMY), potom ostatní.
- **Prvý modul:** doplnkové služby (šéfkuchár, transfer).
- *Katalóg modulov a priradenie do balíkov — doplní sa (ROADMAP Fáza 2).*

## A4. Riadiace centrum

- Zoznam klientov: balík, zapnuté moduly, skúšobné doby a ich koniec.
- Zdravie klienta: posledná rezervácia, zlyhaná synchronizácia iCal, neodoslaný e-mail.
- Obrat klienta za mesiac → podklad na fakturáciu mikro-provízie.
- „Pozrieť sa ako klient“ na podporu — každý vstup sa zaznamená.
- Záznam zmien: kto, kedy a komu čo zapol alebo vypol.
- **Skúšobné doby:** denná kontrola; upozornenie klientovi 7 dní a 1 deň pred koncom, notifikácia Martinovi; po zaplatení prepnutie
  na aktívny (najprv ručne, neskôr Stripe predplatné); po vypršaní vypnutie.

## A5. Peniaze, ceny, doklady

- Sumy v **centoch (celé čísla) s menou**. Mena sa nastavuje na klientovi.
- **Poradie výpočtu ceny:** noci podľa sezóny → poplatky → služby → zľavy → daň za ubytovanie. Každý krok = samostatný riadok rezervácie.
- **Cena sa zamrazí na rezervácii**; zmena cenníka sa existujúcich rezervácií nedotkne.
- **Platby** všeobecne s poskytovateľom. MVP: bankový prevod s QR (PAY by square), variabilný symbol = číslo rezervácie,
  ručné potvrdenie „Platba prijatá“. Ďalší poskytovateľ: Stripe. Záloha a doplatok neskôr.
- **Doklady** cez adaptér na fakturačný nástroj klienta (napr. SuperFaktúra API). Vystavený doklad sa nemení, oprava = dobropis.
  Klient bez nástroja dostane len potvrdenie platby.
- **História stavov rezervácie:** kto a kedy zmenil stav.

## A6. Jazyky a krajiny

- Kód a databáza v angličtine, rozhranie cez preklady. Pri štarte slovenčina, ďalšie jazyky bez prestavby.
- Viacjazyčný aj obsah: popisy objektov a jednotiek, služby, e-mailové šablóny.
- **Legislatíva ako balík pravidiel pre krajinu** (daň za ubytovanie, kniha ubytovaných, DPH). Pri štarte slovenský balík.

## A7. E-maily

- Transakčná služba s API, odosielanie **z domény klienta** (overenie domény je súčasť zakladania klienta).
- Šablóny prekladateľné, s brandom klienta.

## A8. Dáta klienta a export

- Export všetkých dát klienta (rezervácie, hostia, doklady — tabuľky a PDF) od prvej verzie.
- Osobné údaje hostí spracúva platforma v mene klienta → zmluva o spracúvaní s každým klientom.

## A9. Prevádzka a bezpečnosť

- **Prostredia:** lokálne → staging → produkcia (dva Supabase projekty). Nasadenie do produkcie len po prechode stagingom a testami.
- **Návrat:** predchádzajúca verzia cez Vercel jedným klikom. Migrácie len pridávajú.
- **Zálohy:** Supabase zálohy s obnovou k okamihu + **nezávislá nočná záloha mimo Supabase**: šifrovaná pred odoslaním, úložisko v EÚ
  so zmluvou o spracúvaní, kľúč mimo Supabase aj úložiska. Skúšobné obnovenie raz mesačne.
- **Upozornenia Martinovi:** zlyhaná platba, iCal, e-mail, záloha.
- **Postup pri výpadku:** spísaný dokument (doplní sa).
- **Účty:** všetko na Obrazne s.r.o., dvojfaktorové overenie, heslá v správcovi hesiel. Platené plány pred prvým platiacim klientom.
- **Zmluvné a poistné:** dostupnosť, obmedzenie zodpovednosti, export pri odchode, spracúvanie údajov; poistenie zodpovednosti (preveriť).

## A10. Obchodný model platformy (na návrh)

- Systém musí vedieť podklady pre Martinove faktúry klientom: zriadenie, mesačný poplatok podľa balíka, mikro-provízia z obratu,
  moduly navyše a skúšobné doby, odporúčací program (zľava pre nového klienta, mesiac zadarmo pre odporúčateľa — masterdokument).
- **Otvorené:** čo presne je „obrat“ pre mikro-províziu (s daňou za ubytovanie a službami? len zaplatené rezervácie? čo storná?),
  ako sa z podkladu stane faktúra (Martinov fakturačný nástroj), DPH pri nákupe zahraničných služieb (účtovník).
  Model sa navrhne tak, aby bol výhodný pre klientov aj pre Martina.
- **Pracovné princípy z debaty 16. 10. (nie konečné rozhodnutie):**
  - Cieľový segment: **luxusné chalety a väčší ubytovatelia** (obrat rádovo 10–15 tis. € mesačne), nie malí s pár stovkami eur.
  - **Cena podľa hodnoty, nie podľa nákladov:** argumentom je úspora oproti províziám OTA a pohodlie (notifikácie, faktúry, prehľady, SMS…),
    nie porovnanie s cenou Bookingu. Fix aj percentá primerane vyššie, nie „lacný“ produkt.
  - Model **fix + percentá z priamych zaplatených rezervácií**; bez stropu. Väčším klientom **individuálne úľavy** po osobnej dohode.
  - V cene musia byť okrem nástrojov aj **marketing a zisk** — Martin nesmie byť v mínuse.
  - Modelové varianty z debaty: 99 € + 2 %, 149 € + 1,5 %, 79 € + 3 %; balík „bez starostí“ so všetkými modulmi.

## A11. Zakladanie klienta (sprievodca)

- V riadiacom centre **checklist zakladania klienta**: firma, objekty a jednotky, cenník a sezóny, fotky a texty, doména,
  e-mailová doména (DNS), fakturačný nástroj, iCal, právne texty, vzhľad, testovacia rezervácia.
- **Klient vidí stav** (odkaz alebo e-mail): čo je hotové a čo od neho čakáme („dodajte cenník“) — motivuje ho dodať podklady.
- Cieľ: nový klient za hodinu práce Martina, nie za deň.

## A12. Vzhľad pre klienta

- Rezervačná stránka a e-maily stavané na **premenných dizajnového systému**: farby, písma, logo, svetlý a tmavý režim.
  Nastavuje sa bez zásahu do kódu (súčasť balíkov).
- **Zmena rozloženia** (layoutu) je platená práca navyše, nie nastavenie.
- **Ako to funguje:** komponenty (tlačidlá, polia, kalendár, karty) sú pre všetkých rovnaké a používajú len premenné. Každý klient má v databáze
  **tému**: logo, hlavná a doplnková farba, pozadie, písmo nadpisov a textu (z vybranej ponuky), zaoblenie rohov, svetlý/tmavý režim.
  Aplikácia podľa domény pozná klienta a dosadí jeho premenné. Rovnaká téma platí pre rezervačnú stránku, widget aj e-maily.
- **Poistky:** obmedzená sada nastavení (klient si nevie rozbiť vzhľad), automatická kontrola kontrastu (farba textu na tlačidle sa dopočíta),
  náhľad pri zakladaní klienta.
- Pri klientovi s vlastným webom sa téma nastaví podľa jeho webu (napr. globálne farby a písma z Elementor Kitu).

## A13. Notifikácie a mobil

- Administrácia ako **inštalovateľná webová aplikácia** (bez App Store).
- **E-mail majiteľovi o novej rezervácii je v jadre.** Push notifikácie na mobil sú **modul (upsell)**.

## A14. Meranie

- **Vlastné štatistiky z databázy** (bez cookies, spoľahlivé): zdroj rezervácie (priama / Booking / Airbnb / iný), obsadenosť, tržby,
  podiel priamych rezervácií v čase — podklad pre štatistiky v administrácii a prípadové štúdie.
- **Nástroje návštevnosti** (Google Analytics a pod.) na rezervačnej stránke s cookie súhlasom (Consent Mode). Klient si môže
  doplniť vlastné ID (GA4, Meta pixel) v nastaveniach.

## A15. Podpora

- Martin nechce celý deň telefonovať → podpora cez **chat s chatbotom** (napr. Smartsupp, vkladá sa kódom do akejkoľvek stránky)
  a **dokumentáciu / návody pre majiteľov**.
- Rozlišovať dve roviny: **podpora pre majiteľov** (otázky k systému → Martin, chatbot nad návodmi) a **otázky hostí** k objektu
  (→ majiteľ; automatizovaný recepčný je samostatný Premium+ modul).
- Chat na rezervačnej stránke hostí len so súhlasom s cookies.

## A16. Odchod z OTA a paralelný chod

- Cieľ produktu: klienti postupne **opúšťajú Booking a Airbnb** a stavajú na vlastnom kanáli. Prechodné obdobie (prvý rok paralelne)
  je však najrizikovejšie pre reputáciu klienta — dvojitá rezervácia cez oneskorený iCal.
- Preto: čo najčastejšia synchronizácia na našej strane, upozornenie Martinovi aj majiteľovi pri kolízii, spísaný postup pri dvojitej rezervácii.
- Štatistika podielu priamych rezervácií v čase ukazuje klientovi pokrok pri odchode z OTA (predajný argument).

## A17. Nasadenie u klienta (prepojenie s jeho webom)

Platba (vrátane Stripe) a celý rezervačný tok bežia vždy v aplikácii. Klientov web ho len otvára. Tri úrovne:

| Úroveň | Čo hosť vidí | Kedy |
|---|---|---|
| **1. Subdoména klienta** (predvolené) | tlačidlo „Rezervovať“ na webe klienta → `rezervacia.<domena-klienta>` v jeho vizuáli (logo, farby, písma, hlavička s odkazom späť) | vždy, základ |
| **2. Widget + subdoména** (odporúčané) | na webe klienta vyhľadávací pás alebo kalendár (príchod, odchod, osoby) → pokračuje na subdoméne s **predvyplneným termínom** | klienti s vlastným webom |
| **3. Celá rezervácia vložená** (iframe) | rezervácia v stránke webu klienta | len na želanie — krehkejšie (výška, mobil, meranie) |

- Subdoména = jeden DNS záznam (CNAME) u správcu domény klienta; Vercel na nej spustí rezervačnú stránku klienta.
  Vďaka doméne klienta funguje aj vloženie (úroveň 3) v Safari.
- Widget = krátky kód (HTML/JS), vloží sa do akéhokoľvek webu (vo WordPresse/Elementore cez HTML widget). Pri štarte **vyhľadávací pás**,
  neskôr **kalendár s cenami**.
- Pri klientovi s vlastným prezentačným webom je rezervačná stránka **štíhly tok** (kalendár, cena, služby, pokladňa), nie druhý prezentačný web,
  a **neindexuje sa** vo vyhľadávačoch (nekonkuruje webu klienta).
- Showroom s viacerými objektmi a filtrovaním je pre ukážky a klientov bez vlastného webu.

---

# ČASŤ B — DOMÉNOVÉ POŽIADAVKY (z v1, na revíziu)

Požiadavky z architektúry v1 (`docs/archiv-wp/architektura-wp.md`) platia ako **zámer**: dátový model objekt → jednotka,
rezervácia ako hlavička + položky, konfiguračná matica objektu, dostupnosť a iCal, cenotvorba s vekovými pásmami a sezónami,
doplnkové služby s vlastnými poliami a dostupnosťou, rezervačný tok a stavy, komunikácia, zóna hosťa, legislatíva.

**Neplatí z v1:** všetko viazané na WordPress (WP administrácia, JetBooking, používateľská rola WordPressu, klonovanie webov podľa balíka).

Kapitoly sa revidujú v Claude chate po jednej a zapisujú sem ako B1, B2, … (ROADMAP Fáza 2).

---

# ČASŤ C — MVP: CHALET STRÖMY

- Objekt sa prenajíma **celý**, **cena za noc** nezávisle od počtu osôb (počet osôb sa zbiera vždy), sezóny s min. počtom nocí.
- Doplnkové služby: šéfkuchár / raňajky, transfer z letiska (prvý modul).
- Platba len prevodom s QR, 24 h držanie termínu (nastaviteľné), e-maily hosťovi a majiteľovi, iCal s Bookingom a Airbnb.
- Dátový model celý, rozhranie len pre tento prípad. Podklady: `docs/podklady/chalet-stromy-podklady.md`.
- **Nasadenie (A17, úroveň 2):** Janin web beží na WordPresse s Elementorom (bez WooCommerce). Rezervácia na `rezervacia.chaletstromy.sk`
  v jej vizuáli; na jej webe vyhľadávací pás (príchod, odchod, osoby), ktorý presmeruje na subdoménu s predvyplneným termínom;
  tlačidlá „Rezervovať“ smerujú tam. Kalendár s cenami na jej webe neskôr.

## Showroom (ukážkové dáta)

- Počas vývoja beží aplikácia s **ukážkovými dátami**: viac druhov objektov (aby sa dalo filtrovať, mal sa archív a pod.) — vymyslené.
- Medzi nimi **Chalet STRÖMY s reálnymi fotkami a údajmi** na prezentáciu Jane. Ukazovať ho ďalším záujemcom až s jej súhlasom.
- Neskôr samostatný **ukážkový klient** na predaj, ktorého dáta sa každú noc obnovia.
- *Presný rozsah a plán 4 týždňov — doplní sa po revízii časti B.*
