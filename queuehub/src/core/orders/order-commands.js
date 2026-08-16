const QueueHubOrderCommands={
  track({restaurantId,ticketNumber,queueSessionId,orderToken,lead=3}){
    const r=getRestaurant(restaurantId);if(!r)return{ok:false,reason:'restaurant-not-found'};
    const active=activeOrders();if(active.length>=10)return{ok:false,reason:'limit'};
    const session=queueSessionId||currentQueueSession(r);
    if(active.some(o=>o.restaurantId===restaurantId&&o.queueSessionId===session&&o.ticketNumber===ticketNumber))return{ok:false,reason:'duplicate'};
    const notificationLead=[1,3,5,10].includes(Number(lead))?Number(lead):3;
    const order={id:'ord_'+cryptoRandom(),visitorSessionId:state.visitor.id,restaurantId,queueSessionId:session,ticketNumber,orderToken:orderToken||undefined,notificationLead,notificationsEnabled:state.visitor.notificationsEnabled,createdAt:new Date().toISOString(),completedAt:null};
    QueueHubStateRepository.update(s=>s.orders.push(order));
    return{ok:true,order,restaurant:r};
  },
  complete(id){return QueueHubStateRepository.update(s=>{const o=s.orders.find(x=>x.id===id);if(!o)return false;o.completedAt=new Date().toISOString();return true})},
  remove(id){return QueueHubStateRepository.update(s=>{const i=s.orders.findIndex(x=>x.id===id);if(i<0)return false;s.orders.splice(i,1);return true})}
};
