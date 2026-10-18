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
**Čistý projekt** (aktuálny Next.js, App Router, strict TypeScript, shadcn/ui + Tailwind vygenerované nanovo, `@supabase/ssr`, migrácie cez
Supabase CLI). Z Rental Van a Credit Managera sa prenášajú vybrané časti podľa `docs/analyza-existujucich-appiek.md`
(kostra administrácie, zoznam s filtrami, kalendár obsadenosti, práca s fotkami, vzory rezervácie, bezpečnostné SQL vzory, postup migrácií).

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
- **Doklady vystavuje klient vo svojom fakturačnom nástroji.** Jadro dáva **podklad na doklad** pri rezervácii aj účte pobytu
  (odberateľ, rozpis položiek, platby, VS — kopírovať / export) a miesto, kam klient nahrá vystavený doklad pre hosťa.
  **Automatické prepojenie s konkrétnym nástrojom (SuperFaktúra, iKROS, Billdu, Fakturoid…) je platený modul — adaptér na nástroj**
  (rozhodnutie 18. 10.). V adaptéri: vystavený doklad sa nemení, oprava = dobropis. Klient bez nástroja dostane len potvrdenie platby.
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
- **Vrátenie chyby jedného klienta — nikdy nie celej databázy** (17. 10.). Klienti zdieľajú databázu, preto sa pri chybe u jedného
  nevracia všetko. Štyri vrstvy od najčastejšej:
  1. **Kôš** — zmazané veci (služby, sezóny a ceny, poplatky, zľavy, fotky, sekcie, dokumenty, blokácie, kalendáre) si majiteľ sám
     obnoví 30 dní. Rezervácie sa nemažú, len rušia.
  2. **História zmien** — každá zmena v dátach klienta sa zapíše (tabuľka, záznam, pred/po, kto, kedy). Správca v riadiacom centre
     vidí históriu klienta či záznamu a vráti konkrétnu zmenu; podľa nej sa dá zistiť a opraviť aj to, čo pokazila chyba aplikácie.
  3. **Chirurgická obnova jedného klienta zo zálohy** k zvolenému okamihu — záloha sa obnoví bokom (dočasná databáza) a späť sa
     prenesú len riadky toho klienta (`tenant_id`). Ostatní klienti sa nedotknú. Robí Claude Code podľa spísaného postupu, vždy po
     potvrdení Martina, s výpisom, čo sa zmení. Postup sa skúša pri mesačnom skúšobnom obnovení.
  4. **Celá databáza** sa vracia len pri katastrofe (strata alebo poškodenie celej databázy).
  História obsahuje aj osobné údaje hostí → drží sa obmedzene (napr. 180 dní) a pri anonymizácii hosťa sa vyčistí aj jeho história.
- **Riadiace centrum:** stav záloh (posledná záloha, posledné skúšobné obnovenie) a **export dát klienta** (ZIP — ručná záloha jedného
  klienta, odchod klienta, žiadosť podľa GDPR). Obnova nie je tlačidlo.
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
  - Model **fix + percentá z priamych zaplatených rezervácií** (vrátane ručných rezervácií zapísaných majiteľom; bez iCal importov a blokácií); bez stropu. Väčším klientom **individuálne úľavy** po osobnej dohode.
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
- **Vizuálny smer platformy** (administrácia, riadiace centrum, predvolená téma rezervácie — rovnaký základ ako ostatné Martinove aplikácie):
  moderný a pokojný v duchu Apple — **zaoblené prvky, tenké linky, málo farieb** (neutrálne odtiene + jedna akcentová), veľa vzduchu,
  jemné a plynulé animácie a prechody, svetlý aj tmavý režim.
- **Zmena rozloženia** (layoutu) je platená práca navyše, nie nastavenie.
- **Ako to funguje:** komponenty (tlačidlá, polia, kalendár, karty) sú pre všetkých rovnaké a používajú len premenné. Každý klient má v databáze
  **tému**: logo, hlavná a doplnková farba, pozadie, písmo nadpisov a textu (z vybranej ponuky), zaoblenie rohov, svetlý/tmavý režim.
  Aplikácia podľa domény pozná klienta a dosadí jeho premenné. Rovnaká téma platí pre rezervačnú stránku, widget aj e-maily.
- **Poistky:** obmedzená sada nastavení (klient si nevie rozbiť vzhľad), automatická kontrola kontrastu (farba textu na tlačidle sa dopočíta),
  náhľad pri zakladaní klienta.
- **Predvolená téma platformy (v2, 16. 10.):** hlavný akcent (plochy, hlavné akcie) + **doplnková farba** len na drobné štítky (nikdy akcia),
  zaoblenie 10 px (malé prvky 8 px, tlačidlá pilulky), na farebnej ploche **grafitové tlačidlo** s čiernym hover, striedanie bielej a jemného pásu.
  Pri svetlom akcente sa pre plochy s bielym textom automaticky použije tmavší odtieň. Podrobne: `docs/vizual-stranka-hosta.md` → *Pravidlá vzhľadu*.
