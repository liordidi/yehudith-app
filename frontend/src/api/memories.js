// memories.js
// Thin API client — all requests go through the Express backend,
// which holds Supabase credentials server-side.

const API = import.meta.env.VITE_API_URL;
if (!API) {
  console.error(
    '[api] VITE_API_URL is not set — all API calls will fail.\n' +
    '  Dev:  add VITE_API_URL=http://localhost:4000 to frontend/.env.local\n' +
    '  Prod: set VITE_API_URL in Netlify environment variables.'
  );
}

// ── Public ────────────────────────────────────────────────────────────────────

/** Fetch all approved memories (visible to everyone). */
export async function fetchApprovedMemories() {
  const res = await fetch(`${API}/api/memories`);
  if (!res.ok) throw new Error('שגיאה בטעינת הזיכרונות');
  return res.json();
}

/**
 * Submit a new memory.
 * @param {FormData} formData — fields: name, text, title? + optional image file
 */
export async function submitMemory(formData) {
  const res = await fetch(`${API}/api/memories`, {
    method: 'POST',
    body: formData, // multipart — do NOT set Content-Type manually
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'שגיאה בשליחת הזיכרון');
  return data;
}

// ── Admin (protected by X-Admin-Key header) ───────────────────────────────────

/** Fetch all pending memories (admin only). */
export async function fetchPendingMemories(adminKey) {
  const res = await fetch(`${API}/api/admin/memories`, {
    headers: { 'X-Admin-Key': adminKey },
  });
  if (res.status === 401) throw new Error('מפתח ניהול שגוי');
  if (!res.ok) throw new Error('שגיאה בטעינת הממתינים');
  return res.json();
}

/** Approve a pending memory (admin only). */
export async function approveMemory(id, adminKey) {
  const res = await fetch(`${API}/api/admin/memories/${id}/approve`, {
    method: 'PATCH',
    headers: { 'X-Admin-Key': adminKey },
  });
  if (!res.ok) throw new Error('שגיאה באישור הזיכרון');
}

/** Reject (delete) a pending memory (admin only). */
export async function rejectMemory(id, adminKey) {
  const res = await fetch(`${API}/api/admin/memories/${id}`, {
    method: 'DELETE',
    headers: { 'X-Admin-Key': adminKey },
  });
  if (!res.ok) throw new Error('שגיאה בדחיית הזיכרון');
}

/** Fetch all approved memories for admin management. */
export async function fetchApprovedMemoriesAdmin(adminKey) {
  const res = await fetch(`${API}/api/admin/memories/approved`, {
    headers: { 'X-Admin-Key': adminKey },
  });
  if (res.status === 401) throw new Error('מפתח ניהול שגוי');
  if (!res.ok) throw new Error('שגיאה בטעינת הזיכרונות המאושרים');
  return res.json();
}

/**
 * Edit a memory's text and/or image display settings (admin only).
 * image_crop shape: { x, y, zoom, height, fit } — all optional, server sanitises.
 * Returns { ok, cropWarning? } — cropWarning means text saved but image_crop column missing.
 */
export async function updateMemory(id, adminKey, data) {
  // Always use FormData so the caller can optionally attach a replacement image file.
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
    // No Content-Type header — browser sets it with the correct multipart boundary
    headers: { 'X-Admin-Key': adminKey },
    body: fd,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'שגיאה בעריכת הזיכרון');
  return json; // caller checks json.cropWarning and json.image_url if needed
}

/** Delete an approved memory (admin only). Also removes its storage image server-side. */
export async function deleteMemory(id, adminKey) {
  const res = await fetch(`${API}/api/admin/memories/${id}`, {
    method: 'DELETE',
    headers: { 'X-Admin-Key': adminKey },
  });
  if (!res.ok) throw new Error('שגיאה במחיקת הזיכרון');
}
