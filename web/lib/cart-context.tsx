"use client";

// localStorage-backed cart (key poshan:cart), same mechanism as the old
// static site. Cart *entries* are trusted client-side (added only via a
// live ProductCard/ProductHero, so an id is always real at the moment it's
// added) — but the *set of currently-valid ids* now lives in Supabase, not
// a bundled static array, so validating a freshly-loaded cart against it
// needs a network round trip. That validation only runs once, at mount:
// see the hydration effect below.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "./supabase/client";

const CART_KEY = "poshan:cart";
const PROMO_KEY = "poshan:promo";

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
  // Just the code string — never a computed discount amount. Applied on
  // the cart page, read back on the checkout page so the two stay in sync;
  // both sides always re-look-up and re-compute the actual discount from
  // this code rather than trusting a stored number (lib/promo.ts).
  promoCode: string | null;
  setPromoCode: (code: string | null) => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function readRawCart(): Cart {
  if (typeof window === "undefined") return {};
  try {
    const raw = JSON.parse(window.localStorage.getItem(CART_KEY) || "{}");
    const cleaned: Cart = {};
    for (const [id, qty] of Object.entries(raw)) {
      if (typeof qty === "number" && qty > 0) cleaned[id] = qty;
    }
    return cleaned;
  } catch {
    return {};
  }
}

function pruneToValidIds(cart: Cart, validIds: Set<string>): Cart {
  const cleaned: Cart = {};
  for (const [id, qty] of Object.entries(cart)) {
    if (validIds.has(id)) cleaned[id] = qty;
  }
  return cleaned;
}

export function CartProvider({ children }: { children: ReactNode }) {
  // Starts empty to match server-rendered output (localStorage isn't
  // available server-side), then hydrates from localStorage after mount —
  // same "flash to real state" behavior the static site already had.
  const [cart, setCartState] = useState<Cart>({});
  const [hydrated, setHydrated] = useState(false);
  const [promoCode, setPromoCodeState] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    // Prune against real product_variants ids, not a static array. This
    // also handles the one-time migration for anyone with a pre-existing
    // localStorage cart from before this data source switched: an old
    // slug-style id (e.g. 'kefir-500ml') simply won't be in this set and
    // gets silently dropped, identical to how any other orphaned id is
    // already handled below.
    supabase
      .from("product_variants")
      .select("id")
      .then(({ data }) => {
        if (cancelled) return;
        const validIds = new Set((data ?? []).map((row) => row.id as string));
        const pruned = pruneToValidIds(readRawCart(), validIds);
        window.localStorage.setItem(CART_KEY, JSON.stringify(pruned));
        setCartState(pruned);
        setPromoCodeState(window.localStorage.getItem(PROMO_KEY));
        setHydrated(true);
      });

    const onStorage = (e: StorageEvent) => {
      // Cross-tab sync — the other tab only ever wrote ids that were valid
      // there too, so no re-validation against Supabase is needed here.
      if (e.key === CART_KEY) setCartState(readRawCart());
      if (e.key === PROMO_KEY) setPromoCodeState(window.localStorage.getItem(PROMO_KEY));
    };
    window.addEventListener("storage", onStorage);
    return () => {
      cancelled = true;
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const setPromoCode = useCallback((code: string | null) => {
    if (code) window.localStorage.setItem(PROMO_KEY, code);
    else window.localStorage.removeItem(PROMO_KEY);
    setPromoCodeState(code);
  }, []);

  const persist = useCallback((next: Cart) => {
    window.localStorage.setItem(CART_KEY, JSON.stringify(next));
    setCartState(next);
  }, []);

  const bump = useCallback(
    (id: string, delta: number) => {
      const current = readRawCart();
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
      const current = readRawCart();
      const updated = { ...current };
      delete updated[id];
      persist(updated);
    },
    [persist]
  );

  const clearCart = useCallback(() => {
    persist({});
    // A completed order should start the next cart fresh rather than
    // silently carrying over the previous order's promo code.
    setPromoCode(null);
  }, [persist, setPromoCode]);

  const total = Object.values(cart).reduce((sum, qty) => sum + qty, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        total,
        hydrated,
        addItem,
        incrementItem,
        decrementItem,
        removeItem,
        clearCart,
        promoCode,
        setPromoCode,
      }}
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
