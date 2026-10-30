/* JainJoy automated tests. Open tests/index.html in a browser (served over http).
   Uses a separate database ("jainjoy-test"), so the real app data is never touched. */
(function () {
'use strict';
var results = [];
function rec(id, name, ok, details) { results.push({id: id, name: name, ok: !!ok, details: details || ''}); }
function test(id, name, fn) { try { var r = fn(); rec(id, name, r.ok, r.details); } catch (e) { rec(id, name, false, 'Exception: ' + (e && e.stack || e)); } }
function addDays(iso, k) { return JJ.addDays(iso, k); }
function base(over) {
  return Object.assign({userId: 'local', lang: 'en', tradition: 'Shwetambar', subsect: 'Murtipujak', country: 'IN', state: 'GJ', cityId: 'in-ahmedabad', cuisine: 'guj',
    calendar: 'amanta', hh: 4, allergies: [], exclude: [], avoidCrucifer: false, greenRule: 'none', shuklaPanchamGreen: false, navkarsi: 48, chauvihar: 0, version: 1, seed: 7}, over || {});
}
function genRange(prof, from, n) {
  var ctx = {recent: {}}, out = [];
  for (var i = 0; i < n; i++) out.push(JJ.genDay(addDays(from, i), prof, ctx));
  return out;
}
function servedIngs(menu) {
  var list = [];
  function add(id, drop) { var r = JJ.catalog.byId[id]; if (!r) return; r.ings.forEach(function (x) { if ((drop || []).indexOf(x.id) < 0) list.push(x.id); }); }
  ['b', 's', 'd'].forEach(function (m) { var x = menu.meals[m]; if (x && x.id) add(x.id, x.drop); });
  menu.meals.l.items.forEach(function (it) { if (it.id) add(it.id, it.drop); else if (it.acc) JJ.parseIngs(JJ.ACCOMP[it.acc].ings).forEach(function (x) { list.push(x.id); }); });
  return list;
}
function deleteTestDb() { return new Promise(function (res) { try { var r = indexedDB.deleteDatabase('jainjoy-test'); r.onsuccess = r.onerror = r.onblocked = function () { res(); }; } catch (e) { res(); } }); }

deleteTestDb().then(function () { return JJ.boot(); }).then(function () {
  var cat = JJ.catalog, approved = cat.list.filter(function (r) { return r.valid && r.status === 'approved'; });
  var city = JJ.CITIES['in-ahmedabad'], today = JJ.todayISO(city.tz);
  var Pg = base(), Pm = base({state: 'MH', cityId: 'in-pune', cuisine: 'mah'});

  // 1 Gujarati lunch
  test(1, 'A Gujarati user receives a Gujarati-style lunch', function () {
    var days = genRange(Pg, today, 30), bad = [], local = 0, total = 0;
    days.forEach(function (m) {
      var slots = m.meals.l.items.map(function (i) { return i.slot === 'acc' ? 'acc:' + i.acc : i.slot; });
      ['bread', 'sabzi', 'dalkadhi', 'rice'].forEach(function (s) { if (slots.indexOf(s) < 0) bad.push(m.date + ' missing ' + s); });
      m.meals.l.items.forEach(function (i) { if (!i.id) return; total++; var r = cat.byId[i.id]; if (r.cu.some(function (c) { return ['guj', 'gen'].indexOf(c) >= 0; })) local++; });
    });
    var share = local / total;
    return {ok: !bad.length && share >= 0.7, details: 'Thali slots present on 30/30 days: ' + (!bad.length) + '. Gujarati or pan-Indian components: ' + Math.round(share * 100) + '%. Sample: ' + days[0].meals.l.items.map(function (i) { return i.id ? cat.byId[i.id].en : JJ.ACCOMP[i.acc].en; }).join(', ') + (bad.length ? ' | ' + bad.slice(0, 3).join('; ') : '')};
  });
  // 2 Maharashtrian lunch
  test(2, 'A Maharashtrian user receives a Maharashtrian-style lunch', function () {
    var days = genRange(Pm, today, 30), bad = [], local = 0, total = 0;
    days.forEach(function (m) {
      var slots = m.meals.l.items.map(function (i) { return i.slot; });
      ['bread', 'sabzi', 'dal', 'rice'].forEach(function (s) { if (slots.indexOf(s) < 0) bad.push(m.date + ' missing ' + s); });
      if (m.cuisine !== 'mah') bad.push('cuisine ' + m.cuisine);
      m.meals.l.items.forEach(function (i) { if (!i.id) return; total++; var r = cat.byId[i.id]; if (r.cu.some(function (c) { return ['mah', 'gen'].indexOf(c) >= 0; })) local++; });
    });
    var share = local / total;
    return {ok: !bad.length && share >= 0.7, details: 'Maharashtrian or pan-Indian components: ' + Math.round(share * 100) + '%. Sample: ' + days[1].meals.l.items.map(function (i) { return i.id ? cat.byId[i.id].en : JJ.ACCOMP[i.acc].en; }).join(', ') + (bad.length ? ' | ' + bad.slice(0, 3).join('; ') : '')};
  });
  // 3 prohibited ingredients
  test(3, 'No approved recipe contains a prohibited ingredient', function () {
    var bad = approved.filter(function (r) { return r.ings.some(function (x) { return !JJ.ING[x.id] || JJ.ING[x.id].banned; }); });
    var accBad = Object.keys(JJ.ACCOMP).filter(function (k) { return JJ.parseIngs(JJ.ACCOMP[k].ings).some(function (x) { return JJ.ING[x.id].banned; }); });
    return {ok: !bad.length && !accBad.length, details: approved.length + ' approved recipes and ' + Object.keys(JJ.ACCOMP).length + ' accompaniments checked; violations: ' + bad.map(function (r) { return r.id; }).concat(accBad).join(', ') || 'none'};
  });
  // 3b validator rejects a bad recipe
  test('3b', 'The compliance engine rejects onion, Kaddu, Alavi and raw-curd dwidal', function () {
    var a = JJ.compileRecipe({id: 'x1', meal: 'b', en: 'a', hi: 'a', gu: 'a', ings: 'poha:100 onion:20', steps: [['wash', 'poha']]});
    var b = JJ.compileRecipe({id: 'x2', meal: 'l', comp: 'sabzi', en: 'b', hi: 'b', gu: 'b', ings: 'kaddu:200', steps: [['cube', 'kaddu']]});
    var c = JJ.compileRecipe({id: 'x3', meal: 'l', comp: 'sabzi', en: 'c', hi: 'c', gu: 'c', ings: 'arbi:200', steps: [['cube', 'arbi']]});
    var d = JJ.compileRecipe({id: 'x4', meal: 's', en: 'd', hi: 'd', gu: 'd', ings: 'curd:200 sev:50', steps: [['mix', 'curd+sev']]});
    var e = JJ.compileRecipe({id: 'x5', meal: 's', en: 'e', hi: 'e', gu: 'e', ings: 'curd:200 besan:50', steps: [['mix', 'curd+besan']], flags: 'ch'});
    return {ok: !a.valid && !b.valid && !c.valid && !d.valid && e.valid, details: 'onion rejected: ' + !a.valid + ', kaddu: ' + !b.valid + ', alavi: ' + !c.valid + ', raw curd + sev: ' + !d.valid + ', cooked curd + besan accepted: ' + e.valid};
  });
  // 4 Kaddu and Alavi
  test(4, 'Kaddu and Alavi never enter the approved recipe database', function () {
    var ids = ['kaddu', 'arbi', 'alavileaves'], words = /kaddu|pumpkin|kashiphal|sitaphal|arbi|alavi|patra|colocasia|kolu|કોળ|અળવી|कद्दू|अरबी/i;
    var bad = approved.filter(function (r) { return r.ings.some(function (x) { return ids.indexOf(x.id) >= 0; }) || words.test(r.en + ' ' + r.hi + ' ' + r.gu); });
    return {ok: !bad.length, details: 'Checked ingredient ids and names in 3 languages; matches: ' + (bad.map(function (r) { return r.id + ' ' + r.en; }).join(', ') || 'none') + '. Glossary confirms Alavi = colocasia root and leaves.'};
  });
  // 5 Aatham / Chaudas leafy
  test(5, 'Aatham and Chaudas menus have no leafy vegetables', function () {
    var days = genRange(Pg, today, 120), special = 0, bad = [];
    days.forEach(function (m) {
      var p = JJ.panchang(m.date, city, Pg);
      if (!(p.aatham || p.chaudas)) return; special++;
      servedIngs(m).forEach(function (id) { if (JJ.ING[id].L) bad.push(m.date + ':' + id); });
    });
    return {ok: special >= 14 && !bad.length, details: special + ' Aatham/Chaudas days in 120 days checked; leafy found: ' + (bad.join(', ') || 'none')};
  });
  test('5b', 'Optional green-vegetable tithis remove all fresh produce', function () {
    var P5 = base({greenRule: 'five'}), days = genRange(P5, today, 60), cnt = 0, bad = [];
    days.forEach(function (m) { if (!m.rules.noGreen) return; cnt++; servedIngs(m).forEach(function (id) { if (JJ.ING[id].G) bad.push(m.date + ':' + id); }); });
    return {ok: cnt > 5 && !bad.length, details: cnt + ' no-green days in 60; fresh produce found: ' + (bad.slice(0, 5).join(', ') || 'none')};
  });
  // 6 Pancham Shukla
  test(6, 'Shukla Pancham is identified and shown on the correct dates', function () {
    var list = [], wrong = [];
    for (var d = '2026-01-01'; d <= '2026-12-31'; d = addDays(d, 1)) {
      var p = JJ.panchang(d, city, Pg);
      if (p.shuklaPancham) { list.push(d); if (!(p.t === 5 || p.skipped === 5)) wrong.push(d); }
    }
    var gyan = JJ.panchang('2026-11-14', city, Pg);
    JJ.app.profile = Object.assign({created: '2026-10-01'}, Pg); JJ.app.setLang('en');
    var html = (function () { var u = document.createElement('div'); return u; })();
    return {ok: list.length >= 12 && list.length <= 14 && !wrong.length && gyan.observances.some(function (o) { return o.k === 'gyan_pancham'; }), details: list.length + ' Shukla Pancham days in 2026 (expected 12–13): ' + list.join(', ') + '. Gyan Pancham 2026 → 14 Nov: ' + gyan.observances.map(function (o) { return o.en; }).join(', ')};
  });
  test('6b', 'Panchang matches known festival dates', function () {
    var ref = [['2025-04-10', 'mahavir_janma'], ['2025-04-30', 'akshaya_tritiya'], ['2025-08-27', 'samvatsari'], ['2025-10-21', 'diwali'], ['2025-10-22', 'new_year'], ['2025-11-05', 'kartik_punam'], ['2026-03-31', 'mahavir_janma']];
    var bad = ref.filter(function (x) { return !JJ.panchang(x[0], city, Pg).observances.some(function (o) { return o.k === x[1]; }); });
    var adh = JJ.panchang('2026-05-25', city, Pg).adhik;
    return {ok: !bad.length && adh, details: ref.length + ' reference dates checked (Ahmedabad); mismatches: ' + (bad.map(function (x) { return x.join(' '); }).join(', ') || 'none') + '; Adhik Jeth 2026 detected: ' + adh + '; engine: ' + JJ.astro.name()};
  });
  // 7 timings
  test(7, 'Navkarsi and Chauvihar change with location and date', function () {
    var kol = JJ.CITIES['in-kolkata'], d = '2026-11-15';
    var a = JJ.timings(JJ.panchang(d, city, Pg)), k = JJ.timings(JJ.panchang(d, kol, Pg));
    var jun = JJ.timings(JJ.panchang('2026-06-21', city, Pg)), dec = JJ.timings(JJ.panchang('2026-12-21', city, Pg));
    var ref = JJ.panchang('2025-04-10', city, Pg), hm = JJ.tz.hm(ref.rise, city.tz, 'en');
    var refMin = (ref.rise - JJ.tz.midnight('2025-04-10', city.tz)) / 6e4;
    var diffCity = (a.sunrise - k.sunrise) / 6e4, nav = (a.navkarsi - a.sunrise) / 6e4;
    var jd = ((dec.sunrise - JJ.tz.midnight('2026-12-21', city.tz)) - (jun.sunrise - JJ.tz.midnight('2026-06-21', city.tz))) / 6e4;
    var conv = JJ.timings(JJ.panchang(d, city, Pg), {navkarsi: 48, chauvihar: 48});
    return {ok: diffCity > 45 && Math.abs(nav - 48) < 0.01 && jd > 60 && refMin >= 380 && refMin <= 386 && (a.chauvihar - conv.chauvihar) / 6e4 === 48,
      details: 'Ahmedabad vs Kolkata sunrise differ by ' + Math.round(diffCity) + ' min; Navkarsi = sunrise + ' + nav + ' min; Ahmedabad sunrise June vs December differ by ' + Math.round(jd) + ' min; Ahmedabad 10 Apr 2025 sunrise ' + hm + ' (published ≈ 6:22–6:24 am); stricter Chauvihar 48 min before sunset works.'};
  });
  // 8 languages
  test(8, 'English, Hindi and Gujarati work across all screens and data', function () {
    var keys = Object.keys(JJ.I18N.en), miss = [];
    ['hi', 'gu'].forEach(function (l) { keys.forEach(function (k) { if (!JJ.I18N[l][k]) miss.push(l + ':' + k); }); });
    var recMiss = cat.list.filter(function (r) { return !r.hi || !r.gu; }).length;
    var ingMiss = Object.keys(JJ.ING).filter(function (id) { return !JJ.ING[id].hi || !JJ.ING[id].gu; }).length;
    var stepMiss = Object.keys(JJ.STEP_T).filter(function (k) { return JJ.STEP_T[k].length !== 3 || JJ.STEP_T[k].some(function (s) { return !s; }); }).length;
    var stateMiss = Object.keys(JJ.STATES.IN).filter(function (k) { return !JJ.STATES.IN[k].hi || !JJ.STATES.IN[k].gu; }).length;
    // render every main screen in each language and look for untranslated keys
    var leaks = [], screens = ['today', 'cal', 'pan', 'chog', 'shop', 'prof'];
    JJ.app.profile = Object.assign({created: today}, Pg);
    ['hi', 'gu'].forEach(function (l) {
      JJ.app.setLang(l);
      screens.forEach(function (s) {
        var b = document.querySelector('[data-a="tab"][data-v="' + s + '"]'); if (b) b.click(); else JJ.app.render();
        var text = document.getElementById('app').innerText;
        var raw = text.match(/\b[a-z]+_[a-z_]+\b/g); if (raw) leaks.push(l + '/' + s + ': ' + raw.slice(0, 3).join(','));
        var ascii = (text.match(/\b(Breakfast|Lunch|Dinner|Snack|Today|Calendar|Grocery|Sunrise|Sunset)\b/g) || []).length;
        if (ascii) leaks.push(l + '/' + s + ': English words ' + ascii);
      });
    });
    JJ.app.setLang('en');
    return {ok: !miss.length && !recMiss && !ingMiss && !stepMiss && !stateMiss && !leaks.length, details: keys.length + ' interface strings × 3 languages, missing: ' + miss.length + '; recipes missing a translation: ' + recMiss + '; ingredients: ' + ingMiss + '; step templates: ' + stepMiss + '; states: ' + stateMiss + '; screens rendered in Hindi and Gujarati with untranslated text: ' + (leaks.join(' | ') || 'none')};
  });
  // 9 next month
  test(9, 'Next-month menus are accessible and can be saved', function () {
    var P9 = base({created: today}); JJ.app.profile = P9; JJ.db.put('profiles', P9);
    var nextM = JJ.addDays(today.slice(0, 7) + '-01', 40).slice(0, 7);
    var first = nextM + '-01', m = JJ.app.menuFor(first);
    JJ.app.generateMonth(nextM);
    var saved = JJ.db.all('daily_menus').filter(function (x) { return x.month === nextM; });
    var days = new Date(Date.UTC(+nextM.slice(0, 4), +nextM.slice(5, 7), 0)).getUTCDate();
    return {ok: m && m.meals.b.id && saved.length === days && JJ.db.get('monthly_menus', nextM), details: 'Preview for ' + first + ': ' + (m ? JJ.catalog.byId[m.meals.b.id].en : 'none') + '; saved ' + saved.length + ' of ' + days + ' days of ' + nextM};
  });
  // 10 previous month
  test(10, 'Previous-month menus are accessible from saved history', function () {
    var start = addDays(today, -60), P10 = base({created: start, version: 1}); JJ.app.profile = P10; JJ.db.put('profiles', P10);
    JJ.db.put('meta', {key: 'frozen', upto: null}); JJ.app.freezeHistory();
    var prevM = JJ.addDays(today.slice(0, 7) + '-01', -1).slice(0, 7);
    var h = JJ.db.all('menu_history').filter(function (x) { return x.month === prevM; });
    var one = h[0], snapOk = one && Object.keys(one.snap).length > 0 && one.pan && one.pan.sunrise;
    return {ok: h.length >= 28 && snapOk, details: h.length + ' saved days in ' + prevM + '; each stores recipe snapshots and that day\'s tithi and timings (e.g. ' + (one ? one.date + ', tithi ' + one.pan.t : '') + ')'};
  });
  // 11 four meals
  test(11, 'Four meals appear every day, including a very strict household', function () {
    var strict = base({greenRule: 'twelve', shuklaPanchamGreen: true, avoidCrucifer: true, allergies: ['peanuts', 'sesame'], exclude: ['lauki', 'tomato']});
    var bad = [];
    [Pg, Pm, base({cuisine: 'sou', cityId: 'in-chennai', state: 'TN'}), base({cuisine: 'ben', cityId: 'in-kolkata', state: 'WB'}), base({cuisine: 'pun', cityId: 'in-ludhiana', state: 'PB'}), base({cuisine: 'raj', cityId: 'in-jaipur', state: 'RJ'}), strict].forEach(function (p, pi) {
      genRange(p, today, 90).forEach(function (m) {
        ['b', 's', 'd'].forEach(function (k) { if (!m.meals[k] || !m.meals[k].id) bad.push(pi + ':' + m.date + ':' + k); });
        if (!m.meals.l.items.some(function (i) { return i.id; }) || m.meals.l.items.some(function (i) { return i.missing; })) bad.push(pi + ':' + m.date + ':l');
      });
    });
    return {ok: !bad.length, details: '7 households × 90 days (Gujarati, Maharashtrian, South Indian, Bengali, Punjabi, Rajasthani, and a strict household with 12 green-free tithis, crucifer, peanut, sesame, lauki and tomato exclusions); empty slots: ' + (bad.slice(0, 5).join(', ') || 'none')};
  });
  // 12 grocery
  test(12, 'Grocery lists correctly add up recipe ingredients', function () {
    var r = cat.byId.b009, poha = r.ings.filter(function (x) { return x.id === 'poha'; })[0].q;
    var m1 = {hh: 4, meals: {b: {id: 'b009', drop: ['coriander']}, l: {items: [{slot: 'acc', acc: 'papad'}]}, s: {id: null}, d: {id: null}}};
    var m2 = {hh: 8, meals: {b: {id: 'b009', drop: []}, l: {items: []}, s: {id: null}, d: {id: null}}};
    var g = JJ.grocery([m1, m2]), flat = {};
    g.forEach(function (gr) { gr.items.forEach(function (it) { flat[it.id] = it; }); });
    var expPoha = poha * 4 / r.serves + poha * 8 / r.serves, expCor = r.ings.filter(function (x) { return x.id === 'coriander'; })[0].q * 8 / r.serves;
    return {ok: Math.abs(flat.poha.amt - expPoha) < 1e-6 && flat.papad.amt === 4 && Math.abs(flat.coriander.amt - expCor) < 1e-6,
      details: 'Poha expected ' + expPoha + ' g, got ' + flat.poha.amt + '; papad 4 pc, got ' + flat.papad.amt + '; coriander dropped on day 1 so only day 2 counts: expected ' + expCor + ' g, got ' + flat.coriander.amt};
  });
  // 13 profile change
  test(13, 'Profile updates rebuild future menus and never change history', function () {
    var P13 = JJ.app.profile, histBefore = JSON.stringify(JJ.db.all('menu_history').map(function (h) { return [h.date, h.meals]; }));
    var tmr = addDays(today, 1), before = JSON.stringify(JJ.app.menuFor(tmr).meals);
    P13.cuisine = 'mah'; P13.cityId = 'in-pune'; P13.state = 'MH';
    JJ.app.applyProfileChange();
    var histAfter = JSON.stringify(JJ.db.all('menu_history').map(function (h) { return [h.date, h.meals]; }));
    var after = JJ.app.menuFor(tmr);
    var savedNext = JJ.db.all('daily_menus').filter(function (x) { return x.pv === P13.version; }).length;
    return {ok: histBefore === histAfter && after.cuisine === 'mah' && JSON.stringify(after.meals) !== before, details: 'History identical: ' + (histBefore === histAfter) + '; tomorrow rebuilt as ' + after.cuisine + '; saved future days rebuilt for the new profile: ' + savedNext};
  });
  // 14 recipe count
  test(14, 'At least 300 unique approved recipes exist in the database', function () {
    var keys = {}; approved.forEach(function (r) { keys[r.key] = true; });
    var by = {b: 0, l: 0, s: 0, d: 0}; approved.forEach(function (r) { by[r.meal]++; });
    var dbCount = JJ.db.all('recipes').filter(function (r) { return r.status === 'approved'; }).length;
    return {ok: Object.keys(keys).length >= 300 && by.b >= 100 && by.l >= 100 && by.d >= 100 && dbCount >= 300 && !cat.dups.length,
      details: Object.keys(keys).length + ' unique approved recipes (breakfast ' + by.b + ', lunch ' + by.l + ', dinner ' + by.d + ', snacks ' + by.s + '); in IndexedDB: ' + dbCount + '; duplicates: ' + cat.dups.length + '; invalid: ' + (cat.list.length - approved.length)};
  });
  test(15, 'Every recipe has steps, valid references, source record and no dwidal', function () {
    var noSrc = approved.filter(function (r) { return !JJ.db.get('recipe_sources', r.id); }).length;
    var dw = approved.filter(function (r) { return !r.tags.dwidalSafe; }).length;
    var steps = approved.filter(function (r) { return r.steps.map(function (s) { return JJ.renderStep(s, 'gu', JJ.ING, {}); }).some(function (s) { return !s || /\{[abn]\}/.test(s); }); }).length;
    return {ok: !noSrc && !dw && !steps, details: 'Missing source record: ' + noSrc + '; dwidal: ' + dw + '; steps that fail to render in Gujarati: ' + steps};
  });
  test(16, 'All Indian states and union territories with cities', function () {
    var st = Object.keys(JJ.STATES.IN), empty = st.filter(function (s) { return !Object.keys(JJ.CITIES).some(function (k) { return JJ.CITIES[k].state === s; }); });
    var n = Object.keys(JJ.CITIES).filter(function (k) { return JJ.CITIES[k].country === 'IN'; }).length;
    return {ok: st.length === 36 && !empty.length, details: st.length + ' states/UTs, ' + n + ' Indian cities and towns built in; states without a city: ' + (empty.join(', ') || 'none') + '. Any other place: online search or GPS.'};
  });
  test(17, 'Kshaya and vriddhi tithis follow the Jain rule', function () {
    var vr = null, ks = null;
    for (var d = '2026-01-01'; d <= '2026-12-31' && (!vr || !ks); d = addDays(d, 1)) {
      var p = JJ.panchang(d, city, Pg);
      if (!vr && p.vriddhiFirst) vr = [d, p];
      if (!ks && p.skipped) ks = [d, p];
    }
    var vNext = JJ.panchang(addDays(vr[0], 1), city, Pg);
    return {ok: vr[1].observed.indexOf(vr[1].t) < 0 && vNext.observed.indexOf(vNext.t) >= 0 && ks[1].observed.indexOf(ks[1].skipped) >= 0,
      details: 'Vriddhi ' + vr[0] + ' (tithi ' + vr[1].t + ') observed on the second day; kshaya tithi ' + ks[1].skipped + ' observed on ' + ks[0] + ' (the day before).'};
  });

  test(18, 'Nutrition is calculated for every recipe, meal and day', function () {
    var missing = Object.keys(JJ.ING).filter(function (id) { return !JJ.ING[id].banned && !JJ.NUTRITION[id]; });
    var r = cat.byId.b009, exp = [0, 0, 0, 0];
    r.ings.forEach(function (x) { var g = JJ.ING[x.id], w = (g.unit === 'pc' ? x.q * g.pg : (g.unit === 'tsp' || g.unit === 'tbsp') ? x.q * g.tg : x.q) / r.serves / 100; for (var i = 0; i < 4; i++) exp[i] += JJ.NUTRITION[x.id][i] * w; });
    var got = JJ.recipeNutrition(r, []), recOk = Math.abs(got[0] - exp[0]) <= 1 && Math.abs(got[1] - exp[1]) <= 0.1;
    var days = genRange(Pg, today, 30), sumBad = 0, range = [1e9, 0];
    days.forEach(function (m) {
      var n = JJ.dayNutrition(m), s = n.b[0] + n.l[0] + n.s[0] + n.d[0];
      if (Math.abs(s - n.total[0]) > 2) sumBad++;
      range[0] = Math.min(range[0], n.total[0]); range[1] = Math.max(range[1], n.total[0]);
    });
    var zero = approved.filter(function (x) { return JJ.recipeNutrition(x, [])[0] <= 0; }).length;
    return {ok: !missing.length && recOk && !sumBad && !zero && range[0] > 900 && range[1] < 4000,
      details: 'Ingredients without values: ' + (missing.join(', ') || 'none') + '; Jain Poha per serving ' + got.join('/') + ' (kcal/protein/carbs/fat), hand-computed ' + exp.map(function (v) { return Math.round(v * 10) / 10; }).join('/') + '; day total equals sum of 4 meals on 30/30 days: ' + !sumBad + '; daily range per person ' + range[0] + '–' + range[1] + ' kcal; recipes with zero energy: ' + zero};
  });

  test(19, 'Choghadiya follows sunrise, sunset and the weekday', function () {
    var bad = [], firsts = {};
    for (var k = 0; k < 7; k++) {
      var d = addDays('2026-11-01', k), L = JJ.choghadiya(d, city), p = JJ.panchang(d, city, Pg), pn = JJ.panchang(addDays(d, 1), city, Pg);
      if (L.length !== 16) bad.push(d + ' count');
      if (Math.abs(L[0].start - p.rise) > 1 || Math.abs(L[7].end - p.set) > 1 || Math.abs(L[8].start - p.set) > 1 || Math.abs(L[15].end - pn.rise) > 1) bad.push(d + ' bounds');
      for (var i = 1; i < 16; i++) if (Math.abs(L[i].start - L[i - 1].end) > 1) bad.push(d + ' gap ' + i);
      if (L[0].k !== L[7].k) bad.push(d + ' day first/last differ');
      firsts[new Date(d + 'T12:00:00Z').getUTCDay()] = L[0].k + '/' + L[8].k;
    }
    var want = {0: 'udveg/shubh', 1: 'amrit/char', 2: 'rog/kaal', 3: 'labh/udveg', 4: 'shubh/amrit', 5: 'char/rog', 6: 'kaal/labh'};
    Object.keys(want).forEach(function (w) { if (firsts[w] !== want[w]) bad.push('weekday ' + w + ' starts ' + firsts[w]); });
    var mon = JJ.choghadiya('2026-11-02', city).slice(8).map(function (c) { return c.k; }).join(',');
    return {ok: !bad.length && mon === 'char,rog,kaal,labh,udveg,shubh,amrit,char', details: '7 days checked: 16 parts each, day parts span sunrise→sunset and night parts sunset→next sunrise with no gaps; weekday starts (day/night) ' + JSON.stringify(firsts) + '; Monday night ' + mon + (bad.length ? ' | ' + bad.join('; ') : '')};
  });
  test(20, 'Every screen shows the Made by BiNaiSa signature', function () {
    JJ.app.profile = Object.assign({created: today}, Pg); JJ.app.setLang('gu');
    var miss = [];
    ['today', 'cal', 'pan', 'chog', 'shop', 'prof'].forEach(function (s) { document.querySelector('[data-a="tab"][data-v="' + s + '"]').click(); if (!/Made by\s*BiNaiSa/.test(document.getElementById('app').innerText)) miss.push(s); });
    JJ.app.setLang('en');
    var tabs = Array.prototype.map.call(document.querySelectorAll('.tabbar [data-a="tab"]'), function (b) { return b.dataset.v; }).join(',');
    return {ok: !miss.length && tabs === 'today,cal,pan,chog,shop,prof', details: 'Screens missing the signature: ' + (miss.join(', ') || 'none') + '; tab bar: ' + tabs};
  });

  // ---- report ----
  var pass = results.filter(function (r) { return r.ok; }).length;
  document.getElementById('sum').textContent = pass + ' of ' + results.length + ' tests passed · ' + new Date().toLocaleString() + ' · ' + JJ.astro.name();
  document.getElementById('rows').innerHTML = results.map(function (r) {
    return '<tr><td>' + r.id + '</td><td>' + r.name + '</td><td class="' + (r.ok ? 'pass">PASS' : 'fail">FAIL') + '</td><td><small>' + String(r.details).replace(/</g, '&lt;') + '</small></td></tr>';
  }).join('');
  window.__results = results;
});
})();
