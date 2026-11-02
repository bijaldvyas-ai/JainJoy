# JainJoy – Jain Meal Planner: Product Requirements Document v2.1

2 Nov 2026 · Bijal Vyas · Supersedes v2.0 (30 Oct 2026). All approved v1.0 and v2.0 requirements are kept; v2.1 adds the Jain Parva Tithi & Dietary Restriction Engine (section 3.0), two options per meal and the next-day reminder.

## 1. Overview

**Vision:** "Our intention is to provide people with complete meal-planning support, so they never have to wonder every day what to cook."

JainJoy gives every Jain household a complete, rule-compliant day of food (breakfast, lunch, snack, dinner) that follows its tradition, tithi, city, regional food habits, language and family preferences, plus Navkarsi and Chauvihar timings and a grocery list.

**Problem:** Jain households follow strict dietary practice (no onion, garlic or kandmool; tithi restrictions; dwidal; eating before sunset). Planning varied, compliant, regionally familiar meals every day is repetitive and error-prone, and no mainstream planner understands the Jain Panchang.

**Goals (v1, kept)**
- A full, compliant 4-meal menu every day, with no empty slot
- Aatham and Chaudas handled automatically
- Personalised by tradition, location, household size and allergies
- Grocery list with exact quantities grouped by category
- Simple enough to follow while cooking

**Goals [v2]**
- Regional meal engine: lunch follows the user's regional thali (Gujarati, Maharashtrian, Rajasthani, Punjabi, North Indian, Malwa, South Indian, Bengali/Eastern, pan-Indian)
- 300+ structured, validated recipes stored in the app database, with an admin review workflow
- Location-aware Jain Panchang: tithi, paksha, Gujarati/Hindu month, Shukla Pancham, Aatham, Chaudas and Jain festivals
- Daily Navkarsi and Chauvihar timings with live countdown
- Complete English, Hindi and Gujarati interface and content
- Monthly calendar: current month, next-month preview and saving, and locked history of previous months

**Non-goals (v2)**
- Calorie or macro tracking
- Grocery ordering or delivery
- Social features
- Non-Jain diet modes
- Cloud accounts and sync between devices (prepared in the schema; needs hosting credentials)

## 2. Target audience (v1, kept)

| Segment | Who | Age | Need |
|---|---|---|---|
| Primary | Urban Jain households across India | 25–45 | Daily menu and grocery planning without rule violations |
| Secondary | Jain diaspora (US, UK, Canada, East Africa, Gulf, Singapore, Australia) | 45–55 | Tradition-correct menus and timings for their local city |
| Young adults | Students and early professionals | 18–24 | Learning to cook within Jain rules |

## 3. Functional requirements

### 3.0 Jain Parva Tithi & Dietary Restriction Engine [v2.1]

The five Parva Tithis are core, calendar-driven food rules.

| # | Parva Tithi | Paksha | Tithi number used by the engine |
|---|---|---|---|
| 1 | Sud Pancham | Shukla | 5 |
| 2 | Sud Aatham | Shukla | 8 |
| 3 | Vad Aatham | Krishna | 23 (Krishna 8) |
| 4 | Sud Chaudas | Shukla | 14 |
| 5 | Vad Chaudas | Krishna | 29 (Krishna 14) |

**Panchang integration**
- For every date: lunar month (amanta or purnimanta, Adhik detected), paksha, tithi at local sunrise, and the Parva Tithi it carries
- Tithis spanning two sunrises (vriddhi) are observed on the second day; skipped tithis (kshaya) on the day before, per the Jain rule
- Calculated from Moon and Sun positions for the household's city every year; no recurring Gregorian dates are stored
- Verified against published reference dates on the same tithis (Labh Pancham, Durga Ashtami, Janmashtami, Kartaki Chaumasi Chaudas, Kali Chaudas)

**Observance profiles** (Profile → Tithi observances)
| Profile | Parva Tithi rule |
|---|---|
| All households (mandatory) | On all five Parva Tithis: no leafy vegetables, no fresh vegetables of any kind, no green herbs, no sprouts. No setting can weaken this |

| Optional extra days | A household may add more green-vegetable-free days (5 or 12 tithis) |

