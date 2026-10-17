import { getTranslations } from "next-intl/server";
import { contrastRatio } from "@/core/theme/contrast";
import { rowToTheme } from "@/core/theme/load";
import { DEFAULT_THEME } from "@/core/theme/theme";
import { ThemeStyle } from "@/core/theme/theme-style";
import { loadTenantDetail, TenantHeader } from "../tenant-header";

/**
 * Client detail — Vzhľad: colours, fonts and rounding of the guest pages, previewed with the client's own name and
 * the real labels of the guest page (no placeholder text — v1.2).
 */
export default async function TenantTheme({ params }: PageProps<"/platform/tenants/[id]/theme">) {
  const { id } = await params;
  const tenant = await loadTenantDetail(id);
  const [t, tg] = await Promise.all([getTranslations("platform.detail"), getTranslations("guest")]);
  const theme = tenant.tenant_themes ? rowToTheme(tenant.tenant_themes) : DEFAULT_THEME;
  const contrast = contrastRatio(theme.primaryColor, theme.backgroundColor);
  const swatches = [
    { label: t("colorPrimary"), value: theme.primaryColor },
    { label: t("colorSecondary"), value: theme.secondaryColor },
    { label: t("colorBackground"), value: theme.backgroundColor },
  ];
  return (
    <div data-bleed>
      <TenantHeader tenant={tenant} tab="theme" />
      <div className="grid max-w-[880px] gap-6 px-5 pt-6 pb-14 md:px-10">
        <div className="surface grid gap-4 p-5 sm:grid-cols-3">
          {swatches.map((s) => (
            <div key={s.label} className="flex items-center gap-3">
              <span
                className="border-line size-9 shrink-0 rounded-lg border"
                style={{ background: s.value }}
              />
              <span className="grid">
                <span className="label-mono">{s.label}</span>
                <span className="text-ink font-mono text-sm">{s.value}</span>
              </span>
            </div>
          ))}
          <div className="grid sm:col-span-3">
            <span className="label-mono">{t("fontsRadius")}</span>
            <span className="text-ink text-sm">
              {theme.headingFont} / {theme.bodyFont} · {t("radius", { px: theme.radius })} ·{" "}
              {contrast >= 3 ? t("contrastOk") : t("contrastLow")}
            </span>
          </div>
        </div>
        <section className="grid gap-2">
          <h2 className="label-mono">{t("preview")}</h2>
          <ThemeStyle theme={theme} />
          <div
            data-tenant-theme
            className="bg-brand-background grid gap-4 rounded-[var(--radius)] border p-6 font-sans"
          >
            <p className="font-heading text-2xl font-semibold">{tenant.name}</p>
            <div className="flex flex-wrap gap-2">
              <span className="bg-primary text-primary-foreground inline-flex min-h-10 items-center rounded-[var(--radius)] px-4 text-sm font-bold">
                {tg("property.viewStay")}
              </span>
              <span className="text-primary inline-flex min-h-10 items-center rounded-[var(--radius)] border px-4 text-sm font-medium">
                {tg("v2.allPhotos")}
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
