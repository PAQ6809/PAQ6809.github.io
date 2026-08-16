const QueueHubProviders={
  status:{venue:'not-initialized',source:'local',error:null},
  async initialize(){
    const runtime=QueueHubProviderContracts.runtime(window.QueueHubRuntimeConfig);
    const provider=runtime.venueProvider==='supabase'?createQueueHubSupabaseVenueProvider(runtime):QueueHubLocalVenueProvider;
    try{
      const snapshot=await provider.loadSnapshot();
      if(snapshot.source==='supabase'){
        QueueHubStateRepository.update(s=>{s.restaurants=snapshot.restaurants;return true},{broadcast:false});
      }
      this.status={venue:'ready',source:snapshot.source,error:null};
      return this.status;
    }catch(error){
      console.error('[QueueHub] venue provider initialization failed',error);
      if(runtime.failOpenToLocal&&provider.name!=='local'){
        const local=await QueueHubLocalVenueProvider.loadSnapshot();
        this.status={venue:'fallback',source:local.source,error:String(error?.message||error)};
        return this.status;
      }
      this.status={venue:'error',source:provider.name,error:String(error?.message||error)};
      throw error;
    }
  }
};
