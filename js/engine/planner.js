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
    if (last != null) { var age = ctx.dn - last; if (age < ctx.window) s += 1000 - age * 10; }
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
function candidates(filter, rules, prof, order) {
  var out = [];
  JJ.catalog.list.forEach(function (r) {
    if (!filter(r)) return;
    var drop = JJ.allowed(r, rules, prof);
    if (!drop) return;
    out.push({r: r, drop: Object.keys(drop), base: cuScore(r, order)});
  });
  return out;
}

JJ.genDay = function (iso, prof, ctx) {
  var city = JJ.profileCity(prof), p = JJ.panchang(iso, city, prof), rules = JJ.dayRules(p, prof);
  var cu = prof.cuisine || 'gen', order = cuisineOrder(cu), C = JJ.CUISINES[cu] || JJ.CUISINES.gen;
  ctx = ctx || {recent: {}};
  ctx.dn = dayNum(iso); ctx.month = +iso.slice(5, 7); ctx.todayMain = []; ctx.seed = prof.seed || 0;
  var wk = weekKey(ctx.dn), wd = ctx.dn - wk;
  if (!ctx.week || ctx.week.key !== wk) ctx.week = JJ.newWeek(wk); // a new week starts every Monday
  ctx.weekend = wd >= 5;
  function note(r) { var m = JJ.recipeMeta(r); m.veg.forEach(function (v) { ctx.week.veg[v] = 1; }); if (m.fried) ctx.week.fried++; if (m.sweet) ctx.week.sweet++; }
  var menu = {date: iso, status: 'planned', pv: prof.version || 1, hh: prof.hh, cuisine: cu, choice: {b: 0, l: 0, s: 0, d: 0}, shortages: [],
    rules: {noLeafy: rules.noLeafy, noGreen: rules.noGreen, parva: rules.parva, noFruit: rules.noFruit, reasons: rules.reasons, parvaKeys: rules.parvaKeys}, meals: {}};
  function single(meal, window) {
    ctx.window = window; ctx.budget = BUDGET[meal];
    var c =candidates(function (r) { return r.meal === meal; }, rules, prof, order);
    // every cuisine is already a candidate (with a lower score), so an empty pool means the
    // household's own exclusions rule out every recipe; that is reported, never relaxed
    var two = pickTwo(c, ctx, iso, meal), got = two[0];
    if (got) { ctx.todayMain.push(mainIng(got.r)); note(got.r); return {id: got.r.id, drop: got.drop, alt: two[1] ? {id: two[1].r.id, drop: two[1].drop} : null}; }
    menu.shortages.push(meal);
    return {id: null, missing: true};
  }
  menu.meals.b = single('b', 14);
  // lunch thali
  var items = [];
  C.lunch.forEach(function (slot, idx) {
    if (slot.indexOf('acc:') === 0) {
      var key = slot.slice(4);
      if (JJ.accAllowed(key, rules, prof)) items.push({slot: 'acc', acc: key});
      return;
    }
    var comps = slot === 'dalkadhi' ? ((hash(iso + 'dk' + ctx.seed) % 3 === 0) ? ['kadhi', 'dal'] : ['dal', 'kadhi']) : [slot];
    // bowls cook side by side, so each one gets its own short limit; rotli and rice are daily staples
    ctx.budget = slot === 'bread' || slot === 'rice' ? null : BUDGET.l;
    var slotOrder = slot === 'bread' ? C.breads.concat(order) : order;
    // staples (roti, rice) are expected every day; sabzi and dal rotate over a week
    ctx.window = slot === 'sabzi' || slot === 'dal' || slot === 'dalkadhi' ? 6 : (slot === 'bread' || slot === 'rice') ? 0 : 3;
    var got = null;
    for (var k = 0; k < comps.length && !got; k++) {
      var comp = comps[k];
      var c = candidates(function (r) { return r.meal === 'l' && r.comp === comp; }, rules, prof, slotOrder);
      if (slot === 'dalkadhi' && k === 0) c.forEach(function (x) { x.base -= 5; });
      // everyday thalis mostly carry plain rice; flavoured rice is the occasional change
      if (slot === 'bread') c.forEach(function (x) { if (x.r.id === 'l001' && cu !== 'mah') x.base -= 20; if (x.r.id === 'l009') x.base += 30; });
      if (slot === 'rice' && cu !== 'sou') c.forEach(function (x) { if (x.r.id === 'l115' || x.r.id === 'l116') x.base -= 40; });
      var two = pickTwo(c, ctx, iso, 'l' + idx + comp); got = two[0];
      if (got) got.alt = two[1] || null;
    }
    if (got) { items.push({slot: slot, id: got.r.id, drop: got.drop, alt: got.alt && slot !== 'bread' && slot !== 'rice' ? {id: got.alt.r.id, drop: got.alt.drop} : null}); ctx.todayMain.push(mainIng(got.r)); note(got.r); }
    else if (['bread', 'sabzi', 'dal', 'dalkadhi', 'rice', 'sambar'].indexOf(slot) >= 0) { items.push({slot: slot, id: null, missing: true}); menu.shortages.push('l:' + slot); }
  });
  menu.meals.l = {items: items};
  menu.meals.s = single('s', 7);
  menu.meals.d = single('d', 14);
  JJ.menuRecipeIds(menu).forEach(function (id) { ctx.recent[id] = ctx.dn; }); // both options count as used, so tomorrow differs
  return menu;
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
  return ids;
};
/* The option the household picked for a meal (0 = option 1, 1 = option 2). */
JJ.chosenMeal = function (menu, m) { var x = menu.meals[m]; if (!x) return null; return (menu.choice && menu.choice[m] === 1 && x.alt) ? x.alt : x; };
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
    ['b', 's', 'd'].forEach(function (m) { var x = menu.legacy ? menu.meals[m] : JJ.chosenMeal(menu, m); if (x && x.id) addRecipe(x.id, x.drop); });
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
  ['b', 's', 'd'].forEach(function (m) { var x = menu.meals[m]; if (x && x.id) { check(x.id, m); if (x.alt) check(x.alt.id, m + '2'); } });
  (menu.meals.l.items || []).forEach(function (it) {
    if (it.id) check(it.id, 'l'); if (it.alt) check(it.alt.id, 'l2');
    if (it.acc && !JJ.accAllowed(it.acc, rules, prof)) out.push('acc:' + it.acc);
  });
  if (rules.parva && !(menu.rules && menu.rules.parva)) out.push('rules-changed');
  return out;
};
})(window.JJ = window.JJ || {});
