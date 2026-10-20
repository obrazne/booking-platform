# Pomoc — otázky a odpovede na kontrolu

Obsah stránky **Pomoc** v administrácii (Z67). Texty sú v `src/i18n/messages/sk.json` (`help.faqs`, modulové v `modules.<modul>.help`),
poradie a odkazy v `src/core/help/faqs.ts`. Odpovede popisujú, čo systém **naozaj** robí (stav k 19. 10. 2026) — pri zmene správania ich treba upraviť.
Martin: prečítaj a napíš, čo opraviť alebo doplniť. Počty „Pomohlo vám to? Áno / Nie“ sú v riadiacom centre › Podpora.

## Kalendár a portály

### Ako zablokujem termín, keď idem upratovať?
1. V menu otvorte Rezervácie › Blokácie a kliknite na „Pridať blokáciu“.
2. Vyberte prvú noc a deň, keď je objekt znova voľný. Poznámku (napr. „jarné upratovanie“) vidíte len vy.
3. Kliknite na Blokovať. Na vašej stránke je termín hneď obsadený, Booking a Airbnb ho uvidia pri svojej najbližšej synchronizácii s vaším kalendárom.

Tlačidlo: **Otvoriť Blokácie**

### Ako prepojím kalendár z Bookingu alebo Airbnb?
1. V Bookingu (Synchronizácia kalendára) alebo v Airbnb (Dostupnosť › Prepojenie kalendárov) skopírujte adresu kalendára na export.
2. V Nastavenia › Prepojenia kliknite na „Pridať kalendár“, vyberte zdroj a adresu vložte.
3. Opačným smerom: adresu „Export pre …“ z tej istej stránky vložte do Bookingu alebo Airbnb ako importovaný kalendár.
4. Termíny z portálov sa načítavajú samy približne každých 5 minút; tlačidlom „Synchronizovať teraz“ hneď.

Tlačidlo: **Otvoriť Booking a Airbnb**

### Prečo vidím kolíziu s Airbnb alebo Bookingom?
1. Portál poslal obsadený termín, ktorý sa prekrýva s rezerváciou alebo blokáciou u vás. Nič sme neprepísali.
2. Otvorte Rezervácie › Kolízie — uvidíte, čo s čím koliduje, a rozhodnete, čo s tým.

Tlačidlo: **Otvoriť Kolízie**

### Kde vidím hostí z Bookingu a Airbnb?
1. Rezervácie › Z portálov ukazuje pobyty, ktoré prišli z kalendárov portálov (položka je v menu, keď máte kalendár prepojený).
2. Portály v kalendári neposielajú meno ani kontakt hosťa — ak ho portál pošle (kód rezervácie, časť telefónu), ukážeme ho; inak podrobnosti nájdete priamo na portáli.
3. Medzi Hosťami ani v štatistike priamych tržieb títo hostia nie sú.

Tlačidlo: **Otvoriť pobyty z portálov**

## Platby

### Hosť zaplatil prevodom. Čo mám urobiť?
1. Otvorte rezerváciu v zozname Rezervácie (alebo na Prehľade v časti Čaká na vás).
2. Kliknite na „Platba prijatá“. Rezervácia sa potvrdí a hosť dostane potvrdenie e-mailom sám.

Tlačidlo: **Otvoriť Rezervácie**

### Čo sa stane, keď hosť nezaplatí včas?
1. Nezaplatená rezervácia čaká počas lehoty na zaplatenie, ktorú nastavíte v Nastavenia › Platby pri prevode na účet (v hodinách).
2. Po lehote sa sama zruší a termín sa znova uvoľní na predaj. O zrušení dostanete upozornenie.
3. Ak hosť zaplatí neskôr, rezerváciu vytvorte znova ručne.

Tlačidlo: **Otvoriť lehotu na zaplatenie**

### Kde zmením bankový účet (IBAN) pre platby?
1. Otvorte Nastavenia › Platby, rozbaľte Prevod na účet s QR a prepíšte IBAN a príjemcu.
2. Uložte. Nový účet a QR kód dostanú hostia pri nových rezerváciách.

Tlačidlo: **Otvoriť IBAN**

### Hosť chce zrušiť pobyt. Ako zistím, koľko mu vrátiť?
1. V Nastavenia › Pravidlá pobytu máte storno podmienky a nepovinne storno pásma (koľko percent sa vráti podľa počtu dní do príchodu).
2. Keď hosť požiada o zrušenie, uvidíte to na Prehľade a v paneli rezervácie aj s návrhom storno poplatku podľa pásiem.
3. Peniaze vraciate sami prevodom — systém ich neposiela.

