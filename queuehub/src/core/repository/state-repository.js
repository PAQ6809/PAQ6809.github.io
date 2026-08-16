const QueueHubStateRepository={
  read(){return state},
  update(mutator,{broadcast=true,notify=false,renderAfter=false}={}){
    const previous=notify?JSON.parse(JSON.stringify(state)):null;
    const result=mutator(state);
    persist(broadcast);
    if(notify&&previous&&typeof checkNotificationTransitions==='function')checkNotificationTransitions(previous,state);
    if(renderAfter&&typeof render==='function')render();
    return result;
  }
};
