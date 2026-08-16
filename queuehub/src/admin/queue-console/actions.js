const QueueHubAdminInflightRestaurants=new Set();
async function queueHubAuthoritativeRecovery(){try{await QueueHubProviders.refreshVenue({broadcast:true,notify:true,renderAfter:false});render();return true}catch(error){console.warn('[QueueHub] authoritative recovery failed',error);return false}}
async function runQueueHubAdminAction(id,capability,action,number=null){
  if(!QueueHubAdminGuard.require(capability))return false;
  if(QueueHubAdminGuard.isLive()){
    if(QueueHubAdminInflightRestaurants.has(id)){toast('上一個正式叫號操作仍在處理');return false}
    QueueHubAdminInflightRestaurants.add(id);
    try{
      const result=await QueueHubAdminRemote.queue(id,action,number);
      const duplicate=result?.data?.result?.duplicate===true;
      toast(duplicate?'正式叫號已確認；重送沒有重複執行':'正式叫號已更新');
      return true;
    }catch(error){
      console.error(error);
      const recovered=await queueHubAuthoritativeRecovery();
      toast(recovered?'正式操作結果未確認，已重新同步目前叫號；請確認後再操作':(error.message||'正式叫號更新失敗'));
      return false;
    }finally{QueueHubAdminInflightRestaurants.delete(id)}
  }
  if(action==='next')return QueueHubQueueCommands.next(id);
  if(action==='skip')return QueueHubQueueCommands.skip(id);
  if(action==='toggle')return QueueHubQueueCommands.toggle(id);
  if(action==='set')return QueueHubQueueCommands.set(id,number);
  return false;
}
window.adminNext=id=>runQueueHubAdminAction(id,'queue.advance','next');
window.adminSkip=id=>runQueueHubAdminAction(id,'queue.skip','skip');
window.adminToggle=id=>runQueueHubAdminAction(id,'queue.pause','toggle');
window.adminSet=id=>{const n=Number(document.getElementById('adminSetNumber')?.value);if(!Number.isFinite(n)||n<=0){toast('請輸入有效號碼');return}return runQueueHubAdminAction(id,'queue.set','set',n)};
