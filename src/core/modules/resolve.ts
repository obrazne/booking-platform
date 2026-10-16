import type { ModuleManifest } from "./types";

/** A switch is on when active, or in trial whose end date (inclusive) has not passed. Dates are YYYY-MM-DD. */
export function isEnabledStatus(
  status: string,
  trialEndsAt: string | null,
  today: string,
): boolean {
  return (
    status === "active" || (status === "trial" && trialEndsAt !== null && trialEndsAt >= today)
  );
}

/** Enabled modules with dependencies respected: a module whose dependency is off is off too. */
export function resolveEnabled(
  modules: readonly ModuleManifest[],
  enabledKeys: ReadonlySet<string>,
): ModuleManifest[] {
  const on = new Set<string>();
  let changed = true;
  while (changed) {
    changed = false;
    for (const m of modules) {
      if (on.has(m.key) || !enabledKeys.has(m.key)) continue;
      if ((m.dependsOn ?? []).every((d) => on.has(d))) {
        on.add(m.key);
        changed = true;
      }
    }
  }
  return modules.filter((m) => on.has(m.key));
}
