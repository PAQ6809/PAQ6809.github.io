function cryptoRandom(){try{return crypto.getRandomValues(new Uint32Array(2)).join('')}catch(e){return Math.random().toString(36).slice(2)}}
function defaultState(){return{restaurants:seed,orders:[],events:[],visitor:{id:'qh_'+cryptoRandom(),createdAt:new Date().toISOString(),lastSeenAt:new Date().toISOString(),lastRoute:'/',notificationsEnabled:false},integrations:{}}}
function load(){try{const s=JSON.parse(localStorage.getItem(STORAGE));if(s?.restaurants&&s?.visitor){s.orders=s.orders||[];s.events=s.events||[];s.integrations=s.integrations||{};s.visitor.notificationsEnabled=!!s.visitor.notificationsEnabled;return s}}catch(e){}return defaultState()}
let state=load();
function persist(broadcast=true){state.visitor.lastSeenAt=new Date().toISOString();localStorage.setItem(STORAGE,JSON.stringify(state));if(broadcast)channel?.postMessage({type:'state',state})}
channel?.addEventListener('message',e=>{if(e.data?.type==='state'){const previous=state;state=e.data.state;checkNotificationTransitions(previous,state);render()}});
window.addEventListener('pagehide',()=>persist(false));
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')persist(false)});
