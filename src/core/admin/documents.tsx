"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { FilePlus, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DeleteButton } from "@/core/admin/delete-button";
import { createClient } from "@/lib/supabase/client";
import { deleteDocument, registerDocument } from "@/app/admin/documents/actions";

export type DocumentRow = { id: string; title: string; visibleWhen: string };

/** Documents for guests (B10): private storage, guests get temporary links in their zone. */
export function DocumentsManager({
  tenantId,
  propertyId = null,
  reservationId = null,
  documents,
}: {
  tenantId: string;
  propertyId?: string | null;
  reservationId?: string | null;
  documents: DocumentRow[];
}) {
  const t = useTranslations("documents");
  const router = useRouter();
  const file = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [visibleWhen, setVisibleWhen] = useState<"always" | "confirmed">("confirmed");
  const [busy, setBusy] = useState(false);

  async function upload() {
    const f = file.current?.files?.[0];
    if (!f) return;
    // Without a title the file name is used (without the extension).
    const name = title.trim() || f.name.replace(/\.[^.]+$/, "").slice(0, 120);
    if (f.size > 10 * 1024 * 1024) {
      toast.error(t("tooLarge"));
      return;
    }
    setBusy(true);
    try {
      const safe = f.name
        .toLowerCase()
        .replace(/[^a-z0-9.]+/g, "-")
        .slice(-60);
      const path = `${tenantId}/${crypto.randomUUID()}-${safe}`;
      const { error } = await createClient()
        .storage.from("guest-documents")
        .upload(path, f, { contentType: f.type });
      if (error) throw error;
      const r = await registerDocument({
        propertyId,
        reservationId,
        storagePath: path,
        title: name,
        visibleWhen,
      });
      if (!r.ok) throw new Error(r.error);
      setTitle("");
      if (file.current) file.current.value = "";
      toast.success(t("uploaded"));
      router.refresh();
    } catch {
      toast.error(t("uploadFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-4">
      {documents.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("empty")}</p>
      ) : (
        <ul className="border-hair grid divide-y divide-[#ecebe6] rounded-[10px] border">
          {documents.map((d) => (
            <li key={d.id} className="flex items-center gap-3 px-3 py-2 text-sm">
              <FileText className="text-muted-foreground size-4" />
              <span className="min-w-0 flex-1 break-words">{d.title}</span>
              <span className="text-muted-foreground text-xs">
                {t(d.visibleWhen === "always" ? "visible.always" : "visible.confirmed")}
              </span>
              <DeleteButton
                action={async () => {
                  await deleteDocument(d.id);
                  router.refresh();
                }}
              />
            </li>
          ))}
        </ul>
      )}
      {/* One column (fits the 680 px panel); one button picks the file and uploads it right away. */}
      <div className="grid gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor={`doc-title-${propertyId ?? reservationId}`}>{t("title")}</Label>
          <Input
            id={`doc-title-${propertyId ?? reservationId}`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            placeholder={t("titlePlaceholder")}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`doc-vis-${propertyId ?? reservationId}`}>{t("visibility")}</Label>
          <select
            id={`doc-vis-${propertyId ?? reservationId}`}
            className="border-input bg-background h-10 rounded-full border px-4 text-sm"
            value={visibleWhen}
            onChange={(e) => setVisibleWhen(e.target.value as "always" | "confirmed")}
          >
            <option value="confirmed">{t("visible.confirmed")}</option>
            <option value="always">{t("visible.always")}</option>
          </select>
        </div>
        <input
          ref={file}
          type="file"
          accept="application/pdf,image/jpeg,image/png"
          aria-label={t("file")}
          className="sr-only"
          tabIndex={-1}
          onChange={() => void upload()}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => file.current?.click()}
          disabled={busy}
          className="justify-self-start"
        >
          <FilePlus /> {busy ? t("uploading") : t("uploadFile")}
        </Button>
      </div>
      <p className="text-muted-foreground text-xs">{t("hint")}</p>
    </div>
  );
}
