JainJoy - Jain Meal Planner
===========================

This folder is the complete JainJoy app. It is a standard web app (HTML,
manifest, service worker), so any free or open-source web server can host it.


1) RUN IT ON YOUR COMPUTER (localhost)
--------------------------------------
- Double-click START-JainJoy.bat
- JainJoy opens in your browser at  http://localhost:8080
- Keep the black window open while you use the app. Close it to stop.
- Nothing to install: it uses Windows PowerShell, which is built in.


2) OPEN IT ON YOUR PHONE (same Wi-Fi)
-------------------------------------
- Start it on the computer first (step 1).
- The black window shows a line like:
      On your phone (same Wi-Fi):  http://192.168.1.5:8080
- Type that address into Chrome or Safari on your phone.
- If Windows asks about the firewall, choose Allow (Private networks).
- In Chrome: menu (three dots) > Add to Home screen.
  In Safari: Share > Add to Home Screen.


3) FREE PUBLIC LINK (works anywhere, offline after first open)
--------------------------------------------------------------
GitHub Pages (free, no server to run):
- Sign in at github.com and create a new public repository named  jainjoy
- Click "uploading an existing file" and drag in every file from this folder.
- Go to Settings > Pages > Branch: main, folder: / (root) > Save.
- After about a minute your app is live at
      https://YOUR-GITHUB-NAME.github.io/jainjoy/
- Open that link on any phone and use Add to Home Screen. It then works
  like an app, even without internet.

Other free hosts that work the same way: Netlify (app.netlify.com/drop),
Cloudflare Pages, Vercel.

If Python is installed you can also run:   python -m http.server 8080


NOTES
-----
- Your profile, menus and grocery ticks are saved in each phone's browser.
  They are not uploaded anywhere.
- Tithi is calculated on the device for sunrise in your city. For festival
  dates, follow your Sangh's Panchang.
