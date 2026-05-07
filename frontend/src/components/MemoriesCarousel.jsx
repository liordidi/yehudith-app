// MemoriesCarousel.jsx
// Section 3 (זיכרונות) — same carousel design as the gallery (section 2),
// but each slide is a memory: image on the front, the memory's text on the
// back. The back slides in from the LEFT and out to the RIGHT, identical to
// the gallery's image/comments transition.
//
// Differences from GalleryCarousel:
//  - No grid view / no view-mode toggle.
//  - Per-slide back face is the memory text (name + optional title + body),
//    not a comment list with a form.
//  - SubmitMemoryForm is no longer rendered here.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Lenis from 'lenis';
import { useEmblaParallax } from '../hooks/useEmblaParallax';
import { useSectionRouter, SECTION_NAMES } from '../sectionRouter';
import { SectionNav } from './SectionShell';
import { EmblaProgress } from './EmblaProgress';
import { SubmitMemoryForm } from './SubmitMemoryForm';
import './MemoriesCarousel.css';

export function MemoriesCarousel({ memories, fetchError }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    direction: 'rtl',
    loop: false,
    align: 'center',
    skipSnaps: false,
    // 'trimSnaps' clamps the carousel within its natural bounds: middle
    // slides are still centered, but the first and last slides are pinned
    // to their respective edges (no empty space on either side).
    containScroll: 'trimSnaps',
    // dragFree gives the elastic "afterscroll" feel from the reference
    // (slides drift on momentum after release instead of snapping
    // immediately). The pager still tracks the closest snap.
    dragFree: true,
    duration: 35,
  });

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const onSelect = useCallback((api) => {
    setSelectedIndex(api.selectedScrollSnap());
    setCanPrev(api.canScrollPrev());
    setCanNext(api.canScrollNext());
  }, []);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect(emblaApi);
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('reInit', onSelect);
    };
  }, [emblaApi, onSelect]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const scrollTo   = useCallback((i) => emblaApi?.scrollTo(i),  [emblaApi]);

  // Parallax: translates the [data-parallax] element inside each slide based
  // on its distance from the carousel center. CSS owns the static scale.
  useEmblaParallax(emblaApi);

  // Floating "share a memory" button → modal. The button lives in the bottom
  // controls bar; the modal renders the existing SubmitMemoryForm.
  const [shareFormOpen, setShareFormOpen] = useState(false);

  // Open at the LAST memory once the data has loaded. Memories arrive async
  // from Supabase, so Embla's static `startIndex` option can't be set
  // upfront — we jump once via scrollTo. Guarded by a ref so a later refetch
  // (or admin add) doesn't keep snapping the user back.
  const hasJumpedToStartRef = useRef(false);
  useEffect(() => {
    if (!emblaApi || hasJumpedToStartRef.current) return;
    if (!memories || memories.length === 0) return;
    emblaApi.scrollTo(Math.max(0, memories.length - 1), true); // jump, no animation
    hasJumpedToStartRef.current = true;
  }, [emblaApi, memories]);

  // Section-router hooks — the memories SectionShell is rendered with
  // showNav={false}, and we render the SectionNav inside mc-controls instead.
  const { prev, next, home, currentIndex, total } = useSectionRouter();
  const isLastSection = currentIndex === total - 1;

  // View mode: 'carousel' (Embla) or 'grid' (4-col grid). Both views stay
  // in the DOM and crossfade via the .is-active class so Embla never gets
  // re-mounted (state preserved across toggles).
  const [viewMode, setViewMode] = useState('carousel');

  // Scoped Lenis for the grid view — gives the grid the same smooth-scroll
  // feel as the page-level Lenis. Created only while grid view is active so
  // it doesn't intercept events meant for the carousel.
  const gridWrapperRef = useRef(null);
  const lenisRef       = useRef(null);

  useEffect(() => {
    if (viewMode !== 'grid' || !gridWrapperRef.current) return;

    const wrapper = gridWrapperRef.current;
    const content = wrapper.querySelector('.mc-grid');
    if (!content) return;

    const lenis = new Lenis({
      wrapper,
      content,
      smoothWheel: true,
      syncTouch:   false,
      lerp:        0.1,
    });
    lenisRef.current = lenis;

    let frame;
    const raf = (t) => {
      lenis.raf(t);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [viewMode]);

  // When the user navigates away from the memories section (via the section
  // nav / keyboard / hero button), wait for the inter-section transition to
  // finish and then *smoothly* scroll the grid back to top via Lenis. The
  // setTimeout buys us ~1.1s — slightly longer than the page-level
  // section transition (1.0s in sectionRouter) — so the reset happens out
  // of sight. If the user navigates back before the timeout fires, the
  // cleanup cancels it and their scroll position is preserved.
  const ownSectionIndex = SECTION_NAMES.indexOf('memories');
  useEffect(() => {
    if (currentIndex === ownSectionIndex) return;
    const t = window.setTimeout(() => {
      lenisRef.current?.scrollTo(0);  // smooth Lenis scroll, no immediate flag
    }, 1100);
    return () => window.clearTimeout(t);
  }, [currentIndex, ownSectionIndex]);

  const openSlideInCarousel = (i) => {
    emblaApi?.scrollTo(i, true);   // jump instantly while still hidden
    setViewMode('carousel');
  };

  // ── Empty / error states ────────────────────────────────────────────────
  if (fetchError) {
    return (
      <EmptyShell message={fetchError}
                  prev={prev} home={home} next={next} isLast={isLastSection} />
    );
  }
  if (!memories || memories.length === 0) {
    return (
      <EmptyShell message="היו הראשונים לשתף זיכרון"
                  prev={prev} home={home} next={next} isLast={isLastSection} />
    );
  }

  return (
    <div className="mc-root" dir="rtl">
      <div className="mc-views">
        {/* ── Carousel view ──────────────────────────────────────────── */}
        <div className={`mc-view mc-view--carousel${viewMode === 'carousel' ? ' is-active' : ''}`}>
          <div className="mc-viewport" ref={emblaRef}>
            <div className="mc-container">
              {memories.map((mem, i) => (
                <div
                  className={`mc-slide${i === selectedIndex ? ' is-selected' : ''}`}
                  key={mem.id}
                >
                  <MemorySlide memory={mem} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Grid view ──────────────────────────────────────────────── */}
        <div className={`mc-view mc-view--grid${viewMode === 'grid' ? ' is-active' : ''}`}>
          {/* Lenis-driven smooth scroll: wrapper has overflow:hidden, Lenis
              translates the inner .mc-grid (the "content"). */}
          <div className="mc-grid-wrapper" ref={gridWrapperRef} data-allow-scroll>
            <div className="mc-grid">
              {memories.map((mem, i) => (
                <button
                  key={mem.id}
                  type="button"
                  className="mc-grid-item"
                  onClick={() => openSlideInCarousel(i)}
                  aria-label={`פתח זיכרון ${i + 1}`}
                >
                  {mem.image_url ? (
                    <img
                      className="mc-grid-img"
                      src={mem.image_url}
                      alt={mem.name || ''}
                      draggable={false}
                    />
                  ) : (
                    <div className="mc-grid-fallback">
                      <span className="mc-grid-fallback-name">{mem.name}</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mc-controls">
        <div className="mc-controls-holder">
          {/* View-mode toggle (always visible) */}
          <div className="mc-view-toggle" role="group" aria-label="תצוגה">
            <button
              type="button"
              className={`mc-view-btn${viewMode === 'carousel' ? ' is-active' : ''}`}
              onClick={() => setViewMode('carousel')}
              aria-pressed={viewMode === 'carousel'}
              aria-label="תצוגת קרוסלה"
              title="קרוסלה"
            >
              <CarouselIcon />
            </button>
            <button
              type="button"
              className={`mc-view-btn${viewMode === 'grid' ? ' is-active' : ''}`}
              onClick={() => setViewMode('grid')}
              aria-pressed={viewMode === 'grid'}
              aria-label="תצוגת רשת"
              title="רשת"
            >
              <GridIcon />
            </button>
          </div>

          {/* Carousel-only pager: prev arrow · "n / total" · next arrow,
              followed by the continuous Embla progress bar. */}
          {viewMode === 'carousel' && (
            <>
              <div className="mc-pager">
                <button
                  type="button"
                  className="mc-arrow"
                  onClick={scrollPrev}
                  disabled={!canPrev}
                  aria-label="הקודם"
                >
                  <Chevron dir="prev" />
                </button>
                <span
                  className="mc-counter"
                  dir="ltr"
                  aria-live="polite"
                  aria-label={`${selectedIndex + 1} מתוך ${memories.length}`}
                >
                  {selectedIndex + 1} / {memories.length}
                </span>
                <button
                  type="button"
                  className="mc-arrow"
                  onClick={scrollNext}
                  disabled={!canNext}
                  aria-label="הבא"
                >
                  <Chevron dir="next" />
                </button>
              </div>
              <EmblaProgress emblaApi={emblaApi} />
            </>
          )}
        </div>
        <div className="section-newmenory-holder">
          <button
            type="button"
            className="mc-share-btn"
            onClick={() => setShareFormOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={shareFormOpen}
          >
            <span aria-hidden="true">＋</span> שתפו זיכרון
          </button>
        </div>
        <div className="section-nav-holder">
          <SectionNav
            onPrev={prev}
            onHome={home}
            onNext={next}
            isLast={isLastSection}
          />
        </div>
      </div>

      {/* Share-memory modal — fixed overlay over the whole viewport. The
          existing SubmitMemoryForm is rendered in controlled mode so the
          modal close button + backdrop click + the form's own toggle all
          drive the same `shareFormOpen` state. */}
      {shareFormOpen && (
        <div
          className="mc-share-modal-backdrop"
          onClick={() => setShareFormOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="שיתוף זיכרון חדש"
        >
          <div
            className="mc-share-modal"
            onClick={(e) => e.stopPropagation()}
            data-allow-scroll
          >
            <button
              type="button"
              className="mc-share-modal-close"
              onClick={() => setShareFormOpen(false)}
              aria-label="סגירה"
            >
              ✕
            </button>
            <SubmitMemoryForm
              open={shareFormOpen}
              onOpenChange={setShareFormOpen}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function CarouselIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="6" y="6" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="2" />
      <path d="M3 9v6M21 9v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4"  y="4"  width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
      <rect x="13" y="4"  width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
      <rect x="4"  y="13" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
      <rect x="13" y="13" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

// Empty/error variant — shows a message and the section nav (so the user
// can still leave the section).
function EmptyShell({ message, prev, home, next, isLast }) {
  return (
    <div className="mc-root mc-root--empty" dir="rtl">
      <div className="mc-empty-state">{message}</div>
      <div className="mc-controls">
        <div className="section-nav-holder">
          <SectionNav onPrev={prev} onHome={home} onNext={next} isLast={isLast} />
        </div>
      </div>
    </div>
  );
}

// In RTL: "prev" visually points right (›), "next" visually points left (‹).
function Chevron({ dir }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d={dir === 'prev' ? 'M9 6l6 6-6 6' : 'M15 6l-6 6 6 6'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── One slide: image base layer + text overlay that slides in/out ────────────
function MemorySlide({ memory }) {
  const [showText,  setShowText]  = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  const SLIDE_MS = 500;

  const handleToggle = () => {
    if (isLeaving) return;
    if (showText) {
      setIsLeaving(true);
      window.setTimeout(() => {
        setShowText(false);
        setIsLeaving(false);
      }, SLIDE_MS);
    } else {
      setShowText(true);
    }
  };

  const backStateClass = !showText
    ? ''
    : isLeaving
      ? ' is-leaving'
      : ' is-visible';

  const textActive = showText && !isLeaving;
  const hasImage   = !!memory.image_url;

  return (
    <div className="mc-card">
      {/* Front face: image (or text-only fallback when no image) */}
      <div className="mc-face mc-face--front">
        {hasImage ? (
          <img
            data-parallax
            className="mc-media-el"
            src={memory.image_url}
            alt={memory.name || ''}
            draggable={false}
          />
        ) : (
          <div data-parallax className="mc-no-image">
            <div className="mc-no-image-name">{memory.name}</div>
          </div>
        )}
      </div>

      {/* Back face: memory text (slides in from left, out to right) */}
      <div
        className={`mc-face mc-face--back${backStateClass}`}
        aria-hidden={!textActive}
      >
        <div className="mc-text-content" data-allow-scroll>
          <div className="mc-text-name">{memory.name}</div>
          {memory.title && <h3 className="mc-text-title">{memory.title}</h3>}
          <p className="mc-text-body">{memory.text}</p>
        </div>
      </div>

      {/* Toggle button — pinned to the slide's top edge */}
      <button
        type="button"
        className="mc-flip-btn"
        onClick={handleToggle}
        aria-pressed={textActive}
      >
        {textActive ? '↺ חזרה לתמונה' : '📖 קרא עוד'}
      </button>
    </div>
  );
}
