# ROADMAP — Booking platform

*Kde sme a čo ostáva. Čo staviame → `ARCHITEKTURA.md`. Prečo → `ROZHODNUTIA.md`.*

**Legenda:** 🧠 = rozhoduje Martin s Claude (návrh, chat) · 🔧 = robí Claude Code (kód, súbory, Git)
☐ otvorené · ☑ hotové

## Aktuálne
- **Kde sme (17. 10.):** fronta Z1–Z30 hotová na stagingu — MVP pre Chalet STRÖMY + showroom, stránka hosťa podľa vizuálu v2/v2.1
  (galéria, mapa, košík v2, potvrdenie rezervácie), zóna hosťa, sekcie v administrácii, captcha, **ukážkové dáta** (`npm run demo-data`)
  a **prehliadka „Čo je nové“** pre majiteľa aj správcu, **administrácia a prihlásenia podľa vizuálu v1–v1.2** (menu so skupinami, Štatistiky, zvonček s upozorneniami, drobčeky),
  **riadiace centrum v1.2** (detail klienta so záložkami, katalóg modulov, audit s filtrami) a košík v2.2 pre notebook. Chýba: doklady (čaká na Janin fakturačný nástroj), produkčné prostredie,
  nasadenie u Jany (3e — zatiaľ odložené, teraz len naša aplikácia), Stripe (karta — **pred spustením**, Martin 20. 10.).
- **Ďalší krok pre Claude Code (18. 10.):** pripomienky 31–44, pravidlá v `docs/pravidla-rozhrania.md` —
  **A:** ~~Z54~~ ✅ → ~~Z55~~ ✅ → ~~Z56 (zbalené sezóny a zoznamy)~~ ✅ → ~~Z63 (šírka, stránkovanie v DB)~~ ✅ → ~~Z66 (vysvetlivky ⓘ)~~ ✅ → ~~Z69 (Nastavenia s kartami, spôsoby platby)~~ ✅ → ~~Z61 (kontrola všetkých obrazoviek, e2e, „Čo je nové“)~~ ✅ → ~~Z70 (potvrdenie: kontakt, plochy hosťa)~~ ✅ → **Z74 (odsadenie pripnutého zhrnutia)** → **Z76 (preklad správ cez DeepL)**;
  **B:** ~~Z57–Z60, Z62, Z64, Z65, Z67, Z68~~ ✅ → ~~Z71 (košík: zľavový kód, spôsob platby, faktúra na firmu)~~ ✅ → ~~Z73 (rezervácie: najnovšie hore)~~ ✅ → ~~Z72 (kalendár Google/Outlook, účet na potvrdení)~~ ✅ → **Z75 (výpis: rozpočet na marketing)**.
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
- **Rýchlosť bez straty kvality (Martin 19. 10. — úlohy trvajú dlho; čas berie réžia testov, nie programovanie):**
  - **Pri každej úlohe:** `typecheck`, `lint`, `format:check`, `vitest` a pgTAP pri zmene DB + **e2e len spec súborov, ktorých sa úloha týka**
    (nové alebo dotknuté obrazovky, PC aj mobil len ak sa mení mobilné zobrazenie). Celú sadu e2e nie.
  - **Testy prehliadačom púšťa naraz len jedna linka.** Port 3100 je zámok: ak je obsadený (`e2e:server` druhej linky beží), e2e nespúšťaj,
    pokračuj v programovaní a testy pusti, keď sa port uvoľní. Nespúšťaj druhý server na inom porte proti tej istej databáze — dva behy
    naraz na bezplatnom stagingu robia falošné pády.
  - **Padnutý test opakuj najviac raz.** Ak padne znova alebo padá len „pod záťažou“, oprav jeho stabilitu (čakanie na stav, nie na čas;
    žiadne `waitForTimeout`) — neopakuj dookola. Linka A pri Z61 opraví všetky známe nestabilné testy (zoznam z Denníka).
  - **Snímky „pred/po“ do `docs/snimky/`** len keď ich úloha výslovne žiada alebo ide o veľkú vizuálnu zmenu; inak stačí opis v Denníku.
  - `e2e:server` (build) spúšťaj až po dokončení kódu úlohy, nie po každej drobnej zmene; počas vývoja `npm run dev`.
  - **Denník stručne:** 3–8 riadkov na úlohu (čo, kde, rozhodnutia, testy). Podrobnosti patria do kódu a commitov.
- **Hosť pre zónu hosťa (Martin 17. 10.):** schránka `demo-host@obrazne.sk` **neexistuje** — Martin používa `info+host@obrazne.sk`
  (na STRÖMY už priradený k pobytom 2026-0648 a 2026-0688). V ukážkových dátach a v CLAUDE.md nahraď `demo-host@obrazne.sk` touto adresou.
- Nečakaj na CI medzi úlohami — výsledok CI skontroluj na konci a oprav, ak niečo spadlo.

*Hotové Z1–Z30 (analýza, kostra platformy, MVP Chalet STRÖMY, stránka hosťa a košík podľa vizuálu v2–v2.2, potvrdenie rezervácie,
zóna hosťa, sekcie, captcha, ukážkové dáta, prehliadka „Čo je nové“, administrácia v1–v1.2 so štatistikami a upozorneniami,
riadiace centrum v1.2) — detail v Denníku a histórii Gitu.*

**Pripomienky 31–44 (Martin 18. 10.) → Z54–Z61.** Spoločné pravidlá sú v **`docs/pravidla-rozhrania.md`** — prečítaj pred každou z týchto úloh.
**Platia všade** (administrácia, riadiace centrum, stránka a účet hosťa), aj keď pripomienka padla pri jednej časti. Č. 37 (recenzie) čaká
na rozhodnutie → Otázky, nerob ju. **Rozdelenie, aby sa linky nebili:** linka **A** robí spoločné základy (tokeny, komponenty, formuláre,
ukladanie) a na konci prejde všetky obrazovky; linka **B** robí navigáciu a nové funkcie a **nemení vzhľad plôch, polí ani hover** —
použije komponenty, ktoré tam budú (ak ešte nie sú, nechaj pôvodné, Z61 to zjednotí).

### Z54 ✅ [A] — Plochy, polia a reakcia na myš naprieč aplikáciou (pripomienky 41, 42, 43; pravidlá 1–2)
1. Tokeny v `globals.css`: pozadie stránky, karta (odtieň alebo okraj — jeden spôsob), deliaca čiara, okraj poľa s kontrastom ≥ 3 : 1
   voči karte aj stránke; žiadne farby natvrdo v komponentoch. Funguje aj pri témach klientov (svetlé aj tmavé akcenty, `src/core/theme`).
2. Spoločné komponenty (`src/components/ui/*`, `src/core/admin/*`): input, select, textarea, dátum/čas, checkbox, prepínač — biele
   s viditeľným okrajom; karta a sekcia bez vnorených pozadí (karta v karte → deliaca čiara).
3. Hover a `:focus-visible` podľa tabuľky v pravidle 2: riadky zoznamov, karty, tlačidlá, odkazy, ikonové tlačidlá; ~150 ms, bez pohybu.
4. Kalendár administrácie: náhľad pobytu pri prejdení (hosť alebo portál, termín, noci, stav, suma), na dotyk prvým ťuknutím.
   Kalendár hosťa: cena noci pri dni (ak sa dá zistiť bez ďalšieho dotazu na každý deň; inak zapíš do Denníka a vynechaj).
5. Prejdi a oprav miesta, kde je to dnes najhoršie: Objekt → Údaje, Ceny a sezóny, riadiace centrum → Katalóg modulov a detail klienta,
   účet hosťa → detail pobytu (konverzácia, formuláre), Moje údaje. Snímky pred/po do `docs/snimky/z54/` (bez osobných údajov).
6. Test kontrastu tokenov (vitest), axe bez nových chýb, e2e dotknutých obrazoviek.

### Z55 [A] ✅ — Ukladanie: lišta neuložených zmien a toasty všade (pripomienky 36, 44; pravidlo 3) — po Z54
1. Spoločný formulárový obal: sleduje zmeny polí, **Uložiť tiché, kým nie je zmena**, potom pripnutá lišta dole „Máte neuložené zmeny ·
   Zahodiť · Uložiť“; zmenené pole označené; potvrdenie pri odchode zo stránky (aj interná navigácia).
2. Spoločný pomocník pre serverové akcie → toast vpravo dole pri úspechu aj chybe (`sonner`), text z prekladov.
3. Nasadiť všade, kde sa ukladá: administrácia (objekt, ceny, služby, poplatky, nastavenia, prepojenia, správy, tím…), riadiace centrum
   (klient, stav, moduly, téma, domény), účet hosťa (Moje údaje, check-in, objednávky). Stránky s viac sekciami a vlastným Uložiť →
   jedna lišta pre stránku/záložku. Okamžité prepínače: uloženie hneď + toast.
4. e2e: zmena → lišta → uložiť → toast; zahodiť; odchod s neuloženými zmenami; chyba servera → toast s chybou.

### Z56 [A] ✅ — Ceny a sezóny a ďalšie zoznamy zbalené (pripomienka 35; pravidlo 4) — po Z55
1. Sezóny ako zbalené riadky: názov, termíny, cena za noc, min. nocí; šípka rozbalí formulár; rozbalený riadok iný podklad.
2. „Nová sezóna“ skrytá za „+ Pridať sezónu“ (otvorí sa navrchu). To isté pre ostatné zoznamy s formulárom „Nový …“ v administrácii
   aj riadiacom centre (služby, poplatky a zľavy, rýchle odpovede, dokumenty, kanály iCal, katalóg modulov — klienti pri module).
3. **Opakované sezóny bez roka:** pri „Opakovať každý rok“ zobrazuj a zadávaj deň a mesiac (23. 12. – 26. 12.), nie „2000“; uloženie
   ostáva rovnaké (výpočet ceny vrátane prechodu cez Nový rok má test v `calculate.test.ts` — nesmie sa zmeniť).
4. Katalóg modulov: veta pod klientmi, ktorá opakuje dátumy konca skúšky, preč.

### Z57 [B] ✅ — Riadiace centrum: klienti v menu a zoznam klientov (pripomienky 31, 32)
1. **Menu:** pod „Klienti“ ostávajú **naposledy otvorení klienti (max. 3)**, zapamätaní (cookie/DB pre správcu, nie len v pamäti stránky);
   aktívny klient rozbalený s podstránkami (Prehľad, Moduly, Vzhľad, Domény, Ľudia, Záznam zmien), ostatní zbalení. Po kliknutí na
   „Všetci klienti“ nezmiznú.
2. **Zoznam klientov:** klik na riadok alebo názov = detail klienta; šípka vpravo = rozbalenie (ako dnes). Hľadanie (názov, e-mail, adresa
   stránky) a filtre: stav (aktívny / skúška / pozastavený), modul, končiaca skúška, problém (synchronizácia, e-maily) — `ListSearch`,
   `FilterPills`. **Dlaždice nerob** (Claude odporučil tabuľku). Stĺpec „Balík a moduly“ nesmie byť orezaný bez možnosti vidieť zvyšok
   (počet + zoznam v rozbalení).
3. **Chyba:** v zozname klientov aj v detaile sa zobrazuje kľúč `modules.messages.title` — doplň preklad (a nájdi, či chýba aj iný
   kľúč modulu; test, ktorý porovná kľúče manifestov so `sk.json`).

### Z58 [B] ✅ — Pobyty z iných portálov a Príchody zo všetkých kanálov (pripomienka 33)
1. Nová podpoložka **Rezervácie → Z portálov** (Booking, Airbnb, ďalšie iCal kanály): zoznam pobytov z iCal oddelene od vlastných
   rezervácií. Stĺpce: portál, príchod – odchod, noci, kód/odkaz rezervácie a posledné 4 číslice telefónu (Airbnb, ak sú v popise udalosti),
   kolízia (odkaz na `/admin/collisions`), posledná synchronizácia kanála. Filtre: portál, budúce/minulé. Panel pobytu so všetkým, čo
   o ňom vieme, a odkazom „Zobraziť v kalendári“. Nič sa nezapisuje do `reservations`.
2. **Príchody:** zobrazujú príchody zo **všetkých** kanálov (vlastné + portály), pri portáloch štítok portálu — kvôli upratovaniu a odovzdaniu.
3. Drobnosti zo snímky zoznamu rezervácií: „Ručná rezervácia“ dvakrát (horná lišta aj hlavička) → jedno miesto; dve hľadania (horná lišta
   + zoznam) → vysvetli v Denníku, ak je horné globálne, inak jedno; **predvolené poradie** zoznamu podľa príchodu (najbližšie hore),
   nie podľa vytvorenia.
4. Testy na Ukážkovom klientovi (ukážkové iCal kanály); STRÖMY len čítaj.

### Z59 [B] ✅ — Účet hosťa: navigácia (pripomienky 38, 39, 40) — po Z58
1. **Aktuálny pobyt ako prvá karta:** karty `Aktuálny pobyt · Pobyty · Moje údaje`. Po prihlásení sa otvorí aktuálny pobyt (prebiehajúci,
   inak najbližší budúci). Viac budúcich → najbližší + prepínač „Ďalší pobyt: 12. 2. 2027 ›“. Bez budúceho pobytu karta nie je
   a otvorí sa zoznam Pobyty. Prístupový odkaz `/r/<kód>` ostáva ako je.
2. **Detail minulého pobytu:** svieti karta Pobyty a nad nadpisom výrazný odkaz „← Všetky pobyty“ (nielen drobčeky).
3. **„Môj účet“ v hlavičke** (stránka chaletu aj účet) = rozbaľovacie menu s rovnakými položkami ako karty (+ Odhlásiť sa); položky z jedného
   zdroja. Na mobile v menu hlavičky.
4. e2e hosť PC aj mobil (390 px): prihlásenie → aktuálny pobyt; minulý pobyt → späť; menu Môj účet.

