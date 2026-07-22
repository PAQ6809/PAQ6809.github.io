import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const siteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const migrationRoot = path.join(siteRoot, 'supabase', 'migrations');
const contractPath = path.join(siteRoot, 'supabase', 'tests', 'public_lesson_plan_snapshots_contract.sql');
const sourceGovernanceContractPath = path.join(siteRoot, 'supabase', 'tests', 'source_governance_contract.sql');
const failures = [];

function requireMatch(source, pattern, message) {
  if (!pattern.test(source)) failures.push(message);
}

function forbidMatch(source, pattern, message) {
  if (pattern.test(source)) failures.push(message);
}

const files = (await readdir(migrationRoot))
  .filter(file => file.endsWith('.sql'))
  .sort();

if (!files.length) failures.push('No Supabase migrations found');
if (new Set(files.map(file => file.slice(0, 14))).size !== files.length) {
  failures.push('Migration timestamps must be unique');
}
for (const file of files) {
  if (!/^\d{14}_[a-z0-9_]+\.sql$/.test(file)) {
    failures.push(`${file}: migration filename must be YYYYMMDDHHMMSS_snake_case.sql`);
  }
}

const ownershipFile = files.find(file => file.endsWith('_harden_claim_and_version_ownership.sql'));
if (!ownershipFile) {
  failures.push('Missing claim/version ownership migration');
} else {
  const source = await readFile(path.join(migrationRoot, ownershipFile), 'utf8');
  requireMatch(
    source,
    /on\s+conflict\s+on\s+constraint\s+educraft_lesson_plans_user_id_client_id_key/i,
    `${ownershipFile}: claim must use the named idempotency constraint`,
  );
  requireMatch(
    source,
    /exists\s*\([\s\S]*?from\s+public\.educraft_lesson_plans[\s\S]*?plan\.user_id\s*=\s*auth\.uid\(\)/i,
    `${ownershipFile}: version writes must verify parent-plan ownership`,
  );
  requireMatch(
    source,
    /security\s+definer[\s\S]*?set\s+search_path\s*=\s*''/i,
    `${ownershipFile}: claim RPC must pin an empty search_path`,
  );
}

const snapshotFile = files.find(file => file.endsWith('_add_public_lesson_plan_snapshots.sql'));
if (!snapshotFile) {
  failures.push('Missing public lesson-plan snapshot migration');
} else {
  const source = await readFile(path.join(migrationRoot, snapshotFile), 'utf8');
  const viewBody = source.match(
    /create\s+view\s+public\.educraft_public_lesson_plan_snapshots[\s\S]*?\bas\s+select([\s\S]*?)from\s+public\.educraft_lesson_plan_publications/i,
  )?.[1] ?? '';

  requireMatch(source, /public_slug\s+text\s+not\s+null\s+unique/i, `${snapshotFile}: public_slug must be database-unique`);
  requireMatch(source, /source_plan_id\s+uuid\s+not\s+null\s+unique/i, `${snapshotFile}: a private plan must have at most one snapshot`);
  requireMatch(source, /enable\s+row\s+level\s+security/i, `${snapshotFile}: snapshot table must enable RLS`);
  requireMatch(source, /force\s+row\s+level\s+security/i, `${snapshotFile}: snapshot table must force RLS`);
  requireMatch(source, /withdrawn_at\s+is\s+null[\s\S]*?profile\.is_listed/i, `${snapshotFile}: public reads must require active content and a listed profile`);
  requireMatch(source, /with\s*\(\s*security_invoker\s*=\s*true\s*,\s*security_barrier\s*=\s*true\s*\)/i, `${snapshotFile}: public view must be a security-invoker barrier`);
  requireMatch(source, /create\s+or\s+replace\s+function\s+public\.educraft_publish_lesson_plan_snapshot[\s\S]*?security\s+definer[\s\S]*?set\s+search_path\s*=\s*''/i, `${snapshotFile}: publish RPC must be SECURITY DEFINER with an empty search_path`);
  requireMatch(source, /where\s+plan\.id\s*=\s*p_plan_id[\s\S]*?plan\.user_id\s*=\s*v_uid/i, `${snapshotFile}: publish RPC must verify ownership`);
  requireMatch(source, /where\s+publication\.source_plan_id\s*=\s*p_plan_id[\s\S]*?publication\.owner_id\s*=\s*v_uid/i, `${snapshotFile}: withdraw RPC must verify ownership`);
  requireMatch(source, /revoke\s+all\s+on\s+table\s+public\.educraft_lesson_plan_publications[\s\S]*?from\s+public\s*,\s*anon\s*,\s*authenticated/i, `${snapshotFile}: direct table privileges must be revoked explicitly`);
  requireMatch(source, /grant\s+execute\s+on\s+function\s+public\.educraft_publish_lesson_plan_snapshot[^;]*to\s+authenticated\s*;/i, `${snapshotFile}: only authenticated users may execute publish`);
  requireMatch(source, /grant\s+execute\s+on\s+function\s+public\.educraft_withdraw_lesson_plan_snapshot[^;]*to\s+authenticated\s*;/i, `${snapshotFile}: only authenticated users may execute withdraw`);
  if (!viewBody) failures.push(`${snapshotFile}: could not isolate the public view projection`);
  for (const privateField of ['plan_json', 'citations_json', 'tags', 'owner_id', 'source_plan_id', 'user_id']) {
    forbidMatch(viewBody, new RegExp(`\\b${privateField}\\b`, 'i'), `${snapshotFile}: public view exposes ${privateField}`);
  }
  forbidMatch(source, /(?:drop|alter|create\s+or\s+replace)\s+view\s+public\.educraft_public_lesson_plans\b/i, `${snapshotFile}: additive migration must not replace the legacy production view`);
  forbidMatch(source, /grant\s+[^;]*(?:insert|update|delete|all)[^;]*on\s+table\s+public\.educraft_lesson_plan_publications[^;]*to\s+(?:anon|authenticated)\s*;/i, `${snapshotFile}: browser roles must not receive direct snapshot writes`);

  try {
    const contract = await readFile(contractPath, 'utf8');
    requireMatch(contract, /^begin\s*;/im, 'Snapshot SQL contract must run in a transaction');
    requireMatch(contract, /^rollback\s*;/im, 'Snapshot SQL contract must roll back');
    requireMatch(contract, /relrowsecurity\s+and\s+relation\.relforcerowsecurity/i, 'Snapshot SQL contract must assert RLS and FORCE RLS');
    requireMatch(contract, /has_function_privilege[\s\S]*?educraft_publish_lesson_plan_snapshot/i, 'Snapshot SQL contract must assert publish RPC privileges');
  } catch {
    failures.push('Missing public snapshot SQL metadata contract');
  }
}

const sourceGovernanceFile = files.find(file => file.endsWith('_add_source_governance.sql'));
if (!sourceGovernanceFile) {
  failures.push('Missing source governance migration');
} else {
  const source = await readFile(path.join(migrationRoot, sourceGovernanceFile), 'utf8');

  requireMatch(source, /create\s+table\s+educraft_private\.educraft_source_reviewers/i, `${sourceGovernanceFile}: reviewer membership must be service-managed`);
  forbidMatch(source, /(?:raw_user_meta_data|user_metadata)/i, `${sourceGovernanceFile}: reviewer authorization must not trust user-editable metadata`);
  for (const table of ['educraft_source_observations', 'educraft_source_reviews', 'educraft_lesson_source_impacts']) {
    requireMatch(source, new RegExp(`alter\\s+table\\s+public\\.${table}\\s+enable\\s+row\\s+level\\s+security`, 'i'), `${sourceGovernanceFile}: ${table} must enable RLS`);
    requireMatch(source, new RegExp(`alter\\s+table\\s+public\\.${table}\\s+force\\s+row\\s+level\\s+security`, 'i'), `${sourceGovernanceFile}: ${table} must force RLS`);
  }
  requireMatch(source, /create\s+view\s+public\.educraft_source_review_statuses\s+with\s*\(\s*security_invoker\s*=\s*true\s*,\s*security_barrier\s*=\s*true\s*\)/i, `${sourceGovernanceFile}: public source status view must be a security-invoker barrier`);
  requireMatch(source, /decision\s*=\s*any\s*\(\s*array\s*\[[\s\S]*?'approved_metadata_only'[\s\S]*?'approved_reusable'[\s\S]*?'rejected'[\s\S]*?'needs_changes'/i, `${sourceGovernanceFile}: metadata approval and reusable approval must be distinct decisions`);
  requireMatch(source, /is_reusable\s+boolean\s+generated\s+always\s+as\s*\([\s\S]*?decision\s*=\s*'approved_reusable'[\s\S]*?'cc by 4\.0'[\s\S]*?\)\s+stored/i, `${sourceGovernanceFile}: reuse state must require reusable approval and an allowlisted license`);
  requireMatch(source, /decision\s*<>\s*'approved_reusable'[\s\S]*?confirmed_license[\s\S]*?'cc by 4\.0'[\s\S]*?rights_url\s+is\s+not\s+null/i, `${sourceGovernanceFile}: reusable approval must require an allowlisted license and rights URL`);
  requireMatch(source, /create\s+or\s+replace\s+function\s+public\.educraft_can_review_sources\(\)[\s\S]*?security\s+definer[\s\S]*?set\s+search_path\s*=\s*''/i, `${sourceGovernanceFile}: reviewer capability RPC must be SECURITY DEFINER with an empty search_path`);
  requireMatch(source, /create\s+or\s+replace\s+function\s+public\.educraft_review_source[\s\S]*?security\s+definer[\s\S]*?set\s+search_path\s*=\s*''/i, `${sourceGovernanceFile}: source review RPC must be SECURITY DEFINER with an empty search_path`);
  requireMatch(source, /from\s+educraft_private\.educraft_source_reviewers[\s\S]*?reviewer\.user_id\s*=\s*v_uid[\s\S]*?reviewer\.is_active/i, `${sourceGovernanceFile}: review RPC must require active service-managed membership`);
  requireMatch(source, /confirmed_license_and_rights_required/i, `${sourceGovernanceFile}: review RPC must reject unknown licensing approval`);
  requireMatch(source, /create\s+policy\s+educraft_lesson_source_impacts_read_own[\s\S]*?plan\.user_id\s*=\s*auth\.uid\(\)/i, `${sourceGovernanceFile}: impact reads must verify lesson-plan ownership`);
  requireMatch(source, /create\s+or\s+replace\s+function\s+public\.educraft_acknowledge_lesson_source_impact[\s\S]*?plan\.user_id\s*=\s*v_uid/i, `${sourceGovernanceFile}: acknowledge RPC must verify lesson-plan ownership`);
  requireMatch(source, /revoke\s+all\s+on\s+table\s+public\.educraft_lesson_source_impacts[\s\S]*?from\s+public\s*,\s*anon\s*,\s*authenticated/i, `${sourceGovernanceFile}: impact write privileges must be revoked explicitly`);
  requireMatch(source, /grant\s+execute\s+on\s+function\s+public\.educraft_review_source[^;]*to\s+authenticated\s*;/i, `${sourceGovernanceFile}: authenticated reviewers must use the review RPC`);
  forbidMatch(source, /grant\s+[^;]*(?:insert|update|delete|all)[^;]*on\s+table\s+public\.educraft_(?:source_observations|source_reviews|lesson_source_impacts)[^;]*to\s+(?:anon|authenticated)\s*;/i, `${sourceGovernanceFile}: browser roles must not receive direct governance writes`);

  try {
    const contract = await readFile(sourceGovernanceContractPath, 'utf8');
    requireMatch(contract, /^begin\s*;/im, 'Source governance SQL contract must run in a transaction');
    requireMatch(contract, /^rollback\s*;/im, 'Source governance SQL contract must roll back');
    requireMatch(contract, /relrowsecurity\s+and\s+relation\.relforcerowsecurity/i, 'Source governance SQL contract must assert RLS and FORCE RLS');
    requireMatch(contract, /raw_user_meta_data\|user_metadata/i, 'Source governance SQL contract must reject metadata-based reviewer authorization');
    requireMatch(contract, /educraft_acknowledge_lesson_source_impact/i, 'Source governance SQL contract must assert owner acknowledgement privileges');
  } catch {
    failures.push('Missing source governance SQL metadata contract');
  }
}

if (failures.length) {
  console.error(failures.map(failure => `- ${failure}`).join('\n'));
  process.exit(1);
}

console.log(`EduCraft migration contracts passed (${files.length} migrations).`);