Fresh-fruit avoidance on Parva Tithis is a separate household choice (off by default).

**Everyday rules (every day, every profile):** no onion, no garlic, no root vegetables (kandmool), no non-vegetarian ingredients, no Kaddu, no confirmed Alavi, no honey, butter, mushrooms, brinjal, sprouts, yeast, and dwidal is checked.

**Scope of checks:** breakfast, lunch (every thali component), snacks, dinner, chutneys, sauces, garnishes, side dishes and accompaniments. A prohibited ingredient is never allowed because the quantity is small. On Parva Tithis nothing is dropped from a recipe to make it fit: only recipes whose every ingredient passes are used.

**Ingredient classification database** (every ingredient): id; English, Hindi and Gujarati names; regional names and synonyms (Marathi and transliterations); category; root, leafy, fresh-vegetable, herb, sprout and fruit flags; Jain restriction category; everyday restriction; Parva Tithi restriction; household restriction; verification status. Names are resolved across languages (for example arvi, taro, अरबी and અળવી all resolve to Alavi). Unknown names are queued for admin verification and block approval; they are never treated as safe.

**Recipe validation levels**
- **Level A – Everyday Jain compliant:** valid record, every ingredient known and permitted every day, dwidal-safe
- **Level B – Parva Tithi compliant:** Level A and every ingredient (garnish included) free of fresh vegetables, leaves, herbs and sprouts
- A recipe's name never makes it compliant; only its ingredients do. Each recipe page shows its level and, if not Level B, the ingredients that prevent it

**Meal generation on Parva Tithis:** all four meals use only Level B recipes and permitted accompaniments, preserving the regional thali (Gujarati rotli, tithi dal or kadhi, bhaat; Maharashtrian bhakri, varan or amti, bhaat; Rajasthani roti, dal, rice, gatte or ker sangri; Punjabi roti, dal, dry chana or rajma; South Indian rice, paruppu sambar, rasam, kadala curry; and so on). 24 traditional tithi recipes were added for this. If approved recipes ever run short, the slot reports the shortage and asks the admin for recipes; a non-compliant recipe is never inserted.

**Calendar:** the five Parva Tithis are highlighted with Sud 5, Sud 8, Vad 8, Sud 14 and Vad 14 labels; opening a date shows tithi, paksha, the full restriction list, the four meals and each meal's compliance status.

**Grocery list:** totals follow the chosen menu option, scaled to the household and grouped by category; a separate "Parva Tithi days" section lists what those days need, which never includes fresh vegetables.

**Two options per meal [v2.1]:** every day offers option 1 and option 2 for breakfast, lunch (a second thali), snack and dinner, both compliant with the day's rules. They are shown side by side as two small cards (agreed with the product owner on 2 Nov 2026): tap a card to choose it (marked ✓), and "Recipe ›" or "Thali ›" opens it. The chosen option is saved and drives the grocery list and nutrition; past days stay locked.

**Next-day reminder [v2.1]:** Today shows a Tomorrow card (tithi, Parva rule and planned meals). "Add Parva reminders to phone calendar" downloads a calendar file with every Parva Tithi of the next 60 days and an alert at 7 pm the evening before. An optional evening reminder appears after 5 pm while the app is open (phones do not allow scheduled alarms from a website without a push server).

### 3.1 Registration and profile [v2 extended]

Collected once at first launch; editable later. Changes apply from the next day.

| Field | Input | Used for |
|---|---|---|
| Language **[v2]** | English, Hindi, Gujarati | Whole interface and content |
| Tradition | Shwetambar or Digambar | Panchang observances and menu rules |
| Sub-sect | Murtipujak, Sthanakvasi, Terapanth, Bispanthi, Taranpanth, Other | Observances (e.g. Samvatsari date) |
| Country, state, city **[v2]** | All 28 states and 8 UTs, 580 Indian cities and towns, diaspora cities; GPS; search any place (Open-Meteo) | Sunrise, sunset, tithi, timings, default cuisine and month system |
| Regional cuisine **[v2]** | Auto-filled from state; editable | Thali structure and recipe preference |
| Household size | 1–20 | Quantities and grocery list |
| Allergies and exclusions **[v2]** | Allergen chips + any ingredient from the master list; optional "avoid cauliflower and cabbage" | Excluded from every plan |
| Aatham and Chaudas | Always ON, not editable | No leafy vegetables |
| Observance profile **[v2.1]** | Strict (5 Parva Tithis, default), Standard (Aatham and Chaudas), Custom; fresh fruit on Parva Tithis as a separate choice | Parva Tithi restrictions |
| Timing convention **[v2]** | Chauvihar at sunset, or 24 / 48 min before; amanta or purnimanta month names | Timings and month display |

