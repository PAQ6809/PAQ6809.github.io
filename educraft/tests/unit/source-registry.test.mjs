import assert from 'node:assert/strict';
import test from 'node:test';

import {
  canonicalizeVisibleText,
  digestBody,
  loadRegistry,
  monitorRegistry,
  validateRegistry,
} from '../../scripts/source-registry.mjs';

test('official source registry satisfies the provenance contract', async () => {
  const registry = await loadRegistry();
  assert.deepEqual(validateRegistry(registry), []);
  assert.equal(registry.records.length, 5);
  for (const source of registry.records) {
    assert.equal(source.official, true);
    assert.equal(source.license, 'unknown');
    assert.match(source.rightsUrl, /^https:\/\//);
    assert.match(source.contentDigest, /^[a-f0-9]{64}$/);
  }
});

test('visible-text digest ignores volatile form and script data', () => {
  const first = '<main>Official <form><input name="csrf" value="one"></form><script>now=1</script> source</main>';
  const second = '<main>Official<form><input name="csrf" value="two"></form><script>now=2</script> source</main>';
  assert.equal(canonicalizeVisibleText(first), 'Official source');
  assert.equal(digestBody(first, 'text/html'), digestBody(second, 'text/html'));
  assert.notEqual(digestBody(first, 'text/html'), digestBody(second.replace('source', 'updated'), 'text/html'));
});

test('visible-text normalization decodes entities only once', () => {
  assert.equal(
    canonicalizeVisibleText('<p>&amp;lt;script&amp;gt; &amp;amp;</p>'),
    '&lt;script&gt; &amp;',
  );
});

test('temporary external failures produce a read-only report without mutating the registry', async () => {
  const registry = await loadRegistry();
  const before = JSON.stringify(registry);
  const report = await monitorRegistry(registry, {
    fetchImpl: async () => { throw new TypeError('temporary upstream failure'); },
  });

  assert.equal(report.readOnly, true);
  assert.equal(report.summary.unavailable, registry.records.length);
  assert.equal(report.summary.reviewRequired, registry.records.length);
  assert.equal(JSON.stringify(registry), before);
});

test('unknown licensing remains visible as a review item without changing source health', async () => {
  const registry = await loadRegistry();
  registry.records = registry.records.slice(0, 1);
  const source = registry.records[0];
  const body = '<main>stable source</main>';
  source.contentDigest = digestBody(body, 'text/html');
  const report = await monitorRegistry(registry, {
    fetchImpl: async () => new Response(body, {
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    }),
  });

  assert.equal(report.results[0].health, 'healthy');
  assert.equal(report.results[0].licenseStatus, 'unknown');
  assert.equal(report.summary.unknownLicense, 1);
  assert.equal(report.summary.reviewRequired, 1);
});

test('validator rejects duplicate or non-canonical sources', async () => {
  const registry = structuredClone(await loadRegistry());
  registry.records[1].sourceId = registry.records[0].sourceId;
  registry.records[1].canonicalUrl = `${registry.records[0].canonicalUrl}#copy`;
  const errors = validateRegistry(registry);
  assert.ok(errors.some(error => error.includes('sourceId must be unique')));
  assert.ok(errors.some(error => error.includes('without credentials or a fragment')));
});
