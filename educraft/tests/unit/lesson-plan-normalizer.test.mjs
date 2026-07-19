import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import '../../lesson-plan-normalizer.js';

const {
  TARGET_SCHEMA_VERSION,
  normalizeLessonPlan,
  normalizeLessonPlans,
  normalizeLessonPlanBackup,
} = globalThis.EduCraftLessonPlanNormalizer;

async function fixture(name) {
  const url = new URL(`../fixtures/${name}`, import.meta.url);
  return JSON.parse(await readFile(url, 'utf8'));
}

test('v0 normalization is lossless, deterministic and private by default', async () => {
  const legacy = await fixture('lesson-plan-v0.json');
  const untouched = structuredClone(legacy);
  const normalized = normalizeLessonPlan(legacy, { index: 3 });

  assert.deepEqual(legacy, untouched, 'normalizer must not mutate the source');
  assert.equal(normalized.schemaVersion, TARGET_SCHEMA_VERSION);
  assert.match(normalized.id, /^legacy-v0-3-[a-z0-9]+$/);
  assert.equal(normalizeLessonPlan(legacy, { index: 3 }).id, normalized.id);
  assert.equal(normalized.title, legacy.title);
  assert.equal(normalized.subject, legacy.plan.meta.input.subject);
  assert.equal(normalized.grade, legacy.plan.meta.input.grade);
  assert.equal(normalized.contentMarkdown, legacy.content);
  assert.equal(normalized.visibility, 'private');
  assert.equal(normalized.status, 'draft');
  assert.equal(normalized.updatedAt, legacy.createdAt);
  assert.equal(normalized.planJson.meta.schemaVersion, TARGET_SCHEMA_VERSION);
  assert.deepEqual(normalized.planJson.customUnknown, legacy.plan.customUnknown);
  assert.deepEqual(normalized.plan, legacy.plan, 'legacy plan alias must remain available');
  assert.deepEqual(normalized.legacyRoot, legacy.legacyRoot);
  assert.deepEqual(normalized.backupPayload, legacy.backupPayload);
  assert.deepEqual(normalizeLessonPlan(normalized), normalized, 'normalization must be idempotent');
});

test('existing v1 values and unknown fields remain byte-for-byte equivalent as JSON', async () => {
  const current = await fixture('lesson-plan-v1.json');
  const normalized = normalizeLessonPlan(current);

  assert.deepEqual(normalized, current);
  assert.equal(JSON.stringify(normalized), JSON.stringify(current));
});

test('explicit empty Markdown wins over a populated legacy content alias', () => {
  const normalized = normalizeLessonPlan({
    id: 'empty-markdown',
    contentMarkdown: '',
    content: '# must not replace the explicit empty value',
    planJson: { meta: { input: {} } },
  });

  assert.equal(normalized.contentMarkdown, '');
  assert.equal(normalized.content, '# must not replace the explicit empty value');
});

test('backup normalization preserves container data and only adapts its plans', async () => {
  const backup = await fixture('educraft-backup-v2.json');
  const untouched = structuredClone(backup);
  const normalized = normalizeLessonPlanBackup(backup);

  assert.deepEqual(backup, untouched, 'backup source must not be mutated');
  assert.equal(normalized.version, backup.version);
  assert.equal(normalized.exportedAt, backup.exportedAt);
  assert.deepEqual(normalized.favorites, backup.favorites);
  assert.deepEqual(normalized.preferences, backup.preferences);
  assert.deepEqual(normalized.futureBackupField, backup.futureBackupField);
  assert.equal(normalized.plans[0].schemaVersion, TARGET_SCHEMA_VERSION);
  assert.equal(normalized.plans[0].contentMarkdown, backup.plans[0].content);
  assert.deepEqual(normalized.plans[0].planJson.backupOnlyJson, { keep: true });
  assert.equal(normalized.plans[0].unknownPlanField, '保留');
});

test('plan list wraps malformed legacy entries without deleting their raw values', () => {
  const values = [null, 'raw legacy value', 7];
  const normalized = normalizeLessonPlans(values);

  assert.equal(normalized.length, values.length);
  assert(normalized.every(value => value.title === '待修復的舊版教案'));
  assert.deepEqual(normalized.map(value => value.legacyRawValue), values);
  assert(normalized.every(value => value.visibility === 'private'));
});
