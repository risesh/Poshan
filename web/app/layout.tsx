import type { Metadata } from "next";
import "./globals.css";
import Nav from "./components/Nav";
import { CartProvider } from "@/lib/cart-context";
import { AuthProvider } from "@/lib/auth-context";

export const metadata: Metadata = {
  title: "Poषण — foods that heal",
  description:
    "Poषण — clean, sophisticated healthy foods rooted in Ayurvedic tradition. Traditional formulations, small batch, no exaggerated claims.",
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
      </head>
      <body>
        <AuthProvider>
          <CartProvider>
            <Nav />
            {children}
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
