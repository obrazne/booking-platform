# Postup pri výpadku (Z52, 3f)

Krátky postup, čo robiť, keď niečo nefunguje. Platí pre staging; pre produkciu sa doplnia kontakty a adresy (3f).
Pri každom výpadku: **najprv zisti, čo nejde** (tabuľka nižšie), **potom oprav**, **nakoniec zapíš** do Denníka v `ROADMAP.md`
(čo, odkedy, príčina, čo sa spravilo). Claude Code vie pomôcť s každým krokom okrem prihlásení (tie robí Martin).

## Ako aplikácia beží (čo od čoho závisí)

| Časť | Kde | Čo robí | Keď nejde |
|---|---|---|---|
| Web a administrácia | **Vercel** (projekt `booking-platform`, región Frankfurt) | stránky hostí, administrácia, riadiace centrum | hostia nevidia stránku / chyba 500 |
| Databáza, prihlásenia, súbory | **Supabase** (`booking-platform-staging`, Frankfurt) | dáta, RLS, prihlásenie kódom, fotky a dokumenty | všetko padá, prihlásenie nejde |
| Plánovač | **pg_cron v Supabase** | každú minútu volá `/api/jobs/run` (e-maily, iCal, push), rušenie nezaplatených, automatické správy, upsell, recenzie, kontrola záloh | e-maily nechodia, kalendáre sa nesynchronizujú |
| E-maily | **Resend** (`RESEND_API_KEY`) | potvrdenia, pokyny, správy, upozornenia | e-maily sa hromadia vo fronte (`email_outbox`) |
| Kalendáre | iCal odkazy Bookingu / Airbnb | obsadenosť z portálov každých ~15 min | riadok synchronizácie „chyba“ v Prehľade |
| Zálohy | **GitHub Actions** „Záloha stagingu“ | každú noc 1:00 UTC | Stav systému → Zálohy: upozornenie po 36 h |

## 1. Web nejde (Vercel)

1. **Je to len u nás?** Otvor stránku z mobilu na mobilných dátach. Pozri [vercel-status.com](https://www.vercel-status.com).
2. **Posledné nasadenie:** Vercel → projekt → **Deployments**. Ak výpadok začal po novom nasadení:
   - **Vrátenie verzie (najrýchlejšie, ~1 min):** pri poslednom fungujúcom nasadení → **⋯ → Instant Rollback** (alebo
     *Promote to Production*). Kód v gite sa nemení — potom Claude Code chybu opraví a nasadí znova.
3. **Chyba 500 na niektorých stránkach:** Vercel → Deployment → **Logs** (filter *Error*) — pošli Claude Code text chyby.
4. **Premenné prostredia** (po zmene kľúčov): Vercel → Settings → Environment Variables — chýbajúca premenná = 500 pri štarte.
   Po zmene treba **Redeploy**.
5. Výpadok Vercelu samotného: počkať; dáta sú v Supabase, nič sa nestratí. Rezervácie počas výpadku nevznikajú.

## 2. Databáza / prihlásenie nejde (Supabase)

1. [status.supabase.com](https://status.supabase.com) a Supabase → projekt → **Home** (či projekt beží).
2. **Projekt pozastavený** (bezplatný plán sa po týždni bez aktivity uspí): Supabase → projekt → **Restore project**.
   Trvá pár minút, dáta ostanú. *(Na produkcii platený plán — neuspáva sa.)*
3. **Limity bezplatného plánu** (databáza 500 MB, súbory 1 GB, prenos): Supabase → **Usage**. Pri prekročení zápis stojí.
4. **Pomalé alebo chyby „timeout“:** Supabase → **Reports** a **Logs** (Postgres) — pošli Claude Code.
5. **Dáta poškodené alebo zmazané omylom:**
   - jedna vec u klienta → **Kôš** (Nastavenia → Nedávno zmazané, 30 dní) alebo **Záznam zmien** v riadiacom centre → „Vrátiť túto zmenu“;
   - viac záznamov → **obnova vybraných záznamov zo zálohy** (`zaloha-a-obnova.md` → *Obnova jedného klienta*);
   - celá databáza → **obnova zálohy** (`zaloha-a-obnova.md` → *Obnova*).

## 3. E-maily nechodia (Resend)

1. Riadiace centrum → **Stav systému**: pri klientovi „neodoslané e-maily“; zvonček správcu „E-maily klienta zlyhali“.
2. [resend-status.com](https://resend-status.com) a Resend → **Emails / Logs** (dôvod: zlý príjemca, doména, limit).
3. **Limit bezplatného plánu** (100 e-mailov denne / 3 000 mesačne) → Resend → Usage.
4. Doména odosielateľa (DNS záznamy SPF/DKIM) → Resend → **Domains** musí byť *Verified*.
5. Po oprave sa nezlyhané e-maily z fronty pošlú samé pri ďalšom behu (každú minútu); zlyhané pošle Claude Code znova.
6. Staging posiela všetko na `EMAIL_REDIRECT_TO` (Martin) — hostia nedostanú nič.

## 4. Kalendáre sa nesynchronizujú (iCal)

1. Administrácia klienta → Prehľad / Prepojenia: riadok kalendára s chybou a jej textom.
2. **Chyba 404 / 403:** portál zmenil odkaz → v Bookingu / Airbnb skopírovať nový iCal odkaz a vložiť do Prepojení.
3. **Výpadok portálu:** počkať, synchronizácia sa sama obnoví; dovtedy **ručná blokácia** termínov, ktoré prišli e-mailom z portálu.
4. **Kolízie** (rovnaký termín u nás aj na portáli): Rezervácie → Kolízie — postup v paneli kolízie.
5. **Plánovač nebeží** (nič sa nesynchronizuje ani neodosiela): Supabase → Integrations → **Cron** → beh `job-worker`
   (história behov); často je príčina vo Verceli (bod 1) alebo v tajnej hodnote `cron_secret` / `app_url` vo Vault.

## 5. Zálohy

Stav systému → **Zálohy**: posledná záloha, posledná úspešná, skúšobná obnova. Upozornenie v zvončeku po 36 h bez úspešnej
zálohy. Príčinu ukáže beh v GitHube (odkaz „Beh v GitHube ↗“). Najčastejšie: zmenené heslo databázy → nastaviť
`STAGING_DB_URL` znova (`zaloha-a-obnova.md`).

## Komu písať

| Kto | Kedy | Ako |
|---|---|---|
| **Claude Code** | vždy prvý krok — diagnostika, oprava kódu, obnova dát | nová úloha alebo `/dalej` s popisom |
| **Klient (Jana)** | výpadok dlhší ako ~30 min počas sezóny | telefonicky; hostia z portálov sa nedotknú, priame rezervácie počkajú |
| Podpora Vercelu | výpadok na ich strane, ktorý status nehlási | vercel.com/help (bezplatný plán: komunita) |
| Podpora Supabase | projekt sa nedá obnoviť / dáta nedostupné | supabase.com/dashboard/support |
| Podpora Resendu | doména zablokovaná, e-maily odmietané | resend.com/help |

## Po výpadku

1. Overiť: stránka hosťa, prihlásenie do administrácie, testová rezervácia na **Ukážkovom klientovi**, Stav systému bez upozornení.
2. Pozrieť frontu e-mailov (Stav systému) a synchronizáciu kalendárov.
3. Zapísať do Denníka v `ROADMAP.md`.
