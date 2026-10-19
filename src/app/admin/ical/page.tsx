import { redirect } from "next/navigation";

/** Since Z69 the calendars of the portals are in Nastavenia › Prepojenia. */
export default function IcalPage() {
  redirect("/admin/settings?tab=prepojenia");
}
