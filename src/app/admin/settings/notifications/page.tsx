import { redirect } from "next/navigation";

/** Since Z69 the tab Nastavenia › E-maily a upozornenia. */
export default function NotificationSettingsPage() {
  redirect("/admin/settings?tab=upozornenia");
}
