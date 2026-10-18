// Surgical restore of ONE client from a backup (Z52, A9 layer 3). Postup: docs/prevadzka/zaloha-a-obnova.md.
//
//   node --env-file=.env.local scripts/restore-tenant.mjs --dump backup/db/data.sql --tenant <uuid>
//        [--ids <uuid,uuid,…>] [--storage backup/storage] [--apply] [--yes]
//
// --ids: only these records — rows whose id or reservation_id is in the list (e.g. one deleted reservation with its
//    items, lines and payments). Nothing else of the client changes. RECOMMENDED for "something was deleted".
// Without --ids the whole client goes back to the moment of the backup — also everything done since is undone.
//
// 1. Reads the client's rows of every table from the decrypted backup (data.sql, COPY format), sends them to the
//    database (private staging, server key) and prints the PLAN: per table how many rows would be added, changed
//    and deleted, with their keys (no personal data). Missing files of the client in Storage too (--storage).
// 2. Writes nothing without --apply. With --apply it asks to type the client's slug (or --yes in a test workflow),
//    then restores in ONE transaction (triggers off — no e-mails or bell from the restore; recorded in the audit)
//    and uploads the missing files. Files that are only in the current Storage are left alone.
// Env: SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY. Never prints keys.
import { createReadStream, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const flag = (name) => args.includes(`--${name}`);
const dump = opt("dump");
const tenant = opt("tenant");
const storage = opt("storage");
const ids = opt("ids")
  ?.split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
if (!dump || !tenant || !url || !key) {
  console.error(
    "Použitie: node --env-file=.env.local scripts/restore-tenant.mjs --dump <data.sql> --tenant <uuid> [--ids <uuid,…>] [--storage <priečinok>] [--apply] [--yes]",
  );
  process.exit(2);
}
if (!/^[0-9a-f-]{36}$/.test(tenant)) {
  console.error("--tenant musí byť UUID klienta.");
  process.exit(2);
}
const db = createClient(url, key, { auth: { persistSession: false } });

/** A value of a COPY text row: \N is null, backslash escapes as pg_dump writes them. */
export function copyValue(raw) {
  if (raw === "\\N") return null;
  return raw.replace(/\\(x[0-9a-fA-F]{1,2}|[0-7]{1,3}|.)/g, (_, e) => {
    if (e[0] === "x") return String.fromCharCode(parseInt(e.slice(1), 16));
    if (/^[0-7]/.test(e)) return String.fromCharCode(parseInt(e, 8));
    return { b: "\b", f: "\f", n: "\n", r: "\r", t: "\t", v: "\v" }[e] ?? e;
  });
}

const { data: info, error: tenantError } = await db
  .from("tenants")
  .select("id, name, slug")
  .eq("id", tenant)
  .maybeSingle();
if (tenantError || !info) {
  console.error("Klient s týmto UUID v cieľovej databáze nie je.");
  process.exit(1);
}
const { data: tables, error: tablesError } = await db.rpc("restore_tables");
if (tablesError) throw new Error(tablesError.message);
const restorable = new Set(tables);

// 1. The client's rows of the backup.
const rowsByTable = new Map();
let current = null;
const lines = createInterface({ input: createReadStream(dump, "utf8"), crlfDelay: Infinity });
for await (const line of lines) {
  if (current) {
    if (line === "\\.") {
      current = null;
      continue;
    }
    const cells = line.split("\t");
    if (cells[current.tenantIndex] !== tenant) continue;
    const row = {};
    current.columns.forEach((c, i) => (row[c] = copyValue(cells[i])));
    rowsByTable.get(current.table).push(row);
    continue;
  }
  const m = /^COPY "?(\w+)"?\."?(\w+)"? \((.+)\) FROM stdin;$/.exec(line);
  if (!m || m[1] !== "public" || !restorable.has(m[2])) continue;
  const columns = m[3].split(", ").map((c) => c.replace(/^"|"$/g, ""));
  const tenantIndex = columns.indexOf("tenant_id");
  if (tenantIndex < 0) continue;
  current = { table: m[2], columns, tenantIndex };
  rowsByTable.set(m[2], []);
}
if (rowsByTable.size === 0) {
  console.error("V súbore nie sú dáta tabuliek klienta — je to data.sql zo zálohy?");
  process.exit(1);
}

const session = randomUUID();
let staged = 0;
for (const [table, rows] of rowsByTable) {
  for (let i = 0; i === 0 || i < rows.length; i += 500) {
    const { error } = await db.rpc("restore_stage", {
      p_session: session,
      p_table: table,
      p_rows: rows.slice(i, i + 500),
    });
    if (error) throw new Error(`${table}: ${error.message}`);
  }
  staged += rows.length;
}

// Files of the client that the backup has and the current Storage does not.
async function listAll(bucket, prefix) {
  const out = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await db.storage
      .from(bucket)
      .list(prefix, { limit: 1000, offset, sortBy: { column: "name", order: "asc" } });
    if (error) throw new Error(`${bucket}/${prefix}: ${error.message}`);
    for (const e of data) {
      const path = prefix ? `${prefix}/${e.name}` : e.name;
      if (e.id) out.push(path);
      else out.push(...(await listAll(bucket, path)));
    }
    if (data.length < 1000) break;
  }
  return out;
}
let missingFiles = [];
if (storage && !ids) {
  const manifest = JSON.parse(readFileSync(join(storage, "manifest.json"), "utf8")).filter((f) =>
    f.path.startsWith(`${tenant}/`),
  );
  const present = new Set();
  for (const bucket of new Set(manifest.map((f) => f.bucket)))
    for (const p of await listAll(bucket, tenant)) present.add(`${bucket}/${p}`);
  missingFiles = manifest.filter((f) => !present.has(`${f.bucket}/${f.path}`));
}

