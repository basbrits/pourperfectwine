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
// -----------------------------------------------------------------------------

window.RIJKSLENS_ARTWORKS = [
  {
    id: "milkmaid",
    title: "The Milkmaid",
    artist: "Johannes Vermeer",
    date: "c. 1660",
    museum: "Rijksmuseum, Amsterdam",
    objectNumber: "SK-A-2344",
    image: "./assets/milkmaid.jpg",
    recognitionThreshold: 0.92,

    categories: {
      history: {
        label: "History",
        intro: "Historical stories and context about this artwork.",
        bubbles: [
          {
            id: "milkmaid-history-1",
            x: 47,
            y: 48,
            title: "An ordinary task becomes monumental",
            shortText: "Replace this with your short history explanation.",
            detailText: "Longer history text goes here.",
            source: "Optional source note or URL."
          }
        ]
      },

      technique: {
        label: "Technique",
        intro: "Painting methods, colour, light, brushwork, and composition.",
        bubbles: [
          {
            id: "milkmaid-technique-1",
            x: 42,
            y: 55,
            title: "The thin stream of milk",
            shortText: "Replace this with your short technique explanation.",
            detailText: "Longer technique text goes here.",
            source: "Optional source note or URL."
          }
        ]
      },

      symbolism: {
        label: "Symbolism",
        intro: "Objects and details that may carry meaning.",
        bubbles: [
          {
            id: "milkmaid-symbolism-1",
            x: 82,
            y: 82,
            title: "The foot warmer",
            shortText: "Replace this with your short symbolism explanation.",
            detailText: "Longer symbolism text goes here.",
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
    image: "./assets/little-street.jpg",
    recognitionThreshold: 0.92,

    categories: {
      history: {
        label: "History",
        intro: "Historical stories and context about this artwork.",
        bubbles: [
          {
            id: "little-street-history-1",
            x: 48,
            y: 35,
            title: "A street becomes a portrait",
            shortText: "Replace this with your short history explanation.",
            detailText: "Longer history text goes here.",
            source: "Optional source note or URL."
          }
        ]
      },

      technique: {
        label: "Technique",
        intro: "Painting methods, colour, light, brushwork, and composition.",
        bubbles: [
          {
            id: "little-street-technique-1",
            x: 44,
            y: 42,
            title: "The brickwork",
            shortText: "Replace this with your short technique explanation.",
            detailText: "Longer technique text goes here.",
            source: "Optional source note or URL."
          }
        ]
      },

      symbolism: {
        label: "Symbolism",
        intro: "Objects and details that may carry meaning.",
        bubbles: [
          {
            id: "little-street-symbolism-1",
            x: 58,
            y: 67,
            title: "The open doorway",
            shortText: "Replace this with your short symbolism explanation.",
            detailText: "Longer symbolism text goes here.",
            source: "Optional source note or URL."
          }
        ]
      }
    }
  }
];
