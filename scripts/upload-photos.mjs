// Uploads local photos of a property to Supabase Storage and registers them in public.photos (idempotent).
// Usage: node --env-file=.env.local scripts/upload-photos.mjs <manifest.json>
// Manifest: { tenantId, propertyId, dir, photos: [{ file, alt, source? }] } — order = display order, first = main photo.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const [manifestPath] = process.argv.slice(2);
if (!manifestPath) throw new Error("usage: upload-photos.mjs <manifest.json>");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
});

let sort = 0;
for (const photo of manifest.photos) {
  sort += 1;
  const objectPath = `${manifest.tenantId}/${manifest.propertyId}/${path.basename(photo.file).toLowerCase()}`;
  const body = await readFile(path.join(manifest.dir, photo.file));
  const { error: upErr } = await supabase.storage
    .from("property-photos")
    .upload(objectPath, body, { contentType: "image/jpeg", upsert: true, cacheControl: "31536000" });
  if (upErr) throw upErr;
  const { error: dbErr } = await supabase.from("photos").upsert(
    {
      tenant_id: manifest.tenantId,
      property_id: manifest.propertyId,
      storage_path: objectPath,
      alt: { sk: photo.alt },
      sort,
      source: photo.source ?? null,
    },
    { onConflict: "storage_path" },
  );
  if (dbErr) throw dbErr;
  console.log(`${sort}. ${objectPath}`);
}
