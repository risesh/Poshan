"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { initialsOf } from "@/lib/user-display-name";
import { isAdminEmail } from "@/lib/admin";

export default function Nav() {
  const [isOpen, setIsOpen] = useState(false);
  const { total } = useCart();
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  // Every page shows a "Products" link back to the homepage's product
  // grid except the homepage itself, which has that grid inline already.
  const showProductsLink = pathname !== "/";
  const onProductPage = pathname.startsWith("/products/");

  // /admin has its own topbar (app/admin/layout.tsx) — showing both would
  // be redundant.
  if (pathname.startsWith("/admin")) return null;

  return (
    <nav className="nav">
      <div className="nav__inner">
        <Link href="/" className="nav__brand" aria-label="Poषण home">
          <Image
            src="/logo-icon.png"
            alt=""
            width={36}
            height={36}
            className="nav__logo"
          />
          <div>
            <div className="nav__wordmark">
              Po<span>षण</span>
            </div>
            <div className="nav__tagline">foods that heal</div>
          </div>
        </Link>
        <div className={`nav__links${isOpen ? " is-open" : ""}`}>
          {showProductsLink && (
            <Link
              href="/#products"
              className={`nav__link${onProductPage ? " nav__link--active" : ""}`}
            >
              Products
            </Link>
          )}
          <Link
            href="/cart"
            className={`nav__link${pathname === "/cart" ? " nav__link--active" : ""}`}
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
              <button type="button" className="nav__signin" onClick={() => signOut()}>
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
    </nav>
  );
}
