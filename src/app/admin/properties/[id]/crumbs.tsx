"use client";

import { usePathname } from "next/navigation";
import { Breadcrumbs } from "@/core/admin/breadcrumbs";

/** Objekt › <name> › <tab> (common rule v1.2) — the tab from the address; the first tab ends at the name. */
export function PropertyCrumbs({
  group,
  name,
  tabs,
}: {
  group: { label: string; href: string };
  name: string;
  tabs: { href: string; label: string }[];
}) {
  const pathname = usePathname();
  const active = tabs.slice(1).find((tab) => pathname.startsWith(tab.href));
  return (
    <Breadcrumbs
      items={[
        group,
        active ? { label: name, href: tabs[0]!.href } : { label: name },
        ...(active ? [{ label: active.label }] : []),
      ]}
    />
  );
}
