function cryptoRandom(){try{return crypto.getRandomValues(new Uint32Array(2)).join('')}catch(e){return Math.random().toString(36).slice(2)}}
function defaultState(){return{restaurants:seed,orders:[],events:[],visitor:{id:'qh_'+cryptoRandom(),createdAt:new Date().toISOString(),lastSeenAt:new Date().toISOString(),lastRoute:'/',notificationsEnabled:false},integrations:{}}}
function normalizeState(s){if(!s?.restaurants||!s?.visitor)return null;s.orders=s.orders||[];s.events=s.events||[];s.integrations=s.integrations||{};s.visitor.notificationsEnabled=!!s.visitor.notificationsEnabled;return s}
function load(){return normalizeState(QueueHubStorage.load(STORAGE))||defaultState()}
let state=load();
function persist(broadcast=true){state.visitor.lastSeenAt=new Date().toISOString();QueueHubStorage.save(STORAGE,state);if(broadcast)QueueHubRealtime.publish({type:'state',state})}
QueueHubRealtime.subscribe(message=>{if(message?.type==='state'){const previous=state;state=normalizeState(message.state)||state;checkNotificationTransitions(previous,state);render()}});
window.addEventListener('pagehide',()=>persist(false));
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')persist(false)});
