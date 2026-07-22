"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SUB_TABS = [
  { href: "/admin/controls/products", label: "Products" },
  { href: "/admin/controls/promo-codes", label: "Promo codes" },
];

// Products and promo codes are each substantial enough to warrant their
// own page (list + create form), so Controls gets its own in-page sub-nav
// rather than cramming both into one route — same .admin-tab-group/.admin-tab
// convention already used for the Dashboard's MTD/QTD/YTD toggle
// (AdminCharts.tsx), just promoted to a page-level sub-nav here.
export default function ControlsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="admin-page admin-controls-page">
      <h1 className="admin-page__title">Controls</h1>
      <div className="admin-tab-group admin-controls-subnav">
        {SUB_TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`admin-tab${pathname.startsWith(tab.href) ? " is-active" : ""}`}
          >
            {tab.label}
          </Link>
        ))}
      </div>
      {children}
    </div>
  );
}
