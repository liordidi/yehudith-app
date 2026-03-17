// memories.js
// Thin API client — all requests go through the Express backend,
// which holds Supabase credentials server-side.

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';

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

/** Delete an approved memory (admin only). Also removes its storage image server-side. */
export async function deleteMemory(id, adminKey) {
  const res = await fetch(`${API}/api/admin/memories/${id}`, {
    method: 'DELETE',
    headers: { 'X-Admin-Key': adminKey },
  });
  if (!res.ok) throw new Error('שגיאה במחיקת הזיכרון');
}
