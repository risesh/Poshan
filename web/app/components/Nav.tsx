"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { initialsOf } from "@/lib/user-display-name";
import { isAdminEmail } from "@/lib/admin";

export default function Nav() {
  const [isOpen, setIsOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const { total } = useCart();
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const onProductPage = pathname.startsWith("/products/");
  const closeMenu = () => setIsOpen(false);
  // On the homepage itself, "/#products" is a same-page hash — Link's own
  // hash-scroll only reliably fires on an actual route change, not when
  // pathname is already "/", so that case scrolls manually instead.
  const handleProductsClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (pathname === "/") {
      e.preventDefault();
      document.getElementById("products")?.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Collapse the mobile menu on an outside tap — only listens while it's
  // actually open, so this adds no overhead on desktop or when closed.
  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) closeMenu();
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen]);

  // /admin has its own topbar (app/admin/layout.tsx) — showing both would
  // be redundant.
  if (pathname.startsWith("/admin")) return null;

  return (
    <nav className="nav" ref={navRef}>
      <div className="nav__inner">
        <Link href="/" className="nav__brand" aria-label="Poषण home">
          <Image
            src="/logo-icon.png"
            alt=""
            width={48}
            height={48}
            className="nav__logo"
          />
          <div>
            <div className="nav__wordmark">
              Po<span>षण</span>
            </div>
            <div className="nav__tagline">foods that heal</div>
          </div>
        </Link>
        <div className={`nav__links${isOpen ? " is-open" : ""}`} onClick={closeMenu}>
          <Link
            href="/#products"
            className={`nav__link${onProductPage ? " nav__link--active" : ""}`}
            onClick={handleProductsClick}
          >
            Products
          </Link>
          <Link
            href="/cart"
            className={`nav__link${pathname === "/cart" ? " nav__link--active" : ""}${total > 0 ? " nav__link--cart-filled" : ""}`}
          >
            {total > 0 ? `Cart (${total})` : "Cart"}
          </Link>
          {user ? (
            <>
              <Link
                href="/orders"
                className={`nav__link${pathname === "/orders" ? " nav__link--active" : ""}`}
              >
                Past orders
              </Link>
              {isAdminEmail(user.email) && (
                <Link href="/admin" className="nav__link">
                  Admin
                </Link>
              )}
              <button
                type="button"
                className="nav__signin"
                onClick={async () => {
                  await signOut();
                  router.push("/");
                }}
              >
                Sign out
              </button>
              <span className="nav__avatar" aria-hidden="true">
                {initialsOf(user)}
                <span className="nav__avatar-dot"></span>
              </span>
            </>
          ) : (
            <Link
              href={`/signin?return=${encodeURIComponent(pathname)}`}
              className="nav__signin"
            >
              Sign in
            </Link>
          )}
        </div>
        <button
          className="nav__toggle"
          aria-label="Toggle menu"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((open) => !open)}
        >
          <span></span>
        </button>
      </div>
      {total > 0 && pathname !== "/cart" && (
        <Link href="/cart" className="cart-fab" aria-label={`View cart, ${total} item${total === 1 ? "" : "s"}`} onClick={closeMenu}>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
          </svg>
          <span className="cart-fab__count">{total}</span>
        </Link>
      )}
    </nav>
  );
}
