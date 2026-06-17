# RijksLens Prototype

A no-build mobile web prototype for recognizing one Rijksmuseum artwork and opening a tappable hotspot view.

The current demo artwork is **The Milkmaid** by Johannes Vermeer, Rijksmuseum object number **SK-A-2344**.

## What this prototype does

1. Opens a mobile-friendly scanner page.
2. Uses the phone camera or an uploaded test photo.
3. Compares the image against the one configured artwork.
4. Opens a static image of the artwork.
5. Lets the user switch between three categories:
   - History
   - Technique
   - Symbolism
6. Shows bubbles for the selected category.
7. Opens a story panel when a bubble is tapped.

This is intentionally not AR yet. After recognition, users explore a stable image instead of having to keep their camera pointed at the painting.

## How to run locally

Camera access usually requires HTTPS or `localhost`. Do not open `index.html` directly as a file if you want the camera to work.

From this folder, run:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

On a phone, deploy this folder to a HTTPS host such as Netlify, Vercel, GitHub Pages, or your own server.

## Where to add the text

Edit this file:

```text
data/artworks.js
```

Inside that file, each artwork has this structure:

```js
categories: {
  history: {
    bubbles: [
      {
        title: "Bubble title",
        shortText: "Short explanation shown first.",
        detailText: "Longer explanation shown below.",
        source: "Optional source note or URL."
      }
    ]
  },
  technique: { bubbles: [] },
  symbolism: { bubbles: [] }
}
```

## How to move bubbles

Bubble positions use percentages:

```js
x: 42,
y: 55
```

- `x: 0` is the far left of the artwork.
- `x: 100` is the far right.
- `y: 0` is the top.
- `y: 100` is the bottom.

To make placement easier, open the site with:

```text
http://localhost:8000/?edit=1
```

Open the demo artwork, click anywhere on the painting, and the app shows the x/y coordinate. It also tries to copy the coordinate to your clipboard.

## How to add another artwork later

1. Put the image in:

```text
assets/
```

2. Open:

```text
data/artworks.js
```

3. Copy the existing artwork object and change:

```js
id
/title
artist
date
museum
objectNumber
image
categories
```

4. Add bubbles under all three categories.

## Notes about recognition

The recognition in this first prototype is deliberately lightweight. It compares a centered camera frame against the configured reference image using a browser-side visual fingerprint. It works best when the painting fills most of the scan frame.

For a production version, replace the recognizer with a stronger method, such as:

- server-side computer vision matching,
- local feature matching with OpenCV,
- a room/route-based recognition pack,
- QR/NFC fallback near each painting.

The rest of the website is structured so the content and hotspot viewer can stay the same when the recognizer is upgraded.
