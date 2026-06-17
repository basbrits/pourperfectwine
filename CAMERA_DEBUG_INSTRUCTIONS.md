# RijksLens camera debug version

Upload/replace these files in GitHub:

- `index.html`
- `app.js`
- `styles.css`
- `data/artworks.js`
- `assets/milkmaid.jpg`

This version is named `debug3-ios-camera` inside the app. When it loads, you should see a small debug log below the buttons saying:

`RijksLens JavaScript loaded. Version: debug3-ios-camera`

If you do not see that text, your browser/Cloudflare/GitHub is still serving the old files.

## After uploading

Open the site with a cache-busting query:

`https://YOUR-DOMAIN/?v=debug3`

If you use Cloudflare, also purge the cache for the site.

## What to test

1. Tap **Run diagnostics**.
2. Tap **Skip recognition and open demo artwork**. If this does not work, JavaScript is not running.
3. Tap **Upload test photo** and choose any image. It should print the file name and either recognize or open the one-artwork demo fallback.
4. Tap **Start camera**. It should either ask for camera permission or print a precise error.

## iPhone Safari checks

- Open the page directly in Safari.
- Do not open it inside GitHub, Instagram, WhatsApp, Gmail, or another in-app browser.
- Settings → Safari → Camera → Allow.
- Reload the page after changing settings.
