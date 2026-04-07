import React, { useState } from 'react';

const CHAR_LIMIT = 180;

function MemoryCard({ mem }) {
  const isLong = mem.text && mem.text.length > CHAR_LIMIT;
  const [expanded, setExpanded] = useState(false);

  const displayText = isLong && !expanded
    ? mem.text.slice(0, CHAR_LIMIT).trimEnd() + '…'
    : mem.text;

  return (
    <div className="memory-card">
      {mem.image_url && (
        <div className="memory-image-wrap">
          <img
            className="memory-image"
            src={mem.image_url}
            alt=""
          />
        </div>
      )}
      <div className="memory-content">
        {mem.title && <div className="memory-title">{mem.title}</div>}
        <p className="memory-body">{displayText}</p>
        {isLong && (
          <button
            className="memory-readmore"
            onClick={() => setExpanded(e => !e)}
          >
            {expanded ? 'סגור' : 'קרא עוד'}
          </button>
        )}
        <div className="memory-author">— {mem.name}</div>
      </div>
    </div>
  );
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
        {memories.items.map((mem, i) => (
          <MemoryCard key={mem.id ?? i} mem={mem} />
        ))}
      </div>
    </section>
  );
}
