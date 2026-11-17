# Database migrations

| Version | Where | What |
|---|---|---|
| 001 | `001_initial_schema.sql` | Server schema (PostgreSQL) for every JainJoy table. Not deployed yet: no server or credentials exist. |
| 002 | `../export-seed.html` | Generates `INSERT` statements for ingredients, cities, recipes, translations and sources from the app's seed data. Open it in a browser, copy the SQL, run it after 001. |
| Device | `js/db.js` | On the phone the same tables live in IndexedDB (`jainjoy`, version 1). `SEED_VERSION` re-seeds recipes when the seed changes, without overwriting recipes edited in Recipe admin. v1 data (`localStorage: jainjoy.app.v1`) is imported once: profile plus past menus into history. |
