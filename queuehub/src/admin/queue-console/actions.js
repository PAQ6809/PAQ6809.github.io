async function runQueueHubAdminAction(id,capability,action,number=null){if(!QueueHubAdminGuard.require(capability))return false;if(QueueHubAdminGuard.isLive()){try{await QueueHubAdminRemote.queue(id,action,number);toast('正式叫號已更新');return true}catch(error){console.error(error);toast(error.message||'正式叫號更新失敗');return false}}if(action==='next')return QueueHubQueueCommands.next(id);if(action==='skip')return QueueHubQueueCommands.skip(id);if(action==='toggle')return QueueHubQueueCommands.toggle(id);if(action==='set')return QueueHubQueueCommands.set(id,number);return false}
window.adminNext=id=>runQueueHubAdminAction(id,'queue.advance','next');
window.adminSkip=id=>runQueueHubAdminAction(id,'queue.skip','skip');
window.adminToggle=id=>runQueueHubAdminAction(id,'queue.pause','toggle');
window.adminSet=id=>{const n=Number(document.getElementById('adminSetNumber')?.value);if(!Number.isFinite(n)||n<=0){toast('請輸入有效號碼');return}return runQueueHubAdminAction(id,'queue.set','set',n)};
