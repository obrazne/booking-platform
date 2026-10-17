# ROADMAP — Booking platform

*Kde sme a čo ostáva. Čo staviame → `ARCHITEKTURA.md`. Prečo → `ROZHODNUTIA.md`.*

**Legenda:** 🧠 = rozhoduje Martin s Claude (návrh, chat) · 🔧 = robí Claude Code (kód, súbory, Git)
☐ otvorené · ☑ hotové

## Aktuálne
- **Kde sme (17. 10.):** fronta Z1–Z23 hotová na stagingu — MVP pre Chalet STRÖMY + showroom, stránka hosťa podľa vizuálu v2/v2.1
  (galéria, mapa, košík v2, potvrdenie rezervácie), zóna hosťa, sekcie v administrácii, captcha, **ukážkové dáta** (`npm run demo-data`)
  a **prehliadka „Čo je nové“** pre majiteľa aj správcu, **administrácia a prihlásenia podľa vizuálu v1** (Z23). Chýba: doklady (čaká na Janin fakturačný nástroj), produkčné prostredie,
  nasadenie u Jany (3e — zatiaľ odložené, teraz len naša aplikácia), Stripe (Fáza 4).
- **Ďalší krok pre Claude Code:** **Z28** — dokončiť doplnené časti (drobčeky podľa spoločného pravidla aj u majiteľa, klik na skupinu v menu) — návrh v1.2 v `docs/vizual-administracia.md`.
- **Ďalší krok pre Martina:** preklikať novú administráciu na stagingu (prehliadka „Čo je nové“ sa po prihlásení otvorí znova) a spísať pripomienky;
  odpovedať na otázky nižšie (mapa, prístup pre Janu, otázky pre Janu).
- **Claude chat:** návrh administrácie v1.2 hotový a uložený (pripomienky 16–24); ďalej Martinove pripomienky zo stagingu (od č. 25), obchodný model, príprava ukážky pre Janu.

## Zadanie pre Claude Code
*Sem píše Claude chat konkrétne pokyny. Môže tu byť **fronta viacerých úloh (Z1, Z2, …)** — `/dalej` vezme prvú neoznačenú,
po dokončení ju označí ✅ (text nechá) a ďalšiu začne až pri ďalšom `/dalej`. Keď sú všetky ✅, sekciu vyprázdni.*

*Hotové Z1–Z15 (analýza, kostra platformy, MVP Chalet STRÖMY: doména, administrácia, stránka hosťa, rezervácie,
e-maily, iCal, dáta zóny hosťa, detail objektu zo sekcií, vizuál v1) — detail v Denníku a histórii Gitu.*

**Kontext pre frontu Z16–Z18:** MVP je postavené. Teraz ho skontrolujeme pred ukážkou Jane a ladíme **len našu aplikáciu** (B7, B10).
**Nič, čo sa vkladá na web klienta (vyhľadávací pás, widget, úprava Janinho webu), teraz nerob** — Martin 16. 10. Rovnaké pravidlá ako doteraz (`tenant_id` + RLS + testy, centy, preklady, téma, A18). Stále len staging.

### Z16 ✅ — Kontrola pred ukážkou
Cieľ: Jana uvidí stránku bez chýb. Výstup `docs/kontrola-mvp.md` (čo sa skontrolovalo, nálezy, čo opravené, čo ostáva).
1. **Automatické testy prehliadačom (Playwright):** rezervácia ako hosť na STRÖMY na počítači aj na mobile (390 px) — termín v kalendári,
   košík 3 kroky, služba, súhlasy, platobné údaje s QR, prístupový odkaz, žiadosť o storno; administrácia — Platba prijatá, ručná rezervácia,
   blokácia, kolízia z iCal. Spúšťať lokálne proti stagingu; do CI len ak to ide bez platených služieb.
2. **Nezávislá kontrola bezpečnosti** samostatným agentom, ktorý kód nepísal: RLS na každej tabuľke s `tenant_id`, oprávnenia v serverových
   akciách a API (worker, iCal, prístupové tokeny), nič tajné v kóde pre prehliadač, ochrana formulárov proti robotom a zahlteniu, hlavičky.
3. **Prístupnosť a mobil:** kalendár ovládateľný klávesnicou a čítačkou, kontrast, žiadne vodorovné rolovanie na 390 px, veľkosti tlačidiel.
4. **Rýchlosť:** veľkosti a formáty fotiek, načítanie detailu na mobile (Lighthouse), zbytočné dotazy do databázy.
Jasné chyby oprav hneď; čo mení správanie pre hosťa alebo majiteľa, zapíš do *Otázky pre Martina*.

### Z17 ✅ — Účet a zóna hosťa (B10)
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

### Z18 ✅ — Sekcie stránky v administrácii (B7)
V editore objektu záložka **Stránka**: zoznam sekcií s vypínačom (kalendár sa vypnúť nedá), presúvanie (aj klávesnicou), formulár sekcie
generovaný zo zod schémy typu (texty s prekladmi — zatiaľ slovenčina, výber fotiek z fotiek objektu), „Pridať sekciu“ z typov, ktoré tam
ešte nie sú, „Obnoviť podľa predlohy“ s potvrdením, náhľad stránky. Bočný panel podľa A18. Údaje zo systému (ceny, storno…) sa vo formulári
neupravujú — len odkaz, kde sa menia.

