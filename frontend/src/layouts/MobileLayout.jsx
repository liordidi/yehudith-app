// MobileLayout.jsx
// Section-per-viewport layout. Each section is wrapped in <SectionShell> so it
// occupies one full screen and gets the per-section nav bar (sections 2–5).
// Footer is folded into the last section so the page ends exactly at section 5.

import React from 'react';
import { memorialData } from '../memorialData';
import { HeroSection } from '../components/HeroSection';
import { GallerySection } from '../components/GallerySection';
import { MemoriesCarousel } from '../components/MemoriesCarousel';
import { SongsSection } from '../components/SongsSection';
import { RemembranceSection } from '../components/RemembranceSection';
import { Footer } from '../components/Footer';
import { SectionShell } from '../components/SectionShell';

export function MobileLayout({
  shareFormOpen,
  onOpenShareForm,
  onShareFormChange,
  serverMemories,
  memoriesFetchError,
  showAdmin,
  adminKey,
}) {
  return (
    <div className="memorial-page" dir="rtl">
      <SectionShell sectionId="hero">
        <HeroSection
          person={memorialData.person}
          hero={memorialData.hero}
          onOpenShareForm={onOpenShareForm}
        />
      </SectionShell>

      <SectionShell sectionId="gallery" showNav={false}>
        <GallerySection
          gallery={memorialData.gallery}
          showAdmin={showAdmin}
          adminKey={adminKey}
        />
      </SectionShell>

      <SectionShell sectionId="memories" showNav={false}>
        <div className="memories-section-immersive">
          <MemoriesCarousel
            memories={serverMemories}
            fetchError={memoriesFetchError}
          />
        </div>
      </SectionShell>

      <SectionShell sectionId="songs">
        <div id="songs-section">
          <SongsSection songs={memorialData.songs} />
        </div>
      </SectionShell>

      <SectionShell sectionId="remembrance">
        <div id="candle-section">
          <RemembranceSection remembrance={memorialData.remembrance} />
        </div>
        <Footer footer={memorialData.footer} />
      </SectionShell>
    </div>
  );
}