### 3.2 Jain dietary compliance engine [v2]

Mandatory, never relaxed:
- No onion or garlic (bulb)
- No kandmool: potato, sweet potato, carrot, radish, beetroot, yam (suran), tapioca/sabudana
- No anantkay: fresh ginger, fresh turmeric, sprouted pulses. Dry ginger (sonth) and turmeric powder are allowed
- **Kaddu (pumpkin) strictly excluded.** Bottle gourd (lauki) is a separate vegetable; a household can exclude it too
- **Alavi strictly excluded.** Confirmed in the user-facing glossary as colocasia/taro (arbi), both root and leaves (patra)
- Bahubij: brinjal, fig, guava
- Honey, butter, mushrooms, eggs, gelatin, yeast-fermented foods
- **Dwidal:** raw curd or buttermilk never combined with pulses or pulse flours in a recipe; cooked curd (kadhi) is allowed. Thalis that serve raw chaas beside dal show a dwidal note
- Aatham and Chaudas: no leafy vegetables in any meal. Optional garnishes (coriander, curry leaves) are removed automatically; a dish that depends on leaves is not served
- Household exclusions and allergies are never relaxed. If no recipe fits, the slot says so rather than breaking a rule

Every recipe is validated before approval: known ingredients, positive quantities, no banned ingredient, dwidal, names in 3 languages, steps only reference listed ingredients, and no duplicate (same name or same ingredient set).

### 3.3 Panchang engine [v2]

- Astronomical calculation on the device (Astronomy Engine; built-in Meeus fallback). No calendar-arithmetic shortcuts
- Tithi = 12° step of Moon–Sun elongation, taken at **local sunrise** in the user's city (udaya tithi)
- Jain kshaya/vriddhi rule: a skipped tithi is observed on the previous day; a repeated tithi on the second day
- Shown daily: tithi name and number, Shukla or Krishna paksha, month (amanta or purnimanta, with Adhik), tithi end time
- Flags: Aatham, Chaudas, Shukla Pancham, Beej, Agiyaras, Punam, Amas
- Jain observances: Mahavir Janma Kalyanak, Ayambil Oli (Chaitra, Aso), Akshaya Tritiya, Chaumasi Chaudas (Ashadh, Kartak, Fagan), Samvatsari (Murtipujak S4; Sthanakvasi/Terapanth S5), Das Lakshan, Anant Chaturdashi, Kshamavani, Diwali/Mahavir Nirvan, Jain New Year, Gyan Pancham, Kartik Purnima, Maun Ekadashi, Posh Dashami, Meru Teras, Rishabhdev Janma Kalyanak
- Festivals are not placed in an Adhik month
- A note tells users to follow their Sangh's printed Panchang for parva days where it differs

### 3.4 Navkarsi and Chauvihar [v2]

- Sunrise and sunset computed for the city's coordinates and time zone for each date
- Navkarsi = sunrise + 48 minutes (one muhurta); Porsi = first quarter of the day
- Chauvihar = sunset, or 24 / 48 minutes before sunset by household convention
- Live countdown on Today; dinner card shows "finish before" time

### 3.5 Recipe database [v2]

- At least 300 unique, validated recipes; delivered: **415** (breakfast 104, lunch components 165 including 24 Parva Tithi recipes, dinner 104, snacks 42); 113 are Level B (Parva Tithi compliant)
- Each record: unique id; names in English, Hindi and Gujarati; original regional name; meal; thali component; regional cuisines; ingredients with quantities; servings; prep and cook time; structured steps rendered in all 3 languages; compliance status; restricted-ingredient flags; tithi suitability (computed); source name and URL; review status
- Recipes are original JainJoy adaptations of traditional home cooking, not copied articles. Source URL is empty and marked "human review pending" until a reviewer adds a verified source
- Recipe admin: add, edit, validate, save as pending, approve, reject. Only approved and valid recipes enter menus. Admin edits are never overwritten by app updates

