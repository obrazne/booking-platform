# ROADMAP — Booking platform

*Kde sme a čo ostáva. Čo staviame → `ARCHITEKTURA.md`. Prečo → `ROZHODNUTIA.md`.*

**Legenda:** 🧠 = rozhoduje Martin s Claude (návrh, chat) · 🔧 = robí Claude Code (kód, súbory, Git)
☐ otvorené · ☑ hotové

## Aktuálne
- **Kde sme (17. 10.):** fronta Z1–Z30 hotová na stagingu — MVP pre Chalet STRÖMY + showroom, stránka hosťa podľa vizuálu v2/v2.1
  (galéria, mapa, košík v2, potvrdenie rezervácie), zóna hosťa, sekcie v administrácii, captcha, **ukážkové dáta** (`npm run demo-data`)
  a **prehliadka „Čo je nové“** pre majiteľa aj správcu, **administrácia a prihlásenia podľa vizuálu v1–v1.2** (menu so skupinami, Štatistiky, zvonček s upozorneniami, drobčeky),
  **riadiace centrum v1.2** (detail klienta so záložkami, katalóg modulov, audit s filtrami) a košík v2.2 pre notebook. Chýba: doklady (čaká na Janin fakturačný nástroj), produkčné prostredie,
  nasadenie u Jany (3e — zatiaľ odložené, teraz len naša aplikácia), Stripe (Fáza 4).
- **Ďalší krok pre Claude Code:** dve linky — **A:** Z43 (účet hosťa) — *zabratá linkou A*, potom Z47 (Správy pre hosťa, po Z45); **B:** Z44 ✅ → **Z45** (Správy: základ) → **Z46** (Správy: administrácia).
- **Claude chat:** modul Správy s hosťom nakreslený a schválený (hosť v2.5, administrácia v1.3) → Z45–Z47; ďalej pripomienky zo stagingu, obchodný model.
- **Ďalší krok pre Martina:** v riadiacom centre → Upozornenia (a pri STRÖMY po zapnutí modulu push v Nastaveniach) zapnúť push
  na mobile — na iPhone najprv „Pridať na plochu“ (Z33).
  Ďalej preklikať novú administráciu na stagingu (prehliadka „Čo je nové“ sa po prihlásení otvorí znova) a spísať pripomienky;
  odpovedať na otázky nižšie (mapa, prístup pre Janu, otázky pre Janu).
- **Claude chat:** návrh administrácie v1.2 hotový a uložený (pripomienky 16–24); ďalej Martinove pripomienky zo stagingu (od č. 25), obchodný model, príprava ukážky pre Janu.

## Zadanie pre Claude Code
*Sem píše Claude chat konkrétne pokyny. Môže tu byť **fronta viacerých úloh (Z1, Z2, …)** — `/dalej` vezme prvú neoznačenú,
po dokončení ju označí ✅ (text nechá) a ďalšiu začne až pri ďalšom `/dalej`. Keď sú všetky ✅, sekciu vyprázdni.*

> ⛔ **STOP pre ukážkové dáta STRÖMY (Martin 17. 10. 19:30):** na STRÖMY je pripojený **skutočný kalendár Jany z Bookingu**
> („Ostrý kalendár chaletu na Bookingu“). **`npm run demo-data` (ani `--reset`) pre tenanta STRÖMY nespúšťaj** a nevytváraj tam
> ukážkové iCal kanály ani rezervácie — Martin ich mazal a skript ich vrátil. Ukážkové dáta nových modulov (Z35–Z39) daj zatiaľ
> **len Ukážkovému klientovi**. Kanál „Ostrý kalendár…“ nemaž ani nemeň. Riešenie → Z41.

**Dve linky naraz (Martin 17. 10. — zrýchlenie).** Úlohy majú v nadpise linku **[A]** alebo **[B]**. Každá linka beží v **samostatnom
termináli a vlastnom priečinku** (git worktree): `/dalej A` berie len úlohy [A], `/dalej B` len [B]. Bez písmena = A.
Pravidlá spolupráce (platia pre obe):
- **Zabratie:** pred začatím úlohy pridaj do nadpisu `🔄` (napr. `### Z37 [B] 🔄 — …`), commit + push hneď; po dokončení `🔄` → `✅`.
- **Často sťahuj a posielaj:** `git pull --rebase` pred každým commitom; konflikty v `ROADMAP.md` (Denník), `sk.json` a `CLAUDE.md` vyrieš
  tak, že **ponecháš obe strany** (sú to len pridané riadky). Pri inom konflikte zastav a povedz Martinovi.
- **Spoločné súbory meň čo najmenej:** nové časti ako samostatné komponenty (napr. `stay-upsell.tsx`, `stay-review.tsx`, `stay-checkin.tsx`)
  a do spoločnej stránky len jeden riadok s ich vložením.
- **Migrácie:** názov s aktuálnym časom tesne pred vytvorením (po `git pull`); ak `db push` hlási poradie, použi `npx supabase db push --include-all`.
- **Testy proti stagingu:** každá linka púšťa len testy svojej úlohy; testovacie e-maily s označením linky (`…+a@booking-platform.test` /
  `…+b@…`) a upratuje len svoje. **Celú sadu e2e a snímky prehliadky „Čo je nové“ spúšťa linka A až na konci fronty.**
- **Hosť pre zónu hosťa (Martin 17. 10.):** schránka `demo-host@obrazne.sk` **neexistuje** — Martin používa `info+host@obrazne.sk`
  (na STRÖMY už priradený k pobytom 2026-0648 a 2026-0688). V ukážkových dátach a v CLAUDE.md nahraď `demo-host@obrazne.sk` touto adresou.
- Nečakaj na CI medzi úlohami — výsledok CI skontroluj na konci a oprav, ak niečo spadlo.

*Hotové Z1–Z30 (analýza, kostra platformy, MVP Chalet STRÖMY, stránka hosťa a košík podľa vizuálu v2–v2.2, potvrdenie rezervácie,
zóna hosťa, sekcie, captcha, ukážkové dáta, prehliadka „Čo je nové“, administrácia v1–v1.2 so štatistikami a upozorneniami,
riadiace centrum v1.2) — detail v Denníku a histórii Gitu.*

### Z31 ✅ — História zmien a kôš (vrátenie chyby jedného klienta, 17. 10.)
Podľa `ARCHITEKTURA.md` A9 → „Vrátenie chyby jedného klienta“ (vrstvy 1 a 2; vrstva 3 je úloha prípravy produkcie). Úpravy DB len pridávajú.
1. **História zmien:** tabuľka napr. `record_history` (tenant_id, table_name, record_id, op insert/update/delete, old/new jsonb, changed_by,
   changed_at) plnená **triggerom** na všetkých tabuľkách s `tenant_id` (okrem samotnej histórie, upozornení a technických tabuliek —
   zoznam zapíš do Denníka). Zmeny bez prihláseného používateľa (cron, iCal, hosť) označ zdrojom. RLS: číta len správca platformy
   (majiteľ zatiaľ nie); pgTAP. Výkon: index (tenant_id, table_name, record_id, changed_at).
2. **Kôš pre majiteľa:** zmazanie služby, sezóny s cenami, poplatku, zľavy, fotky, sekcie, dokumentu, blokácie, iCal kalendára,
   miesta v okolí sa dá **30 dní obnoviť** — „Nedávno zmazané“ (napr. v Nastavenia → Všeobecné alebo pri danom zozname), obnova
   z `record_history` vrátane závislých riadkov (sezóna → rozsahy a ceny). Súbory (fotky, dokumenty) v úložisku mazať až po 30 dňoch.
   Pri obnove kontrola kolízií (napr. blokácia cez medzitým vzniknutú rezerváciu → nepovoliť, vysvetliť).
3. **Riadiace centrum → detail klienta → Záznam zmien:** história dát klienta s filtrom (obdobie, typ záznamu, osoba), pri zmene
   „pred → po“ čitateľne (preklady názvov polí, nie surové kľúče) a **„Vrátiť túto zmenu“** s potvrdením; vrátenie sa samo zapíše
   do histórie aj auditu. Ak sa záznam medzitým znova zmenil, upozorni a ukáž aktuálny stav.
4. **Uchovávanie:** história 180 dní (pg_cron), pri anonymizácii hosťa vyčistiť aj jeho riadky v histórii. Zapíš do Denníka.
5. Testy: pgTAP (RLS, trigger zapisuje insert/update/delete, iný klient nevidí), Playwright (zmazať službu → obnoviť z koša;
   zmeniť cenu → vrátiť v riadiacom centre).

**Kontext pre Z33–Z36 (moduly po MVP, 17. 10.):** `ARCHITEKTURA.md` → **B11**. Claude Code stavia základ, Claude chat medzitým kreslí
obrazovky upsellu, recenzií a check-inu — **obrazovky pre hostí v Z34–Z36 nerob** (prídu ako ďalšie úlohy podľa plátna). Moduly sú v katalógu
„v príprave“: prepni na hotový až keď bude aj rozhranie (Z33 áno, Z34–Z36 nie). Každý modul podľa návodu v CLAUDE.md (manifest,
`public.modules`, `isModuleEnabled`, preklady). Stále len staging.

### Z33 ✅ — Modul Push notifikácie (celý)
1. **PWA:** manifest administrácie (názov platformy, ikony, `display: standalone`, štart `/admin`), service worker len pre push
   (bez cachovania stránok). Riadiace centrum rovnako.
2. **Zariadenia:** tabuľka napr. `push_subscriptions` (user_id, tenant_id alebo null pre platformu, endpoint, kľúče, popis zariadenia,
   created_at, last_success_at, failures) — RLS: každý len svoje; pgTAP. VAPID kľúče v premenných prostredia (do repozitára len názvy).
3. **Odosielanie:** pri vzniku upozornenia (Z27, `notify()`) poslať push členom tímu, ktorí majú zariadenie a daný druh zapnutý —
   spôsob vyber sám (napr. Edge Function cez databázový webhook alebo pg_net → chránený endpoint), zdôvodni v Denníku.
   Odpoveď 404/410 → zariadenie zmazať; text a odkaz rovnaké ako v zvončeku (klik otvorí cieľ). Bez osobných údajov hosťa v texte
   notifikácie nad rámec mena a termínu.
4. **Rozhranie:** Nastavenia → E-maily a upozornenia → sekcia „Upozornenia na tomto zariadení“: zapnúť/vypnúť, zoznam mojich zariadení
   (odobrať), výber druhov (predvolene nová rezervácia, kolízia, zlyhaná synchronizácia, žiadosť o storno), „Poslať skúšobné upozornenie“.
   **iPhone/iPad v Safari mimo plochy** → namiesto tlačidla návod „Pridať na plochu“ (3 kroky, ikonky zatiaľ textom). Vzory v1.1/v1.2.
   Modul `push` per klient (vypnutý = sekcia skrytá s vetou o module); správca platformy má push pre platformové upozornenia vždy.
5. Testy: unit (výber príjemcov podľa druhov a modulu), pgTAP, Playwright (zapnutie s povolením notifikácií v prehliadači, uloženie
   zariadenia, skúšobné upozornenie volá odosielanie — skutočné doručenie netestovať), axe. Modul v katalógu → hotový.

### Z34 ✅ — Modul Recenzie: základ (bez obrazoviek pre hostí)
Podľa B11. 1. Tabuľka napr. `reviews` (tenant_id, property_id, reservation_id unique, guest_id, hodnotenia, text, zobrazené meno, mesiac
pobytu, jazyk, stav submitted/published/rejected, dôvod zamietnutia, odpoveď majiteľa + čas, featured, published_at) — RLS: hosť len
svoju (vytvoriť len ak je oprávnený — kontrola v DB), majiteľ svojho klienta, verejne len zverejnené (cez funkciu/pohľad bez osobných údajov).
2. Oprávnenosť a okno 30 dní v DB funkcii; **automatické zverejnenie po 72 h** (pg_cron); priemer a počty pre objekt/klienta (funkcia).
3. E-maily cez existujúcu frontu: pozvánka deň po odchode, pripomienka po 7 dňoch (ak nehodnotil), hosťovi pri zamietnutí (s dôvodom),
   šablóny prekladateľné v téme klienta; odkaz vedie do účtu hosťa (stránku hodnotenia doplní ďalšia úloha — zatiaľ 404-bezpečný odkaz).
4. Upozornenia (Z27): nová recenzia, recenzia sa zverejní o 24 h. Udalosti modulu.
5. **Administrácia (vzor v1.1 — zoznam + panel):** Ponuka › Recenzie — zoznam (stav, hodnotenie, objekt, dátum), panel s textom,
   Zverejniť teraz / Zamietnuť (dôvod zo zoznamu) / Odpovedať / Navrch. Ručné referencie ostávajú v Ponuka › Referencie s popisom
   „z iných zdrojov“. Na stránke hosťa zatiaľ nič nemeň.
6. Ukážkové dáta: 6–8 recenzií STRÖMY v rôznych stavoch (`npm run demo-data`). Testy pgTAP (oprávnenosť, RLS, auto-zverejnenie), unit, Playwright admin.

### Z35 ✅ — Modul Upsell: základ (bez obrazoviek pre hostí)
Podľa B11. **Zmrazené riadky rezervácie (`reservation_lines`) sa nemenia.**
1. Nastavenia služby (modul `services` rozšíriť): ponúkať po rezervácii, uzávierka (hodiny pred dňom služby / príchodom), vyžaduje potvrdenie,
   povoliť na účet pobytu. Nastavenie klienta: limit účtu pobytu (predvolene 300 €).
2. Tabuľka dodatočných objednávok (napr. `reservation_orders`): rezervácia, služba, počet, dátum služby (voliteľne), zmrazená cena
   (centy, mena, DPH, rozpis podľa cenového modelu), spôsob platby (na účet pobytu / prevod / karta neskôr), stav
   (ordered/awaiting_confirmation/confirmed/declined/cancelled), dôvod, kto a kedy. RLS: hosť len k svojej rezervácii
   (aj cez prístupový odkaz — serverová funkcia s overením tokenu), majiteľ svojho klienta; pgTAP.
3. DB funkcie: `place_order` (kontrola okna rezervácie, uzávierky, aktívnej služby, limitu účtu pobytu, cena z rovnakého výpočtu ako košík),
   zrušenie hosťom do uzávierky, potvrdenie/zamietnutie majiteľom, **účet pobytu** (súčet objednávok, zaplatené/otvorené) a „Vyúčtovať“
   (záznam v `payments`, spôsob na mieste/prevod). Udalosti + upozornenia (nová objednávka, čaká na potvrdenie) + e-maily hosťovi (prijatá, potvrdená/zamietnutá).
4. **Administrácia:** v paneli rezervácie sekcia „Účet pobytu“ (objednávky, stav, Potvrdiť/Zamietnuť, Vyúčtovať); v nastavení služby nové polia.
   Vzory v1.1. Obrazovky pre hostí a e-maily s ponukami pred príchodom prídu podľa plátna.
5. Ukážkové dáta (2–3 objednávky v rôznych stavoch), testy unit (výpočet, uzávierka, limit), pgTAP, Playwright admin.


### Z36 ✅ — Modul Online check-in: základ (bez obrazoviek pre hostí)
Podľa B11 → Online check-in (slovenský balík pravidiel). Polia a lehoty sú zo zákona — **v kóde ako pravidlá krajiny, nie natvrdo
v komponentoch**; pred ostrým nasadením ich overíme.
1. Tabuľky napr. `checkins` (rezervácia, stav not_started/in_progress/completed, čas príchodu, súhlas s ubytovacím poriadkom, kto a kedy)
   a `checkin_guests` (meno, priezvisko, typ a číslo dokladu, adresa trvalého pobytu, dátum narodenia, štátna príslušnosť, je občan SR) —
   RLS: hosť len k svojej rezervácii (aj cez prístupový odkaz cez serverovú funkciu s overením tokenu), **čítať doklady a dátumy narodenia
   môže len rola majiteľ** (nie ostatní členovia tímu), každé zobrazenie citlivých polí → audit; pgTAP.
2. Pravidlá krajiny SK (modul pravidiel A6): ktoré polia sú povinné pre občana SR / cudzinca, validácie (dátum, doklad), lehota hlásenia
   cudzinca 5 dní, uchovávanie (tlačivo 2 roky — nastaviteľné), automatické mazanie citlivých polí po lehote (pg_cron).
3. **Daň za ubytovanie:** nastavenia klienta (obec, sadzba za osobu a noc v centoch, oslobodenia podľa veku), výpočet pre pobyt podľa
   check-inu (inak podľa počtu osôb z rezervácie), mesačný prehľad pre obec (CSV).
4. **Hlásenie cudzinca:** vyplnené tlačivo PDF na podpis pri príchode (vzor podľa platného tlačiva MV SR — ak nie je dostupné v repozitári,
   sprav vlastné prehľadné PDF s rovnakými údajmi a zapíš do Otázok), prehľad „čaká na nahlásenie“ s termínom 5 dní.
5. Nastavenia objektu: odomknúť pokyny k príchodu a kódy **až po dokončení check-inu** (áno/nie), koľko dní pred príchodom sa check-in otvorí,
   pripomienky e-mailom (napr. 7 a 2 dni pred príchodom, len ak nedokončený).
6. **Administrácia (vzory v1.1):** v paneli rezervácie sekcia „Check-in“ (stav, osoby — doklady maskované, odkryť klikom so zápisom do auditu,
   PDF tlačiva); Rezervácie › **Príchody** (nasledujúce príchody so stavom check-inu a hlásení) — ak sa to nehodí ako podpoložka, zapíš prečo.
   Upozornenia: check-in dokončený, cudzinec nenahlásený 4. deň.
