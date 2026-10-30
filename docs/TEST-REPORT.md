# JainJoy 2.0 – Test Report

**Run:** 30 Oct 2026, Chrome (desktop app browser), local server · **Result: 20 of 20 passed**
**Astronomy:** Astronomy Engine 2.1.19 · **Reference city:** Ahmedabad unless stated
**How to rerun:** open `tests/index.html` from any web server (for example `https://bijaldvyas-ai.github.io/JainJoy/tests/`). The tests use a separate database (`jainjoy-test`) and never touch real app data.

## Required test cases

| # | Test | Result | Evidence |
|---|---|---|---|
| 1 | A Gujarati user receives a Gujarati-style lunch | PASS | Rotli, shaak, dal or kadhi, bhaat, salad, papad, pickle and chaas on 30 of 30 days; 98% of components are Gujarati or pan-Indian. Example: Phulka (Rotli), Corn Capsicum Sabzi, Saragva ni Dal, Steamed Rice, Kobi Marcha Sambharo, papad, pickle, chaas |
| 2 | A Maharashtrian user receives a Maharashtrian-style lunch | PASS | Bhakri or poli, bhaji, varan or amti, bhaat, koshimbir, chutney and papad; 85% Maharashtrian or pan-Indian. Example: Jowar Bhakri, Dodka Bhaji, Saragva ni Dal, Steamed Rice, Kakdi Koshimbir, peanut chutney, papad |
| 3 | No recipe contains prohibited ingredients | PASS | 391 approved recipes and 6 accompaniments checked: 0 violations |
| 3b | Compliance engine rejects bad recipes | PASS | Onion, Kaddu, Alavi and raw-curd + sev (dwidal) are rejected; cooked-curd kadhi is accepted |
| 4 | Kaddu and Alavi never enter the approved database | PASS | No ingredient ids or names (English, Hindi, Gujarati) match Kaddu, pumpkin, Alavi, arbi, patra or colocasia |
| 5 | Aatham and Chaudas exclude leafy vegetables | PASS | 16 Aatham and Chaudas days in 120 days: no leafy ingredient served (optional garnishes are removed) |
| 5b | Optional green-vegetable tithis | PASS | With the "5 tithis" rule, 21 days in 60 were green-free with no fresh produce served |
| 6 | Pancham Shukla is displayed correctly | PASS | 12 Shukla Pancham dates found in 2026; Gyan Pancham on 14 Nov 2026 |
| 6b | Panchang matches known dates | PASS | Mahavir Jayanti (10 Apr 2025, 31 Mar 2026), Akshaya Tritiya (30 Apr 2025), Samvatsari (27 Aug 2025), Diwali (21 Oct 2025), Jain New Year (22 Oct 2025), Kartik Purnima (5 Nov 2025); 2026 Adhik Jeth detected |
| 7 | Navkarsi and Chauvihar change with location and date | PASS | Ahmedabad and Kolkata sunrise differ by 64 min; June and December by 81 min; Ahmedabad sunrise on 10 Apr 2025 = 6:23 am (published 6:22–6:24) |
| 8 | English, Hindi and Gujarati work across all screens | PASS | 305 interface strings, 391 recipe names, 165 ingredients, the step templates and 36 states complete in all 3 languages; every main screen rendered in Hindi and Gujarati with no untranslated text |
| 9 | Next-month menus are accessible | PASS | November 2026 preview opens; saving the month stores all 30 days |
| 10 | Previous-month menus are accessible | PASS | All 30 days of September 2026 kept in history, each with recipe snapshots and that day's tithi and timings |
| 11 | Four meals appear every day | PASS | 7 households × 90 days, including a strict household (12 green-free tithis, no cauliflower or cabbage, peanut and sesame allergy, no lauki or tomato): no empty slot |
| 12 | Grocery lists aggregate correctly | PASS | Poha 750 g expected and computed; papad 4 pc; garnish dropped on a restricted day is not counted |
| 13 | Profile update regenerates future menus only | PASS | All history identical after changing Gujarat → Maharashtra; tomorrow rebuilt as Maharashtrian; 30 saved future days rebuilt |
| 14 | At least 300 unique approved recipes | PASS | 391 unique approved recipes: breakfast 104, lunch 141, dinner 104, snacks 42; 0 duplicates; 0 invalid |

## Additional checks

| # | Test | Result | Evidence |
|---|---|---|---|
| 15 | Steps, sources and dwidal | PASS | Every recipe has a source record, no dwidal, and every step renders in Gujarati |
| 16 | All states and union territories | PASS | 36 states and UTs, 580 Indian cities and towns; every state has at least one city |
| 17 | Kshaya and vriddhi rule | PASS | Repeated tithi observed on the second day; skipped tithi observed on the day before |

## Manual checks done in the browser

- Onboarding: language → tradition → sub-sect → country/state/city → cuisine (auto-filled from state) → household → plan.
- Today: live Navkarsi and Chauvihar countdown, tithi card, 4 meals, lunch thali with dwidal note, recipe page with scaled quantities and method.
- Calendar: current, next and previous months; status markers (history, saved plan, preview); "Generate and save this month's plan".
- Panchang tab: details, 45-day list of Aatham, Chaudas, Shukla Pancham and Jain festivals.
- Grocery: next 7 days, rest of month and next month; ticks; copy; previous lists.
- More: profile edit, recipe library, food glossary, recipe admin (a test recipe with onion was blocked from approval), data status and export.
- No console errors.

## Known limitations (not failures)

- Festival dates follow the udaya-tithi rule. Some Sanghs print a parva one day earlier or later (for example Diwali 2026 is shown on 9 Nov, the Amas at sunrise, while Lakshmi Puja is on 8 Nov).
- Recipes are original JainJoy adaptations, checked automatically; a human culinary review and external source links are still pending.
- Data lives on each device (IndexedDB). There is no cloud account or sync.
