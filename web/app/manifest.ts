import type { MetadataRoute } from "next";

// SEO-ROADMAP.md §1.9. Colors pulled from app/tokens.css's --color-bone —
// matches the viewport themeColor in app/layout.tsx, the site's one fixed
// background color (no dark-mode variant exists to branch on).
//
// icon-192.png is a real 192x192 export of public/logo-icon.png (native
// 447x447), not an upscaled/fabricated size — a genuine 512x512 export
// should be added here once larger source art exists, but declaring one
// now from a smaller source would just be a blurry upscale.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Poषण — foods that heal",
    short_name: "Poषण",
    description:
      "Poषण — clean, sophisticated healthy foods rooted in Ayurvedic tradition. No ultra-processed foods, small batch, no exaggerated claims.",
    start_url: "/",
    display: "standalone",
    background_color: "#F5F0E6",
    theme_color: "#F5F0E6",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
    ],
  };
}
