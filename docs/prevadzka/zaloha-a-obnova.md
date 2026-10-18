# Záloha a obnova stagingu (Z50)

Staging beží na bezplatnom pláne Supabase, ktorý **sám nezálohuje**. Zálohu robí GitHub Actions `Záloha stagingu`
(`.github/workflows/backup-staging.yml`) **každú noc o 1:00 UTC** (3:00 letného / 2:00 zimného času) a dá sa spustiť aj ručne.

## Čo záloha obsahuje a ako sa overuje

- **Databáza** (`supabase db dump`): `roles.sql` (vlastné roly), `schema.sql` (tabuľky, funkcie, pravidlá RLS), `data.sql`
  (všetky dáta vrátane používateľov `auth.users` a záznamov súborov `storage.objects`).
- **Súbory z úložiska** (fotky, dokumenty — všetky buckety) so zoznamom `storage/manifest.json` (cesta, veľkosť).
- **Overenie v tom istom behu:** výpis sa obnoví do čistej databázy Supabase priamo v behu a porovná sa **počet riadkov každej
  tabuľky** výpisu s obnovenou databázou a počet stiahnutých súborov so záznamami `storage.objects`. Ak čokoľvek nesedí, beh zlyhá.
- **Šifrovanie `age`** verejným kľúčom — v GitHube je len verejný kľúč, rozšifrovať vie iba ten, kto má súkromný (Martin).
  Výsledok je jeden súbor `staging-RRRR-MM-DD.tar.gz.age` ako artefakt behu, **uchováva sa 14 dní**. Nezašifrovaná kópia
  nikde neostáva (runner GitHubu sa po behu zmaže, súbory sa navyše zmažú v poslednom kroku).
- **Pri zlyhaní** pošle GitHub e-mail tomu, kto naposledy upravil plánovanie workflowu (commit súboru — Martin Olša,
  info@obrazne.sk). Stačí na staging; pre produkciu (3f) bude monitoring zvlášť.
- **Samotest:** Actions → Záloha stagingu → Run workflow → `selftest` — rovnaký postup na lokálnej databáze z migrácií,
  bez tajných hodnôt a bez nahrávania. Overuje, že výpis sa dá obnoviť.

## Jednorazové nastavenie (Martin, na svojom počítači)

Hodnoty **nikomu neposielaj a nikam nevkladaj okrem GitHubu** (ani do chatu s Claude).

1. **Nainštaluj `age`:** PowerShell → `winget install FiloSottile.age` (potom zatvor a znova otvor PowerShell).
2. **Vytvor kľúč:** `age-keygen -o $HOME\booking-zaloha.key`
   - Vypíše riadok `Public key: age1…` — to je **verejný kľúč** (môže byť v GitHube).
   - Súbor `booking-zaloha.key` je **súkromný kľúč** — bez neho sa záloha nedá rozšifrovať. Odlož ho do správcu hesiel
     (napr. ako bezpečnú poznámku) a ešte na jedno miesto mimo počítača (USB). Do repozitára ani do cloudu nešifrovane nie.
3. **GitHub → repozitár `obrazne/booking-platform` → Settings → Secrets and variables → Actions → New repository secret** — tri hodnoty:
   - `BACKUP_AGE_PUBLIC_KEY` = riadok `age1…` z bodu 2 (len kľúč, bez „Public key:“).
   - `STAGING_DB_URL` = Supabase → projekt `booking-platform-staging` → **Connect** → **Session pooler** → URI
     (`postgresql://postgres.uzsuwokyiprkzfirvrmb:[HESLO]@aws-…pooler.supabase.com:5432/postgres`) — za `[HESLO]` doplň heslo databázy
     (Project Settings → Database; ak ho nepoznáš, tam sa dá nastaviť nové). Session pooler je nutný — GitHub nevie IPv6 priamej adresy.
   - `STAGING_SERVICE_ROLE_KEY` = Supabase → Project Settings → API Keys → **secret** kľúč (ten istý ako `SUPABASE_SECRET_KEY` v `.env.local`).
4. **Skúška:** Actions → Záloha stagingu → Run workflow (`staging`). Po ~5 minútach má beh zelenú fajku a artefakt `staging-…tar.gz.age`.

## Obnova

1. **Stiahni zálohu:** GitHub → Actions → Záloha stagingu → beh z požadovaného dňa → Artifacts → `staging-RRRR-MM-DD.tar.gz.age`
   (príde ako ZIP — rozbaľ ho).
2. **Rozšifruj a rozbaľ** (PowerShell, v priečinku so súborom):
   `age -d -i $HOME\booking-zaloha.key -o zaloha.tar.gz staging-RRRR-MM-DD.tar.gz.age` a potom `tar -xzf zaloha.tar.gz`
   → priečinok `backup` s `db\roles.sql`, `db\schema.sql`, `db\data.sql` a `storage\…`.
3. **Databáza** — do **nového** projektu Supabase (ten istý región Frankfurt) alebo do vyčisteného stagingu. Pripojenie = Session
   pooler URI cieľového projektu (`$URL`). S nainštalovaným `psql` (PostgreSQL 17):
   ```
   psql $URL -v ON_ERROR_STOP=1 --single-transaction -f backup/db/roles.sql -f backup/db/schema.sql -c "SET session_replication_role = replica" -f backup/db/data.sql
   ```
   Ak `roles.sql` hlási *permission denied for parameter …* (nastavenie roly smie len superpoužívateľ), spusti príkaz bez
   `-f backup/db/roles.sql` — vlastné roly projekt nemá, dáta sa obnovia rovnako (samotest v GitHube obnovuje pod `supabase_admin`).
   Obnova do **stagingu** = najprv v Supabase vymazať existujúce dáta (najjednoduchšie: obnoviť do nového projektu a v aplikácii
   prepnúť `NEXT_PUBLIC_SUPABASE_URL` a kľúče v `.env.local` a vo Verceli) — prepisovanie bežiaceho stagingu robí Claude Code s tebou.
