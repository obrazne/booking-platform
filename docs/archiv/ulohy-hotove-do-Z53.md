# Archív zadaní — hotové úlohy Z31–Z53

*Presunuté z `ROADMAP.md` 19. 10. 2026 (kratšia roadmapa = rýchlejší štart každej úlohy). Text úloh je nezmenený.*

### Z51 ✅ [A] — Podklad na doklad a doklady pre hosťa (3d, A5 — rozhodnutie 18. 10.)
Doklady vystavuje klient ručne vo svojom nástroji; náš systém mu pripraví podklad. Prepojenie s fakturačným nástrojom je neskorší platený modul — **nerob ho**.
1. **Panel rezervácie → sekcia „Podklad na doklad“:** odberateľ (meno, kontakt, adresa, ak ju máme), položky zo zmrazených riadkov
   rezervácie (noci, poplatky, služby, zľavy, daň za ubytovanie), sumy s DPH podľa nastavenia klienta, platby (dátum, spôsob, VS), dátum
   pobytu. Akcie **Kopírovať** (prehľadný text na vloženie do fakturačného nástroja) a **Stiahnuť** (PDF podklad, `src/core/pdf`, s nápisom
   „Podklad — nie je daňový doklad“). To isté pre **vyúčtovanie účtu pobytu** (objednávky modulu upsell, slot).
2. **Nahratie vystaveného dokladu:** pri nahrávaní dokumentu k rezervácii voľba druhu „Doklad (faktúra)“ → hosť ho vidí v účte pobytu
   v sekcii **Doklady** (aj cez prístupový odkaz); pri rezervácii stav „doklad nahratý / chýba“.
3. **Export podkladov za mesiac** (CSV pre účtovníka: číslo rezervácie, hosť, pobyt, položky, sumy, platby, stav dokladu) v zozname rezervácií.
4. Ak by podklad potreboval údaje, ktoré od hosťa nezbierame (firma, IČO, DIČ — „faktúra na firmu“), **do košíka ich nepridávaj** — zapíš
   do Otázok pre Martina (mení to, čo vidí hosť).
5. Testy: vitest (zostavenie podkladu, súčty = cena rezervácie), Playwright na Ukážkovom klientovi (kopírovať, PDF, nahratie dokladu → hosť ho vidí), axe.

### Z52 [B] ✅ — Príprava produkcie: stav záloh, export klienta, obnova jedného klienta (3f, A9)
Nočná záloha stagingu už beží (Z50). Doplň zvyšok 3f — **nič neplatené, nič na produkcii, reálne dáta STRÖMY len čítaj**.
1. **Stav záloh** v riadiacom centre (Stav systému): koniec workflow zálohy zapíše výsledok (čas, veľkosť, počty, výsledok overenia) do novej
   platformovej tabuľky (len správca platformy, RLS); zobraz poslednú zálohu, posledné skúšobné obnovenie a upozornenie správcovi,
   ak posledná úspešná záloha je staršia ako 36 h. Tajné hodnoty ber z existujúcich GitHub secrets, nič nové nepridávaj bez Martina.
2. **Export dát klienta** (A8) v detaile klienta: ZIP — rezervácie, hostia, platby, objednávky, správy, recenzie, dokumenty (súbory),
   nastavenia; CSV + JSON; citlivé údaje z check-inu maskované. Vytvorenie exportu sa zapíše do auditu.
3. **Chirurgická obnova jedného klienta:** skript `scripts/restore-tenant.mjs` — zo zálohy obnovenej bokom (lokálny Postgres v CI alebo
   dočasná schéma) vyberie len riadky daného `tenant_id`, ukáže **výpis zmien pred zápisom** (pridať / zmeniť / zmazať) a zapíše až po
   výslovnom potvrdení. Postup do `docs/prevadzka/zaloha-a-obnova.md`. **Skúšobne len na Ukážkovom klientovi** (zmaž pár ukážkových
   záznamov → obnov → porovnaj); na STRÖMY nič nezapisuj.
4. **Postup pri výpadku** (dokument `docs/prevadzka/vypadok.md`): Vercel, Supabase, e-maily, iCal — čo robiť, komu písať, ako vrátiť verziu.

