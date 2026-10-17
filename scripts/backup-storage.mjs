// Downloads every file of every Storage bucket of a Supabase project into a folder, with a manifest (Z50 — nightly
// backup of staging). Usage: SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… node scripts/backup-storage.mjs <folder>
// Never prints keys; prints only the number of files and bytes per bucket.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const out = process.argv[2];
if (!url || !key || !out) {
  console.error("SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and the target folder are required.");
  process.exit(2);
}
const db = createClient(url, key, { auth: { persistSession: false } });

/** All files under a prefix (folders are entries without an id). */
async function listAll(bucket, prefix = "") {
  const files = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await db.storage
      .from(bucket)
      .list(prefix, { limit: 1000, offset, sortBy: { column: "name", order: "asc" } });
    if (error) throw new Error(`${bucket}/${prefix}: ${error.message}`);
    for (const entry of data) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.id === null) files.push(...(await listAll(bucket, path)));
      else files.push({ path, size: entry.metadata?.size ?? null });
    }
    if (data.length < 1000) break;
  }
  return files;
}

const { data: buckets, error } = await db.storage.listBuckets();
if (error) throw new Error(`buckets: ${error.message}`);
const manifest = [];
for (const bucket of buckets) {
  const files = await listAll(bucket.name);
  let bytes = 0;
  for (const f of files) {
    const { data, error: e } = await db.storage.from(bucket.name).download(f.path);
    if (e) throw new Error(`${bucket.name}/${f.path}: ${e.message}`);
    const buffer = Buffer.from(await data.arrayBuffer());
    const target = join(out, bucket.name, f.path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, buffer);
    bytes += buffer.length;
    manifest.push({
      bucket: bucket.name,
      path: f.path,
      size: buffer.length,
      public: bucket.public,
    });
  }
  console.log(`${bucket.name}: ${files.length} files, ${(bytes / 1024 / 1024).toFixed(1)} MB`);
}
writeFileSync(join(out, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log(`Storage: ${manifest.length} files in ${buckets.length} buckets.`);
