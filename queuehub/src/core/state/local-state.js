function cryptoRandom(){try{return crypto.getRandomValues(new Uint32Array(2)).join('')}catch(e){return Math.random().toString(36).slice(2)}}
function defaultState(){return{restaurants:seed,orders:[],events:[],visitor:{id:'qh_'+cryptoRandom(),createdAt:new Date().toISOString(),lastSeenAt:new Date().toISOString(),lastRoute:'/',notificationsEnabled:false},integrations:{}}}
function normalizeState(s){if(!s?.restaurants||!s?.visitor)return null;s.orders=s.orders||[];s.events=s.events||[];s.integrations=s.integrations||{};s.visitor.notificationsEnabled=!!s.visitor.notificationsEnabled;return s}
function load(){const fallback=defaultState();const stored=normalizeState(QueueHubStorage.load(STORAGE));const hydrated=window.QueueHubClientPolicy?.hydrateState?.(stored,fallback)??(stored||fallback);return normalizeState(hydrated)||fallback}
let state=load();
function persist(broadcast=true){state.visitor.lastSeenAt=new Date().toISOString();if(window.QueueHubClientPolicy?.persistState!==false)QueueHubStorage.save(STORAGE,state);if(broadcast&&window.QueueHubClientPolicy?.acceptStateBroadcast!==false)QueueHubRealtime.publish({type:'state',state})}
QueueHubRealtime.subscribe(message=>{if(window.QueueHubClientPolicy?.acceptStateBroadcast===false)return;if(message?.type==='state'){const previous=state;state=normalizeState(message.state)||state;checkNotificationTransitions(previous,state);render()}});
window.addEventListener('pagehide',()=>persist(false));
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')persist(false)});
