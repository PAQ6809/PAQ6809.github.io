window.adminNext=id=>QueueHubAdminGuard.require('queue.advance')&&QueueHubQueueCommands.next(id);
window.adminSkip=id=>QueueHubAdminGuard.require('queue.skip')&&QueueHubQueueCommands.skip(id);
window.adminToggle=id=>QueueHubAdminGuard.require('queue.pause')&&QueueHubQueueCommands.toggle(id);
window.adminSet=id=>{if(!QueueHubAdminGuard.require('queue.set'))return;const n=Number(document.getElementById('adminSetNumber')?.value);const result=QueueHubQueueCommands.set(id,n);if(!result.ok&&result.reason==='invalid-number')toast('請輸入有效號碼')};
