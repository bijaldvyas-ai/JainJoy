/* JainJoy recipe seed: DIWALI festive dishes (meal 'f').
   Traditional Gujarati Jain sweets, nasto (farsan) and festive specials for the Diwali days, from
   Vagh Baras to Labh Pancham. All are made without any vegetable, root or fresh herb, so they also
   pass the Parva Tithi rules (Kali Chaudas and Labh Pancham are Parva days). They never enter the
   everyday menu; JJ.FESTIVE says which dishes belong to which festival day. */
(function (JJ) {
'use strict';
var S = JJ.RECIPE_SEED = JJ.RECIPE_SEED || [];
function F(id, comp, names, serves, prep, cook, ings, steps) {
  S.push({id: id, meal: 'f', comp: comp, cu: ['guj', 'gen'], en: names[0], hi: names[1], gu: names[2], orig: names[2], serves: serves,
          prep: prep, cook: cook, ings: ings, steps: steps, flags: 'festive diwali'});
}
function L(en, hi, gu) { return {en: en, hi: hi, gu: gu}; }
var SYRUP1 = L('Boil the sugar with half a cup of water to a one-string syrup.', 'चीनी को आधा कप पानी के साथ एक तार की चाशनी तक उबालें।', 'ખાંડને અડધો કપ પાણી સાથે એક તારની ચાસણી થાય ત્યાં સુધી ઉકાળો.');
var DHRABO = L('Rub warm ghee and the milk into the besan with your fingers until grainy (dhrabo), then sieve.', 'बेसन में गरम घी और दूध हाथ से मसलकर दरदरा (धाबा) करें, फिर छान लें।', 'ચણાના લોટમાં ગરમ ઘી અને દૂધ હાથથી મસળી ધ્રાબો દો, પછી ચાળી લો.');
var STORE = L('Cool completely and store in an airtight tin; keeps 2 to 3 weeks.', 'पूरी तरह ठंडा करके हवाबंद डिब्बे में रखें; 2–3 हफ़्ते चलता है।', 'સંપૂર્ણ ઠંડું કરી હવાચુસ્ત ડબ્બામાં ભરો; 2–3 અઠવાડિયાં ચાલે.');
var SETCUT = L('Spread in a greased plate, garnish, and cut into pieces when set.', 'घी लगी थाली में फैलाएँ, सजाएँ और जमने पर टुकड़े काटें।', 'ઘી લગાવેલી થાળીમાં પાથરી, સજાવી, ઠરે એટલે ટુકડા કાપો.');

// ---- sweets (mithai) ----
F('f01', 'sweet', ['Mohanthal', 'मोहनथाल', 'મોહનથાળ'], 10, 15, 40, 'besan:250 ghee:10 milk:60 khoya:100 sugar:200 elaichi:0.5 saffron:1 almonds:15 pista:10',
  [DHRABO, ['roastghee', 'besan'], L('Add the khoya and stir for 2 minutes.', 'मावा डालकर 2 मिनट चलाएँ।', 'માવો નાખી 2 મિનિટ હલાવો.'), SYRUP1,
   L('Pour the syrup with saffron and elaichi into the besan and mix quickly.', 'केसर और इलायची वाली चाशनी बेसन में डालकर जल्दी मिलाएँ।', 'કેસર-એલચીવાળી ચાસણી લોટમાં રેડી ઝડપથી ભેળવો.'), SETCUT]);
F('f02', 'sweet', ['Magas', 'मगस', 'મગસ'], 10, 15, 30, 'besan:250 ghee:10 milk:30 sugar:150 elaichi:0.5 almonds:20 pista:10',
  [DHRABO, ['roastghee', 'besan'], ['cool'], L('Mix in powdered sugar and elaichi while just warm.', 'हल्का गरम रहते पिसी चीनी और इलायची मिलाएँ।', 'સહેજ ગરમ હોય ત્યારે દળેલી ખાંડ અને એલચી ભેળવો.'), SETCUT]);
F('f03', 'sweet', ['Ghughra', 'घुघरा (गुझिया)', 'ઘૂઘરા'], 10, 40, 30, 'maida:250 ghee:3 rava:60 drycoconut:60 sugar:80 almonds:20 raisins:20 elaichi:0.5 oil:6',
  [L('Knead the maida with 3 tbsp ghee and water into a firm dough; rest 20 minutes.', 'मैदे में 3 बड़े चम्मच घी और पानी डालकर सख़्त आटा गूँधें; 20 मिनट रखें।', 'મેંદામાં 3 મોટી ચમચી ઘી અને પાણી નાખી કઠણ લોટ બાંધો; 20 મિનિટ રાખો.'),
   ['roastghee', 'rava'], L('Mix roasted rava, grated dry coconut, powdered sugar, nuts, raisins and elaichi for the filling.', 'भुनी रवा, सूखा नारियल, पिसी चीनी, मेवा, किशमिश और इलायची मिलाकर भरावन बनाएँ।', 'શેકેલો રવો, સૂકું કોપરું, દળેલી ખાંડ, સૂકો મેવો, કિસમિસ અને એલચી ભેળવી પૂરણ બનાવો.'),
   L('Roll small rounds, fill, fold into half-moons and seal the edges with a pleated twist.', 'छोटी पूरियाँ बेलें, भरावन भरें, आधा मोड़कर किनारे गूँथकर बंद करें।', 'નાની પૂરી વણી, પૂરણ ભરી, અર્ધચંદ્ર વાળી કાંગરી પાડી બંધ કરો.'), ['fry'], STORE]);
F('f04', 'sweet', ['Kansar', 'कंसार', 'કંસાર'], 6, 5, 25, 'dalia:200 ghee:6 sugar:150 water:600 elaichi:0.5 almonds:10',
  [['roastghee', 'dalia'], L('Add hot water, cover and cook on low heat until soft and dry.', 'गरम पानी डालें, ढककर धीमी आँच पर नरम और सूखा होने तक पकाएँ।', 'ગરમ પાણી નાખી, ઢાંકીને ધીમા તાપે નરમ અને છૂટું થાય ત્યાં સુધી રાંધો.'),
   L('Mix in the sugar and elaichi and cook 5 minutes more.', 'चीनी और इलायची मिलाकर 5 मिनट और पकाएँ।', 'ખાંડ અને એલચી ભેળવી 5 મિનિટ વધુ રાંધો.'), L('Serve hot with a spoon of ghee poured on top.', 'ऊपर एक चम्मच घी डालकर गरम परोसें।', 'ઉપર એક ચમચી ઘી રેડી ગરમ પીરસો.')]);
F('f05', 'sweet', ['Dudhpak', 'दूधपाक', 'દૂધપાક'], 6, 10, 60, 'milk:1500 rice:50 sugar:150 elaichi:0.5 saffron:1 almonds:20 pista:10 ghee:0.5',
  [['wash', 'rice'], L('Toss the rice in the ghee and add to the boiling milk.', 'चावल को घी में लपेटकर उबलते दूध में डालें।', 'ચોખાને ઘીમાં રગદોળી ઊકળતા દૂધમાં નાખો.'),
   L('Simmer, stirring often, until the milk thickens and the rice is soft (about 45 minutes).', 'बार-बार चलाते हुए दूध गाढ़ा और चावल नरम होने तक उबालें (लगभग 45 मिनट)।', 'વારંવાર હલાવતાં દૂધ ઘટ્ટ અને ચોખા નરમ થાય ત્યાં સુધી ઉકાળો (આશરે 45 મિનિટ).'),
   L('Add sugar, saffron, elaichi and sliced nuts. Serve warm or chilled with puri.', 'चीनी, केसर, इलायची और कटे मेवे डालें। गरम या ठंडा पूरी के साथ परोसें।', 'ખાંડ, કેસર, એલચી અને સૂકો મેવો નાખો. ગરમ કે ઠંડું પૂરી સાથે પીરસો.')]);
F('f06', 'sweet', ['Basundi', 'बासुंदी', 'બાસુંદી'], 6, 5, 70, 'milk:1500 sugar:150 elaichi:0.5 saffron:1 almonds:15 pista:15',
  [L('Boil the milk in a wide heavy pan and simmer, scraping the cream from the sides back in, until reduced to half.', 'चौड़ी मोटी कढ़ाई में दूध उबालें और किनारों की मलाई मिलाते हुए आधा होने तक पकाएँ।', 'પહોળી જાડી કડાઈમાં દૂધ ઉકાળી, કિનારીની મલાઈ અંદર ભેળવતાં અડધું થાય ત્યાં સુધી ઉકાળો.'),
   L('Add sugar, saffron and elaichi and cook 5 minutes.', 'चीनी, केसर और इलायची डालकर 5 मिनट पकाएँ।', 'ખાંડ, કેસર અને એલચી નાખી 5 મિનિટ ઉકાળો.'), ['garnish', 'almonds+pista'], ['servecold']]);
F('f07', 'sweet', ['Lapsi', 'लापसी', 'લાપસી'], 6, 5, 30, 'dalia:200 ghee:6 jaggery:150 water:600 elaichi:0.5 almonds:10 drycoconut:10',
  [['roastghee', 'dalia'], L('Dissolve the jaggery in the hot water and pour it in.', 'गुड़ को गरम पानी में घोलकर डालें।', 'ગોળને ગરમ પાણીમાં ઓગાળી ઉમેરો.'),
   L('Cover and cook on low heat until the grains are soft and the ghee separates.', 'ढककर धीमी आँच पर दाने नरम होकर घी छूटने तक पकाएँ।', 'ઢાંકીને ધીમા તાપે દાણા નરમ થઈ ઘી છૂટે ત્યાં સુધી રાંધો.'), ['garnish', 'almonds+drycoconut']]);
F('f08', 'sweet', ['Besan Laddu (Nirvan Laddu)', 'बेसन लड्डू (निर्वाण लड्डू)', 'ચણાના લોટના લાડુ (નિર્વાણ લાડુ)'], 12, 10, 30, 'besan:250 ghee:9 sugar:200 elaichi:0.5 almonds:15',
  [['roastghee', 'besan'], ['cool'], L('Mix in powdered sugar and elaichi and shape into laddus while just warm.', 'हल्का गरम रहते पिसी चीनी और इलायची मिलाकर लड्डू बाँधें।', 'સહેજ ગરમ હોય ત્યારે દળેલી ખાંડ અને એલચી ભેળવી લાડુ વાળો.'), ['garnish', 'almonds']]);

// ---- nasto (farsan) ----
F('f09', 'farsan', ['Mathiya', 'मठिया', 'મઠિયા'], 10, 30, 40, 'matki:200 urad:50 sugar:15 ajwain:1 pepper:0.5 hing:0.25 salt:1.5 sesame:1 oil:6',
  [L('Grind the moth beans and urad into a fine flour.', 'मोठ और उड़द को बारीक आटे में पीसें।', 'મઠ અને અડદને ઝીણા લોટમાં દળો.'),
   L('Dissolve sugar and salt in a little water, add the spices and knead a very stiff dough; pound it well.', 'थोड़े पानी में चीनी-नमक घोलें, मसाले डालकर बहुत सख़्त आटा गूँधें और खूब कूटें।', 'થોડા પાણીમાં ખાંડ-મીઠું ઓગાળી, મસાલા નાખી બહુ કઠણ લોટ બાંધો અને બરાબર ટીપો.'),
   L('Roll paper-thin rounds and dry them for 15 minutes.', 'कागज़ जैसी पतली पूरियाँ बेलें और 15 मिनट सुखाएँ।', 'કાગળ જેવી પાતળી પૂરી વણી 15 મિનિટ સૂકવો.'), ['fry'], STORE]);
F('f10', 'farsan', ['Chorafali', 'चोराफली', 'ચોળાફળી'], 8, 30, 30, 'besan:150 urad:75 soda:0.5 salt:1 oil:6 chillipw:1 chaat:1',
  [L('Grind the urad into a fine flour and mix with besan, salt and soda.', 'उड़द को बारीक पीसकर बेसन, नमक और सोडा मिलाएँ।', 'અડદને ઝીણું દળી ચણાના લોટ, મીઠું અને સોડા સાથે ભેળવો.'),
   L('Knead a stiff dough with warm water and pound it until soft and white.', 'गरम पानी से सख़्त आटा गूँधें और नरम व सफ़ेद होने तक कूटें।', 'ગરમ પાણીથી કઠણ લોટ બાંધી નરમ અને સફેદ થાય ત્યાં સુધી ટીપો.'),
   L('Roll very thin, cut into long strips and fry until they puff.', 'बहुत पतला बेलें, लंबी पट्टियाँ काटें और फूलने तक तलें।', 'બહુ પાતળું વણી લાંબી પટ્ટી કાપી ફૂલે ત્યાં સુધી તળો.'), ['fry'],
   L('Sprinkle chilli powder and chaat masala while hot.', 'गरम-गरम पर मिर्च पाउडर और चाट मसाला छिड़कें।', 'ગરમ હોય ત્યારે મરચું અને ચાટ મસાલો ભભરાવો.')]);
F('f11', 'farsan', ['Chakri', 'चकली', 'ચકરી'], 10, 20, 40, 'riceflour:250 ghee:2 sesame:2 ajwain:1 chillipw:1 haldi:0.25 hing:0.25 salt:1.5 oil:6',
  [L('Steam the rice flour in a cloth for 10 minutes, then cool.', 'चावल के आटे को कपड़े में बाँधकर 10 मिनट भाप दें, फिर ठंडा करें।', 'ચોખાના લોટને કપડામાં બાંધી 10 મિનિટ બાફો, પછી ઠંડો કરો.'),
   L('Add ghee, sesame and the spices and knead a soft dough with water.', 'घी, तिल और मसाले डालकर पानी से नरम आटा गूँधें।', 'ઘી, તલ અને મસાલા નાખી પાણીથી નરમ લોટ બાંધો.'),
   L('Press spirals with a chakri mould onto a plate.', 'चकली के साँचे से थाली पर गोल चक्र बनाएँ।', 'ચકરીના સંચાથી થાળી પર ગોળ ચકરી પાડો.'), ['fry'], STORE]);
F('f12', 'farsan', ['Jain Sev', 'जैन सेव', 'જૈન સેવ'], 10, 10, 25, 'besan:250 ajwain:1 hing:0.25 haldi:0.25 pepper:0.5 salt:1.5 oil:8',
  [L('Mix besan, spices, salt and 2 tbsp oil and make a soft dough with water.', 'बेसन, मसाले, नमक और 2 बड़े चम्मच तेल मिलाकर पानी से नरम आटा बनाएँ।', 'ચણાનો લોટ, મસાલા, મીઠું અને 2 મોટી ચમચી તેલ ભેળવી પાણીથી નરમ લોટ બાંધો.'),
   L('Press through a sev mould straight into hot oil.', 'सेव के साँचे से सीधे गरम तेल में दबाएँ।', 'સેવના સંચાથી સીધું ગરમ તેલમાં પાડો.'), ['fry'], STORE]);
F('f13', 'farsan', ['Shakkarpara', 'शक्करपारे', 'શક્કરપારા'], 10, 20, 30, 'maida:250 ghee:4 sugar:100 milk:100 oil:6',
  [L('Warm the milk, ghee and sugar until the sugar melts; cool.', 'दूध, घी और चीनी को चीनी घुलने तक गरम करें; ठंडा करें।', 'દૂધ, ઘી અને ખાંડ ખાંડ ઓગળે ત્યાં સુધી ગરમ કરો; ઠંડું કરો.'),
   L('Knead the maida with it into a firm dough, roll thick and cut into diamonds.', 'इससे मैदे का सख़्त आटा गूँधें, मोटा बेलें और हीरे के आकार में काटें।', 'તેનાથી મેંદાનો કઠણ લોટ બાંધી, જાડું વણી ચોરસ-ત્રાંસા ટુકડા કાપો.'), ['fry'], STORE]);

// ---- festive specials ----
F('f14', 'main', ['Kali Chaudas na Vada', 'काली चौदस के वड़े', 'કાળી ચૌદસનાં વડાં'], 6, 240, 30, 'urad:250 pepper:1 jeera:1 hing:0.25 salt:1.5 oil:8',
  [['soakh', 'urad', 4], ['grindc', 'urad'], L('Beat in salt, crushed black pepper, jeera and hing until light.', 'नमक, कुटी काली मिर्च, जीरा और हींग डालकर हल्का होने तक फेंटें।', 'મીઠું, ખાંડેલાં મરી, જીરું અને હિંગ નાખી હળવું થાય ત્યાં સુધી ફીણો.'),
   L('Drop small vadas into hot oil with wet fingers.', 'गीली उँगलियों से छोटे वड़े गरम तेल में डालें।', 'ભીની આંગળીથી નાનાં વડાં ગરમ તેલમાં મૂકો.'), ['fry']]);

/* Which festive dishes go with which festival day (observance keys from JJ.OBSERVANCES).
   special = cook on the day; nasto = make or set out; note = the tradition behind it. */
JJ.FESTIVE = {
  vagh_baras: {special: ['f07'], nasto: ['f09', 'f10'], note: L('Diwali nasto making begins: mathiya and chorafali keep for weeks.', 'दिवाली का नाश्ता बनाना शुरू: मठिया और चोराफली हफ़्तों चलते हैं।', 'દિવાળીનો નાસ્તો બનાવવાનું શરૂ: મઠિયા અને ચોળાફળી અઠવાડિયાં ચાલે.')},
  dhanteras: {special: ['f01'], nasto: ['f11', 'f12', 'f03'], note: L('Mohanthal for the Lakshmi puja thal; chakri, sev and ghughra for the nasto box.', 'लक्ष्मी पूजा की थाली के लिए मोहनथाल; नाश्ते के डिब्बे में चकली, सेव और घुघरा।', 'લક્ષ્મી પૂજાના થાળ માટે મોહનથાળ; નાસ્તાના ડબ્બામાં ચકરી, સેવ અને ઘૂઘરા.')},
  kali_chaudas: {special: ['f14', 'f02'], nasto: [], note: L('Kali Chaudas vada and magas. Families keeping the Diwali Chhath fast begin today.', 'काली चौदस के वड़े और मगस। दिवाली छट्ठ करने वाले आज से शुरू करते हैं।', 'કાળી ચૌદસનાં વડાં અને મગસ. દિવાળીનો છઠ્ઠ કરનાર આજથી શરૂ કરે.')},
  lakshmi_pujan: {special: ['f05', 'l009'], nasto: ['f01', 'f03', 'f09'], note: L('Diwali feast: dudhpak with puri, served with the day\'s dal, bhaat and shaak.', 'दिवाली की दावत: दूधपाक-पूरी, साथ में आज की दाल, भात और सब्ज़ी।', 'દિવાળીનું જમણ: દૂધપાક-પૂરી, સાથે આજની દાળ, ભાત અને શાક.')},
  diwali: {special: ['f08'], nasto: [], note: L('Mahavir Swami Nirvan Kalyanak: Nirvan laddu offered at the derasar; keep the day simple.', 'महावीर स्वामी निर्वाण कल्याणक: देरासर में निर्वाण लड्डू चढ़ाएँ; दिन सादा रखें।', 'મહાવીર સ્વામી નિર્વાણ કલ્યાણક: દેરાસરમાં નિર્વાણ લાડુ ધરાવો; દિવસ સાદો રાખો.')},
  new_year: {special: ['f04', 'l009'], nasto: ['f09', 'f10', 'f03', 'f02'], note: L('Saal Mubarak! Sabras (a pinch of salt and sugar) in the morning, kansar for lunch, nasto for guests.', 'नूतन वर्षाभिनंदन! सुबह सबरस (चुटकी नमक-चीनी), दोपहर कंसार, मेहमानों के लिए नाश्ता।', 'સાલ મુબારક! સવારે સબરસ (ચપટી મીઠું-ખાંડ), બપોરે કંસાર, મહેમાનો માટે નાસ્તો.')},
  bhai_beej: {special: ['f06', 'l009'], nasto: ['f13'], note: L('Bhai Beej: basundi-puri for the brothers who come to eat.', 'भाई दूज: जमने आए भाइयों के लिए बासुंदी-पूरी।', 'ભાઈબીજ: જમવા આવેલા ભાઈઓ માટે બાસુંદી-પૂરી.')},
  gyan_pancham: {special: ['f07'], nasto: [], note: L('Labh Pancham and Gyan Pancham: lapsi for a sweet new start. It is also a Parva Tithi, so the rest of the day has no vegetables.', 'लाभ पंचमी और ज्ञान पंचमी: शुभ शुरुआत के लिए लापसी। यह पर्व तिथि भी है, इसलिए बाकी भोजन बिना सब्ज़ी।', 'લાભ પાંચમ અને જ્ઞાન પાંચમ: શુભ શરૂઆત માટે લાપસી. આ પર્વ તિથિ પણ છે, તેથી બાકીનું ભોજન શાક વગર.')}
};
})(window.JJ = window.JJ || {});
