"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { recordRestoreTest } from "./actions";

/** "Zaznamenať skúšobnú obnovu" (Z52): a note what was tried; the date is now. */
export function RestoreTestForm() {
  const t = useTranslations("adminV1.status.backups");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  if (!open)
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-ink justify-self-start text-sm font-medium underline underline-offset-[3px]"
      >
        {t("record")}
      </button>
    );
  return (
    <div className="grid max-w-xl gap-2">
      <label className="grid gap-1 text-sm">
        <span className="text-muted-foreground">{t("note")}</span>
        <textarea
          rows={2}
          maxLength={2000}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="border-line focus:border-ink rounded-xl border bg-white px-3 py-2 outline-none"
        />
      </label>
      <span className="flex gap-4 text-sm">
        <button
          type="button"
          disabled={pending || !note.trim()}
          onClick={() =>
            start(async () => {
              const r = await recordRestoreTest(note);
              if (r.ok) {
                toast.success(t("saved"));
                setOpen(false);
                setNote("");
              } else toast.error(tc("error"));
            })
          }
          className="bg-primary text-primary-foreground min-h-10 rounded-full px-5 font-bold disabled:opacity-45"
        >
          {t("save")}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-ink">
          {tc("cancel")}
        </button>
      </span>
    </div>
  );
}
