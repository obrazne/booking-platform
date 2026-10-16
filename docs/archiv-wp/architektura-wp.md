# ARCHITEKTÚRA REZERVAČNÉHO SYSTÉMU

*Jediný zdroj pravdy o tom, ČO staviame. Ako a v akom poradí → `ROADMAP.md`. Prečo → `ROZHODNUTIA.md`.*

**Verzia:** v2 (rozpracovaná) — vychádza z v1 z 19. 8. 2026 (archív: `Inštrukcie/rezervacny-system-architektura-v1.md`)
**Stav revízie:** kapitoly 1–3 prejdené 13. 10. 2026, kapitoly 4–15 čakajú na revíziu (zatiaľ platí znenie z v1)
**Aktuálna priorita:** MVP pre Chalet STRÖMY na natívnych funkciách — rozsah a postup v `ROADMAP.md`, Fáza 1. Tento dokument popisuje cieľový stav plnej krabice.
**Prostredie:** booking.martinolsa.sk — WP 7.1.3, PHP 8.4, šablóna Crocoblock **BaliRento** (Kava Child + Elementor Pro + JetThemeCore + JetPlugins), JetEngine, JetBooking, JetFormBuilder, WooCommerce. CrocoBuilder sa nepoužíva.

---

## 1. ČO STAVIAME

**Demo showroom**, nie klientsky web. Obsahuje **nadmnožinu** všetkého, čo systém vie.

```
DEMO (všetko zapnuté)
   │
   ├──► Balík 1 – Základná krabica      (podmnožina)
   ├──► Balík 2 – Kompletný web + systém (podmnožina)
   └──► Balík 3 – Premium ekosystém      (takmer celé demo)
                    │
                    └──► pri objednávke sa naklonuje vhodný variant pre klienta
```

**Štruktúra webu:** katalóg objektov jedného majiteľa. Nie marketplace — žiadne profily hostiteľov, žiadna registrácia majiteľov, žiadne provízie medzi stranami. Marketplace prvky šablóny BaliRento (Single User, Members area, registrácia hostiteľov) sa odstránia.

**Z BaliRenta ostáva:** účet hosťa, obľúbené (wishlist), výpis objektov na mape, blog.

**Demo nemá vysvetľujúcu vrstvu** (žiadne popisky funkcií ani badge balíkov). Vyzerá ako ostrý web; funkcie a balíky vysvetľuje Martin pri predaji.

**Jazyky:** slovenčina + angličtina už v deme.

---

## 2. ARCHITEKTONICKÉ PRINCÍPY

Tieto štyri pravidlá platia naprieč celým systémom a porušenie ktoréhokoľvek z nich sa neskôr platí prestavbou:

**2.1 Jedna architektúra, vypínače.**
Balíčky nie sú tri rôzne stavby. Dátový model vždy obsahuje všetko; podľa balíka sa zapína a vypína len funkcionalita a rozhranie. Inak sa pri každej oprave chyby opravujú tri weby a po roku sa rozídu.

**2.2 Rezervácia je hlavička + položky (1:N) už teraz.**
Modul „viac jednotiek v jednej rezervácii" príde neskôr, ale ak by rezervácia mala priamo pole `jednotka_id`, ten modul sa už nedá doplniť bez migrácie rezervácií u všetkých klientov. Rozhranie zatiaľ povolí len jednu položku.

**2.3 Žiadne natvrdo zapísané farby, písma a texty.**
Vzhľad sa mení centrálnym nastavením (logo, farby, písma) → všetko musí ísť cez globálne premenné (Elementor Kit). Všetky nápisy, stavy a e-mailové šablóny musia byť prekladateľné reťazce. Demo beží v **SK + EN** → potrebný prekladový plugin kompatibilný s JetBookingom, JetEngine a WooCommerce (overiť vo fáze technického overenia).

**2.4 Majiteľ nie je administrátor.**
Vlastná používateľská rola s obmedzenými právami: vidí rezervácie, kalendár, objekty a štatistiky; nevidí pluginy, šablóny ani nastavenia. Plný administrátor si vie rozbiť web a oprava padne na paušál.

