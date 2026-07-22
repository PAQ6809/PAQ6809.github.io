'use strict';

((root) => {
  const APPROVED = 'approved';
  const UNKNOWN_LICENSE = 'unknown';
  const REUSABLE_LICENSES = new Set([
    'cc by 4.0',
    'cc by-sa 4.0',
    'cc by-nc 4.0',
    'cc by-nc-sa 4.0',
    'cc0 1.0',
    'public domain',
  ]);
  const REMOTE_REVIEW_RELATION = 'educraft_source_review_statuses';
  const REMOTE_IMPACT_RELATION = 'educraft_lesson_source_impacts';
  let registryPromise;

  const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const asArray = value => Array.isArray(value) ? value : value ? [value] : [];
  const isDigest = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);

  function summarizeRegistry(registry) {
    const records = asArray(registry?.records);
    return {
      total: records.length,
      approved: records.filter(record => record.reviewStatus === APPROVED).length,
      unknownLicense: records.filter(record => record.license === UNKNOWN_LICENSE).length,
      reusable: records.filter(isReusableSource).length,
    };
  }

  function isReusableSource(record) {
    return record?.reviewStatus === APPROVED
      && typeof record.license === 'string'
      && REUSABLE_LICENSES.has(record.license.trim().toLowerCase());
  }

  function sourcePins(plan) {
    const planJson = isRecord(plan?.planJson) ? plan.planJson : {};
    const candidates = [
      ...asArray(plan?.curriculumAlignments),
      ...asArray(plan?.citations),
      ...asArray(planJson.curriculumAlignment),
      ...asArray(planJson.curriculumAlignments),
      ...asArray(planJson.citations),
    ];
    return candidates.filter(isRecord).map(item => ({
      sourceId: item.sourceId || null,
      canonicalUrl: item.canonicalUrl || item.url || null,
      contentDigest: item.contentDigest || item.sourceDigest || item.sourceVersionDigest || null,
    }));
  }

  function matchLessonSourceImpacts(plans, registry) {
    const records = asArray(registry?.records);
    const byId = new Map(records.map(record => [record.sourceId, record]));
    const byUrl = new Map(records.map(record => [record.canonicalUrl, record]));
    const notices = [];

    for (const plan of asArray(plans)) {
      const seen = new Set();
      for (const pin of sourcePins(plan)) {
        const idSource = pin.sourceId ? byId.get(pin.sourceId) : null;
        const urlSource = pin.canonicalUrl ? byUrl.get(pin.canonicalUrl) : null;
        if (idSource && urlSource && idSource.sourceId !== urlSource.sourceId) continue;
        const source = idSource || urlSource;
        if (!source || source.reviewStatus !== APPROVED) continue;
        if (!isDigest(pin.contentDigest) || !isDigest(source.contentDigest)) continue;
        if (pin.contentDigest === source.contentDigest || seen.has(source.sourceId)) continue;
        seen.add(source.sourceId);
        notices.push({
          planId: plan.id,
          cloudPlanId: plan.cloudId || null,
          planTitle: plan.title || '未命名教案',
          sourceId: source.sourceId,
          sourceTitle: source.title,
          previousDigest: pin.contentDigest,
          currentDigest: source.contentDigest,
          status: 'needs_review',
        });
      }
    }
    return notices;
  }

  root.EduCraftGovernance = Object.freeze({
    isReusableSource,
    matchLessonSourceImpacts,
    summarizeRegistry,
  });

  if (!root.document) return;

  function governanceRemoteEnabled() {
    return CONFIG.sourceGovernanceRemote === true;
  }

  async function loadSourceRegistry() {
    if (!registryPromise) registryPromise = fetch('./data/source-registry.json', { cache: 'no-cache' })
      .then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then(registry => {
        if (!Array.isArray(registry?.records)) throw new Error('來源清冊格式不正確');
        return registry;
      })
      .catch(error => {
        registryPromise = undefined;
        throw error;
      });
    return registryPromise;
  }

  function reviewBadge(record) {
    if (record.reviewStatus === APPROVED) return '<span class="badge success">來源已核對</span>';
    if (record.reviewStatus === 'rejected') return '<span class="badge danger">來源已拒絕</span>';
    return '<span class="badge warn">來源待核對</span>';
  }

  function licenseBadge(record) {
    return record.license === UNKNOWN_LICENSE
      ? '<span class="badge warn">授權待確認</span>'
      : `<span class="badge teal">${escapeHtml(record.license)}</span>`;
  }

  function renderRegistryCard(registry) {
    const summary = summarizeRegistry(registry);
    const latest = asArray(registry.records)
      .map(record => record.lastReviewedAt)
      .filter(Boolean)
      .sort()
      .at(-1);
    return `<section class="card card-body source-registry-card" aria-labelledby="source-registry-title">
      <div class="section-heading"><div><h2 id="source-registry-title">官方來源狀態</h2><p>來源核對與素材授權分開管理；授權未知時只提供連結與 metadata。</p></div><span class="badge">${summary.total} 筆</span></div>
      <div class="source-summary" aria-label="來源狀態摘要">
        <span><strong>${summary.approved}</strong> 已核對</span>
        <span><strong>${summary.unknownLicense}</strong> 授權待確認</span>
        <span><strong>${summary.reusable}</strong> 可重製索引</span>
      </div>
      <div class="source-registry-list">${registry.records.map(record => `<article class="source-registry-row">
        <div><strong>${escapeHtml(record.title)}</strong><small>${escapeHtml(record.publisher)}・${escapeHtml(record.versionLabel)}</small></div>
        <div class="meta-row">${reviewBadge(record)}${licenseBadge(record)}</div>
        <div class="source-registry-actions"><a href="${escapeHtml(record.canonicalUrl)}" target="_blank" rel="noopener noreferrer">官方頁面 ↗</a>${record.rightsUrl ? `<a href="${escapeHtml(record.rightsUrl)}" target="_blank" rel="noopener noreferrer">權利說明 ↗</a>` : ''}</div>
      </article>`).join('')}</div>
      <p class="source-registry-meta">最後核對：${latest ? escapeHtml(formatDate(latest)) : '未標示'}。內容變更只會要求人工複核，不會自動改寫教案。</p>
    </section>`;
  }

  async function enhanceSourcesPage() {
    const page = document.querySelector('#main-content .page');
    const header = page?.querySelector('.page-header');
    if (!page || !header) return;
    const region = document.createElement('div');
    region.id = 'source-registry-status';
    region.setAttribute('aria-live', 'polite');
    region.innerHTML = '<section class="card card-body"><p>正在讀取官方來源清冊…</p></section>';
    header.after(region);
    try {
      const registry = await loadSourceRegistry();
      if (!region.isConnected) return;
      region.innerHTML = renderRegistryCard(registry);
      // ponytail: the static links remain the failure fallback; once the richer registry
      // loads, removing the duplicate grid keeps this policy page short and readable.
      [...page.children].find(element => (
        element !== region
        && element.classList.contains('grid')
        && element.classList.contains('grid-2')
      ))?.remove();
      await addReviewerEntry(header);
    } catch {
      if (!region.isConnected) return;
      region.innerHTML = '<div class="notice warning">暫時無法讀取來源狀態；下方官方連結仍可使用，請勿將未知授權視為可重製。</div>';
    }
  }

  async function canReviewSources() {
    if (!governanceRemoteEnabled() || !state.session || !state.supabase) return false;
    const { data, error } = await state.supabase.rpc('educraft_can_review_sources');
    return !error && data === true;
  }

  async function addReviewerEntry(header) {
    if (!await canReviewSources() || !header.isConnected) return;
    let actions = header.querySelector('.header-actions');
    if (!actions) {
      actions = document.createElement('div');
      actions.className = 'header-actions';
      header.append(actions);
    }
    const button = document.createElement('button');
    button.className = 'btn btn-secondary';
    button.textContent = '開啟人工審核';
    button.addEventListener('click', () => navigate('source-review'));
    actions.append(button);
  }

  async function loadRemoteImpacts() {
    if (!governanceRemoteEnabled() || !state.session || !state.supabase) return [];
    const { data, error } = await state.supabase
      .from(REMOTE_IMPACT_RELATION)
      .select('id,lesson_plan_id,source_id,summary,status,detected_at')
      .eq('status', 'pending')
      .order('detected_at', { ascending: false })
      .limit(25);
    if (error) throw error;
    return (data || []).map(notice => {
      const plan = state.plans.find(item => item.cloudId === notice.lesson_plan_id);
      return {
        ...notice,
        planId: plan?.id || null,
        planTitle: plan?.title || '雲端教案',
        sourceTitle: notice.summary || notice.source_id,
      };
    });
  }

  function impactNoticeMarkup(notices) {
    const visible = notices.slice(0, 5);
    return `<section class="notice warning curriculum-impact-notice" aria-labelledby="curriculum-impact-title">
      <div class="section-heading"><div><strong id="curriculum-impact-title">${notices.length} 份教案需要重新核對課綱來源</strong><p>來源版本已由內容管理者核對；系統不會自動改寫你的教案。</p></div></div>
      <div class="impact-list">${visible.map(notice => `<div><span>${escapeHtml(notice.planTitle)}・${escapeHtml(notice.sourceTitle)}</span>${notice.planId ? `<button class="btn btn-sm btn-secondary" data-impact-plan="${escapeHtml(notice.planId)}">開啟教案</button>` : ''}</div>`).join('')}</div>
    </section>`;
  }

  async function enhanceCurriculumPage() {
    const page = document.querySelector('#main-content .page');
    const header = page?.querySelector('.page-header');
    if (!page || !header) return;
    try {
      const registry = await loadSourceRegistry();
      const local = matchLessonSourceImpacts(state.plans, registry);
      const remote = await loadRemoteImpacts();
      const unique = [...new Map([...remote, ...local].map(notice => [
        `${notice.planId || notice.lesson_plan_id}:${notice.sourceId || notice.source_id}`,
        notice,
      ])).values()];
      if (!unique.length || !header.isConnected) return;
      const region = document.createElement('div');
      region.id = 'curriculum-impact-region';
      region.innerHTML = impactNoticeMarkup(unique);
      header.after(region);
      region.querySelectorAll('[data-impact-plan]').forEach(button => button.addEventListener('click', () => {
        setCurrentPlan(button.dataset.impactPlan);
        navigate('editor');
      }));
    } catch {
      if (!governanceRemoteEnabled() || !header.isConnected) return;
      const region = document.createElement('div');
      region.id = 'curriculum-impact-region';
      region.innerHTML = '<div class="notice warning">目前無法取得最新教案核對通知；既有教案仍可正常編輯。</div>';
      header.after(region);
    }
  }

  function renderSourceReview() {
    const body = '<section id="source-review-workspace" class="card card-body" aria-live="polite"><p>正在驗證內容管理權限…</p></section>';
    setMain(pageShell('來源人工審核', '核准、拒絕與理由都由受保護的後端保存；一般教師無法變更來源狀態。', body, '<button class="btn btn-secondary" data-go="sources">返回來源與授權</button>'));
    bindGoButtons();
    loadSourceReviewWorkspace();
  }

  async function loadSourceReviewWorkspace() {
    const workspace = document.querySelector('#source-review-workspace');
    if (!workspace) return;
    if (!governanceRemoteEnabled()) {
      workspace.innerHTML = '<div class="notice warning">正式審核服務尚未啟用。來源清冊維持唯讀，待 staging 權限測試通過後才會開放。</div>';
      return;
    }
    if (!state.session || !state.supabase) {
      workspace.innerHTML = '<div class="notice warning">請先登入具內容管理權限的帳號。</div>';
      return;
    }
    if (!await canReviewSources()) {
      workspace.innerHTML = '<div class="notice danger">此帳號沒有來源審核權限。</div>';
      return;
    }
    const { data, error } = await state.supabase
      .from(REMOTE_REVIEW_RELATION)
      .select('source_id,observed_digest,title,canonical_url,observed_license,observed_rights_url,observed_at,decision')
      .eq('decision', 'pending')
      .order('observed_at', { ascending: false })
      .limit(50);
    if (error) {
      workspace.innerHTML = `<div class="notice danger">無法載入審核項目：${escapeHtml(error.message)}</div>`;
      return;
    }
    workspace.innerHTML = data?.length
      ? `<div class="source-review-list">${data.map(reviewForm).join('')}</div>`
      : '<div class="empty">目前沒有待人工審核的來源差異。</div>';
    workspace.querySelectorAll('[data-source-review-form]').forEach(form => form.addEventListener('submit', submitSourceReview));
  }

  function reviewForm(observation) {
    return `<form class="source-review-row" data-source-review-form data-source-id="${escapeHtml(observation.source_id)}" data-observed-digest="${escapeHtml(observation.observed_digest)}">
      <div><strong>${escapeHtml(observation.source_id)}</strong><small>偵測：${escapeHtml(formatDate(observation.observed_at))}・摘要 ${escapeHtml(String(observation.observed_digest).slice(0, 12))}…</small></div>
      <div class="field"><label>決定<select name="decision" required><option value="">請選擇</option><option value="approved_metadata_only">核准 metadata-only</option><option value="approved_reusable">核准可重製</option><option value="needs_changes">需要補充資料</option><option value="rejected">拒絕</option></select></label></div>
      <div class="field"><label>授權<input name="license" maxlength="120" value="${escapeHtml(observation.observed_license || 'unknown')}"></label></div>
      <div class="field review-wide"><label>權利說明網址<input name="rights_url" type="url" maxlength="500" value="${escapeHtml(observation.observed_rights_url || '')}"></label></div>
      <div class="field review-wide"><label>理由<textarea name="reason" required maxlength="1000"></textarea></label></div>
      <button class="btn btn-primary" type="submit">儲存審核</button>
    </form>`;
  }

  async function submitSourceReview(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('button[type="submit"]');
    const decision = form.elements.decision.value;
    const license = form.elements.license.value.trim() || UNKNOWN_LICENSE;
    const rightsUrl = form.elements.rights_url.value.trim();
    if (decision === 'approved_reusable' && (
      !REUSABLE_LICENSES.has(license.toLowerCase()) || !rightsUrl
    )) {
      toast('核准可重製需要受支援的開放授權與權利說明網址。', 'error');
      return;
    }
    button.disabled = true;
    const { error } = await state.supabase.rpc('educraft_review_source', {
      p_source_id: form.dataset.sourceId,
      p_observed_digest: form.dataset.observedDigest,
      p_decision: decision,
      p_reason: form.elements.reason.value.trim(),
      p_license: license,
      p_rights_url: rightsUrl || null,
    });
    button.disabled = false;
    if (error) {
      toast(`審核未儲存：${error.message}`, 'error');
      return;
    }
    toast('審核結果已保存。', 'success');
    loadSourceReviewWorkspace();
  }

  const baseRenderSources = root.renderSources;
  root.renderSources = function renderSourcesWithGovernance() {
    baseRenderSources();
    enhanceSourcesPage();
  };

  const baseRenderCurriculum = root.renderCurriculum;
  root.renderCurriculum = function renderCurriculumWithGovernance() {
    baseRenderCurriculum();
    enhanceCurriculumPage();
  };

  const baseRenderRoute = root.renderRoute;
  root.renderRoute = function renderRouteWithGovernance() {
    if (getRoute() === 'source-review') {
      state.route = 'source-review';
      renderNav();
      renderSourceReview();
      return;
    }
    baseRenderRoute();
  };
})(globalThis);
