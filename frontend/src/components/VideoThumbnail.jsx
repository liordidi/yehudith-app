import React, { useEffect, useState } from 'react';

// VideoThumbnail
// Extracts a single frame at SEEK_TIME seconds from a video URL and renders
// it as a static <img> with a play-icon overlay.
//
// The extraction runs once per `src` via a hidden, off-DOM video element.
// The element is fully torn down in the useEffect cleanup so it does not
// linger in memory after the card unmounts (e.g. when a gallery filter changes).

const SEEK_TIME = 2; // seconds

function extractFrame(src) {
  // Returns a Promise that resolves to a JPEG data-URL, or rejects on error.
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';
    // crossOrigin needed when the video origin differs from the page origin.
    video.crossOrigin = 'anonymous';

    const cleanup = () => {
      video.removeEventListener('loadedmetadata', onMeta);
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('error', onError);
      // Release the media resource so the browser can GC the element.
      video.src = '';
      video.load();
    };

    const onMeta = () => {
      // Clamp to (duration - 0.1) so we never seek past the end.
      video.currentTime = Math.min(SEEK_TIME, Math.max(0, video.duration - 0.1));
    };

    const onSeeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width  = video.videoWidth  || 320;
        canvas.height = video.videoHeight || 240;
        canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
        cleanup();
        resolve(dataUrl);
      } catch (err) {
        cleanup();
        reject(err);
      }
    };

    const onError = () => {
      cleanup();
      reject(new Error(`VideoThumbnail: failed to load ${src}`));
    };

    video.addEventListener('loadedmetadata', onMeta);
    video.addEventListener('seeked', onSeeked);
    video.addEventListener('error', onError);
    video.src = src;
  });
}

export function VideoThumbnail({ src, className }) {
  const [thumbnail, setThumbnail] = useState(null); // null = loading

  useEffect(() => {
    let cancelled = false;

    extractFrame(src)
      .then(dataUrl => {
        if (!cancelled) setThumbnail(dataUrl);
      })
      .catch(() => {
        // On failure (iOS restriction, CORS, very short video) leave thumbnail
        // as null — the placeholder colour is shown instead.
      });

    return () => {
      cancelled = true;
    };
  }, [src]);

  return (
    <div className="gallery-video-wrapper">
      {thumbnail
        ? <img src={thumbnail} className={className} alt="תצוגה מקדימה" />
        : <div className={`${className} gallery-video-placeholder`} />
      }
      <span className="gallery-play-icon" aria-hidden="true">▶</span>
    </div>
  );
}
