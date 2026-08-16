-- Public Broadcast is used only as an invalidation signal. Browser clients re-fetch
-- the server-authoritative queue snapshot instead of trusting broadcast payload values.
create or replace function public.queuehub_broadcast_queue_status()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_venue_id uuid;
begin
 select r.venue_id into v_venue_id from public.queuehub_restaurants r where r.id=new.restaurant_id;
 if v_venue_id is not null then
   perform realtime.send(jsonb_build_object('restaurant_id',new.restaurant_id,'queue_session_id',new.queue_session_id,'current_number',new.current_number,'recent_numbers',new.recent_numbers,'state',new.state,'source',new.source,'version',new.version,'updated_at',new.updated_at),'queue_status','queuehub:venue:'||v_venue_id::text||':queue',false);
 end if;
 return new;
end;$$;
drop trigger if exists queuehub_queue_status_broadcast_trigger on public.queuehub_queue_status;
create trigger queuehub_queue_status_broadcast_trigger after insert or update on public.queuehub_queue_status for each row execute function public.queuehub_broadcast_queue_status();
do $$ begin if exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='queuehub_queue_status') then alter publication supabase_realtime drop table public.queuehub_queue_status; end if; end $$;
