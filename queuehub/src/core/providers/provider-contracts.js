const QueueHubProviderContracts={
  venueSnapshot(snapshot){
    if(!snapshot||!Array.isArray(snapshot.restaurants))throw new Error('invalid venue snapshot');
    for(const r of snapshot.restaurants){
      if(!r||typeof r.id!=='string'||typeof r.name!=='string'||!Number.isFinite(Number(r.current)))throw new Error('invalid restaurant snapshot');
    }
    return snapshot;
  },
  runtime(config){
    if(!config||!['local','supabase'].includes(config.venueProvider))throw new Error('invalid venueProvider');
    if(config.venueProvider==='supabase'&&(!config.supabase?.url||!config.supabase?.publishableKey))throw new Error('supabase runtime config missing');
    return config;
  }
};
