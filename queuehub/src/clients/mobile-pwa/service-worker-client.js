const QueueHubServiceWorkerClient={
  supported(){return window.QueueHubClientProfile?.supportsServiceWorker??('serviceWorker'in navigator)},
  async register(){
    if(!this.supported())return null;
    try{
      const registration=await navigator.serviceWorker.register('./sw.js',{scope:'./'});
      QueueHubDiagnostics?.count('pwa_service_worker_register_success');
      return registration;
    }catch(error){
      QueueHubDiagnostics?.count('pwa_service_worker_register_error');
      console.warn('[QueueHub] service worker registration failed',error);
      return null;
    }
  },
  async ready(){
    if(!this.supported())return null;
    try{return await navigator.serviceWorker.ready}catch(error){console.warn('[QueueHub] service worker ready failed',error);return null}
  }
};
window.QueueHubServiceWorkerClient=QueueHubServiceWorkerClient;