- Pri klientovi s vlastným webom sa téma nastaví podľa jeho webu (napr. globálne farby a písma z Elementor Kitu).

## A13. Notifikácie a mobil

- Administrácia ako **inštalovateľná webová aplikácia** (bez App Store).
- **E-mail majiteľovi o novej rezervácii je v jadre.** Push notifikácie na mobil sú **modul (upsell)**.
- **Upozornenia v aplikácii (zvonček) sú v jadre** (17. 10.): zoznam udalostí pre majiteľa a tím (nová rezervácia, splatnosť, platba,
  storno, obsadenosť z portálu, kolízia, zlyhaná synchronizácia, koniec skúšky) aj pre správcu platformy; prečítanie osobné pre každého
  používateľa. Push a SMS posielajú tie isté udalosti ďalej ako moduly.

## A14. Meranie

- **Vlastné štatistiky z databázy** (bez cookies, spoľahlivé): zdroj rezervácie (priama / Booking / Airbnb / iný), obsadenosť, tržby,
  podiel priamych rezervácií v čase — podklad pre štatistiky v administrácii a prípadové štúdie.
- **Stránka Štatistiky je v jadre** (17. 10.): tržby podľa termínu pobytu len z priamych rezervácií, obsadenosť zo všetkých kanálov,
  porovnanie s minulým rokom, odhad ušetrených provízií. Pravidlá výpočtu: `docs/vizual-administracia.md` (v1.2).
- **Mesačný výpis je v jadre** (18. 10., predajný argument č. 1): raz mesačne stránka + e-mail s PDF — priame tržby, **ušetrené
  provízie** oproti portálu, **čo systém urobil za majiteľa** (úkony × nastaviteľný odhad minút) a čo potrebovalo človeka, výhľad.
  Úkony sa počítajú z udalostí v databáze (e-maily, rezervácie, synchronizácie, check-iny, objednávky). Pravidlá: `docs/vizual-administracia.md` (v1.4).
- **Nástroje návštevnosti** (Google Analytics a pod.) na rezervačnej stránke s cookie súhlasom (Consent Mode). Klient si môže
  doplniť vlastné ID (GA4, Meta pixel) v nastaveniach.

## A15. Podpora

- Martin nechce celý deň telefonovať → podpora cez **chat s chatbotom** (napr. Smartsupp, vkladá sa kódom do akejkoľvek stránky)
  a **dokumentáciu / návody pre majiteľov**.
- Rozlišovať dve roviny: **podpora pre majiteľov** (otázky k systému → Martin, chatbot nad návodmi) a **otázky hostí** k objektu
  (→ majiteľ; automatizovaný recepčný je samostatný Premium+ modul).
- Chat na rezervačnej stránke hostí len so súhlasom s cookies.
- **Prehliadka „Čo je nové“** (Martin 16. 10.) v administrácii majiteľa aj v riadiacom centre: okno so snímkami ako pri aktualizácii
  systému v Apple — snímka obrazovky, nadpis, dve vety, „Ukázať mi to“ (otvorí danú stránku). Zobrazí sa raz pri prvom prihlásení
  a po každej novej verzii (verzia prehliadky uložená pri používateľovi), dá sa kedykoľvek otvoriť z menu. Obsah = verzované dáta v kóde
  (texty cez preklady), snímky vyrába skript z ukážkových dát, takže sa dajú po zmene rozhrania obnoviť. Slúži zároveň ako úvod pre nového
  klienta (A11) a ako poznámky k vydaniu.

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

## A18. Vzory rozhrania

- **Bočný panel so záznamom:** klik na rezerváciu, hosťa či objekt v zozname vysunie detail sprava cez časť stránky — používateľ neodíde zo zoznamu.
  Stav panelu je v URL (napr. `?panel=booking:<id>`) so zápisom do histórie: **Späť ho zavrie**, odkaz sa dá poslať, Esc a klik mimo zatvárajú.
  Na mobile ide cez celú obrazovku. Jeden spoločný komponent pre celú aplikáciu (Martin 16. 10.: „vytiahne sa na časť obsahu, aby človek neodchádzal“).
- **Navigácia administrácie:** zbaľovací bočný pás (ikony, rozbalenie, pripnutie) so **skupinami a podpoložkami** (v1.2, 17. 10.);
  položky menu dodávajú moduly do skupín; na mobile menu zo strany. Riadiace centrum má rovnaký vzor v tmavom.

---

# ČASŤ B — DOMÉNA (v2, 16. 10. 2026)

*Prevzaté z v1 (`docs/archiv-wp/architektura-wp.md`, schválené v auguste) a z rozhodnutí WordPress fázy, prispôsobené aplikácii.
Martin môže čokoľvek zmeniť; otvorené obchodné otázky sú v ROADMAP → Otázky. WordPress riešenia z v1 neplatia.*

