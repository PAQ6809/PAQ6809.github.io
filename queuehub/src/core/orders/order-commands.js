const QueueHubOrderCommands={
  track({restaurantId,ticketNumber,queueSessionId,orderToken,lead=3}){
    const r=QueueHubVenueRepository.restaurant(restaurantId);if(!r)return{ok:false,reason:'restaurant-not-found'};
    const active=QueueHubVisitorRepository.activeOrders();if(active.length>=10)return{ok:false,reason:'limit'};
    const session=queueSessionId||currentQueueSession(r);if(active.some(o=>o.restaurantId===restaurantId&&o.queueSessionId===session&&o.ticketNumber===ticketNumber))return{ok:false,reason:'duplicate'};
    const notificationLead=[1,3,5,10].includes(Number(lead))?Number(lead):3;const visitor=QueueHubVisitorRepository.visitor();
    const order={id:'ord_'+cryptoRandom(),visitorSessionId:visitor.id,restaurantId,queueSessionId:session,ticketNumber,orderToken:orderToken||undefined,notificationLead,notificationsEnabled:visitor.notificationsEnabled,createdAt:new Date().toISOString(),completedAt:null};
    QueueHubVisitorRepository.addOrder(order);return{ok:true,order,restaurant:r};
  },
  complete(id){return QueueHubVisitorRepository.completeOrder(id)},
  remove(id){return QueueHubVisitorRepository.removeOrder(id)}
};
