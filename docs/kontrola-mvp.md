# Kontrola MVP pred ukážkou (Z16, 16. 10. 2026)

Cieľ: Jana uvidí stránku bez chýb. Kontrolovalo sa na stagingu (databáza `booking-platform-staging`, aplikácia lokálne
v produkčnom režime proti nej). Nič sa neposielalo mimo staging.

## 1. Automatické testy prehliadačom (Playwright)

Spustenie: `npm run build && npm start -- -p 3100` a v druhom okne `npm run e2e` (pravidlá v `CLAUDE.md`).
Testy si vytvoria vlastné dáta (e-maily na doméne `booking-platform.test`, na ktorú sa nič neodosiela) a po behu ich zmažú.

| Test | Počítač | Mobil 390 px |
|---|---|---|
| Hosť na STRÖMY: termín v kalendári → košík 3 kroky → služba (raňajky) → súhlasy (marketing nezaškrtnutý) → odoslanie → stránka rezervácie s platobnými údajmi, IBAN, VS a QR → odkaz funguje aj bez prihlásenia → žiadosť o storno | ✅ | ✅ |
| Žiadne vodorovné rolovanie | ✅ | ✅ |
| Kalendár klávesnicou (Tab + Enter, popis dňa pre čítačku) | ✅ | — |
| Majiteľ: ručná rezervácia „čaká na platbu“ → **Platba prijatá** → Potvrdená; blokácia; udalosť z iCal v kolízii → uložená ako neblokujúci konflikt, v administrácii „Kolízia“, rezervácia nedotknutá | ✅ | — |
| Prístupnosť (axe, WCAG 2.1 AA) detailu a košíka | ✅ bez nálezov | — |

Do CI zatiaľ nie sú — potrebujú server so stagingom a tajný kľúč; dá sa to doplniť bez platených služieb, keď bude
staging bez ochrany Vercelu (otázka pre Martina).

## 2. Bezpečnosť (nezávislá kontrola samostatným agentom, ktorý kód nepísal)

Základ v poriadku: RLS na všetkých tabuľkách, funkcie `SECURITY DEFINER` s prázdnym `search_path` a kontrolou práv, rezerváciu
vytvára len server (cenu prepočíta sám), token hosťa uložený len ako hash, žiadne tajomstvá v kóde pre prehliadač, e-maily
escapované, CSV chránené proti vzorcom, worker s porovnaním tajomstva v konštantnom čase.

**Opravené hneď** (migrácia `20261016270000_security_hardening.sql` + 9 pgTAP testov, kód):
- **Vážne:** prihlásený hosť si mohol vo svojom zázname zmeniť e-mail (aj klienta) a tak „prevziať“ budúce rezervácie iného e-mailu
  vrátane prístupových kódov → hosť smie meniť len meno, telefón, krajinu a marketingový súhlas.
- **Vážne:** dočasnou blokáciou termínu (hold) sa dalo jedným požiadavkom zablokovať celý kalendár → hold aj online rezervácia
  max. 30 nocí, nie do minulosti, len publikovaný objekt a aktívna jednotka, najviac 3 otvorené holdy na jednotku (aj v databáze).
- Ochrana formulára proti robotom: čas vyplnenia už neposiela prehliadač, ale server ho podpíše (HMAC) pri otvorení kroku 3.
- iCal import: pred každým stiahnutím sa overí, že adresa vedie na verejnú IP (aj po presmerovaní, presmerovania ručne),
  sťahuje sa po kúskoch s limitom 2 MB; v databáze len `https://`.
- Neplatné časové pásmo klienta by zastavilo plánované e-maily všetkým klientom → kontrola pri zápise.
- Používateľ už nemôže zmeniť e-mail v profile (seed hľadal správcu platformy podľa neho → teraz podľa prihlasovacieho účtu).
- Tajný token iCal exportu už nie je čitateľný pre anonymného návštevníka.
- Presmerovanie po prihlásení len na cestu v rámci aplikácie (`/\evil.com` a pod. odmietnuté).
- HTTP hlavičky: `nosniff`, `Referrer-Policy`, `Permissions-Policy`; administrácia, riadiace centrum a prihlásenie sa nedajú
  vložiť do rámu (`frame-ancestors 'none'`); stránka rezervácie neposiela odkaz s tokenom ďalej (`no-referrer`).
  Stránka hosťa sa do rámu vložiť dá — pri vkladacom widgete dostane zoznam povolených domén klienta.

**Ostáva (nie je to blokujúce pre ukážku):**
- **Obmedzenie počtu požiadaviek a captcha** na formulári hosťa a promo kódoch (proti zahlteniu a zneužitiu e-mailov) —
  Cloudflare Turnstile (zadarmo) + jednoduchý limit podľa IP — Martin súhlasí, čaká sa na jeho účet Cloudflare a kľúče.
- Pred spustením zóny hosťa (Z17) overiť nastavenie prihlásenia na Supabase stagingu/produkcii: registrácia vypnutá alebo
  povinné potvrdenie e-mailu (inak by si niekto mohol založiť účet s cudzím e-mailom). Z17 to rieši kódom na e-mail.
