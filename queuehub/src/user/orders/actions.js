window.trackOrder=(restaurantId,ticketNumber,options={})=>{
  const lead=Number(document.getElementById('lead')?.value||options.lead||3);
  const result=QueueHubOrderCommands.track({restaurantId,ticketNumber,queueSessionId:options.queueSessionId,orderToken:options.orderToken,lead});
  if(!result.ok){if(result.reason==='limit')toast('最多同時追蹤 10 張取餐單');if(result.reason==='duplicate'&&!options.silent){toast('這張取餐單已經在追蹤中');go('/my-orders')}return false}
  toast(`${result.restaurant.name} #${ticketNumber} 已加入我的取餐`);if(options.navigate!==false)go('/my-orders');return true;
};
window.completeOrder=id=>{if(!QueueHubOrderCommands.complete(id))return;toast('已標記完成');render()};
window.removeOrder=id=>{if(!QueueHubOrderCommands.remove(id))return;toast('已移除取餐單');render()};
