/* JainJoy Panchang engine.
   Tithi = 12-degree step of (Moon - Sun) longitude. The tithi of a civil day is the tithi
   prevailing at local sunrise (udaya tithi) in the user's city. Jain parva rule for skipped
   or repeated tithis (Umaswati): "kshaye purva tithi karya, vriddhau karya tathottara" -
   a skipped (kshaya) tithi is observed on the previous day, a repeated (vriddhi) tithi on
   the second day. Lunar months are named by the sidereal sign of the Sun at the new moon
   (Lahiri ayanamsa); purnimanta regions shift the Krishna-paksha month name by one. */
(function (JJ) {
'use strict';
var DAY = 864e5, RATE = 12.190749; // mean elongation speed, degrees per day
function mod(a, n) { return ((a % n) + n) % n; }
function tithiAt(ms) { return Math.floor(JJ.astro.elong(ms) / 12) + 1; } // 1..30

/* time (ms) when elongation reaches `target` degrees (mod 360), searching near `ms` */
function solveElong(ms, target) {
  var t = ms;
  for (var i = 0; i < 8; i++) {
    var d = mod(target - JJ.astro.elong(t) + 180, 360) - 180;
    if (Math.abs(d) < 1e-5) break;
    t += d / RATE * DAY;
  }
  return t;
}
function tithiEnd(ms) { var e = JJ.astro.elong(ms); return solveElong(ms + (Math.floor(e / 12) * 12 + 12 - e) / RATE * DAY, Math.floor(e / 12) * 12 + 12); }
function prevNewMoon(ms) { var e = JJ.astro.elong(ms); return solveElong(ms - e / RATE * DAY, 0); }
function nextNewMoon(ms) { var e = JJ.astro.elong(ms); return solveElong(ms + (360 - e) / RATE * DAY, 360); }
function rashiAt(ms) { return Math.floor(mod(JJ.astro.sunLong(ms) - JJ.astro.ayanamsa(ms), 360) / 30); }

JJ.MONTHS = [
  ['Chaitra','चैत्र','ચૈત્ર'],['Vaishakh','वैशाख','વૈશાખ'],['Jeth','ज्येष्ठ','જેઠ'],['Ashadh','आषाढ़','અષાઢ'],
  ['Shravan','श्रावण','શ્રાવણ'],['Bhadarvo','भाद्रपद','ભાદરવો'],['Aso','आश्विन','આસો'],['Kartak','कार्तिक','કારતક'],
  ['Magshar','मार्गशीर्ष','માગશર'],['Posh','पौष','પોષ'],['Maha','माघ','મહા'],['Fagan','फाल्गुन','ફાગણ']
];
JJ.TITHI_NAMES = {
  en: ['Ekam','Beej','Trij','Choth','Pancham','Chhath','Satam','Aatham','Nom','Dasham','Agiyaras','Baras','Teras','Chaudas','Punam','Amas'],
  hi: ['एकम','दूज','तीज','चौथ','पंचमी','छठ','सातम','आठम','नवमी','दशमी','ग्यारस','बारस','तेरस','चौदस','पूनम','अमावस'],
  gu: ['એકમ','બીજ','ત્રીજ','ચોથ','પાંચમ','છઠ','સાતમ','આઠમ','નોમ','દશમ','અગિયારસ','બારસ','તેરસ','ચૌદસ','પૂનમ','અમાસ']
};
JJ.tithiName = function (t, lang) { var n = JJ.TITHI_NAMES[lang] || JJ.TITHI_NAMES.en; return t === 15 ? n[14] : t === 30 ? n[15] : n[(t - 1) % 15]; };

/* Jain observances by amanta month (0 = Chaitra), paksha and tithi. trad: all | swt | dig */
JJ.OBSERVANCES = [
  {k:'mahavir_janma', m:0, p:'S', n:13, trad:'all', en:'Mahavir Janma Kalyanak', hi:'महावीर जन्म कल्याणक', gu:'મહાવીર જન્મ કલ્યાણક'},
  {k:'oli_chaitra', m:0, p:'S', from:7, to:15, trad:'swt', en:'Ayambil Oli (Chaitra)', hi:'आयंबिल ओली (चैत्र)', gu:'આયંબિલ ઓળી (ચૈત્ર)'},
  {k:'akshaya_tritiya', m:1, p:'S', n:3, trad:'all', en:'Akshaya Tritiya (Varshitap Parna)', hi:'अक्षय तृतीया (वर्षीतप पारणा)', gu:'અક્ષય તૃતીયા (વર્ષીતપ પારણાં)'},
  {k:'chaumasi_ashadh', m:3, p:'S', n:14, trad:'all', en:'Ashadhi Chaumasi Chaudas (Chaturmas begins)', hi:'आषाढ़ी चौमासी चौदस (चातुर्मास आरंभ)', gu:'અષાઢી ચોમાસી ચૌદસ (ચાતુર્માસ પ્રારંભ)'},
  {k:'samvatsari', m:5, p:'S', n:4, trad:'swt', en:'Samvatsari (end of Paryushan)', hi:'संवत्सरी (पर्युषण का अंतिम दिन)', gu:'સંવત્સરી (પર્યુષણનો છેલ્લો દિવસ)'},
  {k:'das_lakshan', m:5, p:'S', from:5, to:14, trad:'dig', en:'Das Lakshan Parva', hi:'दशलक्षण पर्व', gu:'દશલક્ષણ પર્વ'},
  {k:'anant_chaudas', m:5, p:'S', n:14, trad:'dig', en:'Anant Chaturdashi', hi:'अनंत चतुर्दशी', gu:'અનંત ચતુર્દશી'},
  {k:'kshamavani', m:5, p:'K', n:1, trad:'dig', en:'Kshamavani Parva', hi:'क्षमावाणी पर्व', gu:'ક્ષમાવાણી પર્વ'},
  {k:'oli_aso', m:6, p:'S', from:7, to:15, trad:'swt', en:'Ayambil Oli (Aso)', hi:'आयंबिल ओली (आसो)', gu:'આયંબિલ ઓળી (આસો)'},
  {k:'diwali', m:6, p:'K', n:15, trad:'all', en:'Diwali – Mahavir Nirvan Kalyanak', hi:'दीपावली – महावीर निर्वाण कल्याणक', gu:'દિવાળી – મહાવીર નિર્વાણ કલ્યાણક'},
  {k:'new_year', m:7, p:'S', n:1, trad:'all', en:'Jain New Year – Gautam Swami Kevalgnan', hi:'जैन नववर्ष – गौतम स्वामी केवलज्ञान', gu:'જૈન નૂતન વર્ષ – ગૌતમ સ્વામી કેવળજ્ઞાન'},
  {k:'gyan_pancham', m:7, p:'S', n:5, trad:'swt', en:'Gyan Pancham (Labh Pancham)', hi:'ज्ञान पंचमी (लाभ पंचमी)', gu:'જ્ઞાન પંચમી (લાભ પાંચમ)'},
  {k:'chaumasi_kartak', m:7, p:'S', n:14, trad:'all', en:'Kartaki Chaumasi Chaudas', hi:'कार्तिक चौमासी चौदस', gu:'કારતકી ચોમાસી ચૌદસ'},
  {k:'kartik_punam', m:7, p:'S', n:15, trad:'all', en:'Kartik Purnima (Siddhachal Yatra)', hi:'कार्तिक पूर्णिमा (सिद्धाचल यात्रा)', gu:'કારતક પૂનમ (સિદ્ધાચલ યાત્રા)'},
  {k:'maun_ekadashi', m:8, p:'S', n:11, trad:'swt', en:'Maun Ekadashi', hi:'मौन एकादशी', gu:'મૌન એકાદશી'},
  {k:'posh_dashami', m:8, p:'K', n:10, trad:'all', en:'Posh Dashami – Parshvanath Janma Kalyanak', hi:'पौष दशमी – पार्श्वनाथ जन्म कल्याणक', gu:'પોષ દશમી – પાર્શ્વનાથ જન્મ કલ્યાણક'},
  {k:'meru_teras', m:9, p:'K', n:13, trad:'all', en:'Meru Trayodashi – Rishabhdev Nirvan', hi:'मेरु त्रयोदशी – ऋषभदेव निर्वाण', gu:'મેરુ તેરસ – ઋષભદેવ નિર્વાણ'},
  {k:'chaumasi_fagan', m:11, p:'S', n:14, trad:'all', en:'Fagan Chaumasi Chaudas', hi:'फाल्गुन चौमासी चौदस', gu:'ફાગણ ચોમાસી ચૌદસ'},
  {k:'rishabh_janma', m:11, p:'K', n:8, trad:'all', en:'Rishabhdev Janma Kalyanak (Varshitap begins)', hi:'ऋषभदेव जन्म कल्याणक (वर्षीतप आरंभ)', gu:'ઋષભદેવ જન્મ કલ્યાણક (વર્ષીતપ પ્રારંભ)'}
];

var cache = new Map();
function city(c) { return c; }

/* Raw sunrise data for a civil date in a city */
function sunDay(iso, c) {
  var key = 's|' + iso + '|' + c.lat + '|' + c.lon;
  if (cache.has(key)) return cache.get(key);
  var mid = JJ.tz.midnight(iso, c.tz);
  var rise = JJ.astro.riseSet(mid, c.lat, c.lon, +1), set = JJ.astro.riseSet(mid, c.lat, c.lon, -1);
  if (rise == null) rise = mid + 6 * 36e5; // polar fallback: 06:00 local
  if (set == null) set = mid + 18 * 36e5;
  var r = {iso: iso, mid: mid, rise: rise, set: set, t: tithiAt(rise)};
  cache.set(key, r); return r;
}
function addDays(iso, k) { var d = new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) + k * DAY); return d.toISOString().slice(0, 10); }
JJ.addDays = addDays;

