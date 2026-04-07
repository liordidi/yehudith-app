// gallery.js
// API client for gallery display settings.
// Settings are stored in Supabase Storage (memory-images bucket).

import { supabase } from '../lib/supabase';

const API = import.meta.env.VITE_API_URL;

/** Fetch saved display settings for all gallery items.
 *  Returns { [filename]: { x, y, zoom, fit, height } }
 *  Falls back to {} on any error so the gallery still renders. */
export async function fetchGallerySettings() {
  try {
    const { data, error } = await supabase.storage
      .from('memory-images')
      .download('gallery-settings.json');

    if (error || !data) return {};

    const text = await data.text();
    return JSON.parse(text);
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
