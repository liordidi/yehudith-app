import React, { useState } from 'react';
import { submitMemory } from '../api/memories';

export function SubmitMemoryForm() {
  const [open,            setOpen]            = useState(false);
  const [name,            setName]            = useState('');
  const [title,           setTitle]           = useState('');
  const [text,            setText]            = useState('');
  const [imageFile,       setImageFile]       = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [submitting,      setSubmitting]      = useState(false);
  const [submitted,       setSubmitted]       = useState(false);
  const [error,           setError]           = useState('');

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
  };

  const handleRemoveImage = () => {
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImageFile(null);
    setImagePreviewUrl(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !text.trim()) {
      setError('שם וטקסט הם שדות חובה');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await submitMemory({ name, title, text, imageFile });
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'שגיאה בשליחה, נסו שוב');
      setSubmitting(false);
    }
  };

  const handleDismiss = () => {
    setSubmitted(false);
    setOpen(false);
    setName('');
    setTitle('');
    setText('');
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImageFile(null);
    setImagePreviewUrl(null);
  };

  return (
    <>
      <section className="share-memory-section" dir="rtl">
        {!open ? (
          <button className="share-memory-btn" onClick={() => setOpen(true)}>
            שתפו זיכרון
          </button>
        ) : (
          <form className="memory-form" onSubmit={handleSubmit}>
            <label>שם מלא *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="השם שיוצג"
              disabled={submitting}
            />

            <label>כותרת</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="כותרת (רשות)"
              disabled={submitting}
            />

            <label>זיכרון *</label>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              rows={5}
              placeholder="שתפו זיכרון, רגע, סיפור..."
              disabled={submitting}
            />

            <label className="memory-file-label">
              {imageFile ? 'החלף תמונה' : 'הוסף תמונה (רשות)'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: 'none' }}
                onChange={handleImageChange}
                disabled={submitting}
              />
            </label>

            {imagePreviewUrl && (
              <div className="memory-image-preview">
                <img src={imagePreviewUrl} alt="תצוגה מקדימה" />
                <button
                  type="button"
                  className="memory-image-remove"
                  onClick={handleRemoveImage}
                  disabled={submitting}
                >
                  הסר תמונה
                </button>
              </div>
            )}

            {error && <div className="memory-error">{error}</div>}

            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button
                type="submit"
                className="memory-submit-btn"
                disabled={submitting}
              >
                {submitting ? 'שולח...' : 'שליחה'}
              </button>
              <button
                type="button"
                className="memory-submit-btn"
                onClick={() => setOpen(false)}
                disabled={submitting}
                style={{ background: '#f0ece6' }}
              >
                ביטול
              </button>
            </div>
          </form>
        )}
      </section>

      {submitted && (
        <div className="memory-success-overlay" onClick={handleDismiss}>
          <div className="memory-success-card" onClick={e => e.stopPropagation()}>
            <span className="memory-success-heart">❤️</span>
            <p className="memory-success-text">
              תודה על השיתוף!<br />
              התוכן ייבדק ויעלה לאתר לאחר אישור.
            </p>
            <button className="memory-success-dismiss" onClick={handleDismiss}>
              סגור
            </button>
          </div>
        </div>
      )}
    </>
  );
}
