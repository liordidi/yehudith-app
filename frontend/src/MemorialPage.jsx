// MemorialPage.jsx
// Layout dispatcher. Receives all data/state as props from App.jsx.
// Renders MobileLayout or DesktopLayout — never both simultaneously.
// Subscription-bearing components (GallerySection, CandleSection, MediaModal
// inside GallerySection) are shared and mount only once inside whichever
// layout is active.

import React from 'react';
import { useIsDesktop } from './hooks/useIsDesktop';
import { MobileLayout } from './layouts/MobileLayout';
import { DesktopLayout } from './layouts/DesktopLayout';

export function MemorialPage(props) {
  const isDesktop = useIsDesktop();
  return isDesktop
    ? <DesktopLayout {...props} />
    : <MobileLayout  {...props} />;
}
