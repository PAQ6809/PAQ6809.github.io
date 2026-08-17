const QueueHubMobilePwa={
  async registerServiceWorker(){return QueueHubServiceWorkerClient.register()},
  async restoreNotifications(){if(window.QueueHubClientPolicy?.allowNotifications===false)return false;if(!window.QueueHubWebPush)return false;return QueueHubWebPush.restore()},
  async initialize(){await this.registerServiceWorker();return this.restoreNotifications()},
  async enableNotifications(){if(window.QueueHubClientPolicy?.allowNotifications===false)return{granted:false,background:false,reason:'client-policy'};if(!window.QueueHubWebPush)throw new Error('背景推播模組尚未載入');return QueueHubWebPush.enable()},
  async registerOrderWatch(order){if(window.QueueHubClientPolicy?.allowNotifications===false||window.QueueHubClientPolicy?.allowPersonalOrders===false)return false;if(!window.QueueHubWebPush)return false;return QueueHubWebPush.registerOrder(order)},
  async removeOrderWatch(order){if(window.QueueHubClientPolicy?.allowNotifications===false||window.QueueHubClientPolicy?.allowPersonalOrders===false)return false;if(!window.QueueHubWebPush)return false;return QueueHubWebPush.removeOrder(order)},
  async showNotification({title,body,tag,url}){if(window.QueueHubClientPolicy?.allowNotifications===false)return false;if(!('Notification'in window)||Notification.permission!=='granted')return false;const reg=await QueueHubServiceWorkerClient.ready();if(reg){await reg.showNotification(title,{body,tag,data:{url},icon:'./icons/icon-192.png',badge:'./icons/icon-192.png'});return true}try{new Notification(title,{body});return true}catch{return false}}
};
window.QueueHubMobilePwa=QueueHubMobilePwa;
window.requestQueueNotifications=async()=>{try{const result=await QueueHubMobilePwa.enableNotifications();if(!result.granted){toast(result.reason==='client-policy'?'此裝置模式不保存個人通知':'通知沒有開啟，可繼續使用網頁追蹤');return}toast(result.background?'背景取餐提醒已開啟':'取餐提醒已開啟；此瀏覽器目前只支援頁面開啟時通知');render()}catch(error){console.warn(error);toast(error.message||'通知開啟失敗')}};
