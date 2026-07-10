"use client";

// Interim localStorage-backed cart — same mechanism and key
// (poshan:cart) as the old assets/js/main.js, ported to React state so
// the UI stays interactive during the Next.js migration. Gets replaced by
// a Supabase-backed carts/cart_items table in backend Phase 4; every
// consumer here goes through this context, so that swap only touches this
// one file, not every component that reads/mutates the cart.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { products } from "./products";

const CART_KEY = "poshan:cart";
const VALID_IDS = new Set(products.flatMap((p) => p.variants.map((v) => v.id)));

type Cart = Record<string, number>;

type CartContextValue = {
  cart: Cart;
  total: number;
  // False until the localStorage read below has actually run. A consumer
  // that redirects on an empty cart (e.g. checkout) must wait for this —
  // on a full page load (not a client-side nav), cart starts at {} for one
  // render before hydration completes, which looks identical to a
  // genuinely empty cart unless this flag distinguishes them.
  hydrated: boolean;
  addItem: (id: string) => void;
  incrementItem: (id: string) => void;
  decrementItem: (id: string) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function readCart(): Cart {
  if (typeof window === "undefined") return {};
  try {
    const raw = JSON.parse(window.localStorage.getItem(CART_KEY) || "{}");
    const cleaned: Cart = {};
    for (const [id, qty] of Object.entries(raw)) {
      // Prune orphaned ids the same way main.js's getCart() does — see
      // CLAUDE.md's PRODUCT_CATALOG note on why this matters.
      if (VALID_IDS.has(id) && typeof qty === "number" && qty > 0) {
        cleaned[id] = qty;
      }
    }
    return cleaned;
  } catch {
    return {};
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  // Starts empty to match server-rendered output (localStorage isn't
  // available server-side), then hydrates from localStorage after mount —
  // same "flash to real state" behavior the static site already had.
  const [cart, setCartState] = useState<Cart>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Intentional: localStorage isn't available during SSR, so hydrating
    // real cart state has to happen post-mount, in an effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCartState(readCart());
    setHydrated(true);
    const onStorage = (e: StorageEvent) => {
      if (e.key === CART_KEY) setCartState(readCart());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const persist = useCallback((next: Cart) => {
    window.localStorage.setItem(CART_KEY, JSON.stringify(next));
    setCartState(next);
  }, []);

  const bump = useCallback(
    (id: string, delta: number) => {
      const current = readCart();
      const next = (current[id] || 0) + delta;
      const updated = { ...current };
      if (next > 0) updated[id] = next;
      else delete updated[id];
      persist(updated);
    },
    [persist]
  );

  const addItem = useCallback((id: string) => bump(id, 1), [bump]);
  const incrementItem = useCallback((id: string) => bump(id, 1), [bump]);
  const decrementItem = useCallback((id: string) => bump(id, -1), [bump]);
  const removeItem = useCallback(
    (id: string) => {
      const current = readCart();
      const updated = { ...current };
      delete updated[id];
      persist(updated);
    },
    [persist]
  );

  const clearCart = useCallback(() => persist({}), [persist]);

  const total = Object.values(cart).reduce((sum, qty) => sum + qty, 0);

  return (
    <CartContext.Provider
      value={{ cart, total, hydrated, addItem, incrementItem, decrementItem, removeItem, clearCart }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