---

## 3. DÁTOVÝ MODEL

```
NASTAVENIA INŠTALÁCIE
  ├── majiteľ, fakturačné údaje, branding, číselné rady
  │
  └── OBJEKT
        ├── režim rezervácie: celok / po jednotkách
        ├── cenový model: fixná za noc / za osobu a noc
        ├── platobný režim: celá suma / záloha / na mieste
        ├── obec + sadzba dane za ubytovanie
        │
        ├── JEDNOTKA  ◄── na túto úroveň sa viaže dostupnosť a cena
        │     └── (bez identických kusov — každá jednotka je unikát,
        │          aj rovnaké izby penziónu sú samostatné jednotky)
        │
        ├── SEZÓNA / CENNÍK
        ├── POPLATOK
        ├── DOPLNKOVÁ SLUŽBA
        │     └── VLASTNÉ POLIA SLUŽBY
        └── RECENZIA ◄── viaže sa cez rezerváciu

REZERVÁCIA (hlavička)
  ├── POLOŽKA REZERVÁCIE → jednotka, termín, cena   [zatiaľ vždy 1]
  ├── OBJEDNANÁ SLUŽBA → vyplnené polia služby
  ├── PLATBA
  ├── HOSŤ (objednávateľ)
  ├── ÚDAJE UBYTOVANÝCH (z online check-inu)
  ├── SÚHLASY (znenie + dátum)
  └── FAKTÚRA
```

### 3.1 Objekt — polia

| Skupina | Polia |
| :--- | :--- |
| Identita | názov, typ ubytovania, krátky a dlhý popis, hlavná fotka, galéria |
| Lokalita | adresa, GPS, región, vzdialenosti k bodom záujmu |
| Prevádzka | check-in / check-out čas, domáci poriadok, kontakt |
| Vybavenie | spoločné vybavenie objektu (wellness, bazén, parkovanie, wifi) |
| Konfigurácia | režim rezervácie, cenový model, platobný režim |
| Vekové pásma | hranice pásiem dospelý / dieťa / batoľa, či sa batoľa ráta do kapacity |
| Fakturácia | obchodné meno, IČO, DIČ, IČ DPH, režim DPH, obec, sadzba dane za ubytovanie |

### 3.2 Jednotka — polia

| Skupina | Polia |
| :--- | :--- |
| Identita | názov, popis, galéria, poradie, aktívna |
| Kapacita | štandardný a maximálny počet osôb, max. dospelých a detí, rozpis lôžok, detská postieľka |
| Priestor | rozloha, počet spální, počet kúpeľní, podlažie, výhľad |
| Vybavenie | vybavenie jednotky (odlišné od objektu) |
| Cena | základná sadzba, min. a max. počet nocí |

### 3.3 Taxonómie

Typ ubytovania · Vybavenie · Lokalita a región · Vhodné pre (rodiny, páry, firmy, lyžiari)

Pri režime „celý objekt“ má objekt presne jednu jednotku, skrytú z rozhrania.

---

## 4. KONFIGURAČNÁ MATICA OBJEKTU

Objekt má tri nezávislé osi nastavenia. Demo musí pokryť ich zmysluplné kombinácie:

| | **Fixná cena za noc** | **Cena za osobu a noc** |
| :--- | :--- | :--- |
| **Rezervácia celku** | Chalet | Horská chata, Vila |
| **Rezervácia po jednotkách** | Apartmánový dom | Penzión, Glamping |

Tretia os — platobný režim (celá suma / záloha / na mieste) — sa rozdelí naprieč objektmi.

---

## 5. DOSTUPNOSŤ

