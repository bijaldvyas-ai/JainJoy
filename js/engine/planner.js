/* JainJoy meal planning engine.
   Builds a complete day (breakfast, regional lunch thali, snack, dinner) for a household,
   honouring Jain rules, tithi restrictions, household exclusions, region and variety.
   Past days are frozen into history with a snapshot of each recipe, so editing the
   profile or the recipe database never changes them. */
(function (JJ) {
'use strict';
var MEALS = ['b', 'l', 's', 'd'];
function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function dayNum(iso) { return Math.round(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / 864e5); }
JJ.dayNum = dayNum;
JJ.profileCity = function (prof) { return (prof && prof.custom) || JJ.CITIES[prof && prof.cityId] || JJ.CITIES['in-ahmedabad']; };

/* Minor flavouring ingredients that can be left out on restricted days, unless the dish is named after them. */
var AUTO_OPT = {chilli: [4, /chilli|mirch|marcha|mirchi/i], lemon: [2, /lemon|nimbu|limbu/i], coriander: [999, /kothimbir|coriander|dhania/i],
  curry: [999, /curry leaf/i], mint: [15, /mint|pudina/i], kasurimethi: [999, /kasuri/i]};
JJ.applyAutoOptional = function (r) {
  r.ings.forEach(function (x) {
    var a = AUTO_OPT[x.id];
    if (a && !x.opt && x.q <= a[0] && !a[1].test(r.en)) x.opt = true;
  });
};

/* ---------------- recipe catalogue (compiled, from the database) ---------------- */
JJ.catalog = {list: [], byId: {}, dups: []};
JJ.loadCatalog = function (rawList) {
  var list = rawList.map(function (raw) { var r = JJ.compileRecipe(raw); JJ.applyAutoOptional(r); recomputeTags(r); return r; });
  var dups = JJ.findDuplicates(list.filter(function (r) { return r.status === 'approved'; }));
  dups.forEach(function (d) { var r = list.filter(function (x) { return x.id === d.id; })[0]; if (r) { r.errors.push({c: 'dup', p: d.other}); r.valid = false; } });
  var byId = {}; list.forEach(function (r) { byId[r.id] = r; });
  JJ.catalog = {list: list, byId: byId, dups: dups};
  return JJ.catalog;
};
function recomputeTags(r) {
  r.tags.leafy = r.ings.some(function (x) { return !x.opt && JJ.ING[x.id] && JJ.ING[x.id].L; });
  r.tags.green = r.ings.some(function (x) { return !x.opt && JJ.ING[x.id] && JJ.ING[x.id].G; });
}


/* ---------------- seasons (summer, monsoon, winter) ---------------- */
/* India's three cooking seasons by month. The peninsula south of about 15.5°N gets the monsoon
   from June and the retreating north-east monsoon until November. Cities in the southern
   hemisphere have their seasons shifted by six months. */
JJ.SEASONS = ['summer', 'monsoon', 'winter'];
JJ.seasonOf = function (iso, city) {
  var m = +iso.slice(5, 7), lat = city && city.lat != null ? city.lat : 23;
  if (lat < 0) m = (m + 5) % 12 + 1;
  if (lat > 0 && lat < 15.5) return m >= 3 && m <= 5 ? 'summer' : m >= 6 && m <= 11 ? 'monsoon' : 'winter';
  return m >= 3 && m <= 6 ? 'summer' : m >= 7 && m <= 9 ? 'monsoon' : 'winter';
};
/* the dishes each season is known for (a preference); a recipe that matches none suits every season */
var SEASON_LIKE = {
  winter: /undhiyu|bajra|raab|\btil\b|gond|chikki|sukhdi|halwasan|adadiya|dudhpak|ker sangri|panchkuta|methi|sarson|makki|lapsi|shorba|soup|kadha|lili tuver|lilva|valor|papdi|matar|peas|gajar|kesar badam/,
  summer: /chaas|lassi|sharbat|kokum|kachumber|kakdi|cucumber|koshimbir|raita|curd rice|dahi|shrikhand|sattu|thandai|panak|nimbu|lemonade|solkadhi|mor kuzhambu|sambharo|kosambari|salad|taak|buttermilk|kairi|keri|mango|aam|dudhi|lauki|tinda|turai|turiya|galka/,
  monsoon: /pakod|bhajia|bhajiya|gota|\bvada\b|kachori|bhutt|corn|makai|makka|khichdi|khichu|kadhi|rasam|ginger|masala chai|bonda|usal|misal|chilla|cheela|pudla|puda|ragda|dal vada|sambar|tea/
};
/* dishes that only belong to one season, by name */
var SEASON_ONLY = {winter: /undhiyu|adadiya|halwasan|methi pak|gond|raab|sarson|makki/, summer: /thandai|panak|sharbat|nimbu pani|lemonade|aamras|mango|kairi|kachi keri|raw mango|gol-keri/};
/* a seasonal ingredient that the dish is named after must be in season where the household lives */
var SEASON_HEAD = {peas: /matar|peas|vatana/, valpapdi: /valor|papdi/, tuverlili: /lili tuver|lilva/, corn: /corn|bhutt|makai|makka|kees/, rawmango: /keri|kairi|raw mango/,
  mango: /mango|aamras/, palak: /palak|spinach/, methi: /methi/, sarson: /sarson/, suva: /suva|dill/, tinda: /tinda/, turai: /turai|turiya|dodka/, galka: /galka/,
  pomegranate: /pomegranate|anar/, grapes: /grape/, orange: /orange|santra/};
function rname(r) { return ((r.en || '') + ' ' + (r.orig || '')).toLowerCase(); }
JJ.recipeSeasons = function (r) {
  if (r._seasons) return r._seasons;
  var n = rname(r), out = JJ.SEASONS.filter(function (k) { return SEASON_LIKE[k].test(n); });
  r._seasons = out.length === 3 ? [] : out; // [] = every season
  return r._seasons;
};
/* month here is the local month (1-12) used for ingredient availability; season is summer / monsoon / winter */
JJ.inSeasonRecipe = function (r, season, month) {
  var n = rname(r);
  for (var k in SEASON_ONLY) if (k !== season && SEASON_ONLY[k].test(n)) return false;
  return r.ings.every(function (x) { var g = JJ.ING[x.id]; return x.opt || !g || !g.season || !SEASON_HEAD[x.id] || !SEASON_HEAD[x.id].test(n) || JJ.inSeason(g, month); });
};

/* ---------------- cuisines: one, several, or "Surprise me" (all Indian cuisines) ---------------- */
JJ.REGIONAL = ['guj', 'mah', 'raj', 'pun', 'nor', 'mp', 'sou', 'ben'];
/* Every Indian regional cuisine takes its turn, one a day, starting from the household's own;
   a fixed rotation, so a date always gets the same cuisine and none comes back for 8 days. */
JJ.cuisineCycle = function (prof) {
  var home = prof && prof.cuisine && JJ.REGIONAL.indexOf(prof.cuisine) >= 0 ? prof.cuisine : null;
  return home ? [home].concat(JJ.REGIONAL.filter(function (k) { return k !== home; })) : JJ.REGIONAL.slice();
};
JJ.dayCuisine = function (iso, prof) { var l = JJ.cuisineCycle(prof); return l[(dayNum(iso) + ((prof && prof.seed) || 0)) % l.length]; };
/* option 2 comes from a different region (half way round the cycle), so each meal offers two cuisines */
JJ.altCuisine = function (iso, prof) { var l = JJ.cuisineCycle(prof); return l[(dayNum(iso) + ((prof && prof.seed) || 0) + 4) % l.length]; };

/* ---------------- two options that are truly different ---------------- */
/* Option 2 must not look like option 1: not the same kind of dish (two khichdis, two laddoos, two
   chillas, two drinks) and no shared dish or main-ingredient word in the name. */
var NAME_SKIP = /^(masala|jain|with|style|plain|sweet|instant|vegetable|mixed|parva|tithi|ayambil|rajasthani|gujarati|punjabi|bengali|kerala|south|indian|maharashtrian|kathiyawadi|malwi|andhra|mysore|udupi|phulka|roti|rotli|rice|papad|ghee|curd|dahi|fresh|green|whole|spicy|dal|shaak|sabzi|sabji|bhaji|curry|raita|rasam|sambar|salad|poriyal|kootu|saaru|quick|healthy|homestyle|style|bowl|plate|nu|ni|na|ka|ki|ke|and)$/;
function nameWords(r) { return (r.en || '').toLowerCase().replace(/\(.*?\)/g, ' ').split(/[^a-z]+/).filter(function (w) { return w.length > 2 && !NAME_SKIP.test(w); }); }
/* same recipe, or the names share a dish word: never acceptable as two options of one meal */
JJ.sameDishName = function (a, b) { if (!a || !b) return false; if (a.id === b.id) return true; var wb = nameWords(b); return nameWords(a).some(function (w) { return wb.indexOf(w) >= 0; }); };
JJ.looksAlike = function (a, b) {
  if (!a || !b) return false;
  if (a.id === b.id) return true;
  var kind = JJ.dish && JJ.dish.kind;
  if (kind && (a.meal !== 'l' || b.meal !== 'l') && kind(a) && kind(a) === kind(b)) return true;
  var wa = nameWords(a), wb = nameWords(b);
  return wa.some(function (w) { return wb.indexOf(w) >= 0; });
};

/* ---------------- 30-day no-repeat rule ---------------- */
/* No recipe is served twice within 30 days, across breakfast, lunch, snack and dinner and across
   everyday and Parva Tithi menus. Everyday staples (rotli, bhakri, rotla and other breads, plain
   and jeera rice, ghee rice and kachumber) are eaten daily and are not counted. When every eligible
   recipe has been used in the last 30 days, the least recently used one is served and the menu
   records it in menu.repeats; side dishes (salad, raita, rasam) are left out instead and recorded
   in menu.skipped. Nothing is repeated silently. */
JJ.NO_REPEAT_DAYS = 30;
JJ.STAPLE_IDS = {l115: 1, l116: 1, l124: 1, l129: 1};
JJ.isStaple = function (r) { return !!r && (r.comp === 'bread' || !!JJ.STAPLE_IDS[r.id]); };
var SIDE_SLOTS = {salad: 1, raita: 1, rasam: 1};
function freshOnly(cands, ctx) {
  return cands.filter(function (c) { var last = ctx.recent[c.r.id]; return JJ.isStaple(c.r) || last == null || ctx.dn - last >= JJ.NO_REPEAT_DAYS; });
}
/* ---------------- one day ---------------- */
function cuisineOrder(cu) { return [cu].concat(JJ.CUISINE_FALLBACK[cu] || ['gen']); }
function cuScore(r, order) {
  for (var i = 0; i < order.length; i++) if (r.cu.indexOf(order[i]) >= 0) return i * 12;
  return 70;
}
/* Kitchen facts about a recipe, used to keep days practical for the person cooking:
   active minutes (an overnight soak counts as 10 minutes of work), fried, sweet,
   calories per serving and the fresh vegetables it needs (everyday staples excluded). */
var FRIED_NAME = /\b(puri|pakoda|pakode|bhajia|bhajiya|vada|kachori|samosa|bhatura|mathri|fafda|gota|ganthia)\b/i;
var STAPLE_VEG ={tomato: 1, chilli: 1, lemon: 1, coriander: 1, curry: 1, mint: 1};
JJ.recipeMeta = function (r) {
  if (r._meta) return r._meta;
  var sweetG = 0;
  r.ings.forEach(function (x) { if (['sugar', 'jaggery', 'dates', 'khoya'].indexOf(x.id) >= 0) sweetG += x.q; });
  r._meta = {
    active: ((r.prep || 0) >= 120 ? 10 : (r.prep || 0)) + (r.cook || 0),
    fried: FRIED_NAME.test(r.en) || r.steps.some(function (st) { return Array.isArray(st) ? st[0] === 'fry' : st && /deep[- ]?fry/i.test(st.en || ''); }),
    sweet: sweetG / (r.serves || 4) >= 18,
    kcal: JJ.recipeNutrition ? JJ.recipeNutrition(r, [])[0] : 0,
    veg: r.ings.filter(function (x) { var g = JJ.ING[x.id]; return !x.opt && g && (g.cat === 'veg' || g.cat === 'leafy') && !STAPLE_VEG[x.id]; }).map(function (x) { return x.id; })
  };
  return r._meta;
};
/* Practical limits for a home kitchen. Weekdays: quick breakfast, very quick snack, simple dinner;
   weekends allow more. Calories are per serving. */
var BUDGET = {l: {time: 25, wkend: 45, kcal: 400}, b: {time: 30, wkend: 50, kcal: 420}, s: {time: 15, wkend: 40, kcal: 280}, d: {time: 45, wkend: 70, kcal: 650}};
var WEEK_VEG = 7, WEEK_FRIED = 1, WEEK_SWEET = 2;
function weekKey(dn) { var wd = (new Date(dn * 864e5).getUTCDay() + 6) % 7; return dn - wd; } // Monday
JJ.newWeek = function (key) { return {key: key, veg: {}, fried: 0, sweet: 0}; };
/* add one day's chosen dishes to the week's running totals */
JJ.noteWeek = function (week, menu) {
  if (!menu || menu.legacy) return;
  var ids = [];
  ['b', 's', 'd'].forEach(function (m) { var x = JJ.chosenMeal(menu, m); if (x && x.id) ids.push(x.id); });
  JJ.chosenItems(menu).forEach(function (it) { if (it.id) ids.push(it.id); });
  ids.forEach(function (id) {
    var r = JJ.catalog.byId[id]; if (!r) return; var m = JJ.recipeMeta(r);
    m.veg.forEach(function (v) { week.veg[v] = 1; });
    if (m.fried) week.fried++; if (m.sweet) week.sweet++;
  });
};
function kitchenScore(r, ctx) {
  var m = JJ.recipeMeta(r), s = 0, w = ctx.week;
  if (ctx.budget) {
    var lim = ctx.weekend ? ctx.budget.wkend : ctx.budget.time;
    if (m.active > lim) s += 40 + (m.active - lim) * 8;
    if (m.kcal > ctx.budget.kcal) s += (m.kcal - ctx.budget.kcal) * 0.4;
  }
  if (w) {
    // the one fried treat of the week is kept for the weekend
    if (m.fried) s += w.fried >= WEEK_FRIED ? 400 : ctx.weekend ? 0 : 60;
    if (m.sweet) s += w.sweet >= WEEK_SWEET ? 400 : 40;
    var fresh = m.veg.filter(function (v) { return !w.veg[v]; }), have = Object.keys(w.veg).length;
    var over = Math.max(0, have + fresh.length - WEEK_VEG);
    s += over * 90 + fresh.length * 4;
  }
  return s;
}
function pick(cands, ctx, iso, salt) {
  var best = null, bs = Infinity;
  cands.forEach(function (c) {
    var r = c.r, s = c.base || 0;
    var last = ctx.recent[r.id];
    // among recipes that are all allowed, the one used longest ago wins (only matters when the pool ran out)
    if (last != null) s += 2000 + (JJ.NO_REPEAT_DAYS - Math.min(JJ.NO_REPEAT_DAYS, ctx.dn - last)) * 50;
    // dishes with a real photo are slightly preferred, so the day looks as good as it tastes
    if (JJ.PHOTO_INFO && JJ.PHOTO_INFO[r.id] && (r.meal === 'l' || r.meal === 'd') && !JJ.recipeMeta(r).sweet && !JJ.recipeMeta(r).fried) s -= 6;
    var rs = JJ.recipeSeasons(r);
    if (rs.length) s += rs.indexOf(ctx.season) >= 0 ? -18 : 10;
    // Parva-safe dishes are kept for Parva Tithis, where the choice is small
    if (!ctx.parva && JJ.levelB(r) && !JJ.isStaple(r)) s += 12;
    r.ings.forEach(function (x) { if (!x.opt && !JJ.inSeason(JJ.ING[x.id], ctx.month)) s += 15; });
    ctx.todayMain.forEach(function (m) { if (m && m === mainIng(r)) s += 30; });
    s += kitchenScore(r, ctx);
    s += hash(iso + '|' + salt + '|' + r.id + '|' + ctx.seed) % 23;
    if (s < bs) { bs = s; best = c; }
  });
  return best;
}
/* best and second-best candidates: option 1 and option 2 for the household to choose from */
function pickTwo(cands, ctx, iso, salt) {
  var first = pick(cands, ctx, iso, salt);
  if (!first) return [null, null];
  var rest = cands.filter(function (c) { return c.r.id !== first.r.id; });
  return [first, pick(rest, ctx, iso, salt + '#2')];
}
function mainIng(r) {
  var best = null, bq = 0;
  r.ings.forEach(function (x) { var g = JJ.ING[x.id]; if (!g || x.opt) return; if (['veg', 'leafy', 'pulse', 'dairy'].indexOf(g.cat) < 0 || x.id === 'ghee' || x.id === 'cream') return; var w = x.q * (g.unit === 'pc' ? g.pg : 1); if (w > bq) { bq = w; best = x.id; } });
  return best;
}
var SEASON_NOW = null; // set by genDay while it builds a day

/* ---------------- winter specials ---------------- */
/* In local winter every day gets a Winter Morning Goodness item (meal 'm', beside breakfast) and a
   Winter Soup (meal 'w', beside dinner), each with two alternatives. Both follow the day's Jain and
   Parva Tithi rules and the household's allergies and exclusions. None comes back within 30 days: when
   every allowed item was used in the last 30 days, the card is left empty and the menu says so in
   menu.winterShort (never a silent repeat). Outside winter the menu has neither. */
JJ.WINTER_MEALS = ['m', 'w'];
function winterSpecials(menu, iso, prof, rules, order, ctx) {
  delete menu.meals.m; delete menu.meals.w; menu.winterShort = []; menu.winterV = 1;
  menu.winter = ctx.season === 'winter';
  if (!menu.winter) return menu;
  menu.choice = Object.assign({b: 0, l: 0, s: 0, d: 0}, menu.choice, {m: 0, w: 0});
  var budget = ctx.budget; ctx.budget = null; // small portions: the meal time and calorie limits do not apply
  JJ.WINTER_MEALS.forEach(function (meal) {
    var c = candidates(function (r) { return r.meal === meal; }, rules, prof, order);
    var fresh = freshOnly(c, ctx);
    // Parva-safe soups are kept for Parva Tithis (few soups have no vegetables): other days use them
    // only when the vegetable soups have run out
    if (meal === 'w' && !ctx.parva) { var veg = fresh.filter(function (x) { return !JJ.levelB(x.r); }); if (veg.length >= 3) fresh = veg; }
    if (!fresh.length) { menu.winterShort.push(meal); menu.meals[meal] = {id: null, alts: []}; return; }
    var main = pick(fresh, ctx, iso, 'w' + meal), alts = [];
    function more(strict) {
      fresh.forEach(function (x) {
        if (alts.length >= 2 || x.r.id === main.r.id || alts.some(function (a) { return a.r.id === x.r.id; })) return;
        if (strict && (JJ.looksAlike(x.r, main.r) || alts.some(function (a) { return JJ.looksAlike(x.r, a.r); }))) return;
        alts.push(x);
      });
    }
    var rest = fresh.slice().sort(function (a, b) { return (a.base + hash(iso + meal + a.r.id) % 13) - (b.base + hash(iso + meal + b.r.id) % 13); });
    fresh = rest; more(true); more(false);
    ctx.recent[main.r.id] = ctx.dn; // only what is served counts as used; alternatives stay free
    menu.meals[meal] = {id: main.r.id, drop: main.drop, alts: alts.map(function (a) { return {id: a.r.id, drop: a.drop}; })};
  });
  ctx.budget = budget;
  return menu;
}
/* Add (or remove) the winter specials on a menu that was planned before this feature or before the
   season changed. recent: recipe id -> day number of its last use. */
JJ.addWinterSpecials = function (menu, prof, recent) {
  if (!menu || menu.legacy) return menu;
  var city = JJ.profileCity(prof), p = JJ.panchang(menu.date, city, prof), rules = JJ.dayRules(p, prof);
  var ctx = {recent: recent || {}, dn: dayNum(menu.date), month: +menu.date.slice(5, 7), season: JJ.seasonOf(menu.date, city), parva: !!(rules.parva || rules.noGreen), seed: prof.seed || 0, todayMain: [], week: JJ.newWeek(weekKey(dayNum(menu.date)))};
  SEASON_NOW = {season: ctx.season, month: ctx.month};
  winterSpecials(menu, menu.date, prof, rules, cuisineOrder(menu.cuisine || JJ.dayCuisine(menu.date, prof)), ctx);
  SEASON_NOW = null;
  menu.winterV = 1;
  return menu;
};
function candidates(filter, rules, prof, order) {
  var out = [];
  JJ.catalog.list.forEach(function (r) {
    if (!filter(r)) return;
    var drop = JJ.allowed(r, rules, prof);
    if (!drop) return;
    if (SEASON_NOW && !JJ.inSeasonRecipe(r, SEASON_NOW.season, SEASON_NOW.month)) return;
    out.push({r: r, drop: Object.keys(drop), base: cuScore(r, order)});
  });
  return out;
}

JJ.genDay = function (iso, prof, ctx) {
  var city = JJ.profileCity(prof), p = JJ.panchang(iso, city, prof), rules = JJ.dayRules(p, prof);
  var cu = JJ.dayCuisine(iso, prof), order = cuisineOrder(cu), C = JJ.CUISINES[cu] || JJ.CUISINES.gen;
  ctx = ctx || {recent: {}};
  ctx.dn = dayNum(iso); ctx.month = +iso.slice(5, 7); ctx.todayMain = []; ctx.seed = prof.seed || 0;
  ctx.season = JJ.seasonOf(iso, city); ctx.parva = !!(rules.parva || rules.noGreen);
  SEASON_NOW = {season: ctx.season, month: ctx.month};
  var wk = weekKey(ctx.dn), wd = ctx.dn - wk;
  if (!ctx.week || ctx.week.key !== wk) ctx.week = JJ.newWeek(wk); // a new week starts every Monday
  ctx.weekend = wd >= 5;
  function note(r) { ctx.recent[r.id] = ctx.dn; var m = JJ.recipeMeta(r); m.veg.forEach(function (v) { ctx.week.veg[v] = 1; }); if (m.fried) ctx.week.fried++; if (m.sweet) ctx.week.sweet++; }
  var menu = {date: iso, status: 'planned', pv: prof.version || 1, hh: prof.hh, cuisine: cu, season: ctx.season, choice: {b: 0, l: 0, s: 0, d: 0}, shortages: [], repeats: [], skipped: [],
    rules: {noLeafy: rules.noLeafy, noGreen: rules.noGreen, parva: rules.parva, noFruit: rules.noFruit, reasons: rules.reasons, parvaKeys: rules.parvaKeys}, meals: {}};
  // option 1 comes from recipes not served in the last 30 days; option 2 too when there are enough
  // Option 1 and option 2 both come from recipes not offered in the last 30 days, and both are then
  // counted as used, so no dish is shown again within 30 days. altOrder: option 2's own cuisine.
  function chooseTwo(c, salt, slot, side, altOrder) {
    var fresh = freshOnly(c, ctx);
    if (!fresh.length) {
      if (side || !c.length) { if (c.length) menu.skipped.push(slot); return [null, null]; }
      var lru = pick(c, ctx, iso, salt);
      menu.repeats.push({slot: slot, id: lru.r.id, days: ctx.dn - ctx.recent[lru.r.id]});
      return [lru, null];
    }
    var first = pick(fresh, ctx, iso, salt);
    if (slot === 'l:bread' || slot === 'l:rice') return [first, null]; // the daily staple has no option 2
    var rest = fresh.filter(function (x) { return !JJ.looksAlike(x.r, first.r); });
    if (!rest.length) rest = fresh.filter(function (x) { return x.r.id !== first.r.id && !nameWords(x.r).some(function (w) { return nameWords(first.r).indexOf(w) >= 0; }); });
    if (altOrder) rest = rest.map(function (x) { return {r: x.r, drop: x.drop, base: cuScore(x.r, altOrder) + (x.r.meal !== first.r.meal ? 8 : 0)}; });
    var second = rest.length ? pick(rest, ctx, iso, salt + '#2') : null;
    // breakfast and dinner have enough recipes to keep option 2 unique as well (not on Parva days, where the
    // choice is small); any other option 2 is never a dish cooked in the last 30 days and counts once picked
    if (second && altOrder && (slot === 'b' || slot === 'd') && !ctx.parva) ctx.recent[second.r.id] = ctx.dn;
    return [first, second];
  }
  var altOrder = cuisineOrder(JJ.altCuisine(iso, prof));
  function single(meal) {
    ctx.budget = BUDGET[meal];
    // evening snack: the snack recipes plus quick, light breakfast dishes (poha, upma, dhokla, chilla),
    // which is how most homes eat at tea time; this also keeps 30 days of snacks repeat-free
    var c = candidates(function (r) { return r.meal === meal || (meal === 's' && r.meal === 'b' && JJ.recipeMeta(r).active <= 15 && !JJ.recipeMeta(r).fried && !JJ.recipeMeta(r).sweet); }, rules, prof, order);
    if (meal === 's') c.forEach(function (x) { if (x.r.meal === 'b') x.base += 8; });
    // Parva dinner: few dinners are free of fresh vegetables, so filling Parva-safe breakfast dishes
    // (khichu, thepla, dhebra, pudla, handvo...) can be served too, as many Jain homes do on these days
    if (meal === 'd' && ctx.parva) candidates(function (r) { return r.meal === 'b' && !JJ.recipeMeta(r).sweet; }, rules, prof, order).forEach(function (x) { x.base += 10; c.push(x); });
    // every cuisine is already a candidate (with a lower score), so an empty pool means the
    // household's own exclusions rule out every recipe; that is reported, never relaxed
    var two = chooseTwo(c, meal, meal, false, altOrder), got = two[0];
    if (got) { ctx.todayMain.push(mainIng(got.r)); note(got.r); return {id: got.r.id, drop: got.drop, alt: two[1] ? {id: two[1].r.id, drop: two[1].drop} : null}; }
    if (menu.skipped.indexOf(meal) < 0) menu.shortages.push(meal);
    return {id: null, missing: true};
  }
  menu.meals.b = single('b');
  // lunch thali
  var items = [];
  C.lunch.forEach(function (slot, idx) {
    if (slot.indexOf('acc:') === 0) {
      var key = slot.slice(4);
      if (JJ.accAllowed(key, rules, prof)) items.push({slot: 'acc', acc: key});
      return;
    }
    // sambar falls back to a dal and dal to a kadhi, so a South Indian or North Indian lunch keeps
    // its main bowl when the 30-day rule has used up every sambar or dal
    var comps = slot === 'dalkadhi' ? ((hash(iso + 'dk' + ctx.seed) % 3 === 0) ? ['kadhi', 'dal'] : ['dal', 'kadhi']) : slot === 'sambar' ? ['sambar', 'dal'] : slot === 'dal' ? ['dal', 'kadhi'] : [slot];
    // bowls cook side by side, so each one gets its own short limit; rotli and rice are daily staples
    ctx.budget = slot === 'bread' || slot === 'rice' ? null : BUDGET.l;
    var slotOrder = slot === 'bread' ? C.breads.concat(order) : order;
    // staples (roti, rice) are expected every day; sabzi and dal rotate over a week
    var got = null, pool = [];
    for (var k = 0; k < comps.length && !got; k++) {
      var comp = comps[k];
      var c = candidates(function (r) { return r.meal === 'l' && r.comp === comp; }, rules, prof, slotOrder);
      if (k + 1 < comps.length && !freshOnly(c, ctx).length) { pool = pool.concat(c); continue; } // try the fallback bowl first
      if (k > 0 && !freshOnly(c, ctx).length) c = c.concat(pool);
      if (slot === 'dalkadhi' && k === 0) c.forEach(function (x) { x.base -= 5; });
      // everyday thalis mostly carry plain rice; flavoured rice is the occasional change
      if (slot === 'bread') c.forEach(function (x) { if (x.r.id === 'l001' && cu !== 'mah') x.base -= 20; if (x.r.id === 'l009') x.base += 30; });
      if (slot === 'rice' && cu !== 'sou') c.forEach(function (x) { if (x.r.id === 'l115' || x.r.id === 'l116') x.base -= 40; });
      var two = chooseTwo(c, 'l' + idx + comp, 'l:' + slot, !!SIDE_SLOTS[slot]); got = two[0];
      if (got) got.alt = two[1] || null;
    }
    if (got) { items.push({slot: slot, id: got.r.id, drop: got.drop, alt: got.alt && slot !== 'bread' && slot !== 'rice' ? {id: got.alt.r.id, drop: got.alt.drop} : null}); ctx.todayMain.push(mainIng(got.r)); note(got.r); }
    else if (['bread', 'sabzi', 'dal', 'dalkadhi', 'rice', 'sambar'].indexOf(slot) >= 0) { items.push({slot: slot, id: null, missing: true}); menu.shortages.push('l:' + slot); }
  });
  menu.meals.l = {items: items};
  menu.meals.s = single('s');
  menu.meals.d = single('d');
  winterSpecials(menu, iso, prof, rules, order, ctx);
  // only the dishes that will be cooked count as used; an unused option 2 stays free for later days
  SEASON_NOW = null;
  return menu;
};

/* Change Recipe: up to n dishes that could replace one dish of a day. key is 'b', 's', 'd' or
   'l:<index>' for one item of the lunch thali. Every one passes the day's Jain and Parva Tithi
   rules and the household's exclusions, is in season, is not already on the day's menu, and was not
   (and will not be) served within 30 days of this date. used maps recipe id -> day number when it
   is cooked on another day. Best fits first: the day's cuisine, then the season's specials. */
JJ.alternatives = function (menu, key, prof, used, n) {
  if (!menu || menu.legacy) return [];
  var city = JJ.profileCity(prof), p = JJ.panchang(menu.date, city, prof), rules = JJ.dayRules(p, prof);
  var season = JJ.seasonOf(menu.date, city), month = +menu.date.slice(5, 7), dn = dayNum(menu.date);
  var order = cuisineOrder(menu.cuisine || JJ.dayCuisine(menu.date, prof)), cur, filter, planned = null;
  if (key.charAt(0) === 'l') {
    var it = JJ.chosenItems(menu)[+key.slice(2)]; if (!it || !it.id) return [];
    var r0 = JJ.catalog.byId[it.id] || (menu.snap && menu.snap[it.id]); if (!r0) return [];
    cur = it.id; filter = function (r) { return r.meal === 'l' && r.comp === r0.comp; };
  } else {
    var x = JJ.chosenMeal(menu, key); if (!x || !x.id) return [];
    cur = x.id; planned = menu.meals[key].alt && menu.meals[key].alt.id;
    filter = function (r) { return r.meal === key || (key === 's' && r.meal === 'b' && JJ.recipeMeta(r).active <= 20 && !JJ.recipeMeta(r).fried && !JJ.recipeMeta(r).sweet); };
  }
  var onDay = JJ.chosenIds(menu), out = [];
  used = used || {};
  JJ.catalog.list.forEach(function (r) {
    if (!filter(r) || r.id === cur || onDay.indexOf(r.id) >= 0) return;
    var drop = JJ.allowed(r, rules, prof); if (!drop) return;
    if (!JJ.inSeasonRecipe(r, season, month)) return;
    if (!JJ.isStaple(r) && used[r.id] != null && Math.abs(used[r.id] - dn) < JJ.NO_REPEAT_DAYS) return;
    var sc = cuScore(r, order) + hash(menu.date + '|' + key + '|' + r.id) % 17;
    if (JJ.recipeSeasons(r).indexOf(season) >= 0) sc -= 10;
    if (r.id === planned) sc -= 100; // the planned option 2 is offered first
    out.push({id: r.id, drop: Object.keys(drop), s: sc});
  });
  out.sort(function (a, b) { return a.s - b.s; });
  return out.slice(0, n || 5);
};
/* An Ayambil dish uses only grains, pulses, salt, black pepper, hing and dry ginger. */
JJ.ayambilOk = function (r) { return !!r && r.ings.every(function (x) { return JJ.AYAMBIL_OK[x.id]; }); };
/* Ayambil thali for a date: two options, each a bread, a dal, a rice and one more dish,
   rotating day by day so the nine days of an Oli do not repeat the same plate. */
JJ.ayambilDay = function (iso, prof) {
  var by = {};
  JJ.catalog.list.forEach(function (r) { if (r.meal === 'a' && r.status === 'approved' && r.valid !== false && JJ.ayambilOk(r) && JJ.allowed(r, {}, prof || {})) (by[r.comp] = by[r.comp] || []).push(r); });
  var dn = dayNum(iso), seed = (prof && prof.seed) || 0;
  return [0, 1].map(function (opt) {
    return ['bread', 'dal', 'rice', 'extra'].map(function (c) {
      var l = by[c] || []; if (!l.length) return null;
      return {slot: c, id: l[(dn + seed + opt * Math.ceil(l.length / 2) + (c === 'dal' ? 1 : 0)) % l.length].id};
    }).filter(Boolean);
  });
};
/* Snapshot of a recipe for history (immutable copy of what was served). */
JJ.snapshot = function (id) {
  var r = JJ.catalog.byId[id]; if (!r) return null;
  return {id: r.id, meal: r.meal, comp: r.comp, cu: r.cu, en: r.en, hi: r.hi, gu: r.gu, orig: r.orig, serves: r.serves, prep: r.prep, cook: r.cook,
          ings: r.ings.map(function (x) { return {id: x.id, q: x.q, opt: x.opt}; }), steps: r.steps, flags: r.flags, src: r.src};
};
JJ.menuRecipeIds = function (menu) {
  var ids = [];
  function add(id) { if (id && ids.indexOf(id) < 0) ids.push(id); }
  ['b', 's', 'd'].forEach(function (m) { var x = menu.meals[m]; if (x) { add(x.id); if (x.alt) add(x.alt.id); } });
  (menu.meals.l.items || []).forEach(function (it) { add(it.id); if (it.alt) add(it.alt.id); });
  JJ.WINTER_MEALS.forEach(function (m) { var x = menu.meals[m]; if (x) { add(x.id); (x.alts || []).forEach(function (a) { add(a.id); }); } });
  return ids;
};
/* The recipe ids that will actually be cooked on a day (the chosen option of each meal). */
JJ.chosenIds = function (menu) {
  var ids = [];
  if (!menu || menu.legacy) return ids;
  ['b', 's', 'd', 'm', 'w'].forEach(function (m) { var x = JJ.chosenMeal(menu, m); if (x && x.id) ids.push(x.id); });
  JJ.chosenItems(menu).forEach(function (it) { if (it.id && ids.indexOf(it.id) < 0) ids.push(it.id); });
  return ids;
};
/* The recipe ids that count for the 30-day rule: what is cooked, plus option 2 of breakfast and dinner
   (kept unique on everyday days, where there are enough recipes). */
JJ.usedIds = function (menu) {
  var ids = JJ.chosenIds(menu);
  if (menu && !menu.legacy && !(menu.rules && (menu.rules.parva || menu.rules.noGreen))) ['b', 'd'].forEach(function (m) { var x = menu.meals[m]; if (x && x.alt && ids.indexOf(x.alt.id) < 0) ids.push(x.alt.id); });
  return ids;
};
/* The option the household picked for a meal (0 = option 1, 1 = option 2). */
JJ.chosenMeal = function (menu, m) {
  var x = menu.meals[m]; if (!x) return null;
  var c = menu.choice && menu.choice[m];
  if (x.alts) return c && x.alts[c - 1] ? x.alts[c - 1] : x; // winter specials: planned item or one of two alternatives
  return (c === 1 && x.alt) ? x.alt : x;
};
JJ.chosenItems = function (menu) {
  var two = menu.choice && menu.choice.l === 1;
  return (menu.meals.l.items || []).map(function (it) { return two && it.alt ? Object.assign({}, it, {id: it.alt.id, drop: it.alt.drop}) : it; });
};
/* Resolve a recipe for display: history uses its own snapshot. */
JJ.recipeFor = function (menu, id) {
  if (menu && menu.snap && menu.snap[id]) { var s = menu.snap[id]; return Object.assign({ings: s.ings, steps: s.steps, tags: {}}, s, {fromSnapshot: true}); }
  return JJ.catalog.byId[id] || null;
};

/* ---------------- grocery list ---------------- */
var GROUP = {veg: 'veg', leafy: 'veg', fruit: 'fruit', grain: 'grain', pulse: 'pulse', dairy: 'dairy', nuts: 'nuts', spice: 'spice', pantry: 'pantry'};
JJ.GROUP_ORDER = ['veg', 'fruit', 'grain', 'pulse', 'dairy', 'nuts', 'spice', 'pantry'];
JJ.grocery = function (menus) {
  var acc = {};
  function add(id, q) { if (id === 'water') return; acc[id] = (acc[id] || 0) + q; }
  menus.forEach(function (menu) {
    var hh = menu.hh || 1;
    function addRecipe(id, drop) {
      var r = JJ.recipeFor(menu, id); if (!r) return;
      var f = hh / (r.serves || 4);
      r.ings.forEach(function (x) { if ((drop || []).indexOf(x.id) >= 0) return; add(x.id, x.q * f); });
    }
    ['b', 's', 'd', 'm', 'w'].forEach(function (m) { var x = menu.legacy ? menu.meals[m] : JJ.chosenMeal(menu, m); if (x && x.id) addRecipe(x.id, x.drop); });
    (menu.legacy ? (menu.meals.l.items || []) : JJ.chosenItems(menu)).forEach(function (it) {
      if (it.id) addRecipe(it.id, it.drop);
      else if (it.acc) JJ.parseIngs(JJ.ACCOMP[it.acc].ings).forEach(function (x) { add(x.id, x.q * hh); });
    });
  });
  var groups = {};
  Object.keys(acc).forEach(function (id) {
    var g = JJ.ING[id]; if (!g) return;
    var grp = GROUP[g.cat] || 'pantry', q = acc[id], unit = g.unit, amt, u;
    if (unit === 'tsp') { amt = q * g.tg; u = 'g'; }
    else if (unit === 'tbsp') { amt = q * g.tg; u = id === 'ghee' ? 'g' : 'ml'; }
    else if (unit === 'pc') { amt = Math.ceil(q - 1e-9); u = 'pc'; }
    else { amt = q; u = unit; }
    (groups[grp] = groups[grp] || []).push({id: id, amt: amt, unit: u, raw: q});
  });
  return JJ.GROUP_ORDER.filter(function (k) { return groups[k]; }).map(function (k) { return {group: k, items: groups[k]}; });
};
/* Round a grocery amount up to a practical buying size. */
JJ.buyAmount = function (amt, unit) {
  if (unit === 'pc') return {v: Math.max(1, Math.ceil(amt)), u: 'pc'};
  var step = amt < 20 ? 5 : amt < 100 ? 10 : amt < 500 ? 25 : amt < 1000 ? 50 : 100;
  var v = Math.max(step, Math.ceil(amt / step - 1e-9) * step);
  if (v >= 1000) return {v: Math.round(v / 100) / 10, u: unit === 'ml' ? 'l' : 'kg'};
  return {v: v, u: unit};
};
})(window.JJ = window.JJ || {});

