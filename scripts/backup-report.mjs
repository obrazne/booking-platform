// Records the result of the nightly backup in `platform_backups` (Z52 — Stav systému in the control center).
// Run by the backup workflow as its last step (also after a failure). Usage:
//   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… OK=true|false [STARTED_AT=…] [BACKUP_FILE=…] [BACKUP_TABLES=…]
//   [BACKUP_FILES=…] [RUN_URL=…] [NOTE=…] node scripts/backup-report.mjs
// By hand (a run before Z52, a test restore): add FINISHED_AT=… and KIND=restore_test.
// Never prints keys.
import { statSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  process.exit(2);
}
const int = (v) => (v && /^\d+$/.test(v) ? Number(v) : null);
let size = null;
try {
  if (process.env.BACKUP_FILE) size = statSync(process.env.BACKUP_FILE).size;
} catch {
  // the file is gone or was never made (a failed run)
}
size ??= int(process.env.BACKUP_SIZE);

const row = {
  kind: process.env.KIND === "restore_test" ? "restore_test" : "backup",
  environment: "staging",
  ok: process.env.OK === "true",
  started_at: process.env.STARTED_AT || null,
  ...(process.env.FINISHED_AT ? { finished_at: process.env.FINISHED_AT } : {}),
  size_bytes: size,
  tables_compared: int(process.env.BACKUP_TABLES),
  files: int(process.env.BACKUP_FILES),
  run_url: process.env.RUN_URL || null,
  note: process.env.NOTE || null,
};
const db = createClient(url, key, { auth: { persistSession: false } });
const { error } = await db.from("platform_backups").insert(row);
if (error) {
  console.error(`Not recorded: ${error.message}`);
  process.exit(1);
}
console.log(
  `Recorded: ${row.ok ? "ok" : "failed"}, ${size ?? "?"} bytes, ${row.tables_compared ?? "?"} tables, ${row.files ?? "?"} files.`,
);
