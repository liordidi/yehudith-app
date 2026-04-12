const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// ── Validate required environment variables ───────────────────────────────────
const REQUIRED_VARS = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'ADMIN_SECRET'];
const missing = REQUIRED_VARS.filter(v => !process.env[v]);
if (missing.length > 0) {
  console.error('\n❌  Backend startup failed — missing environment variables:\n');
  missing.forEach(v => console.error(`    • ${v}`));
  console.error('\n👉  Create backend/.env based on backend/.env.example and fill in the values.\n');
  process.exit(1);
}

const express = require('express');
const cors    = require('cors');
const multer  = require('multer');
const { createClient } = require('@supabase/supabase-js');

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
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('סוג קובץ לא נתמך. מותר: jpg, png, webp'));
  },
});

// ── Normalise image_crop for API responses ────────────────────────────────────
// Always send image_crop as a JSON string so the frontend parser works uniformly.
function normalizeCrop(m) {
  if (!m || m.image_crop == null) return m;
  return {
    ...m,
    image_crop:
      typeof m.image_crop === 'string'
        ? m.image_crop
        : JSON.stringify(m.image_crop),
  };
}

const app = express();

const _corsOrigins = (process.env.FRONTEND_URL || '*')
  .split(',').map(s => s.trim()).filter(Boolean);
const _corsOrigin = _corsOrigins.length === 1 ? _corsOrigins[0] : _corsOrigins;
app.use(cors({ origin: _corsOrigin }));
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
    .select('*')
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  if (error) {
  console.error('GET /api/memories FULL ERROR:', error);
  return res.status(500).json({
    error: 'שגיאה בטעינת הזיכרונות',
    message: error.message,
    details: error.details,
    hint: error.hint,
    code: error.code
  });
  }
  res.json(data.map(normalizeCrop));
});

// ── Admin: GET /api/admin/memories/approved ───────────────────────────────────
app.get('/api/admin/memories/approved', requireAdmin, async (_req, res) => {
  const { data, error } = await supabase
    .from('memories')
    .select('*')
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: 'שגיאה בטעינת הזיכרונות' });
  res.json(data.map(normalizeCrop));
});

// ── Admin: PATCH /api/admin/memories/:id — edit content, image, display ───────
// Accepts multipart/form-data so the admin can optionally upload a replacement image.
// Fields: name, title, text, image_crop (JSON string), image (file), remove_image ('true')
app.patch('/api/admin/memories/:id', requireAdmin, upload.single('image'), async (req, res) => {
  const { name, title, text, image_crop, remove_image } = req.body;

  if (!name?.trim() || !text?.trim()) {
    return res.status(400).json({ error: 'שם וטקסט הם שדות חובה' });
  }

  // ── Parse and sanitise image display settings ──────────────────────────────
  let cropValue = null;
  if (image_crop !== undefined && image_crop !== null && image_crop !== '') {
    try {
      const p = typeof image_crop === 'string' ? JSON.parse(image_crop) : image_crop;
      cropValue = JSON.stringify({
        x:      typeof p.x      === 'number' ? Math.max(0,   Math.min(100, p.x))                  : 50,
        y:      typeof p.y      === 'number' ? Math.max(0,   Math.min(100, p.y))                  : 50,
        zoom:   typeof p.zoom   === 'number' ? Math.max(0.5, Math.min(4,   p.zoom))               : 1,
        height: typeof p.height === 'number' ? Math.max(80,  Math.min(300, Math.round(p.height))) : 140,
        fit:    ['cover', 'contain'].includes(p.fit) ? p.fit : 'cover',
      });
    } catch {
      return res.status(400).json({ error: 'פורמט הגדרות תמונה לא תקין' });
    }
  }

  // ── Handle image replacement / removal ────────────────────────────────────
  const isReplacing = !!req.file;
  const isRemoving  = remove_image === 'true';
  let new_image_url; // undefined = no change; string or null = changed

  if (isReplacing || isRemoving) {
    const { data: current } = await supabase
      .from('memories').select('image_url').eq('id', req.params.id).single();

    if (current?.image_url) {
      const oldFilename = current.image_url.split('/').pop();
      await supabase.storage.from('memory-images').remove([oldFilename]);
    }

    if (isRemoving) {
      new_image_url = null;
    } else {
      const ext      = req.file.mimetype.split('/')[1].replace('jpeg', 'jpg');
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('memory-images')
        .upload(filename, req.file.buffer, { contentType: req.file.mimetype, upsert: false });

      if (uploadErr) {
        console.error('PATCH image upload:', uploadErr.message);
        return res.status(500).json({ error: 'שגיאה בהעלאת התמונה החדשה' });
      }

      const { data: { publicUrl } } = supabase.storage
        .from('memory-images').getPublicUrl(filename);
      new_image_url = publicUrl;
    }
  }

  // ── Update text (+ image_url if changed) ──────────────────────────────────
  const { error: textError } = await supabase
    .from('memories')
    .update({
      name:  name.trim(),
      title: title?.trim() || null,
      text:  text.trim(),
      ...(new_image_url !== undefined && { image_url: new_image_url }),
    })
    .eq('id', req.params.id);

  if (textError) {
    console.error('PATCH memory text:', textError.message);
    return res.status(500).json({ error: 'שגיאה בשמירת עריכה' });
  }

  // ── Update image display settings ─────────────────────────────────────────
  if (cropValue !== null) {
    const { error: cropError } = await supabase
      .from('memories').update({ image_crop: cropValue }).eq('id', req.params.id);

    if (cropError) {
      console.error('PATCH memory image_crop:', cropError.message);
      return res.json({
        ok: true,
        ...(new_image_url !== undefined && { image_url: new_image_url }),
        cropWarning: 'הגדרות התמונה לא נשמרו. הוסף עמודת image_crop לטבלה.',
      });
    }
  }

  res.json({
    ok: true,
    ...(new_image_url !== undefined && { image_url: new_image_url }),
  });
});

