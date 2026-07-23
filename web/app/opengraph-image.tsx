import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "Poषण — foods that heal";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// SEO-ROADMAP.md §1.7 — sitewide default social-share card, generated at
// build time rather than a hand-made image file. Uses "Poshan" (Latin)
// instead of "Poषण" here specifically: satori (next/og's renderer) has no
// access to the site's actual Noto Sans Devanagari webfont — only fonts
// explicitly passed via ImageResponse's `fonts` option render — so the
// Devanagari glyphs would silently fail to draw. The real page still shows
// "Poषण" everywhere it's rendered as actual HTML/CSS; this is a narrow,
// honest fallback for the one surface that can't load that font.
export default async function Image() {
  const logo = await readFile(join(process.cwd(), "public/logo-icon.png"));
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#F5F0E6",
          gap: 28,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoSrc} width={150} height={150} />
        <div style={{ display: "flex", fontSize: 84, color: "#1E3A34" }}>Poshan</div>
        <div
          style={{
            display: "flex",
            fontSize: 34,
            color: "#4A9B8E",
            letterSpacing: 6,
            textTransform: "uppercase",
          }}
        >
          foods that heal
        </div>
      </div>
    ),
    { ...size }
  );
}
