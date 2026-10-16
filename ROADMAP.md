# ROADMAP — Booking platform

*Kde sme a čo ostáva. Čo staviame → `ARCHITEKTURA.md`. Prečo → `ROZHODNUTIA.md`.*

**Legenda:** 🧠 = rozhoduje Martin s Claude (návrh, chat) · 🔧 = robí Claude Code (kód, súbory, Git)
☐ otvorené · ☑ hotové

## Aktuálne
- **Kde sme (16. 10.):** rozhodnutý prechod z WordPressu na vlastnú aplikáciu. Technické základy sú dohodnuté
  (`ARCHITEKTURA.md` časť A, `ROZHODNUTIA.md`). **Kód sa zatiaľ nepíše** — najprv analýza existujúcich aplikácií a architektúra v2.
- **Ďalší krok pre Claude Code:** Z1 — analýza Rental Van a Credit Managera (len čítanie).
- **Ďalší krok pre Martina:** naklonovať tento repozitár na počítač (mimo `~/Antigravity`), spustiť v ňom Claude Code a dať `/dalej`.
- **Claude chat:** pokračuje s Martinom v architektúre v2 (časť B po kapitolách).

## Zadanie pre Claude Code
*Sem píše Claude chat konkrétne pokyny. Môže tu byť **fronta viacerých úloh (Z1, Z2, …)** — `/dalej` vezme prvú neoznačenú,
po dokončení ju označí ✅ (text nechá) a ďalšiu začne až pri ďalšom `/dalej`. Keď sú všetky ✅, sekciu vyprázdni.*

### Z1 — Analýza Rental Van a Credit Managera (LEN ČÍTANIE)

**Cieľ:** zistiť, čo z dvoch existujúcich Martinových aplikácií prevezmeme do platformy, aby sa architektúra v2
písala s reálnou znalosťou kódu. **Nič nestav, nezakladaj kostru aplikácie, nič v tých aplikáciách nemeň.**

**1. Nájdi ich.** Aplikácie sa volajú *Rental Van* a *Credit Manager*. Martin nevie presne, kde sú:
- lokálne skús `~/Antigravity/Projekty` (Windows: `%USERPROFILE%\Antigravity\Projekty`),
- na GitHube môžu byť pod účtom `obrazne` alebo pod Martinovým druhým účtom. Pozri `gh auth status` a `gh repo list <účet>`
  pre všetky prihlásené účty; hľadaj názvy s *rental*, *van*, *credit*.
- Ak ich nenájdeš alebo nájdeš viac kandidátov, **opýtaj sa Martina**, nehádaj.
- Ak treba repozitár stiahnuť, naklonuj ho do dočasného priečinka mimo tohto repozitára. Lokálne kópie len čítaj.

**2. Čo zistiť pri každej aplikácii** (do jedného dokumentu, stručne, s cestami k súborom):
- **Stack a verzie:** framework (Next.js? App Router / Pages? alebo Vite/React?), jazyk (TypeScript?), UI knižnica a štýlovanie,
  formuláre a validácia, správa stavu, dátumové knižnice, ďalšie dôležité balíčky.
- **Štruktúra projektu:** priečinky, ako sú rozdelené stránky, komponenty, prístup k dátam.
- **Supabase:** prihlasovanie a roly, schéma a migrácie (sú v repozitári? ako sa spúšťajú?), použitie RLS, úložisko súborov,
  edge funkcie. **Názvy** premenných prostredia, nikdy hodnoty.
- **Administrácia (hlavne Rental Van):** rozloženie, navigácia, tabuľky a filtre, formuláre, detail záznamu, kalendár, oprávnenia.
- **Bočný panel (hlavne Credit Manager):** kde je implementovaný, ako funguje (URL, história, mobil), čo by sa dalo vziať ako komponent.
- **E-maily (hlavne Rental Van):** cez čo sa posielajú (SMTP? služba?), šablóny, odkiaľ sa spúšťajú.
- **Rezervácie a dostupnosť (Rental Van):** ako sa ukladá obsadenosť a ako sa bráni dvojitej rezervácii (kód aj databáza).
- **Nasadenie:** Vercel, vetvy, náhľady, cron úlohy.
- **Testy, preklady (i18n), kvalita kódu:** čo existuje, čo chýba, zjavný technický dlh.

