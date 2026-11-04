# JainJoy 2.0 – Setup and Deployment

JainJoy is a static web app (HTML, CSS, JavaScript) with an on-device database. It needs no server code, build step or database credentials.

## Folder layout

| Path | What it is |
|---|---|
| `index.html` | App shell, link-preview tags, script loading |
| `css/app.css` | Styles (glass surfaces, light and dark themes) |
| `js/data/` | Seed data: ingredients and their classification and synonyms (`classification.js`), 36 states and UTs with 580 Indian cities, cuisines and thali structures, step templates, 415 recipes including 24 Parva Tithi recipes (`recipes-parva.js`), nutrition values |
| `js/engine/` | Astronomy, Panchang and timings, Jain compliance, meal planner and grocery |
| `js/db.js` | IndexedDB database, seeding, v1 migration |
| `js/i18n.js` | All interface text in English, Hindi and Gujarati |
| `js/app.js` | Screens and navigation |
| `tests/` | Automated test suite (`tests/index.html`) |
| `db/` | Server schema (`schema.sql`), migrations, seed SQL generator |
| `docs/` | PRD 2.0, test report, this guide |

## Run on your computer

1. Double-click `START-JainJoy.bat` (Windows). It starts a small built-in server and opens `http://localhost:8080`.
2. Keep the black window open while using the app.
3. Run the tests at `http://localhost:8080/tests/`.

Any static server also works, for example `python -m http.server 8080` inside this folder. Opening `index.html` directly from disk is not supported (browsers block the database and offline mode for `file://`).

## Publish on GitHub Pages (current hosting)

The live site is published from the `gh-pages` branch of `bijaldvyas-ai/JainJoy`.

```bash
git push origin main
git push origin main:gh-pages
```

GitHub rebuilds the site in about a minute. The link stays https://bijaldvyas-ai.github.io/JainJoy/.

A preview build is published under `/v2-preview/` on the same site so it can be checked before replacing the live app.

## Updating after a change

- Change recipes in `js/data/recipes-*.js` and raise `SEED_VERSION` in `js/db.js`, so phones re-seed. Recipes edited in Recipe admin on a phone are never overwritten.
- Raise the `?v=` number in `index.html` and `CACHE`/`V` in `sw.js` so phones fetch the new files.
- Run `tests/index.html` and check that every test passes before publishing.

## External services and dependencies

| Dependency | Used for | If unavailable |
|---|---|---|
| Astronomy Engine 2.1.19 (MIT), from cdn.jsdelivr.net | Precise sun and moon positions for tithi, sunrise and sunset | Built-in Meeus formulas are used (tithi times within a few minutes); cached for offline after the first visit |
| Open-Meteo geocoding API (free, no key) | "Search any town or village" | Built-in list of 614 cities and "Use my location" still work |
| Google Fonts | Fraunces and Nunito Sans | System fonts |

## Not included (needs your decision or accounts)

- **Cloud database and sync between phones.** The schema for PostgreSQL is in `db/schema.sql`. Hosting it needs an account such as Supabase, Firebase or a VPS, plus credentials.
- **Admin sign-in.** Recipe admin works on each device without a password. A shared admin needs the cloud database above.
- **Certified Panchang.** Tithi is calculated astronomically. Matching a specific Sangh's printed Panchang needs that Sangh's published data.
- **External recipe sources.** Each recipe has a source record (JainJoy Kitchen, original adaptation), but no external URL and no human culinary review yet.

## Parva Tithi engine (v2.1)

- Rules live in `js/engine/panchang.js` (`JJ.PARVA`, `JJ.dayRules`) and the validators in `js/engine/compliance.js` (`JJ.levelA`, `JJ.levelB`, `JJ.allowed`).
- Ingredient classification and synonyms are in `js/data/classification.js`. To recognise a new regional name, add it to `JJ.SYNONYMS`, or map it in Recipe admin → "ingredient names waiting for verification".
- Existing households were moved to the Strict profile (5 Parva Tithis). They can choose Standard or Custom in Profile → Tithi observances. Past menus were not changed.
- New Level B recipes: add them to `js/data/recipes-parva.js` (or through Recipe admin), raise `SEED_VERSION` in `js/db.js`, and rerun the tests.
- Reminders: the calendar file is created on the phone. Real push notifications at a fixed time would need a push server (for example Firebase Cloud Messaging) and an account; that is not included.

## Customer accounts (optional, Supabase)

JainJoy works without accounts. To switch on Sign Up / Login and the admin Customers list:

1. Go to https://supabase.com, sign in (GitHub is easiest) and create a **New project** named `jainjoy`, region **Mumbai (ap-south-1)**. Keep the database password to yourself.
2. **Authentication → Sign In / Providers → Email**: turn **Confirm email** OFF (customers sign in with phone + password; no e-mails are sent). Set the minimum password length to 8.
3. **SQL Editor → New query**: paste all of `db/supabase-setup.sql` and press **Run**.
4. **Project Settings → API**: copy the **Project URL** and the **anon public** key into `js/config.js` (`supabaseUrl`, `supabaseKey`) and publish.
5. Open the app, **Profile → Sign up** with your own phone number. Then in the SQL Editor run the last line of `db/supabase-setup.sql` with your number to make that account the admin.
6. **Profile → Recipe admin** now opens with the live **Customers** section.

How it is protected:
- **Passwords:** Supabase Auth keeps only bcrypt hashes in `auth.users`. The `customers` table has no password column, and no screen or API key can read the hashes.
- **Who sees what:** row-level security lets a customer read only their own row. Only accounts listed in `public.admins` can read all customers or block and delete them, and they do it through security-definer functions that check `is_admin()`.
- **Blocking:** a blocked customer is banned in Supabase Auth, so the server refuses their login and ends their open sessions. Unblocking lifts the ban.
- **Login attempts:** Supabase Auth limits sign-in requests per IP address (Authentication → Rate Limits). The app also locks login on that phone for 5 minutes after 5 wrong passwords.
- **Live updates:** the admin table refreshes every 5 seconds and also listens for realtime database changes.

## Business settings (before selling)

Sign in with the admin account, open **Profile → Admin dashboard → Business settings**, enter:
- **UPI ID** – where the ₹199 payments go (for example `name@okhdfcbank`). Scan the test QR with your own UPI app to check that it shows ₹199 to your account.
- **Support WhatsApp number** – used by "Forgot password?" and "Need help?".
- **Contact name and email** – shown on the Privacy, Terms and Refunds pages.

Press **Save settings**; every customer gets them straight away. Run `db/supabase-subscription.sql` once in the Supabase SQL Editor if the project is new.

## Turning the subscription model on later

Everything for Sign Up / Sign In, the 3-month free period, the ₹199/year UPI subscription and the admin dashboard is already in the code and the Supabase project. To switch it on:
1. In `js/config.js` set `accountsEnabled: true`.
2. Bump the version (`?v=` in index.html and `CACHE`/`V` in sw.js) and publish.
3. Sign in with the admin number and fill in **Admin dashboard → Business settings** (UPI ID, WhatsApp, contact).
The free period counts from each customer's sign-up date, so people who sign up after the switch get their full 3 months.