## B1. Dátový model

```
KLIENT (tenant)
  └── OBJEKT (property) ── režim: celok / po jednotkách · cenový model: za noc / za osobu a noc · platobný režim
        ├── JEDNOTKA (unit) ◄── na ňu sa viaže dostupnosť a cena; pri režime „celok“ má objekt práve jednu (v rozhraní skrytú)
        ├── FOTKY (kategória pre albumy galérie, popis, poradie) · VYBAVENIE (zvýraznené pre „čo vás čaká“) · TYP · REGIÓN · VHODNÉ PRE
        ├── POLOHA ── súradnice + zobrazenie na mape: presné miesto / približná oblasť (adresa až po potvrdení) · MIESTA V OKOLÍ (názov, ako, vzdialenosť)
        ├── SEZÓNA (season) ── termíny (aj každoročne opakované), min./max. nocí, povolené dni príchodu, priorita
        ├── CENA (rate) ── jednotka × sezóna → za noc, alebo za osobu a noc podľa vekového pásma
        ├── POPLATOK (fee) ── automatický alebo voliteľný (zviera, záverečné upratovanie), vratná kaucia zvlášť (nie je tržba)
        ├── ZĽAVA (discount) ── dĺžka pobytu, promo kód; neskôr early bird, last minute, vernostná
        ├── SLUŽBA (service, modul) ── cena: fixne za pobyt / za osobu / za noc / za osobu a noc / za kus
        ├── REFERENCIA (testimonial) ── vybrané hodnotenia hostí: text (viacjazyčne), meno, mesiac pobytu, zdroj, odkaz, zvýraznená, poradie
        └── iCAL KANÁL ── import z Bookingu/Airbnb, export nášho kalendára (na jednotke)

REZERVÁCIA (hlavička) ── číslo (rad klienta), stav, zdroj (priama / booking / airbnb / ručná / iná), objednávateľ, počty osôb
  │                       podľa vekových pásiem, jazyk, mena, termín platby, poznámka
  ├── POLOŽKA (reservation_item) ── jednotka + termín [príchod, odchod)          [rozhranie zatiaľ vždy 1]
  ├── RIADKY CENY (reservation_line) ── zamrazený rozpis podľa poradia A5 (noci po sezónach, poplatky, služby, zľavy, daň), sadzba DPH na riadku
  ├── PLATBA (payment) ── poskytovateľ (prevod / karta / na mieste), suma, VS, stav, prijatá kedy a kým
  ├── HISTÓRIA STAVOV ── kto, kedy, z čoho na čo
  ├── SÚHLASY ── typ, znenie (verzia), čas
  └── PRÍSTUPOVÝ ODKAZ ── token pre hosťa bez účtu (detail, platba, žiadosť o storno; neskôr check-in a recenzia)

OBSADENOSŤ (occupancy) ── jedna tabuľka všetkého, čo blokuje jednotku: potvrdené a čakajúce rezervácie, dočasná blokácia,
                          udalosti z iCal, blokácia majiteľom · obmedzenie v databáze proti prekryvu
```

- Texty objektu, jednotky, služieb a pravidiel sú **viacjazyčné** (A6). Fotky v úložisku s cestou podľa klienta.
- **Referencie** (rozhodnutie 16. 10.):
  - Samostatná tabuľka pri klientovi, voliteľne priradená k objektu (spoločná pre viac objektov). Polia: text, zobrazené meno
    (celé meno len so súhlasom hosťa, inak meno a iniciála), mesiac a rok pobytu, zdroj (Google / Booking / Airbnb / e-mail / iný),
    odkaz na zdroj, **zvýraznená** (do košíka, max. 5), poradie, zverejnená.
  - Zobrazenie: sekcia „Referencie“ na stránke (B7) a v košíku **jedna naraz s ručnými šípkami** (bez automatického posúvania),
    odkaz **„Všetky referencie“** otvorí zoznam priamo v paneli; až v ňom je odkaz na externú stránku klienta (nastavenie `reviews_url`,
    nová karta). Hosť tak neodchádza z rozpracovanej rezervácie.
  - **Pravidlá EÚ o recenziách:** pri referenciách je krátka veta, odkiaľ pochádzajú a ako ich majiteľ vyberá (napr. „Vybrané hodnotenia
    hostí z Google a e-mailov.“). Žiadne vymyslené hodnotenia ani hviezdičky bez zdroja; „overené“ len pri recenziách z našich pobytov.
  - Neskôr **modul Recenzie**: žiadosť po pobyte (B6), overená recenzia viazaná na rezerváciu, majiteľ ju môže zverejniť ako referenciu.
