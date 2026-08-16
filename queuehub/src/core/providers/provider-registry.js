const QueueHubProviders={
  status:{venue:'not-initialized',source:'local',error:null},
  _venueProvider:null,
  _runtime:null,
  hydrateVenue(snapshot,{broadcast=false,notify=false,renderAfter=false}={}){
    if(snapshot?.venue){venue.dbId=snapshot.venue.id;venue.name=snapshot.venue.name||venue.name;venue.capacityTarget=snapshot.venue.capacityTarget||venue.capacityTarget}
    if(snapshot?.source==='supabase')QueueHubStateRepository.update(s=>{s.restaurants=snapshot.restaurants;return true},{broadcast,notify,renderAfter});
    return snapshot;
  },
  async initialize(){
    const runtime=QueueHubProviderContracts.runtime(window.QueueHubRuntimeConfig);this._runtime=runtime;
    const provider=runtime.venueProvider==='supabase'?createQueueHubSupabaseVenueProvider(runtime):QueueHubLocalVenueProvider;this._venueProvider=provider;
    try{const snapshot=await provider.loadSnapshot();this.hydrateVenue(snapshot);this.status={venue:'ready',source:snapshot.source,error:null};return this.status}
    catch(error){console.error('[QueueHub] venue provider initialization failed',error);if(runtime.failOpenToLocal&&provider.name!=='local'){const local=await QueueHubLocalVenueProvider.loadSnapshot();this.status={venue:'fallback',source:local.source,error:String(error?.message||error)};return this.status}this.status={venue:'error',source:provider.name,error:String(error?.message||error)};throw error}
  },
  async refreshVenue({broadcast=true,notify=true,renderAfter=false}={}){
    const provider=this._venueProvider||QueueHubLocalVenueProvider;
    try{const snapshot=await provider.loadSnapshot();this.hydrateVenue(snapshot,{broadcast,notify,renderAfter});this.status={venue:'ready',source:snapshot.source,error:null};return snapshot}
    catch(error){this.status={venue:'error',source:provider.name,error:String(error?.message||error)};throw error}
  }
};
