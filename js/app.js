/* JainJoy v2 app: screens, navigation and wiring between the database and the engines. */
(function (JJ) {
'use strict';
var app = document.getElementById('app');
var MEALS = ['b', 'l', 's', 'd'];
var P = null, LANG = 'en', tab = 'today', stack = [], draft = null, openField = null, sheet = null;
var ui = {calMonth: null, gRange: 'week', admin: {status: 'all', meal: 'all', q: ''}, lib: {meal: 'b', q: ''}, geo: {q: '', results: null, busy: false}, ingQ: ''};
var previewCache = new Map(), previewPv = -1;

/* ---------------- i18n helpers ---------------- */
function t(k, vars) {
  var s = (JJ.I18N[LANG] && JJ.I18N[LANG][k]) || JJ.I18N.en[k] || k;
  if (vars) Object.keys(vars).forEach(function (v) { s = s.split('{' + v + '}').join(vars[v]); });
  return s;
}
JJ.t = t;
function nm(o) { return o ? (o[LANG] || o.en) : ''; }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]; }); }
function loc() { return LANG === 'hi' ? 'hi-IN' : LANG === 'gu' ? 'gu-IN' : 'en-IN'; }
function dfmt(iso, o) { var d = new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10), 12)); return new Intl.DateTimeFormat(loc(), Object.assign({timeZone: 'UTC', numberingSystem: 'latn'}, o)).format(d); }
function dLong(iso) { return dfmt(iso, {weekday: 'long', day: 'numeric', month: 'long'}); }
function dShort(iso) { return dfmt(iso, {weekday: 'short', day: 'numeric', month: 'short'}); }
function monthTitle(ym) { return dfmt(ym + '-15', {month: 'long', year: 'numeric'}); }
function ingName(id) { var g = JJ.ING[id]; return g ? (g[LANG] || g.en) : id; }
function rName(r) { return r ? (r[LANG] || r.en) : t('unknown_recipe'); }
function fracStr(v) { var w = Math.floor(v + 1e-9), f = v - w, s = ''; if (f > 0.85) { w += 1; f = 0; } if (f > 0.6) s = '¾'; else if (f > 0.4) s = '½'; else if (f > 0.15) s = '¼'; return (w ? String(w) : (s ? '' : '0')) + s; }
function qtyText(id, q) {
  var g = JJ.ING[id]; if (!g) return String(q);
  if (g.unit === 'tsp' || g.unit === 'tbsp' || g.unit === 'pc') return fracStr(q) + ' ' + t('u_' + g.unit);
  var v = q < 10 ? Math.round(q * 10) / 10 : q < 100 ? Math.round(q) : Math.round(q / 5) * 5;
  if (v >= 1000) return (Math.round(v / 100) / 10) + ' ' + t(g.unit === 'ml' ? 'u_l' : 'u_kg');
  return v + ' ' + t('u_' + g.unit);
}
function hm(ms) { return JJ.tz.hm(ms, city().tz, LANG); }
function until(ms) {
  var d = ms - Date.now();
  if (d <= 0) return t('passed');
  var h = Math.floor(d / 36e5), m = Math.floor((d % 36e5) / 6e4);
  return h ? t('in_hm', {h: h, m: m}) : t('in_m', {m: m});
}

/* ---------------- profile and calendar helpers ---------------- */
function city() { return JJ.profileCity(P || {}); }
function cityLabel(c) { c = c || city(); return c[LANG] || c.en || c.name || ''; }
function today() { return JJ.todayISO(city().tz); }
function pan(iso) { return JJ.panchang(iso, city(), {calendar: P.calendar, trad: P.tradition, subsect: P.subsect}); }
function ym(iso) { return iso.slice(0, 7); }
function monthStart(m) { return m + '-01'; }
function monthEnd(m) { var y = +m.slice(0, 4), mo = +m.slice(5, 7); return new Date(Date.UTC(y, mo, 0)).toISOString().slice(0, 10); }
function addMonth(m, k) { var y = +m.slice(0, 4), mo = +m.slice(5, 7) - 1 + k; return new Date(Date.UTC(y, mo, 1)).toISOString().slice(0, 7); }
function saveProfile() { JJ.db.put('profiles', P); }

/* ---------------- menus: history, saved plans, previews ---------------- */
function getStored(iso) {
  var h = JJ.db.get('menu_history', iso); if (h) return h;
  var p = JJ.db.get('daily_menus', iso); if (p && p.pv === P.version) return p;
  return null;
}
function recentFor(iso) {
  var rec = {}; var dn = JJ.dayNum(iso);
  for (var k = 14; k >= 1; k--) {
    var d = JJ.addDays(iso, -k), m = getStored(d) || previewCache.get(d);
    if (!m || m.legacy) continue;
    JJ.menuRecipeIds(m).forEach(function (id) { rec[id] = dn - k; });
  }
  return rec;
}
function generate(iso) { return JJ.genDay(iso, P, {recent: recentFor(iso)}); }
function panSummary(iso) {
  var p = pan(iso), tm = JJ.timings(p, {navkarsi: P.navkarsi, chauvihar: P.chauvihar});
  return {t: p.t, paksha: p.paksha, month: p.month, adhik: p.adhik, obs: p.observances.map(function (o) { return o.k; }), aatham: p.aatham, chaudas: p.chaudas,
          sunrise: tm.sunrise, navkarsi: tm.navkarsi, sunset: tm.sunset, chauvihar: tm.chauvihar, city: cityLabel(), tz: city().tz};
}
function freeze(menu) {
  var snap = {}; JJ.menuRecipeIds(menu).forEach(function (id) { snap[id] = JJ.snapshot(id); });
  var h = Object.assign({}, menu, {status: 'history', month: ym(menu.date), snap: snap, pan: panSummary(menu.date), frozenAt: Date.now()});
  JJ.db.put('menu_history', h); JJ.db.del('daily_menus', menu.date); previewCache.delete(menu.date);
  return h;
}
function freezeHistory() {
  if (!P) return;
  var td = today(), meta = JJ.db.get('meta', 'frozen') || {key: 'frozen', upto: null};
  var start = meta.upto ? JJ.addDays(meta.upto, 1) : P.created;
  if (start < P.created) start = P.created;
  if (JJ.dayNum(td) - JJ.dayNum(start) > 60) start = JJ.addDays(td, -60);
  for (var d = start; d <= td; d = JJ.addDays(d, 1)) {
    if (JJ.db.get('menu_history', d)) continue;
    var p = JJ.db.get('daily_menus', d);
    freeze(p && p.pv === P.version ? p : generate(d));
  }
  meta.upto = td; JJ.db.put('meta', meta);
}
function menuFor(iso) {
  if (!P) return null;
  var h = JJ.db.get('menu_history', iso); if (h) return h;
  if (iso < P.created) return null;
  var td = today();
  if (iso <= td) { freezeHistory(); return JJ.db.get('menu_history', iso); }
  if (previewPv !== P.version) { previewCache.clear(); previewPv = P.version; }
  var s = JJ.db.get('daily_menus', iso); if (s && s.pv === P.version) return s;
  for (var d = JJ.addDays(td, 1); d <= iso; d = JJ.addDays(d, 1)) {
    if (getStored(d) || previewCache.has(d)) continue;
    previewCache.set(d, Object.assign(generate(d), {status: 'preview'}));
  }
  return previewCache.get(iso);
}
function generateMonth(m) {
  var td = today(), days = [];
  for (var d = monthStart(m); d <= monthEnd(m); d = JJ.addDays(d, 1)) {
    if (d <= td) continue;
    var cur = menuFor(d);
    var saved = Object.assign({}, cur, {status: 'planned', month: m, savedAt: Date.now()});
    JJ.db.put('daily_menus', saved); previewCache.delete(d); days.push(d);
  }
  JJ.db.put('monthly_menus', {month: m, pv: P.version, generatedAt: Date.now(), days: days, cuisine: P.cuisine, city: cityLabel()});
}
function applyProfileChange() {
  var td = today();
  P.version = (P.version || 1) + 1; P.planFrom = JJ.addDays(td, 1); saveProfile();
  JJ.db.all('daily_menus').forEach(function (m) { if (m.date > td) JJ.db.del('daily_menus', m.date); });
  previewCache.clear(); JJ.panchangReset();
  JJ.db.all('monthly_menus').forEach(function (mm) { if (mm.month >= ym(td)) generateMonth(mm.month); });
}
function menuStatus(iso, m) {
  if (!m) return 'none';
  if (m.status === 'history') return 'hist';
  if (m.status === 'planned') return 'plan';
  return 'prev';
}

