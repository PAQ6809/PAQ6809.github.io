const coreRender=render;
render=function(){const p=routeBase();if(p==='/admin'){document.getElementById('app').innerHTML=renderAdmin();nav();setTimeout(updateQrPreview,0);return}if(p==='/integrations'){document.getElementById('app').innerHTML=renderIntegrations();nav();return}coreRender()};