### Z19 ✅ — Stránka hosťa, galéria a košík podľa vizuálu v2
Martin schválil **v2 (16. 10.)**. Čítaj `docs/vizual-stranka-hosta.md` — najprv *Zmeny oproti v1* a *Pravidlá vzhľadu* (platia pre celú časť
pre hosťa, aj pre zónu hosťa zo Z17), zdroj plátna `docs/navrhy/stranka-hosta/` (platné dosky sú vymenované v hlavičke popisu).
Architektúra: `ARCHITEKTURA.md` B1 (fotky s kategóriou, poloha a miesta v okolí, referencie), B7 (typy sekcií), A12 (predvolená téma v2),
rozhodnutia 16. 10. (*Referencie…*, *Stránka hosťa v2*).
1. **Dáta (migrácie len pridávajú):** tabuľka **referencií** podľa B1 (+ skopírovať `properties.testimonials`, stĺpec ponechať), nastavenie
   `reviews_url`; **kategória a popis fotky**; **zvýraznené vybavenie**; **poloha** (presné miesto / približná oblasť) a **miesta v okolí**;
   téma: **doplnková farba**, zaoblenie 10. RLS + pgTAP testy. Administrácia: referencie (zoznam + bočný panel, zvýraznená, poradie,
   zverejnená, zdroj), kategória fotky pri fotkách, miesta v okolí a poloha v editore objektu, zvýraznené vybavenie (upozornenie, ak počet nie je 3/6/9).
2. **Typy sekcií** (register z Z14): úvod v2, čo vás čaká (mriežka), okolie a mapa (**OpenStreetMap cez MapLibre alebo statická dlaždica —
   bez cookies a bez platených kľúčov**; ak by mapa niečo stála, opýtaj sa), cenník v2, **pohľad dovnútra**, referencie, časté otázky,
   **záverečná výzva s najbližším voľným termínom** (výpočet na serveri z obsadenosti, min. nocí a cien). Predlohy doplň o nové typy a poradie podľa v2.
3. **Galéria v okne** (albumy, mriežka, veľká fotka s pásom náhľadov, referencie vpravo; na mobile prepínač Fotky / Referencie).
4. **Košík v2** (široký panel, zelený súhrn s doplnkami a istotami dole, doplnky v kroku 1 ako rozbaľovacie riadky, zbaľovací kalendár)
   a mobil (zelený pás, rozpis zospodu). Logiku rezervácie a výpočtu ceny zo Z9 nemeň — len rozhranie.
5. **Správanie:** žiadne tlačidlo hosťa neposúva stránku (Príchod/Odchod, „Vybrať termín“, lišta bez termínu → košík s kalendárom);
   naraz jedno okno, Esc a Späť zatvoria jednu úroveň; posunutý panel v úvode len na širokej obrazovke.
6. Over Playwrightom na počítači aj 390 px (aj prístupnosť) a pridaj do `docs/kontrola-mvp.md`. Seed: STRÖMY a showroom s kategóriami fotiek,
   miestami v okolí (orientačné, označ ako ukážkové) a referenciami.


### Z20 ✅ — Potvrdenie rezervácie podľa vizuálu v2.1
Martin schválil návrh **potvrdenia** (`docs/vizual-stranka-hosta.md` → *Potvrdenie rezervácie (v2.1)*, dosky `Potvrdenie` a `MobilPotvrdenie`
v `docs/navrhy/stranka-hosta/`). Prerob stránku `/r/<kód>` (`src/app/(guest)/r/[token]/page.tsx`) — logika rezervácie, platby a storna ostáva.
1. **Najprv over, prečo sa stránka zobrazuje bez hlavičky a päty** (Martin ju videl „úplne čistú“): `(guest)/layout.tsx` vynechá hlavičku,
   keď klienta nespozná podľa adresy — skontroluj, na akú adresu ide presmerovanie po odoslaní a odkaz v e-maile (staging má viac adries).
   Odkaz musí vždy viesť na doménu klienta a stránka mať jeho hlavičku, pätu a tému.
2. Rozloženie podľa popisu: úvod s krstným menom a stavom, karta platby (QR + riadky s **Kopírovať**), zelený pruh po zaplatení,
   **Čo bude ďalej** (kroky podľa stavu; počet dní pred príchodom z nastavenia pokynov), rozpis, účet hosťa, zmena plánov (formulár storna
   až po kliknutí), **zelený panel vpravo** s hlavnou fotkou objektu nad úvodom, doplnkami, sumou, **Pridať do kalendára** (.ics s pobytom,
   adresa len ak ju pravidlá polohy dovolia) a kontaktom na majiteľa. Stavy zrušená / prebieha / ukončená podľa popisu.
3. **Mobil:** údaje s Kopírovať pred QR, **Uložiť QR** (obrázok), zvyšok pod sebou.
4. Texty cez preklady, farby z témy, pravidlá vzhľadu v2. Playwright: oba stavy (čaká na platbu, potvrdená) na počítači aj 390 px, prístupnosť.


### Z21 ✅ — Ukážkové dáta na stagingu (Martin si chce všetko preklikať)
Len **staging**, nikdy produkcia. Skript `scripts/demo-data.mjs` (idempotentný, `--reset` zmaže a znova vytvorí len ukážkové záznamy;
ukážkové sú jasne označené, napr. e-mailom hosťa na vyhradenej testovacej doméne a poznámkou „DEMO“). Pre **Chalet STRÖMY**:
1. **3 rezervácie** cez tie isté funkcie ako skutočná rezervácia (ceny, riadky, história stavov, súhlasy): (a) budúca **čaká na platbu**
   so šéfkuchárom, (b) **potvrdená a zaplatená** (Platba prijatá) okolo Vianoc, s nahraným dokumentom k rezervácii a pokynmi k príchodu,
   (c) **ukončená** v minulosti, zaplatená. Vymyslené mená hostí, žiadne skutočné osobné údaje.
