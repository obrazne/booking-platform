/** Tabs of Nastavenia (Z69, v1.7) — the order of the tab bar; the value of `?tab=`. */
export const SETTINGS_TABS = [
  "vseobecne",
  "platby",
  "pravidla",
  "prepojenia",
  "upozornenia",
  "tim",
  "vypis",
] as const;
export type SettingsTab = (typeof SETTINGS_TABS)[number];

/** The tab from the address; Všeobecné when missing or unknown. */
export function settingsTab(value: unknown): SettingsTab {
  const v = Array.isArray(value) ? value[0] : value;
  return (SETTINGS_TABS as readonly string[]).includes(v as string)
    ? (v as SettingsTab)
    : "vseobecne";
}