- **Neskôr (dátovo pripravené):** zložená jednotka (celý chalet = apartmán + zvyšok — rezervácia celku blokuje časti a naopak),
  vekové pásma v rozhraní, cena za osobu, záloha a doplatok, vlastné polia služieb a dostupnosť služieb, overené recenzie z pobytov (modul), údaje ubytovaných z check-inu.

## B2. Dostupnosť

- **Dvojitej rezervácii bráni databáza:** obmedzenie nad tabuľkou obsadenosti (jednotka + rozsah nocí `[)`) pre blokujúce záznamy.
  Pri kolízii pri importe z iCal sa nič neprepíše — vznikne upozornenie majiteľovi aj Martinovi (A16).
- **Upratovací deň medzi pobytmi** voliteľne na objekte (rozsah obsadenosti sa predĺži).
- **Blokácia** (osobné použitie, údržba) nemá údaje hosťa ani cenu a nepočíta sa do provízie; ručná rezervácia áno.
- **Min. počet nocí a povolené dni príchodu podľa sezóny dňa príchodu**; cena sa počíta **po nociach podľa sezóny každej noci**
  (napr. 21.–24. 12. = 2 × zimná + 1 × Vianoce). Prekryv sezón rieši priorita.
- **Dočasná blokácia** počas vypĺňania (cca 30 min) a pri prevode do termínu platby (predvolene 24 h, nastaviteľné).
- **iCal:** export per jednotka (tajný odkaz), import kanálov s pravidelnou synchronizáciou (čo najčastejšie, plánovaná úloha v Supabase).
- Pri režime „po jednotkách“ vráti vyhľadávanie objekt, ak je voľná aspoň jedna jednotka.

## B3. Cenotvorba

- Poradie výpočtu podľa A5; **výpočet je čistá funkcia** (vstup: objekt, termín, osoby, služby, kód → riadky ceny), testovaná jednotkovými testmi,
  rovnaká pre stránku hosťa aj server. **Server vždy prepočíta cenu sám** (neverí prehliadaču) a pri vytvorení ju zamrazí.
- Aj pri cene za noc sa **vždy zbiera počet osôb** (kapacita, daň, kniha ubytovaných).
- **Daň za ubytovanie:** sadzba na osobu a noc podľa obce, oslobodenia podľa vekového pásma, prepínač „zahrnutá v cene“ (STRÖMY áno).
- **DPH:** sadzba na riadku; klient platca / neplatca. Sadzby potvrdí účtovník.
- Zaokrúhľovanie na centy na riadku, súčet z riadkov.

## B4. Doplnkové služby (modul `services`)

- Služba = názov, popis, cenový model, cena, aktívna, poradie. Hosť ju volí v rezervácii (množstvo, ak dáva zmysel).
- **Bez doplňujúcich polí** v MVP (dátum večere, číslo letu) — majiteľ sa dohodne s hosťom e-mailom; hosť má pole poznámka (rozhodnutie z 13. 10.).
- Neskôr: vlastné polia, vlastná dostupnosť. Objednávka po rezervácii = modul `upsell` (B11).

## B5. Rezervačný tok a stavy

```
           ┌── prevod ──► ČAKÁ NA PLATBU (termín blokovaný do lehoty, QR + VS) ──┬── platba prijatá ──► POTVRDENÁ
NOVÁ ──────┤                                                                     └── lehota vypršala ──► ZRUŠENÁ (automaticky, termín uvoľnený)
           └── karta (neskôr) ──────────────────────────────────────────────────────────────────────► POTVRDENÁ
POTVRDENÁ ──► PREBIEHA ──► UKONČENÁ          · storno: hosť len žiada, rozhoduje majiteľ · majiteľ môže zrušiť
RUČNÁ REZERVÁCIA (majiteľ, napr. telefón) ──► rovno POTVRDENÁ alebo ČAKÁ NA PLATBU
```

- Storno podmienky sa hosťovi zobrazia pri rezervácii a uložia sa ich znenie (súhlas). Výpočet storno poplatku zobrazí majiteľovi návrh.
- Číslovanie rezervácií podľa klienta (napr. `2026-0001`). Zmeny stavov len cez databázové funkcie s históriou.

## B6. Komunikácia (e-mail; SMS neskôr ako modul)

| Komu | Správa |
|---|---|
| hosť | rezervácia prijatá + platobné údaje (QR) · pripomienka pred koncom lehoty · platba prijatá / potvrdenie · zrušenie (vypršanie, storno) · pokyny pred príchodom (X dní vopred, s neverejnými údajmi objektu) · žiadosť o recenziu (neskôr) |
| majiteľ | nová rezervácia · lehota platby vypršala · kolízia z iCal · žiadosť hosťa o storno |

Šablóny prekladateľné, v téme klienta (A7, A12), fronta s opakovaním. Prístupové kódy a Wi-Fi len v e-maile pred príchodom, nikdy na verejnej stránke.

