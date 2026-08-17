import http from 'k6/http';
import ws from 'k6/ws';
import { check } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const joinSuccess = new Rate('realtime_join_success');
const realtimeErrors = new Rate('realtime_errors');
const joinLatency = new Trend('realtime_join_latency', true);
const broadcastReceived = new Rate('realtime_broadcast_received');

const SUPABASE_URL = String(__ENV.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_PUBLISHABLE_KEY = __ENV.SUPABASE_PUBLISHABLE_KEY || '';
const VENUE_SLUG = __ENV.VENUE_SLUG || 'beichen';
const PROFILE = __ENV.PROFILE || 'smoke';
const EXPECT_BROADCAST = __ENV.EXPECT_BROADCAST === '1';
const HOLD_SECONDS = Math.max(10, Number(__ENV.HOLD_SECONDS || (PROFILE === 'smoke' ? 20 : PROFILE === 'baseline-100' ? 45 : 120)));
const TARGET_3000_GATE = 'YES_I_HAVE_3000_REALTIME_CAPACITY_AND_A_STAGING_TARGET';

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error('Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY.');
}
if (PROFILE === 'target-3000' && __ENV.ALLOW_TARGET_3000 !== TARGET_3000_GATE) {
  throw new Error(`3,000-connection profile is locked. Set ALLOW_TARGET_3000=${TARGET_3000_GATE} only after quota and staging approval.`);
}

const profiles = {
  smoke: {
    executor: 'per-vu-iterations',
    vus: 5,
    iterations: 1,
    maxDuration: '60s',
  },
  'baseline-100': {
    // 100 connections uses at most half of the current Free-plan 200-connection quota.
    executor: 'per-vu-iterations',
    vus: 100,
    iterations: 1,
    maxDuration: '90s',
  },
  'free-safe': {
    // 150 leaves limited headroom under the current Free-plan 200-connection quota.
    executor: 'per-vu-iterations',
    vus: 150,
    iterations: 1,
    maxDuration: '3m',
  },
  'target-3000': {
    executor: 'per-vu-iterations',
    vus: 3000,
    iterations: 1,
    maxDuration: '3m',
  },
};

if (!profiles[PROFILE]) throw new Error(`Unknown PROFILE: ${PROFILE}`);

export const options = {
  scenarios: { realtime_connections: profiles[PROFILE] },
  thresholds: {
    realtime_join_success: ['rate>0.99'],
    realtime_errors: ['rate<0.01'],
    realtime_join_latency: ['p(95)<3000', 'p(99)<5000'],
    ws_connecting: ['p(95)<3000'],
    ...(EXPECT_BROADCAST ? { realtime_broadcast_received: ['rate>0.99'] } : {}),
  },
};

const restHeaders = {
  apikey: SUPABASE_PUBLISHABLE_KEY,
  Accept: 'application/json',
};

export function setup() {
  const venueUrl = `${SUPABASE_URL}/rest/v1/queuehub_venues?select=id,slug&slug=eq.${encodeURIComponent(VENUE_SLUG)}&limit=1`;
  const response = http.get(venueUrl, { headers: restHeaders, tags: { name: 'resolve_realtime_venue' } });
  const ok = check(response, {
    'realtime venue lookup returns 200': (r) => r.status === 200,
    'realtime venue exists': (r) => {
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
  const wsBase = SUPABASE_URL.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:');
  const socketUrl = `${wsBase}/realtime/v1/websocket?apikey=${encodeURIComponent(SUPABASE_PUBLISHABLE_KEY)}&vsn=1.0.0`;
  const topic = `realtime:queuehub:venue:${data.venueId}:queue`;
  const joinRef = `${__VU}-${__ITER}-join`;
  const started = Date.now();
  let recorded = false;
  let joined = false;
  let broadcastSeen = false;

  const response = ws.connect(socketUrl, { tags: { name: 'queuehub_realtime', profile: PROFILE } }, (socket) => {
    socket.on('open', () => {
      socket.send(JSON.stringify({
        topic,
        event: 'phx_join',
        payload: {
          config: {
            broadcast: { ack: false, self: false },
            presence: { key: '', enabled: false },
            postgres_changes: [],
            private: false,
          },
        },
        ref: joinRef,
        join_ref: joinRef,
      }));
    });

    socket.on('message', (raw) => {
      let message;
      try {
        message = JSON.parse(raw);
      } catch (_) {
        return;
      }

      if (message.event === 'phx_reply' && String(message.ref) === joinRef && !recorded) {
        const ok = message.payload?.status === 'ok';
        recorded = true;
        joined = ok;
        joinSuccess.add(ok);
        joinLatency.add(Date.now() - started);
        if (!ok) {
          realtimeErrors.add(true);
          socket.close();
        }
      }

      const queueBroadcast =
        (message.event === 'broadcast' && message.payload?.event === 'queue_status') ||
        message.event === 'queue_status';
      if (queueBroadcast) broadcastSeen = true;
    });

    socket.on('error', () => {
      realtimeErrors.add(true);
      if (!recorded) {
        recorded = true;
        joinSuccess.add(false);
      }
    });

    socket.setInterval(() => {
      if (!joined) return;
      const ref = `${__VU}-${__ITER}-hb-${Date.now()}`;
      socket.send(JSON.stringify({ topic: 'phoenix', event: 'heartbeat', payload: {}, ref }));
    }, 20000);

    socket.setTimeout(() => socket.close(), HOLD_SECONDS * 1000);
  });

  const handshakeOk = check(response, {
    'websocket handshake returns 101': (r) => !!r && r.status === 101,
  });
  if (!handshakeOk) realtimeErrors.add(true);
  if (!recorded) {
    joinSuccess.add(false);
    realtimeErrors.add(true);
  }
  if (EXPECT_BROADCAST) broadcastReceived.add(broadcastSeen);
}

// This script opens exactly one Realtime connection per VU.
// Smoke = 5, baseline-100 = 100, free-safe = 150 connections.
// EXPECT_BROADCAST=1 requires an external, authorized QueueHub DB update while
// the sockets are connected and validates DB trigger -> Broadcast -> client.
// target-3000 is hard-gated and must not be used on the current shared Free plan.
