import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ChevronLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getPropertyForEdit } from "../data";
import { PropertyTabs } from "./tabs";

export default async function PropertyLayout({
  children,
  params,
}: LayoutProps<"/admin/properties/[id]">) {
  const { id } = await params;
  const t = await getTranslations("properties");
  const { property } = await getPropertyForEdit(id);
  const base = `/admin/properties/${id}`;
  const tabs = [
    { href: base, label: t("tabs.details") },
    { href: `${base}/photos`, label: t("tabs.photos") },
    { href: `${base}/page`, label: t("tabs.page") },
    { href: `${base}/pricing`, label: t("tabs.pricing") },
    { href: `${base}/extras`, label: t("tabs.extras") },
    { href: `${base}/documents`, label: t("tabs.documents") },
    ...(property.booking_mode === "units"
      ? [{ href: `${base}/units`, label: t("tabs.units") }]
      : []),
  ];

  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <Link
          href="/admin/properties"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
        >
          <ChevronLeft className="size-4" /> {t("title")}
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">{property.name}</h1>
          <Badge variant={property.status === "published" ? "default" : "secondary"}>
            {t(`status.${property.status as "draft" | "published" | "archived"}`)}
          </Badge>
        </div>
      </div>
      <PropertyTabs tabs={tabs} />
      {children}
    </div>
  );
}
