'use strict';

((root) => {
  const TARGET_SCHEMA_VERSION = 1;
  const UNKNOWN_DATE = '1970-01-01T00:00:00.000Z';
  const REVIEW_DEFAULTS = Object.freeze({
    curriculum: 'unverified',
    language: 'unverified',
    privacy: 'unverified',
    licensing: 'unverified',
  });

  const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
  const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
  const pick = (record, key, fallback) => (hasOwn(record, key) ? record[key] : fallback);

  // ponytail: Stored lesson plans are JSON values. This focused clone preserves that boundary;
  // use structuredClone only if binary values or richer prototypes become part of the schema.
  function cloneJson(value) {
    if (Array.isArray(value)) return value.map(cloneJson);
    if (!isRecord(value)) return value;
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cloneJson(item)]));
  }

  function normalizeSchemaVersion(value) {
    return value === undefined || value === null || value === 0 ? TARGET_SCHEMA_VERSION : value;
  }

  function hashJson(value) {
    const text = JSON.stringify(value) ?? '';
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
  }

  function legacyId(value, index) {
    // ponytail: This deterministic non-cryptographic id keeps read-only legacy plans stable.
    // An explicit save can replace it with the platform UUID if collision resistance is needed.
    return `legacy-v0-${index}-${hashJson(value)}`;
  }

  function normalizePlanJson(value) {
    if (!isRecord(value)) return value;
    const meta = isRecord(value.meta) ? value.meta : {};
    return {
      ...value,
      meta: {
        ...meta,
        schemaVersion: normalizeSchemaVersion(meta.schemaVersion),
      },
    };
  }

  function inferOrigin(source) {
    if (hasOwn(source, 'parentPlanId') && source.parentPlanId !== null) return 'duplicate';
    if (source.sourceMode === 'manual') return 'manual';
    if (source.sourceMode === 'chatgpt-transfer') return 'chatgpt-transfer';
    if (source.sourceMode === 'restore') return 'restore';
    return 'generator';
  }

  function normalizeMalformedPlan(input, index) {
    return {
      schemaVersion: TARGET_SCHEMA_VERSION,
      id: legacyId(input, index),
      title: '待修復的舊版教案',
      subject: '',
      grade: null,
      topic: '',
      language: '繁體中文',
      outputLanguage: '繁體中文',
      teachingStyle: '',
      tone: '',
      status: 'draft',
      visibility: 'private',
      sourceMode: 'restore',
      contentMarkdown: '',
      planJson: { meta: { schemaVersion: TARGET_SCHEMA_VERSION } },
      citations: [],
      tags: ['舊資料待修復'],
      versions: [],
      provenance: {
        origin: 'restore',
        parentPlanId: null,
        toolVersion: null,
        inputDigest: null,
      },
      review: { ...REVIEW_DEFAULTS },
      createdAt: UNKNOWN_DATE,
      updatedAt: UNKNOWN_DATE,
      legacyRawValue: cloneJson(input),
    };
  }

  function normalizeLessonPlan(input, options = {}) {
    const index = Number.isInteger(options.index) && options.index >= 0 ? options.index : 0;
    if (!isRecord(input)) return normalizeMalformedPlan(input, index);

    const source = cloneJson(input);
    const rawPlanJson = hasOwn(source, 'planJson')
      ? source.planJson
      : pick(source, 'plan', {});
    const planJson = normalizePlanJson(rawPlanJson);
    const planInput = isRecord(planJson?.meta?.input) ? planJson.meta.input : {};
    const createdAt = source.createdAt ?? source.updatedAt ?? UNKNOWN_DATE;
    const updatedAt = source.updatedAt ?? createdAt;
    const sourceMode = pick(source, 'sourceMode', 'template');
    const provenance = isRecord(source.provenance) ? source.provenance : {};
    const review = isRecord(source.review) ? source.review : {};

    return {
      ...source,
      schemaVersion: normalizeSchemaVersion(source.schemaVersion),
      id: pick(source, 'id', legacyId(input, index)),
      title: pick(source, 'title', planJson?.title ?? planInput.topic ?? '未命名教案'),
      subject: pick(source, 'subject', planInput.subject ?? ''),
      grade: pick(source, 'grade', planInput.grade ?? null),
      topic: pick(source, 'topic', planInput.topic ?? ''),
      language: pick(source, 'language', planInput.language ?? '繁體中文'),
      outputLanguage: pick(
        source,
        'outputLanguage',
        source.language ?? planInput.language ?? '繁體中文',
      ),
      teachingStyle: pick(source, 'teachingStyle', ''),
      tone: pick(source, 'tone', ''),
      status: pick(source, 'status', 'draft'),
      visibility: pick(source, 'visibility', 'private'),
      sourceMode,
      contentMarkdown: hasOwn(source, 'contentMarkdown')
        ? source.contentMarkdown
        : pick(source, 'content', ''),
      planJson,
      citations: pick(source, 'citations', planJson?.citations ?? []),
      tags: pick(source, 'tags', []),
      versions: pick(source, 'versions', []),
      provenance: {
        ...provenance,
        origin: pick(provenance, 'origin', inferOrigin(source)),
        parentPlanId: pick(provenance, 'parentPlanId', source.parentPlanId ?? null),
        toolVersion: pick(provenance, 'toolVersion', null),
        inputDigest: pick(provenance, 'inputDigest', null),
      },
      review: {
        ...review,
        curriculum: pick(review, 'curriculum', REVIEW_DEFAULTS.curriculum),
        language: pick(review, 'language', REVIEW_DEFAULTS.language),
        privacy: pick(review, 'privacy', REVIEW_DEFAULTS.privacy),
        licensing: pick(review, 'licensing', REVIEW_DEFAULTS.licensing),
      },
      createdAt,
      updatedAt,
    };
  }

  function normalizeLessonPlans(plans) {
    if (!Array.isArray(plans)) return [];
    return plans.map((plan, index) => normalizeLessonPlan(plan, { index }));
  }

  function normalizeLessonPlanBackup(backup) {
    const source = cloneJson(backup);
    if (!isRecord(source) || !Array.isArray(source.plans)) return source;
    return { ...source, plans: normalizeLessonPlans(source.plans) };
  }

  root.EduCraftLessonPlanNormalizer = Object.freeze({
    TARGET_SCHEMA_VERSION,
    normalizeLessonPlan,
    normalizeLessonPlans,
    normalizeLessonPlanBackup,
  });
})(globalThis);