### Z53 ✅ [A] — Pred ukážkou Jane: prehliadka „Čo je nové“ a celkový test (po Z51)
1. **Prehliadka „Čo je nové“** doplnená o veci od poslednej verzie: správy (schránka, automatické správy), check-in, doobjednanie a účet
   pobytu, recenzie, kolízie, storno pásma, podklad na doklad. Nové snímky z Ukážkového klienta (`npm run tour:screens`), zvýš `version`.
2. **Celý e2e beh** (PC aj mobil, axe) proti stagingu po všetkých úlohách oboch liniek; nestabilné testy oprav alebo zapíš.
3. **Kontrola STRÖMY bez zápisu:** prejdi stránku hosťa, účet hosťa (info+host@obrazne.sk) a administráciu STRÖMY a zapíš do Denníka,
   čo by pri ukážke Jane vyzeralo zle (prázdne sekcie, orientačné texty, chýbajúce fotky, anglické texty) — oprav len chyby kódu, obsah nemeň.

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

### Z45 [B] ✅ — Modul Správy: základ (databáza, automatické správy, e-maily, upozornenia) (Martin 17. 10.)
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

### Z50 [B] ✅ — Nočná záloha stagingu (Martin 17. 10.) — **prednostne, prvá na linke B**
Staging je na bezplatnom pláne Supabase, ktorý **nerobí žiadne zálohy**. Nenahraditeľné sú nastavenia a texty STRÖMY, fotky v úložisku
(~40 súborov), Janin iCal kanál a používatelia (databáza ~40 MB). Je to predstupeň 3f (A9) — postav ho tak, aby sa dal pre produkciu len
prepnúť na iné úložisko. Nič neplatené.
1. GitHub Actions `backup-staging.yml`: každú noc (`cron: '0 1 * * *'`) + ručné spustenie. Výpis databázy (`supabase db dump`: roly,
   schéma, dáta zvlášť) a všetky súbory zo Storage (skript cez service role, so zoznamom a veľkosťami).
2. **Overenie v tom istom behu:** výpis sa obnoví do čistého Postgresu (služba v jobe) a porovnajú sa počty riadkov hlavných tabuliek
   a počet súborov; nesedí → job zlyhá.
3. **Šifrovanie `age`** verejným kľúčom (v GitHube je len verejný; súkromný má iba Martin) → artefakt behu, uchovanie 14 dní
   (zohľadni limit úložiska GitHubu pre súkromný repozitár — v Denníku zapíš veľkosť jednej zálohy). Nezašifrované nikde neostáva.
4. Pri zlyhaní: e-mail z GitHubu stačí na staging; v Denníku napíš, komu chodí.
5. **Martin pridá tajné hodnoty sám** — priprav mu presný postup krok za krokom pre jeho počítač (vytvorenie kľúča `age-keygen`, kam
   odložiť súkromný kľúč, GitHub → Settings → Secrets → Actions): `STAGING_DB_URL`, `STAGING_SERVICE_ROLE_KEY`, `BACKUP_AGE_PUBLIC_KEY`.
   Hodnoty nikdy nečítaj, nevypisuj ani necommituj. Kým ich Martin nepridá, pokračuj ďalšou úlohou a vráť sa sem.
6. Postup obnovy `docs/prevadzka/zaloha-a-obnova.md`: stiahnutie artefaktu, rozšifrovanie, obnova do nového projektu aj do stagingu,
   nahratie súborov späť; bez tajných hodnôt. **Jedna skúšobná obnova s Martinom** (on rozšifruje) — výsledok do Denníka.
7. Pozn. pre 3f: na produkciu úložisko v EÚ (A9) — GitHub artefakty sú dočasné riešenie len pre staging.

### Z46 [B] ✅ — Modul Správy: administrácia (schránka, karta v paneli rezervácie, automatické správy) — po Z45
Podľa `docs/vizual-administracia.md` → **v1.3 Správy**, dosky `Spravy`, `SpravyAuto`, `Sidebar`.
1. Menu: skupina Správy s odznakom (Schránka, Automatické správy), len so zapnutým modulom.
2. Schránka `/admin/messages` (filtre, riadky, hľadanie) → klik otvorí **panel rezervácie na karte Správy** (`?panel=reservation:id&tab=messages`).
3. Karta **Správy** v paneli rezervácie cez slot `booking.detail.tabs`: konverzácia, štítky automatických, naplánovaná správa
   (Upraviť pre tohto hosťa / Neposielať / Vrátiť), pole, Rýchle odpovede, prečítanie pri otvorení.