- **iCal obojsmerne** — import z Booking.com a Airbnb, export nášho kalendára. Nikto neodíde z OTA zo dňa na deň; prvý rok pobeží paralelne.
- **Sezónne pravidlá pobytu** — minimálny a maximálny počet nocí a povolené dni príchodu sa menia podľa sezóny.
- **Blokovaný deň medzi pobytmi** na upratovanie, konfigurovateľný.
- **Dočasná blokácia termínu počas platby** — povinná súčasť jadra. Bez nej môžu ten istý termín kúpiť dvaja hostia naraz.
- **Dostupnosť sa počíta na jednotke, zobrazuje sa na objekte.** Pri režime „po jednotkách" musí filter vrátiť objekt, ak je voľná aspoň jedna jednotka, a na detaile ukázať ktoré.
- **Doplnkové služby majú vlastnú dostupnosť**, nezávislú od dostupnosti ubytovania.

---

## 6. CENOTVORBA

### 6.1 Cenové modely
- **Fixná cena za noc** — nezávislá od počtu osôb
- **Cena za osobu a noc** — s vekovými pásmami

**Vekové pásma:** dospelý / dieťa / batoľa, hranice nastaviteľné na objekte.

**Pozor:** aj pri fixnej cene systém **vždy zbiera počet osôb** — kvôli dani za ubytovanie, knihe ubytovaných a vyhľadávaniu podľa počtu hostí.

Sezónnosť násobí cenník do matice **sezóna × vekové pásmo**.

### 6.2 Poplatky (automatické)
- Poplatok za zviera
- *(odporúčané doplniť: záverečné upratovanie, vratná kaucia)*

### 6.3 Zľavy
- Zľava za dĺžku pobytu (7+ nocí)
- Last minute a early bird
- Promo kód
- Vernostná zľava pre opakovaných hostí

---

## 7. DOPLNKOVÉ SLUŽBY

Nie sú to položky s cenou, ale **malé objednávky s vlastným formulárom a vlastnou dostupnosťou**.

| Služba | Vlastné polia |
| :--- | :--- |
| Šéfkuchár / catering | ktorý večer, počet osôb, variant menu, alergie |
| Wellness (sauna, masáž) | dátum, časové okno, dĺžka, typ |
| Transfer | smer, dátum a čas, miesto vyzdvihnutia, počet osôb a batožiny |
| Skorší check-in / neskorší check-out | overenie proti kalendáru jednotky |

**Cena je konfigurovateľná pri každej službe** — fixne za rezerváciu / za osobu / za noc / za jednotku času.

**Klient potrebuje v administrácii editor polí** (opakovač s typom, názvom a možnosťami), inak nevie pridať novú službu bez vývojára.

**Kanál objednania:** priamo v rezervačnom procese.
⚠️ *Viď otvorený bod 13.1 — upsell pred príchodom.*

---

## 8. REZERVAČNÝ TOK A STAVY

Rezervácia je **potvrdená okamžite po platbe**. Pri prevode existuje druhá vetva.

```
        ┌── karta ────────► ZAPLATENÁ ──► POTVRDENÁ
NOVÁ ───┤
        └── prevod ──► ČAKÁ NA ÚHRADU (termín blokovaný 24 h)
                            ├── platba pripísaná ──► POTVRDENÁ
                            └── vypršanie ────────► ZRUŠENÁ, termín uvoľnený

POTVRDENÁ ──► (online check-in) ──► PREBIEHA ──► UKONČENÁ ──► RECENZIA
     │
     └── žiadosť o storno ──► rozhoduje majiteľ ──► SCHVÁLENÉ / ZAMIETNUTÉ
```

**24 hodín pri prevode je predvolená hodnota, musí byť nastaviteľná** — rezervácia v piatok večer sa pripíše až v pondelok.

**Párovanie prevodov** musí niekto robiť — ručne v administrácii alebo automaticky cez bankové API. Treba rozhodnúť.

---

## 9. PLATBY

- **Metódy:** platobná karta (Stripe / GoPay), bankový prevod s QR kódom
- **Rozsah platby konfigurovateľný podľa objektu:** celá suma / záloha / platba na mieste
- **Doplatok pri zálohovom režime** — potrebuje vlastný tok: automatické strhnutie z uloženej karty X dní pred príchodom, výzva na doplatok, alebo platba na mieste
- **Storno rozhoduje ručne majiteľ**, ale storno podmienky sa hosťovi **zobrazujú automaticky pri rezervácii** — inak to neobstojí voči VOP a spotrebiteľskému právu

