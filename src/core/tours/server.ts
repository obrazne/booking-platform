import "server-only";
import { cache } from "react";
import { getCurrentUser } from "@/core/auth/session";
import { createClient } from "@/lib/supabase/server";
import { tourIsNew, type TourKey } from "./tours";

/** Should the tour open by itself for the signed-in user (new version not seen yet)? */
export const tourIsNewForUser = cache(async (key: TourKey): Promise<boolean> => {
  const user = await getCurrentUser();
  if (!user) return false;
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("tours_seen")
    .eq("id", user.id)
    .maybeSingle();
  return data ? tourIsNew(key, data.tours_seen) : false;
});
