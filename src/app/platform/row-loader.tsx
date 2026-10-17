"use server";

import type { ReactNode } from "react";
import { tenantSnapshot } from "@/core/admin/tenant-snapshot";
import { isPlatformAdmin } from "@/core/auth/session";
import { SnapshotView } from "./snapshot-view";

/** Expanded row of the client list (v1.2): the client at a glance, loaded only when the row opens. */
export async function loadTenantRow(id: string, domain: string | null): Promise<ReactNode> {
  if (!/^[0-9a-f-]{36}$/.test(id) || !(await isPlatformAdmin())) return null;
  const s = await tenantSnapshot(id);
  if (!s) return null;
  const host = domain && /^[a-z0-9.-]+$/i.test(domain) ? domain : null;
  return <SnapshotView s={s} domain={host} actions />;
}
