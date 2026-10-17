import { listModules } from "./registry";

/**
 * Module catalog of the control center (v1.2): finished modules from the registry and modules in preparation
 * (ARCHITEKTURA — recenzie, správy s hosťom, push, SMS, online check-in, upsell). Modules in preparation are only
 * rows of the catalog — they cannot be switched on. Texts: `platform.catalog.<key>`.
 */
export type CatalogEntry = { key: string; ready: boolean; dependsOn: readonly string[] };

const PLANNED: CatalogEntry[] = [
  { key: "messages", ready: false, dependsOn: [] },
  { key: "sms", ready: false, dependsOn: [] },
  { key: "checkin", ready: false, dependsOn: [] },
];

export function moduleCatalog(): CatalogEntry[] {
  return [
    ...listModules().map((m) => ({
      key: m.key,
      ready: m.ready !== false,
      dependsOn: m.dependsOn ?? [],
    })),
    ...PLANNED,
  ];
}