## B7. Stránka hosťa

- **Klient s vlastným webom (A17):** štíhly tok — objekt (galéria, hlavné údaje, kalendár s cenami, cenník sezón, v cene zahrnuté),
  termín a osoby (predvyplnené z widgetu cez parametre adresy), služby, údaje objednávateľa, poznámka, súhlasy (VOP a storno — povinné,
  informácia o spracúvaní údajov, **marketingový súhlas nepovinný a nezaškrtnutý**), súhrn s rozpisom ceny, odoslanie → platobné údaje.
  Neindexuje sa.
- **Showroom / klient bez webu:** katalóg objektov s filtrami (typ, región, počet osôb, termín), detail objektu, potom rovnaký tok.
- Po odoslaní: stránka a e-mail s prístupovým odkazom na rezerváciu (stav, platba, žiadosť o storno). Účet hosťa neskôr.
- **Detail objektu sa skladá zo sekcií** (nie builder):
  - **Typy sekcií** sú pevné a spoločné pre všetkých klientov; každý typ = komponent so schémou polí (zod), vzhľad len z témy (A12).
    Základná sada: úvod (galéria + referencia + mapa + údaje + panel s cenou) · „čo vás čaká“ (zvýraznené vybavenie, počet deliteľný 3) ·
    kalendár s cenami (povinný, nedá sa vypnúť) · pás s fotkou · okolie a mapa (miesta v okolí) · cenník sezón s „v cene“ · pohľad dovnútra
    (mozaika fotiek) · priestory a izby · referencie · časté otázky · pravidlá a storno · kontakt na majiteľa · záverečná výzva
    (s **najbližším voľným termínom**, ktorý systém vypočíta z obsadenosti, min. nocí a cien).
    Moduly môžu pridať vlastný typ sekcie cez register (napr. `services` → služby na objednávku); jadro typy modulov nepozná.
  - **Pri objekte** sa ukladá zoznam sekcií: typ, poradie, zapnutá, obsah (texty viacjazyčne, odkazy na fotky). **Prázdna sekcia sa skryje.**
  - **Predlohy podľa typu ubytovania** (celý objekt, penzión s izbami, apartmány, glamping) = prednastavený výber a poradie sekcií;
    použijú sa pri založení objektu, potom sa dajú upraviť.
  - **Údaje, ktoré systém pozná, sa nepíšu ručne:** spôsob účtovania (za objekt / za osobu), min. noci, storno, čas príchodu a odchodu,
    vybavenie, ceny sa do sekcií dosadzujú z nastavení objektu a cien — texty a výpočet si nemôžu protirečiť.
  - **MVP:** dátový model a vykresľovanie zo sekcií; sekcie pre STRÖMY a showroom nastaví seed. Rozhranie v administrácii
    (vypínač, presúvanie, formulár sekcie) po MVP.

## B8. Administrácia majiteľa (MVP)

Prehľad (dnešné príchody a odchody, čakajúce platby) · **kalendár obsadenosti** (mesiac, jednotky, rezervácie a blokácie) ·
**rezervácie** (zoznam s filtrami + bočný panel: stav, rozpis, platba prijatá, zrušenie, poznámky, história) · ručná rezervácia ·
objekt a jednotky (texty, fotky, vybavenie, pravidlá, neverejné pokyny k príchodu) · sezóny a ceny · poplatky a zľavy · služby (modul) ·
blokácie · iCal kanály · nastavenia (platobné údaje a lehota, storno podmienky, odkazy na právne dokumenty) · export CSV.

## B9. Legislatíva

- Kniha ubytovaných: pri rezervácii objednávateľ a počty osôb; údaje všetkých hostí cez online check-in (neskôr, modul).
- Daň za ubytovanie podľa B3. Doklady cez adaptér fakturačného nástroja klienta (A5) — keď bude známy Janin nástroj.
- Právne dokumenty (VOP, storno, ochrana údajov) dodáva klient (príp. právna firma); systém ich odkazuje a ukladá znenie súhlasu.

## B10. Zóna hosťa (účet hosťa)

Hosť má vlastnú zónu — „svoj dashboard“ (Martin 16. 10.). Rezervácia ide aj bez účtu; účet je pohodlie pre opakovaných hostí.

- **Vstup:** prístupový odkaz z e-mailu (bez účtu, len k jednej rezervácii) alebo **účet** — prihlásenie kódom/odkazom na e-mail
  (bez hesla, menej trenia). Účet vznikne voliteľne po rezervácii („Uložiť si údaje pre ďalšie pobyty“) alebo neskôr; existujúce rezervácie
  sa priradia cez **overený e-mail**.
- **Účet hosťa je u konkrétneho klienta** (na jeho doméne, s `tenant_id`), nie spoločný pre celú platformu. Dôvod: za údaje hostí zodpovedá
  každý klient zvlášť, platforma ich nesmie spájať naprieč klientmi. Ten istý e-mail tak môže mať účet u dvoch ubytovateľov.
