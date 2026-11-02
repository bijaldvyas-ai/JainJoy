# JainJoy 2.0 – Test Report

**Run:** 2 Nov 2026, Chrome (desktop app browser), local server · **Result: 53 of 53 passed** (v2.7.0: Ayambil, Paryushan, dinner reminder, pantry, WhatsApp, auto refresh)
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
| 18 | Nutrition per recipe, meal and day | PASS | All 141 allowed ingredients have values; Jain Poha 416 kcal / 9.3 g protein / 60.6 g carbs / 15.8 g fat per serving, equal to the hand calculation; day total = sum of 4 meals on 30 of 30 days; 1,936–2,945 kcal per person per day |
| 19 | Choghadiya | PASS | 16 parts per day for 7 days; day parts run sunrise to sunset and night parts sunset to next sunrise with no gaps; each weekday starts correctly (Sun Udveg/Shubh … Sat Kaal/Labh); Monday night Char, Rog, Kaal, Labh, Udveg, Shubh, Amrit, Char |
| 20 | Made by BiNaiSa on every screen | PASS | Signature present on all 6 tabs in Gujarati; tab bar Today, Calendar, Panchang, Choghadiya, Grocery, Profile |

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

## PRD 2.1 – Jain Parva Tithi engine (mandatory tests)

Strict profile, Ahmedabad, 9 regional cuisines × 150 days from 1 Nov 2026 (234 Parva Tithi menus, 1,350 menus in all, both options checked).

| # | Test | Result | Evidence |
|---|---|---|---|
| P1 | Sud Pancham triggers the restriction | PASS | 14 Nov 2026, Shukla tithi 5 → Parva rule; 0 fresh vegetables in both options; the Standard profile adds no rule on this day |
| P2 | Sud Aatham triggers the restriction | PASS | 17 Nov 2026, Shukla tithi 8 → Parva rule; 0 fresh vegetables |
| P3 | Vad Aatham triggers the restriction | PASS | 2 Nov 2026, Krishna tithi 8 → Parva rule; 0 fresh vegetables |
| P4 | Sud Chaudas triggers the restriction | PASS | 23 Nov 2026, Shukla tithi 14 → Parva rule; 0 fresh vegetables |
| P5 | Vad Chaudas triggers the restriction | PASS | 8 Nov 2026, Krishna tithi 14 → Parva rule; 0 fresh vegetables |
| P6 | No leafy vegetables on these dates | PASS | 234 Parva menus: none |
| P7 | No fresh vegetables on these dates | PASS | No fresh vegetables, herbs or sprouts; no recipe was made to fit by dropping an ingredient |
| P8 | No onion or garlic on any day | PASS | 1,350 menus, both options: none |
| P9 | Kaddu excluded on every day | PASS | None in menus; "pumpkin" and "કોળું" resolve to Kaddu, which is prohibited |
| P10 | Confirmed Alavi excluded on every day | PASS | None in menus; alavi, arvi, taro, colocasia, अरबी, અળવી → Alavi root; patra, aluchi pane → Alavi leaves; both prohibited and verified |
| P11 | All recipe ingredients validated | PASS | 165 ingredients classified; 415 recipes valid; Level A 415, Level B 113; an unknown ingredient blocks approval; a recipe named "Jain Parva Special" containing tomato is not Level B |
| P12 | Chutneys, garnishes and accompaniments validated | PASS | Parva days allow papad, pickle, chaas, curd and dry peanut chutney, not the tomato chutney; 186 recipes with a fresh garnish are all excluded from Level B |
| P13 | Grocery lists exclude restricted ingredients | PASS | 40-day Parva list has no vegetable group and no prohibited item; 7-day list has no prohibited item |
| P14 | Regional meal planning continues | PASS | Core thali slots on every Parva day for all 9 cuisines; own-region or pan-Indian components 71–93% |
| P15 | English, Hindi and Gujarati throughout | PASS | 416 strings in 3 languages, none missing; Parva screens rendered in Hindi and Gujarati with no untranslated text |
| P16 | Panchang verified against the reference convention | PASS | Labh Pancham 26 Oct 2025 and 14 Nov 2026 (Sud 5), Durga Ashtami 30 Sep 2025 (Sud 8), Janmashtami 16 Aug 2025 (Vad 8), Kartaki Chaumasi Chaudas 4 Nov 2025 (Sud 14), Kali Chaudas 20 Oct 2025 (Vad 14) all match; 12–13 of each Parva Tithi in 2026; dates recomputed every year |
| P17 | Two options for every meal | PASS | Option 2 differs for breakfast, lunch, snack and dinner; grocery list follows the chosen option; all 234 Parva menus have two compliant options |
| P18 | Next-day reminder | PASS | 10 Parva days in the next 60 days → 10 calendar events, each with a 7 pm evening-before alarm; Today shows the Tomorrow card |
| P19 | Old saved menu re-checked | PASS | A menu saved before the rule with Gavar nu Shaak on Sud Aatham (17 Nov 2026) was found (2 problems) and rebuilt with 0 problems before display; the same was confirmed for today's saved menu on Vad Aatham (2 Nov 2026) |

