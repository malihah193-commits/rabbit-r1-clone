/* =========================================================
   KITE — authentication with Supabase (ES module)

   Loaded with <script type="module" src="auth.js"> on every page.
   - header: shows the signed-in user's name instead of "sign in"
   - signup.html: supabase.auth.signUp (email confirmation is on, so
     new users get an email link before they can sign in)
   - signin.html: supabase.auth.signInWithPassword
   - account.html: signed-in only; shows the user and a sign-out button
   The Supabase client itself lives in supabase.js.
   ========================================================= */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const toast = window.kiteToast || function () {};
const page = {
  signin: document.getElementById("signin-form"),
  signup: document.getElementById("signup-form"),
  account: document.querySelector("[data-account-page]")
};

/* ---------- UI helpers ---------- */
const ICON_ERR = '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M10 1.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17Zm.9 12.8H9.1v-1.8h1.8v1.8Zm0-3.4H9.1V5.6h1.8v5.3Z"/></svg>';
const ICON_INFO = '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M10 1.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17Zm.9 12.6H9.1V8.9h1.8v5.2Zm0-6.6H9.1V5.8h1.8v1.7Z"/></svg>';

function showAlert(type, message, action) {
  const box = document.querySelector("[data-alert]");
  if (!box) return;
  box.className = "alert is-visible " + (type === "info" ? "alert-info" : "alert-error");
  box.setAttribute("role", type === "info" ? "status" : "alert");
  box.innerHTML = (type === "info" ? ICON_INFO : ICON_ERR) + "<span></span>";
  const text = box.querySelector("span");
  text.textContent = message;
  if (action) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "link-btn alert-action";
    btn.textContent = action.label;
    btn.addEventListener("click", action.onClick);
    text.append(" ", btn);
  }
}
function hideAlert() {
  const box = document.querySelector("[data-alert]");
  if (box) box.className = "alert";
}

function setFieldError(input, message) {
  const err = document.getElementById(input.id + "-error");
  input.setAttribute("aria-invalid", message ? "true" : "false");
  input.classList.toggle("is-valid", !message && input.type !== "checkbox" && input.value !== "");
  if (err) err.textContent = message || "";
  return !message;
}

function focusFirstInvalid(form) {
  const bad = form.querySelector('[aria-invalid="true"]');
  if (bad) bad.focus();
}

function setLoading(form, loading, label) {
  const btn = form.querySelector(".btn-submit");
  const text = form.querySelector("[data-submit-label]");
  if (!btn) return;
  if (!btn.dataset.label) btn.dataset.label = text.textContent;
  btn.disabled = loading;
  btn.classList.toggle("is-loading", loading);
  btn.setAttribute("aria-busy", String(loading));
  text.textContent = loading ? label : btn.dataset.label;
}

/* ---------- validators ---------- */
function checkName(input) {
  const v = input.value.trim();
  if (!v) return setFieldError(input, "please enter your name.");
  if (v.length < 2) return setFieldError(input, "your name needs at least 2 characters.");
  return setFieldError(input, "");
}
function checkEmail(input) {
  const v = input.value.trim();
  if (!v) return setFieldError(input, "please enter your email.");
  if (!EMAIL_RE.test(v)) return setFieldError(input, "that doesn't look like a valid email, e.g. you@example.com.");
  return setFieldError(input, "");
}
function checkPasswordPresent(input) {
  if (!input.value) return setFieldError(input, "please enter your password.");
  return setFieldError(input, "");
}
function checkNewPassword(input) {
  const v = input.value;
  if (!v) return setFieldError(input, "please choose a password.");
  if (v.length < 8) return setFieldError(input, "use at least 8 characters.");
  if (!/[a-z]/i.test(v) || !/\d/.test(v)) return setFieldError(input, "include at least one letter and one number.");
  return setFieldError(input, "");
}
function checkConfirm(input, pw) {
  if (!input.value) return setFieldError(input, "please confirm your password.");
  if (input.value !== pw.value) return setFieldError(input, "passwords don't match.");
  return setFieldError(input, "");
}
function checkTerms(input) {
  return setFieldError(input, input.checked ? "" : "please accept the terms to continue.");
}

