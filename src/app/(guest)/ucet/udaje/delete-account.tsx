"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
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
import { Textarea } from "@/components/ui/textarea";
import { requestAccountDeletion } from "@/core/guest/actions";

/** "Zrušiť účet" with an explanation and an optional note; after sending, when it was asked. */
export function DeleteAccount({
  tenantName,
  requestedAt,
}: {
  tenantName: string;
  requestedAt: string | null;
}) {
  const t = useTranslations("guest.account.profile");
  const [at, setAt] = useState(requestedAt);
  const [note, setNote] = useState("");
  const [error, setError] = useState(false);
  const [pending, start] = useTransition();
  if (at) {
    return (
      <p role="status" className="text-sm">
        {t("deleteSent", {
          date: new Intl.DateTimeFormat("sk", { dateStyle: "long" }).format(new Date(at)),
        })}
      </p>
    );
  }
  return (
    <>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button type="button" className="min-h-11 text-sm font-medium text-[#a04a1f] underline">
            {t("delete")}
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteText", { tenant: tenantName })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">{t("deleteNote")}</span>
            <Textarea
              rows={2}
              maxLength={300}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("deleteKeep")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await requestAccountDeletion(note);
                  if (r.ok && r.at) setAt(r.at);
                  else setError(true);
                })
              }
            >
              {t("deleteSend")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {error ? (
        <p role="alert" className="text-sm text-[#a8432f]">
          {t("deleteError")}
        </p>
      ) : null}
    </>
  );
}