### 3.6 Regional meal planning engine [v2]

Lunch is assembled as a thali for the user's cuisine:

| Cuisine | Lunch structure |
|---|---|
| Gujarati | Rotli, shaak, dal or kadhi, bhaat, salad, papad, athanu, chaas |
| Maharashtrian | Poli or bhakri, bhaji, varan or amti, bhaat, koshimbir, chutney, papad |
| Rajasthani | Roti or bajra roti, sabzi, dal, rice, chaas, achar |
| Punjabi | Roti, sabzi, dal, rice, salad, raita, achar |
| North Indian | Roti, sabzi, dal, rice, salad, raita |
| Malwa / MP | Roti, sabzi, dal, rice, salad, papad, achar |
| South Indian | Rice, sambar, rasam, poriyal, curd, papad, pickle |
| Bengali / Eastern | Rice, dal, torkari, roti, sweet chutney, papad |
| Pan-Indian | Roti, sabzi, dal, rice, salad |

Rules:
- Every component passes the compliance engine and the day's tithi rules
- Staples (roti, rice) may repeat daily; sabzi and dal rotate over 6 days; breakfast and dinner over 14 days; snacks over 7
- Recipes from the user's cuisine are preferred; related cuisines fill gaps; any cuisine is a last resort
- Seasonal produce is preferred; the same main vegetable or pulse is not repeated within a day
- Plain rice and everyday roti are preferred over festive or flavoured variants
- Breakfast, snack and dinner are complete dishes. Dinner shows the Chauvihar deadline

### 3.7 Monthly calendar [v2]

- **Current month:** each day shows tithi, Aatham/Chaudas, festivals and status; tap for 4 meals, tithi and timings
- **Next month:** full preview; "Generate and save this month's plan" stores every day; regenerated automatically if the profile changes
- **Previous months:** locked history with recipe snapshots, tithi and timings; previous grocery lists
- Status markers: saved history (locked), saved plan, preview

### 3.8 Grocery list (v1 extended)

- Ranges: next 7 days, rest of month, next month; previous weekly lists saved
- Totals add up every recipe and thali accompaniment, scaled to household size; ingredients removed on restricted days are not counted
- Grouped: vegetables, fruit, grains and flours, pulses, dairy, dry fruit and nuts, spices, pantry
- Rounded up to practical buying amounts; checkboxes; copy as text

### 3.9 Multilingual application [v2]

- Language switch on every main screen and in the profile; choice remembered
- Translated: navigation, buttons, labels, calendar, month and weekday names, tithi and festival names, recipe names, ingredients, cooking steps, grocery list, notifications, timings, profile, validation and error messages
- The original regional dish name and the English name are shown alongside the translation

### 3.11 Choghadiya [v2.2]

- Dedicated Choghadiya tab: 8 day parts (sunrise to sunset) and 8 night parts (sunset to next sunrise) for the user's city and any date
- Names Amrit, Shubh, Labh, Char, Udveg, Rog, Kaal in 3 languages, marked auspicious, travel, or avoid; the running one is highlighted with a countdown and also shown on Today

### 3.12 Branding, profile tab and visitors [v2.2]

- "Made by BiNaiSa" signature in a script font at the end of every screen
- Profile is a main tab (summary, edit, language, library, glossary, admin, lists, data)
- Optional anonymous visitor statistics with country and city through GoatCounter (owner account needed; off until configured)

### 3.10 Nutrition [v2.1]

- Approximate calories, protein, carbohydrate and fat per 100 g for every allowed ingredient (IFCT 2017 and USDA reference values)
- Per recipe: one serving, leaving out ingredients dropped that day for tithi or household rules
- Per meal and per day: one serving of each dish per person; the lunch thali includes every component and accompaniment
- Shown on Today and each calendar day (daily total, energy split from protein, carbs and fat, and each meal), on the lunch thali and on every recipe page
- Labelled as approximate guidance, not medical advice