2. **Obsadenosť:** 2 udalosti z iCal (Booking, Airbnb) a 1 blokácia majiteľom; pri objekte **dokument pre hostí** (napr. ubytovací poriadok PDF).
3. **Účet hosťa** pre rezerváciu (b), aby si Martin vyskúšal zónu hosťa — e-mail s kódom musí prísť Martinovi (staging presmerúva na
   info@obrazne.sk; doménu `@booking-platform.test` nepoužívaj, tam sa neposiela nič).
4. **Prístup Martina:** na stagingu pridaj účtu info@obrazne.sk členstvo **majiteľa** v STRÖMY (popri správcovi platformy), aby videl
   administráciu ako Jana. Zapíš do Denníka. V riadiacom centre nech má STRÖMY čo ukázať: moduly (skúška s dátumom konca), zdravie,
   obrat za mesiac, audit.
5. E-maily, ktoré pri tom vzniknú, nech nezahltia schránku (najviac pár; inak ich vlož ako už odoslané).
6. Na konci Martinovi **krátky návod v termináli**: kde sa prihlásiť, čo kde nájde (adresy stagingu), ako dáta obnoviť.

### Z22 ✅ — Prehliadka „Čo je nové“ (A15)
Podľa `ARCHITEKTURA.md` A15 a rozhodnutia 16. 10.:
1. Komponent prehliadky: okno (zaoblenie 10, stmavené pozadie, téma platformy), snímka obrazovky hore, nadpis + dve vety, bodky postupu,
   Späť / Ďalej / „Ukázať mi to“ (otvorí stránku), Esc zatvorí. Na mobile cez celú obrazovku, posun prstom.
2. **Dve prehliadky:** majiteľ (prehľad, rezervácie a bočný panel, Platba prijatá, kalendár obsadenosti, ručná rezervácia, objekt a stránka
   zo sekcií, ceny a sezóny, služby, dokumenty pre hostí, iCal, nastavenia) a **správca** (riadiace centrum: klienti, založenie klienta,
   moduly a skúšky, zdravie, téma, audit). Každá 8–12 snímok, texty cez preklady, zrozumiteľne pre neodborníka.
3. Zobrazí sa raz po prihlásení pri novej verzii (verzia uložená pri používateľovi), znova z menu **„Čo je nové“**.
4. **Snímky** robí skript `npm run tour:screens` (Playwright, ukážkové dáta zo Z21, počítač 1440 px, prípadne aj mobil) → uložené
   v repozitári; po zmene rozhrania stačí skript spustiť znova. Bez osobných údajov na snímkach.

### Z23 ✅ — Administrácia a prihlásenia podľa vizuálu v1
Martin schválil **vizuál administrácie v1 (17. 10.)**. Čítaj `docs/vizual-administracia.md` (najprv *Pravidlá vzhľadu administrácie*;
platia aj pravidlá v2 z `docs/vizual-stranka-hosta.md`), zdroj plátna `docs/navrhy/administracia/` (tabuľka dosiek a ciest v kóde je
v hlavičke popisu), rozhodnutie 17. 10. *Vizuál administrácie v1*, A18. **Je to prerobenie rozhrania** — logiku rezervácií, platieb, cien,
iCal a prihlásenia nemeň; čo už funguje, len oblečieš. Údaje a texty ako na doskách = ukážkové dáta zo Z21.
1. **Spoločné komponenty:** `AdminShell` / bočné menu podľa dosky `Sidebar` (výber ubytovania hore, sekcia Obsadenosť, Tím / Nastavenia /
   Riadiace centrum a používateľ dole, odznak počtu čakajúcich rezervácií; zbaľovanie a pripnutie ostáva). `RecordPanel` **680 px, dva stĺpce**
   (pod ~1024 px jeden), hlavička s číslom a stavom, spodná lišta akcií, zatvára krížik / Esc / Späť / **klik vedľa**, klik na iný riadok
   **prepne** záznam; na mobile cez celú obrazovku s lištou „‹ späť“ a prilepenými akciami dole. **Polia na jeden riadok ako pilulky
   v rovnakej výške ako tlačidlá** (shadcn `Input`, `Select` a pod. v administrácii a pri prihláseniach; formuláre košíka hosťa nemeň).
   Pilulky stavov a farby obsadenosti podľa pravidla 4 — jedno miesto v kóde pre obe obrazovky.
2. **01 Prihlásenie** (`/login`): rozdelená obrazovka podľa dosky. **Prihlasovací odkaz na e-mail** ako druhá možnosť len pre existujúce
   účty administrácie (registrácia ostáva vypnutá, odpoveď neprezradí, či účet existuje, limit podľa IP ako pri hosťovi). Názov platformy
   a e-mail podpory z jedného nastavenia (značka sa rieši vo Fáze 5 — zatiaľ zástupný text).
3. **02 Prehľad:** pozdrav, karta čakajúcich platieb s **Platba prijatá**, štyri čísla, najbližšie pobyty, mini obsadenosť 12 týždňov
   so stavom synchronizácie. „Ušetrené na províziách“ = tržby priamo × provízia portálu; ak v nastaveniach provízia nie je, pridaj ju
   (percento pri klientovi, predvolene 15 %, migrácia len pridáva) a v čísle ukáž „≈“.
