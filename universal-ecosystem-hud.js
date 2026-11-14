/**
 * ══════════════════════════════════════════════════════════════════
 * 🌐 BHAVYA AI ECOSYSTEM — UNIVERSAL QUICK-SWITCH HUD
 * ══════════════════════════════════════════════════════════════════
 * Provides instant cross-app teleportation across all 18 ecosystem applications.
 * Activated via Alt + Space (or Option + Space on Mac) or clicking the floating HUD pill.
 */
(function() {
  if (window.__BHAVYA_ECOSYSTEM_HUD_LOADED__) return;
  window.__BHAVYA_ECOSYSTEM_HUD_LOADED__ = true;

  const ECOSYSTEM_APPS = [
    {
      id: 'hub',
      name: "Bhavya's AI Master Hub",
      icon: '🌟',
      category: 'Flagship Core',
      url: 'https://bhavyas-ai-master-hub.vercel.app',
      desc: 'Central 3D Portal, App Launcher & Live Latency Radar'
    },
    {
      id: 'assistant',
      name: "Bhavya's AI Assistant",
      icon: '💬',
      category: 'Flagship Core',
      url: 'https://bhavyas-ai-assistant.vercel.app',
      desc: 'Full React Chat, Deep Research, Prompt Lenses & Live Canvas'
    },
    {
      id: 'agent',
      name: "Bhavya's AI Agent",
      icon: '🤖',
      category: 'Flagship Core',
      url: 'https://bhavyas-ai-agent.vercel.app',
      desc: '275+ Specialist Swarm, Quantum HUD & Triad Consensus Arena'
    },
    {
      id: 'documind',
      name: "Bhavya's AI DocuMind",
      icon: '📄',
      category: 'Flagship Core',
      url: 'https://bhavyas-documind.vercel.app',
      desc: 'Multi-Document Vector RAG, PDF Delta Matrix & Knowledge Graph'
    },
    {
      id: 'coding-tutor',
      name: "Bhavya's AI Coding Tutor",
      icon: '💻',
      category: 'Flagship Core',
      url: 'https://ai-coding-tutor.vercel.app',
      desc: 'Monaco IDE, Real-Time AI Review & WebAssembly Sandboxes'
    },
    {
      id: 'deepsearch',
      name: "Bhavya's DeepSearch",
      icon: '🌐',
      category: 'Flagship Core',
      url: 'https://bhavyas-deepsearch.vercel.app',
      desc: 'Autonomous Deep Web Citations & Multi-Hop Grounding'
    },
    {
      id: 'college-notes',
      name: "All College Notes",
      icon: '🎓',
      category: 'Flagship Core',
      url: 'https://all-college-notes.vercel.app',
      desc: 'University Study Hub, Verified Doubt Solver & Circuit Sandbox'
    },
    {
      id: 'audio-lab',
      name: "Bhavya's AI Audio Lab",
      icon: '🔊',
      category: 'Media & Vision',
      url: 'https://bhavyas-ai-audio.vercel.app',
      desc: 'Audio Analysis, Spectrogram Visualizer & Neural Speech'
    },
    {
      id: 'media-studio',
      name: "Bhavya's AI Media Studio",
      icon: '🎨',
      category: 'Media & Vision',
      url: 'https://bhavyas-ai-media.vercel.app',
      desc: 'Generative Image Prompts & Creative AI Canvas'
    },
    {
      id: 'vision-lab',
      name: "Bhavya's AI Vision Lab",
      icon: '👁️',
      category: 'Media & Vision',
      url: 'https://bhavyas-ai-vision.vercel.app',
      desc: 'Real-Time Camera OCR, Object Detection & Visual Q&A'
    },
    {
      id: 'realtime-voice',
      name: "Bhavya's Realtime Voice",
      icon: '🎙️',
      category: 'Media & Vision',
      url: 'https://bhavyas-realtime-voice.vercel.app',
      desc: 'Low-Latency Bidirectional Audio Streaming & Voice AI'
    },
    {
      id: 'command-os',
      name: "Bhavya's AI Command OS",
      icon: '🖥️',
      category: 'Platform Engines',
      url: 'https://bhavyas-ai-command-os.vercel.app',
      desc: 'Multi-Window Desktop Terminal & Workspace Shell'
    },
    {
      id: 'ai-flow',
      name: "Bhavya's AI Flow",
      icon: '⚡',
      category: 'Platform Engines',
      url: 'https://bhavyas-ai-flow.vercel.app',
      desc: 'Visual Node Graph Workflow Automation Engine'
    },
    {
      id: 'sentinel',
      name: "Bhavya's AI Sentinel",
      icon: '🛡️',
      category: 'Platform Engines',
      url: 'https://bhavyas-ai-sentinel.vercel.app',
      desc: 'Security Guardrails, Rate Limiting & Credential Shield'
    },
    {
      id: 'mcp-nexus',
      name: "Bhavya's MCP Nexus",
      icon: '🔌',
      category: 'Platform Engines',
      url: 'https://bhavyas-mcp-nexus.vercel.app',
      desc: 'Model Context Protocol Bridge & Tool Connector'
    },
    {
      id: 'smart-router',
      name: "Bhavya's Smart Router",
      icon: '🔀',
      category: 'Platform Engines',
      url: 'https://bhavyas-smart-router.vercel.app',
      desc: 'Dynamic Latency & Cost Model Dispatcher'
    },
    {
      id: 'synapse',
      name: "Bhavya's Synapse Memory",
      icon: '🧠',
      category: 'Platform Engines',
      url: 'https://bhavyas-synapse.vercel.app',
      desc: 'Vector Store & Long-Term Episodic Recall Engine'
    },
    {
      id: 'webgpu',
      name: "Bhavya's WebGPU Edge AI",
      icon: '⚡',
      category: 'Platform Engines',
      url: 'https://bhavyas-webgpu-ai.vercel.app',
      desc: '100% Client-Side On-Device Neural Model Inference'
    },
    {
      id: 'all-college-notes',
      name: "all college notes",
      icon: '📚',
      category: 'Academic & Notes',
      url: 'https://all-colege-notes.vercel.app',
      desc: 'Curated Academic Vault, Semester Materials, Syllabus & Formula Guides'
    }
  ];

  const styleEl = document.createElement('style');
  styleEl.textContent = `
    .bhavya-hud-trigger {
      cursor: grab;
      touch-action: none;
      position: fixed;
      bottom: 20px;
      left: 20px;
      z-index: 999990;
      background: rgba(15, 23, 42, 0.88);
      border: 1px solid rgba(0, 242, 254, 0.35);
      color: #00f2fe;
      padding: 6px 12px;
      border-radius: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.5), 0 0 15px rgba(0, 242, 254, 0.2);
      backdrop-filter: blur(12px);
      transition: all 0.2s ease;
      user-select: none;
    }
    .bhavya-hud-trigger:hover {
      transform: translateY(-2px);
      border-color: #00f2fe;
      box-shadow: 0 6px 25px rgba(0,0,0,0.7), 0 0 25px rgba(0, 242, 254, 0.4);
    }
    .bhavya-hud-kbd {
      background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 4px;
      padding: 1px 4px;
      font-size: 9.5px;
      color: #94a3b8;
    }
    .bhavya-hud-backdrop {
      position: fixed;
      inset: 0;
      z-index: 999999;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(16px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .bhavya-hud-backdrop.open {
      opacity: 1;
      pointer-events: auto;
    }
    .bhavya-hud-modal {
      width: 100%;
      max-width: 680px;
      max-height: 80vh;
      background: linear-gradient(135deg, #0b1021 0%, #131b38 100%);
      border: 1.5px solid rgba(0, 242, 254, 0.35);
      border-radius: 20px;
      box-shadow: 0 25px 70px rgba(0,0,0,0.9), 0 0 40px rgba(0, 242, 254, 0.25);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      transform: scale(0.96);
      transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .bhavya-hud-backdrop.open .bhavya-hud-modal {
      transform: scale(1);
    }
    .bhavya-hud-header {
      padding: 16px 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      gap: 12px;
      background: rgba(0, 242, 254, 0.03);
    }
    .bhavya-hud-search {
      flex: 1;
      background: transparent;
      border: none;
      outline: none;
      color: #f8fafc;
      font-size: 15px;
      font-weight: 500;
    }
    .bhavya-hud-search::placeholder {
      color: #64748b;
    }
    .bhavya-hud-list {
      padding: 12px;
      overflow-y: auto;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .bhavya-hud-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.05);
      color: #e2e8f0;
      text-decoration: none;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .bhavya-hud-item:hover, .bhavya-hud-item.selected {
      background: rgba(0, 242, 254, 0.12);
      border-color: rgba(0, 242, 254, 0.4);
      transform: translateX(4px);
    }
    .bhavya-hud-footer {
      padding: 10px 20px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 11px;
      color: #64748b;
    }
    @media (max-width: 768px) {
      .bhavya-hud-trigger,
      .bhavya-hud-backdrop,
      .bhavya-hud-modal {
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;
      }
      .bhavya-hud-trigger {
        bottom: 15px !important;
        left: 15px !important;
        padding: 5px 10px !important;
        font-size: 10px !important;
        background: #0b1021 !important;
      }
      .bhavya-hud-kbd {
        display: none !important;
      }
      .bhavya-hud-backdrop {
        padding: 10px !important;
        background: rgba(4, 7, 18, 0.96) !important;
      }
      .bhavya-hud-modal {
        max-width: 96vw !important;
        max-height: 88vh !important;
        border-radius: 16px !important;
        background: #0b1021 !important;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.9) !important;
      }
      .bhavya-hud-header {
        padding: 12px 14px !important;
      }
      .bhavya-hud-body {
        padding: 10px 14px !important;
      }
      .bhavya-hud-footer {
        padding: 8px 14px !important;
        font-size: 10px !important;
      }
    }
  `;
  document.head.appendChild(styleEl);

  const triggerBtn = document.createElement('div');
  triggerBtn.className = 'bhavya-hud-trigger';
  triggerBtn.innerHTML = `
    <span>🌐</span>
    <span>Ecosystem HUD</span>
    <span class="bhavya-hud-kbd">Alt+Space</span>
  `;
  document.body.appendChild(triggerBtn);
    
  // ══════════════════════════════════════════════════════════════════
  // 🛸 FLOATABLE HUD PILL DRAG ENGINE WITH MEMORY
  // ══════════════════════════════════════════════════════════════════
  function makeHudTriggerFloatable(el) {
    if (!el) return;
    const STORAGE_KEY = 'bhavya_pos_ecosystem_hud_pill';

    // Restore saved position
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const pos = JSON.parse(saved);
        if (typeof pos.x === 'number' && typeof pos.y === 'number') {
          const maxX = Math.max(10, window.innerWidth - el.offsetWidth - 10);
          const maxY = Math.max(10, window.innerHeight - el.offsetHeight - 10);
          el.style.left = Math.min(Math.max(10, pos.x), maxX) + 'px';
          el.style.top = Math.min(Math.max(10, pos.y), maxY) + 'px';
          el.style.right = 'auto';
          el.style.bottom = 'auto';
          el.style.transform = 'none';
        }
      }
    } catch(e) {}

    let isDragging = false;
    let startX = 0, startY = 0;
    let initialLeft = 0, initialTop = 0;
    let hasMoved = false;

    function onPointerDown(e) {
      isDragging = true;
      hasMoved = false;
      el.style.cursor = 'grabbing';
      el.style.transition = 'none';

      const rect = el.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;

      startX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
      startY = e.clientY || (e.touches && e.touches[0].clientY) || 0;

      el.style.left = initialLeft + 'px';
      el.style.top = initialTop + 'px';
      el.style.right = 'auto';
      el.style.bottom = 'auto';
      el.style.transform = 'none';

      window.addEventListener('pointermove', onPointerMove, { passive: false });
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('pointercancel', onPointerUp);
    }

    function onPointerMove(e) {
      if (!isDragging) return;
      const curX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
      const curY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
      const dx = curX - startX;
      const dy = curY - startY;

      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        hasMoved = true;
        if (e.cancelable) e.preventDefault();
      }

      let newLeft = initialLeft + dx;
      let newTop = initialTop + dy;

      const maxLeft = window.innerWidth - el.offsetWidth - 8;
      const maxTop = window.innerHeight - el.offsetHeight - 8;
      newLeft = Math.max(8, Math.min(newLeft, maxLeft));
      newTop = Math.max(8, Math.min(newTop, maxTop));

      el.style.left = newLeft + 'px';
      el.style.top = newTop + 'px';
    }

    function onPointerUp() {
      if (!isDragging) return;
      isDragging = false;
      el.style.cursor = 'grab';
      el.style.transition = '';

      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);

      if (hasMoved) {
        const rect = el.getBoundingClientRect();
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ x: rect.left, y: rect.top }));
        } catch(e) {}
      }
    }

    el.addEventListener('pointerdown', onPointerDown);

    // Suppress click open if it was a drag
    el.addEventListener('click', (e) => {
      if (hasMoved) {
        e.stopImmediatePropagation();
        e.preventDefault();
        hasMoved = false;
      }
    }, true);
  }

    makeHudTriggerFloatable(triggerBtn);

  const backdrop = document.createElement('div');
  backdrop.className = 'bhavya-hud-backdrop';
  backdrop.innerHTML = `
    <div class="bhavya-hud-modal">
      <div class="bhavya-hud-header">
        <span style="font-size: 20px;">⚡</span>
        <input type="text" class="bhavya-hud-search" placeholder="Jump to any app (Type name, e.g. Assistant, Coding, Agent, DocuMind)..." />
        <span style="font-size: 11px; color: #94a3b8; background: rgba(255,255,255,0.06); padding: 3px 7px; border-radius: 6px;">Esc to close</span>
      </div>
      <div class="bhavya-hud-list"></div>
      <div class="bhavya-hud-footer">
        <div style="display: flex; gap: 12px;">
          <span>↑/↓ Navigate</span>
          <span>↵ Open App</span>
          <span>1-9 Quick Jump</span>
        </div>
        <div>
          <span style="color: #00f2fe; font-weight: 600;">Bhavya AI 18-App Workstation</span>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(backdrop);

  const searchInput = backdrop.querySelector('.bhavya-hud-search');
  const listContainer = backdrop.querySelector('.bhavya-hud-list');
  let selectedIdx = 0;
  let currentFiltered = [...ECOSYSTEM_APPS];

  function renderList() {
    listContainer.innerHTML = '';
    if (currentFiltered.length === 0) {
      listContainer.innerHTML = `
        <div style="text-align: center; padding: 30px; color: #64748b; font-size: 13px;">
          No matching applications found.
        </div>
      `;
      return;
    }

    currentFiltered.forEach((app, idx) => {
      const isSelected = idx === selectedIdx;
      const item = document.createElement('a');
      item.href = app.url;
      item.target = '_blank';
      item.rel = 'noopener noreferrer';
      item.className = 'bhavya-hud-item' + (isSelected ? ' selected' : '');
      item.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="font-size: 22px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.05); border-radius: 8px;">${app.icon}</div>
          <div>
            <div style="font-weight: 600; font-size: 13.5px; color: #f8fafc; display: flex; align-items: center; gap: 6px;">
              <span>${app.name}</span>
              <span style="font-size: 9.5px; padding: 2px 6px; border-radius: 10px; background: rgba(0, 242, 254, 0.12); color: #00f2fe;">${app.category}</span>
            </div>
            <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">${app.desc}</div>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          ${idx < 9 ? '<span style="font-size: 10px; color: #64748b; font-family: monospace; background: rgba(255,255,255,0.06); padding: 2px 6px; border-radius: 4px;">#' + (idx + 1) + '</span>' : ''}
          <span style="font-size: 14px; color: #00f2fe; opacity: 0.6;">➔</span>
        </div>
      `;
      item.addEventListener('click', () => closeHUD());
      listContainer.appendChild(item);
    });
  }

  function openHUD() {
    backdrop.classList.add('open');
    searchInput.value = '';
    currentFiltered = [...ECOSYSTEM_APPS];
    selectedIdx = 0;
    renderList();
    setTimeout(() => searchInput.focus(), 50);
  }

  function closeHUD() {
    backdrop.classList.remove('open');
  }

  triggerBtn.addEventListener('click', openHUD);

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeHUD();
  });

  searchInput.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    if (!q) {
      currentFiltered = [...ECOSYSTEM_APPS];
    } else {
      currentFiltered = ECOSYSTEM_APPS.filter(a =>
        a.name.toLowerCase().includes(q) ||
        a.desc.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q)
      );
    }
    selectedIdx = 0;
    renderList();
  });

  window.addEventListener('keydown', (e) => {
    
    // Ecosystem Direct Teleport Shortcuts
    if (e.altKey && !e.ctrlKey && !e.metaKey) {
      const code = e.code.toLowerCase();
      if (code === 'keya') {
        e.preventDefault();
        window.open('https://bhavyas-ai-assistant.vercel.app', '_blank');
        return;
      } else if (code === 'keyc') {
        e.preventDefault();
        window.open('https://ai-coding-tutor.vercel.app', '_blank');
        return;
      } else if (code === 'keys') {
        e.preventDefault();
        window.open('https://bhavyas-synapse.vercel.app', '_blank');
        return;
      } else if (code === 'keyd') {
        e.preventDefault();
        window.open('https://bhavyas-deepsearch.vercel.app', '_blank');
        return;
      }
    }

    if (e.altKey && e.code === 'Space') {
      e.preventDefault();
      if (backdrop.classList.contains('open')) closeHUD();
      else openHUD();
      return;
    }

    if (!backdrop.classList.contains('open')) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      closeHUD();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (currentFiltered.length > 0) {
        selectedIdx = (selectedIdx + 1) % currentFiltered.length;
        renderList();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (currentFiltered.length > 0) {
        selectedIdx = (selectedIdx - 1 + currentFiltered.length) % currentFiltered.length;
        renderList();
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (currentFiltered[selectedIdx]) {
        window.open(currentFiltered[selectedIdx].url, '_blank');
        closeHUD();
      }
    } else if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key >= '1' && e.key <= '9') {
      const idx = parseInt(e.key, 10) - 1;
      if (currentFiltered[idx] && document.activeElement !== searchInput) {
        e.preventDefault();
        window.open(currentFiltered[idx].url, '_blank');
        closeHUD();
      }
    }
  });

  console.log('🌐 Bhavya AI Universal Ecosystem Quick-Switch HUD initialized (Press Alt + Space).');
})();
