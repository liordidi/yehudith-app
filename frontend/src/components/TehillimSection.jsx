import React from 'react';

export function TehillimSection({ tehillim }) {
  return (
    <section className="tehillim-section" dir="rtl">
      <div className="tehillim-text">{tehillim.text}</div>
      <div className="tehillim-subtext">{tehillim.subtext}</div>
      <a
        className="tehillim-btn"
        href={tehillim.href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={tehillim.buttonLabel}
      >
        {tehillim.buttonLabel}
      </a>
    </section>
  );
}
