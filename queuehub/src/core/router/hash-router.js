function path(){return location.hash.replace(/^#/,'')||'/'}
function routeBase(){return path().split('?')[0]}
function routeParams(){return new URLSearchParams(path().split('?')[1]||'')}
function go(p){location.hash=p}
window.go=go;
window.addEventListener('hashchange',()=>{state.visitor.lastRoute=path();persist(false);render();handleDeepLink()});