/* amanta month of an instant: {m: 0..11, adhik: bool} */
function lunarMonth(ms) {
  var key = 'm|' + Math.round(ms / 36e5);
  if (cache.has(key)) return cache.get(key);
  var nm = prevNewMoon(ms), nn = nextNewMoon(ms + 3600e3);
  if (nn - nm < 25 * DAY) nn = nextNewMoon(nm + 27 * DAY);
  var r1 = rashiAt(nm), r2 = rashiAt(nn);
  var res = {m: (r1 + 1) % 12, adhik: r1 === r2, start: nm, end: nn};
  cache.set(key, res); return res;
}

/* Full panchang for a civil date. prof: {calendar: 'amanta'|'purnimanta', trad: 'Shwetambar'|'Digambar', subsect} */
JJ.panchang = function (iso, c, prof) {
  prof = prof || {};
  var key = 'p|' + iso + '|' + c.lat + '|' + c.lon + '|' + (prof.calendar || '') + '|' + (prof.trad || '') + '|' + (prof.subsect || '');
  if (cache.has(key)) return cache.get(key);
  var today = sunDay(iso, c), prev = sunDay(addDays(iso, -1), c), next = sunDay(addDays(iso, 1), c);
  var t = today.t, n = ((t - 1) % 15) + 1, paksha = t <= 15 ? 'S' : 'K';
  var vriddhiFirst = next.t === t;             // same tithi at next sunrise: observe on the second day
  var vriddhiSecond = prev.t === t;
  var skipped = mod(next.t - t, 30) === 2 ? (t % 30) + 1 : null; // kshaya tithi between today and tomorrow
  var observed = [];
  if (!vriddhiFirst) observed.push(t);
  if (skipped) observed.push(skipped);
  function isN(list, k) { return list.some(function (x) { return ((x - 1) % 15) + 1 === k; }); }
  var lm = lunarMonth(today.rise);
  var monthIdx = lm.m;
  var shownMonth = (prof.calendar === 'purnimanta' && paksha === 'K') ? (monthIdx + 1) % 12 : monthIdx;
  var obs = [];
  var dig = prof.trad === 'Digambar', swt = !dig;
  observed.forEach(function (tt) {
    var nn = ((tt - 1) % 15) + 1, pp = tt <= 15 ? 'S' : 'K';
    JJ.OBSERVANCES.forEach(function (o) {
      if (lm.adhik) return; // festivals are kept in the regular (nija) month
      if (o.m !== monthIdx || o.p !== pp) return;
      if (o.trad === 'swt' && !swt) return; if (o.trad === 'dig' && !dig) return;
      var hit = o.n ? o.n === nn : (nn >= o.from && nn <= o.to);
      if (o.k === 'samvatsari' && /Sthanakvasi|Terapanth/.test(prof.subsect || '')) hit = nn === 5;
      if (hit && obs.indexOf(o) < 0) obs.push(o);
    });
  });
  var res = {
    iso: iso, rise: today.rise, set: today.set, mid: today.mid,
    t: t, n: n, paksha: paksha, tithiEnd: tithiEnd(today.rise),
    observed: observed, skipped: skipped, vriddhi: vriddhiFirst || vriddhiSecond, vriddhiFirst: vriddhiFirst,
    aatham: isN(observed, 8), chaudas: isN(observed, 14),
    pancham: isN(observed, 5), shuklaPancham: observed.some(function (x) { return x === 5; }),
    beej: isN(observed, 2), agiyaras: isN(observed, 11), punam: observed.indexOf(15) >= 0, amas: observed.indexOf(30) >= 0,
    month: shownMonth, amantaMonth: monthIdx, adhik: lm.adhik, observances: obs
  };
  cache.set(key, res); return res;
};
JJ.panchangReset = function () { cache.clear(); };

