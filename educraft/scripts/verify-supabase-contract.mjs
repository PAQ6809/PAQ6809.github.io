import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const siteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const core = await readFile(path.join(siteRoot, 'app-core.js'), 'utf8');
const overrideUrl = process.env.EDUCRAFT_SUPABASE_URL;
const overrideKey = process.env.EDUCRAFT_SUPABASE_PUBLISHABLE_KEY;
assert.equal(Boolean(overrideUrl), Boolean(overrideKey), 'set both Supabase override variables or neither');
const projectUrl = overrideUrl || core.match(/supabaseUrl:\s*'([^']+)'/)?.[1];
const publishableKey = overrideKey || core.match(/supabaseKey:\s*'([^']+)'/)?.[1];

assert(projectUrl, 'app-core.js must declare CONFIG.supabaseUrl');
assert(publishableKey, 'app-core.js must declare CONFIG.supabaseKey');
const target = new URL(projectUrl);
assert.equal(target.protocol, 'https:', 'Supabase target must use HTTPS');
console.log(`TARGET Supabase ${target.hostname}`);

async function request(resource, { method = 'GET', body } = {}) {
  const response = await fetch(`${projectUrl}/rest/v1/${resource}`, {
    method,
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${publishableKey}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* status is enough */ }
  return { status: response.status, data };
}

function expectEmpty(result, label) {
  assert.equal(result.status, 200, `${label}: expected HTTP 200, got ${result.status}`);
  assert(Array.isArray(result.data), `${label}: expected an array response`);
  assert.equal(result.data.length, 0, `${label}: anonymous request exposed ${result.data.length} row(s)`);
}

const checks = [];
async function check(label, run) {
  try {
    await run();
    checks.push({ label, passed: true });
    console.log(`PASS ${label}`);
  } catch (error) {
    checks.push({ label, passed: false });
    console.error(`FAIL ${label}: ${error.message}`);
  }
}

const privateReads = [
  ['private profiles', 'educraft_profiles?select=user_id&limit=1'],
  ['private lesson-plan versions', 'educraft_lesson_plan_versions?select=id&limit=1'],
  ['private saved resources', 'educraft_saved_resources?select=id&limit=1'],
  ['private teacher preferences', 'educraft_teacher_preferences?select=user_id&limit=1'],
  ['non-public lesson plans', 'educraft_lesson_plans?select=id,visibility&visibility=neq.public&limit=1'],
];

for (const [label, resource] of privateReads) {
  await check(`anonymous cannot read ${label}`, async () => expectEmpty(await request(resource), label));
}

await check('anonymous base-table reads are limited to published plans', async () => {
  const result = await request('educraft_lesson_plans?select=id,visibility,published_at&limit=50');
  assert.equal(result.status, 200, `expected HTTP 200, got ${result.status}`);
  assert(Array.isArray(result.data), 'expected an array response');
  assert(result.data.every(row => row.visibility === 'public' && row.published_at), 'base table returned a non-public plan');
});

await check('public lesson-plan view returns only published rows for selected fields', async () => {
  const fields = 'id,user_id,title,subject,grade,topic,language,output_language,status,source_mode,visibility,public_slug,published_at,license,teaching_style,originality_note,public_summary,cover_emoji,forked_from,created_at,updated_at';
  const result = await request(`educraft_public_lesson_plans?select=${fields}&limit=50`);
  assert.equal(result.status, 200, `expected HTTP 200, got ${result.status}`);
  assert(Array.isArray(result.data), 'expected an array response');
  assert(result.data.every(row => row.visibility === 'public' && row.published_at), 'view returned a non-public plan');
});

await check('public profile endpoint exposes only public profile fields', async () => {
  const fields = 'user_id,slug,display_name,headline,bio,school_public,region,languages,specialties,avatar_url,website_url,is_listed';
  const result = await request(`educraft_public_profiles?select=${fields}&limit=50`);
  assert.equal(result.status, 200, `expected HTTP 200, got ${result.status}`);
  assert(Array.isArray(result.data), 'expected an array response');
  assert(result.data.every(row => row.is_listed === true), 'endpoint returned an unlisted profile');
});

await check('private profile columns do not exist on the public profile endpoint', async () => {
  const result = await request('educraft_public_profiles?select=email,school_name,private_notes&limit=1');
  assert.equal(result.status, 400, `expected HTTP 400 for forbidden columns, got ${result.status}`);
});

for (const table of ['educraft_chatgpt_transfer_drafts', 'educraft_rate_limits']) {
  await check(`anonymous Data API access is denied for ${table}`, async () => {
    const result = await request(`${table}?select=*&limit=1`);
    assert([401, 403].includes(result.status), `expected HTTP 401/403, got ${result.status}`);
  });
}

await check('anonymous callers cannot invoke the authenticated claim RPC', async () => {
  const result = await request('rpc/educraft_claim_chatgpt_transfer_draft', {
    method: 'POST',
    body: { p_claim_code: '000000000000' },
  });
  assert([401, 403].includes(result.status), `expected HTTP 401/403, got ${result.status}`);
});

const failed = checks.filter(result => !result.passed);
console.log(`Supabase anonymous contract: ${checks.length - failed.length}/${checks.length} checks passed.`);
if (failed.length) process.exitCode = 1;
