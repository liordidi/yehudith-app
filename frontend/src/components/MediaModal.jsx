// MediaModal.jsx
// Lightbox for enlarged gallery media + per-media comments.
//
// Structure:
//   MediaModal           — overlay, backdrop-click-to-close
//     MediaDisplay       — enlarged <img> or <video>
//     CommentList        — approved comments
//     CommentForm        — name + text submission (pending on submit)
//     ModerationPanel    — DEV-only: approve / reject pending comments

import React, { useState, useEffect, useCallback } from 'react';

// ── Enlarged media ────────────────────────────────────────────────────────────

function MediaDisplay({ item }) {
  if (item.type === 'video') {
    return (
      <video
        className="mlb-media"
        src={item.src}
        controls
        autoPlay
        playsInline
      />
    );
  }
  return (
    <img
      className="mlb-media"
      src={item.src}
      alt={item.filename}
    />
  );
}

// ── Single approved comment ───────────────────────────────────────────────────

function CommentItem({ comment }) {
  const date = new Date(comment.createdAt).toLocaleDateString('he-IL', {
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

function CommentForm({ mediaId, onAdd }) {
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [errors, setErrors] = useState({});
  const [done, setDone] = useState(false);

  const validate = () => {
    const e = {};
    if (!name.trim()) e.name = 'יש להזין שם';
    if (!text.trim()) e.text = 'יש להזין תגובה';
    return e;
  };

  const handleSubmit = (evt) => {
    evt.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length === 0) {
      onAdd(mediaId, name, text);
      setName('');
      setText('');
      setDone(true);
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
        />
        {errors.text && <div className="memory-error">{errors.text}</div>}
      </div>
      <button
        type="submit"
        className="mlb-submit-btn"
        disabled={!name.trim() || !text.trim()}
      >
        שלח תגובה
      </button>
    </form>
  );
}

// ── DEV-only moderation panel ─────────────────────────────────────────────────

function ModerationPanel({ pending, onApprove, onReject }) {
  const [open, setOpen] = useState(false);
  if (!pending.length) return null;

  return (
    <div className="mlb-mod-panel">
      <button className="mlb-mod-toggle" onClick={() => setOpen(o => !o)}>
        {open ? '▲' : '▼'} ממתינים לאישור ({pending.length})
      </button>
      {open && (
        <ul className="mlb-mod-list">
          {pending.map(c => (
            <li className="mlb-mod-item" key={c.id}>
              <span><b>{c.name}:</b> {c.text}</span>
              <div className="mlb-mod-actions">
                <button onClick={() => onApprove(c.id)}>אשר</button>
                <button onClick={() => onReject(c.id)}>דחה</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Main lightbox ─────────────────────────────────────────────────────────────

export function MediaModal({ item, onClose, comments: { comments, addComment, approveComment, rejectComment } }) {
  const approved = comments.filter(c => c.mediaId === item.id && c.status === 'approved');
  const pending  = comments.filter(c => c.mediaId === item.id && c.status === 'pending');

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
      <div className="mlb-box">

        <button className="mlb-close" onClick={onClose} aria-label="סגור">✕</button>

        <MediaDisplay item={item} />

        <div className="mlb-comments">
          <h3 className="mlb-comments-title">תגובות</h3>

          {approved.length === 0 ? (
            <p className="mlb-comments-empty">היה הראשון להגיב על תמונה זו</p>
          ) : (
            approved.map(c => <CommentItem key={c.id} comment={c} />)
          )}

          <CommentForm mediaId={item.id} onAdd={addComment} />

          {import.meta.env.DEV && (
            <ModerationPanel
              pending={pending}
              onApprove={approveComment}
              onReject={rejectComment}
            />
          )}
        </div>

      </div>
    </div>
  );
}
