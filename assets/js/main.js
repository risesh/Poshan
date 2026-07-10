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

  // Single source of truth for every addable product across the site —
  // kept manually in sync with data-product-id in index.html/kefir.html/etc.
  // Used both to prune orphaned cart entries (e.g. a cart saved under an
  // old id before a rename — this happened once already: kefir ->
  // kefir-500ml — would otherwise inflate the total forever without ever
  // being visible/editable anywhere) and to render the cart page's line
  // items, since that page has to show arbitrary combinations of real
  // cart contents, not the one fixed example the design source shows.
  //
  // thumbGradient/thumbName/thumbNameSize/badge match the cart-line-item
  // style from design/decoded-source.html (search "3b: Cart") for Kefir
  // and Punjabi Mango Pickle exactly; Lacto Fermented Carrots' thumbnail
  // gradient is authored (not in source — the mockup's cart only shows
  // those two items) using the same two-brand-color-blend pattern.
  const PRODUCT_CATALOG = {
    'kefir-500ml': {
      name: 'Kefir', badge: 'Probiotic · Best seller', size: '500 ml', price: 240,
      thumbGradient: 'linear-gradient(135deg,#1E3A34 0%,#4A9B8E 100%)',
      thumbName: 'Kefir', thumbNameSize: '18px', link: 'kefir.html',
    },
    'kefir-1l': {
      name: 'Kefir', badge: 'Probiotic · Best seller', size: '1 L', price: 440,
      thumbGradient: 'linear-gradient(135deg,#1E3A34 0%,#4A9B8E 100%)',
      thumbName: 'Kefir', thumbNameSize: '18px', link: 'kefir.html',
    },
    'punjabi-mango-pickle': {
      name: 'Punjabi Mango Pickle', badge: 'Probiotic · Seasonal', size: '250 g', price: 250,
      thumbGradient: 'linear-gradient(135deg,#7A9B76 0%,#E4A335 100%)',
      thumbName: 'Punjabi Mango<br>Pickle', thumbNameSize: '14px', link: 'punjabi-mango-pickle.html',
    },
    'lacto-fermented-carrots': {
      name: 'Lacto Fermented Carrots', badge: 'Probiotic · New', size: '250 g', price: 210,
      thumbGradient: 'linear-gradient(135deg,#7A9B76 0%,#4A9B8E 100%)',
      thumbName: 'Lacto Fermented<br>Carrots', thumbNameSize: '14px', link: 'lacto-fermented-carrots.html',
    },
  };

  const getCart = () => {
    let raw;
    try {
      raw = JSON.parse(localStorage.getItem(CART_KEY)) || {};
    } catch {
      raw = {};
    }
    const cleaned = {};
    for (const [id, qty] of Object.entries(raw)) {
      if (id in PRODUCT_CATALOG && qty > 0) cleaned[id] = qty;
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

  // :not([data-cart-line]) — cart.html's line items render/wire their own
  // qty controls in renderCartPage() below (they have no .card__add to
  // swap, always showing the stepper), so this and the generic wiring
  // loop further down must skip them or every cart-page qty click fires
  // twice: once from renderCartPage's own handler, once from the generic
  // one also matching the same data-product-id element.
  const renderAllCardQtys = (cart) => {
    document.querySelectorAll('[data-product-id]:not([data-cart-line])').forEach(card => {
      renderCardQty(card, cart[card.dataset.productId] || 0);
    });
  };

  const setCart = (cart) => {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    renderCartLinks(cart);
    renderAllCardQtys(cart);
  };

  // --- Cart page (cart.html) — the only page that has to render an
  // arbitrary combination of real cart contents, not just a stepper on a
  // fixed product. The design source (3b) shows one static example cart;
  // this renders whatever's actually in localStorage against
  // PRODUCT_CATALOG, including a real empty state the source never mocked
  // up. `renderCartPage` is a no-op on every other page (cartContainer is
  // null there), so it's safe to call from the sync listeners below. ---
  const cartContainer = document.getElementById('cart-container');
  const cartMetaEl = document.getElementById('cart-meta');
  let promoApplied = false; // resets on reload — deliberately not persisted

  const formatRupees = (n) => '₹' + n.toLocaleString('en-IN');

  const renderCartPage = () => {
    if (!cartContainer) return;
    const cart = getCart();
    const entries = Object.entries(cart);
    const itemCount = entries.length;
    const jarCount = cartTotal(cart);

    if (cartMetaEl) {
      cartMetaEl.textContent = itemCount === 0
        ? ''
        : `${itemCount} item${itemCount === 1 ? '' : 's'} · ${jarCount} jar${jarCount === 1 ? '' : 's'}`;
    }

    if (itemCount === 0) {
      cartContainer.innerHTML = `
        <div class="cart-empty">
          <h2 class="cart-empty__title">Your cart is empty</h2>
          <a href="index.html#products" class="cart-empty__link">Browse products</a>
        </div>
      `;
      return;
    }

    const subtotal = entries.reduce((sum, [id, qty]) => sum + PRODUCT_CATALOG[id].price * qty, 0);
    const shipping = subtotal >= 500 ? 0 : 49;
    const discount = promoApplied ? 40 : 0;
    const total = subtotal + shipping - discount;

    const itemsHtml = entries.map(([id, qty]) => {
      const p = PRODUCT_CATALOG[id];
      return `
        <div class="cart-item" data-cart-line data-product-id="${id}">
          <div class="cart-item__thumb" style="background:${p.thumbGradient}">
            <div class="cart-item__thumb-name" style="font-size:${p.thumbNameSize}">${p.thumbName}</div>
          </div>
          <div>
            <div class="cart-item__badge">${p.badge}</div>
            <div class="cart-item__name">${p.name}</div>
            <div class="cart-item__size">${p.size}</div>
            <div class="cart-item__controls">
              <div class="card__qty">
                <button class="card__qty-btn" data-qty-decrement aria-label="Decrease quantity">−</button>
                <span class="card__qty-count">${qty}</span>
                <button class="card__qty-btn" data-qty-increment aria-label="Increase quantity">+</button>
              </div>
              <button type="button" class="cart-item__remove" data-cart-remove>Remove</button>
            </div>
          </div>
          <div class="cart-item__price">${formatRupees(p.price * qty)}</div>
        </div>
      `;
    }).join('');

    cartContainer.innerHTML = `
      <div class="cart-body__grid">
        <div class="cart-items">
          ${itemsHtml}
          <div class="cart-continue">
            <a href="index.html#products" class="cart-continue__link">← Continue shopping</a>
          </div>
        </div>
        <aside class="cart-summary">
          <div class="cart-summary__label">Order summary</div>
          <div class="cart-summary__rows">
            <div class="cart-summary__row"><span>Subtotal</span><span>${formatRupees(subtotal)}</span></div>
            <div class="cart-summary__row"><span>Shipping</span><span>${shipping === 0 ? 'Free' : formatRupees(shipping)}</span></div>
            ${promoApplied ? `<div class="cart-summary__row cart-summary__row--discount"><span>Promo</span><span>−${formatRupees(discount)}</span></div>` : ''}
          </div>
          <div class="cart-summary__total">
            <span class="cart-summary__total-label">Total</span>
            <span class="cart-summary__total-value">${formatRupees(total)}</span>
          </div>
          <div class="cart-summary__promo">
            <input type="text" placeholder="Promo code" class="cart-summary__promo-input" id="promo-input" ${promoApplied ? 'disabled' : ''}>
            <button type="button" class="cart-summary__promo-btn" id="promo-apply" ${promoApplied ? 'disabled' : ''}>${promoApplied ? 'Applied' : 'Apply'}</button>
          </div>
          <button type="button" class="cart-summary__checkout">Checkout · ${formatRupees(total)}</button>
          <div class="cart-summary__shipping-note">Free shipping over ₹500</div>
        </aside>
      </div>
    `;

    cartContainer.querySelectorAll('[data-cart-line]').forEach(line => {
      const id = line.dataset.productId;
      line.querySelector('[data-qty-increment]').addEventListener('click', () => {
        const c = getCart();
        c[id] = (c[id] || 0) + 1;
        setCart(c);
        renderCartPage();
      });
      line.querySelector('[data-qty-decrement]').addEventListener('click', () => {
        const c = getCart();
        const next = (c[id] || 0) - 1;
        if (next > 0) c[id] = next; else delete c[id];
        setCart(c);
        renderCartPage();
      });
      line.querySelector('[data-cart-remove]').addEventListener('click', () => {
        const c = getCart();
        delete c[id];
        setCart(c);
        renderCartPage();
      });
    });

    // Promo: "no logic, just applied" — any non-empty code flips a flat
    // −₹40 line on, once, for this page view. No validation, nothing persisted.
    const promoInput = document.getElementById('promo-input');
    const promoBtn = document.getElementById('promo-apply');
    if (promoBtn) {
      promoBtn.addEventListener('click', () => {
        if (promoApplied || !promoInput.value.trim()) return;
        promoApplied = true;
        renderCartPage();
      });
    }

    // Checkout is gated on auth (see the "Auth" block further down for
    // getAuthUser — safe to reference here even though it's defined later
    // in this same closure, since this callback only runs on a future
    // click, by which point the whole script has finished defining
    // everything). Re-wired here, inside renderCartPage, rather than once
    // at page load — #cart-container's innerHTML is fully replaced on
    // every cart change, which would otherwise silently drop this listener
    // the moment a quantity changes (same class of bug as the cart-line
    // double-listener issue: dynamically-rendered elements need their
    // listeners re-attached on every re-render, not just the first one).
    const checkoutBtn = cartContainer.querySelector('.cart-summary__checkout');
    if (checkoutBtn) {
      checkoutBtn.addEventListener('click', () => {
        if (!getAuthUser()) location.href = 'signin.html?return=cart.html';
      });
    }
  };

  setCart(getCart()); // paint initial state from whatever's already stored
  renderCartPage();

  // Keep this page's cart UI in sync with changes made in *other* tabs/
  // windows on the same origin — without this, adding to cart on the
  // product-detail page leaves an already-open homepage tab showing a
  // stale count until it's manually reloaded (and vice versa).
  window.addEventListener('storage', (e) => {
    if (e.key === CART_KEY) {
      const cart = getCart();
      renderCartLinks(cart);
      renderAllCardQtys(cart);
      renderCartPage();
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
      renderCartPage();
    }
  });

  document.querySelectorAll('[data-product-id]:not([data-cart-line])').forEach(card => {
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

  // --- Auth (mock — no real backend). localStorage-persisted { name, email },
  // shared across pages the same way cart is. "Sign in" nav links everywhere
  // route to signin.html?return=<current page>; once authenticated it becomes
  // "Sign out" (still the same click-to-sign-out control, just relabeled),
  // and a separate [data-orders-link] element appears alongside it. ---
  const AUTH_KEY = 'poshan:auth';
  const KNOWN_PAGES = new Set([
    'index.html', 'our-story.html', 'cart.html', 'signin.html', 'orders.html',
    'kefir.html', 'punjabi-mango-pickle.html', 'lacto-fermented-carrots.html', 'dryfruit-millet-laddoo.html',
  ]);

  const getAuthUser = () => {
    try {
      return JSON.parse(localStorage.getItem(AUTH_KEY));
    } catch {
      return null;
    }
  };

  const setAuthUser = (user) => localStorage.setItem(AUTH_KEY, JSON.stringify(user));
  const clearAuthUser = () => localStorage.removeItem(AUTH_KEY);

  const currentPage = () => {
    const name = location.pathname.split('/').pop();
    return KNOWN_PAGES.has(name) ? name : 'index.html';
  };

  const sanitizedReturnTo = () => {
    const raw = new URLSearchParams(location.search).get('return');
    return KNOWN_PAGES.has(raw) ? raw : 'index.html';
  };

  // Generic auth gate: any page can require sign-in by adding
  // data-requires-auth to <body> (currently just orders.html). Client-side
  // only, so there's a brief flash of the page before the redirect fires —
  // same limitation the Checkout gate already has, no SSR to avoid it.
  if (document.body.hasAttribute('data-requires-auth') && !getAuthUser()) {
    location.href = 'signin.html?return=' + encodeURIComponent(currentPage());
  }

  const renderAuthNav = () => {
    const user = getAuthUser();
    document.querySelectorAll('.nav__signin').forEach(el => {
      if (user) {
        el.textContent = 'Sign out';
        el.href = '#';
      } else {
        el.textContent = 'Sign in';
        el.href = 'signin.html?return=' + encodeURIComponent(currentPage());
      }
    });
    document.querySelectorAll('[data-orders-link]').forEach(el => {
      el.hidden = !user;
    });
  };

  renderAuthNav();

  document.querySelectorAll('.nav__signin').forEach(el => {
    el.addEventListener('click', (e) => {
      if (getAuthUser()) {
        e.preventDefault();
        clearAuthUser();
        renderAuthNav();
      }
      // Not authenticated: the href set by renderAuthNav already points to
      // signin.html?return=..., so the default navigation just happens.
    });
  });

  // --- signin.html only: tabs, validation, mock sign-in/up, about-you step ---
  const authContent = document.getElementById('auth-content');
  if (authContent) {
    const tabs = document.querySelectorAll('.auth-tabs__tab');
    const views = document.querySelectorAll('[data-auth-view]');

    const showView = (name) => {
      views.forEach(v => { v.hidden = v.id !== 'auth-view-' + name; });
      const isTabbed = name === 'signin' || name === 'signup';
      document.querySelector('.auth-tabs').hidden = !isTabbed;
      if (isTabbed) {
        tabs.forEach(t => t.classList.toggle('is-active', t.dataset.authTab === name));
      }
    };

    document.querySelectorAll('[data-auth-tab]').forEach(el => {
      el.addEventListener('click', () => showView(el.dataset.authTab));
    });

    const finishAuth = (name, email) => {
      setAuthUser({ name: name || '', email: email || '' });
      renderAuthNav();
      location.href = sanitizedReturnTo();
    };

    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Sign in: no real accounts to check against, so this only validates
    // shape (present + email looks like an email) — any credentials that
    // pass that bar succeed. Reuses the source's one sign-in error copy
    // for any failure, rather than inventing a "wrong password" check that
    // would need real accounts to mean anything.
    document.getElementById('signin-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('signin-email').value.trim();
      const password = document.getElementById('signin-password').value;
      const ok = EMAIL_RE.test(email) && password.length > 0;
      document.getElementById('signin-error').hidden = ok;
      if (ok) finishAuth('', email);
    });

    // Sign up: the three checks the source's error state (2d) actually
    // shows — email shape, password strength, terms accepted — implemented
    // for real since they're checkable client-side. Full name is required
    // too (native HTML, no styled error) but isn't one of the three, same
    // as in the source.
    document.getElementById('signup-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('signup-name').value.trim();
      const emailEl = document.getElementById('signup-email');
      const passwordEl = document.getElementById('signup-password');
      const termsEl = document.getElementById('signup-terms');
      const email = emailEl.value.trim();
      const password = passwordEl.value;

      const emailOk = EMAIL_RE.test(email);
      const passwordOk = password.length >= 8 && /[0-9]/.test(password) && /[a-zA-Z]/.test(password);
      const termsOk = termsEl.checked;
      const failCount = [emailOk, passwordOk, termsOk].filter(ok => !ok).length;

      emailEl.classList.toggle('is-error', !emailOk);
      document.querySelector('label[for="signup-email"]').classList.toggle('is-error', !emailOk);
      document.getElementById('signup-email-hint').hidden = emailOk;

      passwordEl.classList.toggle('is-error', !passwordOk);
      document.querySelector('label[for="signup-password"]').classList.toggle('is-error', !passwordOk);
      document.getElementById('signup-strength').hidden = passwordOk;
      document.getElementById('signup-password-hint').hidden = passwordOk;
      document.getElementById('signup-password-hint').classList.toggle('is-error', !passwordOk);
      document.getElementById('signup-password-hint').textContent = passwordOk
        ? '8+ characters, with one number and one letter.'
        : 'Too short — needs at least 8 characters and one number.';

      document.getElementById('signup-terms-label').classList.toggle('is-error', !termsOk);
      document.getElementById('signup-terms-text').innerHTML = termsOk
        ? 'I agree to the <a href="#">terms</a> and <a href="#">privacy policy</a>.'
        : 'Please accept the <a href="#">terms</a> and <a href="#">privacy policy</a> to continue.';

      const signupError = document.getElementById('signup-error');
      signupError.hidden = failCount === 0;
      if (failCount > 0) {
        document.getElementById('signup-error-text').textContent =
          `${failCount} field${failCount === 1 ? '' : 's'} need${failCount === 1 ? 's' : ''} attention before we can create your account.`;
        return;
      }

      document.getElementById('auth-welcome-title').textContent = name ? `Welcome, ${name.split(' ')[0]}` : 'Welcome';
      authContent.dataset.pendingName = name;
      authContent.dataset.pendingEmail = email;
      showView('about');
    });

    // Social button (Google only — Apple removed, it requires a paid Apple
    // Developer membership) mocks instant success, no real OAuth exists.
    // Which tab is active decides whether it behaves like a sign-in
    // (straight through) or a sign-up (goes through the about-you step).
    document.querySelectorAll('[data-auth-social]').forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.closest('[data-auth-view]').id;
        if (view === 'auth-view-signup') {
          document.getElementById('auth-welcome-title').textContent = 'Welcome';
          authContent.dataset.pendingName = '';
          authContent.dataset.pendingEmail = '';
          showView('about');
        } else {
          finishAuth('', '');
        }
      });
    });

    const completeAbout = () => finishAuth(authContent.dataset.pendingName, authContent.dataset.pendingEmail);
    document.getElementById('about-skip').addEventListener('click', completeAbout);
    document.getElementById('about-save').addEventListener('click', completeAbout);
  }

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