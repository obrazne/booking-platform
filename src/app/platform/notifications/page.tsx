import { getTranslations } from "next-intl/server";
import { Shield } from "lucide-react";
import { PageBody, PageHeader } from "@/core/admin/page-header";
import { isPlatformAdmin } from "@/core/auth/session";
import { PLATFORM_KINDS } from "@/core/notifications/types";
import { loadPushState } from "@/core/push/load";
import { PushSettings } from "@/core/push/push-settings";
import { DEFAULT_PLATFORM_PUSH_KINDS } from "@/core/push/recipients";

/** Control center — Upozornenia (Z33): platform notifications on this device; the platform admin has push always. */
export default async function PlatformNotifications() {
  if (!(await isPlatformAdmin())) return null;
  const [t, tp, push] = await Promise.all([
    getTranslations("platform"),
    getTranslations("push"),
    loadPushState("platform", null),
  ]);
  return (
    <div data-bleed>
      <PageHeader
        help="platformNotifications"
        kicker={
          <span className="inline-flex items-center gap-1.5">
            <Shield className="size-3.5" /> {t("title")}
          </span>
        }
        title={tp("pageTitle")}
      />
      <PageBody className="grid gap-5">
        <section aria-labelledby="push-title" className="surface grid gap-3 p-5">
          <h2 id="push-title" className="text-ink text-base font-bold">
            {tp("title")}
          </h2>
          <p className="text-muted-foreground max-w-prose text-sm">{tp("introPlatform")}</p>
          <PushSettings
            scope="platform"
            publicKey={push.publicKey}
            devices={push.devices}
            kindOptions={PLATFORM_KINDS.map((kind) => ({
              kind,
              label: tp(`platformKinds.${kind}`),
            }))}
            defaultKinds={DEFAULT_PLATFORM_PUSH_KINDS}
          />
        </section>
      </PageBody>
    </div>
  );
}
