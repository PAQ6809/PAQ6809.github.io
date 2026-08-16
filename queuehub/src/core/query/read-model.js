const QueueHubQueries={
  state(){return QueueHubStateRepository.read()},
  restaurants(){return this.state().restaurants},
  restaurant(id){return this.restaurants().find(r=>r.id===id)},
  visitor(){return this.state().visitor},
  activeOrders(){return this.state().orders.filter(o=>!o.completedAt)},
  integration(restaurantId){return this.state().integrations[restaurantId]},
  events(restaurantId,limit=20){const events=this.state().events;const list=restaurantId?events.filter(e=>e.restaurantId===restaurantId):events;return list.slice(0,limit)},
  orderedOrders(){return this.activeOrders().map(o=>({o,r:this.restaurant(o.restaurantId),s:orderStatus(o)})).filter(x=>x.r).sort((a,b)=>a.s.rank-b.s.rank||a.s.diff-b.s.diff)},
  openRestaurants(){return this.restaurants().filter(r=>r.status==='open')}
};
