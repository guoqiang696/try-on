/**
 * OPC 智能试衣 — 模特库管理
 * 功能：上传模特、管理模特数据、筛选排序、选择模特
 */
(function () {
  const STORAGE_KEY = 'opc-model-library';
  const TOKEN_KEY = 'opc-token';
  const API_BASE = window.OPC_API_BASE || '';
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  let cachedServerModels = null;

  // 预置模特数据
  const PRESET_MODELS = [
    {
      id: 'preset-1',
      name: '林娅',
      height: 175,
      gender: '女',
      tags: ['休闲', '时髦'],
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD6pFLFdiilaCjJ0L7hleEDEezJ_DnTkX_Blso6vgkNVHohbEKvLWim9Rz_5R4bthEWoDrEo38ixHDgESj31dV6AxVwqo0i_vU7pt06kN3BoNFYqP_bNWWFX8tocYfeXsOR20IQ4hfOXgMyjpvI7yyyfIxsjGNWrYs1nGTonY-FRbyKEJNOsAyhQSDT7_Hp5r4tkFu48rovC9qL2WB4My-uFbNnBtNvPQp6r3yzqEDvt8J6BQIrDwoTAsj3gXnPnwoDAuD6P7m3isr9',
      isPreset: true,
    },
    {
      id: 'preset-2',
      name: '陈伟',
      height: 185,
      gender: '男',
      tags: ['街头'],
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCTSjyrX0R7GH-ilVa-dfo80eEh32kzCUwvi_v08SwhJTzuhZ1FuYZAZFKQuToF1s_HAxKZs4DUxmviZQ4zh2-hBrm0eQujfEJgs0E_Eqjc7tWOQw8cpPT1VvJY_Y3BbZy6DG_oPQ6Sa6a8lvOlYQSZeGn4nwroYYvWkyyHF_u6gCMFVYVvdJa28KS1JQB-Fc0l993IGNKhM1rLSEuiOm8QepbX_k92twwEPTtp0aI2lCXJr1Qn2ETaqhpTfCvcZAPtjOUeNfrmi7rB',
      isPreset: true,
    },
    {
      id: 'preset-3',
      name: '小雪',
      height: 170,
      gender: '女',
      tags: ['优雅'],
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDqlRz4zEnk4gE1xTXOqB9bUIedw_jsGymcyLc6J-pH7tpEOdFIrxxCZMABt7dhzhUECSfGvUD0pAqSA5dBxy3jF3tAe45UGGAd3ZF9QsMOyE69UsTmvmdM3SGvWxyi2bMHhMDEeB-iZJ-PxqMhCkuP1ID7f_ZoZFSJb0MVjhFZn6sdANDVdbc7_24vS6M83PDkSk-c-26-33wfILvh8HwpsUen35z7NH0FQfrTPYqU7214sfJJLf7wutXOBBd23tvewp-vjKOaDqQz',
      isPreset: true,
    },
  ];

  // 当前选中的模特 ID
  let selectedModelId = null;

  // 获取存储的模特数据
  function getStoredModels() {
    if (cachedServerModels) return cachedServerModels.filter(m => !m.isPreset);
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  // 保存模特数据
  function saveModels(models) {
    cachedServerModels = null;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(models));
    } catch (e) {
      console.warn('保存模特数据失败:', e);
    }
  }

  async function modelApi(path, options = {}) {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) throw new Error('请先登录');
    const headers = new Headers(options.headers || {});
    headers.set('Authorization', `Bearer ${token}`);
    if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
    const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.detail || '请求失败');
    return data;
  }

  async function loadServerModels() {
    try {
      const data = await modelApi('/api/models');
      cachedServerModels = data.models || null;
    } catch {
      cachedServerModels = null;
    }
  }

  // 生成唯一 ID
  function generateId() {
    return 'model-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 9);
  }

  // 压缩图片
  function compressImage(file, maxWidth = 800) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
          canvas.width = img.width * ratio;
          canvas.height = img.height * ratio;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // 添加模特
  async function addModel(name, height, gender, tags, imageFile) {
    if (!name || !imageFile) {
      alert('请填写模特姓名并上传照片');
      return null;
    }

    if (imageFile.size > MAX_FILE_SIZE) {
      alert('图片大小不能超过 5MB');
      return null;
    }

    try {
      const imageData = await compressImage(imageFile);
      const model = {
        id: generateId(),
        name: name.trim(),
        height: parseInt(height) || 0,
        gender: gender || '女',
        tags: tags ? tags.split(/[,，]/).map(t => t.trim()).filter(Boolean) : [],
        image: imageData,
        isPreset: false,
        createdAt: Date.now(),
      };

      const models = getStoredModels();
      models.push(model);
      saveModels(models);
      try {
        const data = await modelApi('/api/models', {
          method: 'POST',
          body: JSON.stringify({
            name: model.name,
            height: model.height,
            gender: model.gender,
            tags: model.tags,
            image: model.image,
          }),
        });
        await loadServerModels();
        return data.model;
      } catch {
        // Keep the local copy as an offline fallback.
      }
      return model;
    } catch (e) {
      console.error('添加模特失败:', e);
      alert('添加模特失败，请重试');
      return null;
    }
  }

  // 删除模特
  async function deleteModel(id) {
    try {
      await modelApi(`/api/models/${encodeURIComponent(id)}`, { method: 'DELETE' });
      await loadServerModels();
      return;
    } catch {
      // Fall back to local removal below.
    }
    const models = getStoredModels();
    const filtered = models.filter(m => m.id !== id);
    saveModels(filtered);
  }

  // 获取所有模特（预置 + 用户上传）
  function getAllModels() {
    const userModels = getStoredModels();
    return [...PRESET_MODELS, ...userModels];
  }

  // 获取选中的模特
  function getSelectedModel() {
    if (!selectedModelId) return PRESET_MODELS[0];
    return getAllModels().find(m => m.id === selectedModelId) || PRESET_MODELS[0];
  }

  // 创建模特卡片 HTML
  function createModelCard(model) {
    const isSelected = model.id === selectedModelId;
    const tagsHtml = model.tags.map(tag => `<span class="opc-model-card-tag">${tag}</span>`).join('');
    const communityBadge = model.isCommunity ? '<span class="absolute top-3 right-3 z-10 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/90 text-white">广场</span>' : '';

    return `
    <button type="button" data-goto="model" class="opc-model-card ${isSelected ? 'is-selected' : ''}" data-model-id="${model.id}" data-model-gender="${model.gender}" data-model-height="${model.height}">
      <img alt="${model.name}" class="opc-model-card-img" src="${model.image}"/>
      ${communityBadge}
      <div class="opc-model-card-overlay"></div>
      <div class="opc-model-card-body">
        <span class="opc-model-card-name">${model.name}, ${model.height}cm</span>
        <div class="opc-model-card-tags">${tagsHtml}</div>
      </div>
      ${isSelected ? '<span class="opc-model-card-check material-symbols-outlined">check_circle</span>' : ''}
      ${!model.isPreset ? `<button type="button" class="opc-model-delete-btn absolute top-3 left-3 z-10 w-7 h-7 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-red-500 hover:bg-red-50 transition-colors" data-delete-model="${model.id}" title="删除模特">
        <span class="material-symbols-outlined text-[16px]">delete</span>
      </button>` : ''}
    </button>
    `;
  }

  // 渲染模特列表
  async function renderModelLibrary() {
    await loadServerModels();
    const grid = document.getElementById('model-library-grid');
    const empty = document.getElementById('model-library-empty');
    if (!grid) return;

    const models = getAllModels();
    const filtered = filterModels(models);
    const sorted = sortModels(filtered);

    if (sorted.length === 0) {
      grid.innerHTML = '';
      empty?.classList.remove('hidden');
    } else {
      empty?.classList.add('hidden');
      grid.innerHTML = sorted.map(createModelCard).join('');
    }
  }

  // 筛选模特
  let currentFilters = { gender: 'all', style: 'all' };

  function filterModels(models) {
    return models.filter(model => {
      if (currentFilters.gender !== 'all' && model.gender !== currentFilters.gender) return false;
      if (currentFilters.style !== 'all' && !model.tags.includes(currentFilters.style)) return false;
      return true;
    });
  }

  // 排序模特
  let currentSort = 'default';

  function sortModels(models) {
    const sorted = [...models];
    switch (currentSort) {
      case 'height-desc':
        sorted.sort((a, b) => b.height - a.height);
        break;
      case 'height-asc':
        sorted.sort((a, b) => a.height - b.height);
        break;
      case 'newest':
        sorted.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        break;
      default:
        // 预置模特在前，按添加时间排序
        sorted.sort((a, b) => {
          if (a.isPreset && !b.isPreset) return -1;
          if (!a.isPreset && b.isPreset) return 1;
          return (b.createdAt || 0) - (a.createdAt || 0);
        });
    }
    return sorted;
  }

  // 初始化上传区域
  function initUploadArea() {
    const uploadArea = document.getElementById('model-upload-trigger');
    if (!uploadArea) return;

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/png,image/jpeg,image/jpg';
    fileInput.className = 'hidden';
    fileInput.id = 'model-file-input';
    uploadArea.appendChild(fileInput);

    let selectedFile = null;
    let previewImg = null;

    uploadArea.addEventListener('click', (e) => {
      if (e.target.closest('.opc-model-delete-btn')) return;
      fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        selectedFile = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (ev) => {
          if (!previewImg) {
            previewImg = document.createElement('img');
            previewImg.className = 'opc-upload-preview';
            previewImg.alt = '已选模特照片预览';
            uploadArea.appendChild(previewImg);
          }
          previewImg.src = ev.target.result;
          uploadArea.classList.add('has-preview');
        };
        reader.readAsDataURL(selectedFile);
      }
    });

    // 拖拽上传
    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.classList.add('is-dragover');
    });

    uploadArea.addEventListener('dragleave', () => {
      uploadArea.classList.remove('is-dragover');
    });

    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.classList.remove('is-dragover');
      const files = e.dataTransfer?.files;
      if (files && files[0]) {
        selectedFile = files[0];
        const reader = new FileReader();
        reader.onload = (ev) => {
          if (!previewImg) {
            previewImg = document.createElement('img');
            previewImg.className = 'opc-upload-preview';
            previewImg.alt = '已选模特照片预览';
            uploadArea.appendChild(previewImg);
          }
          previewImg.src = ev.target.result;
          uploadArea.classList.add('has-preview');
        };
        reader.readAsDataURL(selectedFile);
      }
    });

    // 添加按钮
    const addBtn = document.getElementById('model-add-btn');
    if (addBtn) {
      addBtn.addEventListener('click', async () => {
        const name = document.getElementById('model-name-input')?.value;
        const height = document.getElementById('model-height-input')?.value;
        const genderEl = document.querySelector('[data-model-gender].is-active');
        const gender = genderEl?.getAttribute('data-model-gender') || '女';
        const tags = document.getElementById('model-tags-input')?.value;

        if (!selectedFile) {
          alert('请先上传模特照片');
          return;
        }

        addBtn.disabled = true;
        addBtn.innerHTML = '<span class="material-symbols-outlined animate-spin">progress_activity</span> 添加中...';

        const model = await addModel(name, height, gender, tags, selectedFile);

        if (model) {
          // 清空表单
          document.getElementById('model-name-input').value = '';
          document.getElementById('model-height-input').value = '';
          document.getElementById('model-tags-input').value = '';
          if (previewImg) {
            previewImg.remove();
            previewImg = null;
          }
          selectedFile = null;
          uploadArea.classList.remove('has-preview');

          renderModelLibrary();
        }

        addBtn.disabled = false;
        addBtn.innerHTML = '<span class="material-symbols-outlined">add</span> 添加到模特库';
      });
    }
  }

  // 初始化筛选器
  function initFilters() {
    // 性别筛选
    document.querySelectorAll('[data-filter-gender]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-filter-gender]').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        currentFilters.gender = btn.getAttribute('data-filter-gender');
        renderModelLibrary();
      });
    });

    // 风格筛选
    document.querySelectorAll('[data-filter-style]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-filter-style]').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        currentFilters.style = btn.getAttribute('data-filter-style');
        renderModelLibrary();
      });
    });

    // 排序
    const sortSelect = document.getElementById('model-sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', () => {
        currentSort = sortSelect.value;
        renderModelLibrary();
      });
    }
  }

  // 初始化性别选择
  function initGenderSelector() {
    document.querySelectorAll('[data-model-gender]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-model-gender]').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
      });
    });
  }

  // ── 选项卡切换 ──
  // 一级 Tab：已有模特 / 新增模特
  function switchModelLibTab(tabName) {
    document.querySelectorAll('[data-model-lib-tab]').forEach(btn => {
      btn.classList.toggle('is-active', btn.getAttribute('data-model-lib-tab') === tabName);
    });
    document.querySelectorAll('.model-lib-tab-panel').forEach(el => {
      el.classList.toggle('hidden', el.id !== `model-lib-tab-${tabName}`);
    });
  }

  // 二级 Tab：单张 / 批量 / AI
  function switchAddModelTab(tabName) {
    document.querySelectorAll('[data-add-model-tab]').forEach(btn => {
      btn.classList.toggle('is-active', btn.getAttribute('data-add-model-tab') === tabName);
    });
    document.querySelectorAll('.add-model-tab-panel').forEach(el => {
      el.classList.toggle('hidden', el.id !== `add-model-tab-${tabName}`);
    });
  }

  function initTabs() {
    document.querySelectorAll('[data-model-lib-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        switchModelLibTab(btn.getAttribute('data-model-lib-tab'));
      });
    });

    document.querySelectorAll('[data-add-model-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        switchAddModelTab(btn.getAttribute('data-add-model-tab'));
      });
    });

    // 空状态「去添加模特」按钮 → 切到新增模特 Tab
    document.querySelectorAll('[data-model-lib-tab-trigger]').forEach(btn => {
      btn.addEventListener('click', () => {
        switchModelLibTab(btn.getAttribute('data-model-lib-tab-trigger'));
      });
    });
  }

  // AI 性别选择
  function initAIGenderSelector() {
    document.querySelectorAll('[data-ai-model-gender]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-ai-model-gender]').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
      });
    });
  }

  // ── AI 生成模拟 ──
  let currentAIGeneratedImage = null;
  let currentAIModelData = null;

  function generateMockAIModelImage(name, gender) {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = 600;
      canvas.height = 800;
      const ctx = canvas.getContext('2d');

      // 背景渐变
      const gradient = ctx.createLinearGradient(0, 0, 600, 800);
      if (gender === '男') {
        gradient.addColorStop(0, '#e8e3db');
        gradient.addColorStop(1, '#d9d4cc');
      } else {
        gradient.addColorStop(0, '#f5e6e3');
        gradient.addColorStop(1, '#e8d0ca');
      }
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 600, 800);

      // 装饰圆
      ctx.beginPath();
      ctx.arc(300, 350, 180, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fill();

      // 简笔人形轮廓（头像+身体暗示）
      ctx.strokeStyle = 'rgba(61,61,92,0.15)';
      ctx.lineWidth = 2;
      // 头
      ctx.beginPath();
      ctx.arc(300, 220, 60, 0, Math.PI * 2);
      ctx.stroke();
      // 肩膀
      ctx.beginPath();
      ctx.moveTo(220, 340);
      ctx.quadraticCurveTo(300, 300, 380, 340);
      ctx.stroke();

      // 文字
      ctx.fillStyle = '#3d3d5c';
      ctx.font = 'bold 48px "Noto Sans SC", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(name || 'AI模特', 300, 500);
      ctx.font = '24px "Noto Sans SC", sans-serif';
      ctx.fillStyle = '#4a4a5a';
      ctx.fillText('AI 生成的虚拟模特', 300, 550);

      resolve(canvas.toDataURL('image/jpeg', 0.9));
    });
  }

  function initAIGeneration() {
    const generateBtn = document.getElementById('ai-model-generate-btn');
    const confirmBtn = document.getElementById('ai-model-confirm-btn');
    const regenerateBtn = document.getElementById('ai-model-regenerate-btn');
    const previewImg = document.getElementById('ai-model-preview-img');
    const placeholder = document.getElementById('ai-model-preview-placeholder');
    const generating = document.getElementById('ai-model-generating');

    if (!generateBtn) return;

    generateBtn.addEventListener('click', async () => {
      const promptText = document.getElementById('ai-model-prompt')?.value?.trim();
      const name = document.getElementById('ai-model-name-input')?.value?.trim();
      const height = document.getElementById('ai-model-height-input')?.value;
      const genderEl = document.querySelector('[data-ai-model-gender].is-active');
      const gender = genderEl?.getAttribute('data-ai-model-gender') || '女';
      const tags = document.getElementById('ai-model-tags-input')?.value;

      if (!promptText) {
        alert('请输入模特描述');
        return;
      }

      // 显示加载
      placeholder?.classList.add('hidden');
      previewImg?.classList.add('hidden');
      confirmBtn?.classList.add('hidden');
      regenerateBtn?.classList.add('hidden');
      generating?.classList.remove('hidden');
      generateBtn.disabled = true;
      generateBtn.innerHTML = '<span class="material-symbols-outlined animate-spin">progress_activity</span> 生成中...';

      // 模拟 AI 生成延迟
      await new Promise(r => setTimeout(r, 2000 + Math.random() * 1000));

      const imageData = await generateMockAIModelImage(name || 'AI模特', gender);
      currentAIGeneratedImage = imageData;
      currentAIModelData = {
        name: name || 'AI模特',
        height: parseInt(height) || 175,
        gender,
        tags: tags ? tags.split(/[,，]/).map(t => t.trim()).filter(Boolean) : ['AI生成'],
        prompt: promptText,
      };

      generating?.classList.add('hidden');
      previewImg.src = imageData;
      previewImg.classList.remove('hidden');
      confirmBtn?.classList.remove('hidden');
      regenerateBtn?.classList.remove('hidden');
      generateBtn.disabled = false;
      generateBtn.innerHTML = '<span class="material-symbols-outlined">auto_awesome</span> 生成模特';
    });

    confirmBtn?.addEventListener('click', async () => {
      if (!currentAIGeneratedImage || !currentAIModelData) return;

      const model = {
        id: generateId(),
        name: currentAIModelData.name,
        height: currentAIModelData.height,
        gender: currentAIModelData.gender,
        tags: currentAIModelData.tags,
        image: currentAIGeneratedImage,
        isPreset: false,
        isAIGenerated: true,
        prompt: currentAIModelData.prompt,
        createdAt: Date.now(),
      };

      const models = getStoredModels();
      models.push(model);
      saveModels(models);
      try {
        await modelApi('/api/models', {
          method: 'POST',
          body: JSON.stringify({
            name: model.name,
            height: model.height,
            gender: model.gender,
            tags: model.tags,
            image: model.image,
          }),
        });
        await loadServerModels();
      } catch {
        // Local fallback already saved above.
      }

      // 清空表单
      document.getElementById('ai-model-prompt').value = '';
      document.getElementById('ai-model-name-input').value = '';
      document.getElementById('ai-model-height-input').value = '';
      document.getElementById('ai-model-tags-input').value = '';
      previewImg.classList.add('hidden');
      placeholder?.classList.remove('hidden');
      confirmBtn.classList.add('hidden');
      regenerateBtn.classList.add('hidden');

      currentAIGeneratedImage = null;
      currentAIModelData = null;

      renderModelLibrary();
      alert('AI模特已保存到模特库');
    });

    regenerateBtn?.addEventListener('click', () => {
      // 重新生成，保留表单数据
      currentAIGeneratedImage = null;
      previewImg.classList.add('hidden');
      confirmBtn?.classList.add('hidden');
      regenerateBtn?.classList.add('hidden');
      generateBtn.click();
    });
  }

  // 初始化模特库
  function initModelLibrary() {
    initTabs();
    initUploadArea();
    initFilters();
    initGenderSelector();
    initAIGenderSelector();
    initAIGeneration();
    renderModelLibrary();
  }

  document.addEventListener('click', async (event) => {
    const deleteBtn = event.target.closest('[data-delete-model]');
    if (deleteBtn) {
      event.preventDefault();
      event.stopPropagation();
      await deleteModel(deleteBtn.getAttribute('data-delete-model'));
      renderModelLibrary();
      return;
    }

    const card = event.target.closest('[data-model-id]');
    if (card) {
      selectedModelId = card.getAttribute('data-model-id');
      renderModelLibrary();
    }
  });

  // 监听路由变化
  window.addEventListener('opc-route-change', (e) => {
    if (e.detail?.route === 'model-library') {
      renderModelLibrary();
    }
  });

  // 全局暴露
  window.OPC = window.OPC || {};
  window.OPC.ModelLibrary = {
    getAllModels,
    getSelectedModel,
    selectModel: (id) => { selectedModelId = id; renderModelLibrary(); },
    deleteModel,
    addModel,
    renderModelLibrary,
  };

  window.addEventListener('opc-model-library-updated', renderModelLibrary);

  // 页面加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initModelLibrary);
  } else {
    initModelLibrary();
  }
})();
