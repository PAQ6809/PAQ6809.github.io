function path(){return location.hash.replace(/^#/,'')||'/'}
function routeBase(){return path().split('?')[0]}
function routeParams(){return new URLSearchParams(path().split('?')[1]||'')}
function persistentPath(){const base=routeBase();if(base==='/redeem')return'/';const params=routeParams();params.delete('token');const query=params.toString();return query?`${base}?${query}`:base}
function go(p){location.hash=p}
window.go=go;
window.addEventListener('hashchange',()=>{QueueHubVisitorRepository.setLastRoute(persistentPath());render();handleDeepLink()});