4. Automatické správy: časová os, vypínače, úprava v bočnom paneli (kedy, text s premennými, náhľad, upozornenie na kolíziu s e-mailom
   pokynov/ponuky, Poslať skúšobne mne); rýchle odpovede (pridať, upraviť, poradie).
5. Mobil: schránka zoznam → rezervácia cez celú obrazovku na karte Správy.
6. Playwright (Ukážkový klient): odpoveď hosťovi, rýchla odpoveď, vynechanie naplánovanej správy, úprava pravidla; axe.

### Z47 ✅ [A] — Modul Správy: hosť (konverzácia v detaile pobytu, mobil, e-mail) — po Z43 a Z45
Podľa `docs/vizual-stranka-hosta.md` → **Správy s hosťom (v2.5)**, dosky `SpravyPobyt`, `MobilSpravy`, `EmailSprava`.
Ak Z45 ešte nie je ✅, počkaj (pull každých pár minút) — linka A nemá nič iné.
1. Sekcia Správy v detaile pobytu cez slot `guest.stay.top` (pod stavom), v účte aj cez prístupový odkaz; rýchle témy z nastavenia klienta.
2. Neprečítané: odznak na karte Pobyty v lište účtu (Z43), pilulka v hlavičke pobytu, bod na karte najbližšieho pobytu, karta Kontakt na majiteľa.
3. Mobil: konverzácia cez celú obrazovku (`/ucet/pobyt/<id>/spravy`), písmo poľa 16 px.
4. Šablóny e-mailov podľa `EmailSprava` (hosťovi aj majiteľovi), tlačidlo „Odpovedať“ otvorí pobyt prihláseného hosťa na sekcii Správy.
5. Po 30 dňoch od odchodu len čítanie s vetou o kontakte. Správy v exporte „Moje dáta“ (Z43).
6. Playwright (Ukážkový klient, PC + mobil): hosť napíše, majiteľ vidí v schránke; odkaz z e-mailu; axe.

### Z43 ✅ [A] — Účet hosťa: lišta s kartami, prehľad a Moje údaje (pripomienka 30, 17. 10.)
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

### Z48 [B] ✅ — Storno pásma: výpočet vrátenej sumy (Martin 17. 10.: „urob ako uznáš za vhodné“ k otázke zo Z44)
Pri klientovi voliteľné pásma „zrušenie aspoň N dní pred príchodom → vrátiť P % ceny“ (Nastavenia → Storno podmienky). Hosť v okne
žiadosti o zrušenie vidí presnú vrátenú sumu a poplatok, majiteľ v paneli rezervácie návrh podľa dňa žiadosti. Bez pásiem ako doteraz.

### Z49 [B] ✅ — Prístupový odkaz `/r/<kód>` ako detail pobytu v účte (v2.4; rozhodol Claude Code 17. 10. podľa „urob ako uznáš“)
Podľa v2.4 majú byť stránky cez prístupový odkaz rovnaké ako v účte (bez lišty kariet, s ponukou „Uložiť do účtu“). Dnes je `/r/<kód>`
potvrdenie rezervácie v2.1 (platba, kroky, moduly). Navrhovaný postup: hneď po rezervácii a kým čaká na platbu ostáva potvrdenie v2.1
(schválený vizuál, nadväzuje na košík); od zaplatenia `/r/<kód>` vykreslí `StayDetail` s prístupom cez kód (stavy zo Z44 — dlaždice
počas pobytu, rozpis v Účte pobytu, žiadosť o zrušenie cez okno s pásmami) a nahor riadok „Uložiť do účtu“. `StayDetail` treba
odpojiť od `requireGuest` (načítanie pobytu účtom aj kódom). Playwright: zaplatený pobyt cez odkaz (stavy), žiadosť o zrušenie cez odkaz.

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
