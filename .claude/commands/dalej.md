---
description: Stiahni novinky z GitHubu a pokračuj ďalšou úlohou z roadmapy
---

Martin chce, aby si pokračoval v projekte. Postupuj takto:

1. **Stiahni novinky:** `git pull --rebase`. Ak zlyhá, ukáž Martinovi `git status`, nič nezahadzuj a zastav.
2. **Zisti, čo je nové od Claude chatu:** pozri commity, ktoré pribudli od tvojho posledného commitu.
   Ak sa zmenil `CLAUDE.md`, prečítaj ho znova celý — platia nové pravidlá. Martinovi to zhrň v 1–3 vetách.
3. **Prečítaj `ROADMAP.md`:** sekcie *Aktuálne*, *Zadanie pre Claude Code* a *Otázky pre Martina*.
4. **Vyber úlohu:**
   - Ak Martin k príkazu pripísal vlastnú požiadavku (nižšie), má prednosť.
   - Inak sprav to, čo je v *Zadanie pre Claude Code*. Ak je tam fronta (Z1, Z2, …), vezmi **prvú bez ✅** — len jednu.
   - Ak je prázdne, vezmi najbližšiu otvorenú úlohu 🔧 v aktuálnej fáze.
   - Ak je otvorená len úloha 🧠 (rozhoduje Martin), povedz mu to a nerob nič.
5. Jednou vetou povedz, čo ideš robiť, a pusti sa do toho. **Výnimka:** ak úloha niečo maže, presúva, mení databázu
   alebo nasadzuje do produkcie, najprv počkaj na Martinovo OK.
6. Po dokončení postupuj podľa `CLAUDE.md` → *Po dokončení úlohy* (odškrtnúť, Denník, commit, push).
   Ak bola úloha zo *Zadanie pre Claude Code*, označ ju v nadpise ✅ (napr. `### Z1 ✅ — …`). Keď sú všetky ✅, sekciu vyprázdni (nechaj „—“).
   Na konci povedz Martinovi, čo je ďalšie vo fronte (alebo že je prázdna).

Požiadavka od Martina (môže byť prázdna): $ARGUMENTS
