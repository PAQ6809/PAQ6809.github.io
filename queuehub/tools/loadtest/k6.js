import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errors = new Rate('queuehub_errors');
const statusLatency = new Trend('queue_status_latency', true);

const SUPABASE_URL = String(__ENV.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_PUBLISHABLE_KEY = __ENV.SUPABASE_PUBLISHABLE_KEY || '';
const VENUE_SLUG = __ENV.VENUE_SLUG || 'beichen';
const PROFILE = __ENV.PROFILE || 'free-safe';
const TARGET_3000_GATE = 'YES_I_HAVE_3000_CAPACITY_AND_A_STAGING_TARGET';

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error('Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY.');
}
if (PROFILE === 'target-3000' && __ENV.ALLOW_TARGET_3000 !== TARGET_3000_GATE) {
  throw new Error(`3,000-user profile is locked. Set ALLOW_TARGET_3000=${TARGET_3000_GATE} only for an approved staging target with sufficient quota.`);
}

const profiles = {
  smoke: {
    executor: 'constant-vus',
    vus: 5,
    duration: '25s',
  },
  'free-safe': {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '30s', target: 25 },
      { duration: '45s', target: 75 },
      { duration: '45s', target: 150 },
      { duration: '2m', target: 150 },
      { duration: '30s', target: 0 },
    ],
    gracefulRampDown: '20s',
  },
  'target-3000': {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '2m', target: 500 },
      { duration: '3m', target: 1500 },
      { duration: '3m', target: 3000 },
      { duration: '5m', target: 3000 },
      { duration: '2m', target: 0 },
    ],
    gracefulRampDown: '30s',
  },
};

if (!profiles[PROFILE]) throw new Error(`Unknown PROFILE: ${PROFILE}`);

export const options = {
  scenarios: { public_rest_recovery: profiles[PROFILE] },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    queuehub_errors: ['rate<0.01'],
    http_req_duration: ['p(95)<800', 'p(99)<1500'],
    queue_status_latency: ['p(95)<800'],
  },
};

const headers = {
  apikey: SUPABASE_PUBLISHABLE_KEY,
  Accept: 'application/json',
};

export function setup() {
  const venueUrl = `${SUPABASE_URL}/rest/v1/queuehub_venues?select=id,slug&slug=eq.${encodeURIComponent(VENUE_SLUG)}&limit=1`;
  const response = http.get(venueUrl, { headers, tags: { name: 'resolve_venue' } });
  const ok = check(response, {
    'venue lookup returns 200': (r) => r.status === 200,
    'venue exists': (r) => {
      try {
        const rows = r.json();
        return Array.isArray(rows) && rows.length === 1 && !!rows[0].id;
      } catch (_) {
        return false;
      }
    },
  });
  if (!ok) throw new Error(`Unable to resolve QueueHub venue ${VENUE_SLUG}.`);
  return { venueId: response.json()[0].id };
}

export default function (data) {
  const select = 'id,slug,name,category,avg_seconds_per_ticket,is_active,queuehub_queue_status(current_number,recent_numbers,state,source,version,updated_at,queue_session_id)';
  const url = `${SUPABASE_URL}/rest/v1/queuehub_restaurants?select=${encodeURIComponent(select)}&venue_id=eq.${encodeURIComponent(data.venueId)}&is_active=eq.true&order=name.asc`;
  const started = Date.now();
  const response = http.get(url, {
    headers,
    tags: { name: 'authoritative_queue_snapshot', profile: PROFILE },
  });
  statusLatency.add(Date.now() - started);

  const ok = check(response, {
    'snapshot returns 200': (r) => r.status === 200,
    'snapshot returns restaurants': (r) => {
      try {
        const rows = r.json();
        return Array.isArray(rows) && rows.length > 0;
      } catch (_) {
        return false;
      }
    },
  });
  errors.add(!ok);

  // Mirrors QueueHub recovery/resync behavior rather than 1-second polling.
  sleep(PROFILE === 'smoke' ? 1 : 5 + Math.random() * 10);
}

// Safe examples:
// docker run --rm -v "$PWD:/work" -w /work \
//   -e SUPABASE_URL -e SUPABASE_PUBLISHABLE_KEY -e PROFILE=smoke \
//   grafana/k6:2.1.0 run queuehub/tools/loadtest/k6.js
//
// The target-3000 profile is intentionally locked and must NOT be run against
// the current shared Free-plan Supabase project.
