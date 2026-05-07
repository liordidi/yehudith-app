// useEmblaParallax.js
// Applies a parallax translate to a marked element inside each Embla slide
// (default: any element with `data-parallax`). Translation is computed from
// each slide's distance to the carousel's center using Embla's continuous
// `scrollProgress()`, so it animates with drag, button-press, and wheel.
//
// The translate is exposed as a CSS custom property `--parallax-x`. The slide
// CSS owns the static part of the transform (e.g. `scale(1.25)`) and combines
// with this variable, so the JS layer only handles the moving piece:
//
//   .my-img { transform: scale(1.25) translate3d(var(--parallax-x, 0), 0, 0); }
//
// TWEEN_FACTOR ↔ image-scale relationship:
//   max |translate| ≈ TWEEN_FACTOR * 100% of element width
//   To avoid revealing edges, image scale must satisfy:
//     scale ≥ 1 / (1 − 2 * TWEEN_FACTOR)
//   With TWEEN_FACTOR = 0.10, scale ≥ 1.25. The CSS uses scale(1.25–1.30)
//   for a small safety margin.

import { useEffect } from 'react';

// Stronger parallax — clearly visible, not just a subtle nudge.
// Pair with `transform: scale(1.60)` in the CSS so the edge never reveals.
//   constraint: scale ≥ 1 / (1 − 2 * TWEEN_FACTOR)
//   for 0.18: scale ≥ ~1.56 → using 1.60 with margin
const TWEEN_FACTOR = 0.18;

export function useEmblaParallax(emblaApi, selector = '[data-parallax]') {
  useEffect(() => {
    if (!emblaApi) return;

    const apply = (eventName) => {
      const engine         = emblaApi.internalEngine();
      const scrollProgress = emblaApi.scrollProgress();
      const slidesInView   = emblaApi.slidesInView();
      const isScrollEvent  = eventName === 'scroll';

      emblaApi.scrollSnapList().forEach((scrollSnap, snapIndex) => {
        const diffToTarget = scrollSnap - scrollProgress;
        const slidesInSnap = engine.slideRegistry[snapIndex] || [];

        slidesInSnap.forEach((slideIndex) => {
          if (isScrollEvent && !slidesInView.includes(slideIndex)) return;

          const slideNode = emblaApi.slideNodes()[slideIndex];
          const target    = slideNode?.querySelector(selector);
          if (!target) return;

          const translatePercent = diffToTarget * -1 * TWEEN_FACTOR * 100;
          target.style.setProperty('--parallax-x', `${translatePercent}%`);
        });
      });
    };

    const onInit       = () => apply('init');
    const onReInit     = () => apply('reInit');
    const onScroll     = () => apply('scroll');
    const onSlideFocus = () => apply('slideFocus');

    onInit();
    emblaApi.on('reInit',     onReInit);
    emblaApi.on('scroll',     onScroll);
    emblaApi.on('slideFocus', onSlideFocus);

    return () => {
      emblaApi.off('reInit',     onReInit);
      emblaApi.off('scroll',     onScroll);
      emblaApi.off('slideFocus', onSlideFocus);
    };
  }, [emblaApi, selector]);
}