/* ---------------- art ---------------- */
var IC = {
 today:'<path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 21V3c-2 1.5-3.2 4.2-3.2 7.5H17"/>',
 cal:'<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
 cart:'<path d="M3 4h2.5l2.2 10.5h10.6L20.5 7H6.4"/><circle cx="9" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/>',
 more:'<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
 moon:'<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
 back:'<path d="M15 5l-7 7 7 7"/>', next:'<path d="M9 5l7 7-7 7"/>', check:'<path d="M5.5 12.5l4 4 9-9.5"/>',
 lock:'<rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
 home:'<path d="M3.5 11L12 4l8.5 7M6 9.5V20h12V9.5"/><path d="M10 20v-5h4v5"/>',
 sect:'<circle cx="12" cy="7" r="2.8"/><circle cx="5.5" cy="10" r="2.2"/><circle cx="18.5" cy="10" r="2.2"/><path d="M7.5 20c.6-3.3 2.3-5 4.5-5s3.9 1.7 4.5 5M2 19c.3-2.4 1.6-3.8 3.5-3.8M22 19c-.3-2.4-1.6-3.8-3.5-3.8"/>',
 pin:'<path d="M12 21s-6.5-6.2-6.5-11.5a6.5 6.5 0 0 1 13 0C18.5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.3"/>',
 users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><path d="M16 4.8a3.5 3.5 0 0 1 0 6.4M18 14.8c1.8.7 3 2.5 3.5 5.2"/>',
 shield:'<path d="M12 3l7.5 3v5.5c0 4.6-3.2 8.3-7.5 9.5-4.3-1.2-7.5-4.9-7.5-9.5V6z"/>',
 leaf:'<path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14z"/><path d="M5 19c3-4 6-6.5 9-8"/>',
 noleaf:'<path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14z"/><path d="M3 3l18 18"/>',
 clock:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
 copy:'<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8"/>',
 undo:'<path d="M4 9h11a5 5 0 0 1 0 10H9"/><path d="M8 5L4 9l4 4"/>',
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4"/>',
 globe:'<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.6 3.5 5.4 3.5 8.5s-1 5.9-3.5 8.5c-2.5-2.6-3.5-5.4-3.5-8.5s1-5.9 3.5-8.5z"/>',
 thali:'<circle cx="12" cy="12" r="8.5"/><circle cx="9" cy="10" r="2"/><circle cx="15" cy="10" r="2"/><circle cx="12" cy="15" r="2"/>',
 book:'<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20v3H6.5"/>',
 edit:'<path d="M4 20h4L19 9l-4-4L4 16z"/>', db:'<ellipse cx="12" cy="5.5" rx="7.5" ry="2.5"/><path d="M4.5 5.5v13c0 1.4 3.4 2.5 7.5 2.5s7.5-1.1 7.5-2.5v-13M4.5 12c0 1.4 3.4 2.5 7.5 2.5s7.5-1.1 7.5-2.5"/>',
 info:'<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8h.01"/>', plus:'<path d="M12 5v14M5 12h14"/>'
};
function ic(n, cls) { return '<svg class="ic' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true">' + (IC[n] || '') + '</svg>'; }
function lotus(s) { return '<svg class="lotus" width="' + s + '" height="' + Math.round(s * 52 / 64) + '" viewBox="0 0 64 52" aria-hidden="true"><use href="#jjLotus"/></svg>'; }
var WORDMARK = '<span class="wm">Jain<em>Joy</em></span>';
var PAL = {veg: ['#8fbf6a', '#5a9e45', '#e04b36', '#c9e29a'], leafy: ['#2f8f46', '#3a9a4e'], grain: ['#f4ecd8', '#d9a25e', '#ead9a0'], pulse: ['#e8c23a', '#e3b02f', '#e17a3a'], dairy: ['#fbf8ef', '#f7efd0'], fruit: ['#e5584a', '#f6dc5b', '#c4264b'], nuts: ['#c99a5b', '#b98a54'], spice: ['#d97800'], pantry: ['#f2cf5b']};
function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function plate(r, size) {
  var cols = [];
  (r ? r.ings : []).forEach(function (x) { var g = JJ.ING[x.id]; if (!g || g.cat === 'spice' || g.cat === 'pantry') return; var p = PAL[g.cat] || PAL.veg; var c = p[hash(x.id) % p.length]; if (cols.indexOf(c) < 0 && cols.length < 5) cols.push(c); });
  if (!cols.length) cols = ['#e8c23a'];
  var id = r ? r.id : 'x', rnd = function (k) { return (hash(id + k) % 1000) / 1000; };
  var s = '<svg class="plate" viewBox="0 0 100 100" width="' + size + '" height="' + size + '" aria-hidden="true"><circle cx="50" cy="53" r="46" fill="var(--plate-shadow)"/><circle cx="50" cy="50" r="46" fill="var(--plate)" stroke="var(--plate-line)" stroke-width="1.5"/><circle cx="50" cy="50" r="36" fill="var(--plate-in)"/><circle cx="50" cy="50" r="28" fill="' + cols[0] + '"/>';
  var spots = [[38, 40, 11], [62, 42, 10], [42, 63, 10], [63, 61, 9]];
  for (var i = 1; i < cols.length && i <= 4; i++) { var sp = spots[i - 1]; s += '<circle cx="' + (sp[0] + (rnd('x' + i) - .5) * 6).toFixed(1) + '" cy="' + (sp[1] + (rnd('y' + i) - .5) * 6).toFixed(1) + '" r="' + sp[2] + '" fill="' + cols[i] + '"/>'; }
  return s + '<ellipse cx="38" cy="35" rx="10" ry="4" fill="#ffffff" opacity=".3" transform="rotate(-32 38 35)"/></svg>';
}

/* ---------------- shell ---------------- */
function langChip() { return '<div class="lang-chip" role="group" aria-label="' + esc(t('language')) + '">' + [['en', 'EN'], ['hi', 'हि'], ['gu', 'ગુ']].map(function (l) { return '<button data-a="lang" data-v="' + l[0] + '" aria-pressed="' + (LANG === l[0]) + '">' + l[1] + '</button>'; }).join('') + '</div>'; }
function brandBar() { return '<header class="appbar gx"><div class="brand-sm">' + lotus(30) + WORDMARK + '</div><button class="city-chip" data-a="tab" data-v="more" aria-label="' + esc(t('change_city')) + '">' + ic('pin') + '<span>' + esc(cityLabel()) + '</span></button>' + langChip() + '</header>'; }
function backBar(title, sub, extra) { return '<header class="appbar gx"><button class="icon-btn" data-a="back" aria-label="' + esc(t('back')) + '">' + ic('back') + '</button><div class="ab-title"><b>' + esc(title) + '</b>' + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</div>' + (extra || '') + '</header>'; }
function tabbar() {
  var cur = tab;
  function b(v, i, l) { return '<button class="tab" data-a="tab" data-v="' + v + '"' + (cur === v ? ' aria-current="page"' : '') + '><span class="pill">' + ic(i) + '</span>' + esc(t(l)) + '</button>'; }
  return '<nav class="tabbar gx" aria-label="' + esc(t('main_nav')) + '">' + b('today', 'today', 'tab_today') + b('cal', 'cal', 'tab_calendar') + b('pan', 'moon', 'tab_panchang') + b('shop', 'cart', 'tab_grocery') + b('more', 'more', 'tab_more') + '</nav>';
}
var lastKey = '';
function render() {
  document.documentElement.lang = LANG === 'hi' ? 'hi' : LANG === 'gu' ? 'gu' : 'en';
  var sc = document.getElementById('scroll'), top = stack[stack.length - 1];
  var key = (P ? '' : 'onb') + tab + '|' + (top ? JSON.stringify(top) : ''), keep = sc && key === lastKey ? sc.scrollTop : 0;
  var body;
  if (!P) body = viewProfile(true);
  else if (top) body = ({day: viewDayPushed, recipe: viewRecipe, thali: viewThali, profile: function () { return viewProfile(false); }, library: viewLibrary, glossary: viewGlossary,
    admin: viewAdmin, edit: viewEdit, about: viewAbout, glists: viewSavedLists, glist: viewSavedList})[top.k](top);
  else body = tab === 'today' ? viewToday() : tab === 'cal' ? viewCal() : tab === 'pan' ? viewPan() : tab === 'shop' ? viewShop() : viewMore();
  app.innerHTML = '<div class="phone">' + body + (P ? tabbar() : '') + sheetHTML() + '</div>';
  var ns = document.getElementById('scroll'); if (ns) ns.scrollTop = keep; lastKey = key;
  tick();
}
var toastT = null;
function toast(msg) { var el = document.getElementById('toast'); el.textContent = msg; el.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(function () { el.classList.remove('show'); }, 2800); }

/* ---------------- Today / Day ---------------- */
function timingCard(iso, live) {
  var p = pan(iso), tm = JJ.timings(p, {navkarsi: P.navkarsi, chauvihar: P.chauvihar}), now = Date.now();
  function cell(lbl, ms, cls, showUntil) { return '<div class="tcell ' + (cls || '') + '"><small>' + esc(t(lbl)) + '</small><b>' + hm(ms) + '</b>' + (showUntil ? '<em data-until="' + ms + '">' + until(ms) + '</em>' : '') + '</div>'; }
  var navOpen = live && now < tm.navkarsi, chaOpen = live && now < tm.chauvihar;
  return '<section class="card glass"><h3>' + esc(t('timings_title')) + ' · ' + esc(cityLabel()) + '</h3><div class="tgrid">' +
    cell('sunrise', tm.sunrise) + cell('navkarsi', tm.navkarsi, navOpen ? 'hi' : '', live) + cell('sunset', tm.sunset) + cell('chauvihar', tm.chauvihar, chaOpen ? 'warn' : '', live) +
    '</div><p class="fine" style="margin-top:8px">' + esc(t('timings_note', {n: P.navkarsi, c: P.chauvihar ? t('chauvihar_before', {m: P.chauvihar}) : t('chauvihar_at')})) + '</p></section>';
}
function tithiCard(iso) {
  var p = pan(iso), r = JJ.dayRules(p, P), sp = p.aatham || p.chaudas;
  var title = (sp ? t(p.aatham ? 'aatham' : 'chaudas') + ' · ' : '') + JJ.tithiName(p.t, LANG);
  var mo = JJ.MONTHS[p.month][{en: 0, hi: 1, gu: 2}[LANG]];
  var h = '<div class="tcard' + (sp ? ' sp' : '') + '"><div class="tbox"><span>' + esc(t('tithi')) + '</span><b>' + p.n + '</b></div><div class="tinfo"><b>' + esc(title) + '</b><small>' +
    esc((p.adhik ? t('adhik') + ' ' : '') + mo + ' ' + t(p.paksha === 'S' ? 'shukla' : 'krishna') + ' · ' + t('ends_at', {time: hm(p.tithiEnd)})) + '</small></div></div>';
  var tags = [];
  if (p.shuklaPancham) tags.push(t('shukla_pancham'));
  if (p.vriddhi) tags.push(t('vriddhi'));
  if (p.skipped) tags.push(t('kshaya', {name: JJ.tithiName(p.skipped, LANG)}));
  p.observances.forEach(function (o) { tags.push(nm(o)); });
  if (tags.length) h += '<div class="obs">' + tags.map(function (x) { return '<span>' + esc(x) + '</span>'; }).join('') + '</div>';
  if (r.noGreen) h += '<p class="rule-note sp">' + ic('noleaf') + '<span><b>' + esc(t('no_green_today')) + '</b> ' + esc(t('no_green_why')) + '</span></p>';
  else if (r.noLeafy) h += '<p class="rule-note sp">' + ic('noleaf') + '<span><b>' + esc(t('no_leafy_today', {day: t(p.aatham ? 'aatham' : 'chaudas')})) + '</b> ' + esc(t('always_on')) + '</span></p>';
  else h += '<p class="rule-note">' + ic('check') + '<span><b>' + esc(t('base_rules')) + '</b> ' + esc(t('base_rules_text')) + '</span></p>';
  return h;
}
function mealCard(iso, k, menu) {
  var x = menu.meals[k], tagCls = {b: 'b', l: 'l', s: 's', d: 'd'}[k];
  if (k === 'l') {
    var items = (x.items || []).filter(function (it) { return it.id || it.acc || it.legacy; });
    var names = items.map(function (it) { return it.legacy ? it.legacy : it.acc ? nm(JJ.ACCOMP[it.acc]) : rName(JJ.recipeFor(menu, it.id)); });
    var main = items.filter(function (it) { return it.id; })[1] || items[0];
    var r0 = main && main.id ? JJ.recipeFor(menu, main.id) : null;
    return '<button class="meal" data-a="thali" data-d="' + iso + '">' + plate(r0, 64) + '<span class="mtxt"><span class="mtag mt-l">' + esc(t('meal_l')) + ' · ' + esc(nm(JJ.CUISINES[menu.cuisine] || JJ.CUISINES.gen)) + '</span><b>' + esc(names.slice(0, 3).join(' · ')) + '</b><small>' + esc(t('thali_items', {n: items.length})) + '</small></span>' + ic('next', 'chev') + '</button>';
  }
  if (!x || x.legacy) return '<div class="meal"><span class="mtxt"><span class="mtag mt-' + tagCls + '">' + esc(t('meal_' + k)) + '</span><b>' + esc(x ? x.legacy : '—') + '</b><small>' + esc(t('legacy_menu')) + '</small></span></div>';
  if (!x.id) return '<div class="meal"><span class="mtxt"><span class="mtag mt-' + tagCls + '">' + esc(t('meal_' + k)) + '</span><b>' + esc(t('no_match')) + '</b><small>' + esc(t('no_match_hint')) + '</small></span></div>';
  var r = JJ.recipeFor(menu, x.id);
  var extra = k === 'd' ? '<span class="warn-line" style="color:var(--saffron)">' + esc(t('finish_before', {time: hm(JJ.timings(pan(iso), {navkarsi: P.navkarsi, chauvihar: P.chauvihar}).chauvihar)})) + '</span>' : '';
  return '<button class="meal" data-a="recipe" data-d="' + iso + '" data-id="' + x.id + '">' + plate(r, 64) + '<span class="mtxt"><span class="mtag mt-' + tagCls + '">' + esc(t('meal_' + k)) + '</span><b>' + esc(rName(r)) + '</b><small>' + esc(t('min_total', {n: (r.prep || 0) + (r.cook || 0)})) + (x.drop && x.drop.length ? ' · ' + esc(t('adjusted_today')) : '') + '</small>' + extra + '</span>' + ic('next', 'chev') + '</button>';
}
function statusPill(st) { return st === 'hist' ? '<span class="status-pill st-hist">' + ic('lock') + esc(t('status_hist')) + '</span>' : st === 'plan' ? '<span class="status-pill st-plan">' + ic('check') + esc(t('status_plan')) + '</span>' : st === 'prev' ? '<span class="status-pill st-prev">' + esc(t('status_prev')) + '</span>' : ''; }
function dayBody(iso, isToday) {
  var menu = menuFor(iso), b = '';
  b += isToday ? timingCard(iso, true) : timingCard(iso, false);
  b += tithiCard(iso);
  if (!menu) { b += '<div class="empty"><b>' + esc(t('no_plan_day')) + '</b>' + esc(t('plan_started', {date: dLong(P.created)})) + '</div>'; return b; }
  b += '<div class="row" style="margin-top:14px">' + statusPill(menuStatus(iso, menu)) + '</div>';
  b += '<div class="meals" style="margin-top:8px">' + MEALS.map(function (k) { return mealCard(iso, k, menu); }).join('') + '</div>';
  b += '<p class="fine">' + esc(menu.status === 'history' ? t('hist_note') : menu.status === 'planned' ? t('plan_note') : t('prev_note')) + '</p>';
  return b;
}
function viewToday() {
  var td = today();
  var b = '<p class="eyebrow">' + esc(t('greeting')) + '</p><h1 class="h1">' + esc(t('todays_menu')) + '</h1><p class="sub">' + esc(dLong(td)) + ' · ' + esc(t('for_members', {n: P.hh})) + '</p>' + dayBody(td, true);
  b += '<p class="fine" style="text-align:center"><button class="linkbtn" data-a="tab" data-v="cal">' + esc(t('see_month')) + '</button></p>';
  return brandBar() + '<main class="scroll gx" id="scroll">' + b + '</main>';
}
function viewDayPushed(top) {
  var iso = top.date, td = today();
  var sub = iso === td ? t('today') : iso < td ? t('past_day') : t('upcoming');
  var nav = '<div class="ab-nav"><button class="icon-btn" data-a="shift" data-v="-1" aria-label="' + esc(t('prev_day')) + '">' + ic('back') + '</button><button class="icon-btn" data-a="shift" data-v="1" aria-label="' + esc(t('next_day')) + '"' + (JJ.addDays(iso, 1) > monthEnd(addMonth(ym(td), 1)) ? ' disabled' : '') + '>' + ic('next') + '</button></div>';
  return backBar(dLong(iso), sub, nav) + '<main class="scroll gx" id="scroll">' + dayBody(iso, iso === td) + '</main>';
}

/* ---------------- Thali and recipe ---------------- */
function viewThali(top) {
  var menu = menuFor(top.date), items = menu.meals.l.items || [], cu = JJ.CUISINES[menu.cuisine] || JJ.CUISINES.gen;
  var b = '<h1 class="h1" style="margin-top:6px">' + esc(t('thali_title', {c: nm(cu)})) + '</h1><p class="sub">' + esc(t('thali_sub')) + '</p>';
  var hasRaw = false, hasPulse = false;
  items.forEach(function (it) {
    if (it.legacy) { b += '<div class="titem acc"><span class="mtxt"><b>' + esc(it.legacy) + '</b><small>' + esc(t('legacy_menu')) + '</small></span></div>'; return; }
    if (it.acc) {
      var a = JJ.ACCOMP[it.acc]; if (a.note === 'dwidal') hasRaw = true;
      b += '<div class="titem acc"><span class="ficon">' + ic('thali') + '</span><span class="mtxt"><span class="tag">' + esc(t('accompaniment')) + '</span><b>' + esc(nm(a)) + '</b></span></div>'; return;
    }
    if (!it.id) { b += '<div class="titem acc"><span class="mtxt"><b>' + esc(nm(JJ.SLOT_NAMES[it.slot] || {en: it.slot})) + '</b><small>' + esc(t('no_match')) + '</small></span></div>'; return; }
    var r = JJ.recipeFor(menu, it.id);
    if (r.ings.some(function (x) { return JJ.ING[x.id] && JJ.ING[x.id].P; })) hasPulse = true;
    if (r.ings.some(function (x) { return JJ.ING[x.id] && JJ.ING[x.id].RC; }) && (r.flags || '').indexOf('ch') < 0) hasRaw = true;
    b += '<button class="titem" data-a="recipe" data-d="' + top.date + '" data-id="' + it.id + '">' + plate(r, 48) + '<span class="mtxt"><span class="tag">' + esc(nm(JJ.SLOT_NAMES[it.slot] || JJ.SLOT_NAMES[r.comp] || {en: r.comp})) + '</span><b>' + esc(rName(r)) + '</b><small>' + esc(t('min_total', {n: (r.prep || 0) + (r.cook || 0)})) + '</small></span>' + ic('next', 'chev') + '</button>';
  });
  if (hasRaw && hasPulse) b += '<div class="note">' + esc(t('dwidal_thali')) + '</div>';
  if (menu.rules && menu.rules.noGreen) b += '<div class="note info">' + esc(t('thali_green_note')) + '</div>';
  return backBar(t('meal_l'), dLong(top.date)) + '<main class="scroll gx" id="scroll">' + b + '</main>';
}
function viewRecipe(top) {
  var menu = top.date ? menuFor(top.date) : null, r = menu ? JJ.recipeFor(menu, top.id) : JJ.catalog.byId[top.id];
  if (!r) return backBar(t('recipe')) + '<main class="scroll gx" id="scroll"><div class="empty">' + esc(t('unknown_recipe')) + '</div></main>';
  var drop = [];
  if (menu) { ['b', 's', 'd'].forEach(function (m) { var x = menu.meals[m]; if (x && x.id === r.id) drop = x.drop || []; }); (menu.meals.l.items || []).forEach(function (it) { if (it.id === r.id) drop = it.drop || []; }); }
  var hh = menu ? (menu.hh || P.hh) : P.hh, f = hh / (r.serves || 4), skip = {}; drop.forEach(function (d) { skip[d] = true; });
  var comp = JJ.compileRecipe(Object.assign({}, r, {ings: r.ings.map(function (x) { return x.id + ':' + x.q + (x.opt ? '?' : ''); }).join(' ')}));
  var cu = r.cu && r.cu[0] && JJ.CUISINES[r.cu[0]];
  var mealKey = r.meal === 'l' ? (JJ.SLOT_NAMES[r.comp] ? nm(JJ.SLOT_NAMES[r.comp]) : t('meal_l')) : t('meal_' + r.meal);
  var b = '<div class="rhero mt-' + r.meal + '">' + plate(r, 140) + '</div><h1 class="h1 rname">' + esc(rName(r)) + '</h1>';
  if (r.orig) b += '<p class="origname">' + esc(t('original_name')) + ': ' + esc(r.orig) + '</p>';
  if (LANG !== 'en') b += '<p class="origname">' + esc(r.en) + '</p>';
  b += '<div class="badges"><span class="badge b-ok">' + ic('check') + esc(t('jain_ok')) + '</span>' +
    (comp.tags.leafy ? '<span class="badge b-plain">' + ic('leaf') + esc(t('has_leafy')) + '</span>' : '<span class="badge b-warn">' + ic('noleaf') + esc(t('aatham_safe')) + '</span>') +
    (!comp.tags.green ? '<span class="badge b-warn">' + esc(t('green_free')) + '</span>' : '') +
    '<span class="badge b-plain">' + esc(mealKey) + '</span>' + (cu ? '<span class="badge b-plain">' + esc(nm(cu)) + '</span>' : '') + '</div>';
  b += '<div class="nut"><div><b>' + (r.prep || 0) + '</b><small>' + esc(t('prep_min')) + '</small></div><div><b>' + (r.cook || 0) + '</b><small>' + esc(t('cook_min')) + '</small></div><div><b>' + hh + '</b><small>' + esc(t('serves')) + '</small></div><div><b>' + (r.serves || 4) + '</b><small>' + esc(t('base_serves')) + '</small></div></div>';
  if (drop.length) b += '<div class="note">' + esc(t('left_out_today', {list: drop.map(ingName).join(', ')})) + '</div>';
  if (r.fromSnapshot) b += '<div class="note info">' + esc(t('snapshot_note')) + '</div>';
  var alg = Object.keys(comp.tags.alg).filter(function (a) { return (P.allergies || []).indexOf(a) >= 0; });
  if (alg.length) b += '<div class="alert">' + esc(t('allergy_alert', {list: alg.map(function (a) { return nm(JJ.ALLERGENS[a]); }).join(', ')})) + '</div>';
  b += '<h2 class="h2">' + esc(t('ingredients')) + '<span>' + esc(t('for_members', {n: hh})) + '</span></h2><ul class="ings">' +
    r.ings.filter(function (x) { return !skip[x.id]; }).map(function (x) { var g = JJ.ING[x.id] || {}; return '<li><span>' + esc(ingName(x.id)) + (g.L ? '<span class="leafy-tag">' + esc(t('leafy')) + '</span>' : '') + (x.opt ? ' <span class="tag">' + esc(t('optional')) + '</span>' : '') + '</span><b>' + esc(qtyText(x.id, x.q * f)) + '</b></li>'; }).join('') + '</ul>';
  var steps = r.steps.map(function (st) { return JJ.renderStep(st, LANG, JJ.ING, skip); }).filter(Boolean);
  b += '<h2 class="h2">' + esc(t('method')) + '</h2><ol class="steps">' + steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol>';
  var src = r.src || JJ.db.get('recipe_sources', r.id);
  b += '<h2 class="h2">' + esc(t('source')) + '</h2><div class="card glass"><div class="kv"><b>' + esc(t('recipe_id')) + '</b><span>' + esc(r.id) + '</span><b>' + esc(t('source')) + '</b><span>' + esc(src ? src.name : '—') + '</span><b>URL</b><span>' + (src && src.url ? '<a href="' + esc(src.url) + '" target="_blank" rel="noopener">' + esc(src.url) + '</a>' : esc(t('no_url'))) + '</span><b>' + esc(t('review')) + '</b><span>' + esc(src && src.verified ? t('verified') : t('auto_checked')) + '</span></div></div>';
  return backBar(mealKey, top.date ? dLong(top.date) : t('recipe_library')) + '<main class="scroll gx" id="scroll">' + b + '</main>';
}

/* ---------------- Calendar ---------------- */
function viewCal() {
  var td = today(), m = ui.calMonth || ym(td), first = monthStart(m), last = monthEnd(m);
  var minM = ym(P.created), histMonths = JJ.db.all('menu_history').map(function (h) { return h.month || ym(h.date); });
  histMonths.forEach(function (x) { if (x < minM) minM = x; });
  var maxM = addMonth(ym(td), 1);
  var dows = [0, 1, 2, 3, 4, 5, 6].map(function (i) { return dfmt('2026-11-0' + (1 + i), {weekday: 'narrow'}); });
  var g = '<div class="cal">' + dows.map(function (d) { return '<div class="dh">' + esc(d) + '</div>'; }).join('');
  var start = new Date(first + 'T12:00:00Z').getUTCDay();
  for (var i = 0; i < start; i++) g += '<div class="cd blank"></div>';
  var specials = [], saved = JJ.db.get('monthly_menus', m);
  for (var d = first; d <= last; d = JJ.addDays(d, 1)) {
    var p = pan(d), sp = p.aatham || p.chaudas, day = +d.slice(8);
    var st = d < P.created && !JJ.db.get('menu_history', d) ? 'none' : d <= td ? (JJ.db.get('menu_history', d) ? 'hist' : 'hist') : (JJ.db.get('daily_menus', d) && JJ.db.get('daily_menus', d).pv === P.version ? 'plan' : 'prev');
    if (sp || p.shuklaPancham || p.observances.length) specials.push([d, p]);
    var lab = p.aatham ? t('aatham') : p.chaudas ? t('chaudas') : (p.t === 15 ? t('punam_s') : p.t === 30 ? t('amas_s') : t(p.paksha === 'S' ? 'sh_s' : 'kr_s') + p.n);
    var cls = 'cd' + (sp ? ' sp' : '') + (d < td ? ' past' : '') + (d === td ? ' today' : '') + (st === 'none' ? ' pre' : ' ' + st);
    var aria = dLong(d) + ', ' + JJ.tithiName(p.t, LANG) + (sp ? ', ' + lab : '') + ', ' + t('status_' + (st === 'none' ? 'none' : st));
    var dots = p.observances.length || p.shuklaPancham ? '<span class="dots"><i></i></span>' : '';
    g += st === 'none' ? '<div class="' + cls + '" aria-label="' + esc(aria) + '"><b>' + day + '</b><small>' + esc(lab) + '</small></div>'
      : '<button class="' + cls + '" data-a="day" data-v="' + d + '" aria-label="' + esc(aria) + '"><b>' + day + '</b><small>' + esc(lab) + '</small>' + dots + '</button>';
  }
  g += '</div>';
  var isFuture = m > ym(td), isCur = m === ym(td);
  var b = '<div class="cal-nav"><button class="icon-btn" data-a="calm" data-v="-1" aria-label="' + esc(t('prev_month')) + '"' + (m <= minM ? ' disabled' : '') + '>' + ic('back') + '</button><h1 class="h1">' + esc(monthTitle(m)) + '</h1><button class="icon-btn" data-a="calm" data-v="1" aria-label="' + esc(t('next_month')) + '"' + (m >= maxM ? ' disabled' : '') + '>' + ic('next') + '</button></div>';
  b += '<p class="sub">' + esc(m < ym(td) ? t('cal_past') : isCur ? t('cal_current') : t('cal_next')) + '</p>';
  b += '<div class="legend"><span><i style="background:var(--crimson)"></i>' + esc(t('today')) + '</span><span><i style="background:var(--saffron)"></i>' + esc(t('aatham_chaudas')) + '</span><span><i style="background:var(--navy)"></i>' + esc(t('status_hist')) + '</span><span><i style="background:var(--green)"></i>' + esc(t('status_plan')) + '</span><span><i style="background:var(--line)"></i>' + esc(t('status_prev')) + '</span></div>';
  b += '<div class="calwrap">' + g + '</div>';
  if (isFuture || isCur) {
    var info = saved ? t('month_saved', {date: dShort(JJ.tz.isoOf(saved.generatedAt, city().tz))}) : t('month_not_saved');
    b += '<div class="card glass"><h3>' + esc(t('month_plan')) + '</h3><p class="fine" style="margin:0 0 10px">' + esc(info) + '</p><button class="btn primary" data-a="genmonth" data-v="' + m + '">' + esc(saved ? t('regenerate_month') : t('save_month')) + '</button></div>';
  }
  b += '<h2 class="h2">' + esc(t('special_days')) + '<span>' + specials.length + '</span></h2><div class="splist">' + specials.map(function (x) {
    var d = x[0], p = x[1], parts = [];
    if (p.aatham) parts.push(t('aatham')); if (p.chaudas) parts.push(t('chaudas')); if (p.shuklaPancham) parts.push(t('shukla_pancham'));
    p.observances.forEach(function (o) { parts.push(nm(o)); });
    return '<button class="sprow' + (d < td ? ' past' : '') + '" data-a="day" data-v="' + d + '"><span class="dnum"><b>' + (+d.slice(8)) + '</b><small>' + esc(dfmt(d, {month: 'short'})) + '</small></span><span class="mtxt"><b>' + esc(parts.join(' · ')) + '</b><small>' + esc(dShort(d) + ' · ' + JJ.tithiName(p.t, LANG)) + '</small></span>' + ic('next', 'chev') + '</button>';
  }).join('') + '</div>';
  return brandBar() + '<main class="scroll gx" id="scroll">' + b + '</main>';
}

/* ---------------- Panchang ---------------- */
function viewPan() {
  var td = today(), p = pan(td), tm = JJ.timings(p, {navkarsi: P.navkarsi, chauvihar: P.chauvihar});
  var b = '<h1 class="h1" style="margin-top:6px">' + esc(t('panchang_title')) + '</h1><p class="sub">' + esc(dLong(td)) + ' · ' + esc(cityLabel()) + '</p>';
  b += tithiCard(td) + timingCard(td, true);
  b += '<div class="card glass"><h3>' + esc(t('details')) + '</h3><div class="kv">' +
    '<b>' + esc(t('tithi')) + '</b><span>' + esc(JJ.tithiName(p.t, LANG)) + ' (' + p.n + ')</span>' +
    '<b>' + esc(t('paksha')) + '</b><span>' + esc(t(p.paksha === 'S' ? 'shukla' : 'krishna')) + '</span>' +
    '<b>' + esc(t('lunar_month')) + '</b><span>' + esc((p.adhik ? t('adhik') + ' ' : '') + JJ.MONTHS[p.month][{en: 0, hi: 1, gu: 2}[LANG]]) + ' (' + esc(t(P.calendar === 'purnimanta' ? 'cal_purn' : 'cal_amanta')) + ')</span>' +
    '<b>' + esc(t('tithi_ends')) + '</b><span>' + esc(hm(p.tithiEnd) + ', ' + dShort(JJ.tz.isoOf(p.tithiEnd, city().tz))) + '</span>' +
    '<b>' + esc(t('porsi')) + '</b><span>' + esc(hm(tm.porsi)) + '</span>' +
    '<b>' + esc(t('engine')) + '</b><span>' + esc(JJ.astro.name()) + '</span></div></div>';
  var up = [];
  for (var k = 1; k <= 45; k++) { var d = JJ.addDays(td, k), q = pan(d); if (q.aatham || q.chaudas || q.shuklaPancham || q.observances.length) up.push([d, q]); }
  b += '<h2 class="h2">' + esc(t('upcoming_days')) + '<span>' + esc(t('next_45')) + '</span></h2><div class="splist">' + up.map(function (x) {
    var d = x[0], q = x[1], parts = [];
    if (q.aatham) parts.push(t('aatham')); if (q.chaudas) parts.push(t('chaudas')); if (q.shuklaPancham) parts.push(t('shukla_pancham'));
    q.observances.forEach(function (o) { parts.push(nm(o)); });
    return '<button class="sprow" data-a="day" data-v="' + d + '"><span class="dnum"><b>' + (+d.slice(8)) + '</b><small>' + esc(dfmt(d, {month: 'short'})) + '</small></span><span class="mtxt"><b>' + esc(parts.join(' · ')) + '</b><small>' + esc(dShort(d) + ' · ' + JJ.tithiName(q.t, LANG) + ' · ' + t('sunrise') + ' ' + hm(q.rise)) + '</small></span>' + ic('next', 'chev') + '</button>';
  }).join('') + '</div>';
  b += '<div class="note info">' + esc(t('panchang_method')) + '</div>';
  return brandBar() + '<main class="scroll gx" id="scroll">' + b + '</main>';
}

/* ---------------- Grocery ---------------- */
function rangeFor(key) {
  var td = today();
  if (key === 'month') return [td, monthEnd(ym(td))];
  if (key === 'next') { var nm2 = addMonth(ym(td), 1); return [monthStart(nm2), monthEnd(nm2)]; }
  return [td, JJ.addDays(td, 6)];
}
function menusIn(a, b) { var out = []; for (var d = a; d <= b; d = JJ.addDays(d, 1)) { var m = menuFor(d); if (m && !m.legacy) out.push(m); } return out; }
function ticks() { return (JJ.db.get('meta', 'ticks') || {key: 'ticks', v: {}}); }
function groceryView(groups, listId, title, sub, saved) {
  var tk = ticks().v[listId] || {}, total = 0, done = 0;
  groups.forEach(function (g) { g.items.forEach(function (it) { total++; if (tk[it.id]) done++; }); });
  var pct = total ? Math.round(done * 100 / total) : 0;
  var b = '<h1 class="h1" style="margin-top:6px">' + esc(title) + '</h1><p class="sub">' + esc(sub) + '</p>';
  b += '<div class="gtop"><div class="ring" id="ring" style="--p:' + pct + '"><span id="ringtxt">' + pct + '%</span></div><div class="tinfo"><b id="gcount">' + esc(t('items_done', {d: done, n: total})) + '</b><small>' + esc(t('grocery_note')) + '</small></div></div>';
  b += '<div class="gactions"><button class="gbtn" data-a="copy" data-v="' + esc(listId) + '">' + ic('copy') + esc(t('copy_list')) + '</button><button class="gbtn" data-a="clearticks" data-v="' + esc(listId) + '">' + ic('undo') + esc(t('clear_ticks')) + '</button></div>';
  groups.forEach(function (g) {
    b += '<section class="gsec"><h3>' + esc(t('grp_' + g.group)) + '</h3>' + g.items.map(function (it) {
      var a = JJ.buyAmount(it.amt, it.unit);
      return '<label class="gi"><input type="checkbox" data-tick="' + it.id + '" data-list="' + esc(listId) + '"' + (tk[it.id] ? ' checked' : '') + '><span class="gn">' + esc(ingName(it.id)) + '</span><span class="gq">' + a.v + ' ' + esc(t('u_' + a.u)) + '</span></label>';
    }).join('') + '</section>';
  });
  b += '<p class="fine">' + esc(t('rounded_note')) + '</p>';
  return b;
}
function viewShop() {
  var r = rangeFor(ui.gRange), menus = menusIn(r[0], r[1]), groups = JJ.grocery(menus);
  var listId = ui.gRange + ':' + r[0];
  if (ui.gRange === 'week') JJ.db.put('grocery_lists', {id: 'week:' + r[0], from: r[0], to: r[1], createdAt: Date.now(), hh: P.hh, groups: groups});
  var seg = '<div class="seg" role="group">' + [['week', 'g_week'], ['month', 'g_month'], ['next', 'g_next']].map(function (x) { return '<button data-a="grange" data-v="' + x[0] + '" aria-pressed="' + (ui.gRange === x[0]) + '">' + esc(t(x[1])) + '</button>'; }).join('') + '</div>';
  var b = seg + groceryView(groups, listId, t('grocery_title'), dShort(r[0]) + ' – ' + dShort(r[1]) + ' · ' + t('for_members', {n: P.hh}) + ' · ' + t('days_n', {n: menus.length}));
  b += '<p class="fine" style="text-align:center"><button class="linkbtn" data-a="push" data-v="glists">' + esc(t('saved_lists')) + '</button></p>';
  return brandBar() + '<main class="scroll gx" id="scroll">' + b + '</main>';
}
function viewSavedLists() {
  var lists = JJ.db.all('grocery_lists').sort(function (a, b) { return a.from < b.from ? 1 : -1; });
  var b = '<p class="sub" style="margin-top:8px">' + esc(t('saved_lists_sub')) + '</p><div class="list">' + (lists.length ? lists.map(function (l) {
    return '<button class="lrow" data-a="glist" data-v="' + esc(l.id) + '"><span class="mtxt grow"><b>' + esc(dShort(l.from) + ' – ' + dShort(l.to)) + '</b><small>' + esc(t('for_members', {n: l.hh})) + '</small></span>' + ic('next', 'chev') + '</button>';
  }).join('') : '<div class="empty">' + esc(t('no_saved_lists')) + '</div>') + '</div>';
  return backBar(t('saved_lists')) + '<main class="scroll gx" id="scroll">' + b + '</main>';
}
function viewSavedList(top) {
  var l = JJ.db.get('grocery_lists', top.id);
  if (!l) return backBar(t('saved_lists')) + '<main class="scroll gx" id="scroll"></main>';
  return backBar(t('saved_lists')) + '<main class="scroll gx" id="scroll">' + groceryView(l.groups, 'saved:' + l.id, t('grocery_title'), dShort(l.from) + ' – ' + dShort(l.to)) + '</main>';
}
function listText(groups) {
  var s = 'JainJoy\n';
  groups.forEach(function (g) { s += '\n' + t('grp_' + g.group) + '\n'; g.items.forEach(function (it) { var a = JJ.buyAmount(it.amt, it.unit); s += '- ' + ingName(it.id) + ': ' + a.v + ' ' + t('u_' + a.u) + '\n'; }); });
  return s;
}

/* ---------------- More ---------------- */
function viewMore() {
  function row(a, v, i, l, s) { return '<button class="lrow" data-a="' + a + '" data-v="' + v + '"><span class="ficon">' + ic(i) + '</span><span class="mtxt grow"><b>' + esc(t(l)) + '</b><small>' + esc(t(s)) + '</small></span>' + ic('next', 'chev') + '</button>'; }
  var b = '<h1 class="h1" style="margin-top:6px">' + esc(t('tab_more')) + '</h1><div class="list">' +
    row('push', 'profile', 'users', 'edit_profile', 'edit_profile_sub') + row('push', 'library', 'book', 'recipe_library', 'recipe_library_sub') +
    row('push', 'glossary', 'leaf', 'glossary', 'glossary_sub') + row('push', 'admin', 'edit', 'admin', 'admin_sub') +
    row('push', 'glists', 'cart', 'saved_lists', 'saved_lists_sub') + row('push', 'about', 'db', 'about', 'about_sub') + '</div>';
  b += '<div class="card glass"><h3>' + esc(t('language')) + '</h3>' + langChip() + '</div>';
  b += '<button class="btn-danger" data-a="resetask">' + esc(t('reset')) + '</button>';
  return brandBar() + '<main class="scroll gx" id="scroll">' + b + '</main>';
}
function viewGlossary() {
  var b = '<p class="sub" style="margin-top:8px">' + esc(t('glossary_intro')) + '</p>';
  JJ.GLOSSARY.forEach(function (g) {
    var cls = g.status === 'banned' ? 'bad' : g.status === 'tithi' ? 'warn' : g.status === 'optional' ? '' : 'ok';
    b += '<div class="card glass"><div class="row"><b class="grow">' + esc(g.term) + '</b><span class="tag ' + cls + '">' + esc(t('gl_' + g.status)) + '</span></div><p style="margin:8px 0 0;font-size:14px">' + esc(g[LANG] || g.en) + '</p><p class="fine">' + esc(g.ids.map(ingName).join(', ')) + '</p></div>';
  });
  b += '<h2 class="h2">' + esc(t('why_excluded')) + '</h2>';
  Object.keys(JJ.BAN_REASONS).forEach(function (k) {
    var ids = Object.keys(JJ.ING).filter(function (id) { return JJ.ING[id].banned === k; });
    b += '<div class="card glass"><b>' + esc(ids.map(ingName).join(', ')) + '</b><p style="margin:6px 0 0;font-size:13.5px">' + esc(nm(JJ.BAN_REASONS[k])) + '</p></div>';
  });
  return backBar(t('glossary')) + '<main class="scroll gx" id="scroll">' + b + '</main>';
}
function viewLibrary() {
  var q = ui.lib.q.toLowerCase();
  var list = JJ.catalog.list.filter(function (r) { return r.meal === ui.lib.meal && r.valid && r.status === 'approved'; })
    .filter(function (r) { return !q || [r.en, r.hi, r.gu, r.orig].join(' ').toLowerCase().indexOf(q) >= 0; });
  var seg = '<div class="seg">' + MEALS.map(function (m) { return '<button data-a="libmeal" data-v="' + m + '" aria-pressed="' + (ui.lib.meal === m) + '">' + esc(t('meal_' + m)) + '</button>'; }).join('') + '</div>';
  var b = seg + '<div class="field"><input class="input" id="lib-q" value="' + esc(ui.lib.q) + '" placeholder="' + esc(t('search_recipes')) + '" aria-label="' + esc(t('search_recipes')) + '"></div><p class="fine">' + esc(t('n_recipes', {n: list.length})) + '</p><div class="list">' +
    list.map(function (r) { return '<button class="lrow" data-a="librecipe" data-v="' + r.id + '">' + plate(r, 40) + '<span class="mtxt grow"><b>' + esc(rName(r)) + '</b><small>' + esc(r.cu.map(function (c) { return JJ.CUISINES[c] ? nm(JJ.CUISINES[c]) : c; }).join(', ') + (r.meal === 'l' ? ' · ' + nm(JJ.SLOT_NAMES[r.comp] || {en: r.comp}) : '')) + '</small></span>' + ic('next', 'chev') + '</button>'; }).join('') + '</div>';
  return backBar(t('recipe_library')) + '<main class="scroll gx" id="scroll">' + b + '</main>';
}
function viewAbout() {
  var all = JJ.catalog.list, ok = all.filter(function (r) { return r.valid && r.status === 'approved'; });
  var by = {}; MEALS.forEach(function (m) { by[m] = ok.filter(function (r) { return r.meal === m; }).length; });
  var b = '<div class="card glass"><h3>' + esc(t('db_status')) + '</h3><div class="kv">' +
    '<b>' + esc(t('approved_recipes')) + '</b><span>' + ok.length + '</span>' + MEALS.map(function (m) { return '<b>' + esc(t('meal_' + m)) + '</b><span>' + by[m] + '</span>'; }).join('') +
    '<b>' + esc(t('pending_invalid')) + '</b><span>' + (all.length - ok.length) + '</span>' +
    '<b>' + esc(t('ingredients')) + '</b><span>' + Object.keys(JJ.ING).length + '</span>' +
    '<b>' + esc(t('cities')) + '</b><span>' + Object.keys(JJ.CITIES).length + '</span>' +
    '<b>' + esc(t('history_days')) + '</b><span>' + JJ.db.count('menu_history') + '</span>' +
    '<b>' + esc(t('storage')) + '</b><span>' + esc(t('storage_' + JJ.db.mode())) + '</span>' +
    '<b>' + esc(t('engine')) + '</b><span>' + esc(JJ.astro.name()) + '</span></div></div>';
  b += '<div class="card glass"><h3>' + esc(t('dependencies')) + '</h3><p style="margin:0;font-size:13.5px">' + esc(t('dependencies_text')) + '</p></div>';
  b += '<div class="row" style="margin-top:12px"><button class="btn" data-a="export">' + esc(t('export_data')) + '</button></div>';
  b += '<div class="card glass"><h3>' + esc(t('install')) + '</h3><p style="margin:0;font-size:13.5px">' + esc(t('install_text')) + '</p></div>';
  return backBar(t('about')) + '<main class="scroll gx" id="scroll">' + b + '</main>';
}

/* ---------------- Admin ---------------- */
function adminList() {
  var f = ui.admin, q = f.q.toLowerCase();
  return JJ.catalog.list.filter(function (r) {
    if (f.meal !== 'all' && r.meal !== f.meal) return false;
    if (f.status === 'invalid' && r.valid) return false;
    if (f.status !== 'all' && f.status !== 'invalid' && r.status !== f.status) return false;
    return !q || (r.id + ' ' + [r.en, r.hi, r.gu].join(' ')).toLowerCase().indexOf(q) >= 0;
  });
}
function viewAdmin() {
  var f = ui.admin, list = adminList();
  var segS = '<div class="seg">' + ['all', 'approved', 'pending', 'rejected', 'invalid'].map(function (s) { return '<button data-a="adstatus" data-v="' + s + '" aria-pressed="' + (f.status === s) + '">' + esc(t('st_' + s)) + '</button>'; }).join('') + '</div>';
  var segM = '<div class="seg" style="margin-top:8px">' + ['all'].concat(MEALS).map(function (m) { return '<button data-a="admeal" data-v="' + m + '" aria-pressed="' + (f.meal === m) + '">' + esc(m === 'all' ? t('st_all') : t('meal_' + m)) + '</button>'; }).join('') + '</div>';
  var b = '<p class="sub" style="margin-top:8px">' + esc(t('admin_intro')) + '</p><button class="btn primary" data-a="adnew">' + esc(t('add_recipe')) + '</button>' + '<div style="margin-top:12px">' + segS + segM + '</div>' +
    '<div class="field"><input class="input" id="ad-q" value="' + esc(f.q) + '" placeholder="' + esc(t('search_recipes')) + '" aria-label="' + esc(t('search_recipes')) + '"></div><p class="fine">' + esc(t('n_recipes', {n: list.length})) + '</p><div class="list">' +
    list.slice(0, 200).map(function (r) {
      var tg = !r.valid ? '<span class="tag bad">' + esc(t('st_invalid')) + '</span>' : '<span class="tag ' + (r.status === 'approved' ? 'ok' : r.status === 'pending' ? 'warn' : 'bad') + '">' + esc(t('st_' + r.status)) + '</span>';
      return '<button class="lrow" data-a="adedit" data-v="' + r.id + '"><span class="mtxt grow"><b>' + esc(rName(r)) + '</b><small>' + esc(r.id + ' · ' + t('meal_' + r.meal) + (r.origin === 'admin' ? ' · ' + t('edited') : '')) + '</small></span>' + tg + '</button>';
    }).join('') + '</div>';
  return backBar(t('admin')) + '<main class="scroll gx" id="scroll">' + b + '</main>';
}
function stepsToText(steps) { return (steps || []).map(function (s) { return Array.isArray(s) ? JSON.stringify(s) : [s.en, s.hi, s.gu].join(' || '); }).join('\n'); }
function textToSteps(txt) {
  return txt.split('\n').map(function (l) { return l.trim(); }).filter(Boolean).map(function (l) {
    if (l.charAt(0) === '[') { try { return JSON.parse(l); } catch (e) { return {en: l, hi: '', gu: ''}; } }
    var p = l.split('||').map(function (x) { return x.trim(); }); return {en: p[0] || '', hi: p[1] || '', gu: p[2] || ''};
  });
}
function viewEdit(top) {
  var e = top.form;
  var comp = JJ.compileRecipe({id: e.id, meal: e.meal, comp: e.comp, cu: e.cu.split(/[ ,]+/).filter(Boolean), en: e.en, hi: e.hi, gu: e.gu, ings: e.ings, steps: textToSteps(e.steps), flags: e.flags});
  var dups = JJ.catalog.list.filter(function (r) { return r.id !== e.id && r.key === comp.key && r.status === 'approved'; });
  if (dups.length) comp.errors.push({c: 'dup', p: dups[0].id});
  function fld(id, label, val, type) { return '<div class="field"><label for="ed-' + id + '">' + esc(t(label)) + '</label>' + (type === 'area' ? '<textarea class="input" id="ed-' + id + '" data-ed="' + id + '">' + esc(val) + '</textarea>' : '<input class="input" id="ed-' + id + '" data-ed="' + id + '" value="' + esc(val) + '">') + '</div>'; }
  function sel(id, label, val, opts) { return '<div class="field"><label for="ed-' + id + '">' + esc(t(label)) + '</label><select class="select" id="ed-' + id + '" data-ed="' + id + '">' + opts.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === val ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select></div>'; }
  var b = '<p class="fine">' + esc(t('recipe_id')) + ': ' + esc(e.id) + ' · ' + esc(t('st_' + e.status)) + '</p>' +
    fld('en', 'name_en', e.en) + fld('hi', 'name_hi', e.hi) + fld('gu', 'name_gu', e.gu) + fld('orig', 'original_name', e.orig) +
    sel('meal', 'meal_type', e.meal, MEALS.map(function (m) { return [m, t('meal_' + m)]; })) +
    sel('comp', 'component', e.comp, ['main', 'bread', 'sabzi', 'dal', 'kadhi', 'rice', 'salad', 'raita', 'sambar', 'rasam'].map(function (c) { return [c, c === 'main' ? t('comp_main') : nm(JJ.SLOT_NAMES[c])]; })) +
    fld('cu', 'cuisines_codes', e.cu) + '<p class="fine">' + esc(Object.keys(JJ.CUISINES).map(function (k) { return k + ' = ' + nm(JJ.CUISINES[k]); }).join(' · ')) + '</p>' +
    '<div class="row">' + fld('serves', 'serves', e.serves) + fld('prep', 'prep_min', e.prep) + fld('cook', 'cook_min', e.cook) + '</div>' +
    fld('ings', 'ings_field', e.ings, 'area') + '<p class="fine">' + esc(t('ings_help')) + '</p>' +
    '<div class="field"><label for="ing-q">' + esc(t('find_ingredient')) + '</label><input class="input" id="ing-q" value="' + esc(ui.ingQ) + '"></div><div class="search-results">' + ingSearch(ui.ingQ) + '</div>' +
    fld('steps', 'steps_field', e.steps, 'area') + '<p class="fine">' + esc(t('steps_help')) + '</p>' +
    '<label class="toggle"><input type="checkbox" data-ed="flags"' + (e.flags.indexOf('ch') >= 0 ? ' checked' : '') + '><span>' + esc(t('curd_cooked')) + '<small>' + esc(t('curd_cooked_sub')) + '</small></span></label>';
  b += comp.errors.length ? '<ul class="errs">' + comp.errors.map(function (x) { return '<li>' + esc(JJ.errText(x, t)) + '</li>'; }).join('') + '</ul>' : '<div class="note ok">' + esc(t('validation_ok')) + '</div>';
  b += '<div class="row" style="margin-top:14px;flex-wrap:wrap"><button class="btn" data-a="adsave">' + esc(t('save_pending')) + '</button><button class="btn primary" data-a="adapprove"' + (comp.errors.length ? ' disabled' : '') + '>' + esc(t('approve')) + '</button><button class="btn" data-a="adreject">' + esc(t('reject')) + '</button></div>';
  return backBar(t('edit_recipe'), e.en) + '<main class="scroll gx" id="scroll">' + b + '</main>';
}
function ingSearch(q) {
  q = (q || '').toLowerCase(); if (q.length < 2) return '';
  return Object.keys(JJ.ING).filter(function (id) { var g = JJ.ING[id]; return (id + ' ' + g.en + ' ' + g.hi + ' ' + g.gu).toLowerCase().indexOf(q) >= 0; }).slice(0, 8).map(function (id) {
    var g = JJ.ING[id]; return '<div class="lrow" style="cursor:default"><span class="mtxt grow"><b>' + esc(id) + '</b><small>' + esc(ingName(id) + ' · ' + t('u_' + g.unit)) + '</small></span>' + (g.banned ? '<span class="tag bad">' + esc(t('gl_banned')) + '</span>' : '') + '</div>';
  }).join('');
}
function formFor(r) {
  return {id: r.id, status: r.status || 'pending', en: r.en || '', hi: r.hi || '', gu: r.gu || '', orig: r.orig || '', meal: r.meal || 'b', comp: r.comp || 'main', cu: (r.cu || ['gen']).join(' '),
    serves: r.serves || 4, prep: r.prep || 10, cook: r.cook || 20, ings: r.ingStr || r.ings || '', steps: stepsToText(r.steps), flags: r.flags || ''};
}
function saveRecipe(form, status) {
  var rec = {id: form.id, meal: form.meal, comp: form.comp, cu: form.cu.split(/[ ,]+/).filter(Boolean), orig: form.orig, serves: +form.serves || 4, prep: +form.prep || 0, cook: +form.cook || 0,
    ings: form.ings.trim(), steps: textToSteps(form.steps), flags: form.flags, status: status, origin: 'admin', reviewedBy: 'admin (this device)', updatedAt: Date.now()};
  JJ.db.put('recipes', rec);
  ['en', 'hi', 'gu'].forEach(function (l) { JJ.db.put('recipe_translations', {key: rec.id + '|' + l, recipeId: rec.id, lang: l, name: form[l]}); });
  if (!JJ.db.get('recipe_sources', rec.id)) JJ.db.put('recipe_sources', {recipeId: rec.id, name: t('src_admin'), url: null, verified: false});
  JJ.loadCatalog(JJ.recipesFromDb()); previewCache.clear();
  form.status = status;
}

/* ---------------- Profile / onboarding ---------------- */
var SUBS = {Shwetambar: ['Murtipujak', 'Sthanakvasi', 'Terapanth', 'Other'], Digambar: ['Bispanthi', 'Terapanth', 'Taranpanth', 'Other']};
function blankDraft() { return {lang: LANG, tradition: '', subsect: '', country: 'IN', state: '', cityId: '', custom: null, cuisine: '', calendar: 'amanta', hh: 4, allergies: [], exclude: [], avoidCrucifer: false, greenRule: 'none', shuklaPanchamGreen: false, navkarsi: 48, chauvihar: 0}; }
function fromProfile(p) { var d = JSON.parse(JSON.stringify(p)); return d; }
function ready(d) { return !!(d.tradition && d.subsect && (d.cityId || d.custom) && d.cuisine && d.hh >= 1); }
function frow(key, icon, title, value, done, bodyFn) {
  var open = openField === key;
  return '<section class="frow' + (open ? ' open' : '') + (done ? ' done' : '') + '"><button class="frow-h" data-a="field" data-v="' + key + '" aria-expanded="' + open + '"><span class="ficon">' + ic(icon) + '</span><span class="ftext"><b>' + esc(title) + '</b><small>' + esc(value) + '</small></span><span class="fcheck">' + ic('check') + '</span></button>' + (open ? '<div class="frow-b">' + bodyFn() + '</div>' : '') + '</section>';
}
function stateName(c, s) { return c === 'IN' && JJ.STATES.IN[s] ? nm(JJ.STATES.IN[s]) : ''; }
function locationBody(d) {
  var countries = Object.keys(JJ.COUNTRIES);
  var h = '<div class="field"><label for="pf-country">' + esc(t('country')) + '</label><select class="select" id="pf-country">' + countries.map(function (c) { return '<option value="' + c + '"' + (d.country === c ? ' selected' : '') + '>' + esc(nm(JJ.COUNTRIES[c])) + '</option>'; }).join('') + '</select></div>';
  if (d.country === 'IN') h += '<div class="field"><label for="pf-state">' + esc(t('state')) + '</label><select class="select" id="pf-state"><option value="">' + esc(t('select_state')) + '</option>' + Object.keys(JJ.STATES.IN).sort(function (a, b) { return JJ.STATES.IN[a].en.localeCompare(JJ.STATES.IN[b].en); }).map(function (s) { return '<option value="' + s + '"' + (d.state === s ? ' selected' : '') + '>' + esc(nm(JJ.STATES.IN[s])) + '</option>'; }).join('') + '</select></div>';
  var cities = Object.keys(JJ.CITIES).map(function (k) { return JJ.CITIES[k]; }).filter(function (c) { return c.country === d.country && (d.country !== 'IN' || c.state === d.state); }).sort(function (a, b) { return a.en.localeCompare(b.en); });
  if (d.country !== 'IN' || d.state) h += '<div class="field"><label for="pf-city">' + esc(t('city')) + '</label><select class="select" id="pf-city"><option value="">' + esc(t('select_city')) + '</option>' + cities.map(function (c) { return '<option value="' + c.id + '"' + (d.cityId === c.id ? ' selected' : '') + '>' + esc(c[LANG] || c.en) + '</option>'; }).join('') + '</select></div>';
  h += '<p class="hint">' + esc(t('city_missing')) + '</p><div class="row" style="flex-wrap:wrap;margin-top:8px"><button class="btn small" data-a="gps">' + ic('pin') + ' ' + esc(t('use_location')) + '</button></div>';
  h += '<form class="addrow" id="geo-form" autocomplete="off"><input id="geo-q" maxlength="60" value="' + esc(ui.geo.q) + '" placeholder="' + esc(t('search_place')) + '" aria-label="' + esc(t('search_place')) + '"><button type="submit">' + esc(t('search')) + '</button></form>';
  if (ui.geo.busy) h += '<p class="hint">' + esc(t('searching')) + '</p>';
  if (ui.geo.results) h += '<div class="search-results">' + (ui.geo.results.length ? ui.geo.results.map(function (r, i) { return '<button class="lrow" data-a="geopick" data-v="' + i + '"><span class="mtxt grow"><b>' + esc(r.name) + '</b><small>' + esc([r.admin1, r.country].filter(Boolean).join(', ') + ' · ' + r.timezone) + '</small></span></button>'; }).join('') : '<p class="hint">' + esc(t('no_results')) + '</p>') + '</div>';
  h += '<p class="hint">' + esc(t('geo_privacy')) + '</p>';
  if (d.custom) h += '<div class="note ok">' + esc(t('custom_place', {name: d.custom.name, lat: d.custom.lat.toFixed(3), lon: d.custom.lon.toFixed(3)})) + '</div>';
  return h;
}
function viewProfile(onboard) {
  if (!draft) { draft = onboard ? blankDraft() : fromProfile(P); if (onboard && openField == null) openField = 'tradition'; }
  var d = draft, rows = '';
  rows += '<section class="frow done"><div class="frow-h static"><span class="ficon">' + ic('globe') + '</span><span class="ftext"><b>' + esc(t('language')) + '</b><small>' + esc(t('language_sub')) + '</small></span>' + langChip() + '</div></section>';
  rows += frow('tradition', 'home', t('tradition'), d.tradition ? t('trad_' + d.tradition) : t('tradition_hint'), !!d.tradition, function () { return '<div class="opt2">' + ['Shwetambar', 'Digambar'].map(function (v) { return '<button class="opt" data-a="trad" data-v="' + v + '" aria-pressed="' + (d.tradition === v) + '">' + esc(t('trad_' + v)) + '</button>'; }).join('') + '</div>'; });
  rows += frow('subsect', 'sect', t('subsect'), d.subsect ? t('sub_' + d.subsect) : t('subsect_hint'), !!d.subsect, function () { return d.tradition ? '<div class="chips">' + SUBS[d.tradition].map(function (v) { return '<button class="chip" data-a="sub" data-v="' + v + '" aria-pressed="' + (d.subsect === v) + '">' + esc(t('sub_' + v)) + '</button>'; }).join('') + '</div>' : '<p class="hint" style="margin:0">' + esc(t('choose_trad_first')) + '</p>'; });
  var cityObj = d.custom || JJ.CITIES[d.cityId];
  rows += frow('city', 'pin', t('location'), cityObj ? (cityObj[LANG] || cityObj.en || cityObj.name) + (d.state ? ', ' + stateName(d.country, d.state) : '') : t('location_hint'), !!cityObj, function () { return locationBody(d); });
  rows += frow('cuisine', 'thali', t('cuisine'), d.cuisine ? nm(JJ.CUISINES[d.cuisine]) : t('cuisine_hint'), !!d.cuisine, function () { return '<div class="chips">' + Object.keys(JJ.CUISINES).map(function (k) { return '<button class="chip" data-a="cuisine" data-v="' + k + '" aria-pressed="' + (d.cuisine === k) + '">' + esc(nm(JJ.CUISINES[k])) + '</button>'; }).join('') + '</div><p class="hint">' + esc(t('cuisine_help')) + '</p>'; });
  rows += frow('hh', 'users', t('household'), t('for_members', {n: d.hh}), d.hh >= 1, function () { return '<div class="stepper"><button data-a="hh" data-v="-1" aria-label="' + esc(t('fewer')) + '"' + (d.hh <= 1 ? ' disabled' : '') + '>−</button><output aria-live="polite">' + esc(t('for_members', {n: d.hh})) + '</output><button data-a="hh" data-v="1" aria-label="' + esc(t('more')) + '"' + (d.hh >= 20 ? ' disabled' : '') + '>+</button></div><p class="hint">' + esc(t('household_help')) + '</p>'; });
  var exVal = d.allergies.map(function (a) { return nm(JJ.ALLERGENS[a]); }).concat(d.exclude.map(ingName)).join(', ') || t('none');
  rows += frow('allergies', 'shield', t('allergies_ex'), exVal, true, function () {
    return '<div class="chips">' + Object.keys(JJ.ALLERGENS).map(function (k) { return '<button class="chip" data-a="alg" data-v="' + k + '" aria-pressed="' + (d.allergies.indexOf(k) >= 0) + '">' + esc(nm(JJ.ALLERGENS[k])) + '</button>'; }).join('') + '</div>' +
      '<p class="hint">' + esc(t('exclude_help')) + '</p><div class="chips" style="margin-top:6px">' + d.exclude.map(function (id) { return '<button class="chip custom" data-a="rmex" data-v="' + id + '">' + esc(ingName(id)) + ' ×</button>'; }).join('') + '</div>' +
      '<div class="field"><input class="input" id="ex-q" value="' + esc(ui.ingQ) + '" placeholder="' + esc(t('exclude_search')) + '" aria-label="' + esc(t('exclude_search')) + '"></div><div class="search-results">' + exResults(ui.ingQ) + '</div>' +
      '<label class="toggle"><input type="checkbox" data-pf="avoidCrucifer"' + (d.avoidCrucifer ? ' checked' : '') + '><span>' + esc(t('avoid_crucifer')) + '<small>' + esc(t('avoid_crucifer_sub')) + '</small></span></label>';
  });
  rows += frow('obs', 'moon', t('observances'), t('green_' + d.greenRule), true, function () {
    return '<div class="toggle" style="cursor:default"><input type="checkbox" checked disabled><span>' + esc(t('ac_locked')) + '<small>' + esc(t('ac_locked_sub')) + '</small></span></div>' +
      '<div class="field"><label for="pf-green">' + esc(t('green_rule')) + '</label><select class="select" id="pf-green">' + ['none', 'ac', 'five', 'twelve'].map(function (g) { return '<option value="' + g + '"' + (d.greenRule === g ? ' selected' : '') + '>' + esc(t('green_' + g)) + '</option>'; }).join('') + '</select></div>' +
      '<label class="toggle"><input type="checkbox" data-pf="shuklaPanchamGreen"' + (d.shuklaPanchamGreen ? ' checked' : '') + '><span>' + esc(t('pancham_rule')) + '<small>' + esc(t('pancham_rule_sub')) + '</small></span></label>' +
      '<p class="hint">' + esc(t('obs_help')) + '</p>';
  });
  rows += frow('timing', 'clock', t('timing_conv'), t('chauvihar') + ': ' + (d.chauvihar ? t('chauvihar_before', {m: d.chauvihar}) : t('chauvihar_at')), true, function () {
    return '<div class="field"><label for="pf-cha">' + esc(t('chauvihar')) + '</label><select class="select" id="pf-cha">' + [[0, t('chauvihar_at')], [24, t('chauvihar_before', {m: 24})], [48, t('chauvihar_before', {m: 48})]].map(function (o) { return '<option value="' + o[0] + '"' + (+d.chauvihar === o[0] ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select></div>' +
      '<div class="field"><label for="pf-cal">' + esc(t('month_system')) + '</label><select class="select" id="pf-cal"><option value="amanta"' + (d.calendar === 'amanta' ? ' selected' : '') + '>' + esc(t('cal_amanta')) + '</option><option value="purnimanta"' + (d.calendar === 'purnimanta' ? ' selected' : '') + '>' + esc(t('cal_purn')) + '</option></select></div><p class="hint">' + esc(t('navkarsi_fixed')) + '</p>';
  });
  var head, top = '', bottom;
  if (onboard) {
    top = '<div class="hero-brand">' + lotus(72) + WORDMARK + '<h1 class="h1">' + esc(t('your_profile')) + '</h1><p class="sub" style="margin:0">' + esc(t('asked_once')) + '</p></div>';
    head = '';
    bottom = '<div class="cta-bar gx"><button class="btn-primary" data-a="submit"' + (ready(d) ? '' : ' disabled') + '>' + esc(t('get_plan')) + '</button><p>' + esc(ready(d) ? t('plan_starts_today') : t('complete_fields')) + '</p></div>';
  } else {
    var changed = JSON.stringify(fromProfile(P)) !== JSON.stringify(d);
    head = backBar(t('edit_profile'), t('changes_from_tomorrow'));
    bottom = '<div class="cta-bar gx"><button class="btn-primary" data-a="save"' + (changed && ready(d) ? '' : ' disabled') + '>' + esc(t('save_changes')) + '</button><p>' + esc(t('history_kept')) + '</p></div>';
  }
  return head + '<main class="scroll gx" id="scroll">' + top + '<div class="frows">' + rows + '</div></main>' + bottom;
}
function exResults(q) {
  q = (q || '').toLowerCase(); if (q.length < 2) return '';
  return Object.keys(JJ.ING).filter(function (id) { var g = JJ.ING[id]; return !g.banned && id !== 'water' && (g.en + ' ' + g.hi + ' ' + g.gu).toLowerCase().indexOf(q) >= 0 && draft.exclude.indexOf(id) < 0; }).slice(0, 6)
    .map(function (id) { return '<button class="lrow" data-a="addex" data-v="' + id + '"><span class="mtxt grow"><b>' + esc(ingName(id)) + '</b></span>' + ic('plus') + '</button>'; }).join('');
}

/* ---------------- sheet ---------------- */
function sheetHTML() {
  if (sheet !== 'reset') return '';
  return '<div class="scrim" data-a="sheetclose"><div class="sheet gx" role="dialog" aria-modal="true" aria-labelledby="sh-t" data-stop="1"><h2 id="sh-t">' + esc(t('reset_q')) + '</h2><p>' + esc(t('reset_text')) + '</p><div class="row"><button data-a="sheetclose">' + esc(t('cancel')) + '</button><button class="go" data-a="resetdo">' + esc(t('reset')) + '</button></div></div></div>';
}

/* ---------------- events ---------------- */
function setLang(l) { LANG = l; if (P) { P.lang = l; saveProfile(); } if (draft) draft.lang = l; try { localStorage.setItem('jainjoy.lang', l); } catch (e) {} render(); }
function pickCity(id) {
  var c = JJ.CITIES[id]; draft.cityId = id; draft.custom = null;
  if (c) { draft.country = c.country; if (c.state) draft.state = c.state; var st = c.country === 'IN' ? JJ.STATES.IN[c.state] : null; if (st) { if (!draft.cuisineSet) draft.cuisine = st.cu; draft.calendar = st.cal; } else if (!draft.cuisine) draft.cuisine = 'guj'; }
  if (!P) openField = draft.cuisine ? 'hh' : 'cuisine';
}
app.addEventListener('click', function (e) {
  var el = e.target.closest('[data-a]'); if (!el || el.disabled) return;
  if (el.dataset.a === 'sheetclose' && e.target.closest('[data-stop]') && !e.target.closest('button')) return;
  var a = el.dataset.a, v = el.dataset.v, top = stack[stack.length - 1];
  switch (a) {
    case 'lang': setLang(v); break;
    case 'tab': tab = v; stack = []; render(); break;
    case 'back': stack.pop(); if (!stack.length || stack[stack.length - 1].k !== 'profile') { if (top && top.k === 'profile') draft = null; } render(); break;
    case 'push': if (v === 'profile') { draft = null; openField = null; } stack.push({k: v}); render(); break;
    case 'day': stack.push({k: 'day', date: v}); render(); break;
    case 'shift': if (top) { top.date = JJ.addDays(top.date, +v); render(); } break;
    case 'recipe': stack.push({k: 'recipe', date: el.dataset.d, id: el.dataset.id}); render(); break;
    case 'thali': stack.push({k: 'thali', date: el.dataset.d}); render(); break;
    case 'librecipe': stack.push({k: 'recipe', id: v}); render(); break;
    case 'libmeal': ui.lib.meal = v; render(); break;
    case 'calm': ui.calMonth = addMonth(ui.calMonth || ym(today()), +v); render(); break;
    case 'genmonth': generateMonth(v); toast(t('month_saved_toast')); render(); break;
    case 'grange': ui.gRange = v; render(); break;
    case 'glist': stack.push({k: 'glist', id: v}); render(); break;
    case 'copy': copyList(v); break;
    case 'clearticks': { var tk = ticks(); delete tk.v[v]; JJ.db.put('meta', tk); render(); toast(t('ticks_cleared')); break; }
    case 'field': openField = openField === v ? null : v; ui.ingQ = ''; render(); break;
    case 'trad': draft.tradition = v; if (SUBS[v].indexOf(draft.subsect) < 0) draft.subsect = ''; if (!P) openField = 'subsect'; render(); break;
    case 'sub': draft.subsect = v; if (!P) openField = 'city'; render(); break;
    case 'cuisine': draft.cuisine = v; draft.cuisineSet = true; if (!P) openField = 'hh'; render(); break;
    case 'hh': draft.hh = Math.max(1, Math.min(20, draft.hh + (+v))); render(); break;
    case 'alg': { var i = draft.allergies.indexOf(v); if (i >= 0) draft.allergies.splice(i, 1); else draft.allergies.push(v); render(); break; }
    case 'addex': if (draft.exclude.indexOf(v) < 0) draft.exclude.push(v); ui.ingQ = ''; render(); break;
    case 'rmex': draft.exclude = draft.exclude.filter(function (x) { return x !== v; }); render(); break;
    case 'gps': useGps(); break;
    case 'geopick': { var r = ui.geo.results[+v]; draft.custom = {name: r.name + (r.admin1 ? ', ' + r.admin1 : ''), en: r.name, lat: r.latitude, lon: r.longitude, tz: r.timezone || JJ.tz.deviceTz(), country: r.country_code}; draft.cityId = ''; if (!draft.cuisine) draft.cuisine = 'gen'; ui.geo.results = null; render(); break; }
    case 'submit': {
      if (!ready(draft)) return;
      var tz = (draft.custom || JJ.CITIES[draft.cityId]).tz, td = JJ.todayISO(tz);
      P = Object.assign({}, draft, {userId: 'local', created: td, planFrom: td, version: 1, seed: hash(String(Date.now())) % 1000});
      delete P.cuisineSet; JJ.db.put('users', {id: 'local', createdAt: Date.now()}); saveProfile();
      JJ.db.put('meta', {key: 'frozen', upto: null}); draft = null; openField = null; tab = 'today'; stack = []; freezeHistory(); render(); break;
    }
    case 'save': {
      if (!ready(draft)) return;
      var keep = {userId: 'local', created: P.created, planFrom: P.planFrom, version: P.version, seed: P.seed};
      P = Object.assign({}, draft, keep); delete P.cuisineSet; applyProfileChange(); draft = null; openField = null; stack.pop(); render(); toast(t('saved_from_tomorrow')); break;
    }
    case 'resetask': sheet = 'reset'; render(); break;
    case 'sheetclose': sheet = null; render(); break;
    case 'resetdo': ['profiles', 'daily_menus', 'monthly_menus', 'grocery_lists', 'menu_history'].forEach(function (s) { JJ.db.clear(s); }); JJ.db.put('meta', {key: 'frozen', upto: null}); JJ.db.put('meta', {key: 'ticks', v: {}});
      P = null; draft = null; sheet = null; stack = []; tab = 'today'; previewCache.clear(); render(); break;
    case 'export': exportData(); break;
    case 'adstatus': ui.admin.status = v; render(); break;
    case 'admeal': ui.admin.meal = v; render(); break;
    case 'adnew': stack.push({k: 'edit', form: formFor({id: 'a' + Date.now().toString(36), status: 'pending'})}); render(); break;
    case 'adedit': { var rr = JJ.catalog.byId[v]; stack.push({k: 'edit', form: formFor(rr)}); render(); break; }
    case 'adsave': saveRecipe(top.form, 'pending'); toast(t('saved_pending')); render(); break;
    case 'adapprove': saveRecipe(top.form, 'approved'); toast(t('approved_toast')); render(); break;
    case 'adreject': saveRecipe(top.form, 'rejected'); toast(t('rejected_toast')); render(); break;
  }
});
app.addEventListener('change', function (e) {
  var el = e.target;
  if (el.id === 'pf-country') { draft.country = el.value; draft.state = ''; draft.cityId = ''; render(); }
  else if (el.id === 'pf-state') { draft.state = el.value; draft.cityId = ''; var st = JJ.STATES.IN[el.value]; if (st && !draft.cuisineSet) { draft.cuisine = st.cu; draft.calendar = st.cal; } render(); }
  else if (el.id === 'pf-city') { if (el.value) pickCity(el.value); render(); }
  else if (el.id === 'pf-green') { draft.greenRule = el.value; render(); }
  else if (el.id === 'pf-cha') { draft.chauvihar = +el.value; render(); }
  else if (el.id === 'pf-cal') { draft.calendar = el.value; render(); }
  else if (el.dataset.pf) { draft[el.dataset.pf] = el.checked; render(); }
  else if (el.dataset.tick) { var tk = ticks(), l = el.dataset.list; tk.v[l] = tk.v[l] || {}; if (el.checked) tk.v[l][el.dataset.tick] = true; else delete tk.v[l][el.dataset.tick]; JJ.db.put('meta', tk); refreshCounts(); }
  else if (el.dataset.ed === 'flags') { stack[stack.length - 1].form.flags = el.checked ? 'ch' : ''; render(); }
  else if (el.dataset.ed) { stack[stack.length - 1].form[el.dataset.ed] = el.value; render(); }
});
var inputT = null;
app.addEventListener('input', function (e) {
  var el = e.target, id = el.id;
  function later(fn) { clearTimeout(inputT); inputT = setTimeout(function () { fn(); render(); var n = document.getElementById(id); if (n) { n.focus(); try { n.setSelectionRange(n.value.length, n.value.length); } catch (x) {} } }, 250); }
  if (id === 'lib-q') later(function () { ui.lib.q = el.value; });
  else if (id === 'ad-q') later(function () { ui.admin.q = el.value; });
  else if (id === 'ex-q' || id === 'ing-q') later(function () { ui.ingQ = el.value; });
  else if (id === 'geo-q') ui.geo.q = el.value;
  else if (el.dataset.ed && el.tagName === 'TEXTAREA') { stack[stack.length - 1].form[el.dataset.ed] = el.value; }
});
app.addEventListener('submit', function (e) {
  e.preventDefault();
  if (e.target.id === 'geo-form') geoSearch();
});
document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && sheet) { sheet = null; render(); } });
function refreshCounts() {
  var total = 0, done = 0; document.querySelectorAll('[data-tick]').forEach(function (i) { total++; if (i.checked) done++; });
  var pct = total ? Math.round(done * 100 / total) : 0, r = document.getElementById('ring'); if (r) r.style.setProperty('--p', pct);
  var rt = document.getElementById('ringtxt'); if (rt) rt.textContent = pct + '%';
  var gc = document.getElementById('gcount'); if (gc) gc.textContent = t('items_done', {d: done, n: total});
}
function copyList(listId) {
  var groups;
  if (listId.indexOf('saved:') === 0) groups = JJ.db.get('grocery_lists', listId.slice(6)).groups;
  else { var r = rangeFor(ui.gRange); groups = JJ.grocery(menusIn(r[0], r[1])); }
  var txt = listText(groups);
  function fallback() { try { var ta = document.createElement('textarea'); ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); var ok = document.execCommand('copy'); document.body.removeChild(ta); toast(ok ? t('copied') : t('copy_blocked')); } catch (e) { toast(t('copy_blocked')); } }
  try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(function () { toast(t('copied')); }, fallback); else fallback(); } catch (e) { fallback(); }
}
function useGps() {
  if (!navigator.geolocation) { toast(t('gps_unavailable')); return; }
  toast(t('locating'));
  navigator.geolocation.getCurrentPosition(function (pos) {
    draft.custom = {name: t('my_location'), en: 'My location', lat: pos.coords.latitude, lon: pos.coords.longitude, tz: JJ.tz.deviceTz()};
    draft.cityId = ''; if (!draft.cuisine) draft.cuisine = 'gen'; render();
  }, function () { toast(t('gps_denied')); }, {timeout: 10000});
}
function geoSearch() {
  var q = (ui.geo.q || '').trim(); if (q.length < 2) return;
  ui.geo.busy = true; render();
  fetch('https://geocoding-api.open-meteo.com/v1/search?count=8&format=json&language=' + LANG + '&name=' + encodeURIComponent(q))
    .then(function (r) { return r.json(); })
    .then(function (j) { ui.geo.results = j.results || []; })
    .catch(function () { ui.geo.results = []; toast(t('search_failed')); })
    .then(function () { ui.geo.busy = false; render(); });
}
function exportData() {
  var out = {exportedAt: new Date().toISOString(), app: 'JainJoy 2.0'};
  ['profiles', 'menu_history', 'daily_menus', 'monthly_menus', 'grocery_lists', 'recipes', 'recipe_translations', 'recipe_sources'].forEach(function (s) { out[s] = JJ.db.all(s); });
  var blob = new Blob([JSON.stringify(out, null, 1)], {type: 'application/json'});
  var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'jainjoy-data.json'; document.body.appendChild(a); a.click(); a.remove();
}

/* live countdowns and midnight rollover */
function tick() { document.querySelectorAll('[data-until]').forEach(function (el) { el.textContent = until(+el.dataset.until); }); }
var lastDay = null;
setInterval(function () {
  tick();
  if (!P) return;
  var td = today(); if (lastDay && td !== lastDay) { freezeHistory(); if (!stack.length) render(); } lastDay = td;
}, 30000);

/* ---------------- boot ---------------- */
JJ.app = {render: render, menuFor: menuFor, generateMonth: generateMonth, freezeHistory: freezeHistory, applyProfileChange: applyProfileChange,
  get profile() { return P; }, set profile(v) { P = v; }, setLang: function (l) { LANG = l; }, get lang() { return LANG; }, today: today, pan: pan, t: t, previewCache: previewCache};
JJ.boot = function () {
  return JJ.db.open().then(function () {
    JJ.seedDatabase(); JJ.migrateV1();
    JJ.loadCatalog(JJ.recipesFromDb());
    P = JJ.db.get('profiles', 'local') || null;
    try { LANG = (P && P.lang) || localStorage.getItem('jainjoy.lang') || 'en'; } catch (e) { LANG = (P && P.lang) || 'en'; }
    if (P) { lastDay = today(); freezeHistory(); }
    render();
  });
};
/* when the precise astronomy engine finishes loading, recompute with it */
window.addEventListener('jj-astro-ready', function () { JJ.panchangReset(); if (P) render(); });
})(window.JJ = window.JJ || {});
