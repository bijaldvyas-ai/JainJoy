/* JainJoy v2 app: screens, navigation and wiring between the database and the engines. */
(function (JJ) {
'use strict';
var app = document.getElementById('app');
var MEALS = ['b', 'l', 's', 'd'];
var P = null, LANG = 'en', tab = 'today', stack = [], draft = null, openField = null, sheet = null;
var ui = {calMonth: null, gRange: 'week', admin: {status: 'all', meal: 'all', q: ''}, lib: {meal: 'b', q: ''}, geo: {q: '', results: null, busy: false}, ingQ: '', acc: {mode: (function () { try { return localStorage.getItem('jainjoy.hasAccount') === '1' ? 'signin' : 'signup'; } catch (e) { return 'signup'; } })(), f: {}, errs: [], busy: false}, cust: {rows: null, q: '', filter: 'all', err: ''}};
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
/* the same amount in katori, for cooks who measure by bowl: " ≈ 2½ katori" */
function kitchenQty(id, q) { var k = JJ.katori(id, q); return k ? '<span class="kq">≈ ' + esc(fracStr(k)) + ' ' + esc(t('u_katori')) + '</span>' : ''; }
var WA_ICON = '<svg class="wa-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 2a8 8 0 1 1-4.2 14.8l-.3-.2-2.9.8.8-2.8-.2-.3A8 8 0 0 1 12 4zm-3 4c-.3 0-.6.1-.8.4-.3.3-.9.9-.9 2.1s.9 2.4 1 2.6c.1.2 1.8 2.8 4.4 3.8 2.2.9 2.6.7 3.1.6.5 0 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.2-.2-.5-.3l-1.7-.8c-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.6.1-.3-.1-1.1-.4-2-1.3-.8-.7-1.3-1.5-1.4-1.8-.2-.3 0-.4.1-.5l.4-.5.3-.4v-.5l-.8-1.9c-.2-.5-.4-.4-.6-.4H9z"/></svg>';
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
/* what this week (from Monday) has already used: vegetables, fried and sweet dishes */
function weekFor(iso) {
  var dn = JJ.dayNum(iso), wd = (new Date(dn * 864e5).getUTCDay() + 6) % 7, w = JJ.newWeek(dn - wd);
  for (var k = wd; k >= 1; k--) { var d = JJ.addDays(iso, -k), m = getStored(d) || previewCache.get(d); if (m) JJ.noteWeek(w, m); }
  return w;
}
function generate(iso) { return JJ.genDay(iso, P, {recent: recentFor(iso), week: weekFor(iso)}); }
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
/* Every stored menu is re-checked against the current rules before it is shown.
   Today and future days that fail are rebuilt at once; past days stay as recorded but are marked. */
function checked(iso, m) {
  if (!m || m.legacy || !JJ.menuViolations(m, P).length) return m;
  var td = today();
  if (iso < td) return Object.assign({}, m, {ruleWarning: true});
  if (m.status === 'history') { JJ.db.del('menu_history', iso); return freeze(generate(iso)); }
  var g = Object.assign(generate(iso), {status: m.status === 'planned' ? 'planned' : 'preview', month: ym(iso), savedAt: Date.now()});
  if (g.status === 'planned') JJ.db.put('daily_menus', g); else previewCache.set(iso, g);
  return g;
}
function menuFor(iso) {
  if (!P) return null;
  var h = JJ.db.get('menu_history', iso); if (h) return checked(iso, h);
  if (iso < P.created) return null;
  var td = today();
  if (iso <= td) { freezeHistory(); return checked(iso, JJ.db.get('menu_history', iso)); }
  if (previewPv !== P.version) { previewCache.clear(); previewPv = P.version; }
  var s = JJ.db.get('daily_menus', iso); if (s && s.pv === P.version) return checked(iso, s);
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
function brandBar() { return '<header class="appbar gx"><div class="brand-sm">' + lotus(30) + WORDMARK + '</div><button class="city-chip" data-a="tab" data-v="prof" aria-label="' + esc(t('change_city')) + '">' + ic('pin') + '<span>' + esc(cityLabel()) + '</span></button>' + langChip() + '</header>'; }
function backBar(title, sub, extra) { return '<header class="appbar gx"><button class="icon-btn" data-a="back" aria-label="' + esc(t('back')) + '">' + ic('back') + '</button><div class="ab-title"><b>' + esc(title) + '</b>' + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</div>' + (extra || '') + '</header>'; }
function tabbar() {
  var cur = tab;
  function b(v, i, l) { return '<button class="tab" data-a="tab" data-v="' + v + '"' + (cur === v ? ' aria-current="page"' : '') + '><span class="pill">' + ic(i) + '</span>' + esc(t(l)) + '</button>'; }
  return '<nav class="tabbar gx" aria-label="' + esc(t('main_nav')) + '">' + b('today', 'today', 'tab_today') + b('cal', 'cal', 'tab_calendar') + b('pan', 'moon', 'tab_panchang') + b('chog', 'clock', 'tab_choghadiya') + b('shop', 'cart', 'tab_grocery') + b('prof', 'users', 'tab_profile') + '</nav>';
}
/* signature shown at the end of every screen */
var CREDIT = '<p class="credit">' + '<svg class="lotus" width="18" height="15" viewBox="0 0 64 52" aria-hidden="true"><use href="#jjLotus"/></svg> Made by <span>BiNaiSa</span></p>';
function withCredit(html) { var i = html.lastIndexOf('</main>'); return i < 0 ? html : html.slice(0, i) + CREDIT + html.slice(i); }
var lastKey = '';
function render() {
  document.documentElement.lang = LANG === 'hi' ? 'hi' : LANG === 'gu' ? 'gu' : 'en';
  var sc = document.getElementById('scroll'), top = stack[stack.length - 1];
  var key = (P ? '' : 'onb') + tab + '|' + (top ? JSON.stringify(top) : ''), keep = sc && key === lastKey ? sc.scrollTop : 0;
  var body;
  var gate = JJ.account.configured() && !JJ.account.user; // with accounts on, Sign Up / Sign In comes first
  if (JJ.account.configured() && !JJ.account.known) body = viewLoading();
  else if (gate) body = viewGate();
  else if (locked()) body = viewPaywall(false); // trial over and not paid: only the subscription page
  else if (!P) body = viewProfile(true);
  else if (top) body = ({day: viewDayPushed, recipe: viewRecipe, thali: viewThali, profile: function () { return viewProfile(false); }, library: viewLibrary, glossary: viewGlossary,
    admin: viewAdmin, edit: viewEdit, about: viewAbout, glists: viewSavedLists, glist: viewSavedList, pantry: viewPantry, account: viewAccount, subscribe: function () { return viewPaywall(true); }, legal: viewLegal, invite: viewInvite})[top.k](top);
  else body = tab === 'today' ? viewToday() : tab === 'cal' ? viewCal() : tab === 'pan' ? viewPan() : tab === 'chog' ? viewChog() : tab === 'shop' ? viewShop() : viewProfileHome();
  app.innerHTML = '<div class="phone">' + withCredit(body) + (P && !gate && !locked() && JJ.account.known ? tabbar() : '') + sheetHTML() + '</div>';
  var ns = document.getElementById('scroll'); if (ns) ns.scrollTop = keep; lastKey = key;
  if (top && top.k === 'about' && JJ.analytics.enabled()) JJ.analytics.total().then(function (n) { var el = document.getElementById('visitors'); if (el) el.textContent = n == null ? t('visitors_unavailable') : t('visitors_total', {n: n}); });
  // first view of a brand-new plan: bring today's menu into view
  var show = document.getElementById('showcase'); if (show && !ui.showcaseDone) { ui.showcaseDone = true; show.scrollIntoView({block: 'start'}); }
  if (top && top.k === 'admin' && JJ.account.isAdmin) { custStartLive(); setTimeout(drawQr, 0); } else custStopLive();
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
    '</div>' + (live ? chogLine() : '') + '<p class="fine" style="margin-top:8px">' + esc(t('timings_note', {n: P.navkarsi, c: P.chauvihar ? t('chauvihar_before', {m: P.chauvihar}) : t('chauvihar_at')})) + '</p></section>';
}
/* the choghadiya running right now (today's day/night, or last night's before sunrise) */
function chogLine() {
  var now = Date.now(), td = today(), list = JJ.choghadiya(td, city()).concat(JJ.choghadiya(JJ.addDays(td, -1), city()));
  var c = list.filter(function (x) { return now >= x.start && now < x.end; })[0];
  if (!c) return '';
  return '<button class="lrow chog-row chog-' + c.q + '" style="margin-top:8px" data-a="tab" data-v="chog"><span class="chog-dot"></span><span class="mtxt grow"><b>' + esc(t('chog_now_line', {name: t('chog_' + c.k), q: t('chog_q_' + c.q)})) + '</b><small>' + esc(t('chog_until', {time: hm(c.end)})) + '</small></span>' + ic('next', 'chev') + '</button>';
}
function tithiCard(iso) {
  var p = pan(iso), r = JJ.dayRules(p, P), sp = r.parva || p.aatham || p.chaudas;
  var pk = JJ.parvaKeys(p), title = pk.length ? pk.map(function (k) { return t(k); }).join(' · ') : JJ.tithiName(p.t, LANG);
  var mo = JJ.MONTHS[p.month][{en: 0, hi: 1, gu: 2}[LANG]];
  // the tithi itself is shown beside the date at the top; this card keeps the month, the end time and the day's rules
  var h = '', tags = [(p.adhik ? t('adhik') + ' ' : '') + mo + ' ' + t(p.paksha === 'S' ? 'shukla' : 'krishna') + ' · ' + t('ends_at', {time: hm(p.tithiEnd)})];
  if (p.shuklaPancham) tags.push(t('shukla_pancham'));
  if (p.vriddhi) tags.push(t('vriddhi'));
  if (p.skipped) tags.push(t('kshaya', {name: JJ.tithiName(p.skipped, LANG)}));
  p.observances.forEach(function (o) { tags.push(nm(o)); });
  if (tags.length) h += '<div class="obs">' + tags.map(function (x) { return '<span>' + esc(x) + '</span>'; }).join('') + '</div>';
  if (r.parva) h += parvaBox(r);
  else if (r.noGreen) h += '<p class="rule-note sp">' + ic('noleaf') + '<span><b>' + esc(t('no_green_today')) + '</b> ' + esc(t('no_green_why')) + '</span></p>';
  else if (r.noLeafy) h += '<p class="rule-note sp">' + ic('noleaf') + '<span><b>' + esc(t('no_leafy_today', {day: t(p.aatham ? 'aatham' : 'chaudas')})) + '</b> ' + esc(t('always_on')) + '</span></p>';
  else h += '<p class="rule-note">' + ic('check') + '<span><b>' + esc(t('base_rules')) + '</b> ' + esc(t('base_rules_text')) + '</span></p>';
  return h;
}
/* the day's tithi for the page header: "Vad Aatham · Krishna paksha", highlighted on Parva days */
function tithiInline(iso) {
  var p = pan(iso), pk = JJ.parvaKeys(p), name = pk.length ? pk.map(function (k) { return t(k); }).join(' · ') : JJ.tithiName(p.t, LANG);
  return '<span class="tithi-pill' + (pk.length || p.aatham || p.chaudas ? ' sp' : '') + '">🌙 <span class="tnum">' + p.n + '</span> ' + esc(name) + ' · ' + esc(t(p.paksha === 'S' ? 'shukla' : 'krishna')) + '</span>';
}
/* Parva Tithi restriction box: which tithi, which paksha, and the full list of restrictions */
function parvaBox(r) {
  var list = ['pr_leafy', 'pr_fresh', 'pr_herbs', 'pr_sprouts', 'pr_roots', 'pr_onion', 'pr_kaddu', 'pr_alavi'];
  if (r.noFruit) list.push('pr_fruit');
  return '<div class="parva-box"><b>' + esc(r.parvaKeys.map(function (k) { return t(k); }).join(' · ')) + ' · ' + esc(t('parva_tithi')) + '</b>' +
    '<ul>' + list.map(function (k) { return '<li>' + esc(t(k)) + '</li>'; }).join('') + '</ul><small>' + esc(t(r.noFruit ? 'parva_fruit_no' : 'parva_fruit_ok')) + ' ' + esc(t('parva_applies')) + '</small></div>';
}
/* Next-day reminder: tomorrow's tithi rule and planned meals, with phone-calendar and evening reminders */
function tomorrowSummary() {
  var d = JJ.addDays(today(), 1), p = pan(d), r = JJ.dayRules(p, P), m = menuFor(d);
  var names = m ? MEALS.map(function (k) {
    if (k === 'l') return t('meal_l') + ': ' + JJ.chosenItems(m).filter(function (it) { return it.id; }).slice(0, 3).map(function (it) { return rName(JJ.recipeFor(m, it.id)); }).join(', ');
    var x = JJ.chosenMeal(m, k); return t('meal_' + k) + ': ' + (x && x.id ? rName(JJ.recipeFor(m, x.id)) : '—');
  }) : [];
  return {date: d, p: p, r: r, names: names, soak: m ? soakTonight(m) : []};
}
/* what must go into water tonight for tomorrow's chosen dishes: overnight soaks, long soaks (6 h+),
   and any soak for breakfast (there is no time in the morning). [{ings:'Moong, Rice', dish:'Moong Dal Chilla'}] */
function soakTonight(m) {
  var out = [];
  function scan(id, meal) {
    var r = id && JJ.recipeFor(m, id); if (!r) return;
    var ings = [];
    (r.steps || []).forEach(function (st) {
      if (!Array.isArray(st) || (st[0] !== 'soakn' && st[0] !== 'soakh')) return;
      if (st[0] === 'soakh' && !(meal === 'b' || (st[2] || 0) >= 6)) return;
      String(st[1] || '').split('+').forEach(function (k) { if (k && ings.indexOf(k) < 0) ings.push(k); });
    });
    if (ings.length) out.push({ings: ings.map(ingName).join(', '), dish: rName(r)});
  }
  ['b', 's', 'd'].forEach(function (k) { var x = JJ.chosenMeal(m, k); if (x) scan(x.id, k); });
  JJ.chosenItems(m).forEach(function (it) { scan(it.id, 'l'); });
  return out;
}
function soakLines(s) { return s.soak.map(function (x) { return x.ings + ' (' + t('soak_for') + ' ' + x.dish + ')'; }); }
function tomorrowCard() {
  var s = tomorrowSummary(), head = s.r.parva ? s.r.parvaKeys.map(function (k) { return t(k); }).join(' · ') + ' · ' + t('parva_no_veg') : JJ.tithiName(s.p.t, LANG) + ' · ' + t(s.p.paksha === 'S' ? 'shukla' : 'krishna');
  return '<section class="card glass tomorrow' + (s.r.parva ? ' is-parva' : '') + '"><h3>' + esc(t('tomorrow')) + ' · ' + esc(dShort(s.date)) + '</h3><b>' + esc(head) + '</b>' +
    '<ul class="tlist">' + s.names.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul>' +
    (s.soak.length ? '<div class="soak"><b>💧 ' + esc(t('soak_tonight')) + '</b><ul class="tlist">' + soakLines(s).map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul></div>' : '') +
    (s.r.parva ? '<p class="fine" style="margin:6px 0 0">' + esc(t('tomorrow_parva_tip')) + '</p>' : '') +
    '<div class="row" style="flex-wrap:wrap;margin-top:10px"><button class="btn small" data-a="day" data-v="' + s.date + '">' + esc(t('see_tomorrow')) + '</button><button class="btn small" data-a="ics">' + esc(t('add_reminders')) + '</button><button class="btn small" data-a="notify">' + esc(t(notifyState() === 'on' ? 'evening_on' : 'evening_reminder')) + '</button></div></section>';
}
function notifyState() { try { return localStorage.getItem('jainjoy.notify') === '1' && window.Notification && Notification.permission === 'granted' ? 'on' : 'off'; } catch (e) { return 'off'; } }
/* Shown once per day after 5 pm while the app is open (phones do not allow scheduled alarms without a server). */
function maybeEveningReminder() {
  if (!P || notifyState() !== 'on') return;
  var now = new Date(), key = 'jainjoy.notified.' + today();
  if (now.getHours() < 17) return;
  try { if (localStorage.getItem(key)) return; localStorage.setItem(key, '1'); } catch (e) { return; }
  var s = tomorrowSummary(), title = t('tomorrow') + ': ' + (s.r.parva ? s.r.parvaKeys.map(function (k) { return t(k); }).join(', ') + ' – ' + t('parva_no_veg') : JJ.tithiName(s.p.t, LANG));
  try { new Notification(title, {body: (s.soak.length ? '💧 ' + t('soak_tonight') + ': ' + soakLines(s).join('; ') + '\n' : '') + s.names.join('\n'), icon: 'icon-192.png', tag: 'jainjoy-tomorrow'}); } catch (e) {}
}
/* .ics file: an all-day event on each Parva Tithi in the next 60 days, with an alarm at 7 pm the evening before */
function parvaIcs() {
  var td = today(), lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//JainJoy//Parva Tithi//EN', 'CALSCALE:GREGORIAN'];
  function esc2(s) { return String(s).replace(/[\\;,]/g, function (c) { return '\\' + c; }).replace(/\n/g, '\\n'); }
  for (var k = 1; k <= 60; k++) {
    var d = JJ.addDays(td, k), p = pan(d), r = JJ.dayRules(p, P);
    if (!r.parva && !r.noLeafy) continue;
    var m = menuFor(d), title = (r.parva ? r.parvaKeys.map(function (x) { return t(x); }).join(', ') + ' – ' + t('parva_no_veg') : t(p.aatham ? 'aatham' : 'chaudas') + ' – ' + t('pr_leafy')) + ' (JainJoy)';
    var desc = m ? MEALS.map(function (q) { var x = q === 'l' ? null : JJ.chosenMeal(m, q); return t('meal_' + q) + ': ' + (q === 'l' ? JJ.chosenItems(m).filter(function (it) { return it.id; }).map(function (it) { return rName(JJ.recipeFor(m, it.id)); }).join(', ') : x && x.id ? rName(JJ.recipeFor(m, x.id)) : '—'); }).join('\n') : '';
    var ds = d.replace(/-/g, ''), de = JJ.addDays(d, 1).replace(/-/g, '');
    lines.push('BEGIN:VEVENT', 'UID:jainjoy-' + ds + '@bijaldvyas-ai.github.io', 'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z', 'DTSTART;VALUE=DATE:' + ds, 'DTEND;VALUE=DATE:' + de,
      'SUMMARY:' + esc2(title), 'DESCRIPTION:' + esc2(desc), 'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + esc2(t('tomorrow') + ': ' + title), 'TRIGGER:-PT5H', 'END:VALARM', 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}
/* which recipe is shown for a meal: option 1 or option 2 */
function chosen(menu, k) { return menu.legacy ? menu.meals[k] : JJ.chosenMeal(menu, k); }
function hasOptions(menu, k) {
  if (menu.legacy) return false;
  var x = menu.meals[k];
  return k === 'l' ? (x.items || []).some(function (it) { return it.alt; }) : !!(x && x.id && x.alt);
}
/* lunch items for option 0 (first thali) or 1 (second thali); undefined = the chosen one */
function itemsFor(menu, opt) {
  if (opt == null) return JJ.chosenItems(menu);
  return (menu.meals.l.items || []).map(function (it) { return opt === 1 && it.alt ? Object.assign({}, it, {id: it.alt.id, drop: it.alt.drop}) : it; });
}
/* Side-by-side: both options as two small cards. Tap a card to choose it; "Recipe ›" / "Thali ›" opens it. */
function optionPair(iso, k, menu) {
  var x = menu.meals[k], cur = (menu.choice && menu.choice[k]) || 0, locked = menu.status === 'history' && iso !== today();
  var parva = menu.rules && menu.rules.parva;
  function card(i) {
    var r, title, sub, open;
    if (k === 'l') {
      var its = itemsFor(menu, i).filter(function (it) { return it.id; });
      r = JJ.recipeFor(menu, (its[1] || its[0]).id);
      title = t(i ? 'alt_thali' : 'main_thali');
      sub = its.filter(function (it) { return it.slot !== 'bread' && it.slot !== 'rice'; }).map(function (it) { return rName(JJ.recipeFor(menu, it.id)); }).join(' · ');
      var tmp = Object.assign({}, menu, {choice: Object.assign({}, menu.choice, {l: i})});
      sub += '\n' + JJ.dayNutrition(tmp).l[0] + ' ' + t('kcal');
      open = '<button class="opt-open" data-a="thali" data-d="' + iso + '" data-o="' + i + '">' + esc(t('open_thali')) + ' ›</button>';
    } else {
      var o = i ? x.alt : x; r = JJ.recipeFor(menu, o.id);
      title = rName(r); sub = timeText(r) + '\n' + JJ.recipeNutrition(r, o.drop)[0] + ' ' + t('kcal');
      open = '<button class="opt-open" data-a="recipe" data-d="' + iso + '" data-id="' + o.id + '">' + esc(t('open_recipe')) + ' ›</button>';
    }
    var on = cur === i;
    return '<div class="opt-card' + (on ? ' on' : '') + '"><button class="opt-pick" data-a="choose" data-d="' + iso + '" data-m="' + k + '" data-v="' + i + '" aria-pressed="' + on + '"' + (locked && !on ? ' disabled' : '') + '>' +
      '<span class="opt-top">' + plate(r, 40) + '<span class="opt-mark">' + (on ? '✓' : esc(t('option_n', {n: i + 1}))) + '</span></span>' +
      '<b>' + esc(title) + '</b><small>' + esc(sub).replace(/\n/g, '<br>') + '</small></button>' + open + '</div>';
  }
  var dinner = k === 'd' ? '<p class="warn-line" style="color:var(--saffron);margin:4px 2px 0">' + esc(t('finish_before', {time: hm(JJ.timings(pan(iso), {navkarsi: P.navkarsi, chauvihar: P.chauvihar}).chauvihar)})) + '</p>' : '';
  return '<div class="opt-head"><span class="mtag mt-' + k + '">' + esc(t('meal_' + k)) + (k === 'l' ? ' · ' + esc(nm(JJ.CUISINES[menu.cuisine] || JJ.CUISINES.gen)) : '') + '</span>' +
    (parva ? '<span class="tag ok">' + esc(t('parva_ok')) + '</span>' : '') + '<span class="opt-hint">' + esc(t(locked ? 'option_locked' : 'tap_to_choose')) + '</span></div>' +
    '<div class="opt-pair" role="group" aria-label="' + esc(t('choose_option')) + '">' + card(0) + card(1) + '</div>' + dinner;
}
function mealCard(iso, k, menu) {
  var x = chosen(menu, k), tagCls = {b: 'b', l: 'l', s: 's', d: 'd'}[k];
  var pb = menu.rules && menu.rules.parva ? '<span class="tag ok">' + esc(t('parva_ok')) + '</span>' : '';
  if (k === 'l') {
    var items = (menu.legacy ? (menu.meals.l.items || []) : JJ.chosenItems(menu)).filter(function (it) { return it.id || it.acc || it.legacy; });
    var names = items.map(function (it) { return it.legacy ? it.legacy : it.acc ? nm(JJ.ACCOMP[it.acc]) : rName(JJ.recipeFor(menu, it.id)); });
    var main = items.filter(function (it) { return it.id; })[1] || items[0];
    var r0 = main && main.id ? JJ.recipeFor(menu, main.id) : null;
    return '<button class="meal" data-a="thali" data-d="' + iso + '">' + plate(r0, 64) + '<span class="mtxt"><span class="mtag mt-l">' + esc(t('meal_l')) + ' · ' + esc(nm(JJ.CUISINES[menu.cuisine] || JJ.CUISINES.gen)) + '</span><b>' + esc(names.slice(0, 3).join(' · ')) + '</b><small>' + esc(t('thali_items', {n: items.length})) + (menu.legacy ? '' : ' · ' + JJ.dayNutrition(menu).l[0] + ' ' + esc(t('kcal'))) + '</small>' + pb + '</span>' + ic('next', 'chev') + '</button>';
  }
  if (!x || x.legacy) return '<div class="meal"><span class="mtxt"><span class="mtag mt-' + tagCls + '">' + esc(t('meal_' + k)) + '</span><b>' + esc(x ? x.legacy : '—') + '</b><small>' + esc(t('legacy_menu')) + '</small></span></div>';
  if (!x.id) return '<div class="meal"><span class="mtxt"><span class="mtag mt-' + tagCls + '">' + esc(t('meal_' + k)) + '</span><b>' + esc(t('no_match')) + '</b><small>' + esc(t('no_match_hint')) + '</small></span></div>';
  var r = JJ.recipeFor(menu, x.id);
  var extra = k === 'd' ? '<span class="warn-line" style="color:var(--saffron)">' + esc(t('finish_before', {time: hm(JJ.timings(pan(iso), {navkarsi: P.navkarsi, chauvihar: P.chauvihar}).chauvihar)})) + '</span>' : '';
  return '<button class="meal" data-a="recipe" data-d="' + iso + '" data-id="' + x.id + '">' + plate(r, 64) + '<span class="mtxt"><span class="mtag mt-' + tagCls + '">' + esc(t('meal_' + k)) + '</span><b>' + esc(rName(r)) + '</b><small>' + esc(timeText(r)) + ' · ' + JJ.recipeNutrition(r, x.drop)[0] + ' ' + esc(t('kcal')) + (x.drop && x.drop.length ? ' · ' + esc(t('adjusted_today')) : '') + '</small>' + extra + pb + '</span>' + ic('next', 'chev') + '</button>';
}
function timeText(r) { return (r.prep || 0) >= 240 ? t('min_soak', {n: r.cook || 0}) : t('min_total', {n: (r.prep || 0) + (r.cook || 0)}); }
function statusPill(st) { return st === 'hist' ? '<span class="status-pill st-hist">' + ic('lock') + esc(t('status_hist')) + '</span>' : st === 'plan' ? '<span class="status-pill st-plan">' + ic('check') + esc(t('status_plan')) + '</span>' : st === 'prev' ? '<span class="status-pill st-prev">' + esc(t('status_prev')) + '</span>' : ''; }
function dayBody(iso, isToday) {
  // order: timings, then the 4 meals right away, then the tithi rules, quick links and nutrition
  var menu = menuFor(iso), b = '';
  b += compactTimings(iso, isToday);
  if (!menu) { b += tithiCard(iso) + '<div class="empty"><b>' + esc(t('no_plan_day')) + '</b>' + esc(t('plan_started', {date: dLong(P.created)})) + '</div>'; return b; }
  if (isToday && ui.showcase) b += '<div class="showcase" id="showcase"><b>🎉 ' + esc(t('plan_ready')) + '</b><small>' + esc(t('plan_ready_sub')) + '</small></div>';
  b += '<div class="meals">' + MEALS.map(function (k) { return '<div class="meal-wrap">' + (hasOptions(menu, k) ? optionPair(iso, k, menu) : mealCard(iso, k, menu)) + '</div>'; }).join('') + '</div>';
  if (menu.shortages && menu.shortages.length) b += '<div class="alert">' + esc(t('shortage_note')) + '</div>';
  if (menu.ruleWarning) b += '<div class="alert">' + esc(t('old_rules_note')) + '</div>';
  b += tithiCard(iso);
  var oli = isOli(iso);
  b += festiveCard(iso);
  if (oli || ui.ayambil === iso) b += ayambilCard(iso);
  b += '<div class="row share-row">' + (isToday ? '' : '<button class="btn small wa" data-a="wa" data-v="' + iso + '">' + esc(t('share_whatsapp')) + '</button>') +
    (oli ? '' : '<button class="btn small" data-a="ayambil" data-v="' + iso + '">' + esc(t(ui.ayambil === iso ? 'ayambil_hide' : 'ayambil_show')) + '</button>') + '</div>';
  if (isToday) b += '<div class="quick">' +
    '<button data-a="tab" data-v="shop">' + ic('cart') + '<span>' + esc(t('quick_grocery')) + '</span></button>' +
    '<button data-a="tab" data-v="chog">' + ic('clock') + '<span>' + esc(t('tab_choghadiya')) + '</span></button>' +
    '<button data-a="tab" data-v="cal">' + ic('cal') + '<span>' + esc(t('quick_month')) + '</span></button></div>';
  if (isToday) b += tomorrowCard();
  if (!menu.legacy) b += nutritionCard(menu);
  b += '<div class="row" style="margin-top:12px">' + statusPill(menuStatus(iso, menu)) + '</div>';
  b += '<p class="fine">' + esc(menu.status === 'history' ? t('hist_note') : menu.status === 'planned' ? t('plan_note') : t('prev_note')) + '</p>';
  return b;
}
function nutriGrid(n) {
  n = n.map(function (v, i) { return i === 0 || v >= 10 ? Math.round(v) : v; });
  return '<div class="nutri"><div><b>' + n[0] + '</b><small>' + esc(t('kcal')) + '</small></div><div><b>' + n[1] + ' ' + esc(t('u_g')) + '</b><small>' + esc(t('protein')) + '</small></div><div><b>' + n[2] + ' ' + esc(t('u_g')) + '</b><small>' + esc(t('carbs')) + '</small></div><div><b>' + n[3] + ' ' + esc(t('u_g')) + '</b><small>' + esc(t('fat')) + '</small></div></div>';
}
function splitBar(n) {
  var s = JJ.energySplit(n);
  return '<div class="nbar" role="img" aria-label="' + esc(t('energy_split_aria', {p: s[0], c: s[1], f: s[2]})) + '"><i class="p" style="width:' + s[0] + '%"></i><i class="c" style="width:' + s[1] + '%"></i><i class="f" style="width:' + s[2] + '%"></i></div>' +
    '<div class="nlegend"><span><i style="background:var(--green)"></i>' + esc(t('protein')) + ' ' + s[0] + '%</span><span><i style="background:var(--saffron)"></i>' + esc(t('carbs')) + ' ' + s[1] + '%</span><span><i style="background:var(--indigo)"></i>' + esc(t('fat')) + ' ' + s[2] + '%</span></div>';
}
function nutritionCard(menu) {
  var n = JJ.dayNutrition(menu);
  return '<details class="card glass fold"><summary><span class="ficon">' + ic('leaf') + '</span><span class="mtxt grow"><b>' + esc(t('nutrition_title')) + '</b><small>' + esc(t('kcal_p', {k: n.total[0], p: Math.round(n.total[1])})) + '</small></span>' + ic('next', 'chev fold-chev') + '</summary>' + nutriGrid(n.total) + splitBar(n.total) +
    '<div class="nmeals">' + MEALS.map(function (k) { return '<div><span>' + esc(t('meal_' + k)) + '</span><b>' + esc(t('kcal_p', {k: n[k][0], p: n[k][1]})) + '</b></div>'; }).join('') + '</div>' +
    '<p class="fine" style="margin-top:8px">' + esc(t('nutrition_note')) + '</p></details>';
}
/* one-line timings with the running choghadiya; full details live on the Panchang tab */
function compactTimings(iso, live) {
  var p = pan(iso), tm = JJ.timings(p, {navkarsi: P.navkarsi, chauvihar: P.chauvihar}), now = Date.now();
  function cell(lbl, ms, cls, showUntil) { return '<div class="tcell ' + (cls || '') + '"><small>' + esc(t(lbl)) + '</small><b>' + hm(ms) + '</b>' + (showUntil ? '<em data-until="' + ms + '">' + until(ms) + '</em>' : '') + '</div>'; }
  // one compact table: Navkarsi · Chauvihar, then the Shubh Choghadiya on a slim row
  return '<section class="card glass timings-card"><div class="tc-head"><h3>' + esc(t('timings_title')) + '</h3><button class="linkbtn" data-a="tab" data-v="pan" style="padding:0">' + esc(t('more_details')) + '</button></div><div class="tgrid tg4 tg2">' +
    cell('navkarsi', tm.navkarsi, live && now < tm.navkarsi ? 'hi' : '', live) + cell('chauvihar', tm.chauvihar, live && now < tm.chauvihar ? 'warn' : '', live) +
    '</div>' + shubhCell(iso, live) + '</section>';
}
/* Shubh Choghadiya for the timings card: on today the one running now or the next one (Amrit, Shubh or Labh);
   on another day the first one after sunrise. Tapping it opens the Choghadiya tab. */
function shubhCell(iso, live) {
  var now = Date.now(), list = JJ.choghadiya(iso, city());
  if (live) list = JJ.choghadiya(JJ.addDays(iso, -1), city()).concat(list, JJ.choghadiya(JJ.addDays(iso, 1), city()));
  var c = list.filter(function (x) { return x.q === 'good' && (live ? x.end > now : x.part === 'day'); })[0];
  if (!c) return '';
  var running = live && now >= c.start;
  return '<button class="chog-strip" data-a="tab" data-v="chog"><small>' + esc(t('shubh_chog')) + '</small><b>' + esc(t('chog_' + c.k)) + '</b>' +
    '<em>' + esc(hm(c.start) + '–' + hm(c.end)) + '</em>' + (live ? '<em class="' + (running ? 'now' : '') + '"' + (running ? '' : ' data-until="' + c.start + '"') + '>' + esc(running ? t('chog_now_short') : until(c.start)) + '</em>' : '') + '</button>';
}
/* Ayambil thali: shown by itself during Ayambil Oli, and on any day with the "Ayambil thali" button */
function isOli(iso) { return pan(iso).observances.some(function (o) { return o.k === 'oli_chaitra' || o.k === 'oli_aso'; }); }
function ayambilCard(iso) {
  var opts = JJ.ayambilDay(iso, P); if (!opts[0].length) return '';
  return '<section class="card glass ayambil"><h3>' + esc(t('ayambil_title')) + '</h3><p class="fine" style="margin:0 0 8px">' + esc(t('ayambil_note')) + '</p><div class="opt-pair">' +
    opts.map(function (items, i) {
      return '<div class="opt-card"><b>' + esc(t('option_n', {n: i + 1})) + '</b><ul class="tlist">' + items.map(function (it) {
        return '<li><button class="linkbtn" style="padding:0;text-align:left" data-a="librecipe" data-v="' + it.id + '">' + esc(rName(JJ.catalog.byId[it.id])) + '</button></li>';
      }).join('') + '</ul></div>';
    }).join('') + '</div></section>';
}
/* Diwali festive menu: the festival days of a date and the festive dishes that pass today's rules */
function festiveFor(iso) {
  var p = pan(iso), rules = JJ.dayRules(p, P), out = [];
  p.observances.forEach(function (o) {
    var f = JJ.FESTIVE && JJ.FESTIVE[o.k]; if (!f) return;
    function ok(id) { var r = JJ.catalog.byId[id]; return r && r.valid !== false && !!JJ.allowed(r, rules, P); }
    out.push({k: o.k, special: f.special.filter(ok), nasto: f.nasto.filter(ok), note: f.note});
  });
  return out;
}
function festiveCard(iso) {
  var fs = festiveFor(iso); if (!fs.length) return '';
  function links(ids) { return ids.map(function (id) { return '<li><button class="linkbtn" style="padding:0;text-align:left" data-a="librecipe" data-v="' + id + '">' + esc(rName(JJ.catalog.byId[id])) + '</button></li>'; }).join(''); }
  return fs.map(function (f) {
    return '<section class="card glass festive"><h3>🪔 ' + esc(t('festive_title')) + ' · ' + esc(t(f.k)) + '</h3><p class="fine" style="margin:0 0 8px">' + esc(nm(f.note)) + '</p><div class="opt-pair">' +
      (f.special.length ? '<div class="opt-card"><b>' + esc(t('festive_special')) + '</b><ul class="tlist">' + links(f.special) + '</ul></div>' : '') +
      (f.nasto.length ? '<div class="opt-card"><b>' + esc(t('festive_nasto')) + '</b><ul class="tlist">' + links(f.nasto) + '</ul></div>' : '') + '</div></section>';
  }).join('');
}
/* shopping for the festive dishes of the days in a range, kept apart from the daily list */
function festiveShopping(menus) {
  var days = [], ids = [];
  menus.forEach(function (m) { festiveFor(m.date).forEach(function (f) { days.push(dShort(m.date) + ' ' + t(f.k)); f.special.concat(f.nasto).forEach(function (id) { if (ids.indexOf(id) < 0) ids.push(id); }); }); });
  if (!ids.length) return '';
  var g = JJ.grocery([{date: menus[0].date, hh: P.hh, choice: {}, meals: {l: {items: ids.map(function (id) { return {slot: 'f', id: id}; })}}}]);
  return '<details class="card glass fold"><summary>🪔 ' + esc(t('festive_shop', {n: days.length})) + '</summary><p class="fine" style="margin:0 0 6px">' + esc(days.join(' · ')) + '. ' + esc(t('festive_shop_note')) + '</p>' +
    g.map(function (gr) { return '<div class="gsec"><h3>' + esc(t('grp_' + gr.group)) + '</h3>' + gr.items.map(function (it) { var a = JJ.buyAmount(it.amt, it.unit); return '<div class="gi" style="cursor:default"><span class="gn">' + esc(ingName(it.id)) + '</span><span class="gq">' + a.v + ' ' + esc(t('u_' + a.u)) + '</span></div>'; }).join('') + '</div>'; }).join('') + '</details>';
}
/* plain-text menu of a day, for WhatsApp */
function menuText(iso) {
  var m = menuFor(iso), p = pan(iso), r = JJ.dayRules(p, P); if (!m) return '';
  var s = '🪷 JainJoy · ' + dLong(iso) + '\n' + JJ.tithiName(p.t, LANG) + ' · ' + t(p.paksha === 'S' ? 'shukla' : 'krishna') + (r.parva ? ' · ' + r.parvaKeys.map(function (k) { return t(k); }).join(', ') : '') + '\n\n';
  MEALS.forEach(function (k) {
    if (k === 'l') s += '🍛 ' + t('meal_l') + ': ' + (m.legacy ? m.meals.l.items : JJ.chosenItems(m)).filter(function (it) { return it.id; }).map(function (it) { return rName(JJ.recipeFor(m, it.id)); }).join(', ') + '\n';
    else { var x = chosen(m, k); s += ({b: '🌅 ', s: '☕ ', d: '🌇 '})[k] + t('meal_' + k) + ': ' + (x && x.id ? rName(JJ.recipeFor(m, x.id)) : '—') + '\n'; }
  });
  festiveFor(iso).forEach(function (f) { s += '🪔 ' + t(f.k) + ': ' + f.special.concat(f.nasto).map(function (id) { return rName(JJ.catalog.byId[id]); }).join(', ') + '\n'; });
  var tm = JJ.timings(p, {navkarsi: P.navkarsi, chauvihar: P.chauvihar});
  s += '\n' + t('navkarsi') + ' ' + hm(tm.navkarsi) + ' · ' + t('chauvihar') + ' ' + hm(tm.chauvihar) + '\n\nhttps://bijaldvyas-ai.github.io/JainJoy/';
  return s;
}
/* WhatsApp: the phone's share sheet where available, otherwise WhatsApp's own link */
function shareText(txt) {
  if (!txt) return;
  if (navigator.share) { navigator.share({text: txt}).catch(function () {}); return; }
  window.open('https://wa.me/?text=' + encodeURIComponent(txt), '_blank', 'noopener');
}
function currentGroups(listId) {
  if (listId && listId.indexOf('saved:') === 0) return JJ.db.get('grocery_lists', listId.slice(6)).groups;
  var r = rangeFor(ui.gRange); return JJ.grocery(menusIn(r[0], r[1]));
}
function viewToday() {
  var td = today();
  var b = '<div class="greet-row"><p class="eyebrow">' + esc(t('greeting')) + '</p><button class="btn small wa" data-a="wa" data-v="' + td + '">' + WA_ICON + esc(t('share_whatsapp')) + '</button></div><h1 class="h1">' + esc(t('todays_menu')) + '</h1><p class="sub date-line"><span>' + esc(dLong(td)) + '</span>' + tithiInline(td) + '</p>' + inviteCard() + trialBanner() + dayBody(td, true);
  return brandBar() + '<main class="scroll gx" id="scroll">' + b + '</main>';
}
function viewDayPushed(top) {
  var iso = top.date, td = today();
  var sub = iso === td ? t('today') : iso < td ? t('past_day') : t('upcoming');
  var nav = '<div class="ab-nav"><button class="icon-btn" data-a="shift" data-v="-1" aria-label="' + esc(t('prev_day')) + '">' + ic('back') + '</button><button class="icon-btn" data-a="shift" data-v="1" aria-label="' + esc(t('next_day')) + '"' + (JJ.addDays(iso, 1) > monthEnd(addMonth(ym(td), 1)) ? ' disabled' : '') + '>' + ic('next') + '</button></div>';
  return backBar(dLong(iso), sub, nav) + '<main class="scroll gx" id="scroll"><p class="sub date-line" style="margin-top:8px">' + tithiInline(iso) + '</p>' + dayBody(iso, iso === td) + '</main>';
}

/* ---------------- Thali and recipe ---------------- */
function viewThali(top) {
  var menu = menuFor(top.date), items = menu.legacy ? (menu.meals.l.items || []) : itemsFor(menu, top.opt), cu = JJ.CUISINES[menu.cuisine] || JJ.CUISINES.gen;
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
  if (!menu.legacy) { var ln = JJ.dayNutrition(menu).l; b += '<section class="card glass"><h3>' + esc(t('thali_nutrition')) + '</h3>' + nutriGrid(ln) + splitBar(ln) + '</section>'; }
  if (hasRaw && hasPulse) b += '<div class="note">' + esc(t('dwidal_thali')) + '</div>';
  if (menu.rules && menu.rules.noGreen) b += '<div class="note info">' + esc(t('thali_green_note')) + '</div>';
  return backBar(t('meal_l'), dLong(top.date)) + '<main class="scroll gx" id="scroll">' + b + '</main>';
}
function viewRecipe(top) {
  var menu = top.date ? menuFor(top.date) : null, r = menu ? JJ.recipeFor(menu, top.id) : JJ.catalog.byId[top.id];
  if (!r) return backBar(t('recipe')) + '<main class="scroll gx" id="scroll"><div class="empty">' + esc(t('unknown_recipe')) + '</div></main>';
  var drop = [];
  if (menu) { ['b', 's', 'd'].forEach(function (m) { var x = menu.meals[m]; if (x && x.id === r.id) drop = x.drop || []; if (x && x.alt && x.alt.id === r.id) drop = x.alt.drop || []; }); (menu.meals.l.items || []).forEach(function (it) { if (it.id === r.id) drop = it.drop || []; if (it.alt && it.alt.id === r.id) drop = it.alt.drop || []; }); }
  var hh = menu ? (menu.hh || P.hh) : P.hh, f = hh / (r.serves || 4), skip = {}; drop.forEach(function (d) { skip[d] = true; });
  var comp = JJ.compileRecipe(Object.assign({}, r, {ings: r.ings.map(function (x) { return x.id + ':' + x.q + (x.opt ? '?' : ''); }).join(' ')}));
  var cu = r.cu && r.cu[0] && JJ.CUISINES[r.cu[0]];
  var mealKey = r.meal === 'l' ? (JJ.SLOT_NAMES[r.comp] ? nm(JJ.SLOT_NAMES[r.comp]) : t('meal_l')) : t('meal_' + r.meal);
  var b = '<div class="rhero mt-' + r.meal + '">' + plate(r, 140) + '</div><h1 class="h1 rname">' + esc(rName(r)) + '</h1>';
  if (r.orig) b += '<p class="origname">' + esc(t('original_name')) + ': ' + esc(r.orig) + '</p>';
  if (LANG !== 'en') b += '<p class="origname">' + esc(r.en) + '</p>';
  b += '<div class="badges"><span class="badge b-ok">' + ic('check') + esc(t('level_a')) + '</span>' + (JJ.levelB(comp) ? '<span class="badge b-ok">' + ic('check') + esc(t('level_b')) + '</span>' : '<span class="badge b-plain">' + esc(t('level_b_no')) + '</span>') +
    (comp.tags.leafy ? '<span class="badge b-plain">' + ic('leaf') + esc(t('has_leafy')) + '</span>' : '<span class="badge b-warn">' + ic('noleaf') + esc(t('aatham_safe')) + '</span>') +
    (!comp.tags.green ? '<span class="badge b-warn">' + esc(t('green_free')) + '</span>' : '') +
    '<span class="badge b-plain">' + esc(mealKey) + '</span>' + (cu ? '<span class="badge b-plain">' + esc(nm(cu)) + '</span>' : '') + '</div>';
  b += '<div class="nut"><div><b>' + (r.prep || 0) + '</b><small>' + esc(t('prep_min')) + '</small></div><div><b>' + (r.cook || 0) + '</b><small>' + esc(t('cook_min')) + '</small></div><div><b>' + hh + '</b><small>' + esc(t('serves')) + '</small></div><div><b>' + (r.serves || 4) + '</b><small>' + esc(t('base_serves')) + '</small></div></div>';
  var rn = JJ.recipeNutrition(r, drop);
  b += '<section class="card glass"><h3>' + esc(t('per_serving')) + '</h3>' + nutriGrid(rn) + splitBar(rn) + '</section>';
  if (!JJ.levelB(comp)) b += '<p class="fine">' + esc(t('level_b_why', {list: JJ.parvaBlockers(comp).map(ingName).join(', ')})) + '</p>';
  if (drop.length) b += '<div class="note">' + esc(t('left_out_today', {list: drop.map(ingName).join(', ')})) + '</div>';
  if (r.fromSnapshot) b += '<div class="note info">' + esc(t('snapshot_note')) + '</div>';
  var alg = Object.keys(comp.tags.alg).filter(function (a) { return (P.allergies || []).indexOf(a) >= 0; });
  if (alg.length) b += '<div class="alert">' + esc(t('allergy_alert', {list: alg.map(function (a) { return nm(JJ.ALLERGENS[a]); }).join(', ')})) + '</div>';
  b += '<h2 class="h2">' + esc(t('ingredients')) + '<span>' + esc(t('for_members', {n: hh})) + '</span></h2><ul class="ings">' +
    r.ings.filter(function (x) { return !skip[x.id]; }).map(function (x) { var g = JJ.ING[x.id] || {}; return '<li><span>' + esc(ingName(x.id)) + (g.L ? '<span class="leafy-tag">' + esc(t('leafy')) + '</span>' : '') + (x.opt ? ' <span class="tag">' + esc(t('optional')) + '</span>' : '') + '</span><b>' + esc(qtyText(x.id, x.q * f)) + kitchenQty(x.id, x.q * f) + '</b></li>'; }).join('') + '</ul>';
  var pcs = JJ.breadPieces(r, f);
  if (pcs) b += '<p class="note info">' + esc(t('makes_n', {n: pcs})) + '</p>';
  var steps = r.steps.map(function (st) { return JJ.renderStep(st, LANG, JJ.ING, skip); }).filter(Boolean);
  b += '<h2 class="h2">' + esc(t('method')) + '</h2><ol class="steps">' + steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol>';
  var src = r.src || JJ.db.get('recipe_sources', r.id);
  b += '<h2 class="h2">' + esc(t('source')) + '</h2><div class="card glass"><div class="kv"><b>' + esc(t('recipe_id')) + '</b><span>' + esc(r.id) + '</span><b>' + esc(t('source')) + '</b><span>' + esc(src ? src.name : '—') + '</span><b>URL</b><span>' + (src && src.url ? '<a href="' + esc(src.url) + '" target="_blank" rel="noopener">' + esc(src.url) + '</a>' : esc(t('no_url'))) + '</span><b>' + esc(t('review')) + '</b><span>' + esc(src && src.verified ? t('verified') : t('auto_checked')) + '</span></div></div>';
  return backBar(mealKey, top.date ? dLong(top.date) : t('recipe_library')) + '<main class="scroll gx" id="scroll">' + b + '</main>';
}

/* ---------------- Calendar ---------------- */
/* labels for a special day: the Parva Tithi name(s) and what is restricted */
function dayTags(p) {
  var r = JJ.dayRules(p, P), out = [];
  r.parvaKeys.forEach(function (k) { out.push(t(k)); });
  if (r.parva) out.push(t('parva_no_veg'));
  else if (r.noLeafy) { if (!r.parvaKeys.length) out.push(t(p.aatham ? 'aatham' : 'chaudas')); out.push(t('pr_leafy')); }
  return out;
}
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
    var p = pan(d), dr = JJ.dayRules(p, P), sp = dr.parva || p.aatham || p.chaudas, day = +d.slice(8);
    var st = d < P.created && !JJ.db.get('menu_history', d) ? 'none' : d <= td ? (JJ.db.get('menu_history', d) ? 'hist' : 'hist') : (JJ.db.get('daily_menus', d) && JJ.db.get('daily_menus', d).pv === P.version ? 'plan' : 'prev');
    if (sp || p.shuklaPancham || p.observances.length) specials.push([d, p]);
    var lab = dr.parvaKeys.length ? t(dr.parvaKeys[0] + '_s') : p.aatham ? t('aatham') : p.chaudas ? t('chaudas') : (p.t === 15 ? t('punam_s') : p.t === 30 ? t('amas_s') : t(p.paksha === 'S' ? 'sh_s' : 'kr_s') + p.n);
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
  b += '<div class="legend"><span><i style="background:var(--crimson)"></i>' + esc(t('today')) + '</span><span><i style="background:var(--saffron)"></i>' + esc(t((P.obsProfile || 'strict') === 'strict' ? 'legend_parva' : 'aatham_chaudas')) + '</span><span><i style="background:var(--navy)"></i>' + esc(t('status_hist')) + '</span><span><i style="background:var(--green)"></i>' + esc(t('status_plan')) + '</span><span><i style="background:var(--line)"></i>' + esc(t('status_prev')) + '</span></div>';
  b += '<div class="calwrap">' + g + '</div>';
  if (isFuture || isCur) {
    var info = saved ? t('month_saved', {date: dShort(JJ.tz.isoOf(saved.generatedAt, city().tz))}) : t('month_not_saved');
    b += '<div class="card glass"><h3>' + esc(t('month_plan')) + '</h3><p class="fine" style="margin:0 0 10px">' + esc(info) + '</p><button class="btn primary" data-a="genmonth" data-v="' + m + '">' + esc(saved ? t('regenerate_month') : t('save_month')) + '</button></div>';
  }
  b += '<h2 class="h2">' + esc(t('special_days')) + '<span>' + specials.length + '</span></h2><div class="splist">' + specials.map(function (x) {
    var d = x[0], p = x[1], parts = [];
    parts = parts.concat(dayTags(p));
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
    parts = parts.concat(dayTags(q));
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
/* Pantry: staples the household already has at home (dals, flours, spices, oil...). They are kept out of
   the list to buy and shown apart as "Already at home", until unticked in the pantry. */
var PANTRY_GROUPS = ['grain', 'pulse', 'spice', 'nuts', 'pantry', 'dairy'];
function pantry() { return JJ.db.get('meta', 'pantry') || {key: 'pantry', have: {}}; }
function splitPantry(groups) {
  var have = pantry().have, home = [];
  var buy = groups.map(function (g) { return {group: g.group, items: g.items.filter(function (it) { if (have[it.id]) { home.push(it); return false; } return true; })}; })
    .filter(function (g) { return g.items.length; });
  return {buy: buy, home: home};
}
function groceryView(allGroups, listId, title, sub, saved) {
  var sp = splitPantry(allGroups), groups = sp.buy;
  var tk = ticks().v[listId] || {}, total = 0, done = 0;
  groups.forEach(function (g) { g.items.forEach(function (it) { total++; if (tk[it.id]) done++; }); });
  var pct = total ? Math.round(done * 100 / total) : 0;
  var b = '<div class="greet-row title-row"><h1 class="h1" style="margin:0">' + esc(title) + '</h1><button class="btn small wa" data-a="wa" data-v="list" data-list="' + esc(listId) + '">' + WA_ICON + esc(t('share_whatsapp')) + '</button></div><p class="sub">' + esc(sub) + '</p>';
  b += '<div class="gtop"><div class="ring" id="ring" style="--p:' + pct + '"><span id="ringtxt">' + pct + '%</span></div><div class="tinfo"><b id="gcount">' + esc(t('items_done', {d: done, n: total})) + '</b><small>' + esc(t('grocery_note')) + '</small></div></div>';
  b += '<div class="gactions"><button class="gbtn" data-a="copy" data-v="' + esc(listId) + '">' + ic('copy') + esc(t('copy_list')) + '</button><button class="gbtn" data-a="clearticks" data-v="' + esc(listId) + '">' + ic('undo') + esc(t('clear_ticks')) + '</button><button class="gbtn" data-a="push" data-v="pantry">🏠 ' + esc(t('pantry_title')) + '</button></div>';
  groups.forEach(function (g) {
    b += '<section class="gsec"><h3>' + esc(t('grp_' + g.group)) + '</h3>' + g.items.map(function (it) {
      var a = JJ.buyAmount(it.amt, it.unit);
      return '<label class="gi"><input type="checkbox" data-tick="' + it.id + '" data-list="' + esc(listId) + '"' + (tk[it.id] ? ' checked' : '') + '><span class="gn">' + esc(ingName(it.id)) + '</span><span class="gq">' + a.v + ' ' + esc(t('u_' + a.u)) + '</span></label>';
    }).join('') + '</section>';
  });
  if (sp.home.length) b += '<details class="card glass fold"><summary>🏠 ' + esc(t('pantry_at_home', {n: sp.home.length})) + '</summary><p class="fine" style="margin:0 0 6px">' + esc(t('pantry_at_home_note')) + '</p>' +
    sp.home.map(function (it) { var a = JJ.buyAmount(it.amt, it.unit); return '<div class="gi" style="cursor:default"><span class="gn">' + esc(ingName(it.id)) + '</span><span class="gq">' + a.v + ' ' + esc(t('u_' + a.u)) + '</span></div>'; }).join('') + '</details>';
  b += '<p class="fine">' + esc(t('rounded_note')) + '</p>';
  return b;
}
/* Pantry screen: tick the staples you already have; they leave the shopping list. */
function viewPantry() {
  var have = pantry().have, by = {};
  JJ.ING_ROWS.forEach(function (row) { var g = JJ.ING[row[0]]; if (!g || g.banned || g.id === 'water' || PANTRY_GROUPS.indexOf(g.cat) < 0) return; (by[g.cat] = by[g.cat] || []).push(g); });
  var n = Object.keys(have).length;
  var b = '<p class="sub" style="margin-top:8px">' + esc(t('pantry_sub')) + '</p><p class="fine">' + esc(t('pantry_count', {n: n})) + (n ? ' · <button class="linkbtn" data-a="pantryclear" style="padding:0">' + esc(t('pantry_clear')) + '</button>' : '') + '</p>';
  PANTRY_GROUPS.forEach(function (c) {
    var list = (by[c] || []).sort(function (a, b2) { return ingName(a.id).localeCompare(ingName(b2.id)); }); if (!list.length) return;
    b += '<section class="gsec"><h3>' + esc(t('grp_' + c)) + '</h3>' + list.map(function (g) {
      return '<label class="gi"><input type="checkbox" data-pantry="' + g.id + '"' + (have[g.id] ? ' checked' : '') + '><span class="gn">' + esc(ingName(g.id)) + '</span></label>';
    }).join('') + '</section>';
  });
  return backBar(t('pantry_title')) + '<main class="scroll gx" id="scroll">' + b + '</main>';
}
/* Separate guidance for Parva Tithi days: which dates, and exactly what those days need (never fresh vegetables) */
function parvaShopping(menus) {
  var pm = menus.filter(function (m) { return m.rules && m.rules.parva; });
  if (!pm.length) return '';
  var g = JJ.grocery(pm), n = 0; g.forEach(function (x) { n += x.items.length; });
  return '<details class="card glass fold parva-shop"><summary><span class="ficon">' + ic('noleaf') + '</span><span class="mtxt grow"><b>' + esc(t('parva_shop_title', {n: pm.length})) + '</b><small>' + esc(pm.map(function (m) { return dShort(m.date) + ' ' + (m.rules.parvaKeys || []).map(function (k) { return t(k); }).join(', '); }).join(' · ')) + '</small></span>' + ic('next', 'chev fold-chev') + '</summary>' +
    '<p class="fine" style="margin:0 0 8px">' + esc(t('parva_shop_note')) + '</p>' +
    g.map(function (gr) { return '<div class="gsec"><h3>' + esc(t('grp_' + gr.group)) + '</h3>' + gr.items.map(function (it) { var a = JJ.buyAmount(it.amt, it.unit); return '<div class="gi" style="cursor:default"><span class="gn">' + esc(ingName(it.id)) + '</span><span class="gq">' + a.v + ' ' + esc(t('u_' + a.u)) + '</span></div>'; }).join('') + '</div>'; }).join('') + '</details>';
}
function viewShop() {
  var r = rangeFor(ui.gRange), menus = menusIn(r[0], r[1]), groups = JJ.grocery(menus);
  var listId = ui.gRange + ':' + r[0];
  if (ui.gRange === 'week') JJ.db.put('grocery_lists', {id: 'week:' + r[0], from: r[0], to: r[1], createdAt: Date.now(), hh: P.hh, groups: groups});
  var seg = '<div class="seg" role="group">' + [['week', 'g_week'], ['month', 'g_month'], ['next', 'g_next']].map(function (x) { return '<button data-a="grange" data-v="' + x[0] + '" aria-pressed="' + (ui.gRange === x[0]) + '">' + esc(t(x[1])) + '</button>'; }).join('') + '</div>';
  var b = seg + parvaShopping(menus) + festiveShopping(menus) + (ui.gRange === 'week' ? vegTrips(menus) : '') + groceryView(groups, listId, t('grocery_title'), dShort(r[0]) + ' – ' + dShort(r[1]) + ' · ' + t('for_members', {n: P.hh}) + ' · ' + t('days_n', {n: menus.length}));
  b += '<p class="fine" style="text-align:center"><button class="linkbtn" data-a="push" data-v="glists">' + esc(t('saved_lists')) + '</button></p>';
  return brandBar() + '<main class="scroll gx" id="scroll">' + b + '</main>';
}
/* Fresh vegetables stay fresh for 3–4 days, so the week's vegetables and fruit are split into two market trips. */
function vegTrips(menus) {
  if (menus.length < 5) return '';
  var cut = Math.ceil(menus.length * 3 / 7), parts = [menus.slice(0, cut), menus.slice(cut)];
  var body = parts.map(function (ms, i) {
    var items = [];
    JJ.grocery(ms).forEach(function (g) { if (g.group === 'veg' || g.group === 'fruit') items = items.concat(g.items); });
    if (!items.length) return '';
    return '<h3>' + esc(t('trip_n', {n: i + 1, from: dShort(ms[0].date), to: dShort(ms[ms.length - 1].date)})) + '</h3>' +
      items.map(function (it) { var a = JJ.buyAmount(it.amt, it.unit); return '<div class="gi" style="cursor:default"><span class="gn">' + esc(ingName(it.id)) + '</span><span class="gq">' + a.v + ' ' + esc(t('u_' + a.u)) + '</span></div>'; }).join('');
  }).join('');
  return body ? '<details class="fold card glass"><summary>🧺 ' + esc(t('veg_trips')) + '</summary>' + body + '</details>' : '';
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
  var s = '🪷 JainJoy · ' + t('grocery_title') + '\n', sp = splitPantry(groups);
  function line(it) { var a = JJ.buyAmount(it.amt, it.unit); return '- ' + ingName(it.id) + ': ' + a.v + ' ' + t('u_' + a.u) + '\n'; }
  sp.buy.forEach(function (g) { s += '\n🛒 ' + t('grp_' + g.group) + '\n'; g.items.forEach(function (it) { s += line(it); }); });
  // pantry staples are not bought, but listed so the family can check the stock is enough
  if (sp.home.length) { s += '\n🏠 ' + t('pantry_at_home', {n: sp.home.length}) + '\n'; sp.home.forEach(function (it) { s += line(it); }); }
  return s + '\nhttps://bijaldvyas-ai.github.io/JainJoy/';
}

/* ---------------- Choghadiya ---------------- */
function viewChog() {
  var td = today(), iso = ui.chogDate || td, list = JJ.choghadiya(iso, city()), now = Date.now();
  var nav = '<div class="cal-nav"><button class="icon-btn" data-a="chogday" data-v="-1" aria-label="' + esc(t('prev_day')) + '">' + ic('back') + '</button><h1 class="h1" style="font-size:22px">' + esc(dLong(iso)) + '</h1><button class="icon-btn" data-a="chogday" data-v="1" aria-label="' + esc(t('next_day')) + '">' + ic('next') + '</button></div>';
  var b = '<p class="eyebrow">' + esc(t('tab_choghadiya')) + '</p>' + nav + '<p class="sub">' + esc(cityLabel()) + ' · ' + esc(t('chog_sub')) + '</p>';
  var cur = list.filter(function (c) { return now >= c.start && now < c.end; })[0];
  if (cur) b += '<div class="card glass chog-now chog-' + cur.q + '"><h3>' + esc(t('chog_now')) + '</h3><b>' + esc(t('chog_' + cur.k)) + '</b> · ' + esc(t('chog_q_' + cur.q)) + '<p class="fine" style="margin:4px 0 0">' + esc(hm(cur.start) + ' – ' + hm(cur.end)) + ' · <span data-until="' + cur.end + '">' + until(cur.end) + '</span></p></div>';
  ['day', 'night'].forEach(function (part) {
    b += '<h2 class="h2">' + esc(t('chog_' + part)) + '<span>' + esc(part === 'day' ? t('sunrise') + ' ' + hm(list[0].start) : t('sunset') + ' ' + hm(list[8].start)) + '</span></h2><div class="list">';
    list.filter(function (c) { return c.part === part; }).forEach(function (c) {
      var isNow = cur === c;
      b += '<div class="lrow chog-row chog-' + c.q + (isNow ? ' now' : '') + '" style="cursor:default"><span class="chog-dot"></span><span class="mtxt grow"><b>' + esc(t('chog_' + c.k)) + '</b><small>' + esc(t('chog_use_' + c.k)) + '</small></span><span class="chog-time">' + esc(hm(c.start) + ' – ' + hm(c.end)) + '</span><span class="tag ' + (c.q === 'good' ? 'ok' : c.q === 'bad' ? 'bad' : 'warn') + '">' + esc(t('chog_q_' + c.q)) + '</span></div>';
    });
    b += '</div>';
  });
  b += '<div class="note info">' + esc(t('chog_note')) + '</div>';
  return brandBar() + '<main class="scroll gx" id="scroll">' + b + '</main>';
}

/* ---------------- Profile (tab) ---------------- */
function viewProfileHome() {
  function row(a, v, i, l, s) { return '<button class="lrow" data-a="' + a + '" data-v="' + v + '"><span class="ficon">' + ic(i) + '</span><span class="mtxt grow"><b>' + esc(t(l)) + '</b><small>' + esc(t(s)) + '</small></span>' + ic('next', 'chev') + '</button>'; }
  var c = city(), st = P.country === 'IN' && JJ.STATES.IN[P.state] ? nm(JJ.STATES.IN[P.state]) : nm(JJ.COUNTRIES[P.country] || {en: ''});
  var ex = (P.allergies || []).map(function (a) { return nm(JJ.ALLERGENS[a]); }).concat((P.exclude || []).map(ingName)).join(', ') || t('none');
  var b = '<h1 class="h1" style="margin-top:6px">' + esc(t('tab_profile')) + '</h1>' + accountCard() +
    '<div class="card glass"><div class="kv">' +
    '<b>' + esc(t('location')) + '</b><span>' + esc(cityLabel(c) + (st ? ', ' + st : '')) + '</span>' +
    '<b>' + esc(t('cuisine')) + '</b><span>' + esc(nm(JJ.CUISINES[P.cuisine] || JJ.CUISINES.gen)) + '</span>' +
    '<b>' + esc(t('household')) + '</b><span>' + esc(t('for_members', {n: P.hh})) + '</span>' +
    '<b>' + esc(t('allergies_ex')) + '</b><span>' + esc(ex) + '</span>' +
    '<b>' + esc(t('observances')) + '</b><span>' + esc(t('parva_locked') + (P.obsProfile === 'custom' && P.greenRule !== 'none' ? ' + ' + t('green_' + P.greenRule) : '') + ' · ' + t(P.parvaFruit ? 'parva_fruit_no' : 'parva_fruit_ok')) + '</span>' +
    '<b>' + esc(t('chauvihar')) + '</b><span>' + esc(P.chauvihar ? t('chauvihar_before', {m: P.chauvihar}) : t('chauvihar_at')) + '</span>' +
    '</div><button class="btn primary" style="margin-top:12px;width:100%" data-a="push" data-v="profile">' + esc(t('edit_profile_btn')) + '</button></div>';
  b += '<div class="card glass"><h3>' + esc(t('language')) + '</h3>' + langChip() + '</div><div class="list">' +
    row('push', 'library', 'book', 'recipe_library', 'recipe_library_sub') +
    row('push', 'glossary', 'leaf', 'glossary', 'glossary_sub') + (!JJ.account.configured() || JJ.account.isAdmin ? row('push', 'admin', 'edit', 'admin', 'admin_sub') : '') +
    row('push', 'glists', 'cart', 'saved_lists', 'saved_lists_sub') + row('push', 'about', 'db', 'about', 'about_sub') + '</div>';
  b += '<button class="btn-danger" data-a="resetask">' + esc(t('reset')) + '</button>';
  return brandBar() + '<main class="scroll gx" id="scroll">' + b + '</main>';
}
/* ---------------- customer account (optional) ---------------- */
function accountCard() {
  if (!JJ.account.configured()) return '';
  var u = JJ.account.user;
  if (u) {
    var a = JJ.account.access();
    var plan = a.state === 'admin' ? t('plan_admin') : a.state === 'paid' ? t('sub_active_until', {date: dLong(new Date(a.until).toISOString().slice(0, 10))}) : a.state === 'trial' ? t('trial_days_left', {n: a.daysLeft}) : t('plan_expired');
    return '<div class="card glass acc-card"><span class="ficon">👤</span><span class="mtxt grow"><b>' + esc(u.name || '') + '</b><small>' + esc(t('acc_signed_in', {phone: u.phone || ''})) + '</small><small class="plan-line">' + esc(plan) + '</small></span><button class="btn small" data-a="logout">' + esc(t('acc_logout')) + '</button>' +
      '<div class="acc-actions">' + (a.state === 'trial' || a.state === 'paid' ? '<button class="btn small primary" data-a="push" data-v="subscribe">' + esc(t(a.state === 'paid' ? 'sub_manage' : 'subscribe_short', {price: rupees(JJ.CONFIG.price)})) + '</button>' : '') +
      (a.state !== 'admin' ? '<button class="btn small" data-a="push" data-v="invite">🎁 ' + esc(t('invite_title')) + '</button>' : '') +
      (installEvt ? '<button class="btn small" data-a="install">📲 ' + esc(t('install_app')) + '</button>' : '') + '</div>' +
      '<p class="fine legal-links"><button class="linkbtn" data-a="legal" data-v="privacy">' + esc(t('legal_privacy')) + '</button> · <button class="linkbtn" data-a="legal" data-v="terms">' + esc(t('legal_terms')) + '</button> · <button class="linkbtn" data-a="legal" data-v="refund">' + esc(t('legal_refund')) + '</button>' +
      (a.state !== 'admin' ? ' · <button class="linkbtn danger-link" data-a="deleteme">' + esc(t('delete_account')) + '</button>' : '') + '</p></div>';
  }
  return '<div class="card glass acc-card"><span class="ficon">👤</span><span class="mtxt grow"><b>' + esc(t('acc_invite_title')) + '</b><small>' + esc(t('acc_invite_sub')) + '</small></span>' +
    '<div class="row" style="gap:6px"><button class="btn small primary" data-a="acc" data-v="signup">' + esc(t('acc_signup')) + '</button><button class="btn small" data-a="acc" data-v="login">' + esc(t('acc_login')) + '</button></div></div>';
}
/* one gentle invitation on Today; "Not now" hides it for good */
function inviteCard() {
  if (!JJ.account.configured() || JJ.account.user) return '';
  try { if (localStorage.getItem('jainjoy.inviteDone')) return ''; } catch (e) { return ''; }
  return '<section class="card glass acc-invite"><b>👤 ' + esc(t('acc_invite_title')) + '</b><p class="fine" style="margin:4px 0 8px">' + esc(t('acc_invite_sub')) + '</p>' +
    '<div class="row" style="gap:8px"><button class="btn small primary" data-a="acc" data-v="signup">' + esc(t('acc_signup')) + '</button><button class="btn small" data-a="acc" data-v="login">' + esc(t('acc_login')) + '</button><button class="linkbtn" data-a="invitedone">' + esc(t('acc_not_now')) + '</button></div></section>';
}
/* ---------------- first page: Sign Up (account + household) and Sign In ---------------- */
function viewLoading() { return '<main class="scroll gx" id="scroll"><div class="hero-brand" style="margin-top:18vh">' + lotus(72) + WORDMARK + '<p class="sub">' + esc(t('loading')) + '</p></div></main>'; }
function accErr(field) { var e = ui.acc.errs.filter(function (x) { return x.field === field; })[0]; return e ? '<small class="ferr" role="alert">' + esc(t(e.key)) + '</small>' : ''; }
function accInput(id, type, label, extra) {
  var bad = ui.acc.errs.some(function (x) { return x.field === id; });
  return '<label class="field"><span class="flabel">' + esc(t(label)) + '</span><input class="input' + (bad ? ' bad' : '') + '" id="acc-' + id + '" type="' + type + '" value="' + esc(ui.acc.f[id] || '') + '"' + (extra || '') + '>' + accErr(id) + '</label>';
}
function accGeneral() { var g = ui.acc.errs.filter(function (x) { return !x.field; })[0]; return g ? '<div class="alert" role="alert">' + esc(t(g.key)) + '</div>' : ''; }
function viewGate() {
  if (ui.acc.mode === 'signin') {
    var b = '<div class="hero-brand">' + lotus(72) + WORDMARK + '<h1 class="h1">' + esc(t('signin_title')) + '</h1><p class="sub" style="margin:0">' + esc(t('acc_login_sub')) + '</p></div>' + (ui.acc.notice && !ui.acc.errs.length ? '<div class="note ok">' + esc(t(ui.acc.notice)) + '</div>' : '') + accGeneral() +
      '<form id="signin-form" class="card glass" autocomplete="on" novalidate>' +
      accInput('phone', 'tel', 'acc_phone', ' inputmode="numeric" autocomplete="tel-national" maxlength="14" placeholder="98XXXXXXXX"') +
      accInput('password', 'password', 'acc_password', ' autocomplete="current-password"') +
      '<button class="btn primary" type="submit" style="width:100%;margin-top:6px"' + (ui.acc.busy ? ' disabled' : '') + '>' + esc(t(ui.acc.busy ? 'acc_wait' : 'acc_login')) + '</button></form>' +
      '<p class="fine" style="text-align:center"><button class="linkbtn" data-a="forgot">' + esc(t('forgot_pw')) + '</button></p>' +
      (JJ.account.hasAccountHere ? '' : '<p class="fine" style="text-align:center">' + esc(t('no_account')) + ' <button class="linkbtn" data-a="gatemode" data-v="signup">' + esc(t('acc_signup')) + '</button></p>');
    return '<main class="scroll gx" id="scroll">' + b + '</main>';
  }
  if (!ui.loc) autoLocate();
  return viewProfile('signup');
}
/* Location is detected, never asked: GPS, then the nearest of the app's cities (its state gives the cuisine).
   Only if the phone gives no location does the city picker appear. */
function autoLocate() {
  ui.loc = {state: 'busy'};
  function fail() { ui.loc = {state: 'failed'}; if (draft) openField = 'city'; render(); }
  // GPS refused or unavailable: estimate the city from the internet connection instead of asking
  function byNetwork() {
    fetch('https://get.geojs.io/v1/ip/geo.json').then(function (r) { return r.json(); }).then(function (j) {
      var la = parseFloat(j.latitude), lo = parseFloat(j.longitude);
      if (isNaN(la) || isNaN(lo)) return fail();
      useSpot(la, lo, true);
    }).catch(fail);
  }
  if (!navigator.geolocation) return byNetwork();
  navigator.geolocation.getCurrentPosition(function (pos) { useSpot(pos.coords.latitude, pos.coords.longitude, false); }, byNetwork, {timeout: 12000, maximumAge: 6e5});
  function useSpot(la, lo, rough) {
    var best = null, bd = Infinity;
    Object.keys(JJ.CITIES).forEach(function (k) {
      var c = JJ.CITIES[k], dla = (c.lat - la) * Math.PI / 180, dlo = (c.lon - lo) * Math.PI / 180;
      var a = Math.pow(Math.sin(dla / 2), 2) + Math.cos(la * Math.PI / 180) * Math.cos(c.lat * Math.PI / 180) * Math.pow(Math.sin(dlo / 2), 2), km = 12742 * Math.asin(Math.sqrt(a));
      if (km < bd) { bd = km; best = k; }
    });
    // a network estimate is only city-level: use it when a listed city is near, otherwise let the person choose
    if (rough && bd > 150) return fail();
    if (!draft) draft = blankDraft();
    if (best) pickCity(best);
    // GPS far from every listed city: keep the exact spot for sunrise times, with the nearest city's state and cuisine
    if (best && bd > 40 && !rough) { var nc = JJ.CITIES[best]; draft.custom = {name: (nc[LANG] || nc.en) + ' ' + t('area'), en: nc.en + ' area', lat: la, lon: lo, tz: JJ.tz.deviceTz()}; draft.cityId = ''; }
    ui.loc = {state: 'ok'}; openField = null; render();
  }
}
function locRow(d) {
  var c = d.custom || JJ.CITIES[d.cityId], s = ui.loc ? ui.loc.state : 'busy';
  var txt = c ? (c[LANG] || c.en || c.name) + (d.state ? ', ' + stateName(d.country, d.state) : '') : t('loc_detecting');
  return '<section class="frow done"><div class="frow-h static"><span class="ficon">' + ic('pin') + '</span><span class="ftext"><b>' + esc(t('location')) + '</b><small>' + esc(c ? t('loc_detected', {place: txt}) : s === 'busy' ? t('loc_detecting') : t('loc_failed')) + '</small></span>' + (c ? ic('check') : '') + '</div></section>';
}
function signupSubmit() {
  var a = ui.acc; if (a.busy) return;
  ['name', 'phone', 'password', 'confirm'].forEach(function (k) { var el = document.getElementById('acc-' + k); if (el) a.f[k] = el.value; });
  var errs = JJ.account.validate(a.f, true);
  if (errs.length || !ready(draft)) { a.errs = errs.length ? errs : [{field: '', key: 'complete_fields'}]; render(); var sc = document.getElementById('scroll'); if (sc) sc.scrollTop = 0; return; }
  a.busy = true; a.errs = []; render();
  JJ.account.signUp(a.f).then(function (r) {
    a.busy = false;
    if (!r.ok) { a.errs = r.errors || [{field: '', key: 'acc_err_generic'}]; render(); var sc = document.getElementById('scroll'); if (sc) sc.scrollTop = 0; return; }
    var name = (JJ.account.user || {}).name || '';
    ui.acc = {mode: 'signin', f: {}, errs: [], busy: false};
    if (P) { // an existing household on this phone keeps its plan and history
      var changed = JSON.stringify(fromProfile(P)) !== JSON.stringify(draft), keep = {userId: 'local', created: P.created, planFrom: P.planFrom, version: P.version, seed: P.seed};
      if (changed) { P = Object.assign({}, draft, keep); delete P.cuisineSet; applyProfileChange(); }
      draft = null; openField = null; stack = []; tab = 'today';
    } else createPlan();
    // the account is made: save the household with it, then ask the person to sign in with phone + password
    var phone = JJ.account.cleanPhone(a.f.phone);
    JJ.account.saveProfile(P).then(function () { return JJ.account.signOut(); }).then(function () {
      ui.acc = {mode: 'signin', f: {phone: phone}, errs: [], busy: false, notice: 'acc_created'}; stack = []; render();
    });
  }, function () { a.busy = false; a.errs = [{field: '', key: 'acc_err_offline'}]; render(); });
}
function signinSubmit() {
  var a = ui.acc; if (a.busy) return;
  ['phone', 'password'].forEach(function (k) { var el = document.getElementById('acc-' + k); if (el) a.f[k] = el.value; });
  a.busy = true; a.errs = []; render();
  JJ.account.signIn(a.f).then(function (r) {
    if (!r.ok) { a.busy = false; a.errs = r.errors || [{field: '', key: 'acc_err_generic'}]; render(); return; }
    return JJ.account.loadProfile().then(function (saved) {
      ui.acc = {mode: 'signin', f: {}, errs: [], busy: false};
      if (saved && !P) { P = Object.assign({}, saved, {userId: 'local'}); saveProfile(); JJ.db.put('users', {id: 'local', createdAt: Date.now()}); lastDay = today(); freezeHistory(); }
      else if (P && !saved) JJ.account.saveProfile(P);
      stack = []; tab = 'today'; render(); toast(t('acc_welcome_back', {name: (JJ.account.user || {}).name || ''}));
    });
  }, function () { a.busy = false; a.errs = [{field: '', key: 'acc_err_offline'}]; render(); });
}
/* turn the filled-in draft into the household profile and open today's menu */
function createPlan() {
  var tz = (draft.custom || JJ.CITIES[draft.cityId]).tz, td = JJ.todayISO(tz);
  P = Object.assign({}, draft, {userId: 'local', created: td, planFrom: td, version: 1, seed: hash(String(Date.now())) % 1000});
  delete P.cuisineSet; JJ.db.put('users', {id: 'local', createdAt: Date.now()}); saveProfile();
  JJ.db.put('meta', {key: 'frozen', upto: null}); draft = null; openField = null; tab = 'today'; stack = []; freezeHistory(); ui.showcase = true; ui.showcaseDone = false;
}
function viewAccount() {
  var a = ui.acc, su = a.mode === 'signup', f = a.f;
  function err(field) { var e = a.errs.filter(function (x) { return x.field === field; })[0]; return e ? '<small class="ferr" role="alert">' + esc(t(e.key)) + '</small>' : ''; }
  function inp(id, type, label, extra) { return '<label class="field"><span class="flabel">' + esc(t(label)) + '</span><input class="input' + (a.errs.some(function (x) { return x.field === id; }) ? ' bad' : '') + '" id="acc-' + id + '" type="' + type + '" value="' + esc(type === 'password' ? '' : f[id] || '') + '"' + (extra || '') + '>' + err(id) + '</label>'; }
  var general = a.errs.filter(function (x) { return !x.field; })[0];
  var b = '<div class="seg" role="group" style="margin-top:10px"><button data-a="accmode" data-v="signup" aria-pressed="' + su + '">' + esc(t('acc_signup')) + '</button><button data-a="accmode" data-v="login" aria-pressed="' + !su + '">' + esc(t('acc_login')) + '</button></div>' +
    '<p class="sub">' + esc(t(su ? 'acc_signup_sub' : 'acc_login_sub')) + '</p>' +
    (general ? '<div class="alert" role="alert">' + esc(t(general.key)) + '</div>' : '') +
    '<form id="acc-form" class="card glass" autocomplete="on" novalidate>' +
    (su ? inp('name', 'text', 'acc_name', ' autocomplete="name" maxlength="80"') : '') +
    inp('phone', 'tel', 'acc_phone', ' inputmode="numeric" autocomplete="tel-national" maxlength="14" placeholder="98XXXXXXXX"') +
    inp('password', 'password', 'acc_password', ' autocomplete="' + (su ? 'new-password' : 'current-password') + '"') +
    (su ? '<p class="fine" style="margin:-4px 0 8px">' + esc(t('acc_pw_rule')) + '</p>' + inp('confirm', 'password', 'acc_confirm', ' autocomplete="new-password"') : '') +
    '<button class="btn primary" type="submit" style="width:100%;margin-top:6px"' + (a.busy ? ' disabled' : '') + '>' + esc(t(a.busy ? 'acc_wait' : su ? 'acc_signup' : 'acc_login')) + '</button></form>' +
    '<p class="fine" style="text-align:center">' + esc(t('acc_privacy')) + '</p>';
  return backBar(t(su ? 'acc_signup' : 'acc_login')) + '<main class="scroll gx" id="scroll">' + b + '</main>';
}
function submitAccount() {
  var a = ui.acc; if (a.busy) return;
  ['name', 'phone', 'password', 'confirm'].forEach(function (k) { var el = document.getElementById('acc-' + k); if (el) a.f[k] = el.value; });
  a.busy = true; a.errs = []; render();
  (a.mode === 'signup' ? JJ.account.signUp(a.f) : JJ.account.signIn(a.f)).then(function (r) {
    a.busy = false;
    if (r.ok) { var su = a.mode === 'signup'; a.f = {}; a.errs = []; stack.pop(); try { localStorage.setItem('jainjoy.inviteDone', '1'); } catch (e) {} render(); toast(t(su ? 'acc_welcome' : 'acc_welcome_back', {name: (JJ.account.user || {}).name || ''})); return; }
    a.errs = r.errors || [{field: '', key: 'acc_err_generic'}]; a.f.password = ''; a.f.confirm = ''; render();
  }, function () { a.busy = false; a.errs = [{field: '', key: 'acc_err_offline'}]; render(); });
}

/* ---------------- subscription: 7-day trial, then ₹199 for one year by UPI ---------------- */
function locked() { return JJ.account.configured() && !!JJ.account.user && JJ.account.access().state === 'expired'; }
function rupees(n) { return '₹' + n; }
function trialBanner() {
  if (!JJ.account.configured()) return '';
  var a = JJ.account.access();
  if (a.state !== 'trial' || a.daysLeft > 14) return ''; // a reminder only in the last two weeks of the free period
  return '<button class="trial-banner' + (a.daysLeft <= 2 ? ' soon' : '') + '" data-a="push" data-v="subscribe"><span>⏳ ' + esc(t(a.daysLeft === 1 ? 'trial_last_day' : 'trial_days_left', {n: a.daysLeft})) + '</span><b>' + esc(t('subscribe_short', {price: rupees(JJ.CONFIG.price)})) + ' ›</b></button>';
}
function upiLink() {
  var c = JJ.CONFIG, u = JJ.account.user || {};
  return 'upi://pay?pa=' + encodeURIComponent(c.upiId) + '&pn=' + encodeURIComponent(c.upiName || 'JainJoy') + '&am=' + c.price + '.00&cu=INR&tn=' + encodeURIComponent('JainJoy 1 year ' + (u.phone || ''));
}
var QR_LIB = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
function drawQr() {
  var box = document.getElementById('upi-qr'); if (!box || !JJ.CONFIG.upiId) return;
  function draw() { box.innerHTML = ''; try { new window.QRCode(box, {text: upiLink(), width: 200, height: 200, correctLevel: window.QRCode.CorrectLevel.M}); } catch (e) {} }
  if (window.QRCode) return draw();
  var s = document.createElement('script'); s.src = QR_LIB; s.onload = draw; document.head.appendChild(s);
}
function supportLink(msg) { var n = String(JJ.CONFIG.supportWhatsApp || '').replace(/\D/g, ''); return n ? 'https://wa.me/91' + n.slice(-10) + '?text=' + encodeURIComponent(msg) : ''; }
function viewPaywall(pushed) {
  var a = JJ.account.access(), c = JJ.CONFIG, u = JJ.account.user || {}, pays = ui.pays || [];
  var pending = pays.filter(function (p) { return p.status === 'pending'; })[0];
  var head = a.state === 'expired' ? t(a.wasPaid ? 'sub_expired_paid' : 'sub_trial_over', {n: c.trialDays}) : a.state === 'paid' ? t('sub_active_until', {date: dLong(new Date(a.until).toISOString().slice(0, 10))}) : t('trial_days_left', {n: a.daysLeft});
  var b = '<div class="hero-brand" style="margin-top:6px">' + lotus(56) + WORDMARK + '<h1 class="h1" style="font-size:24px">' + esc(head) + '</h1><p class="sub" style="margin:0">' + esc(t('sub_pitch')) + '</p></div>' +
    '<section class="card glass price-card"><div class="price"><b>' + esc(rupees(c.price)) + '</b><span>' + esc(t('per_year')) + '</span></div><ul class="tlist">' +
    ['sub_f1', 'sub_f2', 'sub_f3', 'sub_f4'].map(function (k) { return '<li>✓ ' + esc(t(k)) + '</li>'; }).join('') + '</ul></section>';
  if (a.state === 'paid') b += '<div class="note ok">' + esc(t('sub_thanks')) + '</div>';
  else if (!c.upiId) b += '<div class="alert">' + esc(t('sub_setup_pending')) + '</div>';
  else {
    b += '<section class="card glass pay-card"><h3>' + esc(t('pay_step1', {price: rupees(c.price)})) + '</h3><div id="upi-qr" class="upi-qr" aria-label="UPI QR code"></div>' +
      '<p class="fine" style="text-align:center;margin:6px 0">' + esc(c.upiName) + ' · ' + esc(c.upiId) + '</p>' +
      '<a class="btn primary" style="width:100%;text-align:center" href="' + esc(upiLink()) + '">' + esc(t('pay_open_app')) + '</a></section>';
    b += '<section class="card glass"><h3>' + esc(t('pay_step2')) + '</h3>' + (pending ?
      '<div class="note info">' + esc(t('pay_waiting', {utr: pending.utr})) + '</div><button class="btn small" data-a="paycheck">' + esc(t('pay_check')) + '</button>' :
      '<form id="pay-form" autocomplete="off" novalidate><label class="field"><span class="flabel">' + esc(t('pay_utr')) + '</span><input class="input' + (ui.payErr ? ' bad' : '') + '" id="pay-utr" inputmode="text" maxlength="40" placeholder="e.g. 431234567890"></label>' +
      (ui.payErr ? '<small class="ferr" role="alert">' + esc(t(ui.payErr)) + '</small>' : '') + '<p class="fine" style="margin:4px 0 8px">' + esc(t('pay_utr_help')) + '</p><button class="btn primary" type="submit" style="width:100%">' + esc(t('pay_submit')) + '</button></form>') + '</section>';
  }
  var rej = pays.filter(function (p) { return p.status === 'rejected'; })[0];
  if (rej && !pending && a.state !== 'paid') b += '<div class="alert">' + esc(t('pay_rejected', {utr: rej.utr})) + '</div>';
  var help = supportLink(t('help_msg_pay', {name: u.name || '', phone: u.phone || ''}));
  if (help) b += '<p class="fine" style="text-align:center"><a class="linkbtn" href="' + esc(help) + '" target="_blank" rel="noopener">' + esc(t('pay_help')) + '</a></p>';
  if (!pushed) b += '<p class="fine" style="text-align:center"><button class="linkbtn" data-a="logout">' + esc(t('acc_logout')) + '</button></p>';
  setTimeout(drawQr, 0);
  if (!ui.paysLoaded) { ui.paysLoaded = true; JJ.account.myPayments().then(function (p) { ui.pays = p; render(); }); }
  return (pushed ? backBar(t('subscribe_title')) : '') + '<main class="scroll gx" id="scroll">' + b + '</main>';
}
function submitPay() {
  var el = document.getElementById('pay-utr'); if (!el) return;
  JJ.account.submitPayment(el.value).then(function (r) {
    if (r.error) { ui.payErr = r.error; render(); return; }
    ui.payErr = null; toast(t('pay_sent'));
    JJ.account.myPayments().then(function (p) { ui.pays = p; render(); });
  });
}
/* while the subscription page is open, check every 30 s whether the admin has confirmed the payment */
setInterval(function () {
  if (!JJ.account.configured() || !JJ.account.user || !document.getElementById('upi-qr') && !document.querySelector('[data-a="paycheck"]')) return;
  var before = JJ.account.access().state;
  JJ.account.refresh().then(function () { JJ.account.myPayments().then(function (p) { ui.pays = p; if (JJ.account.access().state !== before) { toast(t('sub_thanks')); stack = []; } render(); }); });
}, 30000);

/* invite friends: a personal link; each friend who joins adds 7 free days (up to 28) */
function inviteLink() { var u = JJ.account.user || {}; return 'https://bijaldvyas-ai.github.io/JainJoy/' + (u.ref_code ? '?ref=' + u.ref_code : ''); }
function viewInvite() {
  var u = JJ.account.user || {};
  var b = '<div class="hero-brand" style="margin-top:6px">' + lotus(56) + '<h1 class="h1" style="font-size:24px">' + esc(t('invite_title')) + '</h1><p class="sub" style="margin:0">' + esc(t('invite_sub')) + '</p></div>' +
    '<section class="card glass"><p class="fine">' + esc(t('invite_your_link')) + '</p><p style="word-break:break-all;font-weight:800">' + esc(inviteLink()) + '</p>' +
    '<button class="btn wa" style="width:100%" data-a="invitewa">' + WA_ICON + ' ' + esc(t('invite_wa')) + '</button>' +
    (u.bonus_days ? '<div class="note ok" style="margin-top:10px">' + esc(t('invite_earned', {n: u.bonus_days})) + '</div>' : '') + '</section>';
  return backBar(t('invite_title')) + '<main class="scroll gx" id="scroll">' + b + '</main>';
}
function legalContact() {
  var c = JJ.CONFIG, bits = [c.contactName, c.contactEmail, c.supportWhatsApp ? 'WhatsApp +91 ' + c.supportWhatsApp : ''].filter(Boolean);
  return bits.length ? '<p><b>' + esc(t('legal_contact')) + '</b> ' + esc(bits.join(' · ')) + '</p>' : '';
}
/* privacy, terms and refund pages */
function viewLegal(top) {
  var k = top.page || 'privacy', paras = t('legal_' + k + '_body').split('\n');
  return backBar(t('legal_' + k)) + '<main class="scroll gx" id="scroll"><section class="card glass legal">' + paras.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') + legalContact() + '<p class="fine">' + esc(t('legal_updated')) + '</p></section></main>';
}
/* "Install JainJoy" where the phone offers it */
var installEvt = null;
window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); installEvt = e; if (typeof render === 'function' && tab === 'prof') render(); });

/* ---------------- admin: customers (live) ---------------- */
var custPoll = null, custUnwatch = null;
function custStartLive() {
  if (custPoll) return;
  custRefresh();
  custPoll = setInterval(custRefresh, 5000); // polling every 5 s, with realtime pushes in between
  custUnwatch = JJ.account.watch(custRefresh);
}
function custStopLive() { clearInterval(custPoll); custPoll = null; if (custUnwatch) { custUnwatch(); custUnwatch = null; } }
function custRefresh() {
  JJ.account.customers().then(function (r) { ui.cust.err = r.error || ''; if (r.rows) { ui.cust.rows = r.rows; ui.cust.payments = r.payments; } custPaint(); });
}
function localDay(ts) { var d = new Date(ts); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function tsText(ts) { return ts ? new Intl.DateTimeFormat(loc(), {day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', numberingSystem: 'latn'}).format(new Date(ts)) : '—'; }
function planText(r) {
  var a = JJ.account.planOf(r);
  if (a.state === 'paid') return {cls: 'ok', txt: t('plan_paid_till', {date: tsDate(a.until)})};
  if (a.state === 'trial') return {cls: a.daysLeft <= 2 ? 'warn' : '', txt: t('trial_days_left', {n: a.daysLeft})};
  return {cls: 'bad', txt: t('plan_expired')};
}
function tsDate(ms) { return new Intl.DateTimeFormat(loc(), {day: 'numeric', month: 'short', year: 'numeric', numberingSystem: 'latn'}).format(new Date(ms)); }
function custLiveHTML() {
  var c = ui.cust, rows = c.rows, pays = c.payments || [];
  if (c.err && !rows) return '<div class="alert">' + esc(t('cust_error')) + '</div>';
  if (!rows) return '<p class="fine">' + esc(t('cust_loading')) + '</p>';
  var td = localDay(Date.now()), now = Date.now();
  var newToday = rows.filter(function (r) { return localDay(r.created_at) === td; }).length;
  var activeNow = rows.filter(function (r) { return r.status === 'active' && r.last_seen && now - new Date(r.last_seen).getTime() < 5 * 6e4; }).length;
  var plans = rows.map(function (r) { return JJ.account.planOf(r); });
  var paid = plans.filter(function (a) { return a.state === 'paid'; }).length, ending = plans.filter(function (a) { return a.state === 'trial' && a.daysLeft <= 2; }).length;
  var confirmed = pays.filter(function (p) { return p.status === 'confirmed'; }), waiting = pays.filter(function (p) { return p.status === 'pending'; });
  var revenue = confirmed.reduce(function (s, p) { return s + (p.amount || 0); }, 0);
  var q = c.q.trim().toLowerCase(), list = rows.filter(function (r, i) {
    if (c.filter === 'blocked') { if (r.status !== 'blocked') return false; }
    else if (c.filter !== 'all' && plans[i].state !== c.filter) return false;
    return !q || (r.name || '').toLowerCase().indexOf(q) >= 0 || (r.phone || '').indexOf(q.replace(/\D/g, '') || '~') >= 0;
  });
  var h = '<div class="cust-stats"><div><b>' + rows.length + '</b><small>' + esc(t('cust_total')) + '</small></div><div><b>' + newToday + '</b><small>' + esc(t('cust_new_today')) + '</small></div><div><b>' + activeNow + '</b><small>' + esc(t('cust_active_now')) + '</small></div>' +
    '<div><b>' + paid + '</b><small>' + esc(t('biz_paid')) + '</small></div><div><b>' + esc(rupees(revenue)) + '</b><small>' + esc(t('biz_revenue')) + '</small></div><div class="' + (waiting.length ? 'hot' : '') + '"><b>' + waiting.length + '</b><small>' + esc(t('biz_waiting')) + '</small></div></div>' +
    (ending ? '<p class="fine">⏳ ' + esc(t('biz_ending', {n: ending})) + '</p>' : '');
  // payments to confirm come first
  h += '<h3 style="margin-top:10px">💳 ' + esc(t('pay_title')) + '</h3>' + (pays.length ? '<div class="cust-table">' + pays.slice(0, 50).map(function (p) {
    return '<div class="cust-row pay-row"><span><b>' + esc(p.name || '—') + '</b></span><span>' + esc(p.phone || '') + '</span><span><span class="tag ' + (p.status === 'confirmed' ? 'ok' : p.status === 'rejected' ? 'bad' : 'warn') + '">' + esc(t('pay_st_' + p.status)) + '</span></span>' +
      '<span data-l="UTR">' + esc(p.utr) + ' · ' + esc(rupees(p.amount)) + '</span><span data-l="' + esc(t('pay_date')) + '">' + esc(tsText(p.created_at)) + '</span>' +
      '<span class="cust-acts">' + (p.status === 'pending' ? '<button class="btn small primary" data-a="payok" data-v="' + p.id + '">' + esc(t('pay_confirm')) + '</button><button class="btn small danger" data-a="payno" data-v="' + p.id + '">' + esc(t('pay_reject')) + '</button>' : '') + '</span></div>';
  }).join('') + '</div>' : '<p class="fine">' + esc(t('pay_none')) + '</p>');
  h += '<h3 style="margin-top:12px">👥 ' + esc(t('cust_title')) + '</h3><p class="fine">' + esc(t('cust_showing', {n: list.length, total: rows.length})) + ' · <span class="live-dot"></span>' + esc(t('cust_live')) + '</p>' +
    (list.length ? '<div class="cust-table" role="table"><div class="cust-row head" role="row"><span>' + esc(t('acc_name')) + '</span><span>' + esc(t('acc_phone')) + '</span><span>' + esc(t('cust_plan')) + '</span><span>' + esc(t('cust_joined')) + '</span><span>' + esc(t('cust_last_login')) + '</span><span></span></div>' +
      list.map(function (r) {
        var blocked = r.status === 'blocked', pl = planText(r), tmp = ui.tempPw && ui.tempPw.id === r.id ? ui.tempPw.pw : '';
        return '<div class="cust-row" role="row"><span><b>' + esc(r.name) + '</b>' + (blocked ? ' <span class="tag bad">' + esc(t('cust_blocked')) + '</span>' : '') + '</span><span>' + esc(r.phone) + '</span><span><span class="tag ' + pl.cls + '">' + esc(pl.txt) + '</span></span><span data-l="' + esc(t('cust_joined')) + '">' + esc(tsText(r.created_at)) + '</span><span data-l="' + esc(t('cust_last_login')) + '">' + esc(tsText(r.last_login)) + '</span>' +
          '<span class="cust-acts"><button class="btn small" data-a="custyear" data-v="' + r.id + '" data-n="' + esc(r.name) + '">' + esc(t('cust_add_year')) + '</button><button class="btn small" data-a="custpw" data-v="' + r.id + '" data-n="' + esc(r.name) + '">' + esc(t('cust_reset_pw')) + '</button><button class="btn small" data-a="custstatus" data-v="' + r.id + '" data-s="' + (blocked ? 'active' : 'blocked') + '">' + esc(t(blocked ? 'cust_unblock' : 'cust_block')) + '</button><button class="btn small danger" data-a="custdel" data-v="' + r.id + '" data-n="' + esc(r.name) + '">' + esc(t('cust_delete')) + '</button></span>' +
          (tmp ? '<span class="temp-pw">' + esc(t('cust_temp_pw', {pw: tmp, name: r.name})) + '</span>' : '') + '</div>';
      }).join('') + '</div>' : '<div class="empty">' + esc(t(rows.length ? 'cust_none_match' : 'cust_none')) + '</div>');
  return h;
}
/* CSV file of customers and payments, for the admin's records */
function custCsv() {
  var c = ui.cust, q = function (v) { v = v == null ? '' : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  var lines = ['Name,Phone,Status,Plan,Joined,Last login,Paid until,Bonus days'];
  (c.rows || []).forEach(function (r) { lines.push([r.name, r.phone, r.status, planText(r).txt, r.created_at, r.last_login, r.paid_until, r.bonus_days].map(q).join(',')); });
  lines.push('', 'Payment ID,Name,Phone,UTR,Amount,Status,Reported,Decided');
  (c.payments || []).forEach(function (p) { lines.push([p.id, p.name, p.phone, p.utr, p.amount, p.status, p.created_at, p.decided_at].map(q).join(',')); });
  var blob = new Blob(['﻿' + lines.join('\r\n')], {type: 'text/csv'}), a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'jainjoy-customers-' + today() + '.csv'; document.body.appendChild(a); a.click(); a.remove();
}
function custPaint() { var el = document.getElementById('cust-live'); if (el) el.innerHTML = custLiveHTML(); }
function customersSection() {
  var c = ui.cust;
  return '<section class="card glass cust"><h3>📊 ' + esc(t('admin_dash')) + '</h3>' +
    '<div class="field"><input class="input" id="cust-q" value="' + esc(c.q) + '" placeholder="' + esc(t('cust_search')) + '" aria-label="' + esc(t('cust_search')) + '"></div>' +
    '<div class="seg" role="group">' + ['all', 'trial', 'paid', 'expired', 'blocked'].map(function (s) { return '<button data-a="custf" data-v="' + s + '" aria-pressed="' + (c.filter === s) + '">' + esc(t(s === 'all' ? 'st_all' : 'cust_f_' + s)) + '</button>'; }).join('') + '</div>' +
    '<p class="fine" style="text-align:right;margin:6px 0 0"><button class="linkbtn" data-a="custcsv">⬇ ' + esc(t('cust_csv')) + '</button></p>' +
    '<div id="cust-live">' + custLiveHTML() + '</div></section>';
}
/* business settings the admin types in once: UPI ID for the QR code, support WhatsApp, contact for the legal pages */
function settingsSection() {
  var c = JJ.CONFIG, missing = ['upiId', 'supportWhatsApp', 'contactName', 'contactEmail'].filter(function (k) { return !c[k]; });
  function fld(k, label, extra) { return '<label class="field"><span class="flabel">' + esc(t(label)) + '</span><input class="input" id="set-' + k + '" value="' + esc(c[k] || '') + '"' + (extra || '') + '></label>'; }
  return '<section class="card glass settings"><h3>⚙️ ' + esc(t('set_title')) + '</h3>' +
    (missing.length ? '<div class="alert">' + esc(t('set_missing')) + '</div>' : '<div class="note ok">' + esc(t('set_ready')) + '</div>') +
    (ui.setErr ? '<div class="alert" role="alert">' + esc(t(ui.setErr)) + '</div>' : '') +
    '<form id="settings-form" autocomplete="off" novalidate>' +
    fld('upiId', 'set_upi', ' placeholder="yourname@okhdfcbank" autocapitalize="off"') + fld('upiName', 'set_upi_name', ' placeholder="JainJoy" maxlength="60"') +
    fld('supportWhatsApp', 'set_wa', ' inputmode="numeric" placeholder="98XXXXXXXX" maxlength="14"') +
    fld('contactName', 'set_contact_name', ' placeholder="JainJoy by BiNaiSa" maxlength="80"') + fld('contactEmail', 'set_contact_email', ' type="email" placeholder="name@example.com" maxlength="120"') +
    '<button class="btn primary" type="submit" style="width:100%">' + esc(t('set_save')) + '</button></form>' +
    (c.upiId ? '<p class="fine" style="text-align:center;margin-top:10px">' + esc(t('set_qr_test', {price: rupees(c.price)})) + '</p><div id="upi-qr" class="upi-qr"></div>' : '') + '</section>';
}
function saveSettingsForm() {
  var s = {};
  JJ.account.settingKeys.forEach(function (k) { var el = document.getElementById('set-' + k); if (el) s[k] = el.value.trim(); });
  s.supportWhatsApp = JJ.account.cleanPhone(s.supportWhatsApp);
  if (s.upiId && !/^[A-Za-z0-9._-]{2,}@[A-Za-z][A-Za-z0-9.]{1,}$/.test(s.upiId)) { ui.setErr = 'set_err_upi'; render(); return; }
  if (s.supportWhatsApp && !/^[0-9]{10}$/.test(s.supportWhatsApp)) { ui.setErr = 'set_err_wa'; render(); return; }
  if (s.contactEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s.contactEmail)) { ui.setErr = 'set_err_email'; render(); return; }
  if (!s.upiName) s.upiName = 'JainJoy';
  ui.setErr = null;
  JJ.account.saveSettings(s).then(function (r) { if (r.error) { ui.setErr = 'cust_error'; render(); return; } render(); toast(t('set_saved')); setTimeout(drawQr, 50); });
}
/* with accounts switched on, the admin area is for admin accounts only */
function adminGate() {
  if (!JJ.account.configured() || JJ.account.isAdmin) return '';
  var u = JJ.account.user;
  return backBar(t('admin')) + '<main class="scroll gx" id="scroll"><div class="empty"><b>🔒 ' + esc(t('admin_only')) + '</b>' + esc(t(u ? 'admin_not_admin' : 'admin_login_first')) + '</div>' +
    (u ? '' : '<button class="btn primary" style="width:100%" data-a="acc" data-v="login">' + esc(t('acc_login')) + '</button>') + '</main>';
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
  b += '<div class="card glass"><h3>' + esc(t('visitors')) + '</h3><p style="margin:0;font-size:14px" id="visitors">' + esc(JJ.analytics.enabled() ? t('visitors_loading') : t('visitors_off')) + '</p>' +
    (JJ.analytics.enabled() ? '<p class="fine"><a href="https://' + esc(JJ.CONFIG.goatcounter) + '.goatcounter.com" target="_blank" rel="noopener">' + esc(t('visitors_dashboard')) + '</a></p>' : '') + '</div>';
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
/* Ingredient lines may use any regional name ("methi leaves:100, kothmir:10?"); names are matched to the
   ingredient database. Unknown names are queued for admin verification and block approval. */
function normIngs(str, record) {
  str = String(str || '').trim(); var parts = str.indexOf(',') >= 0 ? str.split(',') : str.split(/\s+/), out = [], unknown = [];
  parts.map(function (s) { return s.trim(); }).filter(Boolean).forEach(function (p) {
    var m = /^(.+?)\s*:\s*([0-9.]+)(\?)?$/.exec(p); if (!m) { unknown.push(p); return; }
    var id = JJ.ING[m[1].trim()] ? m[1].trim() : JJ.resolveIngredient(m[1]);
    if (!id) { unknown.push(m[1].trim()); return; }
    out.push(id + ':' + m[2] + (m[3] || ''));
  });
  if (record && unknown.length) { var q = JJ.db.get('meta', 'ing_reviews') || {key: 'ing_reviews', names: []}; unknown.forEach(function (n) { if (q.names.indexOf(n) < 0) q.names.push(n); }); JJ.db.put('meta', q); }
  return {str: out.join(' ') + (unknown.length ? ' ' : ''), unknown: unknown};
}
function viewAdmin() {
  var gate = adminGate(); if (gate) return gate;
  var f = ui.admin, list = adminList();
  var rev = (JJ.db.get('meta', 'ing_reviews') || {names: []}).names;
  var revHtml = rev.length ? '<div class="card glass"><h3>' + esc(t('unverified_title', {n: rev.length})) + '</h3><p class="fine" style="margin:0 0 8px">' + esc(t('unverified_help')) + '</p>' +
    rev.map(function (n, i) { return '<form class="addrow" data-map="' + i + '" autocomplete="off"><span style="flex:1;font-weight:800;align-self:center">' + esc(n) + '</span><input id="map-' + i + '" placeholder="' + esc(t('map_placeholder')) + '" aria-label="' + esc(t('map_placeholder')) + '"><button type="submit">' + esc(t('map_btn')) + '</button></form>'; }).join('') + '</div>' : '';
  var segS = '<div class="seg">' + ['all', 'approved', 'pending', 'rejected', 'invalid'].map(function (s) { return '<button data-a="adstatus" data-v="' + s + '" aria-pressed="' + (f.status === s) + '">' + esc(t('st_' + s)) + '</button>'; }).join('') + '</div>';
  var segM = '<div class="seg" style="margin-top:8px">' + ['all'].concat(MEALS).map(function (m) { return '<button data-a="admeal" data-v="' + m + '" aria-pressed="' + (f.meal === m) + '">' + esc(m === 'all' ? t('st_all') : t('meal_' + m)) + '</button>'; }).join('') + '</div>';
  var b = (JJ.account.isAdmin ? settingsSection() + customersSection() : '') + '<p class="sub" style="margin-top:8px">' + esc(t('admin_intro')) + '</p><button class="btn primary" data-a="adnew">' + esc(t('add_recipe')) + '</button>' + revHtml + '<div style="margin-top:12px">' + segS + segM + '</div>' +
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
  var comp = JJ.compileRecipe({id: e.id, meal: e.meal, comp: e.comp, cu: e.cu.split(/[ ,]+/).filter(Boolean), en: e.en, hi: e.hi, gu: e.gu, ings: normIngs(e.ings).str, steps: textToSteps(e.steps), flags: e.flags});
  normIngs(e.ings).unknown.forEach(function (n) { comp.errors.push({c: 'unverifiedIng', p: n}); comp.valid = false; });
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
    ings: normIngs(form.ings, true).str, steps: textToSteps(form.steps), flags: form.flags, status: status, origin: 'admin', reviewedBy: 'admin (this device)', updatedAt: Date.now()};
  JJ.db.put('recipes', rec);
  ['en', 'hi', 'gu'].forEach(function (l) { JJ.db.put('recipe_translations', {key: rec.id + '|' + l, recipeId: rec.id, lang: l, name: form[l]}); });
  if (!JJ.db.get('recipe_sources', rec.id)) JJ.db.put('recipe_sources', {recipeId: rec.id, name: t('src_admin'), url: null, verified: false});
  JJ.loadCatalog(JJ.recipesFromDb()); previewCache.clear();
  form.status = status;
}

/* ---------------- Profile / onboarding ---------------- */
var SUBS = {Shwetambar: ['Murtipujak', 'Sthanakvasi', 'Terapanth', 'Other'], Digambar: ['Bispanthi', 'Terapanth', 'Taranpanth', 'Other']};
function blankDraft() { return {lang: LANG, tradition: 'Shwetambar', subsect: 'Murtipujak', country: 'IN', state: '', cityId: '', custom: null, cuisine: '', calendar: 'amanta', hh: 4, allergies: [], exclude: [], avoidCrucifer: false, greenRule: 'none', shuklaPanchamGreen: false, obsProfile: 'strict', parvaFruit: false, navkarsi: 48, chauvihar: 0}; }
function fromProfile(p) { var d = JSON.parse(JSON.stringify(p)); return d; }
function ready(d) { return !!((d.cityId || d.custom) && d.cuisine && d.hh >= 1); }
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
  var signup = onboard === 'signup';
  if (!draft) { draft = signup ? (P ? fromProfile(P) : blankDraft()) : onboard ? blankDraft() : fromProfile(P); if (onboard && !ui.loc) autoLocate(); }
  var d = draft, rows = '';
  rows += '<section class="frow done"><div class="frow-h static"><span class="ficon">' + ic('globe') + '</span><span class="ftext"><b>' + esc(t('language')) + '</b><small>' + esc(t('language_sub')) + '</small></span>' + langChip() + '</div></section>';
  var cityObj = d.custom || JJ.CITIES[d.cityId];
  if (onboard && !(ui.loc && ui.loc.state === 'failed' && !cityObj)) rows += locRow(d); else rows += frow('city', 'pin', t('location'), cityObj ? (cityObj[LANG] || cityObj.en || cityObj.name) + (d.state ? ', ' + stateName(d.country, d.state) : '') : t('location_hint'), !!cityObj, function () { return locationBody(d); });
  rows += frow('cuisine', 'thali', t('cuisine'), d.cuisine ? nm(JJ.CUISINES[d.cuisine]) : t('cuisine_hint'), !!d.cuisine, function () { return '<div class="chips">' + Object.keys(JJ.CUISINES).map(function (k) { return '<button class="chip" data-a="cuisine" data-v="' + k + '" aria-pressed="' + (d.cuisine === k) + '">' + esc(nm(JJ.CUISINES[k])) + '</button>'; }).join('') + '</div><p class="hint">' + esc(t('cuisine_help')) + '</p>'; });
  rows += frow('hh', 'users', t('household'), t('for_members', {n: d.hh}), d.hh >= 1, function () { return '<div class="stepper"><button data-a="hh" data-v="-1" aria-label="' + esc(t('fewer')) + '"' + (d.hh <= 1 ? ' disabled' : '') + '>−</button><output aria-live="polite">' + esc(t('for_members', {n: d.hh})) + '</output><button data-a="hh" data-v="1" aria-label="' + esc(t('more')) + '"' + (d.hh >= 20 ? ' disabled' : '') + '>+</button></div><p class="hint">' + esc(t('household_help')) + '</p>'; });
  var exVal = d.allergies.map(function (a) { return nm(JJ.ALLERGENS[a]); }).concat(d.exclude.map(ingName)).join(', ') || t('none');
  rows += frow('allergies', 'shield', t('allergies_ex'), exVal, true, function () {
    return '<div class="chips">' + Object.keys(JJ.ALLERGENS).map(function (k) { return '<button class="chip" data-a="alg" data-v="' + k + '" aria-pressed="' + (d.allergies.indexOf(k) >= 0) + '">' + esc(nm(JJ.ALLERGENS[k])) + '</button>'; }).join('') + '</div>' +
      '<p class="hint">' + esc(t('exclude_help')) + '</p><div class="chips" style="margin-top:6px">' + d.exclude.map(function (id) { return '<button class="chip custom" data-a="rmex" data-v="' + id + '">' + esc(ingName(id)) + ' ×</button>'; }).join('') + '</div>' +
      '<div class="field"><input class="input" id="ex-q" value="' + esc(ui.ingQ) + '" placeholder="' + esc(t('exclude_search')) + '" aria-label="' + esc(t('exclude_search')) + '"></div><div class="search-results">' + exResults(ui.ingQ) + '</div>' +
      '<label class="toggle"><input type="checkbox" data-pf="avoidCrucifer"' + (d.avoidCrucifer ? ' checked' : '') + '><span>' + esc(t('avoid_crucifer')) + '<small>' + esc(t('avoid_crucifer_sub')) + '</small></span></label>';
  });
  rows += frow('obs', 'moon', t('observances'), t('parva_locked'), true, function () {
    return '<div class="toggle" style="cursor:default"><input type="checkbox" checked disabled><span>' + esc(t('parva_locked')) + '<small>' + esc(t('obs_strict_sub')) + '</small></span></div>' +
      '<label class="toggle"><input type="checkbox" data-pf="parvaFruit"' + (d.parvaFruit ? ' checked' : '') + '><span>' + esc(t('parva_fruit_rule')) + '<small>' + esc(t('parva_fruit_rule_sub')) + '</small></span></label>' +
      '<div class="field"><label for="pf-green">' + esc(t('extra_days')) + '</label><select class="select" id="pf-green">' + ['none', 'five', 'twelve'].map(function (g) { var v = d.obsProfile === 'custom' ? d.greenRule : 'none'; return '<option value="' + g + '"' + (v === g ? ' selected' : '') + '>' + esc(t('green_' + g)) + '</option>'; }).join('') + '</select></div>' +
      '<p class="hint">' + esc(t('obs_help')) + '</p>';
  });
  rows += frow('timing', 'clock', t('timing_conv'), t('chauvihar') + ': ' + (d.chauvihar ? t('chauvihar_before', {m: d.chauvihar}) : t('chauvihar_at')), true, function () {
    return '<div class="field"><label for="pf-cha">' + esc(t('chauvihar')) + '</label><select class="select" id="pf-cha">' + [[0, t('chauvihar_at')], [24, t('chauvihar_before', {m: 24})], [48, t('chauvihar_before', {m: 48})]].map(function (o) { return '<option value="' + o[0] + '"' + (+d.chauvihar === o[0] ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select></div>' +
      '<div class="field"><label for="pf-cal">' + esc(t('month_system')) + '</label><select class="select" id="pf-cal"><option value="amanta"' + (d.calendar === 'amanta' ? ' selected' : '') + '>' + esc(t('cal_amanta')) + '</option><option value="purnimanta"' + (d.calendar === 'purnimanta' ? ' selected' : '') + '>' + esc(t('cal_purn')) + '</option></select></div><p class="hint">' + esc(t('navkarsi_fixed')) + '</p>';
  });
  var head, top = '', bottom;
  if (signup) {
    top = '<div class="hero-brand">' + lotus(72) + WORDMARK + '<h1 class="h1">' + esc(t('signup_title')) + '</h1><p class="sub" style="margin:0">' + esc(t('signup_sub')) + '</p></div>' + accGeneral() +
      '<form id="signup-form" class="card glass" autocomplete="on" novalidate>' + accInput('name', 'text', 'acc_name', ' autocomplete="name" maxlength="80"') +
      accInput('phone', 'tel', 'acc_phone', ' inputmode="numeric" autocomplete="tel-national" maxlength="14" placeholder="98XXXXXXXX"') +
      accInput('password', 'password', 'acc_password', ' autocomplete="new-password"') + '<p class="fine" style="margin:-4px 0 8px">' + esc(t('acc_pw_rule')) + '</p>' +
      accInput('confirm', 'password', 'acc_confirm', ' autocomplete="new-password"') + '</form>';
    head = '';
    bottom = '<div class="cta-bar gx"><button class="btn-primary" data-a="signupsubmit"' + (ready(d) && !ui.acc.busy ? '' : ' disabled') + '>' + esc(t(ui.acc.busy ? 'acc_wait' : 'signup_cta')) + '</button><p>' + esc(t('have_account')) + ' <button class="linkbtn" data-a="gatemode" data-v="signin" style="padding:0">' + esc(t('acc_login')) + '</button></p></div>';
  } else if (onboard) {
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
    case 'tab': tab = v; stack = []; ui.showcase = false; render(); break;
    case 'back': stack.pop(); if (!stack.length || stack[stack.length - 1].k !== 'profile') { if (top && top.k === 'profile') draft = null; } render(); break;
    case 'push': if (v === 'profile') { draft = null; openField = null; } stack.push({k: v}); render(); break;
    case 'day': stack.push({k: 'day', date: v}); render(); break;
    case 'shift': if (top) { top.date = JJ.addDays(top.date, +v); render(); } break;
    case 'recipe': stack.push({k: 'recipe', date: el.dataset.d, id: el.dataset.id}); render(); break;
    case 'thali': stack.push({k: 'thali', date: el.dataset.d, opt: el.dataset.o != null ? +el.dataset.o : undefined}); render(); break;
    case 'librecipe': stack.push({k: 'recipe', id: v}); render(); break;
    case 'libmeal': ui.lib.meal = v; render(); break;
    case 'choose': {
      var cm = menuFor(el.dataset.d); if (!cm) break;
      cm.choice = Object.assign({b: 0, l: 0, s: 0, d: 0}, cm.choice); cm.choice[el.dataset.m] = +v;
      if (cm.status === 'history') JJ.db.put('menu_history', cm);
      else { cm = Object.assign({}, cm, {status: 'planned', month: ym(cm.date), savedAt: Date.now()}); JJ.db.put('daily_menus', cm); previewCache.delete(cm.date); }
      render(); toast(t('option_saved')); break;
    }
    case 'ics': {
      var blob = new Blob([parvaIcs()], {type: 'text/calendar'}), a2 = document.createElement('a');
      a2.href = URL.createObjectURL(blob); a2.download = 'jainjoy-parva-reminders.ics'; document.body.appendChild(a2); a2.click(); a2.remove();
      toast(t('ics_done')); break;
    }
    case 'wa': shareText(v === 'list' ? listText(currentGroups(el.dataset.list)) : menuText(v)); break;
    case 'acc': ui.acc.mode = v; ui.acc.errs = []; if (!top || top.k !== 'account') stack.push({k: 'account'}); render(); break;
    case 'accmode': ui.acc.mode = v; ui.acc.errs = []; render(); break;
    case 'logout': JJ.account.signOut().then(function () { ui.paysLoaded = false; ui.pays = null; ui.acc = {mode: 'signin', f: {}, errs: [], busy: false}; stack = []; tab = 'today'; render(); toast(t('acc_logged_out')); }); break;
    case 'invitedone': try { localStorage.setItem('jainjoy.inviteDone', '1'); } catch (x) {} render(); break;
    case 'custf': ui.cust.filter = v; render(); break;
    case 'custstatus': JJ.account.setStatus(v, el.dataset.s).then(function (r) { toast(r.error ? t('cust_error') : t(el.dataset.s === 'blocked' ? 'cust_blocked_toast' : 'cust_unblocked_toast')); custRefresh(); }); break;
    case 'custdel': if (window.confirm(t('cust_delete_confirm', {name: el.dataset.n}))) JJ.account.remove(v).then(function (r) { toast(r.error ? t('cust_error') : t('cust_deleted_toast')); custRefresh(); }); break;
    case 'signupsubmit': signupSubmit(); break;
    case 'gatemode': ui.acc.mode = v; ui.acc.errs = []; ui.acc.f.password = ''; ui.acc.f.confirm = ''; render(); break;
    case 'legal': stack.push({k: 'legal', page: v}); render(); break;
    case 'invitewa': shareText(t('invite_msg', {link: inviteLink()})); break;
    case 'install': if (installEvt) { installEvt.prompt(); installEvt.userChoice.then(function () { installEvt = null; render(); }); } break;
    case 'paycheck': JJ.account.refresh().then(function () { return JJ.account.myPayments(); }).then(function (p) { ui.pays = p; render(); toast(t(JJ.account.access().state === 'paid' ? 'sub_thanks' : 'pay_still_waiting')); }); break;
    case 'deleteme': if (window.confirm(t('delete_confirm'))) JJ.account.deleteMe().then(function (r) { if (r.error) { toast(t('acc_err_generic')); return; } ui.acc = {mode: 'signup', f: {}, errs: [], busy: false}; stack = []; render(); toast(t('deleted_done')); }); break;
    case 'forgot': { var fl = supportLink(t('help_msg_pw', {phone: JJ.account.cleanPhone((document.getElementById('acc-phone') || {}).value || '')})); if (fl) window.open(fl, '_blank', 'noopener'); else toast(t('forgot_no_support')); break; }
    case 'payok': case 'payno': JJ.account.decidePayment(+v, a === 'payok').then(function (r) { toast(r.error ? t('cust_error') : t(a === 'payok' ? 'pay_confirmed_toast' : 'pay_rejected_toast')); custRefresh(); }); break;
    case 'custyear': if (window.confirm(t('cust_add_year_confirm', {name: el.dataset.n}))) JJ.account.grantYear(v).then(function (r) { toast(r.error ? t('cust_error') : t('cust_year_added')); custRefresh(); }); break;
    case 'custpw': if (window.confirm(t('cust_reset_confirm', {name: el.dataset.n}))) { var tpw = 'Jain' + (1000 + Math.floor(Math.random() * 9000)) + String.fromCharCode(97 + Math.floor(Math.random() * 26)) + String.fromCharCode(97 + Math.floor(Math.random() * 26)); JJ.account.resetPassword(v, tpw).then(function (r) { if (r.error) { toast(t('cust_error')); return; } ui.tempPw = {id: v, pw: tpw}; custPaint(); }); } break;
    case 'custcsv': custCsv(); break;
    case 'pantryclear': JJ.db.put('meta', {key: 'pantry', have: {}}); render(); break;
    case 'ayambil': ui.ayambil = ui.ayambil === v ? null : v; render(); break;
    case 'notify': {
      if (!window.Notification) { toast(t('notify_unsupported')); break; }
      if (notifyState() === 'on') { try { localStorage.removeItem('jainjoy.notify'); } catch (e) {} render(); toast(t('notify_off')); break; }
      Notification.requestPermission().then(function (perm) {
        if (perm === 'granted') { try { localStorage.setItem('jainjoy.notify', '1'); } catch (e) {} toast(t('notify_on')); maybeEveningReminder(); }
        else toast(t('notify_denied'));
        render();
      });
      break;
    }
    case 'chogday': ui.chogDate = JJ.addDays(ui.chogDate || today(), +v); render(); break;
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
      createPlan(); JJ.account.saveProfile(P); render(); break;
    }
    case 'save': {
      if (!ready(draft)) return;
      var keep = {userId: 'local', created: P.created, planFrom: P.planFrom, version: P.version, seed: P.seed};
      P = Object.assign({}, draft, keep); delete P.cuisineSet; applyProfileChange(); JJ.account.saveProfile(P); draft = null; openField = null; stack.pop(); render(); toast(t('saved_from_tomorrow')); break;
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
  else if (el.id === 'pf-green') { draft.greenRule = el.value; draft.obsProfile = el.value === 'none' ? 'strict' : 'custom'; render(); }
  else if (el.id === 'pf-obs') { draft.obsProfile = el.value; render(); }
  else if (el.id === 'pf-cha') { draft.chauvihar = +el.value; render(); }
  else if (el.id === 'pf-cal') { draft.calendar = el.value; render(); }
  else if (el.dataset.pf) { draft[el.dataset.pf] = el.checked; render(); }
  else if (el.dataset.pantry) { var pt = pantry(); if (el.checked) pt.have[el.dataset.pantry] = 1; else delete pt.have[el.dataset.pantry]; JJ.db.put('meta', pt); render(); }
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
  else if (id === 'cust-q') { ui.cust.q = el.value; custPaint(); }
  else if (id.indexOf('acc-') === 0) ui.acc.f[id.slice(4)] = el.value; // kept in memory only, so other taps on the page do not clear it
  else if (el.dataset.ed && el.tagName === 'TEXTAREA') { stack[stack.length - 1].form[el.dataset.ed] = el.value; }
});
app.addEventListener('submit', function (e) {
  e.preventDefault();
  if (e.target.id === 'geo-form') geoSearch();
  if (e.target.id === 'acc-form') submitAccount();
  if (e.target.id === 'signin-form') signinSubmit();
  if (e.target.id === 'signup-form') signupSubmit();
  if (e.target.id === 'pay-form') submitPay();
  if (e.target.id === 'settings-form') saveSettingsForm();
  if (e.target.dataset && e.target.dataset.map != null) {
    var qi = +e.target.dataset.map, q = JJ.db.get('meta', 'ing_reviews') || {key: 'ing_reviews', names: []}, name = q.names[qi], val = (document.getElementById('map-' + qi).value || '').trim();
    var id = JJ.ING[val] ? val : JJ.resolveIngredient(val);
    if (!id) { toast(t('map_unknown')); return; }
    var syn = JJ.db.get('meta', 'custom_synonyms') || {key: 'custom_synonyms', list: []}; syn.list.push({name: name, id: id}); JJ.db.put('meta', syn);
    JJ.customSynonyms = syn.list; JJ.rebuildIngredientIndex();
    q.names.splice(qi, 1); JJ.db.put('meta', q); toast(t('map_done', {name: name, ing: ingName(id)})); render();
  }
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
  maybeEveningReminder();
  var td = today(); if (lastDay && td !== lastDay) { freezeHistory(); if (!stack.length) render(); } lastDay = td;
}, 30000);

/* ---------------- boot ---------------- */
JJ.app = {render: render, toast: toast, gateHTML: function (mode) { ui.acc.mode = mode; if (!ui.loc) ui.loc = {state: 'ok'}; draft = null; var h = viewGate(); draft = null; return h; }, festiveFor: festiveFor, menuText: menuText, listText: listText, splitPantry: splitPantry, isOli: isOli, soakTonight: soakTonight, menuFor: menuFor, parvaIcs: parvaIcs, generateMonth: generateMonth, freezeHistory: freezeHistory, applyProfileChange: applyProfileChange,
  get profile() { return P; }, set profile(v) { P = v; }, setLang: function (l) { LANG = l; }, get lang() { return LANG; }, today: today, pan: pan, t: t, previewCache: previewCache};
JJ.boot = function () {
  // an invite link (…/JainJoy/?ref=AB12CD) is remembered until this phone signs up
  try { var ref = (location.search.match(/[?&]ref=([A-Za-z0-9]{6})/) || [])[1]; if (ref) localStorage.setItem('jainjoy.ref', ref.toUpperCase()); } catch (e) {}
  return JJ.db.open().then(function () {
    JJ.seedDatabase(); JJ.migrateV1();
    JJ.customSynonyms = (JJ.db.get('meta', 'custom_synonyms') || {list: []}).list; JJ.rebuildIngredientIndex();
    JJ.loadCatalog(JJ.recipesFromDb());
    P = JJ.db.get('profiles', 'local') || null;
    try { LANG = (P && P.lang) || localStorage.getItem('jainjoy.lang') || 'en'; } catch (e) { LANG = (P && P.lang) || 'en'; }
    if (P && !P.obsProfile) { P.obsProfile = 'strict'; P.parvaFruit = false; JJ.app.applyProfileChange(); }
    if (P) { lastDay = today(); freezeHistory(); maybeEveningReminder(); }
    render();
    JJ.account.init(function () { render(); }); // optional customer account (only when Supabase is set up)
  });
};
/* when the precise astronomy engine finishes loading, recompute with it */
window.addEventListener('jj-astro-ready', function () { JJ.panchangReset(); if (P) render(); });
})(window.JJ = window.JJ || {});
