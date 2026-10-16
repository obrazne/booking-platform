# Účet hosťa — návrh podľa handoveru z vav.martinolsa.sk

*Claude chat, 13. 10. 2026. Predloha: `handover zona klienta/HANDOVER_doktorandska_zona.md` + kód v `handover zona klienta/kod/`.
Handover popisuje doktorandskú zónu — preberá sa **spôsob**, nie doktorandské roly a workshopy.
Realizácia je Fáza 2b (po MVP chaletu a vizuálnej identite).*

## Rozhodnutia (Martin, 13. 10.)

- **Vznik účtu:** zaškrtávacie pole „Vytvoriť účet“ pri rezervácii (WooCommerce natívne) **+ registrácia neskôr**
  rovnakým e-mailom — vtedy sa hosťovi priradia jeho doterajšie pobyty. Rezervácia bez účtu ostáva možná.
- **Bez schvaľovania účtov.** Hosť je overený rezerváciou; stavy „čaká na schválenie“ / „zamietnutý“ z vav sa nepreberajú.
- **Majiteľ spravuje rezervácie vo wp-admin** s obmedzenou rolou (ARCHITEKTURA 2.4), nie na frontende ako `/sprava/` na vav.
- **Jeden účet:** Profile Builder (`/moj-ucet/`) je jediné rozhranie účtu. WooCommerce „Môj účet“ sa presmeruje naň;
  objednávky, faktúry a údaje z WooCommerce sa v ňom zobrazia.

## Preklad pojmov vav → booking

| vav (doktorandská zóna) | booking (zóna hosťa) |
|---|---|
| CPT `workshopy` | CPT `properties` (objekty) |
| CPT `registracie` | rezervácie JetBooking + objednávky WooCommerce (netreba nový CPT) |
| CPT `doktorandi` (profil, `post_author` = používateľ) | **netreba** — profil hosťa = WP používateľ + zákaznícke údaje WooCommerce |
| rola `doktorand` | rola **`host`** (Hosť) |
| `doktorand_caka`, `doktorand_zamietnuty` | nepoužije sa |
| `skolitel` | nepoužije sa |
| `spravca_ds` + frontend `/sprava/` | rola **`majitel`** vo wp-admin (obmedzené práva) |
| plnenie povinností (4 workshopy/rok) | nepoužije sa |
| prezenčná listina, export CSV | nepoužije sa (neskôr možno kniha ubytovaných) |

## Roly

| Slug | Názov | Čo môže |
|---|---|---|
| `host` | Hosť | prihlásiť sa, `/moj-ucet/`, žiadny wp-admin |
| `majitel` | Majiteľ ubytovania | wp-admin: rezervácie JetBooking, kalendár, objednávky WooCommerce, objekty; nie pluginy, šablóny, nastavenia |
| `administrator` | Martin | všetko |

Hosť vytvorený cez WooCommerce dostane rolu `customer` → nastaviť tak, aby nový zákazník dostal rolu `host`
(alebo `host` = `customer` premenovaný; overiť jednoduchšiu cestu).

## Stránky

| Stránka | Slug | Obsah |
|---|---|---|
| Prihlásenie | `/prihlasenie/` | formulár JetFormBuilder (e-mail + heslo) |
| Registrácia | `/registracia/` | formulár JetFormBuilder (meno, e-mail, heslo, telefón) |
| Môj účet | `/moj-ucet/` | widget Profile Content (Profile Builder) |

## Profile Builder — podstránky pre rolu `host`

| Podstránka | Slug | Obsah |
|---|---|---|
| Prehľad | `prehlad` | pozdrav, **najbližší pobyt** (objekt, termín, odpočet dní, stav platby), check-in pokyny k nemu, kontakt na ubytovanie, odkaz na objekty |
| Moje pobyty | `moje-pobyty` | nadchádzajúce a minulé pobyty (objekt, termín, hostia, služby, suma, stav), žiadosť o storno (zatiaľ e-mailom majiteľovi) |
| Na stiahnutie | `na-stiahnutie` | doklady k objednávkam (WooCommerce), ubytovací poriadok, **check-in pokyny a prístupové kódy len k potvrdenému nadchádzajúcemu pobytu** |
| Obľúbené | `oblubene` | data store `favorites` (už na webe) |
| Moje údaje | `moje-udaje` | meno, e-mail, telefón, fakturačné údaje — **editovateľné** (na rozdiel od vav, kde boli len na čítanie), zmena hesla, odhlásenie |

Nastavenie Profile Buildera podľa handoveru kap. 6: Template mode `Content`, neprihlásený → presmerovanie na prihlásenie,
User Page vypnutá, Disable admin bar a Restrict admin area pre neadminov — **pozor: rola `majitel` musí do wp-admin mať prístup**
(overiť, či *Restrict admin area* ide nastaviť podľa roly; inak riešiť ako snippet 08).

## Čo sa preberá z kódu vav (`handover zona klienta/kod/`)

| Súbor vav | Použiť? | Úprava |
|---|---|---|
| 01 blokovanie čakajúceho | **nie** | bez schvaľovania |
| 02 prihlásenie a registrácia | **áno** | prihlásenie e-mailom, hlášky po slovensky, `login_url` → `/prihlasenie/`, presmerovanie podľa roly (host → `/moj-ucet/`, majiteľ → wp-admin); vynechať kontrolu domény `@tnuni.sk` a zamietnutých; pri registrácii priradiť existujúce objednávky s rovnakým e-mailom |
| 03 workshopy | **nie** | rezervácie rieši JetBooking |
| 04 môj účet doktoranda | **áno, prepísať** | dynamický tag „Booking – prihlásený hosť“: najbližší pobyt, zoznam pobytov, doklady — z rezervácií JetBooking a objednávok WooCommerce |
| 05 hlavička | **áno** | meno / „Môj účet“, odhlásenie; bez časti o výzvach |
| 06 správa | **len časť** | triedy na `<body>` (`bk-host`, `bk-majitel`, `bk-guest`); bez frontend správy |
| 07 e-maily | **len HTML šablóna** | e-maily rezervácií ide cez WooCommerce a JetBooking Workflows; šablónu použiť pre e-maily účtu (registrácia) |
| 08 prihlásenie administrátora | **áno** | admin a majiteľ cez `wp-login.php` |

Prefix `vav_` → `bk_`. Kód do mu-pluginu alebo child témy (Code Snippets na booking webe nie je).

## Výnimka z pravidla „najprv natívne“

Pre Fázu 2b je **povolené prevziať odladený kód z vav** (snippety 02, 04, 05, 06 čiastočne, 08) — Martin ho sám dodal ako predlohu.
Nový kód nad rámec toho platí naďalej ako výnimka, ktorú treba odsúhlasiť.

## Otvorené (vyrieši sa pri stavbe)

- Faktúry: WooCommerce ich negeneruje — v MVP účtu len potvrdenie objednávky; faktúry sú samostatná vec (plugin) neskôr.
- Prístupové kódy: kde ich majiteľ zadá (meta pole na objekte, viditeľné len cez tag pre hosťa s potvrdeným pobytom).
- Storno hosťom: zatiaľ tlačidlo „Požiadať o storno“ = e-mail majiteľovi; plný tok podľa ARCHITEKTURA kap. 8 neskôr.
