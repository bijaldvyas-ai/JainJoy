/* JainJoy regions: countries, states, cities (with coordinates and time zone),
   regional cuisines and the lunch (thali) structure each cuisine follows. */
(function (JJ) {
'use strict';

/* Regional cuisines. lunch = ordered thali slots. Recipe slots use component recipes;
   acc:* slots use simple accompaniments (not full recipes). */
JJ.CUISINES = {
  guj:{en:'Gujarati',hi:'गुजराती',gu:'ગુજરાતી', lunch:['bread','sabzi','dalkadhi','rice','salad','acc:papad','acc:pickle','acc:chaas'], breads:['guj','gen']},
  mah:{en:'Maharashtrian',hi:'महाराष्ट्रीयन',gu:'મહારાષ્ટ્રીયન', lunch:['bread','sabzi','dal','rice','salad','acc:chutney','acc:papad'], breads:['mah','gen']},
  raj:{en:'Rajasthani',hi:'राजस्थानी',gu:'રાજસ્થાની', lunch:['bread','sabzi','dal','rice','acc:chaas','acc:pickle'], breads:['raj','gen']},
  pun:{en:'Punjabi',hi:'पंजाबी',gu:'પંજાબી', lunch:['bread','sabzi','dal','rice','salad','raita','acc:pickle'], breads:['pun','gen']},
  nor:{en:'North Indian (Delhi / UP)',hi:'उत्तर भारतीय (दिल्ली / यूपी)',gu:'ઉત્તર ભારતીય (દિલ્હી / યુપી)', lunch:['bread','sabzi','dal','rice','salad','raita'], breads:['nor','pun','gen']},
  mp:{en:'Malwa / Madhya Pradesh',hi:'मालवा / मध्य प्रदेश',gu:'માળવા / મધ્ય પ્રદેશ', lunch:['bread','sabzi','dal','rice','salad','acc:papad','acc:pickle'], breads:['mp','nor','gen']},
  sou:{en:'South Indian',hi:'दक्षिण भारतीय',gu:'દક્ષિણ ભારતીય', lunch:['rice','sambar','rasam','sabzi','acc:curd','acc:papad','acc:pickle'], breads:['sou']},
  ben:{en:'Bengali / Eastern',hi:'बंगाली / पूर्वी',gu:'બંગાળી / પૂર્વીય', lunch:['rice','dal','sabzi','bread','acc:chutneysweet','acc:papad'], breads:['ben','gen']},
  gen:{en:'Pan-Indian (mixed)',hi:'अखिल भारतीय (मिश्रित)',gu:'સર્વ ભારતીય (મિશ્ર)', lunch:['bread','sabzi','dal','rice','salad'], breads:['gen']}
};
/* When a cuisine has too few component recipes for a slot, borrow from these (in order). */
JJ.CUISINE_FALLBACK = {guj:['raj','mp','gen'], mah:['guj','gen'], raj:['guj','mp','gen'], pun:['nor','raj','gen'], nor:['pun','mp','gen'], mp:['nor','raj','guj','gen'], sou:['gen'], ben:['nor','gen'], gen:['guj','nor','pun','mah','raj','mp','sou','ben']};

JJ.SLOT_NAMES = {
  bread:{en:'Roti / bread',hi:'रोटी',gu:'રોટલી'}, sabzi:{en:'Sabzi',hi:'सब्ज़ी',gu:'શાક'}, dal:{en:'Dal',hi:'दाल',gu:'દાળ'},
  dalkadhi:{en:'Dal or kadhi',hi:'दाल या कढ़ी',gu:'દાળ કે કઢી'}, rice:{en:'Rice',hi:'चावल',gu:'ભાત'}, salad:{en:'Salad',hi:'सलाद',gu:'સલાડ'},
  raita:{en:'Raita',hi:'रायता',gu:'રાયતું'}, sambar:{en:'Sambar',hi:'सांबर',gu:'સાંભાર'}, rasam:{en:'Rasam',hi:'रसम',gu:'રસમ'}
};

/* Accompaniments: [en, hi, gu, ingredients per person] */
JJ.ACCOMP = {
  papad:{en:'Roasted papad',hi:'सिका पापड़',gu:'શેકેલો પાપડ',ings:'papad:1'},
  pickle:{en:'Pickle (achar)',hi:'अचार',gu:'અથાણું',ings:'pickle:10'},
  chaas:{en:'Chaas (buttermilk)',hi:'छाछ',gu:'છાશ',ings:'curd:60 jeerapw:0.2 salt:0.15', note:'dwidal'},
  curd:{en:'Plain curd',hi:'सादा दही',gu:'સાદું દહીં',ings:'curd:80', note:'dwidal'},
  chutney:{en:'Dry peanut chutney',hi:'मूंगफली की सूखी चटनी',gu:'સીંગની સૂકી ચટણી',ings:'peanuts:12 chillipw:0.15 salt:0.1'},
  chutneysweet:{en:'Sweet tomato chutney',hi:'टमाटर की मीठी चटनी',gu:'ટામેટાની મીઠી ચટણી',ings:'tomato:40 sugar:6 rai:0.1 salt:0.1'}
};

/* State -> default cuisine and lunar month system (amanta = month ends on new moon). */
/* India: every state and union territory (see regions-india.js). */
JJ.STATES = {IN:{}};
Object.keys(JJ.IN_STATES).forEach(function (k) {
  var s = JJ.IN_STATES[k];
  JJ.STATES.IN[k] = {en:s[0], hi:s[1], gu:s[2], cu:s[3], cal:s[4]};
});

JJ.COUNTRIES = {
  IN:{en:'India',hi:'भारत',gu:'ભારત'}, US:{en:'United States',hi:'अमेरिका',gu:'અમેરિકા'}, GB:{en:'United Kingdom',hi:'यूनाइटेड किंगडम',gu:'યુનાઇટેડ કિંગડમ'},
  CA:{en:'Canada',hi:'कनाडा',gu:'કેનેડા'}, KE:{en:'Kenya',hi:'केन्या',gu:'કેન્યા'}, TZ:{en:'Tanzania',hi:'तंज़ानिया',gu:'ટાન્ઝાનિયા'}, UG:{en:'Uganda',hi:'युगांडा',gu:'યુગાન્ડા'},
  AE:{en:'United Arab Emirates',hi:'संयुक्त अरब अमीरात',gu:'સંયુક્ત આરબ અમીરાત'}, SG:{en:'Singapore',hi:'सिंगापुर',gu:'સિંગાપોર'},
  AU:{en:'Australia',hi:'ऑस्ट्रेलिया',gu:'ઑસ્ટ્રેલિયા'}, NZ:{en:'New Zealand',hi:'न्यूज़ीलैंड',gu:'ન્યૂઝીલેન્ડ'}, BE:{en:'Belgium',hi:'बेल्जियम',gu:'બેલ્જિયમ'},
  HK:{en:'Hong Kong',hi:'हांगकांग',gu:'હોંગકોંગ'}, NP:{en:'Nepal',hi:'नेपाल',gu:'નેપાળ'}, JP:{en:'Japan',hi:'जापान',gu:'જાપાન'}
};

/* Cities: [country, state, English name, Hindi, Gujarati, lat, lon, IANA time zone] */
JJ.CITY_ROWS = [
];
JJ.IN_CITY_ROWS.forEach(function (r) { JJ.CITY_ROWS.push(['IN', r[0], r[1], r[2], r[3], r[4], r[5], 'Asia/Kolkata']); });
JJ.CITY_ROWS.push(
['US','','New York','न्यूयॉर्क','ન્યૂયોર્ક',40.7128,-74.0060,'America/New_York'],
['US','','Edison, New Jersey','एडिसन, न्यू जर्सी','એડિસન, ન્યૂ જર્સી',40.5187,-74.4121,'America/New_York'],
['US','','Boston','बोस्टन','બોસ્ટન',42.3601,-71.0589,'America/New_York'],
['US','','Washington DC','वॉशिंगटन डीसी','વૉશિંગ્ટન ડીસી',38.9072,-77.0369,'America/New_York'],
['US','','Atlanta','अटलांटा','એટલાન્ટા',33.7490,-84.3880,'America/New_York'],
['US','','Chicago','शिकागो','શિકાગો',41.8781,-87.6298,'America/Chicago'],
['US','','Houston','ह्यूस्टन','હ્યુસ્ટન',29.7604,-95.3698,'America/Chicago'],
['US','','Dallas','डैलस','ડલાસ',32.7767,-96.7970,'America/Chicago'],
['US','','Phoenix','फ़ीनिक्स','ફીનિક્સ',33.4484,-112.0740,'America/Phoenix'],
['US','','Los Angeles','लॉस एंजिल्स','લૉસ એન્જલસ',34.0522,-118.2437,'America/Los_Angeles'],
['US','','San Jose','सैन होज़े','સૅન હોઝે',37.3382,-121.8863,'America/Los_Angeles'],
['US','','Seattle','सिएटल','સિએટલ',47.6062,-122.3321,'America/Los_Angeles'],
['GB','','London','लंदन','લંડન',51.5074,-0.1278,'Europe/London'],
['GB','','Leicester','लेस्टर','લેસ્ટર',52.6369,-1.1398,'Europe/London'],
['GB','','Birmingham','बर्मिंघम','બર્મિંગહામ',52.4862,-1.8904,'Europe/London'],
['GB','','Manchester','मैनचेस्टर','માન્ચેસ્ટર',53.4808,-2.2426,'Europe/London'],
['CA','','Toronto','टोरंटो','ટોરોન્ટો',43.6532,-79.3832,'America/Toronto'],
['CA','','Montreal','मॉन्ट्रियल','મૉન્ટ્રિયલ',45.5019,-73.5674,'America/Toronto'],
['CA','','Calgary','कैलगरी','કૅલગરી',51.0447,-114.0719,'America/Edmonton'],
['CA','','Vancouver','वैंकूवर','વાનકુવર',49.2827,-123.1207,'America/Vancouver'],
['KE','','Nairobi','नैरोबी','નૈરોબી',-1.2921,36.8219,'Africa/Nairobi'],
['KE','','Mombasa','मोम्बासा','મોમ્બાસા',-4.0435,39.6682,'Africa/Nairobi'],
['TZ','','Dar es Salaam','दार एस सलाम','દાર એસ સલામ',-6.7924,39.2083,'Africa/Dar_es_Salaam'],
['UG','','Kampala','कंपाला','કમ્પાલા',0.3476,32.5825,'Africa/Kampala'],
['AE','','Dubai','दुबई','દુબઈ',25.2048,55.2708,'Asia/Dubai'],
['AE','','Abu Dhabi','अबू धाबी','અબુ ધાબી',24.4539,54.3773,'Asia/Dubai'],
['SG','','Singapore','सिंगापुर','સિંગાપોર',1.3521,103.8198,'Asia/Singapore'],
['AU','','Sydney','सिडनी','સિડની',-33.8688,151.2093,'Australia/Sydney'],
['AU','','Melbourne','मेलबर्न','મેલબર્ન',-37.8136,144.9631,'Australia/Melbourne'],
['NZ','','Auckland','ऑकलैंड','ઑકલેન્ડ',-36.8485,174.7633,'Pacific/Auckland'],
['BE','','Antwerp','एंटवर्प','એન્ટવર્પ',51.2194,4.4025,'Europe/Brussels'],
['HK','','Hong Kong','हांगकांग','હોંગકોંગ',22.3193,114.1694,'Asia/Hong_Kong'],
['NP','','Kathmandu','काठमांडू','કાઠમંડુ',27.7172,85.3240,'Asia/Kathmandu'],
['JP','','Tokyo','टोक्यो','ટોક્યો',35.6762,139.6503,'Asia/Tokyo']
);

JJ.CITIES = {};
JJ.CITY_ROWS.forEach(function (r) {
  var id = (r[0] + '-' + r[2]).toLowerCase().replace(/[^a-z0-9]+/g, '-');
  JJ.CITIES[id] = {id:id, country:r[0], state:r[1], en:r[2], hi:r[3], gu:r[4], lat:r[5], lon:r[6], tz:r[7]};
});
/* v1 stored a plain city name; map it to a v2 city id. */
JJ.cityIdByName = function (name) {
  var k; for (k in JJ.CITIES) if (JJ.CITIES[k].en === name) return k;
  var alias = {'Delhi':'in-new-delhi','Bengaluru':'in-bengaluru','Edison, New Jersey':'us-edison-new-jersey','Mysuru':'in-mysuru','Shravanabelagola':'in-shravanabelagola','Aurangabad':'in-chhatrapati-sambhajinagar'};
  return alias[name] || null;
};
})(window.JJ = window.JJ || {});
