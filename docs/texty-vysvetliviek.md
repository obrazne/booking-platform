# Texty vysvetliviek ⓘ

Všetky texty ⓘ v administrácii a riadiacom centre na jednom mieste (Z66, pravidlo 8, doska 14) — na prečítanie naraz.
Zdroj je `src/i18n/messages/sk.json` → `help.pages` (stránky) a `help.fields` (polia); tento súbor je z nich vygenerovaný.
Odkaz „… ›“ vedie na otázku v Pomoci (`help.faqs`). Pri zmene správania stránky treba upraviť aj text.

## Stránky

### Prehľad  `overview`
**Čo je Prehľad** — Prvá stránka po prihlásení. Hore je, čo čaká na vás — napríklad rezervácia, ktorá ešte nie je zaplatená, alebo žiadosť hosťa o zrušenie. Pod tým čísla roka, najbližšie pobyty a pruh, koľko nocí tohto a ďalšieho mesiaca ste predali priamo a koľko cez portály.

### Kalendár  `calendar`
**Čo je Kalendár** — Všetky pobyty, blokácie a obsadenosť z Bookingu a Airbnb na jednom mieste, po mesiacoch. Pobyt ukáže pod myšou hosťa, termín a sumu, klik otvorí detail. Keď označíte voľné dni (príchod, potom odchod), môžete ich rovno zablokovať alebo na ne zapísať rezerváciu.
Odkaz: Ako blokovať termín › → Pomoc: „Ako zablokujem termín, keď idem upratovať?“

### Rezervácie  `reservations`
**Čo sú Rezervácie** — Priame rezervácie z vašej stránky a tie, ktoré ste zapísali ručne — napríklad po telefóne. Riadok otvorí detail s platbou, hosťom a správami. Pobyty z Bookingu a Airbnb sú v Rezervácie › Z portálov.
Odkaz: Ako potvrdiť zaplatenie prevodom › → Pomoc: „Hosť zaplatil prevodom. Čo mám urobiť?“

### Rezervácie › Ručná rezervácia  `reservationNew`
**Ručná rezervácia** — Pre hosťa, ktorý sa ozval telefonicky alebo e-mailom. Termín sa hneď zavrie na vašej stránke, portály ho zavrú pri svojej najbližšej synchronizácii. Do tržieb sa počíta rovnako ako priama rezervácia.
Odkaz: Ako zapísať rezerváciu z telefónu › → Pomoc: „Ako zapíšem rezerváciu, ktorú mi hosť dohodol telefonicky?“

### Rezervácie › Príchody  `arrivals`
**Čo sú Príchody** — Najbližšie príchody hostí so stavom online check-inu a hlásenia cudzincov. Cudzinca treba nahlásiť do 5 dní od ubytovania — tu vidíte, komu ešte chýba, a stiahnete podklad na hlásenie.

### Rezervácie › Z portálov  `portalStays`
**Čo sú pobyty z portálov** — Pobyty, ktoré prišli z kalendárov Bookingu, Airbnb a ďalších portálov. Sú to len obsadené termíny — rezervácia, platba a kontakt na hosťa ostávajú na portáli a platforma ich nemení. Ak portál pošle kód rezervácie alebo koniec telefónneho čísla, uvidíte ich tu.
Odkaz: Prečo tu nie sú mená hostí z portálov › → Pomoc: „Kde vidím hostí z Bookingu a Airbnb?“

### Rezervácie › Kolízie  `collisions`
**Čo sú kolízie** — Termín, ktorý Booking, Airbnb alebo iný kalendár hlási ako obsadený, ale u vás je už rezervovaný alebo zablokovaný. Nič sa neprepísalo — pozrite, s čím sa termín prekrýva, a rozhodnite, čo s tým.
Odkaz: Čo robiť pri kolízii › → Pomoc: „Prečo vidím kolíziu s Airbnb alebo Bookingom?“

### Rezervácie › Blokácie  `blocks`
**Čo je blokácia** — Zavrie termín, keď v objekte nemajú byť hostia — veľké upratovanie, oprava sauny, váš vlastný pobyt. Hostia ho na vašej stránke uvidia ako obsadený a Booking a Airbnb ho zavrú pri svojej najbližšej synchronizácii s vaším kalendárom. Blokácia nemá hosťa ani cenu, poznámku vidíte len vy.
Odkaz: Ako blokovať termín › → Pomoc: „Ako zablokujem termín, keď idem upratovať?“

