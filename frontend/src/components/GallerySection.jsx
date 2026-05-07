// GallerySection.jsx
// Section 2 of the memorial — side-by-side carousel: photo on the right,
// per-photo comments on the left. Comments are persisted via the existing
// image_comments table (Supabase) and require admin approval before showing.

import React from 'react';
import { galleryItems } from '../galleryAssets';
import { GalleryCarousel } from './GalleryCarousel';

// `gallery`, `showAdmin`, `adminKey` are accepted for layout-prop parity but
// unused here — gallery title is omitted in the immersive view, and admin
// editing is not yet ported to the carousel.
export function GallerySection() {
  return (
    <div className="gallery-section-immersive">
      <GalleryCarousel items={galleryItems} />
    </div>
  );
}
