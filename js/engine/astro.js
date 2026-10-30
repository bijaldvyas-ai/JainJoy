/* JainJoy astronomy layer.
   Primary engine: Astronomy Engine (MIT, Don Cross) loaded from jsDelivr, accurate to arc-seconds.
   Fallback engine (offline first run): built-in Meeus series, accurate to a few minutes of tithi time.
   Everything here works in UTC milliseconds; time zones are handled with Intl. */
(function (JJ) {
'use strict';
var RD = Math.PI / 180, DAY = 864e5;
function mod(a, n) { return ((a % n) + n) % n; }
function sn(x) { return Math.sin(x * RD); } function cs(x) { return Math.cos(x * RD); }
function T(ms) { return (ms / DAY + 2440587.5 - 2451545) / 36525; }

/* ---------- Meeus fallback ---------- */
function sunLongM(ms) {
  var t = T(ms), L0 = 280.46646 + 36000.76983 * t, M = 357.52911 + 35999.05029 * t;
  var C = (1.914602 - 0.004817 * t) * sn(M) + (0.019993 - 0.000101 * t) * sn(2 * M) + 0.000289 * sn(3 * M);
  return mod(L0 + C - 0.00569 - 0.00478 * sn(125.04 - 1934.136 * t), 360);
}
function moonLongM(ms) {
  var t = T(ms);
  var Lp = 218.3164477 + 481267.88123421 * t, D = 297.8501921 + 445267.1114034 * t, M = 357.5291092 + 35999.0502909 * t,
      Mp = 134.9633964 + 477198.8675055 * t, F = 93.2720950 + 483202.0175233 * t, E = 1 - 0.002516 * t;
  var l = 6.288774 * sn(Mp) + 1.274027 * sn(2 * D - Mp) + 0.658314 * sn(2 * D) + 0.213618 * sn(2 * Mp) - 0.185116 * E * sn(M) - 0.114332 * sn(2 * F)
    + 0.058793 * sn(2 * D - 2 * Mp) + 0.057066 * E * sn(2 * D - M - Mp) + 0.053322 * sn(2 * D + Mp) + 0.045758 * E * sn(2 * D - M) - 0.040923 * E * sn(M - Mp) - 0.034720 * sn(D)
    - 0.030383 * E * sn(M + Mp) + 0.015327 * sn(2 * D - 2 * F) - 0.012528 * sn(Mp + 2 * F) + 0.010980 * sn(Mp - 2 * F) + 0.010675 * sn(4 * D - Mp) + 0.010034 * sn(3 * Mp)
    + 0.008548 * sn(4 * D - 2 * Mp) - 0.007888 * E * sn(2 * D + M - Mp) - 0.006766 * E * sn(2 * D + M) - 0.005163 * sn(D - Mp) + 0.004987 * E * sn(D + M) + 0.004036 * E * sn(2 * D - M + Mp)
    + 0.003994 * sn(2 * D + 2 * Mp) + 0.003861 * sn(4 * D) + 0.003665 * sn(2 * D - 3 * Mp) - 0.002689 * E * sn(M - 2 * Mp) - 0.002602 * sn(Mp - 2 * F + 2 * D)
    + 0.002390 * E * sn(2 * D - M - 2 * Mp) - 0.002348 * sn(D + Mp) + 0.002236 * E * E * sn(2 * D - 2 * M) - 0.002120 * E * sn(M + 2 * Mp) - 0.002069 * E * E * sn(2 * M);
  return mod(Lp + l - 0.00478 * sn(125.04 - 1934.136 * t), 360);
}
/* NOAA sunrise/sunset (upper limb, standard refraction). dir +1 rise, -1 set. */
function riseSetM(dayStartMs, lat, lon, dir) {
  var noonGuess = dayStartMs + DAY / 2, t = T(noonGuess);
  var L0 = mod(280.46646 + 36000.76983 * t, 360), M = 357.52911 + 35999.05029 * t, e = 0.016708634 - 0.000042037 * t;
  var lam = sunLongM(noonGuess), eps = 23.4392911 - 0.0130042 * t + 0.00256 * cs(125.04 - 1934.136 * t);
  var dec = Math.asin(sn(eps) * sn(lam)) / RD, y = Math.pow(Math.tan(eps * RD / 2), 2);
  var eot = 4 / RD * (y * Math.sin(2 * L0 * RD) - 2 * e * Math.sin(M * RD) + 4 * e * y * Math.sin(M * RD) * Math.cos(2 * L0 * RD) - 0.5 * y * y * Math.sin(4 * L0 * RD) - 1.25 * e * e * Math.sin(2 * M * RD));
  var c = (sn(-0.833) - sn(lat) * sn(dec)) / (cs(lat) * cs(dec));
  if (c > 1 || c < -1) return null;
  var H = Math.acos(c) / RD;
  // solar noon in UTC minutes for this UTC calendar day, then pick the event nearest the local day
  var utcDay = Math.floor(noonGuess / DAY) * DAY;
  var ev = utcDay + (720 - 4 * lon - eot - dir * 4 * H) * 6e4;
  while (ev < dayStartMs) ev += DAY; while (ev >= dayStartMs + DAY) ev -= DAY;
  return ev;
}

/* ---------- engine selection ---------- */
var A = null;
function engine() { if (!A && window.Astronomy && window.Astronomy.MoonPhase) A = window.Astronomy; return A; }
JJ.astro = {
  name: function () { return engine() ? 'Astronomy Engine 2.1.19' : 'Built-in Meeus (offline fallback)'; },
  /* moon - sun ecliptic longitude, 0..360 */
  elong: function (ms) {
    var a = engine(); if (a) return a.MoonPhase(new Date(ms));
    return mod(moonLongM(ms) - sunLongM(ms), 360);
  },
  sunLong: function (ms) {
    var a = engine(); if (a) return a.SunPosition(new Date(ms)).elon;
    return sunLongM(ms);
  },
  /* sunrise (dir=+1) or sunset (dir=-1) within the local day starting at dayStartMs */
  riseSet: function (dayStartMs, lat, lon, dir) {
    var a = engine();
    if (a) {
      try {
        var r = a.SearchRiseSet(a.Body.Sun, new a.Observer(lat, lon, 0), dir, new Date(dayStartMs), 1);
        return r ? r.date.getTime() : null;
      } catch (e) { /* fall through */ }
    }
    return riseSetM(dayStartMs, lat, lon, dir);
  },
  /* Lahiri ayanamsa (degrees) for sidereal month names */
  ayanamsa: function (ms) { return 23.85305 + T(ms) * 1.396971; },
  meeus: {sunLong: sunLongM, moonLong: moonLongM, riseSet: riseSetM}
};

/* ---------- time zones ---------- */
var fmtCache = {};
function parts(ms, tz) {
  var f = fmtCache[tz];
  if (!f) f = fmtCache[tz] = new Intl.DateTimeFormat('en-US', {timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'});
  var o = {}; f.formatToParts(new Date(ms)).forEach(function (p) { o[p.type] = p.value; });
  return o;
}
JJ.tz = {
  offsetMin: function (ms, tz) {
    var p = parts(ms, tz);
    var wall = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
    return Math.round((wall - Math.floor(ms / 1000) * 1000) / 6e4);
  },
  /* UTC ms of local midnight for the ISO date in tz */
  midnight: function (iso, tz) {
    var y = +iso.slice(0, 4), m = +iso.slice(5, 7), d = +iso.slice(8, 10), base = Date.UTC(y, m - 1, d);
    var g = base - JJ.tz.offsetMin(base, tz) * 6e4;
    g = base - JJ.tz.offsetMin(g, tz) * 6e4;
    return g;
  },
  isoOf: function (ms, tz) { var p = parts(ms, tz); return p.year + '-' + p.month + '-' + p.day; },
  deviceTz: function () { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata'; } catch (e) { return 'Asia/Kolkata'; } },
  /* HH:MM in tz, 12 or 24 hour, localised digits off (keeps Latin digits for readability) */
  hm: function (ms, tz, lang) {
    if (ms == null) return '—';
    return new Intl.DateTimeFormat(lang === 'hi' ? 'hi-IN' : lang === 'gu' ? 'gu-IN' : 'en-IN', {timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: true, numberingSystem: 'latn'}).format(new Date(ms));
  }
};
/* "Today" in the household's city (falls back to the device time zone). */
JJ.todayISO = function (tz) { return JJ.tz.isoOf(Date.now(), tz || JJ.tz.deviceTz()); };
})(window.JJ = window.JJ || {});