4. **Súbory:** nahrať späť do rovnakých bucketov a ciest (zoznam `backup/storage/manifest.json`) — Claude Code na to použije skript
   s kľúčom cieľového projektu; buckety vzniknú z migrácií (`schema.sql`).
5. **Overenie po obnove:** prihlásenie do administrácie, STRÖMY — fotky, cenník, iCal kanál; počty rezervácií v Prehľade.

## Stav záloh v riadiacom centre (Z52)

Riadiace centrum → **Stav systému → Zálohy**: posledná záloha (čas, veľkosť, počet overených tabuliek a súborov, odkaz na beh),
posledná úspešná (keď posledná zlyhala), história a **skúšobná obnova**. Workflow zapisuje výsledok sám (aj pri zlyhaní) do
tabuľky `platform_backups`. Keď 36 hodín neprebehla úspešná záloha, príde správcovi platformy upozornenie do zvončeka
(a push, ak ho má zapnutý). Skúšobnú obnovu zapíše správca tlačidlom **Zaznamenať skúšobnú obnovu** — aspoň raz za štvrťrok
(prvá: 18. 10. 2026 — rozšifrovanie Martinovým kľúčom a kontrola obsahu).

## Obnova jedného klienta alebo vybraných záznamov (Z52)

Keď sa u **jedného klienta** niečo pokazilo alebo zmazalo a Kôš (Nastavenia → Nedávno zmazané, 30 dní) ani **Záznam zmien**
v riadiacom centre nepomôžu. Skript `scripts/restore-tenant.mjs` vezme dáta klienta zo zálohy, ukáže **plán** (koľko riadkov
pridať / zmeniť / zmazať v každej tabuľke, len ich kľúče) a zapíše **až po potvrdení** — v jednej transakcii, bez e-mailov
a upozornení (triggery sú pri zápise vypnuté), zapíše sa do auditu (`tenant.restored`). Iných klientov sa nedotkne.

1. Martin stiahne a rozšifruje zálohu z požadovaného dňa (kroky 1–2 v *Obnova* vyššie) → priečinok `backup`.
2. **Najprv plán** (nič nezapíše):
   ```
   node --env-file=.env.local scripts/restore-tenant.mjs --dump backup/db/data.sql --tenant <UUID klienta> --ids <uuid,uuid>
   ```
   - **`--ids` (odporúčané):** len vybrané záznamy — riadky, ktorých `id` alebo `reservation_id` je v zozname. Napr. UUID
     zmazanej rezervácie vráti rezerváciu aj s položkami, cenami, platbou a obsadenosťou. **Nič iné u klienta sa nezmení.**
   - **Bez `--ids`:** celý klient sa vráti do stavu zálohy — **všetko, čo sa u neho odvtedy zmenilo, sa stratí** (nové
     rezervácie, správy, platby…). Len pri vážnom poškodení a po dohode s klientom.
   - `--storage backup/storage` (len celý klient): doplní súbory klienta (fotky, dokumenty), ktoré v úložisku chýbajú.
3. **Zápis:** ten istý príkaz s `--apply` — skript sa opýta na **slug klienta** (napr. `ukazka`) ako potvrdenie.
4. Plán znova (bez `--apply`) — má vypísať „Žiadny rozdiel“. Potom priečinok `backup` zmazať.

Kľúč v `.env.local` určuje, do ktorej databázy sa zapisuje (staging). UUID klienta: riadiace centrum → detail klienta (adresa
stránky). UUID záznamu: z histórie zmien alebo z auditu.

**Skúška** (Ukážkový klient, nikdy STRÖMY): GitHub → Actions → **Skúška obnovy klienta** → Run workflow. Vytvorí vlastné
záznamy, urobí výpis stagingu, záznamy zmaže a zmení, obnoví ich cez `--ids`, overí a uprace. Prvá skúška 18. 10. 2026 prešla.
*Poučenie z nej:* obnova **celého** klienta vrátila aj dáta testov, ktoré bežali v tej istej minúte — preto `--ids`.

## Export dát klienta (Z52, A8)

Riadiace centrum → detail klienta → **Export dát (ZIP)**. Obsah: rezervácie, hostia, platby, objednávky, správy, recenzie,
check-in (číslo dokladu, dátum narodenia a adresa osôb **maskované**), dokumenty aj so súbormi, ponuka a nastavenia — každá
tabuľka ako `.json` a `.csv` (oddeľovač `;`, otvorí Excel), `README.txt` s počtami. Každý export sa zapíše do auditu
(„Export dát klienta“). Súbor obsahuje osobné údaje hostí — posielať len klientovi, bezpečne, a potom zmazať.

## Pre produkciu (3f, A9)

Artefakty GitHubu sú dočasné riešenie pre staging. Produkcia: úložisko v EÚ (napr. bucket s retenciou a zámkom), dlhšia
história, monitoring behu a pravidelná skúška obnovy — workflow sa len prepne na iné úložisko v kroku nahrania.
