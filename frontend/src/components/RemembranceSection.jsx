import React, { useState, useEffect } from 'react';
import { useCandle } from '../hooks/useCandle';

export function RemembranceSection({ remembrance }) {
  const { count, loading, increment } = useCandle();
  const [lit, setLit] = useState(false);
  const [toast, setToast] = useState(false);

  const handleLight = async () => {
    if (lit) return;
    setLit(true);
    setToast(true);
    await increment();
  };

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(false), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <section className="remembrance-section" dir="rtl">
      <h2>{remembrance.title}</h2>
      <div className="remembrance-actions">
        <div className="remembrance-action">
          <button
            className={`remembrance-btn${lit ? ' remembrance-btn--lit' : ''}`}
            onClick={handleLight}
            disabled={lit || loading}
          >
            {lit ? 'הנר הודלק 🕯️' : remembrance.candleLabel}
          </button>
          <svg className="remembrance-icon" width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="6" y="9" width="12" height="15" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M5 9h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M7.5 12.5h9" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" opacity="0.35" />
            <line x1="12" y1="12.5" x2="12" y2="7" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
            <path d="M12 3c0 0-1.8 2-1.8 3.2a1.8 1.8 0 0 0 3.6 0c0-1.2-1.8-3.2-1.8-3.2z" fill="currentColor" opacity="0.45" />
          </svg>
        </div>
        <div className="remembrance-action">
          <a
            className="remembrance-btn"
            href={remembrance.tehillimHref}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={remembrance.tehillimLabel}
          >
            {remembrance.tehillimLabel}
          </a>
          <svg className="remembrance-icon" width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M8 7h8M8 11h5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </div>
      </div>
      {toast && (
        <div className="remembrance-toast" role="status">
          תודה שהדלקת נר לזכרה 💜 · {count} {remembrance.countLabel}
        </div>
      )}
    </section>
  );
}
