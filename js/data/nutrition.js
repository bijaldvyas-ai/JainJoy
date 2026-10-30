/* Approximate nutrition per 100 g (or 100 ml) of each ingredient as bought/raw:
   [kcal, protein g, carbohydrate g, fat g]. Values are rounded figures from standard
   food composition tables (Indian Food Composition Tables 2017, USDA FoodData Central).
   They are for everyday guidance only, not for medical or clinical diets. */
(function (JJ) {
'use strict';
JJ.NUTRITION = {
  // vegetables
  lauki:[15,0.6,3.4,0.1], tinda:[21,1.4,3.4,0.2], tindora:[18,1.2,3.1,0.1], turai:[20,1.2,4.4,0.2], galka:[20,1.2,4.4,0.2],
  parval:[20,2.0,2.2,0.3], karela:[17,1.0,3.7,0.2], bhindi:[33,1.9,7.5,0.2], gavar:[26,3.2,4.6,0.4], beans:[31,1.8,7.0,0.2],
  valpapdi:[48,3.8,6.7,0.7], peas:[81,5.4,14.5,0.4], tuverlili:[136,7.2,23.9,1.6], capsicum:[20,0.9,4.6,0.2], tomato:[18,0.9,3.9,0.2],
  cucumber:[15,0.7,3.6,0.1], corn:[86,3.3,19.0,1.4], rawbanana:[100,1.2,26.0,0.3], rawpapaya:[32,0.6,7.0,0.1], rawmango:[60,0.7,15.0,0.4],
  drumstick:[37,2.1,8.5,0.2], chilli:[40,2.0,9.5,0.2], lemon:[29,1.1,9.3,0.3], cauliflower:[25,1.9,5.0,0.3], cabbage:[25,1.3,5.8,0.1],
  zucchini:[17,1.2,3.1,0.3],
  // leafy
  palak:[23,2.9,3.6,0.4], methi:[49,4.4,6.0,0.9], coriander:[23,2.1,3.7,0.5], curry:[108,6.1,18.7,1.0], mint:[44,3.3,8.4,0.7],
  suva:[43,3.5,7.0,1.1], chawli:[23,2.5,4.0,0.3], sarson:[27,2.9,4.7,0.4], kasurimethi:[300,23,50,4],
  // grains and flours
  rice:[360,7.0,79,0.6], basmati:[356,7.5,78,0.6], atta:[340,12,72,1.7], bhakriatta:[340,12,72,1.7], maida:[364,10,76,1.0],
  rava:[360,12.7,73,1.0], dalia:[342,12,72,1.5], poha:[350,6.6,77,1.2], jowar:[349,10.4,72.6,1.9], bajra:[361,11.6,67.5,5.0],
  bajragrain:[361,11.6,67.5,5.0], ragi:[328,7.3,72,1.3], makai:[365,9.4,74,4.7], riceflour:[366,6.0,80,1.4], sevai:[352,10,75,1.0],
  mamra:[325,7.5,73,0.5], oats:[389,16.9,66,6.9], samo:[307,6.2,65,2.2], rajgira:[371,13.6,65,7.0], khakhra:[410,12,66,11],
  handvoflour:[350,15,68,1.5],
  // pulses
  moongdal:[347,24,59,1.2], moongchilka:[348,24,60,1.3], moong:[347,24,63,1.2], toor:[343,22,63,1.5], chanadal:[360,20.8,60,5.6],
  masoor:[352,25,60,1.1], urad:[341,25,59,1.6], wholeurad:[341,25,59,1.6], rajma:[333,24,60,0.8], chole:[364,19,61,6.0],
  kalachana:[360,17,61,5.3], chawla:[336,23.5,60,1.3], matki:[343,23,62,1.6], val:[347,21,60,1.5], besan:[387,22,58,6.7],
  moongvadi:[350,24,58,2.0], papad:[371,26,60,3.0], sev:[550,13,45,35], gathiya:[550,13,45,35], roastchana:[370,22,58,5.0],
  methiseeds:[323,23,58,6.4],
  // dairy
  milk:[61,3.2,4.8,3.3], curd:[60,3.1,4.7,3.3], paneer:[265,18,1.2,20.8], ghee:[900,0,0,100], cream:[340,2.1,2.8,36], khoya:[421,14.6,25,31],
  // fruit
  apple:[52,0.3,14,0.2], banana:[89,1.1,23,0.3], papaya:[43,0.5,11,0.3], pomegranate:[83,1.7,19,1.2], grapes:[69,0.7,18,0.2],
  mango:[60,0.8,15,0.4], chikoo:[83,0.4,20,1.1], orange:[47,0.9,12,0.1], coconut:[354,3.3,15,33],
  // nuts and dried
  peanuts:[567,26,16,49], almonds:[579,21,22,50], cashews:[553,18,30,44], pista:[560,20,28,45], raisins:[299,3.0,79,0.5],
  dates:[277,1.8,75,0.2], drycoconut:[660,7.0,24,65], makhana:[347,9.7,77,0.1], sesame:[573,18,23,50], ker:[300,9,60,3],
  sangri:[300,15,55,3], kokum:[60,1.0,14,0.5], tamarind:[239,2.8,62.5,0.6],
  // spices
  salt:[0,0,0,0], haldi:[312,9.7,67,3.3], chillipw:[282,12,50,14], dhaniapw:[298,12,55,18], jeerapw:[375,18,44,22], jeera:[375,18,44,22],
  rai:[508,26,28,36], hing:[297,4,68,1], garam:[379,15,58,15], ajwain:[305,16,43,25], saunf:[345,16,52,15], kalonji:[375,18,44,22],
  sonth:[335,9,72,4], pepper:[251,10,64,3], amchur:[320,3,70,3], chaat:[250,8,50,3], elaichi:[311,11,68,7], dalchini:[247,4,81,1.2],
  laung:[274,6,65,13], tejpatta:[313,7.6,75,8.4], redchilli:[318,12,57,17], sambarpw:[330,13,55,10], rasampw:[330,13,55,10],
  goda:[350,12,50,14], kashmiri:[282,12,50,14], methiya:[330,15,50,8], citric:[0,0,0,0], soda:[0,0,0,0], bakingsoda:[0,0,0,0],
  saffron:[310,11,65,6], tea:[0,0,0,0],
  // pantry
  oil:[884,0,0,100], sugar:[387,0,100,0], jaggery:[383,0.4,98,0.1], pickle:[180,1.5,8,16], water:[0,0,0,0]
};
})(window.JJ = window.JJ || {});