### Kalendáre portálov (iCal)  `ical`
**Čo sú kalendáre portálov** — Prepojenie s Bookingom, Airbnb a ďalšími cez kalendár iCal: ich obsadené termíny sa zavrú u vás a vaše rezervácie a blokácie sa zavrú u nich. Portály si váš kalendár načítavajú samy, zvyčajne raz za pár hodín. Pri kolízii sa nič neprepíše — dostanete upozornenie.
Odkaz: Ako prepojiť Booking alebo Airbnb › → Pomoc: „Ako prepojím kalendár z Bookingu alebo Airbnb?“

### Správy  `messages`
**Čo sú Správy** — Konverzácie s hosťami priamych rezervácií — jedna rezervácia, jedna konverzácia. Hosť píše vo svojom účte a vašu odpoveď dostane aj e-mailom. S hosťami z Bookingu a Airbnb sa píše na portáli.

### Správy › Automatické správy  `autoMessages`
**Čo sú automatické správy** — Správy, ktoré sa pošlú samy každému hosťovi s priamou rezerváciou — napríklad poďakovanie po potvrdení alebo pokyny 3 dni pred príchodom. Hosť ich dostane v účte aj e-mailom ako správu od vás; pri konkrétnom hosťovi ich v konverzácii môžete upraviť alebo vynechať. Dole sú rýchle odpovede na časté otázky.

### Recenzie  `reviews`
**Čo sú recenzie** — Overené recenzie hostí po pobyte. Zverejnia sa samy 72 hodín po odoslaní, ak nezasiahnete — môžete ich zamietnuť alebo na ne odpovedať. Hodnotenia z iných zdrojov pridáte v Ponuka › Referencie.

### Ponuka › Doplnkové služby  `services`
**Čo sú doplnkové služby** — Služby, ktoré si hosť pridá k pobytu — raňajky, šéfkuchár, transfer. Cena sa počíta za pobyt, noc, osobu alebo kus a pripočíta sa k rezervácii. Vypnutú službu hostia nevidia, nič sa nezmaže.

### Ponuka › Referencie  `testimonials`
**Čo sú referencie** — Hodnotenia hostí, ktoré ukážete na stránke a v košíku — aj z Bookingu, Google či návštevnej knihy. Celé meno len so súhlasom hosťa, inak meno a iniciála.

### Štatistiky  `statistics`
**Čo sú Štatistiky** — Tržby z priamych rezervácií, počet rezervácií, obsadenosť (aj s Bookingom a Airbnb) a priemerná cena za noc po mesiacoch. Porovnáte rok s predošlým a klik na mesiac ukáže jeho rezervácie. Úspora na províziách je odhad podľa percenta v Nastaveniach.

### Štatistiky › Mesačný výpis  `monthlyReport`
**Čo je Mesačný výpis** — Zhrnutie mesiaca na jednu stranu: tržby, obsadenosť, úspora na províziách a čo za vás systém urobil. Príde vám e-mailom 1. dňa v mesiaci, tlačidlom ho pošlete účtovníkovi. Je to podklad, nie účtovný doklad.
Odkaz: Kto dostane mesačný výpis › → Pomoc: „Čo je mesačný výpis a kto ho dostane?“

### Nastavenia › Tím  `team`
**Čo je Tím** — Kto má prístup do administrácie a s akou rolou — Majiteľ, Recepcia, Upratovanie. Nového člena tímu zatiaľ pridávame my: napíšte nám jeho e-mail a rolu.
Odkaz: Ako pridať kolegu › → Pomoc: „Ako pridám upratovačku alebo ďalšieho človeka?“

### Nastavenia  `settings`
**Čo sú Nastavenia** — Platba (účet, splatnosť), storno podmienky, kontakt a podpis správ, e-maily hosťom a mesačný výpis — spoločné pre všetky vaše objekty. Zmeny uložíte lištou dole.

### Nastavenia › E-maily a upozornenia  `notifications`
**Čo sú E-maily a upozornenia** — Čo sa ukáže v zvončeku vpravo hore a čo príde aj e-mailom. Prečítanie je osobné — každý z tímu má svoje. Upozornenia môžu chodiť aj do mobilu, keď ich na ňom zapnete.
Odkaz: Ako dostávať upozornenia do mobilu › → Pomoc: „Ako si zapnem upozornenia do mobilu?“

