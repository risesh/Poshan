import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getProductBySlug } from "@/lib/products";
import { createClient } from "@/lib/supabase/server";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const GRADIENTS = {
  amla: "linear-gradient(160deg, #1E3A34 0%, #3d5a3a 50%, #7A9B76 100%)",
  turmeric: "linear-gradient(160deg, #4a3a1e 0%, #8a6d2e 50%, #E4A335 100%)",
};

// SEO-ROADMAP.md §1.7. Real product photography is uncommon in this
// catalog today (see SEO-ROADMAP.md's Context — most products render the
// CSS gradient fallback, not a photo), so this covers both cases: a real
// photo becomes the card's background when product.image is set, else a
// generated card reuses the same amla/turmeric gradient tokens the actual
// product page falls back to, so it stays on-brand either way rather than
// showing a generic placeholder.
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const product = await getProductBySlug(supabase, slug);

  if (!product) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#F5F0E6",
            fontSize: 64,
            color: "#1E3A34",
          }}
        >
          Poshan
        </div>
      ),
      { ...size }
    );
  }

  let photoSrc: string | undefined;
  if (product.image) {
    if (product.image.startsWith("http")) {
      photoSrc = product.image;
    } else {
      // Same-origin path into public/ (e.g. "/kefir.jpg") — read straight
      // off disk rather than fetching over HTTP, same pattern as Next's
      // own "local assets" opengraph-image example.
      const bytes = await readFile(join(process.cwd(), "public", product.image.replace(/^\//, "")));
      photoSrc = `data:image/jpeg;base64,${bytes.toString("base64")}`;
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "flex-start",
          padding: 64,
          ...(photoSrc
            ? { backgroundImage: `url(${photoSrc})`, backgroundSize: "cover", backgroundPosition: "center" }
            : { background: GRADIENTS[product.gradient ?? "amla"] }),
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            padding: "28px 40px",
            background: "rgba(30, 58, 52, 0.55)",
            borderRadius: 12,
          }}
        >
          <div style={{ display: "flex", fontSize: 64, color: "#F5F0E6" }}>{product.name}</div>
          <div style={{ display: "flex", fontSize: 28, color: "#DCE6DE" }}>{product.category} · Poshan</div>
        </div>
      </div>
    ),
    { ...size }
  );
}
