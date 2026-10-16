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
    <form action={action} className="grid gap-3 sm:grid-cols-[1fr_10rem_10rem_auto] sm:items-end">
      <input type="hidden" name="tenantId" value={tenantId} />
      <input type="hidden" name="moduleKey" value={moduleKey} />
      <input type="hidden" name="status" value={value} />
      <span className="font-medium">{label}</span>
      <Select value={value} onValueChange={(v) => setValue(v as typeof value)}>
        <SelectTrigger aria-label={t("status")}>
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
      <Input
        type="date"
        name="trialEndsAt"
        aria-label={t("trialEndsAt")}
        defaultValue={trialEndsAt ?? ""}
        disabled={value !== "trial"}
      />
      <Button type="submit" variant="outline" disabled={pending}>
        {tc("save")}
      </Button>
      <div className="sm:col-span-4">
        <FormMessage state={state} />
      </div>
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
