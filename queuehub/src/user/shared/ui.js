function esc(s=''){return String(s).replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]))}
function toast(msg){document.querySelector('.toast')?.remove();const t=document.createElement('div');t.className='toast';t.textContent=msg;document.body.appendChild(t);setTimeout(()=>t.remove(),2400)}
function nav(){const base=routeBase();document.querySelectorAll('[data-nav]').forEach(b=>{const hit=base===b.dataset.nav||(b.dataset.nav==='/my-orders'&&base.startsWith('/my-orders'));b.classList.toggle('active',hit)});const n=activeOrders().length;document.querySelectorAll('[data-nav="/my-orders"]').forEach(b=>b.title=n?`${n} 張進行中取餐單`:'目前沒有取餐單')}
function placeholder(title,desc){return `<div class="panel empty"><strong>${title}</strong>${desc}</div>`}
