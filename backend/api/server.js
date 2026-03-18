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
const { createClient } = require('@supabase/supabase-js');

// ── Supabase client (service role — server-side only, never sent to browser) ──
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ── App ───────────────────────────────────────────────────────────────────────
const app = express();

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

// ── Generic error handler ─────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err.message) return res.status(400).json({ error: err.message });
  res.status(500).json({ error: 'שגיאה לא צפויה' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Memorial backend running on port ${PORT}`);
});
