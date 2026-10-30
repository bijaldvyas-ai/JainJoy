-- JainJoy 2.0 relational schema (PostgreSQL dialect).
-- The shipped app stores the same records on the device in IndexedDB (see js/db.js).
-- This schema is the target for a future server database; it is not deployed yet
-- because no server or database credentials exist for this project.

CREATE TABLE users (
  id            TEXT PRIMARY KEY,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE traditions (
  id            TEXT PRIMARY KEY,                -- 'Shwetambar' | 'Digambar'
  subsects      TEXT[] NOT NULL,
  rules         JSONB NOT NULL                   -- e.g. {"aathamChaudasLeafy":"always"}
);

CREATE TABLE regions (
  id            TEXT PRIMARY KEY,                -- 'state:IN-GJ' or 'cuisine:guj'
  kind          TEXT NOT NULL CHECK (kind IN ('state','cuisine')),
  country       CHAR(2),
  name_en       TEXT NOT NULL, name_hi TEXT NOT NULL, name_gu TEXT NOT NULL,
  cuisine       TEXT,                            -- default cuisine for a state
  calendar      TEXT CHECK (calendar IN ('amanta','purnimanta')),
  lunch_slots   TEXT[],                          -- thali structure for a cuisine
  breads        TEXT[]
);

CREATE TABLE cities (
  id            TEXT PRIMARY KEY,                -- 'in-ahmedabad'
  country       CHAR(2) NOT NULL,
  state         TEXT,
  name_en       TEXT NOT NULL, name_hi TEXT NOT NULL, name_gu TEXT NOT NULL,
  lat           NUMERIC(8,5) NOT NULL, lon NUMERIC(8,5) NOT NULL,
  tz            TEXT NOT NULL
);
CREATE INDEX cities_state ON cities(country, state);

CREATE TABLE user_profiles (
  user_id       TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  lang          TEXT NOT NULL CHECK (lang IN ('en','hi','gu')),
  tradition     TEXT NOT NULL REFERENCES traditions(id),
  subsect       TEXT NOT NULL,
  country       CHAR(2) NOT NULL,
  state         TEXT,
  city_id       TEXT REFERENCES cities(id),
  custom_place  JSONB,                           -- {name, lat, lon, tz} when not in the list
  cuisine       TEXT NOT NULL,
  calendar      TEXT NOT NULL DEFAULT 'amanta',
  household     SMALLINT NOT NULL CHECK (household BETWEEN 1 AND 20),
  allergies     TEXT[] NOT NULL DEFAULT '{}',
  exclude_ids   TEXT[] NOT NULL DEFAULT '{}',    -- extra household exclusions (ingredient ids)
  avoid_crucifer BOOLEAN NOT NULL DEFAULT false,
  green_rule    TEXT NOT NULL DEFAULT 'none' CHECK (green_rule IN ('none','ac','five','twelve')),
  shukla_pancham_green BOOLEAN NOT NULL DEFAULT false,
  navkarsi_min  SMALLINT NOT NULL DEFAULT 48,
  chauvihar_min SMALLINT NOT NULL DEFAULT 0,
  created_on    DATE NOT NULL,
  plan_from     DATE NOT NULL,
  version       INT NOT NULL DEFAULT 1,          -- bumped on every profile change
  CHECK (city_id IS NOT NULL OR custom_place IS NOT NULL)
);

CREATE TABLE ingredients (
  id            TEXT PRIMARY KEY,
  name_en       TEXT NOT NULL, name_hi TEXT NOT NULL, name_gu TEXT NOT NULL,
  category      TEXT NOT NULL,                   -- veg, leafy, grain, pulse, dairy, fruit, nuts, spice, pantry, banned
  unit          TEXT NOT NULL CHECK (unit IN ('g','ml','pc','tsp','tbsp')),
  is_leafy      BOOLEAN NOT NULL DEFAULT false,
  is_green      BOOLEAN NOT NULL DEFAULT false,  -- fresh produce (lilotri)
  is_pulse      BOOLEAN NOT NULL DEFAULT false,  -- dwidal partner
  is_raw_curd   BOOLEAN NOT NULL DEFAULT false,
  is_crucifer   BOOLEAN NOT NULL DEFAULT false,
  allergens     TEXT[] NOT NULL DEFAULT '{}',
  season        SMALLINT[],                      -- [from_month, to_month]
  grams_per_piece NUMERIC, grams_per_tsp NUMERIC,
  jain_allowed  BOOLEAN NOT NULL,
  banned_reason TEXT                             -- bulb, root, anant, bahubij, kaddu, alavi, animal, honey, butter, fungus, ferment
);

CREATE TABLE ingredient_restrictions (
  id            TEXT PRIMARY KEY,                -- 'ban:root', 'rule:tithi-leafy', 'rule:dwidal'
  kind          TEXT NOT NULL,
  rule          TEXT,
  text_en TEXT, text_hi TEXT, text_gu TEXT,
  mandatory     BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE recipes (
  id            TEXT PRIMARY KEY,
  meal          CHAR(1) NOT NULL CHECK (meal IN ('b','l','s','d')),
  component     TEXT NOT NULL,                   -- main | bread | sabzi | dal | kadhi | rice | salad | raita | sambar | rasam
  cuisines      TEXT[] NOT NULL,
  original_name TEXT,
  servings      SMALLINT NOT NULL,
  prep_min      SMALLINT NOT NULL, cook_min SMALLINT NOT NULL,
  steps         JSONB NOT NULL,                  -- structured, language-neutral steps
  curd_cooked   BOOLEAN NOT NULL DEFAULT false,
  status        TEXT NOT NULL CHECK (status IN ('pending','approved','rejected')),
  origin        TEXT NOT NULL CHECK (origin IN ('seed','admin')),
  reviewed_by   TEXT,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX recipes_meal_status ON recipes(meal, status);

CREATE TABLE recipe_ingredients (
  recipe_id     TEXT REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_id TEXT REFERENCES ingredients(id),
  quantity      NUMERIC NOT NULL CHECK (quantity > 0),
  optional      BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (recipe_id, ingredient_id)
);

CREATE TABLE recipe_translations (
  recipe_id     TEXT REFERENCES recipes(id) ON DELETE CASCADE,
  lang          TEXT CHECK (lang IN ('en','hi','gu')),
  name          TEXT NOT NULL,
  PRIMARY KEY (recipe_id, lang)
);
-- duplicate detection: one approved recipe per normalised English name
CREATE UNIQUE INDEX recipes_unique_name ON recipe_translations (lower(regexp_replace(name, '\(.*?\)|[^a-zA-Z0-9]+', ' ', 'g'))) WHERE lang = 'en';

CREATE TABLE recipe_sources (
  recipe_id     TEXT PRIMARY KEY REFERENCES recipes(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  url           TEXT,
  verified      BOOLEAN NOT NULL DEFAULT false,
  note          TEXT
);

CREATE TABLE panchang_days (
  city_key      TEXT NOT NULL,                   -- city id or lat,lon
  day           DATE NOT NULL,
  tithi         SMALLINT NOT NULL CHECK (tithi BETWEEN 1 AND 30),
  paksha        CHAR(1) NOT NULL,
  lunar_month   SMALLINT NOT NULL, adhik BOOLEAN NOT NULL,
  observed      SMALLINT[] NOT NULL,             -- tithis observed that day (kshaya / vriddhi rule)
  observances   TEXT[] NOT NULL DEFAULT '{}',
  tithi_end     TIMESTAMPTZ,
  PRIMARY KEY (city_key, day)
);

CREATE TABLE daily_timings (
  city_key      TEXT NOT NULL, day DATE NOT NULL,
  sunrise       TIMESTAMPTZ NOT NULL, navkarsi TIMESTAMPTZ NOT NULL,
  sunset        TIMESTAMPTZ NOT NULL, chauvihar TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (city_key, day)
);

CREATE TABLE daily_menus (                        -- saved future plans (rebuilt on profile change)
  user_id       TEXT REFERENCES users(id) ON DELETE CASCADE,
  day           DATE NOT NULL,
  profile_version INT NOT NULL,
  cuisine       TEXT NOT NULL,
  household     SMALLINT NOT NULL,
  rules         JSONB NOT NULL,                  -- {noLeafy, noGreen, reasons}
  meals         JSONB NOT NULL,                  -- {b:{id,drop}, l:{items:[...]}, s:{...}, d:{...}}
  saved_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, day)
);

CREATE TABLE monthly_menus (
  user_id       TEXT REFERENCES users(id) ON DELETE CASCADE,
  month         CHAR(7) NOT NULL,                -- 'YYYY-MM'
  profile_version INT NOT NULL,
  generated_at  TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (user_id, month)
);

CREATE TABLE menu_history (                       -- immutable: written once when a day arrives
  user_id       TEXT REFERENCES users(id) ON DELETE CASCADE,
  day           DATE NOT NULL,
  meals         JSONB NOT NULL,
  recipe_snapshots JSONB NOT NULL,               -- full copy of each served recipe
  panchang      JSONB NOT NULL,                  -- tithi and timings for that day and city
  frozen_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, day)
);
CREATE INDEX menu_history_month ON menu_history (user_id, (to_char(day, 'YYYY-MM')));

CREATE TABLE grocery_lists (
  id            TEXT PRIMARY KEY,
  user_id       TEXT REFERENCES users(id) ON DELETE CASCADE,
  date_from     DATE NOT NULL, date_to DATE NOT NULL,
  household     SMALLINT NOT NULL,
  items         JSONB NOT NULL,                  -- grouped totals
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