4. **03 Rezervácie:** filtre stavu ako pilulky s počtom, hľadanie, Export CSV, panel podľa dosky (platba čaká / zaplatené, **Predĺžiť
   splatnosť** nad `payment_due_at`, rozpis, poznámka hosťa, dokumenty, interná poznámka z `reservation_notes`, história, Upraviť, Zrušiť).
5. **04 Kalendár:** dva mesiace, pásy od poludnia do poludnia, **ceny vo voľných dňoch**, klik na pás → panel podľa typu, **výber dní** →
   panel „Nový termín“ s cenou, minimom nocí a kolíziou z tej istej funkcie ako web; akcie predvyplnia ručnú rezerváciu alebo blokáciu.
   Ovládanie klávesnicou (šípky po dňoch, Enter = príchod/odchod) a popisy pre čítačku.
6. **05 Riadiace centrum:** **vlastné menu** (Klienti, Moduly, Stav systému, Audit, odkaz do administrácie) bez výberu ubytovania, čísla,
   zoznam klientov s balíkom a modulmi, panel klienta podľa dosky. Žiadne údaje hostí v riadiacom centre (len počty). Balík zatiaľ „bez balíka“.
7. **06–07 Mobil:** horná lišta s menu zo strany a **+**, prehľad pod sebou, detail rezervácie cez celú obrazovku (dosky `MobilPrehlad`,
   `MobilRezervacia`). Ciele dotyku min. 44 px, žiadne vodorovné rolovanie na 390 px (kalendár na mobile jeden mesiac).
8. **08 Prihlásenie hosťa** (`/ucet/prihlasenie`): v téme klienta podľa dosky — hlavná fotka objektu vľavo, 6 políčok na kód (vloženie
   celého kódu, automatický posun), Zmeniť e-mail, Poslať znova s odpočtom; logiku zo Z17 a captchu nemeň.
9. Texty cez preklady, farby z témy. Playwright: prihlásenie, prehľad, rezervácie s panelom (otvorenie, prepnutie, klik vedľa, Esc),
   kalendár (výber dní, panel), riadiace centrum, prihlásenie hosťa — na počítači aj 390 px, prístupnosť (axe). Potom **obnov snímky
   prehliadky** (`npm run tour:screens`) a zvýš jej verziu, nech Martin uvidí novinky.

### Z24 ✅ — Vzory administrácie v1.1 (pripomienky zo stagingu 17. 10.)
Martin si preklikal Z23 na stagingu a poslal pripomienky. Čítaj `docs/vizual-administracia.md` → *Pravidlá vzhľadu administrácie*
(**pravidlá 1, 6, 7, 8, 9 sú nové alebo zmenené v1.1**) a rozhodnutie 17. 10. *Pripomienky zo stagingu*. Dosky na plátne sú ešte v1
(panel s dvoma stĺpcami) — **platí text**. Logiku nemeň, je to rozhranie.
1. **`RecordPanel` — jeden stĺpec** (pravidlo 1): prilepená hlavička, súhrnná karta s mriežkou kľúčových údajov, hlavná akcia, sekcie pod sebou,
   vedľajšie sekcie (História, Súhlasy, Posledné zmeny) ako zbalené riadky s počtom, prilepená spodná lišta. `PanelColumns` zruš alebo
   nahraď jednoduchou dvojicou pre krátke hodnoty. Prerob panel rezervácie (Z23) a všetky ostatné panely na nový vzor. Nič sa nesmie
   prekrývať ani v 680 px, ani pri dlhých textoch (over Playwrightom s dlhým menom, e-mailom a poznámkou).
2. **Plochy** (pravidlo 6): token pre jemne sivý podklad kariet a sekcií + vlasová linka; použi na **všetkých** obrazovkách administrácie
   aj riadiaceho centra (aj tie, ktoré neboli na plátne: Nastavenia, Booking a Airbnb, Objekty, Služby, Referencie, Blokácie, Tím, Dokumenty…).
3. **Rozbaľovacie riadky** (pravidlo 7): spoločný komponent (riadok: názov, 1–2 údaje, stav, šípka; rozbalenie na mieste, naraz jeden,
   klávesnica a čítačka — `aria-expanded`). Použi pre Doplnkové služby (riadok: názov · cena a spôsob výpočtu · Aktívna), Referencie,
   importované kalendáre (Booking a Airbnb), Blokácie, Tím, miesta v okolí a podobné zoznamy. Formuláre na pridanie skry za tlačidlo
   „Pridať …“ (otvorí nový rozbalený riadok navrchu). Akcie v riadku pri obsahu (pravidlo 8).
4. **Drobnosti zo snímok:** súhlasy a záznam zmien cez preklady (žiadne `terms`, `privacy`, `module.changed`, `membership`); tlačidlo
   **Nahrať** nesmie vyzerať ako neaktívne, kým nie je vybraný súbor (vyber súbor → potom aktívne, alebo jedno tlačidlo „Nahrať súbor“);
   zástupný text polí sa nesmie orezávať; odsadenie položiek bočného menu od ľavého okraja; zdvojený názov importovaného kalendára
   („Booking.com (ukážka) · Booking.com“ → názov a zdroj zobraz raz); pozdrav na prehľade s menom (`profiles.full_name`, inak bez mena,
   ale bez prázdnej čiarky).
