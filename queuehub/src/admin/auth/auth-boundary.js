const QueueHubAdminSession={user:null,role:null,venueId:null,accessToken:null,refreshToken:null,expiresAt:0};
const QueueHubAdminGuard={
  isLive(){return !!QueueHubAdminSession.user&&!!QueueHubAdminSession.role&&!!QueueHubAdminSession.accessToken},
  runtimeMode(){return this.isLive()?'live':'demo'},
  can(capability){if(this.isLive())return QueueHubRbac.can(QueueHubAdminSession.role,capability);const mode=window.QueueHubRuntimeConfig?.adminAuthMode||'demo';return mode==='demo'||mode==='hybrid'},
  require(capability){if(this.can(capability))return true;if(typeof toast==='function')toast('此操作需要已授權的店員帳號');return false}
};
