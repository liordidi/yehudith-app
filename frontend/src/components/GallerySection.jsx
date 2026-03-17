import React, { useState } from 'react';
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
  const [selected, setSelected]   = useState(gallery.categories[0]);
  const [activeItem, setActiveItem] = useState(null);
  const commentsHook = useComments();

  const filtered = selected === gallery.categories[0]
    ? galleryItems
    : galleryItems.filter(i => i.category === selected);

  return (
    <section className="gallery-section" dir="rtl">
      <h2>{gallery.title}</h2>

      <div className="gallery-categories">
        {gallery.categories.map(cat => (
          <button
            key={cat}
            className={selected === cat ? 'active' : ''}
            onClick={() => setSelected(cat)}
          >{cat}</button>
        ))}
      </div>

      <div className="gallery-grid">
        {filtered.map(item => (
          <div
            className="gallery-card"
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
