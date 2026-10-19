import { redirect } from "next/navigation";

/** Since Z69 the team is the tab Nastavenia › Tím. */
export default function TeamPage() {
  redirect("/admin/settings?tab=tim");
}
