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

// ── Normalise image_crop for API responses ────────────────────────────────────
// Supabase returns JSONB columns as parsed JS objects, TEXT columns as strings.
// Either way, the frontend always receives a JSON *string* (or null) so that
// a single parseDisplaySafe() handles both column types correctly.
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

// ── App ───────────────────────────────────────────────────────────────────────
const app = express();

// ── Startup: warn loudly if image_crop column is missing ─────────────────────
supabase
  .from('memories')
  .select('image_crop')
  .limit(0)
  .then(({ error }) => {
    if (error) {
      console.warn('\n⚠️  image_crop column missing from memories table.');
      console.warn('   Image display settings cannot be saved until you run:');
      console.warn('   ALTER TABLE memories ADD COLUMN IF NOT EXISTS image_crop TEXT;\n');
    }
  });

// Gallery display settings are stored as gallery-settings.json in the
// memory-images storage bucket — no extra DB table needed.

// CORS — supports a comma-separated list of allowed origins so both localhost
// and a LAN IP can be active simultaneously during local dev:
//   FRONTEND_URL=http://localhost:5173,http://192.168.1.83:5173
// Set FRONTEND_URL=* to allow all origins (convenient for local dev).
const _corsOrigins = (process.env.FRONTEND_URL || '*')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
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
// Uses select('*') so the query never fails due to optional columns like
// image_crop not yet existing — PostgreSQL SELECT * only returns existing columns.
app.get('/api/memories', async (_req, res) => {
  const { data, error } = await supabase
    .from('memories')
    .select('*')
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('GET /api/memories:', error.message);
    return res.status(500).json({ error: 'שגיאה בטעינת הזיכרונות' });
  }
  res.json(data.map(normalizeCrop));
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
  res.json(data.map(normalizeCrop));
});

// ── Admin: GET /api/admin/memories/approved — list all approved ───────────────
app.get('/api/admin/memories/approved', requireAdmin, async (_req, res) => {
  const { data, error } = await supabase
    .from('memories')
    .select('*')
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: 'Failed to fetch approved' });
  res.json(data.map(normalizeCrop));
});

// ── Admin: PATCH /api/admin/memories/:id — edit content, image, display ──────
// Accepts multipart/form-data so the admin can optionally upload a replacement image.
// Fields: name, title, text, image_crop (JSON string), image (file), remove_image ('true')
app.patch('/api/admin/memories/:id', requireAdmin, upload.single('image'), async (req, res) => {
  const { name, title, text, image_crop, remove_image } = req.body;

  if (!name?.trim() || !text?.trim()) {
    return res.status(400).json({ error: 'שם וטקסט הם שדות חובה' });
  }
  if (name.trim().length > 120) {
    return res.status(400).json({ error: 'השם ארוך מדי (מקסימום 120 תווים)' });
  }

  // ── Parse and sanitise image display settings ─────────────────────────────
  let cropValue = null;
  if (image_crop !== undefined && image_crop !== null && image_crop !== '') {
    try {
      const p = typeof image_crop === 'string' ? JSON.parse(image_crop) : image_crop;
      cropValue = JSON.stringify({
        x:      typeof p.x      === 'number' ? Math.max(0,   Math.min(100, p.x))          : 50,
        y:      typeof p.y      === 'number' ? Math.max(0,   Math.min(100, p.y))          : 50,
        zoom:   typeof p.zoom   === 'number' ? Math.max(0.5, Math.min(4,   p.zoom))       : 1,
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
    // Fetch current image_url so we can delete the old file from storage
    const { data: current } = await supabase
      .from('memories')
      .select('image_url')
      .eq('id', req.params.id)
      .single();

    // Delete old file from storage (best-effort; don't fail the request if it errors)
    if (current?.image_url) {
      const oldFilename = current.image_url.split('/').pop();
      await supabase.storage.from('memory-images').remove([oldFilename]);
    }

    if (isRemoving) {
      new_image_url = null;
    } else {
      // Upload the new file
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
        .from('memory-images')
        .getPublicUrl(filename);

      new_image_url = publicUrl;
    }
  }

  // ── Step 1: update text (+ image_url if changed) ──────────────────────────
  const textUpdate = {
    name:  name.trim(),
    title: title?.trim() || null,
    text:  text.trim(),
    ...(new_image_url !== undefined && { image_url: new_image_url }),
  };

  const { error: textError } = await supabase
    .from('memories')
    .update(textUpdate)
    .eq('id', req.params.id);

  if (textError) {
    console.error('PATCH memory text:', textError.message);
    return res.status(500).json({ error: 'שגיאה בשמירת עריכה' });
  }

  // ── Step 2: update image display settings ────────────────────────────────
  if (cropValue !== null) {
    const { error: cropError } = await supabase
      .from('memories')
      .update({ image_crop: cropValue })
      .eq('id', req.params.id);

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

// ── Public: GET /api/gallery-settings — thumbnail display settings ────────────
// Reads gallery-settings.json from the memory-images storage bucket.
app.get('/api/gallery-settings', async (_req, res) => {
  const { data, error } = await supabase.storage
    .from('memory-images')
    .download('gallery-settings.json');

  if (error || !data) return res.json({});  // file not created yet — return empty

  try {
    const text = Buffer.from(await data.arrayBuffer()).toString('utf-8');
    return res.json(JSON.parse(text));
  } catch {
    return res.json({});
  }
});

// ── Admin: PUT /api/admin/gallery-settings — save thumbnail display settings ──
// Writes gallery-settings.json to the memory-images storage bucket.
app.put('/api/admin/gallery-settings', requireAdmin, async (req, res) => {
  const json   = JSON.stringify(req.body);
  const buffer = Buffer.from(json, 'utf-8');

  const { error } = await supabase.storage
    .from('memory-images')
    .upload('gallery-settings.json', buffer, {
      contentType: 'application/json',
      upsert: true,             // overwrite if already exists
    });

  if (error) {
    console.error('PUT gallery-settings storage error:', error.message);
    return res.status(500).json({ error: 'שגיאה בשמירת הגדרות: ' + error.message });
  }
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
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Memorial backend running on port ${PORT}`);
});
