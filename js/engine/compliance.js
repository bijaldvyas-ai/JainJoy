/* JainJoy Jain dietary compliance engine.
   - builds the ingredient master from the seed rows
   - compiles and validates every recipe (banned ingredients, dwidal, unknown references,
     missing translations, duplicates) before it can be approved
   - decides whether a recipe may be served on a given day for a given household */
(function (JJ) {
'use strict';
JJ.ING = {};
JJ.ING_ROWS.forEach(function (r) {
  var o = {id: r[0], en: r[1], hi: r[2], gu: r[3], cat: r[4], unit: r[5], G: false, L: false, P: false, RC: false, C: false, alg: [], season: null, pg: 1, tg: 1, banned: null};
  r[6].split(' ').filter(Boolean).forEach(function (f) {
    if (f === 'G') o.G = true; else if (f === 'L') o.L = true; else if (f === 'P') o.P = true;
    else if (f === 'RC') o.RC = true; else if (f === 'C') o.C = true;
    else if (f.indexOf('a:') === 0) o.alg.push(f.slice(2));
    else if (f.indexOf('s:') === 0) o.season = f.slice(2).split('-').map(Number);
    else if (f.indexOf('pg:') === 0) o.pg = +f.slice(3);
    else if (f.indexOf('tg:') === 0) o.tg = +f.slice(3);
    else if (f.indexOf('X:') === 0) o.banned = f.slice(2);
  });
  JJ.ING[o.id] = o;
});
JJ.ALLERGENS = {
  dairy: {en:'Milk and dairy', hi:'दूध और डेयरी', gu:'દૂધ અને ડેરી'}, gluten: {en:'Gluten (wheat)', hi:'ग्लूटेन (गेहूं)', gu:'ગ્લુટેન (ઘઉં)'},
  peanuts: {en:'Peanuts', hi:'मूंगफली', gu:'સીંગદાણા'}, nuts: {en:'Tree nuts', hi:'मेवे', gu:'સૂકો મેવો'}, sesame: {en:'Sesame', hi:'तिल', gu:'તલ'},
  mustard: {en:'Mustard', hi:'राई', gu:'રાઈ'}, coconut: {en:'Coconut', hi:'नारियल', gu:'નાળિયેર'}
};
var MEALS = ['b', 'l', 's', 'd'], COMPS = ['main', 'bread', 'sabzi', 'dal', 'kadhi', 'rice', 'salad', 'raita', 'sambar', 'rasam'];

function parseIngs(str) {
  return String(str || '').trim().split(/\s+/).filter(Boolean).map(function (tok) {
    var opt = /\?$/.test(tok); tok = tok.replace(/\?$/, '');
    var i = tok.lastIndexOf(':');
    return {id: tok.slice(0, i), q: parseFloat(tok.slice(i + 1)), opt: opt};
  });
}
JJ.parseIngs = parseIngs;
function E(c, p) { return {c: c, p: p == null ? '' : String(p)}; }
JJ.errText = function (e, t) { var s = t('err_' + e.c); return s.replace('{p}', e.p); };
function norm(s) { return String(s || '').toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z0-9]+/g, ' ').trim(); }