- **Obsah zóny:**
  - nadchádzajúce a minulé pobyty (stav, termín, rozpis, platobné údaje kým nie je zaplatené)
  - **dokumenty od majiteľa:** spoločné pri objekte (napr. ubytovací poriadok) a pre konkrétnu rezerváciu; súkromné úložisko s dočasnými
    odkazmi (nie verejné adresy)
  - doklady a faktúry (z fakturačného adaptéra)
  - **pokyny k príchodu a prístupové kódy** — viditeľné až pri potvrdenom pobyte, X dní pred príchodom
  - **„Rezervovať znova“** — ten istý objekt s predvyplnenými hosťami a službami, hosť vyberie len termín
  - **správy s majiteľom** pri rezervácii (modul Správy, A15/B6) — dovtedy kontakt WhatsApp/telefón
  - žiadosť o storno, úprava kontaktných údajov, **správa marketingového súhlasu** (odvolanie jedným klikom)
- Vzhľad v téme klienta (A12), rovnaký jazyk ako stránka a košík v2 (`docs/vizual-stranka-hosta.md`). Podklad z WordPress fázy: `docs/archiv-wp/ucet-hosta-navrh.md`.
- **MVP:** prístupový odkaz k rezervácii. **Účet a zóna hneď po MVP** (Fáza 4); dátový model pripravený už teraz.

---

# ČASŤ C — MVP: CHALET STRÖMY

- Objekt sa prenajíma **celý**, **cena za noc** nezávisle od počtu osôb (počet osôb sa zbiera vždy), sezóny s min. počtom nocí.
- Doplnkové služby: šéfkuchár / raňajky, transfer z letiska (prvý modul).
- Platba len prevodom s QR, 24 h držanie termínu (nastaviteľné), e-maily hosťovi a majiteľovi, iCal s Bookingom a Airbnb.
- Dátový model celý, rozhranie len pre tento prípad. Podklady: `docs/podklady/chalet-stromy-podklady.md`.
- **Nasadenie (A17, úroveň 2):** Janin web beží na WordPresse s Elementorom (bez WooCommerce). Rezervácia na `rezervacia.chaletstromy.sk`
  v jej vizuáli; na jej webe vyhľadávací pás (príchod, odchod, osoby), ktorý presmeruje na subdoménu s predvyplneným termínom;
  tlačidlá „Rezervovať“ smerujú tam. Kalendár s cenami na jej webe neskôr.

## B11. Moduly po MVP — upsell, recenzie, check-in, push, správy (17. 10. 2026)

*Postup: Claude Code stavia dátový a technický základ, Claude chat medzitým kreslí obrazovky; rozhranie sa doplní podľa plátna.*

**Upsell (modul `upsell`, potrebuje `services`).** Objednávka služby **po vytvorení rezervácie** — od potvrdenia rezervácie do odchodu,
v účte hosťa (aj cez prístupový odkaz) jedným ťuknutím **záväzne**.
- Samostatná tabuľka dodatočných objednávok (napr. `reservation_orders`) — **zmrazené riadky ceny rezervácie sa nemenia** (B1);
  cena objednávky sa zmrazí pri objednaní (centy, mena, DPH), počet podľa cenového modelu služby.
- Nastavenia služby pre upsell: ponúkať po rezervácii áno/nie, **uzávierka** (hodiny pred dňom služby / pred príchodom),
  **vyžaduje potvrdenie majiteľa** (kapacita — napr. šéfkuchár), **povoliť „na účet pobytu“**.
- Stavy: objednaná → (čaká na potvrdenie →) potvrdená / zamietnutá majiteľom (dôvod) / zrušená hosťom (do uzávierky).
- Platba: **„na účet pobytu“** (vyúčtovanie pri odchode — na mieste alebo prevodom), **prevod s QR hneď**, **karta** až so Stripe.
  Limit sumy na účte pobytu (nastavenie klienta, predvolene 300 €); nad limit len platba vopred.
- **Účet pobytu** pri rezervácii: objednávky, zaplatené / otvorené, „Vyúčtovať“ (zaznamená platbu, doklad cez fakturačný adaptér, keď bude).
- Ponuky v e-mailoch pred príchodom (napr. 7 a 2 dni) podľa nastavenia; udalosti rezervácie pre upozornenia (nová objednávka, čaká na potvrdenie).

**Recenzie (modul `reviews`) — overené recenzie z pobytov** (rozhodnutie 17. 10.).
- Hodnotiť môže len hosť rezervácie, ktorá nie je zrušená a ktorej **odchod už prebehol**; jedna recenzia na rezerváciu; okno 30 dní.
  Pozvánka e-mailom deň po odchode, jedna pripomienka po 7 dňoch (len ak nehodnotil); v účte hosťa „Ohodnoťte pobyt“.
