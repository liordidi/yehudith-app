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

async function fetchBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download ${url} - ${res.status}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function ensureBucketExists(bucketName) {
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) throw error;

  const exists = buckets.some(b => b.name === bucketName);
  if (!exists) {
    const { error: createError } = await supabase.storage.createBucket(bucketName, {
      public: true,
    });
    if (createError) throw createError;
    console.log(`Created bucket: ${bucketName}`);
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

  for (const row of memories) {
    if (!row.image_url) continue;

    console.log(`Processing row ${row.id}`);

    const parsed = parseOldPublicUrl(row.image_url);
    if (!parsed) {
      console.warn(`Skipping row ${row.id} - cannot parse URL`);
      continue;
    }

    const { bucket, filePath } = parsed;

    await ensureBucketExists(bucket);

    const buffer = await fetchBuffer(row.image_url);

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, buffer, {
        upsert: true,
        contentType: 'application/octet-stream',
      });

    if (uploadError) {
      console.error(`Upload failed for row ${row.id}: ${uploadError.message}`);
      continue;
    }

    const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(filePath);
    const newUrl = publicData.publicUrl;

    const { error: updateError } = await supabase
      .from('memories')
      .update({ image_url: newUrl })
      .eq('id', row.id);

    if (updateError) {
      console.error(`DB update failed for row ${row.id}: ${updateError.message}`);
      continue;
    }

    console.log(`Updated row ${row.id}`);
  }

  console.log('\nDone. Image URLs migrated.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});