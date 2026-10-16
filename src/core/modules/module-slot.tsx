import { slotComponents } from "./registry";
import type { SlotName } from "./types";

/** Renders what enabled modules contribute to a named place in the UI. */
export async function ModuleSlot({
  name,
  tenantId,
  locale,
}: {
  name: SlotName;
  tenantId: string;
  locale: string;
}) {
  const items = await slotComponents(tenantId, name);
  return (
    <>
      {items.map(({ key, Component }) => (
        <Component key={key} tenantId={tenantId} locale={locale} />
      ))}
    </>
  );
}
