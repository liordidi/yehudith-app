import React from 'react';

export function Footer({ footer }) {
  const lines = footer.lines ?? [footer.text];

  return (
    <footer className="footer-section" dir="rtl">
      <div className="footer-text">
        {lines.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>
    </footer>
  );
}
