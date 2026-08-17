const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

(async()=>{
  const source=fs.readFileSync('queuehub/src/core/realtime/reconnect-controller.js','utf8');
  const timers=new Map();
  let timerId=0;
  let restartCalls=0;
  let resyncCalls=0;
  const counts=[];
  const health=[];
  const windowListeners={};
  const documentListeners={};
  const fakeMath=Object.create(Math);
  fakeMath.random=()=>0.25;

  const context={
    console,
    Date,
    Math:fakeMath,
    navigator:{onLine:true},
    setTimeout(fn,delay){const id=++timerId;timers.set(id,{fn,delay});return id},
    clearTimeout(id){timers.delete(id)},
    window:{
      QueueHubRuntimeConfig:{venueProvider:'supabase'},
      addEventListener(name,fn){windowListeners[name]=fn}
    },
    document:{
      visibilityState:'visible',
      addEventListener(name,fn){documentListeners[name]=fn}
    },
    QueueHubDiagnostics:{
      count(name,meta={}){counts.push({name,meta})},
      gauge(name,value,meta={}){counts.push({name:`gauge:${name}`,meta:{value,...meta}})},
      timing(name,durationMs,meta={}){counts.push({name:`timing:${name}`,meta:{durationMs,...meta}})}
    },
    QueueHubRuntimeHealth:{
      syncBanner(){},
      markReconnectScheduled(attempt,reason,nextAt){health.push({type:'scheduled',attempt,reason,nextAt})},
      markReconnectAttempt(attempt,reason){health.push({type:'attempt',attempt,reason})},
      markReconnectSuccess(attempt,reason){health.push({type:'success',attempt,reason})},
      markReconnectFailure(attempt,reason,error){health.push({type:'failure',attempt,reason,error:String(error)})},
      clearReconnectSchedule(reason){health.push({type:'clear',reason})}
    },
    QueueHubSupabaseRealtime:{
      status:'channel_error',
      scheduleResync(){resyncCalls+=1},
      async restart(){restartCalls+=1;return true}
    }
  };
  context.window.QueueHubRuntimeHealth=context.QueueHubRuntimeHealth;
  context.window.QueueHubDiagnostics=context.QueueHubDiagnostics;
  context.window.QueueHubSupabaseRealtime=context.QueueHubSupabaseRealtime;

  vm.createContext(context);
  vm.runInContext(source,context,{filename:'reconnect-controller.js'});
  const controller=context.window.QueueHubReconnectController;
  assert.ok(controller,'controller should be exported to window');
  assert.ok(windowListeners.online&&windowListeners.offline,'online/offline listeners should be bound');
  assert.ok(documentListeners.visibilitychange,'visibility listener should be bound');

  assert.equal(controller.schedule('channel_error'),true,'first error should schedule reconnect');
  assert.equal(timers.size,1,'one reconnect timer should exist');
  const [firstId,firstTimer]=[...timers.entries()][0];
  assert.ok(firstTimer.delay>=1000&&firstTimer.delay<=1350,`first delay should include bounded jitter, got ${firstTimer.delay}`);
  assert.equal(controller.schedule('timed_out'),false,'duplicate error should coalesce');
  assert.equal(timers.size,1,'coalescing must keep one timer');
  assert.ok(counts.some(x=>x.name==='reconnect_coalesced'),'coalesced event should be observable');

  timers.delete(firstId);
  await firstTimer.fn();
  assert.equal(restartCalls,1,'scheduled reconnect should call restart once');
  assert.equal(controller.attempt,1,'attempt should increment after restart');
  assert.ok(health.some(x=>x.type==='attempt'&&x.attempt===1),'attempt should be reflected in health');

  controller.observeStatus('SUBSCRIBED');
  assert.equal(controller.attempt,0,'SUBSCRIBED should reset backoff attempt');
  assert.ok(counts.some(x=>x.name==='reconnect_success'),'successful recovery should be counted');

  context.navigator.onLine=false;
  assert.equal(controller.schedule('channel_error'),false,'offline state should defer reconnect');
  assert.equal(timers.size,0,'offline state should not create timer');
  assert.ok(counts.some(x=>x.name==='reconnect_deferred_offline'),'offline defer should be observable');

  context.navigator.onLine=true;
  context.QueueHubSupabaseRealtime.status='channel_error';
  controller.wake('online');
  assert.equal(resyncCalls,1,'online wake should request authoritative resync');
  assert.equal(timers.size,1,'online wake should schedule fast reconnect when disconnected');
  const fastTimer=[...timers.values()][0];
  assert.ok(fastTimer.delay>=100&&fastTimer.delay<=500,`wake reconnect should use fast jitter, got ${fastTimer.delay}`);

  controller.cancel('test-end',{resetAttempt:true});
  assert.equal(timers.size,0,'cancel should clear pending timer');
  console.log('QueueHub reconnect controller behavior smoke: PASS');
})().catch(error=>{
  console.error(error);
  process.exit(1);
});
