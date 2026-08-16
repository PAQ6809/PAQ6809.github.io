const QueueHubRealtime=(()=>{
  const channel='BroadcastChannel' in window?new BroadcastChannel(CHANNEL):null;
  const listeners=new Set();
  channel?.addEventListener('message',event=>listeners.forEach(listener=>listener(event.data)));
  return{
    kind:channel?'broadcast-channel':'none',
    publish(message){channel?.postMessage(message)},
    subscribe(listener){listeners.add(listener);return()=>listeners.delete(listener)},
    close(){channel?.close();listeners.clear()}
  };
})();
