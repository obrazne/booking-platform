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
   - Inak sprav to, čo je v *Zadanie pre Claude Code*. Ak je tam fronta (Z1, Z2, …), začni **prvou bez ✅** a po jej dokončení
     **pokračuj ďalšou bez čakania na Martina**, kým nie je fronta prázdna alebo nenastane dôvod na zastavenie (`CLAUDE.md` → *Režim práce*).
   - Ak je prázdne, vezmi najbližšiu otvorenú úlohu 🔧 v aktuálnej fáze.
   - Ak je otvorená len úloha 🧠 (rozhoduje Martin), povedz mu to a nerob nič.
5. Jednou vetou povedz, čo ideš robiť, a pusti sa do toho. Na OK čakaj len v prípadoch z `CLAUDE.md` → *Režim práce*
   (mazanie netestovacích dát, produkcia, peniaze, právo a bezpečnosť, rozpor s architektúrou, zaseknutie).
6. Po dokončení postupuj podľa `CLAUDE.md` → *Po dokončení úlohy* (odškrtnúť, Denník, commit, push).
   Ak bola úloha zo *Zadanie pre Claude Code*, označ ju v nadpise ✅ (napr. `### Z1 ✅ — …`). Keď sú všetky ✅, sekciu vyprázdni (nechaj „—“).
   Po každej úlohe commit a push. Na konci povedz Martinovi stručne, čo je hotové a čo si môže vyskúšať.

Požiadavka od Martina (môže byť prázdna): $ARGUMENTS
