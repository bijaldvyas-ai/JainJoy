/* JainJoy customer accounts (optional): sign up, login and the admin customer list, on Supabase.
   Nothing here runs until JJ.CONFIG.supabaseUrl and supabaseKey are set in js/config.js; the app
   works fully without an account. Passwords go straight to Supabase Auth, which stores only a
   bcrypt hash; the app never keeps or shows a password. The session is kept by supabase-js, so a
   customer stays signed in until they log out. */
(function (JJ) {
'use strict';
var SDK = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js';
var sb = null, ready = null, me = null, admin = false, seenT = null;
var LOCK_KEY = 'jainjoy.loginFails', MAX_FAILS = 5, LOCK_MS = 5 * 6e4;

function configured() { return !!(JJ.CONFIG && JJ.CONFIG.supabaseUrl && JJ.CONFIG.supabaseKey); }
/* Supabase Auth signs in with an e-mail address; each phone number gets a private address of its own */
function emailFor(phone) { return phone + '@phone.jainjoy.app'; }
function cleanPhone(p) { p = String(p || '').replace(/[\s-]/g, ''); if (/^\+91\d{10}$/.test(p)) p = p.slice(3); if (/^0\d{10}$/.test(p)) p = p.slice(1); return p; }

/* ---- validation: returns a list of {field, key} errors (key = i18n key) ---- */
function validate(f, signup) {
  var e = [], phone = cleanPhone(f.phone);
  if (signup && !String(f.name || '').trim()) e.push({field: 'name', key: 'acc_err_name_empty'});
  else if (signup && String(f.name).trim().length < 2) e.push({field: 'name', key: 'acc_err_name_short'});
  if (!phone) e.push({field: 'phone', key: 'acc_err_phone_empty'});
  else if (!/^[0-9]{10}$/.test(phone)) e.push({field: 'phone', key: 'acc_err_phone_invalid'});
  if (!f.password) e.push({field: 'password', key: 'acc_err_pw_empty'});
  else if (signup && (f.password.length < 8 || !/[A-Za-z]/.test(f.password) || !/[0-9]/.test(f.password))) e.push({field: 'password', key: 'acc_err_pw_weak'});
  if (signup && !f.confirm) e.push({field: 'confirm', key: 'acc_err_confirm_empty'});
  else if (signup && f.confirm !== f.password) e.push({field: 'confirm', key: 'acc_err_confirm_match'});
  return e;
}

/* ---- login-attempt limit on this device (the server also limits attempts per IP) ---- */
function fails() { try { return JSON.parse(localStorage.getItem(LOCK_KEY) || '{"n":0,"at":0}'); } catch (e) { return {n: 0, at: 0}; } }
function setFails(v) { try { localStorage.setItem(LOCK_KEY, JSON.stringify(v)); } catch (e) {} }
function lockedFor() { var f = fails(); if (f.n < MAX_FAILS) return 0; var left = f.at + LOCK_MS - Date.now(); if (left <= 0) { setFails({n: 0, at: 0}); return 0; } return left; }

function loadSdk() {
  if (window.supabase && window.supabase.createClient) return Promise.resolve();
  return new Promise(function (res, rej) { var s = document.createElement('script'); s.src = SDK; s.onload = res; s.onerror = function () { rej(new Error('sdk')); }; document.head.appendChild(s); });
}
function loadMe() {
  return sb.auth.getSession().then(function (r) {
    var s = r.data && r.data.session; if (!s) { me = null; admin = false; return null; }
    return sb.from('customers').select('id,name,phone,status').eq('id', s.user.id).maybeSingle().then(function (q) {
      if (q.data && q.data.status === 'blocked') return sb.auth.signOut().then(function () { me = null; admin = false; return null; });
      me = q.data || {id: s.user.id, name: (s.user.user_metadata || {}).name, phone: (s.user.user_metadata || {}).phone};
      return sb.rpc('is_admin').then(function (a) { admin = !a.error && a.data === true; return me; });
    });
  });
}
function startSeen() {
  clearInterval(seenT);
  if (!me) return;
  sb.rpc('touch_seen');
  seenT = setInterval(function () { if (me && document.visibilityState === 'visible') sb.rpc('touch_seen'); }, 2 * 6e4);
}
function errKey(err) {
  var m = String((err && err.message) || ''), code = err && (err.status || err.code);
  if (/already registered|already exists|duplicate/i.test(m)) return 'acc_err_phone_taken';
  if (/banned/i.test(m)) return 'acc_err_blocked';
  if (/invalid login credentials/i.test(m)) return 'acc_err_wrong';
  if (code === 429 || /rate limit|too many/i.test(m)) return 'acc_err_too_many';
  if (/password/i.test(m)) return 'acc_err_pw_weak';
  if (/fetch|network/i.test(m)) return 'acc_err_offline';
  return 'acc_err_generic';
}

JJ.account = {
  configured: configured,
  validate: validate,
  cleanPhone: cleanPhone,
  lockedFor: lockedFor,
  get user() { return me; },
  get isAdmin() { return admin; },
  /* start once at boot; calls onChange after the session is known and whenever it changes */
  init: function (onChange) {
    if (!configured()) return Promise.resolve(null);
    if (ready) return ready;
    ready = loadSdk().then(function () {
      sb = window.supabase.createClient(JJ.CONFIG.supabaseUrl, JJ.CONFIG.supabaseKey, {auth: {persistSession: true, autoRefreshToken: true, storageKey: 'jainjoy.auth'}});
      sb.auth.onAuthStateChange(function (ev) { if (ev === 'SIGNED_OUT') { me = null; admin = false; clearInterval(seenT); if (onChange) onChange(); } });
      return loadMe().then(function (u) { startSeen(); if (onChange) onChange(); return u; });
    }).catch(function () { ready = null; return null; });
    return ready;
  },
  signUp: function (f) {
    var errs = validate(f, true); if (errs.length) return Promise.resolve({errors: errs});
    var phone = cleanPhone(f.phone);
    return JJ.account.init().then(function () {
      if (!sb) return {errors: [{field: '', key: 'acc_err_offline'}]};
      return sb.auth.signUp({email: emailFor(phone), password: f.password, options: {data: {name: String(f.name).trim(), phone: phone}}}).then(function (r) {
        if (r.error) return {errors: [{field: /registered|exists/i.test(r.error.message) ? 'phone' : '', key: errKey(r.error)}]};
        // an existing number comes back as a user with no identities instead of an error
        if (r.data && r.data.user && r.data.user.identities && !r.data.user.identities.length) return {errors: [{field: 'phone', key: 'acc_err_phone_taken'}]};
        if (!r.data.session) return {errors: [{field: '', key: 'acc_err_confirm_off'}]};
        return sb.rpc('touch_login').then(loadMe).then(function () { startSeen(); return {ok: true}; });
      });
    });
  },
  signIn: function (f) {
    var errs = validate(f, false); if (errs.length) return Promise.resolve({errors: errs});
    if (lockedFor()) return Promise.resolve({errors: [{field: '', key: 'acc_err_too_many'}]});
    var phone = cleanPhone(f.phone);
    return JJ.account.init().then(function () {
      if (!sb) return {errors: [{field: '', key: 'acc_err_offline'}]};
      return sb.auth.signInWithPassword({email: emailFor(phone), password: f.password}).then(function (r) {
        if (r.error) {
          var k = errKey(r.error);
          if (k === 'acc_err_wrong') { var fl = fails(); setFails({n: fl.n + 1, at: Date.now()}); }
          return {errors: [{field: '', key: k}]};
        }
        setFails({n: 0, at: 0});
        return sb.rpc('touch_login').then(loadMe).then(function (u) {
          if (!u) return {errors: [{field: '', key: 'acc_err_blocked'}]};
          startSeen(); return {ok: true};
        });
      });
    });
  },
  signOut: function () { if (!sb) return Promise.resolve(); return sb.auth.signOut().then(function () { me = null; admin = false; clearInterval(seenT); }); },

  /* ---- admin ---- */
  customers: function () {
    if (!sb || !admin) return Promise.resolve({error: 'admin'});
    return Promise.all([sb.from('customers').select('id,name,phone,status,created_at,last_login,last_seen').order('created_at', {ascending: false}), sb.from('admins').select('user_id')])
      .then(function (r) {
        if (r[0].error) return {error: r[0].error.message};
        var adm = {}; (r[1].data || []).forEach(function (a) { adm[a.user_id] = 1; });
        return {rows: r[0].data.filter(function (c) { return !adm[c.id]; })};
      });
  },
  setStatus: function (id, status) { return sb.rpc('admin_set_status', {cid: id, new_status: status}); },
  remove: function (id) { return sb.rpc('admin_delete_customer', {cid: id}); },
  /* live updates: a realtime subscription, with the 5-second poll in the app as a fallback */
  watch: function (cb) {
    if (!sb) return function () {};
    var ch = sb.channel('customers-admin').on('postgres_changes', {event: '*', schema: 'public', table: 'customers'}, function () { cb(); }).subscribe();
    return function () { try { sb.removeChannel(ch); } catch (e) {} };
  }
};
})(window.JJ = window.JJ || {});
