alter table public.queuehub_order_qr_tokens add column if not exists revoked_by uuid references auth.users(id) on delete set null;
alter table public.queuehub_order_qr_tokens add column if not exists revoked_reason text;
create index if not exists queuehub_order_qr_revoked_by_idx on public.queuehub_order_qr_tokens(revoked_by);

create or replace function public.queuehub_revoke_order_qr_service(p_actor_user_id uuid,p_token_id uuid,p_reason text default null)returns jsonb language plpgsql security definer set search_path=public as $$
declare v_token public.queuehub_order_qr_tokens%rowtype;v_venue_id uuid;v_role text;v_reason text;
begin
  if p_actor_user_id is null then raise exception 'actor required' using errcode='22023';end if;
  if p_token_id is null then raise exception 'token id required' using errcode='22023';end if;
  select * into v_token from public.queuehub_order_qr_tokens where id=p_token_id for update;
  if not found then raise exception 'token not found' using errcode='P0002';end if;
  select venue_id into v_venue_id from public.queuehub_restaurants where id=v_token.restaurant_id and is_active=true;
  if v_venue_id is null then raise exception 'restaurant not found' using errcode='P0002';end if;
  select role into v_role from public.queuehub_staff_members where user_id=p_actor_user_id and venue_id=v_venue_id and is_active=true;
  if v_role not in('operator','manager','admin')then raise exception 'insufficient QR revoke permission' using errcode='42501';end if;
  if v_token.revoked_at is not null then return jsonb_build_object('ok',true,'duplicate',true,'token_id',v_token.id,'revoked_at',v_token.revoked_at);end if;
  v_reason=nullif(left(trim(coalesce(p_reason,'')),200),'');
  update public.queuehub_order_qr_tokens set revoked_at=now(),revoked_by=p_actor_user_id,revoked_reason=v_reason where id=v_token.id returning * into v_token;
  return jsonb_build_object('ok',true,'duplicate',false,'token_id',v_token.id,'revoked_at',v_token.revoked_at);
end;$$;
revoke all on function public.queuehub_revoke_order_qr_service(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.queuehub_revoke_order_qr_service(uuid,uuid,text) to service_role;
