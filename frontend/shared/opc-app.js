(function () {
  const API_BASE = window.OPC_API_BASE || "";
  const TOKEN_KEY = "opc-token";
  const LAST_JOB_KEY = "opc-last-job-id";
  const GALLERY_UNREAD_KEY = "opc-gallery-unread";
  const CIRCLE_LEN = 226.2;
  const GENERATION_COST = 5;
  const SOURCE_META = {
    model: { modeLabel: "模特试衣", title: "试衣效果图", baseCost: GENERATION_COST, multiplier: 1 },
    real: { modeLabel: "真人试衣", title: "试衣效果图", baseCost: GENERATION_COST, multiplier: 1.2 },
    free: { modeLabel: "自由风格", title: "试衣效果图", baseCost: GENERATION_COST, multiplier: 1 },
  };
  const state = {
    user: null,
    token: localStorage.getItem(TOKEN_KEY) || "",
    route: "",
    files: {},
    urls: {},
    quantity: { model: 1, real: 1, free: 1 },
    pollTimer: null,
    genModal: null,
    pendingGeneration: null,
    genModalLastFocus: null,
    initialViews: {},
  };

  function $(selector, root = document) {
    return root.querySelector(selector);
  }

  function $all(selector, root = document) {
    return Array.from(root.querySelectorAll(selector));
  }

  function route() {
    const current = (location.hash || "#home").replace(/^#\/?/, "").split("?")[0] || "home";
    return current === "status" ? "gallery" : current;
  }

  function toast(message, type = "info") {
    let el = $("#opc-toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "opc-toast";
      el.className = "fixed left-1/2 top-24 z-[100] -translate-x-1/2 rounded-xl px-4 py-3 text-sm font-semibold shadow-lg transition-all";
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.toggle("bg-error", type === "error");
    el.classList.toggle("text-on-error", type === "error");
    el.classList.toggle("bg-primary", type !== "error");
    el.classList.toggle("text-white", type !== "error");
    el.style.opacity = "1";
    window.clearTimeout(el._timer);
    el._timer = window.setTimeout(() => {
      el.style.opacity = "0";
    }, 2600);
  }

  async function api(path, options = {}) {
    const headers = new Headers(options.headers || {});
    if (state.token) headers.set("Authorization", `Bearer ${state.token}`);
    const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401) showAuth();
      throw new Error(data.detail || "请求失败");
    }
    return data;
  }

  function saveSession(payload) {
    state.token = payload.token;
    state.user = payload.user;
    localStorage.setItem(TOKEN_KEY, payload.token);
    hideAuth();
    refreshAll();
  }

  function logout() {
    state.token = "";
    state.user = null;
    localStorage.removeItem(TOKEN_KEY);
    showAuth();
    renderIdentity();
  }

  function authMarkup() {
    return `
      <div id="opc-auth-modal" class="fixed inset-0 z-[120] hidden items-center justify-center bg-on-surface/35 px-5 backdrop-blur-sm">
        <div class="glass-panel w-full max-w-md rounded-2xl p-7 shadow-2xl">
          <div class="mb-6">
            <p class="font-label-sm text-primary">OPC 智能试衣</p>
            <h2 class="font-headline-md text-on-surface">登录后开始生成</h2>
            <p class="font-body-md text-on-surface-variant mt-1">系统会为每次换装记录积分消耗、任务进度和作品结果。</p>
          </div>
          <form id="opc-auth-form" class="space-y-4">
            <div>
              <label class="font-label-sm text-on-surface-variant">邮箱</label>
              <input name="email" type="email" value="demo@opc.local" class="mt-1 w-full rounded-xl border border-outline-variant/50 bg-surface px-4 py-3 focus:border-primary focus:ring-primary" />
            </div>
            <div>
              <label class="font-label-sm text-on-surface-variant">密码</label>
              <input name="password" type="password" value="demo123" class="mt-1 w-full rounded-xl border border-outline-variant/50 bg-surface px-4 py-3 focus:border-primary focus:ring-primary" />
            </div>
            <div id="opc-register-fields" class="hidden">
              <label class="font-label-sm text-on-surface-variant">昵称</label>
              <input name="name" type="text" value="新用户" class="mt-1 w-full rounded-xl border border-outline-variant/50 bg-surface px-4 py-3 focus:border-primary focus:ring-primary" />
            </div>
            <button class="bg-gradient-primary cta-glow flex w-full items-center justify-center gap-2 rounded-xl py-3 font-label-md text-white" type="submit">
              <span class="material-symbols-outlined">login</span><span data-auth-submit-text>登录</span>
            </button>
          </form>
          <div class="mt-4 flex items-center justify-between text-sm">
            <button id="opc-auth-mode" class="text-primary font-semibold" type="button">创建新账户</button>
            <button id="opc-auth-demo" class="text-on-surface-variant hover:text-primary" type="button">使用演示账户</button>
          </div>
        </div>
      </div>`;
  }

  function ensureAuthModal() {
    if (!$("#opc-auth-modal")) document.body.insertAdjacentHTML("beforeend", authMarkup());
    const form = $("#opc-auth-form");
    if (form.dataset.opcBound) return;
    form.dataset.opcBound = "true";
    const mode = $("#opc-auth-mode");
    const demo = $("#opc-auth-demo");
    let register = false;
    mode.addEventListener("click", () => {
      register = !register;
      $("#opc-register-fields").classList.toggle("hidden", !register);
      $("[data-auth-submit-text]").textContent = register ? "注册并登录" : "登录";
      mode.textContent = register ? "已有账户，去登录" : "创建新账户";
    });
    demo.addEventListener("click", () => {
      form.email.value = "demo@opc.local";
      form.password.value = "demo123";
      toast("已填入演示账户");
    });
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const payload = Object.fromEntries(new FormData(form));
      try {
        saveSession(await api(register ? "/api/auth/register" : "/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }));
      } catch (error) {
        toast(error.message, "error");
      }
    });
  }

  function showAuth() {
    ensureAuthModal();
    $("#opc-auth-modal").classList.remove("hidden");
    $("#opc-auth-modal").classList.add("flex");
  }

  function hideAuth() {
    const modal = $("#opc-auth-modal");
    if (modal) {
      modal.classList.add("hidden");
      modal.classList.remove("flex");
    }
  }

  function navigate(routeName) {
    if (window.OPC && typeof window.OPC.navigate === "function") {
      window.OPC.navigate(routeName);
      return;
    }
    location.hash = routeName;
  }

  function setGalleryUnread(unread) {
    sessionStorage.setItem(GALLERY_UNREAD_KEY, unread ? "1" : "0");
    document.querySelectorAll("[data-opc-gallery-nav-badge]").forEach((el) => {
      el.hidden = !unread;
    });
  }

  function metaFor(mode) {
    return SOURCE_META[mode] || SOURCE_META.model;
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[char]));
  }

  function syncCreditsUI(value = state.user?.credits) {
    if (value == null) return;
    document.querySelectorAll("[data-opc-credits-display]").forEach((el) => {
      el.textContent = `${value} 积分`;
    });
    document.querySelectorAll("[data-opc-credits-value]").forEach((el) => {
      el.textContent = String(value);
    });
  }

  function parseQuantity(button, routeName) {
    const text = button.closest(".opc-summary-panel")?.querySelector("[data-opc-quantity]")?.textContent || "";
    const match = text.match(/(\d+)/);
    return match ? Math.max(1, parseInt(match[1], 10)) : (state.quantity[routeName] || 1);
  }

  function generationCost(routeName, quantity = 1) {
    const meta = metaFor(routeName);
    return Math.ceil(meta.baseCost * Math.max(1, quantity) * meta.multiplier);
  }

  function syncCostForRoute(routeName) {
    const view = routeView(routeName);
    if (!view) return;
    const quantity = state.quantity[routeName] || 1;
    const cost = generationCost(routeName, quantity);
    const costEl = $(".opc-summary-cost-value", view);
    if (costEl) {
      costEl.innerHTML = `<span class="material-symbols-outlined">monetization_on</span> ${cost} 积分`;
    }
  }

  function ensureGenerationModal() {
    if (state.genModal) return state.genModal;
    const modal = document.createElement("div");
    modal.className = "opc-gen-modal";
    modal.hidden = true;
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "opc-gen-modal-title");
    modal.innerHTML = `
      <div class="opc-gen-modal-backdrop" data-opc-gen-modal-close tabindex="-1"></div>
      <div class="opc-gen-modal-panel glass-panel">
        <div class="opc-gen-modal-icon"><span class="material-symbols-outlined" data-opc-gen-modal-icon>task_alt</span></div>
        <h2 id="opc-gen-modal-title" class="opc-gen-modal-title">确认生成</h2>
        <p class="opc-gen-modal-desc" data-opc-gen-modal-desc></p>
        <div class="opc-gen-modal-summary" data-opc-gen-modal-summary hidden></div>
        <div class="opc-gen-modal-credits" data-opc-gen-modal-credits hidden></div>
        <p class="opc-gen-modal-warning" data-opc-gen-modal-warning hidden></p>
        <div class="opc-gen-modal-actions" data-opc-gen-modal-actions></div>
      </div>`;
    document.body.appendChild(modal);
    modal.addEventListener("click", (event) => {
      if (event.target.closest("[data-opc-gen-modal-close]")) closeGenerationModal();
      if (event.target.closest("[data-opc-gen-modal-cancel]")) closeGenerationModal();
      if (event.target.closest("[data-opc-gen-modal-confirm]")) submitPendingGeneration();
      if (event.target.closest("[data-opc-gen-modal-gallery]")) {
        closeGenerationModal();
        navigate("gallery");
        refreshGallery().catch((error) => toast(error.message, "error"));
        pollLastJob();
      }
    });
    state.genModal = modal;
    return modal;
  }

  function renderGenerationModalActions(step) {
    const actions = state.genModal?.querySelector("[data-opc-gen-modal-actions]");
    if (!actions) return;
    if (step === "confirm") {
      actions.innerHTML = `
        <button type="button" class="opc-gen-modal-btn opc-gen-modal-btn--ghost" data-opc-gen-modal-cancel>取消</button>
        <button type="button" class="opc-gen-modal-btn opc-gen-modal-btn--primary" data-opc-gen-modal-confirm>确认生成</button>`;
      return;
    }
    actions.innerHTML = `
      <button type="button" class="opc-gen-modal-btn opc-gen-modal-btn--ghost" data-opc-gen-modal-close>稍后查看</button>
      <button type="button" class="opc-gen-modal-btn opc-gen-modal-btn--primary" data-opc-gen-modal-gallery>前往我的作品</button>`;
  }

  function openConfirmModal(payload) {
    if (!state.token) {
      showAuth();
      return;
    }
    state.pendingGeneration = payload;
    state.genModalLastFocus = document.activeElement;
    const modal = ensureGenerationModal();
    const balance = state.user?.credits ?? 0;
    const enough = balance >= payload.cost;
    const meta = metaFor(payload.routeName);
    modal.querySelector("[data-opc-gen-modal-icon]").textContent = "task_alt";
    modal.querySelector("#opc-gen-modal-title").textContent = "确认生成";
    modal.querySelector("[data-opc-gen-modal-desc]").textContent = `即将提交「${meta.modeLabel}」任务，请确认摘要与积分消耗。`;
    const summary = modal.querySelector("[data-opc-gen-modal-summary]");
    if (summary) {
      summary.hidden = false;
      summary.innerHTML = `
        <p class="opc-gen-modal-summary-title">任务摘要</p>
        ${payload.summary.map((row) => `
          <div class="opc-gen-modal-summary-row"><span>${escapeHTML(row.label)}</span><strong>${escapeHTML(row.value)}</strong></div>
        `).join("")}
        <div class="opc-gen-modal-summary-row"><span>生成数量</span><strong>${payload.quantity} 张</strong></div>`;
    }
    const credits = modal.querySelector("[data-opc-gen-modal-credits]");
    if (credits) {
      credits.hidden = false;
      credits.classList.toggle("is-insufficient", !enough);
      credits.innerHTML = `<span>本次消耗 <strong>${payload.cost} 积分</strong></span><span class="opc-gen-modal-credits-balance">余额 ${balance} 积分</span>`;
    }
    const warning = modal.querySelector("[data-opc-gen-modal-warning]");
    if (warning) {
      warning.hidden = enough;
      warning.textContent = enough ? "" : "积分不足，请先充值或升级订阅后再试。";
    }
    renderGenerationModalActions("confirm");
    const confirm = modal.querySelector("[data-opc-gen-modal-confirm]");
    if (confirm) {
      confirm.disabled = !enough;
      confirm.classList.toggle("is-disabled", !enough);
    }
    modal.hidden = false;
    document.body.classList.add("opc-gen-modal-open");
    (enough ? confirm : modal.querySelector("[data-opc-gen-modal-cancel]"))?.focus();
  }

  function openGenerationSubmittedModal() {
    const modal = ensureGenerationModal();
    modal.querySelector("[data-opc-gen-modal-icon]").textContent = "auto_awesome";
    modal.querySelector("#opc-gen-modal-title").textContent = "任务已提交";
    modal.querySelector("[data-opc-gen-modal-desc]").textContent = "效果图正在后台渲染，您可在「我的作品」页面查看实时进度。";
    const summary = modal.querySelector("[data-opc-gen-modal-summary]");
    const credits = modal.querySelector("[data-opc-gen-modal-credits]");
    const warning = modal.querySelector("[data-opc-gen-modal-warning]");
    if (summary) summary.hidden = true;
    if (credits) credits.hidden = true;
    if (warning) warning.hidden = true;
    renderGenerationModalActions("success");
    modal.hidden = false;
    document.body.classList.add("opc-gen-modal-open");
    modal.querySelector("[data-opc-gen-modal-gallery]")?.focus();
  }

  function closeGenerationModal() {
    const modal = state.genModal;
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    document.body.classList.remove("opc-gen-modal-open");
    state.pendingGeneration = null;
    if (state.genModalLastFocus && typeof state.genModalLastFocus.focus === "function") {
      state.genModalLastFocus.focus();
    }
  }

  function renderIdentity() {
    const creditButton = $('[data-scroll="profile-credits"]');
    if (creditButton && state.user) {
      creditButton.innerHTML = `<span class="material-symbols-outlined text-[18px]" aria-hidden="true">monetization_on</span><span data-opc-credits-display>${state.user.credits} 积分</span>`;
    }
    syncCreditsUI();
    const avatar = $('#opc-top-header a[data-nav="profile"] img');
    if (avatar && state.user) avatar.src = state.user.avatar_url;
    let logoutButton = $("#opc-logout");
    if (!logoutButton) {
      logoutButton = document.createElement("button");
      logoutButton.id = "opc-logout";
      logoutButton.type = "button";
      logoutButton.className = "md:flex text-on-surface-variant hover:text-primary font-label-md text-label-md";
      logoutButton.textContent = "退出";
      logoutButton.addEventListener("click", logout);
      $("#opc-top-header > div:last-child").appendChild(logoutButton);
    }
    logoutButton.hidden = !state.token;
  }

  function routeView(routeName) {
    return $(`.opc-view[data-route="${routeName}"]`);
  }

  function setSummaryValue(view, selector, value, stateClass = "") {
    const el = $(selector, view);
    if (!el) return;
    el.innerHTML = value;
    el.classList.remove("is-muted", "is-error");
    if (stateClass) el.classList.add(stateClass);
  }

  function updateRouteSummary(routeName) {
    const view = routeView(routeName);
    if (!view) return;
    if (routeName === "model") {
      const ready = Boolean(state.files["model:clothing"] || $("#url-input", view)?.value?.trim());
      setSummaryValue(view, "[data-opc-summary-garment]", ready ? "已上传" : "等待上传…", ready ? "" : "is-muted");
    }
    if (routeName === "real") {
      const ready = Boolean(state.files["real:person"]);
      setSummaryValue(view, "[data-opc-summary-photo]", ready ? "已上传" : '<span class="material-symbols-outlined">error</span> 必填', ready ? "" : "is-error");
    }
    if (routeName === "free") {
      const prompt = $("#prompt-input", view)?.value?.trim() || "";
      const refReady = Boolean(state.files["free:reference"]);
      setSummaryValue(view, "[data-opc-summary-ref]", refReady ? "已上传" : "未上传", refReady ? "" : "is-muted");
      setSummaryValue(view, "[data-opc-summary-desc]", prompt ? escapeHTML(prompt.length > 18 ? `${prompt.slice(0, 18)}…` : prompt) : "尚未填写", prompt ? "" : "is-muted");
    }
  }

  function bindUploader(routeName, key, area) {
    if (area.dataset.opcBound) return;
    area.dataset.opcBound = "true";
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.hidden = true;
    document.body.appendChild(input);
    function setFile(file) {
      if (!file) return;
      state.files[`${routeName}:${key}`] = file;
      if (routeName === "model" && key === "clothing") delete state.files["model:clothingUrl"];
      area.classList.add("border-primary");
      area.innerHTML = `
        <div class="relative h-full min-h-[180px] w-full overflow-hidden rounded-xl">
          <img src="${URL.createObjectURL(file)}" alt="已上传图片" class="absolute inset-0 h-full w-full object-cover" />
          <div class="absolute inset-x-0 bottom-0 bg-black/55 p-3 text-left text-white backdrop-blur">
            <p class="font-label-md truncate">${file.name}</p>
            <p class="font-label-sm opacity-80">点击可重新上传</p>
          </div>
        </div>`;
      updateRouteSummary(routeName);
    }
    input.addEventListener("change", () => setFile(input.files[0]));
    area.addEventListener("click", () => input.click());
    area.addEventListener("dragover", (event) => {
      event.preventDefault();
      area.classList.add("border-primary");
    });
    area.addEventListener("drop", (event) => {
      event.preventDefault();
      setFile(event.dataTransfer.files[0]);
    });
  }

  function bindUploaders() {
    const current = route();
    if (!["model", "real", "free"].includes(current)) return;
    const view = $(`.opc-view[data-route="${current}"]`);
    if (!view) return;
    if (current === "model") {
      const area = $(".opc-upload", view) || $all(".glass-panel", view).find((el) => el.textContent.includes("拖拽或点击上传"));
      if (area) bindUploader("model", "clothing", area);
    }
    if (current === "real") {
      const areas = $all(".opc-upload, .upload-area-dashed", view);
      if (areas[0]) bindUploader("real", "person", areas[0]);
      if (areas[1]) bindUploader("real", "clothing", areas[1]);
    }
    if (current === "free") {
      const area = $(".opc-upload", view) || $all(".glass-panel", view).find((el) => el.textContent.includes("点击上传或拖拽到此处"));
      if (area) bindUploader("free", "reference", area);
    }
  }

  function bindFormState() {
    document.addEventListener("input", (event) => {
      const target = event.target;
      const view = target.closest?.(".opc-view");
      const routeName = view?.dataset.route;
      if (!["model", "real", "free"].includes(routeName)) return;
      if (target.id === "url-input" || target.id === "prompt-input") updateRouteSummary(routeName);
    });
  }

  function firstImage(selector, root = document) {
    const img = $(selector, root);
    return img ? img.src : "";
  }

  function formForRoute(routeName) {
    const form = new FormData();
    const view = routeView(routeName);
    form.set("mode", routeName);
    form.set("quantity", state.quantity[routeName] || 1);
    form.set("garment_type", "上衣");
    if (routeName === "model") {
      const selectedModel = window.OPC?.ModelLibrary?.getSelectedModel?.();
      form.set("title", "模特试衣");
      form.set("person_image", selectedModel?.image || firstImage('.opc-view[data-route="model"] section img'));
      const file = state.files["model:clothing"];
      if (file) form.set("clothing_file", file);
      else form.set("clothing_image", $("#url-input", view)?.value || firstImage('.opc-view[data-route="model"] img'));
      form.set("prompt", "让图1中的平台模特自然穿上图2服装，保持商业摄影质感。");
    }
    if (routeName === "real") {
      form.set("title", "真人试衣");
      form.set("portrait_authorized", $("[data-opc-portrait-consent]", view)?.checked ? "true" : "false");
      const person = state.files["real:person"];
      const clothing = state.files["real:clothing"];
      if (person) form.set("person_file", person);
      if (clothing) form.set("clothing_file", clothing);
      if (!person) form.set("person_image", firstImage('.opc-view[data-route="real"] img'));
      if (!clothing) form.set("clothing_image", firstImage('.opc-view[data-route="real"] button img'));
      form.set("prompt", "根据用户全身照的姿势和光线，将目标服装自然试穿到人物身上。");
    }
    if (routeName === "free") {
      const prompt = $("#prompt-input", view)?.value || "办公室场景、极简风格、自然真实的时尚写真。";
      const ref = state.files["free:reference"];
      form.set("title", "自由风格生成");
      form.set("prompt", prompt);
      if (ref) {
        form.set("image_file", ref);
      }
    }
    return form;
  }

  function collectSummary(routeName) {
    const view = routeView(routeName);
    return $all(".opc-summary-rows .opc-summary-row", view).map((row) => ({
      label: $(".opc-summary-row-label", row)?.textContent?.trim() || "",
      value: $(".opc-summary-row-value", row)?.textContent?.trim() || "",
    })).filter((row) => row.label);
  }

  function scrollToInvalid(routeName, step) {
    const view = routeView(routeName);
    const target = $(`[data-opc-step="${step}"]`, view);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    target.classList.add("opc-step--highlight");
    window.setTimeout(() => target.classList.remove("opc-step--highlight"), 1600);
  }

  function validateRoute(routeName) {
    const view = routeView(routeName);
    if (!view) return { valid: false, step: 1, message: "页面未准备好" };
    if (routeName === "model") {
      const hasGarment = Boolean(state.files["model:clothing"] || $("#url-input", view)?.value?.trim());
      if (!hasGarment) return { valid: false, step: 2, message: "请先上传服装图片或填写产品图像 URL" };
    }
    if (routeName === "real") {
      if (!state.files["real:person"]) return { valid: false, step: 1, message: "请先上传您的真人照片" };
      if (!$("[data-opc-portrait-consent]", view)?.checked) return { valid: false, step: 3, message: "请先确认肖像授权" };
    }
    if (routeName === "free") {
      const prompt = $("#prompt-input", view)?.value?.trim();
      const noImage = $("[data-opc-no-image]", view)?.checked;
      if (!prompt) return { valid: false, step: 2, message: "请先填写自由风格描述" };
      if (!noImage && !state.files["free:reference"]) return { valid: false, step: 1, message: "请先上传一张服装图片，或勾选无图模式" };
    }
    return { valid: true };
  }

  function rememberInitialViews() {
    ["model", "real", "free"].forEach((routeName) => {
      const view = routeView(routeName);
      if (view && !state.initialViews[routeName]) state.initialViews[routeName] = view.innerHTML;
    });
  }

  function resetRouteParams(routeName) {
    const view = routeView(routeName);
    const html = state.initialViews[routeName];
    if (!view || !html) return;
    view.innerHTML = html;
    Object.keys(state.files).forEach((key) => {
      if (key.startsWith(`${routeName}:`)) delete state.files[key];
    });
    state.quantity[routeName] = 1;
    bindUploaders();
    updateRouteSummary(routeName);
    syncCostForRoute(routeName);
  }

  async function createJob(routeName) {
    if (!state.token) {
      showAuth();
      return;
    }
    try {
      toast("正在提交生成任务…");
      const data = await api("/api/tryon/jobs", { method: "POST", body: formForRoute(routeName) });
      localStorage.setItem(LAST_JOB_KEY, data.job.id);
      state.user = { ...(state.user || {}), credits: data.job?.cost != null ? Math.max(0, (state.user?.credits || 0) - data.job.cost) : state.user?.credits };
      syncCreditsUI();
      setGalleryUnread(false);
      openGenerationSubmittedModal();
      resetRouteParams(routeName);
      toast("任务已提交");
      await refreshGallery();
      await refreshProfile();
      updateProfileGeneratingRow(data.job);
      scheduleJobPoll();
    } catch (error) {
      closeGenerationModal();
      toast(error.message, "error");
    }
  }

  function submitPendingGeneration() {
    const payload = state.pendingGeneration;
    if (!payload) return;
    state.pendingGeneration = null;
    createJob(payload.routeName);
  }

  function requestGeneration(routeName, button) {
    const validation = validateRoute(routeName);
    if (!validation.valid) {
      if (validation.step) scrollToInvalid(routeName, validation.step);
      toast(validation.message || "请先补全生成参数", "error");
      return;
    }
    const quantity = parseQuantity(button, routeName);
    state.quantity[routeName] = quantity;
    openConfirmModal({
      routeName,
      quantity,
      cost: generationCost(routeName, quantity),
      summary: collectSummary(routeName),
    });
  }

  function bindGenerateButtons() {
    document.addEventListener("click", (event) => {
      const button = event.target.closest("[data-opc-generate]");
      if (!button) return;
      const source = button.closest(".opc-view")?.dataset.route;
      if (!["model", "real", "free"].includes(source)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      requestGeneration(source, button);
    }, true);
  }

  function bindQuantitySteppers() {
    document.addEventListener("click", (event) => {
      const button = event.target.closest(".opc-qty-stepper button");
      if (!button) return;
      const stepper = button.closest(".opc-qty-stepper");
      const view = button.closest(".opc-view");
      const routeName = view?.dataset.route;
      if (!["model", "real", "free"].includes(routeName)) return;
      event.preventDefault();
      const label = $("[data-opc-quantity]", stepper);
      const current = parseQuantity(button, routeName);
      const isAdd = button.getAttribute("aria-label") === "增加数量";
      const next = Math.max(1, Math.min(8, current + (isAdd ? 1 : -1)));
      state.quantity[routeName] = next;
      if (label) label.textContent = `${next} 张图片`;
      syncCostForRoute(routeName);
    });
  }

  function progressFor(job) {
    if (!job) return 0;
    if (job.status === "completed") return 100;
    if (job.status === "failed") return 100;
    if (job.status === "processing") return 65;
    return 25;
  }

  function activeJobMarkup(job) {
    if (!job || !["submitting", "processing"].includes(job.status)) return "";
    const progress = progressFor(job);
    const meta = metaFor(job.mode);
    const dashOffset = CIRCLE_LEN * (1 - progress / 100);
    return `
      <div class="glass-panel opc-gallery-card is-generating" data-opc-gallery-generating data-opc-gallery-status="active">
        <div class="opc-gallery-card-media animate-pulse">
          <div class="relative w-20 h-20 flex items-center justify-center">
            <svg class="w-full h-full -rotate-90" aria-hidden="true">
              <circle class="text-surface-variant" cx="40" cy="40" fill="transparent" r="36" stroke="currentColor" stroke-width="4"></circle>
              <circle class="text-primary" cx="40" cy="40" fill="transparent" r="36" stroke="currentColor" stroke-dasharray="${CIRCLE_LEN}" stroke-dashoffset="${dashOffset}" stroke-width="4" data-opc-gallery-progress-ring></circle>
            </svg>
            <span class="absolute text-sm font-bold text-primary" data-opc-gallery-progress-text>${progress}%</span>
          </div>
        </div>
        <div class="opc-gallery-card-footer">
          <p class="opc-gallery-card-title" data-opc-gallery-title>${meta.title}</p>
          <span class="opc-gallery-card-time is-status">正在生成中…</span>
          <div class="opc-gallery-card-tags">
            <span class="opc-tag bg-primary/10 text-primary" data-opc-gallery-mode-tag>${meta.modeLabel}</span>
          </div>
        </div>
      </div>`;
  }

  function getGalleryFilter() {
    return $('[data-opc-gallery-tabs] button.is-active')?.dataset.opcGalleryFilter || "all";
  }

  function applyGalleryFilter(filter = getGalleryFilter()) {
    const grid = $(".opc-gallery-grid");
    if (!grid) return;
    const cards = $all("[data-opc-gallery-status]", grid);
    cards.forEach((card) => {
      const status = card.dataset.opcGalleryStatus;
      card.style.display = filter === "all" || filter === status ? "" : "none";
    });
    const empty = $("[data-opc-gallery-empty]", grid);
    if (empty) {
      const visible = cards.some((card) => card.style.display !== "none");
      empty.hidden = visible;
    }
  }

  function bindGalleryTabs() {
    document.addEventListener("click", (event) => {
      const button = event.target.closest("[data-opc-gallery-tabs] button[data-opc-gallery-filter]");
      if (!button) return;
      event.preventDefault();
      const group = button.closest("[data-opc-gallery-tabs]");
      $all("button", group).forEach((item) => item.classList.toggle("is-active", item === button));
      applyGalleryFilter(button.dataset.opcGalleryFilter || "all");
    });
  }

  function updateProfileGeneratingRow(job) {
    const row = document.querySelector("[data-opc-profile-generating]");
    if (!row) return;
    const active = job && ["submitting", "processing"].includes(job.status);
    row.hidden = !active;
    if (active) {
      const title = row.querySelector("[data-opc-profile-gen-title]");
      if (title) title.textContent = `${metaFor(job.mode).title}生成中`;
    }
  }

  async function pollLastJob() {
    const jobId = localStorage.getItem(LAST_JOB_KEY);
    if (!jobId || !state.token) {
      updateProfileGeneratingRow(null);
      return;
    }
    try {
      const data = await api(`/api/tryon/jobs/${jobId}`);
      const job = data.job;
      if (job.status === "completed") {
        localStorage.removeItem(LAST_JOB_KEY);
        updateProfileGeneratingRow(null);
        setGalleryUnread(route() !== "gallery");
        await refreshGallery();
        await refreshProfile();
        window.clearTimeout(state.pollTimer);
        toast("生成完成，作品已保存");
      } else if (job.status === "failed") {
        localStorage.removeItem(LAST_JOB_KEY);
        updateProfileGeneratingRow(null);
        await refreshGallery();
        window.clearTimeout(state.pollTimer);
        toast(job.error || "生成失败", "error");
      } else {
        updateProfileGeneratingRow(job);
        if (route() === "gallery") await refreshGallery();
        scheduleJobPoll();
      }
    } catch (error) {
      toast(error.message, "error");
    }
  }

  function scheduleJobPoll() {
    window.clearTimeout(state.pollTimer);
    state.pollTimer = window.setTimeout(pollLastJob, 3000);
  }

  async function refreshGallery() {
    if (!state.token) return;
    const view = $('.opc-view[data-route="gallery"]');
    if (!view) return;
    const data = await api("/api/gallery");
    let activeJob = null;
    const jobId = localStorage.getItem(LAST_JOB_KEY);
    if (jobId) {
      try {
        const jobData = await api(`/api/tryon/jobs/${jobId}`);
        activeJob = jobData.job;
        if (activeJob.status === "completed" || activeJob.status === "failed") activeJob = null;
      } catch {
        activeJob = null;
      }
    }
    const heading = $("h1 + p", view);
    if (heading) heading.textContent = `您的作品集中有 ${data.items.length} 张生成的图像`;
    const grid = $(".opc-gallery-grid", view) || $all(".grid", view).find((el) => el.className.includes("xl:grid-cols-4"));
    if (!grid) return;
    const itemsMarkup = data.items.map((item) => `
      <article class="group glass-panel opc-gallery-card" data-opc-gallery-status="done" data-opc-work-id="${item.id}">
        <div class="opc-gallery-card-media">
          <img src="${item.thumbnail_url || item.image_url}" alt="生成作品" />
          <span class="opc-gallery-badge">${modeName(item.mode)}</span>
          <button data-favorite="${item.id}" class="opc-gallery-fav ${item.favorite ? "is-active" : ""}" type="button" aria-label="收藏">
            <span class="material-symbols-outlined text-[18px]">${item.favorite ? "favorite" : "favorite_border"}</span>
          </button>
          <div class="opc-gallery-overlay">
            <button type="button" class="px-4 h-10 flex items-center gap-2 bg-white/90 text-primary rounded-full font-label-md text-label-md shadow-lg hover:bg-white transition-colors" data-opc-share-square="${item.id}">
              <span class="material-symbols-outlined text-[18px]">share</span> 发布到广场
            </button>
            <a href="${item.image_url}" download target="_blank" class="opc-icon-btn bg-white/90" title="下载">
              <span class="material-symbols-outlined">download</span>
            </a>
          </div>
        </div>
        <div class="opc-gallery-card-footer">
          <p class="opc-gallery-card-title">${item.title || "AI 试衣作品"}</p>
          <span class="opc-gallery-card-time">${formatDate(item.created_at)}</span>
          <div class="opc-gallery-card-tags">
            <span class="opc-tag bg-secondary-fixed-dim/20 text-secondary">${item.garment_type || "服装"}</span>
          </div>
        </div>
      </article>`).join("");
    grid.innerHTML = `${activeJobMarkup(activeJob)}${itemsMarkup}<div class="opc-gallery-empty" data-opc-gallery-empty hidden><span class="material-symbols-outlined">photo_library</span><p>暂无符合条件的作品</p></div>`;
    if (!activeJob && !itemsMarkup) {
      const empty = $("[data-opc-gallery-empty]", grid);
      if (empty) empty.hidden = false;
    }
    applyGalleryFilter();
  }

  function emptyGallery() {
    return '<div class="glass-panel opc-panel rounded-2xl border border-dashed border-outline-variant p-10 text-center text-on-surface-variant">暂无作品，完成一次生成后会自动保存到这里。</div>';
  }

  function modeName(mode) {
    return { model: "模特", real: "真人", free: "自由风格" }[mode] || "试衣";
  }

  function formatDate(value) {
    if (!value) return "";
    return new Date(value).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  }

  async function refreshProfile() {
    if (!state.token) return;
    const data = await api("/api/profile");
    state.user = data.user;
    renderIdentity();
    const view = $('.opc-view[data-route="profile"]');
    if (!view) return;
    const name = $(".opc-profile-name", view) || $(".font-headline-md.text-2xl", view);
    const email = $(".opc-profile-email", view) || $(".font-body-md.text-on-surface-variant", view);
    const avatar = $(".opc-profile-avatar", view) || $("img[alt='用户头像']", view);
    if (name) name.textContent = data.user.name;
    if (email) email.textContent = data.user.email;
    if (avatar) avatar.src = data.user.avatar_url;
    const nums = $all("#profile-credits .opc-stat-value, #profile-credits .tabular-nums", view);
    if (nums[0]) nums[0].textContent = data.stats.credits;
    if (nums[1]) nums[1].textContent = data.stats.today_generations;
    if (nums[2]) nums[2].textContent = data.stats.total_generations;
    if (nums[3]) nums[3].textContent = data.stats.favorite_count;
  }

  async function refreshAll() {
    if (!state.token) {
      renderIdentity();
      return;
    }
    try {
      const data = await api("/api/me");
      state.user = data.user;
      renderIdentity();
      await refreshProfile();
      await refreshGallery();
      await pollLastJob();
    } catch {
      logout();
    }
  }

  document.addEventListener("click", async (event) => {
    const favorite = event.target.closest("[data-favorite]");
    if (!favorite) return;
    event.preventDefault();
    const icon = $("span", favorite);
    const next = icon.textContent.trim() !== "favorite";
    try {
      await api(`/api/gallery/${favorite.dataset.favorite}/favorite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ favorite: next }),
      });
      icon.textContent = next ? "favorite" : "favorite_border";
      refreshProfile();
    } catch (error) {
      toast(error.message, "error");
    }
  });

  window.addEventListener("hashchange", () => {
    state.route = route();
    window.clearTimeout(state.pollTimer);
    setTimeout(() => {
      bindUploaders();
      updateRouteSummary(state.route);
      syncCostForRoute(state.route);
      if (state.route === "gallery") refreshGallery().catch((error) => toast(error.message, "error"));
      if (state.route === "profile") refreshProfile().catch((error) => toast(error.message, "error"));
      pollLastJob();
    }, 0);
  });

  window.addEventListener("opc-route-change", (event) => {
    state.route = event.detail?.route || route();
    bindUploaders();
    updateRouteSummary(state.route);
    syncCostForRoute(state.route);
    if (state.route === "gallery") {
      setGalleryUnread(false);
      refreshGallery().catch((error) => toast(error.message, "error"));
    }
    if (state.route === "profile") refreshProfile().catch((error) => toast(error.message, "error"));
    pollLastJob();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeGenerationModal();
  });

  document.addEventListener("DOMContentLoaded", () => {
    ensureAuthModal();
    rememberInitialViews();
    bindGenerateButtons();
    bindQuantitySteppers();
    bindFormState();
    bindGalleryTabs();
    bindUploaders();
    ["model", "real", "free"].forEach((routeName) => {
      updateRouteSummary(routeName);
      syncCostForRoute(routeName);
    });
    setGalleryUnread(sessionStorage.getItem(GALLERY_UNREAD_KEY) === "1");
    refreshAll();
    if (!state.token) showAuth();
  });
})();
