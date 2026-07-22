"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import quotes from "@/lib/quotes.json";

type Quote = { text: string; author: string };

const FALLBACK: Quote = {
  text: "The groundwork for all happiness is good health.",
  author: "Leigh Hunt",
};

// Server-rendered markup shows the static fallback quote (so it's never
// blank / never a hydration mismatch), then this picks a fresh random quote
// on mount — re-rolls on every page load. `lib/quotes.json` is generated —
// edit `../../../Quotes.txt` and run `python3 build-quotes.py` (repo root),
// don't hand-edit this file directly.
export default function Footer({ compact = false }: { compact?: boolean }) {
  const [quote, setQuote] = useState<Quote>(FALLBACK);

  useEffect(() => {
    // Intentional: Math.random() can't run during SSR without a hydration
    // mismatch, so the re-roll has to happen post-mount, in an effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQuote(quotes[Math.floor(Math.random() * quotes.length)]);
  }, []);

  return (
    <footer className={`philosophy${compact ? " philosophy--compact" : ""}`}>
      <blockquote className="philosophy__quote">
        &ldquo;{quote.text}&rdquo;
        <br />– {quote.author}
      </blockquote>
      <div className="philosophy__divider"></div>
      <nav className="philosophy__links" aria-label="Footer">
        <Link href="/our-story" className="philosophy__link">
          Our story
        </Link>
        <a
          href="https://wa.me/917982414408?text=Hi%2C%20I%20have%20a%20question%20for%20you%20-%20"
          className="philosophy__link"
          target="_blank"
          rel="noopener noreferrer"
        >
          Contact us
        </a>
        <Link href="/shipping" className="philosophy__link">
          Shipping &amp; Returns
        </Link>
        <Link href="/terms" className="philosophy__link">
          Terms &amp; Conditions
        </Link>
        <Link href="/privacy" className="philosophy__link">
          Privacy
        </Link>
      </nav>
      <div className="philosophy__bottom">
        <div className="philosophy__copyright">
          © 2026 Poषण Life Foods · Made in India
        </div>
        <div className="philosophy__social">
          <a href="#" aria-label="Instagram" className="philosophy__social-link">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="5"></rect>
              <circle cx="12" cy="12" r="4"></circle>
              <circle cx="17.5" cy="6.5" r="0.9" fill="currentColor" stroke="none"></circle>
            </svg>
          </a>
          <a href="#" aria-label="YouTube" className="philosophy__social-link">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22.5 7.5a2.6 2.6 0 0 0-1.83-1.83C19 5.2 12 5.2 12 5.2s-7 0-8.67.47A2.6 2.6 0 0 0 1.5 7.5 27 27 0 0 0 1 12a27 27 0 0 0 .5 4.5 2.6 2.6 0 0 0 1.83 1.83C5 18.8 12 18.8 12 18.8s7 0 8.67-.47A2.6 2.6 0 0 0 22.5 16.5 27 27 0 0 0 23 12a27 27 0 0 0-.5-4.5z"></path>
              <polygon points="10 15 15 12 10 9 10 15" fill="currentColor" stroke="none"></polygon>
            </svg>
          </a>
        </div>
      </div>
    </footer>
  );
}
