/**
 * OPC 试衣 — 生成任务流转（演示）
 * 校验 → 确认弹窗 → 提交 → 我的作品进度
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'opc-gen-job';
  const SOURCE_KEY = 'opc-gen-source';
  const UNREAD_KEY = 'opc-gallery-unread';
  const CREDITS_KEY = 'opc-credits';
  const DEFAULT_CREDITS = 250;
  const DURATION_MS = 8000;
  const CIRCLE_LEN = 175.93;

  const SOURCE_META = {
    model: { modeLabel: '模特试衣', title: '试衣效果图', baseCost: 5 },
    real: { modeLabel: '真人试衣', title: '试衣效果图', baseCost: 20 },
    free: { modeLabel: '自由风格', title: '试衣效果图', baseCost: 40 },
  };

  let tickTimer = null;
  let modalEl = null;
  let modalStep = 'confirm';
  let pendingSubmit = null;
  let lastFocus = null;

  function parseRoute() {
    const hash = (location.hash || '').replace(/^#\/?/, '').split('?')[0];
    if (hash === 'workspace') return 'model';
    return hash || 'home';
  }

  function getActiveView(source) {
    return document.querySelector(`.opc-view[data-route="${source}"]:not([hidden])`) ||
      document.querySelector(`.opc-view[data-route="${source}"]`);
  }

  function getJob() {
    try {
      return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null');
    } catch {
      return null;
    }
  }

  function saveJob(job) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(job));
    sessionStorage.setItem(SOURCE_KEY, job.source);
  }

  function getCredits() {
    const raw = localStorage.getItem(CREDITS_KEY);
    const n = raw == null ? DEFAULT_CREDITS : parseInt(raw, 10);
    return Number.isFinite(n) ? n : DEFAULT_CREDITS;
  }

  function setCredits(value) {
    const next = Math.max(0, value);
    localStorage.setItem(CREDITS_KEY, String(next));
    syncCreditsUI(next);
    return next;
  }

  function syncCreditsUI(value) {
    const credits = value ?? getCredits();
    document.querySelectorAll('[data-opc-credits-display]').forEach((el) => {
      el.textContent = `${credits} 积分`;
    });
    document.querySelectorAll('[data-opc-credits-value]').forEach((el) => {
      el.textContent = String(credits);
    });
  }

  function clearTimers() {
    if (tickTimer) {
      clearInterval(tickTimer);
      tickTimer = null;
    }
  }

  function parseQty(button) {
    const panel = button.closest('.opc-summary-panel');
    if (!panel) return 1;
    const text = panel.querySelector('.opc-qty-stepper span')?.textContent || '';
    const match = text.match(/(\d+)/);
    return match ? Math.max(1, parseInt(match[1], 10)) : 1;
  }

  function getBaseCost(source) {
    const view = getActiveView(source);
    const panel = view?.querySelector('.opc-summary-panel');
    const attr = panel?.getAttribute('data-opc-base-cost');
    if (attr) return parseInt(attr, 10) || SOURCE_META[source]?.baseCost || 5;
    return SOURCE_META[source]?.baseCost || 5;
  }

  function navigate(route) {
    if (window.OPC && typeof window.OPC.navigate === 'function') {
      window.OPC.navigate(route);
      return;
    }
    location.hash = route;
  }

  function generatingCard() {
    return document.querySelector('[data-opc-gallery-generating]');
  }

  function setGalleryUnread(unread) {
    sessionStorage.setItem(UNREAD_KEY, unread ? '1' : '0');
    document.querySelectorAll('[data-opc-gallery-nav-badge]').forEach((el) => {
      el.hidden = !unread;
    });
  }

  function renderGalleryProgress(progress, job) {
    const card = generatingCard();
    if (!card) return;

    const pct = Math.round(Math.max(0, Math.min(100, progress)));
    const ring = card.querySelector('[data-opc-gallery-progress-ring]');
    const label = card.querySelector('[data-opc-gallery-progress-text]');
    const title = card.querySelector('[data-opc-gallery-title]');
    const tag = card.querySelector('[data-opc-gallery-mode-tag]');
    const meta = SOURCE_META[job?.source] || SOURCE_META.model;

    if (ring) ring.setAttribute('stroke-dashoffset', String(CIRCLE_LEN * (1 - pct / 100)));
    if (label) label.textContent = `${pct}%`;
    if (title) title.textContent = meta.title;
    if (tag) tag.textContent = meta.modeLabel;

    // 更新缩略图预览
    const previewImg = card.querySelector('[data-opc-gen-preview-img]');
    const placeholder = card.querySelector('[data-opc-gen-preview-placeholder]');
    if (previewImg && job?.thumbnail) {
      previewImg.src = job.thumbnail;
      previewImg.hidden = false;
      if (placeholder) placeholder.hidden = true;
    } else if (previewImg) {
      previewImg.hidden = true;
      if (placeholder) placeholder.hidden = false;
    }
  }

  function captureThumbnail(source) {
    const view = getActiveView(source);
    if (!view) return null;
    // 尝试获取上传区域的图片（如果已上传）
    const imgPreview = view.querySelector('.opc-upload.has-preview .opc-upload-preview, .opc-upload-preview:not(.opc-upload-preview--hint)');
    if (imgPreview && imgPreview.src && !imgPreview.src.includes('data:')) return imgPreview.src;
    // 尝试获取模特卡片图片
    const modelImg = view.querySelector('.opc-model-card-img, .opc-col-left .grid img');
    if (modelImg && modelImg.src) return modelImg.src;
    return null;
  }

  function showGeneratingCard(job) {
    const card = generatingCard();
    if (!card) return;
    card.hidden = false;
    renderGalleryProgress(job.progress || 0, job);
    applyGalleryFilter(getActiveGalleryFilter());
  }

  function hideGeneratingCard() {
    const card = generatingCard();
    if (card) card.hidden = true;
    applyGalleryFilter(getActiveGalleryFilter());
  }

  function updateProfileGeneratingRow(job) {
    const row = document.querySelector('[data-opc-profile-generating]');
    if (!row) return;
    const active = job && job.state === 'generating';
    row.hidden = !active;
    if (active) {
      const title = row.querySelector('[data-opc-profile-gen-title]');
      const meta = SOURCE_META[job.source] || SOURCE_META.model;
      if (title) title.textContent = `${meta.title}生成中`;
    }
  }

  function scrollToStep(view, stepNum) {
    const step = view?.querySelector(`[data-opc-step="${stepNum}"]`);
    if (!step) return;
    step.scrollIntoView({ behavior: 'smooth', block: 'center' });
    step.classList.add('opc-step--highlight');
    setTimeout(() => step.classList.remove('opc-step--highlight'), 1600);
  }

  function fieldReady(view, name) {
    return view?.getAttribute(`data-opc-${name}`) === 'true';
  }

  function setFieldReady(view, name, ready) {
    if (!view) return;
    view.setAttribute(`data-opc-${name}`, ready ? 'true' : 'false');
    syncSummaryForView(view);
    syncGenerateButtons();
  }

  function syncSummaryForView(view) {
    if (!view) return;
    const route = view.getAttribute('data-route');

    if (route === 'model') {
      const garmentEl = view.querySelector('[data-opc-summary-garment]');
      if (garmentEl) {
        if (fieldReady(view, 'garment')) {
          garmentEl.textContent = '已上传';
          garmentEl.classList.remove('is-muted', 'is-error');
        } else {
          garmentEl.textContent = '等待上传…';
          garmentEl.classList.add('is-muted');
          garmentEl.classList.remove('is-error');
        }
      }
    }

    if (route === 'real') {
      const photoEl = view.querySelector('[data-opc-summary-photo]');
      if (photoEl) {
        if (fieldReady(view, 'photo')) {
          photoEl.innerHTML = '已上传';
          photoEl.classList.remove('is-muted', 'is-error');
        } else {
          photoEl.innerHTML = '<span class="material-symbols-outlined">error</span> 必填';
          photoEl.classList.add('is-error');
          photoEl.classList.remove('is-muted');
        }
      }
    }

    if (route === 'free') {
      const refEl = view.querySelector('[data-opc-summary-ref]');
      const descEl = view.querySelector('[data-opc-summary-desc]');
      const noImage = view.querySelector('[data-opc-no-image]')?.checked;

      if (refEl) {
        if (noImage) {
          refEl.textContent = '无图模式';
          refEl.classList.remove('is-muted', 'is-error');
        } else if (fieldReady(view, 'reference')) {
          refEl.textContent = '已上传';
          refEl.classList.remove('is-muted', 'is-error');
        } else {
          refEl.textContent = '未上传';
          refEl.classList.add('is-muted');
          refEl.classList.remove('is-error');
        }
      }

      if (descEl) {
        const prompt = view.querySelector('#prompt-input')?.value?.trim();
        if (prompt) {
          descEl.textContent = prompt.length > 18 ? `${prompt.slice(0, 18)}…` : prompt;
          descEl.classList.remove('is-muted', 'is-error');
        } else {
          descEl.textContent = '尚未填写';
          descEl.classList.add('is-muted');
          descEl.classList.remove('is-error');
        }
      }
    }
  }

  function validateSource(source) {
    const view = getActiveView(source);
    const checks = [];

    if (source === 'model') {
      checks.push({ step: 1, ok: fieldReady(view, 'model'), label: '选择模特' });
      checks.push({ step: 2, ok: fieldReady(view, 'garment'), label: '上传服装' });
    } else if (source === 'real') {
      checks.push({ step: 1, ok: fieldReady(view, 'photo'), label: '您的照片' });
      checks.push({ step: 2, ok: fieldReady(view, 'garment'), label: '目标服装' });
    } else if (source === 'free') {
      const noImage = view?.querySelector('[data-opc-no-image]')?.checked;
      checks.push({
        step: 1,
        ok: noImage || fieldReady(view, 'reference'),
        label: '参考图片',
      });
      checks.push({
        step: 2,
        ok: Boolean(view?.querySelector('#prompt-input')?.value?.trim()),
        label: '描述',
      });
    }

    const invalid = checks.filter((c) => !c.ok);
    return { valid: invalid.length === 0, invalid, view };
  }

  function syncGenerateButtons() {
    const route = parseRoute();
    if (!['model', 'real', 'free'].includes(route)) return;

    const view = getActiveView(route);
    const btn = view?.querySelector('[data-opc-generate]');
    if (!btn) return;

    const { valid } = validateSource(route);
    btn.setAttribute('aria-disabled', valid ? 'false' : 'true');
    btn.classList.toggle('is-disabled', !valid);
  }

  function collectSummaryLines(source) {
    const view = getActiveView(source);
    const rows = view?.querySelectorAll('.opc-summary-rows .opc-summary-row') || [];
    return Array.from(rows).map((row) => {
      const label = row.querySelector('.opc-summary-row-label')?.textContent?.trim() || '';
      const value = row.querySelector('.opc-summary-row-value')?.textContent?.trim() || '';
      return { label, value };
    }).filter((r) => r.label);
  }

  function ensureModal() {
    if (modalEl) return modalEl;

    modalEl = document.createElement('div');
    modalEl.className = 'opc-gen-modal';
    modalEl.hidden = true;
    modalEl.setAttribute('role', 'dialog');
    modalEl.setAttribute('aria-modal', 'true');
    modalEl.setAttribute('aria-labelledby', 'opc-gen-modal-title');
    modalEl.innerHTML =
      '<div class="opc-gen-modal-backdrop" data-opc-gen-modal-close tabindex="-1"></div>' +
      '<div class="opc-gen-modal-panel glass-panel">' +
      '<div class="opc-gen-modal-icon" data-opc-gen-modal-icon-wrap>' +
      '<span class="material-symbols-outlined" data-opc-gen-modal-icon>task_alt</span></div>' +
      '<h2 id="opc-gen-modal-title" class="opc-gen-modal-title">确认生成</h2>' +
      '<p class="opc-gen-modal-desc" data-opc-gen-modal-desc></p>' +
      '<div class="opc-gen-modal-summary" data-opc-gen-modal-summary hidden></div>' +
      '<div class="opc-gen-modal-credits" data-opc-gen-modal-credits hidden></div>' +
      '<p class="opc-gen-modal-warning" data-opc-gen-modal-warning hidden></p>' +
      '<div class="opc-gen-modal-actions" data-opc-gen-modal-actions></div>' +
      '</div>';

    document.body.appendChild(modalEl);

    modalEl.addEventListener('click', (e) => {
      if (e.target.closest('[data-opc-gen-modal-close]')) closeModal();
      else if (e.target.closest('[data-opc-gen-modal-cancel]')) closeModal();
      else if (e.target.closest('[data-opc-gen-modal-confirm]')) confirmGeneration();
      else if (e.target.closest('[data-opc-gen-modal-gallery]')) {
        closeModal();
        navigate('gallery');
      }
    });

    return modalEl;
  }

  function renderModalActions(step) {
    const actions = modalEl.querySelector('[data-opc-gen-modal-actions]');
    if (!actions) return;

    if (step === 'confirm') {
      actions.innerHTML =
        '<button type="button" class="opc-gen-modal-btn opc-gen-modal-btn--ghost" data-opc-gen-modal-cancel>取消</button>' +
        '<button type="button" class="opc-gen-modal-btn opc-gen-modal-btn--primary" data-opc-gen-modal-confirm>确认生成</button>';
    } else {
      actions.innerHTML =
        '<button type="button" class="opc-gen-modal-btn opc-gen-modal-btn--ghost" data-opc-gen-modal-close>知道了</button>' +
        '<button type="button" class="opc-gen-modal-btn opc-gen-modal-btn--primary" data-opc-gen-modal-gallery>前往我的作品</button>';
    }
  }

  function openConfirmModal(payload) {
    pendingSubmit = payload;
    modalStep = 'confirm';
    lastFocus = document.activeElement;

    const el = ensureModal();
    const meta = SOURCE_META[payload.source] || SOURCE_META.model;
    const balance = getCredits();
    const enough = balance >= payload.cost;

    el.querySelector('[data-opc-gen-modal-icon]').textContent = 'task_alt';
    el.querySelector('#opc-gen-modal-title').textContent = '确认生成';
    el.querySelector('[data-opc-gen-modal-desc]').textContent =
      `即将提交「${meta.modeLabel}」任务，请确认摘要与积分消耗。`;

    const summaryEl = el.querySelector('[data-opc-gen-modal-summary]');
    summaryEl.hidden = false;
    summaryEl.innerHTML =
      '<p class="opc-gen-modal-summary-title">任务摘要</p>' +
      payload.summary.map((row) =>
        `<div class="opc-gen-modal-summary-row"><span>${row.label}</span><strong>${row.value}</strong></div>`
      ).join('') +
      `<div class="opc-gen-modal-summary-row"><span>生成数量</span><strong>${payload.qty} 张</strong></div>`;

    const creditsEl = el.querySelector('[data-opc-gen-modal-credits]');
    creditsEl.hidden = false;
    creditsEl.innerHTML =
      `<span>本次消耗 <strong>${payload.cost} 积分</strong></span>` +
      `<span class="opc-gen-modal-credits-balance">余额 ${balance} 积分</span>`;
    creditsEl.classList.toggle('is-insufficient', !enough);

    const warnEl = el.querySelector('[data-opc-gen-modal-warning]');
    if (!enough) {
      warnEl.hidden = false;
      warnEl.textContent = '积分不足，请先充值或升级订阅后再试。';
    } else {
      warnEl.hidden = true;
    }

    renderModalActions('confirm');
    const confirmBtn = el.querySelector('[data-opc-gen-modal-confirm]');
    if (confirmBtn) {
      confirmBtn.disabled = !enough;
      confirmBtn.classList.toggle('is-disabled', !enough);
    }

    el.hidden = false;
    document.body.classList.add('opc-gen-modal-open');
    (enough ? confirmBtn : el.querySelector('[data-opc-gen-modal-cancel]'))?.focus();
  }

  function openSuccessModal() {
    modalStep = 'success';
    const el = ensureModal();

    el.querySelector('[data-opc-gen-modal-icon]').textContent = 'auto_awesome';
    el.querySelector('#opc-gen-modal-title').textContent = '任务已提交';
    el.querySelector('[data-opc-gen-modal-desc]').textContent =
      '效果图正在后台渲染，您可在「我的作品」页面查看实时进度。';

    el.querySelector('[data-opc-gen-modal-summary]').hidden = true;
    el.querySelector('[data-opc-gen-modal-credits]').hidden = true;
    el.querySelector('[data-opc-gen-modal-warning]').hidden = true;

    renderModalActions('success');
    el.querySelector('[data-opc-gen-modal-gallery]')?.focus();
  }

  function closeModal() {
    if (!modalEl || modalEl.hidden) return;
    modalEl.hidden = true;
    document.body.classList.remove('opc-gen-modal-open');
    pendingSubmit = null;
    modalStep = 'confirm';
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
  }

  function confirmGeneration() {
    if (!pendingSubmit) return;
    const { source, qty, cost } = pendingSubmit;
    const balance = getCredits();
    if (balance < cost) return;

    setCredits(balance - cost);
    startGeneration(source, qty, cost);
    // 不再弹出成功提示，直接跳转到「我的作品」的「进行中」Tab
    closeModal();
    navigate('gallery');
    // 延迟一点确保路由切换完成后再切tab
    requestAnimationFrame(() => {
      setGalleryTab('active');
    });
  }

  function setGalleryTab(filter) {
    const tabs = document.querySelector('[data-opc-gallery-tabs]');
    if (!tabs) return;
    tabs.querySelectorAll('button').forEach((b) => b.classList.remove('is-active'));
    const btn = tabs.querySelector(`button[data-opc-gallery-filter="${filter}"]`);
    if (btn) btn.classList.add('is-active');
    applyGalleryFilter(filter);
  }

  function insertFinishedWorkCard(job) {
    const grid = document.querySelector('.opc-gallery-grid');
    if (!grid) return;

    const meta = SOURCE_META[job.source] || SOURCE_META.model;
    const workId = `work-gen-${Date.now()}`;

    // 从当前试衣页获取缩略图（如果有已上传的图片）
    const view = getActiveView(job.source);
    let thumbUrl = '';
    const imgPreview = view?.querySelector('.opc-upload-preview img');
    if (imgPreview) {
      thumbUrl = imgPreview.src;
    }
    // fallback 图片
    if (!thumbUrl) {
      thumbUrl = 'https://lh3.googleusercontent.com/aida-public/AB6AXuDVof0tdfpgZDW7gpB7FDkcCHhvmFaJgMeycPS_D1hqQA4PUAWOE78RZMeyiR4C-ehcbaRVn7AHyZub-KzAmfky2V2T_hSsf3TBc7MzC7V5rO0AwHHpWA4wE4ou44Lfp8hT69bkq44diPVdB1XbB7uxm0FYDHXzAq5TFJW4xB-3WQAIyeNSpiRsA3YX2-6wxQCY0G2gWeqMeyvL8SMdZi5GrWfzoeTqVgkTlfn2KKWS6KC1yhwvroUULAD8WbU0OTJBEsyrzsp8Jp7K';
    }

    const card = document.createElement('div');
    card.className = 'group glass-panel opc-gallery-card opc-gen-fresh';
    card.setAttribute('data-opc-gallery-status', 'done');
    card.setAttribute('data-opc-work-id', workId);

    card.innerHTML =
      '<div class="opc-gallery-card-media">' +
      '  <img alt="' + meta.title + '" src="' + thumbUrl + '"/>' +
      '  <span class="opc-gallery-badge">' + meta.modeLabel + '</span>' +
      '  <button type="button" class="opc-gallery-fav" aria-label="收藏"><span class="material-symbols-outlined text-[18px]">favorite_border</span></button>' +
      '  <div class="opc-gallery-overlay">' +
      '    <button type="button" class="px-4 h-10 flex items-center gap-2 bg-white/90 text-primary rounded-full font-label-md text-label-md shadow-lg hover:bg-white transition-colors" data-opc-share-square="' + workId + '"><span class="material-symbols-outlined text-[18px]">share</span> 发布到广场</button>' +
      '    <button type="button" class="opc-icon-btn bg-white/90" data-opc-preview-zoom title="放大查看" aria-label="放大查看"><span class="material-symbols-outlined text-[20px]">zoom_in</span></button>' +
      '    <button type="button" class="opc-icon-btn bg-white/90" title="下载" aria-label="下载"><span class="material-symbols-outlined text-[20px]">download</span></button>' +
      '    <button type="button" class="px-4 h-10 flex items-center gap-2 bg-gradient-primary text-white rounded-full font-label-md text-label-md shadow-lg hover:opacity-90 transition-opacity">' +
      '      <span class="material-symbols-outlined text-[18px]">refresh</span> 再次使用' +
      '    </button>' +
      '  </div>' +
      '</div>' +
      '<div class="opc-gallery-card-footer">' +
      '  <p class="opc-gallery-card-title">' + meta.title + '</p>' +
      '  <span class="opc-gallery-card-time">刚刚</span>' +
      '  <div class="opc-gallery-card-tags">' +
      '    <span class="opc-tag bg-primary/10 text-primary">' + meta.modeLabel + '</span>' +
      '  </div>' +
      '</div>';

    // 插入到生成中卡片后面，或grid最前面
    const generatingCard = grid.querySelector('[data-opc-gallery-generating]');
    if (generatingCard) {
      generatingCard.after(card);
    } else {
      grid.insertBefore(card, grid.firstChild);
    }

    // 添加淡入动画
    requestAnimationFrame(() => {
      card.classList.add('opc-gen-fade-in');
    });
  }

  function finishJob(job) {
    job.state = 'done';
    job.progress = 100;
    job.finishedAt = Date.now();
    saveJob(job);
    clearTimers();
    hideGeneratingCard();
    updateProfileGeneratingRow(null);
    setGalleryUnread(true);

    // 插入完成的作品卡片
    insertFinishedWorkCard(job);

    // 自动切换到「已完成」Tab
    setGalleryTab('done');

    window.dispatchEvent(new CustomEvent('opc-gen-complete', { detail: job }));
  }

  function runProgress(job) {
    clearTimers();
    showGeneratingCard(job);
    updateProfileGeneratingRow(job);

    const startAt = job.startedAt || Date.now();
    job.startedAt = startAt;
    saveJob(job);

    const tick = () => {
      const elapsed = Date.now() - startAt;
      const progress = Math.min(100, (elapsed / DURATION_MS) * 100);
      job.progress = progress;
      saveJob(job);
      renderGalleryProgress(progress, job);

      if (progress >= 100) {
        clearTimers();
        setTimeout(() => finishJob(job), 350);
      }
    };

    tick();
    tickTimer = setInterval(tick, 120);
  }

  function syncUI() {
    syncCreditsUI();
    setGalleryUnread(sessionStorage.getItem(UNREAD_KEY) === '1');
    const job = getJob();

    if (!job) {
      hideGeneratingCard();
      updateProfileGeneratingRow(null);
      applyGalleryFilter(getActiveGalleryFilter());
      return;
    }

    if (job.state === 'done') {
      hideGeneratingCard();
      updateProfileGeneratingRow(null);
      if (parseRoute() === 'gallery') {
        sessionStorage.removeItem(STORAGE_KEY);
        setGalleryUnread(false);
      }
      applyGalleryFilter(getActiveGalleryFilter());
      return;
    }

    if (job.state === 'generating') {
      showGeneratingCard(job);
      updateProfileGeneratingRow(job);
      if (!tickTimer) runProgress(job);
    }
  }

  function startGeneration(source, qty, cost) {
    clearTimers();
    setGalleryUnread(false);
    const thumbnail = captureThumbnail(source);
    const job = {
      source,
      qty,
      cost: cost || getBaseCost(source),
      progress: 0,
      state: 'generating',
      startedAt: Date.now(),
      thumbnail: thumbnail || undefined,
    };
    saveJob(job);
    runProgress(job);
  }

  function handleGenerateClick(btn) {
    const route = parseRoute();
    const source = ['model', 'real', 'free'].includes(route)
      ? route
      : btn.getAttribute('data-opc-source') || 'model';
    const { valid, invalid, view } = validateSource(source);

    if (!valid) {
      const first = invalid[0];
      if (first) scrollToStep(view, first.step);
      return;
    }

    const qty = parseQty(btn);
    const cost = getBaseCost(source);
    openConfirmModal({
      source,
      qty,
      cost,
      summary: collectSummaryLines(source),
    });
  }

  function initWorkspaceState() {
    ['model', 'real', 'free'].forEach((source) => {
      const view = document.querySelector(`.opc-view[data-route="${source}"]`);
      if (!view) return;

      if (source === 'model') {
        if (!view.hasAttribute('data-opc-model')) view.setAttribute('data-opc-model', 'true');
        if (!view.hasAttribute('data-opc-garment')) view.setAttribute('data-opc-garment', 'false');
      }
      if (source === 'real') {
        if (!view.hasAttribute('data-opc-photo')) view.setAttribute('data-opc-photo', 'false');
        if (!view.hasAttribute('data-opc-garment')) view.setAttribute('data-opc-garment', 'true');
      }
      if (source === 'free') {
        if (!view.hasAttribute('data-opc-reference')) view.setAttribute('data-opc-reference', 'false');
      }
      syncSummaryForView(view);
    });
    syncGenerateButtons();
  }

  function initUploadSimulation() {
    document.addEventListener('click', (e) => {
      const upload = e.target.closest('.opc-upload');
      if (!upload) return;
      const view = upload.closest('.opc-view');
      const route = view?.getAttribute('data-route');
      if (route === 'model' && upload.closest('.opc-col-mid')) {
        setFieldReady(view, 'garment', true);
      }
      if (route === 'real' && upload.closest('.opc-col-left')) {
        setFieldReady(view, 'photo', true);
      }
      if (route === 'free' && upload.closest('.opc-col-left')) {
        setFieldReady(view, 'reference', true);
      }
    });

    document.addEventListener('change', (e) => {
      const checkbox = e.target.closest('[data-opc-no-image]');
      if (!checkbox) return;
      const view = checkbox.closest('.opc-view');
      const refUpload = view?.querySelector('[data-opc-ref-upload]');
      if (refUpload) refUpload.classList.toggle('is-disabled', checkbox.checked);
      syncSummaryForView(view);
      syncGenerateButtons();
    });

    document.addEventListener('input', (e) => {
      if (e.target.matches('#prompt-input')) {
        const view = e.target.closest('.opc-view');
        syncSummaryForView(view);
        syncGenerateButtons();
      }
    });

    document.addEventListener('click', (e) => {
      const modelCard = e.target.closest('.opc-col-left .grid .relative.rounded-xl');
      const view = modelCard?.closest('.opc-view[data-route="model"]');
      if (!view || !modelCard || modelCard.querySelector('[data-goto]')) return;
      view.querySelectorAll('.opc-col-left .grid .relative.rounded-xl').forEach((card) => {
        card.classList.remove('ring-2', 'ring-primary', 'ring-offset-2', 'ring-offset-transparent');
        card.classList.add('border', 'border-white/40');
      });
      modelCard.classList.add('ring-2', 'ring-primary', 'ring-offset-2', 'ring-offset-transparent');
      modelCard.classList.remove('border', 'border-white/40');
      setFieldReady(view, 'model', true);
    });
  }

  function getActiveGalleryFilter() {
    return document.querySelector('[data-opc-gallery-tabs] button.is-active')?.getAttribute('data-opc-gallery-filter') || 'all';
  }

  function applyGalleryFilter(filter) {
    const grid = document.querySelector('.opc-gallery-grid');
    if (!grid) return;

    const generating = grid.querySelector('[data-opc-gallery-generating]');
    const doneCards = grid.querySelectorAll('[data-opc-gallery-status="done"]');

    const showGenerating = filter === 'all' || filter === 'active';
    const showDone = filter === 'all' || filter === 'done';

    if (generating) {
      const hasActiveJob = generating.hidden === false;
      generating.style.display = showGenerating && hasActiveJob ? '' : 'none';
    }

    doneCards.forEach((card) => {
      card.style.display = showDone ? '' : 'none';
    });

    const empty = grid.querySelector('[data-opc-gallery-empty]');
    const visibleDone = Array.from(doneCards).some((c) => c.style.display !== 'none');
    const visibleGenerating = generating && generating.style.display !== 'none';
    if (empty) {
      empty.hidden = visibleDone || visibleGenerating;
    }
  }

  function initGalleryTabs() {
    const tabs = document.querySelector('[data-opc-gallery-tabs]');
    if (!tabs) return;

    tabs.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-opc-gallery-filter]');
      if (!btn) return;
      tabs.querySelectorAll('button').forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      applyGalleryFilter(btn.getAttribute('data-opc-gallery-filter'));
    });

    applyGalleryFilter(getActiveGalleryFilter());
  }

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-opc-generate]');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    handleGenerateClick(btn);
  });

  document.addEventListener('keydown', (e) => {
    if (!modalEl || modalEl.hidden) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      closeModal();
    }
  });

  window.addEventListener('opc-route-change', (e) => {
    if (e.detail?.route === 'gallery' && sessionStorage.getItem(UNREAD_KEY) === '1') {
      setGalleryUnread(false);
      const job = getJob();
      if (job?.state === 'done') sessionStorage.removeItem(STORAGE_KEY);
    }
    syncGenerateButtons();
    syncUI();
  });

  function boot() {
    initWorkspaceState();
    initUploadSimulation();
    initGalleryTabs();
    syncUI();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.OPCGen = { startGeneration, syncUI, getJob, getCredits, setCredits };
})();