---

## 10. KOMUNIKÁCIA

Vybrané do dema:
- Potvrdenie rezervácie hosťovi
- Notifikácia majiteľovi o novej rezervácii
- Pripomienka pred príchodom s check-in pokynmi
- Žiadosť o recenziu po odchode

Vyplývajúce z ostatných rozhodnutí, doplnené do jadra:
- Výzva na úhradu prevodom + pripomienka pred vypršaním
- Potvrdenie prijatia platby
- Výzva na doplatok pri zálohovom režime
- Potvrdenie / zamietnutie storna
- Potvrdenie objednanej doplnkovej služby
- Notifikácia upratovacej službe po check-oute
- Výzva na online check-in

**Kanál:** e-mail. SMS až neskôr.
⚠️ *Viď otvorený bod 13.2 — SMS je v masterdokumente súčasťou Balíka 3.*

---

## 11. ZÓNA HOSŤA A ZÓNA MAJITEĽA

### 11.1 Zóna hosťa
Obsah: prehľad nadchádzajúcich a minulých pobytov · faktúry a doklady · check-in pokyny a prístupové kódy · zmena alebo zrušenie rezervácie.

**Registrácia je dobrovoľná** → z toho vyplýva:
- Faktúry, doklady a check-in pokyny musia byť dostupné **aj cez jednorazový odkaz viazaný na rezerváciu**, bez účtu. Väčšina hostí si účet nevytvorí.
- Rovnaký mechanizmus jednorazového odkazu slúži pre overené recenzie aj pre online check-in.
- Účet je nadstavba pre opakovaných hostí, kde vidia celú históriu.

**Pokyny k príchodu e-mailom** (Martin 14. 10.): každý hosť so zaplateným pobytom dostane pokyny e-mailom 2 dni pred príchodom,
aj bez účtu. V účte sú tiež. Jednorazový odkaz príde neskôr.

**Materiály pre hosťa** (Martin 13. 10.) v časti *Na stiahnutie*, dve úrovne:
- **pri objekte** — spoločné pre všetkých hostí objektu (ubytovací poriadok bez kódov, brožúrka); vidí ich hosť s rezerváciou v objekte,
- **pri rezervácii** — súbory a správa pre konkrétny pobyt; vyplní ich majiteľ v administrácii pri rezervácii.
Súbory z knižnice médií majú verejnú adresu → len necitlivé materiály. Kódy ostávajú v zamknutých *Pokynoch k príchodu*,
citlivé dokumenty (faktúry s osobnými údajmi) by potrebovali chránené sťahovanie (vlastný kód, neskôr).

**Zrušenie hosťom je len žiadosť**, nie priama akcia — rozhoduje majiteľ. Za tlačidlom je schvaľovací tok.

### 11.2 Zóna majiteľa
Umiestnenie: **WP administrácia** (nie vlastný frontend dashboard).

Štatistiky: obsadenosť v čase · tržby a priemerná hodnota rezervácie · zdroj rezervácie (priama vs. OTA) · porovnanie s minulým obdobím.

---

## 12. LEGISLATÍVA A PRÁVO

**12.1 Kniha ubytovaných — hybridný zber.**
Pri rezervácii len objednávateľ a počty osôb podľa vekových pásiem. Kompletné údaje hostí (mená, dátumy narodenia, doklady) až cez **online check-in** pár dní pred príchodom. Dôvod: pýtať údaje 14 spolucestujúcich pri platbe zabíja konverziu a objednávateľ ich aj tak nevie.

**12.2 Daň za ubytovanie** — pripočítava sa k cene rezervácie. Sadzba podľa obce, na osobu a noc. Musí podporovať **oslobodenia naviazané na vekové pásma** (deti do určitého veku, ZŤP).