function scorePassword(v) {
  if (!v) return 0;
  let s = 0;
  if (v.length >= 8) s++;
  if (/[a-z]/i.test(v) && /\d/.test(v)) s++;
  if (/[A-Z]/.test(v) && /[a-z]/.test(v)) s++;
  if (/[^a-z0-9]/i.test(v) || v.length >= 14) s++;
  return Math.max(1, s);
}

/* ---------- small auth helpers ---------- */
function displayName(user) {
  const meta = user.user_metadata || {};
  return (meta.full_name || user.email.split("@")[0]).trim();
}
function firstName(user) {
  return displayName(user).split(/\s+/)[0].toLowerCase();
}
// only allow redirects back to pages on this site
function safeNext() {
  const next = new URLSearchParams(location.search).get("next");
  return /^[a-z-]+\.html$/.test(next || "") ? next : "account.html";
}
function pageUrl(file) {
  return new URL(file, location.href).href.split("#")[0].split("?")[0];
}
function friendlyError(error) {
  const msg = (error && error.message) || "";
  if (/invalid login credentials/i.test(msg)) return "that email and password don't match an account. check for typos and try again.";
  if (/email not confirmed/i.test(msg)) return "please confirm your email first. we sent a link to your inbox when you signed up.";
  if (/already registered|already exists/i.test(msg)) return "an account with this email already exists. sign in instead.";
  if (/rate limit|too many/i.test(msg)) return "too many attempts in a short time. please wait a minute and try again.";
  if (/failed to fetch|network/i.test(msg)) return "couldn't reach the server. check your internet connection and try again.";
  return msg || "something went wrong. please try again.";
}

/* ---------- forms that work before Supabase loads ---------- */
function initPasswordToggles() {
  document.querySelectorAll("[data-toggle-password]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      const show = btn.getAttribute("aria-pressed") !== "true";
      btn.getAttribute("aria-controls").split(" ").forEach(function (id) {
        const input = document.getElementById(id);
        if (input) input.type = show ? "text" : "password";
      });
      btn.setAttribute("aria-pressed", String(show));
      btn.setAttribute("aria-label", show ? "hide password" : "show password");
      btn.querySelector("span").textContent = show ? "hide" : "show";
    });
  });
}

/* ---------- header: signed-in state on every page ---------- */
function renderHeader(user) {
  document.querySelectorAll(".header-account, .mobile-account").forEach(function (link) {
    if (link.hasAttribute("data-keep-label")) return;
    const label = link.querySelector("span") || link;
    if (user) {
      link.setAttribute("href", "account.html");
      label.textContent = firstName(user);
    } else {
      link.setAttribute("href", "signin.html");
      label.textContent = "sign in";
    }
  });
}

/* ---------- sign in ---------- */
function initSignIn(supabase) {
  const form = page.signin;
  const email = form.email, password = form.password;
  const params = new URLSearchParams(location.search);

  if (params.get("email")) email.value = params.get("email");
  if (params.get("next")) showAlert("info", "please sign in to open your KITE OS workspace.");
  if (params.get("signedout") === "1") showAlert("info", "you've been signed out.");

  email.addEventListener("blur", function () { if (email.value) checkEmail(email); });
  [email, password].forEach(function (input) {
    input.addEventListener("input", function () {
      if (input.getAttribute("aria-invalid") === "true") setFieldError(input, "");
    });
  });

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    hideAlert();
    if (!(checkEmail(email) & checkPasswordPresent(password))) {
      showAlert("error", "please fix the highlighted fields.");
      focusFirstInvalid(form);
      return;
    }
    const address = email.value.trim().toLowerCase();
    setLoading(form, true, "signing in…");
    const { data, error } = await supabase.auth.signInWithPassword({ email: address, password: password.value });

    if (error) {
      setLoading(form, false);
      password.value = "";
      const unconfirmed = /email not confirmed/i.test(error.message || "");
      showAlert("error", friendlyError(error), unconfirmed ? {
        label: "resend the confirmation email",
        onClick: async function () {
          const res = await supabase.auth.resend({ type: "signup", email: address, options: { emailRedirectTo: pageUrl("signin.html") } });
          showAlert(res.error ? "error" : "info", res.error ? friendlyError(res.error) : "confirmation email sent to " + address + ". check your inbox (and spam).");
        }
      } : null);
      password.focus();
      return;
    }

    setLoading(form, true, "signed in");
    showAlert("info", "welcome back, " + firstName(data.user) + ". opening your workspace…");
    setTimeout(function () { location.href = safeNext(); }, 600);
  });
}

