// sectionRouter.jsx
// Page-level section navigation backed by Lenis smooth-scroll.
// Mouse wheel + touch are disabled at the page level — sections are reached
// only via the buttons (HeroSection nav bar + per-section SectionNav) or via
// keyboard arrows / PageUp / PageDown / Home / End.

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import Lenis from 'lenis';

export const SECTION_NAMES = ['hero', 'gallery', 'memories', 'songs', 'remembrance'];

// Legacy DOM ids used by HeroSection's existing CTA buttons.
const SECTION_ALIASES = {
  'memories-section': 'memories',
  'songs-section':    'songs',
  'candle-section':   'remembrance',
};

const SectionRouterContext = createContext(null);

export function SectionRouterProvider({ children }) {
  const lenisRef         = useRef(null);
  const sectionsRef      = useRef(new Map());
  const currentIndexRef  = useRef(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const total = SECTION_NAMES.length;

  // ── Lenis bootstrap ────────────────────────────────────────────────────────
  useEffect(() => {
    const lenis = new Lenis({
      smooth:           true,
      lerp:             0.1,
      wheelMultiplier:  0, // belt + suspenders alongside the explicit blocker
      touchMultiplier:  0,
      smoothTouch:      false,
    });
    lenisRef.current = lenis;

    let frame;
    function raf(time) {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    }
    frame = requestAnimationFrame(raf);

    // Hard block: wheel + touch must not move the page at all.
    // Lenis's multiplier=0 isn't sufficient on its own — the browser still
    // performs native scroll on uncaptured wheel events. preventDefault on
    // a non-passive listener kills it. Programmatic lenis.scrollTo() is
    // unaffected because it sets scrollTop directly, not via wheel events.
    //
    // Exception: any element marked with [data-allow-scroll] (or a descendant
    // of one) keeps its native scroll behavior. Used by the gallery comment
    // list and the gallery grid view, which have their own internal Y scroll.
    // Those scroll containers also need `overscroll-behavior: contain` (set
    // in CSS) so the wheel doesn't chain back to the document at the edges.
    const blockScroll = (e) => {
      if (e.target?.closest?.('[data-allow-scroll]')) return;
      e.preventDefault();
    };
    window.addEventListener('wheel',     blockScroll, { passive: false });
    window.addEventListener('touchmove', blockScroll, { passive: false });

    // Block middle-click autoscroll mode (Windows). Without this, a middle
    // click anywhere on the page enters the OS auto-scroll cursor and
    // freely scrolls the document past section boundaries.
    const blockMiddleClick = (e) => {
      if (e.button === 1) e.preventDefault();
    };
    window.addEventListener('mousedown', blockMiddleClick);

    // Drag-selection autoscroll: when a user click-drags a text selection
    // beyond the viewport edge, the browser auto-scrolls. Easiest reliable
    // fix is to disable the selection itself (CSS in index.css does that
    // globally and re-enables it on form fields).
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('wheel',       blockScroll);
      window.removeEventListener('touchmove',   blockScroll);
      window.removeEventListener('mousedown',   blockMiddleClick);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  const registerSection = useCallback((name, el) => {
    if (el) sectionsRef.current.set(name, el);
    else    sectionsRef.current.delete(name);
  }, []);

  const goToSection = useCallback((target) => {
    const name = typeof target === 'number'
      ? SECTION_NAMES[target]
      : (SECTION_ALIASES[target] || target);
    const idx = SECTION_NAMES.indexOf(name);
    if (idx < 0) return;
    const el = sectionsRef.current.get(name);
    if (!el || !lenisRef.current) return;
    lenisRef.current.scrollTo(el, { duration: 1.0 });
    currentIndexRef.current = idx;
    setCurrentIndex(idx);
  }, []);

  const next = useCallback(() => {
    const i = currentIndexRef.current;
    if (i < total - 1) goToSection(i + 1);
  }, [goToSection, total]);

  const prev = useCallback(() => {
    const i = currentIndexRef.current;
    if (i > 0) goToSection(i - 1);
  }, [goToSection]);

  const home = useCallback(() => goToSection(0), [goToSection]);

  // ── Keyboard navigation ────────────────────────────────────────────────────
  useEffect(() => {
    function isEditable(el) {
      if (!el) return false;
      const tag = el.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
    }
    function handleKey(e) {
      if (isEditable(e.target)) return;
      switch (e.key) {
        case 'ArrowDown':
        case 'PageDown':
          e.preventDefault(); next(); break;
        case 'ArrowUp':
        case 'PageUp':
          e.preventDefault(); prev(); break;
        case 'Home':
          e.preventDefault(); home(); break;
        case 'End':
          e.preventDefault(); goToSection(total - 1); break;
        case ' ':
          // Spacebar (and Shift+Space) scrolls the page by default; block it
          // so it doesn't bypass the section router. We don't navigate on
          // space — arrows / PageUp / PageDown are the keyboard nav.
          e.preventDefault();
          break;
        default:
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [next, prev, home, goToSection, total]);

  const value = {
    registerSection,
    goToSection,
    next,
    prev,
    home,
    currentIndex,
    total,
  };

  return (
    <SectionRouterContext.Provider value={value}>
      {children}
    </SectionRouterContext.Provider>
  );
}

export function useSectionRouter() {
  const ctx = useContext(SectionRouterContext);
  if (!ctx) throw new Error('useSectionRouter must be used inside SectionRouterProvider');
  return ctx;
}
