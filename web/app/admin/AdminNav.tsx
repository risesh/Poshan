"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/controls", label: "Controls" },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="admin-tabs">
      {TABS.map((tab) => {
        // Exact match, or a sub-route of a non-root tab (e.g.
        // /admin/controls/products should still highlight "Controls").
        const isActive =
          pathname === tab.href || (tab.href !== "/admin" && pathname.startsWith(`${tab.href}/`));
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`admin-tabs__link${isActive ? " is-active" : ""}`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
