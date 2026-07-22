import assert from 'node:assert/strict';
import test from 'node:test';

import '../../app-governance.js';

const {
  isReusableSource,
  matchLessonSourceImpacts,
  summarizeRegistry,
} = globalThis.EduCraftGovernance;

const currentSource = {
  sourceId: 'official-curriculum',
  title: '正式課綱',
  canonicalUrl: 'https://example.edu/curriculum',
  reviewStatus: 'approved',
  license: 'unknown',
  contentDigest: 'b'.repeat(64),
};

test('source approval never implies reproduction permission', () => {
  assert.equal(isReusableSource(currentSource), false);
  assert.equal(isReusableSource({ ...currentSource, license: 'All rights reserved' }), false);
  assert.equal(isReusableSource({ ...currentSource, license: 'CC BY 4.0' }), true);
  assert.deepEqual(summarizeRegistry({ records: [currentSource] }), {
    total: 1,
    approved: 1,
    unknownLicense: 1,
    reusable: 0,
  });
});

test('an approved digest change marks a precisely linked lesson for review without mutation', () => {
  const plan = {
    id: 'plan-1',
    title: '水循環',
    citations: [{ sourceId: currentSource.sourceId, contentDigest: 'a'.repeat(64) }],
  };
  const untouched = structuredClone(plan);
  const notices = matchLessonSourceImpacts([plan], { records: [currentSource] });

  assert.deepEqual(plan, untouched);
  assert.deepEqual(notices, [{
    planId: 'plan-1',
    cloudPlanId: null,
    planTitle: '水循環',
    sourceId: currentSource.sourceId,
    sourceTitle: currentSource.title,
    previousDigest: 'a'.repeat(64),
    currentDigest: 'b'.repeat(64),
    status: 'needs_review',
  }]);
});

test('matching uses an exact source id or canonical URL and never guesses missing evidence', () => {
  const registry = { records: [currentSource] };
  const plans = [
    { id: 'same', citations: [{ sourceId: currentSource.sourceId, contentDigest: currentSource.contentDigest }] },
    { id: 'url', citations: [{ canonicalUrl: currentSource.canonicalUrl, sourceDigest: 'a'.repeat(64) }] },
    { id: 'unknown', citations: [{ sourceId: 'similar-name', contentDigest: 'a'.repeat(64) }] },
    { id: 'no-digest', citations: [{ sourceId: currentSource.sourceId }] },
    { id: 'bad-digest', citations: [{ sourceId: currentSource.sourceId, contentDigest: 'not-a-digest' }] },
    { id: 'conflict', citations: [{ sourceId: currentSource.sourceId, canonicalUrl: 'https://example.edu/other', contentDigest: 'a'.repeat(64) }] },
  ];
  registry.records.push({ ...currentSource, sourceId: 'other', canonicalUrl: 'https://example.edu/other' });

  assert.deepEqual(matchLessonSourceImpacts(plans, registry).map(item => item.planId), ['url']);
});

test('unreviewed source changes do not notify or alter a teacher lesson', () => {
  const changed = { ...currentSource, reviewStatus: 'changes_detected' };
  const plan = { id: 'plan-1', citations: [{ sourceId: changed.sourceId, contentDigest: 'a'.repeat(64) }] };
  assert.deepEqual(matchLessonSourceImpacts([plan], { records: [changed] }), []);
});