// 2. The plan.
const { data: plan, error: planError } = await db.rpc("restore_plan", {
  p_session: session,
  p_tenant: tenant,
  p_apply: false,
  p_ids: ids ?? null,
});
if (planError) {
  await db.rpc("restore_discard", { p_session: session });
  throw new Error(planError.message);
}
console.log(`\nObnova klienta ${info.name} (${info.slug}) zo zálohy ${dump}`);
console.log(`Riadkov klienta v zálohe: ${staged} v ${rowsByTable.size} tabuľkách.`);
console.log(
  ids
    ? `Len vybrané záznamy (${ids.length}) a ich riadky — nič iné sa nezmení.\n`
    : "CELÝ KLIENT — vráti sa do stavu zálohy; zmeny urobené odvtedy sa stratia.\n",
);
const entries = Object.entries(plan ?? {});
if (entries.length === 0 && missingFiles.length === 0) {
  console.log("Žiadny rozdiel — dáta klienta sú rovnaké ako v zálohe.");
  await db.rpc("restore_discard", { p_session: session });
  process.exit(0);
}
let total = 0;
for (const [table, p] of entries) {
  total += p.add + p.change + p.delete;
  console.log(
    `  ${table.padEnd(28)} pridať ${String(p.add).padStart(4)}  zmeniť ${String(p.change).padStart(4)}  zmazať ${String(p.delete).padStart(4)}`,
  );
  for (const [what, keys] of Object.entries(p.samples ?? {}))
    if (keys.length)
      console.log(`      ${what}: ${keys.join(", ")}${keys.length === 5 ? " …" : ""}`);
}
if (missingFiles.length)
  console.log(`  súbory v úložisku              nahrať ${missingFiles.length}`);
console.log(
  `\nSpolu ${total} zmien v riadkoch${missingFiles.length ? `, ${missingFiles.length} súborov` : ""}.`,
);

if (!flag("apply")) {
  console.log("\nNič sa nezapísalo (plán). Obnova: pridajte --apply.");
  await db.rpc("restore_discard", { p_session: session });
  process.exit(0);
}
if (!flag("yes")) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise((r) =>
    rl.question(`\nZapísať? Napíšte slug klienta (${info.slug}) na potvrdenie: `, r),
  );
  rl.close();
  if (answer.trim() !== info.slug) {
    console.log("Nepotvrdené — nič sa nezapísalo.");
    await db.rpc("restore_discard", { p_session: session });
    process.exit(1);
  }
}
const { error: applyError } = await db.rpc("restore_plan", {
  p_session: session,
  p_tenant: tenant,
  p_apply: true,
  p_ids: ids ?? null,
});
if (applyError) {
  await db.rpc("restore_discard", { p_session: session });
  throw new Error(`Obnova zlyhala, nič sa nezmenilo: ${applyError.message}`);
}
let uploaded = 0;
for (const f of missingFiles) {
  const file = join(storage, f.bucket, f.path);
  if (!existsSync(file)) continue;
  const { error } = await db.storage
    .from(f.bucket)
    .upload(f.path, readFileSync(file), { upsert: false });
  if (error) console.error(`  ${f.bucket}/${f.path}: ${error.message}`);
  else uploaded++;
}
console.log(
  `\nObnovené: ${total} zmien v riadkoch${missingFiles.length ? `, nahraných ${uploaded} z ${missingFiles.length} súborov` : ""}. Zapísané v audite (tenant.restored).`,
);
