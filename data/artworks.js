// RijksLens artwork data
// -----------------------------------------------------------------------------
// THIS IS THE MAIN FILE YOU EDIT LATER.
//
// To add or change the text shown in the app:
// 1. Find the artwork below.
// 2. Choose one category: history, technique, or symbolism.
// 3. Edit the `title`, `shortText`, and `detailText` fields inside each bubble.
//
// Bubble coordinates:
// - `x` and `y` are percentages across the displayed artwork image.
// - x: 0 = far left, 100 = far right.
// - y: 0 = top, 100 = bottom.
// - Add `?edit=1` to the website URL, click the painting, and the app will show
//   the x/y coordinate you can paste into a bubble.
// -----------------------------------------------------------------------------

export const artworks = [
  {
    id: "milkmaid",
    title: "The Milkmaid",
    artist: "Johannes Vermeer",
    date: "c. 1660",
    museum: "Rijksmuseum, Amsterdam",
    objectNumber: "SK-A-2344",

    // This image file must exist in: assets/milkmaid.jpg
    image: "./assets/milkmaid.jpg",

    recognitionThreshold: 0.68,

    categories: {
      history: {
        label: "History",
        intro: "Historical stories and context about this artwork.",
        bubbles: [
          {
            id: "history-ordinary-task",
            x: 47,
            y: 48,
            title: "An ordinary task becomes monumental",
            shortText: "Replace this with your short history explanation.",
            detailText: "Longer history text goes here. Example angle: why a simple kitchen scene could become the main subject of a major painting in 17th-century Dutch art.",
            source: "Optional source note or URL."
          },
          {
            id: "history-gallery-of-honour",
            x: 50,
            y: 9,
            title: "Why this hangs with masterpieces",
            shortText: "Replace this with your short history explanation.",
            detailText: "Longer history text goes here. You can explain why this work is considered one of Vermeer’s great paintings and how it entered the Rijksmuseum collection.",
            source: "Optional source note or URL."
          }
        ]
      },

      technique: {
        label: "Technique",
        intro: "Painting methods, colour, light, brushwork, and composition.",
        bubbles: [
          {
            id: "technique-light-dots",
            x: 34,
            y: 70,
            title: "Dots of light on the bread",
            shortText: "Replace this with your short technique explanation.",
            detailText: "Longer technique text goes here. Example angle: discuss how small touches of paint can make textured bread and reflected light feel alive.",
            source: "Optional source note or URL."
          },
          {
            id: "technique-milk-stream",
            x: 42,
            y: 55,
            title: "The thin stream of milk",
            shortText: "Replace this with your short technique explanation.",
            detailText: "Longer technique text goes here. Example angle: why the stillness of the scene makes the tiny moving stream of milk feel so important.",
            source: "Optional source note or URL."
          }
        ]
      },

      symbolism: {
        label: "Symbolism",
        intro: "Objects and details that may carry meaning.",
        bubbles: [
          {
            id: "symbolism-foot-warmer",
            x: 82,
            y: 82,
            title: "The foot warmer",
            shortText: "Replace this with your short symbolism explanation.",
            detailText: "Longer symbolism text goes here. Keep it nuanced: symbols can change meaning depending on context, period, and surrounding objects.",
            source: "Optional source note or URL."
          },
          {
            id: "symbolism-tiles",
            x: 88,
            y: 77,
            title: "Tiny tiles near the floor",
            shortText: "Replace this with your short symbolism explanation.",
            detailText: "Longer symbolism text goes here. You can describe what is visible, what scholars suggest, and where interpretation is uncertain.",
            source: "Optional source note or URL."
          }
        ]
      }
    }
  }
];
