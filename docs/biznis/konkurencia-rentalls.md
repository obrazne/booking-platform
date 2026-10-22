# Konkurencia: Rentalls (rentalls.com/sk) — prieskum 22. 10. 2026

Slovenský systém pre ubytovateľov (správcovské firmy, apartmány, aparthotely, penzióny, chaty, glamping). Zdroj: ich web
(úvod, cenník, channel manager, upratovanie, automatické správy, segmenty, e-shop). Ide o marketingové tvrdenia, nie overené v praxi.

## Cena
- **Jeden plán „všetko v cene“:** 35 € mesačne za prvú jednotku + 14 € za každú ďalšiu (bez DPH), ročne −20 % (od 28 €).
- **Bez provízie, bez zriaďovacieho poplatku**, 14 dní zadarmo, registrácia sama (self-service).
- E-shop: inteligentné zámky TT Lock (cylinder 159 €, kľučka s klávesnicou 199 €).

## Čo ponúkajú
| Oblasť | Rentalls | My (booking-platform) |
|---|---|---|
| Prepojenie Booking/Airbnb | **channel manager** — ceny, dostupnosť, min. nocí, import rezervácií s údajmi hosťa a províziou, prirážka na kanál, 500 dní dopredu | iCal — len obsadené dni, s oneskorením |
| Jednotná schránka | správy z Airbnb aj Bookingu na jednom mieste, odpoveď odtiaľ, preklad jedným klikom, rýchle odpovede | správy len s priamymi hosťami (modul Správy) |
| Automatické správy | e-mail, SMS (BulkGate), chat Airbnb/Booking; 13 udalostí, 13 podmienok (napr. „check-in nedokončený“), 40+ premenných, jazykové verzie, náhľad, záznam a opakovanie | e-mail, udalosti a premenné; bez SMS, bez podmienok, bez jazykových verzií |
| Inteligentné zámky | Nuki, TTLock, Igloohome — kód pre každú rezerváciu automaticky, uvoľní sa po check-ine | kód dverí ručne v objekte |
| Upratovanie | úloha sama z odchodu, aplikácia pre upratovačku (push, kontrolný zoznam, povinné fotky, časovač, chat s prekladom), záznam ako dôkaz pri škode, výplaty z prehľadu | nie (len plánovaná rola „upratovanie“) |
| Online check-in, aplikácia hosťa | áno, s dokladmi a zálohou | áno (modul check-in, účet hosťa) |
| Kaucia | automatická blokácia a vrátenie cez Stripe | nie (po Stripe) |
| Doobjednávky, recenzie | áno; recenzie z portálov sa sťahujú | áno (upsell, recenzie z priamych pobytov) |
| Faktúry | automatické vystavovanie | podklad na doklad, prepojenie s nástrojom klienta |
| Ďalšie | Gantt kalendár viac jednotiek, PriceLabs (dynamické ceny), Ecomail, Finstat, OpenAI, REST API a webhooky, neobmedzení používatelia, 12+ jazykov, mobilné aplikácie | mesačný výpis s ušetrenou províziou a rozpočtom na marketing, rezervačná stránka v dizajne klienta, nastavenie na kľúč |

## Čo z toho plynie pre nás
- **Rentalls je pre OTA:** zjednodušuje predaj cez Booking/Airbnb (channel manager je jadro). **My sme proti OTA:** vlastná značka,
  priame rezervácie, úspora provízií. Iný príbeh, ale klient ich bude porovnávať.
- **Cena:** 35 € mesačne bez provízie vs. naše 150 € + 2 %. Rozdiel musíme vedieť obhájiť: nastavenie na kľúč, rezervačná stránka
  v jeho dizajne, mesačný výpis, osobná starostlivosť, prémiový segment. Ak to nebude zrejmé, náš cenník bude pôsobiť drahý.
- **Najväčšia diera oproti nim:** channel manager (ceny a správy z portálov). Cez iCal sa nedá; riešiť by sa to dalo cez
  poskytovateľa channel managera s API (preveriť napr. Channex), nie vlastnou certifikáciou u Bookingu.

## Kandidáti, ktorých sa oplatí prevziať (na rozhodnutie Martina)
1. **Inteligentné zámky** (Nuki, TTLock): kód pre každú rezerváciu, platný len počas pobytu — pre chalety silný argument (bez odovzdávania kľúčov).
2. **Modul Upratovanie:** úloha z odchodu, jednoduchá stránka pre upratovačku (bez prístupu k cenám a hosťom), kontrolný zoznam, fotky ako dôkaz.
3. **Správy lepšie:** podmienky pred odoslaním, jazykové verzie šablón, preklad jedným klikom, SMS pre kód od dverí (napr. BulkGate — slovenský).
4. **Prepojenie s newsletterom** (Ecomail/Mailchimp): hostia so súhlasom → marketing (zapadá do filozofie „úspora → vlastný marketing“).
5. **Kaucia cez Stripe** (po zapojení kariet).
6. **Channel manager cez partnera + jednotná schránka:** veľký krok, rozhodnúť strategicky (proti filozofii odchodu z OTA, ale klienti
   v prechodnom období ho potrebujú).
