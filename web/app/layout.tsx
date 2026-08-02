import type { Metadata, Viewport } from "next";
import "./globals.css";
import Nav from "./components/Nav";
import JsonLd from "./components/JsonLd";
import NewOrderListener from "./components/NewOrderListener";
import { CartProvider } from "@/lib/cart-context";
import { AuthProvider } from "@/lib/auth-context";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL!;

// SEO-ROADMAP.md §2.2. sameAs is empty — no social media accounts found
// anywhere in this codebase; add them here if/when real ones exist. No
// WebSite + SearchAction block — the site has no real search feature
// (Nav.tsx has none) to back that claim.
const ORGANIZATION_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Poषण",
  alternateName: "Poshan",
  url: SITE_URL,
  logo: `${SITE_URL}/logo-icon.png`,
  description:
    "Poषण — clean, sophisticated healthy foods rooted in Ayurvedic tradition. No ultra-processed foods, small batch, no exaggerated claims.",
};

// themeColor matches --color-bone (app/tokens.css) — the site's one fixed
// background color, no dark-mode variant exists to branch on.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#F5F0E6",
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL!),
  title: {
    default: "Poषण — foods that heal",
    template: "%s — Poषण",
  },
  description:
    "Poषण — clean, sophisticated healthy foods rooted in Ayurvedic tradition. No ultra-processed foods, small batch, no exaggerated claims.",
  // og:image/twitter:image come from app/opengraph-image.tsx automatically
  // — no images field needed here.
  openGraph: {
    type: "website",
    siteName: "Poषण",
    title: "Poषण — foods that heal",
    description:
      "Poषण — clean, sophisticated healthy foods rooted in Ayurvedic tradition. No ultra-processed foods, small batch, no exaggerated claims.",
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: "Poषण — foods that heal",
    description:
      "Poषण — clean, sophisticated healthy foods rooted in Ayurvedic tradition. No ultra-processed foods, small batch, no exaggerated claims.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Josefin+Sans:ital,wght@0,300;0,400;0,700;1,400&family=Libre+Baskerville:ital,wght@0,400;1,400&family=DM+Mono:wght@400;500&family=Noto+Sans+Devanagari:wght@300;400&display=swap"
          rel="stylesheet"
        />
        <JsonLd data={ORGANIZATION_JSON_LD} />
      </head>
      <body>
        <AuthProvider>
          <CartProvider>
            <Nav />
            {children}
          </CartProvider>
          <NewOrderListener />
        </AuthProvider>
      </body>
    </html>
  );
}