Tlačidlo: **Otvoriť storno podmienky**

## Ceny a pravidlá pobytu

### Ako zmením cenu na Vianoce a Silvester?
1. Otvorte Objekt › Ceny a sezóny a rozbaľte sezónu (alebo pridajte novú s termínmi sviatkov).
2. Zmeňte cenu za noc alebo minimum nocí a uložte. Platí pre nové rezervácie, potvrdené ostávajú za pôvodnú cenu.

Tlačidlo: **Otvoriť Ceny a sezóny**

### Ako nechám deň voľna na upratovanie medzi hosťami?
1. Otvorte Objekt › Údaje a nastavte „Upratovacie dni medzi pobytmi“.
2. Toľko dní po každom odchode sa nebude dať rezervovať nový príchod.

Tlačidlo: **Otvoriť upratovacie dni**

## Hostia a správy

### Ako zapíšem rezerváciu, ktorú mi hosť dohodol telefonicky?
1. Kliknite vpravo hore na „Nová rezervácia“.
2. Vyberte termín a vyplňte hosťa. Systém skontroluje, či je termín voľný, a vypočíta cenu.
3. Hosť dostane potvrdenie e-mailom ako pri rezervácii z webu.

Tlačidlo: **Otvoriť Novú rezerváciu**

### Kedy hosť dostane pokyny k príchodu a kód od dverí?
1. Pokyny k príchodu odchádzajú samy e-mailom pred príchodom — predvolene 3 dni vopred; zmeníte to v Nastavenia › E-maily a upozornenia.
2. Kód od dverí a Wi-Fi vyplníte v Objekt › Údaje; hosť ich dostane v pokynoch a vidí ich aj vo svojom pobyte.

Tlačidlo: **Otvoriť nastavenie pokynov**

### Ako odpoviem hosťovi na správu? *(len s modulom Správy s hosťom)*
1. Nové správy uvidíte v Správy › Schránka (číslo pri položke menu) aj v paneli rezervácie na karte Správy.
2. Otvorte konverzáciu, napíšte odpoveď a odošlite. Hosť ju uvidí vo svojom pobyte a dostane ju aj e-mailom.

Tlačidlo: **Otvoriť Schránku**

### Kde nájdem údaje hostí z online check-inu? *(len s modulom Online check-in)*
1. Rezervácie › Príchody ukazuje, kto už check-in vyplnil a kto je pripravený na príchod.
2. Odtiaľ stiahnete tlačivo pre cudzincov a podklad k dani za ubytovanie. Údaje sa po lehote z Nastavení samy vymažú.

Tlačidlo: **Otvoriť Príchody**

## Nastavenia

### Čo je mesačný výpis a kto ho dostane?
1. Výpis zhrnie mesiac: tržby z priamych rezervácií, obsadenosť, úsporu na províziách a čo za vás systém urobil.
2. Príde vám e-mailom 1. dňa v mesiaci s PDF. Tlačidlom „Poslať účtovníkovi“ ho pošlete na e-mail účtovníka z Nastavení.
3. Je to podklad, nie účtovný doklad.

Tlačidlo: **Otvoriť Mesačný výpis**

### Ako pridám upratovačku alebo ďalšieho človeka?
1. V Nastavenia › Tím vidíte, kto má prístup a s akou rolou (Majiteľ, Recepcia, Upratovanie).
2. Nového člena tímu zatiaľ pridávame my — napíšte nám vpravo jeho e-mail a rolu a prístup mu nastavíme.

Tlačidlo: **Otvoriť Tím**

### Ako si zapnem upozornenia do mobilu?
1. Na iPhone najprv v Safari zvoľte Zdieľať › Pridať na plochu a administráciu otvorte z novej ikony.
2. V Nastavenia › E-maily a upozornenia zapnite upozornenia na tomto zariadení a vyberte, čo chcete dostávať.

Tlačidlo: **Otvoriť upozornenia**

### Omylom som niečo zmazal. Dá sa to vrátiť?
1. Áno, do 30 dní: otvorte Nastavenia › Všeobecné, dole odkaz Nedávno zmazané, a pri položke kliknite na Obnoviť.
2. Obnoviť sa dajú služby, sezóny, poplatky, zľavy, fotky, sekcie, dokumenty, blokácie, kalendáre a miesta v okolí. Rezervácie sa nemažú, len rušia.

Tlačidlo: **Otvoriť Nedávno zmazané**
