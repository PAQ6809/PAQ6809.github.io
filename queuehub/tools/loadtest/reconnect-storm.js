import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const initialJoinSuccess = new Rate('reconnect_initial_join_success');
const secondJoinSuccess = new Rate('reconnect_second_join_success');
const reconnectErrors = new Rate('reconnect_errors');
const initialJoinLatency = new Trend('reconnect_initial_join_latency', true);
const secondJoinLatency = new Trend('reconnect_second_join_latency', true);

const SUPABASE_URL = String(__ENV.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_PUBLISHABLE_KEY = __ENV.SUPABASE_PUBLISHABLE_KEY || '';
const VENUE_SLUG = __ENV.VENUE_SLUG || 'beichen';
const VUS = Math.min(50, Math.max(1, Number(__ENV.RECONNECT_VUS || 50)));
const HOLD_SECONDS = Math.min(10, Math.max(3, Number(__ENV.HOLD_SECONDS || 5)));

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error('Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY.');
}

export const options = {
  scenarios: {
    reconnect_storm: {
      executor: 'per-vu-iterations',
      vus: VUS,
      iterations: 1,
      maxDuration: '60s',
    },
  },
  thresholds: {
    reconnect_initial_join_success: ['rate>0.99'],
    reconnect_second_join_success: ['rate>0.99'],
    reconnect_errors: ['rate<0.01'],
    reconnect_initial_join_latency: ['p(95)<3000', 'p(99)<5000'],
    reconnect_second_join_latency: ['p(95)<3000', 'p(99)<5000'],
    ws_connecting: ['p(95)<3000'],
  },
};

const restHeaders = { apikey: SUPABASE_PUBLISHABLE_KEY, Accept: 'application/json' };

export function setup() {
  const venueUrl = `${SUPABASE_URL}/rest/v1/queuehub_venues?select=id,slug&slug=eq.${encodeURIComponent(VENUE_SLUG)}&limit=1`;
  const response = http.get(venueUrl, { headers: restHeaders, tags: { name: 'resolve_reconnect_venue' } });
  const ok = check(response, {
    'reconnect venue lookup returns 200': (r) => r.status === 200,
    'reconnect venue exists': (r) => {
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

function connectOnce(data, phase) {
  const wsBase = SUPABASE_URL.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:');
  const socketUrl = `${wsBase}/realtime/v1/websocket?apikey=${encodeURIComponent(SUPABASE_PUBLISHABLE_KEY)}&vsn=1.0.0`;
  const topic = `realtime:queuehub:venue:${data.venueId}:queue`;
  const joinRef = `${__VU}-${phase}-${Date.now()}`;
  const started = Date.now();
  let recorded = false;
  let joined = false;

  const response = ws.connect(socketUrl, { tags: { name: `queuehub_reconnect_${phase}` } }, (socket) => {
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
      try { message = JSON.parse(raw); } catch (_) { return; }
      if (message.event === 'phx_reply' && String(message.ref) === joinRef && !recorded) {
        const ok = message.payload?.status === 'ok';
        recorded = true;
        joined = ok;
        const latency = Date.now() - started;
        if (phase === 'initial') {
          initialJoinSuccess.add(ok);
          initialJoinLatency.add(latency);
        } else {
          secondJoinSuccess.add(ok);
          secondJoinLatency.add(latency);
        }
        if (!ok) {
          reconnectErrors.add(true);
          socket.close();
        }
      }
    });

    socket.on('error', () => {
      reconnectErrors.add(true);
      if (!recorded) {
        recorded = true;
        if (phase === 'initial') initialJoinSuccess.add(false);
        else secondJoinSuccess.add(false);
      }
    });

    socket.setTimeout(() => socket.close(), HOLD_SECONDS * 1000);
  });

  const handshakeOk = check(response, {
    [`${phase} websocket handshake returns 101`]: (r) => !!r && r.status === 101,
  });
  if (!handshakeOk) reconnectErrors.add(true);
  if (!recorded) {
    if (phase === 'initial') initialJoinSuccess.add(false);
    else secondJoinSuccess.add(false);
    reconnectErrors.add(true);
  }
  return joined && handshakeOk;
}

export default function (data) {
  connectOnce(data, 'initial');
  // Represents browser reconnect jitter so all clients do not hit the service at the exact same millisecond.
  sleep(0.25 + Math.random() * 1.25);
  connectOnce(data, 'second');
}

// Safe production baseline only: RECONNECT_VUS is hard-capped at 50.
// This validates connection -> disconnect -> jitter -> reconnect behavior without
// consuming more than one quarter of the current 200-connection Free-plan quota.
