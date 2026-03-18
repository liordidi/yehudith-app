import React, { useState, useRef, useEffect } from 'react';
import { galleryItems } from '../galleryAssets';
import { VideoThumbnail } from './VideoThumbnail';
import { MediaModal } from './MediaModal';
import { useComments } from '../hooks/useComments';

function GalleryMedia({ item }) {
  if (item.type === 'video') {
    return <VideoThumbnail src={item.src} className="gallery-img" />;
  }
  return (
    <img
      className="gallery-img"
      src={item.src}
      alt={item.filename}
    />
  );
}

export function GallerySection({ gallery }) {
  const [activeItem,  setActiveItem]  = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const trackRef  = useRef(null);
  const commentsHook = useComments();

  // Keep activeIndex in sync with whichever slide is most visible
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const slides = Array.from(track.querySelectorAll('.gallery-slide'));
    const observers = slides.map((slide, i) => {
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveIndex(i); },
        { root: track, threshold: 0.5 }
      );
      obs.observe(slide);
      return obs;
    });

    return () => observers.forEach(obs => obs.disconnect());
  }, []);

  const scrollToIndex = (i) => {
    const track = trackRef.current;
    if (!track) return;
    const slide = track.querySelectorAll('.gallery-slide')[i];
    if (slide) slide.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  };

  return (
    <section className="gallery-section" dir="rtl">
      <h2>{gallery.title}</h2>

      <div className="gallery-slider" ref={trackRef}>
        {galleryItems.map(item => (
          <div
            className="gallery-slide"
            key={item.id}
            onClick={() => setActiveItem(item)}
            role="button"
            tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && setActiveItem(item)}
          >
            <GalleryMedia item={item} />
          </div>
        ))}
      </div>

      {galleryItems.length > 1 && (
        <div className="gallery-dots" aria-hidden="true">
          {galleryItems.map((_, i) => (
            <span
              key={i}
              className={`gallery-dot${i === activeIndex ? ' gallery-dot--active' : ''}`}
              onClick={() => scrollToIndex(i)}
            />
          ))}
        </div>
      )}

      {activeItem && (
        <MediaModal
          item={activeItem}
          onClose={() => setActiveItem(null)}
          comments={commentsHook}
        />
      )}
    </section>
  );
}
