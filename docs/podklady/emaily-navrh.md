# E-maily hosťovi a majiteľovi — návrh v1

*Claude chat, 2026-10-14. Návrh: plátno, riadok „E-maily hosťovi a majiteľovi“ (E1–E7), kópia v `design/navrh-v1/Email*.dc.html`.
Stav: **schválené Martinom 14. 10.** Vychádza z `ARCHITEKTURA.md` kap. 8 (stavy) a 10 (komunikácia).*

Návrh je zámer, nie doslovná predloha (`CLAUDE.md` → *Ozvi sa skôr*). E-maily musia fungovať aj v Gmaile a Outlooku:
šírka 600 px, písmo Hanken Grotesk s náhradou Helvetica/Arial, bez mono písma, tlačidlá ako odkazy.

## Ktorý e-mail, kedy a čím

| # | E-mail | Kedy | Čím sa posiela (predpoklad — overiť) |
|---|---|---|---|
| E1 | Rezervácia prijatá, výzva na úhradu (IBAN, VS, splatnosť, QR, súhrn, storno) | po objednávke prevodom | WooCommerce *Objednávka čaká* (on-hold) + pokyny prevodu; QR plugin Pay by Square |
| E2 | Platba prijatá, pobyt potvrdený (ďalšie kroky) | majiteľ označí platbu | WooCommerce *Objednávka sa spracováva* (processing) |
| E3 | Pokyny k príchodu (kód, Wi-Fi, parkovanie, adresa, Navigovať) | 2 dni pred príchodom | JetBooking *Workflows* — **overiť, či vie čas pred príchodom** (prieskum uvádza len vytvorenie / zmenu stavu) |
| E4 | Po pobyte — hodnotenie a „prídete znova?“ | deň po odchode | JetBooking *Workflows* — overiť čas po odchode |
| E5a | Pripomienka platby | ~6 h pred splatnosťou | **natívne asi nie** — závisí od rozhodnutia o 24 h držaní (nižšie) |
| E5b | Rezervácia zrušená (platba neprišla) | po splatnosti | WooCommerce *Zrušená objednávka* pre hosťa — **natívne ide len adminovi**, overiť |
| E5c | Účet vytvorený, nastavte si heslo | pri vytvorení účtu | WooCommerce *Nový účet* (odkaz na nastavenie hesla) |
| E6 | Majiteľovi: nová rezervácia (hosť, pobyt, služby na doladenie, poznámka) | hneď po objednávke | WooCommerce *Nová objednávka* (admin), príjemca = majiteľ |
| E7 | E1 na mobile | — | ukážka čitateľnosti na telefóne |

## Spoločný vzhľad (z Kitu krabice)
- Pozadie Piesok `#ECE8DF`, karta biela so zaoblením 18, hlavička s logom (text alebo obrázok loga klienta), päta s kontaktom webu.
- Akcent `#2F5D50` na tlačidlá a dôležité údaje, Jantár `#C98A3F` na upozornenia („dohodnúť“, pripomienka, odznak *Ukážka*).
- Nadpis z dvoch viet (druhá v Hmle `#8A928D`), štítky veľkými písmenami s prestrkaním.
- Fotka objektu v hlavičke e-mailu je **voliteľná** — ak ju WooCommerce natívne nevie dať podľa objektu, vynechať (nie kód kvôli fotke).

## Čo overiť pred stavbou (Claude Code)
1. Čo ponúka **WooCommerce 11.2** na vzhľad e-mailov: klasické nastavenia (logo, farby, päta) vs. nový blokový editor e-mailov.
   Preferovať natívne. Prepis šablón v child téme (`woocommerce/emails/*.php`) = kód → najprv sa opýtať.
2. **JetBooking Workflows:** vie poslať e-mail X dní pred príchodom / po odchode? Ak nie, natívna alternatíva (napr. WooCommerce + plánovač) alebo otázka.
3. **QR platba:** plugin Pay by Square (prieskum ho uvádza bez kódu) — overiť, či vloží QR do e-mailu aj na stránku potvrdenia.
4. ~~Doručiteľnosť~~ — v poriadku, e-mail prišiel (Martin 14. 10.).
5. Výsledok: tabuľka *natívne / s kompromisom / nejde* → Martinovi na OK.

## Rozhodnutia (Martin 14. 10.)
- **E3 pokyny e-mailom: áno** — každému hosťovi so zaplateným pobytom, 2 dni pred príchodom.
- **24 h držanie, E5a pripomienka, E5b automatické zrušenie: odložené.** Daň za ubytovanie zatiaľ „v cene“.

## Pôvodne otvorené
- **24 h držanie pri prevode** (kap. 8): dnes objednávka prevodom (on-hold) drží termín, kým ju majiteľ ručne nezruší. E5a a E5b potrebujú
  automatické zrušenie po splatnosti — natívne to WooCommerce nevie (rušia sa len nezaplatené *pending*). Možnosti: plugin, alebo ručne.
- **Pokyny k príchodu e-mailom** (E3): architektúra chce pokyny aj pre hostí bez účtu (11.1, jednorazový odkaz). E-mail E3 to rieši najjednoduchšie.
- **Daň za ubytovanie** (12.2): architektúra hovorí *pripočítava sa*, návrh pokladne hovorí *v cene*. E-maily ju zatiaľ neuvádzajú.
