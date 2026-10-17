import { getLocale, getTranslations } from "next-intl/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requireTenant } from "@/core/admin/action";
import { DeleteButton } from "@/core/admin/delete-button";
import { ExpandableList, RowState } from "@/core/admin/expandable-list";
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

      {/* Z42: from "chyba synchronizácie · Pozrieť" the owner lands here — say right away which calendar failed. */}
      {(channels ?? [])
        .filter((c) => c.active && c.last_status === "error")
        .map((c) => (
          <p
            key={c.id}
            role="status"
            className="card-warm rounded-[10px] px-4 py-3 text-sm font-normal text-[#5b3a1f]"
          >
            {t("syncFailed", {
              name: c.name,
              date: c.last_sync_at ? formatDateTime(c.last_sync_at, locale, tenant.timezone) : "—",
            })}
            {c.last_error ? ` ${t("syncFailedReason", { error: c.last_error })}` : ""}
          </p>
        ))}

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

      {/* Rule 7: imported calendars as compact rows; name and portal shown once. */}
      <ExpandableList
        heading={t("channels")}
        rows={(channels ?? []).map((c) => {
          const unit = (units ?? []).find((u) => u.id === c.unit_id);
          const source = t(`sources.${c.source as "booking" | "airbnb" | "other"}`);
          const sourceInName = c.name.toLowerCase().includes(source.toLowerCase().split(".")[0]!);
          return {
            id: c.id,
            title: c.name,
            meta: [sourceInName ? null : source, unit ? unitLabel(unit) : null]
              .filter(Boolean)
              .join(" · "),
            status: c.last_status ? (
              <RowState on={c.last_status === "ok"}>
                {t(`status.${c.last_status as "ok" | "error" | "conflict"}`)}
              </RowState>
            ) : null,
            content: (
              <div className="grid gap-3 text-sm font-normal">
                <p className="text-muted-foreground font-mono text-xs break-all">{c.import_url}</p>
                <p className="text-muted-foreground">
                  {t("lastSync")}:{" "}
                  {c.last_sync_at
                    ? formatDateTime(c.last_sync_at, locale, tenant.timezone, "short")
                    : t("never")}
                </p>
                {c.last_error ? <p className="text-[#a8432f]">{c.last_error}</p> : null}
                <div>
                  <DeleteButton action={deleteChannel.bind(null, c.id)} />
                </div>
              </div>
            ),
          };
        })}
        addLabel={t("addChannel")}
        newRow={{
          title: t("newChannel"),
          content: (
            <ActionForm action={addChannel} resetOnSuccess className="sm:grid-cols-2">
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
                <Input
                  id="import_url"
                  name="import_url"
                  type="url"
                  required
                  placeholder="https://"
                />
              </Field>
              <div>
                <SubmitButton>{tf("add")}</SubmitButton>
              </div>
            </ActionForm>
          ),
        }}
        empty={t("empty")}
      />
    </div>
  );
}