7. Ukážkové dáta: check-in u 2 ukážkových pobytov (jeden cudzinec). Testy pgTAP (RLS, maskovanie, mazanie po lehote), unit (pravidlá, daň), Playwright admin.


**Kontext pre Z37–Z39 (obrazovky pre hostí, schválené 17. 10.):** `docs/vizual-stranka-hosta.md` → **Moduly v účte hosťa a na stránke (v2.3)**,
dosky `docs/navrhy/stranka-hosta/UcetPobyt`, `MobilPobyt`, `Checkin`, `Recenzie` (klikacie). Zámer, nie pixelová predloha; téma klienta,
preklady, PC aj mobil 390 px, axe. Každá úloha nadväzuje na svoj základ (Z34–Z36) — ak základ chýba, sprav najprv ho.

### Z41 ✅ [A] — Ukážkové dáta preč zo STRÖMY, skutočný kalendár Jany (17. 10.) — **prednostne**
STRÖMY na stagingu odteraz slúži na skúšku so **skutočným kalendárom z Bookingu**; ukážkové dáta ho miešali (ukážkový „Booking.com
(ukážka)“ 21.–24. 12. vyzeral ako skutočná obsadenosť, kolízie, zmazané veci sa po `demo-data` vrátili).
1. `scripts/demo-data.mjs`: cieľový klient je parameter; **predvolene Ukážkový klient**, STRÖMY len s výslovným `--tenant stromy --force`
   a **nikdy, ak má aktívny skutočný iCal kanál** (URL mimo `example.invalid`) — skript vtedy skončí s vysvetlením. Ukážkové iCal kanály
   len na ukážkovom klientovi. Ukážkovému klientovi prenes všetko, čo doteraz dostával STRÖMY (história ~18 mesiacov, recenzie, objednávky,
   check-iny, dokumenty, blokácia), s jeho objektmi a cenami (doplň fotky/ceny ako pri STRÖMY, ak chýbajú).
2. **Upratanie STRÖMY na stagingu** (testovacie dáta — smieš): zmaž ukážkové iCal kanály a ich udalosti, rezervácie s poznámkou „DEMO — …“
   a testovacie rezervácie (2026-0001/0002/0003/0040/0619, `@booking-platform.test`, `stromy-demo.invalid`) vrátane naviazaných dát cez existujúce
   funkcie/kaskády; nechaj objekt, ceny, sezóny, fotky, služby, sekcie, dokumenty objektu, tím a **kanál „Ostrý kalendár…“**. Pred mazaním
   vypíš do Denníka počty, po mazaní over, že ostala len skutočná obsadenosť z Bookingu. Hosť demo-host@obrazne.sk (zóna hosťa) presunúť
   na ukážkového klienta.
3. Testy prehliadačom (e2e) nesmú vytvárať dáta v STRÖMY — prepni ich na ukážkového klienta (alebo vlastného testovacieho klienta);
   zapíš do CLAUDE.md. Snímky prehliadky „Čo je nové“ z ukážkového klienta.
4. **Kalendár v administrácii:** udalosť z iCalu so štítkom „CLOSED - Not available“ zobraz ako **„Zavreté na Bookingu“** (nie ako rezerváciu) —
   Booking v exporte nerozlišuje rezerváciu od ručne zavretého termínu a neposiela termíny prevzaté z iných kalendárov (napr. Airbnb);
   v paneli udalosti veta, že podrobnosti sú v extranete Bookingu.
5. Do Denníka: čo ostalo na STRÖMY, aké udalosti prišli z ostrého kalendára.

### Z40 ✅ [A] — Mapa: OpenFreeMap + „Navigovať v Google Mapách“ (Martin 17. 10.) — **malá, môže ísť hneď po Z31**
Dnes ide mapa (statický náhľad `osm-map.tsx` aj interaktívna `interactive-map.tsx`, Leaflet) priamo z dlaždíc `tile.openstreetmap.org` —
pri komerčnej prevádzke to pravidlá OSM nedovoľujú. Martin chcel Google Maps; rozhodnuté inak (ROZHODNUTIA 17. 10.).
1. **Podklady z OpenFreeMap** (openfreemap.org — zadarmo aj komerčne, bez registrácie, kľúča, cookies a limitu; vektorové dlaždice,
   klient MapLibre GL). Štýl tlmený (Positron alebo Liberty upravený na tlmené farby), značka objektu a miesta v okolí v akcente témy
   ako doteraz. Atribúcia „© OpenMapTiles · Data from OpenStreetMap“ (MapLibre ju pridá sám). URL štýlu v jednom nastavení (ak by
   OpenFreeMap vypadol alebo ho budeme hostovať sami, mení sa na jednom mieste). Leaflet odstrániť, ak sa už nepoužíva.
2. **Výkon:** MapLibre načítať až keď je mapa blízko obrazovky (alebo po kliknutí na náhľad) — `node scripts/perf-check.mjs` na mobile
   sa nesmie zhoršiť; zapíš pred/po do Denníka. Statický náhľad (malá mapa hore pri cene): vyber riešenie bez načítania knižnice
   pri prvom zobrazení (napr. MapLibre až pri viditeľnosti, alebo vopred vyrenderovaný obrázok pri uložení polohy) a zdôvodni v Denníku.
3. **Tlačidlo „Navigovať v Google Mapách ↗“** pri mape (sekcia Okolie aj potvrdenie rezervácie / pokyny k príchodu): obyčajný odkaz
   `https://www.google.com/maps/dir/?api=1&destination=<lat>,<lng>` — bez kľúča a bez načítania Google na stránke. Pri približnej
   polohe (skrytá presná adresa) odkaz len v potvrdení a pokynoch, nie na verejnej stránke.
4. Playwright: mapa sa načíta (canvas MapLibre), odkaz na navigáciu má správne súradnice; axe.

### Z45 [B] — Modul Správy: základ (databáza, automatické správy, e-maily, upozornenia) (Martin 17. 10.)
Podľa `ARCHITEKTURA.md` → B11 **Správy s hosťom** a `ROZHODNUTIA.md` 17. 10. Rozhranie robia Z46 (administrácia) a Z47 (hosť).
1. Modul `messages` (manifest, katalóg „Správy s hosťom“, `ready: false` kým nie sú hotové Z46 a Z47), migrácia: správy pri rezervácii,
   pravidlá automatických správ (po jazykoch), vynechania/úpravy naplánovanej správy pri rezervácii, rýchle odpovede; RLS + pgTAP
   (oddelenie klientov, hosť vidí len svoje rezervácie — aj cez `p_token` prístupového odkazu), `record_history`.
2. DB funkcie: odoslanie správy hosťom a tímom (limit, dĺžka, okno do 30 dní po odchode), označenie prečítania, počet čakajúcich,
   zoznam konverzácií pre schránku (filtre podľa stavu pobytu), naplánované správy pre rezerváciu.
3. `messages_tick` cez pg_cron: pravidlá podľa kotvy, posunu a času v pásme klienta, raz na rezerváciu, nie zrušené, uplynutý čas
   sa nedobieha; predvolené pravidlá a rýchle odpovede pri zapnutí modulu (texty v prekladoch).
4. E-maily: hosťovi (tlačidlo „Odpovedať“ s prihlásením k pobytu, Reply-To kontakt klienta, zlúčenie do 15 min), majiteľovi (zlúčenie,
   nie ak už prečítané); **bez dvojitých e-mailov** — privítanie v potvrdzovacom e-maile, správa v deň pokynov/ponuky upsell ako blok
   v tom e-maile, Poďakovanie s `{odkaz na hodnotenie}` nahrádza pozvánku `reviews_tick`.
5. Upozornenie `message.new` (kontrola `kind`, push `kinds`, texty `notifications.kinds.*`), udalosť pre slot.
6. Ukážkové dáta (len Ukážkový klient): konverzácie k niekoľkým rezerváciám vrátane automatických a jednej čakajúcej.
7. Testy: pgTAP + jednotkové (výpočet času pravidla, zlúčenie e-mailov).

### Z46 [B] — Modul Správy: administrácia (schránka, karta v paneli rezervácie, automatické správy) — po Z45
Podľa `docs/vizual-administracia.md` → **v1.3 Správy**, dosky `Spravy`, `SpravyAuto`, `Sidebar`.
1. Menu: skupina Správy s odznakom (Schránka, Automatické správy), len so zapnutým modulom.
2. Schránka `/admin/messages` (filtre, riadky, hľadanie) → klik otvorí **panel rezervácie na karte Správy** (`?panel=reservation:id&tab=messages`).
3. Karta **Správy** v paneli rezervácie cez slot `booking.detail.tabs`: konverzácia, štítky automatických, naplánovaná správa
   (Upraviť pre tohto hosťa / Neposielať / Vrátiť), pole, Rýchle odpovede, prečítanie pri otvorení.
4. Automatické správy: časová os, vypínače, úprava v bočnom paneli (kedy, text s premennými, náhľad, upozornenie na kolíziu s e-mailom
   pokynov/ponuky, Poslať skúšobne mne); rýchle odpovede (pridať, upraviť, poradie).
5. Mobil: schránka zoznam → rezervácia cez celú obrazovku na karte Správy.
6. Playwright (Ukážkový klient): odpoveď hosťovi, rýchla odpoveď, vynechanie naplánovanej správy, úprava pravidla; axe.

### Z47 [A] — Modul Správy: hosť (konverzácia v detaile pobytu, mobil, e-mail) — po Z43 a Z45
Podľa `docs/vizual-stranka-hosta.md` → **Správy s hosťom (v2.5)**, dosky `SpravyPobyt`, `MobilSpravy`, `EmailSprava`.
Ak Z45 ešte nie je ✅, počkaj (pull každých pár minút) — linka A nemá nič iné.
1. Sekcia Správy v detaile pobytu cez slot `guest.stay.top` (pod stavom), v účte aj cez prístupový odkaz; rýchle témy z nastavenia klienta.
2. Neprečítané: odznak na karte Pobyty v lište účtu (Z43), pilulka v hlavičke pobytu, bod na karte najbližšieho pobytu, karta Kontakt na majiteľa.
3. Mobil: konverzácia cez celú obrazovku (`/ucet/pobyt/<id>/spravy`), písmo poľa 16 px.
4. Šablóny e-mailov podľa `EmailSprava` (hosťovi aj majiteľovi), tlačidlo „Odpovedať“ otvorí pobyt prihláseného hosťa na sekcii Správy.
5. Po 30 dňoch od odchodu len čítanie s vetou o kontakte. Správy v exporte „Moje dáta“ (Z43).
6. Playwright (Ukážkový klient, PC + mobil): hosť napíše, majiteľ vidí v schránke; odkaz z e-mailu; axe.

### Z43 [A] — Účet hosťa: lišta s kartami, prehľad a Moje údaje (pripomienka 30, 17. 10.)
Podľa `docs/vizual-stranka-hosta.md` → **Účet hosťa — navigácia a stavy pobytu (v2.4)**, dosky `UcetPrehlad`, `MobilUcet` (+ hlavička v `UcetPobyt`).
1. Spoločný komponent **lišty účtu** (karty Pobyty s odznakom / Moje údaje, Odhlásiť sa; mobil pilulky) na prehľade, v detaile pobytu aj na
   check-ine; **drobčeky** v detaile pobytu a check-ine (mobil „‹ Pobyty“); odstrániť „Späť na moje pobyty“.
2. **Pobyty:** najbližší pobyt ako veľká klikateľná karta s bodmi „čo treba urobiť“ (z modulov cez sloty — check-in, platba, pokyny, objednávky);
   ďalšie budúce menšie; minulé ako riadky so štítkom „Ohodnoťte pobyt“; „Rezervovať ďalší pobyt“; karta kontaktu na majiteľa.
3. **Moje údaje** (`/ucet/udaje`): kontakt, prihlásenie, novinky, **Moje dáta** — stiahnutie vlastných údajov (JSON v ZIPe: profil, pobyty, súhlasy;
   citlivé údaje z check-inu maskované) a **žiadosť o zrušenie účtu** (vznikne úloha/upozornenie pre majiteľa; zákonom uchovávané údaje ostávajú).
   Právne formulácie pri zrušení účtu zapíš do Otázok pre Martina na kontrolu.
4. Playwright (Ukážkový klient, PC + mobil): prechod prehľad → pobyt → späť drobčekmi, karta Moje údaje, stiahnutie údajov; axe.

### Z44 [B] ✅ — Detail pobytu: stavy, rozpis v účte pobytu, žiadosť o zrušenie (pripomienka 30, 17. 10.)
Podľa toho istého návrhu, doska `StavyPobytu` (prepínač stavov hore). Lišta účtu a drobčeky robí Z43 — nezasahuj do nich (len vlož komponent, ak už existuje).
> **Pre linku A (Z43, linka B 17. 10.):** detail pobytu je rozdelený — `ucet/pobyt/[id]/page.tsx` je tenký (sem patrí lišta účtu),
> obsah a stavy sú v `stay-detail.tsx` (`StayDetail`, mení linka B); drobčeky odovzdaj cez prop `crumbs` (nahradí „Späť na moje pobyty“).
1. **Čaká na platbu:** navrchu karta s QR (PAY by square), sumou, IBAN, VS, lehotou a vetou o automatickom zrušení; doobjednávanie skryté s vetou „po zaplatení“.
2. **Počas pobytu:** odomknuté pokyny ako dlaždice (kód od dverí, Wi-Fi, príchod, odchod — z údajov objektu, nič natvrdo), text pokynov, „Navigovať v Google Mapách“,
   „Niečo nefunguje? Napíšte …“ (WhatsApp/telefón majiteľa); upsell „Na zajtra si môžete objednať“.
3. **Zrušený:** dátum zrušenia, vrátená suma podľa storno pravidiel, „Vybrať nový termín“; moduly skryté.
4. **Rozpis ceny** presunúť do zelenej karty „Účet pobytu“ ako rozbaľovací odkaz; samostatnú sekciu na konci odstrániť.
5. **Žiadosť o zrušenie:** blok „Zmena alebo zrušenie“ + odkaz → okno s výpočtom podľa storno podmienok (existujúca logika storna), dôvod, odoslanie
   = existujúca žiadosť o storno (upozornenie majiteľovi). Len pred príchodom.
6. **Oprava textu pri pokynoch:** konkrétny dátum odomknutia podľa stavu (zaplatené, check-in, `arrival_email_days_before`), nie „keď bude pobyt zaplatený“ pri zaplatenom pobyte.
7. Playwright na Ukážkovom klientovi pre každý stav + žiadosť o zrušenie; axe.

### Z42 [B] ✅ — Kolízia termínov: kam vedie „Pozrieť“ (pripomienka 29, Martin 17. 10.)
Dnes klik na kolíziu (riadok synchronizácie na Prehľade/Kalendári „… kolízia · Pozrieť“, upozornenie v zvončeku) vedie na stránku
Prepojenia (zoznam kalendárov) — tam nič o kolízii nie je. Majiteľ potrebuje vidieť **čo s čím koliduje a čo s tým spraviť**.
1. **Panel kolízie** (vzor A18, `?panel=collision:<occupancy id>`): termín, odkiaľ udalosť prišla („Zavreté na Bookingu · Ostrý kalendár…“),
   s čím sa prekrýva (rezervácia s číslom, menom, stavom a odkazom na jej panel / blokácia), koľko nocí sa prekrýva, kedy sa to zistilo.
   Krátka rada podľa situácie: „Na Bookingu je termín zavretý, u vás je rezervácia 2026-0615 — skontrolujte, či nejde o dvojitú rezerváciu;
   ak je rezervácia v poriadku, termín na Bookingu je zavretý správne.“ / „Zrušte rezerváciu alebo kontaktujte hosťa“ atď. — texty cez preklady.
   Akcie: **Otvoriť rezerváciu**, **Zobraziť v kalendári** (kalendár na danom mesiaci, kolízia zvýraznená), **Označiť ako vyriešené**
   (kolízia ostane v histórii, upozornenie zmizne, znovu sa ozve len pri zmene termínu).
2. **Odkazy:** riadok synchronizácie pri kolíziách → zoznam kolízií (ak je jedna, rovno jej panel); upozornenie v zvončeku a e-mail
   o kolízii → panel kolízie; v kalendári klik na kolíznu udalosť → panel kolízie. Pri chybe synchronizácie (nie kolízii) ostáva odkaz
   na Prepojenia, ale s vetou o chybe pri danom kalendári navrchu.
3. **Zoznam kolízií** (Rezervácie › Kolízie alebo filter v kalendári — vyber jednoduchšie, zapíš prečo): otvorené a vyriešené, počet v menu
   ako odznak, kým sú otvorené.
4. Dáta: stav vyriešenia v DB (napr. `occupancy.conflict_resolved_at/by`), RLS a audit; pgTAP. Udalosti iCal sa pri ďalšej synchronizácii
   nesmú vyriešenie zrušiť, ak sa termín nezmenil.
5. Testy na Ukážkovom klientovi (nie STRÖMY): kolízia z ukážkového kanála → panel → otvoriť rezerváciu → označiť ako vyriešené; axe.

### Z37 [B] ✅ — Upsell pre hostí (po Z35)
Detail pobytu v účte hosťa podľa `UcetPobyt` (aj cez prístupový odkaz `/r/<kód>`): sekcia „K pobytu si môžete doobjednať“ s rozbalením,
výberom dní, spôsobom platby, „Objednať záväzne“, stavmi, zrušením do uzávierky; pravý stĺpec „Účet pobytu“; mobil so spodným oknom
a zeleným pásom. Zaplatiť teraz → platobné údaje s QR. E-maily hosťovi s ponukami pred príchodom (7 a 2 dni, podľa nastavenia;
len aktívne služby s upsellom, s odkazom do účtu). Modul v katalógu → hotový. Playwright: objednanie na účet pobytu, objednanie s potvrdením,
zrušenie, limit účtu pobytu.

