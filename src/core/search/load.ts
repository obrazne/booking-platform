import "server-only";
import { getTranslations } from "next-intl/server";
import { CORE_FAQS, type HelpFaq, type HelpTopic } from "@/core/help/faqs";
import type { ModuleManifest } from "@/core/modules/types";
import { ADMIN_REGISTRY, entryHref, PLATFORM_REGISTRY, type RegistryEntry } from "./registry";

/** One row the search can find: words to match, what to show, where it leads. */
export type IndexItem = { id: string; title: string; where: string; terms: string; href: string };
/** A question of Pomoc with its steps. */
export type HelpItem = IndexItem & { topic: HelpTopic; steps: string[]; go: string };

/** Keys are put together from the registers (checked by the test of the registers). */
type Translate = ((key: string, values?: Record<string, string | number>) => string) & {
  raw: (key: string) => unknown;
};
const translator = async () => (await getTranslations()) as unknown as Translate;

function hrefOf(e: Pick<RegistryEntry, "href" | "field">, property: string | null) {
  // Several properties: the list first (as the menu).
  if (!property && e.href.includes("{property}")) return "/admin/properties";
  return entryHref(e, property ?? "");
}

/** Questions of Pomoc for a client: the core ones and those of the switched-on modules. */
export async function loadHelp(
  modules: readonly ModuleManifest[],
  property: string | null,
): Promise<HelpItem[]> {
  const t = await translator();
  const keys = new Set(modules.map((m) => m.key));
  const sources: { faq: HelpFaq; ns: string }[] = [
    ...CORE_FAQS.filter((f) => !f.module || keys.has(f.module)).map((faq) => ({
      faq,
      ns: "help.faqs",
    })),
    ...modules.flatMap((m) => (m.helpFaqs ?? []).map((faq) => ({ faq, ns: `${m.messages}.help` }))),
  ];
  return sources.map(({ faq, ns }) => {
    const key = (k: string) => `${ns}.${faq.id}.${k}`;
    const steps = t.raw(key("steps")) as string[];
    const topic = t(`help.topics.${faq.topic}`);
    return {
      id: faq.id,
      topic: faq.topic,
      title: t(key("q")),
      where: `${t("help.nav")} › ${topic}`,
      terms: steps.join(" "),
      href: hrefOf(faq, property),
      steps,
      go: t(key("go")),
    };
  });
}

/**
 * The register of the administration for a client (Z67): its rows without the modules that are off and without
 * pages the menu does not show; the pages of the switched-on modules (their menu items) join.
 */
export async function loadAdminIndex(args: {
  modules: readonly ModuleManifest[];
  property: string | null;
  portals: boolean;
  collisions: boolean;
}): Promise<{ pages: IndexItem[]; help: HelpItem[] }> {
  const t = await translator();
  const keys = new Set(args.modules.map((m) => m.key));
  const pages: IndexItem[] = ADMIN_REGISTRY.filter(
    (e) =>
      (!e.module || keys.has(e.module)) &&
      (e.when !== "portals" || args.portals) &&
      (e.when !== "collisions" || args.collisions),
  ).map((e) => ({
    id: e.id,
    title: t(`search.entries.${e.id}.title`),
    where: t(`search.entries.${e.id}.where`),
    terms: t(`search.entries.${e.id}.terms`),
    href: hrefOf(e, args.property),
  }));
  for (const m of args.modules) {
    for (const nav of m.navItems ?? []) {
      if (pages.some((p) => p.href === nav.href)) continue;
      const title = t(`${m.messages}.${nav.labelKey}`);
      pages.push({
        id: `${m.key}:${nav.href}`,
        title,
        where: t(`nav.${nav.group}`),
        terms: t(`${m.messages}.title`),
        href: nav.href,
      });
    }
  }
  return { pages, help: await loadHelp(args.modules, args.property) };
}

/** The pages of the control center (clients are searched in the database). */
export async function loadPlatformIndex(): Promise<IndexItem[]> {
  const t = await translator();
  return PLATFORM_REGISTRY.map((e) => ({
    id: e.id,
    title: t(`search.entries.${e.id}.title`),
    where: t(`search.entries.${e.id}.where`),
    terms: t(`search.entries.${e.id}.terms`),
    href: e.href,
  }));
}
