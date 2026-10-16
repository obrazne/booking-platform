"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, ImagePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ActionForm, LocalizedField, SubmitButton } from "@/core/admin/form";
import { resizeImage } from "@/lib/image-resize";
import { createClient } from "@/lib/supabase/client";
import { deletePhoto, movePhoto, registerPhoto, updatePhotoAlt } from "../../actions";

export type PhotoItem = {
  id: string;
  url: string;
  alt: Record<string, string>;
  category: string | null;
};

export function PhotoUploader({ tenantId, propertyId }: { tenantId: string; propertyId: string }) {
  const t = useTranslations();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function upload(files: FileList) {
    setBusy(true);
    const supabase = createClient();
    try {
      for (const file of Array.from(files)) {
        const { blob, width, height } = await resizeImage(file);
        const path = `${tenantId}/${propertyId}/${crypto.randomUUID()}.jpg`;
        const { error } = await supabase.storage
          .from("property-photos")
          .upload(path, blob, { contentType: "image/jpeg", cacheControl: "31536000" });
        if (error) throw error;
        const result = await registerPhoto({ propertyId, storagePath: path, width, height });
        if (!result.ok) throw new Error(result.error);
      }
    } catch {
      toast.error(t("forms.errors.upload"));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && upload(e.target.files)}
      />
      <Button type="button" onClick={() => input.current?.click()} disabled={busy}>
        <ImagePlus /> {busy ? t("properties.photos.uploading") : t("properties.photos.upload")}
      </Button>
      <p className="text-muted-foreground text-sm">{t("properties.photos.hint")}</p>
    </div>
  );
}

export function PhotoCard({
  photo,
  propertyId,
  locales,
  first,
  last,
}: {
  photo: PhotoItem;
  propertyId: string;
  locales: string[];
  first: boolean;
  last: boolean;
}) {
  const t = useTranslations();
  const [pending, start] = useTransition();
  return (
    <div className="border-border grid gap-3 rounded-xl border p-3">
      {/* eslint-disable-next-line @next/next/no-img-element -- storage images, sizes vary */}
      <img src={photo.url} alt="" className="aspect-[3/2] w-full rounded-lg object-cover" />
      <ActionForm action={updatePhotoAlt}>
        <input type="hidden" name="id" value={photo.id} />
        <input type="hidden" name="property_id" value={propertyId} />
        <LocalizedField
          name="alt"
          label={t("properties.photos.alt")}
          locales={locales}
          value={photo.alt}
        />
        <div className="grid gap-1.5">
          <label htmlFor={`cat-${photo.id}`} className="text-sm font-medium">
            {t("properties.photos.category")}
          </label>
          <select
            id={`cat-${photo.id}`}
            name="category"
            defaultValue={photo.category ?? ""}
            className="border-input bg-background h-9 rounded-md border px-3 text-sm shadow-xs"
          >
            <option value="">{t("properties.photos.noCategory")}</option>
            {(["exterior", "interior", "bedrooms", "wellness", "surroundings"] as const).map(
              (c) => (
                <option key={c} value={c}>
                  {t(`guest.v2.albums.${c}`)}
                </option>
              ),
            )}
          </select>
        </div>
        <div className="flex items-center gap-1">
          <SubmitButton variant="outline">{t("forms.save")}</SubmitButton>
          <span className="flex-1" />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            disabled={first || pending}
            aria-label={t("properties.photos.moveUp")}
            onClick={() => start(() => movePhoto(propertyId, photo.id, -1))}
          >
            <ArrowUp />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            disabled={last || pending}
            aria-label={t("properties.photos.moveDown")}
            onClick={() => start(() => movePhoto(propertyId, photo.id, 1))}
          >
            <ArrowDown />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            disabled={pending}
            aria-label={t("forms.delete")}
            onClick={() => {
              if (window.confirm(t("forms.confirmDelete")))
                start(() => deletePhoto(propertyId, photo.id));
            }}
          >
            <Trash2 />
          </Button>
        </div>
      </ActionForm>
    </div>
  );
}
