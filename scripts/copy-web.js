// Copies the JainJoy website files into the "www" folder, which Capacitor puts inside the Android app.
// The website itself is not changed.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const out = path.join(root, 'www');
const items = ['index.html', 'manifest.webmanifest', 'sw.js', 'icon-192.png', 'icon-512.png',
  'icon-maskable-512.png', 'apple-touch-icon.png', 'og-image.jpg', 'css', 'js'];
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out);
for (const item of items) fs.cpSync(path.join(root, item), path.join(out, item), { recursive: true });
console.log('Copied the JainJoy web files into www/');
