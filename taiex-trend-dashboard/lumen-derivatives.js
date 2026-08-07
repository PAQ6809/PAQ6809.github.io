function summarizeMargin(rows,marketLabel) {
  if (!Array.isArray(rows)||!rows.length) return '尚未取得。';
  const date=sourceDate(rows[0]);
  const candidates=[];
  rows.slice(0,30).forEach(row=>{
    Object.entries(row).forEach(([key,value])=>{
      if (/餘額|Balance|balance/.test(key)&&Number.isFinite(number(value))) candidates.push([key,number(value)]);
    });
  });
  const unique=[];
  const seen=new Set();
  for (const pair of candidates) {
    if (seen.has(pair[0])) continue;
    seen.add(pair[0]);unique.push(pair);
    if (unique.length>=6) break;
  }
  return `<strong>${marketLabel}</strong> · 資料 ${formatDate(date)}<br>${unique.length?unique.map(([k,v])=>`${esc(k)}：${fmt(v,0)}`).join('<br>'):'API 已回傳，但未找到標準餘額欄位；請開原始來源核對。'}`;
}

function renderDerivatives() {
  document.getElementById('marginListed').innerHTML=summarizeMargin(STATE.marginListed,'集中市場');
  document.getElementById('marginOtc').innerHTML=summarizeMargin(STATE.marginOtc,'櫃買市場');
  document.getElementById('marginListedSource').innerHTML=sourceLine('TWSE MI_MARGN',API.twse.margin,STATE.marginListed[0]?sourceDate(STATE.marginListed[0]):'未回傳');
  document.getElementById('marginOtcSource').innerHTML=sourceLine('TPEx tpex_mainboard_margin_balance',API.tpex.margin,STATE.marginOtc[0]?sourceDate(STATE.marginOtc[0]):'未回傳');

  const foreign=extractForeignInstitutional();
  if (Array.isArray(STATE.taifexInstitutional)&&STATE.taifexInstitutional.length) {
    const sample=STATE.taifexInstitutional.slice(0,6);
    const foreignText=foreign&&Number.isFinite(foreign.net)?`<div class="fact"><div class="n">外資 ${esc(foreign.field)}</div><div class="v ${toneClass(foreign.net)}">${signed(foreign.net,0)}</div></div>`:'';
    document.getElementById('taifexInstitutional').innerHTML=`<div class="facts">${foreignText}<div class="fact"><div class="n">API 回傳列數</div><div class="v">${fmt(STATE.taifexInstitutional.length,0)}</div></div></div><details style="margin-top:10px"><summary>查看原始資料前 6 列</summary><pre style="white-space:pre-wrap;overflow:auto;max-height:300px">${esc(JSON.stringify(sample,null,2))}</pre></details>`;
  } else {
    document.getElementById('taifexInstitutional').innerHTML='TAIFEX OAS 暫未成功讀取；請使用官方入口核對。';
  }
  document.getElementById('taifexInstitutionalSource').innerHTML=`<a href="${API.taifex.institutional}" target="_blank" rel="noopener noreferrer">TAIFEX OAS 三大法人總表</a> · <a href="${API.taifex.swagger}" target="_blank" rel="noopener noreferrer">Swagger</a> · <a href="${API.taifex.official}" target="_blank" rel="noopener noreferrer">期交所</a>`;

  const pcr=extractPutCallRatio();
  if (pcr && Number.isFinite(pcr.ratio)) {
    document.getElementById('putCallPanel').innerHTML=`<div class="facts"><div class="fact"><div class="n">Put / Call Ratio</div><div class="v">${fmt(pcr.ratio,2)}</div></div><div class="fact"><div class="n">資料日</div><div class="v">${esc(formatDate(pcr.date))}</div></div></div><details style="margin-top:10px"><summary>原始列</summary><pre style="white-space:pre-wrap;overflow:auto">${esc(JSON.stringify(pcr.row,null,2))}</pre></details>`;
  } else if (Array.isArray(STATE.putCall)&&STATE.putCall.length) {
    document.getElementById('putCallPanel').innerHTML=`API 已回傳，但欄位名稱無法可靠映射；不猜測比率。<details style="margin-top:10px"><summary>原始列</summary><pre style="white-space:pre-wrap;overflow:auto">${esc(JSON.stringify(STATE.putCall[0],null,2))}</pre></details>`;
  } else {
    document.getElementById('putCallPanel').innerHTML='TAIFEX Put/Call Ratio 暫未成功讀取。';
  }
  document.getElementById('putCallSource').innerHTML=`<a href="${API.taifex.putCall}" target="_blank" rel="noopener noreferrer">TAIFEX OAS PutCallRatio</a> · 若結構變更，以 Swagger 為準。`;
}