/* Which restrictions apply on a day, given the household's observance settings. */
JJ.dayRules = function (p, prof) {
  var r = {noLeafy: false, noGreen: false, reasons: []};
  if (p.aatham || p.chaudas) { r.noLeafy = true; r.reasons.push(p.aatham ? 'aatham' : 'chaudas'); }
  var g = prof.greenRule || 'none';
  var five = p.beej || p.pancham || p.aatham || p.agiyaras || p.chaudas;
  if (g === 'ac' && (p.aatham || p.chaudas)) r.noGreen = true;
  if (g === 'five' && five) r.noGreen = true;
  if (g === 'twelve' && (five || p.punam || p.amas)) r.noGreen = true;
  if (prof.shuklaPanchamGreen && p.shuklaPancham) { r.noGreen = true; r.reasons.push('pancham'); }
  if (r.noGreen) r.noLeafy = true;
  return r;
};

/* Navkarsi / Chauvihar timings. conv.navkarsi minutes after sunrise (48 = 1 muhurta),
   conv.chauvihar minutes before sunset (0 = at sunset). */
JJ.timings = function (p, conv) {
  conv = conv || {};
  var nav = conv.navkarsi != null ? conv.navkarsi : 48, cha = conv.chauvihar != null ? conv.chauvihar : 0;
  return {sunrise: p.rise, navkarsi: p.rise + nav * 6e4, sunset: p.set, chauvihar: p.set - cha * 6e4, porsi: p.rise + (p.set - p.rise) / 4};
};
})(window.JJ = window.JJ || {});