### Z38 ✅ [A] — Recenzie pre hostí a na stránke (po Z34)
Formulár „Ako sa vám u nás páčilo?“ v detaile ukončeného pobytu (hviezdičky, podrobnosti, text, zobrazené meno, poďakovanie s Google odkazom
pre všetkých — URL Google profilu je nastavenie klienta, bez nej sa tlačidlo neukáže); odkaz z pozvánky (Z34) vedie sem. Na stránke objektu
sekcia podľa `Recenzie` (priemer, pruhy, overenie, filtre, odpovede, vybrané, iné zdroje oddelene); v košíku a hore na detaile vybraná
overená recenzia. **Štruktúrované dáta (schema.org AggregateRating) len z overených recenzií.** Modul → hotový. Playwright: odoslanie, zobrazenie
po zverejnení, filter kritických.

### Z39 [B] ✅ — Online check-in pre hostí (po Z36)
Karta check-inu a zamknuté pokyny v detaile pobytu, stránka check-inu podľa `Checkin` (karty hostí, polia podľa pravidiel krajiny, čas príchodu,
súhlas, hotovo), aj cez prístupový odkaz; pripomienky e-mailom (Z36). Citlivé polia sa po uložení hosťovi zobrazujú maskované.
Modul → hotový. Playwright: vyplnenie za 2 hostí (jeden cudzinec), odomknutie pokynov podľa nastavenia, validácie.

---

## Fáza 0 — Organizácia projektu
- [x] Repozitár `obrazne/booking-platform`, riadiace súbory, podklady prenesené z booking-demo (Claude chat, 16. 10.)
- [x] Martin: lokálny priečinok (mimo `~/Antigravity`) a Claude Code v ňom 🧠 (`G:\!WEBYooking-platform`)

## Fáza 1 — Analýza existujúcich aplikácií 🔧
- [x] Z1 — Rental Van a Credit Manager → `docs/analyza-existujucich-appiek.md`

## Fáza 2 — Architektúra v2 🧠
- [x] Revízia doménových kapitol z v1 (časť B): dostupnosť a iCal, cenotvorba, doplnkové služby, rezervačný tok a stavy,
      platby, komunikácia, zóna hosťa a administrácia majiteľa, legislatíva
- [x] Dátový model v2 (B1; schému tabuliek navrhne Claude Code v Z7)
- [ ] Katalóg modulov, napájacie miesta, priradenie do balíkov
- [ ] Riadiace centrum — obrazovky a údaje
- [ ] Prevádzka: výber transakčnej e-mailovej služby, úložisko pre nezávislú zálohu, upozornenia, postup pri výpadku
- [x] Presný rozsah MVP pre Chalet STRÖMY (časť C) — plán = fronta Z7–Z12
- [ ] Obchodný model platformy: ceny, mikro-provízia (definícia obratu), odporúčací program, fakturácia klientom, DPH (A10)
- [ ] Sprievodca zakladaním klienta a pohľad klienta na stav (A11)
- [ ] Vzhľad: rozsah premenných dizajnového systému, svetlý a tmavý režim (A12)
- [ ] Notifikácie: inštalovateľná administrácia, push ako modul (A13)
- [ ] Meranie: vlastné štatistiky, Google Analytics so súhlasom, ID klienta (A14)
- [ ] Podpora: chatbot (Smartsupp?), návody pre majiteľov, kto rieši čo (A15)
- [ ] Paralelný chod s Bookingom a Airbnb: synchronizácia, kolízie, postup pri dvojitej rezervácii (A16)
- [x] Showroom: zoznam ukážkových objektov rôznych druhov + Chalet STRÖMY s reálnymi údajmi (časť C)

## Fáza 3 — MVP Chalet STRÖMY 🔧 + 🧠 *(cca 4 týždne po uzavretí Fázy 2)*
- [x] 3a0 Kostra platformy (Z2–Z6): projekt, prostredia, klienti a oddelenie dát, preklady, téma, moduly, administrácia, riadiace centrum
- [ ] 3a Doména: objekt, cenník, sezóny, blokované dni (po revízii časti B)
- [ ] 3b Rezervácia pre hostí: dostupnosť, výpočet ceny, služby, údaje hosťa, súhlasy (aj marketingový), dočasná blokácia, iCal
- [ ] 3c Platba prevodom s QR, stavy rezervácie, e-maily
- [ ] 3d Doklady cez fakturačný nástroj, prehľad rezervácií pre majiteľa, export, testovanie, spustenie popri Bookingu
- [ ] 3f Príprava produkcie — zálohy a obnova (A9, 17. 10.): nezávislá nočná záloha mimo Supabase + upozornenie pri zlyhaní;
  **stav záloh** v Stave systému (posledná záloha, posledné skúšobné obnovenie); **export dát klienta** (ZIP) v detaile klienta;
  **skript a spísaný postup chirurgickej obnovy jedného klienta** zo zálohy bokom (len jeho `tenant_id`, výpis zmien pred zápisom,
  potvrdenie Martina); prvé skúšobné obnovenie. Postup pri výpadku (dokument).
- [ ] 3e Nasadenie u Jany: `rezervacia.chaletstromy.sk`, vyhľadávací pás na jej webe (Elementor HTML widget), tlačidlá „Rezervovať“ (A17)

## Fáza 4 — Po spustení 🔧 + 🧠
- [ ] Stripe (karta), záloha a doplatok
- [ ] Účet a zóna hosťa (B10): pobyty, dokumenty od majiteľa, doklady, pokyny k príchodu, Rezervovať znova, správy, súhlasy
- [ ] Riadiace centrum v plnom rozsahu, skúšobné doby modulov
- [ ] Vkladací widget, ďalšie moduly podľa katalógu
- [x] 🧠 **Návrh modulu Online check-in** (Martin 17. 10.; základ → Z36, obrazovky hosťa na plátne): hosť v svojom účte pred príchodom vyplní údaje ubytovaných
  (kniha ubytovaných, hlásenie cudzincov, ubytovacia daň — slovenský balík pravidiel A6), čas príchodu, súhlas s ubytovacím poriadkom;
  po check-ine sa mu X dní pred príchodom odomknú pokyny a prístupové kódy. Majiteľ vidí stav check-inu pri rezervácii. Plátno + špecifikácia.
- [x] 🧠 **Návrh modulu Recenzie** (po Z31, Martin 17. 10.): po odchode sa hosťovi v účte odomkne „Ohodnoťte pobyt“ (+ e-mail deň po
  odchode, jedna pripomienka, okno napr. 30 dní); majiteľ recenziu vidí v administrácii, môže verejne odpovedať; schválené sa zobrazia
  medzi referenciami na stránke. **Rozhodnuté (Martin 17. 10.): (b) „overené recenzie z pobytov“** — zverejnia sa všetky okrem porušení
  pravidiel (vulgarizmy, osobné údaje, mimo témy; dôvod zamietnutia sa zapíše), s priemerom, verejnou odpoveďou majiteľa a možnosťou
  vybrať niekoľko navrch. Na stránke veta, ako sa overuje, že recenzia je od skutočného hosťa (Omnibus). Odkaz na Google recenzie ponúknuť všetkým, nie len spokojným.
- [x] 🧠 **Návrh modulu Push notifikácie** (Martin 17. 10.; špecifikácia → Z33): Web Push z nainštalovanej administrácie (A13) — **bez platenej služby**
  (štandard prehliadačov, vlastné VAPID kľúče, odosielanie zo servera). Kanál nad existujúcimi upozorneniami (Z27): zapnutie
  per zariadenie a člen tímu, výber druhov, odoslanie pri vzniku upozornenia, upratanie neplatných zariadení. iPhone len po
  „Pridať na plochu“ → návod pre majiteľa s obrázkami. Odhad 2–3 dni. Platený modul pre klienta, pre nás bez nákladov.
- [x] 🧠 **Návrh modulu Upsell** (po Z31, Martin 17. 10.; potrebuje Doplnkové služby): spokojný hosť si **kedykoľvek** (pred príchodom
  aj počas pobytu) v účte jedným ťuknutím **záväzne objedná** doplnkovú službu a vyberie platbu: **kartou hneď** (po Stripe), alebo
  **„na účet pobytu“ s vyúčtovaním na konci**. Martin: „super predajný argument“ pre ubytovateľa. Rozhodnúť: uzávierky objednávok
  (napr. raňajky do 18:00 deň vopred), služby s potvrdením majiteľom (kapacita), ktoré služby a do akej sumy idú na účet pobytu,
  účet pobytu v administrácii a vyúčtovanie pri odchode (doklad cez fakturačný nástroj), ponuky v e-mailoch pred príchodom. Plátno + špecifikácia.

- [x] 🧠 **Návrh modulu Správy s hosťom** (Martin 17. 10.; → Z45–Z47): konverzácia pri pobyte, každá správa majiteľa aj e-mailom
  s tlačidlom „Odpovedať“, automatické správy (náhrada workflows z JetBookingu), rýchle odpovede. Platený modul, povinné e-maily ostávajú v jadre.
- [ ] 🧠 + 🔧 **Zaučenie klienta — návod a prechod systémom** (Martin 17. 10., **teraz nerobiť** — až keď bude systém vyladený, najneskôr po
  prezentácii Jane): popri prehliadke „Čo je nové“ niečo, s čím sa klient rýchlo zžije — **mapa administrácie** (diagram: čo kde nájde),
  **krátke slajdy** „prvý deň s rezerváciami“ (prvá rezervácia, platba, kalendár, Booking/Airbnb, správy, moduly), prípadne krátke videá;
  ten istý materiál poslúži pri predaji ďalším klientom. Rozhodnúť formu a kde to klient nájde (napr. Pomoc v menu).

## Fáza 5 — Značka a predajný web 🧠 + 🔧 *(po MVP; cieľ: hotové pred eventom v eXtreme parku Žilina)*
- [ ] Značka produktu: názov, doména, vizuál 🧠
- [ ] Obchodný model a cenník uzavretý (Fáza 2) — až potom texty webu 🧠
- [ ] Predajný web vo WordPresse s CrocoBuilderom na Martinovom hostingu: funkcie, moduly, screenshoty, dopyt 🔧
- [ ] Prepojenie s aplikáciou: rovnaké farby a písma, odkaz na ukážkového klienta, kalkulačka úspor ako widget z aplikácie 🔧

## Otázky pre Martina
- **Zrušenie pobytu (Z44) — storno pásma:** okno žiadosti ukazuje dni do príchodu a znenie storno podmienok klienta, ale **sumu
  nevypočíta** — podmienky sú len text (Nastavenia), štruktúrované pásma v systéme nie sú. Navrhujem pri klientovi pásma (napr.
  „30+ dní 100 %, 14–29 dní 50 %, menej 0 %“) — potom okno ukáže presnú vrátenú sumu a majiteľ dostane návrh storno poplatku (B5).
  Je to súčasť storno podmienok (právny text klienta) — chceš to tak, a kto pásma pre STRÖMY zadá?
- **Prístupový odkaz `/r/<kód>` (v2.4: „rovnaké stránky aj cez prístupový odkaz“):** stavy zo Z44 sú v účte hosťa; stránka cez odkaz
  ostáva potvrdenie v2.1 (platba, kroky, moduly). Zjednotiť ju s detailom v účte (bez lišty kariet) ako samostatnú úlohu?
- **Online check-in pre hostí (Z39):** (1) Hosť **môže údaje upraviť aj po dokončení, až do dňa príchodu** (tak to hovorí návrh);
  úprava check-in znova otvorí a hosť ho dokončí znova — majiteľka sa pri tom znova neupozorní (rovnaký kľúč upozornenia). Ak už
  cudzinca nahlásila, záznam o nahlásení ostáva. Stačí tak? (2) Veta z návrhu „Dieťa bez dokladu: stačí meno, dátum narodenia a adresa“
  nie je zapnutá — pravidlá SK zo Z36 chcú doklad od všetkých osôb (otázka k Z36 vyššie). (3) Odkaz „ubytovací poriadok“ vedie na
  odkaz VOP z Nastavení (iný nie je); Ukážkový klient ho nemá, takže je to len text.
- **Upsell pre hostí (Z37):** (1) Veta z návrhu „Termín potvrdí Jana **do 24 hodín**“ je sľub hosťovi — systém lehotu nestráži
  (žiadna pripomienka majiteľke ani automatické zamietnutie). Nechať vetu, zmeniť ju, alebo pridať pripomienku po 20 h? (2) Služby
  „za noc / za osobu a noc“ (raňajky) si hosť vyberá **po nociach pobytu** (dátum noci) — pri raňajkách by prirodzenejšie boli rána
  (deň po noci). Ak to chceš, treba pri službe nastavenie „ráno / večer“. (3) Pri modrej téme Ukážkového klienta má svetlý text na
  akcentovej karte (`text-on-accent-muted`, napr. „VÁŠ POBYT“ v potvrdení) kontrast pod 4,5 : 1 — týka sa to jadra (košík, potvrdenie),
  nie Z37; navrhujem upraviť token pre svetlé akcenty (malá úloha).
- **Online check-in (Z36) — pred ostrou prevádzkou overiť:** polia knihy ubytovaných a hlásenia cudzinca, lehotu 5 dní a uchovávanie
  (nastavené 730 dní po odchode, potom sa čísla dokladov a dátumy narodenia samy vymažú), či doklad treba aj pri deťoch (teraz áno pri
  všetkých osobách) a sadzbu dane obce STRÖMY. **Oficiálne tlačivo MV SR v repozitári nie je** — PDF je vlastné prehľadné s rovnakými
  údajmi a podpismi; ak chceš presné tlačivo, pošli vzor (PDF) a prerobím ho.
- **Riadiace centrum v produkcii (pripomienka 17. 10.):** vlastná adresa (subdoména) s vlastným prihlásením a dvojstupňovým overením pre správcu — rozhodnúť pri príprave produkcie (DNS).
- **Nový objekt:** zatiaľ ho zakladá len správca; či si ho ubytovateľ pridá sám (a či je počet objektov súčasťou balíka), rozhodne obchodný model.
- **Kód hosťa (Z23):** návrh má 6 políčok, ale staging posiela **8-miestny** kód (nastavenie Supabase Auth → Email OTP length).
  Políčka sa riadia skutočnou dĺžkou kódu, takže to funguje. Ak chceš 6 ako na návrhu, treba prepnúť dĺžku v Supabase (staging aj neskôr produkcia).
- **Z23 — čo som vynechal, lebo to v aplikácii zatiaľ nie je:** „Zostať prihlásený“ (prihlásenie ostáva ako doteraz), „Upraviť“
  v paneli rezervácie (úprava rezervácie neexistuje — dá sa zrušiť a vytvoriť ručne), „+ Pozvať človeka“ v riadiacom centre (pozvánky
  ešte nie sú), štítok „Ukážka“ pri klientovi (v databáze nie je príznak ukážkového klienta). „Zabudnuté heslo?“ pošle prihlasovací odkaz.
  E-mail podpory na prihlasovacej obrazovke sa zobrazí, keď nastavíš `NEXT_PUBLIC_SUPPORT_EMAIL` (Vercel). Chceš niektoré z toho doplniť?
