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
function pick(cands, ctx, iso, salt) {
  var best = null, bs = Infinity;
  cands.forEach(function (c) {
    var r = c.r, s = c.base || 0;
    var last = ctx.recent[r.id];
    if (last != null) { var age = ctx.dn - last; if (age < ctx.window) s += 1000 - age * 10; }
    r.ings.forEach(function (x) { if (!x.opt && !JJ.inSeason(JJ.ING[x.id], ctx.month)) s += 15; });
    ctx.todayMain.forEach(function (m) { if (m && m === mainIng(r)) s += 30; });
    s += hash(iso + '|' + salt + '|' + r.id + '|' + ctx.seed) % 23;
    if (s < bs) { bs = s; best = c; }
  });
  return best;
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
  var menu = {date: iso, status: 'planned', pv: prof.version || 1, hh: prof.hh, cuisine: cu, rules: {noLeafy: rules.noLeafy, noGreen: rules.noGreen, reasons: rules.reasons}, meals: {}};
  function single(meal, window) {
    ctx.window = window;
    var c = candidates(function (r) { return r.meal === meal; }, rules, prof, order);
    // every cuisine is already a candidate (with a lower score), so an empty pool means the
    // household's own exclusions rule out every recipe; that is reported, never relaxed
    var got = pick(c, ctx, iso, meal);
    if (got) { ctx.todayMain.push(mainIng(got.r)); return {id: got.r.id, drop: got.drop}; }
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
      got = pick(c, ctx, iso, 'l' + idx + comp);
    }
    if (got) { items.push({slot: slot, id: got.r.id, drop: got.drop}); ctx.todayMain.push(mainIng(got.r)); }
    else if (['bread', 'sabzi', 'dal', 'dalkadhi', 'rice', 'sambar'].indexOf(slot) >= 0) items.push({slot: slot, id: null, missing: true});
  });
  menu.meals.l = {items: items};
  menu.meals.s = single('s', 7);
  menu.meals.d = single('d', 14);
  MEALS.forEach(function (m) { if (m !== 'l' && menu.meals[m]) ctx.recent[menu.meals[m].id] = ctx.dn; });
  items.forEach(function (it) { if (it.id) ctx.recent[it.id] = ctx.dn; });
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
  ['b', 's', 'd'].forEach(function (m) { if (menu.meals[m] && menu.meals[m].id) ids.push(menu.meals[m].id); });
  (menu.meals.l.items || []).forEach(function (it) { if (it.id) ids.push(it.id); });
  return ids;
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
    ['b', 's', 'd'].forEach(function (m) { var x = menu.meals[m]; if (x && x.id) addRecipe(x.id, x.drop); });
    (menu.meals.l.items || []).forEach(function (it) {
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
