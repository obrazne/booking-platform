import { getLocale, getTranslations } from "next-intl/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { DeleteButton } from "@/core/admin/delete-button";
import { ActionForm, Field, SubmitButton } from "@/core/admin/form";
import { formatDate } from "@/core/format/format";
import { addDays } from "@/core/pricing/dates";
import { createClient } from "@/lib/supabase/server";
import { createBlock, deleteBlock } from "./actions";

export default async function BlocksPage() {
  const active = await requireTenant();
  const [t, locale] = await Promise.all([getTranslations("blocks"), getLocale()]);
  const supabase = await createClient();
  const [{ data: blocks }, { data: units }] = await Promise.all([
    supabase
      .from("occupancy")
      .select("id, nights, label, unit:units(name, property:properties(name, booking_mode))")
      .eq("tenant_id", active.tenantId)
      .eq("kind", "block")
      .order("nights"),
    supabase
      .from("units")
      .select("id, name, active, property:properties(name, booking_mode)")
      .eq("tenant_id", active.tenantId)
      .eq("active", true)
      .order("name"),
  ]);
  const unitLabel = (u: {
    name: string;
    property: { name: string; booking_mode: string } | null;
  }) =>
    u.property?.booking_mode === "units"
      ? `${u.property.name} — ${u.name}`
      : (u.property?.name ?? u.name);
  const range = (nights: unknown) => {
    const m = /^\[(\d{4}-\d{2}-\d{2}),(\d{4}-\d{2}-\d{2})\)$/.exec(String(nights));
    return m
      ? `${formatDate(m[1]!, locale)} – ${formatDate(addDays(m[2]!, 0), locale)}`
      : String(nights);
  };

  return (
    <div className="grid gap-6">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">{t("title")}</h1>
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>{t("add")}</CardTitle>
          <CardDescription>{t("hint")}</CardDescription>
        </CardHeader>
        <CardContent>
          <ActionForm action={createBlock} resetOnSuccess>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("unit")} htmlFor="unit_id">
                <select
                  id="unit_id"
                  name="unit_id"
                  required
                  className="border-input bg-background h-9 rounded-md border px-3 text-sm shadow-xs"
                >
                  {(units ?? []).map((u) => (
                    <option key={u.id} value={u.id}>
                      {unitLabel(u)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t("label")} htmlFor="label">
                <Input id="label" name="label" maxLength={80} />
              </Field>
              <Field label={t("from")} htmlFor="from">
                <Input id="from" name="from" type="date" required />
              </Field>
              <Field label={t("to")} htmlFor="to">
                <Input id="to" name="to" type="date" required />
              </Field>
            </div>
            <SubmitButton>{t("add")}</SubmitButton>
          </ActionForm>
        </CardContent>
      </Card>
      <div className="border-border overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("unit")}</TableHead>
              <TableHead>{t("from")}</TableHead>
              <TableHead>{t("label")}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(blocks ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground py-8 text-center">
                  {t("empty")}
                </TableCell>
              </TableRow>
            ) : (
              blocks!.map((b) => (
                <TableRow key={b.id}>
                  <TableCell>{b.unit ? unitLabel(b.unit) : ""}</TableCell>
                  <TableCell>{range(b.nights)}</TableCell>
                  <TableCell className="text-muted-foreground">{b.label}</TableCell>
                  <TableCell className="text-right">
                    <DeleteButton action={deleteBlock.bind(null, b.id)} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