### Z60 [B] ✅ — Podpis v správach a vzhľad e-mailov hosťovi (pripomienka 34) — po Z59
1. **Podpis:** `{podpis}` berie `tenant_settings.contact_name`, ktoré sa v administrácii nedá upraviť. Nastavenia → **Kontakt**: meno
   kontaktnej osoby a **podpis správ** (viacriadkový, napr. „Jana Hladká · Chalet STRÖMY · +421…“; nový stĺpec migráciou, predvolene
   meno kontaktu). `{podpis}` = podpis, inak meno, inak názov klienta. Pri tlačidlách „Vložiť“ v úprave správy riadok „Podpis upravíte
   v Nastaveniach → Kontakt“ s odkazom.
2. **Hlavička a päta všetkých e-mailov hosťovi** (`src/core/email/templates.ts`, `layout`): hlavička = logo klienta, ak ho téma má, inak
   názov ubytovania; päta = kontakt (telefón, e-mail, WhatsApp, ak sú) a odkaz „Môj pobyt“ / do účtu. Telo správ ostáva jednoduché
   (osobný list, nie newsletter). Fotka objektu len v potvrdení rezervácie (ak je hlavná fotka), s `alt` a pevnou šírkou.
3. Náhľad v úprave automatickej správy ukazuje e-mail s hlavičkou a pätou; „Poslať skúšobne mne“ posiela rovnakú verziu.
4. Testy: vitest pre `{podpis}` (podpis / meno / názov), snímka e-mailu (HTML) v testoch šablón.

### Z62 [B] ✅ — Mesačný výpis: stránka, e-mail 1. dňa v mesiaci, PDF (predajný argument č. 1, Martin 18. 10.)
Návrh: dosky **12 `Vypis`** a **13 `VypisEmail`** v `docs/navrhy/administracia/`, pravidlá výpočtu v **`docs/vizual-administracia.md` → v1.4**
(prečítaj celé). **Jadro, nie modul** (ARCHITEKTURA A14). Pravidlá rozhrania `docs/pravidla-rozhrania.md` platia.
1. **Úkony, ktoré systém urobil:** zisti, čo už sa dá spočítať z existujúcich tabuliek (odoslané e-maily z outboxu, rezervácie vytvorené
   hosťom, synchronizácie iCal, dokončené check-iny, objednávky) a čo nie. Kde to nejde spoľahlivo, pridaj **záznam úkonu** (nová tabuľka
   s `tenant_id`, RLS, `record_history` netreba — technický záznam; zapisuje sa v DB triggermi/funkciami, nie z rozhrania). Úkony človeka
   („Potrebovalo vás“): potvrdenie platby, odpoveď hosťovi, vyriešená kolízia, ručná rezervácia. Nič neprepočítavaj spätne do minulosti
   „odhadom“ — výpis za minulé mesiace ukáže len to, čo sa dá zistiť z dát (a do Denníka zapíš, od kedy sú počty úplné).
2. **Výpočet výpisu** v jednej DB funkcii (napr. `tenant_monthly_report(p_month)`, RLS ako `tenant_monthly_stats` a nad ňou — tržby
   a obsadenosť **z tej istej funkcie, nie nový výpočet**): čísla, porovnanie s minulým rokom (bez dát = null), úspora z `portal_commission_bp`,
   úspora od januára, podiel priamych nocí, vlastné kontakty (súhlas s ponukami), úkony × minúty, noci podľa kanála, výhľad ďalšieho mesiaca
   (potvrdené priame tržby, obsadenosť zatiaľ, voľné víkendy pi–ne, čo čaká na majiteľa). Vitest/pgTAP: súčty sedia so Štatistikami.
3. **Nastavenia → Mesačný výpis:** minúty na úkon (predvolené podľa v1.4), e-mailová adresa účtovníka (voliteľná, pre „Poslať účtovníkovi“);
   zapnutie e-mailu výpisu v Nastaveniach → E-maily a upozornenia (predvolene zapnuté pre majiteľa).
4. **Stránka** Štatistiky › Mesačný výpis (doska 12): prepínač mesiacov (najstarší = prvý mesiac s dátami), **Stiahnuť PDF** (`src/core/pdf`,
   rovnaký obsah, font Geist), **Poslať účtovníkovi** (e-mail s PDF na adresu z nastavení; bez adresy tlačidlo vedie do nastavení). Odkaz
   na výpis aj z Prehľadu (karta „Výpis za {mesiac} je pripravený“ prvých 7 dní v mesiaci).
5. **E-mail 1. dňa v mesiaci** (doska 13) za predchádzajúci mesiac, ráno (pg_cron → outbox, deduplikácia klient + mesiac), PDF v prílohe;
   nový druh e-mailu podľa pravidiel v CLAUDE.md. Klient bez jedinej rezervácie v mesiaci výpis nedostane.
6. Prázdne a hraničné stavy: 0 priamych tržieb (iný nadpis, žiadne „+∞ %“), bez minulého roka, provízia 0 %, mesiac bez iCal kanálov.
7. Testy: výpočet (vitest + pgTAP vrátane RLS — iný klient výpis nevidí), e2e na Ukážkovom klientovi (stránka, PDF, prepínanie mesiacov),
   snímka e-mailu v testoch šablón, axe. STRÖMY len čítaj. Na konci do prehliadky „Čo je nové“ (spoločne so Z61 — ak už Z61 prebehla, pridaj snímku sám).

**Pripomienky 45–51 (Martin 19. 10.) → Z63–Z67.** Pravidlá 6–8 doplnené v `docs/pravidla-rozhrania.md` (šírka, stránkovanie, vysvetlivky),
návrh `docs/vizual-administracia.md` → v1.5, dosky 14–16. Rozdelenie ako pri Z54–Z61: **A** spoločné komponenty, **B** obrazovky a funkcie.

### Z63 [A] ✅ — Šírka obsahu, pretekanie polí a stránkovanie v databáze (pripomienky 46, 51; pravidlá 6–7) — po Z56
1. Zruš pevné obmedzenie šírky (~1080 px) pri zoznamoch, tabuľkách, kalendári, záznamoch a prehľadoch v administrácii aj riadiacom
   centre; obmedz len text na čítanie a jednoduché formuláre. Oprav pretekanie polí (napr. filter Záznamu zmien — pole „Osoba“ mimo karty).
   E2E kontrola pretečenia na 1280 / 1440 / 1920 px.
2. Spoločné stránkovanie: `Pagination` s „1–20 z N“ a voľbou 20 / 50 / 100 (predvolene 20, zapamätané na používateľa a zoznam),
   stav v adrese. **Načítanie len jednej stránky z databázy + počet** — oprav `audit-query.ts` (dnes načíta až `MAX_ROWS` a delí v pamäti)
   a záznam zmien; nasadiť na všetky zoznamy z pravidla 7 (administrácia aj riadiace centrum). Hľadanie a filtre v SQL, nie v pamäti.
3. Zmeraj pred/po (čas načítania Záznamu zmien STRÖMY a Rezervácií) a zapíš do Denníka.

### Z66 [A] ✅ — Vysvetlivky ⓘ na všetkých stránkach (pripomienka 47; pravidlo 8; doska 14) — po Z63
1. Spoločný komponent ⓘ (myš, fokus, ťuknutie; klik nechá otvorené; Esc / klik mimo zatvorí; `aria-describedby`) a miesto v `PageHeader`
   hneď za nadpisom; menšia verzia pri popise poľa.
2. **Texty pre každú stránku** administrácie a riadiaceho centra (`help.*` v prekladoch): čo to je a kedy to použiť, 2–3 vety, ľudsky,
   s príkladom (vzor: Blokácie na doske 14 — over, čo stránka naozaj robí, a nič nesľubuj navyše). ⓘ pri zložitých poliach
   (deň odchodu, priorita sezóny, upratovacie dni medzi pobytmi, provízia portálu, minúty mesačného výpisu…). Dlhé úvodné odseky pod
   nadpismi presuň do ⓘ. Zoznam textov daj do `docs/texty-vysvetliviek.md`, aby ich Martin mohol prečítať naraz.
3. Odkaz „Viac v Pomoci ›“ až keď existuje Pomoc (Z67) — dovtedy bez odkazu.

### Z64 [B] ✅ — Záznam zmien čitateľný (pripomienka 45)
1. **Synchronizácia kalendárov nezaplaví históriu:** zmeny obsadenosti zo synchronizácie iCal (`kind = 'ical'`, systém) nezapisuj po jednom
   riadku — jeden súhrnný záznam za beh kanála („Airbnb: 1 pridané, 1 zmazané, 1 zmenené“) s rozbalením na detail; existujúce záznamy
   zo synchronizácie predvolene skry filtrom „Synchronizácia kalendárov“ (vypnutý). Úprava `record_history` len pridávajúcou migráciou.
2. **Ľudské názvy polí a hodnôt** (preklady; `conflict` → „Kolízia“, `is_blocking` → „Blokuje termín“…), dátumy a časy cez `Intl`,
   rozsahy „16.–20. 10. 2026“; technické polia (uid, expires_at, interné id) skry.
3. **„Vrátiť túto zmenu“ len pri zmenách od ľudí** (nie pri systéme a synchronizácii).
4. Zbalené riadky (kto, čo, kedy jedným riadkom; klik rozbalí rozdiel), filtre bez tlačidla „Filtrovať“ (`FilterPills` / okamžite).
   Platí pre Záznam zmien v riadiacom centre aj pre Nedávno zmazané / históriu u majiteľa, ak používajú to isté zobrazenie.

### Z65 [B] ✅ — Pruh „Kde sa predali noci“ na Prehľade (pripomienka 49) — po Z64
Ten istý komponent a výpočet ako v mesačnom výpise (Z62, `tenant_monthly_report` / `monthly-view.ts` — jeden zdroj). Na Prehľade
s prepínačom **Tento mesiac / Ďalší mesiac** (dopredu = voľné noci, ktoré treba predať); klik na úsek → kalendár na daný mesiac.
Počty v texte, nielen farby. Test: súčty = výpis a Štatistiky.

### Z67 [B] ✅ — Hľadanie (Ctrl K) a Pomoc (pripomienky 48, 50; dosky 15, 16) — po Z65
1. **Hľadanie v hornej lište** (administrácia; v riadiacom centre klienti a nastavenia platformy): zástupný text „Hľadať hostí, rezervácie,
   nastavenia aj pomoc…“, Ctrl K / Cmd K, po kliknutí do prázdneho poľa príklady a posledné hľadania; výsledky v skupinách Nastavenia
   a stránky / Pomoc / Rezervácie a hostia; klávesnica (šípky, Enter, Esc). **Register nastavení a stránok** (názov, synonymá, cesta,
   kotva poľa) v kóde vedľa menu — nová stránka/pole = riadok v registri; klik otvorí stránku a pole na chvíľu zvýrazní. Rezervácie
   a hostia cez DB (RLS, limit). Na mobile ikona lupy.
2. **Stránka Pomoc** (položka dole v bočnom menu vedľa „Čo je nové“): hľadanie, témy, otázky s postupom krok za krokom a tlačidlom
   na stránku, „Pomohlo vám to? Áno / Nie“ (uložiť počty — Martin uvidí v riadiacom centre, ktoré návody nepomáhajú). Obsah verzovaný
   v kóde a prekladoch (ako prehliadka „Čo je nové“), prvá sada ~15 otázok o tom, čo systém **naozaj** robí (vzor na doske 16) —
   zoznam aj do `docs/pomoc-otazky.md` na kontrolu Martinom. Moduly môžu pridať vlastné otázky (háčik manifestu), zobrazia sa len pri zapnutom module.
3. **„Nenašli ste odpoveď?“** — formulár: text + voliteľný obrázok (nahratie súboru; **nie** automatická snímka obrazovky), automaticky
   klient, používateľ, stránka, z ktorej prišiel. Pošle e-mail na `NEXT_PUBLIC_SUPPORT_EMAIL` (Reply-To = používateľ) a zapíše žiadosť
   do riadiaceho centra (zoznam + upozornenie v zvončeku správcu). Doba odpovede: **žiadny sľub v texte**, kým ju Martin neurčí (Otázky).
4. Odkazy z vysvetliviek ⓘ (Z66) na príslušné otázky v Pomoci.

### Z68 [B] ✅ — Hostia: zoznam, karta hosťa, súhlasy a export (pripomienky 52, 53; doska 17) — po Z67
Návrh `docs/vizual-administracia.md` → **v1.6** (prečítaj celé), doska 17 `Hostia`. Jadro, nie modul. Dáta: `guests`, `guest_consent_events`, rezervácie.
1. **Rezervácie › Hostia:** zoznam so stĺpcami, filtrami, hľadaním a stránkovaním v DB (pravidlo 7); karta hosťa ako `RecordPanel`
   (`?panel=guest:<id>`), odkaz na hosťa aj z panelu rezervácie a z hľadania (Z67 — skupina Rezervácie a hostia).
2. Úprava kontaktu majiteľom (meno, telefón, krajina, jazyk, adresa so zdrojom a dátumom, poznámka pre tím — nové stĺpce len pridávajúcou
   migráciou; `record_history` platí). „+ Pridať hosťa“ ručne (bez súhlasu). Zlúčenie duplicít nerob — ak narazíš, zapíš do Otázok.
3. **Súhlas s ponukami:** majiteľ ho **nemôže zapnúť**; môže ho odvolať v mene hosťa (dôvod + kto, do `guest_consent_events`) a poslať
   hosťovi žiadosť o súhlas e-mailom (potvrdzovací odkaz s tokenom; zapíše sa až po kliknutí, zdroj `owner_request`; max. 1× za 12 mesiacov,
   nie po odvolaní). Pravidlá v DB, nie len v rozhraní; pgTAP test, že tím súhlas zapnúť nevie.
