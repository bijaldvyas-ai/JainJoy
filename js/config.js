/* JainJoy settings for the owner.
   Visitor statistics use GoatCounter (free, no cookies, no personal data). To turn them on:
   1. Create a free site at https://www.goatcounter.com (choose a code, e.g. "jainjoy").
   2. In GoatCounter Settings, tick "Allow adding visitor counts on your website".
   3. Put the code below and publish. Visitors by country and city appear in the GoatCounter dashboard,
      and the total is shown in the app under Profile > Data and about. */
(function (JJ) {
'use strict';
JJ.CONFIG = {
  goatcounter: '',  // e.g. 'jainjoy'  ->  https://jainjoy.goatcounter.com
  /* SWITCH: Sign Up / Sign In, the subscription and the admin customer dashboard.
     false = off for now: the app opens straight to the household setup and today's menu.
     Set to true (and publish) to turn all of it back on; the Supabase project below keeps every account. */
  accountsEnabled: false,
  /* Optional customer accounts (Supabase, see docs/SETUP.md "Customer accounts").
     Both values are on Supabase → Project Settings → API. The anon key is public by design:
     the database's row security decides what each person may read or change. */
  supabaseUrl: 'https://flvottplizouxxturolx.supabase.co',
  supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsdm90dHBsaXpvdXh4dHVyb2x4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM3Njc0NTYsImV4cCI6MjEwOTM0MzQ1Nn0.446fOQoI9gGnj9h5_o3rlk7InPJ-RsuUU1yQjjX6i0w',  // the "anon public" key
  /* Subscription: free trial (3 months), then this price for one year, paid to this UPI ID by QR code.
     The admin confirms each payment in the Admin dashboard. */
  trialDays: 90,     // 3 months free from sign-up
  price: 199,
  upiId: '',        // e.g. 'yourname@okhdfcbank' – needed before the first trial ends
  upiName: 'JainJoy',
  supportWhatsApp: ''  // 10-digit number customers can message for help (forgot password, payments)
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