/* Compile a raw recipe record into a checked runtime recipe. */
JJ.compileRecipe = function (raw) {
  var r = {id: raw.id, meal: raw.meal, comp: raw.comp || 'main', cu: raw.cu || ['gen'], en: raw.en, hi: raw.hi, gu: raw.gu, orig: raw.orig || '',
           serves: raw.serves || 4, prep: raw.prep || 0, cook: raw.cook || 0, ingStr: raw.ings, steps: raw.steps || [], flags: raw.flags || '',
           status: raw.status || 'approved', origin: raw.origin || 'seed', src: raw.src || null, errors: [], warnings: []};
  r.ings = parseIngs(raw.ings);
  var ids = {}, P = false, RC = false;
  r.tags = {leafy: false, leafyOpt: false, green: false, greenOpt: false, crucifer: false, alg: {}, ids: ids};
  if (MEALS.indexOf(r.meal) < 0) r.errors.push(E('meal', r.meal));
  if (COMPS.indexOf(r.comp) < 0) r.errors.push(E('comp', r.comp));
  ['en', 'hi', 'gu'].forEach(function (l) { if (!r[l] || !String(r[l]).trim()) r.errors.push(E('name', l)); });
  if (!r.ings.length) r.errors.push(E('noings'));
  r.ings.forEach(function (x) {
    var g = JJ.ING[x.id];
    if (!g) { r.errors.push(E('unknownIng', x.id)); return; }
    if (!(x.q > 0)) r.errors.push(E('qty', x.id));
    if (g.banned) r.errors.push(E('banned', x.id));
    ids[x.id] = true;
    if (g.P) P = true; if (g.RC) RC = true;
    if (g.L) { if (x.opt) r.tags.leafyOpt = true; else r.tags.leafy = true; }
    if (g.G) { if (x.opt) r.tags.greenOpt = true; else r.tags.green = true; }
    if (g.C && !x.opt) r.tags.crucifer = true;
    g.alg.forEach(function (a) { r.tags.alg[a] = true; });
  });
  if (RC && P && r.flags.indexOf('ch') < 0) r.errors.push(E('dwidal'));
  r.tags.dwidalSafe = !(RC && P) || r.flags.indexOf('ch') >= 0;
  if (!r.steps.length) r.errors.push(E('nosteps'));
  r.steps.forEach(function (st, i) {
    if (!Array.isArray(st)) { if (!st.en || !st.hi || !st.gu) r.errors.push(E('steplang', i + 1)); return; }
    if (!JJ.STEP_T[st[0]]) r.errors.push(E('tmpl', st[0]));
    [st[1], st[2]].forEach(function (a) {
      if (typeof a !== 'string' || !a) return;
      a.split('+').forEach(function (tok) {
        if (tok.charAt(0) === '@') { if (!JJ.WORDS[tok.slice(1)]) r.errors.push(E('word', tok)); }
        else if (!ids[tok]) r.errors.push(E('stepIng', (i + 1) + ': ' + tok));
      });
    });
  });
  r.valid = r.errors.length === 0;
  r.key = norm(r.en);
  return r;
};

/* Duplicate detection across the whole set (same normalised English name, or same meal with identical ingredients). */
JJ.findDuplicates = function (list) {
  var byName = {}, bySig = {}, dups = [];
  list.forEach(function (r) {
    var sig = r.meal + '|' + r.ings.map(function (x) { return x.id; }).sort().join(',');
    if (byName[r.key]) dups.push({id: r.id, other: byName[r.key], why: 'same name'});
    else byName[r.key] = r.id;
    if (bySig[sig]) dups.push({id: r.id, other: bySig[sig], why: 'same ingredients'});
    else bySig[sig] = r.id;
  });
  return dups;
};

/* Household exclusions: profile.allergies (allergen keys), profile.exclude (ingredient ids),
   profile.avoidCrucifer. Returns the ids of optional ingredients that must be dropped today,
   or null when the recipe cannot be served at all. */
JJ.allowed = function (r, rules, prof) {
  if (!r.valid || r.status !== 'approved') return null;
  var drop = {};
  for (var i = 0; i < r.ings.length; i++) {
    var x = r.ings[i], g = JJ.ING[x.id], bad = false;
    if (rules.noLeafy && g.L) bad = true;
    if (rules.noGreen && g.G) bad = true;
    if (prof.avoidCrucifer && g.C) bad = true;
    if ((prof.exclude || []).indexOf(x.id) >= 0) bad = true;
    if ((prof.allergies || []).some(function (a) { return g.alg.indexOf(a) >= 0; })) bad = true;
    if (bad) { if (x.opt) drop[x.id] = true; else return null; }
  }
  return drop;
};
/* Accompaniments are checked the same way. */
JJ.accAllowed = function (key, rules, prof) {
  var a = JJ.ACCOMP[key]; if (!a) return false;
  return parseIngs(a.ings).every(function (x) {
    var g = JJ.ING[x.id];
    if (!g || g.banned) return false;
    if (rules.noLeafy && g.L) return false; if (rules.noGreen && g.G) return false;
    if ((prof.exclude || []).indexOf(x.id) >= 0) return false;
    return !(prof.allergies || []).some(function (al) { return g.alg.indexOf(al) >= 0; });
  });
};
JJ.inSeason = function (g, month) { if (!g || !g.season) return true; var a = g.season[0], b = g.season[1]; return a <= b ? (month >= a && month <= b) : (month >= a || month <= b); };
})(window.JJ = window.JJ || {});