4. Nový text súhlasu v košíku a v Moje údaje (v1.6) s názvom ubytovania, nezaškrtnutý.
5. **Export CSV** — dve voľby (so súhlasom / všetci), zápis do záznamu zmien; „Údaje hosťa“ = export jedného hosťa (kontakt, pobyty,
   súhlasy, správy) pre žiadosť hosťa o prístup. Doplň Hostí do exportu klienta (`AREAS` v `tenant-export.ts`), ak tam nie sú celé.
6. ⓘ text a otázky do Pomoci (Ako exportujem kontakty do Ecomailu?, Prečo nemôžem hosťovi zapnúť súhlas?). Testy: vitest, pgTAP (RLS,
   súhlas), e2e na Ukážkovom klientovi; STRÖMY len čítaj.

### Z69 [A] ✅ — Nastavenia s kartami, Prepojenia do Nastavení, spôsoby platby (pripomienky 54, 55; doska 18) — po Z66
Návrh `docs/vizual-administracia.md` → **v1.7** (prečítaj celé), doska 18 `NastaveniaPlatby`, upravený `Sidebar`.
1. Bočné menu bez Prepojení; Nastavenia jedna položka. Stránka Nastavenia s kartami (Všeobecné · Platby · Pravidlá pobytu · Prepojenia ·
   E-maily a upozornenia · Tím · Mesačný výpis), karta v adrese; rozdeľ súčasný obsah nastavení do kariet (ceny/storno/podmienky →
   Pravidlá pobytu, platobné údaje → Platby, iCal → Prepojenia). Staré adresy presmeruj. Lišta Uložiť (Z55) a ⓘ (Z66) platia na každej karte.
2. **Spôsoby platby** ako zbalené riadky podľa v1.7: prevod s QR (zapnúť/vypnúť, IBAN, majiteľ, lehota), karta Stripe „Pripravujeme“
   (neaktívne), účet pobytu len pri module upsell, „Záloha a doplatok — pripravujeme“. Nastavenie spôsobov per klient (nové stĺpce alebo
   tabuľka len pridávajúcou migráciou, RLS, `record_history`); košík ukazuje len zapnuté; aspoň jeden spôsob platby rezervácie zapnutý (DB + rozhranie).
   Stripe **neimplementuj** — len miesto a dátový základ, aby sa pridal bez prestavby (rozhranie poskytovateľa platby v kóde).
3. Úprav odkazy, ktoré viedli na staré stránky (Prehľad — zdravie kalendárov, Kolízie, Pomoc a hľadanie z Z67 — register nastavení).
4. Testy: e2e karty a presmerovania, vypnutie prevodu pri jedinom spôsobe → chyba, košík bez vypnutého spôsobu; axe.

### Z61 [A] ✅ — Kontrola všetkých obrazoviek podľa pravidiel, e2e a „Čo je nové“ (na konci fronty, po Z54–Z60)
1. Prejdi **všetky** obrazovky administrácie, riadiaceho centra, stránky hosťa a účtu hosťa (PC 1440 px aj mobil 390 px) a skontroluj
   pravidlá 1–5 z `docs/pravidla-rozhrania.md`; nedostatky oprav (aj na obrazovkách z linky B). Zoznam skontrolovaných obrazoviek do Denníka.
2. Celý e2e beh + axe; nestabilné testy oprav.
3. Prehliadka „Čo je nové“: nové snímky a text o zmenách (lišta ukladania, potvrdenia, pobyty z portálov, aktuálny pobyt hosťa), zvýš `version`.

**Pripomienky 56–62 (Martin 20. 10., schválené „súhlasím so všetkým“) → Z70–Z72.** Strana hosťa: košík, potvrdenie, pobyt.
Pravidlá `docs/pravidla-rozhrania.md` platia (pravidlo 1 doplnené o stranu hosťa). Linka A: potvrdenie a plochy; linka B: košík.

### Z70 [A] ✅ — Potvrdenie a pobyt: kontakt bez zdvojenia, plochy na strane hosťa (pripomienky 58, 59)
1. **Prekrývanie (58):** na `/r/<kód>` sa pri scrollovaní zelená karta „Váš pobyt“ (sticky) posúva cez kartu kontaktu pod ňou
   (slot `guest.stay.aside` → `GuestMessagesContact` modulu messages). Kontakt je dnes 3× (pätička zelenej karty, karta „Napísať správu“,
   sekcia Správy). **Samostatnú kartu kontaktu zruš**; pätička zelenej karty: „Napísať správu“ (skok na sekciu Správy — len keď je modul
   messages zapnutý, napoj cez slot, jadro o module nevie), telefón, WhatsApp ak je nastavený. To isté v detaile pobytu v účte
   (`stay-detail.tsx`, aside sticky). Ak v pravom stĺpci ostane iný obsah zo slotu, zelená karta ho nesmie prekryť.
2. **Biele na bielom (59) — pravidlo 1 na celej strane hosťa:** pozadie stránky ostáva biele; karty (Správy, platba s QR, účet, pobyt,
   check-in, objednávky, panely košíka…) dostanú jemný teplý odtieň + okraj; polia, rýchle odpovede a podobné prvky biele s okrajom
   s kontrastom ≥ 3 : 1. Tokeny v `globals.css`, žiadne farby natvrdo (napr. `save-to-account.tsx` má `#5a6672`, `#f7f4ed`);
   funguje aj s témami klientov. Prejdi: detail objektu, košík, `/r`, účet (prehľad, pobyt, Moje údaje), check-in, upsell, `/suhlas`.
3. Testy: e2e — na `/r` po scrolle sa karty v pravom stĺpci neprekrývajú (1280×800, 1440×900), PC aj mobil; axe; kontrola kontrastu.

### Z72 [B] ✅ — Pridať do kalendára a účet na potvrdení (pripomienky 60, 61)
*Presunuté z linky A na B (Martin 20. 10. — B je voľná). Linka A súčasne robí Z70 v tých istých súboroch (`/r/[token]/page.tsx`,
`stay-detail.tsx`): ponuku kalendára sprav ako **samostatný komponent** (napr. `add-to-calendar.tsx` + `calendar-links.ts`) a do stránok
zmeň len riadok tlačidla; presun „Uložiť do účtu“ je jeden blok. Pred commitom `git pull --rebase`, konflikt vyrieš ponechaním zmien
linky A. Bod 3 (odsadenie) robí linka A ako Z74.*
1. **„Pridať do kalendára“** (dnes len stiahne .ics) → malá ponuka: **Google Kalendár** (odkaz `calendar.google.com/calendar/render?action=TEMPLATE…`),
   **Outlook** (odkaz `outlook.live.com/calendar/0/deeplink/compose…`), **Apple / iný kalendár** (.ics ako doteraz). Udalosť: „Pobyt — {objekt}“,
   príchod (čas od) – odchod (čas do), adresa, odkaz na pobyt; **bez prístupových kódov a Wi-Fi**. Časové pásmo klienta. Na `/r`, v detaile
   pobytu v účte a tie isté tri odkazy v potvrdzujúcom e-maile. Žiadne API ani kľúče. Unit testy tvorby odkazov (dátumy, kódovanie).
2. **Účet:** blok „Uložiť do účtu“ na `/r` presuň hore pod nadpis (dnes dole, prehliadne sa). Text: pobyt nájdete v Mojom účte, prihlásite
   sa e-mailom bez hesla. Rovnaká veta do potvrdzujúceho e-mailu. Over, že po prihlásení kódom sa pobyty s tým e-mailom ukážu samy;
   ak nie, zapíš do Otázok a nechaj tlačidlo.

### Z71 [B] ✅ — Košík, krok Platba: zľavový kód, spôsob platby, texty, faktúra na firmu (pripomienky 56, 57, 61, 62)
1. **Zľavový kód (56):** namiesto veľkého poľa odkaz „Máte zľavový kód?“, ktorý pole rozbalí; po použití zbalený riadok
   „Kód XY · −10 % ✓ · Odstrániť“.
2. **Spôsob platby (57, ROZHODNUTIA 2026-10-20):** karty s výberom zo spôsobov zapnutých klientom (nastavenie zo Z69): **Prevod s QR**
   (predvolený, jednou vetou ako to prebehne) a **Platba kartou — neaktívna so štítkom „Pripravujeme“**, kým nie je Stripe. Zvolený
   spôsob sa uloží k rezervácii. **Na produkcii sa neaktívna karta nesmie ukázať** (napr. podľa prostredia) — skontroluj a zapíš
   do *Pred spustením*.
3. **Opakované texty (56):** storno dnes 3× (zelený box, pri políčku, pod tlačidlom) → raz; „zaplatiť do 24 h“ a „termín držíme 30 minút“
   sa pletú → 30 min = podržanie termínu, kým hosť dokončí objednávku, 24 h = lehota platby; každé raz a zrozumiteľne.
4. **Účet (61):** pri kontaktných údajoch veta „Pobyt nájdete aj v Mojom účte — prihlásite sa e-mailom, bez hesla.“ **Žiadne pole hesla.**
5. **Faktúra na firmu (62):** nepovinné „Chcem faktúru na firmu“ → rozbalí názov firmy, IČO, DIČ, IČ DPH (nepovinné), adresu firmy.
   Uloží sa k rezervácii (migrácia len pridáva, RLS, `record_history`), zobrazí sa v paneli rezervácie a v podklade na doklad.
   **Adresu bežného hosťa pri rezervácii nezbierame** (zbiera ju online check-in).
6. Testy: e2e košíka (kód, výber platby, firma), PC aj mobil 390 px; axe.

### Z73 [B] ✅ — Rezervácie: predvolene najnovšie hore (pripomienka 63) — po Z71
Martin 20. 10.: zoznam Rezervácie v administrácii má byť predvolene zoradený **podľa čísla zostupne — najnovšie rezervácie prvé**
(dnes podľa termínu, Z58). V `src/app/admin/reservations/query.ts` zmeň `defaultSort` na najnovšie (`created_at` zostupne — poradie
čísla; ak sa číslo a čas vytvorenia rozchádzajú pri ručných rezerváciách, rozhoduje čas vytvorenia), v hlavičke stĺpca Číslo
zobraz aktívne zoradenie. Zoradenie podľa termínu ostáva na klik; pohľad „kto prichádza“ je Príchody. Uprav testy, ktoré čakajú
pôvodné poradie. Malá úloha — e2e len zoznamu rezervácií.

### Z75 [B] — Mesačný výpis: ušetrené provízie ako rozpočet na marketing (Martin 21. 10.)
Filozofia predaja (`ARCHITEKTURA.md` A10): to, čo klient ušetrí na províziách, môže dať do vlastného marketingu. Majiteľovi samotné
„ušetrili ste X“ nič nehovorí — vie, že bez marketingu hostia neprídu. Má vidieť **rozpočet na marketing** a čo mu po ňom ostane.
1. Vo výpise (stránka, e-mail aj PDF — jeden zdroj `src/core/reports/monthly-view.ts`) nazvi úsporu **„Váš rozpočet na vlastný marketing
   tento mesiac: X €“** (= ušetrené provízie oproti portálu, výpočet ostáva).
2. Nepovinné pole **„Koľko ste tento mesiac minuli na marketing“** (marketér, reklamy) pri výpise; uloží sa po mesiacoch (migrácia len pridáva,
   RLS, `record_history`). Ak je vyplnené: **„Po marketingu ste v pluse Y € oproti Bookingu“** (príklad Martina: rozpočet 2 200 €,
   marketing 1 500 € → +700 €). Záporné číslo ukáž vecne, bez strašenia.
3. **Súčet od začiatku** (od zapnutia platformy): rozpočet spolu, minuté na marketing spolu, v pluse spolu — „časom sa to kumuluje“.
4. Rovnaký riadok rozpočtu na Prehľade pri pruhu nocí (Z65), ak sa zmestí. Texty v prekladoch; ⓘ s vysvetlením výpočtu (sadzba portálu
   z Nastavení — klient má zadať svoju skutočnú sadzbu z faktúr Bookingu). Testy: výpočet (vitest), e2e výpisu.

### Z74 [A] — Odsadenie pripnutého zhrnutia pod lištou (pripomienka 64) — po Z70
v detaile pobytu v účte (`/ucet/pobyt/<id>`, `stay-detail.tsx`, aside `lg:sticky lg:top-6`)
   sa zelené zhrnutie pri scrolle zasunie pod pripnutú lištu účtu (Aktuálny pobyt · Pobyty · Moje údaje) — vrch karty nevidno.
   Odsadenie = výška pripnutej hlavičky/lišty + medzera (jedna CSS premenná, nie číslo natvrdo), aj na `/r` a všade, kde je pripnutý stĺpec
   pod pripnutou hlavičkou. Ak by karta bola vyššia než okno, nepripínať ju (inak spodok nevidno). E2e: po scrolle je horný okraj karty pod lištou.

### Z76 [A] — Správy: automatický preklad medzi jazykom hosťa a majiteľa (Jana 22. 10.) — po Z74
Ako na Bookingu/Airbnb: hosť píše po svojom (napr. hebrejsky), majiteľ dostane správu po slovensky; majiteľ odpíše po slovensky,
hosťovi príde v jeho jazyku. Súčasť modulu `messages`.
1. **Jazyk hosťa volí hosť** (Martin: nie automatická detekcia): v účte → Moje údaje „Jazyk, v ktorom komunikujem“ a aj priamo pri
   správach (aj cez prístupový odkaz `/r/<kód>` bez účtu) malý výber „Píšete v inom jazyku?“. Predvolene jazyk stránky pri rezervácii.
   Uloží sa k hosťovi (migrácia len pridáva, RLS, `record_history`). Jazyk majiteľa = nastavenie klienta (predvolene slovenčina).
