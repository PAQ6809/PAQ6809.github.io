const QueueHubClientPolicy={
  mode:'standard',
  allowPersonalOrders:true,
  allowNotifications:true,
  persistState:true,
  acceptStateBroadcast:true,
  sanitizeRoute(route){return typeof route==='string'&&route?route:'/'},
  hydrateState(stored,fallback){return stored||fallback}
};
window.QueueHubClientPolicy=QueueHubClientPolicy;
