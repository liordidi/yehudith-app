import React, { useState } from 'react';

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

const PREVIEW_LEN = 110;

function MemoryCard({ mem, idx }) {
  const [expanded, setExpanded] = useState(false);

  const d      = parseDisplaySafe(mem.image_crop);
  const imgSrc = mem.image_url || mem.image;
  const text   = mem.text || mem.body || '';
  const needsTruncation = text.length > PREVIEW_LEN;

  const handleImgError = (e) => {
    const wrap = e.target.closest('.memory-img-wrap');
    if (wrap) wrap.style.display = 'none';
  };

  return (
    <div className="memory-card" key={mem.id ?? idx}>
      {imgSrc && (
        <div
          className="memory-img-wrap"
          style={{ height: `${d.height}px` }}
        >
          <img
            src={imgSrc}
            alt={mem.title || 'זיכרון'}
            className="memory-img"
            style={{
              objectFit:       d.fit,
              objectPosition:  `${d.x}% ${d.y}%`,
              transform:       d.zoom !== 1 ? `scale(${d.zoom})` : undefined,
              transformOrigin: `${d.x}% ${d.y}%`,
            }}
            onError={handleImgError}
          />
        </div>
      )}
      <div className="memory-content">
        {mem.title && <div className="memory-title">{mem.title}</div>}
        <div className="memory-body">
          {expanded || !needsTruncation
            ? text
            : `${text.slice(0, PREVIEW_LEN)}...`}
        </div>
        {needsTruncation && (
          <button
            className="memory-readmore"
            onClick={() => setExpanded(e => !e)}
          >
            {expanded ? 'סגור' : 'קרא עוד'}
          </button>
        )}
        <div className="memory-author">{mem.name || mem.author}</div>
      </div>
    </div>
  );
}

export function MemoriesSection({ memories, fetchError }) {
  const items = memories.items ?? [];
  console.log('[MemoriesSection] rendering', items.length, 'items');

  return (
    <section className="memories-section" dir="rtl">
      <h2>{memories.title}</h2>
      {fetchError ? (
        <p className="memories-empty memories-error">{fetchError}</p>
      ) : items.length === 0 ? (
        <p className="memories-empty">עדיין אין זיכרונות משותפים. היו הראשונים לשתף.</p>
      ) : null}
      <div className="memories-grid">
        {items.map((mem, idx) => (
          <MemoryCard key={mem.id ?? idx} mem={mem} idx={idx} />
        ))}
      </div>
    </section>
  );
}
