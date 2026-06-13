/**
 * OPC 试衣 — 订阅方案弹窗
 */
(function () {
  'use strict';

  const PLAN_KEY = 'opc-subscription-plan';

  const PLANS = {
    pro: { name: 'Pro', label: 'Pro 会员', credits: 500 },
    plus: { name: 'Plus', label: 'Plus 会员', credits: 1500 },
    ultra: { name: 'Ultra', label: 'Ultra 会员', credits: 5000 },
  };

  let modalEl = null;
  let lastFocus = null;

  function getCurrentPlan() {
    return localStorage.getItem(PLAN_KEY) || 'plus';
  }

  function setCurrentPlan(planId) {
    localStorage.setItem(PLAN_KEY, planId);
    syncPlanUI(planId);
  }

  function syncPlanUI(planId) {
    const plan = PLANS[planId] || PLANS.plus;
    document.querySelectorAll('[data-opc-profile-plan]').forEach((el) => {
      el.textContent = plan.label;
    });
    document.querySelectorAll('[data-opc-profile-plan-summary]').forEach((el) => {
      el.textContent = `当前方案：${plan.name} · 每月 ${plan.credits.toLocaleString()} 积分`;
    });

    if (!modalEl) return;
    modalEl.querySelectorAll('[data-opc-plan-id]').forEach((btn) => {
      const id = btn.getAttribute('data-opc-plan-id');
      const isCurrent = id === planId;
      btn.classList.toggle('opc-plan-btn--primary', isCurrent);
      btn.textContent = isCurrent ? '当前方案' : `选择 ${PLANS[id]?.name || id}`;
      btn.disabled = isCurrent;
    });
  }

  function planGridHTML() {
    return (
      '<div class="opc-plan-grid">' +
      '<article class="opc-plan-card" data-opc-plan-card="pro">' +
      '<div class="opc-plan-header"><h3 class="opc-plan-name">Pro</h3>' +
      '<p class="opc-plan-price"><span>¥29</span><small>/月</small></p></div>' +
      '<ul class="opc-plan-features">' +
      '<li><span class="material-symbols-outlined">monetization_on</span> 500 积分 / 月</li>' +
      '<li><span class="material-symbols-outlined">face</span> 三种试衣模式</li>' +
      '<li><span class="material-symbols-outlined">hd</span> 标清生成</li>' +
      '<li><span class="material-symbols-outlined">schedule</span> 标准队列</li>' +
      '</ul>' +
      '<button type="button" class="opc-plan-btn" data-opc-plan-id="pro">选择 Pro</button>' +
      '</article>' +
      '<article class="opc-plan-card is-recommended" data-opc-plan-card="plus">' +
      '<span class="opc-plan-badge">推荐</span>' +
      '<div class="opc-plan-header"><h3 class="opc-plan-name">Plus</h3>' +
      '<p class="opc-plan-price"><span>¥79</span><small>/月</small></p></div>' +
      '<ul class="opc-plan-features">' +
      '<li><span class="material-symbols-outlined">monetization_on</span> 1,500 积分 / 月</li>' +
      '<li><span class="material-symbols-outlined">bolt</span> 优先渲染队列</li>' +
      '<li><span class="material-symbols-outlined">4k</span> 高清生成</li>' +
      '<li><span class="material-symbols-outlined">batch_prediction</span> 批量生成 8 张</li>' +
      '</ul>' +
      '<button type="button" class="opc-plan-btn" data-opc-plan-id="plus">选择 Plus</button>' +
      '</article>' +
      '<article class="opc-plan-card" data-opc-plan-card="ultra">' +
      '<div class="opc-plan-header"><h3 class="opc-plan-name">Ultra</h3>' +
      '<p class="opc-plan-price"><span>¥199</span><small>/月</small></p></div>' +
      '<ul class="opc-plan-features">' +
      '<li><span class="material-symbols-outlined">monetization_on</span> 5,000 积分 / 月</li>' +
      '<li><span class="material-symbols-outlined">rocket_launch</span> 最高优先级</li>' +
      '<li><span class="material-symbols-outlined">api</span> API 接入额度</li>' +
      '<li><span class="material-symbols-outlined">support_agent</span> 专属客服</li>' +
      '</ul>' +
      '<button type="button" class="opc-plan-btn" data-opc-plan-id="ultra">选择 Ultra</button>' +
      '</article>' +
      '</div>'
    );
  }

  function ensureModal() {
    if (modalEl) return modalEl;

    modalEl = document.createElement('div');
    modalEl.className = 'opc-subscription-modal';
    modalEl.hidden = true;
    modalEl.setAttribute('role', 'dialog');
    modalEl.setAttribute('aria-modal', 'true');
    modalEl.setAttribute('aria-labelledby', 'opc-subscription-modal-title');
    modalEl.innerHTML =
      '<div class="opc-subscription-modal-backdrop" data-opc-subscription-close tabindex="-1"></div>' +
      '<div class="opc-subscription-modal-panel glass-panel">' +
      '<button type="button" class="opc-subscription-modal-close" data-opc-subscription-close aria-label="关闭">' +
      '<span class="material-symbols-outlined">close</span></button>' +
      '<div class="opc-subscription-modal-header">' +
      '<div class="opc-subscription-modal-icon">' +
      '<span class="material-symbols-outlined">workspace_premium</span></div>' +
      '<div><h2 id="opc-subscription-modal-title" class="opc-subscription-modal-title">订阅方案</h2>' +
      '<p class="opc-subscription-modal-desc">升级后每月自动发放积分，未用完可累计至下月</p></div>' +
      '</div>' +
      planGridHTML() +
      '</div>';

    document.body.appendChild(modalEl);

    modalEl.addEventListener('click', (e) => {
      if (e.target.closest('[data-opc-subscription-close]')) closeModal();
      const planBtn = e.target.closest('[data-opc-plan-id]');
      if (planBtn && !planBtn.disabled) {
        const planId = planBtn.getAttribute('data-opc-plan-id');
        if (PLANS[planId]) setCurrentPlan(planId);
      }
    });

    return modalEl;
  }

  function openModal() {
    lastFocus = document.activeElement;
    const el = ensureModal();
    syncPlanUI(getCurrentPlan());
    el.hidden = false;
    document.body.classList.add('opc-subscription-modal-open');
    el.querySelector('[data-opc-subscription-close]')?.focus();
  }

  function closeModal() {
    if (!modalEl || modalEl.hidden) return;
    modalEl.hidden = true;
    document.body.classList.remove('opc-subscription-modal-open');
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
  }

  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-opc-open-subscription]')) {
      e.preventDefault();
      openModal();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (!modalEl || modalEl.hidden) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      closeModal();
    }
  });

  function boot() {
    syncPlanUI(getCurrentPlan());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.OPCSubscription = { openModal, closeModal, getCurrentPlan, setCurrentPlan };
})();
