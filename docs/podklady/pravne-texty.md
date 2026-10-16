# Právne stránky dema — vzorové texty

*Claude chat, 2026-10-14. Podľa `ARCHITEKTURA.md` 12.4: právne dokumenty sú statické stránky, znenie vkladá klient.
Toto je **vzorové znenie pre demo**, nie je právne posúdené. Údaje v [hranatých zátvorkách] doplní klient.*

Na každej stránke hore jeden riadok drobným písmom: *Vzorové znenie pre ukážku rezervačného systému.*

---

## Stránka 1: Obchodné podmienky (slug `obchodne-podmienky`)

**Obchodné podmienky ubytovania**

**1. Kto sme**
Ubytovanie na tomto webe poskytuje [obchodné meno], so sídlom [adresa], IČO [IČO], zapísaný v [register] (ďalej „ubytovateľ“).
Kontakt: rezervacie@booking.martinolsa.sk, +421 900 123 456.

**2. Rezervácia a uzavretie zmluvy**
Rezerváciu vytvoríte na karte objektu výberom termínu, počtu hostí a doplnkových služieb a jej odoslaním v pokladni.
Odoslaním rezervácie s povinnosťou platby vzniká zmluva o poskytnutí ubytovania. Potvrdenie dostanete e-mailom.

**3. Cena**
Cena pobytu sa zobrazí pred odoslaním rezervácie a zahŕňa ubytovanie a vybrané doplnkové služby. Daň za ubytovanie je súčasťou ceny,
ak pri objekte nie je uvedené inak. Ceny sa môžu líšiť podľa sezóny a dĺžky pobytu.

**4. Platba**
Pri platbe bankovým prevodom vám po rezervácii pošleme platobné údaje. Termín držíme do splatnosti uvedenej v e-maile.
Ak platba do splatnosti nepríde, môžeme rezerváciu zrušiť a termín uvoľniť. Rezervácia je potvrdená prijatím platby.

**5. Zrušenie rezervácie (storno)**
Rezerváciu môžete zrušiť písomne (e-mailom) alebo v účte hosťa cez „Požiadať o storno“. O zrušení rozhoduje ubytovateľ a potvrdí ho e-mailom.
Storno poplatky, ak pri objekte nie je uvedené inak:
- 30 a viac dní pred príchodom: bez poplatku,
- 29 až 11 dní pred príchodom: 50 % z ceny pobytu,
- 10 a menej dní pred príchodom alebo nenastúpenie na pobyt: 100 % z ceny pobytu.
Konkrétne storno podmienky objektu sú uvedené na jeho karte a v potvrdení rezervácie.

**6. Odstúpenie od zmluvy**
Podľa zákona o ochrane spotrebiteľa nemôže spotrebiteľ odstúpiť od zmluvy o poskytnutí ubytovacích služieb, ktoré sa poskytujú v dohodnutom termíne.
Rezerváciu je možné zrušiť podľa bodu 5.

**7. Pobyt**
Príchod a odchod sú uvedené na karte objektu a v potvrdení rezervácie. Hostia sú povinní dodržiavať ubytovací poriadok objektu,
počet hostí nesmie prekročiť kapacitu objektu. Pobyt so zvieraťom je možný len tam, kde je to pri objekte uvedené.
Za škody spôsobené počas pobytu zodpovedá hosť.

**8. Reklamácie**
Ak nie ste s ubytovaním spokojný, kontaktujte nás čo najskôr, ideálne ešte počas pobytu, aby sme mohli nedostatok odstrániť.
Reklamáciu vybavíme bez zbytočného odkladu, najneskôr do 30 dní. Ak nebudete s vybavením spokojný, môžete sa obrátiť na subjekt
alternatívneho riešenia sporov, napríklad Slovenskú obchodnú inšpekciu. Dozor nad dodržiavaním práv spotrebiteľa vykonáva Slovenská obchodná inšpekcia.

**9. Záverečné ustanovenia**
Tieto podmienky platia od [dátum]. Ochrana osobných údajov je popísaná na stránke *Ochrana osobných údajov*.

---

## Stránka 2: Ochrana osobných údajov (slug `ochrana-osobnych-udajov`, nastaviť ako *Privacy Policy* WordPressu)

**Ochrana osobných údajov**

**Prevádzkovateľ:** [obchodné meno], [adresa], IČO [IČO], e-mail rezervacie@booking.martinolsa.sk.

**Aké údaje a prečo**
| Účel | Údaje | Právny základ | Ako dlho |
|---|---|---|---|
| Rezervácia a pobyt | meno, e-mail, telefón, adresa, termín, počet hostí, poznámka | plnenie zmluvy | počas zmluvy a do uplynutia premlčacích lehôt |
| Účtovníctvo | údaje na doklade | zákonná povinnosť | 10 rokov |
| Evidencia ubytovaných | údaje podľa platných predpisov | zákonná povinnosť | podľa predpisov |
| Účet hosťa | prihlasovací e-mail, údaje v účte | plnenie zmluvy | kým účet nezrušíte |
| Ponuky e-mailom | e-mail | súhlas (nepovinný) | do odvolania súhlasu |

**Komu údaje odovzdávame:** poskytovateľovi hostingu, e-mailových služieb, platobných služieb a účtovníkovi — len v rozsahu potrebnom na daný účel.
Údaje neposielame mimo EÚ, ak nie je uvedené inak.

**Vaše práva:** prístup k údajom, oprava, vymazanie, obmedzenie spracúvania, prenosnosť, námietka a odvolanie súhlasu kedykoľvek
(e-mailom alebo v účte hosťa). Sťažnosť môžete podať Úradu na ochranu osobných údajov SR.

---

## Stránka 3: Cookies (slug `cookies`)

**Súbory cookies**
Web používa nevyhnutné súbory cookies, bez ktorých nefunguje rezervácia, košík, prihlásenie a zoznam obľúbených.
Analytické ani marketingové cookies [nepoužívame / používame len s vaším súhlasom cez lištu cookies].
Nastavenia cookies môžete kedykoľvek zmeniť v prehliadači.

---

## Texty v pokladni

- **Obchodné podmienky (povinné, natívne WooCommerce):** „Prečítal(a) som si [obchodné podmienky](…) a súhlasím s nimi.“ —
  WooCommerce pri nastavenej stránke podmienok zobrazí políčko a text podmienok na rozkliknutie.
- **Ochrana údajov (natívne WooCommerce, text pod formulárom):** „Osobné údaje použijeme na vybavenie rezervácie podľa [zásad ochrany osobných údajov](…).“
- **Marketingový súhlas (nepovinný, nepredvyplnený):** „Chcem dostávať ponuky a zľavy e-mailom. Súhlas môžem kedykoľvek odvolať.“ —
  ukladať **znenie a dátum** (ARCHITEKTURA 12.5).
