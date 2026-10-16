# Booking platform

Rezervačná platforma pre ubytovateľov („krabica“): jedna aplikácia pre všetkých klientov, balíky ako vypínače modulov,
riadiace centrum pre Martina. Stack: **Next.js + Supabase + Vercel**, GitHub `obrazne/booking-platform`.
Prvý ostrý klient: **Chalet STRÖMY** (Jana Hladká). Predchodca na WordPresse (`obrazne/booking-demo`) je od 16. 10. 2026 zmrazený.

## Zdroj pravdy a postup práce — PREČÍTAJ AKO PRVÉ

Projekt má štyri riadiace súbory. Sú jediným zdrojom pravdy; nič iné (Notion, Projekt v claude.ai, staré chaty) neplatí,
ak to tu nie je zapísané.

| Súbor | Obsah | Smieš meniť? |
|---|---|---|
| `ARCHITEKTURA.md` | ČO staviame — princípy, dátový model, moduly, toky | **Nie**, len na výslovný pokyn Martina |
| `ROADMAP.md` | Fázy, úlohy, aktuálny stav, otázky, denník | Áno — odškrtávať, Denník, Otázky |
| `ROZHODNUTIA.md` | Prečo sa čo rozhodlo | **Nie**, len na výslovný pokyn Martina |
| `CLAUDE.md` | Tento súbor — pravidlá, prístupy, mapa kódu | Áno — dopĺňať mapu kódu a prístupy |

Rozhodnutia a návrh vznikajú v Claude chate s Martinom (úlohy 🧠). Claude Code robí fyzickú prácu (úlohy 🔧).

**Dvaja zapisovatelia, jeden repozitár.** Claude chat posiela zmeny priamo na GitHub (vetva `main`), nie na disk.
Lokálna kópia preto môže byť pozadu — vždy najprv stiahni.

| Kto | Čo mení |
|---|---|
| Claude chat | `ARCHITEKTURA.md`, `ROZHODNUTIA.md`, v `ROADMAP.md` úlohy 🧠, nové úlohy, sekcie *Aktuálne* a *Zadanie pre Claude Code*; `.claude/commands/`; `docs/` podklady |
| Claude Code | v `ROADMAP.md` odškrtáva úlohy 🔧, píše *Denník* a *Otázky pre Martina*; `CLAUDE.md` (mapa kódu, prístupy); kód aplikácie; `docs/` výstupy úloh |

**Martin ti pokyny z chatu nekopíruje.** Claude chat ich zapisuje do `ROADMAP.md` → *Zadanie pre Claude Code*.
Príkaz **`/dalej`** (`.claude/commands/dalej.md`) stiahne novinky a pokračuje ďalšou úlohou.

**Pred každou novou požiadavkou od Martina** (nielen na začiatku session):
0. `git pull --rebase`. Ak zlyhá kvôli lokálnym zmenám, ukáž Martinovi `git status` a nič nezahadzuj bez jeho súhlasu.
   Ak sa stiahnutím zmenil `CLAUDE.md`, prečítaj ho znova.
1. Prečítaj `ROADMAP.md` — *Aktuálne*, *Zadanie pre Claude Code* a ďalšiu otvorenú úlohu 🔧.
2. Pred prácou na kóde si prečítaj relevantnú kapitolu `ARCHITEKTURA.md`.

**Počas práce:**
- Rob len to, čo je v úlohe. Nové požiadavky nevymýšľaj.
- Ak narazíš na rozhodnutie, ktoré nie je v architektúre, alebo na rozpor, **zastav**, zapíš to do *Otázky pre Martina* a povedz mu to.
- **Ozvi sa skôr, nie po dvoch hodinách.** Ak sa niečo nedarí ani po 2 pokusoch alebo zhruba do 30 minút, zastav,
  napíš Martinovi krátko čo nejde, prečo a 1–2 možnosti s odporúčaním. Medzitým pokračuj v častiach, ktoré na tom nezávisia.

**Po dokončení úlohy:**
1. Odškrtni ju v `ROADMAP.md` (`- [x]`) a aktualizuj sekciu *Aktuálne*.
2. Pridaj riadok do *Denníka* (najnovšie hore): `RRRR-MM-DD — čo sa spravilo a kde (Claude Code)`.
3. `git pull --rebase`, potom commit (správa po slovensky, stručne čo a prečo) a `git push`.

## Pravidlá kódu (platia od prvého riadku — podrobnosti v `ARCHITEKTURA.md`)

- **Kód, databáza a názvy v angličtine, rozhranie cez preklady** (slovenčina pri štarte, ďalšie jazyky bez prestavby).
  Žiadne natvrdo zapísané texty v komponentoch.
- **Každá tabuľka s dátami klienta má `tenant_id`** a oddelenie klientov vynucuje databáza (RLS). Nikdy žiadny dotaz naprieč klientmi
  mimo riadiaceho centra. Oddelenie sa testuje automaticky.
- **Peniaze v centoch (celé čísla) s menou pri sume.** Cena sa pri rezervácii zamrazí; vystavené doklady sa nemenia.
- **Jadro nevie o moduloch.** Moduly sa napájajú cez definované miesta (výpočet ceny, udalosti rezervácie, miesta v rozhraní)
  a zapínajú sa per klient v databáze. Nikdy nekopírovať kód pre jedného klienta.
- **Úpravy databázy len pridávajú** (migrácie verzované v repozitári, nič nemažú ani neprepisujú bez odsúhlasenia).
- **Nikdy necommituj** `.env`, kľúče, heslá, tokeny ani výpisy databázy. Do dokumentov píš len názvy premenných, nie hodnoty.
- Do repozitára nepatria osobné údaje hostí ani prístupové kódy objektov (Wi-Fi, dvere).

## Prostredia a účty

Všetky účty sú na Obrazne s.r.o. (GitHub `obrazne`, Supabase účet info@obrazne.sk, Vercel). Počas vývoja stačia bezplatné plány;
pred spustením prvého platiaceho klienta sa prechádza na platené. Prostredia: lokálne → staging → produkcia (dva Supabase projekty).
*Projekty a prístupy sa doplnia, keď vzniknú.*

## Mapa kódu

*Zatiaľ žiadny kód — aplikácia sa začne stavať po uzavretí architektúry v2 (ROADMAP Fáza 2).*

## Priečinky

| Priečinok | Obsah |
|---|---|
| `docs/podklady/` | Podklady prevzaté z WordPress dema: Chalet STRÖMY, právne texty, návrhy e-mailov, obsah karty objektu |
| `docs/biznis/` | Biznisová stratégia a predajné argumenty (masterdokument, wireframe predajnej stránky) |
| `docs/archiv-wp/` | Archív z WordPress dema (architektúra v1, návrhy vizuálu, účet hosťa) — **len na čítanie ako zámer**, technické riešenia z WordPressu neplatia |
