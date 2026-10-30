/* JainJoy database layer (IndexedDB, on the device).
   The schema mirrors db/schema.sql so the same records can move to a server database later.
   Reads are served from an in-memory copy loaded at start-up; writes go to memory at once
   and are persisted to IndexedDB in the background. If IndexedDB is unavailable (some
   private windows), data is kept in localStorage instead. */
(function (JJ) {
'use strict';
var DB_NAME = window.JJ_DB_NAME || 'jainjoy', DB_VERSION = 1, SEED_VERSION = 3;
var STORES = {
  meta: 'key', users: 'id', profiles: 'userId', traditions: 'id', regions: 'id', ingredients: 'id', ingredient_restrictions: 'id',
  recipes: 'id', recipe_translations: 'key', recipe_sources: 'recipeId', panchang: 'key', timings: 'key',
  daily_menus: 'date', monthly_menus: 'month', grocery_lists: 'id', menu_history: 'date'
};
var USER_STORES = ['meta', 'users', 'profiles', 'daily_menus', 'monthly_menus', 'grocery_lists', 'menu_history', 'recipes', 'recipe_translations', 'recipe_sources'];
var mem = {}, idb = null, mode = 'memory', LS = DB_NAME + '.v2.fallback';
Object.keys(STORES).forEach(function (s) { mem[s] = new Map(); });

function openIDB() {
  return new Promise(function (res, rej) {
    if (!window.indexedDB) return rej(new Error('no indexedDB'));
    var req;
    try { req = indexedDB.open(DB_NAME, DB_VERSION); } catch (e) { return rej(e); }
    req.onupgradeneeded = function () {
      var d = req.result;
      Object.keys(STORES).forEach(function (s) {
        if (!d.objectStoreNames.contains(s)) {
          var os = d.createObjectStore(s, {keyPath: STORES[s]});
          if (s === 'recipes') { os.createIndex('meal', 'meal'); os.createIndex('status', 'status'); }
          if (s === 'recipe_translations') os.createIndex('recipeId', 'recipeId');
          if (s === 'menu_history' || s === 'daily_menus') os.createIndex('month', 'month');
        }
      });
    };
    req.onsuccess = function () { res(req.result); };
    req.onerror = function () { rej(req.error); };
    setTimeout(function () { rej(new Error('indexedDB timeout')); }, 4000);
  });
}
function loadAll(d) {
  return Promise.all(Object.keys(STORES).map(function (s) {
    return new Promise(function (res) {
      try {
        var r = d.transaction(s, 'readonly').objectStore(s).getAll();
        r.onsuccess = function () { r.result.forEach(function (o) { mem[s].set(o[STORES[s]], o); }); res(); };
        r.onerror = function () { res(); };
      } catch (e) { res(); }
    });
  }));
}
var queue = [], flushing = false;
function flush() {
  if (flushing || !queue.length) return; flushing = true;
  var batch = queue.splice(0, queue.length), byStore = {};
  batch.forEach(function (op) { (byStore[op.s] = byStore[op.s] || []).push(op); });
  if (mode === 'idb') {
    var t;
    try { t = idb.transaction(Object.keys(byStore), 'readwrite'); } catch (e) { flushing = false; return; }
    Object.keys(byStore).forEach(function (s) {
      var os = t.objectStore(s);
      byStore[s].forEach(function (op) { if (op.del) os.delete(op.k); else if (op.clear) os.clear(); else os.put(op.v); });
    });
    t.oncomplete = t.onerror = t.onabort = function () { flushing = false; if (queue.length) setTimeout(flush, 0); };
  } else {
    try {
      var out = {}; USER_STORES.forEach(function (s) { out[s] = Array.from(mem[s].values()); });
      localStorage.setItem(LS, JSON.stringify(out));
    } catch (e) { /* storage full or blocked: data stays in memory for this session */ }
    flushing = false;
  }
}
function schedule() { setTimeout(flush, 30); }

JJ.db = {
  mode: function () { return mode; },
  open: function () {
    return openIDB().then(function (d) { idb = d; mode = 'idb'; return loadAll(d); }).catch(function () {
      mode = 'local';
      try { var j = JSON.parse(localStorage.getItem(LS) || '{}'); Object.keys(j).forEach(function (s) { (j[s] || []).forEach(function (o) { mem[s].set(o[STORES[s]], o); }); }); } catch (e) {}
    });
  },
  all: function (s) { return Array.from(mem[s].values()); },
  get: function (s, k) { return mem[s].get(k); },
  put: function (s, v) { mem[s].set(v[STORES[s]], v); queue.push({s: s, v: v}); schedule(); return v; },
  del: function (s, k) { mem[s].delete(k); queue.push({s: s, k: k, del: true}); schedule(); },
  clear: function (s) { mem[s].clear(); queue.push({s: s, clear: true}); schedule(); },
  flushNow: function () { return new Promise(function (res) { flush(); setTimeout(res, 120); }); },
  count: function (s) { return mem[s].size; }
};

/* ---------------- seeding and migrations ---------------- */
function srcFor(r) {
  var C = JJ.CUISINES[r.cu[0]] || JJ.CUISINES.gen;
  return {recipeId: r.id, name: 'JainJoy Kitchen – original Jain adaptation of a traditional ' + C.en + ' home recipe', url: null,
          verified: false, note: 'Written for JainJoy and checked automatically for Jain compliance. No external article was copied. A human source review is still pending.'};
}
JJ.seedDatabase = function () {
  var meta = JJ.db.get('meta', 'seed') || {key: 'seed', version: 0};
  if (meta.version >= SEED_VERSION) return false;
  JJ.ING_ROWS.forEach(function (r) { var g = JJ.ING[r[0]]; JJ.db.put('ingredients', {id: g.id, en: g.en, hi: g.hi, gu: g.gu, category: g.cat, unit: g.unit, is_leafy: g.L, is_green: g.G, is_pulse: g.P, is_raw_curd: g.RC, is_crucifer: g.C, allergens: g.alg, season: g.season, grams_per_piece: g.pg, grams_per_tsp: g.tg, jain_allowed: !g.banned, banned_reason: g.banned}); });
  Object.keys(JJ.BAN_REASONS).forEach(function (k) { JJ.db.put('ingredient_restrictions', Object.assign({id: 'ban:' + k, kind: 'banned'}, JJ.BAN_REASONS[k])); });
  JJ.db.put('ingredient_restrictions', {id: 'rule:tithi-leafy', kind: 'tithi', tithis: [8, 14], rule: 'no leafy vegetables', mandatory: true});
  JJ.db.put('ingredient_restrictions', {id: 'rule:dwidal', kind: 'combination', rule: 'raw curd or buttermilk never combined with pulses', mandatory: true});
  [['Shwetambar', ['Murtipujak', 'Sthanakvasi', 'Terapanth', 'Other']], ['Digambar', ['Bispanthi', 'Terapanth', 'Taranpanth', 'Other']]].forEach(function (t) {
    JJ.db.put('traditions', {id: t[0], subsects: t[1], rules: {aathamChaudasLeafy: 'always', optional: ['greenRule', 'shuklaPanchamGreen', 'avoidCrucifer']}});
  });
  Object.keys(JJ.CUISINES).forEach(function (k) { var c = JJ.CUISINES[k]; JJ.db.put('regions', {id: 'cuisine:' + k, kind: 'cuisine', en: c.en, hi: c.hi, gu: c.gu, lunch: c.lunch, breads: c.breads}); });
  Object.keys(JJ.STATES.IN).forEach(function (k) { var s = JJ.STATES.IN[k]; JJ.db.put('regions', {id: 'state:IN-' + k, kind: 'state', country: 'IN', en: s.en, hi: s.hi, gu: s.gu, cuisine: s.cu, calendar: s.cal}); });
  JJ.RECIPE_SEED.forEach(function (r) {
    var cur = JJ.db.get('recipes', r.id);
    if (cur && cur.origin === 'admin') return; // never overwrite an admin edit
    JJ.db.put('recipes', {id: r.id, meal: r.meal, comp: r.comp, cu: r.cu, orig: r.orig, serves: r.serves, prep: r.prep, cook: r.cook, ings: r.ings, steps: r.steps, flags: r.flags,
      status: cur && cur.status === 'rejected' ? 'rejected' : 'approved', origin: 'seed', reviewedBy: 'auto-validator', updatedAt: Date.now(), month: null});
    ['en', 'hi', 'gu'].forEach(function (l) { JJ.db.put('recipe_translations', {key: r.id + '|' + l, recipeId: r.id, lang: l, name: r[l]}); });
    JJ.db.put('recipe_sources', srcFor(r));
  });
  meta.version = SEED_VERSION; meta.at = Date.now(); JJ.db.put('meta', meta);
  return true;
};
/* Rebuild raw recipe objects (recipe + translations + source) from the database. */
JJ.recipesFromDb = function () {
  var tr = {}; JJ.db.all('recipe_translations').forEach(function (t) { (tr[t.recipeId] = tr[t.recipeId] || {})[t.lang] = t.name; });
  return JJ.db.all('recipes').map(function (r) {
    var n = tr[r.id] || {};
    return Object.assign({}, r, {en: n.en, hi: n.hi, gu: n.gu, src: JJ.db.get('recipe_sources', r.id) || null});
  });
};
/* Import a v1 (single-file app) profile and its past menus. */
JJ.migrateV1 = function () {
  var raw; try { raw = localStorage.getItem('jainjoy.app.v1'); } catch (e) { return false; }
  if (!raw || JJ.db.get('meta', 'v1import')) return false;
  var s; try { s = JSON.parse(raw); } catch (e) { return false; }
  if (s && s.profile) {
    var p = s.profile, cid = JJ.cityIdByName(p.city) || 'in-ahmedabad', c = JJ.CITIES[cid];
    var st = c.country === 'IN' ? JJ.STATES.IN[c.state] : null;
    JJ.db.put('profiles', {userId: 'local', lang: 'en', tradition: p.tradition, subsect: p.subsect, country: c.country, state: c.state, cityId: cid,
      cuisine: st ? st.cu : 'gen', calendar: st ? st.cal : 'amanta', hh: p.hh || 4, allergies: (p.allergies || []).filter(function (a) { return JJ.ALLERGENS[a]; }),
      exclude: (p.custom || []).map(function (w) { w = String(w).toLowerCase().trim(); return Object.keys(JJ.ING).filter(function (id) { var g = JJ.ING[id]; return !g.banned && w.length > 2 && (g.en + ' ' + g.hi + ' ' + g.gu).toLowerCase().indexOf(w) >= 0; }); }).reduce(function (a, b) { return a.concat(b); }, []), excludeWords: p.custom || [], avoidCrucifer: false, greenRule: 'none', shuklaPanchamGreen: false, navkarsi: 48, chauvihar: 0,
      created: p.created, planFrom: JJ.addDays(JJ.todayISO(), 1), version: 1, migratedFrom: 'v1'});
    Object.keys(s.menus || {}).forEach(function (d) {
      var m = s.menus[d], names = JJ.LEGACY_V1 || {};
      JJ.db.put('menu_history', {date: d, month: d.slice(0, 7), status: 'history', legacy: true, hh: m.hh || p.hh || 4,
        meals: {b: {legacy: names[m.b] || m.b}, l: {items: [{slot: 'legacy', legacy: names[m.l] || m.l}]}, s: {legacy: names[m.s] || m.s}, d: {legacy: names[m.d] || m.d}}});
    });
  }
  JJ.db.put('meta', {key: 'v1import', at: Date.now()});
  return true;
};
})(window.JJ = window.JJ || {});
