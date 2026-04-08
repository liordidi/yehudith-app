// MobileLayout.jsx
// Verbatim extraction of the current App.jsx page layout.
// This is the source of truth for the mobile experience.
// Do not change this file when working on desktop improvements.

import React from 'react';
import { memorialData } from '../memorialData';
import { HeroSection } from '../components/HeroSection';
import { GallerySection } from '../components/GallerySection';
import { MemoriesSection } from '../components/MemoriesSection';
import { SongsSection } from '../components/SongsSection';
import { SubmitMemoryForm } from '../components/SubmitMemoryForm';
import { CandleSection } from '../components/CandleSection';
import { Footer } from '../components/Footer';

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