5. Playwright (počítač aj 390 px, axe) na prerobených obrazovkách; obnov snímky prehliadky (`npm run tour:screens`) a zvýš jej verziu.

### Z25 ✅ — Riadiace centrum, roly a vstup správcu (pripomienky zo stagingu 17. 10.)
Čítaj `docs/vizual-administracia.md` → *Riadiace centrum, roly a vstup správcu (v1.1)*, `ARCHITEKTURA.md` A4 a rozhodnutie 17. 10.
1. **Odlíšenie:** grafitové bočné menu riadiaceho centra + štítok „Riadiace centrum · vidíš len ty“. Menu: Klienti, Moduly, Stav systému,
   Audit ako **samostatné stránky** (presuň Moduly a Záznam zmien zo stránky Klienti; Stav systému = kontroly po klientoch). Položku
   „Do administrácie“ zruš.
2. **Vstup správcu do klienta** („Pozrieť sa ako klient“, A4): tlačidlo **Otvoriť administráciu** v paneli klienta otvorí administráciu
   daného klienta v **novej karte** s grafitovým pruhom „Prezeráš ako správca: <klient> · Späť do riadiaceho centra“; každý vstup
   do auditu (kto, kedy, ktorý klient). Správca **nemá potrebovať členstvo** u klienta. **Neoslabuj RLS:** ak by to vyžadovalo zmenu
   politík (napr. prístup správcu k dátam klienta), navrhni riešenie, zapíš ho do *Otázky pre Martina* a **zastav sa** pred nasadením
   — urob zatiaľ ostatné body. Existujúce členstvá info@obrazne.sk na stagingu nemeň (Martin ich zatiaľ používa).
3. **Výber ubytovania** v administrácii len pri viac ako jednom ubytovaní.
4. **Panel klienta** podľa nového vzoru panela (Z24, jeden stĺpec) — dnes sa v ňom prvky prekrývajú. Kontakt klienta = majiteľ
   (nie testovacie účty `@booking-platform.test`), **verejná adresa** klienta všade (zoznam aj panel; nikdy `*.localhost`),
   „Stránka pre hostí ↗“ a „Otvoriť administráciu“ v novej karte.
5. **Objekty:** formulár „Nový objekt“ ubytovateľovi skry; zakladať objekt môže správca (riadiace centrum alebo režim „Prezeráš ako správca“).
6. Testy: Playwright pre vstup správcu (nová karta, pruh, audit), majiteľ s jedným ubytovaním (bez výberu), majiteľ nevidí riadiace
   centrum ani „Nový objekt“; pgTAP, ak sa mení databáza. Testovací majiteľ STRÖMY na stagingu: info+jana@obrazne.sk (založil Claude chat 17. 10.).

### Z26 ✅ — Rýchlosť bočného panela a dokumenty (pripomienky 13–15, 17. 10.)
1. **Rýchlosť (Martin: panel rezervácie sa otvára ~3 s, myslel, že klik nefunguje).** Najprv **zmeraj** (čas od kliku po zobrazenie panela
   na stagingu, zvlášť server a sieť) a zapíš do Denníka. Potom:
   - **Región funkcií Vercelu = Frankfurt (`fra1`)**, vedľa databázy (Supabase Frankfurt) — cez `vercel.json` alebo nastavenie projektu.
     Ak by to na bezplatnom pláne nešlo alebo stálo peniaze, **zastav a opýtaj sa**.
   - **Panel sa otvorí hneď po kliknutí** (kostra s hlavičkou a sivými riadkami), údaje sa doplnia, keď prídu (streaming / Suspense).
   - **Pri otvorení alebo prepnutí panela sa znova nenačítava zoznam ani počty** — len detail; dotazy na detail paralelne, nie za sebou.
   - **Prednačítanie detailu pri prejdení myšou** nad riadkom (a pri fokuse klávesnicou).
   - Rovnako pre ostatné panely (klient v riadiacom centre…) a rozbaľovacie riadky. Cieľ: viditeľná odozva do ~0,3 s, plný detail do ~1 s.
     Zmeraj znova a výsledok pred/po zapíš do Denníka a `docs/kontrola-mvp.md`.
2. **Dokumenty pre hostí v paneli rezervácie:** veta „…odkaz platí 10 minút“ preč → „Hosť si ich stiahne vo svojom účte.“; formulár
   nahrávania skry za „+ Nahrať dokument“ (pravidlo 7). V tej istej sekcii zobraz aj **dokumenty objektu, ktoré tento hosť dostane**
   (podľa viditeľnosti vždy / po potvrdení a stavu rezervácie), napr. „Pre všetkých hostí objektu (2) · upraviť pri objekte →“ s odkazom
   na záložku Dokumenty objektu. Pri objekte (záložka Dokumenty) krátka veta, že dokument pre jedného hosťa sa nahráva v jeho rezervácii.
3. Playwright: otvorenie panela (kostra hneď, údaje potom), prepnutie záznamu, dokumenty objektu viditeľné v paneli; axe.

**Kontext pre frontu Z27–Z28 (pripomienky 16–24, 17. 10.):** návrh v1.2 je schválený — `docs/vizual-administracia.md` → kapitola **v1.2**,
dosky `docs/navrhy/administracia/Sidebar.dc.html` a `Statistiky.dc.html` (klikateľné: rok, porovnanie, mesiac v grafe, zvonček, skupiny menu).
Doska je **zámer, nie doslovná predloha**; platia pravidlá v1.1 (jeden stĺpec v paneli, pilulky, sivé karty, rozbaľovacie riadky, žiadne
technické texty). Stále len staging, rovnaké pravidlá (`tenant_id` + RLS + pgTAP, centy, preklady, téma, A18). Režim: za sebou bez prerušenia.

