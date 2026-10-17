import { slotComponents } from "./registry";
import type { SlotName } from "./types";

/** Renders what enabled modules contribute to a named place in the UI. */
export async function ModuleSlot({
  name,
  tenantId,
  locale,
  reservationId,
}: {
  name: SlotName;
  tenantId: string;
  locale: string;
  reservationId?: string;
}) {
  const items = await slotComponents(tenantId, name);
  return (
    <>
      {items.map(({ key, Component }) => (
        <Component key={key} tenantId={tenantId} locale={locale} reservationId={reservationId} />
      ))}
    </>
  );
}