### Nastavenia › Nedávno zmazané  `trash`
**Čo je Nedávno zmazané** — Zmazané služby, sezóny s cenami, poplatky, zľavy, fotky, sekcie, dokumenty, blokácie, kalendáre a miesta v okolí obnovíte do 30 dní. Rezervácie sa nemažú, len rušia.
Odkaz: Ako obnoviť zmazané › → Pomoc: „Omylom som niečo zmazal. Dá sa to vrátiť?“

### Objekty  `properties`
**Čo sú objekty** — Ubytovania, ktoré prenajímate — chalet, apartmány, izby. Každý má vlastnú stránku pre hostí, ceny, fotky a pravidlá pobytu.

### Objekt › Údaje  `propertyDetails`
**Údaje objektu** — Základ pre stránku aj rezervácie: názov, kapacita, čas príchodu a odchodu, upratovacie dni medzi pobytmi a miestny poplatok. Kým objekt nie je zverejnený, hostia ho nevidia.
Odkaz: Ako nechať deň na upratovanie › → Pomoc: „Ako nechám deň voľna na upratovanie medzi hosťami?“

### Objekt › Fotky  `propertyPhotos`
**Fotky** — Fotky na stránke pre hostí. Prvá je hlavná — ukáže sa hore na stránke a v potvrdení rezervácie. Pred nahraním sa zmenšia na 2 000 px.

### Objekt › Stránka  `propertyPage`
**Stránka pre hostí** — Poradie a texty sekcií na stránke objektu. Ceny, storno, príchod či vybavenie sa dosadzujú z nastavení — tu sa nepíšu, takže sa nikde nerozídu.

### Objekt › Poloha a okolie  `propertyLocation`
**Poloha a okolie** — Kde objekt je a čo je v okolí — napríklad lanovka 5 minút autom. Pri približnej polohe uvidí hosť len oblasť a presnú adresu dostane po potvrdení rezervácie.

### Objekt › Sezóny a ceny  `propertyPricing`
**Sezóny a ceny** — Cena za noc a minimum nocí podľa termínu. Predvolená sezóna platí pre všetky dni mimo ostatných; pri prekryve sezón platí tá s vyššou prioritou. Zmena platí pre nové rezervácie — potvrdené ostávajú za pôvodnú cenu.
Odkaz: Ako zmeniť cenu na sviatky › → Pomoc: „Ako zmením cenu na Vianoce a Silvester?“

### Objekt › Poplatky a zľavy  `propertyExtras`
**Poplatky a zľavy** — Poplatky sa pripočítajú k pobytu — vždy (upratovanie), na výber hosťa alebo za zviera; vratná kaucia sa nepočíta do tržieb. Zľavy sa nesčítavajú: hosť dostane tú najvýhodnejšiu, napríklad za 7 a viac nocí alebo s promo kódom.

### Objekt › Dokumenty  `propertyDocuments`
**Dokumenty pre hostí** — Domáci poriadok, návod na saunu, mapa — dostanú ich všetci hostia objektu v svojom účte, podľa nastavenia hneď alebo až po potvrdení. Dokument pre jedného hosťa nahrajte v jeho rezervácii.

### Objekt › Jednotky  `propertyUnits`
**Jednotky** — Apartmány alebo izby, ktoré sa rezervujú samostatne — každá má svoju kapacitu, kalendár a ceny. Vypnutú jednotku hostia nevidia.

### Riadiace centrum › Klienti  `platformClients`
**Čo sú Klienti** — Ubytovatelia na platforme s modulmi, stavom a počtom rezervácií za 30 dní. Riadok otvorí klienta, šípka jeho náhľad. Riadiace centrum nevidí mená ani kontakty hostí — len počty.

### Riadiace centrum › Nový klient  `platformNew`
**Nový klient** — Založí ubytovateľa: názov, adresu, doménu, krajinu a menu. Majiteľa do tímu a moduly pridáte potom v detaile klienta.

### Riadiace centrum › Audit  `platformAudit`
**Čo je Audit** — Kto, kedy a čo zmenil naprieč klientmi: prihlásenia, vstup do administrácie klienta, moduly, tím, nastavenia. Heslá ani zadané e-maily sa nikdy nezapisujú. Export CSV vezme všetko, čo vyhovuje filtru.

### Riadiace centrum › Katalóg modulov  `platformModules`
**Čo je Katalóg modulov** — Hotové moduly zapínate klientom natrvalo alebo na skúšku; moduly v príprave sú tu, aby bolo vidieť, čo pribudne. Každá zmena sa zapíše do auditu.

