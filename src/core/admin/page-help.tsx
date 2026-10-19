import "server-only";
import { getTranslations } from "next-intl/server";
import { helpHref } from "@/core/help/faqs";
import { InfoTip, type InfoTipText } from "./info-tip";

type Kind = "pages" | "fields";

/** Words of one ⓘ from the translations (`help.pages.<id>` / `help.fields.<id>`: title, text, optional faq + more). */
export async function helpText(kind: Kind, id: string): Promise<InfoTipText> {
  const t = await getTranslations("help");
  const key = `${kind}.${id}`;
  const has = (k: string) => t.has(`${key}.${k}` as never);
  const get = (k: string) => t(`${key}.${k}` as never);
  return {
    title: get("title"),
    text: get("text"),
    more: has("faq")
      ? {
          href: helpHref(get("faq")),
          label: has("more") ? get("more") : t("pages.moreDefault" as never),
        }
      : undefined,
  };
}

/** ⓘ right after a page title (rule 8): what the page is and when to use it. */
export async function PageHelp({ id }: { id: string }) {
  const [t, text] = await Promise.all([getTranslations("help"), helpText("pages", id)]);
  return <InfoTip {...text} label={t("pages.label" as never, { title: text.title } as never)} />;
}

/** Smaller ⓘ next to the label of a field that needs explaining. */
export async function FieldHelp({ id }: { id: string }) {
  const [t, text] = await Promise.all([getTranslations("help"), helpText("fields", id)]);
  return (
    <InfoTip
      {...text}
      size="field"
      label={t("pages.label" as never, { title: text.title } as never)}
    />
  );
}

/** Texts of the ⓘ of each tab for `TabHelp` — keys are the tab's path segment, values the `help.pages` ids. */
export async function tabHelpItems(tabs: Record<string, string>) {
  const t = await getTranslations("help");
  const entries = await Promise.all(
    Object.entries(tabs).map(async ([segment, id]) => {
      const text = await helpText("pages", id);
      return [
        segment,
        { ...text, label: t("pages.label" as never, { title: text.title } as never) },
      ] as const;
    }),
  );
  return Object.fromEntries(entries);
}
