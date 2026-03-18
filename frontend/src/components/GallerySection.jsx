import React, { useState, useEffect } from 'react';
import { galleryItems } from '../galleryAssets';
import { VideoThumbnail } from './VideoThumbnail';
import { MediaModal } from './MediaModal';
import { useComments } from '../hooks/useComments';
import { fetchGallerySettings, saveGallerySettings } from '../api/gallery';

// ── Display settings helpers ──────────────────────────────────────────────────

const DISPLAY_DEFAULTS = { x: 50, y: 50, zoom: 1, fit: 'cover', height: 180 };

function parseDisplay(d) {
  if (!d) return { ...DISPLAY_DEFAULTS };
  return {
    x:      typeof d.x      === 'number' ? Math.max(0,   Math.min(100, d.x))      : DISPLAY_DEFAULTS.x,
    y:      typeof d.y      === 'number' ? Math.max(0,   Math.min(100, d.y))      : DISPLAY_DEFAULTS.y,
    zoom:   typeof d.zoom   === 'number' ? Math.max(0.5, Math.min(4,   d.zoom))   : DISPLAY_DEFAULTS.zoom,
    fit:    ['cover', 'contain'].includes(d.fit) ? d.fit                           : DISPLAY_DEFAULTS.fit,
    height: typeof d.height === 'number' ? Math.max(80,  Math.min(400, d.height)) : DISPLAY_DEFAULTS.height,
  };
}

// ── Thumbnail ─────────────────────────────────────────────────────────────────

function GalleryThumb({ item, display }) {
  const d = parseDisplay(display);
  const imgStyle = {
    objectFit:       d.fit,
    objectPosition:  `${d.x}% ${d.y}%`,
    transform:       d.zoom !== 1 ? `scale(${d.zoom})` : undefined,
    transformOrigin: `${d.x}% ${d.y}%`,
  };

  return (
    <div className="gallery-thumb-wrap" style={{ height: `${d.height}px` }}>
      {item.type === 'video' ? (
        <VideoThumbnail
          src={item.src}
          className="gallery-thumb-img"
          imgStyle={imgStyle}
        />
      ) : (
        <img
          className="gallery-thumb-img"
          src={item.src}
          alt={item.filename}
          style={imgStyle}
        />
      )}
    </div>
  );
}

// ── Admin: gallery item display editor ────────────────────────────────────────

function GalleryItemEditor({ item, display: initial, onSave, onClose }) {
  const [d,       setD]       = useState(parseDisplay(initial));
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  const set = (k, v) => setD(prev => ({ ...prev, [k]: v }));

  const handleImageClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    set('x', Math.round(((e.clientX - rect.left) / rect.width)  * 100));
    set('y', Math.round(((e.clientY - rect.top)  / rect.height) * 100));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await onSave(item.filename, d);
    } catch (err) {
      setError(err.message || 'שגיאה בשמירה');
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" dir="rtl" onClick={onClose}>
      <div className="modal-content edit-memory-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="סגור">✕</button>
        <h3 className="edit-memory-title">עריכת תצוגת תמונה</h3>

        <div className="img-display-editor">
          <div className="img-display-section-label">
            {item.type === 'image' ? 'לחץ לבחירת מוקד' : 'הגדרות תצוגה'}
          </div>

          {/* Live preview */}
          <div
            className="focal-picker-wrap"
            style={{ height: `${d.height}px` }}
            onClick={item.type === 'image' ? handleImageClick : undefined}
            title={item.type === 'image' ? 'לחץ לשינוי מוקד' : undefined}
          >
            <img
              src={item.src}
              alt=""
              className="focal-picker-img"
              style={{
                objectFit:       d.fit,
                objectPosition:  `${d.x}% ${d.y}%`,
                transform:       d.zoom !== 1 ? `scale(${d.zoom})` : undefined,
                transformOrigin: `${d.x}% ${d.y}%`,
              }}
              draggable={false}
            />
            {item.type === 'image' && (
              <>
                <div className="focal-dot" style={{ left: `${d.x}%`, top: `${d.y}%` }} />
                <div className="focal-click-hint">לחץ לשינוי מוקד</div>
              </>
            )}
          </div>

          {/* Controls */}
          <div className="img-display-controls">
            <div className="img-ctrl-row">
              <span className="img-ctrl-label">גובה</span>
              <input
                type="range" min="80" max="400" step="10"
                value={d.height}
                onChange={e => set('height', parseInt(e.target.value))}
                className="img-ctrl-slider"
              />
              <span className="img-ctrl-val">{d.height}px</span>
            </div>

            {item.type === 'image' && (
              <>
                <div className="img-ctrl-row">
                  <span className="img-ctrl-label">זום</span>
                  <input
                    type="range" min="0.5" max="3" step="0.05"
                    value={d.zoom}
                    onChange={e => set('zoom', parseFloat(e.target.value))}
                    className="img-ctrl-slider"
                  />
                  <span className="img-ctrl-val">{d.zoom.toFixed(1)}×</span>
                </div>

                <div className="img-ctrl-row">
                  <span className="img-ctrl-label">מצב</span>
                  <div className="fit-toggle">
                    <button
                      type="button"
                      className={`fit-btn${d.fit === 'cover'   ? ' fit-btn--active' : ''}`}
                      onClick={() => set('fit', 'cover')}
                    >כיסוי</button>
                    <button
                      type="button"
                      className={`fit-btn${d.fit === 'contain' ? ' fit-btn--active' : ''}`}
                      onClick={() => set('fit', 'contain')}
                    >התאמה</button>
                  </div>
                </div>
              </>
            )}
          </div>

          {item.type === 'image' && (
            <div className="focal-hint">מוקד: {d.x}%, {d.y}%</div>
          )}
        </div>

        {error && <div className="memory-error" style={{ marginTop: 8 }}>{error}</div>}

        <div className="edit-memory-actions">
          <button
            className="memory-approve-btn"
            onClick={handleSave}
            disabled={saving}
          >{saving ? 'שומר...' : 'שמור'}</button>
          <button className="memory-approve-btn" onClick={onClose}>ביטול</button>
        </div>
      </div>
    </div>
  );
}

