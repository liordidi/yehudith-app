import React, { useState, useEffect } from 'react';
import './App.css';
import { memorialData } from './memorialData';
import { HeroSection } from './components/HeroSection';
import { GallerySection } from './components/GallerySection';
import { MemoriesSection } from './components/MemoriesSection';
import { SongsSection } from './components/SongsSection';
import { SubmitMemoryForm } from './components/SubmitMemoryForm';
import { CandleSection } from './components/CandleSection';
import { Footer } from './components/Footer';
import {
  fetchApprovedMemories,
  fetchApprovedMemoriesAdmin,
  updateMemory,
  deleteMemory,
} from './api/memories';

// Admin panel is shown in dev mode OR when ?admin appears in the URL.
const SHOW_ADMIN = import.meta.env.DEV ||
  new URLSearchParams(window.location.search).has('admin');

function App() {
  // ── Share form ─────────────────────────────────────────────────────────────
  const [shareFormOpen, setShareFormOpen] = useState(false);

  // ── Public memories ────────────────────────────────────────────────────────
  const [serverMemories,     setServerMemories]     = useState([]);
  const [memoriesFetchError, setMemoriesFetchError] = useState('');

  // ── Admin shared ───────────────────────────────────────────────────────────
  const [adminKey,     setAdminKey]     = useState('');
  const [adminMsg,     setAdminMsg]     = useState('');

  // ── Admin memories ─────────────────────────────────────────────────────────
  const [approvedAdmin,  setApprovedAdmin]  = useState([]);
  const [editingMemory,  setEditingMemory]  = useState(null);

  // Load approved memories for the public view on mount
  useEffect(() => {
    fetchApprovedMemories()
      .then(setServerMemories)
      .catch(err => {
        console.error('[memories] fetch FAILED:', err.message);
        setMemoriesFetchError('לא ניתן לטעון זיכרונות כרגע. אנא נסו שוב מאוחר יותר.');
      });
  }, []);

  // Admin: load all approved memories for management
  const handleLoadMemories = async () => {
    setAdminMsg('');
    try {
      const data = await fetchApprovedMemoriesAdmin(adminKey);
      setApprovedAdmin(data);
      if (data.length === 0) setAdminMsg('אין זיכרונות מאושרים');
    } catch (err) {
      setAdminMsg(err.message);
    }
  };

  const handleDeleteMemory = async (id) => {
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
    const cropStr = data.image_crop ? JSON.stringify(data.image_crop) : undefined;
    const applyEdit = m =>
      m.id === id
        ? {
            ...m,
            name:  data.name,
            title: data.title,
            text:  data.text,
            ...('image_url' in result ? { image_url: result.image_url } : {}),
            ...(cropStr !== undefined ? { image_crop: cropStr } : {}),
          }
        : m;
    setApprovedAdmin(prev => prev.map(applyEdit));
    setServerMemories(prev => prev.map(applyEdit));
    if (result.cropWarning) throw new Error(result.cropWarning);
    setAdminMsg('הזיכרון עודכן ✓');
    setEditingMemory(null);
  };

  return (
    <div className="memorial-page" dir="rtl">
      <HeroSection
        person={memorialData.person}
        hero={memorialData.hero}
        onOpenShareForm={() => setShareFormOpen(true)}
      />
      <GallerySection
        gallery={memorialData.gallery}
        showAdmin={SHOW_ADMIN}
        adminKey={adminKey}
      />
      <div id="memories-section">
        <MemoriesSection
          memories={{ title: memorialData.memories.title, items: serverMemories }}
          fetchError={memoriesFetchError}
        />
        <SubmitMemoryForm open={shareFormOpen} onOpenChange={setShareFormOpen} />
      </div>
      <div id="songs-section">
        <SongsSection songs={memorialData.songs} />
      </div>
      <CandleSection candle={memorialData.candle} />
      <Footer footer={memorialData.footer} />

      {/* ── Admin panel ── */}
      {SHOW_ADMIN && (
        <div className="memory-pending-panel" dir="rtl">
          <h4>ניהול</h4>

          {/* Shared admin key */}
          <div className="admin-key-row">
            <input
              type="password"
              placeholder="מפתח ניהול"
              value={adminKey}
              onChange={e => setAdminKey(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLoadMemories()}
              className="admin-key-input"
            />
          </div>
          {adminMsg && <div className="admin-msg">{adminMsg}</div>}

          {/* Gallery note */}
          <div className="admin-section-label">גלריה — ערוך תמונה ישירות מהגלריה למעלה (לחץ ✎)</div>

          {/* Memories management */}
          <div className="admin-section-label">
            זיכרונות מאושרים
            <button
              className="memory-approve-btn"
              style={{ marginRight: 10 }}
              onClick={handleLoadMemories}
            >טען</button>
          </div>

          {approvedAdmin.map(mem => (
            <div className="memory-pending-item" key={mem.id}>
              <div><b>{mem.title || '—'}</b> · {mem.name}</div>
              <div>{mem.text}</div>
              {mem.image_url && (
                <img src={mem.image_url} alt="" className="admin-pending-thumb" />
              )}
              <div className="admin-pending-actions">
                <button className="memory-approve-btn" onClick={() => setEditingMemory(mem)}>ערוך</button>
                <button
                  className="memory-approve-btn admin-reject-btn"
                  onClick={() => handleDeleteMemory(mem.id)}
                >מחק</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Admin edit memory modal */}
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

// ── Image display settings helpers ────────────────────────────────────────────
const DISPLAY_DEFAULTS = { x: 50, y: 50, zoom: 1, height: 160, fit: 'cover' };

function parseDisplaySafe(cropVal) {
  try {
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

// ── Admin: edit memory text + image (replace/remove) + display settings ──────
function EditMemoryModal({ memory, onSave, onClose }) {
  const [name,            setName]            = useState(memory?.name  ?? '');
  const [title,           setTitle]           = useState(memory?.title ?? '');
  const [text,            setText]            = useState(memory?.text  ?? '');
  const [display,         setDisplay]         = useState(() => parseDisplaySafe(memory?.image_crop));
  const [imageFile,       setImageFile]       = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [removeImage,     setRemoveImage]     = useState(false);
  const [saving,          setSaving]          = useState(false);
  const [error,           setError]           = useState('');

  useEffect(() => () => { if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl); }, [imagePreviewUrl]);

  if (!memory) return null;

  const previewSrc = imageFile ? imagePreviewUrl : (removeImage ? null : memory.image_url);
  const set = (key, val) => setDisplay(prev => ({ ...prev, [key]: val }));

  const handleImageClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    set('x', Math.round(((e.clientX - rect.left) / rect.width)  * 100));
    set('y', Math.round(((e.clientY - rect.top)  / rect.height) * 100));
  };

  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
    setRemoveImage(false);
    setDisplay({ ...DISPLAY_DEFAULTS });
  };

  const handleRemoveImage = () => {
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImageFile(null);
    setImagePreviewUrl(null);
    setRemoveImage(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !text.trim()) { setError('שם וטקסט הם שדות חובה'); return; }
    setSaving(true);
    setError('');
    try {
      await onSave(memory.id, {
        name:         name.trim(),
        title:        title.trim() || null,
        text:         text.trim(),
        image_crop:   previewSrc ? display : null,
        imageFile:    imageFile   || undefined,
        remove_image: removeImage,
      });
    } catch (err) {
      setError(err.message || 'שגיאה בשמירה');
      setSaving(false);
    }
  };

  const imgStyle = {
    objectFit:       display.fit,
    objectPosition:  `${display.x}% ${display.y}%`,
    transform:       display.zoom !== 1 ? `scale(${display.zoom})` : undefined,
    transformOrigin: `${display.x}% ${display.y}%`,
  };

  return (
    <div className="modal-overlay" dir="rtl" onClick={onClose}>
      <div className="modal-content edit-memory-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="סגור">✕</button>
        <h3 className="edit-memory-title">עריכת זיכרון</h3>

        <div className="memory-form">
          <label>שם מלא *</label>
          <input value={name}  onChange={e => setName(e.target.value)} />

          <label>כותרת</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="(ריק = ללא כותרת)" />

          <label>טקסט *</label>
          <textarea value={text} onChange={e => setText(e.target.value)} rows={4} />
        </div>

        <div className="img-display-editor">
          <div className="img-display-section-label">תמונה</div>

          <div className="image-replace-row">
            <label className="memory-file-label">
              {previewSrc ? 'החלף תמונה' : (memory.image_url && !removeImage) ? 'שחזר תמונה' : 'הוסף תמונה'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: 'none' }}
                onChange={handleImageFileChange}
              />
            </label>
            {previewSrc && (
              <button
                type="button"
                className="memory-approve-btn admin-reject-btn"
                onClick={handleRemoveImage}
              >הסר תמונה</button>
            )}
            {removeImage && (
              <span className="img-removed-note">התמונה תוסר בשמירה</span>
            )}
          </div>

          {previewSrc && (
            <>
              <div
                className="focal-picker-wrap"
                style={{ height: `${display.height}px` }}
                onClick={handleImageClick}
                title="לחץ לבחירת מוקד"
              >
                <img
                  src={previewSrc}
                  alt=""
                  className="focal-picker-img"
                  style={imgStyle}
                  draggable={false}
                />
                <div className="focal-dot" style={{ left: `${display.x}%`, top: `${display.y}%` }} />
                <div className="focal-click-hint">לחץ לשינוי מוקד</div>
              </div>

              <div className="img-display-controls">
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
                <div className="img-ctrl-row">
                  <span className="img-ctrl-label">מצב תצוגה</span>
                  <div className="fit-toggle">
                    <button type="button" className={`fit-btn${display.fit === 'cover'   ? ' fit-btn--active' : ''}`} onClick={() => set('fit', 'cover')}>כיסוי</button>
                    <button type="button" className={`fit-btn${display.fit === 'contain' ? ' fit-btn--active' : ''}`} onClick={() => set('fit', 'contain')}>התאמה</button>
                  </div>
                </div>
              </div>

              <div className="focal-hint">מוקד: {display.x}%, {display.y}%</div>
            </>
          )}
        </div>

        {error && <div className="memory-error" style={{ marginTop: 8 }}>{error}</div>}

        <div className="edit-memory-actions">
          <button className="memory-approve-btn" onClick={handleSave} disabled={saving}>
            {saving ? 'שומר...' : 'שמור שינויים'}
          </button>
          <button className="memory-approve-btn" onClick={onClose}>ביטול</button>
        </div>
      </div>
    </div>
  );
}

export default App;
