const QueueHubRbac=Object.freeze({
  roles:Object.freeze({
    viewer:[],
    operator:['queue.advance','queue.skip','queue.pause','queue.set','orderqr.issue','orderqr.revoke'],
    manager:['queue.advance','queue.skip','queue.pause','queue.set','orderqr.issue','orderqr.revoke','integration.manage'],
    admin:['*']
  }),
  can(role,capability){const caps=this.roles[role]||[];return caps.includes('*')||caps.includes(capability)}
});
