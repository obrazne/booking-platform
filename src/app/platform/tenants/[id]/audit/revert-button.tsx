"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Undo2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { changes } from "@/core/history/diff";
import { revertChange, type RevertResult } from "./actions";

/**
 * "Vrátiť túto zmenu" with a confirmation. If the record changed again since, the current state is shown and the
 * admin decides whether to revert anyway.
 */
export function RevertButton({ id, summary }: { id: number; summary: string }) {
  const t = useTranslations("history.revert");
  const tf = useTranslations("history.fields");
  const [result, setResult] = useState<RevertResult | null>(null);
  const [pending, start] = useTransition();
  const run = (force: boolean) => start(async () => setResult(await revertChange(id, force)));
  const field = (key: string) => (tf.has(key as never) ? tf(key as never) : key.replace(/_/g, " "));

  if (result?.status === "ok") {
    return (
      <p role="status" className="text-primary text-[13px] font-medium">
        {t("done")}
      </p>
    );
  }
  return (
    <div className="grid justify-items-start gap-2">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button type="button" variant="outline" size="sm" disabled={pending}>
            <Undo2 /> {t("button")}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("confirmText", { change: summary })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => run(false)}>{t("button")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {result ? (
        <div
          role="status"
          className="card-warm grid gap-2 rounded-[10px] px-3.5 py-2.5 text-[13px] text-[#5b3a1f]"
        >
          <p>{t(`results.${result.status}`)}</p>
          {result.status === "changed" && result.current ? (
            <>
              <ul className="grid gap-0.5">
                {changes(null, result.current)
                  .slice(0, 8)
                  .map((c) => (
                    <li key={c.field}>
                      <span className="font-medium">{field(c.field)}:</span> {c.after}
                    </li>
                  ))}
              </ul>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="justify-self-start"
                disabled={pending}
                onClick={() => run(true)}
              >
                {t("anyway")}
              </Button>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
