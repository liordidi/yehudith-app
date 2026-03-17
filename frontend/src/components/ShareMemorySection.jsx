import React from 'react';

export function ShareMemorySection({ shareMemory, onWriteMemory }) {
  return (
    <section className="share-memory-section" dir="rtl">
      <h2>{shareMemory.title}</h2>
      <div className="share-memory-text">{shareMemory.text}</div>
      <button className="share-memory-btn" onClick={onWriteMemory}>{shareMemory.buttonLabel}</button>
    </section>
  );
}
