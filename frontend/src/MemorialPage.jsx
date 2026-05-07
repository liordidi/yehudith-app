// MemorialPage.jsx
// Layout dispatcher. Receives all data/state as props from App.jsx.
// Renders MobileLayout or DesktopLayout — never both simultaneously.
// SectionRouterProvider wraps both so the active layout's SectionShells share
// one Lenis instance and one currentIndex across viewport changes.

import React from 'react';
import { useIsDesktop } from './hooks/useIsDesktop';
import { MobileLayout } from './layouts/MobileLayout';
import { DesktopLayout } from './layouts/DesktopLayout';
import { SectionRouterProvider } from './sectionRouter';

export function MemorialPage(props) {
  const isDesktop = useIsDesktop();
  return (
    <SectionRouterProvider>
      {isDesktop
        ? <DesktopLayout {...props} />
        : <MobileLayout  {...props} />}
    </SectionRouterProvider>
  );
}