**3. Odporúčanie** (dôležitejšie ako opis):
- Čo **prevziať** (konkrétne komponenty, nastavenia, vzory) a čo **nie** a prečo.
- Kde existujúci kód **nezodpovedá dohodnutej architektúre** (`ARCHITEKTURA.md` časť A): viac klientov a `tenant_id` s RLS,
  preklady, peniaze v centoch, moduly. Čo by sa muselo prerobiť.
- Návrh: začať z kópie Rental Van, alebo z čistého Next.js projektu a preniesť vybrané časti? S odôvodnením.

**Výstup:** `docs/analyza-existujucich-appiek.md`. Potom Denník, `Aktuálne`, commit a push. Do kódu tých aplikácií nič necommituj.

---

## Fáza 0 — Organizácia projektu
- [x] Repozitár `obrazne/booking-platform`, riadiace súbory, podklady prenesené z booking-demo (Claude chat, 16. 10.)
- [ ] Martin: lokálny priečinok (mimo `~/Antigravity`) a Claude Code v ňom 🧠

## Fáza 1 — Analýza existujúcich aplikácií 🔧
- [ ] Z1 — Rental Van a Credit Manager → `docs/analyza-existujucich-appiek.md`

## Fáza 2 — Architektúra v2 🧠
- [ ] Revízia doménových kapitol z v1 (časť B): dostupnosť a iCal, cenotvorba, doplnkové služby, rezervačný tok a stavy,
      platby, komunikácia, zóna hosťa a administrácia majiteľa, legislatíva
- [ ] Dátový model v2 (schéma tabuliek s `tenant_id`, členstvá, moduly)
- [ ] Katalóg modulov, napájacie miesta, priradenie do balíkov
- [ ] Riadiace centrum — obrazovky a údaje
- [ ] Prevádzka: výber transakčnej e-mailovej služby, úložisko pre nezávislú zálohu, upozornenia, postup pri výpadku
- [ ] Presný rozsah MVP pre Chalet STRÖMY a plán 4 týždňov (časť C)

## Fáza 3 — MVP Chalet STRÖMY 🔧 + 🧠 *(cca 4 týždne po uzavretí Fázy 2)*
- [ ] 3a Základ: projekt, databáza pre viac klientov, prihlásenie, objekt, cenník, sezóny, blokované dni
- [ ] 3b Rezervácia pre hostí: dostupnosť, výpočet ceny, služby, údaje hosťa, súhlasy (aj marketingový), dočasná blokácia, iCal
- [ ] 3c Platba prevodom s QR, stavy rezervácie, e-maily
- [ ] 3d Doklady cez fakturačný nástroj, prehľad rezervácií pre majiteľa, export, testovanie, spustenie popri Bookingu

## Fáza 4 — Po spustení 🔧 + 🧠
- [ ] Stripe (karta), záloha a doplatok
- [ ] Riadiace centrum v plnom rozsahu, skúšobné doby modulov
- [ ] Vkladací widget, ďalšie moduly podľa katalógu

## Otázky pre Martina
- V akom fakturačnom nástroji fakturuje Jana? (prvý adaptér na doklady)
- Ponúka tvoj hosting úložisko (S3 alebo SFTP) na nezávislú zálohu? A so zmluvou o spracúvaní údajov?
- Supabase platený plán: pri objednávke pozrieť limity a nastaviť strop výdavkov.

## Denník
*Najnovšie hore. Formát: `RRRR-MM-DD — čo sa spravilo (kto)`.*
- 2026-10-16 — Založený repozitár (Martin) a riadiace súbory (Claude chat): `ARCHITEKTURA.md` v2 časť A, `ROZHODNUTIA.md` zo 16. 10.,
  podklady z booking-demo v `docs/podklady`, `docs/biznis`, `docs/archiv-wp`. Zadanie Z1. (Claude chat)
