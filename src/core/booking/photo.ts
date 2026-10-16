/** Public URL of a property photo in Supabase Storage. */
export function photoUrl(storagePath: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/property-photos/${storagePath}`;
}
