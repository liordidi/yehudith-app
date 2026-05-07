// SectionShell.jsx
// Wraps each top-level section so it occupies one full viewport (100vw × 100vh)
// and registers itself with the SectionRouter. Sections 2–5 also render an
// in-flow SectionNav with prev / home / next buttons. Section 1 (hero) opts out
// because its own nav bar is the page's primary navigation.

import React, { useEffect, useRef } from 'react';
import { useSectionRouter, SECTION_NAMES } from '../sectionRouter';
import './SectionShell.css';

export function SectionShell({ sectionId, showNav = true, children }) {
  const { registerSection, next, prev, home, total } = useSectionRouter();
  const ref = useRef(null);

  useEffect(() => {
    registerSection(sectionId, ref.current);
    return () => registerSection(sectionId, null);
  }, [registerSection, sectionId]);

  const sectionIndex = SECTION_NAMES.indexOf(sectionId);
  const isFirst = sectionIndex === 0;
  const isLast  = sectionIndex === total - 1;

  return (
    <section
      ref={ref}
      id={`section-${sectionId}`}
      className="section-shell"
      data-section-id={sectionId}
      data-section-index={sectionIndex}
    >
      <div className="section-shell-inner">
        {children}
      </div>
      {showNav && !isFirst && (
        <SectionNav onPrev={prev} onHome={home} onNext={next} isLast={isLast} />
      )}
    </section>
  );
}

export function SectionNav({ onPrev, onHome, onNext, isLast }) {
  return (
    <nav className="section-nav" dir="rtl" aria-label="ניווט בין מקטעים">
      <button
        type="button"
        className="section-nav-btn"
        onClick={onPrev}
        aria-label="המקטע הקודם"
      >
        ‹ הקודם
      </button>
      <button
        type="button"
        className="section-nav-btn section-nav-btn--home"
        onClick={onHome}
        aria-label="חזרה לעמוד הבית"
      >
        ⌂ עמוד הבית
      </button>
      <button
        type="button"
        className="section-nav-btn"
        onClick={onNext}
        disabled={isLast}
        aria-label="המקטע הבא"
      >
        הבא ›
      </button>
    </nav>
  );
}