- Obsah: celkové hodnotenie 1–5, voliteľne čiastkové (čistota, poloha, komunikácia, pomer cena/kvalita), text, zobrazené meno
  (krstné + iniciála, hosť môže zmeniť), mesiac pobytu, jazyk.
- **Zverejnenie automaticky po 72 h**, ak majiteľ nezasiahne (môže zverejniť skôr). Zamietnuť len z pevného zoznamu dôvodov
  (vulgarizmy, osobné údaje, nesúvisí s pobytom, spam) — dôvod sa zapíše, hosť dostane e-mail. Verejná odpoveď majiteľa, výber navrch.
- Priemer len z overených zverejnených recenzií; na stránke veta, ako sa overuje (Omnibus). **Doterajšie ručné referencie
  (`testimonials`) ostávajú** ako „hodnotenia z iných zdrojov“ so zdrojom, do priemeru sa nepočítajú a neoznačujú sa ako overené.

**Online check-in (modul `checkin`) — nečaká na Janu** (Martin 17. 10.): povinnosti sú zo zákona rovnaké pre všetkých, to, čo je
u klienta iné (obec, sadzba dane, oslobodenia, pokyny), je nastavenie. **Slovenský balík pravidiel** (A6, B9):
- **Kniha ubytovaných** (všetci hostia): meno a priezvisko, číslo OP alebo pasu, adresa trvalého pobytu, doba ubytovania; pri cudzincoch
  (každý, kto nie je občan SR, aj EÚ) navyše štátna príslušnosť a dátum narodenia. Písomne alebo elektronicky.
- **Hlásenie pobytu cudzinca** polícii do 5 dní od ubytovania (zákon 404/2011): aplikácia pripraví vyplnené tlačivo (PDF, podpis hosťa
  pri príchode) a prehľad na odoslanie; samotné elektronické odoslanie polícii (eID) robí ubytovateľ — napojenie neskôr. Tlačivo sa
  uchováva 2 roky.
- **Daň za ubytovanie** (zákon 582/2004, sadzbu a oslobodenia určuje VZN obce): nastavenie klienta — obec, sadzba za osobu a noc,
  oslobodenia (napr. vek); výpočet pri pobyte a mesačný prehľad pre obec.
- Hosť vyplní v účte (alebo cez prístupový odkaz) údaje **všetkých** osôb pobytu, čas príchodu, súhlas s ubytovacím poriadkom; po
  dokončení sa mu podľa nastavenia odomknú pokyny a prístupové kódy. Majiteľ vidí stav check-inu pri rezervácii a v prehľade príchodov.
- **Citlivé údaje:** čísla dokladov a dátumy narodenia vidí len majiteľ (nie celý tím, nie správca bez vstupu cez audit), každé zobrazenie
  sa zapíše; po uplynutí lehoty uchovávania sa automaticky zmažú. **Konkrétne lehoty a polia overiť pred ostrým nasadením** (zákon sa mení).

**Push notifikácie (modul `push`).** Web Push (VAPID) z nainštalovanej administrácie — bez platenej služby. Kanál nad upozorneniami (A13):
zariadenia per používateľ, výber druhov, odoslanie pri vzniku upozornenia, upratanie neplatných. iPhone len po „Pridať na plochu“
(návod). Správca platformy dostáva push na svoje platformové upozornenia bez modulu.

**Správy s hosťom (modul `messages`, platený; návrh 17. 10.).** Cieľ: hostia si zvyknú chodiť do účtu — každá správa majiteľa
príde aj e-mailom s tlačidlom, ktoré hosťa prihlási rovno k pobytu.
- **Jedna konverzácia = jedna rezervácia** (len priame rezervácie; obsadenosť z iCal hosťa nemá). Tabuľka správ s `tenant_id`,
  `reservation_id`, odosielateľ (hosť / člen tímu / automatika s odkazom na pravidlo), text (max. 4 000 znakov), čas, prečítanie
  hosťom a tímom (tím zdieľa jeden stav „vybavené“, osobné prečítanie len v zvončeku). História (`record_history`) áno; správy sú osobné
  údaje — patria do exportu „Moje dáta“ a mažú sa s rezerváciou podľa lehôt uchovávania. **Prístupové kódy ani Wi-Fi sa v správach
  nepoužívajú** (premenné ich neponúkajú) — ostávajú v pokynoch k príchodu.
- **Hosť píše** od vytvorenia rezervácie do 30 dní po odchode (potom len čítanie), v účte aj cez prístupový odkaz; limit podľa IP/hosťa.
- **Nová správa majiteľa → e-mail hosťovi** s celým textom a tlačidlom „Odpovedať“ (prihlásenie k pobytu bez hesla, odkaz platí 7 dní),
  odosielateľ meno majiteľa · názov objektu z domény klienta (A7), **Reply-To = kontaktný e-mail klienta** (odpoveď na e-mail príde majiteľovi
  do schránky, nič sa nestratí; zapisovanie takých odpovedí do konverzácie je ďalšia fáza). Viac správ do 15 minút = jeden e-mail.
