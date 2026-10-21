/* =========================================================
   KITE — shared site script (runs on every page)
   ========================================================= */
(function () {
  "use strict";

  /* ---------- safe storage helpers (storage can be blocked) ---------- */
  function read(store, key) {
    try { return JSON.parse(store.getItem(key)); } catch (e) { return null; }
  }
  function write(store, key, value) {
    try { store.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; }
  }
  function remove(store, key) {
    try { store.removeItem(key); } catch (e) { /* ignore */ }
  }

  /* ---------- toasts ---------- */
  function toast(message) {
    var wrap = document.querySelector("[data-toasts]");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.className = "toast-wrap";
      wrap.setAttribute("aria-live", "polite");
      wrap.setAttribute("data-toasts", "");
      document.body.appendChild(wrap);
    }
    var el = document.createElement("div");
    el.className = "toast";
    el.textContent = message;
    wrap.appendChild(el);
    setTimeout(function () {
      el.classList.add("is-leaving");
      setTimeout(function () { el.remove(); }, 320);
    }, 2800);
  }
  window.kiteToast = toast;

  /* ---------- mobile menu ---------- */
  function initMenu() {
    var toggle = document.querySelector(".menu-toggle");
    var menu = document.getElementById("mobile-menu");
    if (!toggle || !menu) return;

    function setOpen(open) {
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      menu.classList.toggle("is-open", open);
      document.body.classList.toggle("is-locked", open);
    }
    toggle.addEventListener("click", function () {
      setOpen(toggle.getAttribute("aria-expanded") !== "true");
    });
    menu.addEventListener("click", function (e) {
      if (e.target.closest("a")) setOpen(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && menu.classList.contains("is-open")) { setOpen(false); toggle.focus(); }
    });
    window.addEventListener("resize", function () {
      if (window.innerWidth >= 1024) setOpen(false);
    });
  }

  /* ---------- scroll reveal ---------- */
  function initReveal() {
    var groups = document.querySelectorAll(".reveal-group");
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!groups.length || reduce || !("IntersectionObserver" in window)) return;

    document.documentElement.classList.add("motion-ready");
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.08 });
    groups.forEach(function (g) { io.observe(g); });
  }

  /* ---------- cursor glow ---------- */
  function initCursorGlow() {
    var glow = document.querySelector(".cursor-glow");
    if (!glow || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    var frame = null;
    window.addEventListener("pointermove", function (e) {
      if (frame) return;
      frame = requestAnimationFrame(function () {
        glow.style.setProperty("--gx", e.clientX + "px");
        glow.style.setProperty("--gy", e.clientY + "px");
        glow.classList.add("is-on");
        frame = null;
      });
    });
    document.addEventListener("pointerleave", function () { glow.classList.remove("is-on"); });
  }

  /* ---------- provider + model marquees ---------- */
  var PROVIDERS = ["OpenAI", "Anthropic", "Gemini", "Mistral", "Llama", "DeepSeek", "Qwen", "Cohere", "Perplexity", "Ollama", "OpenRouter", "xAI"];
  var MODELS = ["claude opus", "claude sonnet", "gpt", "gpt mini", "gemini pro", "gemini flash", "mistral large", "llama", "deepseek", "qwen", "openrouter", "ollama", "local models", "your own endpoint"];
  var MARK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M12 2.5 L20 9.5 L12 21.5 L4 9.5 Z"/></svg>';

  function initMarquees() {
    document.querySelectorAll("[data-providers]").forEach(function (row) {
      row.innerHTML = PROVIDERS.map(function (p) { return '<span class="provider">' + MARK + p + "</span>"; }).join("");
    });
    document.querySelectorAll("[data-models]").forEach(function (row) {
      row.innerHTML = MODELS.map(function (m) { return "<li>" + m + '<span aria-hidden="true">/</span></li>'; }).join("");
    });
  }

  /* ---------- FAQ accordion (questions and answers live in index.html) ---------- */
  function initFaq() {
    var list = document.querySelector("[data-faq]");
    if (!list) return;

    list.addEventListener("click", function (e) {
      var btn = e.target.closest(".faq-q");
      if (!btn) return;
      var item = btn.closest(".faq-item");
      var open = !item.classList.contains("is-open");
      item.classList.toggle("is-open", open);
      btn.setAttribute("aria-expanded", String(open));
    });
  }

  /* ---------- modals ---------- */
  var lastFocus = null;

  function openModal(name, trigger) {
    var modal = document.getElementById("modal-" + name);
    if (!modal) return;
    lastFocus = trigger || document.activeElement;
    modal.classList.add("is-open");
    document.body.classList.add("is-locked");
    var focusable = modal.querySelector(".modal-close");
    if (focusable) setTimeout(function () { focusable.focus(); }, 50);
    // restart CSS animations (launch film) each time it opens
    modal.querySelectorAll(".film-slide, .film-bar, .film img").forEach(function (el) {
      el.style.animation = "none"; void el.offsetWidth; el.style.animation = "";
    });
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove("is-open");
    if (!document.querySelector(".modal.is-open")) document.body.classList.remove("is-locked");
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  window.kiteModal = { open: openModal, close: closeModal };

  function initModals() {
    document.addEventListener("click", function (e) {
      var opener = e.target.closest("[data-open-modal]");
      if (opener) {
        var name = opener.getAttribute("data-open-modal");
        if (name === "download") {
          var label = document.querySelector("[data-platform-name]");
          if (label) label.textContent = opener.getAttribute("data-platform") || "desktop";
        }
        if (name === "cart") renderCart();
        openModal(name, opener);
        return;
      }
      if (e.target.closest("[data-close-modal]")) {
        closeModal(e.target.closest(".modal"));
      }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      var open = document.querySelectorAll(".modal.is-open");
      if (open.length) closeModal(open[open.length - 1]);
    });
  }

  /* ---------- demo cart (non-sensitive, stored locally) ---------- */
  var CART_KEY = "kite.demo.cart";
  var PRICE = 199;

  function getCart() { return read(window.localStorage, CART_KEY) || []; }
  function saveCart(items) { write(window.localStorage, CART_KEY, items); updateCartCount(); }

  function updateCartCount() {
    var count = getCart().reduce(function (n, item) { return n + item.qty; }, 0);
    document.querySelectorAll("[data-cart-count]").forEach(function (el) {
      el.textContent = count;
      el.classList.toggle("has-items", count > 0);
    });
  }

  function renderCart() {
    var box = document.querySelector("[data-cart-items]");
    if (!box) return;
    var items = getCart();
    var total = 0;
    if (!items.length) {
      box.innerHTML = '<p class="cart-empty">your cart is empty. take a look at <button type="button" class="glow-text" data-open-modal="product">KITE k1</button>.</p>';
    } else {
      box.innerHTML = items.map(function (item, i) {
        total += item.qty * PRICE;
        return (
          '<div class="cart-line">' +
            '<img src="assets/k1.svg" alt="">' +
            "<div><strong>KITE k1</strong><span>" + item.color + " · $" + PRICE + "</span></div>" +
            '<div class="qty"><button type="button" data-qty="-1" data-index="' + i + '" aria-label="decrease quantity">−</button>' +
            "<span>" + item.qty + "</span>" +
            '<button type="button" data-qty="1" data-index="' + i + '" aria-label="increase quantity">+</button></div>' +
          "</div>"
        );
      }).join("");
    }
    var totalEl = document.querySelector("[data-cart-total]");
    if (totalEl) totalEl.textContent = "$" + total.toLocaleString();
  }

  function initCart() {
    updateCartCount();
    var selected = "white";

    document.addEventListener("click", function (e) {
      var swatch = e.target.closest(".swatch");
      if (swatch) {
        selected = swatch.getAttribute("data-color");
        swatch.parentElement.querySelectorAll(".swatch").forEach(function (s) {
          s.setAttribute("aria-pressed", String(s === swatch));
        });
        return;
      }
      if (e.target.closest("[data-add-to-cart]")) {
        var items = getCart();
        var existing = items.filter(function (i) { return i.color === selected; })[0];
        if (existing) existing.qty += 1; else items.push({ color: selected, qty: 1 });
        saveCart(items);
        closeModal(document.getElementById("modal-product"));
        renderCart();
        openModal("cart");
        return;
      }
      var qtyBtn = e.target.closest("[data-qty]");
      if (qtyBtn) {
        var list = getCart();
        var idx = Number(qtyBtn.getAttribute("data-index"));
        list[idx].qty += Number(qtyBtn.getAttribute("data-qty"));
        if (list[idx].qty <= 0) list.splice(idx, 1);
        saveCart(list);
        renderCart();
        return;
      }
      if (e.target.closest("[data-checkout]")) {
        toast(getCart().length ? "demo store — checkout isn't available, no order was placed." : "your cart is empty.");
      }
    });
  }

  /* ---------- misc ---------- */
  function initYear() {
    document.querySelectorAll("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
  }

  // fallback if any image fails: keep layout, hide broken icon
  function initImageFallback() {
    document.querySelectorAll("img").forEach(function (img) {
      img.addEventListener("error", function () { img.style.visibility = "hidden"; });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initMenu();
    initMarquees();
    initFaq();
    initReveal();
    initCursorGlow();
    initModals();
    initCart();
    initYear();
    initImageFallback();
  });

})();
