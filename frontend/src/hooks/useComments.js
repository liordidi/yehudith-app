// useComments.js
// Fetches approved comments for a specific gallery image from Supabase.
// Public submission inserts as 'pending' — not visible until an admin approves.

import { useState, useEffect, useCallback } from 'react';
import { fetchApprovedComments, submitComment } from '../api/comments';

export function useComments(mediaId) {
  const [comments, setComments] = useState([]);
  const [loading,  setLoading]  = useState(false);

  useEffect(() => {
    if (!mediaId) return;
    let cancelled = false;
    setLoading(true);
    fetchApprovedComments(mediaId)
      .then(data  => { if (!cancelled) setComments(data); })
      .catch(()   => { if (!cancelled) setComments([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [mediaId]);

  const addComment = useCallback(async (name, text) => {
    await submitComment(mediaId, name, text);
  }, [mediaId]);

  return { comments, addComment, loading };
}
