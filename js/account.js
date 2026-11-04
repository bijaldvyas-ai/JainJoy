/* JainJoy customer accounts (optional): sign up, login and the admin customer list, on Supabase.
   Nothing here runs until JJ.CONFIG.supabaseUrl and supabaseKey are set in js/config.js; the app
   works fully without an account. Passwords go straight to Supabase Auth, which stores only a
   bcrypt hash; the app never keeps or shows a password. The session is kept by supabase-js, so a
   customer stays signed in until they log out. */
(function (JJ) {
'use strict';
var SDK = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js';
var sb = null, ready = null, me = null, admin = false, seenT = null, known = false;
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
    var meta = s.user.user_metadata || {}, cached = readCache(s.user.id);
    var fallback = cached ? cached.me : {id: s.user.id, name: meta.name, phone: meta.phone, created_at: s.user.created_at};
    // without internet the saved session (and the last known plan) still counts, so the app keeps working offline
    function offline() { me = fallback; admin = !!(cached && cached.admin); return me; }
    return sb.from('customers').select('id,name,phone,status,created_at,paid_until,bonus_days,ref_code').eq('id', s.user.id).maybeSingle().then(function (q) {
      if (q.error) return offline();
      if (q.data && q.data.status === 'blocked') return sb.auth.signOut().then(function () { me = null; admin = false; return null; });
      me = q.data || fallback;
      return sb.rpc('is_admin').then(function (a) { admin = !a.error && a.data === true; writeCache(); return me; });
    }, offline);
  });
}
var CACHE_KEY = 'jainjoy.me';
function readCache(id) { try { var c = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); return c && c.me && c.me.id === id ? c : null; } catch (e) { return null; } }
function writeCache() { try { localStorage.setItem(CACHE_KEY, JSON.stringify({me: me, admin: admin})); localStorage.setItem('jainjoy.hasAccount', '1'); } catch (e) {} }
/* business settings (UPI ID, support WhatsApp, contact) entered by the admin; cached for offline use */
var SETTING_KEYS = ['upiId', 'upiName', 'supportWhatsApp', 'contactName', 'contactEmail'];
function applySettings(s) { SETTING_KEYS.forEach(function (k) { if (s && s[k] != null && s[k] !== '') JJ.CONFIG[k] = s[k]; }); }
try { applySettings(JSON.parse(localStorage.getItem('jainjoy.settings') || 'null')); } catch (e) {}
function loadSettings() {
  return sb.from('app_settings').select('key,value').then(function (r) {
    if (r.error || !r.data) return;
    var s = {}; r.data.forEach(function (x) { s[x.key] = x.value; }); applySettings(s);
    try { localStorage.setItem('jainjoy.settings', JSON.stringify(s)); } catch (e) {}
  }, function () {});
}
var DAY = 864e5;
/* the customer's plan: admin, paid (until a date), trial (days left) or expired */
function access() {
  if (!me) return {state: 'none'};
  if (admin) return {state: 'admin'};
  var now = Date.now(), paid = me.paid_until ? new Date(me.paid_until).getTime() : 0;
  if (paid > now) return {state: 'paid', until: paid, daysLeft: Math.ceil((paid - now) / DAY)};
  var start = me.created_at ? new Date(me.created_at).getTime() : now, days = (JJ.CONFIG.trialDays || 7) + (me.bonus_days || 0), end = start + days * DAY;
  if (end > now) return {state: 'trial', until: end, daysLeft: Math.ceil((end - now) / DAY), wasPaid: !!paid};
  return {state: 'expired', until: paid || end, wasPaid: !!paid};
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
      return loadSettings().then(loadMe).then(function (u) { known = true; startSeen(); if (onChange) onChange(); return u; });
    }).catch(function () {
      // the sign-in library could not load (no internet and nothing cached): a session saved on this
      // phone still counts, so a signed-in customer is never locked out of their own app
      ready = null; known = true;
      try { var s = JSON.parse(localStorage.getItem('jainjoy.auth') || 'null'), u = s && (s.user || (s.currentSession && s.currentSession.user)); if (u) me = {id: u.id, name: (u.user_metadata || {}).name, phone: (u.user_metadata || {}).phone}; } catch (e) {}
      if (onChange) onChange(); return me;
    });
    return ready;
  },
  /* true once the saved sign-in has been checked (until then the app shows its loading screen) */
  get known() { return known || !configured(); },
  /* the household profile travels with the account, so signing in on a new phone brings it back */
  saveProfile: function (p) { if (!sb || !me) return Promise.resolve(); return sb.rpc('save_profile', {p: p}).then(function () {}, function () {}); },
  loadProfile: function () {
    if (!sb || !me) return Promise.resolve(null);
    return sb.from('customers').select('profile').eq('id', me.id).maybeSingle().then(function (q) { return (q.data && q.data.profile) || null; }, function () { return null; });
  },
  signUp: function (f) {
    var errs = validate(f, true); if (errs.length) return Promise.resolve({errors: errs});
    var phone = cleanPhone(f.phone);
    return JJ.account.init().then(function () {
      if (!sb) return {errors: [{field: '', key: 'acc_err_offline'}]};
      return sb.auth.signUp({email: emailFor(phone), password: f.password, options: {data: {name: String(f.name).trim(), phone: phone, ref: JJ.account.refCode()}}}).then(function (r) {
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
          // a number that was never registered gets "please sign up" instead of "wrong password"
          if (k !== 'acc_err_wrong') return {errors: [{field: '', key: k}]};
          return sb.rpc('phone_registered', {p: phone}).then(function (q) { return {errors: [q.data === false ? {field: 'phone', key: 'acc_err_not_registered'} : {field: '', key: k}]}; }, function () { return {errors: [{field: '', key: k}]}; });
        }
        setFails({n: 0, at: 0});
        return sb.rpc('touch_login').then(loadMe).then(function (u) {
          if (!u) return {errors: [{field: '', key: 'acc_err_blocked'}]};
          startSeen(); return {ok: true};
        });
      });
    });
  },
  signOut: function () { if (!sb) return Promise.resolve(); return sb.auth.signOut().then(function () { me = null; admin = false; clearInterval(seenT); try { localStorage.removeItem(CACHE_KEY); } catch (e) {} }); },
  /* true once an account has been used on this phone: Sign In is shown first from then on */
  get hasAccountHere() { try { return localStorage.getItem('jainjoy.hasAccount') === '1'; } catch (e) { return false; } },

  /* ---- plan and payments ---- */
  access: access,
  refresh: function () { if (!sb || !me) return Promise.resolve(me); return loadMe(); },
  /* invite code of the friend whose link opened the app (kept until sign-up) */
  refCode: function () { try { return localStorage.getItem('jainjoy.ref') || ''; } catch (e) { return ''; } },
  submitPayment: function (utr) {
    utr = String(utr || '').replace(/\s/g, '');
    if (!/^[A-Za-z0-9]{6,40}$/.test(utr)) return Promise.resolve({error: 'pay_err_utr'});
    return sb.rpc('submit_payment', {p_utr: utr}).then(function (r) { return r.error ? {error: /pending/.test(r.error.message) ? 'pay_err_pending' : 'acc_err_generic'} : {ok: true}; }, function () { return {error: 'acc_err_offline'}; });
  },
  myPayments: function () {
    if (!sb || !me) return Promise.resolve([]);
    return sb.from('payments').select('id,utr,amount,status,created_at,decided_at').eq('customer_id', me.id).order('created_at', {ascending: false}).then(function (r) { return r.data || []; }, function () { return []; });
  },
  deleteMe: function () { return sb.rpc('delete_my_account').then(function (r) { if (r.error) return {error: r.error.message}; return sb.auth.signOut().then(function () { me = null; try { localStorage.removeItem(CACHE_KEY); localStorage.removeItem('jainjoy.hasAccount'); } catch (e) {} return {ok: true}; }); }); },

  /* ---- admin ---- */
  customers: function () {
    if (!sb || !admin) return Promise.resolve({error: 'admin'});
    return Promise.all([sb.from('customers').select('id,name,phone,status,created_at,last_login,last_seen,paid_until,bonus_days,referred_by').order('created_at', {ascending: false}), sb.from('admins').select('user_id'), sb.from('payments').select('id,customer_id,utr,amount,status,created_at,decided_at').order('created_at', {ascending: false})])
      .then(function (r) {
        if (r[0].error) return {error: r[0].error.message};
        var adm = {}; (r[1].data || []).forEach(function (a) { adm[a.user_id] = 1; });
        var byId = {}; r[0].data.forEach(function (c) { byId[c.id] = c; });
        var pays = (r[2].data || []).map(function (p) { var c = byId[p.customer_id] || {}; return Object.assign({}, p, {name: c.name, phone: c.phone}); });
        return {rows: r[0].data.filter(function (c) { return !adm[c.id]; }), payments: pays};
      });
  },
  setStatus: function (id, status) { return sb.rpc('admin_set_status', {cid: id, new_status: status}); },
  remove: function (id) { return sb.rpc('admin_delete_customer', {cid: id}); },
  decidePayment: function (pid, ok) { return sb.rpc('admin_decide_payment', {pid: pid, ok: ok}); },
  grantYear: function (id) { return sb.rpc('admin_grant_year', {cid: id}); },
  resetPassword: function (id, pw) { return sb.rpc('admin_reset_password', {cid: id, new_pw: pw}); },
  /* plan of any customer row (for the admin table), same rules as access() */
  /* admin: save the business settings; returns {ok} or {error} */
  saveSettings: function (s) { return sb.rpc('admin_set_settings', {s: s}).then(function (r) { if (r.error) return {error: r.error.message}; applySettings(s); try { localStorage.setItem('jainjoy.settings', JSON.stringify(Object.assign(JSON.parse(localStorage.getItem('jainjoy.settings') || '{}'), s))); } catch (e) {} return {ok: true}; }); },
  settingKeys: SETTING_KEYS,
  planOf: function (c) { var keep = me, ka = admin; me = c; admin = false; var a = access(); me = keep; admin = ka; return a; },
  /* live updates: a realtime subscription, with the 5-second poll in the app as a fallback */
  watch: function (cb) {
    if (!sb) return function () {};
    var ch = sb.channel('customers-admin').on('postgres_changes', {event: '*', schema: 'public', table: 'customers'}, function () { cb(); }).on('postgres_changes', {event: '*', schema: 'public', table: 'payments'}, function () { cb(); }).subscribe();
    return function () { try { sb.removeChannel(ch); } catch (e) {} };
  }
};
})(window.JJ = window.JJ || {});
