// MediaModal.jsx
// Lightbox for enlarged gallery media + per-media comments.

import React, { useState, useEffect, useCallback } from 'react';
import { useComments } from '../hooks/useComments';

// ── Enlarged media ────────────────────────────────────────────────────────────

function MediaDisplay({ item }) {
  if (item.type === 'video') {
    return (
      <video
        className="mlb-media mlb-media--video"
        src={item.src}
        poster={item.posterSrc || undefined}
        controls
        autoPlay
        playsInline
      />
    );
  }
  return (
    <img
      className="mlb-media mlb-media--image"
      src={item.src}
      alt={item.filename}
    />
  );
}

// ── Single approved comment ───────────────────────────────────────────────────

function CommentItem({ comment }) {
  const date = new Date(comment.created_at).toLocaleDateString('he-IL', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
  return (
    <div className="mlb-comment">
      <div className="mlb-comment-meta">
        <span className="mlb-comment-name">{comment.name}</span>
        <span className="mlb-comment-date">{date}</span>
      </div>
      <div className="mlb-comment-text">{comment.text}</div>
    </div>
  );
}

// ── Comment submission form ───────────────────────────────────────────────────

function CommentForm({ onAdd }) {
  const [name,        setName]        = useState('');
  const [text,        setText]        = useState('');
  const [errors,      setErrors]      = useState({});
  const [submitting,  setSubmitting]  = useState(false);
  const [done,        setDone]        = useState(false);
  const [submitError, setSubmitError] = useState('');

  const validate = () => {
    const e = {};
    if (!name.trim()) e.name = 'יש להזין שם';
    if (!text.trim()) e.text = 'יש להזין תגובה';
    return e;
  };

  const handleSubmit = async (evt) => {
    evt.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      await onAdd(name, text);
      setDone(true);
    } catch (err) {
      setSubmitError(err.message || 'שגיאה בשליחה, נסו שוב');
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="mlb-comment-success">
        תגובתך התקבלה ותפורסם לאחר אישור. תודה על השיתוף.
      </div>
    );
  }

  return (
    <form className="mlb-comment-form" onSubmit={handleSubmit} dir="rtl">
      <div className="mlb-field">
        <label htmlFor="mlb-name">שם</label>
        <input
          id="mlb-name"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="שמך"
          autoComplete="off"
          disabled={submitting}
        />
        {errors.name && <div className="memory-error">{errors.name}</div>}
      </div>
      <div className="mlb-field">
        <label htmlFor="mlb-text">תגובה</label>
        <textarea
          id="mlb-text"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="כתוב תגובה..."
          rows={3}
          disabled={submitting}
        />
        {errors.text && <div className="memory-error">{errors.text}</div>}
      </div>
      {submitError && <div className="memory-error">{submitError}</div>}
      <button
        type="submit"
        className="mlb-submit-btn"
        disabled={submitting || !name.trim() || !text.trim()}
      >
        {submitting ? 'שולח...' : 'שלח תגובה'}
      </button>
    </form>
  );
}

// ── Main lightbox ─────────────────────────────────────────────────────────────

export function MediaModal({ item, onClose }) {
  const { comments, addComment, loading } = useComments(item.id);

  // Close on Escape key.
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Prevent body scroll while open.
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleOverlay = useCallback((e) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  return (
    <div className="mlb-overlay" onClick={handleOverlay} role="dialog" aria-modal="true" dir="rtl">
      <div className={`mlb-box${item.type === 'video' ? ' mlb-box--video' : ''}`}>

        <button className="mlb-close" onClick={onClose} aria-label="סגור">✕</button>

        <MediaDisplay item={item} />

        <div className="mlb-comments">
          <h3 className="mlb-comments-title">תגובות</h3>

          {loading ? (
            <p className="mlb-comments-empty">טוען...</p>
          ) : comments.length === 0 ? (
            <p className="mlb-comments-empty">היה הראשון להגיב על תמונה זו</p>
          ) : (
            comments.map(c => <CommentItem key={c.id} comment={c} />)
          )}

          <CommentForm onAdd={addComment} />
        </div>

      </div>
    </div>
  );
}
