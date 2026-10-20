# KITE — frontend

A frontend recreation of the rabbit.tech homepage layout, rebranded as **KITE** with a black, monochrome theme.
Plain HTML, CSS and JavaScript. No frameworks, no build step, no backend.

## Files

```
kite/
  index.html      homepage (hero, 4 feature sections, model marquee, k1, FAQ, closing CTA)
  signin.html     sign-in page (UI only)
  signup.html     sign-up page (UI only)
  account.html    workspace preview with a simulated task runner (open to everyone)
  legal.html      help, order tracking, terms, privacy, warranty (footer links)
  styles.css      shared styles + colour tokens (top of file)
  auth.css        sign-in / sign-up / workspace / help page styles
  script.js       mobile menu, scroll reveals, FAQ, modals, demo cart, marquees
  auth.js         form validation, show/hide password, workspace simulation
  assets/         original SVG artwork + favicon
```

## Run it locally

Option A: VS Code + Live Server
1. In VS Code: **File → Open Folder…** and choose the `kite` folder.
2. Install the **Live Server** extension (by Ritwick Dey).
3. Right-click `index.html` → **Open with Live Server**.

Option B: Python (already installed on this PC)
```
cd "C:\Users\Khan Laptops\Desktop\My Filee\kite"
python -m http.server 8000
```
Then open http://localhost:8000 in your browser. Stop the server with `Ctrl+C`.

Use a local server: double-clicking `index.html` opens it as a file, and sign-in won't load that way.

## Accounts (Supabase)

- `supabase.js` creates the Supabase client (project URL + publishable key).
  Never put the `service_role` / secret key in this site.
- `auth.js` (loaded as `<script type="module">` on every page) handles sign-up, sign-in,
  sign-out, the header's signed-in name, and keeps `account.html` signed-in only.
- Email confirmation is on: after signing up, users click the emailed link, then sign in.
- In the Supabase dashboard → Authentication → URL Configuration, set the Site URL to
  `http://localhost:8000` and add `http://localhost:8000/**` to Redirect URLs.
- The site must be opened through a local server (not by double-clicking the file),
  because ES modules don't load from `file://`.

## Still simulated

- **Forgot password**: not connected yet.
- **Workspace task runner**: a scripted animation, not an AI.
- **Cart**: kept in `localStorage`; checkout is not connected to payments.
- **Downloads**: buttons open a notice; no installer files exist.

## Change the colours

Edit the tokens at the top of `styles.css` (`--accent`, `--paper`, `--header-bg`, the grays).
