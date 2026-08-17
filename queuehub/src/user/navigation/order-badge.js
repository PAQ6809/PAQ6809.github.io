(()=>{
  const baseNav=nav;
  nav=function(){
    baseNav();
    const count=activeOrders().length;
    document.querySelectorAll('[data-nav="/my-orders"]').forEach(button=>{
      button.querySelector('.navBadge')?.remove();
      if(!count)return;
      const badge=document.createElement('span');
      badge.className='navBadge';
      badge.textContent=count>9?'9+':String(count);
      button.appendChild(badge);
    });
  };
})();
