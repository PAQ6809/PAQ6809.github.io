function twseIndexRecord(name) {
  return STATE.indices.find(row => String(pick(row,['指數','Index','Name'])).trim() === name);
}

function indexPct(row) {
  if (!row) return NaN;
  const direct = number(pick(row,['漲跌百分比','ChangePercent','ChangePercentage']));
  if (Number.isFinite(direct)) return direct;
  const sign = String(pick(row,['漲跌','Direction'])).trim() === '-' ? -1 : 1;
  const raw = number(pick(row,['漲跌點數','Change','ChangePoint']));
  const close = number(pick(row,['收盤指數','ClosingIndex','Close']));
  const prev = close - sign*raw;
  return Number.isFinite(prev) && prev !== 0 ? sign*raw/prev*100 : NaN;
}

function extractPutCallRatio() {
  const rows = Array.isArray(STATE.putCall) ? STATE.putCall : [];
  if (!rows.length) return null;
  const row = rows[0];
  const ratioEntry = Object.entries(row).find(([k,v]) => /ratio|比率|買賣權/i.test(k) && Number.isFinite(number(v)));
  const ratio = ratioEntry ? number(ratioEntry[1]) : NaN;
  return {row,ratio,date:sourceDate(row)};
}

function extractForeignInstitutional() {
  const rows = Array.isArray(STATE.taifexInstitutional) ? STATE.taifexInstitutional : [];
  const candidates = rows.filter(row => Object.values(row).some(v => /外資/.test(String(v))));
  if (!candidates.length) return null;
  for (const row of candidates) {
    const entries = Object.entries(row);
    const oi = entries.find(([k,v]) => /未平倉.*多空淨|多空淨.*未平倉|open.*interest.*net|oi.*net/i.test(k) && Number.isFinite(number(v)));
    if (oi) return {row,net:number(oi[1]),field:oi[0],date:sourceDate(row)};
  }
  const row = candidates[0];
  const numeric = Object.entries(row).filter(([,v]) => Number.isFinite(number(v)));
  const last = numeric.at(-1);
  return last ? {row,net:number(last[1]),field:last[0],date:sourceDate(row)} : {row,net:NaN,field:'',date:sourceDate(row)};
}

function macroEventPanel() {
  const snapshot = STATE.verifiedSnapshot;
  const events = Array.isArray(snapshot?.macro_events) ? snapshot.macro_events.slice(0,5) : [];
  if (!events.length) return '';
  const rows = events.map(event => `
    <div class="sentimentPart">
      <span>${esc(event.date)} · ${esc(event.title)}</span>
      <strong>${esc(event.time || '—')} ${esc(event.timezone || '')} · <a href="${esc(event.source_url)}" target="_blank" rel="noopener noreferrer">${esc(event.source_name || '官方來源')} ↗</a></strong>
    </div>`).join('');
  return `<div class="sentimentParts" style="margin-top:12px">
    <div class="source"><strong>已核對的跨市場行事曆</strong> · 排程快照只保留已核對的官方行事曆，不自行預測公布值。</div>
    ${rows}
  </div>`;
}

function renderSentiment(indexPctValue, up, down) {
  const components = [];
  if (Number.isFinite(indexPctValue)) components.push({
    name:'加權指數',
    score:clamp(50 + indexPctValue*12,0,100),
    detail:`${signed(indexPctValue)}%`,
    source:'TWSE MI_INDEX'
  });
  if (up+down > 0) components.push({
    name:'市場廣度',
    score:up/(up+down)*100,
    detail:`${up} 漲 / ${down} 跌`,
    source:'TWSE + TPEx'
  });
  const foreign = extractForeignInstitutional();
  if (foreign && Number.isFinite(foreign.net)) components.push({
    name:'TAIFEX 外資淨部位',
    score:foreign.net>0?62:foreign.net<0?38:50,
    detail:`${foreign.field} ${signed(foreign.net,0)}`,
    source:'TAIFEX OAS'
  });
  const score = components.length ? components.reduce((a,c)=>a+c.score,0)/components.length : NaN;
  const label = !Number.isFinite(score) ? '資料不足' : score>=62 ? '偏強' : score<=38 ? '偏弱' : '中性 / 震盪';
  const levelClass = !Number.isFinite(score) ? 'muted' : score>=62 ? 'up' : score<=38 ? 'down' : 'muted';
  const meter = Number.isFinite(score) ? score : 50;
  const parts = components.map(c => `<div class="sentimentPart"><span>${esc(c.name)} · ${esc(c.source)}</span><strong>${esc(c.detail)}</strong></div>`).join('');
  const pcr = extractPutCallRatio();
  const pcrText = pcr && Number.isFinite(pcr.ratio) ? `<div class="sentimentPart"><span>Put/Call Ratio · 只列示不納入分數</span><strong>${fmt(pcr.ratio,2)}</strong></div>` : '';
  document.getElementById('marketSentiment').innerHTML = `
    <div class="sentimentScore"><strong class="${levelClass}">${Number.isFinite(score)?Math.round(score):'—'}</strong><span>${label} · 0–100 描述性分數</span></div>
    <div class="meter" aria-label="透明情緒分數"><span style="width:${meter}%"></span></div>
    <div class="sentimentParts">${parts || '<div class="muted">可用來源不足，暫不計分。</div>'}${pcrText}</div>
    ${macroEventPanel()}
  `;
}