2. **Preklad cez DeepL API** (EÚ, podporuje aj hebrejčinu): kľúč `DEEPL_API_KEY` len na serveri (adresa API free/pro podľa kľúča — free
   končí `:fx`); kľúč pridá Martin do `.env.local` a Vercelu, nikdy do repozitára. Prekladať len keď sa jazyky líšia.
3. **Originál sa vždy uloží**, preklad zvlášť (cache podľa jazyka); pri správe „Zobraziť originál“ u majiteľa aj hosťa. E-mail hosťovi
   v jeho jazyku. **Automatické správy** (pokyny k príchodu…) sa hosťovi pošlú preložené (cache podľa pravidla a jazyka).
4. **Zapínanie a strážca nákladov:** v Nastaveniach klienta (karta E-maily a upozornenia / Správy) „Prekladať správy automaticky“;
   počítadlo preložených znakov za mesiac v riadiacom centre; pri dosiahnutí limitu (free 500 000 znakov/mesiac) sa ďalej posiela
   originál s poznámkou „nepreložené“, upozornenie Martinovi. Pri chybe DeepL: originál + opakovanie, nič sa nestratí.
5. **Ochrana údajov — povinné:** text správ ide tretej strane. **DeepL Free (aj API Free) môže texty uchovávať na zlepšovanie služby →
   len na skúšanie s testovacími dátami** (Ukážkový klient, testovacie e-maily). Skutočné správy hostí len cez **DeepL API Pro** (texty
   nemaže/neukladá) so zmluvou o spracúvaní (DPA). Doplň: zoznam sprostredkovateľov v `docs/prevadzka/` (DeepL, účel, krajina) a do
   *Pred spustením*: „DeepL Pro + DPA, sprostredkovateľ uvedený v zásadách ochrany osobných údajov klienta“. Overiť aktuálne podmienky DeepL.
6. Testy: vitest s náhradou DeepL (bez skutočného volania), e2e konverzácie s prekladom (náhrada); jeden ručný test so skutočným
   free kľúčom na stagingu (Ukážkový klient) — výsledok do Denníka.

*Hotové úlohy Z31–Z53 (zadania) sú v `docs/archiv/ulohy-hotove-do-Z53.md`.*

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
- [ ] 3d Podklad na doklad (ručné vystavenie, nahratie dokladu hosťovi — A5), prehľad rezervácií pre majiteľa, export, testovanie, spustenie popri Bookingu
- [ ] 3f Príprava produkcie — zálohy a obnova (A9, 17. 10.): nezávislá nočná záloha mimo Supabase + upozornenie pri zlyhaní;
  **stav záloh** v Stave systému (posledná záloha, posledné skúšobné obnovenie); **export dát klienta** (ZIP) v detaile klienta;
  **skript a spísaný postup chirurgickej obnovy jedného klienta** zo zálohy bokom (len jeho `tenant_id`, výpis zmien pred zápisom,
  potvrdenie Martina); prvé skúšobné obnovenie. Postup pri výpadku (dokument).
- [ ] 3e Nasadenie u Jany: `rezervacia.chaletstromy.sk`, vyhľadávací pás na jej webe (Elementor HTML widget), tlačidlá „Rezervovať“ (A17)

### Pred spustením — musí byť hotové 🔧 + 🧠
*Bez týchto bodov sa ostrá prevádzka (produkcia, skutoční hostia) nespúšťa. Pri príprave produkcie prejsť celý zoznam.*
- [ ] **Platba kartou (Stripe)** — Martin 20. 10. (ROZHODNUTIA): funkčná platba kartou v košíku (a pri upselle „kartou hneď“).
  Do vtedy je v košíku karta ako neaktívna možnosť „Pripravujeme“ (č. 57) — **na produkcii sa neaktívna karta hosťom nesmie ukázať.**
  Z71: karta „Pripravujeme“ sa ukazuje len pri nastavenom `EMAIL_REDIRECT_TO` (staging); produkcia ho mať nesmie (bod o e-mailoch nižšie)
  → bez neho karta zmizne sama (`upcomingMethods` v `src/core/payments/methods.ts`, test). Pri spustení skontrolovať, že na produkcii chýba.
- [ ] Preklad správ (Z76): **DeepL API Pro + zmluva o spracúvaní**, DeepL uvedený ako sprostredkovateľ v zásadách ochrany osobných údajov klienta (free plán len na skúšanie).
- [ ] Produkčné prostredie: druhý Supabase projekt, Vercel produkcia, platené plány, doména klienta (3e) — Martin odsúhlasí náklady.
- [ ] **E-maily hosťom naostro:** overená doména odosielateľa v Resende (SPF, DKIM, DMARC) a `EMAIL_FROM` na nej; `EMAIL_REDIRECT_TO`
  na produkcii prázdne (staging posiela všetky e-maily na info@obrazne.sk s pôvodným príjemcom v predmete — na stagingu je to zámer, Martin 20. 10. súhlasí).
  Skúška doručenia do Gmailu, Outlooku a Seznamu (nie do spamu).
- [ ] Zálohy a obnova na produkcii (3f): nočná záloha produkcie, skúšobné obnovenie.
- [ ] Online check-in — overiť pravidlá (Otázky pre Martina: polia knihy ubytovaných, lehota, uchovávanie, deti, daň obce).
- [ ] Riadiace centrum na produkcii: vlastná adresa a dvojstupňové overenie pre správcu (Otázky, pripomienka č. 9).
- [ ] Doklady (3d): podklad na doklad a nahratie dokladu hosťovi podľa Janinho fakturačného nástroja.
- [ ] Právne texty klienta (VOP, ochrana osobných údajov, storno) skontrolované Martinom / Janou.

## Fáza 4 — Po spustení 🔧 + 🧠
- [ ] 🧠→🔧 **Licencie klientov** (Martin 21. 10.): licencia = záznam zmluvy v riadiacom centre, nie tajný kľúč k aplikácii (aplikácia beží
  u nás, klient kód nedostane). Číslo licencie, klient (firma), na čo platí (objekt/objekty), balík a moduly, cenové podmienky (zriadenie,
  mesačne, %), začiatok, viazanosť do, stav podľa platieb (aktívna · po splatnosti · pozastavená → rezervácie neprijíma, administrácia len
  na čítanie). Klient ich môže mať viac (ďalší objekt = ďalšia licencia); viazané na firmu, nie na e-mail. Klient vidí v administrácii
  číslo licencie, platnosť a balík. Číslo licencie = číslo v zmluve. Navrhnúť po dohode obchodného modelu (A10).
  **Rozsah licencie (Martin 21. 10.):** licencia patrí tomu, komu idú peniaze z rezervácií (IBAN klienta), nie tomu, kto objekt spravuje.
  Viac vlastných objektov jednej firmy = jedna licencia (zriadenie rovnaké, mesačne príplatok za ďalší objekt — výšku určí Martin).
  Cudzí objekt v správe (napr. Jana spravuje chalet kamarátke) = samostatný klient a samostatná licencia; správca sa prihlási do oboch
  jedným účtom. Do zmluvy: licencia pokrýva objekty prevádzkované na účet držiteľa licencie.
- [ ] *Odložené (Martin 22. 10.):* channel manager a jednotná schránka Booking/Airbnb cez sprostredkovateľa (napr. Channex, ~10 €/klient
  mesačne) — zložité na stavbu a podporu; zatiaľ iCal. Vrátiť sa, keď to budú klienti pýtať (`docs/biznis/konkurencia-rentalls.md`).
- [ ] 🧠→🔧 **Rezervácie na schválenie + rekreačné a darčekové poukazy** (Jana 22. 10., pripomienky 66–68): pri objekte nastavenie
  **okamžitá rezervácia / na schválenie**; na schválenie termín podržaný, majiteľ do **48 h** schváli alebo zamietne (pripomienka, po lehote
  automatické zrušenie); karta len **zablokovaná** (Stripe manuálne strhnutie — schválenie = strhnúť, zamietnutie = uvoľniť, blokácia platí
  ~5–7 dní), prevod = platobné údaje až po schválení; hosťovi vysvetliť „čakajúcu platbu“ v banke. **Rekreačný poukaz** = spôsob platby,
  ide vždy na schválenie: hosť zadá číslo poukazu, majiteľ overí, vyplní fakturačné údaje firmy a sumu poukazu, schváli → hosťovi príde
  doplatok (karta/prevod); dva podklady na doklad (poukaz + doplatok). **Darčekový poukaz** (iné ako zľavový kód — je to hodnota, platba):
  majiteľ vytvorí (hodnota, meno, platnosť) → jedinečný kód + PDF v dizajne klienta, použiteľný v košíku aj čiastočne (zostatok);
  neskôr aj predaj poukazov na stránke klienta. Faktúry Jany: **Omega (KROS)** — preveriť import (pripomienka 65).
- [ ] Záloha a doplatok (Stripe/karta sa presunul pred spustenie — Fáza 3, *Pred spustením*)
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
- [ ] 🧠 **Modul Prepojenie s fakturačným nástrojom** (platený, rozhodnutie 18. 10.): adaptér na nástroj klienta — SuperFaktúra, iKROS,
  Billdu, Fakturoid, iDoklad…; každý nový nástroj = práca na mieru za poplatok. Doklad sa vystaví sám po zaplatení (aj vyúčtovanie účtu pobytu),
  hosť ho nájde v účte. Pre Janu podľa toho, v čom fakturuje (otázka v Otázkach).
- [ ] 🧠 **Modul Automatické párovanie platieb** (Martin 18. 10., platený doplnkový modul, teraz nerobiť): platba prevodom / QR sa sama
  spáruje s rezerváciou podľa **variabilného symbolu a sumy** → „Platba prijatá“ bez kliku majiteľa (a s ňou potvrdzovací e-mail hosťovi).
  **Pre všetky banky klientov, nie len Fio.** Hlavná cesta: **e-mailové notifikácie banky** na adresu, ktorú systém vygeneruje a číta
  (tak to robí SuperFaktúra aj Fakturoid — v SK funguje ČSOB, Fio, Slovenská sporiteľňa, Tatra banka; formát e-mailu sa líši, parser na banku).
  Doplnkovo API bánk tam, kde je (Fio API zadarmo s tokenom; Tatra banka Premium API — platené, podnikateľský účet) alebo PSD2 agregátor.
  Rozhodnúť: čiastočná platba a preplatok, platba bez VS (ručné priradenie), platby za účet pobytu (rovnaký VS), bezpečnosť tokenu klienta.
- [ ] 🧠 **Modul Prepojenie s e-mail marketingom** (Martin 18. 10., doplnkový modul, teraz nerobiť): kontakty priamych hostí
  sa automaticky posielajú do nástroja klienta — **Ecomail**, **SmartEmailing** (prípadne ďalšie). Len hostia so **súhlasom s novinkami**
  (nepovinný, nezaškrtnutý — B7); odvolanie súhlasu v účte hosťa = odhlásenie aj v nástroji. Rozhodnúť: ktoré polia (meno, e-mail, jazyk,
  termín posledného pobytu, objekt) a štítky, jednorazový import existujúcich, API kľúč klienta v nastaveniach modulu, čo pri výpadku.
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
- **Pomoc (Z67) — doba odpovede:** do akej doby odpovieš na otázku z formulára „Nenašli ste odpoveď?“ (napr. „do 1 pracovného dňa“)? Kým to neurčíš, text nič nesľubuje.
  Aby žiadosti chodili aj e-mailom, nastav na Verceli `NEXT_PUBLIC_SUPPORT_EMAIL` (inak sú len v riadiacom centre › Podpora a vo zvončeku).
  Prečítaj otázky a odpovede Pomoci v `docs/pomoc-otazky.md` (18 otázok) — čo opraviť alebo doplniť.
- **Recenzie — schvaľovanie (pripomienka 37, 18. 10., čaká na rozhodnutie, nerobiť):** Martin chce, aby si ubytovateľ každú recenziu
  schválil sám (bez automatického zverejnenia po 72 h). Je to v rozpore s rozhodnutím 2026-10-17 (zverejnia sa všetky, zamietnuť len
  porušenie pravidiel — Omnibus: pri „overených recenziách“ a priemere nesmie majiteľ potichu vyberať len pozitívne). Možnosti:
  (1) ponechať pravidlo, pri novej recenzii upozornenie „zverejní sa o 3 dni“ s tlačidlami Zverejniť hneď / Zamietnuť s dôvodom, príp. lehota 7 dní;
  (2) ručný výber, ale bez priemeru a bez označenia „overené“ (= Referencie).
- **Zoznam klientov — „kategórie“ (pripomienka 32):** stav / balík / modul / problém, alebo niečo iné (typ ubytovania)? Z57 zatiaľ robí filtre stav, modul, skúška, problém.
- **Podklad na doklad (Z51) — faktúra na firmu a adresa:** podklad má odberateľa len s menom, e-mailom, telefónom a krajinou — **adresu,
  firmu, IČO, DIČ od hosťa nezbierame** (adresa je len v online check-ine, a to citlivo). Pri „faktúre na firmu“ ich klient musí dopísať
  ručne. Chceš v košíku voliteľné „Chcem faktúru na firmu“ (názov, IČO, DIČ/IČ DPH, adresa)? Mení to, čo vidí hosť, preto som ho nepridal.
  Ďalej: export za mesiac berie pobyty **podľa dátumu odchodu** (potvrdené, prebiehajúce, ukončené) — vyhovuje to účtovníkovi, alebo
  podľa dátumu platby? Text „Podklad — nie je daňový doklad. Doklad vystavte vo svojom fakturačnom nástroji.“ skontroluj.
- **Správy (Z45) — tlačidlo „Odpovedať“ v e-maile hosťovi:** vedie na prístupový odkaz pobytu (`/r/<kód>#spravy`), ktorý hosťa pustí
  k pobytu bez hesla a **neexspiruje** (návrh B11 hovorí o prihlásení platnom 7 dní). Stačí to tak, alebo chceš jednorazové prihlásenie
  do účtu s platnosťou 7 dní (bezpečnejšie pri preposlanom e-maile, ale hosť bez účtu by si ho musel založiť)?
