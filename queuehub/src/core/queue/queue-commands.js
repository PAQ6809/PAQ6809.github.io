const QueueHubQueueCommands={
  mutate(id,change){return QueueHubVenueRepository.mutateRestaurant(id,(r,s)=>{const event=change(r)||{};r.updated=Date.now();appendQueueEvent(s,r,event.type,event.number);return{ok:true,restaurant:r,event}},{notify:true,renderAfter:true})},
  next(id){return this.mutate(id,r=>{const number=r.current+1;r.recent=[r.current,...r.recent].slice(0,3);r.current=number;r.status='open';return{type:'called',number}})},
  skip(id){return this.mutate(id,r=>{const skipped=r.current+1;r.recent=[r.current,...r.recent].slice(0,3);r.current+=2;r.status='open';return{type:'skipped',number:skipped}})},
  toggle(id){return this.mutate(id,r=>{r.status=r.status==='paused'?'open':'paused';return{type:r.status==='open'?'resumed':'paused',number:r.current}})},
  set(id,number){if(!Number.isFinite(number)||number<=0)return{ok:false,reason:'invalid-number'};return this.mutate(id,r=>{r.recent=[r.current,...r.recent].slice(0,3);r.current=number;r.status='open';return{type:'called',number}})}
};