/* ---------------- nutrition (approximate, per person) ---------------- */
(function (JJ) {
'use strict';
function grams(id, q) { var g = JJ.ING[id]; if (!g) return 0; return g.unit === 'pc' ? q * g.pg : (g.unit === 'tsp' || g.unit === 'tbsp') ? q * g.tg : q; }
function addTo(t, id, q) { var n = JJ.NUTRITION[id]; if (!n) return; var w = grams(id, q) / 100; for (var i = 0; i < 4; i++) t[i] += n[i] * w; }
function round(t) { return [Math.round(t[0]), Math.round(t[1] * 10) / 10, Math.round(t[2] * 10) / 10, Math.round(t[3] * 10) / 10]; }
/* one serving of a recipe, leaving out ingredients dropped that day: [kcal, protein, carbs, fat] */
JJ.recipeNutrition = function (r, drop) {
  var t = [0, 0, 0, 0]; if (!r) return t;
  r.ings.forEach(function (x) { if ((drop || []).indexOf(x.id) < 0) addTo(t, x.id, x.q / (r.serves || 4)); });
  return round(t);
};
JJ.accNutrition = function (key) { var t = [0, 0, 0, 0]; JJ.parseIngs(JJ.ACCOMP[key].ings).forEach(function (x) { addTo(t, x.id, x.q); }); return round(t); };
/* a whole day for one person: {b, l, s, d, total} */
JJ.dayNutrition = function (menu) {
  var out = {}, tot = [0, 0, 0, 0];
  function acc(k, v) { out[k] = v; for (var i = 0; i < 4; i++) tot[i] += v[i]; }
  ['b', 's', 'd'].forEach(function (m) { var x = menu.legacy ? menu.meals[m] : JJ.chosenMeal(menu, m); acc(m, x && x.id ? JJ.recipeNutrition(JJ.recipeFor(menu, x.id), x.drop) : [0, 0, 0, 0]); });
  var l = [0, 0, 0, 0];
  (menu.legacy ? (menu.meals.l.items || []) : JJ.chosenItems(menu)).forEach(function (it) {
    var v = it.id ? JJ.recipeNutrition(JJ.recipeFor(menu, it.id), it.drop) : it.acc ? JJ.accNutrition(it.acc) : [0, 0, 0, 0];
    for (var i = 0; i < 4; i++) l[i] += v[i];
  });
  acc('l', round(l));
  JJ.WINTER_MEALS.forEach(function (m) { var x = !menu.legacy && JJ.chosenMeal(menu, m); if (x && x.id) acc(m, JJ.recipeNutrition(JJ.recipeFor(menu, x.id), x.drop)); });
  out.total = round(tot);
  out.legacy = !!menu.legacy;
  return out;
};
/* share of energy from protein, carbs and fat (4 / 4 / 9 kcal per gram) */
JJ.energySplit = function (n) {
  var p = n[1] * 4, c = n[2] * 4, f = n[3] * 9, s = p + c + f || 1;
  return [Math.round(p * 100 / s), Math.round(c * 100 / s), Math.round(f * 100 / s)];
};
})(window.JJ = window.JJ || {});

