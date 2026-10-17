"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createTenant, setModule, setTenantStatus, type FormState } from "./actions";

const initial: FormState = { error: null };

function FormMessage({ state }: { state: FormState }) {
  const t = useTranslations();
  if (state.error) {
    const key = state.error === "error" ? "common.error" : (`platform.${state.error}` as const);
    return (
      <p role="alert" className="text-destructive text-sm">
        {t(key)}
      </p>
    );
  }
  if (state.ok) return <p className="text-muted-foreground text-sm">{t("common.saved")}</p>;
  return null;
}

export function NewTenantForm() {
  const t = useTranslations("platform");
  const [state, action, pending] = useActionState(createTenant, initial);
  return (
    <form action={action} className="grid max-w-lg gap-4">
      <div className="grid gap-2">
        <Label htmlFor="name">{t("name")}</Label>
        <Input id="name" name="name" required maxLength={120} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="slug">{t("slug")}</Label>
        <Input id="slug" name="slug" required pattern="[a-z0-9]([a-z0-9-]*[a-z0-9])?" />
        <p className="text-muted-foreground text-xs">{t("slugHint")}</p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="hostname">{t("domain")}</Label>
        <Input id="hostname" name="hostname" required />
        <p className="text-muted-foreground text-xs">{t("domainHint")}</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="country">{t("country")}</Label>
          <Input id="country" name="country" defaultValue="SK" maxLength={2} required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="currency">{t("currency")}</Label>
          <Input id="currency" name="currency" defaultValue="EUR" maxLength={3} required />
        </div>
      </div>
      <FormMessage state={state} />
      <Button type="submit" disabled={pending} className="justify-self-start">
        {t("create")}
      </Button>
    </form>
  );
}

export function ModuleSwitchForm({
  tenantId,
  moduleKey,
  label,
  status,
  trialEndsAt,
}: {
  tenantId: string;
  moduleKey: string;
  label: string;
  status: "trial" | "active" | "off";
  trialEndsAt: string | null;
}) {
  const t = useTranslations("platform");
  const tc = useTranslations("common");
  const [state, action, pending] = useActionState(setModule, initial);
  const [value, setValue] = useState(status);
  return (
    // Module row (v1.1): name and state, the trial end on the second line, Save at the row.
    <form action={action} className="surface grid gap-2.5 px-4 py-3">
      <input type="hidden" name="tenantId" value={tenantId} />
      <input type="hidden" name="moduleKey" value={moduleKey} />
      <input type="hidden" name="status" value={value} />
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="text-ink min-w-0 flex-1 font-bold">{label}</span>
        <Select value={value} onValueChange={(v) => setValue(v as typeof value)}>
          <SelectTrigger aria-label={`${t("status")}: ${label}`} className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(["trial", "active", "off"] as const).map((s) => (
              <SelectItem key={s} value={s}>
                {t(`moduleStatus.${s}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {value === "trial" ? (
          <label className="text-muted-foreground flex items-center gap-2 text-sm">
            {t("trialEndsAt")}
            <Input
              type="date"
              name="trialEndsAt"
              defaultValue={trialEndsAt ?? ""}
              className="w-44"
            />
          </label>
        ) : null}
        <Button type="submit" variant="outline" disabled={pending} className="ml-auto">
          {tc("save")}
        </Button>
      </div>
      <FormMessage state={state} />
    </form>
  );
}

export function TenantStatusForm({
  tenantId,
  status,
}: {
  tenantId: string;
  status: "onboarding" | "active" | "suspended";
}) {
  const t = useTranslations("platform");
  const tc = useTranslations("common");
  const [state, action, pending] = useActionState(setTenantStatus, initial);
  const [value, setValue] = useState(status);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="tenantId" value={tenantId} />
      <input type="hidden" name="status" value={value} />
      <Select value={value} onValueChange={(v) => setValue(v as typeof value)}>
        <SelectTrigger className="w-44" aria-label={t("status")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(["onboarding", "active", "suspended"] as const).map((s) => (
            <SelectItem key={s} value={s}>
              {t(`statuses.${s}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button type="submit" variant="outline" disabled={pending || value === status}>
        {tc("save")}
      </Button>
      <FormMessage state={state} />
    </form>
  );
}

/** "Priradiť klientovi" (v1.2): a module for a client that does not have it yet — on trial with an end date, or active. */
export function AssignModuleForm({
  moduleKey,
  label,
  tenants,
}: {
  moduleKey: string;
  label: string;
  tenants: { id: string; name: string }[];
}) {
  const t = useTranslations("platform");
  const [state, action, pending] = useActionState(setModule, initial);
  const [tenantId, setTenantId] = useState("");
  const [value, setValue] = useState<"trial" | "active">("trial");
  if (tenants.length === 0) return null;
  return (
    <form action={action} className="grid gap-2.5 rounded-lg bg-[#f4f3ef] px-4 py-3">
      <input type="hidden" name="tenantId" value={tenantId} />
      <input type="hidden" name="moduleKey" value={moduleKey} />
      <input type="hidden" name="status" value={value} />
      <span className="text-ink text-sm font-bold">{t("assign.title", { module: label })}</span>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={tenantId} onValueChange={setTenantId}>
          <SelectTrigger aria-label={t("assign.client")} className="w-56">
            <SelectValue placeholder={t("assign.client")} />
          </SelectTrigger>
          <SelectContent>
            {tenants.map((x) => (
              <SelectItem key={x.id} value={x.id}>
                {x.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={value} onValueChange={(v) => setValue(v as typeof value)}>
          <SelectTrigger aria-label={`${t("status")}: ${label}`} className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(["trial", "active"] as const).map((s) => (
              <SelectItem key={s} value={s}>
                {t(`moduleStatus.${s}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {value === "trial" ? (
          <label className="text-muted-foreground flex items-center gap-2 text-sm">
            {t("trialEndsAt")}
            <Input type="date" name="trialEndsAt" className="w-44" />
          </label>
        ) : null}
        <Button type="submit" disabled={pending || !tenantId} className="font-bold">
          {t("assign.submit")}
        </Button>
      </div>
      <FormMessage state={state} />
    </form>
  );
}
