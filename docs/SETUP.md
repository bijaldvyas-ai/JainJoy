# JainJoy 2.0 – Setup and Deployment

JainJoy is a static web app (HTML, CSS, JavaScript) with an on-device database. It needs no server code, build step or database credentials.

## Folder layout

| Path | What it is |
|---|---|
| `index.html` | App shell, link-preview tags, script loading |
| `css/app.css` | Styles (glass surfaces, light and dark themes) |
| `js/data/` | Seed data: ingredients, 36 states and UTs with 580 Indian cities, cuisines and thali structures, step templates, 391 recipes |
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