function renderMarket() {
  const twii = twseIndexRecord('發行量加權股價指數');
  const pct = indexPct(twii);
  const quotes = STATE.quotes.filter(q => Number.isFinite(q.close));
  const up = quotes.filter(q => q.change > 0).length;
  const down = quotes.filter(q => q.change < 0).length;
  const tradeValue = quotes.reduce((sum,q) => sum + (Number.isFinite(q.value)?q.value:0),0);
  const cards = [
    ['加權指數',twii?fmt(pick(twii,['收盤指數','ClosingIndex','Close'])):'—',Number.isFinite(pct)?`${signed(pct)}%`:'—',pct,'TWSE MI_INDEX'],
    ['市場廣度',`${up} ↑ / ${down} ↓`,'上市 + 上櫃',up-down,'Lumen 計算 · TWSE + TPEx'],
    ['行情筆數',fmt(quotes.length,0),'成功解析',0,'Lumen 計數'],
    ['成交值合計',tradeValue?`${fmt(tradeValue/1e8,1)} 億`:'—','可用欄位加總',0,'Lumen 計算 · 官方成交金額']
  ];
  document.getElementById('marketKpis').innerHTML = cards.map(([label,value,detail,x,src]) => `
    <div class="card kpi"><div class="label">${label}</div><div class="value">${value}</div><div class="delta ${toneClass(x)}">${detail}</div><div class="source">${esc(src)}</div></div>
  `).join('');

  const names = ['發行量加權股價指數','電子工業類指數','半導體類指數','電腦及週邊設備類指數','光電類指數','電子零組件類指數','金融保險類指數','航運類指數','鋼鐵類指數','綠能環保類指數','數位雲端類指數'];
  const rows = STATE.indices.filter(row => names.includes(String(pick(row,['指數','Name'])).trim()));
  document.getElementById('indexRows').innerHTML = rows.length ? rows.map(row => {
    const p = indexPct(row);
    return `<tr><td>${esc(pick(row,['指數','Name']))}</td><td>${fmt(pick(row,['收盤指數','Close']))}</td><td class="${toneClass(p)}">${signed(p)}%</td><td>${esc(formatDate(sourceDate(row)))}</td></tr>`;
  }).join('') : '<tr><td colspan="4" class="empty">尚未取得 TWSE 指數資料。</td></tr>';
  const indexStatus = STATE.status['TWSE指數'];
  const indexExtra = indexStatus?.snapshot_fallback ? `排程官方快照 · 快照資料日 ${formatDate(indexStatus.snapshot_data_date)} · 快照抓取 ${indexStatus.snapshot_run_at}` : '';
  document.getElementById('indexSource').innerHTML = sourceLine('TWSE MI_INDEX',API.twse.indices,twii?sourceDate(twii):'未回傳',indexExtra);

  const hot = [...quotes].sort((a,b)=>(b.value||0)-(a.value||0)).slice(0,24);
  document.getElementById('hotRows').innerHTML = hot.length ? hot.map(q => `
    <tr data-stock="${esc(q.code)}" class="clickableRow">
      <td>${esc(q.code)} ${esc(q.name)}</td><td>${q.market}</td><td>${fmt(q.close)}</td>
      <td class="${toneClass(q.change)}">${signed(q.change)}</td>
      <td>${Number.isFinite(q.value)?`${fmt(q.value/1e8,2)} 億`:'—'}</td>
      <td>${Number.isFinite(q.volume)?`${fmt(q.volume/1000,0)} 張`:'—'}</td>
    </tr>`).join('') : '<tr><td colspan="6" class="empty">行情來源尚未取得。</td></tr>';
  document.querySelectorAll('#hotRows [data-stock]').forEach(row => row.addEventListener('click',()=>selectStock(row.dataset.stock)));
  document.getElementById('hotSource').innerHTML = `排序：Lumen 依官方成交金額由高到低。<a href="${API.twse.quotes}" target="_blank" rel="noopener noreferrer">TWSE 上市日行情</a> · <a href="${API.tpex.quotes}" target="_blank" rel="noopener noreferrer">TPEx 上櫃收盤行情</a>。非推薦名單。`;

  renderSentiment(pct,up,down);
}
