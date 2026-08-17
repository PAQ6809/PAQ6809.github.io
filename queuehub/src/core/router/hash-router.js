function path(){return location.hash.replace(/^#/,'')||'/'}
function routeBase(){return path().split('?')[0]}
function routeParams(){return new URLSearchParams(path().split('?')[1]||'')}
function safeRoute(route){return window.QueueHubClientPolicy?.sanitizeRoute?.(route)||route||'/'}
function persistentPath(){const base=routeBase();if(base==='/redeem')return'/';const params=routeParams();params.delete('token');const query=params.toString();return query?`${base}?${query}`:base}
function go(p){location.hash=safeRoute(p)}
window.go=go;
const initialRoute=path();const initialSafe=safeRoute(initialRoute);if(initialSafe!==initialRoute)history.replaceState(null,'',`${location.pathname}${location.search}#${initialSafe}`);
window.addEventListener('hashchange',()=>{const current=path();const safe=safeRoute(current);if(safe!==current)history.replaceState(null,'',`${location.pathname}${location.search}#${safe}`);QueueHubVisitorRepository.setLastRoute(persistentPath());render();handleDeepLink()});