### Riadiace centrum › Skúšky  `platformTrials`
**Čo sú skúšky** — Moduly na skúšku zoradené podľa konca. Po skončení sa modul klientovi len skryje — nič sa nezmaže.

### Riadiace centrum › Stav systému  `platformStatus`
**Čo je Stav systému** — Synchronizácia kalendárov, neodoslané e-maily a zálohy naprieč klientmi. Keď je niečo zlé, ukáže sa to aj v číslach na stránke Klienti.

### Riadiace centrum › Upozornenia  `platformNotifications`
**Upozornenia riadiaceho centra** — Ktoré upozornenia zo zvončeka vám prídu aj do mobilu alebo počítača — aj keď administráciu nemáte otvorenú.

### Riadiace centrum › Podpora  `platformSupport`
**Čo je Podpora** — Žiadosti klientov z „Nenašli ste odpoveď?“ v Pomoci a návody, pri ktorých klienti odpovedali, že im nepomohli. Odpovedáte e-mailom — žiadosť príde aj na adresu podpory.

### Klient › Prehľad  `tenantOverview`
**Prehľad klienta** — Stav klienta a jeho čísla, bez údajov hostí. Odtiaľ vstúpite do jeho administrácie — vstup sa zapíše do auditu.

### Klient › Moduly  `tenantModules`
**Moduly klienta** — Zapnutý modul vidí majiteľ v administrácii aj hostia na stránke. Po vypnutí sa len skryje, nič sa nezmaže.

### Klient › Ľudia  `tenantPeople`
**Ľudia klienta** — Kto má prístup do administrácie klienta, s akou rolou a kedy sa naposledy prihlásil.

### Klient › Domény  `tenantDomains`
**Domény klienta** — Adresy, na ktorých hostia nájdu stránku klienta; hlavná sa používa v odkazoch. Adresy *.localhost slúžia len na vývoj.

### Klient › Vzhľad  `tenantTheme`
**Vzhľad klienta** — Farby, písmo a zaoblenie stránky pre hostí s náhľadom. Pri nízkom kontraste tlačidiel sa ukáže varovanie.

### Klient › Záznam zmien  `tenantHistory`
**Čo je Záznam zmien** — Každá zmena v dátach klienta za posledných 180 dní — pred a po, kto a kedy. Zmenu, ktorú urobil človek, môžete vrátiť; synchronizácia kalendárov je zhrnutá po behoch a predvolene skrytá.

## Polia

### Blokácie › pole „Do (deň odchodu)“  `blockTo`
**Do (deň odchodu)** — Deň, keď je objekt znova voľný. Blokácia 6.–8. 4. zavrie noci 6. a 7. apríla, 8. apríla už môže prísť hosť.

### Sezóny a ceny › pole „Priorita“  `seasonPriority`
**Priorita sezóny** — Keď sa dve sezóny prekrývajú, platí tá s vyššou prioritou. Napríklad Vianoce s prioritou 20 vyhrajú nad Zimou s prioritou 10.

### Objekt › Údaje › pole „Upratovacie dni medzi pobytmi“  `cleaningGap`
**Upratovacie dni medzi pobytmi** — Toľko dní po každom odchode sa nebude dať rezervovať nový príchod. Pri jednom dni: hosť odíde v sobotu, ďalší môže prísť najskôr v nedeľu.
Odkaz: Viac o upratovacích dňoch › → Pomoc: „Ako nechám deň voľna na upratovanie medzi hosťami?“

### Nastavenia › pole „Provízia portálov (%)“  `portalCommission`
**Provízia portálov** — Koľko percent by ste zaplatili Bookingu alebo Airbnb. Z tohto čísla Prehľad a výpis odhadujú, koľko ste ušetrili na priamych rezerváciách — nič sa tým neúčtuje.

### Nastavenia › Mesačný výpis (minúty úkonov)  `reportMinutes`
**Minúty vo výpise** — Koľko minút by úkon trval ručne. Výpis z nich počíta „Za vás odpracované“ — napríklad 40 automatických e-mailov po 3 minúty sú 2 hodiny. Výpis chodí e-mailom 1. dňa v mesiaci.
Odkaz: Čo je mesačný výpis › → Pomoc: „Čo je mesačný výpis a kto ho dostane?“
