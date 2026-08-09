'use strict';

const LUMEN_ETF_PROFILE_PATH='./etf-profile-verified.json';
const LUMEN_ETF_BASE_FUND_META=lumenEtfFundMeta;

async function loadVerifiedEtfProfiles() {
  try {
    const response=await fetch(LUMEN_ETF_PROFILE_PATH,{cache:'no-store'});
    if(!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload=await response.json();
    const profiles=payload?.profiles||{};
    for(const [code,profile] of Object.entries(profiles)) {
      if(profile?.status!=='verified') continue;
      const source=String(profile.source_url||'');
      if(!/^https:\/\/www\.twse\.com\.tw\/zh\/ETFortune\/etfInfo\//.test(source)) {
        throw new Error(`ETF profile source not allowed: ${code}`);
      }
      if(!profile.verified_at) throw new Error(`ETF profile missing verified_at: ${code}`);
    }
    STATE.etfVerifiedProfiles=profiles;
    STATE.status['ETF已驗證身分資料']={
      ok:true,
      rows:Object.values(profiles).filter(p=>p?.status==='verified').length,
      at:new Date().toISOString(),
      url:LUMEN_ETF_PROFILE_PATH,
      mode:'verified_official_identity_profile'
    };
    return profiles;
  } catch(error) {
    STATE.etfVerifiedProfiles={};
    STATE.status['ETF已驗證身分資料']={
      ok:false,
      error:error.message,
      at:new Date().toISOString(),
      url:LUMEN_ETF_PROFILE_PATH
    };
    return {};
  }
}

function lumenVerifiedEtfIdentity(q) {
  const profile=STATE.etfVerifiedProfiles?.[String(q?.code||'')];
  if(!profile || profile.status!=='verified') return null;
  return {
    '證券代號':profile.code,
    '基金代號':profile.code,
    '證券名稱':profile.name,
    '基金名稱':profile.full_name||profile.name,
    '證券類別':profile.security_type||'ETF',
    '發行公司':profile.issuer||'',
    '標的指數':profile.benchmark||'',
    '主題/因子':profile.theme||'',
    _lumenEtfProfile:{
      source_name:profile.source_name||'臺灣證券交易所 ETF e添富',
      source_url:profile.source_url,
      verified_at:profile.verified_at
    }
  };
}

lumenEtfFundMeta=function(q) {
  const live=LUMEN_ETF_BASE_FUND_META(q);
  const verified=lumenVerifiedEtfIdentity(q);
  if(!verified) return live;
  if(!live) return verified;
  const issuer=pick(live,['證券投資信託事業','投信公司','基金公司','發行人','發行公司']);
  const benchmark=pick(live,['標的指數','追蹤指數','指數名稱']);
  return {
    ...verified,
    ...live,
    '發行公司':issuer||verified['發行公司'],
    '標的指數':benchmark||verified['標的指數'],
    _lumenEtfProfile:verified._lumenEtfProfile
  };
};

function lumenEtfProfileSourceNote(q) {
  const profile=lumenVerifiedEtfIdentity(q)?._lumenEtfProfile;
  if(!profile) return '';
  return `已驗證 ETF 身分：<a href="${esc(profile.source_url)}" target="_blank" rel="noopener noreferrer">${esc(profile.source_name)} ↗</a> · 核對時間 ${esc(new Date(profile.verified_at).toLocaleString('zh-TW'))}。基金母檔可用時仍優先採用其結構化欄位；缺漏欄位才由此官方身分資料補足。`;
}

const LUMEN_ETF_PROFILE_BASE_OVERVIEW=window.renderOverview;
window.renderOverview=async function() {
  await LUMEN_ETF_PROFILE_BASE_OVERVIEW();
  const q=STATE.selected;
  if(!lumenIsEtf(q)) return;
  const note=lumenEtfProfileSourceNote(q);
  if(!note) return;
  const cards=document.querySelectorAll('#stockPanel .card');
  const identity=cards[1];
  if(identity) identity.insertAdjacentHTML('beforeend',`<div class="source" style="margin-top:10px">${note}</div>`);
};

const LUMEN_ETF_PROFILE_BASE_FUNDAMENTAL=window.renderFundamental;
window.renderFundamental=async function() {
  await LUMEN_ETF_PROFILE_BASE_FUNDAMENTAL();
  const q=STATE.selected;
  if(!lumenIsEtf(q)) return;
  const note=lumenEtfProfileSourceNote(q);
  if(!note) return;
  const source=[...document.querySelectorAll('#stockPanel .source')].find(el=>/結構化來源/.test(el.textContent||''));
  if(source) source.innerHTML=`結構化基金母檔：<a href="${API.twse.funds}" target="_blank" rel="noopener noreferrer">TWSE t187ap47_L</a>。${note}`;
};

const LUMEN_ETF_PROFILE_BASE_CHIPS=window.renderStockChips;
window.renderStockChips=async function() {
  await LUMEN_ETF_PROFILE_BASE_CHIPS();
  const q=STATE.selected;
  if(!lumenIsEtf(q)) return;
  const note=lumenEtfProfileSourceNote(q);
  if(!note) return;
  const source=[...document.querySelectorAll('#stockPanel .source')].find(el=>/基金母檔/.test(el.textContent||''));
  if(source) source.innerHTML=`基金母檔：<a href="${API.twse.funds}" target="_blank" rel="noopener noreferrer">TWSE t187ap47_L</a>。${note}`;
};
