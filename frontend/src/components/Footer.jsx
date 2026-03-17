import React from 'react';

export function Footer({ footer }) {
  return (
    <footer className="footer-section" dir="rtl">
      <div className="footer-text">{footer.text}</div>
    </footer>
  );
}
