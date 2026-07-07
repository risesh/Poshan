document.addEventListener('DOMContentLoaded', () => {
  const tabs = document.querySelectorAll('.products__tab');
  const cards = document.querySelectorAll('.products__grid > [data-categories]');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => {
        t.classList.remove('is-active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('is-active');
      tab.setAttribute('aria-selected', 'true');

      const category = tab.dataset.category;
      cards.forEach(card => {
        const matches = category === 'all' || card.dataset.categories.split(' ').includes(category);
        card.style.display = matches ? '' : 'none';
      });
    });
  });

  const navToggle = document.querySelector('.nav__toggle');
  const navLinks = document.querySelector('.nav__links');

  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', String(isOpen));
    });
  }

  // --- Cart (localStorage-backed per-product quantities, shared across pages) ---
  const CART_KEY = 'poshan:cart';

  // Every addable product-id across the whole site, kept manually in sync
  // with the data-product-id values in index.html/kefir.html/etc. Used to
  // prune orphaned cart entries — e.g. a cart saved under an old id before
  // a rename (this happened once already: kefir -> kefir-500ml) would
  // otherwise inflate the total forever without ever being visible/
  // editable anywhere, since no element with that id exists to render it.
  const VALID_PRODUCT_IDS = new Set([
    'kefir-500ml',
    'kefir-1l',
    'punjabi-mango-pickle',
    'lacto-fermented-carrots',
  ]);

  const getCart = () => {
    let raw;
    try {
      raw = JSON.parse(localStorage.getItem(CART_KEY)) || {};
    } catch {
      raw = {};
    }
    const cleaned = {};
    for (const [id, qty] of Object.entries(raw)) {
      if (VALID_PRODUCT_IDS.has(id) && qty > 0) cleaned[id] = qty;
    }
    return cleaned;
  };

  const cartTotal = (cart) => Object.values(cart).reduce((sum, qty) => sum + qty, 0);

  const renderCartLinks = (cart) => {
    const count = cartTotal(cart);
    document.querySelectorAll('[data-cart-link]').forEach(link => {
      const label = link.dataset.cartLabel || 'Cart';
      link.textContent = (count > 0 || 'cartAlwaysCount' in link.dataset)
        ? `${label} (${count})`
        : label;
    });
  };

  // Swaps the Add button for a "− qty +" stepper once a product has any
  // quantity in the cart, and back again at zero — mirrors the stepper
  // already used for this on the product-detail and cart screens.
  const renderCardQty = (card, qty) => {
    const addBtn = card.querySelector('.card__add');
    const qtyEl = card.querySelector('.card__qty');
    if (!addBtn || !qtyEl) return;
    addBtn.hidden = qty > 0;
    qtyEl.hidden = qty <= 0;
    if (qty > 0) qtyEl.querySelector('.card__qty-count').textContent = String(qty);
  };

  const renderAllCardQtys = (cart) => {
    document.querySelectorAll('[data-product-id]').forEach(card => {
      renderCardQty(card, cart[card.dataset.productId] || 0);
    });
  };

  const setCart = (cart) => {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    renderCartLinks(cart);
    renderAllCardQtys(cart);
  };

  setCart(getCart()); // paint initial state from whatever's already stored

  // Keep this page's cart UI in sync with changes made in *other* tabs/
  // windows on the same origin — without this, adding to cart on the
  // product-detail page leaves an already-open homepage tab showing a
  // stale count until it's manually reloaded (and vice versa).
  window.addEventListener('storage', (e) => {
    if (e.key === CART_KEY) {
      const cart = getCart();
      renderCartLinks(cart);
      renderAllCardQtys(cart);
    }
  });

  // Same idea for a single tab restored from the back/forward cache —
  // 'storage' doesn't fire for changes made before the restore, so repaint
  // from localStorage whenever a persisted page is shown again.
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) {
      const cart = getCart();
      renderCartLinks(cart);
      renderAllCardQtys(cart);
    }
  });

  document.querySelectorAll('[data-product-id]').forEach(card => {
    const addBtn = card.querySelector('.card__add');
    const decBtn = card.querySelector('[data-qty-decrement]');
    const incBtn = card.querySelector('[data-qty-increment]');

    // Read card.dataset.productId fresh on every click, not once at binding
    // time — the variant toggle below rewrites it in place when the size
    // selection changes, and these listeners need to see that change.
    const bump = (delta) => {
      const id = card.dataset.productId;
      const cart = getCart();
      const next = (cart[id] || 0) + delta;
      if (next > 0) cart[id] = next; else delete cart[id];
      setCart(cart);
    };

    if (addBtn && !addBtn.disabled) addBtn.addEventListener('click', () => bump(1));
    if (incBtn) incBtn.addEventListener('click', () => bump(1));
    if (decBtn) decBtn.addEventListener('click', () => bump(-1));
  });

  // --- Size/price variant toggle (product-detail pages with multiple
  // sizes, e.g. Kefir 500ml/1L) — swaps which product-id the Add/stepper
  // above act on and refreshes the displayed price/unit for that variant. ---
  document.querySelectorAll('[data-variant-root]').forEach(root => {
    const priceEl = root.querySelector('[data-price-display]');
    const unitEl = root.querySelector('[data-unit-display]');
    const addBtn = root.querySelector('.card__add');

    root.querySelectorAll('[data-size]').forEach(btn => {
      btn.addEventListener('click', () => {
        root.querySelectorAll('[data-size]').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        root.dataset.productId = btn.dataset.productId;
        if (priceEl) priceEl.textContent = '₹' + btn.dataset.price;
        if (unitEl) unitEl.textContent = btn.dataset.unitLabel;
        if (addBtn) addBtn.textContent = 'Add to cart · ₹' + btn.dataset.price;
        renderCardQty(root, getCart()[btn.dataset.productId] || 0);
      });
    });
  });

  // --- Random footer quote (any page with the philosophy footer — see data-random-quote) ---
  const quoteEl = document.querySelector('[data-random-quote]');
  if (quoteEl && window.POSHAN_QUOTES && window.POSHAN_QUOTES.length) {
    const { text, author } = window.POSHAN_QUOTES[Math.floor(Math.random() * window.POSHAN_QUOTES.length)];
    quoteEl.textContent = '';
    quoteEl.append(
      document.createTextNode('“' + text + '”'),
      document.createElement('br'),
      document.createTextNode('– ' + author)
    );
  }
});