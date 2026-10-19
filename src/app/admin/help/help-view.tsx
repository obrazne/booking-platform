"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ChevronDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { rateHelp, sendSupportRequest, type SupportState } from "@/core/help/actions";
import type { HelpTopic } from "@/core/help/faqs";
import { matches } from "@/core/search/registry";
import { cn } from "@/lib/utils";

type Faq = {
  id: string;
  topic: HelpTopic;
  title: string;
  steps: string[];
  go: string;
  href: string;
};

export function HelpView({
  faqs,
  topics,
  open: openId,
  context,
}: {
  faqs: Faq[];
  topics: { key: HelpTopic; label: string }[];
  open: string;
  context: { tenant: string; user: string; page: string };
}) {
  const t = useTranslations("help");
  const [q, setQ] = useState("");
  const [topic, setTopic] = useState<HelpTopic | "">("");
  const [open, setOpen] = useState(openId);
  const [rated, setRated] = useState<Record<string, boolean>>({});
  const [state, action, sending] = useActionState<SupportState, FormData>(sendSupportRequest, null);
  const formRef = useRef<HTMLFormElement>(null);

  // A link to one question (ⓘ, search): open it and bring it into view.
  useEffect(() => {
    if (openId) document.getElementById(`faq-${openId}`)?.scrollIntoView({ block: "center" });
  }, [openId]);
  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  const list = useMemo(() => {
    const query = q.trim();
    return faqs
      .filter((f) => !topic || f.topic === topic)
      .map((f) => ({
        f,
        score: query
          ? matches(f.title, query) * 3 + matches(`${f.title} ${f.steps.join(" ")}`, query)
          : 1,
      }))
      .filter((x) => x.score > 0)
      .sort((a, b) => (q.trim() ? b.score - a.score : 0))
      .map((x) => x.f);
  }, [faqs, q, topic]);
  const label = (key: HelpTopic) => topics.find((x) => x.key === key)?.label ?? key;

  const chip = (on: boolean) =>
    cn(
      "inline-flex min-h-10 items-center gap-2 rounded-full border px-3.5 text-[13px] font-medium transition-colors",
      on
        ? "border-ink bg-ink text-white"
        : "border-input text-foreground bg-background hover:bg-muted",
    );

  return (
    <>
      <div className="grid max-w-[760px] gap-2.5">
        <span className="kicker text-brand-secondary">{t("kicker")}</span>
        <h1 className="text-ink text-[28px] leading-[1.1] font-extrabold tracking-[-0.03em] md:text-4xl">
          {t("title")} <span className="text-[#8b929b]">{t("titleSoft")}</span>
        </h1>
        <label className="field-box text-muted-foreground mt-2 flex min-h-[52px] items-center gap-2.5 rounded-full px-4">
          <Search className="size-4 shrink-0" aria-hidden />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label={t("searchLabel")}
            placeholder={t("searchPlaceholder")}
            data-field="bare"
            className="text-ink min-w-0 flex-1 bg-transparent text-base outline-none"
          />
        </label>
      </div>

      <div role="group" aria-label={t("topicsLabel")} className="flex flex-wrap gap-2">
        <button
          type="button"
          aria-pressed={!topic}
          onClick={() => setTopic("")}
          className={chip(!topic)}
        >
          {t("all")}
          <span className="font-mono text-[11px] opacity-70">{faqs.length}</span>
        </button>
        {topics.map((x) => {
          const count = faqs.filter((f) => f.topic === x.key).length;
          if (!count) return null;
          return (
            <button
              key={x.key}
              type="button"
              aria-pressed={topic === x.key}
              onClick={() => setTopic(x.key)}
              className={chip(topic === x.key)}
            >
              {x.label}
              <span className="font-mono text-[11px] opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
        <section aria-label={t("questions")} className="surface overflow-hidden">
          {list.length === 0 ? (
            <p className="px-6 py-5 text-sm text-[#5a6672]" role="status">
              {t("none")}
            </p>
          ) : (
            list.map((f) => {
              const isOpen = open === f.id;
              const panel = `faq-${f.id}-panel`;
              return (
                <div key={f.id} id={`faq-${f.id}`} className="border-hair border-b last:border-b-0">
                  <h2 className="m-0">
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={panel}
                      onClick={() => setOpen(isOpen ? "" : f.id)}
                      className={cn(
                        "flex min-h-[58px] w-full items-center gap-4 px-5 py-3 text-left transition-colors hover:bg-[#faf9f6] md:px-6",
                        isOpen && "bg-[#faf9f6]",
                      )}
                    >
                      <span className="text-ink flex-1 text-[15px] font-medium">{f.title}</span>
                      <span className="hidden shrink-0 text-xs text-[#5a6672] sm:inline">
                        {label(f.topic)}
                      </span>
                      <ChevronDown
                        aria-hidden
                        className={cn(
                          "size-4 shrink-0 text-[#5a6672] transition-transform",
                          isOpen && "rotate-180",
                        )}
                      />
                    </button>
                  </h2>
                  {isOpen ? (
                    <div id={panel} className="grid gap-3 bg-[#faf9f6] px-5 pb-5 md:px-6">
                      <ol className="grid gap-3">
                        {f.steps.map((s, i) => (
                          <li key={i} className="flex items-baseline gap-3">
                            <span className="inline-flex size-[22px] shrink-0 items-center justify-center rounded-full bg-[#e6efeb] text-xs font-bold text-[#2f5d50]">
                              {i + 1}
                            </span>
                            <span className="text-[14.5px] leading-relaxed text-[#3b3d42]">
                              {s}
                            </span>
                          </li>
                        ))}
                      </ol>
                      <div className="flex flex-wrap items-center gap-4 pt-1">
                        <Button asChild size="sm" className="font-bold">
                          <Link href={f.href}>{f.go}</Link>
                        </Button>
                        <span className="text-[13px] text-[#5a6672]" role="status">
                          {f.id in rated ? (
                            rated[f.id] ? (
                              t("thanks")
                            ) : (
                              t("thanksNo")
                            )
                          ) : (
                            <>
                              {t("helped")}{" "}
                              {[true, false].map((v) => (
                                <button
                                  key={String(v)}
                                  type="button"
                                  onClick={async () => {
                                    if (await rateHelp(f.id, v))
                                      setRated((r) => ({ ...r, [f.id]: v }));
                                  }}
                                  className="text-ink px-1 font-medium underline underline-offset-2"
                                >
                                  {v ? t("yes") : t("no")}
                                </button>
                              ))}
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </section>

        <aside
          id="napiste"
          className="surface grid scroll-mt-24 gap-4 p-6"
          aria-labelledby="napiste-title"
        >
          <div className="grid gap-1.5">
            <h2 id="napiste-title" className="text-ink text-lg font-bold">
              {t("form.title")}
            </h2>
            <p className="text-sm leading-relaxed text-[#5a6672]">{t("form.lead")}</p>
          </div>
          <form ref={formRef} action={action} className="grid gap-4">
            <input type="hidden" name="page" value={context.page} />
            <label className="grid gap-1.5">
              <span className="text-ink text-[13px] font-medium">{t("form.message")}</span>
              <textarea
                name="message"
                rows={5}
                required
                maxLength={5000}
                placeholder={t("form.placeholder")}
                className="field-box text-ink w-full resize-y rounded-[10px] px-3.5 py-3 text-sm leading-normal"
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-ink text-[13px] font-medium">{t("form.image")}</span>
              <input
                type="file"
                name="image"
                accept="image/jpeg,image/png,image/webp"
                className="text-[13px] text-[#3b3d42] file:mr-3 file:rounded-full file:border file:border-[#c9c5ba] file:bg-white file:px-3 file:py-1.5 file:text-[13px]"
              />
              <span className="text-xs text-[#5a6672]">{t("form.imageHint")}</span>
            </label>
            <div className="grid gap-1 rounded-[10px] bg-[#f4f3ef] px-3.5 py-3 text-[12.5px] leading-normal text-[#5a6672]">
              <span className="font-medium text-[#3b3d42]">{t("form.context")}</span>
              <span>{t("form.contextLine", context)}</span>
            </div>
            {state ? (
              <p
                role="status"
                className={cn("text-sm", state.ok ? "text-[#2f5d50]" : "text-destructive")}
              >
                {state.message}
              </p>
            ) : null}
            <Button type="submit" disabled={sending} className="font-bold">
              {t("form.send")}
            </Button>
          </form>
        </aside>
      </div>
    </>
  );
}
