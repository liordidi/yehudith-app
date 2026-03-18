import React from 'react';

export function SongsSection({ songs }) {
  if (!songs?.items?.length) return null;

  return (
    <section className="songs-section" dir="rtl">
      <h2>{songs.title}</h2>
      <div className="songs-carousel">
        {songs.items.map((song, i) => (
          <a
            key={song.id ?? i}
            className="song-card"
            href={song.url || undefined}
            target="_blank"
            rel="noreferrer"
            aria-label={`${song.title} — ${song.artist}`}
          >
            <div className="song-icon" aria-hidden="true">🎵</div>
            <div className="song-title">{song.title}</div>
            {song.artist && <div className="song-artist">{song.artist}</div>}
          </a>
        ))}
      </div>
    </section>
  );
}
