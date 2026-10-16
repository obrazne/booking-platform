import { getLocale, getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requireTenant } from "@/core/admin/action";
import { DeleteButton } from "@/core/admin/delete-button";
import { ActionForm, Field, SubmitButton } from "@/core/admin/form";
import { formatDateTime } from "@/core/format/format";
import { getTenantInfo } from "@/core/tenant/info";
import { createClient } from "@/lib/supabase/server";
import { addChannel, deleteChannel, syncNow } from "./actions";
import { CopyField, SyncButton } from "./client";

export default async function IcalPage() {
  const active = await requireTenant();
  const [t, tf, locale, tenant] = await Promise.all([
    getTranslations("ical"),
    getTranslations("forms"),
    getLocale(),
    getTenantInfo(active.tenantId),
  ]);
  const supabase = await createClient();
  const [{ data: units }, { data: channels }, { data: domains }] = await Promise.all([
    supabase
      .from("units")
      .select("id, name, ical_export_token, property:properties(name, booking_mode)")
      .eq("tenant_id", tenant.id)
      .eq("active", true),
    supabase.from("ical_channels").select("*").eq("tenant_id", tenant.id).order("created_at"),
    supabase.from("tenant_domains").select("hostname, is_primary").eq("tenant_id", tenant.id),
  ]);
  const host =
    (domains ?? []).find((d) => d.is_primary && !d.hostname.endsWith(".localhost"))?.hostname ??
    (domains ?? []).find((d) => !d.hostname.endsWith(".localhost"))?.hostname;
  const base = host ? `https://${host}` : (process.env.APP_URL ?? "");
  const unitLabel = (u: {
    name: string;
    property: { name: string; booking_mode: string } | null;
  }) =>
    u.property?.booking_mode === "units"
      ? `${u.property.name} — ${u.name}`
      : (u.property?.name ?? u.name);
  const selectClass = "border-input bg-background h-9 rounded-md border px-3 text-sm shadow-xs";

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground max-w-2xl text-sm">{t("lead")}</p>
        </div>
        <SyncButton action={syncNow} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("export")}</CardTitle>
          <CardDescription>{t("exportHint")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          {(units ?? []).map((u) => {
            const url = `${base}/ical/${u.ical_export_token}.ics`;
            const own = (channels ?? []).filter((c) => c.unit_id === u.id);
            return (
              <div key={u.id} className="grid gap-2">
                <p className="font-medium">{unitLabel(u)}</p>
                <CopyField label={t("general")} value={url} />
                {own.map((c) => (
                  <CopyField
                    key={c.id}
                    label={t("exportFor", { name: c.name })}
                    value={`${url}?exclude=${c.id}`}
                  />
                ))}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("channels")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {(channels ?? []).length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("empty")}</p>
          ) : null}
          {(channels ?? []).map((c) => {
            const unit = (units ?? []).find((u) => u.id === c.unit_id);
            return (
              <div
                key={c.id}
                className="border-border flex flex-wrap items-center gap-3 rounded-xl border p-3 text-sm"
              >
                <div className="grid flex-1 gap-0.5">
                  <span className="font-medium">
                    {c.name} · {t(`sources.${c.source as "booking" | "airbnb" | "other"}`)}
                  </span>
                  <span className="text-muted-foreground">{unit ? unitLabel(unit) : ""}</span>
                  <span className="text-muted-foreground truncate text-xs">{c.import_url}</span>
                  {c.last_error ? (
                    <span className="text-destructive text-xs">{c.last_error}</span>
                  ) : null}
                </div>
                <div className="grid justify-items-end gap-1">
                  {c.last_status ? (
                    <Badge variant={c.last_status === "ok" ? "secondary" : "destructive"}>
                      {t(`status.${c.last_status as "ok" | "error" | "conflict"}`)}
                    </Badge>
                  ) : null}
                  <span className="text-muted-foreground text-xs">
                    {t("lastSync")}:{" "}
                    {c.last_sync_at
                      ? formatDateTime(c.last_sync_at, locale, tenant.timezone, "short")
                      : t("never")}
                  </span>
                </div>
                <DeleteButton action={deleteChannel.bind(null, c.id)} />
              </div>
            );
          })}
          <ActionForm
            action={addChannel}
            resetOnSuccess
            className="border-border border-t pt-4 sm:grid-cols-2"
          >
            <Field label={t("unit")} htmlFor="unit_id">
              <select id="unit_id" name="unit_id" className={selectClass} required>
                {(units ?? []).map((u) => (
                  <option key={u.id} value={u.id}>
                    {unitLabel(u)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("source")} htmlFor="source">
              <select id="source" name="source" className={selectClass}>
                {(["booking", "airbnb", "other"] as const).map((s) => (
                  <option key={s} value={s}>
                    {t(`sources.${s}`)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("name")} htmlFor="name">
              <Input id="name" name="name" required maxLength={80} />
            </Field>
            <Field label={t("url")} hint={t("urlHint")} htmlFor="import_url">
              <Input id="import_url" name="import_url" type="url" required placeholder="https://" />
            </Field>
            <SubmitButton>{tf("add")}</SubmitButton>
          </ActionForm>
        </CardContent>
      </Card>
    </div>
  );
}
