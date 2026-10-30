/* JainJoy settings for the owner.
   Visitor statistics use GoatCounter (free, no cookies, no personal data). To turn them on:
   1. Create a free site at https://www.goatcounter.com (choose a code, e.g. "jainjoy").
   2. In GoatCounter Settings, tick "Allow adding visitor counts on your website".
   3. Put the code below and publish. Visitors by country and city appear in the GoatCounter dashboard,
      and the total is shown in the app under Profile > Data and about. */
(function (JJ) {
'use strict';
JJ.CONFIG = {
  goatcounter: ''   // e.g. 'jainjoy'  ->  https://jainjoy.goatcounter.com
};
JJ.analytics = {
  enabled: function () { return !!JJ.CONFIG.goatcounter; },
  start: function () {
    if (!JJ.analytics.enabled() || /^(localhost|127\.)/.test(location.hostname)) return;
    var s = document.createElement('script');
    s.async = true; s.src = 'https://gc.zgo.at/count.js';
    s.setAttribute('data-goatcounter', 'https://' + JJ.CONFIG.goatcounter + '.goatcounter.com/count');
    document.head.appendChild(s);
  },
  /* total visitors so far (needs the public counter setting); resolves to a number or null */
  total: function () {
    if (!JJ.analytics.enabled()) return Promise.resolve(null);
    return fetch('https://' + JJ.CONFIG.goatcounter + '.goatcounter.com/counter/TOTAL.json')
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { return j ? j.count : null; })
      .catch(function () { return null; });
  }
};
})(window.JJ = window.JJ || {});
