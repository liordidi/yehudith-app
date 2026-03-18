// gallery.js
// API client for gallery display settings.
// Settings are stored server-side so all visitors see the same thumbnail framing.

const API = import.meta.env.VITE_API_URL;

/** Fetch saved display settings for all gallery items.
 *  Returns { [filename]: { x, y, zoom, fit, height } }
 *  Falls back to {} on any error so the gallery still renders. */
export async function fetchGallerySettings() {
  try {
    const res = await fetch(`${API}/api/gallery-settings`);
    if (!res.ok) return {};
    return res.json();
  } catch {
    return {};
  }
}

/** Save the full display-settings map (admin only). */
export async function saveGallerySettings(settings, adminKey) {
  const res = await fetch(`${API}/api/admin/gallery-settings`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Key': adminKey,
    },
    body: JSON.stringify(settings),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'שגיאה בשמירת הגדרות');
  return data;
}
