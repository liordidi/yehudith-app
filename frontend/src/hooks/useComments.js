// useComments.js
// Manages per-media comments backed by localStorage.
//
// Comment shape:
//   { id, mediaId, name, text, status: 'pending' | 'approved', createdAt }
//
// All new comments land in 'pending'.
// Only 'approved' comments are shown publicly in the media modal.
// Approval is simulated in-browser via the dev moderation panel.

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'memorial_media_comments';

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function useComments() {
  const [comments, setComments] = useState(load);

  // Persist on every change.
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(comments));
  }, [comments]);

  const addComment = useCallback((mediaId, name, text) => {
    setComments(prev => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        mediaId,
        name: name.trim(),
        text: text.trim(),
        status: 'pending',
        createdAt: new Date().toISOString(),
      },
    ]);
  }, []);

  const approveComment = useCallback((id) => {
    setComments(prev =>
      prev.map(c => c.id === id ? { ...c, status: 'approved' } : c)
    );
  }, []);

  const rejectComment = useCallback((id) => {
    setComments(prev => prev.filter(c => c.id !== id));
  }, []);

  return { comments, addComment, approveComment, rejectComment };
}