- **Nová správa hosťa →** upozornenie (zvonček, druh `message.new`), push a e-mail majiteľovi (zlúčené po 15 minútach, neposiela sa,
  ak ju niekto z tímu medzitým otvoril). Odznak v menu = počet konverzácií, kde posledná správa je od hosťa a nikto neodpovedal.
- **Automatické správy** (pravidlá klienta): názov, zapnuté, kotva (potvrdenie rezervácie / príchod / odchod), posun v dňoch pred/po,
  čas odoslania v časovom pásme klienta, text po jazykoch s premennými `{meno}`, `{príchod}`, `{odchod}`, `{podpis}`, `{odkaz na hodnotenie}`.
  Posielanie cez pg_cron, každé pravidlo raz na rezerváciu (unikátnosť), nie pre zrušené rezervácie, **čas, ktorý už uplynul, sa nedobieha**.
  Hosť ich vidí ako správu od majiteľa; tím ich vidí označené „Automaticky · …“ a **naplánovanú** správu pri konkrétnom hosťovi môže
  upraviť alebo vynechať. Predvolené pravidlá pri zapnutí modulu: Privítanie (po potvrdení), Ako sa k nám dostanete (3 dni pred príchodom
  10:00), Je všetko v poriadku? (1 deň po príchode 10:00), Pokyny k odchodu (1 deň pred odchodom 18:00, vypnuté), Poďakovanie (1 deň po odchode 11:00).
- **Bez dvojitých e-mailov:** Privítanie ide v potvrdzovacom e-maile (nie samostatne). Ak v ten istý deň ide hosťovi e-mail s pokynmi
  k príchodu alebo ponuka upsell, automatická správa sa pošle ako blok v ňom. S modulom `reviews`: ak je Poďakovanie zapnuté a obsahuje
  `{odkaz na hodnotenie}`, samostatná pozvánka na hodnotenie sa neposiela (pripomienka po 7 dňoch áno).
- **Jadro vs. modul:** povinné e-maily B6 (potvrdenie, platba, pokyny, zrušenie) sú jadro. Modul pridáva konverzáciu, automatické správy
  a **rýchle odpovede** (uložené texty tímu). Bez modulu má hosť kontakt telefón / WhatsApp ako doteraz.
- Neskôr: odpovede e-mailom priamo do konverzácie (príjem pošty), fotky v správach, preklad správ, AI návrh odpovede.

## Showroom (ukážkové dáta)

- Počas vývoja beží aplikácia s **ukážkovými dátami**: viac druhov objektov (aby sa dalo filtrovať, mal sa archív a pod.) — vymyslené.
- Medzi nimi **Chalet STRÖMY s reálnymi fotkami a údajmi** na prezentáciu Jane. Ukazovať ho ďalším záujemcom až s jej súhlasom.
- Neskôr samostatný **ukážkový klient** na predaj, ktorého dáta sa každú noc obnovia.
- **Showroom (vymyslené, voľne použiteľné fotky):** 6 objektov podľa konfiguračnej matice v1 — chalet (celok, za noc), horská chata (celok),
  vila (celok), apartmánový dom (4 jednotky), penzión (6 izieb), glamping (3 jednotky); rôzne regióny, typy a sezóny, aby fungovali filtre.
  Cena za osobu a záloha sa v ukážke zatiaľ len opíšu, kým nie sú v rozhraní.

## Rozsah MVP (prvý mesiac)

| V MVP | Neskôr |
|---|---|
| objekt celok, cena za noc, sezóny s min. nocami, zľava od N nocí, promo kód | jednotky v rozhraní, cena za osobu, vekové pásma v rozhraní |
| služby (modul) bez doplňujúcich polí, poplatok za zviera | vlastné polia a dostupnosť služieb, upsell pred príchodom |
| prevod s QR, 24 h lehota, automatické zrušenie, ručné potvrdenie platby | Stripe, záloha a doplatok, párovanie platieb z banky |
| e-maily z B6 (okrem recenzie) | SMS, push notifikácie (moduly) |
| administrácia z B8, ručná rezervácia, CSV, štatistiky a upozornenia (v1.2) | online check-in, recenzie |
| prístupový odkaz k rezervácii (stav, platba, storno) | účet a zóna hosťa (B10) — hneď po MVP |
| iCal export a import s upozornením na kolíziu | API prepojenie s OTA |
| stránka hosťa pre klienta s webom + katalóg pre showroom | vkladací widget (hneď po MVP, úloha 3e) |
| podklad na doklad (ručné vystavenie) | prepojenie s fakturačným nástrojom (platený modul, A5) |
