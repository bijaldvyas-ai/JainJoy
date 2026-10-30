/* Structured cooking steps. A recipe step is ['template', a, b, n] or a literal
   {en, hi, gu} object. a / b are ingredient ids joined with '+', or @words.
   Each template exists in English, Hindi and Gujarati so every recipe's method
   switches language with the app. */
(function (JJ) {
'use strict';
JJ.STEP_T = {
 wash:     ['Wash {a} 2 to 3 times and drain.','{a} को 2–3 बार धोकर पानी निकाल दें।','{a}ને 2–3 વાર ધોઈને પાણી નિતારી લો.'],
 soak:     ['Soak {a} in water for {n} minutes, then drain.','{a} को {n} मिनट पानी में भिगोकर छान लें।','{a}ને {n} મિનિટ પાણીમાં પલાળી નિતારી લો.'],
 soakh:    ['Soak {a} in water for {n} hours, then drain.','{a} को {n} घंटे पानी में भिगोकर छान लें।','{a}ને {n} કલાક પાણીમાં પલાળી નિતારી લો.'],
 soakn:    ['Soak {a} overnight in plenty of water, then drain.','{a} को रात भर खूब पानी में भिगोकर छान लें।','{a}ને આખી રાત પુષ્કળ પાણીમાં પલાળી નિતારી લો.'],
 grind:    ['Grind {a} into a smooth batter, adding a little water.','{a} को थोड़ा पानी डालकर चिकना घोल पीस लें।','{a}ને થોડું પાણી ઉમેરી લીસું ખીરું વાટી લો.'],
 grindc:   ['Grind {a} coarsely with very little water.','{a} को बहुत कम पानी में दरदरा पीस लें।','{a}ને ઘણા ઓછા પાણીમાં કરકરું વાટી લો.'],
 grindp:   ['Grind {a} to a fine paste.','{a} का बारीक पेस्ट बना लें।','{a}ની ઝીણી પેસ્ટ બનાવી લો.'],
 blend:    ['Blend {a} until smooth.','{a} को मिक्सी में चिकना पीस लें।','{a}ને મિક્સરમાં લીસું વાટી લો.'],
 chop:     ['Finely chop {a}.','{a} को बारीक काट लें।','{a}ને ઝીણું સમારી લો.'],
 cube:     ['Cut {a} into small even pieces.','{a} को छोटे बराबर टुकड़ों में काट लें।','{a}ના નાના સરખા ટુકડા કરો.'],
 grate:    ['Grate {a}.','{a} को कद्दूकस कर लें।','{a}ને છીણી લો.'],
 peel:     ['Peel {a} and cut into small pieces.','{a} को छीलकर छोटे टुकड़ों में काट लें।','{a}ની છાલ ઉતારી નાના ટુકડા કરો.'],
 string:   ['Remove the strings from {a} and cut into 1-inch pieces.','{a} के रेशे निकालकर 1 इंच के टुकड़े कर लें।','{a}ના રેસા કાઢી 1 ઇંચના ટુકડા કરો.'],
 slit:     ['Slit {a} lengthwise.','{a} को लंबाई में चीर लें।','{a}ને લંબાઈમાં ચીરા કરો.'],
 puree:    ['Purée {a}.','{a} की प्यूरी बना लें।','{a}ની પ્યુરી બનાવી લો.'],
 mix:      ['In a bowl, mix {a}.','एक बर्तन में {a} मिलाएँ।','એક વાસણમાં {a} ભેળવો.'],
 knead:    ['Knead {a} with water into a soft dough.','{a} में पानी डालकर नरम आटा गूंध लें।','{a}માં પાણી ઉમેરી નરમ લોટ બાંધો.'],
 kneadf:   ['Knead {a} with a little water into a firm dough.','{a} में थोड़ा पानी डालकर सख़्त आटा गूंध लें।','{a}માં થોડું પાણી ઉમેરી કઠણ લોટ બાંધો.'],
 rest:     ['Cover and rest for {n} minutes.','ढककर {n} मिनट रख दें।','ઢાંકીને {n} મિનિટ રહેવા દો.'],
 roll:     ['Divide into equal balls and roll each into a thin round.','बराबर लोइयाँ बनाकर हर एक को पतला बेल लें।','સરખા લૂઆ કરી દરેકને પાતળું વણી લો.'],
 rollthick:['Divide into balls and pat or roll each into a thick round.','लोइयाँ बनाकर हर एक को मोटा थाप लें या बेल लें।','લૂઆ કરી દરેકને જાડું થેપી કે વણી લો.'],
 stuff:    ['Place {a} in the centre, seal the edges and roll out gently.','बीच में {a} रखें, किनारे बंद करें और हल्के हाथ से बेलें।','વચ્ચે {a} મૂકી, કિનારી બંધ કરી હળવેથી વણો.'],
 tawa:     ['Cook on a hot tawa, turning, until brown spots appear on both sides.','गरम तवे पर पलटते हुए दोनों ओर भूरे चित्ते आने तक सेंकें।','ગરમ તવી પર ફેરવતાં બંને બાજુ બદામી ટપકાં આવે ત્યાં સુધી શેકો.'],
 tawaf:    ['Cook on a hot tawa with {a} on both sides until golden.','गरम तवे पर दोनों ओर {a} लगाकर सुनहरा होने तक सेंकें।','ગરમ તવી પર બંને બાજુ {a} લગાવી સોનેરી થાય ત્યાં સુધી શેકો.'],
 puff:     ['Finish directly on the flame until it puffs up.','सीधी आँच पर फूलने तक सेंकें।','સીધી આંચ પર ફૂલે ત્યાં સુધી શેકો.'],
 spread:   ['Pour a ladle of batter on a hot greased tawa and spread it thin.','गरम चिकने तवे पर एक कलछी घोल डालकर पतला फैलाएँ।','ગરમ ચીકણી તવી પર એક કડછી ખીરું રેડી પાતળું પાથરો.'],
 spreadthick:['Pour a ladle of batter on a hot greased tawa and spread it thick.','गरम चिकने तवे पर एक कलछी घोल डालकर मोटा फैलाएँ।','ગરમ ચીકણી તવી પર એક કડછી ખીરું રેડી જાડું પાથરો.'],
 flip:     ['Drizzle a little oil, cook until the edges lift, then flip and cook until golden.','थोड़ा तेल डालें, किनारे उठने पर पलटें और सुनहरा होने तक सेंकें।','થોડું તેલ મૂકી, કિનારી ઊખડે એટલે ફેરવી સોનેરી થવા દો.'],
 top:      ['Sprinkle {a} on top and press lightly.','ऊपर से {a} डालकर हल्का दबाएँ।','ઉપર {a} ભભરાવી હળવેથી દબાવો.'],
 heat:     ['Heat {a} in a kadai.','कड़ाही में {a} गरम करें।','કડાઈમાં {a} ગરમ કરો.'],
 temper:   ['Heat {a}, add {b} and let them crackle.','{a} गरम करके {b} डालें और चटकने दें।','{a} ગરમ કરી {b} ઉમેરો અને તતડવા દો.'],
 add:      ['Add {a} and sauté for {n} minutes.','{a} डालकर {n} मिनट भूनें।','{a} ઉમેરી {n} મિનિટ સાંતળો.'],
 addm:     ['Add {a} and mix well.','{a} डालकर अच्छी तरह मिलाएँ।','{a} ઉમેરી બરાબર મિક્સ કરો.'],
 spices:   ['Add {a} and stir for a few seconds.','{a} डालकर कुछ सेकंड चलाएँ।','{a} ઉમેરી થોડી સેકન્ડ હલાવો.'],
 cookc:    ['Cover and cook on low heat for {n} minutes until tender.','ढककर धीमी आँच पर {n} मिनट नरम होने तक पकाएँ।','ઢાંકીને ધીમા તાપે {n} મિનિટ નરમ થાય ત્યાં સુધી ચડવા દો.'],
 cooko:    ['Cook uncovered, stirring now and then, for {n} minutes.','खुला रखकर बीच-बीच में चलाते हुए {n} मिनट पकाएँ।','ખુલ્લું રાખી વચ્ચે વચ્ચે હલાવતાં {n} મિનિટ રાંધો.'],
 water:    ['Add {n} ml water and bring to a boil.','{n} मि.ली. पानी डालकर उबाल आने दें।','{n} મિ.લી. પાણી ઉમેરી ઉકાળો.'],
 simmer:   ['Simmer for {n} minutes.','{n} मिनट धीमी आँच पर उबलने दें।','{n} મિનિટ ધીમા તાપે ઉકળવા દો.'],
 pc:       ['Pressure cook {a} with water for {n} whistles.','{a} को पानी के साथ प्रेशर कुकर में {n} सीटी तक पकाएँ।','{a}ને પાણી સાથે કુકરમાં {n} સીટી સુધી બાફો.'],
 whiskdal: ['Whisk the cooked dal until smooth.','पकी हुई दाल को अच्छी तरह घोंट लें।','બાફેલી દાળને બરાબર વલોવી લો.'],
 rice:     ['Wash {a} and cook with twice the water until fluffy.','{a} धोकर दोगुने पानी में खिला-खिला पका लें।','{a} ધોઈ બમણા પાણીમાં છૂટો રાંધી લો.'],
 boil:     ['Boil {a} until just tender and drain.','{a} को नरम होने तक उबालकर पानी निकाल दें।','{a}ને નરમ થાય ત્યાં સુધી બાફી પાણી નિતારો.'],
 whisk:    ['Whisk {a} until completely smooth.','{a} को फेंटकर एकदम चिकना कर लें।','{a}ને વલોવીને એકદમ લીસું કરો.'],
 stirboil: ['Stir continuously until it comes to a boil.','उबाल आने तक लगातार चलाते रहें।','ઉભરો આવે ત્યાં સુધી સતત હલાવતા રહો.'],
 steam:    ['Pour into a greased plate and steam for {n} minutes, until a knife comes out clean.','चिकनी थाली में डालकर {n} मिनट भाप में पकाएँ; चाकू साफ़ निकलना चाहिए।','ચીકણી થાળીમાં રેડી {n} મિનિટ વરાળે બાફો; ચપ્પુ સાફ નીકળવું જોઈએ.'],
 steamg:   ['Steam for {n} minutes.','{n} मिनट भाप में पकाएँ।','{n} મિનિટ વરાળે બાફો.'],
 eno:      ['Just before cooking, stir in the fruit salt until frothy.','पकाने से ठीक पहले ईनो डालकर झाग आने तक मिलाएँ।','રાંધતાં પહેલાં ઈનો ઉમેરી ફીણ આવે ત્યાં સુધી હલાવો.'],
 fry:      ['Deep fry in hot oil on medium heat until golden and crisp.','मध्यम आँच पर गरम तेल में सुनहरा और कुरकुरा होने तक तलें।','મધ્યમ તાપે ગરમ તેલમાં સોનેરી અને કડક થાય ત્યાં સુધી તળો.'],
 shallow:  ['Shallow fry on a tawa until golden on both sides.','तवे पर थोड़े तेल में दोनों ओर सुनहरा होने तक सेंकें।','તવી પર થોડા તેલમાં બંને બાજુ સોનેરી શેકો.'],
 roast:    ['Dry roast {a} on low heat for {n} minutes until aromatic.','{a} को धीमी आँच पर {n} मिनट सुगंध आने तक सूखा भूनें।','{a}ને ધીમા તાપે {n} મિનિટ સુગંધ આવે ત્યાં સુધી કોરું શેકો.'],
 roastghee:['Roast {a} in ghee on low heat until golden.','{a} को घी में धीमी आँच पर सुनहरा भूनें।','{a}ને ઘીમાં ધીમા તાપે સોનેરી શેકો.'],
 sprinkle: ['Sprinkle {a} and toss well.','{a} छिड़ककर अच्छी तरह मिलाएँ।','{a} ભભરાવી બરાબર મિક્સ કરો.'],
 lemon:    ['Squeeze in lemon juice and mix.','नींबू का रस निचोड़कर मिलाएँ।','લીંબુનો રસ નીચોવી મિક્સ કરો.'],
 garnish:  ['Garnish with {a}.','{a} से सजाएँ।','{a}થી સજાવો.'],
 serve:    ['Serve hot with {a}.','{a} के साथ गरम परोसें।','{a} સાથે ગરમ પીરસો.'],
 servehot: ['Serve hot.','गरम परोसें।','ગરમ પીરસો.'],
 servecold:['Serve chilled.','ठंडा परोसें।','ઠંડું પીરસો.'],
 servefresh:['Serve fresh.','ताज़ा परोसें।','તાજું પીરસો.'],
 cool:     ['Let it cool completely.','पूरी तरह ठंडा होने दें।','સંપૂર્ણ ઠંડું થવા દો.'],
 store:    ['Store in an airtight jar.','हवाबंद डिब्बे में भरकर रखें।','હવાચુસ્ત ડબ્બામાં ભરી રાખો.'],
 shape:    ['Shape the mixture into {a}.','मिश्रण से {a} बना लें।','મિશ્રણમાંથી {a} બનાવો.'],
 cut:      ['Cut into pieces.','टुकड़ों में काट लें।','ટુકડા કરી લો.'],
 pour:     ['Pour the tempering over it.','ऊपर से तड़का डालें।','ઉપર વઘાર રેડો.'],
 boilmilk: ['Bring {a} to a boil.','{a} उबालें।','{a} ઉકાળો.'],
 thicken:  ['Cook, stirring, until thick.','चलाते हुए गाढ़ा होने तक पकाएँ।','હલાવતાં ઘટ્ટ થાય ત્યાં સુધી રાંધો.'],
 dissolve: ['Add {a} and stir until it dissolves.','{a} डालकर घुलने तक चलाएँ।','{a} ઉમેરી ઓગળે ત્યાં સુધી હલાવો.'],
 toss:     ['Toss gently on low heat for {n} minutes.','धीमी आँच पर {n} मिनट हल्के हाथ से मिलाएँ।','ધીમા તાપે {n} મિનિટ હળવેથી હલાવો.'],
 drop:     ['Drop {a} into the boiling liquid and simmer for {n} minutes.','उबलते मिश्रण में {a} डालकर {n} मिनट पकाएँ।','ઉકળતા મિશ્રણમાં {a} ઉમેરી {n} મિનિટ ચડવા દો.'],
 thin:     ['Adjust with hot water to the consistency you like.','गरम पानी डालकर मनचाहा गाढ़ापन कर लें।','ગરમ પાણીથી જોઈતી ઘટ્ટતા કરી લો.'],
 combine:  ['Add {a} and simmer together for {n} minutes.','{a} डालकर साथ में {n} मिनट पकाएँ।','{a} ઉમેરી સાથે {n} મિનિટ ઉકાળો.'],
 fold:     ['Fold in {a}.','{a} हल्के हाथ से मिलाएँ।','{a} હળવેથી ભેળવો.'],
 coat:     ['Coat {a} evenly.','{a} पर एक जैसी परत चढ़ाएँ।','{a} પર એકસરખું પડ ચડાવો.'],
 bake:     ['Cook in a covered heavy pan on low heat for {n} minutes, then flip and cook the other side.','भारी ढके बर्तन में धीमी आँच पर {n} मिनट पकाएँ, फिर पलटकर दूसरी ओर पकाएँ।','ભારે ઢાંકેલા વાસણમાં ધીમા તાપે {n} મિનિટ રાંધો, પછી ફેરવી બીજી બાજુ રાંધો.'],
 chill:    ['Chill for {n} minutes before serving.','परोसने से पहले {n} मिनट ठंडा करें।','પીરસતાં પહેલાં {n} મિનિટ ઠંડું કરો.'],
 tea:      ['Boil {a} with water for 2 minutes, add the milk and sugar, boil again and strain.','{a} को पानी में 2 मिनट उबालें, दूध और चीनी डालकर फिर उबालें और छान लें।','{a}ને પાણીમાં 2 મિનિટ ઉકાળો, દૂધ અને ખાંડ ઉમેરી ફરી ઉકાળી ગાળી લો.'],
 skipleafy:['On Aatham and Chaudas, leave out the leafy garnish.','आठम और चौदस को पत्तेदार सजावट न डालें।','આઠમ અને ચૌદસે લીલી ભાજીની સજાવટ ન નાખો.']
};

/* @words used inside steps */
JJ.WORDS = {
 batter:['the batter','घोल','ખીરું'], dough:['the dough','आटा','લોટ'], balls:['small balls','छोटी गोलियाँ','નાની ગોળીઓ'],
 laddoo:['laddoos','लड्डू','લાડુ'], tikki:['flat patties','चपटी टिक्की','ચપટી ટિક્કી'], rolls:['finger-thick rolls','उंगली जितने मोटे रोल','આંગળી જેટલા જાડા રોલ'],
 cylinders:['long cylinders','लंबे बेलन','લાંબા રોલ'], dhokli:['diamond-shaped pieces of rolled dough','बेले आटे के चौकोर टुकड़े','વણેલા લોટના ચોરસ ટુકડા'],
 gatte:['the boiled gatte pieces','उबले गट्टे','બાફેલા ગટ્ટા'], dumplings:['the dumplings','पकौड़ियाँ','ભજિયાં'], vada:['the vadas','वड़े','વડાં'],
 rice:['steamed rice','पके चावल','ભાત'], roti:['rotis','रोटियाँ','રોટલી'], bhakri:['bhakri','भाकरी','ભાખરી'], rotla:['rotla','रोटला','રોટલા'],
 chutney:['chutney','चटनी','ચટણી'], curdside:['fresh curd','ताज़ा दही','તાજું દહીં'], kadhi:['kadhi','कढ़ी','કઢી'], dal:['dal','दाल','દાળ'],
 pickle:['pickle','अचार','અથાણું'], tea:['hot tea','गरम चाय','ગરમ ચા'], filling:['the filling','भरावन','પૂરણ'],
 tempering:['the tempering','तड़का','વઘાર'], syrup:['sugar syrup','चाशनी','ચાસણી'], salad:['salad','सलाद','સલાડ'], coconutchutney:['coconut chutney','नारियल की चटनी','નાળિયેરની ચટણી'],
 sambar:['sambar','सांबर','સાંભાર'], papad:['papad','पापड़','પાપડ'], raita:['raita','रायता','રાયતું'], chaas:['chaas','छाछ','છાશ'], sweetchutney:['sweet chutney','मीठी चटनी','મીઠી ચટણી']
};

var AND = {en:' and ', hi:' और ', gu:' અને '};
function list(parts, lang) {
  if (parts.length <= 1) return parts.join('');
  return parts.slice(0, -1).join(', ') + AND[lang] + parts[parts.length - 1];
}
function term(tok, lang, ING) {
  if (tok.charAt(0) === '@') { var w = JJ.WORDS[tok.slice(1)]; return w ? w[{en:0,hi:1,gu:2}[lang]] : tok.slice(1); }
  var g = ING[tok]; if (!g) return tok;
  var n = g[lang] || g.en;
  return lang === 'en' ? n.replace(/ \(.*\)$/, '').toLowerCase().replace(/^(\w)/, function (m) { return m; }) : n;
}
/* Render one step for a language. skip = set of ingredient ids removed today (optional garnish). */
JJ.renderStep = function (st, lang, ING, skip) {
  if (!Array.isArray(st)) return st[lang] || st.en;
  var t = JJ.STEP_T[st[0]]; if (!t) return String(st[0]);
  var li = {en:0, hi:1, gu:2}[lang] || 0, s = t[li];
  function lst(x) {
    if (x == null || x === '') return '';
    var toks = String(x).split('+').filter(function (k) { return !(skip && skip[k]); });
    return list(toks.map(function (k) { return term(k, lang, ING); }), lang);
  }
  var a = lst(st[1]), b = lst(st[2]);
  if ((st[1] && !a) || (st[2] && !b)) return null; // every ingredient in this step was skipped today
  return s.replace('{a}', a).replace('{b}', b).replace(/\{n\}/g, st[3] != null ? st[3] : (typeof st[1] === 'number' ? st[1] : ''));
};
})(window.JJ = window.JJ || {});
