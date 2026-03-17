import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import { memorialData } from './memorialData';
import { HeroSection } from './components/HeroSection';
import { GallerySection } from './components/GallerySection';
import { MemoriesSection } from './components/MemoriesSection';
import { CandleSection } from './components/CandleSection';
import { Footer } from './components/Footer';
import { Modal } from './components/Modal';
import {
  fetchApprovedMemories,
  submitMemory,
  fetchPendingMemories,
  approveMemory,
  rejectMemory,
  fetchApprovedMemoriesAdmin,
  deleteMemory,
} from './api/memories';

// Admin panel is shown in dev mode OR when ?admin appears in the URL.
const SHOW_ADMIN = import.meta.env.DEV ||
  new URLSearchParams(window.location.search).has('admin');

function App() {
  const [modalOpen, setModalOpen]       = useState(false);
  const [serverMemories, setServerMemories] = useState([]);
  const [successMsg, setSuccessMsg]     = useState('');
  const [submitting, setSubmitting]     = useState(false);
  const [submitError, setSubmitError]   = useState('');
  const successTimeout                  = useRef(null);

  // Admin state
  const [adminKey, setAdminKey]         = useState('');
  const [pending, setPending]           = useState([]);
  const [approvedAdmin, setApprovedAdmin] = useState([]);
  const [adminMsg, setAdminMsg]         = useState('');

  // Load approved memories from the real backend on mount.
  useEffect(() => {
    fetchApprovedMemories()
      .then(setServerMemories)
      .catch(() => {}); // Silent — static seed memories still display
  }, []);

  // Auto-dismiss success message
  useEffect(() => {
    if (!successMsg) return;
    successTimeout.current = setTimeout(() => setSuccessMsg(''), 3500);
    return () => clearTimeout(successTimeout.current);
  }, [successMsg]);

  const handleViewMemories = () => {
    document.getElementById('memories-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleShareMemory = () => {
    setSubmitError('');
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSubmitError('');
    if (successTimeout.current) clearTimeout(successTimeout.current);
  };

  const handleSubmitMemory = async (formData, resetForm) => {
    setSubmitting(true);
    setSubmitError('');
    try {
      await submitMemory(formData);
      setModalOpen(false);
      setSuccessMsg('הזיכרון נשלח ויופיע לאחר אישור 💜');
      resetForm();
    } catch (err) {
      setSubmitError(err.message || 'שגיאה בשליחת הזיכרון');
    } finally {
      setSubmitting(false);
    }
  };

  // Admin: load both pending and approved from backend
  const handleLoadPending = async () => {
    setAdminMsg('');
    try {
      const [pendingData, approvedData] = await Promise.all([
        fetchPendingMemories(adminKey),
        fetchApprovedMemoriesAdmin(adminKey),
      ]);
      setPending(pendingData);
      setApprovedAdmin(approvedData);
      if (pendingData.length === 0 && approvedData.length === 0)
        setAdminMsg('אין זיכרונות במערכת');
    } catch (err) {
      setAdminMsg(err.message);
    }
  };

  const handleApprove = async (id) => {
    try {
      await approveMemory(id, adminKey);
      const approved = pending.find(m => m.id === id);
      setPending(prev => prev.filter(m => m.id !== id));
      if (approved) setApprovedAdmin(prev => [{ ...approved, status: 'approved' }, ...prev]);
      setAdminMsg('הזיכרון אושר ✓');
      fetchApprovedMemories().then(setServerMemories).catch(() => {});
    } catch {
      setAdminMsg('שגיאה באישור');
    }
  };

  const handleReject = async (id) => {
    try {
      await rejectMemory(id, adminKey);
      setPending(prev => prev.filter(m => m.id !== id));
      setAdminMsg('הזיכרון נדחה');
    } catch {
      setAdminMsg('שגיאה בדחייה');
    }
  };

  const handleDeleteApproved = async (id) => {
    try {
      await deleteMemory(id, adminKey);
      setApprovedAdmin(prev => prev.filter(m => m.id !== id));
      setServerMemories(prev => prev.filter(m => m.id !== id));
      setAdminMsg('הזיכרון נמחק');
    } catch {
      setAdminMsg('שגיאה במחיקה');
    }
  };

  // Static seed memories always shown; server memories appended below
  const allMemories = [
    ...memorialData.memories.items,
    ...serverMemories,
  ];

  return (
    <div className="memorial-page" dir="rtl">
      <HeroSection
        person={memorialData.person}
        hero={memorialData.hero}
        onViewMemories={handleViewMemories}
        onShareMemory={handleShareMemory}
      />
      <GallerySection gallery={memorialData.gallery} />
      <div id="memories-section">
        <MemoriesSection memories={{ title: memorialData.memories.title, items: allMemories }} />
      </div>
      <CandleSection candle={memorialData.candle} />
      <Footer footer={memorialData.footer} />

      {/* Memory submission modal */}
      <Modal
        open={modalOpen}
        onClose={handleCloseModal}
        title={memorialData.shareMemory.modalTitle}
        closeLabel={memorialData.shareMemory.closeButton}
      >
        <MemoryForm
          onSubmit={handleSubmitMemory}
          submitting={submitting}
          submitError={submitError}
        />
      </Modal>

      {successMsg && (
        <div className="memory-success" dir="rtl">{successMsg}</div>
      )}

      {/* Admin moderation panel — dev / ?admin URL only */}
      {SHOW_ADMIN && (
        <div className="memory-pending-panel" dir="rtl">
          <h4>ניהול זיכרונות</h4>
          <div className="admin-key-row">
            <input
              type="password"
              placeholder="מפתח ניהול"
              value={adminKey}
              onChange={e => setAdminKey(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLoadPending()}
              className="admin-key-input"
            />
            <button className="memory-approve-btn" onClick={handleLoadPending}>טען</button>
          </div>
          {adminMsg && <div className="admin-msg">{adminMsg}</div>}

          {/* Pending */}
          {pending.length > 0 && (
            <>
              <div className="admin-section-label">ממתינים לאישור ({pending.length})</div>
              {pending.map(mem => (
                <div className="memory-pending-item" key={mem.id}>
                  <div><b>{mem.title || '—'}</b> · {mem.name}</div>
                  <div>{mem.text}</div>
                  {mem.image_url && (
                    <img src={mem.image_url} alt="" className="admin-pending-thumb" />
                  )}
                  <div className="admin-pending-actions">
                    <button className="memory-approve-btn" onClick={() => handleApprove(mem.id)}>אשר</button>
                    <button className="memory-approve-btn admin-reject-btn" onClick={() => handleReject(mem.id)}>דחה</button>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Approved */}
          {approvedAdmin.length > 0 && (
            <>
              <div className="admin-section-label">זיכרונות מאושרים ({approvedAdmin.length})</div>
              {approvedAdmin.map(mem => (
                <div className="memory-pending-item" key={mem.id}>
                  <div><b>{mem.title || '—'}</b> · {mem.name}</div>
                  <div>{mem.text}</div>
                  {mem.image_url && (
                    <img src={mem.image_url} alt="" className="admin-pending-thumb" />
                  )}
                  <div className="admin-pending-actions">
                    <button className="memory-approve-btn admin-reject-btn" onClick={() => handleDeleteApproved(mem.id)}>מחק</button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Memory submission form ────────────────────────────────────────────────────
function MemoryForm({ onSubmit, submitting, submitError }) {
  const [name, setName]               = useState('');
  const [title, setTitle]             = useState('');
  const [text, setText]               = useState('');
  const [imageFile, setImageFile]     = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [errors, setErrors]           = useState({});

  // Revoke object URL when component unmounts
  useEffect(() => {
    return () => { if (imagePreview) URL.revokeObjectURL(imagePreview); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const resetForm = () => {
    setName(''); setTitle(''); setText('');
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null); setImagePreview(null);
    setErrors({});
  };

  const validate = () => {
    const errs = {};
    if (!name.trim()) errs.name = 'יש להזין שם מלא';
    if (!text.trim()) errs.text = 'יש להזין זיכרון';
    return errs;
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleRemoveImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const formData = new FormData();
    formData.append('name', name.trim());
    if (title.trim()) formData.append('title', title.trim());
    formData.append('text', text.trim());
    if (imageFile) formData.append('image', imageFile);

    onSubmit(formData, resetForm);
  };

  return (
    <form className="memory-form" onSubmit={handleSubmit} dir="rtl">
      <label htmlFor="memory-name">שם מלא *</label>
      <input
        id="memory-name"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="הזן את שמך המלא"
        autoComplete="off"
      />
      {errors.name && <div className="memory-error">{errors.name}</div>}

      <label htmlFor="memory-title">כותרת</label>
      <input
        id="memory-title"
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="כותרת (לא חובה)"
        autoComplete="off"
      />

      <label htmlFor="memory-text">זיכרון *</label>
      <textarea
        id="memory-text"
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="כתוב כאן את הזיכרון"
        rows={4}
      />
      {errors.text && <div className="memory-error">{errors.text}</div>}

      {/* Image file upload */}
      <label>תמונה (לא חובה)</label>
      {imagePreview ? (
        <div className="memory-image-preview">
          <img src={imagePreview} alt="תצוגה מקדימה" />
          <button type="button" className="memory-image-remove" onClick={handleRemoveImage}>
            הסר תמונה
          </button>
        </div>
      ) : (
        <label className="memory-file-label" htmlFor="memory-image-file">
          📷 בחר תמונה מהגלריה
          <input
            id="memory-image-file"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleImageChange}
            style={{ display: 'none' }}
          />
        </label>
      )}

      {submitError && <div className="memory-error">{submitError}</div>}

      <button
        type="submit"
        className="memory-submit-btn"
        disabled={submitting || !name.trim() || !text.trim()}
      >
        {submitting ? 'שולח...' : 'שלח זיכרון'}
      </button>
    </form>
  );
}

export default App;
