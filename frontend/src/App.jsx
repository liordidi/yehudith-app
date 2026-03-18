import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import { memorialData } from './memorialData';
import { HeroSection } from './components/HeroSection';
import { GallerySection } from './components/GallerySection';
import { MemoriesSection } from './components/MemoriesSection';
import { SongsSection } from './components/SongsSection';
import { MessagesSection } from './components/MessagesSection';
import { CandleSection } from './components/CandleSection';
import { Footer } from './components/Footer';
import { Modal } from './components/Modal';
import {
  fetchApprovedMemories,
  submitMemory,
  fetchPendingMemories,
  approveMemory,
  rejectMemory,
  fetchApprovedMemoriesAdmin,
  deleteMemory,
  updateMemory,
} from './api/memories';

// Admin panel is shown in dev mode OR when ?admin appears in the URL.
const SHOW_ADMIN = import.meta.env.DEV ||
  new URLSearchParams(window.location.search).has('admin');

function App() {
  const [modalOpen, setModalOpen]       = useState(false);
  const [serverMemories, setServerMemories] = useState([]);
  const [memoriesFetchError, setMemoriesFetchError] = useState('');
  const [successMsg, setSuccessMsg]     = useState('');
  const [submitting, setSubmitting]     = useState(false);
  const [submitError, setSubmitError]   = useState('');
  const successTimeout                  = useRef(null);

  // Admin state
  const [adminKey, setAdminKey]         = useState('');
  const [pending, setPending]           = useState([]);
  const [approvedAdmin, setApprovedAdmin] = useState([]);
  const [adminMsg, setAdminMsg]         = useState('');
  const [editingMemory, setEditingMemory] = useState(null);

  // Load approved memories from the real backend on mount.
  useEffect(() => {
    fetchApprovedMemories()
      .then(data => {
        setServerMemories(data);
      })
      .catch(err => {
        console.error('[memories] fetch FAILED:', err.message);
        setMemoriesFetchError('לא ניתן לטעון זיכרונות כרגע. אנא נסו שוב מאוחר יותר.');
      });
  }, []);

  // Auto-dismiss success message
  useEffect(() => {
    if (!successMsg) return;
    successTimeout.current = setTimeout(() => setSuccessMsg(''), 4000);
    return () => clearTimeout(successTimeout.current);
  }, [successMsg]);

  const handleShareMemory = () => {
    setSubmitError('');
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSubmitError('');
    if (successTimeout.current) clearTimeout(successTimeout.current);
  };

  const handleSubmitMemory = async (formData, resetForm) => {
    setSubmitting(true);
    setSubmitError('');
    try {
      await submitMemory(formData);
      setModalOpen(false);
      setSuccessMsg('תודה על השיתוף! הזיכרון נשלח לאישור ויופיע לאחר בדיקה.');
      resetForm();
    } catch (err) {
      setSubmitError(err.message || 'שגיאה בשליחת הזיכרון');
    } finally {
      setSubmitting(false);
    }
  };

  // Admin: load both pending and approved from backend
  const handleLoadPending = async () => {
    setAdminMsg('');
    try {
      const [pendingData, approvedData] = await Promise.all([
        fetchPendingMemories(adminKey),
        fetchApprovedMemoriesAdmin(adminKey),
      ]);
      setPending(pendingData);
      setApprovedAdmin(approvedData);
      if (pendingData.length === 0 && approvedData.length === 0)
        setAdminMsg('אין זיכרונות במערכת');
    } catch (err) {
      setAdminMsg(err.message);
    }
  };

  const handleApprove = async (id) => {
    try {
      await approveMemory(id, adminKey);
      const approved = pending.find(m => m.id === id);
      setPending(prev => prev.filter(m => m.id !== id));
      if (approved) setApprovedAdmin(prev => [{ ...approved, status: 'approved' }, ...prev]);
      setAdminMsg('הזיכרון אושר ✓');
      fetchApprovedMemories()
        .then(setServerMemories)
        .catch(err => console.error('Refresh after approve failed:', err.message));
    } catch {
      setAdminMsg('שגיאה באישור');
    }
  };

  const handleReject = async (id) => {
    try {
      await rejectMemory(id, adminKey);
      setPending(prev => prev.filter(m => m.id !== id));
      setAdminMsg('הזיכרון נדחה');
    } catch {
      setAdminMsg('שגיאה בדחייה');
    }
  };

  const handleDeleteApproved = async (id) => {
    try {
      await deleteMemory(id, adminKey);
      setApprovedAdmin(prev => prev.filter(m => m.id !== id));
      setServerMemories(prev => prev.filter(m => m.id !== id));
      setAdminMsg('הזיכרון נמחק');
    } catch {
      setAdminMsg('שגיאה במחיקה');
    }
  };

  const handleSaveEdit = async (id, data) => {
    const result = await updateMemory(id, adminKey, data);
    // Normalise image_crop to a JSON string for downstream parsers
    const cropStr = data.image_crop ? JSON.stringify(data.image_crop) : undefined;
    const applyEdit = m =>
      m.id === id
        ? { ...m, name: data.name, title: data.title, text: data.text,
            ...(cropStr !== undefined ? { image_crop: cropStr } : {}) }
        : m;
    setPending(prev => prev.map(applyEdit));
    setApprovedAdmin(prev => prev.map(applyEdit));
    setServerMemories(prev => prev.map(applyEdit));
    if (result.cropWarning) {
      // Throw so EditMemoryModal's catch block shows the warning inside the modal
      // (modal stays open, user sees the SQL they need to run)
      throw new Error(result.cropWarning);
    }
    setAdminMsg('הזיכרון עודכן ✓');
    setEditingMemory(null);
  };

  // Only real memories from the backend are shown
  const allMemories = serverMemories;

  return (
    <div className="memorial-page" dir="rtl">
      <HeroSection
        person={memorialData.person}
        hero={memorialData.hero}
        onShareMemory={handleShareMemory}
      />
      <GallerySection gallery={memorialData.gallery} />
      <div id="memories-section">
        <MemoriesSection memories={{ title: memorialData.memories.title, items: allMemories }} fetchError={memoriesFetchError} />
      </div>
      <div id="songs-section">
        <SongsSection songs={memorialData.songs} />
      </div>
      <div id="messages-section">
        <MessagesSection messages={memorialData.messages} />
      </div>
      <CandleSection candle={memorialData.candle} />
      <Footer footer={memorialData.footer} />

      {/* Memory submission modal */}
      <Modal
        open={modalOpen}
        onClose={handleCloseModal}
        title={memorialData.shareMemory.modalTitle}
        closeLabel={memorialData.shareMemory.closeButton}
      >
        <MemoryForm
          onSubmit={handleSubmitMemory}
          submitting={submitting}
          submitError={submitError}
        />
      </Modal>

      {successMsg && (
        <div
          className="memory-success-overlay"
          onClick={() => { clearTimeout(successTimeout.current); setSuccessMsg(''); }}
          role="dialog"
          aria-modal="true"
          aria-label="זיכרון נשלח בהצלחה"
        >
          <div className="memory-success-card" dir="rtl" onClick={e => e.stopPropagation()}>
            <div className="memory-success-heart" aria-hidden="true">❤️</div>
            <p className="memory-success-text">{successMsg}</p>
            <button
              className="memory-success-dismiss"
              onClick={() => { clearTimeout(successTimeout.current); setSuccessMsg(''); }}
            >סגור</button>
          </div>
        </div>
      )}

      {/* Admin moderation panel — dev / ?admin URL only */}
      {SHOW_ADMIN && (
        <div className="memory-pending-panel" dir="rtl">
          <h4>ניהול זיכרונות</h4>
          <div className="admin-key-row">
            <input
              type="password"
              placeholder="מפתח ניהול"
              value={adminKey}
              onChange={e => setAdminKey(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLoadPending()}
              className="admin-key-input"
            />
            <button className="memory-approve-btn" onClick={handleLoadPending}>טען</button>
          </div>
          {adminMsg && <div className="admin-msg">{adminMsg}</div>}

          {/* Pending */}
          {pending.length > 0 && (
            <>
              <div className="admin-section-label">ממתינים לאישור ({pending.length})</div>
              {pending.map(mem => (
                <div className="memory-pending-item" key={mem.id}>
                  <div><b>{mem.title || '—'}</b> · {mem.name}</div>
                  <div>{mem.text}</div>
                  {mem.image_url && (
                    <img src={mem.image_url} alt="" className="admin-pending-thumb" />
                  )}
                  <div className="admin-pending-actions">
                    <button className="memory-approve-btn" onClick={() => handleApprove(mem.id)}>אשר</button>
                    <button className="memory-approve-btn" onClick={() => setEditingMemory(mem)}>ערוך</button>
                    <button className="memory-approve-btn admin-reject-btn" onClick={() => handleReject(mem.id)}>דחה</button>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Approved */}
          {approvedAdmin.length > 0 && (
            <>
              <div className="admin-section-label">זיכרונות מאושרים ({approvedAdmin.length})</div>
              {approvedAdmin.map(mem => (
                <div className="memory-pending-item" key={mem.id}>
                  <div><b>{mem.title || '—'}</b> · {mem.name}</div>
                  <div>{mem.text}</div>
                  {mem.image_url && (
                    <img src={mem.image_url} alt="" className="admin-pending-thumb" />
                  )}
                  <div className="admin-pending-actions">
                    <button className="memory-approve-btn" onClick={() => setEditingMemory(mem)}>ערוך</button>
                    <button className="memory-approve-btn admin-reject-btn" onClick={() => handleDeleteApproved(mem.id)}>מחק</button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Admin edit modal */}
      {editingMemory && (
        <EditMemoryModal
          memory={editingMemory}
          onSave={handleSaveEdit}
          onClose={() => setEditingMemory(null)}
        />
      )}
    </div>
  );
}

// ── Memory submission form ────────────────────────────────────────────────────
function MemoryForm({ onSubmit, submitting, submitError }) {
  const [name, setName]               = useState('');
  const [title, setTitle]             = useState('');
  const [text, setText]               = useState('');
  const [imageFile, setImageFile]     = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [errors, setErrors]           = useState({});

  // Revoke object URL when component unmounts
  useEffect(() => {
    return () => { if (imagePreview) URL.revokeObjectURL(imagePreview); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const resetForm = () => {
    setName(''); setTitle(''); setText('');
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null); setImagePreview(null);
    setErrors({});
  };

  const validate = () => {
    const errs = {};
    if (!name.trim()) errs.name = 'יש להזין שם מלא';
    if (!text.trim()) errs.text = 'יש להזין זיכרון';
    return errs;
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleRemoveImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const formData = new FormData();
    formData.append('name', name.trim());
    if (title.trim()) formData.append('title', title.trim());
    formData.append('text', text.trim());
    if (imageFile) formData.append('image', imageFile);

    onSubmit(formData, resetForm);
  };

  return (
    <form className="memory-form" onSubmit={handleSubmit} dir="rtl">
      <label htmlFor="memory-name">שם מלא *</label>
      <input
        id="memory-name"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="הזן את שמך המלא"
        autoComplete="off"
      />
      {errors.name && <div className="memory-error">{errors.name}</div>}

      <label htmlFor="memory-title">כותרת</label>
      <input
        id="memory-title"
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="כותרת (לא חובה)"
        autoComplete="off"
      />

      <label htmlFor="memory-text">זיכרון *</label>
      <textarea
        id="memory-text"
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="כתוב כאן את הזיכרון"
        rows={4}
      />
      {errors.text && <div className="memory-error">{errors.text}</div>}

      {/* Image file upload */}
      <label>תמונה (לא חובה)</label>
      {imagePreview ? (
        <div className="memory-image-preview">
          <img src={imagePreview} alt="תצוגה מקדימה" />
          <button type="button" className="memory-image-remove" onClick={handleRemoveImage}>
            הסר תמונה
          </button>
        </div>
      ) : (
        <label className="memory-file-label" htmlFor="memory-image-file">
          📷 בחר תמונה מהגלריה
          <input
            id="memory-image-file"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleImageChange}
            style={{ display: 'none' }}
          />
        </label>
      )}

      {submitError && <div className="memory-error">{submitError}</div>}

      <button
        type="submit"
        className="memory-submit-btn"
        disabled={submitting || !name.trim() || !text.trim()}
      >
        {submitting ? 'שולח...' : 'שלח זיכרון'}
      </button>
    </form>
  );
}

// ── Image display settings helpers ────────────────────────────────────────────
const DISPLAY_DEFAULTS = { x: 50, y: 50, zoom: 1, height: 160, fit: 'cover' };

function parseDisplaySafe(cropVal) {
  try {
    // Accept a JSON string (TEXT column) OR a plain object (JSONB column)
    const c = typeof cropVal === 'string'
      ? JSON.parse(cropVal || '{}')
      : (cropVal && typeof cropVal === 'object' ? cropVal : {});
    return {
      x:      typeof c.x      === 'number' ? Math.max(0,   Math.min(100, c.x))      : DISPLAY_DEFAULTS.x,
      y:      typeof c.y      === 'number' ? Math.max(0,   Math.min(100, c.y))      : DISPLAY_DEFAULTS.y,
      zoom:   typeof c.zoom   === 'number' ? Math.max(0.5, Math.min(4,   c.zoom))   : DISPLAY_DEFAULTS.zoom,
      height: typeof c.height === 'number' ? Math.max(60,  Math.min(500, c.height)) : DISPLAY_DEFAULTS.height,
      fit:    ['cover', 'contain'].includes(c.fit) ? c.fit                           : DISPLAY_DEFAULTS.fit,
    };
  } catch {
    return { ...DISPLAY_DEFAULTS };
  }
}

// ── Admin: edit memory text + image display settings ─────────────────────────
function EditMemoryModal({ memory, onSave, onClose }) {
  const [name,    setName]    = useState(memory?.name  ?? '');
  const [title,   setTitle]   = useState(memory?.title ?? '');
  const [text,    setText]    = useState(memory?.text  ?? '');
  const [display, setDisplay] = useState(() => parseDisplaySafe(memory?.image_crop));
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  if (!memory) return null;

  const set = (key, val) => setDisplay(prev => ({ ...prev, [key]: val }));

  const handleImageClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    set('x', Math.round(((e.clientX - rect.left) / rect.width)  * 100));
    set('y', Math.round(((e.clientY - rect.top)  / rect.height) * 100));
  };

  const handleSave = async () => {
    if (!name.trim() || !text.trim()) {
      setError('שם וטקסט הם שדות חובה');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave(memory.id, {
        name:       name.trim(),
        title:      title.trim() || null,
        text:       text.trim(),
        image_crop: memory.image_url ? display : null,
      });
      // onSave closes the modal via setEditingMemory(null)
    } catch (err) {
      setError(err.message || 'שגיאה בשמירה');
      setSaving(false);
    }
  };

  // Inline style applied to the live preview (and re-used by the public card)
  const imgStyle = {
    objectFit:      display.fit,
    objectPosition: `${display.x}% ${display.y}%`,
    transform:      display.zoom !== 1 ? `scale(${display.zoom})` : undefined,
    transformOrigin:`${display.x}% ${display.y}%`,
  };

  return (
    <div className="modal-overlay" dir="rtl" onClick={onClose}>
      <div className="modal-content edit-memory-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="סגור">✕</button>
        <h3 className="edit-memory-title">עריכת זיכרון</h3>

        {/* ── Text fields ── */}
        <div className="memory-form">
          <label>שם מלא *</label>
          <input value={name}  onChange={e => setName(e.target.value)} />

          <label>כותרת</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="(ריק = ללא כותרת)" />

          <label>טקסט *</label>
          <textarea value={text} onChange={e => setText(e.target.value)} rows={4} />
        </div>

        {/* ── Image display controls (only when image exists) ── */}
        {memory.image_url && (
          <div className="img-display-editor">
            <div className="img-display-section-label">הצגת תמונה בכרטיס</div>

            {/* Live preview — click to set focal point */}
            <div
              className="focal-picker-wrap"
              style={{ height: `${display.height}px` }}
              onClick={handleImageClick}
              title="לחץ לבחירת מוקד"
            >
              <img
                src={memory.image_url}
                alt=""
                className="focal-picker-img"
                style={imgStyle}
                draggable={false}
              />
              <div
                className="focal-dot"
                style={{ left: `${display.x}%`, top: `${display.y}%` }}
              />
              <div className="focal-click-hint">לחץ לשינוי מוקד</div>
            </div>

            {/* Controls */}
            <div className="img-display-controls">
              {/* Height */}
              <div className="img-ctrl-row">
                <span className="img-ctrl-label">גובה תמונה</span>
                <input
                  type="range" min="60" max="400" step="10"
                  value={display.height}
                  onChange={e => set('height', parseInt(e.target.value))}
                  className="img-ctrl-slider"
                />
                <span className="img-ctrl-val">{display.height}px</span>
              </div>

              {/* Zoom */}
              <div className="img-ctrl-row">
                <span className="img-ctrl-label">זום</span>
                <input
                  type="range" min="0.5" max="3" step="0.05"
                  value={display.zoom}
                  onChange={e => set('zoom', parseFloat(e.target.value))}
                  className="img-ctrl-slider"
                />
                <span className="img-ctrl-val">{display.zoom.toFixed(1)}×</span>
              </div>

              {/* Fit mode */}
              <div className="img-ctrl-row">
                <span className="img-ctrl-label">מצב תצוגה</span>
                <div className="fit-toggle">
                  <button
                    type="button"
                    className={`fit-btn${display.fit === 'cover'   ? ' fit-btn--active' : ''}`}
                    onClick={() => set('fit', 'cover')}
                  >כיסוי</button>
                  <button
                    type="button"
                    className={`fit-btn${display.fit === 'contain' ? ' fit-btn--active' : ''}`}
                    onClick={() => set('fit', 'contain')}
                  >התאמה</button>
                </div>
              </div>
            </div>

            <div className="focal-hint">
              מוקד: {display.x}%, {display.y}%
              {display.fit === 'contain' && ' · התאמה מלאה ללא חיתוך'}
            </div>
          </div>
        )}

        {error && <div className="memory-error" style={{ marginTop: 8 }}>{error}</div>}

        <div className="edit-memory-actions">
          <button
            className="memory-approve-btn"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'שומר...' : 'שמור שינויים'}
          </button>
          <button className="memory-approve-btn" onClick={onClose}>ביטול</button>
        </div>
      </div>
    </div>
  );
}

export default App;
