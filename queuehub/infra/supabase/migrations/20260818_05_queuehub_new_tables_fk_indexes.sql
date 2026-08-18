create index if not exists queuehub_gateway_dead_letters_device_idx on public.queuehub_gateway_dead_letters(device_id) where device_id is not null;
create index if not exists queuehub_gateway_dead_letters_restaurant_idx on public.queuehub_gateway_dead_letters(restaurant_id) where restaurant_id is not null;
create index if not exists queuehub_tracked_orders_restaurant_idx on public.queuehub_tracked_orders(restaurant_id);
create index if not exists queuehub_tracked_orders_queue_session_idx on public.queuehub_tracked_orders(queue_session_id);
