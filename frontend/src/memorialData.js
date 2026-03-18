// memorialData.js
// Main editable memorial content for the SPA
// To update content, edit this file.
//
// Gallery media is auto-discovered — no edits needed here to add photos/videos.
// Just drop files into the matching folder under src/assets/gallery/:
//   src/assets/gallery/family/     → "משפחה"
//   src/assets/gallery/moments/    → "רגעים"
//   src/assets/gallery/childhood/  → "ילדות"

import heroPng from './assets/hero.png';

export const memorialData = {
  person: {
    name: "יהודית אליהו ז״ל",
    yearsGregorian: "06/07/1955 – 26/09/2025",
    yearsHebrew: "י״ד בתמוז תשט״ו – ד׳ בתשרי תשפ״ו",
    portrait: heroPng, // Replace: drop your image in src/assets/ and update the import above
  },
  hero: {
    subtitle: "לזכרה באהבה",
    description: "אישה של אהבה גדולה, נתינה ענקית, וחיוך תמידי.",
    buttons: [
      { label: "צפו בשירים שהיא אהבה", action: "scrollTo", scrollTo: "songs-section" },
      { label: "צפו בהודעות שלה",      action: "scrollTo", scrollTo: "messages-section" },
    ],
  },
  gallery: {
    title: "גלריה",
  },
  songs: {
    title: "שירים שהיא אהבה",
    // To add a song: copy one of the objects below, give it a unique id, and fill in the fields.
    items: [
      {
        id: 'song-1',
        title: 'חופשייה',
        artist: 'שרית חדד',
        url: 'https://www.youtube.com/watch?v=SdQFv6zYkDY',
      },
      {
        id: 'song-2',
        title: 'מתגעגעת',
        artist: 'שיר שהיא כתבה לאיתן אחיה',
        url: 'https://www.youtube.com/watch?v=fIqWwSzqoFA',
      },
      {
        id: 'song-3',
        title: 'זכרונות על השולחן',
        artist: 'רן כרמי',
        url: 'https://www.youtube.com/watch?v=dVXewqBIf64',
      },
    ],
  },
  messages: {
    title: "הודעות שלה",
    // Add short quotes or dedications here.
    items: [
      { id: 1, text: "זיכרה יהיה לברכה", author: "" },
      { id: 2, text: "אישה של אהבה, נדיבות ואור — לעולם בליבנו", author: "" },
    ],
  },
  candle: {
    buttonLabel: "הדליקו נר לזכרה",
    initialCount: 12,
    countLabel: "נרות דולקים",
  },
  footer: {
    text: "לזכרה של יהודית אליהו ז״ל"
  }
};
