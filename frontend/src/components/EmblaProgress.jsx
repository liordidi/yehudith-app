// EmblaProgress.jsx
// Thin progress bar bound to Embla's continuous `scrollProgress()` (0..1).
// Animates during drag, button press, and any other Embla scroll event —
// not just on snap. RTL-aware: the fill grows from the start side (right
// in RTL, left in LTR) via `inset-inline-start: 0` + `width: X%`.

import React, { useEffect, useState } from 'react';
import './EmblaProgress.css';

export function EmblaProgress({ emblaApi, className = '' }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!emblaApi) return;
    const update = () => {
      const p = emblaApi.scrollProgress();
      setProgress(Number.isFinite(p) ? Math.max(0, Math.min(1, p)) : 0);
    };
    update();
    emblaApi.on('scroll', update);
    emblaApi.on('reInit', update);
    return () => {
      emblaApi.off('scroll', update);
      emblaApi.off('reInit', update);
    };
  }, [emblaApi]);

  return (
    <div
      className={`embla-progress${className ? ' ' + className : ''}`}
      role="presentation"
      aria-hidden="true"
    >
      <div
        className="embla-progress-fill"
        style={{ width: `${progress * 100}%` }}
      />
    </div>
  );
}