- Hosť cez API vidí aj interné stĺpce svojej rezervácie (šifrovaný token, dôvod zrušenia) — pri Z17 obmedziť stĺpce.
- Zápis do auditu smie volať každý člen klienta (aj upratovanie) — obmedziť na role, ktoré akciu naozaj robia.
- Kontroly „rovnaký klient“ pri väzbách (poznámka k rezervácii, zľava/služba k objektu, fotka k jednotke) — dnes bez úniku,
  lebo dotazy filtrujú klienta; doplniť triggre.
- Plná politika CSP (skripty, štýly) — po ustálení tretích strán (analytika, mapa).

## 3. Prístupnosť a mobil

- Kalendár: každý deň má popis pre čítačku („sobota 28. 8. 2027, 700 € / noc“, alebo „Obsadené“), ovládanie klávesnicou overené.
- Galéria: fotky majú popis (alt) aj na tlačidlách; QR kód má popis.
- Kontrast: druhá veta nadpisov (svetlosivá) mala 2,8 : 1 → stmavená na `#84888e` (3,4 : 1, norma pre veľké písmo je 3 : 1).
  Na stránke je o odtieň tmavšia, než bola v návrhu.
- 390 px: bez vodorovného rolovania (test), tlačidlá min. 44 px (pruh, panel, výzvy).

## 4. Rýchlosť

- Fotky išli v plnej veľkosti JPEG (~250 kB každá, galéria 5 kusov naraz) → teraz cez `next/image`: AVIF/WebP, veľkosť podľa
  obrazovky, prvá fotka prednostne, ostatné neskôr. Na Hobby pláne Vercelu v rámci bezplatného limitu úprav obrázkov.
- Meranie detailu STRÖMY na mobile so spomalenou sieťou a CPU (`node scripts/perf-check.mjs`): **LCP 2,4 s**, 596 kB, 29 požiadaviek
  (lokálny server proti databáze vo Frankfurte; na Verceli bude odozva servera kratšia). Lighthouse sa na Martinovom PC nespustí
  (chyba pri spúšťaní Chromu), meranie je ekvivalentné.
- Dotazy: detail robí ~8 dotazov do databázy, časť paralelne a s `cache` v rámci požiadavky. Drobnosť: kontakt klienta a zapnuté
  moduly sa čítajú dvakrát (rozloženie + detail) — zlúčiť pri ďalšej úprave, na rýchlosť to vplyv takmer nemá.

## Otázky pre Martina z kontroly
- Captcha: Martin súhlasí s Cloudflare Turnstile (16. 10.), dorobí sa po založení účtu Cloudflare.
- Testy prehliadačom v CI: ak vypneš ochranu Vercelu na stagingu, môžu bežať pri každom pushi.

## Doplnok — stránka hosťa v2 (Z19)

Overené Playwrightom lokálne proti stagingu (`npm run e2e`), 9/9:

| Test | Počítač | Mobil 390 px |
|---|---|---|
| Rezervácia STRÖMY v košíku v2: termín → doplnky už v kroku 1 (rozbaľovacie riadky) → údaje → súhlasy → QR | ✅ | ✅ (košík cez celú obrazovku, zelený pás, rozpis zospodu) |
| Galéria v okne: albumy, veľká fotka, Esc vráti na mriežku, „Späť“ v prehliadači zatvorí okno | ✅ | — |
| Príchod/Odchod v zelenom paneli otvorí košík s kalendárom — stránka sa neposunie | ✅ | — |
| Najbližší voľný termín (počíta server z obsadenosti, min. nocí a cien) otvorí košík s týmto termínom | ✅ | — |
| Prístupnosť (axe, WCAG 2.1 AA) detailu aj košíka | ✅ bez nálezov | ✅ bez nálezov |
| Zóna hosťa, administrácia, sekcie v administrácii (regresia) | ✅ | — |

Úpravy kvôli prístupnosti oproti plátnu: drobné texty na zelenej ploche sú takmer biele (nie 70 % priehľadnosti),
mená pri referenciách na zelenej ploche svetlejšia medená (`#ffe0c8`); vodorovne posúvateľné referencie na mobile sú ovládateľné klávesnicou.

Rýchlosť detailu na mobile (spomalená sieť a CPU): LCP ~3 s, ~1 MB, ~40 požiadaviek — pribudli mapové dlaždice OpenStreetMap
(malá mapa 9, veľká 15, načítajú sa až pri posune) a viac údajov (referencie, okolie). Server na Verceli je bližšie k databáze ako
lokálny počítač, takže odozva bude kratšia; ďalšie zrýchlenie: spojiť dotazy detailu do jednej funkcie v databáze.

**Mapa:** dlaždice priamo z `tile.openstreetmap.org` — bez kľúča a cookies, s uvedením zdroja. Pravidlá OSM dovoľujú mierne používanie;
pri ostrej prevádzke s väčšou návštevnosťou treba poskytovateľa dlaždíc (napr. MapTiler/Stadia, majú bezplatné limity) — otázka pre Martina.
**Poloha:** pri „približnej“ polohe hosť nevidí ulicu ani presné súradnice ani cez API (stĺpce sú pre návštevníka skryté, poloha ide
cez funkciu, ktorá ju zaokrúhli na ~1 km).
