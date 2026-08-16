const QueueHubAdminSession={user:null,role:null,accessToken:null};
const QueueHubAdminGuard={
  can(capability){
    const mode=window.QueueHubRuntimeConfig?.adminAuthMode||'demo';
    if(mode==='demo')return true;
    return !!QueueHubAdminSession.user&&QueueHubRbac.can(QueueHubAdminSession.role,capability);
  },
  require(capability){
    if(this.can(capability))return true;
    if(typeof toast==='function')toast('此操作需要已授權的店員帳號');
    return false;
  }
};
