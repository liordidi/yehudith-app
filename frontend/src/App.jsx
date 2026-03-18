import React, { useState } from 'react';
import './App.css';
import { memorialData } from './memorialData';
import { HeroSection } from './components/HeroSection';
import { GallerySection } from './components/GallerySection';
import { SongsSection } from './components/SongsSection';
import { MessagesSection } from './components/MessagesSection';
import { CandleSection } from './components/CandleSection';
import { Footer } from './components/Footer';

// Admin panel is shown in dev mode OR when ?admin appears in the URL.
const SHOW_ADMIN = import.meta.env.DEV ||
  new URLSearchParams(window.location.search).has('admin');

function App() {
  const [adminKey, setAdminKey] = useState('');

  return (
    <div className="memorial-page" dir="rtl">
      <HeroSection
        person={memorialData.person}
        hero={memorialData.hero}
      />
      <GallerySection
        gallery={memorialData.gallery}
        showAdmin={SHOW_ADMIN}
        adminKey={adminKey}
      />
      <div id="songs-section">
        <SongsSection songs={memorialData.songs} />
      </div>
      <div id="messages-section">
        <MessagesSection messages={memorialData.messages} />
      </div>
      <CandleSection candle={memorialData.candle} />
      <Footer footer={memorialData.footer} />

      {/* Admin key input — used by GallerySection for saving display settings */}
      {SHOW_ADMIN && (
        <div className="memory-pending-panel" dir="rtl">
          <h4>ניהול גלריה</h4>
          <div className="admin-key-row">
            <input
              type="password"
              placeholder="מפתח ניהול"
              value={adminKey}
              onChange={e => setAdminKey(e.target.value)}
              className="admin-key-input"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
