'use strict';

(async () => {
  const modules = [
    './lumen-core.js',
    './lumen-market.js',
    './lumen-stock-a.js',
    './lumen-stock-b.js',
    './lumen-derivatives.js',
    './lumen-workspace.js',
    './lumen-status.js',
    './lumen-cloud.js',
    './lumen-relay.js',
    './lumen-boot.js'
  ];

  for (const src of modules) {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = false;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Lumen module failed: ${src}`));
      document.head.appendChild(script);
    });
  }
})().catch(error => {
  console.error(error);
  const badge = document.getElementById('sourceHealth');
  if (badge) {
    badge.textContent = '程式模組載入失敗';
    badge.className = 'badge bad';
  }
});
