# Kalendár s cenami na webe klienta (widget, Z83)

Kalendár s cenami a obsadenosťou jedného ubytovania na vlastnom webe klienta (WordPress, Elementor). Hosť vyberie termín a hostí,
vidí cenu a tlačidlom **„Pokračovať na rezerváciu“** prejde v celom okne na detail ubytovania na rezervačnej doméne klienta
s vybraným termínom a otvoreným košíkom. Platba a celý tok rezervácie ostávajú v aplikácii (A17).

## Vloženie (klient alebo my)

1. **Povoliť web:** administrácia → Nastavenia → Prepojenia → „Kalendár s cenami na vašom webe“ → „Weby, kde môže byť kalendár“,
   jeden na riadok (`chaletstromy.sk`). Verzia s `www.` je povolená automaticky. Bez toho prehliadač kalendár v rámčeku nezobrazí.
2. **Skopírovať kód** pri ubytovaní (tlačidlo Kopírovať), napr.:

   ```html
   <div data-booking-widget="kalendar" data-objekt="chalet-stromy"></div><script src="https://rezervacia.chaletstromy.sk/widget.js" async></script>
   ```

3. **Elementor:** upraviť stránku → pridať widget **HTML** → vložiť kód → Aktualizovať. Bez Elementoru: blok **Vlastné HTML**
   v editore WordPressu.

Nepovinné atribúty na `div`:

| Atribút | Význam |
|---|---|
| `data-pozadie="priehladne"` | pozadie stránky klienta presvitá (inak biele) |
| `data-rezim="info"` | len na ukážku: kalendár s cenami a legendou, bez výberu termínu, hostí a tlačidla (STRÖMY zatiaľ — hostia potom píšu Jane) |
| `data-jednotka="<id jednotky>"` | pri ubytovaní s jednotkami iná než prvá jednotka |
| `data-titulok="…"` | názov rámčeka pre čítačky obrazovky |

## Ako to funguje

- `/widget.js` (malý skript bez závislostí) vytvorí rámček s `/embed/kalendar?objekt=…`, až keď sa miesto blíži k obrazovke,
  a nastavuje mu výšku podľa správ len z tohto rámčeka (overený pôvod aj zdroj).
- `/embed/*` je jediná časť aplikácie, ktorú možno vložiť do rámčeka: proxy pošle `Content-Security-Policy: frame-ancestors 'self'
  <povolené weby>` (`tenant_settings.widget_sites`). Všetky ostatné stránky majú `X-Frame-Options: DENY` (`next.config.ts`).
- Bez prihlásenia a bez cookies; ceny a obsadenosť z cache s platnosťou 1 minúta (rezervácia overuje dostupnosť znova).
- Vzhľad (farby, písmo) z témy klienta.
- Zobrazenia a kliky na „Pokračovať“ sa počítajú po dňoch (`widget_stats`, len počty) — prehľad za 30 dní je v Prepojeniach.
  Odchod na rezerváciu má `utm_source=web-klienta&utm_medium=widget`.

## Keď sa kalendár nezobrazí

- Prázdny rámček alebo hláška prehliadača o odmietnutom pripojení → web nie je v zozname povolených (presná doména, aj `http`/`https`).
- „Kalendár sa nepodarilo načítať“ → nesprávny `data-objekt` (adresa ubytovania) alebo ubytovanie nie je zverejnené.
- Vyhľadávací pás (len dátumy a hostia) ako druhý druh widgetu príde neskôr.
