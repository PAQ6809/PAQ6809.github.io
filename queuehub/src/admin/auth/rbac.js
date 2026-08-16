const QueueHubRbac=Object.freeze({
  roles:Object.freeze({
    viewer:[],
    operator:['queue.advance','queue.skip','queue.pause','queue.set'],
    manager:['queue.advance','queue.skip','queue.pause','queue.set','integration.manage'],
    admin:['*']
  }),
  can(role,capability){const caps=this.roles[role]||[];return caps.includes('*')||caps.includes(capability)}
});
