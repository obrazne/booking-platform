import { modelQuantity, type PriceContributor } from "@/core/pricing/calculate";
import type { PriceLine } from "@/core/pricing/types";

/** Services chosen by the guest become price lines (module hook into the price calculation, A3/B4). */
export const servicesPriceContributor: PriceContributor = ({ input, nights, persons }) => {
  const lines: PriceLine[] = [];
  for (const service of input.services) {
    const chosen = Math.trunc(input.selectedServices?.[service.id] ?? 0);
    if (chosen <= 0) continue;
    const items = service.maxQuantity ? Math.min(chosen, service.maxQuantity) : chosen;
    const quantity = modelQuantity(service.priceModel, nights.length, persons, items);
    lines.push({
      kind: "service",
      refId: service.id,
      name: service.name,
      quantity,
      unitAmountCents: service.amountCents,
      amountCents: service.amountCents * quantity,
      vatBp: service.vatBp,
      meta: { priceModel: service.priceModel, items },
    });
  }
  return lines;
};
