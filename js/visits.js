/* JainJoy visitor counter: every time the app opens it adds one visit to the owner's Supabase
   (table `visits`, see db/supabase-visitors.sql). It sends only a random ID made on this phone, the
   city used for the timings, how the person arrived and whether they have a meal plan – no names,
   phone numbers or exact locations. It works whether or not Sign Up / Sign In is switched on. */
(function (JJ) {
'use strict';
function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
/* a random ID for this phone, made once */
function deviceId() {
  var id = store('jainjoy.device');
  if (!id) {
    var a = new Uint8Array(12); (window.crypto || window.msCrypto).getRandomValues(a);
    id = 'd' + Array.prototype.map.call(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
    store('jainjoy.device', id);
  }
  return id;
}
/* how this phone first arrived: an invite link, a WhatsApp share, or typed / other */
function source() {
  var s = store('jainjoy.source');
  if (!s) {
    var q = location.search, ref = document.referrer || '';
    s = /[?&]ref=/.test(q) ? 'invite' : /[?&]s=wa\b/.test(q) || /whatsapp/i.test(ref) ? 'whatsapp' : ref && ref.indexOf(location.host) < 0 ? 'other' : 'direct';
    store('jainjoy.source', s);
  }
  return s;
}
function placeOf(p) {
  if (!p) return {city: '', state: ''};
  var c = p.custom || (JJ.CITIES && JJ.CITIES[p.cityId]) || {}, st = p.country === 'IN' && JJ.STATES && JJ.STATES.IN[p.state];
  return {city: c.en || c.name || '', state: st ? st.en : (p.country || '')};
}
JJ.visits = {
  deviceId: deviceId,
  source: source,
  /* record one open of the app; p = the household profile (or null before setup) */
  log: function (p) {
    var c = JJ.CONFIG || {};
    if (!c.supabaseUrl || !c.supabaseKey || c.countVisits === false) return Promise.resolve(false);
    // test pages and the local preview never count
    if (window.JJ_DB_NAME || /^(localhost|127\.|\[::1\])/.test(location.hostname)) return Promise.resolve(false);
    var pl = placeOf(p);
    return fetch(c.supabaseUrl + '/rest/v1/rpc/log_visit', {
      method: 'POST', keepalive: true,
      headers: {apikey: c.supabaseKey, Authorization: 'Bearer ' + c.supabaseKey, 'Content-Type': 'application/json'},
      body: JSON.stringify({p_device: deviceId(), p_city: pl.city, p_state: pl.state, p_source: source(), p_has_plan: !!p})
    }).then(function (r) { return r.ok; }, function () { return false; });
  }
};
})(window.JJ = window.JJ || {});