## 4. Screens

| Screen | Content |
|---|---|
| Onboarding / Profile | Language, tradition, sub-sect, location, cuisine, household, exclusions, observances, timing convention |
| Today | Navkarsi and Chauvihar card with countdown, tithi card, 4 meals, status |
| Lunch thali | Each component and accompaniment, dwidal note |
| Recipe | Names, badges, quantities for the household, method, items left out today, source |
| Calendar | Month grid, navigation, status legend, save month, special days |
| Panchang | Tithi details, timings, upcoming 45 days of Jain dates |
| Grocery | Ranges, grouped list, ticks, copy, previous lists |
| More | Profile, recipe library, food glossary, recipe admin, data and about, reset |

## 5. User journeys

1. **First use:** choose language → tradition → sub-sect → state and city (cuisine and month system filled in) → household → exclusions → Get My Meal Plan → Today.
2. **Daily:** open Today → see Navkarsi countdown and tithi → tap lunch → thali → recipe in chosen language.
3. **Aatham:** the tithi card turns saffron; menus contain no leafy vegetables; garnish removed and noted on the recipe.
4. **Planning ahead:** Calendar → next month → preview days → Generate and save → Grocery → Next month.
5. **Looking back:** Calendar → previous month → tap a day → the menu exactly as served.
6. **Moving city:** Profile → location → save → tomorrow's menus and timings use the new city; history unchanged.
7. **Admin:** More → Recipe admin → add recipe → fix validation errors → approve → it can appear in menus.

## 6. Database architecture [v2]

Implemented on the device in IndexedDB, mirroring the relational schema in `db/schema.sql`:

| Store | Key | Contents |
|---|---|---|
| users | id | Local user |
| profiles | userId | Profile fields, version, plan start |
| traditions | id | Sub-sects, rule options |
| regions | id | States (cuisine, month system) and cuisines (thali structure) |
| ingredients | id | Names in 3 languages, category, unit, flags (leafy, green, pulse, raw curd, crucifer), allergens, season, ban reason |
| ingredient_restrictions | id | Ban reasons, tithi rule, dwidal rule |
| recipes | id | Meal, component, cuisines, ingredients, steps, servings, times, status, origin |
| recipe_translations | recipeId+lang | Names |
| recipe_sources | recipeId | Source name, URL, verification |
| panchang / timings | key | Cache (computed on demand) |
| daily_menus | date | Saved future plans with profile version |
| monthly_menus | month | Saved month plans |
| menu_history | date | Immutable past menus with recipe snapshots and that day's panchang |
| grocery_lists | id | Saved lists |

Seeding is versioned; admin-edited recipes are preserved. v1 data is migrated once.

## 7. API requirements [v2]

The app runs fully on the device. Internal module interfaces:
- `JJ.panchang(date, city, profile)` → tithi, paksha, month, observed tithis, observances, sunrise, sunset, tithi end
- `JJ.timings(panchang, convention)` → sunrise, Navkarsi, Porsi, sunset, Chauvihar
- `JJ.compileRecipe(record)` → validated recipe with errors and tags
- `JJ.allowed(recipe, dayRules, profile)` → items to drop, or not allowed
- `JJ.genDay(date, profile, context)` → 4 meals with regional thali
- `JJ.grocery(menus)` → grouped totals

External: Open-Meteo geocoding (`GET /v1/search?name=`) for place search; Astronomy Engine via CDN. A future server API would expose the same records as REST resources (`/profiles`, `/recipes`, `/menus/{date}`, `/history?month=`, `/grocery?from=&to=`) over the schema in `db/schema.sql`.

## 8. Non-functional requirements

- **Compliance:** zero approved recipes with a banned ingredient or dwidal (automated test)
- **Accuracy:** tithi at sunrise from an astronomical engine; reference festival dates verified; sunrise within ±2 minutes of published tables
- **Performance:** Today renders in under 2 seconds on a mid-range phone; month calendar under 1 second
- **Offline:** after the first visit the app, data and astronomy library work offline
- **Privacy:** all data on the device; only a typed place name is sent to the geocoding service
- **Accessibility:** large tap targets, screen-reader labels, works at 360 px width, light and dark themes
- **Integrity:** history is written once and never modified

