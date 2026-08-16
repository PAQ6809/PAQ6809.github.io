window.adminNext=id=>QueueHubQueueCommands.next(id);
window.adminSkip=id=>QueueHubQueueCommands.skip(id);
window.adminToggle=id=>QueueHubQueueCommands.toggle(id);
window.adminSet=id=>{const n=Number(document.getElementById('adminSetNumber')?.value);const result=QueueHubQueueCommands.set(id,n);if(!result.ok&&result.reason==='invalid-number')toast('請輸入有效號碼')};
