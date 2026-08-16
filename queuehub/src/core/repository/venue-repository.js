const QueueHubVenueRepository={
  restaurants(){return QueueHubStateRepository.read().restaurants},
  restaurant(id){return this.restaurants().find(r=>r.id===id)},
  integrations(){return QueueHubStateRepository.read().integrations},
  integration(id){return this.integrations()[id]},
  events(){return QueueHubStateRepository.read().events},
  mutateRestaurant(id,mutator,options={}){return QueueHubStateRepository.update(s=>{const r=s.restaurants.find(x=>x.id===id);if(!r)return{ok:false,reason:'restaurant-not-found'};return mutator(r,s)},options)},
  saveIntegration(id,config){return QueueHubStateRepository.update(s=>{const r=s.restaurants.find(x=>x.id===id);if(!r)return{ok:false,reason:'restaurant-not-found'};s.integrations[id]=config;r.integration=config.type;return{ok:true,config}})}
};
