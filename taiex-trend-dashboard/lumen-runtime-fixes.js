'use strict';

// Targeted production fixes loaded after lumen.js.
// 1) TWSE MI_INDEX `漲跌百分比` already carries its sign; never multiply it by `漲跌` again.
// 2) Keep Gregorian and ROC dates distinct.
// 3) Preserve the HTML ETF filter hook without duplicating ETF rendering logic.

roc=function(s){
  const raw=String(s||'').trim();
  const digits=raw.replace(/\D/g,'');
  if(digits.length===7)return `${Number(digits.slice(0,3))+1911}-${digits.slice(3,5)}-${digits.slice(5,7)}`;
  if(digits.length===8)return `${digits.slice(0,4)}-${digits.slice(4,6)}-${digits.slice(6,8)}`;
  return raw||'—';
};

window.renderEtfs=etfs;

market=function(){
  const t=S.indices.find(x=>pick(x,['指數'])==='發行量加權股價指數');
  const qs=S.quotes.filter(x=>Number.isFinite(x.close));
  const up=qs.filter(x=>x.change>0).length;
  const dn=qs.filter(x=>x.change<0).length;
  const tv=qs.reduce((a,x)=>a+(Number.isFinite(x.value)?x.value:0),0);
  const pct=t?n(pick(t,['漲跌百分比'])):NaN;
  const cards=[
    ['加權指數',t?f(pick(t,['收盤指數'])):'—',Number.isFinite(pct)?sg(pct)+'%':'—',pct],
    ['市場廣度',`${up} ↑ / ${dn} ↓`,'本次行情涵蓋',up-dn],
    ['行情筆數',f(qs.length,0),'TWSE + TPEx',0],
    ['成交值合計',tv?`${f(tv/1e8,1)} 億`:'—','依可用官方欄位加總',0]
  ];
  document.getElementById('marketKpis').innerHTML=cards.map(([l,v,d,x])=>`<div class="card kpi"><div class="label">${l}</div><div class="value">${v}</div><div class="delta ${cls(x)}">${d}</div></div>`).join('');

  const names=['發行量加權股價指數','電子工業類指數','半導體類指數','電腦及週邊設備類指數','光電類指數','電子零組件類指數','金融保險類指數','航運類指數','鋼鐵類指數','綠能環保類指數','數位雲端類指數'];
  const rs=S.indices.filter(x=>names.includes(pick(x,['指數'])));
  document.getElementById('indexRows').innerHTML=rs.length?rs.map(r=>{
    const p=n(pick(r,['漲跌百分比']));
    return `<tr><td>${esc(pick(r,['指數']))}</td><td>${f(pick(r,['收盤指數']))}</td><td class="${cls(p)}">${sg(p)}%</td><td>${roc(dateOf(r))}</td></tr>`;
  }).join(''):'<tr><td colspan="4" class="empty">尚未取得 TWSE 指數資料。</td></tr>';
  document.getElementById('indexSource').innerHTML=src('TWSE MI_INDEX',U.idx,t?dateOf(t):'未回傳');

  let text='官方指數資料尚未取得，暫不產生方向判斷。';
  if(Number.isFinite(pct)){
    const marketTone=pct>1?'偏強':pct<-1?'偏弱':'震盪';
    const breadth=up>dn*1.25?'上漲家數明顯占優':dn>up*1.25?'下跌家數明顯占優':'漲跌家數接近';
    text=`<strong>${marketTone}</strong>：加權指數 ${sg(pct)}%，${breadth}。這是固定規則描述，不是明日預測。`;
  }
  document.getElementById('marketInterpretation').innerHTML=text;

  const hot=[...qs].sort((a,b)=>(b.value||0)-(a.value||0)).slice(0,20);
  document.getElementById('hotRows').innerHTML=hot.map(q=>`<tr onclick="selectStock('${esc(q.code)}')" style="cursor:pointer"><td>${esc(q.code)} ${esc(q.name)}</td><td>${q.market}</td><td>${f(q.close)}</td><td class="${cls(q.change)}">${sg(q.change)}</td><td>${Number.isFinite(q.value)?f(q.value/1e8,2)+' 億':'—'}</td><td>${Number.isFinite(q.volume)?f(q.volume/1000,0)+' 張':'—'}</td></tr>`).join('')||'<tr><td colspan="6" class="empty">行情來源尚未取得。</td></tr>';
};
