import { PageHelp } from "@/core/admin/page-help";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireTenant } from "@/core/admin/action";
import { isPlatformAdmin } from "@/core/auth/session";
import { ActionForm, Field, SubmitButton } from "@/core/admin/form";
import { createClient } from "@/lib/supabase/server";
import { createProperty } from "./actions";

type Status = "draft" | "published" | "archived";

export default async function PropertiesPage() {
  const active = await requireTenant();
  const [t, admin] = await Promise.all([getTranslations("properties"), isPlatformAdmin()]);
  const supabase = await createClient();
  const { data } = await supabase
    .from("properties")
    .select("id, name, slug, status, booking_mode, max_guests, city, photos(count), units(count)")
    .eq("tenant_id", active.tenantId)
    .order("sort")
    .order("name");

  return (
    <div className="grid gap-6">
      <div className="flex items-center gap-2.5">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <PageHelp id="properties" />
      </div>
      <div className="border-border overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("fields.name")}</TableHead>
              <TableHead>{t("fields.city")}</TableHead>
              <TableHead>{t("bookingMode.label")}</TableHead>
              <TableHead>{t("fields.maxGuests")}</TableHead>
              <TableHead>{t("tabs.photos")}</TableHead>
              <TableHead>{t("fields.statusLabel")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground py-8 text-center">
                  {t("empty")}
                </TableCell>
              </TableRow>
            ) : (
              data!.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <Link
                      href={`/admin/properties/${p.id}`}
                      className="font-medium hover:underline"
                    >
                      {p.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{p.city}</TableCell>
                  <TableCell>
                    {t(`bookingMode.${p.booking_mode as "whole" | "units"}`)}
                    {p.booking_mode === "units" ? ` (${p.units[0]?.count ?? 0})` : ""}
                  </TableCell>
                  <TableCell>{p.max_guests}</TableCell>
                  <TableCell>{p.photos[0]?.count ?? 0}</TableCell>
                  <TableCell>
                    <Badge variant={p.status === "published" ? "default" : "secondary"}>
                      {t(`status.${p.status as Status}`)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* New property: only the platform admin for now (v1.1 — an empty property would look bare on the web,
          and the number of properties may belong to the package). */}
      {admin ? (
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle>{t("new")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ActionForm action={createProperty} bar={false}>
              <Field label={t("fields.name")} htmlFor="name">
                <Input id="name" name="name" required maxLength={120} />
              </Field>
              <Field label={t("fields.slug")} hint={t("fields.slugHint")} htmlFor="slug">
                <Input id="slug" name="slug" required pattern="[a-z0-9]([a-z0-9-]*[a-z0-9])?" />
              </Field>
              <SubmitButton>{t("create")}</SubmitButton>
            </ActionForm>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
