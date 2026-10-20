"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { requestCancellation } from "@/core/guest/stay-actions";

/**
 * "Požiadať o zrušenie pobytu" → a window (design v2.4 `StavyPobytu`): days to arrival, the cancellation policy of
 * the client, an optional reason, "Ponechať pobyt" / "Odoslať žiadosť". The owner confirms the request.
 */
export function CancelDialog({
  reservationId,
  token,
  daysToArrival,
  policy,
  ownerName,
  outcome,
}: {
  reservationId: string;
  /** The stay opened through the access link (Z49): the request goes with its code. */
  token?: string;
  daysToArrival: number;
  policy: string;
  ownerName: string | null;
  /** By the client's storno bands (formatted amounts); null without bands — the owner decides by the wording. */
  outcome: { refundPct: number; fee: string | null; refund: string | null } | null;
}) {
  const t = useTranslations("guest.stay.cancel");
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [note, setNote] = useState("");
  const [error, setError] = useState(false);
  const [pending, start] = useTransition();
  useEffect(() => {
    const d = ref.current;
    const onClick = (e: MouseEvent) => e.target === d && d?.close();
    d?.addEventListener("click", onClick);
    return () => d?.removeEventListener("click", onClick);
  }, []);
  const name = ownerName ?? "none";

  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        className="text-ink justify-self-start text-[15px] font-medium underline underline-offset-[3px]"
      >
        {t("open")}
      </button>
      <dialog
        ref={ref}
        aria-labelledby={titleId}
        className="m-auto w-[min(520px,calc(100vw-32px))] rounded-2xl bg-white p-0 text-[#3b3d42] backdrop:bg-[#11212f]/45"
      >
        <div className="grid gap-4 p-6 sm:p-7">
          <h2 id={titleId} className="text-ink text-[22px] font-extrabold tracking-tight">
            {t("title")}
          </h2>
          <div className="grid gap-2 rounded-[10px] bg-[#fafaf8] p-4 text-sm leading-relaxed">
            <p>{t.rich("daysLeft", { count: daysToArrival, b: (c) => <strong>{c}</strong> })}</p>
            {policy ? <p className="text-[#5a6672]">{t("policy", { policy })}</p> : null}
            {outcome ? (
              <p>
                {outcome.refund !== null
                  ? t.rich("refund", {
                      amount: outcome.refund,
                      pct: outcome.refundPct,
                      b: (c) => <strong>{c}</strong>,
                    })
                  : t("nothingPaid")}
                {outcome.fee ? ` ${t("fee", { fee: outcome.fee })}` : ""}
              </p>
            ) : null}
            <p className="text-[#5a6672]">
              {outcome ? t("confirmAmount", { name }) : t("amount", { name })}
            </p>
          </div>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium">
              {t("reason")} <span className="text-muted-foreground">· {t("optional")}</span>
            </span>
            <textarea
              rows={3}
              maxLength={2000}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="rounded-[10px] border border-[#e9e5db] px-3.5 py-3 text-[15px] text-[#11212f]"
            />
          </label>
          <p className="text-[13px] text-[#5a6672]">{t("confirmBy", { name })}</p>
          {error ? (
            <p role="alert" className="text-sm font-medium text-[#a04a1f]">
              {t("error")}
            </p>
          ) : null}
          <div className="flex flex-wrap justify-end gap-2.5">
            <button
              type="button"
              onClick={() => ref.current?.close()}
              className="border-line text-ink min-h-11 rounded-full border bg-white px-5 text-sm font-medium"
            >
              {t("keep")}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  setError(false);
                  const r = await requestCancellation(reservationId, note, token);
                  if (r.ok) ref.current?.close();
                  else setError(true);
                })
              }
              className="min-h-11 rounded-full bg-[#2b3036] px-5 text-sm font-bold text-white hover:bg-[#0c0e11] disabled:opacity-60"
            >
              {pending ? t("sending") : t("send")}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