// ── Main gallery section ──────────────────────────────────────────────────────

const ITEMS_PER_PAGE = 4;
const LS_KEY = 'gallery_display_v1';

function lsLoad() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || 'null'); } catch { return null; }
}
function lsSave(data) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch {}
}

export function GallerySection({ gallery, showAdmin, adminKey }) {
  const [page,             setPage]            = useState(0);
  const [activeItem,       setActiveItem]      = useState(null);
  const [editingItem,      setEditingItem]      = useState(null);
  const [displaySettings,  setDisplaySettings] = useState(() => lsLoad() || {});
  const commentsHook = useComments();

  const totalPages = Math.ceil(galleryItems.length / ITEMS_PER_PAGE);
  const pageItems  = galleryItems.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);

  // On mount: prefer backend settings; fall back to localStorage cache
  useEffect(() => {
    fetchGallerySettings().then(data => {
      if (data && Object.keys(data).length > 0) {
        setDisplaySettings(data);
        lsSave(data);
      }
      // else: keep what was already loaded from localStorage in initial state
    });
  }, []);

  const handleSaveDisplay = async (filename, d) => {
    const next = { ...displaySettings, [filename]: d };
    // Apply immediately so the card reflects the new height without waiting for the network
    setDisplaySettings(next);
    lsSave(next);
    setEditingItem(null);
    // Best-effort backend persist (cross-device)
    saveGallerySettings(next, adminKey).catch(err =>
      console.warn('[gallery] backend save failed (settings kept locally):', err.message)
    );
  };

  return (
    <section className="gallery-section" dir="rtl">
      <h2>{gallery.title}</h2>

      {/* ── 2×2 grid ── */}
      <div className="gallery-grid">
        {pageItems.map(item => (
          <div
            className="gallery-card"
            key={item.id}
            onClick={() => setActiveItem(item)}
            role="button"
            tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && setActiveItem(item)}
          >
            <GalleryThumb item={item} display={displaySettings[item.filename]} />

            {showAdmin && (
              <button
                className="gallery-edit-btn"
                title="ערוך תצוגה"
                onClick={e => { e.stopPropagation(); setEditingItem(item); }}
                aria-label="ערוך תצוגת תמונה"
              >✎</button>
            )}
          </div>
        ))}
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="gallery-pagination">
          <button
            className="gallery-nav-btn"
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            aria-label="עמוד קודם"
          >›</button>

          <div className="gallery-dots">
            {Array.from({ length: totalPages }, (_, i) => (
              <span
                key={i}
                className={`gallery-dot${i === page ? ' gallery-dot--active' : ''}`}
                onClick={() => setPage(i)}
              />
            ))}
          </div>

          <button
            className="gallery-nav-btn"
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
            aria-label="עמוד הבא"
          >‹</button>
        </div>
      )}

      {/* ── Admin display editor ── */}
      {editingItem && (
        <GalleryItemEditor
          item={editingItem}
          display={displaySettings[editingItem.filename]}
          onSave={handleSaveDisplay}
          onClose={() => setEditingItem(null)}
        />
      )}

      {/* ── Lightbox ── */}
      {activeItem && (
        <MediaModal
          item={activeItem}
          onClose={() => setActiveItem(null)}
          comments={commentsHook}
        />
      )}
    </section>
  );
}
