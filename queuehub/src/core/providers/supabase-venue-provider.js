function createQueueHubSupabaseVenueProvider(runtime){
  const http=createQueueHubSupabaseHttpClient(runtime.supabase);let venueCache=null;
  async function getVenue(){if(venueCache)return venueCache;const venues=await http.get('queuehub_venues',{select:'id,slug,name,capacity_target',slug:`eq.${runtime.venueSlug}`,limit:'1'});if(!venues.length)throw new Error(`QueueHub venue not found: ${runtime.venueSlug}`);venueCache=venues[0];return venueCache}
  return Object.freeze({
    name:'supabase',
    async loadSnapshot(){
      const v=await getVenue();
      const rows=await http.get('queuehub_restaurants',{select:'id,slug,name,category,avg_seconds_per_ticket,is_active,queuehub_queue_status(current_number,recent_numbers,state,source,version,updated_at,queue_session_id)',venue_id:`eq.${v.id}`,is_active:'eq.true',order:'name.asc'});
      const restaurants=rows.map(row=>{const joined=Array.isArray(row.queuehub_queue_status)?row.queuehub_queue_status[0]:row.queuehub_queue_status;const q=joined||{};return{id:row.slug,dbId:row.id,name:row.name,category:row.category,aliases:[],current:Number(q.current_number||0),recent:Array.isArray(q.recent_numbers)?q.recent_numbers:[],status:q.state||'closed',avg:Number(row.avg_seconds_per_ticket||45),updated:q.updated_at?new Date(q.updated_at).getTime():Date.now(),integration:q.source||'manual',queueSessionId:q.queue_session_id||null,version:Number(q.version||0)}});
      return QueueHubProviderContracts.venueSnapshot({source:'supabase',venue:{id:v.id,slug:v.slug,name:v.name,capacityTarget:v.capacity_target},restaurants});
    }
  });
}
