"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type AdminProductImage = { id: string; imageUrl: string; sortOrder: number };

const STORAGE_BUCKET = "product-images";

// Only usable once a product actually has an id (see ProductForm.tsx —
// hidden entirely for a not-yet-created product). Every action here
// writes straight to Supabase (Storage + product_images), not through the
// product PATCH/POST flow — both are already RLS-gated to admins the same
// way (0014_product_images.sql), so there's nothing an API route would add
// beyond what direct client calls already have. That also means these
// changes are live immediately, independent of the form's own Save button.
export default function ProductImagesField({
  productId,
  initialImages,
  onImagesChange,
}: {
  productId: string;
  initialImages: AdminProductImage[];
  // Lets the live preview pane (ProductForm.tsx) show this carousel
  // instead of just the single legacy Image URL field, so it stays
  // accurate to what the real product page will actually render.
  onImagesChange?: (images: AdminProductImage[]) => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [images, setImages] = useState<AdminProductImage[]>(initialImages);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    onImagesChange?.(images);
    // onImagesChange intentionally excluded — ProductForm passes its
    // setState function directly, which is stable across renders, and
    // including it here only risks a loop if a future caller passes an
    // inline arrow function instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allows re-selecting the same file later
    if (!file) return;

    setError(null);
    setUploading(true);

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${productId}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file);
    if (uploadError) {
      setUploading(false);
      setError("Could not upload that image. Please try again.");
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    const nextSortOrder = images.length > 0 ? Math.max(...images.map((i) => i.sortOrder)) + 1 : 0;
    const { data, error: insertError } = await supabase
      .from("product_images")
      .insert({ product_id: productId, image_url: publicUrl, sort_order: nextSortOrder })
      .select("id, image_url, sort_order")
      .single();

    setUploading(false);
    if (insertError || !data) {
      setError("Image uploaded but could not be attached to the product. Please try again.");
      return;
    }
    setImages((current) => [
      ...current,
      { id: data.id as string, imageUrl: data.image_url as string, sortOrder: data.sort_order as number },
    ]);
  };

  const handleRemove = async (image: AdminProductImage) => {
    setError(null);
    const { error: deleteError } = await supabase.from("product_images").delete().eq("id", image.id);
    if (deleteError) {
      setError("Could not remove that image. Please try again.");
      return;
    }
    setImages((current) => current.filter((i) => i.id !== image.id));

    // Best-effort file cleanup — only ever matches an image actually
    // uploaded through this form. A legacy/imported URL (e.g. the
    // storefront's old web/public/ path for an unmigrated product) won't
    // contain this marker and is silently left alone rather than erroring.
    const marker = `/storage/v1/object/public/${STORAGE_BUCKET}/`;
    const markerIndex = image.imageUrl.indexOf(marker);
    if (markerIndex !== -1) {
      const path = decodeURIComponent(image.imageUrl.slice(markerIndex + marker.length));
      await supabase.storage.from(STORAGE_BUCKET).remove([path]);
    }
  };

  // Adjacent-swap reorder — only the two swapped rows' sort_order actually
  // changes, so only those two need writing back. Assumes sort_order stays
  // densely sequential (true for anything created via the seed migration
  // or this component's own +1-on-upload logic); nothing here relies on
  // gaps or duplicates being handled gracefully.
  const move = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= images.length) return;

    const a = images[index];
    const b = images[targetIndex];
    const reordered = [...images];
    reordered[index] = { ...b, sortOrder: a.sortOrder };
    reordered[targetIndex] = { ...a, sortOrder: b.sortOrder };
    setImages(reordered);
    setError(null);

    const [{ error: err1 }, { error: err2 }] = await Promise.all([
      supabase.from("product_images").update({ sort_order: b.sortOrder }).eq("id", a.id),
      supabase.from("product_images").update({ sort_order: a.sortOrder }).eq("id", b.id),
    ]);
    if (err1 || err2) {
      setError("Could not save the new order. Please refresh and try again.");
    }
  };

  return (
    <div className="admin-controls-form__section">
      <div className="admin-controls-form__section-title">Additional images (carousel)</div>
      <p className="admin-controls-field-note">
        Shown on the product page as a photo carousel, in this order — separate from the single
        &quot;Image URL&quot; field above, which stays as the fallback photo for cards/listings.
        Changes here save immediately, no need to click Save changes.
      </p>

      {images.length > 0 && (
        <div className="admin-controls-image-grid">
          {images.map((img, i) => (
            <div className="admin-controls-image-thumb" key={img.id}>
              <div
                className="admin-controls-image-thumb__preview"
                style={{ backgroundImage: `url('${img.imageUrl}')` }}
              />
              <div className="admin-controls-image-thumb__actions">
                <button
                  type="button"
                  className="admin-controls-reorder-btn"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  aria-label="Move earlier"
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="admin-controls-remove-btn"
                  onClick={() => handleRemove(img)}
                  aria-label="Remove image"
                >
                  ×
                </button>
                <button
                  type="button"
                  className="admin-controls-reorder-btn"
                  onClick={() => move(i, 1)}
                  disabled={i === images.length - 1}
                  aria-label="Move later"
                >
                  ›
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleUpload}
        style={{ display: "none" }}
      />
      <button
        type="button"
        className="admin-controls-add-btn"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? "Uploading…" : "+ Add image"}
      </button>

      {error && <div className="admin-status-select__error">{error}</div>}
    </div>
  );
}
