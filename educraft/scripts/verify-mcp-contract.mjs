import assert from 'node:assert/strict';

const endpoint = process.env.EDUCRAFT_MCP_ENDPOINT || 'https://goedzzhhvvnfczgnkqlv.supabase.co/functions/v1/educraft-mcp';
const target = new URL(endpoint);
assert.equal(target.protocol, 'https:', 'MCP target must use HTTPS');
console.log(`TARGET MCP ${target.hostname}${target.pathname}`);
const allowMutation = process.env.EDUCRAFT_MCP_ALLOW_MUTATION === '1';
const baseHeaders = {
  accept: 'application/json, text/event-stream',
  'content-type': 'application/json',
};
let requestId = 0;
let sessionId = '';
let protocolVersion = '';

function headers() {
  return {
    ...baseHeaders,
    ...(sessionId ? { 'mcp-session-id': sessionId } : {}),
    ...(protocolVersion ? { 'mcp-protocol-version': protocolVersion } : {}),
  };
}

async function jsonRequest(label, options) {
  const response = await fetch(endpoint, { ...options, signal: AbortSignal.timeout(15_000) });
  assert.equal(response.status, 200, `${label}: HTTP ${response.status}`);
  assert.match(response.headers.get('content-type') ?? '', /^application\/json\b/i, `${label}: expected JSON`);
  sessionId ||= response.headers.get('mcp-session-id') ?? '';
  try {
    return await response.json();
  } catch {
    throw new Error(`${label}: invalid JSON`);
  }
}

async function rpc(method, params = {}) {
  const id = ++requestId;
  const envelope = await jsonRequest(method, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
  });
  assert.equal(envelope.jsonrpc, '2.0', `${method}: invalid JSON-RPC version`);
  assert.equal(envelope.id, id, `${method}: response id mismatch`);
  assert.equal(envelope.error, undefined, `${method}: JSON-RPC error ${envelope.error?.code ?? 'unknown'}`);
  assert.ok(envelope.result && typeof envelope.result === 'object', `${method}: missing result`);
  return envelope.result;
}

async function callTool(name, args = {}) {
  const result = await rpc('tools/call', { name, arguments: args });
  assert.notEqual(result.isError, true, `${name}: tool returned an error`);
  assert.ok(Array.isArray(result.content) && result.content.length > 0, `${name}: missing content`);
  return result;
}

function assertNoTransferFields(value) {
  if (Array.isArray(value)) return value.forEach(assertNoTransferFields);
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    assert.doesNotMatch(key, /(claim|transfer|token|secret|password)/i, `draft: unexpected sensitive field ${key}`);
    assertNoTransferFields(child);
  }
}

const health = await jsonRequest('health', { method: 'GET', headers: { accept: 'application/json' } });
assert.equal(health.status, 'ok', 'health: status is not ok');
assert.equal(typeof health.name, 'string', 'health: missing name');
assert.equal(typeof health.version, 'string', 'health: missing version');
console.log(`PASS health (${health.version})`);

const initialized = await rpc('initialize', {
  protocolVersion: '2024-11-05',
  capabilities: {},
  clientInfo: { name: 'educraft-contract-check', version: '0.1.0' },
});
assert.equal(typeof initialized.protocolVersion, 'string', 'initialize: missing protocol version');
assert.equal(typeof initialized.serverInfo?.name, 'string', 'initialize: missing server name');
assert.equal(typeof initialized.serverInfo?.version, 'string', 'initialize: missing server version');
assert.ok(initialized.capabilities?.tools, 'initialize: tools capability missing');
protocolVersion = initialized.protocolVersion;
console.log(`PASS initialize (${protocolVersion})`);

const notification = await fetch(endpoint, {
  method: 'POST',
  headers: headers(),
  body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized', params: {} }),
  signal: AbortSignal.timeout(15_000),
});
assert.equal(notification.status, 202, `notifications/initialized: HTTP ${notification.status}`);
console.log('PASS notifications/initialized');

const listed = await rpc('tools/list');
assert.ok(Array.isArray(listed.tools), 'tools/list: missing tools');
const tools = new Map(listed.tools.map(tool => [tool.name, tool]));
for (const name of ['get_lesson_plan_options', 'create_lesson_plan_draft', 'save_draft_to_educraft']) {
  assert.ok(tools.has(name), `tools/list: missing ${name}`);
}
const draftSchema = tools.get('create_lesson_plan_draft').inputSchema;
assert.equal(draftSchema?.type, 'object', 'draft schema: expected object');
for (const field of ['grade', 'subject', 'topic', 'teaching_style', 'learning_objectives', 'lesson_flow', 'originality_note', 'safety_privacy_check']) {
  assert.ok(draftSchema.required?.includes(field), `draft schema: ${field} must be required`);
}
assert.equal(draftSchema.properties?.grade?.minimum, 1, 'draft schema: grade minimum changed');
assert.equal(draftSchema.properties?.grade?.maximum, 6, 'draft schema: grade maximum changed');
assert.equal(draftSchema.properties?.teaching_style?.enum?.length, 10, 'draft schema: teaching styles changed');
console.log(`PASS tools/list (${listed.tools.length} tools; required schemas present)`);

const options = await callTool('get_lesson_plan_options');
assert.ok(options.structuredContent?.subjects, 'options: subjects missing');
assert.ok(options.structuredContent?.styles, 'options: styles missing');
assert.ok(options.structuredContent?.languages, 'options: languages missing');
console.log('PASS get_lesson_plan_options');

const draft = await callTool('create_lesson_plan_draft', {
  title: 'Synthetic contract test lesson',
  grade: 5,
  subject: 'Natural Science',
  topic: 'Water cycle concept check',
  teaching_style: 'fiveE',
  language: 'Traditional Chinese',
  output_language: 'Traditional Chinese',
  sessions: 1,
  minutes_per_session: 40,
  class_context: 'Synthetic contract test with no real class or student data.',
  design_rationale: 'Use a concept map to check understanding of the water cycle.',
  learning_objectives: ['Describe the relationship between evaporation, condensation, and precipitation.'],
  lesson_flow: [{
    phase: 'Explore and explain',
    minutes: 40,
    teacher_guidance: 'Use a diagram to prompt an explanation of changes in water state.',
    student_activity: 'Complete and explain a concept map.',
    evidence: 'The map contains the correct stages and causal links.',
  }],
  formative_assessment: ['Review the links in the concept map.'],
  summative_assessment: ['Explain the water cycle in a short paragraph.'],
  differentiation: {
    support: 'Provide vocabulary cards.',
    advanced: 'Compare different climate conditions.',
    accommodations: 'Allow an oral response.',
  },
  multilingual_support: [],
  originality_note: 'Synthetic contract content; it does not copy or imitate another lesson plan.',
  safety_privacy_check: ['Contains no identifiable student data.'],
  sources: [],
});
assert.ok(draft.structuredContent?.plan && typeof draft.structuredContent.plan === 'object', 'draft: plan missing');
assertNoTransferFields(draft.structuredContent);
console.log('PASS create_lesson_plan_draft (response content redacted)');

if (allowMutation) {
  const saved = await callTool('save_draft_to_educraft', { plan: draft.structuredContent.plan });
  assert.ok(saved.structuredContent || saved.content.length, 'save: missing response');
  console.log('PASS save_draft_to_educraft (mutation opted in; response redacted)');
} else {
  console.log('SKIP save_draft_to_educraft (set EDUCRAFT_MCP_ALLOW_MUTATION=1 to opt in)');
}
