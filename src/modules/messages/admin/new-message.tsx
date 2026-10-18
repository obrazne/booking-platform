"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PANEL_PARAM, panelValue } from "@/core/admin/panel-param";

export type NewMessageTarget = {
  id: string;
  number: string;
  guestName: string;
  /** "12. 6. – 15. 6. 2027" */
  dates: string;
  /** Already has a conversation (it is in the inbox). */
  hasThread: boolean;
};

/**
 * "Nová správa" in the inbox (Martin 17. 10.): choose a direct reservation, its panel opens on the tab Správy — a
 * conversation always belongs to one reservation.
 */
export function NewMessageButton({ targets }: { targets: NewMessageTarget[] }) {
  const t = useTranslations("modules.messages.admin.inbox");
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  // The panel opens after the window closed — while it is open, everything beside it is hidden (modal).
  const chosen = useRef<string | null>(null);
  const openPanel = (id: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set(PANEL_PARAM, panelValue("reservation", id));
    url.searchParams.set("tab", "messages");
    window.history.pushState(null, "", url.pathname + url.search);
  };
  const needle = q.trim().toLocaleLowerCase();
  const list = needle
    ? targets.filter(
        (r) => r.guestName.toLocaleLowerCase().includes(needle) || r.number.includes(needle),
      )
    : targets;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="bg-primary text-primary-foreground inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-sm font-bold"
        >
          <Plus className="size-4" /> {t("newMessage")}
        </button>
      </DialogTrigger>
      <DialogContent
        onCloseAutoFocus={(e) => {
          if (!chosen.current) return;
          e.preventDefault();
          openPanel(chosen.current);
          chosen.current = null;
        }}
        className="grid max-h-[85vh] grid-rows-[auto_auto_minmax(0,1fr)_auto] gap-4 sm:max-w-lg"
      >
        <div className="grid gap-1">
          <DialogTitle className="text-ink text-xl font-extrabold tracking-[-0.02em]">
            {t("newTitle")}
          </DialogTitle>
          <DialogDescription className="text-sm text-[#5a6672]">{t("newLead")}</DialogDescription>
        </div>
        <label className="field-box text-muted-foreground flex min-h-11 items-center gap-2.5 rounded-full px-3.5 text-sm">
          <Search className="size-4 shrink-0" />
          <input
            type="search"
            value={q}
            autoFocus
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("newSearch")}
            aria-label={t("newSearch")}
            data-field="bare"
            className="text-ink min-w-0 flex-1 bg-transparent outline-none"
          />
        </label>
        <ul className="border-line -mx-1 overflow-y-auto border-t px-1" aria-label={t("newTitle")}>
          {list.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => {
                  chosen.current = r.id;
                  setOpen(false);
                }}
                className="border-line grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 border-b px-2 py-3 text-left hover:bg-[#fbfaf7]"
              >
                <span className="grid min-w-0 gap-0.5">
                  <span className="text-ink truncate text-[15px] font-bold">{r.guestName}</span>
                  <span className="text-[13px] text-[#5a6672]">{r.dates}</span>
                </span>
                <span className="grid justify-items-end gap-0.5">
                  <span className="font-mono text-[11px] text-[#6b7480]">{r.number}</span>
                  {r.hasThread ? (
                    <span className="text-xs text-[#2f5d50]">{t("hasThread")}</span>
                  ) : null}
                </span>
              </button>
            </li>
          ))}
          {list.length === 0 ? (
            <li className="py-6 text-sm text-[#5a6672]">{t("newEmpty")}</li>
          ) : null}
        </ul>
        <p className="text-xs text-[#5a6672]">{t("newNote")}</p>
      </DialogContent>
    </Dialog>
  );
}
