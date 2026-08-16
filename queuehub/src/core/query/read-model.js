const QueueHubQueries={
  restaurants(){return QueueHubVenueRepository.restaurants()},
  restaurant(id){return QueueHubVenueRepository.restaurant(id)},
  visitor(){return QueueHubVisitorRepository.visitor()},
  activeOrders(){return QueueHubVisitorRepository.activeOrders()},
  integration(restaurantId){return QueueHubVenueRepository.integration(restaurantId)},
  events(restaurantId,limit=20){const events=QueueHubVenueRepository.events();const list=restaurantId?events.filter(e=>e.restaurantId===restaurantId):events;return list.slice(0,limit)},
  state(){return QueueHubStateRepository.read()},
  orderedOrders(){return this.activeOrders().map(o=>({o,r:this.restaurant(o.restaurantId),s:orderStatus(o)})).filter(x=>x.r).sort((a,b)=>a.s.rank-b.s.rank||a.s.diff-b.s.diff)},
  openRestaurants(){return this.restaurants().filter(r=>r.status==='open')}
};
