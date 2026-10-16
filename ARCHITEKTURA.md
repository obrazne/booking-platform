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
Základ administrácie z aplikácie Rental Van, vzor bočného panelu z Credit Managera (podľa analýzy v `docs/`).

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
- **Doklady** cez adaptér na fakturačný nástroj klienta (napr. SuperFaktúra API). Vystavený doklad sa nemení, oprava = dobropis.
  Klient bez nástroja dostane len potvrdenie platby.
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
- **Upozornenia Martinovi:** zlyhaná platba, iCal, e-mail, záloha.
- **Postup pri výpadku:** spísaný dokument (doplní sa).
- **Účty:** všetko na Obrazne s.r.o., dvojfaktorové overenie, heslá v správcovi hesiel. Platené plány pred prvým platiacim klientom.
- **Zmluvné a poistné:** dostupnosť, obmedzenie zodpovednosti, export pri odchode, spracúvanie údajov; poistenie zodpovednosti (preveriť).

---

# ČASŤ B — DOMÉNOVÉ POŽIADAVKY (z v1, na revíziu)

Požiadavky z architektúry v1 (`docs/archiv-wp/architektura-wp.md`) platia ako **zámer**: dátový model objekt → jednotka,
rezervácia ako hlavička + položky, konfiguračná matica objektu, dostupnosť a iCal, cenotvorba s vekovými pásmami a sezónami,
doplnkové služby s vlastnými poliami a dostupnosťou, rezervačný tok a stavy, komunikácia, zóna hosťa, legislatíva.

**Neplatí z v1:** všetko viazané na WordPress (WP administrácia, JetBooking, používateľská rola WordPressu, klonovanie webov podľa balíka).

Kapitoly sa revidujú v Claude chate po jednej a zapisujú sem ako B1, B2, … (ROADMAP Fáza 2).

---

# ČASŤ C — MVP: CHALET STRÖMY

- Objekt sa prenajíma **celý**, **cena za noc** nezávisle od počtu osôb (počet osôb sa zbiera vždy), sezóny s min. počtom nocí.
- Doplnkové služby: šéfkuchár / raňajky, transfer z letiska (prvý modul).
- Platba len prevodom s QR, 24 h držanie termínu (nastaviteľné), e-maily hosťovi a majiteľovi, iCal s Bookingom a Airbnb.
- Dátový model celý, rozhranie len pre tento prípad. Podklady: `docs/podklady/chalet-stromy-podklady.md`.
- *Presný rozsah a plán 4 týždňov — doplní sa po revízii časti B.*
