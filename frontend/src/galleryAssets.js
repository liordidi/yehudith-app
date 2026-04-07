// galleryAssets.js
//
// Gallery items are discovered automatically from src/assets/gallery/.
// To add media to the gallery, drop files into the matching category folder:
//
//   src/assets/gallery/family/     → category "משפחה"
//   src/assets/gallery/moments/    → category "רגעים"
//   src/assets/gallery/childhood/  → category "ילדות"
//
// Supported formats:
//   Images: .jpg  .jpeg  .png  .webp
//   Videos: .mp4  .mov   .webm
//
// Optional video posters:
//   Add a sidecar file next to the video named:
//   <video filename>.<video ext>.poster.(jpg|jpeg|png|webp|svg)
//   Example:
//   Video Project.mp4
//   Video Project.mp4.poster.svg
//
// To control sort order, prefix filenames with a number:
//   01-portrait.jpg, 02-garden.webp, 03-clip.mp4

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp']);
const VIDEO_EXTENSIONS = new Set(['mp4', 'mov', 'webm']);

const CATEGORY_MAP = {
  family:    'משפחה',
  moments:   'רגעים',
  childhood: 'ילדות',
};

// Static glob — Vite resolves this at build time.
// Adding a file to one of the subfolders automatically includes it here.
const mediaModules = import.meta.glob(
  './assets/gallery/**/*.{jpg,jpeg,png,webp,mp4,mov,webm}',
  { eager: true }
);

const posterModules = import.meta.glob(
  './assets/gallery/**/*.poster.{jpg,jpeg,png,webp,svg}',
  { eager: true }
);

const posterByMediaPath = Object.fromEntries(
  Object.entries(posterModules).map(([path, mod]) => {
    const mediaPath = path.replace(/\.poster\.[^.]+$/i, '');
    return [mediaPath, mod.default];
  })
);

export const galleryItems = Object.entries(mediaModules)
  .filter(([path]) => !/\.poster\.[^.]+$/i.test(path))
  .map(([path, mod]) => {
    // path example: "./assets/gallery/family/01-photo.jpg"
    const segments = path.split('/');
    const folderName = segments[segments.length - 2]; // "family"
    const filename   = segments[segments.length - 1]; // "01-photo.jpg"
    const ext        = filename.split('.').pop().toLowerCase();
    const type       = VIDEO_EXTENSIONS.has(ext) ? 'video' : 'image';

    return {
      id:       path,
      src:      mod.default,
      type,
      posterSrc: type === 'video' ? posterByMediaPath[path] ?? null : null,
      category: CATEGORY_MAP[folderName] ?? folderName,
      folderName,
      filename,
    };
  })
  .sort((a, b) => {
    // Primary: folder insertion order (family → moments → childhood)
    const ORDER = Object.keys(CATEGORY_MAP);
    const diff = ORDER.indexOf(a.folderName) - ORDER.indexOf(b.folderName);
    if (diff !== 0) return diff;
    // Secondary: filename ascending (01-… before 02-…)
    return a.filename.localeCompare(b.filename, undefined, { numeric: true });
  });
