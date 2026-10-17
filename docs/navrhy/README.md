# Návrhy (schválené vizuály)

Sem sa ukladajú **len schválené** návrhy z plátna Claude Design. Na plátne sa skúša (pracovné verzie), do repozitára ide až to,
čo Martin schváli. Claude Code stavia len podľa toho, čo je tu.

| Priečinok | Obrazovka | Popis pre stavbu | Verzia |
|---|---|---|---|
| `stranka-hosta/` | Detail objektu, galéria, košík (bočný panel), potvrdenie rezervácie, mobil | `docs/vizual-stranka-hosta.md` | v2.4 — 17. 10. 2026 (účet hosťa: `UcetPrehlad`, `MobilUcet`, `StavyPobytu`; v2.3 moduly; v2.2 košík pre 13″ notebook) |
| `administracia/` | Prihlásenie (majiteľ, správca, hosť), prehľad, rezervácie + panel, kalendár obsadenosti, riadiace centrum, mobil | `docs/vizual-administracia.md` | v1.1 — 17. 10. 2026 (pravidlá podľa pripomienok zo stagingu; dosky ostávajú v1 — panel na doskách má ešte dva stĺpce, platí text) |

**Ako to funguje**
- Súbory `*.dc.html` sú zdroj plátna (dosky). Samostatne sa v prehliadači neotvoria — slúžia na čítanie štruktúry, textov a správania
  (stav a logika sú v `<script>` na konci súboru). Hlavný podklad je vždy popis v `docs/`.
- **Nová verzia = nový commit, nie nový priečinok.** Súbory sa prepíšu, popis dostane sekciu *Zmeny oproti vN* a úloha v ROADMAP
  odkáže na verziu. Rozdiel ukáže `git diff` / `git log -p docs/navrhy/<obrazovka>/`.
- Návrh je **zámer, nie pixelová predloha.** Farby, písma a zaoblenia idú z témy klienta (A12), texty z prekladov a z dát objektu
  (sekcie podľa B7). Konkrétne hodnoty v návrhu (`#2f5d50`, Roboto…) sú predvolená téma platformy.
- Drobnosti (medzera, text tlačidla) po postavení stránky netreba kresliť na plátne — zadávajú sa rovno ako úloha.