**12.3 Fakturácia** — systém generuje faktúry sám. Potrebuje: číselné rady, náležitosti daňového dokladu, dobropisy pri stornách, PDF šablónu s brandom klienta.
**DPH:** dátový model musí DPH podporovať od začiatku (pole IČ DPH, prepínač režimu, **sadzba na každom riadku faktúry** — ubytovanie a služby ako šéfkuchár či transfer nespadajú do rovnakej sadzby). V deme sa ukáže neplatca. Konkrétne sadzby potvrdiť s účtovníkom.

**12.4 Právne dokumenty** — statické stránky, texty vkladá klient. Komerčne to nebráni tomu, aby ich ako platenú službu dodávala právna firma pilotnej partnerky.

**12.5 Súhlasy pri rezervácii** — VOP a storno podmienky, súhlas so spracovaním údajov. Ukladá sa znenie aj dátum.
Rozhodnuté 14. 10.: v pokladni natívne políčko WooCommerce pre obchodné podmienky (text na rozkliknutie) a **nepovinný, nepredvyplnený marketingový súhlas**.
⚠️ *Viď otvorený bod 13.3 — marketingový súhlas.*

---

## 13. OTVORENÉ BODY A RIZIKÁ

**13.1 Upsell pred príchodom chýba.**
Vybraný bol len kanál „priamo v rezervačnom procese". Masterdokument aj copywriting blueprint však sľubujú automatizovaný upsell **pred príchodom hosťa** — je to Pilier 3 hodnotovej ponuky a jeden zo štyroch Premium+ modulov. Ak vypadne, treba upraviť predajnú argumentáciu. *Odporúčanie: nechať oba kanály v deme, v Balíku 1 vypnúť.*

**13.2 SMS brána vs. Balík 3.**
Masterdokument uvádza SMS bránu ako súčasť Balíka 3. Ak ju demo neukáže, buď sa upraví popis balíka, alebo sa SMS doplní neskôr.

**13.3 Marketingový súhlas — blokuje Pilier 2.** ✅ *Rozhodnuté 14. 10.: nepovinné políčko v pokladni (12.5).*
Nebol vybraný. Bez samostatného, nepredvyplneného súhlasu **nie je možné legálne posielať hosťom newslettre** — a celý pilier „vlastníctvo dát a e-mail marketing" stojí práve na tom. *Odporúčanie: nepovinné zaškrtávacie políčko navyše. Rezerváciu neblokuje, no kto ho odklikne, je legálne v databáze.*

**13.4 Nerozhodnuté:**
- Režim DPH u prvých klientov (platca / neplatca)
- Párovanie bankových prevodov — ručne alebo cez API
- Recenzie: jedno hodnotenie alebo viac kritérií (čistota, poloha, vybavenie), moderácia
- Záverečné upratovanie a vratná kaucia — nevybrané, ale pri luxusných chaletoch bežné
- Priradenie funkcií do balíkov 1 / 2 / 3 — nasleduje ako ďalší krok

---

## 14. DEMO OBJEKTY

Šesť objektov, tri rezervovateľné ako celok a tri po jednotkách. Pokrývajú konfiguračnú maticu:

| # | Objekt | Režim | Cena | Ukazuje navyše |
| :--- | :--- | :--- | :--- | :--- |
| 1 | Chalet | celok | fixná za noc | šéfkuchár, platba kartou celá suma |
| 2 | Horská chata | celok | za osobu a noc | vekové pásma, wellness |
| 3 | Vila | celok | za osobu a noc | záloha + doplatok, transfer |
| 4 | Apartmánový dom | 4 jednotky | fixná za jednotku | výber jednotky, prevod s QR |
| 5 | Penzión | 6 izieb | za osobu a noc | poplatok za zviera, promo kód |
| 6 | Glamping / drevenice | 3 jednotky | za osobu a noc | prudká sezónnosť, last minute |

Plus **blog a obsahová časť pre SEO**.

---

## 15. ĎALŠÍ KROK

1. Uzavrieť otvorené body z kapitoly 13
2. **Priradiť každú funkciu do balíka 1 / 2 / 3 / Premium+** — z celého tohto zoznamu naraz
3. Návrh dizajnu na základe uzavretej architektúry
4. Implementácia vo WordPress
