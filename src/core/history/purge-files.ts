import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET: Record<string, string> = { photos: "property-photos", documents: "guest-documents" };

/**
 * Files of photos and documents deleted more than 30 days ago (the trash, Z31) are removed from storage now —
 * unless the record was restored meanwhile. Runs with the job worker; a few at a time.
 */
export async function purgeTrashFiles(limit = 20): Promise<number> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("record_history")
    .select("id, table_name, record_id, old_row")
    .in("table_name", Object.keys(BUCKET))
    .eq("op", "delete")
    .is("files_purged_at", null)
    .lt("changed_at", new Date(Date.now() - 30 * 86_400_000).toISOString())
    .order("id")
    .limit(limit);
  let removed = 0;
  for (const row of data ?? []) {
    const table = row.table_name as "photos" | "documents";
    const path = (row.old_row as { storage_path?: string } | null)?.storage_path;
    if (path) {
      // Restored meanwhile, or another record uses the same file — keep it.
      const { count } = await admin
        .from(table)
        .select("id", { count: "exact", head: true })
        .eq("storage_path", path);
      if (!count) {
        await admin.storage.from(BUCKET[table]!).remove([path]);
        removed++;
      }
    }
    await admin
      .from("record_history")
      .update({ files_purged_at: new Date().toISOString() })
      .eq("id", row.id);
  }
  return removed;
}
