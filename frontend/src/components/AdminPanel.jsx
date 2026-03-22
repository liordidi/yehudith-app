// AdminPanel.jsx
// Admin UI for moderating pending image comments.
// Authentication via Supabase Auth (email + password).
// All Supabase operations use the authenticated session — no backend needed.

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// ── Login form ────────────────────────────────────────────────────────────────

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) setError(error.message);
    setLoading(false);
  };

  return (
    <div className="admin-panel-login" dir="rtl">
      <h4 className="admin-panel-title">כניסת מנהל</h4>

      <form onSubmit={handleSubmit} className="admin-login-form">
        <input
          type="email"
          className="admin-key-input"
          placeholder="אימייל"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          autoComplete="username"
        />

        <input
          type="password"
          className="admin-key-input"
          placeholder="סיסמה"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          autoComplete="current-password"
        />

        {error && <div className="memory-error">{error}</div>}

        <button
          type="submit"
          className="memory-approve-btn"
          disabled={loading || !email.trim() || !password.trim()}
        >
          {loading ? 'כניסה...' : 'כניסה'}
        </button>
      </form>
    </div>
  );
}

// ── Comment row ───────────────────────────────────────────────────────────────

function CommentRow({ comment, onApprove, onDelete }) {
  const [busy, setBusy] = useState(false);

  const act = async (fn) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  const date = new Date(comment.created_at).toLocaleDateString('he-IL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="memory-pending-item">
      <div className="admin-comment-meta">
        <span className="admin-comment-image">
          תמונה: <b>{comment.media_id}</b>
        </span>
        <span className="admin-comment-date">{date}</span>
      </div>

      <div>
        <b>{comment.name}:</b> {comment.text}
      </div>

      <div className="admin-pending-actions">
        <button
          className="memory-approve-btn"
          onClick={() => act(onApprove)}
          disabled={busy}
        >
          אשר
        </button>

        <button
          className="memory-approve-btn admin-reject-btn"
          onClick={() => act(onDelete)}
          disabled={busy}
        >
          דחה
        </button>
      </div>
    </div>
  );
}

// ── Logged-in admin panel ─────────────────────────────────────────────────────

function CommentModerationPanel({ session }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const loadComments = async () => {
    setLoading(true);
    setMsg('');

    const { data, error } = await supabase
      .from('image_comments')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      setMsg('שגיאה בטעינת תגובות: ' + error.message);
      setComments([]);
      setLoading(false);
      return;
    }

    setComments(data || []);

    if (!data || data.length === 0) {
      setMsg('אין תגובות ממתינות לאישור');
    }

    setLoading(false);
  };

  useEffect(() => {
    loadComments();
  }, []);

  const handleApprove = async (id) => {
    const { error } = await supabase
      .from('image_comments')
      .update({ status: 'approved' })
      .eq('id', id);

    if (error) {
      setMsg('שגיאה באישור תגובה: ' + error.message);
      return;
    }

    setComments((prev) => prev.filter((c) => c.id !== id));
    setMsg('התגובה אושרה ✓');
  };

  const handleDelete = async (id) => {
    const { error } = await supabase
      .from('image_comments')
      .delete()
      .eq('id', id);

    if (error) {
      setMsg('שגיאה במחיקת תגובה: ' + error.message);
      return;
    }

    setComments((prev) => prev.filter((c) => c.id !== id));
    setMsg('התגובה נמחקה');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div dir="rtl">
      <div className="admin-panel-header">
        <h4 className="admin-panel-title">ניהול תגובות</h4>

        <div className="admin-panel-user">
          <span>{session.user.email}</span>
          <button className="memory-approve-btn" onClick={handleLogout}>
            יציאה
          </button>
        </div>
      </div>

      <div className="admin-section-label">
        תגובות ממתינות לאישור
        <button
          className="memory-approve-btn"
          style={{ marginRight: 10 }}
          onClick={loadComments}
          disabled={loading}
        >
          {loading ? 'טוען...' : 'רענן'}
        </button>
      </div>

      {msg && <div className="admin-msg">{msg}</div>}

      {comments.map((c) => (
        <CommentRow
          key={c.id}
          comment={c}
          onApprove={() => handleApprove(c.id)}
          onDelete={() => handleDelete(c.id)}
        />
      ))}
    </div>
  );
}

// ── Access denied screen ──────────────────────────────────────────────────────

function NotAdminPanel({ session }) {
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div dir="rtl" className="admin-panel-login">
      <h4 className="admin-panel-title">אין הרשאה</h4>
      <div className="admin-msg">
        המשתמש <b>{session?.user?.email}</b> מחובר, אבל אינו מוגדר כאדמין.
      </div>
      <button className="memory-approve-btn" onClick={handleLogout}>
        יציאה
      </button>
    </div>
  );
}

// ── Public export ─────────────────────────────────────────────────────────────

export function AdminPanel() {
  const [session, setSession] = useState(null);
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const checkAdmin = async (userId) => {
    const { data, error } = await supabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();

    const admin = !error && !!data;
    setIsAdmin(admin);
    return admin;
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (!mounted) return;

      if (error) {
        setSession(null);
        setIsAdmin(false);
        setChecking(false);
        return;
      }

      const currentSession = data.session;
      setSession(currentSession);

      if (currentSession?.user) {
        await checkAdmin(currentSession.user.id);
      } else {
        setIsAdmin(false);
      }

      if (mounted) {
        setChecking(false);
      }
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!mounted) return;

      setSession(newSession);

      if (newSession?.user) {
        await checkAdmin(newSession.user.id);
      } else {
        setIsAdmin(false);
      }

      if (mounted) {
        setChecking(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (checking) return null;

  return (
    <div className="memory-pending-panel">
      {!session && <LoginForm />}
      {session && !isAdmin && <NotAdminPanel session={session} />}
      {session && isAdmin && <CommentModerationPanel session={session} />}
    </div>
  );
}