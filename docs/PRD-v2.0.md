# JainJoy – Jain Meal Planner: Product Requirements Document v2.0

30 Oct 2026 · Bijal Vyas · Supersedes v1.0 (27 Oct 2026). All valid v1 requirements are kept; changes are marked **[v2]**.

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
| Optional tithi observances **[v2]** | No green vegetables on: none / Aatham–Chaudas / 5 tithis / 12 tithis; Shukla Pancham | Applied only when the household chooses them |
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

- At least 300 unique, validated recipes; delivered: **391** (breakfast 104, lunch components 141, dinner 104, snacks 42)
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

Status: all 14 pass (see `docs/TEST-REPORT.md`).

## 10. Risks, dependencies and open questions

| Item | Status / mitigation |
|---|---|
| Sangh Panchangs differ by a day for some parvas | Udaya-tithi rule with Jain kshaya/vriddhi handling; in-app note; certify against a chosen Sangh's data |
| Recipe sources | Original adaptations; external URLs and human culinary review pending |
| Cloud sync and shared admin | Needs a hosting account and credentials (schema ready) |
| Rule interpretations vary by family | Mandatory core rules fixed; additional observances are opt-in |
| Lauki called "kaddu/ghiya" in some regions | Glossary clarifies; household can exclude lauki |

Open questions: which Sangh's Panchang to certify against; who reviews recipes; whether to add a premium tier; whether to add push notifications for Navkarsi and Chauvihar.
