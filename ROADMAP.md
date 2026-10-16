# ROADMAP — Booking platform

*Kde sme a čo ostáva. Čo staviame → `ARCHITEKTURA.md`. Prečo → `ROZHODNUTIA.md`.*

**Legenda:** 🧠 = rozhoduje Martin s Claude (návrh, chat) · 🔧 = robí Claude Code (kód, súbory, Git)
☐ otvorené · ☑ hotové

## Aktuálne
- **Kde sme (16. 10.):** fronta Z1–Z15 hotová na stagingu https://booking-platform-obrazne.vercel.app — kostra platformy a MVP pre Chalet STRÖMY
  + showroom (rezervácia, platba prevodom s QR, e-maily, iCal, administrácia, stránka podľa vizuálu v1). Chýba: doklady, nasadenie u Jany (3d, 3e).
- **Ďalší krok pre Claude Code:** fronta Z16 → Z18 (kontrola pred ukážkou, zóna hosťa, sekcie v administrácii). Veci na web klienta zatiaľ nie.
- **Ďalší krok pre Martina:** preklikať staging (stránka STRÖMY podľa vizuálu v1, košík, rezervácia, administrácia); odpovedať na otázky nižšie.
- **Claude chat:** obchodný model, otázky pre Janu, kontrola výsledkov Z7–Z15, ďalšia fronta (rozhranie sekcií, zóna hosťa, doklady).

## Zadanie pre Claude Code
*Sem píše Claude chat konkrétne pokyny. Môže tu byť **fronta viacerých úloh (Z1, Z2, …)** — `/dalej` vezme prvú neoznačenú,
po dokončení ju označí ✅ (text nechá) a ďalšiu začne až pri ďalšom `/dalej`. Keď sú všetky ✅, sekciu vyprázdni.*

*Hotové Z1–Z15 (analýza, kostra platformy, MVP Chalet STRÖMY: doména, administrácia, stránka hosťa, rezervácie,
e-maily, iCal, dáta zóny hosťa, detail objektu zo sekcií, vizuál v1) — detail v Denníku a histórii Gitu.*

**Kontext pre frontu Z16–Z18:** MVP je postavené. Teraz ho skontrolujeme pred ukážkou Jane a ladíme **len našu aplikáciu** (B7, B10).
**Nič, čo sa vkladá na web klienta (vyhľadávací pás, widget, úprava Janinho webu), teraz nerob** — Martin 16. 10. Rovnaké pravidlá ako doteraz (`tenant_id` + RLS + testy, centy, preklady, téma, A18). Stále len staging.

### Z16 — Kontrola pred ukážkou
Cieľ: Jana uvidí stránku bez chýb. Výstup `docs/kontrola-mvp.md` (čo sa skontrolovalo, nálezy, čo opravené, čo ostáva).
1. **Automatické testy prehliadačom (Playwright):** rezervácia ako hosť na STRÖMY na počítači aj na mobile (390 px) — termín v kalendári,
   košík 3 kroky, služba, súhlasy, platobné údaje s QR, prístupový odkaz, žiadosť o storno; administrácia — Platba prijatá, ručná rezervácia,
   blokácia, kolízia z iCal. Spúšťať lokálne proti stagingu; do CI len ak to ide bez platených služieb.
2. **Nezávislá kontrola bezpečnosti** samostatným agentom, ktorý kód nepísal: RLS na každej tabuľke s `tenant_id`, oprávnenia v serverových
   akciách a API (worker, iCal, prístupové tokeny), nič tajné v kóde pre prehliadač, ochrana formulárov proti robotom a zahlteniu, hlavičky.
3. **Prístupnosť a mobil:** kalendár ovládateľný klávesnicou a čítačkou, kontrast, žiadne vodorovné rolovanie na 390 px, veľkosti tlačidiel.
4. **Rýchlosť:** veľkosti a formáty fotiek, načítanie detailu na mobile (Lighthouse), zbytočné dotazy do databázy.
Jasné chyby oprav hneď; čo mení správanie pre hosťa alebo majiteľa, zapíš do *Otázky pre Martina*.

