-- 003: seasonal menus and recipe visuals (JainJoy v3.5)
-- seasons   : the seasons a dish is best in ('summer','monsoon','winter'); empty array = every season
-- image_url : a real photo path when one exists, otherwise 'art:<dish>' = the app's drawing of that dish
-- gif_url   : an animated clip when one exists; NULL means the static picture is shown
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS seasons   TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS gif_url   TEXT;
ALTER TABLE recipes ADD CONSTRAINT recipes_seasons_ok CHECK (seasons <@ ARRAY['summer','monsoon','winter']::text[]);
-- profiles: several cuisines, or ['all'] for "Surprise me - all Indian cuisines"
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS cuisines TEXT[];
