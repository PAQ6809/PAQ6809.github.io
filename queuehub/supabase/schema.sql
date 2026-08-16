-- QueueHub production-oriented PostgreSQL/Supabase schema.
-- This file is scaffolding only; it is NOT automatically applied to a Supabase project.
-- Browser clients should never receive vendor API secrets or service-role credentials.

create extension if not exists pgcrypto;

create table if not exists public.venues (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  timezone text not null default 'Asia/Taipei',
  capacity_target integer not null default 3000 check (capacity_target > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.restaurants (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  slug text not null,
  name text not null,
  category text not null,
  zone text,
  is_active boolean not null default true,
  avg_seconds_per_ticket integer not null default 45 check (avg_seconds_per_ticket > 0),
  created_at timestamptz not null default now(),
  unique (venue_id, slug)
);

create table if not exists public.queue_sessions (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  business_date date not null,
  label text,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  unique (restaurant_id, id)
);

create table if not exists public.queue_status (
  restaurant_id uuid primary key references public.restaurants(id) on delete cascade,
  queue_session_id uuid not null references public.queue_sessions(id) on delete cascade,
  current_number integer not null default 0 check (current_number >= 0),
  recent_numbers integer[] not null default '{}',
  state text not null default 'open' check (state in ('open','paused','closed')),
  source text not null default 'manual' check (source in ('api','webhook','manual','gateway')),
  version bigint not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.queue_events (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  queue_session_id uuid not null references public.queue_sessions(id) on delete cascade,
  sequence bigint not null,
  event_type text not null check (event_type in ('called','skipped','paused','resumed','reset')),
  number integer,
  source text not null check (source in ('api','webhook','manual','gateway')),
  occurred_at timestamptz not null default now(),
  idempotency_key text,
  unique (restaurant_id, queue_session_id, sequence),
  unique (idempotency_key)
);

create table if not exists public.visitor_sessions (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  -- Store only a one-way hash of any anonymous recovery secret.
  recovery_secret_hash text,
  last_route text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days'
);

create table if not exists public.tracked_orders (
  id uuid primary key default gen_random_uuid(),
  visitor_session_id uuid not null references public.visitor_sessions(id) on delete cascade,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  queue_session_id uuid not null references public.queue_sessions(id) on delete cascade,
  ticket_number integer not null check (ticket_number > 0),
  order_token_hash text,
  notification_lead integer not null default 3 check (notification_lead in (1,3,5,10)),
  notifications_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (visitor_session_id, restaurant_id, queue_session_id, ticket_number)
);

create table if not exists public.integration_configs (
  restaurant_id uuid primary key references public.restaurants(id) on delete cascade,
  integration_type text not null check (integration_type in ('api','webhook','manual','gateway')),
  api_endpoint text,
  webhook_path text,
  polling_interval_seconds integer check (polling_interval_seconds is null or polling_interval_seconds >= 1),
  api_key_secret_name text,
  gateway_device_id text,
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

create index if not exists restaurants_venue_active_idx on public.restaurants(venue_id, is_active);
create index if not exists queue_sessions_restaurant_date_idx on public.queue_sessions(restaurant_id, business_date desc);
create index if not exists queue_events_restaurant_session_seq_idx on public.queue_events(restaurant_id, queue_session_id, sequence desc);
create index if not exists queue_events_occurred_idx on public.queue_events(occurred_at desc);
create index if not exists tracked_orders_session_active_idx on public.tracked_orders(visitor_session_id, completed_at) where completed_at is null;
create index if not exists tracked_orders_restaurant_active_idx on public.tracked_orders(restaurant_id, queue_session_id) where completed_at is null;
create index if not exists visitor_sessions_expiry_idx on public.visitor_sessions(expires_at);

-- Public screens may read venue/restaurant/latest queue status only.
alter table public.venues enable row level security;
alter table public.restaurants enable row level security;
alter table public.queue_status enable row level security;
alter table public.queue_sessions enable row level security;
alter table public.queue_events enable row level security;
alter table public.visitor_sessions enable row level security;
alter table public.tracked_orders enable row level security;
alter table public.integration_configs enable row level security;

create policy "public read venues" on public.venues for select using (true);
create policy "public read active restaurants" on public.restaurants for select using (is_active = true);
create policy "public read queue status" on public.queue_status for select using (true);

-- Deliberately no public INSERT/UPDATE/DELETE policies.
-- Queue ingest, visitor-session recovery, tracked-order mutation and integration config
-- should go through authenticated server/Edge Functions that validate signed tokens.

-- Realtime publication: apply only after reviewing the Supabase project configuration.
-- alter publication supabase_realtime add table public.queue_status;