### Z17 — Účet a zóna hosťa (B10)
Rozhranie nad dátami zo Z13, na doméne klienta:
1. **Prihlásenie bez hesla** kódom na e-mail. E-mail s kódom ide **cez náš systém e-mailov (Z11) v téme klienta**, nie predvolenými e-mailmi
   Supabase (tie sú spoločné pre všetkých klientov a majú prísne limity). Ponuka „Uložiť si údaje pre ďalšie pobyty“ po rezervácii.
2. **Zóna:** nadchádzajúce a minulé pobyty (stav, termín, rozpis, platobné údaje s QR kým nie je zaplatené), dokumenty (dočasné odkazy),
   pokyny k príchodu a kódy podľa pravidiel zo Z13, **Rezervovať znova** (objekt, hostia a služby predvyplnené, hosť vyberie termín),
   žiadosť o storno, úprava kontaktu, **odvolanie marketingového súhlasu jedným klikom** (zapíše sa do histórie súhlasov).
   Správy s majiteľom zatiaľ nie — kontakt WhatsApp/telefón ako v košíku. Doklady skry, kým nie je adaptér.
3. **Administrácia:** nahrávanie dokumentov pri objekte a pri rezervácii (viditeľnosť „vždy / po potvrdení“), úprava pokynov k príchodu.
4. Vzhľad: jazyk košíka a stránky hosťa (`docs/vizual-stranka-hosta.md`), pokojný „dashboard“ — karta najbližšieho pobytu hore, ostatné
   ako zoznam. Martin ho môže neskôr doladiť na plátne, takže drž jednoduché komponenty. Testy RLS: hosť nevidí cudzie pobyty ani iného klienta.

### Z18 — Sekcie stránky v administrácii (B7)
V editore objektu záložka **Stránka**: zoznam sekcií s vypínačom (kalendár sa vypnúť nedá), presúvanie (aj klávesnicou), formulár sekcie
generovaný zo zod schémy typu (texty s prekladmi — zatiaľ slovenčina, výber fotiek z fotiek objektu), „Pridať sekciu“ z typov, ktoré tam
ešte nie sú, „Obnoviť podľa predlohy“ s potvrdením, náhľad stránky. Bočný panel podľa A18. Údaje zo systému (ceny, storno…) sa vo formulári
neupravujú — len odkaz, kde sa menia.

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
- [ ] 3e Nasadenie u Jany: `rezervacia.chaletstromy.sk`, vyhľadávací pás na jej webe (Elementor HTML widget), tlačidlá „Rezervovať“ (A17)

## Fáza 4 — Po spustení 🔧 + 🧠
- [ ] Stripe (karta), záloha a doplatok
- [ ] Účet a zóna hosťa (B10): pobyty, dokumenty od majiteľa, doklady, pokyny k príchodu, Rezervovať znova, správy, súhlasy
- [ ] Riadiace centrum v plnom rozsahu, skúšobné doby modulov
- [ ] Vkladací widget, ďalšie moduly podľa katalógu

## Fáza 5 — Značka a predajný web 🧠 + 🔧 *(po MVP; cieľ: hotové pred eventom v eXtreme parku Žilina)*
- [ ] Značka produktu: názov, doména, vizuál 🧠
- [ ] Obchodný model a cenník uzavretý (Fáza 2) — až potom texty webu 🧠
- [ ] Predajný web vo WordPresse s CrocoBuilderom na Martinovom hostingu: funkcie, moduly, screenshoty, dopyt 🔧
- [ ] Prepojenie s aplikáciou: rovnaké farby a písma, odkaz na ukážkového klienta, kalkulačka úspor ako widget z aplikácie 🔧

## Otázky pre Martina
- Ochrana stagingu: adresy *.vercel.app sú za prihlásením do Vercelu (aj chalet-stromy-demo.vercel.app). Ak chceš ukázať stránku Jane,
  treba buď vypnúť Vercel Deployment Protection pre produkčné nasadenie (stránka je neindexovaná, dáta ukážkové), alebo napojiť
  vlastnú doménu. Ktoré?
- Fotky showroomu: kľúč Pexels API (zadarmo) do `.env.local` ako `PEXELS_API_KEY` — potom ich doplním. Dovtedy zástupné obrázky.
- Kľúč Resend bol poslaný v chate — po dokončení Z11 ho v Resende vymeň za nový.
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
