const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const profileSource=fs.readFileSync('queuehub/src/clients/runtime-profile.js','utf8');
const clientPolicySource=fs.readFileSync('queuehub/src/core/client/client-policy.js','utf8');
const kioskPolicySource=fs.readFileSync('queuehub/src/clients/kiosk/policy.js','utf8');

function createContext(search='?mode=kiosk'){
  const timers=new Map();
  let timerId=0;
  const listeners={};
  const dataset={};
  const context={
    console,
    URLSearchParams,
    Date,
    Math,
    location:{search,pathname:'/queuehub/',hash:'#/admin'},
    navigator:{userAgent:'QueueHub Kiosk Test',standalone:false,maxTouchPoints:1},
    matchMedia(){return{matches:false}},
    setTimeout(fn,delay){const id=++timerId;timers.set(id,{fn,delay});return id},
    clearTimeout(id){timers.delete(id)},
    history:{replaceState(){}},
    document:{documentElement:{clientWidth:1280,dataset}},
    window:{
      innerWidth:1280,
      isSecureContext:true,
      addEventListener(name,fn){listeners[name]=fn}
    }
  };
  context.window.window=context.window;
  context.window.location=context.location;
  context.window.navigator=context.navigator;
  context.window.document=context.document;
  context.window.history=context.history;
  context.window.QueueHubDiagnostics={count(){}};
  return{context,timers,listeners,dataset};
}

{
  const {context,timers,listeners,dataset}=createContext('?mode=kiosk');
  vm.createContext(context);
  vm.runInContext(profileSource,context,{filename:'runtime-profile.js'});
  vm.runInContext(clientPolicySource,context,{filename:'client-policy.js'});
  vm.runInContext(kioskPolicySource,context,{filename:'kiosk-policy.js'});

  const profile=context.window.QueueHubClientProfile;
  const policy=context.window.QueueHubClientPolicy;
  assert.equal(profile.kiosk,true,'explicit kiosk mode should produce kiosk profile');
  assert.equal(profile.desktop,false,'kiosk must not also be desktop');
  assert.equal(profile.supportsPush,false,'kiosk must not advertise personal Push');
  assert.equal(dataset.qhClient,'kiosk','document client marker should be kiosk');
  assert.equal(policy.mode,'kiosk','client policy should enter kiosk mode');
  assert.equal(policy.allowPersonalOrders,false,'kiosk must deny personal order state');
  assert.equal(policy.allowNotifications,false,'kiosk must deny personal notifications');
  assert.equal(policy.persistState,false,'kiosk must not persist visitor state');
  assert.equal(policy.acceptStateBroadcast,false,'kiosk must ignore local personal-state broadcasts');
  assert.equal(policy.sanitizeRoute('/admin'),'/','admin route must be rejected');
  assert.equal(policy.sanitizeRoute('/integrations'),'/','integration route must be rejected');
  assert.equal(policy.sanitizeRoute('/my-orders'),'/','personal orders route must be rejected');
  assert.equal(policy.sanitizeRoute('/redeem?token=secret'),'/','secure redeem route must not run on a public kiosk');
  assert.equal(policy.sanitizeRoute('/restaurant/harbor-noodles'),'/restaurant/harbor-noodles','public restaurant route should be allowed');
  assert.equal(policy.sanitizeRoute('/board'),'/board','public board route should be allowed');
  assert.ok(context.window.QueueHubKiosk?.active,'kiosk controller should be active');
  assert.ok(timers.size===1,'idle reset timer should be armed');
  assert.ok(listeners.pointerdown&&listeners.touchstart&&listeners.keydown,'activity listeners should be registered');
}

{
  const {context,dataset}=createContext('');
  vm.createContext(context);
  vm.runInContext(profileSource,context,{filename:'runtime-profile.js'});
  vm.runInContext(clientPolicySource,context,{filename:'client-policy.js'});
  const profile=context.window.QueueHubClientProfile;
  const policy=context.window.QueueHubClientPolicy;
  assert.equal(profile.kiosk,false,'normal URL must not enter kiosk mode');
  assert.equal(policy.mode,'standard');
  assert.equal(policy.allowPersonalOrders,true);
  assert.equal(policy.persistState,true);
  assert.notEqual(dataset.qhClient,'kiosk');
}

console.log('QueueHub kiosk client policy behavior smoke: PASS');