- **Zrušenie účtu hosťa (Z43) — skontroluj formulácie:** v Moje údaje „Stiahnite si kópiu svojich údajov alebo požiadajte o zrušenie účtu.
  Údaje, ktoré musíme uchovať zo zákona (doklady, kniha ubytovaných), zostanú do konca lehoty.“ a v okne „Požiadame {ubytovateľ} o zrušenie
  vášho účtu. Údaje, ktoré netreba uchovať zo zákona, zmaže alebo anonymizuje; doklady a kniha ubytovaných zostanú do konca zákonnej lehoty.
  Rezervácie, ktoré ešte len prídu, to neruší.“ Žiadosť dostane majiteľ ako upozornenie; samotné zmazanie zatiaľ robí ručne (nástroj neskôr).
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
- 2026-10-20 — Z72 [linka B]: **Pridať do kalendára a účet na potvrdení** (pripomienky 60, 61). (Claude Code)
  - Samostatné súbory (bez zásahu do práce linky A): `src/core/guest/calendar-links.ts` (Google `calendar.google.com/…?action=TEMPLATE`,
    Outlook `outlook.live.com/…/deeplink/compose`, .ics — čisté funkcie, unit testy vrátane letného/zimného času), `stay-calendar.ts`
    (udalosť z rezervácie: „Pobyt — {objekt}“, príchod od času check-inu – odchod do času check-outu v časovom pásme klienta, bez
    časov celodenná; adresa len pri presnej polohe; **bez kódov a Wi-Fi**), `add-to-calendar.tsx` (ponuka Google · Outlook · Apple / iný).
  - Ponuka na `/r` (riadok tlačidla v zelenej karte), v detaile pobytu v účte (zelený Účet pobytu, pred odchodom; nová trasa
    `/ucet/pobyt/<id>/ics` len pre pobyt prihláseného hosťa) a tie isté tri odkazy v potvrdzujúcom e-maile (`guest_confirmed`).
  - **Účet:** blok na `/r` presunutý hore pod nadpis — „Pobyt nájdete aj v Mojom účte · prihlásite sa e-mailom, bez hesla“; rovnaká
    veta v potvrdzujúcom e-maile a v riadku „Uložiť do účtu“ zaplateného pobytu. Overené: po prihlásení kódom sa pobyty s tým e-mailom
    pripoja samy (prepojenie hosťa po overení e-mailu, Z43) — tlačidlo ostáva.
  - Testy: vitest `calendar-links.test.ts`, e2e `confirm.spec.ts` rozšírený (účet nad platbou, ponuka a odkazy, .ics bez kódov,
    kalendár v zaplatenom pobyte); `stay-states`, `account*` prešli. Snímky `docs/snimky/z72/`.