Reference dates are the sunrise-tithi dates published for Gujarat. A Sangh whose printed Panchang uses a different convention may differ by a day on some dates; the app tells users to follow their Sangh for parva days.

## Home-kitchen tests (v2.6.0)

Gujarati family of 4, 28 days starting on a Monday, strict Parva rules.

| # | Test | Result | Evidence |
|---|---|---|---|
| H1 | Weekday cooking time stays short (breakfast 30, snack 15, dinner 45 min) | PASS | 59 of 60 weekday breakfasts, snacks and dinners within the limit (one snack at 18 min) |
| H2 | At most 1 fried and 2 sweet dishes a week | PASS | Fried 0 / 0 / 1 / 0, sweet 1 / 0 / 2 / 1 per week; about 2,200–2,280 kcal per person per day |
| H3 | About 7 fresh vegetables to buy per week | PASS | 7, 7, 7, 7 distinct vegetables (everyday tomato, chilli, lemon, coriander, curry leaves and mint not counted) |
| H4 | Soak-tonight reminder lists every overnight soak | PASS | 9 of 9 overnight-soak dishes appear in the reminder |
| H5 | Katori measure and rotli count | PASS | 250 g toor dal = 2 katori; 300 g atta phulka dough makes 12 rotlis; salt shows no katori |

### Before and after (same household, 28 days)

| Measure | Before (v2.5.1) | After (v2.6.0) |
|---|---|---|
| Active cooking minutes per day (all dishes added up) | ≈ 262 | ≈ 221 (breakfast 28, lunch 135, snack 14, dinner 44) |
| Calories per person per day | ≈ 2,500 | ≈ 2,220 |
| Days with a fried dish | 9 of 28 | 0–1 per week, kept for the weekend |
| Sweet dishes | 9 days of 28 | at most 2 per week |
| Distinct fresh vegetables per week | 16–17 | 6–7 |
| Overnight-soak reminders | none | Tomorrow card and evening notification |
| Measures | grams only | grams + katori; breads show piece count |

Note: the lunch minutes add up every bowl separately; in a real kitchen dal, rice and sabzi cook side by side, so time at the stove is shorter.

## v2.7.0 tests

| # | Test | Result | Evidence |
|---|---|---|---|
| A1 | Ayambil dishes use only grains, pulses, salt, pepper, hing and sonth | PASS | 14 Ayambil recipes, all valid; Aso Oli 2026 starts 18 Oct; two different thalis per day, changing daily; never in everyday menus |
| A2 | Paryushan: 8 days ending with Samvatsari, no green vegetables | PASS | 8 Sep – 15 Sep 2026 (Samvatsari 15 Sep, Murtipujak); every menu passes the Parva rules |
| A3 | Dinner start time | PASS | Start time = Chauvihar − (dinner cooking time + 20 min to eat) |
| A4 | Pantry items leave the shopping list | PASS | Atta and salt moved to "Already at home" and left out of the shared list |
| A5 | WhatsApp menu text | PASS | Date, tithi, 4 meals, Navkarsi, Chauvihar and the app link |
| A6 | Auto refresh | PASS | Checks for a new version on open, on return to the app and every 30 minutes; reloads itself once when one is installed |
