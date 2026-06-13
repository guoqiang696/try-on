/**
 * OPC 试衣 — 图片放大预览 Lightbox
 * 生成完成缩略图、作品库卡片均可点击放大查看
 */
(function () {
  'use strict';

  let overlay = null;
  let items = [];
  let index = 0;
  let lastFocus = null;

  function ensureOverlay() {
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.className = 'opc-lightbox';
    overlay.hidden = true;
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', '图片预览');
    overlay.innerHTML =
      '<div class="opc-lightbox-backdrop" data-opc-lightbox-close tabindex="-1"></div>' +
      '<div class="opc-lightbox-panel">' +
      '<button type="button" class="opc-lightbox-close" data-opc-lightbox-close aria-label="关闭">' +
      '<span class="material-symbols-outlined">close</span></button>' +
      '<button type="button" class="opc-lightbox-nav opc-lightbox-prev" data-opc-lightbox-prev aria-label="上一张">' +
      '<span class="material-symbols-outlined">chevron_left</span></button>' +
      '<button type="button" class="opc-lightbox-nav opc-lightbox-next" data-opc-lightbox-next aria-label="下一张">' +
      '<span class="material-symbols-outlined">chevron_right</span></button>' +
      '<div class="opc-lightbox-stage">' +
      '<img class="opc-lightbox-img" alt="" />' +
      '</div>' +
      '<div class="opc-lightbox-meta">' +
      '<p class="opc-lightbox-title"></p>' +
      '<span class="opc-lightbox-counter"></span>' +
      '</div>' +
      '</div>';

    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => {
      if (e.target.closest('[data-opc-lightbox-close]')) close();
      else if (e.target.closest('[data-opc-lightbox-prev]')) step(-1);
      else if (e.target.closest('[data-opc-lightbox-next]')) step(1);
    });

    return overlay;
  }

  function itemFromNode(node) {
    const img = node.matches('img') ? node : node.querySelector('img');
    if (!img) return null;
    const card = node.closest('.opc-gallery-card');
    const title = node.getAttribute('data-opc-preview-title') ||
      card?.querySelector('.opc-gallery-card-title')?.textContent?.trim() ||
      img.getAttribute('alt') ||
      '';
    return { src: img.currentSrc || img.src, alt: img.alt || '', title };
  }

  function collectGenThumbs(thumb) {
    const grid = thumb.closest('[data-opc-gen-thumbs]');
    if (!grid) return null;
    return Array.from(grid.querySelectorAll('[data-opc-gen-thumb]:not([hidden])'))
      .map(itemFromNode)
      .filter(Boolean);
  }

  function collectGalleryGroup(media) {
    const grid = media.closest('.opc-gallery-grid');
    if (!grid) return null;
    return Array.from(grid.querySelectorAll('.opc-gallery-card:not(.is-generating) .opc-gallery-card-media'))
      .map(itemFromNode)
      .filter(Boolean);
  }

  function render() {
    const el = ensureOverlay();
    const img = el.querySelector('.opc-lightbox-img');
    const titleEl = el.querySelector('.opc-lightbox-title');
    const counterEl = el.querySelector('.opc-lightbox-counter');
    const prevBtn = el.querySelector('[data-opc-lightbox-prev]');
    const nextBtn = el.querySelector('[data-opc-lightbox-next]');
    const current = items[index];

    if (!current) return;

    img.src = current.src;
    img.alt = current.alt;
    titleEl.textContent = current.title;
    titleEl.hidden = !current.title;

    const multi = items.length > 1;
    prevBtn.hidden = !multi;
    nextBtn.hidden = !multi;
    counterEl.hidden = !multi;
    if (multi) counterEl.textContent = `${index + 1} / ${items.length}`;

    el.setAttribute('aria-label', current.title || '图片预览');
  }

  function step(delta) {
    if (items.length <= 1) return;
    index = (index + delta + items.length) % items.length;
    render();
  }

  function open(nextItems, startIndex) {
    if (!nextItems.length) return;

    lastFocus = document.activeElement;
    items = nextItems;
    index = Math.max(0, Math.min(startIndex, items.length - 1));

    const el = ensureOverlay();
    render();
    el.hidden = false;
    document.body.classList.add('opc-lightbox-open');
    el.querySelector('.opc-lightbox-close')?.focus();
  }

  function close() {
    if (!overlay || overlay.hidden) return;
    overlay.hidden = true;
    document.body.classList.remove('opc-lightbox-open');
    items = [];
    index = 0;
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
  }

  function openFromTrigger(trigger) {
    let list = null;
    let start = 0;

    if (trigger.matches('[data-opc-gen-thumb]')) {
      list = collectGenThumbs(trigger);
      if (list) {
        const grid = trigger.closest('[data-opc-gen-thumbs]');
        const thumbs = Array.from(grid.querySelectorAll('[data-opc-gen-thumb]:not([hidden])'));
        start = thumbs.indexOf(trigger);
      }
    } else if (trigger.matches('.opc-gallery-card-media') || trigger.closest('.opc-gallery-card-media')) {
      const media = trigger.matches('.opc-gallery-card-media') ? trigger : trigger.closest('.opc-gallery-card-media');
      list = collectGalleryGroup(media);
      if (list) {
        const allMedia = Array.from(
          media.closest('.opc-gallery-grid').querySelectorAll('.opc-gallery-card:not(.is-generating) .opc-gallery-card-media')
        );
        start = allMedia.indexOf(media);
      }
    } else if (trigger.matches('[data-opc-preview]')) {
      const single = itemFromNode(trigger);
      if (single) list = [single];
    }

    if (!list?.length) {
      const single = itemFromNode(trigger);
      if (single) list = [single];
    }

    open(list, start < 0 ? 0 : start);
  }

  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-opc-lightbox-close], [data-opc-lightbox-prev], [data-opc-lightbox-next]')) return;

    const zoomBtn = e.target.closest('[data-opc-preview-zoom]');
    if (zoomBtn) {
      e.preventDefault();
      e.stopPropagation();
      const media = zoomBtn.closest('.opc-gallery-card-media');
      if (media) openFromTrigger(media);
      return;
    }

    const thumb = e.target.closest('[data-opc-gen-thumb]');
    if (thumb) {
      e.preventDefault();
      e.stopPropagation();
      openFromTrigger(thumb);
      return;
    }

    const media = e.target.closest('.opc-gallery-card-media');
    if (media && !media.closest('.is-generating')) {
      const overlayHit = e.target.closest('.opc-gallery-overlay');
      if (overlayHit && e.target.closest('button:not([data-opc-preview-zoom])')) return;
      if (!overlayHit && e.target.closest('button')) return;
      e.preventDefault();
      openFromTrigger(media);
    }
  });

  document.addEventListener('keydown', (e) => {
    if (!overlay || overlay.hidden) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      step(-1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      step(1);
    }
  });

  window.OPCLightbox = { open, close };
})();