/* ---------- sign up ---------- */
function initSignUp(supabase) {
  const form = page.signup;
  const name = form.elements["name"], email = form.email, pw = form.password, confirm = form.confirm, terms = form.terms;
  const meter = form.querySelector("[data-strength]");
  const meterLabel = form.querySelector("[data-strength-label]");
  const LABELS = ["use 8+ characters with at least one letter and one number.", "strength: weak", "strength: fair", "strength: good", "strength: strong"];

  pw.addEventListener("input", function () {
    const s = scorePassword(pw.value);
    meter.setAttribute("data-score", String(s));
    meterLabel.textContent = LABELS[s];
    if (pw.getAttribute("aria-invalid") === "true") checkNewPassword(pw);
    if (confirm.value) checkConfirm(confirm, pw);
  });
  name.addEventListener("blur", function () { if (name.value) checkName(name); });
  email.addEventListener("blur", function () { if (email.value) checkEmail(email); });
  pw.addEventListener("blur", function () { if (pw.value) checkNewPassword(pw); });
  confirm.addEventListener("input", function () { if (confirm.getAttribute("aria-invalid") === "true" || confirm.value.length >= pw.value.length) checkConfirm(confirm, pw); });
  terms.addEventListener("change", function () { if (terms.getAttribute("aria-invalid") === "true") checkTerms(terms); });
  [name, email].forEach(function (input) {
    input.addEventListener("input", function () { if (input.getAttribute("aria-invalid") === "true") setFieldError(input, ""); });
  });

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    hideAlert();
    if (!(checkName(name) & checkEmail(email) & checkNewPassword(pw) & checkConfirm(confirm, pw) & checkTerms(terms))) {
      showAlert("error", "please fix the highlighted fields.");
      focusFirstInvalid(form);
      return;
    }
    const address = email.value.trim().toLowerCase();
    setLoading(form, true, "creating account…");
    const { data, error } = await supabase.auth.signUp({
      email: address,
      password: pw.value,
      options: {
        data: { full_name: name.value.trim() },
        emailRedirectTo: pageUrl("signin.html")
      }
    });
    setLoading(form, false);

    if (error) {
      showAlert("error", friendlyError(error));
      return;
    }
    // with email confirmation on, Supabase hides whether an email is taken:
    // an existing address comes back as a user with no identities
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      setFieldError(email, "an account with this email already exists.");
      showAlert("error", "that email is already registered. sign in instead, or use a different email.");
      email.focus();
      return;
    }
    if (data.session) {
      // confirmation turned off in Supabase: the user is signed in straight away
      location.href = "account.html";
      return;
    }

    pw.value = ""; confirm.value = "";
    meter.setAttribute("data-score", "0");
    meterLabel.textContent = LABELS[0];
    form.querySelectorAll(".is-valid").forEach(function (el) { el.classList.remove("is-valid"); });
    showAlert("info", "almost done. we sent a confirmation link to " + address + ". click it, then sign in. (check spam if it doesn't arrive in a minute.)");
  });
}

/* ---------- workspace (account.html, signed-in only) ---------- */
const PLANS = {
  default: ["understand what you're asking for", "gather what's needed from your connected computer", "do the work, step by step", "check with you before anything is sent"],
  lisbon: ["check your calendar for a free weekend", "compare flights and 3 hotels near alfama", "draft a day-by-day itinerary", "hold bookings — waiting for your ok"],
  downloads: ["scan 312 files in /downloads", "group by type, project and date", "rename using your naming style", "move 41 duplicates to trash — waiting for your ok"],
  laptops: ["collect specs and prices for 3 models", "pull reviews for battery, screen and keyboard", "build a side-by-side comparison", "recommend one — your call"]
};

