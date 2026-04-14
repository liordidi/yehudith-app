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
      <div className="remembrance-title">{remembrance.title}</div>
      <div className="remembrance-actions">
        <button
          className={`remembrance-btn${lit ? ' remembrance-btn--lit' : ''}`}
          onClick={handleLight}
          disabled={lit || loading}
        >
          {lit ? 'הנר הודלק 🕯️' : remembrance.candleLabel}
        </button>
        <a
          className="remembrance-btn"
          href={remembrance.tehillimHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={remembrance.tehillimLabel}
        >
          {remembrance.tehillimLabel}
        </a>
      </div>
      <div className="remembrance-count">
        {loading ? '...' : count} {remembrance.countLabel}
      </div>
      {toast && (
        <div className="remembrance-toast" role="status">
          תודה שהדלקת נר לזכרה 💜
        </div>
      )}
    </section>
  );
}
