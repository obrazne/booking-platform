import { getTranslations } from "next-intl/server";
import { CalendarCheck, Check } from "lucide-react";
import { platformBrand } from "@/core/admin/brand";
import { DEFAULT_THEME } from "@/core/theme/theme";
import { ThemeStyle } from "@/core/theme/theme-style";
import { LoginForm } from "./login-form";

/** 01 Login of owners and staff (vizuál administrácie v1): accent panel on the left, form on the right. */
export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const t = await getTranslations("auth");
  const { next } = await searchParams;
  const perks = [t("perk1"), t("perk2"), t("perk3")];

  return (
    <div data-login-ui className="flex min-h-svh flex-1 flex-col bg-white font-light lg:flex-row">
      <ThemeStyle theme={DEFAULT_THEME} scope="page" />
      <section className="bg-surface-accent flex shrink-0 flex-col text-white lg:min-h-svh lg:w-[600px] lg:max-w-[45%] lg:p-14">
        <div className="flex items-center gap-3 px-5 py-4 lg:p-0">
          <span className="flex size-9 items-center justify-center rounded-lg bg-white/15">
            <CalendarCheck className="size-5" />
          </span>
          <span className="text-lg font-extrabold tracking-tight">{platformBrand.name}</span>
        </div>
        <div className="hidden flex-1 flex-col justify-center gap-6 lg:flex">
          <span className="kicker text-on-accent-muted">{t("panelKicker")}</span>
          <h1 className="text-[44px] leading-[1.08] font-extrabold tracking-[-0.03em]">
            {t("panelTitle")} <span className="text-on-accent-muted">{t("panelTitleSoft")}</span>
          </h1>
          <ul className="grid gap-3 text-base">
            {perks.map((p) => (
              <li key={p} className="flex items-center gap-3">
                <span className="flex size-6 items-center justify-center rounded-full bg-white/15">
                  <Check className="size-3.5" />
                </span>
                {p}
              </li>
            ))}
          </ul>
        </div>
        {platformBrand.supportEmail ? (
          <span className="text-on-accent-muted hidden text-sm lg:block">
            {t("support", { email: platformBrand.supportEmail })}
          </span>
        ) : null}
      </section>
      <main className="flex flex-1 items-center justify-center px-5 py-10 sm:px-10">
        <div className="grid w-full max-w-[400px] gap-7">
          <div className="grid gap-2">
            <span className="kicker text-brand-secondary">{t("kicker")}</span>
            <h2 className="text-ink text-[32px] leading-tight font-extrabold tracking-[-0.03em]">
              {t("welcome")}
            </h2>
            <p className="text-muted-foreground">{t("subtitle")}</p>
          </div>
          <LoginForm next={typeof next === "string" ? next : undefined} />
        </div>
      </main>
    </div>
  );
}
