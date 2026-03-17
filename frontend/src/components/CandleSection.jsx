import React, { useState, useEffect } from 'react';

export function CandleSection({ candle }) {
  const [count, setCount]   = useState(candle.initialCount);
  const [lit, setLit]       = useState(false);
  const [toast, setToast]   = useState(false);

  const handleLight = () => {
    if (lit) return;
    setCount(c => c + 1);
    setLit(true);
    setToast(true);
  };

  // Auto-dismiss toast after 3.5 s
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(false), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <section className="candle-section" dir="rtl">
      <button
        className={`candle-btn${lit ? ' candle-btn--lit' : ''}`}
        onClick={handleLight}
        disabled={lit}
      >
        {lit ? 'הנר הודלק 🕯️' : candle.buttonLabel}
      </button>
      <div className="candle-count">{count} {candle.countLabel}</div>
      {toast && (
        <div className="candle-toast" role="status">
          תודה שהדלקת נר לזכרה 💜
        </div>
      )}
    </section>
  );
}