### Z29 ✅ — Košík v2.2 pre 13″ notebook (pripomienka 25, 17. 10.) — **robiť prednostne, pred Z27**
Stránka hosťa je to, čo uvidí Jana a jej hostia. Návrh: `docs/vizual-stranka-hosta.md` → **Košík v2.2**, doska
`docs/navrhy/stranka-hosta/KosikNotebook.dc.html` (1440 × 800, klikacia: riadky služieb, Zmeniť, kroky). Zámer, nie pixelová predloha.
1. **Súhrn vpravo (320 px)** sa na 1440 × 800 vojde celý bez posúvania: názov, termín + „Zmeniť“ (všetky kroky), dospelí + deti/zvieratá,
   cena + Rozpis, Vaše doplnky, dole „← Späť“ (krok 2, 3), tlačidlo a jeden riadok istoty. Tri istoty, referenciu a Janu zo súhrnu vyber.
2. **Krok 1:** bez pásu fotiek; termín vľavo neopakovať — s termínom začína službami, bez termínu / po „Zmeniť“ kalendár vľavo + „Hotovo“.
   **Služby ako jednoriadkové riadky** (~54 px) s rozbalením na mieste (jeden naraz), pod nimi referencia na sivej karte.
3. **Krok 2:** karta „Otázky pred rezerváciou? Odpovedá Jana.“ (WhatsApp, Zavolať — z údajov majiteľa, skryť, keď chýbajú).
   **Krok 3:** tri istoty na sivej karte nad súhlasmi; texty istôt z podmienok objektu, nie natvrdo.
4. **Lišta krokov 52 px** (čísla 22 px, hotový krok s fajkou a klikateľný späť).
5. **Mobil:** košík bez fotiek, služby rovnako jednoriadkové (cenový model môže ísť pod názov); inak ako doteraz.
6. Playwright: košík na **1440 × 800** — súhrn bez posúvania (tlačidlo aj riadok istoty viditeľné bez scrollu aj s 2 doplnkami),
   rozbalenie služby, Zmeniť → kalendár → Hotovo, kroky 1–3; mobil 390 px; axe. Obnov snímku košíka v prehliadke „Čo je nové“, ak tam je.

### Z27 ✅ — Administrácia v1.2: menu so skupinami, štatistiky, upozornenia (pripomienky 16–18, 24)
1. **Bočné menu so skupinami** podľa dosky `Sidebar`: Prehľad · Rezervácie › Zoznam, Kalendár, Blokácie · Objekt › Údaje, Fotky,
   Ceny a sezóny, Stránka, Dokumenty · Ponuka › Doplnkové služby, Referencie · Štatistiky · Prepojenia › Booking a Airbnb · dole
   Nastavenia › Všeobecné, Tím, Platby, E-maily a upozornenia.
   - **Mapuj existujúce stránky a záložky** do skupín (záložky objektu sa môžu stať podpoložkami s odkazom na záložku). Novú stránku
     vytvor len pre Štatistiky a E-maily a upozornenia; položku, ku ktorej stránka zatiaľ nie je, vynechaj (žiadne prázdne stránky).
   - Manifest modulu dostane `group` (do ktorej skupiny patrí položka); prázdna skupina sa nezobrazí. Pri jednom objekte vedie
     skupina Objekt priamo na jeho záložky, pri viacerých najprv zoznam objektov.
   - Vzhľad: položky cez celú šírku bez zaoblenia, aktívna = jemný podklad + 3 px čiara vľavo, hover o odtieň tmavší, **tenká čiara
     `#e7e4dc` medzi hlavnými položkami**, podpoložky odsadené bez čiar; skupina sa otvára klikom, skupina aktívnej stránky je otvorená;
     v zbalenom menu podpoložky ako vyskakovací zoznam pri prejdení myšou a fokuse. Klávesnica a `aria-expanded`. Mobil: rovnaký strom v menu zo strany.
2. **Stránka Štatistiky** (`/admin/statistics`) podľa dosky 09 a pravidiel výpočtu v kapitole v1.2:
   - výber obdobia (rok / posledných 12 mesiacov), prepínač porovnania s minulým rokom, 5 čísel s medziročnou zmenou, čiarový graf
     tržieb po mesiacoch (plná = prebehnuté, bodkovaná = potvrdené budúce, sivá = minulý rok, štítky najsilnejší/najslabší, klik na mesiac
     → bublina + zvýraznený riadok), tabuľka po mesiacoch, veta o pôvode čísel. Graf ako vlastné SVG (žiadna ťažká knižnica);
     prístupný: tabuľka je textová alternatíva, graf má `aria-label` so súhrnom.
   - **Výpočet v databáze alebo na serveri jednou funkciou** (napr. RPC `tenant_monthly_stats(tenant, from, to)`), rešpektuje RLS;
     noci rozdelené do mesiacov pobytu; len priame rezervácie v stavoch potvrdená/prebieha/ukončená; obsadenosť = obsadené noci (priame +
     portály, bez blokácií majiteľa) / dostupné noci všetkých objektov; peniaze v centoch a mene klienta. Unit testy na hranice mesiacov
     (pobyt cez prelom mesiaca a roka), zrušené rezervácie a prázdne mesiace.
   - **Ušetrené na províziách** = tržby priamo × provízia portálu; provízia je nastavenie klienta (predvolene 15 %, upraviteľné v Prepojeniach,
     text „≈ … pri provízii 15 %“). Rozhodnuté Claude chatom — ak už v dátach podobné pole je, použi ho.
