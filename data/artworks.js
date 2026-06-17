// RijksLens artwork data
// -----------------------------------------------------------------------------
// THIS IS THE MAIN FILE YOU EDIT LATER.
//
// To add or change the text shown in the app:
// 1. Find the artwork below.
// 2. Choose one category: history, technique, or symbolism.
// 3. Edit the title, shortText, and detailText fields inside each bubble.
//
// Bubble coordinates:
// - x and y are percentages across the displayed artwork image.
// - x: 0 = far left, 100 = far right.
// - y: 0 = top, 100 = bottom.
// - Add ?edit=1 to the website URL, click the painting, and the app will show
//   the x/y coordinate you can paste into a bubble.
// -----------------------------------------------------------------------------

window.RIJKSLENS_ARTWORKS = [
  {
    id: "milkmaid",
    title: "The Milkmaid",
    artist: "Johannes Vermeer",
    date: "c. 1660",
    museum: "Rijksmuseum, Amsterdam",
    objectNumber: "SK-A-2344",

    // This image file must exist in: assets/milkmaid.jpg
    image: "./assets/milkmaid.jpg",

    // Higher = stricter.
    // If random things still open a painting, raise this to 0.94 or 0.96.
    // If the real painting no longer recognizes, lower this to 0.86 or 0.84.
    recognitionThreshold: 0.92,

    categories: {
      history: {
        label: "History",
        intro: "Historical stories and context about this artwork.",
        bubbles: [
          {
            id: "milkmaid-history-ordinary-task",
            x: 47,
            y: 48,
            title: "An ordinary task becomes monumental",
            shortText: "Replace this with your short history explanation.",
            detailText: "Longer history text goes here. Example angle: why a simple kitchen scene could become the main subject of a major painting in 17th-century Dutch art.",
            source: "Optional source note or URL."
          },
          {
            id: "milkmaid-history-gallery-of-honour",
            x: 50,
            y: 9,
            title: "Why this hangs with masterpieces",
            shortText: "Replace this with your short history explanation.",
            detailText: "Longer history text goes here. You can explain why this work is considered one of Vermeer's great paintings and how it entered the Rijksmuseum collection.",
            source: "Optional source note or URL."
          }
        ]
      },

      technique: {
        label: "Technique",
        intro: "Painting methods, colour, light, brushwork, and composition.",
        bubbles: [
          {
            id: "milkmaid-technique-light-dots",
            x: 34,
            y: 70,
            title: "Dots of light on the bread",
            shortText: "Replace this with your short technique explanation.",
            detailText: "Longer technique text goes here. Example angle: discuss how small touches of paint can make textured bread and reflected light feel alive.",
            source: "Optional source note or URL."
          },
          {
            id: "milkmaid-technique-milk-stream",
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
            id: "milkmaid-symbolism-foot-warmer",
            x: 82,
            y: 82,
            title: "The foot warmer",
            shortText: "Replace this with your short symbolism explanation.",
            detailText: "Longer symbolism text goes here. Keep it nuanced: symbols can change meaning depending on context, period, and surrounding objects.",
            source: "Optional source note or URL."
          },
          {
            id: "milkmaid-symbolism-tiles",
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
  },

  {
    id: "little-street",
    title: "The Little Street",
    artist: "Johannes Vermeer",
    date: "c. 1658",
    museum: "Rijksmuseum, Amsterdam",
    objectNumber: "SK-A-2860",

    // This image file must exist in: assets/little-street.jpg
    image: "./assets/little-street.jpg",

    recognitionThreshold: 0.92,

    categories: {
      history: {
        label: "History",
        intro: "Historical stories and context about this artwork.",
        bubbles: [
          {
            id: "little-street-history-houses",
            x: 48,
            y: 35,
            title: "A street becomes a portrait",
            shortText: "Replace this with your short history explanation.",
            detailText: "Longer history text goes here. Example angle: this is not a grand biblical or mythological scene, but a quiet view of ordinary houses in Delft.",
            source: "Optional source note or URL."
          },
          {
            id: "little-street-history-daily-life",
            x: 50,
            y: 74,
            title: "Everyday Delft",
            shortText: "Replace this with your short history explanation.",
            detailText: "Longer history text goes here. You can explain how Dutch painters made daily life, domestic spaces, streets, and courtyards into serious artistic subjects.",
            source: "Optional source note or URL."
          }
        ]
      },

      technique: {
        label: "Technique",
        intro: "Painting methods, colour, light, brushwork, and composition.",
        bubbles: [
          {
            id: "little-street-technique-brickwork",
            x: 44,
            y: 42,
            title: "The brickwork",
            shortText: "Replace this with your short technique explanation.",
            detailText: "Longer technique text goes here. Example angle: describe how Vermeer creates the feeling of old brick, mortar, and weathered surfaces.",
            source: "Optional source note or URL."
          },
          {
            id: "little-street-technique-composition",
            x: 51,
            y: 17,
            title: "The calm composition",
            shortText: "Replace this with your short technique explanation.",
            detailText: "Longer technique text goes here. Example angle: the painting feels balanced because of the strong verticals, rectangles, doorway shapes, and quiet rhythm of the facade.",
            source: "Optional source note or URL."
          }
        ]
      },

      symbolism: {
        label: "Symbolism",
        intro: "Objects and details that may carry meaning.",
        bubbles: [
          {
            id: "little-street-symbolism-doorway",
            x: 58,
            y: 67,
            title: "The open doorway",
            shortText: "Replace this with your short symbolism explanation.",
            detailText: "Longer symbolism text goes here. Keep it careful: rather than claiming one fixed meaning, you can discuss how thresholds, doorways, and courtyards invite the viewer to imagine private life beyond the street.",
            source: "Optional source note or URL."
          },
          {
            id: "little-street-symbolism-domestic-work",
            x: 32,
            y: 77,
            title: "Domestic work",
            shortText: "Replace this with your short symbolism explanation.",
            detailText: "Longer symbolism text goes here. Example angle: visible domestic activity can suggest order, household virtue, labour, or everyday life, depending on interpretation.",
            source: "Optional source note or URL."
          }
        ]
      }
    }
  }
];
