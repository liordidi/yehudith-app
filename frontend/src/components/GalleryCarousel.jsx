// GalleryCarousel.jsx
// Section 2 (גלרייה) — side-by-side carousel inspired by the Webflow
// "Intermediate Slider Workout" pen. Each slide pairs one photo/video with
// a per-photo comment panel: scrollable list of approved comments above,
// "submit a new comment" form below. Comments arrive as 'pending' and are
// hidden until an admin approves them via AdminPanel.
//
// Visual notes:
//  - Slide width < viewport so the next/previous slides "peek" on the edges.
//  - Inactive (non-selected) slides are dimmed via opacity.
//  - Navigation arrows + dots live in a single bar at the bottom-left,
//    matching the Webflow example.
//  - The "overlay" radial-gradient + noise from the original is intentionally
//    omitted per spec.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Lenis from 'lenis';
import { useComments } from '../hooks/useComments';
import { useEmblaParallax } from '../hooks/useEmblaParallax';
import { useSectionRouter, SECTION_NAMES } from '../sectionRouter';
import { SectionNav } from './SectionShell';
import { EmblaProgress } from './EmblaProgress';
import './GalleryCarousel.css';

export function GalleryCarousel({ items }) {
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
    // Open at the LAST slide. With trimSnaps + align 'center', the last
    // slide gets pinned to the (RTL-)end edge, with the previous slides
    // filling the visible viewport — no empty space.
    startIndex: Math.max(0, items.length - 1),
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

  // Section-router hooks — the gallery section's SectionShell is rendered with
  // showNav={false}, and we render the SectionNav inside gc-controls instead.
  const { prev, next, home, currentIndex, total } = useSectionRouter();
  const isLastSection = currentIndex === total - 1;

  // View mode: 'carousel' (Embla) or 'grid' (3-col grid). Both views stay in
  // the DOM and crossfade via the .is-active class so Embla never gets
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
    const content = wrapper.querySelector('.gc-grid');
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

  // When the user navigates away from the gallery section (via the section
  // nav / keyboard / hero button), wait for the inter-section transition to
  // finish and then *smoothly* scroll the grid back to top via Lenis. The
  // setTimeout buys us ~1.1s — slightly longer than the page-level
  // section transition (1.0s in sectionRouter) — so the reset happens out
  // of sight. If the user navigates back before the timeout fires, the
  // cleanup cancels it and their scroll position is preserved.
  const ownSectionIndex = SECTION_NAMES.indexOf('gallery');
  useEffect(() => {
    if (currentIndex === ownSectionIndex) return;
    const t = window.setTimeout(() => {
      lenisRef.current?.scrollTo(0);  // smooth Lenis scroll, no immediate flag
    }, 1100);
    return () => window.clearTimeout(t);
  }, [currentIndex, ownSectionIndex]);

  // (gridProgress / .gc-progress-track removed — replaced by EmblaProgress
  // bound to emblaApi.scrollProgress(), rendered alongside the pager.)

  const openSlideInCarousel = (i) => {
    emblaApi?.scrollTo(i, true); // jump instantly while still hidden
    setViewMode('carousel');
  };

  return (
    <div className="gc-root" dir="rtl">
      <div className="gc-views">
        {/* ── Carousel view ──────────────────────────────────────────── */}
        <div className={`gc-view gc-view--carousel${viewMode === 'carousel' ? ' is-active' : ''}`}>
          <div className="gc-viewport" ref={emblaRef}>
            <div className="gc-container">
              {items.map((item, i) => (
                <div
                  className={`gc-slide${i === selectedIndex ? ' is-selected' : ''}`}
                  key={item.id}
                >
                  <GallerySlide item={item} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Grid view ──────────────────────────────────────────────── */}
        <div className={`gc-view gc-view--grid${viewMode === 'grid' ? ' is-active' : ''}`}>
          {/* Lenis-driven smooth scroll: wrapper has overflow:hidden, Lenis
              translates the inner .gc-grid (the "content"). */}
          <div className="gc-grid-wrapper" ref={gridWrapperRef} data-allow-scroll>
            <div className="gc-grid">
              {items.map((item, i) => (
                <button
                  key={item.id}
                  type="button"
                  className="gc-grid-item"
                  onClick={() => openSlideInCarousel(i)}
                  aria-label={`פתח תמונה ${i + 1}`}
                >
                  <img
                    className="gc-grid-img"
                    src={item.type === 'video' ? (item.posterSrc || item.src) : item.src}
                    alt={item.filename || ''}
                    draggable={false}
                  />
                  {item.type === 'video' && (
                    <span className="gc-grid-play" aria-hidden="true">▶</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="gc-controls">
        <div className="gc-controls-holder">
          {/* View-mode toggle (always visible) */}
          <div className="gc-view-toggle" role="group" aria-label="תצוגה">
            <button
              type="button"
              className={`gc-view-btn${viewMode === 'carousel' ? ' is-active' : ''}`}
              onClick={() => setViewMode('carousel')}
              aria-pressed={viewMode === 'carousel'}
              aria-label="תצוגת קרוסלה"
              title="קרוסלה"
            >
              <CarouselIcon />
            </button>
            <button
              type="button"
              className={`gc-view-btn${viewMode === 'grid' ? ' is-active' : ''}`}
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
              <div className="gc-pager">
                <button
                  type="button"
                  className="gc-arrow"
                  onClick={scrollPrev}
                  disabled={!canPrev}
                  aria-label="הקודם"
                >
                  <Chevron dir="prev" />
                </button>
                <span
                  className="gc-counter"
                  dir="ltr"
                  aria-live="polite"
                  aria-label={`${selectedIndex + 1} מתוך ${items.length}`}
                >
                  {selectedIndex + 1} / {items.length}
                </span>
                <button
                  type="button"
                  className="gc-arrow"
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
        <div className="section-nav-holder">
          <SectionNav
            onPrev={prev}
            onHome={home}
            onNext={next}
            isLast={isLastSection}
          />
        </div>
      </div>
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

// ── One slide: image base layer + comments overlay that slides in/out ───────
// The image is always the base layer. The comments block slides in from the
// LEFT when shown and slides out to the RIGHT when closed. Per-slide state
// so each photo remembers whether you were looking at it or its comments.
//
// `isLeaving` exists for one animation frame so the comments face can play
// the slide-out keyframe before being unmounted from the visible state.
function GallerySlide({ item }) {
  const [showComments, setShowComments] = useState(false);
  const [isLeaving,    setIsLeaving]    = useState(false);

  const SLIDE_MS = 500;

  const handleToggle = () => {
    if (isLeaving) return; // ignore mid-animation clicks
    if (showComments) {
      setIsLeaving(true);
      window.setTimeout(() => {
        setShowComments(false);
        setIsLeaving(false);
      }, SLIDE_MS);
    } else {
      setShowComments(true);
    }
  };

  // back-face state: nothing | is-visible (slide in) | is-leaving (slide out)
  const backStateClass = !showComments
    ? ''
    : isLeaving
      ? ' is-leaving'
      : ' is-visible';

  const commentsActive = showComments && !isLeaving;

  return (
    <div className="gc-card">
      {/* Front face: media (always rendered, sits underneath the comments) */}
      <div className="gc-face gc-face--front">
        {item.type === 'video' ? (
          <video
            data-parallax
            className="gc-media-el"
            src={item.src}
            poster={item.posterSrc || undefined}
            controls
            playsInline
            preload="metadata"
          />
        ) : (
          <img
            data-parallax
            className="gc-media-el"
            src={item.src}
            alt={item.filename || ''}
            draggable={false}
          />
        )}
      </div>

      {/* Back face: comments overlay */}
      <div
        className={`gc-face gc-face--back${backStateClass}`}
        aria-hidden={!commentsActive}
      >
        <CommentPanel mediaId={item.id} />
      </div>

      {/* Toggle button — pinned to the slide's top edge */}
      <button
        type="button"
        className="gc-flip-btn"
        onClick={handleToggle}
        aria-pressed={commentsActive}
      >
        {commentsActive ? '↺ חזרה לתמונה' : '💬 הצג תגובות'}
      </button>
    </div>
  );
}

// ── Comment panel: title, scrollable approved list, submission form ──────────
function CommentPanel({ mediaId }) {
  const { comments, addComment, loading } = useComments(mediaId);
  const [name, setName]             = useState('');
  const [text, setText]             = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback,   setFeedback]   = useState('');
  const [error,      setError]      = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !text.trim()) {
      setError('שם ותגובה הם שדות חובה');
      return;
    }
    setSubmitting(true);
    setError('');
    setFeedback('');
    try {
      await addComment(name, text);
      setFeedback('תודה! התגובה תוצג לאחר אישור');
      setName('');
      setText('');
    } catch (err) {
      setError(err.message || 'שגיאה בשליחה');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="gc-comments">
      <div className="gc-comments-header">
        <h3 className="gc-comments-title">תגובות</h3>
        {!loading && (
          <span className="gc-comments-count">{comments.length}</span>
        )}
      </div>

      {/* Scrollable approved-comments list. data-allow-scroll exempts this
          element from sectionRouter's global wheel/touchmove blocker. */}
      <div className="gc-comments-list" data-allow-scroll>
        {loading && <div className="gc-comments-status">טוען תגובות…</div>}
        {!loading && comments.length === 0 && (
          <div className="gc-comments-empty">היו הראשונים להגיב</div>
        )}
        {!loading && comments.map((c) => (
          <div className="gc-comment" key={c.id}>
            <div className="gc-comment-name">{c.name}</div>
            <div className="gc-comment-text">{c.text}</div>
          </div>
        ))}
      </div>

      <form className="gc-comment-form" onSubmit={handleSubmit}>
        <input
          className="gc-input"
          type="text"
          placeholder="השם שלך"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          required
        />
        <textarea
          className="gc-textarea"
          placeholder="כתבו תגובה…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          maxLength={500}
          required
        />
        {error    && <div className="gc-form-error">{error}</div>}
        {feedback && <div className="gc-form-ok">{feedback}</div>}
        <button
          type="submit"
          className="gc-submit"
          disabled={submitting}
        >
          {submitting ? 'שולח…' : 'שלחו תגובה'}
        </button>
      </form>
    </div>
  );
}