3. **Prehľad:** malý graf tržieb za posledných 12 mesiacov (ten istý výpočet) s odkazom „Všetky štatistiky →“.
4. **Upozornenia (zvonček)** vpravo hore v hlavičke každej stránky administrácie aj riadiaceho centra:
   - tabuľky napr. `notifications` (tenant_id, druh, údaje, cieľový odkaz, čas; pre správcu platformy bez tenant_id s publikom „platforma“)
     a `notification_reads` (user_id, prečítané kedy) — **RLS: člen tímu vidí len upozornenia svojho klienta, platformové len správca**; pgTAP.
   - vznik upozornení z existujúcich udalostí (`emitBookingEvent`, import iCal, kontrola splatnosti/skúšok — kde už beží denná kontrola,
     pridaj zápis). Druhy podľa kapitoly v1.2. Nedupľuj: rovnaká udalosť pre ten istý záznam = jedno upozornenie.
   - odznak s počtom neprečítaných, zoznam 420 px (mobil cez celú obrazovku), klik = označí prečítané a otvorí cieľ (napr. `?panel=booking:<id>`),
     „Označiť všetko ako prečítané“; počet sa obnoví pri navigácii (stačí, žiadny realtime). Starších ako 90 dní nezobrazuj.
   - **Nastavenia → E-maily a upozornenia:** prehľad druhov (čo sa ukáže v zvončeku, čo príde aj e-mailom) — zatiaľ len na čítanie;
     vypínanie jednotlivých druhov až neskôr.
5. **Ukážkové dáta na stagingu:** rozšír `npm run demo-data` o históriu ~18 mesiacov (priame rezervácie cez rovnaký výpočet ceny,
   zopár zrušených, udalosti z portálov, sezónny priebeh — zima a leto silnejšie) a niekoľko upozornení, aby grafy a zvonček neboli prázdne.
   Len ukážkový klient a STRÖMY na stagingu, označenie „DEMO — …“, `--reset` ich zmaže.
6. Playwright (PC + mobil 390 px): menu (otvorenie skupiny, aktívna položka, zbalený režim), štatistiky (prepnutie roka, porovnanie,
   klik na mesiac), zvonček (odznak, prečítanie, prechod na cieľ); axe. Obnov snímky prehliadky „Čo je nové“ a zvýš `version`
   (nové: menu so skupinami, Štatistiky, zvonček).

### Z30 ✅ — Košík: Pokračovať hneď po výbere termínu (pripomienka 28, 17. 10.) — **malá, robiť pred Z28**
Podľa `docs/vizual-stranka-hosta.md` → Košík v2.2, krok 1 (úprava 17. 10.). Martin nevidel „Hotovo“ a nevedel, prečo nejde pokračovať.
1. Platný termín vybraný → **„Pokračovať“ aktívne**, klik = potvrdenie termínu (kalendár sa zbalí, ukážu sa doplnky, krok 1 ostáva).
   „Hotovo“ premenovať na „Potvrdiť termín“ (robí to isté).
2. Bez platného termínu: Pokračovať stlmené s `aria-disabled` (nie `disabled`) a **nad ním vždy viditeľná veta prečo** (príchod → odchod →
   minimum nocí z pravidiel ceny; `aria-describedby`); klik na stlmené tlačidlo vetu zvýrazní a posunie kalendár do pohľadu.
3. Kým je kalendár otvorený, „Zmeniť“ v súhrne skryť. Termín v súhrne krátko (`24. – 26. 11. 2026`), aby sa nezalamoval — formát cez `Intl`.
4. Riadok istoty pod tlačidlom sa nesmie orezať (dnes je na 1440 × 900 odrezaný) — krátke znenie, inak zalomenie.
5. Mobil: to isté v zelenom páse dole (aktívne pri platnom termíne, inak veta nad pásom).
6. Playwright: bez termínu → veta „Vyberte deň príchodu“, po výbere odchodu Pokračovať aktívne a ukáže doplnky; minimum nocí → veta; axe.

### Z28 — Riadiace centrum v1.2 (pripomienky 19–23 + drobnosti)
1. **Tmavé menu:** položky cez celú šírku bez zaoblenia, hover biela 6 %, aktívna biela 10 % + 3 px čiara vľavo, text vždy svetlý
   (dnes biely text na bielom podklade). Kontrast skontroluj axe.
2. **Hierarchia menu:** Klienti › Všetci klienti, Založiť klienta, a v detaile klienta pod tým jeho názov › Prehľad, Moduly, Vzhľad,
   Domény, Ľudia, Záznam zmien · Moduly › Katalóg, Skúšobné doby · Stav systému · Audit. Drobčeky hore na podstránkach.
   **Drobčeky podľa spoločného pravidla** (`docs/vizual-administracia.md` → Drobčeková navigácia): komponent v `PageHeader`, malým písmom
   nad nadpisom, len od druhej úrovne, nie v bočných paneloch, na mobile len „‹ Späť na …“. **Použi ho aj v administrácii majiteľa**
   (Z27 už je hotová) — napr. `Objekt › <názov> › Ceny a sezóny`, `Nastavenia › Tím`; stránky prvej úrovne bez drobčekov.
   **Klik na skupinu v menu** (pripomienka 27, obe menu — majiteľ aj riadiace centrum) podľa pravidla v `docs/vizual-administracia.md`
   → Klik na skupinu v menu: hlavná položka vedie na prvú viditeľnú podstránku a rozbalí sa, rozbalená len skupina aktívnej stránky,
   skupina s jedinou podpoložkou = obyčajná položka (Prepojenia), žiadne prehľadové stránky skupín. Playwright: klik na „Rezervácie“
   otvorí Zoznam; Prepojenia bez šípky.
