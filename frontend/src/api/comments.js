// comments.js
// Public flows use Supabase directly (anon key).
// Admin flows use Express backend (X-Admin-Key).

import { supabase } from '../lib/supabase';

const API = import.meta.env.VITE_API_URL;

// ── Public ────────────────────────────────────────────────────────────────────

/** Fetch all approved comments for a single gallery image. */
export async function fetchApprovedComments(mediaId) {
  const { data, error } = await supabase
    .from('image_comments')
    .select('id, name, text, created_at')
    .eq('media_id', mediaId)
    .eq('status', 'approved')
    .order('created_at', { ascending: true });

  if (error) throw new Error('שגיאה בטעינת התגובות');
  return data;
}

/** Submit a comment for moderation (always lands as pending). */
export async function submitComment(mediaId, name, text) {
  const { error } = await supabase.from('image_comments').insert({
    media_id: mediaId,
    name:     name.trim(),
    text:     text.trim(),
    status:   'pending',
  });
  if (error) throw new Error('שגיאה בשליחת התגובה');
}

// ── Admin (protected by X-Admin-Key via Express) ──────────────────────────────

/** Fetch all pending comments across all images. */
export async function fetchPendingComments(adminKey) {
  const res = await fetch(`${API}/api/admin/comments/pending`, {
    headers: { 'X-Admin-Key': adminKey },
  });
  if (res.status === 401) throw new Error('מפתח ניהול שגוי');
  if (!res.ok) throw new Error('שגיאה בטעינת תגובות ממתינות');
  return res.json();
}

/** Approve a pending comment (sets status → approved). */
export async function approveComment(id, adminKey) {
  const res = await fetch(`${API}/api/admin/comments/${id}`, {
    method:  'PATCH',
    headers: { 'X-Admin-Key': adminKey },
  });
  if (res.status === 401) throw new Error('מפתח ניהול שגוי');
  if (!res.ok) throw new Error('שגיאה באישור התגובה');
}

/** Delete/reject a comment permanently. */
export async function deleteComment(id, adminKey) {
  const res = await fetch(`${API}/api/admin/comments/${id}`, {
    method:  'DELETE',
    headers: { 'X-Admin-Key': adminKey },
  });
  if (res.status === 401) throw new Error('מפתח ניהול שגוי');
  if (!res.ok) throw new Error('שגיאה במחיקת התגובה');
}
