import type { PriceContributor } from "@/core/pricing/calculate";
import { servicesPriceContributor } from "./services/pricing";

/**
 * Price hooks of modules, keyed by module key. Kept apart from the manifests so the price calculation can run in the
 * browser too (manifests reference server components).
 */
export const PRICE_CONTRIBUTORS: Readonly<Record<string, PriceContributor>> = {
  services: servicesPriceContributor,
};

export function priceContributorsFor(enabledModuleKeys: readonly string[]): PriceContributor[] {
  return enabledModuleKeys.flatMap((key) =>
    PRICE_CONTRIBUTORS[key] ? [PRICE_CONTRIBUTORS[key]] : [],
  );
}
