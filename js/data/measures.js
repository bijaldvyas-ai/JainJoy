/* Kitchen measures: grams in one level katori (about 150 ml, the everyday steel bowl) for each ingredient,
   so a recipe can say "300 g (≈ 2½ katori)". Values are household approximations, not lab weights.
   Breads also say how many pieces the dough makes, from the flour weight of one piece. */
(function (JJ) {
'use strict';
var K = {};
function set(g, ids) { ids.split(' ').forEach(function (id) { K[id] = g; }); }
set(75, 'atta bhakriatta maida jowar bajra ragi makai riceflour besan handvoflour');
set(110, 'rava dalia sevai');
set(125, 'rice basmati bajragrain samo rajgira moongdal moongchilka moong toor chanadal masoor urad wholeurad rajma chole kalachana chawla matki val');
set(45, 'poha'); set(20, 'mamra'); set(60, 'oats'); set(15, 'makhana');
set(150, 'milk cream water curd'); set(90, 'paneer'); set(100, 'khoya almonds cashews');
set(130, 'sugar'); set(120, 'jaggery dates'); set(110, 'peanuts raisins'); set(60, 'drycoconut');
set(50, 'sev'); set(40, 'gathiya'); set(90, 'roastchana');
JJ.KATORI = K;
JJ.KATORI_VEG = 80;   // chopped vegetables
JJ.KATORI_LEAFY = 40; // chopped leaves

/* katori count for an amount in the ingredient's own unit (g or ml); null when a katori is not a sensible measure */
JJ.katori = function (id, q) {
  var g = JJ.ING && JJ.ING[id]; if (!g || (g.unit !== 'g' && g.unit !== 'ml')) return null;
  var per = K[id] || (g.cat === 'veg' ? JJ.KATORI_VEG : g.cat === 'leafy' ? JJ.KATORI_LEAFY : 0);
  if (!per || q < per / 4 || q < 30) return null;
  return q / per;
};

/* flour in one piece, by bread name: [pattern, grams] — the first match wins */
var PIECE = [[/puri/i, 15], [/thepla/i, 30], [/paratha|parotha|kulcha|naan/i, 60], [/rotla|rotlo|bajra|makki|makai/i, 80], [/bhakri|bhakhri/i, 50], [/phulka|rotli|roti|chapati|poli|fulka/i, 25]];
var FLOUR = {atta: 1, bhakriatta: 1, maida: 1, jowar: 1, bajra: 1, ragi: 1, makai: 1, riceflour: 1, besan: 1};
/* how many pieces a bread recipe makes for a scaling factor f (household size / base serves); 0 when unknown */
JJ.breadPieces = function (r, f) {
  if (!r || r.comp !== 'bread') return 0;
  var per = 0;
  for (var i = 0; i < PIECE.length && !per; i++) if (PIECE[i][0].test(r.en)) per = PIECE[i][1];
  if (!per) return 0;
  var flour = 0;
  r.ings.forEach(function (x) { if (FLOUR[x.id]) flour += x.q; });
  return flour ? Math.round(flour * (f || 1) / per) : 0;
};
})(window.JJ = window.JJ || {});
