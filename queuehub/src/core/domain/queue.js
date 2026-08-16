function fmtAgo(ts){const s=Math.max(0,Math.floor((Date.now()-ts)/1000));if(s<60)return `${s} 秒前`;if(s<3600)return `${Math.floor(s/60)} 分鐘前`;return `${Math.floor(s/3600)} 小時前`}
function estimate(r,ahead=8){return Math.max(1,Math.ceil(Math.max(0,ahead)*r.avg/60))}
function statusText(r){return r.status==='open'?'叫號中':r.status==='paused'?'暫停':'已結束'}
function getRestaurant(id){return QueueHubQueries.restaurant(id)}
function activeOrders(){return QueueHubQueries.activeOrders()}
function orderStatus(order,sourceState=QueueHubQueries.state()){const r=sourceState.restaurants.find(x=>x.id===order.restaurantId);if(!r)return{diff:999,label:'資料異常',cls:'waiting',estimate:0,rank:99};const diff=order.ticketNumber-r.current;if(diff<0)return{diff,label:'可能已過號',cls:'soon',estimate:0,rank:0};if(diff===0)return{diff,label:'正在叫你的號碼',cls:'soon',estimate:0,rank:1};if(diff<=order.notificationLead)return{diff,label:`快到了 · 剩約 ${diff} 組`,cls:'soon',estimate:estimate(r,diff),rank:2};return{diff,label:`等待中 · 前面約 ${diff} 組`,cls:'waiting',estimate:estimate(r,diff),rank:3}}
function currentQueueSession(r){return `${new Date().toISOString().slice(0,10).replaceAll('-','')}-${r.id}-demo`}