// ── Admin: DELETE /api/admin/memories/:id ────────────────────────────────────
app.delete('/api/admin/memories/:id', requireAdmin, async (req, res) => {
  const { data: mem } = await supabase
    .from('memories').select('image_url').eq('id', req.params.id).single();

  if (mem?.image_url) {
    const filename = mem.image_url.split('/').pop();
    await supabase.storage.from('memory-images').remove([filename]);
  }

  const { error } = await supabase.from('memories').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: 'שגיאה במחיקה' });
  res.json({ ok: true });
});

// ── Public: GET /api/gallery-settings ────────────────────────────────────────
app.get('/api/gallery-settings', async (_req, res) => {
  const { data, error } = await supabase.storage
    .from('memory-images').download('gallery-settings.json');

  if (error || !data) return res.json({});
  try {
    const text = Buffer.from(await data.arrayBuffer()).toString('utf-8');
    return res.json(JSON.parse(text));
  } catch {
    return res.json({});
  }
});

// ── Admin: PUT /api/admin/gallery-settings ────────────────────────────────────
app.put('/api/admin/gallery-settings', requireAdmin, async (req, res) => {
  const buffer = Buffer.from(JSON.stringify(req.body), 'utf-8');

  const { error } = await supabase.storage
    .from('memory-images')
    .upload('gallery-settings.json', buffer, { contentType: 'application/json', upsert: true });

  if (error) {
    console.error('PUT gallery-settings:', error.message);
    return res.status(500).json({ error: 'שגיאה בשמירת הגדרות: ' + error.message });
  }
  res.json({ ok: true });
});

// ── Admin: GET /api/admin/comments/pending ────────────────────────────────────
app.get('/api/admin/comments/pending', requireAdmin, async (_req, res) => {
  const { data, error } = await supabase
    .from('image_comments')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) return res.status(500).json({ error: 'שגיאה בטעינת תגובות' });
  res.json(data);
});

// ── Admin: PATCH /api/admin/comments/:id — approve ────────────────────────────
app.patch('/api/admin/comments/:id', requireAdmin, async (req, res) => {
  const { error } = await supabase
    .from('image_comments')
    .update({ status: 'approved' })
    .eq('id', req.params.id);

  if (error) return res.status(500).json({ error: 'שגיאה באישור תגובה' });
  res.json({ ok: true });
});

// ── Admin: DELETE /api/admin/comments/:id — reject ────────────────────────────
app.delete('/api/admin/comments/:id', requireAdmin, async (req, res) => {
  const { error } = await supabase
    .from('image_comments')
    .delete()
    .eq('id', req.params.id);

  if (error) return res.status(500).json({ error: 'שגיאה במחיקת תגובה' });
  res.json({ ok: true });
});

// ── Error handler ─────────────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'הקובץ גדול מדי (מקסימום 5MB)' });
  if (err.message) return res.status(400).json({ error: err.message });
  res.status(500).json({ error: 'שגיאה לא צפויה' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Memorial backend running on port ${PORT}`);
});
