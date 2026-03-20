// memories.js
// API client for memories.
// Public flows use Supabase directly. Admin flows still use Express backend.

import { supabase } from '../lib/supabase';

const API = import.meta.env.VITE_API_URL;
if (!API) {
  console.error(
    '[api] VITE_API_URL is not set — admin API calls will fail.\n' +
    '  Dev:  add VITE_API_URL=http://localhost:4000 to frontend/.env.local\n' +
    '  Prod: set VITE_API_URL in Netlify environment variables.'
  );
}

// ── Public ────────────────────────────────────────────────────────────────────

/** Fetch all approved memories (visible to everyone). */
export async function fetchApprovedMemories() {
  const { data, error } = await supabase
    .from('memories')
    .select('*')
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  if (error) throw new Error('שגיאה בטעינת הזיכרונות');
  return data;
}

// ── Admin (protected by X-Admin-Key header) ───────────────────────────────────

/** Fetch all approved memories for admin management. */
export async function fetchApprovedMemoriesAdmin(adminKey) {
  const res = await fetch(`${API}/api/admin/memories/approved`, {
    headers: { 'X-Admin-Key': adminKey },
  });
  if (res.status === 401) throw new Error('מפתח ניהול שגוי');
  if (!res.ok) throw new Error('שגיאה בטעינת הזיכרונות');
  return res.json();
}

/**
 * Edit a memory's text and/or image display settings (admin only).
 * image_crop shape: { x, y, zoom, height, fit }
 * Returns { ok, cropWarning?, image_url? }
 */
export async function updateMemory(id, adminKey, data) {
  const fd = new FormData();
  fd.append('name',  data.name  ?? '');
  fd.append('title', data.title ?? '');
  fd.append('text',  data.text  ?? '');
  if (data.image_crop !== null && data.image_crop !== undefined) {
    fd.append('image_crop',
      typeof data.image_crop === 'string'
        ? data.image_crop
        : JSON.stringify(data.image_crop));
  }
  if (data.imageFile)    fd.append('image', data.imageFile);
  if (data.remove_image) fd.append('remove_image', 'true');

  const res = await fetch(`${API}/api/admin/memories/${id}`, {
    method: 'PATCH',
    headers: { 'X-Admin-Key': adminKey },
    body: fd,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'שגיאה בעריכת הזיכרון');
  return json;
}

/** Delete an approved memory (admin only). Also removes its storage image server-side. */
export async function deleteMemory(id, adminKey) {
  const res = await fetch(`${API}/api/admin/memories/${id}`, {
    method: 'DELETE',
    headers: { 'X-Admin-Key': adminKey },
  });
  if (!res.ok) throw new Error('שגיאה במחיקת הזיכרון');
}