## 9. Acceptance criteria

1. A Gujarati household receives rotli, shaak, dal or kadhi, bhaat, salad, papad, pickle and chaas
2. A Maharashtrian household receives poli or bhakri, bhaji, varan or amti, bhaat, koshimbir, chutney and papad
3. No approved recipe contains a prohibited ingredient
4. Kaddu and Alavi never appear in the approved database
5. Aatham and Chaudas menus contain no leafy vegetables
6. Shukla Pancham dates are shown correctly in Calendar and Panchang
7. Navkarsi and Chauvihar change with city and date
8. English, Hindi and Gujarati work on every screen
9. Next-month menus are visible and can be saved
10. Previous-month menus are visible and unchanged
11. Four meals appear every day
12. Grocery totals equal the sum of recipe ingredients
13. Profile changes rebuild future menus without changing history
14. At least 300 unique approved recipes exist

15. Each of the five Parva Tithis triggers the strict restriction (v2.1)
16. No leafy or fresh vegetables, herbs or sprouts on Parva Tithis; no onion, garlic, Kaddu or Alavi on any day (v2.1)
17. Every ingredient, chutney, garnish and accompaniment is validated; grocery lists exclude restricted items (v2.1)
18. Regional meal planning continues on Parva Tithis; all text in 3 languages; Panchang verified against reference dates (v2.1)

Status: all pass (see `docs/TEST-REPORT.md`, 41 of 41).

## 10. Risks, dependencies and open questions

| Item | Status / mitigation |
|---|---|
| Sangh Panchangs differ by a day for some parvas | Udaya-tithi rule with Jain kshaya/vriddhi handling; in-app note; certify against a chosen Sangh's data |
| Recipe sources | Original adaptations; external URLs and human culinary review pending |
| Cloud sync and shared admin | Needs a hosting account and credentials (schema ready) |
| Rule interpretations vary by family | Mandatory core rules fixed; additional observances are opt-in |
| Lauki called "kaddu/ghiya" in some regions | Glossary clarifies; household can exclude lauki |

Open questions: which Sangh's Panchang to certify against; who reviews recipes; whether to add a premium tier; whether to add push notifications for Navkarsi and Chauvihar.

## 11. Change log – v2.1 correction (2 Nov 2026)

- The five Parva Tithi restrictions are mandatory for every household; the Standard and Custom profiles can no longer weaken them (Custom only adds extra days).
- Every stored menu (today, saved plans, previews) is re-validated against the current rules before display. A non-compliant menu for today or a future day is rebuilt immediately; a past day is kept as recorded and marked.
- Cause of the reported issue: a menu saved on the device before the Parva update (Gavar nu Shaak on Vad Aatham) was locked and not re-validated.

## 12. Change log – v2.6.0 home-kitchen update (2 Nov 2026)

From the housewife audit, the top five fixes:

1. **Less daily cooking.** Each dish has an active-time figure (an overnight soak counts as 10 minutes). Weekday limits: breakfast 30 min, snack 15, dinner 45, each lunch bowl 25; weekends 50 / 40 / 70 / 45. Dishes over the limit are strongly avoided.
2. **Lighter food.** At most 1 fried dish a week (preferred on Saturday or Sunday) and at most 2 sweet dishes a week. Calorie guide per serving: breakfast 420, snack 280, dinner 650, lunch bowl 400.
3. **Fewer vegetables to buy.** About 7 fresh vegetables per week (Monday to Sunday), reused across dishes; everyday tomato, chilli, lemon, coriander, curry leaves and mint are not counted. The weekly grocery list shows fresh vegetables and fruit split into two market trips.
4. **Soak tonight.** The Tomorrow card and the evening notification list what to soak tonight and for which dish (overnight soaks, soaks of 6 hours or more, and any soak for breakfast).
5. **Kitchen measures.** Recipe ingredients show katori (about 150 ml bowl) next to grams where it makes sense; bread recipes say how many pieces the dough makes.

Acceptance: tests H1–H5 (see TEST-REPORT.md).
