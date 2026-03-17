const path = require('path');

// Load .env from backend/.env, resolved relative to this file's directory.
// This works correctly regardless of which directory `node` is invoked from.
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// ── Validate required environment variables before doing anything else ────────
const REQUIRED_VARS = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'ADMIN_SECRET',
];

const missing = REQUIRED_VARS.filter(v => !process.env[v]);
if (missing.length > 0) {
  console.error('\n❌  Backend startup failed — missing environment variables:\n');
  missing.forEach(v => console.error(`    • ${v}`));
  console.error('\n👉  Create backend/.env based on backend/.env.example and fill in the values.\n');
  process.exit(1);
}
// ─────────────────────────────────────────────────────────────────────────────

const express = require('express');
const cors    = require('cors');
const multer  = require('multer');
const { createClient } = require('@supabase/supabase-js');

// ── Supabase client (service role — server-side only, never sent to browser) ──
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ── File upload: memory-only storage, 5 MB cap, images only ──────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('סוג קובץ לא נתמך. מותר: jpg, png, webp'));
    }
  },
});

// ── App ───────────────────────────────────────────────────────────────────────
const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

// ── Admin auth middleware ─────────────────────────────────────────────────────
function requireAdmin(req, res, next) {
  const key = req.headers['x-admin-key'];
  if (!key || key !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// ── Public: GET /api/memories — approved memories only ───────────────────────
app.get('/api/memories', async (_req, res) => {
  const { data, error } = await supabase
    .from('memories')
    .select('id, name, title, text, image_url, created_at')
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('GET /api/memories:', error.message);
    return res.status(500).json({ error: 'שגיאה בטעינת הזיכרונות' });
  }
  res.json(data);
});

// ── Public: POST /api/memories — submit a new memory ─────────────────────────
app.post('/api/memories', upload.single('image'), async (req, res) => {
  const { name, title, text } = req.body;

  // Validation
  if (!name?.trim() || !text?.trim()) {
    return res.status(400).json({ error: 'שם וטקסט הם שדות חובה' });
  }
  if (name.trim().length > 120) {
    return res.status(400).json({ error: 'השם ארוך מדי (מקסימום 120 תווים)' });
  }
  if (text.trim().length > 3000) {
    return res.status(400).json({ error: 'הטקסט ארוך מדי (מקסימום 3000 תווים)' });
  }

  // Upload image if provided
  let image_url = null;
  if (req.file) {
    const ext      = req.file.mimetype.split('/')[1].replace('jpeg', 'jpg');
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('memory-images')
      .upload(filename, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload:', uploadError.message);
      return res.status(500).json({ error: 'שגיאה בהעלאת התמונה' });
    }

    const { data: { publicUrl } } = supabase.storage
      .from('memory-images')
      .getPublicUrl(filename);

    image_url = publicUrl;
  }

  // Insert record
  const { data, error } = await supabase
    .from('memories')
    .insert({
      name:      name.trim(),
      title:     title?.trim() || null,
      text:      text.trim(),
      image_url,
      status:    'pending',
    })
    .select('id')
    .single();

  if (error) {
    console.error('INSERT memory:', error.message);
    return res.status(500).json({ error: 'שגיאה בשמירת הזיכרון' });
  }

  res.status(201).json({ ok: true, id: data.id });
});

// ── Admin: GET /api/admin/memories — list pending ─────────────────────────────
app.get('/api/admin/memories', requireAdmin, async (_req, res) => {
  const { data, error } = await supabase
    .from('memories')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) return res.status(500).json({ error: 'Failed to fetch pending' });
  res.json(data);
});

// ── Admin: GET /api/admin/memories/approved — list all approved ───────────────
app.get('/api/admin/memories/approved', requireAdmin, async (_req, res) => {
  const { data, error } = await supabase
    .from('memories')
    .select('*')
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: 'Failed to fetch approved' });
  res.json(data);
});

// ── Admin: PATCH /api/admin/memories/:id/approve ──────────────────────────────
app.patch('/api/admin/memories/:id/approve', requireAdmin, async (req, res) => {
  const { error } = await supabase
    .from('memories')
    .update({ status: 'approved' })
    .eq('id', req.params.id);

  if (error) return res.status(500).json({ error: 'Failed to approve' });
  res.json({ ok: true });
});

// ── Admin: DELETE /api/admin/memories/:id — reject / delete ──────────────────
app.delete('/api/admin/memories/:id', requireAdmin, async (req, res) => {
  // Fetch first to clean up storage image if present
  const { data: mem } = await supabase
    .from('memories')
    .select('image_url')
    .eq('id', req.params.id)
    .single();

  if (mem?.image_url) {
    const filename = mem.image_url.split('/').pop();
    await supabase.storage.from('memory-images').remove([filename]);
  }

  const { error } = await supabase
    .from('memories')
    .delete()
    .eq('id', req.params.id);

  if (error) return res.status(500).json({ error: 'Failed to delete' });
  res.json({ ok: true });
});

// ── multer / generic error handler ───────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'הקובץ גדול מדי (מקסימום 5MB)' });
  }
  if (err.message) return res.status(400).json({ error: err.message });
  res.status(500).json({ error: 'שגיאה לא צפויה' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Memorial backend running on port ${PORT}`));
