/* JainJoy ingredient classification.
   Adds to every ingredient: regional names and synonyms, restriction categories and a
   verification status. Names are matched across English, Hindi, Gujarati, Marathi and
   common transliterations so the same ingredient is recognised whatever it is called.
   A name that matches nothing is sent to Recipe admin for verification and is never
   treated as safe. */
(function (JJ) {
'use strict';
JJ.SYNONYMS = {
  // prohibited every day
  onion:['onion','pyaz','pyaaz','kanda','dungri','dungli','spring onion','shallot','प्याज','प्याज़','कांदा','ડુંગળી','કાંદા'],
  garlic:['garlic','lahsun','lasun','lehsun','lasan','लहसुन','लसूण','લસણ'],
  potato:['potato','aloo','alu','batata','बटाटा','आलू','બટાકા','બટેટા'],
  sweetpotato:['sweet potato','shakarkand','ratalu','sakkariya','शकरकंद','રતાળુ','શક્કરિયાં'],
  carrot:['carrot','gajar','गाजर','ગાજર'], radish:['radish','mooli','mula','मूली','मुळा','મૂળા'], beetroot:['beetroot','beet','chukandar','चुकंदर','બીટ'],
  ginger:['ginger','adrak','aadu','ale','fresh ginger','अदरक','आलं','આદુ'], turmericfresh:['fresh turmeric','kachi haldi','amba haldi','lili haldar','कच्ची हल्दी','લીલી હળદર'],
  arbi:['alavi','alvi','arbi','arvi','taro','colocasia','eddoe','ghuiyan','kesuvu','arbi root','अळवी','अरबी','अरवी','घुइयां','અળવી','અરબી'],
  alavileaves:['alavi leaves','patra','patra leaves','alu leaves','aluchi pane','arbi leaves','colocasia leaves','pathrode','अळूची पाने','अरबी के पत्ते','अळू','અળવીનાં પાન','પાતરાં'],
  suran:['suran','yam','elephant foot yam','jimikand','सूरन','जिमीकंद','સૂરણ'],
  sabudana:['sabudana','sago','tapioca','tapioca pearls','cassava','साबूदाना','साबुदाणा','સાબુદાણા'],
  mushroom:['mushroom','khumb','kukurmutta','मशरूम','મશરૂમ'],
  brinjal:['brinjal','eggplant','aubergine','baingan','ringan','vangi','बैंगन','वांगी','રીંગણ','રીંગણાં'],
  fig:['fig','anjeer','anjir','अंजीर','અંજીર'], guava:['guava','amrood','jamfal','peru','अमरूद','पेरू','જામફળ'],
  kaddu:['kaddu','pumpkin','red pumpkin','yellow pumpkin','sitaphal (pumpkin)','kashiphal','kolu','lal bhopla','bhopla','kumda','parangikai','कद्दू','सीताफल','काशीफल','भोपळा','કોળું'],
  sprouts:['sprouts','sprouted moong','ankurit','fangavela','moong sprouts','matki sprouts','अंकुरित','मोड','ફણગાવેલા'],
  honey:['honey','shahad','madh','शहद','मध','મધ'], butter:['butter','makhan','loni','मक्खन','लोणी','માખણ'],
  egg:['egg','anda','अंडा','ઈંડાં'], gelatin:['gelatin','gelatine','जिलेटिन'], yeast:['yeast','khameer','खमीर'],
  // vegetables and leaves (fresh produce)
  lauki:['lauki','dudhi','ghiya','bottle gourd','doodhi','sorakaya','लौकी','घिया','दुधी','દૂધી'], tinda:['tinda','round gourd','apple gourd','टिंडा','ટીંડા'],
  tindora:['tindora','tendli','tondli','kundru','ivy gourd','kovakkai','कुंदरू','तोंडली','ટીંડોળા'], turai:['turai','turiya','dodka','ridge gourd','तुरई','दोडका','તુરિયાં'],
  galka:['galka','gilki','sponge gourd','गिलकी','ગલકાં'], parval:['parval','potol','pointed gourd','परवल','પરવળ'], karela:['karela','kareli','bitter gourd','करेला','कारले','કારેલાં'],
  bhindi:['bhindi','bhinda','bhendi','okra','ladyfinger','भिंडी','भेंडी','ભીંડા'], gavar:['gavar','guar','cluster beans','ग्वार','गवार','ગુવાર'],
  beans:['french beans','beans','fansi','farasbi','फ्रेंच बीन्स','फरसबी','ફણસી'], valpapdi:['valor','val papdi','papdi','flat beans','sem','सेम','वालोर','વાલોળ પાપડી'],
  peas:['peas','green peas','matar','vatana','मटर','वाटाणा','વટાણા'], tuverlili:['lilva','lili tuver','fresh tuvar','हरी तुअर','લીલી તુવેર','લીલવા'],
  capsicum:['capsicum','shimla mirch','bell pepper','शिमला मिर्च','ढोबळी मिरची','કેપ્સિકમ','સિમલા મરચાં'], tomato:['tomato','tamatar','tameta','टमाटर','टोमॅटो','ટામેટાં'],
  cucumber:['cucumber','kakdi','kheera','khira','काकडी','खीरा','કાકડી'], corn:['sweet corn','corn','makai','bhutta','मकई','भुट्टा','મકાઈ'],
  rawbanana:['raw banana','kacha kela','plantain','कच्चा केला','કાચાં કેળાં'], rawpapaya:['raw papaya','kacha papita','कच्चा पपीता','કાચું પપૈયું'],
  rawmango:['raw mango','kachi keri','kairi','कैरी','कच्चा आम','કાચી કેરી'], drumstick:['drumstick','saragva','sahjan','shevga','moringa pods','सहजन','शेवगा','સરગવો'],
  chilli:['green chilli','hari mirch','lila marcha','mirchi','हरी मिर्च','हिरवी मिरची','લીલાં મરચાં'], lemon:['lemon','lime','nimbu','limbu','नींबू','लिंबू','લીંબુ'],
  cauliflower:['cauliflower','phool gobhi','flower','gobi','फूल गोभी','फ्लॉवर','ફ્લાવર'], cabbage:['cabbage','patta gobhi','kobi','पत्ता गोभी','कोबी','કોબી'],
  palak:['spinach','palak','पालक','પાલક'], methi:['methi leaves','fenugreek leaves','methi bhaji','मेथी','મેથીની ભાજી'],
  coriander:['coriander leaves','cilantro','kothmir','kothimbir','dhania patta','हरा धनिया','कोथिंबीर','કોથમીર'], curry:['curry leaves','kadi patta','mitho limdo','कढ़ी पत्ता','कढीपत्ता','મીઠો લીમડો'],
  mint:['mint','pudina','phudino','पुदीना','ફુદીનો'], suva:['dill','suva','shepu','सोआ','शेपू','સુવા'], chawli:['amaranth leaves','chawli','tandalja','chaulai','चौलाई','તાંદળજો'],
  sarson:['mustard greens','sarson saag','सरसों का साग'], kasurimethi:['kasuri methi','dried fenugreek leaves','कसूरी मेथी','કસૂરી મેથી'],
  coconut:['fresh coconut','grated coconut','nariyal','naral','नारियल','ओला नारळ','લીલું નાળિયેર'], paneer:['paneer','cottage cheese','chhena','पनीर','પનીર'],
  curd:['curd','dahi','yogurt','yoghurt','दही','दहीं','દહીં'], besan:['besan','gram flour','chickpea flour','chana atta','बेसन','ચણાનો લોટ'],
  atta:['wheat flour','atta','gehun ka atta','kanik','गेहूं का आटा','કણક','ઘઉંનો લોટ'], toor:['toor dal','tuvar dal','arhar dal','pigeon pea','तुअर दाल','अरहर','તુવેર દાળ']
};
/* classification per ingredient: restriction category and verification */
var STRICT_CAT = {veg: 'fresh-vegetable', leafy: 'leafy-herb'};
Object.keys(JJ.ING).forEach(function (id) {
  var g = JJ.ING[id];
  g.syn = (JJ.SYNONYMS[id] || []).slice();
  g.isRoot = g.banned === 'root' || g.banned === 'bulb' || ['ginger', 'turmericfresh', 'suran', 'arbi'].indexOf(id) >= 0;
  g.isLeafy = g.L;
  g.isFreshVeg = g.cat === 'veg' || g.cat === 'leafy';     // every fresh vegetable, leaf and herb
  g.isHerb = g.cat === 'leafy' && ['coriander', 'curry', 'mint', 'suva'].indexOf(id) >= 0;
  g.isSprout = id === 'sprouts';
  g.isFruit = g.cat === 'fruit';
  g.everyday = g.banned ? 'prohibited' : 'allowed';
  g.parva = g.banned ? 'prohibited' : (g.isFreshVeg || g.L) ? 'prohibited' : g.isFruit ? 'household-choice' : 'allowed';
  g.household = g.C ? 'optional-avoid' : id === 'lauki' ? 'optional-avoid' : null;
  g.jainCategory = g.banned ? g.banned : STRICT_CAT[g.cat] || (g.isFruit ? 'fresh-fruit' : 'permitted');
  g.verified = 'confirmed';
});

function norm(s) { return String(s || '').toLowerCase().replace(/\(.*?\)/g, ' ').replace(/[^a-z0-9ऀ-૿ ]+/g, ' ').replace(/\s+/g, ' ').trim(); }
var INDEX = null;
function buildIndex() {
  INDEX = {};
  Object.keys(JJ.ING).forEach(function (id) {
    var g = JJ.ING[id];
    [id, g.en, g.hi, g.gu].concat(g.syn).forEach(function (n) { var k = norm(n); if (k && !INDEX[k]) INDEX[k] = id; });
  });
  (JJ.customSynonyms || []).forEach(function (s) { INDEX[norm(s.name)] = s.id; });
}
/* Find an ingredient id from any name (English, Hindi, Gujarati, Marathi, transliteration). null = unknown. */
JJ.resolveIngredient = function (name) {
  if (!INDEX) buildIndex();
  var k = norm(name); if (!k) return null;
  if (INDEX[k]) return INDEX[k];
  var sing = k.replace(/(es|s)$/, ''); if (INDEX[sing]) return INDEX[sing];
  return null;
};
JJ.rebuildIngredientIndex = buildIndex;
})(window.JJ = window.JJ || {});
