/**
 * OPC 智能试衣 — 单页 Hash 路由
 * #home #model #models #real #free #gallery #profile
 */
(function () {
  const TRY_ROUTES = new Set(['model', 'models', 'real', 'free']);
  const SIDEBAR_ROUTES = {
    model: 'model',
    models: 'model',
    real: 'real',
    free: 'free',
    gallery: 'gallery',
  };

  const ROUTES = {
    home: { title: '首页', top: 'home' },
    model: { title: '预设模特换装', top: 'try', sidebar: 'model' },
    models: { title: '全部模特', top: 'try', sidebar: 'model' },
    real: { title: '真人照片试穿', top: 'try', sidebar: 'real' },
    free: { title: '自由风格生成', top: 'try', sidebar: 'free' },
    gallery: { title: '我的作品', top: 'gallery', sidebar: 'gallery' },
    profile: { title: '订阅与积分', top: 'profile' },
  };

  const DEFAULT = 'home';
  const sidebar = document.getElementById('opc-workspace-sidebar');
  const viewport = document.getElementById('opc-viewport');
  const views = document.querySelectorAll('.opc-view');

  function parseRoute() {
    const hash = (location.hash || '').replace(/^#\/?/, '').split('?')[0];
    if (hash === 'workspace') return 'model';
    if (hash === 'status') return 'gallery';
    return ROUTES[hash] ? hash : DEFAULT;
  }

  function setMainId() {
    document.querySelectorAll('[data-main]').forEach((el) => el.removeAttribute('id'));
    const active = document.querySelector('.opc-view:not([hidden]) [data-main]');
    if (active) active.id = 'main-content';
  }

  function scrollToId(id) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function updateTopNav(route) {
    const meta = ROUTES[route];
    document.querySelectorAll('[data-top-nav]').forEach((el) => {
      const key = el.getAttribute('data-top-nav');
      const active = meta.top === key;
      el.classList.toggle('opc-nav-active-border', active);
      el.classList.toggle('text-primary', active);
      el.classList.toggle('font-bold', active);
      el.classList.toggle('border-b-2', active);
      el.classList.toggle('border-primary', active);
      el.classList.toggle('pb-1', active);
      el.classList.toggle('text-on-surface-variant', !active);
      el.setAttribute('aria-current', active ? 'page' : 'false');
    });
  }

  function resolveSidebarKey(route) {
    return SIDEBAR_ROUTES[route];
  }

  function shouldShowSidebar(route) {
    return SIDEBAR_ROUTES[route] !== undefined;
  }

  function updateSidebar(route) {
    if (!sidebar) return;
    const sidebarKey = resolveSidebarKey(route);
    const show = shouldShowSidebar(route);
    sidebar.setAttribute('data-visible', show ? 'true' : 'false');
    document.querySelectorAll('[data-sidebar-nav]').forEach((el) => {
      const key = el.getAttribute('data-sidebar-nav');
      const active = sidebarKey === key;
      el.classList.toggle('opc-sidebar-active', active);
      el.setAttribute('aria-current', active ? 'page' : 'false');
    });
  }

  function updateBottomNav(route) {
    let bottomKey = 'home';
    if (route === 'profile') bottomKey = 'profile';
    else if (route === 'gallery') bottomKey = 'gallery';
    else if (TRY_ROUTES.has(route)) bottomKey = 'try';

    document.querySelectorAll('[data-bottom-nav]').forEach((el) => {
      const key = el.getAttribute('data-bottom-nav');
      const active = bottomKey === key;
      el.classList.toggle('opc-bottom-active', active);
      el.setAttribute('aria-current', active ? 'page' : 'false');
    });
  }

  function render(route) {
    if (!ROUTES[route]) route = DEFAULT;

    const rawHash = (location.hash || '').replace(/^#\/?/, '').split('?')[0];
    if (rawHash === 'status' && location.hash !== '#gallery') {
      history.replaceState(null, '', '#gallery');
    }

    views.forEach((view) => {
      view.hidden = view.getAttribute('data-route') !== route;
    });

    const showSidebar = shouldShowSidebar(route);
    if (viewport) {
      viewport.setAttribute('data-sidebar', showSidebar ? 'open' : 'closed');
    }

    document.title = `${ROUTES[route].title} - OPC 智能试衣`;
    updateTopNav(route);
    updateSidebar(route);
    updateBottomNav(route);
    setMainId();
    window.scrollTo(0, 0);

    const pendingScroll = sessionStorage.getItem('opc-scroll');
    if (pendingScroll) {
      sessionStorage.removeItem('opc-scroll');
      requestAnimationFrame(() => scrollToId(pendingScroll));
    }

    window.dispatchEvent(new CustomEvent('opc-route-change', { detail: { route } }));
  }

  function navigate(route, scrollTarget) {
    if (route === 'workspace') route = 'model';
    if (route === 'status') route = 'gallery';
    if (!ROUTES[route]) route = DEFAULT;
    if (scrollTarget) sessionStorage.setItem('opc-scroll', scrollTarget);
    const next = `#${route}`;
    if (location.hash !== next) location.hash = route;
    else render(route);
  }

  document.addEventListener('click', (e) => {
    const scrollEl = e.target.closest('[data-scroll]');
    if (scrollEl) {
      e.preventDefault();
      const target = scrollEl.getAttribute('data-scroll');
      if (parseRoute() === 'profile') scrollToId(target);
      else navigate('profile', target);
      return;
    }

    const nav = e.target.closest('[data-nav]');
    if (nav) {
      e.preventDefault();
      navigate(nav.getAttribute('data-nav'), nav.getAttribute('data-scroll') || null);
      return;
    }

    const goto = e.target.closest('[data-goto]');
    if (goto) {
      e.preventDefault();
      navigate(goto.getAttribute('data-goto'));
    }
  });

  document.addEventListener('keydown', (e) => {
    const interactive = e.target.closest('[data-goto], [data-scroll], [data-nav], [data-opc-generate]');
    if (interactive && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      interactive.click();
    }
  });

  window.OPC = { navigate, parseRoute, render };

  window.addEventListener('hashchange', () => render(parseRoute()));
  render(parseRoute());
})();
