/* JainJoy recipe seed: AYAMBIL dishes (meal 'a').
   Ayambil food is eaten once a day and is cooked from grains and pulses only, without oil, ghee,
   milk, curd, sugar, jaggery, fruit, vegetables or spices other than salt, black pepper, hing and
   dry ginger (sonth). These recipes never enter the everyday menu; they fill the Ayambil thali
   shown during Ayambil Oli (Chaitra and Aso Sud 7–15) and on request for any day. */
(function (JJ) {
'use strict';
var S = JJ.RECIPE_SEED = JJ.RECIPE_SEED || [];
function A(id, comp, names, prep, cook, ings, steps) {
  S.push({id: id, meal: 'a', comp: comp, cu: ['gen'], en: names[0], hi: names[1], gu: names[2], orig: names[2], serves: 4,
          prep: prep, cook: cook, ings: ings, steps: steps, flags: 'ayambil'});
}
function L(en, hi, gu) { return {en: en, hi: hi, gu: gu}; }
var NOFAT = L('Do not use any oil or ghee.', 'तेल या घी बिल्कुल न डालें।', 'તેલ કે ઘી બિલકુલ ન વાપરો.');

// breads
A('a01', 'bread', ['Ayambil Rotli', 'आयंबिल रोटी', 'આયંબિલ રોટલી'], 10, 20, 'atta:300 salt:0.5',
  [['knead', 'atta+salt'], NOFAT, ['rest', 15], ['roll'], ['tawa'], ['puff']]);
A('a02', 'bread', ['Ayambil Khakhra', 'आयंबिल खाखरा', 'આયંબિલ ખાખરા'], 10, 30, 'atta:250 salt:0.5 pepper:0.5',
  [['kneadf', 'atta+salt+pepper'], ['roll'], L('Cook on a dry tawa on low heat, pressing with a cloth, until crisp on both sides.', 'सूखे तवे पर धीमी आँच पर कपड़े से दबाते हुए दोनों तरफ़ से कुरकुरा सेकें।', 'કોરા તવા પર ધીમા તાપે કપડાથી દબાવતાં બંને બાજુ કડક શેકો.'), NOFAT]);
A('a03', 'bread', ['Ayambil Jowar Bhakhri', 'आयंबिल ज्वार भाकरी', 'આયંબિલ જુવારની ભાખરી'], 10, 25, 'jowar:300 salt:0.5',
  [['knead', 'jowar+salt'], ['rollthick'], ['tawa'], NOFAT]);
A('a04', 'bread', ['Ayambil Bajra Rotlo', 'आयंबिल बाजरा रोटला', 'આયંબિલ બાજરીનો રોટલો'], 10, 25, 'bajra:300 salt:0.5',
  [['knead', 'bajra+salt'], ['rollthick'], ['tawa'], NOFAT]);

// dal
A('a05', 'dal', ['Ayambil Moong Dal', 'आयंबिल मूंग दाल', 'આયંબિલ મગની દાળ'], 10, 20, 'moongdal:150 salt:1 pepper:0.5 hing:0.25 water:600',
  [['wash', 'moongdal'], ['pc', 'moongdal', 3], L('Whisk smooth, add salt, black pepper and hing, and simmer for 5 minutes.', 'अच्छी तरह घोटें, नमक, काली मिर्च और हींग डालकर 5 मिनट उबालें।', 'બરાબર વલોવી મીઠું, મરી અને હિંગ નાખી 5 મિનિટ ઉકાળો.'), NOFAT]);
A('a06', 'dal', ['Ayambil Mag', 'आयंबिल साबुत मूंग', 'આયંબિલ મગ'], 480, 25, 'moong:200 salt:1 pepper:0.5 sonth:0.5 water:600',
  [['soakn', 'moong'], ['pc', 'moong', 4], L('Add salt, black pepper and dry ginger powder and simmer until thick.', 'नमक, काली मिर्च और सोंठ डालकर गाढ़ा होने तक उबालें।', 'મીઠું, મરી અને સૂંઠ નાખી ઘટ્ટ થાય ત્યાં સુધી ઉકાળો.'), NOFAT]);
A('a07', 'dal', ['Ayambil Toor Dal', 'आयंबिल तुअर दाल', 'આયંબિલ તુવેર દાળ'], 10, 25, 'toor:150 salt:1 hing:0.25 water:700',
  [['wash', 'toor'], ['pc', 'toor', 4], L('Whisk, add salt and hing, and simmer for 5 minutes.', 'घोटकर नमक और हींग डालें और 5 मिनट उबालें।', 'વલોવી મીઠું અને હિંગ નાખી 5 મિનિટ ઉકાળો.'), NOFAT]);
A('a08', 'dal', ['Ayambil Chana Dal', 'आयंबिल चना दाल', 'આયંબિલ ચણાની દાળ'], 60, 25, 'chanadal:150 salt:1 sonth:0.5 water:600',
  [['soakh', 'chanadal', 1], ['pc', 'chanadal', 4], L('Add salt and dry ginger powder and simmer for 5 minutes.', 'नमक और सोंठ डालकर 5 मिनट उबालें।', 'મીઠું અને સૂંઠ નાખી 5 મિનિટ ઉકાળો.'), NOFAT]);

// rice
A('a09', 'rice', ['Ayambil Rice', 'आयंबिल चावल', 'આયંબિલ ભાત'], 10, 20, 'rice:250 salt:0.5 water:600',
  [['wash', 'rice'], L('Cook the rice in water with a pinch of salt until soft.', 'चावल को पानी और चुटकी भर नमक के साथ नरम होने तक पकाएँ।', 'ચોખાને પાણી અને ચપટી મીઠા સાથે નરમ થાય ત્યાં સુધી રાંધો.'), NOFAT]);
A('a10', 'rice', ['Ayambil Khichdi', 'आयंबिल खिचड़ी', 'આયંબિલ ખીચડી'], 15, 20, 'rice:150 moongdal:100 salt:1 pepper:0.5 hing:0.25 water:900',
  [['wash', 'rice+moongdal'], ['soakh', 'rice+moongdal', 1], ['pc', 'rice+moongdal', 4], L('Mix in salt, black pepper and hing.', 'नमक, काली मिर्च और हींग मिलाएँ।', 'મીઠું, મરી અને હિંગ ભેળવો.'), NOFAT]);

// extra dish
A('a11', 'extra', ['Ayambil Kala Chana', 'आयंबिल काले चने', 'આયંબિલ કાળા ચણા'], 480, 30, 'kalachana:200 salt:1 pepper:0.5 water:700',
  [['soakn', 'kalachana'], ['pc', 'kalachana', 6], L('Drain, toss with salt and black pepper.', 'पानी निकालकर नमक और काली मिर्च मिलाएँ।', 'પાણી નિતારી મીઠું અને મરી ભેળવો.'), NOFAT]);
A('a12', 'extra', ['Ayambil Moong Dhokla', 'आयंबिल मूंग ढोकला', 'આયંબિલ મગનાં ઢોકળાં'], 240, 20, 'moongdal:200 salt:1 pepper:0.5',
  [['soakh', 'moongdal', 4], ['grind', 'moongdal'], L('Add salt and black pepper, pour into a plate lined with a cloth (no oil) and steam for 15 minutes.', 'नमक और काली मिर्च डालें, कपड़ा बिछी थाली में डालें (तेल नहीं) और 15 मिनट भाप में पकाएँ।', 'મીઠું અને મરી નાખી, કપડું પાથરેલી થાળીમાં રેડી (તેલ વગર) 15 મિનિટ બાફો.'), NOFAT]);
A('a13', 'extra', ['Ayambil Chokha no Khichu', 'आयंबिल चावल का खीचू', 'આયંબિલ ચોખાનું ખીચું'], 5, 20, 'riceflour:200 salt:1 pepper:0.5 water:500',
  [L('Boil the water with salt and black pepper.', 'पानी में नमक और काली मिर्च डालकर उबालें।', 'પાણીમાં મીઠું અને મરી નાખી ઉકાળો.'), L('Add the rice flour, stir to a smooth dough, cover and steam on low heat for 10 minutes.', 'चावल का आटा डालकर चिकना होने तक हिलाएँ, ढककर धीमी आँच पर 10 मिनट पकाएँ।', 'ચોખાનો લોટ નાખી સુંવાળું થાય ત્યાં સુધી હલાવો, ઢાંકીને ધીમા તાપે 10 મિનિટ બાફો.'), NOFAT]);
A('a14', 'extra', ['Ayambil Chole', 'आयंबिल छोले', 'આયંબિલ છોલે'], 480, 30, 'chole:200 salt:1 pepper:0.5 sonth:0.5 water:700',
  [['soakn', 'chole'], ['pc', 'chole', 6], L('Drain, add salt, black pepper and dry ginger powder and mash a few.', 'पानी निकालें, नमक, काली मिर्च और सोंठ डालकर थोड़े मसल दें।', 'પાણી નિતારી મીઠું, મરી અને સૂંઠ નાખી થોડા મસળો.'), NOFAT]);

/* the only ingredients an Ayambil dish may use */
JJ.AYAMBIL_OK = {atta: 1, jowar: 1, bajra: 1, makai: 1, rice: 1, riceflour: 1, moongdal: 1, moong: 1, toor: 1, chanadal: 1, masoor: 1, urad: 1,
  kalachana: 1, chole: 1, chawla: 1, besan: 1, salt: 1, pepper: 1, hing: 1, sonth: 1, water: 1};
})(window.JJ = window.JJ || {});
