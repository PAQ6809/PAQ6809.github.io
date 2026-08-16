function mutateQueue(id,mutator,eventType,number){const r=getRestaurant(id);if(!r)return;const previous=JSON.parse(JSON.stringify(state));mutator(r);r.updated=Date.now();addEvent(r,eventType,number);persist();checkNotificationTransitions(previous,state);render()}
window.adminNext=id=>mutateQueue(id,r=>{r.recent=[r.current,...r.recent].slice(0,3);r.current+=1;r.status='open'},'called',getRestaurant(id)?.current+1);
window.adminSkip=id=>mutateQueue(id,r=>{r.recent=[r.current,...r.recent].slice(0,3);r.current+=2;r.status='open'},'skipped',getRestaurant(id)?.current+1);
window.adminToggle=id=>{const r=getRestaurant(id);const next=r.status==='paused'?'open':'paused';mutateQueue(id,x=>x.status=next,next==='open'?'resumed':'paused',r.current)};
window.adminSet=id=>{const n=Number(document.getElementById('adminSetNumber')?.value);if(!Number.isFinite(n)||n<=0){toast('請輸入有效號碼');return}mutateQueue(id,r=>{r.recent=[r.current,...r.recent].slice(0,3);r.current=n;r.status='open'},'called',n)};
