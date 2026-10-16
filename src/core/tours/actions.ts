"use server";

import { createClient } from "@/lib/supabase/server";
import { TOURS, type TourKey } from "./tours";

/** Remembers that the signed-in user has seen the current version of the tour (shown again only after a new one). */
export async function markTourSeen(key: TourKey): Promise<void> {
  const tour = TOURS[key];
  if (!tour) return;
  const supabase = await createClient();
  await supabase.rpc("mark_tour_seen", { p_tour: key, p_version: tour.version });
}
