"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/core/admin/form";
import { REJECT_REASONS, reviewActions, type ReviewStatus } from "@/modules/reviews/model";
import { featureReview, publishReview, rejectReview, replyToReview } from "./actions";

function useRun() {
  const t = useTranslations("reviews.panel");
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<ActionResult>) =>
    start(async () => {
      const r = await fn();
      if (r.ok) {
        toast.success(t("saved"));
        router.refresh();
      } else toast.error(t("error"));
    });
  return { pending, run };
}

/** Zverejniť teraz / Zamietnuť (reason from the list) / Dať navrch. */
export function ReviewActions({
  id,
  status,
  featured,
}: {
  id: string;
  status: ReviewStatus;
  featured: boolean;
}) {
  const t = useTranslations("reviews");
  const { pending, run } = useRun();
  const [reason, setReason] = useState<string>(REJECT_REASONS[0]);
  const can = reviewActions(status);
  return (
    <div className="flex flex-wrap gap-2">
      {can.publish ? (
        <Button
          type="button"
          className="font-bold"
          disabled={pending}
          onClick={() => run(() => publishReview(id))}
        >
          {status === "submitted" ? t("panel.publishNow") : t("panel.publish")}
        </Button>
      ) : null}
      {status === "published" ? (
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => run(() => featureReview(id, !featured))}
        >
          {featured ? t("panel.unfeature") : t("panel.feature")}
        </Button>
      ) : null}
      {can.reject ? (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button type="button" variant="outline" disabled={pending}>
              {t("panel.reject")}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("panel.rejectTitle")}</AlertDialogTitle>
              <AlertDialogDescription>{t("panel.rejectText")}</AlertDialogDescription>
            </AlertDialogHeader>
            <RadioGroup
              value={reason}
              onValueChange={setReason}
              aria-label={t("panel.rejectReason")}
              className="grid gap-2.5"
            >
              {REJECT_REASONS.map((r) => (
                <label key={r} className="flex items-center gap-2.5 text-sm">
                  <RadioGroupItem value={r} />
                  {t(`reasons.${r}`)}
                </label>
              ))}
            </RadioGroup>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("panel.cancel")}</AlertDialogCancel>
              <AlertDialogAction onClick={() => run(() => rejectReview(id, reason))}>
                {t("panel.reject")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </div>
  );
}

/** Public reply of the owner under the review. */
export function ReviewReply({ id, reply }: { id: string; reply: string }) {
  const t = useTranslations("reviews.panel");
  const { pending, run } = useRun();
  const [text, setText] = useState(reply);
  return (
    <div className="grid gap-2">
      <Textarea
        aria-label={t("reply")}
        rows={4}
        maxLength={2000}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <p className="text-muted-foreground text-[13px]">{t("replyHint")}</p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={pending || !text.trim() || text.trim() === reply.trim()}
          onClick={() => run(() => replyToReview(id, text))}
        >
          {t("replySave")}
        </Button>
        {reply ? (
          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            onClick={() => {
              setText("");
              run(() => replyToReview(id, ""));
            }}
          >
            {t("replyRemove")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
