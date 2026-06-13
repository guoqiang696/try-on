/**
 * React Bits 风格动效 — 纯 JS 增强（无需 React）
 */
(function () {
  'use strict';

  function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /* BlurText：按词拆分并交错入场 */
  function initBlurText() {
    document.querySelectorAll('[data-rb-blur-text]').forEach((el) => {
      if (el.dataset.rbBlurReady) return;
      el.dataset.rbBlurReady = '1';

      const raw = el.textContent.trim();
      el.textContent = '';
      el.classList.add('rb-blur-text');

      raw.split(/(\s+)/).forEach((part, i) => {
        if (/^\s+$/.test(part)) {
          el.appendChild(document.createTextNode(part));
          return;
        }
        const span = document.createElement('span');
        span.className = 'rb-word';
        span.textContent = part;
        span.style.transitionDelay = i * 0.06 + 's';
        el.appendChild(span);
      });

      const show = () => el.classList.add('is-visible');
      if (prefersReducedMotion()) {
        show();
        return;
      }
      const obs = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            show();
            obs.disconnect();
          }
        },
        { threshold: 0.3 }
      );
      obs.observe(el);
    });
  }

  /* FadeContent：滚动显现 */
  function initFadeUp() {
    document.querySelectorAll('[data-rb-fade-up]').forEach((el) => {
      el.classList.add('rb-fade-up');
      if (prefersReducedMotion()) {
        el.classList.add('is-visible');
        return;
      }
      const obs = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible');
              obs.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
      );
      obs.observe(el);
    });
  }

  /* GlareHover：鼠标跟踪光晕 */
  function initGlareCards() {
    if (prefersReducedMotion()) return;

    document.querySelectorAll('[data-rb-glare]').forEach((card) => {
      card.classList.add('rb-glare-card');

      card.addEventListener('pointermove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        card.style.setProperty('--glare-x', x + '%');
        card.style.setProperty('--glare-y', y + '%');
      });
    });
  }

  /* Magnet：按钮微吸附 */
  function initMagnetButtons() {
    if (prefersReducedMotion()) return;

    document.querySelectorAll('[data-rb-magnet]').forEach((btn) => {
      btn.classList.add('rb-magnet-btn');
      const strength = 0.28;

      btn.addEventListener('pointermove', (e) => {
        const rect = btn.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = (e.clientX - cx) * strength;
        const dy = (e.clientY - cy) * strength;
        btn.style.transform = 'translate(' + dx + 'px, ' + dy + 'px)';
      });

      btn.addEventListener('pointerleave', () => {
        btn.style.transform = '';
      });
    });
  }

  function initAurora() {
    document.querySelectorAll('[data-rb-aurora]').forEach((host) => {
      if (host.querySelector('.rb-aurora')) return;
      const aurora = document.createElement('div');
      aurora.className = 'rb-aurora';
      aurora.setAttribute('aria-hidden', 'true');
      aurora.innerHTML =
        '<div class="rb-aurora__blob rb-aurora__blob--1"></div>' +
        '<div class="rb-aurora__blob rb-aurora__blob--2"></div>' +
        '<div class="rb-aurora__blob rb-aurora__blob--3"></div>';
      host.prepend(aurora);
    });
  }

  function init() {
    initAurora();
    initBlurText();
    initFadeUp();
    initGlareCards();
    initMagnetButtons();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.addEventListener('hashchange', () => {
    requestAnimationFrame(init);
  });
})();
