// DesktopLayout.jsx
// Desktop-specific page layout. Safe to evolve independently of MobileLayout.
// All section components are shared — do not duplicate their internal logic here.
// Start conservatively: same structure as mobile, desktop CSS handles visual differences.

import React from 'react';
import { memorialData } from '../memorialData';
import { HeroSection } from '../components/HeroSection';
import { GallerySection } from '../components/GallerySection';
import { MemoriesSection } from '../components/MemoriesSection';
import { SongsSection } from '../components/SongsSection';
import { SubmitMemoryForm } from '../components/SubmitMemoryForm';
import { CandleSection } from '../components/CandleSection';
import { Footer } from '../components/Footer';

export function DesktopLayout({
  shareFormOpen,
  onOpenShareForm,
  onShareFormChange,
  serverMemories,
  memoriesFetchError,
  showAdmin,
  adminKey,
}) {
  return (
    <div className="memorial-page desktop-page" dir="rtl">
      <HeroSection
        person={memorialData.person}
        hero={memorialData.hero}
        onOpenShareForm={onOpenShareForm}
      />
      <GallerySection
        gallery={memorialData.gallery}
        showAdmin={showAdmin}
        adminKey={adminKey}
      />
      <div id="memories-section">
        <MemoriesSection
          memories={{ title: memorialData.memories.title, items: serverMemories }}
          fetchError={memoriesFetchError}
        />
        <SubmitMemoryForm open={shareFormOpen} onOpenChange={onShareFormChange} />
      </div>
      <div id="songs-section">
        <SongsSection songs={memorialData.songs} />
      </div>
      <CandleSection candle={memorialData.candle} />
      <Footer footer={memorialData.footer} />
    </div>
  );
}