3. **Detail klienta ako stránka so záložkami** (`/platform/tenants/[id]/<záložka>`) — obsah dnešného „Všetky nastavenia“ rozdelený
   do záložiek; cesty: menu, riadok v zozname, drobčeky.
4. **Zoznam klientov = rozbaľovacie riadky** namiesto bočného panela (obsah v kapitole v1.2: tržby tento/minulý mesiac, rezervácie 30 dní
   a posledná, obsadenosť 90 dní, zdravie, moduly a koniec skúšok, majiteľ + posledné prihlásenie; akcie Otvoriť detail / Otvoriť
   administráciu ↗ / Stránka pre hostí ↗). Čísla z rovnakej funkcie ako Štatistiky (Z27), načítanie až pri rozbalení, s prednačítaním (Z26).
5. **Moduly = správa:** katalóg (popis, závislosti, počet klientov, stav hotový / **v príprave** — recenzie, správy s hosťom, push, SMS,
   online check-in, upsell; moduly v príprave len ako riadky katalógu bez zapnutia), rozbalenie → klienti s prepínačom skúška/aktívny/vypnutý,
   koniec skúšky, **Priradiť klientovi**; to isté v záložke Moduly v detaile klienta. Každá zmena do auditu. Ceny modulov zatiaľ nie.
6. **Audit:** filtre obdobie od–do, kategória (Prihlásenie, Vstup správcu, Moduly a skúšky, Tím a prístupy, Nastavenia, Klienti), klient,
   osoba, hľadanie; stránkovanie, CSV. **Zapisuj úspešné prihlásenia** do administrácie a riadiaceho centra (ak sa ešte nezapisujú);
   neúspešné len ak to ide jednoducho (počet podľa IP, nikdy heslo ani zadaný e-mail v čistom texte).
7. **Drobnosti zo stagingu:** domény `*.localhost` v detaile klienta skry (alebo štítok „len vývoj“); náhľad témy bez zástupného textu;
   testovacie účty (`@booking-platform.test`) sa neukazujú ako kontakt majiteľa; ukážkové iCal kalendáre (`example.invalid`) označ ako
   ukážkové, aby Stav systému nehlásil falošnú chybu synchronizácie.
8. Playwright: menu (hover čitateľný, hierarchia, drobčeky), rozbalenie klienta, priradenie modulu klientovi, filtre auditu; axe.

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
- **Riadiace centrum v produkcii (pripomienka 17. 10.):** vlastná adresa (subdoména) s vlastným prihlásením a dvojstupňovým overením pre správcu — rozhodnúť pri príprave produkcie (DNS).
- **Nový objekt:** zatiaľ ho zakladá len správca; či si ho ubytovateľ pridá sám (a či je počet objektov súčasťou balíka), rozhodne obchodný model.
- **Kód hosťa (Z23):** návrh má 6 políčok, ale staging posiela **8-miestny** kód (nastavenie Supabase Auth → Email OTP length).
  Políčka sa riadia skutočnou dĺžkou kódu, takže to funguje. Ak chceš 6 ako na návrhu, treba prepnúť dĺžku v Supabase (staging aj neskôr produkcia).
- **Z23 — čo som vynechal, lebo to v aplikácii zatiaľ nie je:** „Zostať prihlásený“ (prihlásenie ostáva ako doteraz), „Upraviť“
  v paneli rezervácie (úprava rezervácie neexistuje — dá sa zrušiť a vytvoriť ručne), „+ Pozvať človeka“ v riadiacom centre (pozvánky
  ešte nie sú), štítok „Ukážka“ pri klientovi (v databáze nie je príznak ukážkového klienta). „Zabudnuté heslo?“ pošle prihlasovací odkaz.
  E-mail podpory na prihlasovacej obrazovke sa zobrazí, keď nastavíš `NEXT_PUBLIC_SUPPORT_EMAIL` (Vercel). Chceš niektoré z toho doplniť?
- **Prístupnosť (Z23):** sivé štítky z návrhu (#8b929b) nesplnili kontrast AA, v administrácii sú preto tmavšie (#5a6672).
- **Mapa (Z19):** zatiaľ dlaždice priamo z OpenStreetMap (zadarmo, mierne používanie). Pred ostrou prevádzkou s väčšou návštevnosťou
  odporúčam poskytovateľa dlaždíc s bezplatným limitom (MapTiler alebo Stadia — treba účet). Súhlasíš?
- **STRÖMY (Z19):** miesta v okolí a popisy zvýrazneného vybavenia sú orientačné — nech ich Jana skontroluje v administrácii.
- **Captcha:** zapojená (pozri Denník). Pri napojení vlastnej domény klienta treba doménu pridať do widgetu `booking-platform`
  v Cloudflare (Turnstile → Hostname Management), inak sa overenie na tej doméne nenačíta.
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