function pickPlan(text) {
  const t = text.toLowerCase();
  if (/lisbon|trip|weekend|travel/.test(t)) return PLANS.lisbon;
  if (/download|folder|files|sort/.test(t)) return PLANS.downloads;
  if (/laptop|compare/.test(t)) return PLANS.laptops;
  return PLANS.default;
}

function initWorkspace() {
  const composer = document.querySelector("[data-composer]");
  if (!composer) return;
  const input = composer.thought;
  const run = document.querySelector("[data-run]");
  let timers = [];

  function start(text) {
    timers.forEach(clearTimeout); timers = [];
    run.innerHTML = '<p class="run-title"></p>';
    run.querySelector(".run-title").textContent = "KITE · " + text;
    const els = pickPlan(text).map(function (label) {
      const row = document.createElement("div");
      row.className = "run-step";
      row.innerHTML = '<span class="dot" aria-hidden="true"></span><span></span>';
      row.lastChild.textContent = label;
      run.appendChild(row);
      return row;
    });
    els.forEach(function (row, i) {
      timers.push(setTimeout(function () {
        if (i > 0) { els[i - 1].classList.remove("is-active"); els[i - 1].classList.add("is-done"); }
        row.classList.add(i === els.length - 1 ? "is-wait" : "is-active");
        if (i === els.length - 1) toast("KITE needs your ok to finish (simulation).");
      }, 300 + i * 1100));
    });
  }

  composer.addEventListener("submit", function (e) {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) { toast("type a thought first, e.g. plan a weekend in lisbon."); input.focus(); return; }
    start(text);
    input.value = "";
  });
  document.querySelectorAll("[data-suggest]").forEach(function (btn) {
    btn.addEventListener("click", function () { start(btn.textContent); });
  });
}

function renderAccount(user) {
  const set = function (sel, value) { const el = document.querySelector(sel); if (el) el.textContent = value; };
  set("[data-user-first]", firstName(user));
  set("[data-user-name]", displayName(user));
  set("[data-user-email]", user.email);
  set("[data-user-since]", new Date(user.created_at).toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" }));
  set("[data-user-status]", user.email_confirmed_at ? "email confirmed" : "email not confirmed");
  document.body.classList.remove("is-auth-pending");
}

/* ---------- boot ---------- */
initPasswordToggles();
initWorkspace();

let supabase = null;
try {
  ({ supabase } = await import("./supabase.js"));
} catch (err) {
  console.error("KITE: couldn't load Supabase", err);
}

if (!supabase) {
  if (page.signin || page.signup) {
    showAlert("error", "couldn't connect to the sign-in service. check your internet connection and reload the page.");
    document.querySelectorAll(".btn-submit").forEach(function (b) { b.disabled = true; });
  }
  if (page.account) location.replace("signin.html?next=account.html");
} else {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session ? session.user : null;
  renderHeader(user);

  // keep the header (and other tabs) in step with sign-in / sign-out
  supabase.auth.onAuthStateChange(function (event, newSession) {
    renderHeader(newSession ? newSession.user : null);
    if (event === "SIGNED_OUT" && page.account) location.replace("signin.html");
  });

  if (page.account) {
    if (!user) {
      location.replace("signin.html?next=account.html");
    } else {
      renderAccount(user);
      document.querySelectorAll("[data-signout]").forEach(function (btn) {
        btn.addEventListener("click", async function () {
          btn.disabled = true;
          await supabase.auth.signOut();
          location.href = "signin.html?signedout=1";
        });
      });
    }
  }

  if (page.signin) {
    // arriving from the confirmation email link, or already signed in
    if (user) {
      showAlert("info", "you're signed in as " + user.email + ". opening your workspace…");
      setTimeout(function () { location.href = safeNext(); }, 900);
    }
    initSignIn(supabase);
  }
  if (page.signup) initSignUp(supabase);
}
