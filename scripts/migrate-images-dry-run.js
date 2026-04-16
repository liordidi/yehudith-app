const { createClient } = require('@supabase/supabase-js');

const NEW_SUPABASE_URL = process.env.NEW_SUPABASE_URL;
const NEW_SUPABASE_SERVICE_ROLE_KEY = process.env.NEW_SUPABASE_SERVICE_ROLE_KEY;

if (!NEW_SUPABASE_URL || !NEW_SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing NEW_SUPABASE_URL or NEW_SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(NEW_SUPABASE_URL, NEW_SUPABASE_SERVICE_ROLE_KEY);

function parseOldPublicUrl(url) {
  try {
    const u = new URL(url);
    const marker = '/storage/v1/object/public/';
    const idx = u.pathname.indexOf(marker);
    if (idx === -1) return null;

    const rest = u.pathname.slice(idx + marker.length);
    const firstSlash = rest.indexOf('/');
    if (firstSlash === -1) return null;

    const bucket = rest.slice(0, firstSlash);
    const filePath = rest.slice(firstSlash + 1);

    return { bucket, filePath };
  } catch {
    return null;
  }
}

async function testUrl(url) {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return {
      ok: res.ok,
      status: res.status,
    };
  } catch (err) {
    return {
      ok: false,
      status: 'FETCH_FAILED',
      error: err.message,
    };
  }
}

async function main() {
  const OLD_PROJECT_HOST = 'azhmxeesdtsxyvkbronx.supabase.co';

  const { data: memories, error } = await supabase
    .from('memories')
    .select('id, image_url')
    .ilike('image_url', `%${OLD_PROJECT_HOST}%`);

  if (error) throw error;

  console.log(`Found ${memories.length} memory rows with old image URLs\n`);

  let parsable = 0;
  let reachable = 0;
  let unparsed = 0;
  let unreachable = 0;

  for (const row of memories) {
    console.log(`Row ID: ${row.id}`);
    console.log(`Old URL: ${row.image_url}`);

    const parsed = parseOldPublicUrl(row.image_url);

    if (!parsed) {
      unparsed++;
      console.log('Parse: FAILED');
      console.log('---');
      continue;
    }

    parsable++;
    console.log(`Parsed bucket: ${parsed.bucket}`);
    console.log(`Parsed filePath: ${parsed.filePath}`);

    const check = await testUrl(row.image_url);

    if (check.ok) {
      reachable++;
      console.log(`Reachable: YES (${check.status})`);
    } else {
      unreachable++;
      console.log(`Reachable: NO (${check.status})`);
      if (check.error) {
        console.log(`Error: ${check.error}`);
      }
    }

    console.log('---');
  }

  console.log('\nSummary');
  console.log('=======');
  console.log(`Total rows found: ${memories.length}`);
  console.log(`Parsable URLs: ${parsable}`);
  console.log(`Unparsable URLs: ${unparsed}`);
  console.log(`Reachable URLs: ${reachable}`);
  console.log(`Unreachable URLs: ${unreachable}`);
  console.log('\nDry run only. No files uploaded. No DB rows updated.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});