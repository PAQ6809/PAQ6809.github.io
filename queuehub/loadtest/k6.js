import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errors = new Rate('queuehub_errors');
const statusLatency = new Trend('queue_status_latency', true);

const BASE_URL = __ENV.BASE_URL;
if (!BASE_URL) throw new Error('Set BASE_URL to the production QueueHub API origin before running this test.');

export const options = {
  scenarios: {
    venue_peak: {
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
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    queuehub_errors: ['rate<0.01'],
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    queue_status_latency: ['p(95)<350'],
  },
};

const restaurantIds = (__ENV.RESTAURANT_IDS || 'demo-r01,demo-r02,demo-r03,demo-r04,demo-r05,demo-r06,demo-r07,demo-r08').split(',');

export default function () {
  // Models a visitor who keeps only the queues they care about fresh.
  const restaurantId = restaurantIds[Math.floor(Math.random() * restaurantIds.length)];
  const started = Date.now();
  const response = http.get(`${BASE_URL}/api/queue/status?restaurantId=${encodeURIComponent(restaurantId)}`, {
    headers: { Accept: 'application/json' },
    tags: { name: 'queue_status' },
  });
  statusLatency.add(Date.now() - started);

  const ok = check(response, {
    'status endpoint returns 200': (r) => r.status === 200,
    'status payload is JSON': (r) => (r.headers['Content-Type'] || '').includes('application/json'),
  });
  errors.add(!ok);

  // Real production clients should primarily use WebSocket/SSE fanout rather than
  // polling once per second. This low-frequency read models reconnect/state recovery.
  sleep(5 + Math.random() * 10);
}

// Run only against a dedicated staging environment you control:
// k6 run -e BASE_URL=https://staging.example.com -e RESTAURANT_IDS=<comma-separated UUIDs> loadtest/k6.js
// Do NOT aim this at restaurant vendors or third-party systems without permission.
