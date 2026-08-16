const QueueHubIntegrationCommands={
  save(restaurantId,config){if(!getRestaurant(restaurantId))return{ok:false,reason:'restaurant-not-found'};QueueHubStateRepository.update(s=>{s.integrations[restaurantId]=config;const r=s.restaurants.find(x=>x.id===restaurantId);r.integration=config.type});return{ok:true,config}}
};
