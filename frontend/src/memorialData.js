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
      { label: "צפו בזיכרונות", action: "viewMemories" },
      { label: "שתפו זיכרון", action: "shareMemory" },
    ],
  },
  gallery: {
    title: "גלריה",
    // Filter labels shown to the user. First entry is always "show all".
    categories: ["הכל", "משפחה", "רגעים", "ילדות"],
  },
  memories: {
    title: "זיכרונות",
    items: [
      {
        title: "טיול משפחתי",
        body: "יהודית תמיד דאגה לכולם, גם בטיולים.",
        author: "משה כהן",
        image: null, // Replace with image if needed
      },
      // Add more memory cards here
    ],
  },
  shareMemory: {
    title: "שתפו זיכרון",
    text: "נשמח לשמוע ולשתף זיכרונות אישיים.",
    buttonLabel: "כתבו זיכרון",
    modalTitle: "כתבו זיכרון",
    modalDescription: "טופס שיתוף זיכרון (דמו בלבד)",
    closeButton: "סגור",
    // To connect backend, add submission logic here
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