- 2026-10-20 — Z70 [linka A]: **potvrdenie a pobyt — kontakt bez zdvojenia, plochy na strane hosťa** (pripomienky 58, 59). (Claude Code)
  - **Kontakt raz:** samostatná karta kontaktu modulu Správy (slot `guest.stay.aside`) zrušená — šmýkala sa pod sticky zelenú kartu.
    Kontakt je len v **pätičke zelenej karty** (`src/core/guest/stay-contact.tsx`): kto odpovedá, „Napísať správu“ z modulu cez nový slot
    `guest.stay.contact` (jadro o module nevie; na PC skok na sekciu Správy, na mobile jej stránka), WhatsApp a telefón ak sú nastavené.
    Na `/r` (čaká na platbu) aj v detaile pobytu v účte (a teda aj na `/r` zaplateného pobytu). Meno na vlastnom riadku, akcie pod ním.
  - **Plochy hosťa (pravidlo 1):** token `--guest-card` (#faf8f3) a trieda `.guest-card` (teplý odtieň + okraj `--card-border`) na
    kartách: platba s QR (QR na bielom), check-in, Správy, pokyny k príchodu, doobjednanie, pobyty v účte, bočný panel účtu, karta
    zrušenia, recenzie, rezervačný box a referencie na stránke objektu, kalendár v košíku, karty na úvodnej stránke klienta, check-in
    formulár. Natvrdo zadané sivé (`#6b7480`, `#5a6672`, `#f7f4ed`) v správach, check-ine, upselle, zrušení a „Uložiť do účtu“ →
    tokeny. `--muted-foreground` stránky hosťa o odtieň tmavší (oklch 0.52), aby sivý text mal 4,5 : 1 aj na teplej karte; drobná cena
    v kalendári `#53575d`.
  - `scripts/ui-audit.mjs` kontroluje na strane hosťa aj kartu, ktorá splýva s plochou alebo je biela na bielom, a košík s termínom.
    Hosťovské obrazovky PC aj mobil bez nálezu. e2e `stay-contact.spec.ts` (jeden kontakt, žiadne „Napíšte…“, karty v pravom stĺpci
    sa pri scrolle neprekrývajú na 1280×800 a 1440×900, žiadna biela karta, axe; čaká na platbu aj potvrdený; PC aj mobil) prešiel.
  - **Testy strany hosťa** (po uvoľnení miesta na G:): messages-guest, stay-states, confirm, account*, checkin-guest, upsell-guest,
    guest, cart, cart-payment, a11y, reviews-guest, stay-contact, ui-rules — 33 ✓; `reviews-guest` našiel ešte sivý text `#6e747c`
    na teplej karte (opravené na token), `cart` Z30 samostatne prešiel (známy pomalý). Pozorované: kontrolné skripty občas dostanú
    404 na pobyt testovacieho hosťa — pravdepodobne paralelný e2e beh linky B maže pri upratovaní rezervácie `@booking-platform.test`.
- 2026-10-20 — Z73 [linka B]: **Rezervácie predvolene najnovšie hore** (pripomienka 63). (Claude Code)
  - `query.ts`: predvolené zoradenie `created_at` zostupne, pri rovnakom čase rozhoduje číslo (ukážkové dáta majú rovnaký čas
    vytvorenia); stĺpec Číslo ukazuje aktívne zoradenie aj bez `?sort=` (`SortHeader` — nový `defaultDir`). Termín ostáva na klik.
  - e2e `reservations-order.spec.ts` (prvé dve čísla = najnovšie v DB, klik na Číslo a Termín); `lists-paging` prešiel.
- 2026-10-20 — Z71 [linka B]: **Košík, krok Platba** (pripomienky 56, 57, 61, 62). (Claude Code)
  - **Spôsob platby** ako karty s výberom (`PaymentChoice`): Prevod s QR (predvolený, jednou vetou — QR a pokyny hneď, zaplatiť do 24 h,
    bez poplatkov) a **Platba kartou — neaktívna „Pripravujeme“** (len na stagingu, viď *Pred spustením*). Zvolený spôsob sa uloží
    k rezervácii (`reservations.payment_method`, platba v `payments.provider`); server prijme len spôsob, ktorý je zapnutý a funguje.
  - **Zľavový kód** za odkazom „Máte zľavový kód?“; po použití zbalený riadok „Kód XY · −suma ✓ · Odstrániť“.
  - **Texty raz:** storno len pri jeho políčku (preč zo zeleného boxu, zo zoznamu uistení v kroku 3 aj spod tlačidla na kroku 3);
    30 min = „Termín vám držíme 30 minút, kým dokončíte objednávku“ (hore), 24 h = lehota platby (pri prevode); spodná poznámka zmizla.
  - **Účet:** pri kontaktných údajoch „Pobyt nájdete aj v Mojom účte — prihlásite sa e-mailom, bez hesla.“ Žiadne pole hesla.
  - **Faktúra na firmu:** „Chcem faktúru na firmu“ rozbalí názov, IČO, DIČ, IČ DPH (nepovinné), adresu firmy; bez nich sa nedá pokračovať
    (košík aj server). Uloží sa k rezervácii (`billing_*`, migrácia `…20120000_cart_payment_billing` len pridáva; `create_reservation`
    rozšírené), je v paneli rezervácie (Platba a faktúra) a v podklade na doklad (text aj PDF — firma prvá). Adresu hosťa nezbierame.
  - Testy: pgTAP `cart_payment_billing.test.sql`, vitest (`methods.test.ts` — karta len na stagingu, `basis.test.ts` — firma),
    e2e `cart-payment.spec.ts` (PC + mobil, axe; dočasný zľavový kód), upravené `guest.spec.ts` a `cart.spec.ts` (storno v kroku 3 raz).
    Snímky `docs/snimky/z71/`.
- 2026-10-20 — Z61 [linka A]: **kontrola všetkých obrazoviek podľa pravidiel, e2e a „Čo je nové“** (pravidlá 1–8). (Claude Code)
  - **Skript `scripts/ui-audit.mjs`** prejde 57 obrazoviek (administrácia 34 vrátane kariet Nastavení a panelu rezervácie,
    riadiace centrum 14, prihlásenie majiteľa, stránka objektu, prístupový odkaz a účet hosťa po prihlásení 8) na PC 1440 px
    aj mobile 390 px a na každej strojovo skontroluje: axe (vážne/kritické), vodorovný posun, biele polia s okrajom ≥ 3 : 1 voči
    ploche, kartu v karte, pole mimo svojho rámčeka, ⓘ za nadpisom. Výsledok `docs/snimky/z61/report.md` (zoznam obrazoviek),
    vybrané snímky v `docs/snimky/z61/` (všetky sa urobia znova príkazom `node scripts/ui-audit.mjs docs/snimky/z61`).
  - **Opravené nálezy:** pruh pobytu z portálu v kalendári mal biely text na `#9aa4b0` (2,5 : 1) → `#6b7480` (4,8 : 1); budúce
    mesiace v tabuľke Štatistík `#84888e` → `#6b7480`; pole adresy exportu kalendára bez popisu (axe label); ručná rezervácia —
    dlhý názov jednotky v zozname roztiahol stĺpec a polia pretiekli formulár o 9 px → pravidlo 6 v `globals.css`
    (`min-width: 0` v mriežkach formulárov, `select { max-width: 100% }`). Po opravách **114 / 114 bez nálezu**; snímky prezreté aj
    očami (karta v karte, viditeľné Uložiť, otvorené „Nový …“ — bez nálezu). Pomoc je výnimka z ⓘ (je vysvetlením sama).
  - **Hľadanie a Pomoc po Z69:** umiestnenia v hľadaní („Nastavenia › Platby › Prevod na účet“…) a postupy v odpovediach Pomoci
    (`help.faqs` aj `docs/pomoc-otazky.md`: IBAN, lehota, storno, pokyny k príchodu, kalendáre portálov, Nedávno zmazané) na nové karty.
  - **„Čo je nové“** majiteľa `2026-10-20.1`, 10 nových snímok navrch: lišta Uložiť a potvrdenia, Nastavenia s kartami a spôsoby
    platby, vysvetlivky ⓘ, hľadanie Ctrl K, Pomoc, Hostia, pobyty z portálov, aktuálny pobyt hosťa, mesačný výpis, zbalené zoznamy
    a stránkovanie (30 snímok s modulmi). Správca `2026-10-20.1` s Podporou. `tour-screens.mjs` vie pred snímkou urobiť krok
    (zmeniť pole, otvoriť ⓘ, Ctrl K) a snímku hosťa cez dočasný testovací pobyt.
  - **e2e:** celý beh 96 ✓ / 4 ✗ → opravené: `tour.spec` (nové snímky), `reviews.spec` (výber pobytu bez recenzie — vnorený dopyt
    vracal prázdne recenzie a vkladal duplicitu), `loginOwner` teraz označí prehliadku ako videnú (nová verzia zakrývala stránku
    testom, ktoré to zabudli; test prehliadky `{ tours: "keep" }`). `admin-v1` mobil (kalendár hosťa) samostatne prešiel —
    známy pomalý pri záťaži. Ukážkové dáta obnovené (`demo-data --reset`, rezervácia „čaká na platbu“ vypršala).
- 2026-10-19 — Z69 [linka A]: **Nastavenia s kartami, Prepojenia do Nastavení, spôsoby platby** (pripomienky 54, 55, doska 18). (Claude Code)
  - **Bočné menu:** Prepojenia zrušené, Nastavenia jedna položka. **Nastavenia** = karty Všeobecné · Platby · Pravidlá pobytu ·
    Prepojenia · E-maily a upozornenia · Tím · Mesačný výpis (`?tab=vseobecne|platby|pravidla|prepojenia|upozornenia|tim|vypis`),
    ⓘ vysvetľuje otvorenú kartu. Rozdelenie: kontakt a podpis, provízia a DPH, recenzie a témy správ → Všeobecné; prevod (IBAN,
    majiteľ, BIC, lehota), karta, účet pobytu → Platby; storno a pásma, dočasná blokácia, VOP a GDPR, check-in (modul) → Pravidlá;
    kalendáre portálov + „Ďalšie prepojenia — pripravujeme“ → Prepojenia; e-mail majiteľa, dni pred príchodom + zvonček a push →
    E-maily a upozornenia. Nedávno zmazané ostáva samostatná stránka (odkaz z Všeobecné).
  - **Každá karta ukladá len svoje polia** (`saveSettings` čiastočne — predtým by karta bez IBAN-u IBAN zmazala); lišta Z55 platí.
  - **Staré adresy** `/admin/ical`, `/admin/team`, `/admin/settings/notifications` presmerujú na kartu; odkazy (kalendár, Prehľad —
    zdravie kalendárov, Pomoc, hľadanie s `?tab=…&hl=…` — riadok s poľom sa otvorí, zvonček, push, prehliadka) upravené.
  - **Spôsoby platby** (zbalené riadky): Prevod na účet s QR (zapnúť/vypnúť, IBAN, majiteľ, BIC, lehota, vysvetlenie), Platba kartou
    (Stripe) **Pripravujeme** s neaktívnym „Prepojiť so Stripe“, Na účet pobytu len s modulom upsell, „Záloha a doplatok —
    pripravujeme“. Migrácie `…19180000_payment_methods` (`bank_transfer_enabled`, `card_enabled`, `stripe_account_id` — len id
    účtu, nikdy kľúče; karta len s prepojeným účtom; aspoň jeden spôsob zapnutý) a `…19190000_stripe_account_guard` (účet Stripe
    nastaví len prepojenie cez služobnú rolu, nie formulár). Rozhranie poskytovateľa platby `src/core/payments/methods.ts` (+ test):
    košík ponúka len zapnuté, hotové a nastavené spôsoby — dnes prevod; „Ako zaplatíte: prevodom na účet…“ v kroku 3 košíka.
  - e2e `settings-tabs.spec.ts` (karty v adrese, presmerovania, vypnutie jediného spôsobu → chyba v rozhraní aj DB, karta
    Pripravujeme, karta ukladá len svoje polia, hľadanie otvorí riadok s IBAN, axe), `guest.spec` (košík len s prevodom),
    `admin-v12` (menu bez Prepojení), `info-tips` (karty). Snímky `docs/snimky/z69/`.
- 2026-10-19 — Z66 [linka A]: **vysvetlivky ⓘ na všetkých stránkach** (pripomienka 47, pravidlo 8, doska 14). (Claude Code)
  - Spoločný komponent `src/core/admin/info-tip.tsx` (Radix Popover bez portálu): zatvorený, otvorí sa pod myšou, fokusom
    klávesnice aj ťuknutím; klik ho nechá otvorený, Esc / klik mimo zatvorí; text je `aria-describedby` tlačidla aj zatvorený.
    Serverové obaly `PageHelp` / `FieldHelp` / `tabHelpItems` (`page-help.tsx`), `TabHelp` pri záložkách objektu.
  - **43 stránok** administrácie aj riadiaceho centra má ⓘ hneď za nadpisom (`PageHeader help="…"`, vlastné nadpisy, záložky
    objektu a klienta vysvetľujú otvorenú záložku). Texty `help.pages.*` — čo stránka je a kedy ju použiť, s príkladom; kde je
    otázka v Pomoci (Z67), odkaz „… ›“ na ňu (`/admin/help?open=…`). Dlhé úvodné odseky pod nadpismi (príchody, kolízie, z
    portálov, recenzie, upozornenia, kôš, automatické správy, kalendáre portálov, audit, katalóg, skúšky, podpora) presunuté do ⓘ.
  - **ⓘ pri poliach** (`Field info=…`): Do (deň odchodu) pri blokácii, Priorita sezóny, Upratovacie dni medzi pobytmi,
    Provízia portálov, minúty Mesačného výpisu.
  - **Všetky texty na prečítanie naraz: `docs/texty-vysvetliviek.md`** (vygenerované z prekladov).
  - e2e `info-tips.spec.ts` (ⓘ na 23 stránkach majiteľa a 11 riadiaceho centra, myš / klávesnica / klik / Esc / klik mimo,
    odkaz do Pomoci, ⓘ pri poli, ťuknutie na mobile a okraj obrazovky, axe). Snímky `docs/snimky/z66/`.
- 2026-10-19 — Z68 [linka B]: **Hostia — zoznam, karta hosťa, súhlasy a export** (pripomienky 52, 53; doska 17, v1.6). (Claude Code)
  - **Rezervácie › Hostia** (jadro): stĺpce Hosť · Telefón · Pobyty · Posledný/budúci pobyt · Spolu (priame rezervácie + objednávky
    služieb) · Ponuky; filtre Všetci / Vracajú sa / So súhlasom / S budúcim pobytom s počtami, hľadanie, triedenie a stránkovanie
    20/50/100 v DB (`guest_list`, `guest_list_counts`; spoločné stránkovanie Z63 `readPaging`, aj na Podpore). Hostia z portálov tam nie sú (veta pod zoznamom). ⓘ pri nadpise s odkazom do Pomoci.
  - **Karta hosťa** (`?panel=guest:<id>`): kontakt (Upraviť: meno, telefón, krajina, jazyk, adresa — kto a kedy ju doplnil zapíše DB),
    súhlasy s históriou, pobyty s odkazmi na rezervácie, poznámka tímu (`guest_notes`, hosť ju nečíta, `record_history` platí);
    Napísať správu (karta Správy poslednej rezervácie / e-mail), Nová rezervácia (predvyplnený hosť), Údaje hosťa (JSON pre žiadosť
    o prístup). Odkaz „Karta hosťa“ z panelu rezervácie a z hľadania (Z67).
  - **+ Pridať hosťa** ručne (`source = manual`, bez súhlasu — DB to inak nedovolí). Duplicity som nezlučoval ani nenašiel.
  - **Súhlas s ponukami zapína len hosť** — pravidlá v DB: tím nemá právo na stĺpce súhlasu; `guest_consent_revoke` (s dôvodom a kto),
    `guest_consent_request` (najviac raz za 12 mesiacov, nie po odvolaní) → e-mail s tlačidlom; jednorazový token robí worker (v DB
    len haš, platnosť 30 dní), stránka `/suhlas/<token>` zapíše súhlas až po kliknutí hosťa (zdroj `owner_request`; samotné otvorenie
    odkazu nič nemení). Nový text súhlasu v košíku a v Moje údaje (v1.6) s názvom ubytovania, nezaškrtnutý.
  - **Export CSV** (Len so súhlasom — s dátumom a zdrojom súhlasu / Všetci) a Údaje hosťa sa zapíšu do záznamu zmien (`guest_export`,
    bez „Vrátiť“). Export klienta (`AREAS`) má aj poznámky a žiadosti o súhlas (bez hašu tokenu). Dve otázky do Pomoci.
  - Migrácia `…19130000_guests_card` (len pridáva). Testy: pgTAP `guests_card.test.sql` (tím súhlas nezapne, odvolanie, žiadosť,
    potvrdenie, poznámka, počty), vitest `csv.test.ts`, e2e `guests.spec.ts` (PC + mobil, axe; `guest.spec.ts` — nový text súhlasu).
    Snímky `docs/snimky/z68/` (len ukážkové adresy). Na mobile sa tabuľka hostí posúva vodorovne vo svojom rámčeku (ako ostatné zoznamy).
  - Pri pushi migrácie na staging boli na stagingu dve migrácie linky A mimo gitu (`…19150000_audit_search`, `…19160000_message_inbox_counts`)
    — dočasne skopírované, push `--include-all`, kópie zmazané; `database.types.ts` preto obsahuje aj ich typy.
- 2026-10-19 — Z63 [linka A]: **šírka obsahu a stránkovanie v databáze** (pripomienky 46, 51, pravidlá 6–7). (Claude Code)
  - **Šírka:** zoznamy, záznamy a prehľady idú cez celú šírku — preč pevné `max-w` (1180 / 980 / 880 px) na Prehľade, Štatistikách,
    Audite, detaile klienta, katalógu modulov a skúškach, koši a upozorneniach riadiaceho centra; úvodné texty `max-w-prose`.
  - **Spoločné stránkovanie** (`Pagination` v `data-list.tsx`, `readPaging` v `core/admin/paging.ts`, čisté funkcie a testy v
    `list-params.ts`): „1–20 z 1 466“, čísla strán s vynechaním, šípky, **Na stránku 20 / 50 / 100** (predvolene 20, zapamätané
    pre zoznam v cookie `list_size_<zoznam>` — teda na prehliadač, nie na účet), stav v adrese (`page`, `size`), zmena filtra = 1. strana.
  - **Databáza načíta len jednu stránku + počet** na: Rezerváciách, Pobytoch z portálov (filter príchod/odchod a portál v SQL cez
    rozsah nocí, počty ako `head` dopyty — predtým až 2000 riadkov a filter v pamäti), Recenziách (predtým 300 + všetky na počty),
    Schránke správ (`message_inbox` s `range` + nová `message_inbox_counts` — predtým celá schránka dvakrát), Audite (nový pohľad
    `audit_log_search` so `security_invoker`, hľadanie v SQL aj podľa ľudského textu „Prihlásenie (odkazom…)“ — predtým 2000
    riadkov, hľadanie a delenie v pamäti; CSV export ostáva všetko do 2000), Zázname zmien klienta, zozname **klientov**
    (hľadanie v názve, adrese, doméne a u majiteľa, filtre stav / modul / končiaca skúška / problém v SQL, počty filtrov `head`;
    čísla hore cez `platform_reservation_counts` a `platform_issue_tenants` — predtým všetky rezervácie za 30 dní a všetky
    chybné e-maily len na spočítanie). Migrácie `…19150000_audit_search`, `…19160000_message_inbox_counts`,
    `…19170000_platform_counts` (len pridávajú).
  - **Meranie** (`scripts/measure-lists.mjs`, medián 5 načítaní, lokálny server proti stagingu):
    Záznam zmien STRÖMY 430 → 426 ms (HTML 406 → 298 kB), Audit 351 → 373 ms, Klienti 374 → 453 ms, Rezervácie 625 → 687 ms,
    Z portálov 667 → 666 ms, Správy 569 → 611 ms, Recenzie 610 → 587 ms. Na stagingu je dát málo (audit 1 466 záznamov,
    rezervácie 52), takže čas je rovnaký ± sieť a pár počtov navyše; rozdiel je v tom, že čas už nerastie s počtom záznamov.
  - e2e `lists-paging.spec.ts` (1–20 z N, strana 2, 50 na stránku zapamätané, audit hľadá ľudský text, pretečenie polí a
    vodorovný posun na 1280 / 1440 / 1920 px na 9 obrazovkách) + dotknuté testy prešli. Snímky `docs/snimky/z63/` (1920 px, mobil).
  - Ostáva: filter „Osoba“ a „Typ“ v Zázname zmien berie možnosti z max. 2000 riadkov histórie; kôš majiteľa ostáva 30 dní / 200.
- 2026-10-19 — Z67 [linka B]: **Hľadanie (Ctrl K) a Pomoc** (pripomienky 48, 50; dosky 15, 16). (Claude Code)
  - **Hľadanie v hornej lište** administrácie aj riadiaceho centra (nahradilo staré hľadanie rezervácií): Ctrl K / Cmd K, v prázdnom
    poli príklady a posledné hľadania (len v prehliadači), skupiny Nastavenia a stránky · Pomoc · Rezervácie a hostia (riadiace centrum:
    Klienti), šípky / Enter / Esc, na mobile lupa → hľadanie cez celú obrazovku. **Register** `src/core/search/registry.ts` (~55 riadkov:
    stránky, polia nastavení a objektu, synonymá v `search.entries`), stránky modulov sa pridajú samy z ich menu. Klik na pole otvorí
    stránku s `?hl=` a pole na chvíľu orámuje a zameria. Rezervácie, hostia a poznámky z DB (RLS, pár riadkov, s krátkou pauzou po písaní).
  - **Pomoc** (`/admin/help`, dole v bočnom menu): hľadanie, témy, 16 otázok jadra + 2 modulové (Správy, Check-in; háčik manifestu
    `helpFaqs`), kroky a tlačidlo na stránku (s poľom), „Pomohlo vám to? Áno / Nie“ (tabuľka `help_feedback`, jedna odpoveď na človeka).
    Texty overené voči tomu, čo systém robí — na kontrolu `docs/pomoc-otazky.md`. Odkaz na otázku `helpHref(id)` pre ⓘ (Z66, linka A).
  - **„Nenašli ste odpoveď?“**: text + voliteľný obrázok (súkromné úložisko `support-attachments`, 5 MB), klient, človek, stránka
    odkiaľ prišiel (`?from=`) a prehliadač → DB `support_request_create` (max. 10 denne na človeka), upozornenie `support_request`
    vo zvončeku správcu, e-mail `platform_support_request` na `NEXT_PUBLIC_SUPPORT_EMAIL` s Reply-To (testovacie účty sa neposielajú).
    Doba odpovede v texte nie je (Otázky). Riadiace centrum › **Podpora**: žiadosti (zbalené riadky, obrázok cez krátky odkaz,
    „Vybavené“) a hodnotenie návodov (najprv tie s „Nie“).
  - Migrácia `…19120000_help_support` (len pridáva; nové tabuľky nie sú dáta klienta, `record_history` na ne nie je).
    Testy: pgTAP `help_support.test.sql`, vitest `registry.test.ts` (preklady registra a otázok, zhoda slov), e2e `search-help.spec.ts`
    (PC + mobil, axe). Snímky `docs/snimky/z67/`. Stránkovanie Podpory po 20 — výber 20/50/100 doplní Z63 (linka A).
  - **Pre linku A:** Z69 mení adresy Nastavení → uprav riadky registra (`registry.ts`) a `href` v `src/core/help/faqs.ts`; Z66 ⓘ → `helpHref(id)`.
- 2026-10-19 — Z56 [linka A]: **zbalené zoznamy a sezóny bez roka** (pripomienka 35, pravidlo 4). (Claude Code)
  - **Sezóny** (Objekt → Sezóny a ceny): zbalené riadky „názov · termíny · cena / noc · min. nocí“ (predvolená so štítkom), šípka
    rozbalí formulár, „+ Pridať sezónu“ otvorí novú navrchu. Súhrnná tabuľka a karty pod sebou preč.
  - **Opakované sezóny bez roka:** pri „Opakovať každý rok“ sa termín zadáva a ukazuje ako deň a mesiac („23. 12.“), uloženie ostáva
    v roku 2000 (`pricing/day-month.ts` + test); prepnutie zaškrtávania prevedie dátumy (rok 2000 ↔ tento rok, cez Nový rok do
    ďalšieho). `calculate.test.ts` bez zmeny.
  - **Oprava:** uloženie existujúcej sezóny vždy padalo na „Skontrolujte vyplnené údaje“ — schéma chcela pole `color`, ktoré formulár
    nemá. Teraz je voliteľné a chýbajúce nemaže uloženú farbu.
  - Rovnako zbalené: **poplatky a zľavy** (suma a výpočet, druh, kaucia / zľava, kód, od nocí; vypnuté so štítkom), **jednotky**,
    dokumenty objektu (nahrávanie za „Nahrať dokument“), rýchle odpovede (nový formulár navrchu). `ExpandableList` si nechá raz
    otvorený riadok pripojený aj po zbalení — neuložené zmeny nezmiznú a lišta Z55 ich uloží.
  - **Katalóg modulov:** veta s koncami skúšok pod klientmi preč; klienti pri module oddelení čiarou, nie kartou v karte.
  - e2e `compact-lists.spec.ts` (riadky, deň a mesiac, uloženie cez lištu, pridávacie formuláre zatvorené); `admin.spec`
    (dokumenty za tlačidlom). Snímky `docs/snimky/z56/`.
  - **Zistenia:** Ukážkový klient má sezóny Zima a Leto bez termínov (seed ich mal) — platí len predvolená.
- 2026-10-19 — Z65 [linka B]: **Pruh „Kde sa predali noci“ na Prehľade** (pripomienka 49). (Claude Code)
  - Jeden komponent `src/core/reports/nights-bar.tsx` pre mesačný výpis aj Prehľad, čísla z `tenant_monthly_report` cez
    `reportView` (jeden zdroj = výpis = Štatistiky). Na Prehľade prepínač **Tento mesiac / Ďalší mesiac** (oba mesiace sa
    načítajú na serveri, prepnutie je okamžité); každý úsek pruhu otvorí kalendár daného mesiaca; počty aj v legende (text).
  - Test e2e `overview-nights.spec.ts` (PC + mobil, axe): súčty = výpis a `tenant_monthly_stats`. Snímky `docs/snimky/z65/`.
- 2026-10-19 — Z64 [linka B]: **Záznam zmien čitateľný** (pripomienka 45). (Claude Code)
  - **Synchronizácia kalendárov** (migrácia `…19110000_history_readable`, len pridáva): obsadenosť zo synchronizácie iCal sa už
    nezapisuje po riadkoch — `ical_apply` zapíše **jeden súhrn za beh kanála** (`table_name 'ical_sync'`: pridané / zmenené /
    zmazané / kolízie + udalosti na rozbalenie, max. 200). Stĺpec `is_sync` označí súhrny aj staré riadkové záznamy; stránka ich
    predvolene skrýva (filter „Aj synchronizácia kalendárov“).
  - **Vrátiť zmenu len pri zmenách od ľudí** — v rozhraní aj v DB (`platform_revert_change` → chyba 22023 pri systéme/synchronizácii).
  - Zbalené riadky (čo · kto · kedy), klik rozbalí „pred → po“; ľudské názvy polí a tabuliek, dátumy `16. 10. 2026`, rozsahy
    `16.–20. 10. 2026`, technické polia skryté; filtre bez tlačidla (obdobie, kto, synchronizácia, typ, človek — `ParamSelect`),
    stránkovanie po 50. Iné zobrazenie histórie (u majiteľa) zatiaľ nie je.
  - Testy: pgTAP `history_readable.test.sql`, vitest `diff.test.ts`, e2e `history.spec.ts` (test vrátenia upravený — zmena ako od
    člena tímu; nový test súhrnu). Snímky `docs/snimky/z64/`.
- 2026-10-19 — Z62 [linka B]: **Mesačný výpis** (predajný argument č. 1, v1.4, dosky 12–13) — jadro, nie modul. (Claude Code)
  - **Výpočet v DB** `tenant_monthly_report(tenant, mesiac)` (migrácia `…19100000_monthly_report`): tržby a obsadenosť z
    `tenant_monthly_stats` (jedno miesto výpočtu), porovnanie s rovnakým mesiacom minulého roka (bez dát = null), úspora
    = priame tržby × `portal_commission_bp`, úspora od januára, podiel priamych nocí, vlastné kontakty (hostia so súhlasom),
    noci podľa portálu, výhľad ďalšieho mesiaca (potvrdené tržby, obsadenosť, voľné víkendy pi–ne — aspoň jedna jednotka voľná),
    „Čaká na vás“. Prístup: člen klienta / správca platformy / server; iný klient chyba 42501 (pgTAP `monthly_report.test.sql`).
  - **Zmena v Štatistikách:** tržby **bez dane z ubytovania a zálohy** (riadky `tax`, `deposit`) — podľa v1.4; platí aj pre
    stránku Štatistiky a graf v Prehľade (jedno miesto výpočtu).
  - **Úkony** — všetko sa dá spočítať z existujúcich dát, nová tabuľka úkonov netreba (počty sú úplné od začiatku platformy):
    e-maily hosťom = odoslané `guest_*` v outboxe (bez správ písaných človekom) + automatické správy; rezervácia hosťom =
    priame potvrdené vytvorené v mesiaci; zosúladenie kalendárov = rezervácie + pobyty z portálov (ak má klient kalendár);
    check-iny dokončené hosťom; objednávky hostí. Človek: „Platba prijatá“ (`received_by`), odpovede hosťom, vyriešené kolízie,
    ručné rezervácie. Minúty na úkon v **Nastavenia → Mesačný výpis** (`report_minutes`, predvolené 5/45/15/30/15).
  - **Stránka** Štatistiky › Mesačný výpis (Štatistiky sú teraz skupina: Čísla · Mesačný výpis): prepínač mesiacov od prvého
    mesiaca s dátami, **Stiahnuť PDF** (Geist, rovnaký obsah), **Poslať účtovníkovi** (PDF na `accountant_email`; bez adresy
    vedie do nastavení). Karta v Prehľade „Výpis za {mesiac} je pripravený“ prvých 7 dní v mesiaci.
  - **E-mail 1. dňa v mesiaci** (cron `monthly-reports` 05:00 UTC → outbox `owner_monthly_report`, jeden na klienta a mesiac,
    len s pobytom v mesiaci): predmet s tržbami a úsporou, skratka stránky, PDF v prílohe, „Otvoriť celý výpis“; komu =
    e-mail pre upozornenia, inak majiteľ. Vypínač v Nastaveniach → E-maily a upozornenia (`monthly_report_email`, predvolene zapnutý).
  - Hraničné stavy: 0 priamych tržieb („Tento mesiac bez priamych pobytov.“), bez minulého roka (bez porovnania, nikde „∞“),
    provízia 0 %, bez kalendárov portálov. Texty a čísla pre stránku, PDF aj e-mail z jedného miesta `src/core/reports/monthly-view.ts`.
  - Testy: vitest (výpočet zobrazenia, snímka HTML e-mailu), pgTAP (súčty = Štatistiky, RLS, e-mail len s pobytom),
    e2e `monthly-report.spec.ts` (PC aj mobil, PDF, prepínanie, účtovník), `admin-v12`, `settings-contact` — prešli. Snímky `docs/snimky/z62/`.
  - **Pre linku A (Z61):** do prehliadky „Čo je nové“ pridať Mesačný výpis (snímka `docs/snimky/z62/vypis-pc.png` alebo nová).
- 2026-10-18 — Z55 [linka A]: **ukladanie — lišta neuložených zmien a toasty** (pripomienky 36, 44, pravidlo 3). (Claude Code)
  - `src/core/forms/unsaved.tsx`: `useUnsavedForm` sleduje polia formulára voči stavu po načítaní/uložení, zmenené pole dostane
    `data-changed` (oranžový okraj); `UnsavedBar` (v koreňovom layoute) = jedna pripnutá lišta „Máte neuložené zmeny · Zahodiť · Uložiť“
    pre všetky zmenené formuláre stránky. Odchod: `beforeunload` + otázka pri kliknutí na internú linku.
  - `ActionForm` (administrácia aj riadiace centrum): `bar` zapnutý pre úpravy — vlastné Uložiť sa skryje (zostane skryté submit pre
    Enter), po úspechu toast „Zmeny uložené.“, pri chybe toast s chybou. Vypnutý pre vytváranie (nový objekt, nová rezervácia, pridanie
    poplatku/zľavy/sezóny/jednotky/služby/referencie) a storno. Toasty aj pri obnove z koša, vrátení zmeny, push nastaveniach,
    formulároch riadiaceho centra; účet hosťa: Moje údaje s lištou, súhlas s marketingom toastom.
  - Správy (súbor linky B, len farby): bublina hosťa sivá `#eeefec` a naplánovaná správa s plochou karty a tmavším čiarkovaným
    okrajom — predtým biele na bielom paneli.
  - e2e `save-bar.spec.ts` (zmena → lišta → uložiť → toast; zahodiť; odchod; chyba servera). Celý beh: 4 pády pod záťažou
    (history, admin-v1 mobil, messages-guest mobil, stay-states mobil), samostatne všetky prešli.
- 2026-10-18 — Z60 [linka B]: **podpis v správach a vzhľad e-mailov hosťovi** (pripomienka 34). (Claude Code)
  - **Nastavenia → Kontakt** (nová karta, `#kontakt`): kontaktná osoba, telefón, WhatsApp a **podpis správ** (viac riadkov, nový
    stĺpec `tenant_settings.message_signature`, migrácia `…160000`). `{podpis}` = podpis, inak meno kontaktu, inak názov klienta —
    rovnako v DB (`message_rule_text`) aj v náhľade (`messageSignature`, test). Pri „Vložiť“ v úprave správy odkaz
    „Podpis upravíte v Nastaveniach → Kontakt“.
  - **Hlavička a päta všetkých e-mailov hosťovi** (`src/core/email/layout.ts`, `guestFrame`): hlavička = logo témy (ak je to https
    adresa), inak názov ubytovania; päta = kontakt (telefón, e-mail objektu, WhatsApp) a „Môj pobyt →“; textová časť má pätu tiež.
    Telo ostáva osobný list. **Hlavná fotka** (exteriér, inak prvá) len v potvrdení rezervácie, s `alt`, šírka 496 px. Kód na prihlásenie
    má hlavičku s názvom klienta. E-maily majiteľovi bez zmeny.
  - **Náhľad v úprave automatickej správy** = celý e-mail s hlavičkou a pätou (rámček `iframe`, rovnaká funkcia `guestMessageHtml`
    ako skutočný e-mail); **„Poslať skúšobne mne“** posiela presne túto verziu.
  - Testy: vitest `layout.test.ts` so snímkou HTML e-mailu, `rules.test.ts` (podpis); e2e `settings-contact.spec.ts`,
    `messages-admin` (podpis v náhľade, odkaz na Kontakt), `admin` — prešli. Snímky `docs/snimky/z60/`.
  - **Pre linku A (Z55):** karta Kontakt je v spoločnom formulári nastavení (`saveSettings`) — lišta ukladania ju pokryje sama.
- 2026-10-18 — Z59 [linka B]: **účet hosťa — navigácia** (pripomienky 38, 39, 40). (Claude Code)
  - Karty **Aktuálny pobyt · Pobyty · Moje údaje** z jedného zdroja (`src/core/guest/account-nav.ts` + `account-nav-items.ts`),
    ten istý zoznam má **menu „Môj účet“ v hlavičke** (stránka chaletu aj účet; + Odhlásiť sa; neprihlásený → odkaz na prihlásenie).
    Aktuálny pobyt = prebiehajúci, inak najbližší budúci (aj čakajúci na platbu; `current-stay.ts` + test); bez neho karta nie je.
  - **Po prihlásení** sa otvorí aktuálny pobyt (`/ucet/aktualny` → `/ucet/pobyt/<id>`, bez neho zoznam Pobyty). Pri ďalšom
    budúcom pobyte prepínač **„Ďalší pobyt: 12. 2. 2027 ›“**; iný než aktuálny pobyt má nad nadpisom výrazné **„← Všetky pobyty“**
    a svieti karta Pobyty (drobčeky ostávajú pri check-ine). Prístupový odkaz `/r/<kód>` bez zmeny.
  - Mobil: tri karty sa zmestia (menšie), „Odhlásiť sa“ je na mobile v menu „Môj účet“.
  - **Pre linku A:** upravené testy, ktoré po prihlásení čakali `/ucet` (`account`, `account-v24`, `messages-guest`,
    `stay-states`) — teraz sa najprv otvorí pobyt; v `messages-guest` píše majiteľ až po prihlásení (otvorený pobyt správu hneď
    prečíta). Nový test `e2e/account-nav.spec.ts` (PC aj 390 px). Všetky dotknuté testy prešli. Snímky `docs/snimky/z59/`.
- 2026-10-18 — Z54 [linka A]: **plochy, polia a reakcia na myš naprieč aplikáciou** (pripomienky 41–43, pravidlá 1–2). (Claude Code)
  - **Tokeny** v `globals.css` (`:root`): `--page`, `--card-surface` + `--card-border` (karta = jemný odtieň **a** vlasová čiara — jeden
    spôsob všade), `--divider`, `--field` (biela), `--field-border` `#86898e` (≥ 3 : 1 voči stránke, karte aj pásu stránky hosťa),
    `--field-border-hover`, `--hover-row`, `--hover-card-border`. Test `src/core/theme/tokens.test.ts` (vitest) stráži kontrasty.
  - **Polia všade biele s okrajom 3 : 1** — jedno pravidlo bez vrstvy v `globals.css` (vyhrá nad triedami jednotlivých obrazoviek):
    input, select, textarea, select Radix, zaškrtávacie políčko, vypnutý prepínač; hover tmavší okraj. Pole vo vlastnom rámčeku
    (vyhľadávanie s ikonou, písanie odpovede) = trieda `field-box`, vnútorné pole `data-field="bare"`.
  - **Fokus pri témach klientov:** `--ring` = akcent, ak má voči bielej/karte 3 : 1, inak stmavený (`focusRingFor`).
  - **Hover:** riadky zoznamov (odkazy panelu, `data-row-link`, riadky tabuliek) jemný podklad, klikateľné karty (`data-card-link`)
    tmavší okraj, hlavné tlačidlo o odtieň tmavšie (predtým svetlejšie); 150 ms, nič sa nehýbe.
  - **Kalendár administrácie:** náhľad pobytu pri prejdení myšou aj fokuse klávesnicou (hosť / portál, termín a noci, stav, suma);
    na dotyk prvé ťuknutie ukáže náhľad, druhé otvorí detail. **Kalendár hosťa** už cenu noci ukazuje priamo pri dni aj v bubline — bez zmeny.
  - **Karta v karte** preč: Online check-in v Objekt → Údaje a Doobjednanie pri službe sú oddelené čiarou. V detaile klienta chýbal
    preklad názvu modulu Správy („modules.messages.title“) — doplnený.
  - Snímky pred/po (PC 1440, mobil 390) `docs/snimky/z54/{pred,po}` cez `scripts/ui-screens.mjs` (dočasný testovací hosť, zmazaný).
  - Playwright `ui-rules.spec.ts` (PC + mobil): polia biele s okrajom 3 : 1 v administrácii aj u hosťa, náhľad v kalendári myšou a ťuknutím.
  - Celý e2e beh (PC + mobil, axe): 75 ok, 13 preskočených podľa projektu, 1 zlyhanie — `stay-states` na mobile (404 pri záťaži,
    rovnako ako pri Z53), samostatne prešiel. Vitest 115/115.
- 2026-10-18 — Z58 [linka B]: **pobyty z portálov a Príchody zo všetkých kanálov** (pripomienka 33). (Claude Code)
  - **Rezervácie › Z portálov** (`/admin/portal-stays`, v menu len s prepojeným kalendárom): pobyty z iCal (Booking, Airbnb, iné)
    oddelene od vlastných rezervácií — portál a kalendár, príchod – odchod, noci, ubytovanie, **kód / odkaz rezervácie a posledné
    4 číslice telefónu** (z popisu udalosti Airbnb; parser `icalDetails` ukladá len tieto tri údaje do `occupancy.ical_details`),
    kolízia, posledná synchronizácia. Filtre: teraz a budúce / minulé, portál. Panel so všetkým, čo vieme, „Otvoriť na portáli“
    a „Zobraziť v kalendári“. Do `reservations` sa nič nezapisuje. Migrácia `…150000_portal_stays` (stĺpec, `ical_apply`).
    Kód a telefón sa doplnia pri najbližšej synchronizácii každého kanála (staršie udalosti ich zatiaľ nemajú).
  - **Príchody** (modul check-in): aj príchody z portálov so štítkom „z portálu“ (kód, telefón), zavreté termíny Bookingu nie.
  - **Zoznam rezervácií:** predvolené poradie **podľa príchodu** — prebiehajúce a najbližšie hore, potom minulé (computed field
    `arrival_order`, stĺpec Termín sa dá aj prepnúť). „Ručná rezervácia“ len v hornej lište (z hlavičky zoznamu preč; na mobile
    tlačidlo +). **Dve hľadania:** horné hľadá rezervácie z každej stránky (vedie na zoznam) — na samotnom zozname je skryté,
    ostáva jedno hľadanie pri filtroch.
  - Test `e2e/portal-stays.spec.ts` (vlastný testový kalendár Ukážkového klienta) + `admin-v1`, `collisions`, `checkin` prešli.
    Snímky `docs/snimky/z58/`.
- 2026-10-18 — Z57 [linka B]: **riadiace centrum — klienti v menu a zoznam klientov** (pripomienky 31, 32). (Claude Code)
  - **Menu:** pod „Klienti“ ostávajú **naposledy otvorení klienti (max. 3)**, najnovší hore — cookie `platform_recent_clients`
    (prežije obnovenie stránky aj odchod na „Všetci klienti“); aktívny klient rozbalený s podstránkami, ostatní zbalení.
    Spoločný `AdminShell` (`contextGroup.recentCookie`) — administrácia majiteľa to nepoužíva, nič sa jej nemení.
  - **Zoznam klientov:** klik na riadok/názov = detail klienta, šípka vpravo = rozbalenie náhľadu. Hľadanie (názov, e-mail
    majiteľa, adresa stránky) a filtre: stav, modul, končiaca skúška (14 dní), s problémom (synchronizácia, e-maily) s počtami.
    Moduly: dva názvy + „+N“, celý zoznam v náhľade a v popise pri prejdení. Dlaždice nie (tabuľka).
  - **Chyba `modules.messages.title`:** doplnený preklad „Správy s hosťom“; test `src/modules/manifest-keys.test.ts` kontroluje pri
    každom module názov, položky menu a názov v katalógu.
  - Snímky po zmene: `docs/snimky/z57/` (PC 1440, menu, mobil 390). Test `e2e/platform-clients.spec.ts` + `platform-v12` prešli.
- 2026-10-18 — Z53 [linka A]: **pred ukážkou Jane — prehliadka, celkový test, kontrola STRÖMY.** (Claude Code)
  - **Prehliadka „Čo je nové“** `2026-10-18.1`: 8 nových snímok na začiatku (správy, automatické správy, check-in, účet pobytu, recenzie,
    kolízie, storno pásma, podklad na doklad); snímky modulov sa ukážu len klientovi so zapnutým modulom (`module` pri snímke,
    `TourDialog modules`). Snímky `npm run tour:screens`; `tour.spec` (PC + mobil) prechádza.
  - **Ukážkové dáta** (Ukážkový klient): kolízia z ukážkového Airbnb na (a) a storno pásma 14 dní → 100 %, inak 50 % (podľa textu podmienok);
    `demo-data --reset`, 0 e-mailov. Ukážkovému klientovi chýba služba kuchára — rezervácia (a) je bez neho.
  - **Celý e2e beh** (PC + mobil, axe, proti stagingu): 68 ok, 13 preskočených podľa projektu; 2 zlyhania opravené v testoch —
    `push.spec` čakal predvolené druhy bez „Nová správa“ (pridala Z46), `cart`/`pickStay` klikali na neviditeľné „Nasledujúci mesiac“
    prvého mesiaca (zlyhalo, keď príchod padol na koniec druhého zobrazeného mesiaca) → len viditeľné tlačidlo. Po oprave prešli.
  - **Opravy kódu zo stránky STRÖMY:** titulok karty bol „Booking platform“ → názov objektu a popis (`generateMetadata`);
    poznámky cenníka „… nocí. daň za ubytovanie v cene.“ → každá veta s veľkým písmenom.
  - **Kontrola STRÖMY bez zápisu — čo by pri ukážke Jane vyzeralo zle (obsah, nemenené):**
    1. **Všetkých 48 rezervácií** STRÖMY sú ukážkové (DEMO) a **7 recenzií** tiež — na stránke sa ukazujú ako „Overené recenzie“
       (Martin B., Zuzana H. …) a v „Hostia hovoria“ je jedna ukážková; Jana by videla vymyslených hostí ako skutočných.
    2. **Účet hosťa info+host@obrazne.sk je na STRÖMY prázdny** — ukážková (b) má po obnove `zona-hosta@stromy-demo.invalid`.
    3. **Majiteľ účtu „Chalet STRÖMY (ukážka)“** pri QR platbe a bankových údajoch; dokumenty „Vianocny program a pokyny“,
       „Ubytovaci poriadok (ukazka)“ bez diakritiky.
    4. **Storno pásma chýbajú** (text podmienok ich má: 30+ dní zdarma, 14 dní 50 %, 10 a menej 100 %) — pri žiadosti o zrušenie
       hosť neuvidí presnú sumu. **Odkazy na VOP a ochranu osobných údajov chýbajú** (košík ich nemá kam odkázať). Bez loga.
    5. **Skúška modulu Push končí 19. 10.** (zvonček už hlási „končí skúška“); Doplnkové služby v skúške do 16. 11.
    6. 7 neprečítaných upozornení a 2 konverzácie v Správach (ukážkové). Anglické texty ani prázdne sekcie som nenašiel.
- 2026-10-18 — Z52 [linka B]: **príprava produkcie — zálohy, export, obnova klienta, výpadky** (3f, A9). (Claude Code)
  - **Stav záloh:** migrácia `…100000_backups` — `platform_backups` (len správca platformy), workflow zálohy zapíše výsledok
    (aj pri zlyhaní; `scripts/backup-report.mjs`), Stav systému → **Zálohy** (posledná, posledná úspešná, história, skúšobná obnova
    s tlačidlom „Zaznamenať“), upozornenie `backup_stale` po 36 h bez úspešnej zálohy (cron každú hodinu). Dnešná záloha a skúšobná
    obnova s Martinom zapísané dodatočne.
  - **Export klienta:** detail klienta → **Export dát (ZIP)** — oblasti ako priečinky, každá tabuľka `.json` + `.csv`, súbory
    dokumentov, README s počtami; check-in osoby maskované (doklad, dátum narodenia, adresa); audit `tenant.exported`.
    Vlastný ZIP zapisovač bez novej závislosti (`src/core/export/zip.ts`, testy).
  - **Obnova jedného klienta:** migrácie `…130000_restore_tenant` a `…140000_restore_scope` — `restore_plan` (plán pridať / zmeniť /
    zmazať, zápis v jednej transakcii bez triggerov, audit `tenant.restored`), len serverový kľúč; `scripts/restore-tenant.mjs`
    (plán, `--apply` s potvrdením slugom, **`--ids`** = len vybrané záznamy). Skúška `Skúška obnovy klienta` (workflow) na Ukážkovom:
    rezervácia s položkami, platbou a obsadenosťou späť, zmena vrátená, nový záznam preč, plán po obnove prázdny ✓.
  - ⚠ **Prvá skúška (12:17)** obnovila celého Ukážkového klienta a vrátila aj dáta testov linky A, ktoré bežali v tej minúte
    (5 testových rezervácií, súkromné údaje Glamping Lúka, nastavenia). Testy linky A po sebe upratali — stav overený podľa
    `record_history`, je ako pred testami. **Pre linku A:** ak vám o 12:17 zlyhal e2e test na Ukážkovom, príčina bola táto
    obnova, nie kód. Odvtedy skúška obnovuje len svoje záznamy (`--ids`).
  - **Postup pri výpadku:** `docs/prevadzka/vypadok.md` (Vercel vrátenie verzie, Supabase, Resend, iCal, plánovač, komu písať).
  - Testy: pgTAP `backups.test.sql`, Playwright `platform-backups.spec.ts` (Zálohy, skúšobná obnova, export ZIP + audit),
    `platform-modules`, `platform-v12` — prešli. `database.types.ts` obsahuje aj tabuľky z migrácie linky A `…120000` (zo stagingu).
- 2026-10-18 — Z51 [linka A]: **podklad na doklad a doklady pre hosťa** (3d, A5 — prepojenie s fakturačným nástrojom nerobené). (Claude Code)
  - `src/core/invoice/basis.ts`: podklad len zo zmrazených riadkov rezervácie a prijatých platieb — súčet položiek = cena rezervácie,
    vratná záloha zvlášť; pri platiteľovi DPH základ a DPH po sadzbách (ceny sú s DPH), inak „Bez DPH“. Text na kopírovanie (položky
    „množstvo × cena = suma“, platby s dátumom, spôsobom a VS, zaplatené / zostáva). Vitest `basis.test.ts`.
  - **Panel rezervácie → „Podklad na doklad“** (pod položkami): súhrn, **Kopírovať**, **Stiahnuť PDF** (`/admin/reservations/podklad/<id>`,
    nápis „Podklad — nie je daňový doklad“; `renderFormPdf` vie ďalšie strany a dlhé popisy), náhľad textu, štítok **doklad nahratý / chýba**.
    To isté pre **účet pobytu** (upsell, potvrdené objednávky a ich platby, `?zdroj=ucet`).
  - **Nahratie dokladu:** pri dokumente rezervácie voľba Druh → „Doklad (faktúra)“ (migrácia `20261018120000_invoice_documents.sql`:
    `documents.kind` document / invoice, doklad len pri rezervácii); hosť ho vidí hneď v pobyte v sekcii **Doklady** (účet aj prístupový
    odkaz, aj pri zrušenom pobyte). Migrácia cez `db query` — verziu 20261018100000 medzitým použila linka B (zálohy).
  - **Podklady za mesiac** v zozname rezervácií (`/admin/reservations/podklady?mesiac=RRRR-MM`, predvolený minulý mesiac): CSV pre účtovníka
    podľa dátumu odchodu — položky, suma, DPH po sadzbách, zaplatené, zostáva, platby, stav dokladu. Firma / IČO / adresa → Otázky.
  - Playwright `invoice-basis.spec.ts` (kopírovať, PDF, nahratie dokladu → hosť ho vidí, CSV, axe); `upsell.spec` overuje PDF účtu pobytu.
- 2026-10-18 — Z50 [linka B]: **prvá ostrá záloha stagingu prešla** — Martin pridal tri tajné hodnoty (cez `gh secret set`;
  AVG najprv blokoval PowerShell, Martin ho odblokoval). Beh: 92 tabuliek obnovených a porovnaných, 38 súborov v 2 bucketoch,
  zašifrovaný artefakt `staging-2026-10-18.tar.gz.age` **8,0 MB** (14 dní). Ďalej beží každú noc o 1:00 UTC.
  **Skúšobná obnova s Martinom prešla:** stiahnutie (`gh run download`), rozšifrovanie jeho súkromným kľúčom, rozbalenie —
  `data.sql` 14,8 MB, `schema.sql`, `roles.sql`, súbory oboch bucketov s `manifest.json`. (Claude Code)
- *Staršie zápisy (do 17. 10.) sú v `docs/archiv/dennik-do-2026-10-17.md`.*
