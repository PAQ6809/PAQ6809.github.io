const QueueHubVisitorRepository={
  visitor(){return QueueHubStateRepository.read().visitor},
  orders(){return QueueHubStateRepository.read().orders},
  activeOrders(){return this.orders().filter(o=>!o.completedAt)},
  addOrder(order){return QueueHubStateRepository.update(s=>{s.orders.push(order);return order})},
  completeOrder(id){return QueueHubStateRepository.update(s=>{const o=s.orders.find(x=>x.id===id);if(!o)return false;o.completedAt=new Date().toISOString();return true})},
  removeOrder(id){return QueueHubStateRepository.update(s=>{const i=s.orders.findIndex(x=>x.id===id);if(i<0)return false;s.orders.splice(i,1);return true})},
  enableNotifications(){return QueueHubStateRepository.update(s=>{s.visitor.notificationsEnabled=true;s.orders.forEach(o=>{if(!o.completedAt)o.notificationsEnabled=true});return true})},
  setLastRoute(route){return QueueHubStateRepository.update(s=>{s.visitor.lastRoute=route;return route},{broadcast:false})}
};