/* ---------------- re-check a stored menu against today's rules ---------------- */
(function (JJ) {
'use strict';
/* Every recipe in a menu (both options) and every accompaniment is checked again before it is shown.
   Returns a list of problems; an empty list means the menu is fully compliant with the current rules. */
JJ.menuViolations = function (menu, prof) {
  if (!menu || menu.legacy) return [];
  var city = JJ.profileCity(prof), p = JJ.panchang(menu.date, city, prof), rules = JJ.dayRules(p, prof), out = [];
  function check(id, where) {
    var r = JJ.catalog.byId[id] || (menu.snap && menu.snap[id] && JJ.compileRecipe(Object.assign({}, menu.snap[id], {ings: menu.snap[id].ings.map(function (x) { return x.id + ':' + x.q + (x.opt ? '?' : ''); }).join(' ')})));
    if (!r) { out.push(where + ':' + id + ':missing'); return; }
    var drop = JJ.allowed(Object.assign({}, r, {status: 'approved'}), rules, prof);
    if (!drop) out.push(where + ':' + id);
  }
  ['b', 's', 'd'].forEach(function (m) { var x = menu.meals[m]; if (x && x.id) { check(x.id, m); if (x.alt) { check(x.alt.id, m + '2'); if (JJ.sameDishName(JJ.catalog.byId[x.id], JJ.catalog.byId[x.alt.id])) out.push(m + ':same-option'); } } });
  JJ.WINTER_MEALS.forEach(function (m) { var x = menu.meals[m]; if (x && x.id) { check(x.id, m); (x.alts || []).forEach(function (a) { check(a.id, m + '2'); }); } });
  (menu.meals.l.items || []).forEach(function (it) {
    if (it.id) check(it.id, 'l'); if (it.alt) check(it.alt.id, 'l2');
    if (it.acc && !JJ.accAllowed(it.acc, rules, prof)) out.push('acc:' + it.acc);
  });
  if (rules.parva && !(menu.rules && menu.rules.parva)) out.push('rules-changed');
  return out;
};
})(window.JJ = window.JJ || {});
