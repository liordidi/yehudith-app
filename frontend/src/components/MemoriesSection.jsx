import React from 'react';

function parseDisplaySafe(cropVal) {
  try {
    const c = typeof cropVal === 'string'
      ? JSON.parse(cropVal || '{}')
      : (cropVal && typeof cropVal === 'object' ? cropVal : {});
    return {
      x:      typeof c.x      === 'number' ? Math.max(0,   Math.min(100, c.x))      : 50,
      y:      typeof c.y      === 'number' ? Math.max(0,   Math.min(100, c.y))      : 50,
      zoom:   typeof c.zoom   === 'number' ? Math.max(0.5, Math.min(4,   c.zoom))   : 1,
      height: typeof c.height === 'number' ? Math.max(60,  Math.min(500, c.height)) : 160,
      fit:    ['cover', 'contain'].includes(c.fit) ? c.fit                           : 'cover',
    };
  } catch {
    return { x: 50, y: 50, zoom: 1, height: 160, fit: 'cover' };
  }
}

export function MemoriesSection({ memories, fetchError }) {
  if (fetchError) {
    return (
      <section className="memories-section" dir="rtl">
        <h2>{memories?.title ?? 'זיכרונות'}</h2>
        <div className="memory-error" style={{ textAlign: 'center', padding: '24px' }}>
          {fetchError}
        </div>
      </section>
    );
  }

  if (!memories?.items?.length) return null;

  return (
    <section className="memories-section" dir="rtl">
      <h2>{memories.title}</h2>
      <div className="memories-grid">
        {memories.items.map((mem, i) => {
          const d = parseDisplaySafe(mem.image_crop);
          const imgStyle = {
            objectFit:       'contain',
            objectPosition:  `${d.x}% ${d.y}%`,
          };
          return (
            <div className="memory-card" key={mem.id ?? i}>
              {mem.image_url && (
                <div className="memory-image-wrap" style={{ height: `${d.height}px` }}>
                  <img
                    className="memory-image"
                    src={mem.image_url}
                    alt=""
                    style={imgStyle}
                  />
                </div>
              )}
              <div className="memory-content">
                {mem.title && <div className="memory-title">{mem.title}</div>}
                <p className="memory-body">{mem.text}</p>
                <div className="memory-author">— {mem.name}</div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
