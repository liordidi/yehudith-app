// useIsDesktop.js
// Returns true when the viewport is at or above the desktop breakpoint.
// Matches the @media (min-width: 1024px) guard in App.css (.desktop-page block).
// Updates on window resize via matchMedia change event.

import { useState, useEffect } from 'react';

const BREAKPOINT = 1024;

export function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(
    () => window.matchMedia(`(min-width: ${BREAKPOINT}px)`).matches
  );

  useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${BREAKPOINT}px)`);
    const handler = (e) => setIsDesktop(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return isDesktop;
}