- **Prístupnosť (Z23):** sivé štítky z návrhu (#8b929b) nesplnili kontrast AA, v administrácii sú preto tmavšie (#5a6672).
- ~~**Mapa (Z19):** OSM dlaždice → poskytovateľ?~~ Rozhodnuté 17. 10.: OpenFreeMap + odkaz na navigáciu v Google Mapách → Z40.
- **STRÖMY (Z19):** miesta v okolí a popisy zvýrazneného vybavenia sú orientačné — nech ich Jana skontroluje v administrácii.
- **Captcha:** zapojená (pozri Denník). Pri napojení vlastnej domény klienta treba doménu pridať do widgetu `booking-platform`
  v Cloudflare (Turnstile → Hostname Management), inak sa overenie na tej doméne nenačíta.
- Ochrana stagingu: adresy *.vercel.app sú za prihlásením do Vercelu (aj chalet-stromy-demo.vercel.app). Ak chceš ukázať stránku Jane,
  treba buď vypnúť Vercel Deployment Protection pre produkčné nasadenie (stránka je neindexovaná, dáta ukážkové), alebo napojiť
  vlastnú doménu. Ktoré?
- Fotky showroomu: kľúč Pexels API (zadarmo) do `.env.local` ako `PEXELS_API_KEY` — potom ich doplním. Dovtedy zástupné obrázky.
- Kľúč Resend bol poslaný v chate — po dokončení Z11 ho v Resende vymeň za nový.
- **Jana (nastavenia check-inu, neblokuje):** obec a sadzba dane z ubytovania (+ oslobodenia), ako dnes vedie knihu ubytovaných, hlási cudzincov elektronicky (eID) alebo papierovo?
- **Jana:** skutočné ceny služieb a poplatku za zviera, storno pásma 11–13 a 15–29 dní, je platiteľka DPH? (zatiaľ orientačne)
- Supabase aj Vercel CLI sa z tvojho PC nevedia spojiť (Transport error / zaseknuté). Nevadí — Vercel je napojený cez web a databáza cez MCP; ak chceš CLI, treba pozrieť firewall/antivírus/proxy pre PowerShell.
- Doména platformy pre subdomény klientov (napr. `*.booking.obrazne.sk`) — na staging stačí adresa Vercelu, na rezerváciu cez subdomény treba wildcard DNS.
- V akom fakturačnom nástroji fakturuje Jana? (prvý adaptér na doklady)
- Ponúka tvoj hosting úložisko (S3 alebo SFTP) na nezávislú zálohu? A so zmluvou o spracúvaní údajov?
- Supabase platený plán: pri objednávke pozrieť limity a nastaviť strop výdavkov.
- Účtovník: DPH pri nákupe zahraničných služieb (Supabase, Vercel, e-mailová služba) pri registrácii podľa §7a.
- Jana: začať zbierať východiskové čísla (podiel priamych rezervácií, provízie Bookingu a Airbnb za posledný rok).
- Jana: súhlas s použitím fotiek a údajov chaletu v ukážke pre ďalších záujemcov.
- Kto spravuje doménu chaletstromy.sk (DNS záznam pre subdoménu) a kto upraví jej web (vyhľadávací pás, tlačidlá)?

## Denník
*Najnovšie hore. Formát: `RRRR-MM-DD — čo sa spravilo (kto)`.*
- 2026-10-17 — Z44 [linka B]: **detail pobytu podľa stavu** (návrh v2.4 `StavyPobytu`). (Claude Code)
  - `ucet/pobyt/[id]/page.tsx` je tenký (lišta účtu a drobčeky — Z43 cez prop `crumbs`), obsah v `stay-detail.tsx`; fáza pobytu
    `stay-state.ts` (čaká na platbu / pred príchodom / počas — od dňa príchodu / po odchode / zrušený; vitest).
  - **Čaká na platbu:** teplá karta navrchu s QR (PAY by square), sumou, IBAN a VS s Kopírovať, lehotou a vetou o automatickom zrušení;
    upsell len nadpis a „Objednávať môžete hneď po zaplatení pobytu“. **Počas pobytu:** odomknuté pokyny ako dlaždice (kód od dverí,
    Wi-Fi, príchod, odchod), text pokynov, Navigovať v Google Mapách, „Niečo nefunguje? Napíšte nám“ (WhatsApp/telefón); upsell
    „Na zajtra si môžete objednať“. **Zrušený:** kedy (z histórie stavov), dôvod, vrátená suma (platby označené ako vrátené) alebo veta,
    že o vrátení podľa storna informuje hostiteľ, „Vybrať nový termín“; moduly skryté.
  - **Kód od dverí a Wi-Fi** sú nové neverejné polia objektu (`property_private.door_code / wifi_name / wifi_password`, formulár pri
    pokynoch k príchodu); hosťovi ich vráti len `guest_stay_state`, keď sú pokyny odomknuté (rovnaké pravidlo ako doteraz).
  - **Účet pobytu** je teraz karta jadra (pobyt ✓, **Rozpis ceny** ako rozbaľovací odkaz, na zaplatenie / vrátime); objednávky upsellu
    sa do nej vkladajú novým slotom `guest.stay.account` (na prístupovom odkaze ostáva karta modulu v `guest.stay.aside`). Samostatná
    sekcia rozpisu na konci zrušená.
  - **Zmena alebo zrušenie:** krátky blok (prvá veta storno podmienok) + okno: dni do príchodu, podmienky, nepovinný dôvod, Ponechať
    pobyt / Odoslať žiadosť = existujúca žiadosť o storno (majiteľ dostane e-mail a upozornenie). Len pred príchodom. Sumu okno
    nepočíta — štruktúrované storno pásma nie sú (Otázky).
  - **Pokyny k príchodu:** konkrétny dátum odomknutia podľa stavu („Odomknú sa 20. 12. 2027, keď bude pobyt zaplatený“ / „po dokončení
    online check-inu“ / „Odomknú sa … Pošleme vám ich aj e-mailom“) z `guest_stay_state` (migrácia `20261017261000_stay_states.sql`).
  - Playwright `e2e/stay-states.spec.ts` na **Ukážkovom klientovi** (PC aj mobil, prihlásenie kódom): čaká na platbu (QR, rozpis v karte),
    počas pobytu (dlaždice z údajov objektu), zrušený, žiadosť o zrušenie cez okno (zapíše sa s dôvodom, pobyt ostane potvrdený); axe.
    Pustené aj ostatné testy linky B (upsell, check-in, kolízie) — zelené.
  - **Oprava po Z39:** test check-inu pri dvoch vypršaniach času nevrátil nastavenie Glamping Lúka (pokyny až po check-ine + testové
    pokyny) — na stagingu vrátené; test stavov si nastavenie objektu teraz ukladá a vracia v `finally`.
- 2026-10-17 — Z42 [linka B]: **kolízia termínov — panel, zoznam, odkazy** (pripomienka 29). (Claude Code)
  - **Rezervácie › Kolízie** (`/admin/collisions`) — samostatná stránka namiesto filtra v kalendári: kolízie sú zriedkavé a rozhádzané
    po mesiacoch, kalendár ukazuje dva mesiace jednej jednotky. Otvorené a vyriešené, v menu položka (keď klient mal aspoň jednu
    kolíziu) s odznakom otvorených; odznak aj pri skupine Rezervácie.
  - **Panel kolízie** (`?panel=collision:<id>`, A18): termín, odkiaľ prišiel („Zavreté na Booking.com · kanál · jednotka“), počet nocí,
    koľko sa prekrýva, kedy sa zistila; **s čím sa prekrýva** (rezervácia s číslom, menom, stavom a odkazom na jej panel / blokácia /
    iný kalendár) a **rada podľa situácie** (zavreté na portáli + rezervácia, pobyt z portálu + rezervácia = dvojitá rezervácia, blokácia,
    iný kalendár, už sa neprekrýva). Akcie Otvoriť rezerváciu, Zobraziť v kalendári (mesiac a jednotka, kolízia zvýraznená),
    Označiť ako vyriešené / Znovu otvoriť.
  - **Odkazy:** riadok synchronizácie na Prehľade a v Kalendári pri kolízii → zoznam (pri jednej rovno jej panel); upozornenie v zvončeku
    (aj push) → panel (aj staršie upozornenia v DB prepísané); e-mail o kolízii → panel (pri viacerých zoznam); v kalendári klik na
    kolízny pruh → panel. Kolízny pruh je v kalendári v druhom, tenšom riadku dňa (predtým ležal cez rezerváciu a texty sa prekrývali).
    Pri chybe synchronizácie ostáva odkaz na Prepojenia a navrchu je veta, ktorý kalendár zlyhal a prečo.
  - **Dáta** (migrácia `20261017250000_collisions.sql`): `occupancy.conflict_detected_at / conflict_resolved_at / conflict_resolved_by`,
    trigger: vyriešenie sa zruší len pri zmene termínu udalosti (nezmenená udalosť pri synchronizácii ho nechá), vtedy znova zvonček;
    `resolve_conflict` (len tím klienta, audit `conflict.resolved/reopened`, zmaže upozornenie zo zvončeka, prepočíta stav kanála);
    `ical_apply` (rovnaká logika) počíta stav kanála len z nevyriešených kolízií (`ical_channel_status`) a v e-maile posiela id kolízie.
    Migrácia má čas `…250000` (po `…240000` linky A, ktorá bola na stagingu skôr než v gite).
  - Testy: pgTAP `collisions.test.sql` (iný klient nevyrieši, audit, zvonček, stav kanála, synchronizácia nechá vyriešené, zmena termínu
    znova otvorí a zazvoní), Playwright `e2e/collisions.spec.ts` na **Ukážkovom klientovi** (vlastný neaktívny testový kanál na Glamping
    Lúka, e-mail o kolízii hneď označený ako neodoslaný, test sa preskočí, ak by mal Ukážkový klient push na kolízie): zoznam → panel
    (rada, rezervácia, 3 spoločné noci) → Otvoriť rezerváciu → späť → Označiť ako vyriešené, axe. Ostatné e2e (Prehľad, Kalendár)
    som nespúšťal — podľa pravidiel liniek ich púšťa linka A na konci.
- 2026-10-17 — Ukážkové dáta: hosť pre zónu hosťa `info+host@obrazne.sk` namiesto neexistujúceho `demo-host@obrazne.sk`
  (`scripts/demo-data.mjs`, CLAUDE.md); prejaví sa pri ďalšom `npm run demo-data -- --reset` na Ukážkovom klientovi.
- 2026-10-17 — Z38: **recenzie pre hostí a na stránke** (B11, návrh v2.3 `UcetPobyt`, `Recenzie`). Modul Recenzie je v katalógu **hotový**.
  - **Účet hosťa → ukončený pobyt:** „Ako sa vám u nás páčilo? Úprimne.“ — hviezdičky s popisom (Sklamanie…Výborné), podrobnosti bodkami
    (nepovinné), text, „Zobraziť ako“ (krstné + iniciála), pravidlá zverejnenia; odoslanie cez `submit_review` (oprávnenosť rozhoduje DB).
    Po odoslaní poďakovanie, **„Ohodnotiť aj na Google ↗“ všetkým bez ohľadu na hviezdičky** (nové nastavenie klienta `google_review_url`,
    Nastavenia → pri module Recenzie) a „Rezervovať znova“. Odkaz z pozvánky `/ucet/pobyt/<id>/hodnotenie` vedie sem (cez prihlásenie).
    Cez prístupový odkaz sa nehodnotí (pozvánka vedie do účtu).
  - **Stránka objektu:** sekcia „Hostia hovoria“ s overenými recenziami nahrádza referencie, keď sú (priemer, čiastkové pruhy, „Overené
    recenzie.“, filtre Všetky / S odpoveďou / Kritické, odpovede majiteľa, výber majiteľa, Zobraziť všetky); ručné referencie pod tým
    ako „Hodnotenia z iných zdrojov“. V košíku a galérii vybrané overené recenzie namiesto ručných. **schema.org AggregateRating len
    z overených zverejnených recenzií** (`review_summary`).
  - Playwright `reviews-guest.spec.ts` (pozvánka → prihlásenie → hodnotenie → Google → zverejnenie → filter kritických → JSON-LD, axe); celá sada 61 ok.
- 2026-10-17 — Z41: **ukážka na STRÖMY vytvorená znova** (Martin): `demo-data --tenant stromy --force --with-real-calendar` — bez ukážkových
  iCal kanálov a portálových udalostí, rezervácia (b) na `zona-hosta@stromy-demo.invalid`, takže **neodišiel žiadny e-mail** (overené).
  48 ukážkových rezervácií (a 2026-0647, b 2026-0648, c 2026-0649), recenzie, objednávky, check-iny, dokumenty, blokácia. Ostré kalendáre
  „…na Bookingu“ a nový „Ostrý kalendár Stromy AirBnb“ nedotknuté (17 udalostí). **Pozor:** ukážkové (a) a (b) majú pevné termíny a kryjú sa
  so skutočnými pobytmi z Airbnb (26.–30. 12. 2026, 13.–20. 2. 2027) → 2 kolízie. **Vyriešené (Martin):** (a) presunutá na 10.–13. 2. 2027,
  (b) na 22.–26. 12. 2026 (termín, obsadenosť, dátum a uzávierka objednávok), udalosti z Airbnb znova blokujúce, kolízie 0, e-maily 0.
  Stav kanála „Ostrý kalendár Stromy AirBnb“ sa na „ok“ prepne pri ďalšej synchronizácii.
- 2026-10-17 — Z41 oprava rozsahu (Martin): upratanie STRÖMY malo byť **len ukážkové iCal kanály** „Booking.com (ukážka)“ a
  „Airbnb (ukážka)“ s udalosťami. Pokyn prišiel až po vykonaní plného upratania (podľa predchádzajúceho súhlasu). **Vrátené:** moduly
  recenzie, upsell a check-in na STRÖMY znova zapnuté (`active`), upsell Janiných služieb ako predtým (Raňajky, Šéfkuchár s potvrdením,
  Transfer; uzávierka 48 h). **Nevratne zmazané** (záznamy mazania som z histórie vynechal, takže obnova z `record_history` nejde):
  52 rezervácií (48 „DEMO“ + 2026-0001/0002/0003/0040), blokácia „(DEMO)“, 2 ukážkové dokumenty, 50 ukážkových/testovacích hostí,
  5 ukážkových upozornení. Ukážkové rezervácie sa dajú vytvoriť znova len skriptom `demo-data` pre STRÖMY (dnes zablokovaný kvôli
  ostrému kalendáru) — čaká na rozhodnutie Martina. „Ostrý kalendár chaletu na Bookingu“ nedotknutý.
- 2026-10-17 — Z41 (časť — bez upratania STRÖMY): **ukážkové dáta a testy preč zo STRÖMY.**
  - `demo-data`: cieľ **Ukážkový klient** (Chalet Pod Smrekom), STRÖMY len `--tenant stromy --force` a **nikdy s aktívnym skutočným
    iCal kanálom** (overené: skript skončí „STOP … nothing was changed“); `--remove` len zmaže. Ukážkový klient má celú ukážku
    (49 rezervácií za 22 mesiacov, recenzie, objednávky, check-iny, dokumenty, blokácia, kanály), 8 ilustračných fotiek (kreslené,
    `ilustrácia (demo)`), fiktívny kontakt „Martina (ukážka)“; e-maily ukážky sa preskakujú hneď (pri behu neodišiel žiadny).
  - **e2e testy na Ukážkovom klientovi** (`e2e/helpers.ts`: `TENANT`, `TENANT_PROPERTY`, `PROPERTY_SLUG`, hosť `ukazka.localhost:3100`) —
    v STRÖMY nič nevytvárajú; CLAUDE.md doplnené. Snímky prehliadky „Čo je nové“ z Ukážkového klienta (verzia prehliadky nezvýšená).
  - **Kalendár:** udalosť z iCalu „CLOSED - Not available“ = **„Zavreté na Bookingu“** s vetou o extranete v paneli (Booking nerozlišuje
    rezerváciu od ručne zavretého termínu a neposiela termíny prevzaté z iných kalendárov); e2e test.
  - **Téma:** akcentová plocha s bielym textom má teraz kontrast aspoň 7 : 1 (svetlejšie odtiene textu na nej ostanú v AA) — modrá
    Ukážkového klienta neprešla axe; ukážkovému klientovi tmavšia modrá `#1d5c96` (aj v `seed.sql`).
  - Opravy: v `tour-screens.mjs` bol v regexe neviditeľný znak backspace namiesto `` (rozmazanie e-mailov mohlo minúť) — opravené.
  - **Upratanie STRÖMY (po Martinovom súhlase, 17. 10.):** zmazaných 52 rezervácií (48 „DEMO“ + testovacie 2026-0001/0002/0003/0040)
    s naviazanými dátami, 2 ukážkové kanály „(ukážka)“ s udalosťami, blokácia „(DEMO)“, 2 ukážkové dokumenty, 50 ukážkových/testovacích
    hostí, 5 ukážkových upozornení; moduly recenzie/upsell/check-in vypnuté, upsell Janiných služieb vrátený; záznamy mazania vynechané
    z koša a histórie. **Ostalo:** objekt, 26 fotiek, 3 sezóny, 3 služby, sekcie, tím, 2 hostia (napr. Martinov testovací z 2026-0040)
    a **„Ostrý kalendár chaletu na Bookingu“** — z neho 5 udalostí „CLOSED - Not available“ (2. 1. 2027 – 17. 4. 2028); žiadna rezervácia.
  - Testy: celá sada 54 ok + nový test kalendára; „calendar works with the keyboard“ raz zlyhal v plnom behu, samostatne 3× ok.
- 2026-10-17 — Z39 [linka B]: **online check-in pre hostí** (návrh v2.3 `Checkin`, karta v `UcetPobyt`). (Claude Code)
  - **Karta v detaile pobytu** (nový slot `guest.stay.top` nad pokynmi k príchodu, v účte aj na `/r/<kód>`): „Vybavte to teraz.
    Na mieste už len kľúče.“ + „Začať / Pokračovať v check-ine →“ (pred otvorením „Check-in sa otvorí …“), hotový = svetlozelená
    karta „Check-in hotový · 2 hostia · príchod okolo 16:00“ s „Upraviť“. Riadok so zámkom z návrhu je zlúčený s vetou na karte
    („Po check-ine sa vám odomknú pokyny…“, len keď to objekt vyžaduje) — sekcia pokynov v jadre ostáva.
  - **Stránka check-inu** `/ucet/pobyt/<id>/checkin` a `/r/<kód>/checkin` (`src/modules/checkin/guest/`): karta na každú osobu
    (počet z rezervácie, prvá predvyplnená menom objednávateľa, hotová s fajkou, inak „chýba N údajov“), štátna príslušnosť
    SR / iná krajina (krajina zo zoznamu ISO s názvami cez `Intl.DisplayNames`, dátum narodenia), doklad a číslo, adresa; polia podľa
    `rulesFor` (Z36), chýbajúce sa po pokuse zvýraznia. Čas príchodu pilulkami od času príchodu objektu, súhlas s ubytovacím
    poriadkom, „Dokončiť check-in“ (bez súhlasu neaktívne s dôvodom vedľa). Vpravo „Prečo to od vás chceme“ a „Po dokončení“.
    Hotovo: „Hotovo. Na mieste už len kľúče.“ + dátum odomknutia pokynov, Späť na pobyt / Upraviť údaje.
  - **Citlivé polia maskované:** migrácia `20261017232000_checkin_guest.sql` — `guest_checkin_view` (účet aj odkaz) vracia číslo
    dokladu len ako `••••89` a dátum narodenia len ako „uložený“; v prehliadači sa nikdy neobjavia. `save_checkin` pri osobe s `id`
    ponechá uložené číslo dokladu, dátum narodenia a záznam o nahlásení cudzinca, keď ich hosť nemení; úprava po dokončení do dňa
    príchodu (návrh) check-in znova otvorí, akcia ho hneď dokončí. Pripomienka e-mailom (Z36) vedie cez prístupový odkaz (bez prihlásenia).
  - Modul Online check-in v katalógu → **hotový**. Testy: pgTAP `checkin_guest.test.sql` (maskovanie, nič citlivé nevyjde z DB,
    zachovanie pri úprave, znovu-otvorenie), Playwright `e2e/checkin-guest.spec.ts` na **Ukážkovom klientovi** (PC aj mobil 390 px):
    2 hostia (jeden z UK), validácie, odomknutie pokynov podľa nastavenia objektu (dočasne zapnuté a vrátené), úprava bez prepisovania
    dokladu, axe. Test dočasne pridá Glamping Lúka neverejné pokyny, ak žiadne nemá, a po sebe ich zmaže.
- 2026-10-17 — Z37 [linka B]: **upsell pre hostí** (návrh v2.3 `UcetPobyt`, `MobilPobyt`). (Claude Code)
  - **Detail pobytu v účte hosťa prestavaný podľa návrhu:** úvod s prechodom (číslo, stav, „Tešíme sa na vás.“ + objekt, termín,
    „Príchod o N dní“), dva stĺpce (obsah + 360 px vpravo, prilepený), vpravo kontakt na hostiteľa. Pre moduly **nové sloty**
    `guest.stay.main` a `guest.stay.aside` (aj na prístupovom odkaze `/r/<kód>`, s `accessToken`); zapnutie modulov sa pre hosťa
    overuje cez `is_module_enabled` (hosť nečíta `tenant_modules`). Z38/Z39 sa napoja jedným riadkom v manifeste.
  - **„K pobytu si môžete doobjednať. Kedykoľvek.“** (`src/modules/upsell/guest/`): riadky služieb, rozbalenie s fotkou, popisom,
    výberom dní, „Ako zaplatíte“ (Na účet pobytu / Zaplatiť teraz), „Objednať záväzne · suma“ a uzávierkou; objednané so stavom
    (Objednané / Čaká na potvrdenie / Zamietnuté s dôvodom) a „Zrušiť objednávku“ do uzávierky (s potvrdením). Nad limit účtu pobytu
    alebo pri službe bez účtu pobytu je karta „Na účet pobytu“ neaktívna s vetou prečo. Zaplatiť teraz → po potvrdení blok
    „Zaplatiť objednané služby prevodom“ (suma, IBAN, VS rezervácie, QR). Mobil: služba v spodnom okne, dole zelený pás
    „Na účet pobytu · suma“ s „Účet pobytu ▴“. Vpravo zelená karta **Účet pobytu** (pobyt ✓, objednávky so stavom a platbou,
    otvorené na účet pobytu, po vyúčtovaní „Vyúčtované ✓“).
  - **Výber dní (rozhodnutie):** služba „za noc“ / „za osobu a noc“ → ľubovoľné noci pobytu, **objednávka na každý deň zvlášť**
    (vlastná uzávierka, zrušenie po dňoch); služba s potvrdením majiteľa → jeden deň; ostatné → na celý pobyt. Migrácia
    `20261017231000_upsell_guest.sql`: `place_order` pri dátume počíta **jednu noc** (inak ako košík), nová `place_orders`
    (viac dní naraz, všetko alebo nič, limit účtu pobytu počíta aj dni z toho istého volania).
  - **E-mail s ponukami pred príchodom** (`guest_upsell_offer`): `upsell_tick` (cron každú hodinu, 23. min.) v dňoch
    `tenant_settings.upsell_offer_days` (predvolene 7 a 2, nastavenie v Nastaveniach pri limite účtu pobytu), od 9:00 času klienta,
    raz na deň; len potvrdené rezervácie mimo Bookingu/Airbnb, keď ostáva aspoň jedna služba pred uzávierkou; v e-maile zoznam
    služieb s cenou a odkaz na rezerváciu (prístupový odkaz, inak účet). **Pozor pre obe linky:** `email_outbox_kind_check` sa
    pri novom druhu e-mailu prepisuje celý — zoznam ber z poslednej migrácie.
  - Modul Upsell v katalógu → **hotový** (`ready`). Testy: vitest (deň = jedna noc, výber dní, uzávierka v časovom pásme),
    pgTAP `upsell_guest.test.sql` (spustí CI), Playwright `e2e/upsell-guest.spec.ts` na **Ukážkovom klientovi** (Glamping Lúka,
    e-maily `+b@booking-platform.test`): objednanie na účet pobytu (2 dni), s potvrdením, zrušenie, nad limit prevodom s QR, axe;
    mobil: spodné okno a zelený pás. Prešlo aj `confirm`, `account` a `upsell` (admin).
- 2026-10-17 — Z40: **mapa z OpenFreeMap + „Navigovať v Google Mapách“.**
  - Interaktívna mapa (Okolie) = MapLibre GL + vektorové dlaždice OpenFreeMap (štýl Positron, URL na jednom mieste `src/core/maps/config.ts`,
    prepísateľná `NEXT_PUBLIC_MAP_STYLE_URL`), značka / oblasť v akcente témy, atribúcia od MapLibre, priblíženie kolieskom až po kliknutí.
    Knižnica a dlaždice sa načítajú až keď je mapa blízko obrazovky. **Leaflet odstránený.**
  - **Statický náhľad** (malá mapa pri cene a miesto mapy kým sa nenačíta): kreslený náhľad bez mapových dát — 0 požiadaviek a 0 skriptov.
    Zdôvodnenie: OpenFreeMap nemá statické obrázky, dlaždice OSM sa komerčne nesmú a vopred renderovaný obrázok by potreboval
    serverové vykreslenie mapy (headless GL) — zbytočná ťarcha pre malý náhľad, ktorý aj tak vedie na skutočnú mapu.
  - Výkon mobilu (`perf-check`, 4G, CPU 4×): **pred** LCP 2,64 s, 871 kB, 44 požiadaviek → **po** LCP 2,54–2,57 s, 644 kB, 35 požiadaviek.
  - **Navigovať v Google Mapách ↗** (obyčajný odkaz, nič od Google sa nenačíta): Okolie len pri presnej polohe; potvrdenie rezervácie
    (`/r/…`) pri presnej polohe vždy, pri približnej po potvrdení; pokyny k príchodu v účte hosťa.
  - Playwright: canvas MapLibre, tlačidlo Priblížiť, žiadne dlaždice pred posunom k mape, odkaz so súradnicami (alebo žiadny pri približnej), axe; celá sada 55 ok.
- 2026-10-17 — Z36: **modul Online check-in — základ** (B11), bez obrazoviek pre hostí.
  - **Pravidlá krajiny** (A6): `checkin_rules('SK')` v DB (vynucuje) a `src/modules/checkin/rules.ts` (rovnaký balík + výpočet dane, unit testy):
    povinné polia pre všetkých / navyše pre cudzincov, druhy dokladov, hlásenie do 5 dní, uchovávanie, citlivé polia.
  - **`checkins`** (stav, čas príchodu, súhlas s ubytovacím poriadkom, kto/ako dokončil; má `record_history`) a **`checkin_guests`**
    (osoby; **bez** `record_history`, aby história nedržala kópie dokladov). Hosť cez účet alebo prístupový odkaz: `save_checkin`,
    `complete_checkin` (kontrola `checkin_missing` podľa pravidiel, okno od X dní pred príchodom do odchodu). Tím osoby priamo nečíta:
    `checkin_people` (doklad maskovaný), **`reveal_checkin_guest` len rola majiteľ a každé odkrytie ide do auditu** (`checkin.revealed`).
    Pokyny k príchodu a kódy sa pri nastavení objektu ukážu až po dokončení (`arrival_instructions_visible`).
  - **pg_cron `checkin_tick`** (hodinovo): pripomienky e-mailom podľa dní objektu (predvolene 7 a 2, len ak nedokončený), upozornenie
    „cudzinec nenahlásený“ na 4. deň, mazanie čísel dokladov a dátumov narodenia po lehote klienta (predvolene 730 dní po odchode).
  - **Daň za ubytovanie:** nastavenia klienta (obec, sadzba za osobu a noc, oslobodenie podľa veku), `city_tax_month` (vek z check-inu
    počíta DB, dátumy narodenia neopustia databázu; inak dospelí z rezervácie), prehľad a CSV v Príchodoch.
  - **Hlásenie cudzinca:** vlastné PDF (pdf-lib + Geist s diakritikou, `src/core/pdf`) na podpis, len majiteľ; „Označiť ako nahlásené“.
  - **Administrácia:** panel rezervácie → „Check-in“ (slot modulu): stav, osoby maskované, Odkryť (audit), PDF, hlásenie. **Rezervácie › Príchody**
    (podpoložka — je to pohľad na rezervácie podľa príchodu ako kalendár): príchody na 30 dní so stavom check-inu a hlásení, daň za mesiac.
    Nastavenia → Online check-in (obec, sadzba, oslobodenie, uchovávanie); objekt → Príchod (otvorenie check-inu, pripomienky, pokyny až po check-ine).
  - Ukážkové dáta: dokončený check-in pri (b) so 4 osobami (2 cudzinci GB, vymyslené doklady) a rozpracovaný pri ďalšom pobyte.
    Overené: pri `demo-data --reset` už neodišiel žiadny e-mail.
  - Testy: pgTAP `checkin.test.sql` (20 — RLS, maskovanie, audit, mazanie po lehote), vitest `rules.test.ts`, Playwright `checkin.spec.ts`
    (+ axe); celá sada 51 ok, `cart.spec` Z30 a mobil `admin-v1` „v1.1 panel“ zlyhali len v plnom behu, samostatne prejdú.
- 2026-10-17 — Z35: **modul Upsell — základ** (B11), bez obrazoviek pre hostí.
  - **Nastavenia služby:** ponúkať po rezervácii, uzávierka v hodinách (pred dňom služby, inak pred príchodom), vyžaduje potvrdenie,
    povoliť na účet pobytu (Ponuka › Doplnkové služby, len so zapnutým upsellom). Klient: **limit účtu pobytu** (Nastavenia, predvolene 300 €).
  - **`reservation_orders`** so zmrazenou cenou (rovnaké pravidlo ako košík — `modelQuantity`; v DB `place_order`), dátum služby,
    uzávierka, spôsob platby (účet pobytu / prevod; karta až so Stripe), stavy ordered/awaiting_confirmation/confirmed/declined/cancelled.
    **Riadky rezervácie sa nemenia.** RLS: tím klienta a hosť v účte; cez prístupový odkaz funkcie s overením tokenu
    (`reservation_access`, `reservation_orders_for`, `stay_account`). Funkcie `place_order` (okno od potvrdenia do odchodu, uzávierka,
    aktívna služba, limit), `cancel_order` (do uzávierky), `decide_order`, `settle_stay_account` → platba s `payments.purpose = 'stay_account'`
    (existujúce dotazy na platbu rezervácie filtrujú `purpose = 'reservation'`). Má `record_history`.
  - Upozornenia `order_new`, `order_awaiting`; e-maily hosťovi `guest_order_received/confirmed/declined`.
  - **Administrácia:** panel rezervácie → „Účet pobytu“ (cez slot modulu `booking.detail.tabs`): objednávky, Potvrdiť / Zamietnuť s dôvodom,
    súčty a Vyúčtovať (na mieste / prevodom). Modul `ready: false` → v katalógu „v príprave“.
  - Ukážkové dáta: 3 objednávky na rezervácii (b) (potvrdená, čaká na potvrdenie, zamietnutá). **Oprava `demo-data`:** e-maily
    ukážkových rezervácií sa preskakujú hneď po vytvorení (predtým ich minútový worker stihol poslať — pri dnešných dvoch behoch
    odišli na staging presmerovanie e-maily k rezervácii (b) a jedna kolízia kalendára).
  - Testy: pgTAP `upsell.test.sql` (25), vitest `modules/upsell/rules.test.ts`, Playwright `upsell.spec.ts` (+ axe); celá sada 52 ok,
    `guest.spec` „v2 windows“ raz zlyhal v plnom behu, samostatne prejde (nestabilný pri záťaži).
- 2026-10-17 — Z34: **modul Recenzie — základ** (B11), bez obrazoviek pre hostí.
  - **`reviews`** (objekt, rezervácia unique, hosť, hodnotenie 1–5 + čiastkové, text, zobrazené meno, mesiac pobytu, jazyk, stav
    submitted/published/rejected, dôvod z pevného zoznamu, odpoveď majiteľa, navrchu). RLS: tím klienta a hosť svoju; zápis hosťa len
    cez `submit_review` (oprávnenosť v DB: `review_eligibility` — nie zrušená, nie z portálu, odchod prebehol, okno 30 dní, jedna na
    rezerváciu, modul zapnutý); tím mení len stav, dôvod, odpoveď a navrch (stĺpcové práva + trigger `reviews_moderate`). Verejne len
    `public_reviews` a `review_summary` (priemer a rozdelenie len zo zverejnených, bez osobných údajov). Má `record_history`.
  - **pg_cron `reviews_tick`** (každých 15 min): zverejnenie po 72 h, upozornenie 24 h pred, pozvánka deň po odchode o 10:00 miestneho
    času, jedna pripomienka 7 dní po odoslanej pozvánke (ak nehodnotil a okno trvá). Pri zamietnutí e-mail hosťovi s dôvodom.
    E-maily cez existujúcu frontu, texty `emails.guest_review_*` vo farbe témy klienta; odkaz `/ucet/pobyt/<id>/hodnotenie` (stránku doplní Z38).
  - Upozornenia `review_new`, `review_publishing` (zvonček, push, nastavenia — druhy modulu len pri zapnutom module).
  - **Administrácia:** Ponuka › Recenzie (zoznam so stavmi a priemerom, panel: Zverejniť teraz / Zamietnuť s dôvodom / Odpoveď / Navrch);
    Referencie s vetou „z iných zdrojov“. Modul má v manifeste `ready: false` → v katalógu „v príprave“ a riadiace centrum ho nezapne
    (len vypne); na STRÖMY ho zapína `npm run demo-data` (7 recenzií vo všetkých stavoch).
  - Testy: pgTAP `reviews.test.sql` (22), vitest `modules/reviews/model.test.ts`, Playwright `reviews.spec.ts` (+ axe); celá sada 52 ok.
- 2026-10-17 — Z33: **modul Push notifikácie** (B11).
  - **Zariadenia:** `push_subscriptions` (osoba, klient alebo null = platforma, endpoint, kľúče, popis, vybrané druhy, posledné doručenie,
    zlyhania). RLS: každý len svoje; klientske zariadenie len člen tímu so zapnutým modulom `push`, platformové len správca platformy;
    stav doručenia zapisuje len server. Bez `record_history` (technické údaje osoby, ako upozornenia). pgTAP `push.test.sql` (16).
  - **Odosielanie — zdôvodnenie:** trigger na `notifications` zaradí upozornenie do `push_queue`, len ak ho chce nejaké zariadenie, a cez
    pg_net zavolá chránený endpoint `/api/push/run` (CRON_SECRET z Vaultu — rovnaká cesta ako e-mailový worker). Edge Function by
    potrebovala druhú kópiu VAPID kľúčov a web-push v Deno; takto je jeden kód aj jedno miesto na kľúče. Čo ping nestihne, pošle
    minútový job worker; `claim_push_jobs` berie každé upozornenie raz. Príjemcov vyberá `selectRecipients` (druh, modul, člen tímu,
    kto udalosť spôsobil nedostane). 404/410 → zariadenie sa zmaže. Text a odkaz rovnaké ako v zvončeku (`notificationText`, spoločné).
    Testovacie endpointy `*.test`/`*.invalid` sa neodosielajú (ako e-maily testovacích dát).
  - **PWA:** manifesty `/pwa/admin` a `/pwa/platform` (štart `/admin`, `/platform`, standalone), ikony `/pwa/icon/<veľkosť>`,
    service worker `public/push-sw.js` len pre push (bez cachovania).
  - **Rozhranie:** Nastavenia → E-maily a upozornenia → „Upozornenia na tomto zariadení“ (zapnúť/vypnúť, druhy — predvolene nová
    rezervácia, kolízia, zlyhaná synchronizácia, žiadosť o storno — skúšobné upozornenie, moje zariadenia); modul vypnutý = veta
    o module; iPhone/iPad mimo plochy = návod v 3 krokoch. Riadiace centrum → **Upozornenia** (platformové, vždy). Modul v katalógu hotový.
  - Kľúče VAPID: názvy v `.env.example`, hodnoty v `.env.local` a vo Verceli (Production aj Preview, pridané s Martinovým súhlasom);
    staging znova nasadený, `/api/push/run` cez pg_net odpovedá 200. Testy: vitest (výber príjemcov),
    Playwright `push.spec.ts` (povolenie, uloženie, druhy, skúšobné, odobratie, platforma, axe) — celá sada 45 ok, známy flaky mobil
    „02 overview“ samostatne prejde.
- 2026-10-17 — Z31: **história zmien a kôš** (A9, vrstvy 1 a 2).
  - **`record_history`** plnená triggerom na všetkých tabuľkách s `tenant_id` (tabuľka, záznam podľa primárneho kľúča, insert/update/delete,
    pred/po, kto, zdroj user/guest/system, transakcia, čas). **Bez histórie:** `record_history`, `audit_log`, `notifications`, `email_outbox`,
    `request_attempts`, `guest_auth_attempts`, `guest_consent_events`, `reservation_counters`, `reservation_status_history`, dočasné
    podržania termínu (`occupancy` kind hold) a riadky bez klienta (spoločné `terms`). Zmena len `updated_at` / `last_sync_*` /
    `last_status` / `last_error` sa nezapisuje (synchronizácia iCal by inak zahlcovala). RLS: číta len správca platformy. pgTAP 16 testov.
  - **Kôš** (Nastavenia › Nedávno zmazané, len majiteľ): služby, sezóny s cenami, poplatky, zľavy, fotky, sekcie, dokumenty, blokácie,
    iCal kalendáre, miesta v okolí — 30 dní. Obnova vráti aj riadky, ktoré odišli s nimi (rovnaká transakcia a odkaz na obnovený záznam:
    sezóna → obdobia a ceny); udalosti iCal kalendára nechá na ďalšiu synchronizáciu. Kolízie sa vysvetlia (termín obsadený, chýbajúci
    objekt…), nič sa vtedy neobnoví. **Súbory fotiek a dokumentov** sa pri zmazaní neodstraňujú — maže ich až job worker po 30 dňoch
    (ak sa záznam neobnovil a súbor nepoužíva iný záznam).
  - **Riadiace centrum → detail klienta → Záznam zmien** = história dát (obdobie, typ záznamu, osoba; 50 na stranu), „pred → po“
    slovami (preklady polí, peniaze, áno/nie), **Vrátiť túto zmenu** s potvrdením; ak sa záznam medzitým zmenil, ukáže aktuálny stav
    a ponúkne „Vrátiť aj tak“. Vrátenie aj obnova z koša sa zapíšu do histórie aj auditu (`history.reverted`, `trash.restored`).
    Audit klienta (prihlásenia, moduly) je odkazom z tejto stránky.
  - **Uchovávanie:** pg_cron denne maže históriu staršiu ako 180 dní. Anonymizácia hosťa v aplikácii **zatiaľ nie je** — pripravená funkcia
    `forget_guest_history(tenant, email)` vymaže jeho riadky z histórie; zavolá ju anonymizácia, keď vznikne.
  - Playwright `history.spec.ts` (majiteľ zmaže službu → obnoví z koša; správca vráti zmenu ceny). Celá sada 46/46. (Claude Code)
- 2026-10-17 — Z28 (2. časť, dokončenie): **klik na skupinu v menu** (majiteľ aj riadiace centrum) vedie na prvú viditeľnú podstránku
  a skupinu rozbalí; rozbalená je len skupina aktívnej stránky; šípka je len znak; skupina s jedinou podstránkou je obyčajná položka
  (Prepojenia → Booking a Airbnb). **Drobčeky podľa spoločného pravidla:** `PageHeader` má `breadcrumbs` (malým písmom nad nadpisom,
  namiesto štítku), len od druhej úrovne — Rezervácie › Kalendár / Blokácie / Ručná rezervácia, Ponuka › Referencie, Nastavenia › Tím /
  E-maily a upozornenia, Objekt › <názov> › <záložka>, Klienti › <klient> › <záložka>, Moduly › Katalóg / Skúšobné doby, Klienti › Založiť
  klienta; na mobile len „‹ Späť na <rodič>“. Prehliadka majiteľa: text snímky menu a verzia. Playwright (klik na Rezervácie → Zoznam,
  Prepojenia bez šípky, drobčeky PC aj mobil). Celá sada 46/46. Pozor pri lokálnych testoch: server musí bežať s testovacími kľúčmi
  Turnstile (`npm run e2e:server`), inak padne rezervácia a prihlásenie hosťa. (Claude Code)
- 2026-10-17 — Z30: **košík — Pokračovať hneď po výbere termínu.** Platný termín → Pokračovať aktívne (pri otvorenom kalendári
  ho zbalí a ukáže doplnky, krok 1 ostáva); „Hotovo“ → „Potvrdiť termín“. Bez platného termínu je Pokračovať stlmené cez `aria-disabled`
  a nad ním je vždy veta prečo („Vyberte deň príchodu“ → „Vyberte deň odchodu“ → pravidlo ceny, napr. „V tomto termíne je minimum 3 noci.“;
  `aria-describedby`), klik vetu zvýrazní a posunie kalendár do pohľadu; na mobile veta nad zeleným pásom. „Zmeniť“ v súhrne skryté, kým je
  kalendár otvorený; termín v súhrne krátko (`24. – 26. 11. 2026`, `29. 11. – 2. 12. 2026`). Riadok istoty sa zalamuje, neoreže sa.
  Playwright `cart.spec.ts` (veta, aria-disabled, aktívne po výbere, krátky dátum, istota v okne 1440 × 900; axe). Celá sada 44/44. (Claude Code)
- 2026-10-17 — Z28 (1. časť): **riadiace centrum v1.2.** Zostáva z doplneného zadania: drobčeky podľa spoločného pravidla aj v administrácii
  majiteľa (+ mobil „‹ Späť na …“, `PageHeader` s `breadcrumbs`) a klik na skupinu v menu → prvá podstránka.
  - **Menu:** tmavé, položky cez celú šírku (hover biela 6 %, aktívna 10 % + 3 px čiara, text vždy svetlý — rovnaké premenné ako v Z27).
    Klienti › Všetci klienti, Založiť klienta · v detaile klienta jeho názov › Prehľad, Moduly, Vzhľad, Domény, Ľudia, Záznam zmien ·
    Moduly › Katalóg, Skúšobné doby · Stav systému · Audit. Skupina klienta sa skladá v prehliadači podľa adresy. **Drobčeky** na podstránkach.
  - **Detail klienta so záložkami** `/platform/tenants/[id]/(modules|theme|domains|people|audit)`: hlavička so stavom, Stránka pre hostí ↗,
    Otvoriť administráciu ↗. Domény `*.localhost` so štítkom „len vývoj“; Vzhľad = farby, písmo, zaoblenie a náhľad s menom klienta
    a skutočnými textami (bez zástupného textu); Ľudia s posledným prihlásením (testovacie účty sa neukazujú).
  - **Zoznam klientov = rozbaľovacie riadky** (bočný panel klienta odstránený): tržby tento/minulý mesiac (`tenant_monthly_stats`),
    rezervácie 30 dní a posledná, obsadenosť 90 dní (rovnaký výpočet ako Prehľad majiteľa), zdravie, moduly s koncom skúšky, majiteľ
    (meno, e-mail, telefón, posledné prihlásenie); Otvoriť detail / administráciu ↗ / Stránka pre hostí ↗. Načíta sa pri rozbalení,
    s prednačítaním pri prejdení myšou a fokuse.
  - **Moduly:** katalóg ako rozbaľovacie riadky (popis, závislosti, počet klientov, hotový / v príprave — recenzie, správy s hosťom,
    push, SMS, online check-in, upsell len ako riadky), klienti s prepínačom a **Priradiť klientovi**; to isté v záložke Moduly;
    **Skúšobné doby** zoradené podľa konca. Každá zmena ide do auditu (`platform_set_module`).
  - **Audit:** filtre od–do, kategória (Prihlásenie, Vstup správcu, Moduly a skúšky, Tím a prístupy, Nastavenia, Klienti), klient, osoba,
    hľadanie; 50 na stranu, **CSV** (bodkočiarky, UTF-8 s BOM). **Úspešné prihlásenia** sa zapisujú (`audit_sign_in`: heslom / odkazom,
    nikdy heslo ani zadaný e-mail; pri jednom klientovi patria jemu) + pgTAP. Neúspešné pokusy ostávajú len v limite podľa IP
    (`request_attempts`), v audite sa neukazujú — jednoduchší spôsob nebol.
  - **Drobnosti:** ukážkové kalendáre (`example.invalid`) sa v Stave systému a v zdraví klienta nehlásia ako chyba (štítok „ukážkový“).
  - Playwright `platform-v12.spec.ts` (menu a hover, drobčeky, rozbalenie klienta, priradenie modulu na dočasnom klientovi, filtre auditu
    a CSV; axe), staré testy na panel upravené. Prehliadka správcu: nové snímky a verzia. Celá sada 37/37 (test „02 overview“ na mobile
    občas prekročí čas pri plnej sade, samostatne prechádza — sledovať). (Claude Code)
- 2026-10-17 — Z29: **košík v2.2 pre 13″ notebook.** Zelený súhrn 320 px sa na 1440 × 800 vojde celý (názov, termín + „Zmeniť“
  vo všetkých krokoch, dospelí, cena + rozpis, Vaše doplnky; dole „← Späť na …“, tlačidlo a jeden riadok storna z podmienok objektu);
  istoty, referencia a Jana zo súhrnu presunuté do krokov. Krok 1 bez fotiek: s termínom začína doplnkami (jednoriadkové riadky ~54 px,
  rozbalenie na mieste, jeden naraz), referencia na sivej karte; bez termínu / po „Zmeniť“ kalendár + „Hotovo“ (Pokračovať stlmené).
  Krok 2: karta „Otázky pred rezerváciou? Odpovedá Jana.“ (WhatsApp, Zavolať — len s údajmi majiteľa). Krok 3: tri istoty nad súhlasmi.
  Lišta krokov 52 px, hotové kroky klikateľné späť. Znenie záväzného tlačidla nemenené (právny text). Termín z kalendára na stránke sa
  odovzdá košíku (otvorí sa rovno doplnkami). Prístupnosť: ceny v kalendári tmavšie (kontrast 4,37 → ≥ 4,5), „Zmeniť“ biele.
  Teardown e2e maže podržania termínu (limit 3 na jednotku blokoval opakované behy). Playwright `cart.spec.ts` (1440 × 800 bez posúvania
  súhrnu aj s 2–3 doplnkami, rozbalenie, Zmeniť → Hotovo, kroky 1–3; mobil 390 px; axe). (Claude Code)
- 2026-10-17 — Z27: **administrácia v1.2.**
  - **Menu so skupinami:** Rezervácie › Zoznam, Kalendár, Blokácie · Objekt › Údaje, Fotky, Ceny a sezóny, Stránka, Dokumenty
    (pri viacerých objektoch len „Objekty“ → zoznam) · Ponuka › Doplnkové služby, Referencie · Štatistiky · Prepojenia › Booking a Airbnb ·
    Nastavenia › Všeobecné, Tím, E-maily a upozornenia. Položky cez celú šírku, čiara medzi hlavnými, aktívna s 3 px čiarou,
    `aria-expanded`, skupina aktívnej stránky otvorená; moduly sa zaraďujú cez `group` v manifeste. **Platby** vynechané — nastavenia
    platby sú na stránke Všeobecné, samostatná stránka zatiaľ nie je. Zbalené menu: pri prejdení myšou/fokuse sa rozbalí celé
    (rovnako ako doteraz), takže skupiny sú viditeľné bez samostatného vyskakovacieho zoznamu. Farby menu cez premenné — tmavé menu
    riadiaceho centra má už hover biela 6 % / aktívna 10 % (Z28.1 tým čiastočne hotové).
  - **Štatistiky** (`/admin/statistics`): funkcia `tenant_monthly_stats` (tržby podľa termínu pobytu, noci rozdelené do mesiacov, len priame
    zaplatené; obsadenosť s portálmi bez blokácií; RLS) + pgTAP na prelom mesiaca a roka, zrušené a prázdne mesiace. Obdobie rok / 12 mesiacov,
    porovnanie s minulým rokom, 5 čísel, SVG graf (plná/bodkovaná/sivá, najsilnejší/najslabší, klik na mesiac → bublina + riadok) a tabuľka.
    Provízia portálov už bola v Nastaveniach (`portal_commission_bp`) — použitá. **Prehľad:** malý graf 12 mesiacov a „Tržby priamo“ roka
    teraz z tej istej funkcie (predtým podľa dátumu vytvorenia — čísla sa líšili).
  - **Zvonček** vpravo hore v spoločnej hornej lište (administrácia: hľadanie, Stránka pre hostí, zvonček, + Ručná rezervácia; riadiace
    centrum: zvonček; mobil: v hornej lište). Tabuľky `notifications` + `notification_reads` (RLS: člen tímu len svojho klienta, platformové
    len správca; zapisujú len databázové funkcie) + pgTAP. Vznikajú triggermi z udalostí (nová rezervácia, platba prijatá — kto ju označil,
    má ju prečítanú, žiadosť o storno, zrušenie, obsadenosť z portálu mimo prvého importu, kolízia, zlyhaná synchronizácia, neodoslané
    e-maily, nový klient) a každých 15 min (`notify_scheduled`: splatnosť do 24 h, koniec skúšky 7 a 1 deň). Jedna udalosť = jedno upozornenie;
    so zmazanou rezerváciou/obsadenosťou/kalendárom zmiznú aj jej upozornenia. **Nastavenia → E-maily a upozornenia** (len na čítanie).
  - **Ukážkové dáta:** `npm run demo-data` pridá 22 mesiacov histórie (45 rezervácií cez rovnaký výpočet ceny, zopár zrušených, pobyty
    z portálov, zima a leto silnejšie) a pár upozornení; e-maily z ukážky sa neposielajú.
  - Playwright `admin-v12.spec.ts` (menu, štatistiky, zvonček; PC aj 390 px, axe), prehliadka „Čo je nové“ v1.2 pre majiteľa
    (12 snímok, nové menu/Štatistiky/zvonček na začiatku). Celá sada 35/35. (Claude Code)
- 2026-10-17 — Z26: **rýchlosť bočného panela a dokumenty.** Meranie: funkcie Vercelu bežali v **iad1 (Washington)**
  (`X-Vercel-Id: fra1::iad1`), databáza vo Frankfurte; panel = celé nové vykreslenie stránky (~10–20 dotazov za sebou) → ~3 s
  na stagingu, ~850 ms lokálne bez akejkoľvek odozvy. Úpravy: `vercel.json` región **fra1** (bezplatný plán, jeden región);
  panely rezervácie a klienta sa otvárajú **hneď** — klik len zmení adresu (`history.pushState`), zoznam ani počty sa znova
  nenačítavajú, kostra panela hneď, detail zo samostatnej serverovej funkcie (`UrlPanel`, `loadReservationPanel`,
  `loadTenantPanel`), prednačítanie pri prejdení myšou / fokuse, po zmene sa detail obnoví. Po: panel viditeľný ~45 ms,
  plný detail ~320 ms (znova ~50 ms) — `docs/kontrola-mvp.md`, skript `scripts/perf-panel.mjs`. **Dokumenty v paneli:**
  nahrávanie za „Nahrať dokument“, nová veta „Hosť si ich stiahne vo svojom účte.“, v sekcii aj dokumenty objektu, ktoré hosť
  dostane (podľa viditeľnosti a stavu) s odkazom „upraviť pri objekte →“; pri objekte veta, že dokument pre jedného hosťa sa
  nahráva v jeho rezervácii. Playwright: panel hneď po kliku bez nového načítania zoznamu, dokumenty objektu v paneli. (Claude Code)
- 2026-10-17 — Z25: **riadiace centrum, roly a vstup správcu.** Grafitové bočné menu so štítkom „Riadiace centrum · vidíš len ty“,
  samostatné stránky Klienti / Moduly / Stav systému (kontroly po klientoch: kalendáre, neodoslané e-maily, posledná synchronizácia
  a odoslanie) / Audit (preložené záznamy); „Do administrácie“ z menu preč. **Vstup správcu:** „Otvoriť administráciu“ v paneli klienta
  otvorí novú kartu cez `/platform/enter/<id>` — overí správcu, zapíše `admin.entered` do auditu a nastaví cookie `admin_view_tenant`
  (8 h); administrácia potom beží pre daného klienta **bez členstva**, s grafitovým pruhom „Prezeráš ako správca: … · Späť do riadiaceho
  centra“ (`/platform/leave`). **RLS som nemenil** — všetky politiky už pustia správcu platformy (`or is_platform_admin()`), cookie
  platí len spolu s touto rolou. Výber ubytovania len pri viac ako jednom (inak len názov). Panel klienta v jednom stĺpci: súhrn s verejnou
  adresou ↗ (nikdy `*.localhost`), kontakt = majiteľ bez testovacích účtov, moduly ako riadky (stav, koniec skúšky na druhom riadku,
  Uložiť pri riadku), ľudia (meno · e-mail, rola), prevádzka, vzhľad, posledné zmeny zbalené; Stránka pre hostí a Otvoriť administráciu
  v novej karte. **Nový objekt** vidí a môže založiť len správca (formulár aj serverová akcia). Testovaciemu správcovi
  qa-admin@booking-platform.test som odobral staré členstvo u STRÖMY (aby test overoval vstup bez členstva); členstvá info@obrazne.sk
  nedotknuté. Playwright: vstup správcu (nová karta, pruh, audit, späť), majiteľ info+jana@ (bez výberu, bez riadiaceho centra a „Nový
  objekt“), stránky riadiaceho centra. Prehliadka správcu: nové snímky a texty, verzia 2026-10-17.3. (Claude Code)
- 2026-10-17 — Z24: **vzory administrácie v1.1.** Panel záznamu má **jeden stĺpec**: prilepená hlavička, súhrnná karta
  (`PanelSummary` — meno, kontakt, mriežka Príchod · Odchod · Noci · Hostia · Suma · Zdroj · Ubytovanie), hlavná akcia (platba),
  sekcie pod sebou, História a Súhlasy zbalené s počtom (`PanelCollapsible`), prilepená spodná lišta; dlhé mená, e-maily a slová sa
  zalamujú kdekoľvek (Playwright test s dlhými textmi na PC aj 390 px). Prerobený panel rezervácie a kalendára; `PanelColumns` zrušený.
  **Plochy:** token `--surface-card` #fafaf8 + vlasová linka #ecebe6, trieda `surface`; všetky karty administrácie (`[data-slot=card]`)
  ho majú automaticky, aj natívne `select` sú pilulky. **Rozbaľovacie riadky** `ExpandableList` (naraz jeden, `aria-expanded`,
  formulár „Pridať …“ ako nový riadok navrchu, po uložení sa zavrie): Doplnkové služby, Referencie (namiesto panela), importované
  kalendáre (názov a portál raz), Blokácie, Tím, miesta v okolí. Drobnosti: súhlasy a záznam zmien cez preklady (`auditLabel`),
  dokumenty jedným tlačidlom „Nahrať súbor“ (výber súboru hneď nahrá, bez názvu sa použije meno súboru) a v jednom stĺpci, širšie
  odsadenie bočného menu. Prehliadka „Čo je nové“: nové snímky, verzia 2026-10-17.2. (Claude Code)
- 2026-10-17 — Z23: **administrácia, riadiace centrum a prihlásenia podľa vizuálu v1.** Spoločné: bočné menu podľa dosky Sidebar
  (výber ubytovania, Obsadenosť, Tím/Nastavenia/Riadiace centrum, používateľ s Čo je nové · Odhlásiť, odznak čakajúcich platieb;
  zbaľovanie, pripnutie, rozbalenie aj klávesnicou), **`SidePanel`/`RecordPanel` 680 px, dva stĺpce od 1024 px**, nemodálny — klik na
  iný riadok prepne záznam, klik vedľa / Esc / Späť / krížik zatvorí, na mobile cez celú obrazovku s „‹ späť“ a lištou dole; polia
  ako pilulky (CSS cez `[data-admin-ui]`, košík hosťa nedotknutý); farby stavov a obsadenosti na jednom mieste (`src/core/admin/status.tsx`);
  téma platformy (Roboto, smrekovo zelená) aj v administrácii. **01** `/login` rozdelená obrazovka + prihlasovací odkaz na e-mail len
  pre existujúce účty administrácie (odpoveď neprezradí účet, limit podľa IP `staff_link`, odkaz z `APP_URL`, nie z hlavičky Host);
  názov platformy a e-mail podpory v `src/core/admin/brand.ts`. **02** prehľad: pozdrav, teplé karty čakajúcich platieb (Platba prijatá)
  aj žiadostí o storno, 4 čísla vrátane „Ušetrené na províziách ≈“ (nové `tenant_settings.portal_commission_bp`, predvolene 15 %,
  v Nastaveniach), najbližšie pobyty, obsadenosť 12 týždňov, stav synchronizácie. **03** rezervácie: filtre stavu ako pilulky s počtom,
  hľadanie, filter príchodu, panel podľa dosky vrátane **Predĺžiť splatnosť** (nová funkcia `extend_payment_due`, len personál, len
  čakajúce, max 14 dní). **04** kalendár: 2 mesiace (mobil 1), pásy od poludnia do poludnia, ceny vo voľných dňoch, panel podľa typu
  (rezervácia / portál / blokácia s úpravou dôvodu), výber dní → „Nový termín“ s cenou z toho istého výpočtu ako web, minimum nocí
  a kolízia; šípky a Enter. Ručná rezervácia sa dá predvyplniť z kalendára a **personál ju môže vytvoriť aj mimo pravidiel pobytu**
  (kratšie ako minimum — návrh: „hosť by si ho nevybral, ručne sa dá“), ceny rovnaké. **05** riadiace centrum: vlastné menu, čísla,
  klienti s modulmi, panel klienta (moduly, ľudia, prevádzka, vzhľad, zmeny), len počty bez údajov hostí. **06–07** mobil.
  **08** prihlásenie hosťa: fotka objektu, políčka na kód podľa skutočnej dĺžky kódu (vloženie celého kódu, posun), Zmeniť e-mail,
  Poslať znova po 45 s s novou captchou. 3 migrácie na stagingu, pgTAP (`admin_v1` 6, `request_limits` +1), 2 unit testy, Playwright
  `e2e/admin-v1.spec.ts` (PC aj 390 px, axe bez vážnych nálezov), snímky prehliadky obnovené a verzia zvýšená na 2026-10-17. (Claude Code)
- 2026-10-16 — **Captcha Cloudflare Turnstile** (managed) v kroku Platba košíka (odoslanie rezervácie aj overenie promo kódu)
  a pri žiadosti o kód do zóny hosťa; token sa overuje na serveri cez siteverify popri HMAC tokene a honeypote (`src/core/security/`).
  Token platí raz → po kontrole promo kódu a po odmietnutom odoslaní sa widget obnoví. Overenie zlyhá „nakrátko“ (bez tokenu alebo
  bez spojenia s Cloudflare = nie). Bez `TURNSTILE_SECRET_KEY` / `NEXT_PUBLIC_TURNSTILE_SITE_KEY` sa captcha vynechá (lokálne, CI).
  **Limit podľa IP** za hodinu: rezervácia 10, promo kód 30, žiadosť o kód 10, zadanie kódu 30 (zadanie kódu bez druhej captchy —
  kód je tajomstvo a chyby na e-mail sú už obmedzené). Tabuľka `request_attempts` ukladá len HMAC odtlačok IP, funkcia
  `hit_request_limit` počíta atomicky, prekročené pokusy nezapisuje a staré riadky (> 1 deň) maže; požiadavky bez verejnej IP
  (lokálny server, Playwright) sa neobmedzujú, chyba DB hostí neblokuje. Migrácia na stagingu, pgTAP test (8), unit testy (5).
  Playwright: `npm run e2e:server` (build + štart s verejnými testovacími kľúčmi Turnstile, ktoré vždy prejdú). (Claude Code)
- 2026-10-16 — Z22: **prehliadka „Čo je nové“** pre majiteľa (11 snímok) a správcu (8 snímok, riadiace centrum). Okno so snímkou,
  nadpisom, dvoma vetami, bodkami, Späť / Ďalej / Ukázať mi to, Esc a šípky; na mobile cez celú obrazovku s posunom prstom. Otvorí sa
  samo raz po prihlásení pri novej verzii (`profiles.tours_seen`, funkcia `mark_tour_seen` — každý zapisuje len sebe), znova z menu účtu
  **Čo je nové**. Snímky `npm run tour:screens` z ukážkových dát (1440 px) → `public/tours/`; e-maily a mená mimo ukážky rozmazané,
  karty na spoločnej stránke riadiaceho centra zvýraznené rámikom. Na stagingu pribudol testovací účet qa-admin@booking-platform.test
  (správca platformy, prihlásenie len odkazom cez serverový kľúč) kvôli snímkam. Playwright `tour.spec.ts` (počítač aj 390 px, axe). (Claude Code)
- 2026-10-16 — Z21: **ukážkové dáta STRÖMY na stagingu** (`npm run demo-data`, `-- --reset`). Rezervácie cez tú istú databázovú funkciu
  a výpočet ceny ako web: (a) 2026-0088 12.–15. 2. 2027, čaká na platbu, so šéfkuchárom; (b) 2026-0089 24.–28. 12. 2026, potvrdená
  a zaplatená, s dokumentom k rezervácii; (c) 2026-0090 7.–10. 8. 2026, ukončená. Ubytovací poriadok (PDF) pri objekte, 2 udalosti
  z iCal (Booking, Airbnb — kanály vypnuté, nič sa nesťahuje), blokácia „Údržba sauny“, modul Služby v skúške do 15. 11. + záznam v audite.
  Martin (info@obrazne.sk) už mal na stagingu členstvo **majiteľa** v STRÖMY — ponechané. Zóna hosťa: demo-host@obrazne.sk (kód príde
  cez presmerovanie stagingu na info@obrazne.sk). E-maily z ukážky sa neodoslali (označené „DEMO — neodoslané“). (Claude Code)
- 2026-10-16 — Z20: **potvrdenie rezervácie v2.1** (`/r/<kód>`). Príčina „čistej“ stránky: otvorila sa na adrese, ktorú systém
  nepriradil klientovi (technická adresa stagingu) → stránka teraz vždy presmeruje na verejnú doménu klienta, takže má jeho hlavičku,
  pätu a tému. Úvod s krstným menom a stavom, karta platby (QR, Suma/IBAN/VS s **Kopírovať**, termín úhrady), zelený pruh po zaplatení,
  **Čo bude ďalej** (4 kroky podľa stavu, dni pred príchodom z nastavení), zelený panel s fotkou, sumou, **Pridať do kalendára** (.ics —
  adresa len pri presnej polohe, inak mesto) a kontaktom; rozpis, účet hosťa, zmena plánov (formulár storna až po kliknutí), „Rezervovať
  znova“ po ukončení. Mobil: údaje pred QR + **Uložiť QR** (PNG). Playwright `confirm.spec.ts` (oba stavy, počítač aj 390 px, axe) —
  celá sada 12/12. (Claude Code)
- 2026-10-16 — Úlohy Z21 (ukážkové dáta na stagingu) a Z22 (prehliadka „Čo je nové“ pre majiteľa a správcu); A15, rozhodnutie. (Claude chat)
- 2026-10-16 — Vizuál **v2.1: potvrdenie rezervácie** (počítač aj mobil, stav čaká/zaplatené, Kopírovať, Pridať do kalendára) → `docs/navrhy/stranka-hosta/`, `docs/vizual-stranka-hosta.md`; úloha Z20. (Claude chat)
- 2026-10-16 — Z19: stránka hosťa, galéria a košík podľa **vizuálu v2**. Dáta (migrácia len pridáva): tabuľka **referencií**
  (skopírované z objektov, zvýraznené max. 5, zdroj, mesiac pobytu, zverejnená) + `reviews_url`, **kategória fotky** (albumy),
  **zvýraznené vybavenie** s popisom, **poloha** presná / približná (pri približnej návštevník nevidí ulicu ani súradnice ani cez API —
  funkcia `property_public_location` zaokrúhli na ~1 km) a **miesta v okolí**, téma v2 (doplnková medená farba na štítky, zaoblenie 10,
  tmavší odtieň akcentu pre plochy s bielym textom). Sekcie v2: úvod (galéria 1+2+5, referencia so šípkami, malá mapa, karta údajov,
  zelený panel), čo vás čaká (mriežka 3/2 so šachovnicou), kalendár na páse, okolie s mapou **OpenStreetMap (statické dlaždice, bez
  cookies a kľúča)**, tichý cenník s „v cene“, **pohľad dovnútra** (mozaika), referencie, dobré vedieť, zelená záverečná výzva
  s **najbližším voľným termínom** (počíta server). Predlohy v2 a existujúce stránky prestavané (texty sekcií ostali). **Galéria v okne**
  (albumy, mriežka, veľká fotka s pásom náhľadov, referencie vpravo; mobil prepínač Fotky/Referencie). **Košík v2** (do 1040 px, kroky
  vľavo, zelený súhrn vpravo s tlačidlom dole, doplnky ako rozbaľovacie riadky v kroku 1, zbaľovací kalendár; mobil cez celú obrazovku,
  zelený pás, rozpis zospodu). Správanie: tlačidlá neposúvajú stránku, naraz jedno okno, Esc a Späť zatvoria jednu úroveň.
  Administrácia: Referencie (zoznam + panel), album pri fotkách, záložka Poloha a okolie, zvýraznené vybavenie v záložke Stránka
  (upozornenie, ak počet nie je 3/6/9), odkaz na hodnotenia v Nastaveniach. Seed: kategórie fotiek, okolie (orientačné, ukážkové),
  referencie. 11 nových pgTAP (spolu 139), Playwright 9/9 na PC aj 390 px vrátane axe → `docs/kontrola-mvp.md`. (Claude Code)
- 2026-10-16 — Vizuál stránky hosťa **v2 schválený** (galéria a referencie ako Booking, mapa, košík v2, mobil) → `docs/navrhy/stranka-hosta/`, `docs/vizual-stranka-hosta.md`; architektúra (B1, B7, A12), rozhodnutie; úloha Z19. (Claude chat)
- 2026-10-16 — Z18: v editore objektu záložka **Stránka** — sekcie v poradí s vypínačom (kalendár je povinný, nedá sa vypnúť ani
  odstrániť), presúvanie šípkami aj klávesnicou (Alt + šípka na riadku), úprava v bočnom paneli (A18) cez **formulár generovaný zo zod
  schémy typu** (texty zatiaľ po slovensky, výber fotky z fotiek objektu, položky „Čo vás čaká“ z vybavenia objektu alebo vlastné,
  opakované položky s pridaním/presunom/odstránením; server obsah znova overí schémou), pri sekcii odkaz, kde sa menia údaje zo systému,
  „Pridať sekciu“ z chýbajúcich typov, odstránenie, „Obnoviť podľa predlohy“ s potvrdením (`owner_reset_sections`), náhľad stránky
  v novom okne. 2 nové pgTAP testy (spolu 128), 2 unit, Playwright test (vypínač, poradie klávesnicou, formulár) — stránku STRÖMY
  po sebe vráti do pôvodného stavu. Fronta Z16–Z18 hotová. (Claude Code)
- 2026-10-16 — Martin súhlasí s Cloudflare Turnstile (zadarmo); čaká sa na jeho účet Cloudflare a kľúče — zapísané v Otázkach. (Claude Code)
- 2026-10-16 — Z17: účet a zóna hosťa na doméne klienta (`/ucet`). **Prihlásenie kódom na e-mail** — kód vydá Supabase, ale e-mail
  posiela náš systém v téme klienta (nie spoločné e-maily Supabase); limit 5 kódov a 8 chybných pokusov za hodinu na e-mail,
  odpoveď neprezradí, či e-mail má pobyty; **účtom personálu a správcu platformy sa kód neposiela** (tie sa prihlasujú heslom).
  Po overení sa priradia doterajšie pobyty (overený e-mail). Na stránke rezervácie „Vytvoriť účet“ (kód na e-mail rezervácie).
  Zóna: najbližší pobyt ako karta hore, ďalšie a minulé ako zoznam; detail pobytu — platba s QR kým nie je zaplatené, pokyny
  k príchodu a kódy podľa pravidiel Z13 (inak vysvetlenie kedy), dokumenty (odkaz platný 10 min), rozpis, žiadosť o storno,
  **Rezervovať znova** (objekt, jednotka, hostia a služby predvyplnené); úprava kontaktu, **odvolanie marketingového súhlasu
  jedným klikom s históriou** (`guest_consent_events`), kontakt WhatsApp/telefón, odhlásenie. Doklady skryté. Administrácia:
  záložka Dokumenty pri objekte a dokumenty v paneli rezervácie (vždy / po potvrdení). Pokyny k príchodu sa upravujú v Údajoch
  objektu (zo Z8). 9 pgTAP testov, Playwright test celej zóny (6/6 testov prehliadačom). (Claude Code)
- 2026-10-16 — Z16: kontrola pred ukážkou → `docs/kontrola-mvp.md`. **Playwright** (`npm run e2e`, lokálne proti stagingu): rezervácia
  hosťa na PC aj mobile 390 px (kalendár, košík, služba, súhlasy, QR, odkaz, storno), majiteľ (ručná rezervácia, Platba prijatá,
  blokácia, kolízia z iCal), kalendár klávesnicou, axe bez nálezov — 5/5. **Nezávislá bezpečnostná kontrola** (samostatný agent):
  opravené 2 vážne (hosť si mohol zmeniť e-mail vo svojom zázname a prevziať cudzie budúce rezervácie; holdom sa dal zablokovať
  celý kalendár) a ďalšie (podpísaný čas formulára, SSRF pri iCal, časové pásmo, e-mail v profile, token exportu, presmerovanie
  po prihlásení, bezpečnostné hlavičky) — migrácia + 9 pgTAP testov (spolu 117). Prístupnosť: popisy dní kalendára, fotiek a QR,
  kontrast druhej vety nadpisov (`#84888e`). Rýchlosť: fotky cez `next/image` (AVIF), detail na mobile LCP 2,4 s. Testovacie
  e-maily na `*.test` sa neodosielajú. Ostáva: captcha a limit požiadaviek (otázka). (Claude Code)
- 2026-10-16 — Referencie: samostatná tabuľka, zvýraznené v košíku, pravidlá EÚ o recenziách (B1, rozhodnutie). Úloha príde spolu s košíkom v2. (Claude chat)
- 2026-10-16 — Vyhľadávací pás na web klienta vyradený z fronty (Martin: teraz ladíme len našu aplikáciu); fronta Z16–Z18. (Claude chat)
- 2026-10-16 — Fronta Z16–Z19 (kontrola, vyhľadávací pás, zóna hosťa, sekcie v administrácii). (Claude chat)
- 2026-10-16 — Z15: stránka hosťa podľa vizuálu v1 (rozdiel oproti Z9): **prilepený tmavý pruh** po zrolovaní pod úvod (názov, termín
  a noci, Spolu + cena na osobu, „Pozrieť pobyt“; bez termínu posunie na kalendár; skrytý pri otvorenom košíku), malý panel pri úvode
  bez „Rozbaliť“, **„Pozrieť pobyt“** na stránke, v pruhu aj na mobile (záväzné tlačidlo len v kroku 3), služby na stránke nie sú
  (len v košíku), galéria na mobile cez celú šírku. Overené: STRÖMY 21.–24. 12., 8 osôb = 2 900 € v paneli, pruhu aj košíku. (Claude Code)
- 2026-10-16 — Z14: detail objektu zo sekcií (B7). Tabuľka `property_sections` (typ, poradie, zapnutá, obsah JSON s prekladmi) + RLS,
  kalendár sa nedá vypnúť (aj v DB), **predlohy `section_templates`** (celý objekt, penzión s izbami, apartmány, glamping) — nový objekt
  dostane predlohu automaticky (podľa typu ubytovania, inak podľa režimu), existujúce doplnené. Register typov v kóde
  (`src/core/sections`: komponent + zod schéma; moduly cez `sections` v manifeste — `services` → „Na objednávku“, v predlohách nie je).
  Neplatný obsah alebo neznámy typ sa zapíše do logu a sekcia sa vynechá; prázdna sekcia sa skryje. Údaje zo systému (ceny, min. noci,
  storno, príchod/odchod, vybavenie, spôsob účtovania → nadpis cenníka) idú z dát. 15 typov podľa vizuálu v1 (galéria, úvod s panelom,
  čo vás čaká, fotka cez šírku, kalendár na svetlom páse, tmavý cenník, v cene, jednotky, o objekte, okolie, referencie, časté otázky,
  dobré vedieť, kontakt, záverečná výzva). Seed: STRÖMY s textami sekcií, showroom s rôznymi predlohami. Rovné rohy pri okrajoch
  obrazovky už sedeli (panely, spodný pás). 11 nových pgTAP testov (spolu 108) + 3 unit. (Claude Code)
- 2026-10-16 — Z13: dáta pre zónu hosťa (bez rozhrania). `guests` u klienta (e-mail jedinečný v rámci klienta; ten istý e-mail
  u dvoch klientov = dvaja hostia), rezervácia sa pri vzniku priradí hosťovi (trigger, existujúce doplnené), prepojenie na prihlásenie
  `claim_guest_account` len s overeným e-mailom, RLS: hosť vidí len svoje rezervácie, položky, riadky a platby u daného klienta.
  Dokumenty pri objekte alebo rezervácii v súkromnom buckete `guest-documents` (dočasné odkazy vydá server), viditeľnosť
  „vždy / po potvrdení“. Prístupové kódy `guest_arrival_instructions` len pri potvrdenom pobyte X dní pred príchodom. 12 nových testov. (Claude Code)
- 2026-10-16 — Z12: iCal. Export pre každú jednotku `/ical/<token>.ics` (len „obsadené“, bez údajov hostí); pre každý importovaný kanál
  samostatná adresa bez jeho vlastných udalostí (`?exclude=`), aby sa kalendáre neodrážali. Import kanálov (Booking, Airbnb, iný) —
  `ical_apply` v jednej transakcii: nové udalosti blokujú, **kolízia sa uloží ako neblokujúci konflikt a príde e-mail majiteľovi**
  (len pri novej/zmenenej kolízii, nie pri každej synchronizácii), zmiznuté udalosti termín uvoľnia. Synchronizácia vo workeri
  každých 5 minút, „Synchronizovať teraz“ v administrácii, ochrana pred internými adresami (len https, žiadne IP/localhost).
  Riadiace centrum: zdravie klienta (posledná rezervácia, kalendáre s chybou/kolíziou, neodoslané e-maily). Overené naživo
  (85 udalostí z verejného kalendára, export). CI bolo od Z10 červené kvôli testu predvolenej farby — opravené, 85 pgTAP + 37 unit. (Claude Code)
- 2026-10-16 — Z11: e-maily cez **Resend** (bezplatný plán, kľúč v `.env.local` a vo Verceli). Databáza zapisuje správy do fronty
  `email_outbox` (triggery na históriu stavov a žiadosť o storno; funkcia na pripomienku platby v posledných 6 h a pokyny pred príchodom
  X dní vopred), aplikácia ich vykreslí (preklady, farba témy) a odošle s opakovaním (2–16 min, potom failed). Platobné údaje s QR
  PAY by square ako vložený obrázok. Odkaz na rezerváciu v neskorších e-mailoch: token šifrovaný kľúčom z Vault (lookup ostáva cez hash).
  Worker `/api/jobs/run` volá **pg_cron + pg_net každú minútu** (tajomstvo v Vault; staging chránený Vercelom → vytvorený
  „automation bypass“ token pre tento worker). Na stagingu všetko **presmerované na info@obrazne.sk** (príjemca v predmete), odosielateľ
  testovacia doména Resend — vlastnú doménu (DNS) som nenastavoval. STRÖMY dostal na stagingu adresu `chalet-stromy-demo.vercel.app`
  (odkazy v e-mailoch na doménu klienta). Overené: 2 testovacie e-maily odoslané. (Claude Code)
- 2026-10-16 — Z10: rezervácie v administrácii — zoznam (stav, zdroj, príchod od–do, hľadanie, triedenie, stránkovanie, CSV) a bočný
  panel (rozpis, platba s VS a splatnosťou, **Platba prijatá**, Hosť prišiel / Pobyt ukončený, zrušenie s dôvodom, žiadosť hosťa
  o storno a jej zamietnutie, interné poznámky, história stavov s autorom, súhlasy). Kalendár obsadenosti mesiac × jednotky
  (rezervácie podľa stavu, blokácie, iCal, kolízie, rozpracované). Prehľad: dnešné príchody a odchody, čakajúce platby, žiadosti o storno.
  Ručná rezervácia rovnakým výpočtom ceny a tou istou DB funkciou (zdroj „ručná“, potvrdená alebo čaká na platbu, voliteľne zaplatená).
  **Automatické zrušenie po lehote: pg_cron v databáze každých 5 minút** (`expire_pending_reservations`), nezávisle od webu —
  Vercel Hobby dovoľuje cron len raz denne. Overené: potvrdenie platby 2026-0001, ručná 2026-0003. (Claude Code)
- 2026-10-16 — Vizuál stránky hosťa **v1 schválený** → `docs/navrhy/stranka-hosta/` + `docs/vizual-stranka-hosta.md`; úloha Z15. (Claude chat)
- 2026-10-16 — Z9 prerobená podľa schváleného vizuálu (`docs/vizual-stranka-hosta.md`): Roboto + JetBrains Mono, kicker, nadpis
  z dvoch viet (`properties.tagline`), linky `#e9e5db`, karty 24, jeden akcent (STRÖMY smrekovo zelená). Kalendár: sezóny podfarbené
  (`seasons.color`) s legendou, cena v dni, náhľad rozsahu, tmavá bublina (deň, sezóna a cena, min. noci a zľava; pri odchode cena pobytu,
  upozornenie pod minimom, nedá sa cez obsadené dni), nápoveda pod kalendárom. **Košík** ako bočný panel v troch krokoch (Váš pobyt —
  termín, hostia, Spolu a cena na osobu a noc, rozpis, istoty, kontakt WhatsApp/telefón z `tenant_settings`, jedno odporúčanie;
  Údaje a želania — kontakt, služby ako riadky s detailom posunom v paneli; Platba — súhrn, promo kód, súhlasy). Na mobile spodný pás
  a košík cez celú obrazovku. Bez nátlakových prvkov. Téma klienta platí na celej stránke (aj pre panely mimo stromu stránky).
  Pôvodná samostatná stránka formulára zrušená. Overené: STRÖMY 21.–24. 12. 2026, 8 osôb = 2 900 € (121 € na osobu a noc),
  so šéfkuchárom 3 420 €, rezervácia 2026-0002. Otvorené body návrhu (služby na stránke jednou vetou — tak je, zjednodušenie pravého
  panela) ponechané podľa návrhu Claude. (Claude Code)
- 2026-10-16 — Stránka objektu zo sekcií (B7, rozhodnutie), pravidlo rovných rohov pri okraji obrazovky; úloha Z14. (Claude chat)
- 2026-10-16 — Z9: stránka hosťa v téme klienta, neindexovaná. Katalóg s filtrami (typ, región, hostia, termín cez `free_units`);
  klient s jedným objektom ide rovno na detail aj s parametrami z widgetu. Detail: galéria, údaje, popis, jednotky (výber), vybavenie,
  v cene, cenník sezón, pravidlá, storno, referencie a rezervačný box s **kalendárom ako samostatným komponentom**
  (`src/core/booking/availability-calendar.tsx` — obsadenosť, cena za noc v dni, min. noci podľa dňa príchodu, dni príchodu).
  Rezervačný formulár: osoby, zvieratá, služby (modul), voliteľné poplatky, údaje, poznámka, promo kód (overí server — kódy sa nikdy
  neposielajú do prehliadača), súhlasy (VOP a storno povinné, marketing nepovinný a nezaškrtnutý), živý rozpis. Dočasná blokácia termínu
  pri otvorení formulára (30 min, opakované otvorenie ju neblokuje). Server prepočíta cenu a vytvorí rezerváciu so service kľúčom;
  ochrana proti robotom: skryté pole + minimálny čas vyplnenia. Stránka rezervácie cez tajný odkaz: stav, platobné údaje,
  **QR PAY by square**, rozpis, žiadosť o storno. Overené na stagingu: STRÖMY 5.–8. 2. 2027, 4 osoby, raňajky, kód ZIMAVJASNEJ15
  → 2 347,50 €. Oprava: politika číselníkov odkazovala na `tenants` (hosť nemal prístup) — nová migrácia + test. (Claude Code)
- 2026-10-16 — Zóna hosťa (B10) v architektúre, Fáza 4 a príprava dát Z13. (Claude chat)
- 2026-10-16 — Schválený vizuál stránky hosťa → `docs/vizual-stranka-hosta.md`, odkaz v Z9. (Claude chat)
- 2026-10-16 — Z8: administrácia objektov (zoznam, založenie s predvolenou jednotkou a sezónou; editor s kartami Údaje — údaje, texty
  viacjazyčne, vybavenie z číselníkov, neverejné pokyny k príchodu; Fotky — nahrávanie so zmenšením v prehliadači na 2 000 px, popis,
  poradie, mazanie; Sezóny a ceny — tabuľka cenníka, termíny aj cez Nový rok, dni príchodu, min./max. nocí, ceny po jednotkách,
  upozornenie na prekryv sezón a chýbajúcu predvolenú; Poplatky a zľavy; Jednotky pri režime po jednotkách), služby (modul), blokácie,
  nastavenia klienta (IBAN, lehota, blokácia, storno, právne odkazy, e-mail majiteľa, dni pred príchodom). Testovací prístup bez hesla:
  `scripts/qa-login-link.mjs` vytvorí používateľa qa@booking-platform.test (majiteľ ukážkových klientov) a jednorazový odkaz cez `/auth/confirm`. (Claude Code)
- 2026-10-16 — Z7: dátový model B1 celý (objekty, jednotky, číselníky, fotky, vekové pásma, sezóny s opakovanými rozsahmi aj cez Nový rok,
  ceny, poplatky vrátane vratnej kaucie, zľavy, služby, iCal kanály, rezervácia s položkami/riadkami/platbami/históriou/súhlasmi/poznámkami,
  obsadenosť). **Dvojitej rezervácii bráni `EXCLUDE USING gist` nad obsadenosťou** (aj pre súbežné zápisy); upratovací deň predlžuje rozsah;
  kolízia z iCal sa uloží ako neblokujúci konflikt. Rezervácia vzniká len funkciou `create_reservation` so service kľúčom (server prepočíta cenu),
  stavy len cez funkcie s históriou, hosť cez odkaz s tokenom (uložený len hash). Výpočet ceny `src/core/pricing` — **zľavy sa nesčítavajú,
  vyhráva najvýhodnejšia**; služby sú cenový príspevok modulu. 75 pgTAP + 35 unit testov. Seed: STRÖMY s reálnymi údajmi a 26 fotkami
  v úložisku, showroom 6 vymyslených objektov (zatiaľ bez fotiek — otvorené zdroje sú slabé, viď Otázky), demo IBAN.
  Lokálne PC: AVG skenovanie HTTPS blokovalo CLI — Martin vypol, Supabase a Vercel CLI fungujú. (Claude Code)
- 2026-10-16 — Ručné rezervácie sa rátajú do provízie, blokácie bez údajov hosťa a ceny (ROZHODNUTIA, A10, B2). (Claude chat)
- 2026-10-16 — Časť B (doména B1–B9) a rozsah MVP v architektúre; fronta Z7–Z12 (MVP Chalet STRÖMY + showroom). (Claude chat)
- 2026-10-16 — Z2 a Z6 dokončené: Martin napojil Vercel cez web (CLI sa nepripojí), staging https://booking-platform-obrazne.vercel.app
  priradený Ukážkovému klientovi; Martin (účet si založil sám) pridaný do `platform_admins` a ako `owner` oboch klientov (zapísané v audite). (Claude Code)
- 2026-10-16 — Z6 (bez nasadenia): riadiace centrum `/platform` — klienti, založenie (funkcia `platform_create_tenant`: klient + doména + téma + audit
  v jednej transakcii), vypínače modulov so skúškou, stav klienta, náhľad témy, záznam zmien. Akcie sú DB funkcie s kontrolou správcu,
  bez service kľúča — aplikácia nepotrebuje `SUPABASE_SECRET_KEY` na nič. (Claude Code)
- 2026-10-16 — Z5: register modulov v kóde (`src/modules/index.ts` jediné miesto; manifest s menu, slotmi, udalosťami, závislosťami),
  tabuľky `modules` + `tenant_modules` (mení len správca), vypnutý modul = stránka 404 a zmizne z menu, dáta ostávajú. Kostra administrácie
  (pás ikon s rozbalením na hover a pripnutím ako v CM, mobilné menu, prepínanie klienta, tmavý režim), bočný panel `?panel=typ:id`
  (Späť zatvorí, zdieľateľný odkaz, na mobile celá obrazovka), zoznam s filtrami/triedením/stránkovaním na serveri a CSV (stredník + BOM
  pre Excel, ochrana pred vzorcami). Ukážka na stránke Tím; modul Doplnkové služby ako prázdna kostra. (Claude Code)
- 2026-10-16 — Z4: next-intl bez jazyka v URL (jazyk z cookie, neskôr z profilu/klienta) — rezervačná stránka beží na doméne klienta,
  prefix v URL netreba. Peniaze: `Money {amount (centy), currency}`, percentá v bázických bodoch, rozdelenie bez straty centu.
  Téma: `tenant_themes`, 5 písiem na výber, kontrast tlačidiel sa dopočíta, nízky kontrast akcentu hlási validácia; predvolená téma
  modrý akcent #0071e3, zaoblenie 12 px. `tenants.timezone` pridané (dátumy v časovom pásme klienta). (Claude Code)
- 2026-10-16 — Z3: tabuľky `tenants`, `tenant_domains`, `profiles`, `memberships`, `platform_admins`, `audit_log`; pomocné funkcie podľa CM
  (`SECURITY DEFINER`, prázdny search_path). Majiteľ nemôže meniť skratku ani stav klienta (trigger). Audit len cez `write_audit()`.
  Supabase advisor hlási, že pomocné funkcie sú volateľné cez API — zámerne (odpovedajú len o volajúcom; `tenant_by_host` a
  `tenant_theme` sú verejné pre rezervačnú stránku). Prihlásenie `@supabase/ssr` + `proxy.ts` (Next 16), overenie cez `getClaims()`.
  Klient podľa domény; lokálne `*.localhost`, mimo produkcie `DEV_TENANT_HOST`. Registrácia vypnutá. (Claude Code)
- 2026-10-16 — Z2 (bez Vercelu): Next.js 16.4, React 19, strict TS, Tailwind 4, shadcn/ui (Radix, preset nova), Prettier, Vitest, CI v GitHub
  Actions (typy, lint, formát, testy + job `database` so `supabase db start` a pgTAP — Docker na Martinovom PC nie je, testy DB beží CI).
  `cacheComponents` vypnuté — aplikácia je celá dynamická (doména, prihlásenie). Staging `booking-platform-staging` (Frankfurt);
  kvôli limitu 2 bezplatných projektov pozastavený `credit-manager-dev` (Martin súhlasil). Postup v `CLAUDE.md`. (Claude Code)
- 2026-10-16 — Fronta Z2–Z6 (kostra platformy), režim práce bez prerušenia, vizuálny smer a bočný panel (A12, A18). (Claude chat)
- 2026-10-16 — Po analýze Z1 rozhodnuté: čistý Next.js projekt namiesto kópie Rental Van (ROZHODNUTIA, ARCHITEKTURA A1). (Claude chat)
- 2026-10-16 — Z1: analýza `obrazne/van-rental` a `obrazne/credit-manager` (len čítanie, klony v dočasnom priečinku) → `docs/analyza-existujucich-appiek.md`.
  Odporúčanie: čistý Next.js, prevziať kostru adminu, vzory rezervácie (RV) a bezpečnostné SQL vzory (CM). (Claude Code)
- 2026-10-16 — Nasadenie u klienta (A17): subdoména klienta + widget s predvyplneným termínom; pre Janu úloha 3e. (Claude chat)
- 2026-10-16 — Predajný web: WordPress + CrocoBuilder po MVP a značke (Fáza 5, ROZHODNUTIA). (Claude chat)
- 2026-10-16 — Veľký obraz: do architektúry doplnené A10–A16 (obchodný model, sprievodca klienta, vzhľad, notifikácie, meranie,
  podpora, paralelný chod s OTA) a showroom; nové body vo Fáze 2 a Otázkach. (Claude chat)
- 2026-10-16 — Založený repozitár (Martin) a riadiace súbory (Claude chat): `ARCHITEKTURA.md` v2 časť A, `ROZHODNUTIA.md` zo 16. 10.,
  podklady z booking-demo v `docs/podklady`, `docs/biznis`, `docs/archiv-wp`. Zadanie Z1. (Claude chat)
