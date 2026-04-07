import React, { useState, useEffect } from 'react';
import { useCandle } from '../hooks/useCandle';

export function CandleSection({ candle }) {
  const { count, loading, increment } = useCandle();
  const [lit,   setLit]   = useState(false);
  const [toast, setToast] = useState(false);

  const handleLight = async () => {
    if (lit) return;
    setLit(true);
    setToast(true);
    await increment();
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
        disabled={lit || loading}
      >
        {lit ? 'הנר הודלק 🕯️' : candle.buttonLabel}
      </button>
      <div className="candle-count">
        {loading ? '...' : count} {candle.countLabel}
      </div>
      {toast && (
        <div className="candle-toast" role="status">
          תודה שהדלקת נר לזכרה 💜
        </div>
      )}
    </section>
  );
}
