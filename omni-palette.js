
  // ══════════════════════════════════════════════════════════
  // BHAVYA AI ECOSYSTEM · UNIVERSAL TOKEN & RATE GOVERNOR
  // ══════════════════════════════════════════════════════════
  var BhavyaTokenGovernor = (function() {
    var DAILY_LIMIT = 100000; // 100,000 free tokens / day per device
    var MAX_REQS_PER_MIN = 15;
    var STORAGE_KEY = 'bhavya_ai_token_governor_v1';

    function getTodayKey() {
      var d = new Date();
      return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0');
    }

    function getGovernorData() {
      var today = getTodayKey();
      try {
        var raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          var parsed = JSON.parse(raw);
          if (parsed.date === today) {
            return parsed;
          }
        }
      } catch(e) {}
      return { date: today, tokensUsed: 0, minuteWindow: Date.now(), reqCountThisMinute: 0 };
    }

    function saveGovernorData(data) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch(e) {}
    }

    function checkCustomKey() {
      try {
        var keyMap = JSON.parse(localStorage.getItem('bhavya_provider_keys') || '{}');
        var hasKey = Object.values(keyMap).some(function(k) { return k && k.trim().length > 10; });
        if (hasKey) return true;
      } catch(e) {}
      return false;
    }

    return {
      DAILY_LIMIT: DAILY_LIMIT,
      canExecute: function(estimatedTokens) {
        if (checkCustomKey()) {
          return { allowed: true, isUnlimited: true, remaining: Infinity };
        }
        var data = getGovernorData();
        var now = Date.now();

        // Check sliding 1-minute velocity rate limit
        if (now - data.minuteWindow > 60000) {
          data.minuteWindow = now;
          data.reqCountThisMinute = 0;
        }
        if (data.reqCountThisMinute >= MAX_REQS_PER_MIN) {
          return {
            allowed: false,
            reason: 'Rate limit reached (15 requests/min). Please wait ' + Math.ceil((60000 - (now - data.minuteWindow)) / 1000) + 's before sending another prompt.'
          };
        }

        // Check daily token quota
        var remaining = DAILY_LIMIT - data.tokensUsed;
        if (remaining <= 0 || (estimatedTokens && remaining < estimatedTokens)) {
          return {
            allowed: false,
            reason: 'Daily free token quota reached (' + DAILY_LIMIT.toLocaleString() + ' tokens/day). Quota resets at 00:00 UTC, or connect your own API Key to continue with unlimited requests.'
          };
        }

        return { allowed: true, remaining: remaining, isUnlimited: false };
      },

      consumeTokens: function(tokens) {
        if (checkCustomKey()) return;
        var data = getGovernorData();
        var now = Date.now();
        if (now - data.minuteWindow > 60000) {
          data.minuteWindow = now;
          data.reqCountThisMinute = 0;
        }
        data.reqCountThisMinute++;
        data.tokensUsed += Math.max(1, tokens || 150);
        saveGovernorData(data);
        BhavyaTokenGovernor.updateHUD();
      },

      getStats: function() {
        if (checkCustomKey()) {
          return { used: 0, limit: 'Unlimited', remaining: 'Unlimited', percent: 100, isUnlimited: true };
        }
        var data = getGovernorData();
        var remaining = Math.max(0, DAILY_LIMIT - data.tokensUsed);
        var percent = Math.max(0, Math.min(100, (remaining / DAILY_LIMIT) * 100));
        
        var now = new Date();
        var midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
        var diffMs = midnight - now;
        var hrs = Math.floor(diffMs / (1000 * 60 * 60));
        var mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

        return {
          used: data.tokensUsed,
          limit: DAILY_LIMIT,
          remaining: remaining,
          percent: percent,
          resetIn: hrs + 'h ' + mins + 'm',
          isUnlimited: false
        };
      },

      updateHUD: function() {
        var el = document.getElementById('bhavya-token-hud-badge');
        if (!el) return;
        var stats = BhavyaTokenGovernor.getStats();
        if (stats.isUnlimited) {
          el.innerHTML = '⚡ <strong>Tokens:</strong> Unlimited (Custom Key)';
          el.style.borderColor = 'rgba(0, 255, 170, 0.4)';
          el.style.color = '#00ffaa';
        } else {
          el.innerHTML = '⚡ <strong>Tokens:</strong> ' + stats.remaining.toLocaleString() + ' / ' + stats.limit.toLocaleString();
          if (stats.percent < 20) {
            el.style.borderColor = 'rgba(255, 60, 60, 0.5)';
            el.style.color = '#ff6b6b';
          } else {
            el.style.borderColor = 'rgba(0, 240, 255, 0.25)';
            el.style.color = '#00f0ff';
          }
        }
      }
    };
  })();
  window.BhavyaTokenGovernor = BhavyaTokenGovernor;

  // =========================================================
  // 🛡️ BHAVYA AI SENTINEL — UNIVERSAL PROMPT INJECTION & PII SHIELD
  // =========================================================
  window.BhavyaSentinelShield = {
    sanitizePrompt: function(rawPrompt) {
      if (!rawPrompt || typeof rawPrompt !== 'string') return { safe: true, text: rawPrompt, threats: [] };
      
      var raw = rawPrompt.trim();
      var lower = raw.toLowerCase();
      var threats = [];

      // 1. Jailbreak Checks
      if (lower.indexOf('dan') !== -1 || lower.indexOf('do anything now') !== -1 || 
          lower.indexOf('ignore all previous') !== -1 || lower.indexOf('freed from all safety') !== -1) {
        threats.push("Jailbreak & Role Override Attempt (DAN Pattern detected)");
      }

      // 2. System Prompt Exfiltration
      if (lower.indexOf('repeat the exact system prompt') !== -1 || 
          lower.indexOf('reveal the system prompt') !== -1 || 
          lower.indexOf('print system instructions') !== -1) {
        threats.push("System Prompt Leakage Vector Detected");
      }

      // 3. PII Scanning & Redaction
      var sanitized = raw;
      
      // Credit Card pattern
      var ccRegex = /\b(?:\d{4}[ -]?){3}\d{4}\b/g;
      if (ccRegex.test(sanitized)) {
        sanitized = sanitized.replace(ccRegex, '[REDACTED_CREDIT_CARD]');
        threats.push("Payment Card Number Redacted");
      }

      // Email pattern
      var emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
      if (emailRegex.test(sanitized)) {
        sanitized = sanitized.replace(emailRegex, '[REDACTED_EMAIL]');
        threats.push("Email Address Redacted");
      }

      // API Key pattern
      var apiKeyRegex = /\b(?:sk_live_|ghp_|xoxb-|sk-proj-|sk-ant-|AIzaSy)[A-Za-z0-9_-]{12,}\b/g;
      if (apiKeyRegex.test(sanitized)) {
        sanitized = sanitized.replace(apiKeyRegex, '[REDACTED_API_SECRET]');
        threats.push("Private Production API Token Redacted");
      }

      return {
        safe: threats.length === 0,
        text: sanitized,
        threats: threats
      };
    }
  };


// Universal Ecosystem Hub (Ctrl+K), Procedural WebAudio SFX & Draggable/Floatable Glowing Dot AI Chatbot
(function() {
  if (window.__BHAVYA_ECOSYSTEM_LOADED__) return;
  window.__BHAVYA_ECOSYSTEM_LOADED__ = true;

  // =========================================================
  // 🚀 ADAPTIVE HARDWARE REFRESH RATE & GPU ACCELERATOR ENGINE
  // =========================================================
  (function initHardwareRefreshRateSync() {
    window.__BHAVYA_TARGET_HZ__ = 60;
    var frames = 0;
    var startTime = performance.now();
    var sampleCount = 0;

    function detectHz(timestamp) {
      frames++;
      var elapsed = timestamp - startTime;
      if (elapsed >= 500) {
        var detected = Math.round((frames * 1000) / elapsed);
        var normalizedHz = 60;
        if (detected > 210) normalizedHz = 240;
        else if (detected > 150) normalizedHz = 165;
        else if (detected > 130) normalizedHz = 144;
        else if (detected > 105) normalizedHz = 120;
        else if (detected > 80) normalizedHz = 90;
        else if (detected > 50) normalizedHz = 60;
        else normalizedHz = 30;

        window.__BHAVYA_TARGET_HZ__ = normalizedHz;
        document.documentElement.style.setProperty('--bhavya-fps', normalizedHz);
        document.documentElement.style.setProperty('--bhavya-frame-time', (1000 / normalizedHz).toFixed(2) + 'ms');

        sampleCount++;
        if (sampleCount < 4) {
          frames = 0;
          startTime = performance.now();
          requestAnimationFrame(detectHz);
        }
        return;
      }
      requestAnimationFrame(detectHz);
    }
    requestAnimationFrame(detectHz);

    var perfStyle = document.createElement('style');
    perfStyle.id = 'bhavya-hardware-accel-style';
    perfStyle.textContent = 
      '* { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }\n' +
      'html, body { text-rendering: optimizeSpeed; overscroll-behavior-y: none; }\n' +
      'canvas, video, .card, .history-card, .hud-card, #bhavya-glowing-dot-btn, #bhavya-ai-chatbot-window, #bhavya-omni-modal-container { transform: translate3d(0, 0, 0); backface-visibility: hidden; perspective: 1000px; will-change: transform; }';
    
    if (document.head) document.head.appendChild(perfStyle);
    else document.addEventListener('DOMContentLoaded', function() { document.head.appendChild(perfStyle); });

    try {
      window.addEventListener('touchstart', function(){}, { passive: true });
      window.addEventListener('touchmove', function(){}, { passive: true });
      window.addEventListener('wheel', function(){}, { passive: true });
    } catch(e) {}
  })();

    var ECOSYSTEM_APPS = [
    { name: "Master Hub", logo: "https://bhavyas-ai-hub.vercel.app/logos/master_hub_3d_logo.jpg", icon: "🌌", desc: "3D Central Command & Showcase", url: "https://bhavyas-ai-hub.vercel.app", category: "Core" },
    { name: "AI Flow Studio", logo: "https://bhavyas-ai-hub.vercel.app/logos/ai_flow_3d_logo.jpg", icon: "🧩", desc: "Visual Node-Based Automation Studio", url: "https://bhavyas-ai-flow.vercel.app", category: "Automation" },
    { name: "AI Audio Lab", logo: "https://bhavyas-ai-hub.vercel.app/logos/audio_lab_3d_logo.jpg", icon: "🎵", desc: "Neural WebAudio Synthesizer & Stem Lab", url: "https://bhavyas-ai-audio.vercel.app", category: "Audio" },
    { name: "AI Vision Lab", logo: "https://bhavyas-ai-hub.vercel.app/logos/vision_lab_3d_logo.jpg", icon: "👁️", desc: "Computer Vision & Face/Pose Mesh", url: "https://bhavyas-ai-vision.vercel.app", category: "Vision" },
    { name: "AI Assistant", logo: "https://bhavyas-ai-hub.vercel.app/logos/ai_assistant_3d_logo.jpg", icon: "🤖", desc: "Multi-Modal Cognitive Chatbot", url: "https://bhavyas-ai-assistant.vercel.app", category: "Chat" },
    { name: "AI Agent", logo: "https://bhavyas-ai-hub.vercel.app/logos/ai_agent_3d_logo.jpg", icon: "⚡", desc: "Autonomous Task & Goal Planner", url: "https://bhavyas-ai-agent.vercel.app", category: "Agents" },
    { name: "AI Coding Tutor", logo: "https://bhavyas-ai-hub.vercel.app/logos/coding_tutor_3d_logo.jpg", icon: "💻", desc: "Interactive Code Trace & Debugger", url: "https://bhavyas-ai-coding-tutor.vercel.app", category: "Developer" },
    { name: "AI Media Studio", logo: "https://bhavyas-ai-hub.vercel.app/logos/media_studio_3d_logo.jpg", icon: "🎨", desc: "8K Visual Gen & Prompt Lab", url: "https://bhavyas-ai-media.vercel.app", category: "Creative" },
    { name: "DocuMind", logo: "https://bhavyas-ai-hub.vercel.app/logos/documind_3d_logo.jpg", icon: "📄", desc: "PDF Knowledge Extraction & RAG", url: "https://bhavyas-ai-documind.vercel.app", category: "Intelligence" },
    { name: "Command OS", logo: "https://bhavyas-ai-hub.vercel.app/logos/command_os_3d_logo.jpg", icon: "🎯", desc: "Executive Productivity & Vault", url: "https://bhavyas-ai-command-os.vercel.app", category: "Productivity" },
    { name: "Synapse Memory", logo: "https://bhavyas-ai-hub.vercel.app/logos/synapse_memory_3d_logo.jpg", icon: "🧠", desc: "Universal Cross-App Memory Bus", url: "https://bhavyas-synapse.vercel.app", category: "Core" },
    { name: "DeepSearch", logo: "https://bhavyas-ai-hub.vercel.app/logos/deepsearch_3d_logo.jpg", icon: "🛰️", desc: "Autonomous Multi-Hop Research Agent", url: "https://bhavyas-deepsearch.vercel.app", category: "Agents" },
    { name: "Realtime Voice", logo: "https://bhavyas-ai-hub.vercel.app/logos/realtime_voice_3d_logo.jpg", icon: "🎙️", desc: "Zero-Latency Voice Companion", url: "https://bhavyas-realtime-voice.vercel.app", category: "Voice" },
    { name: "WebGPU Edge AI", logo: "https://bhavyas-ai-hub.vercel.app/logos/webgpu_ai_3d_logo.jpg", icon: "⚡", desc: "Local In-Browser GPU Inference", url: "https://bhavyas-webgpu-ai.vercel.app", category: "Developer" },
    { name: "AI Sentinel", logo: "https://bhavyas-ai-hub.vercel.app/logos/ai_sentinel_3d_logo.jpg", icon: "🛡️", desc: "Security Firewall & PII Shield", url: "https://bhavyas-ai-sentinel.vercel.app", category: "Security" },
    { name: "MCP Nexus", logo: "https://bhavyas-ai-hub.vercel.app/logos/mcp_nexus_3d_logo.jpg", icon: "🔌", desc: "Model Context Protocol Playground", url: "https://bhavyas-mcp-nexus.vercel.app", category: "Developer" },
    { name: "Smart Router", logo: "https://bhavyas-ai-hub.vercel.app/logos/smart_router_3d_logo.jpg", icon: "🧭", desc: "Model Dispatcher & Cost Optimizer", url: "https://bhavyas-smart-router.vercel.app", category: "Infrastructure" }
  ];

  var currentAppTitle = document.title ? document.title.split('·')[0].split('-')[0].trim() : "Ecosystem App";
  
  var isMasterHub = window.location.hostname.includes('hub') || 
                    window.location.pathname.includes('hub') || 
                    (document.title && document.title.toLowerCase().includes('master hub'));

  var isAiAgent = window.location.hostname.includes('agent') || 
                  window.location.pathname.includes('agent') || 
                  (document.title && document.title.toLowerCase().includes('agent'));

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
      navigator.serviceWorker.register('/sw.js').catch(function() {});
    });
  }

  // =========================================================
  // 🔊 PROCEDURAL CYBERNETIC WEB AUDIO SFX SYNTHESIZER
  // =========================================================
  var audioCtx = null;
  function getAudioContext() {
    if (!audioCtx) {
      var AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) audioCtx = new AudioContextClass();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(function() {});
    }
    return audioCtx;
  }

  function isAudioMuted() {
    try {
      return localStorage.getItem('bhavya_audio_muted') === 'true';
    } catch(e) {
      return false;
    }
  }

  function setAudioMuted(muted) {
    try {
      localStorage.setItem('bhavya_audio_muted', muted ? 'true' : 'false');
    } catch(e) {}
  }

  function playCyberSound(type) {
    if (isAudioMuted()) return;
    try {
      var ctx = getAudioContext();
      if (!ctx) return;

      var now = ctx.currentTime;
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'click') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1400, now);
        osc.frequency.exponentialRampToValueAtTime(700, now + 0.04);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        osc.start(now);
        osc.stop(now + 0.045);
      } else if (type === 'open') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(1040, now + 0.12);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === 'response') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(1320, now + 0.08);
        osc.frequency.exponentialRampToValueAtTime(1760, now + 0.18);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.start(now);
        osc.stop(now + 0.23);
      }
    } catch(e) {}
  }

  // Realtime Synapse Sync
  var synapseChannel = null;
  try {
    synapseChannel = new BroadcastChannel('bhavya_ai_synapse');
    synapseChannel.onmessage = function(event) {
      if (event.data && event.data.type === 'USER_NAME_UPDATE') {
        try {
          localStorage.setItem('bhavya_user_name', event.data.name);
          updateBotGreeting();
        } catch(e) {}
      }
    };
  } catch(e) {}

  function getUserName() {
    try {
      return localStorage.getItem('bhavya_user_name') || '';
    } catch(e) {
      return '';
    }
  }

  function setUserName(name) {
    if (!name || !name.trim()) return;
    var clean = name.trim();
    try {
      localStorage.setItem('bhavya_user_name', clean);
      if (synapseChannel) {
        synapseChannel.postMessage({ type: 'USER_NAME_UPDATE', name: clean });
      }
      logUniversalMemory('User identified as "' + clean + '" in ' + currentAppTitle + '.', 'User Profile', 'Profile & Identity');
    } catch(e) {}
  }

  function logUniversalMemory(text, source, category) {
    try {
      var STORAGE_KEY = 'bhavya_synapse_memories_v2';
      var raw = localStorage.getItem(STORAGE_KEY);
      var list = raw ? JSON.parse(raw) : [];
      var newMem = {
        id: 'mem_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        text: text,
        source: source || currentAppTitle,
        category: category || 'Chat Memory',
        importance: 4,
        createdAt: new Date().toISOString()
      };
      list.unshift(newMem);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      if (synapseChannel) {
        synapseChannel.postMessage({ type: 'NEW_MEMORY', memory: newMem });
      }
    } catch(e) {}
  }

  // ══════════════════════════════════════════════════════════
  // ⚡ BHAVYA AI ECOSYSTEM · UNIVERSAL CONTINUITY & HANDOFF BUS
  // ══════════════════════════════════════════════════════════
  var BhavyaContinuity = (function() {
    var HANDOFF_STORAGE_KEY = 'bhavya_ecosystem_handoff_payload';
    var continuityChannel = null;
    try {
      continuityChannel = new BroadcastChannel('bhavya_ecosystem_continuity');
    } catch(e) {}

    function sendTo(targetAppQueryOrUrl, payload) {
      if (!payload || !payload.content) return;
      var data = {
        id: 'hnd_' + Date.now(),
        sourceApp: currentAppTitle,
        title: payload.title || (payload.content.slice(0, 45).replace(/\n/g, ' ') + '...'),
        type: payload.type || 'text',
        content: payload.content,
        timestamp: Date.now()
      };

      try {
        localStorage.setItem(HANDOFF_STORAGE_KEY, JSON.stringify(data));
      } catch(e) {}

      if (continuityChannel) {
        continuityChannel.postMessage({ type: 'ECOSYSTEM_HANDOFF', data: data });
      }

      var targetUrl = targetAppQueryOrUrl;
      var appMatch = ECOSYSTEM_APPS.find(function(a) {
        var query = (targetAppQueryOrUrl || '').toLowerCase();
        return a.name.toLowerCase().includes(query) ||
               a.desc.toLowerCase().includes(query) ||
               a.url.toLowerCase().includes(query);
      });
      if (appMatch) targetUrl = appMatch.url;

      if (targetUrl) {
        var sep = targetUrl.includes('?') ? '&' : '?';
        window.open(targetUrl + sep + 'bhavya_handoff=true', '_blank');
      }
    }

    function checkIncomingHandoff() {
      try {
        var raw = localStorage.getItem(HANDOFF_STORAGE_KEY);
        if (!raw) return null;
        var parsed = JSON.parse(raw);
        if (Date.now() - parsed.timestamp < 300000) {
          return parsed;
        }
      } catch(e) {}
      return null;
    }

    function clearHandoff() {
      try {
        localStorage.removeItem(HANDOFF_STORAGE_KEY);
      } catch(e) {}
    }

    function insertIntoActiveScreen(content) {
      if (!content) return false;
      // 1. Monaco Editor
      if (window.monaco && window.monaco.editor) {
        var editors = window.monaco.editor.getEditors();
        if (editors && editors.length > 0) {
          editors[0].setValue(content);
          return true;
        }
      }
      // 2. Standard Textarea or input
      var target = document.querySelector('textarea:not(#bhavya-ai-chatbot-window textarea), input[type="text"]:not(#bhavya-omni-search-input):not(#bhavya-ai-chatbot-window input)');
      if (target) {
        target.value = content;
        target.dispatchEvent(new Event('input', { bubbles: true }));
        target.dispatchEvent(new Event('change', { bubbles: true }));
        target.focus();
        return true;
      }
      // 3. Fallback: Copy to clipboard
      navigator.clipboard.writeText(content).catch(function() {});
      return false;
    }

    function showHandoffBanner(data) {
      if (!data || document.getElementById('bhavya-handoff-banner')) return;
      var banner = document.createElement('div');
      banner.id = 'bhavya-handoff-banner';
      banner.innerHTML = 
        '<div class="bhavya-handoff-content">' +
          '<span class="bhavya-handoff-icon">⚡</span>' +
          '<div class="bhavya-handoff-text">' +
            '<strong>Incoming Handoff from ' + escapeHTML(data.sourceApp) + ':</strong> ' +
            '<span>"' + escapeHTML(data.title) + '"</span>' +
          '</div>' +
        '</div>' +
        '<div class="bhavya-handoff-actions">' +
          '<button id="bhavya-btn-use-handoff" class="bhavya-btn-handoff-primary">⚡ Insert into Page</button>' +
          '<button id="bhavya-btn-dismiss-handoff" class="bhavya-btn-handoff-dismiss">✕ Dismiss</button>' +
        '</div>';
      document.body.appendChild(banner);

      document.getElementById('bhavya-btn-use-handoff').onclick = function() {
        var inserted = insertIntoActiveScreen(data.content);
        this.textContent = inserted ? '✅ Inserted!' : '📋 Copied to Clipboard!';
        setTimeout(function() {
          if (banner.parentNode) banner.parentNode.removeChild(banner);
          clearHandoff();
        }, 1200);
      };

      document.getElementById('bhavya-btn-dismiss-handoff').onclick = function() {
        if (banner.parentNode) banner.parentNode.removeChild(banner);
        clearHandoff();
      };
    }

    function grabCurrentContext() {
      var sel = window.getSelection ? window.getSelection().toString().trim() : '';
      if (sel && sel.length > 5) return { title: 'Selection (' + sel.slice(0, 30) + '...)', content: sel, type: 'text' };

      if (window.monaco && window.monaco.editor) {
        var eds = window.monaco.editor.getEditors();
        if (eds && eds.length > 0) {
          var code = eds[0].getValue();
          if (code && code.trim().length > 0) return { title: currentAppTitle + ' Active Code', content: code, type: 'code' };
        }
      }

      var input = document.querySelector('textarea:not(#bhavya-ai-chatbot-window textarea), input[type="text"]:not(#bhavya-omni-search-input):not(#bhavya-ai-chatbot-window input)');
      if (input && input.value && input.value.trim().length > 5) {
        return { title: currentAppTitle + ' Input Content', content: input.value.trim(), type: 'text' };
      }

      return { title: currentAppTitle + ' Snapshot', content: 'Context snapshot from ' + currentAppTitle + ' (' + window.location.href + ')', type: 'text' };
    }

    function init() {
      if (window.location.search.includes('bhavya_handoff=true')) {
        var incoming = checkIncomingHandoff();
        if (incoming && incoming.sourceApp !== currentAppTitle) {
          setTimeout(function() { showHandoffBanner(incoming); }, 500);
        }
      }
      if (continuityChannel) {
        continuityChannel.onmessage = function(e) {
          if (e.data && e.data.type === 'ECOSYSTEM_HANDOFF' && e.data.data) {
            if (e.data.data.sourceApp !== currentAppTitle) {
              showHandoffBanner(e.data.data);
            }
          }
        };
      }
    }

    return {
      sendTo: sendTo,
      checkIncomingHandoff: checkIncomingHandoff,
      insertIntoActiveScreen: insertIntoActiveScreen,
      grabCurrentContext: grabCurrentContext,
      showHandoffBanner: showHandoffBanner,
      init: init
    };
  })();

  // ══════════════════════════════════════════════════════════
  // 🧠 BHAVYA AI ECOSYSTEM · SHARED SYNAPSE GLOBAL BRAIN
  // ══════════════════════════════════════════════════════════
  var BhavyaSynapse = (function() {
    var DOSSIER_KEY = 'bhavya_active_project_dossier';

    function getProjectContext() {
      try {
        var raw = localStorage.getItem(DOSSIER_KEY);
        if (raw) return JSON.parse(raw);
      } catch(e) {}
      return {
        activeProject: 'Bhavya AI Master Ecosystem',
        goal: 'Building full-stack AI applications and developer tools',
        techStack: 'React, Node.js, WebGPU, Python, WebAudio',
        lastUpdated: new Date().toISOString()
      };
    }

    function setProject(project, goal, techStack) {
      var current = getProjectContext();
      var updated = {
        activeProject: project || current.activeProject,
        goal: goal || current.goal,
        techStack: techStack || current.techStack,
        lastUpdated: new Date().toISOString()
      };
      try {
        localStorage.setItem(DOSSIER_KEY, JSON.stringify(updated));
      } catch(e) {}
      if (synapseChannel) {
        synapseChannel.postMessage({ type: 'DOSSIER_UPDATE', dossier: updated });
      }
      logUniversalMemory('Updated active project: "' + updated.activeProject + '" (' + updated.goal + ')', currentAppTitle, 'Project Dossier');
    }

    function getContextSummary() {
      var ctx = getProjectContext();
      var user = getUserName() || 'User';
      return 'User: ' + user + ' | Active Project: ' + ctx.activeProject + ' | Goal: ' + ctx.goal + ' | Tech: ' + ctx.techStack;
    }

    return {
      getProjectContext: getProjectContext,
      setProject: setProject,
      getContextSummary: getContextSummary
    };
  })();

  // ══════════════════════════════════════════════════════════
  // 🛡️ BHAVYA AI ECOSYSTEM · INVISIBLE ZERO-DOWNTIME FAILOVER
  // ══════════════════════════════════════════════════════════
  var BhavyaFailover = (function() {
    function showToast(msg) {
      var existing = document.querySelector('.bhavya-failover-toast');
      if (existing && existing.parentNode) existing.parentNode.removeChild(existing);

      var toast = document.createElement('div');
      toast.className = 'bhavya-failover-toast';
      toast.innerHTML = '<span>🟢 ' + escapeHTML(msg) + '</span>';
      document.body.appendChild(toast);
      setTimeout(function() {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-10px)';
        setTimeout(function() { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 300);
      }, 3800);
    }

    async function executeWithFailover(primaryCallFn, fallbackCallFn, providerName) {
      try {
        var res = await primaryCallFn();
        if (res && res.ok) return res;
        if (res && (res.status === 429 || res.status >= 500)) {
          showToast('Primary ' + (providerName || 'API') + ' rate limit reached. Auto-healed via High-Speed Groq LPU failover.');
          if (fallbackCallFn) return await fallbackCallFn();
        }
        return res;
      } catch(err) {
        showToast('Network latency spike detected. Auto-healed via Cerebras/Groq failover.');
        if (fallbackCallFn) return await fallbackCallFn();
        throw err;
      }
    }

    return {
      showToast: showToast,
      executeWithFailover: executeWithFailover
    };
  })();

  // Persistent Chat History
  var CHAT_STORAGE_KEY = 'bhavya_ai_chatbot_history_v1';
  function getChatHistory() {
    try {
      return JSON.parse(localStorage.getItem(CHAT_STORAGE_KEY) || '[]');
    } catch(e) {
      return [];
    }
  }
  function saveChatHistory(history) {
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(history.slice(-30)));
    } catch(e) {}
  }
  function clearChatHistory() {
    try {
      localStorage.removeItem(CHAT_STORAGE_KEY);
    } catch(e) {}
  }

  // ═════════════════════════════════════════════════════════
  // 🌟 GORGEOUS MARKDOWN & CHATBOT TYPOGRAPHY RENDERER
  // ═════════════════════════════════════════════════════════
  function escapeHTML(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function renderInlineMarkdown(str) {
    if (!str) return '';
    var s = String(str);
    s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="bhavya-chat-link">$1 ↗</a>');
    s = s.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    s = s.replace(new RegExp('`([^`]+)`', 'g'), '<code class="bhavya-inline-code">$1</code>');
    return s;
  }

  function renderMarkdownHtml(md) {
    if (!md) return '';
    var text = String(md);
    var codeBlocks = [];

    // Extract Code Blocks
    text = text.replace(new RegExp('```([a-zA-Z0-9_-]*)\\n?([\\s\\S]*?)```', 'g'), function(match, lang, code) {
      var id = "__CODE_BLOCK_" + codeBlocks.length + "__";
      codeBlocks.push({ lang: (lang || 'code').trim(), code: code.trim() });
      return id;
    });

    // 1. Render Markdown Tables
    text = text.replace(/(?:^\s*\|.*\|\s*$\n?)+/gm, function(tableBlock) {
      var lines = tableBlock.trim().split("\n").map(function(l){ return l.trim(); }).filter(function(l){ return l.length > 0; });
      if (lines.length < 2) return tableBlock;

      var html = '<div class="bhavya-table-container"><table class="bhavya-chat-table">';
      var isHeader = true;

      for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        if (line.match(/^\|?[\s-:]+\|[\s-:\|]+$/)) {
          isHeader = false;
          continue;
        }

        var cells = line.split("|").map(function(c){ return c.trim(); });
        if (cells[0] === '') cells.shift();
        if (cells.length > 0 && cells[cells.length - 1] === '') cells.pop();

        if (isHeader && i === 0) {
          html += '<thead><tr>';
          cells.forEach(function(c) { html += '<th>' + renderInlineMarkdown(c) + '</th>'; });
          html += '</tr></thead><tbody>';
        } else {
          html += '<tr>';
          cells.forEach(function(c) { html += '<td>' + renderInlineMarkdown(c) + '</td>'; });
          html += '</tr>';
        }
      }

      html += '</tbody></table></div>';
      return html;
    });

    // 2. Headers
    text = text.replace(/^### (.*$)/gim, '<h3 class="bhavya-chat-h3">$1</h3>');
    text = text.replace(/^## (.*$)/gim, '<h2 class="bhavya-chat-h2">$1</h2>');
    text = text.replace(/^# (.*$)/gim, '<h2 class="bhavya-chat-h2">$1</h2>');

    // 3. Inline formatting
    text = renderInlineMarkdown(text);

    // 4. Bullet lists
    text = text.replace(/^\s*[-*•]\s+(.*$)/gim, '<li class="bhavya-chat-li">$1</li>');
    text = text.replace(/(<li class="bhavya-chat-li">.*<\/li>(\n|))+/g, '<ul class="bhavya-chat-ul">$&</ul>');

    // 5. Paragraphs
    var paragraphs = text.split(/\n{2,}/);
    text = paragraphs.map(function(p) {
      p = p.trim();
      if (!p) return '';
      if (p.startsWith('<h2') || p.startsWith('<h3') || p.startsWith('<ul') || p.startsWith('<div class="bhavya-table') || p.startsWith('__CODE_BLOCK_')) {
        return p;
      }
      return '<p class="bhavya-chat-p">' + p.replace(/\n/g, '<br>') + '</p>';
    }).join('\n');

    // 6. Restore Code Blocks
    codeBlocks.forEach(function(cb, idx) {
      var safeCode = escapeHTML(cb.code);
      var codeHtml = 
        '<div class="bhavya-code-block-wrapper">' +
          '<div class="bhavya-code-header">' +
            '<span>⚡ ' + (cb.lang || 'CODE').toUpperCase() + '</span>' +
            '<button class="bhavya-copy-btn" data-copy="' + encodeURIComponent(cb.code) + '">📋 Copy</button>' +
          '</div>' +
          '<pre class="bhavya-code-content"><code>' + safeCode + '</code></pre>' +
        '</div>';
      text = text.replace('__CODE_BLOCK_' + idx + '__', codeHtml);
    });

    return text;
  }

  // Instant Context-Aware Fallback Engine
  function generateSmartFallbackReply(query, userName, appTitle) {
    var q = (query || '').toLowerCase().trim();
    var name = userName ? userName : '';
    var greetingPrefix = name ? ('Hi ' + name + '! ') : 'Hi! ';

    if (q.includes('who created you') || q.includes('who made you') || q.includes('who built you') || q.includes('who is your creator') || q.includes('who developed you') || q.includes('who created this') || q.includes('who made this') || q.includes('who built this') || q.includes('who is bhavya') || q.includes('who created') || q.includes('creator')) {
      return greetingPrefix + "I was created and developed by **Bhavya Kumar Mishra**!";
    }

    if (q.includes('this website') || q.includes('this app') || q.includes('what is this') || q.includes('here')) {
      if (appTitle.toLowerCase().includes('deepsearch')) {
        return greetingPrefix + "You are currently on **Bhavya's DeepSearch**, an autonomous multi-hop AI research engine.\n\n**Key Capabilities:**\n- **Multi-Source Synthesis:** Decomposes complex queries and discovers academic citations.\n- **Formula & Math Support:** Renders LaTeX and KaTeX formulas directly.\n- **12 Frontier AI Models:** Choose from DeepSeek-R1, Claude 3.5, OpenAI o1, Gemini 2.5, and more.\n\nEnter any research topic in the search bar and click **Launch Deep Research** to begin!";
      } else if (appTitle.toLowerCase().includes('coding tutor')) {
        return greetingPrefix + "You are on **Bhavya's AI Coding Tutor**, an interactive code execution and step-by-step debugger.";
      } else if (appTitle.toLowerCase().includes('flow')) {
        return greetingPrefix + "You are on **Bhavya's AI Flow Studio**, a visual node-based workflow automation studio.";
      } else {
        return greetingPrefix + "You are inside **Bhavya's AI Master Hub** — the supreme apex command center at the top of the entire AI ecosystem created by Bhavya Kumar Mishra. Ask me anything about how to use its tools!";
      }
    }

    if (q.includes('hi') || q.includes('hello') || q.includes('hey') || q === 'hi' || q === 'hello') {
      return greetingPrefix + 'I am your dedicated AI Assistant for **' + appTitle + '**. How can I assist you with this application today?';
    }

    return greetingPrefix + 'I am here to assist you on **' + appTitle + '**. Feel free to ask about any feature, shortcut, or workflow!';
  }

  // Security Guardrail
  function checkClientSecurity(q) {
    var lower = (q || '').toLowerCase().trim();
    if (
      lower.includes('source code') ||
      lower.includes('code of the website') ||
      lower.includes('code of this website') ||
      lower.includes('backend code') ||
      lower.includes('api key') ||
      lower.includes('secret key') ||
      (lower.includes('token') && lower.includes('key')) ||
      lower.includes('confidential') ||
      lower.includes('system prompt') ||
      lower.includes('environment variable') ||
      lower.includes('.env') ||
      lower.includes('server config')
    ) {
      return "I cannot disclose the proprietary source code, internal system files, or confidential infrastructure of Bhavya's AI Ecosystem.";
    }
    return null;
  }

  function detectAndStoreName(text) {
    var match = text.match(/(?:my name is|i am|call me|this is)\s+([A-Z][a-zA-Z0-9_-]{1,20})/i);
    if (match && match[1]) {
      var extracted = match[1].trim();
      setUserName(extracted);
      return extracted;
    }
    return getUserName();
  }

  // Inject High-Performance CSS & Beautiful Chatbot Typography
  var styleEl = document.createElement('style');
  styleEl.textContent = 
    '#bhavya-hub-palette-btn, #bhavya-ecosystem-pill, .bhavya-ecosystem-pill { display: none !important; opacity: 0 !important; visibility: hidden !important; pointer-events: none !important; }\n' +
    '#bhavya-glowing-dot-btn {\n' +
    '  position: fixed; bottom: 24px; right: 24px; width: 58px; height: 58px; border-radius: 50%;\n' +
    '  background: radial-gradient(circle at 35% 35%, #00f2fe 0%, #0c1a3a 70%, #040817 100%);\n' +
    '  border: 2px solid #00f2fe; box-shadow: 0 0 20px rgba(0, 242, 254, 0.6), 0 10px 30px rgba(0, 0, 0, 0.9);\n' +
    '  cursor: grab; z-index: 999998; display: flex; align-items: center; justify-content: center;\n' +
    '  transition: transform 0.15s ease; touch-action: none; user-select: none; will-change: transform;\n' +
    '}\n' +
    '#bhavya-glowing-dot-btn.dragging { cursor: grabbing !important; transform: scale(1.15) !important; }\n' +
    '#bhavya-glowing-dot-btn:hover { transform: scale(1.1); }\n' +
    '#bhavya-glowing-dot-btn span { font-size: 26px; filter: drop-shadow(0 0 8px #ffffff); pointer-events: none; }\n' +
    '.bhavya-dot-badge-ping { position: absolute; top: -2px; right: -2px; width: 14px; height: 14px; background: #00f2fe; border-radius: 50%; box-shadow: 0 0 12px #00f2fe; }\n' +
        '#bhavya-ai-chatbot-window {\n' +
    '  position: fixed; bottom: 96px; right: 24px; width: 440px; max-width: calc(100vw - 32px); height: 600px; max-height: calc(100vh - 120px);\n' +
    '  background: linear-gradient(165deg, rgba(10, 18, 38, 0.98) 0%, rgba(5, 9, 20, 0.99) 100%);\n' +
    '  border: 1.5px solid rgba(0, 242, 254, 0.6); border-radius: 20px;\n' +
    '  box-shadow: 0 0 35px rgba(0, 242, 254, 0.45), 0 25px 80px rgba(0, 0, 0, 0.95);\n' +
    '  z-index: 999999; display: flex; flex-direction: column; overflow: hidden; opacity: 0; pointer-events: none;\n' +
    '  transform: translateY(20px) scale(0.95); transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);\n' +
    '  font-family: \'Space Grotesk\', system-ui, -apple-system, sans-serif; backdrop-filter: blur(20px);\n' +
    '}\n' +
    '#bhavya-ai-chatbot-window.active { opacity: 1; pointer-events: auto; transform: translateY(0) scale(1); }\n' +
    '.bhavya-chat-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; background: linear-gradient(180deg, rgba(0, 242, 254, 0.12) 0%, rgba(0, 242, 254, 0.02) 100%); border-bottom: 1px solid rgba(0, 242, 254, 0.25); }\n' +
    '.bhavya-chat-header-info { display: flex; align-items: center; gap: 10px; }\n' +
    '.bhavya-bot-avatar { width: 34px; height: 34px; border-radius: 10px; background: rgba(0, 242, 254, 0.15); border: 1px solid rgba(0, 242, 254, 0.5); display: flex; align-items: center; justify-content: center; font-size: 18px; }\n' +
    '.bhavya-chat-header-title { font-size: 14px; font-weight: 700; color: #fff; display: flex; align-items: center; gap: 6px; }\n' +
    '.bhavya-chat-header-sub { font-size: 11px; color: #00f2fe; opacity: 0.85; }\n' +
    '.bhavya-header-actions { display: flex; align-items: center; gap: 6px; }\n' +
    '.bhavya-chat-action-btn { background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.2); color: #cbd5e1; width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 12px; transition: all 0.2s; }\n' +
    '.bhavya-chat-action-btn:hover { background: rgba(0, 242, 254, 0.25); color: #00f2fe; }\n' +
    '.bhavya-chat-close-btn:hover { background: rgba(239, 68, 68, 0.3) !important; border-color: #ef4444 !important; color: #fff !important; }\n' +
    '.bhavya-standalone-chat-body { flex: 1; padding: 16px; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; background: rgba(0, 0, 0, 0.35); }\n' +
    '.bhavya-chat-bubble { padding: 14px 18px; border-radius: 16px; font-size: 13.5px; line-height: 1.65; word-break: break-word; max-width: 90%; }\n' +
    '.bhavya-chat-bubble-user { background: linear-gradient(135deg, rgba(0, 242, 254, 0.25), rgba(168, 85, 247, 0.25)); border: 1px solid rgba(0, 242, 254, 0.45); color: #fff; align-self: flex-end; border-bottom-right-radius: 4px; }\n' +
    '.bhavya-chat-bubble-ai { background: rgba(14, 22, 44, 0.95); border: 1px solid rgba(0, 242, 254, 0.32); color: #e2e8f0; align-self: flex-start; border-bottom-left-radius: 4px; max-width: 96%; box-shadow: 0 6px 20px rgba(0, 0, 0, 0.6); }\n' +
    '.bhavya-chat-h2 { color: #00f2fe; margin: 10px 0 6px 0; font-size: 15px; font-weight: 700; letter-spacing: 0.3px; border-bottom: 1px solid rgba(0, 242, 254, 0.2); padding-bottom: 4px; }\n' +
    '.bhavya-chat-h3 { color: #38bdf8; margin: 8px 0 4px 0; font-size: 14px; font-weight: 600; }\n' +
    '.bhavya-chat-p { margin: 6px 0; line-height: 1.65; }\n' +
    '.bhavya-chat-ul { margin: 6px 0 8px 18px; padding: 0; display: flex; flex-direction: column; gap: 4px; }\n' +
    '.bhavya-chat-li { margin-bottom: 2px; line-height: 1.55; }\n' +
    '.bhavya-chat-bubble-ai strong { color: #ffffff; font-weight: 700; }\n' +
    '.bhavya-chat-link { color: #00f2fe; text-decoration: underline; text-underline-offset: 3px; font-weight: 600; transition: color 0.15s; }\n' +
    '.bhavya-chat-link:hover { color: #38bdf8; }\n' +
    '.bhavya-table-container { width: 100%; overflow-x: auto; margin: 10px 0; border-radius: 10px; border: 1px solid rgba(0, 242, 254, 0.3); }\n' +
    '.bhavya-chat-table { width: 100%; border-collapse: collapse; font-size: 12px; text-align: left; background: rgba(8, 14, 30, 0.9); }\n' +
    '.bhavya-chat-table th { background: rgba(0, 242, 254, 0.14); color: #00f2fe; font-weight: 700; padding: 8px 12px; border-bottom: 1px solid rgba(0, 242, 254, 0.35); white-space: nowrap; }\n' +
    '.bhavya-chat-table td { padding: 8px 12px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); color: #cbd5e1; }\n' +
    '.bhavya-chat-table tr:last-child td { border-bottom: none; }\n' +
    '.bhavya-chat-table tr:hover td { background: rgba(0, 242, 254, 0.06); }\n' +
    '.bhavya-chat-input-row { display: flex; align-items: center; padding: 12px 14px; background: rgba(6, 12, 26, 0.95); border-top: 1px solid rgba(0, 242, 254, 0.2); gap: 10px; }\n' +
    '.bhavya-chat-input { flex: 1; background: rgba(0, 0, 0, 0.5); border: 1px solid rgba(0, 242, 254, 0.35); border-radius: 12px; padding: 10px 14px; color: #fff; font-size: 13px; font-family: inherit; outline: none; transition: border-color 0.2s; }\n' +
    '.bhavya-chat-input:focus { border-color: #00f2fe; box-shadow: 0 0 15px rgba(0, 242, 254, 0.35); }\n' +
    '.bhavya-chat-send-btn { width: 38px; height: 38px; border-radius: 10px; background: linear-gradient(135deg, #00f2fe, #4facfe); border: none; color: #000; font-size: 14px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: transform 0.2s; box-shadow: 0 0 15px rgba(0, 242, 254, 0.4); }\n' +
    '.bhavya-chat-send-btn:hover { transform: scale(1.05); }\n' +
    '#bhavya-omni-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(2, 4, 10, 0.88); backdrop-filter: blur(15px); -webkit-backdrop-filter: blur(15px); z-index: 999997; display: flex; align-items: flex-start; justify-content: center; padding-top: 8vh; opacity: 0; pointer-events: none; transition: opacity 0.2s ease; font-family: \'Space Grotesk\', system-ui, -apple-system, sans-serif; }\n' +
    '#bhavya-omni-overlay.active { opacity: 1; pointer-events: auto; }\n' +
    '#bhavya-omni-modal-container { position: relative; width: 92%; max-width: 680px; padding: 1.5px; border-radius: 20px; overflow: hidden; display: flex; box-shadow: 0 0 35px rgba(0, 242, 254, 0.4), 0 30px 90px rgba(0, 0, 0, 0.95); transform: scale(0.96) translateY(-10px); transition: transform 0.2s ease; }\n' +
    '#bhavya-omni-overlay.active #bhavya-omni-modal-container { transform: scale(1) translateY(0); }\n' +
    '.bhavya-running-light { position: absolute; top: -60%; left: -60%; width: 220%; height: 220%; background: conic-gradient(transparent 0deg, #00f2fe 45deg, #a855f7 90deg, transparent 140deg, transparent 180deg, #00f2fe 225deg, #a855f7 270deg, transparent 320deg, transparent 360deg); animation: omniRunningLightRotate 6s linear infinite; z-index: 1; }\n' +
    '@keyframes omniRunningLightRotate { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }\n' +
    '#bhavya-omni-modal { position: relative; z-index: 2; width: 100%; background: linear-gradient(165deg, rgba(10, 18, 38, 0.98) 0%, rgba(5, 9, 20, 0.99) 100%); border-radius: 18px; overflow: hidden; display: flex; flex-direction: column; }\n' +
    '.bhavya-omni-header { display: flex; align-items: center; padding: 16px 20px; border-bottom: 1px solid rgba(0, 242, 254, 0.2); gap: 12px; background: rgba(0, 242, 254, 0.05); }\n' +
    '.bhavya-omni-search { flex: 1; background: transparent; border: none; outline: none; color: #fff; font-size: 15px; font-weight: 500; font-family: inherit; }\n' +
    '.bhavya-omni-list { max-height: 380px; overflow-y: auto; padding: 10px; display: flex; flex-direction: column; gap: 5px; }\n' +
    '.bhavya-omni-item { display: flex; align-items: center; padding: 10px 14px; border-radius: 10px; text-decoration: none; color: #fff; gap: 12px; border: 1px solid transparent; transition: all 0.15s ease; cursor: pointer; }\n' +
    '.bhavya-current-app-row { border-color: rgba(34, 197, 94, 0.4) !important; background: rgba(34, 197, 94, 0.05); }\n' +
    '.bhavya-omni-item:hover, .bhavya-omni-item.selected { background: linear-gradient(90deg, rgba(0, 242, 254, 0.16) 0%, rgba(168, 85, 247, 0.12) 100%); border-color: rgba(0, 242, 254, 0.4); transform: translateX(4px); }\n' +
    '.bhavya-omni-icon { font-size: 18px; width: 36px; height: 36px; background: rgba(0, 242, 254, 0.08); border: 1px solid rgba(0, 242, 254, 0.25); border-radius: 8px; display: flex; align-items: center; justify-content: center; }\n' +
    '.bhavya-omni-info { flex: 1; }\n' +
    '.bhavya-omni-name { font-size: 13.5px; font-weight: 600; color: #fff; display: flex; align-items: center; gap: 8px; }\n' +
    '.bhavya-omni-desc { font-size: 11.5px; color: rgba(255, 255, 255, 0.5); margin-top: 1px; }\n' +
    '.bhavya-omni-footer { display: flex; align-items: center; justify-content: space-between; padding: 10px 18px; background: rgba(0, 0, 0, 0.55); border-top: 1px solid rgba(0, 242, 254, 0.15); font-size: 11px; color: rgba(255, 255, 255, 0.45); }\n' +
    '.bhavya-omni-kbd { background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.25); border-radius: 4px; padding: 2px 5px; font-size: 9.5px; color: #cbd5e1; }\n' +
    '.bhavya-inline-code { background: rgba(0, 242, 254, 0.15); border: 1px solid rgba(0, 242, 254, 0.3); color: #00f2fe; padding: 2px 5px; border-radius: 4px; font-family: monospace; font-size: 12px; }\n' +
    '.bhavya-code-block-wrapper { position: relative; margin: 10px 0; background: #080c18; border: 1px solid rgba(0, 242, 254, 0.35); border-radius: 10px; overflow: hidden; }\n' +
    '.bhavya-code-header { display: flex; justify-content: space-between; align-items: center; padding: 6px 12px; background: rgba(0, 242, 254, 0.08); border-bottom: 1px solid rgba(0, 242, 254, 0.2); font-size: 11px; color: #00f2fe; font-weight: 600; }\n' +
    '.bhavya-code-content { margin: 0; padding: 12px 14px; overflow-x: auto; font-family: monospace; font-size: 12px; color: #38bdf8; background: transparent; white-space: pre; }\n' +
    '#bhavya-handoff-banner { position: fixed; top: 18px; left: 50%; transform: translateX(-50%); z-index: 9999999; background: linear-gradient(135deg, rgba(10, 25, 47, 0.96), rgba(5, 12, 28, 0.98)); border: 1.5px solid #00f2fe; box-shadow: 0 0 25px rgba(0, 242, 254, 0.45), 0 10px 40px rgba(0,0,0,0.85); border-radius: 14px; padding: 10px 18px; display: flex; align-items: center; gap: 16px; max-width: 90vw; animation: bhavyaSlideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1); font-family: \'Space Grotesk\', system-ui, sans-serif; color: #fff; backdrop-filter: blur(15px); }\n' +
    '@keyframes bhavyaSlideDown { from { transform: translateX(-50%) translateY(-20px); opacity: 0; } to { transform: translateX(-50%) translateY(0); opacity: 1; } }\n' +
    '.bhavya-handoff-content { display: flex; align-items: center; gap: 10px; font-size: 13px; }\n' +
    '.bhavya-handoff-icon { font-size: 20px; filter: drop-shadow(0 0 6px #00f2fe); }\n' +
    '.bhavya-handoff-text { display: flex; flex-direction: column; gap: 2px; }\n' +
    '.bhavya-handoff-actions { display: flex; align-items: center; gap: 8px; }\n' +
    '.bhavya-btn-handoff-primary { background: linear-gradient(135deg, #00f2fe, #38bdf8); color: #000; border: none; font-weight: 700; padding: 6px 14px; border-radius: 8px; cursor: pointer; font-size: 12px; transition: transform 0.15s; box-shadow: 0 0 12px rgba(0, 242, 254, 0.4); }\n' +
    '.bhavya-btn-handoff-primary:hover { transform: scale(1.05); }\n' +
    '.bhavya-btn-handoff-dismiss { background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.2); color: #94a3b8; padding: 6px 10px; border-radius: 8px; cursor: pointer; font-size: 12px; }\n' +
    '.bhavya-btn-handoff-dismiss:hover { color: #fff; background: rgba(255, 255, 255, 0.15); }\n' +
    '.bhavya-failover-toast { position: fixed; top: 20px; right: 20px; z-index: 9999999; background: rgba(10, 28, 20, 0.95); border: 1.5px solid #10b981; box-shadow: 0 0 20px rgba(16, 185, 129, 0.4); color: #a7f3d0; border-radius: 10px; padding: 8px 16px; font-size: 12px; font-weight: 600; display: flex; align-items: center; gap: 8px; font-family: \'Space Grotesk\', system-ui, sans-serif; transition: all 0.3s ease; backdrop-filter: blur(12px); }\n' +
    '.bhavya-omni-quick-bar { display: flex; gap: 8px; padding: 10px 14px 8px 14px; border-bottom: 1px solid rgba(0, 242, 254, 0.12); overflow-x: auto; background: rgba(0,0,0,0.25); }\n' +
    '.bhavya-omni-quick-chip { background: rgba(0, 242, 254, 0.08); border: 1px solid rgba(0, 242, 254, 0.25); border-radius: 8px; padding: 4px 10px; font-size: 11px; color: #00f2fe; cursor: pointer; white-space: nowrap; transition: all 0.15s; font-family: inherit; font-weight: 600; }\n' +
    '.bhavya-omni-quick-chip:hover { background: rgba(0, 242, 254, 0.22); border-color: #00f2fe; transform: translateY(-1px); }';
  
  document.head.appendChild(styleEl);

  // Floating Glowing Dot Button (In every app EXCEPT Master Hub)
  if (!isMasterHub) {
    var dotBtn = document.createElement('div');
    dotBtn.id = 'bhavya-glowing-dot-btn';
    dotBtn.title = "Bhavya's AI Assistant (Drag to move, Click to open)";
    dotBtn.innerHTML = '<div class="bhavya-dot-badge-ping"></div><span>🤖</span>';
    document.body.appendChild(dotBtn);

    try {
      var savedPos = localStorage.getItem('bhavya_bot_dot_pos');
      if (savedPos) {
        var parsed = JSON.parse(savedPos);
        if (parsed.left >= 0 && parsed.top >= 0 && parsed.left < window.innerWidth && parsed.top < window.innerHeight) {
          dotBtn.style.left = parsed.left + 'px';
          dotBtn.style.top = parsed.top + 'px';
          dotBtn.style.bottom = 'auto';
          dotBtn.style.right = 'auto';
        }
      }
    } catch(e) {}

    var isDragging = false;
    var hasMoved = false;
    var startPointerX = 0;
    var startPointerY = 0;
    var startBtnLeft = 0;
    var startBtnTop = 0;

    dotBtn.ondragstart = function() { return false; };

    dotBtn.addEventListener('pointerdown', function(e) {
      // Only handle primary button (left click or touch)
      if (e.button !== 0) return;
      isDragging = true;
      hasMoved = false;
      startPointerX = e.clientX;
      startPointerY = e.clientY;

      var rect = dotBtn.getBoundingClientRect();
      startBtnLeft = rect.left;
      startBtnTop = rect.top;

      try {
        dotBtn.setPointerCapture(e.pointerId);
      } catch(err) {}

      dotBtn.classList.add('dragging');
      e.preventDefault();
    });

    dotBtn.addEventListener('pointermove', function(e) {
      if (!isDragging) return;
      var dx = e.clientX - startPointerX;
      var dy = e.clientY - startPointerY;

      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        hasMoved = true;
      }

      var newLeft = Math.max(10, Math.min(window.innerWidth - 68, startBtnLeft + dx));
      var newTop = Math.max(10, Math.min(window.innerHeight - 68, startBtnTop + dy));

      dotBtn.style.left = newLeft + 'px';
      dotBtn.style.top = newTop + 'px';
      dotBtn.style.bottom = 'auto';
      dotBtn.style.right = 'auto';
    });

    function endDrag(e) {
      if (!isDragging) return;
      isDragging = false;
      dotBtn.classList.remove('dragging');

      try {
        dotBtn.releasePointerCapture(e.pointerId);
      } catch(err) {}

      if (hasMoved) {
        var rect = dotBtn.getBoundingClientRect();
        try {
          localStorage.setItem('bhavya_bot_dot_pos', JSON.stringify({ left: rect.left, top: rect.top }));
        } catch(err) {}
      } else {
        toggleChatbot();
      }
    }

    dotBtn.addEventListener('pointerup', endDrag);
    dotBtn.addEventListener('pointercancel', endDrag);

    // Floating Chat Window
    var chatWindow = document.createElement('div');
    chatWindow.id = 'bhavya-ai-chatbot-window';
    chatWindow.innerHTML = 
      '<div class="bhavya-chat-header">' +
        '<div class="bhavya-chat-header-info">' +
          '<div class="bhavya-bot-avatar">🤖</div>' +
          '<div>' +
            '<div class="bhavya-chat-header-title">Bhavya\'s AI Copilot <span style="font-size: 10px; background: rgba(0,242,254,0.2); color: #00f2fe; padding: 1px 5px; border-radius: 4px;">Live</span></div>' +
            '<div class="bhavya-chat-header-sub">' + escapeHTML(currentAppTitle) + ' Guide</div>' +
          '</div>' +
        '</div>' +
        '<div class="bhavya-header-actions">' +
          '<button class="bhavya-chat-action-btn" id="bhavya-clear-chat-btn" title="Clear Conversation">🧹</button>' +
          '<button class="bhavya-chat-action-btn" id="bhavya-toggle-sfx-btn" title="Toggle SFX Sound">' + (isAudioMuted() ? '🔇' : '🔊') + '</button>' +
          '<button class="bhavya-chat-action-btn bhavya-chat-close-btn" id="bhavya-close-chat-btn" title="Close">✕</button>' +
        '</div>' +
      '</div>' +
      '<div class="bhavya-standalone-chat-body" id="bhavya-standalone-chat-body">' +
        '<div class="bhavya-chat-bubble bhavya-chat-bubble-ai" id="bhavya-standalone-greeting"></div>' +
      '</div>' +
      '<div class="bhavya-chat-input-row">' +
        '<input type="text" class="bhavya-chat-input" id="bhavya-standalone-input" placeholder="Ask about this app or ecosystem...">' +
        '<button class="bhavya-chat-send-btn" id="bhavya-standalone-send-btn">➤</button>' +
      '</div>';
    document.body.appendChild(chatWindow);

    var chatBody = document.getElementById('bhavya-standalone-chat-body');
    var chatInput = document.getElementById('bhavya-standalone-input');
    var sendBtn = document.getElementById('bhavya-standalone-send-btn');

    var sfxBtn = document.getElementById('bhavya-toggle-sfx-btn');
    if (sfxBtn) {
      sfxBtn.onclick = function() {
        var nowMuted = !isAudioMuted();
        setAudioMuted(nowMuted);
        sfxBtn.textContent = nowMuted ? '🔇' : '🔊';
        if (!nowMuted) playCyberSound('click');
      };
    }

    var clearBtn = document.getElementById('bhavya-clear-chat-btn');
    if (clearBtn) {
      clearBtn.onclick = function() {
        playCyberSound('click');
        clearChatHistory();
        chatBody.innerHTML = '';
        var greetingEl = document.createElement('div');
        greetingEl.className = 'bhavya-chat-bubble bhavya-chat-bubble-ai';
        greetingEl.id = 'bhavya-standalone-greeting';
        chatBody.appendChild(greetingEl);
        updateBotGreeting();
      };
    }

    function restoreChatHistory() {
      var history = getChatHistory();
      if (history.length > 0) {
        history.forEach(function(item) {
          var bubble = document.createElement('div');
          bubble.className = 'bhavya-chat-bubble ' + (item.sender === 'user' ? 'bhavya-chat-bubble-user' : 'bhavya-chat-bubble-ai');
          if (item.sender === 'user') {
            bubble.textContent = item.text;
          } else {
            bubble.innerHTML = renderMarkdownHtml(item.text);
          }
          chatBody.appendChild(bubble);
        });
        chatBody.scrollTop = chatBody.scrollHeight;
      }
    }

    function updateBotGreeting() {
      var greetingEl = document.getElementById('bhavya-standalone-greeting');
      if (!greetingEl) return;
      var name = getUserName();
      if (name) {
        greetingEl.innerHTML = '👋 Hi <strong>' + escapeHTML(name) + '</strong>! I am your dedicated AI Assistant for <strong>' + escapeHTML(currentAppTitle) + '</strong>. Ask me anything about using this app or navigating the 17-app ecosystem!';
      } else {
        greetingEl.innerHTML = '👋 Hi! I am your dedicated AI Assistant for <strong>' + escapeHTML(currentAppTitle) + '</strong>. Ask me anything about using this app or navigating the 17-app ecosystem!';
      }
    }

    updateBotGreeting();
    restoreChatHistory();

    function toggleChatbot() {
      playCyberSound('open');
      chatWindow.classList.toggle('active');
      if (chatWindow.classList.contains('active')) {
        setTimeout(function() { if (chatInput) chatInput.focus(); }, 80);
      }
    }

    document.getElementById('bhavya-close-chat-btn').addEventListener('click', function() {
      playCyberSound('click');
      chatWindow.classList.remove('active');
    });

    chatBody.addEventListener('click', function(e) {
      var btn = e.target.closest('.bhavya-copy-btn');
      if (btn) {
        playCyberSound('click');
        var code = decodeURIComponent(btn.dataset.copy || '');
        if (code) {
          navigator.clipboard.writeText(code).then(function() {
            btn.textContent = '✅ Copied!';
            setTimeout(function() { btn.textContent = '📋 Copy'; }, 2000);
          });
        }
      }
    });

    async function handleSendMessage() {
      var q = chatInput.value.trim();
      if (!q) return;
      chatInput.value = '';
      playCyberSound('click');

      var detectedName = detectAndStoreName(q);

      var history = getChatHistory();
      history.push({ sender: 'user', text: q, timestamp: Date.now() });
      saveChatHistory(history);

      var userBubble = document.createElement('div');
      userBubble.className = 'bhavya-chat-bubble bhavya-chat-bubble-user';
      userBubble.textContent = q;
      chatBody.appendChild(userBubble);

      var aiBubble = document.createElement('div');
      aiBubble.className = 'bhavya-chat-bubble bhavya-chat-bubble-ai';

      var securityBlock = checkClientSecurity(q);
      if (securityBlock) {
        aiBubble.innerHTML = renderMarkdownHtml(securityBlock);
        chatBody.appendChild(aiBubble);
        chatBody.scrollTop = chatBody.scrollHeight;
        playCyberSound('response');

        history.push({ sender: 'ai', text: securityBlock, timestamp: Date.now() });
        saveChatHistory(history);
        return;
      }

      aiBubble.innerHTML = '<span style="color:#00f2fe;">⚡ Thinking & Connecting to Ecosystem...</span>';
      chatBody.appendChild(aiBubble);
      chatBody.scrollTop = chatBody.scrollHeight;

      logUniversalMemory('User prompt in AI Chatbot on ' + currentAppTitle + ': "' + q + '"', currentAppTitle, 'Chat Query');

      var reply = '';
      try {
        var controller = new AbortController();
        var timeoutId = setTimeout(function() { controller.abort(); }, 3500);

        var res = await fetch('https://bhavyas-ai-hub.vercel.app/api/assistant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({ 
            message: q,
            userName: detectedName || 'User',
            currentApp: currentAppTitle,
            currentUrl: window.location.href
          })
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          var data = await res.json();
          reply = data.text || data.message || data.response || generateSmartFallbackReply(q, detectedName, currentAppTitle);
        } else {
          reply = generateSmartFallbackReply(q, detectedName, currentAppTitle);
        }

        if (detectedName && !reply.toLowerCase().includes(detectedName.toLowerCase()) && (q.toLowerCase().includes('name') || q.toLowerCase().includes('who am i') || q.toLowerCase().includes('hi') || q.toLowerCase().includes('hello'))) {
          reply = 'Hi ' + detectedName + '! I am Bhavya\'s Ecosystem Assistant. ' + reply;
        }
      } catch (err) {
        reply = generateSmartFallbackReply(q, detectedName, currentAppTitle);
      }

      aiBubble.innerHTML = renderMarkdownHtml(reply);
      playCyberSound('response');
      chatBody.scrollTop = chatBody.scrollHeight;

      history.push({ sender: 'ai', text: reply, timestamp: Date.now() });
      saveChatHistory(history);
      logUniversalMemory('Assistant response on ' + currentAppTitle + ': "' + reply + '"', currentAppTitle, 'Chat Response');
    }

    sendBtn.addEventListener('click', handleSendMessage);
    chatInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') handleSendMessage();
    });
  }

  // Master Hub runs clean with native UI; Ctrl+K supported via keyboard

  // Command Palette Overlay
  var paletteOverlay = document.createElement('div');
  paletteOverlay.id = 'bhavya-omni-overlay';
  paletteOverlay.innerHTML = 
    '<div id="bhavya-omni-modal-container">' +
      '<div class="bhavya-running-light"></div>' +
      '<div id="bhavya-omni-modal">' +
        '<div class="bhavya-omni-header">' +
          '<span style="font-size: 18px; filter: drop-shadow(0 0 8px #00f2fe);">⚡</span>' +
          '<input type="text" class="bhavya-omni-search" id="bhavya-omni-search-input" placeholder="Search 18 ecosystem apps... (Esc to close)">' +
          '<span style="font-size: 11px; background: rgba(0,242,254,0.2); color: #00f2fe; border: 1px solid rgba(0,242,254,0.4); padding: 3px 8px; border-radius: 6px; font-weight: bold;">Ecosystem</span>' +
        '</div>' +
        '<div class="bhavya-omni-quick-bar">' +
          '<button class="bhavya-omni-quick-chip" id="bhavya-quick-handoff" title="Send current code or selection to another app">⚡ Handoff to App</button>' +
          '<button class="bhavya-omni-quick-chip" id="bhavya-quick-synapse" title="View or update active project dossier">🧠 Project Dossier</button>' +
          '<button class="bhavya-omni-quick-chip" id="bhavya-quick-governor" title="Check Token Governor quota">📊 Token Governor</button>' +
          '<button class="bhavya-omni-quick-chip" id="bhavya-quick-clearcache" title="Clear local caches">🧹 Clear Cache</button>' +
        '</div>' +
        '<div id="bhavya-tab-content-apps" class="bhavya-omni-list"></div>' +
        '<div class="bhavya-omni-footer">' +
          '<div><span>Navigate: <span class="bhavya-omni-kbd">↑</span> <span class="bhavya-omni-kbd">↓</span> <span class="bhavya-omni-kbd">↵</span></span></div>' +
          '<div><span>Switch Apps • <span class="bhavya-omni-kbd">Ctrl</span> + <span class="bhavya-omni-kbd">K</span></span></div>' +
        '</div>' +
      '</div>' +
    '</div>';
  document.body.appendChild(paletteOverlay);

  var paletteSearchInput = document.getElementById('bhavya-omni-search-input');
  var paletteAppsList = document.getElementById('bhavya-tab-content-apps');
  var filteredApps = [...ECOSYSTEM_APPS];
  var selectedIndex = 0;

  function isAppCurrent(app) {
    var cur = (currentAppTitle || '').toLowerCase();
    var aName = (app.name || '').toLowerCase();
    var curUrl = (window.location.href || '').toLowerCase();
    var aUrl = (app.url || '').toLowerCase().replace('https://', '');
    return cur.includes(aName) || aName.includes(cur) || curUrl.includes(aUrl);
  }

  function renderPaletteApps() {
    paletteAppsList.innerHTML = '';
    if (filteredApps.length === 0) {
      paletteAppsList.innerHTML = '<div style="text-align: center; padding: 20px; color: rgba(255,255,255,0.4); font-size: 13px;">No applications found matching your query.</div>';
      return;
    }

    filteredApps.forEach(function(app, idx) {
      var isCurrent = isAppCurrent(app);
      var item = document.createElement('a');
      item.className = 'bhavya-omni-item ' + (idx === selectedIndex ? 'selected ' : '') + (isCurrent ? 'bhavya-current-app-row' : '');
      item.href = app.url;
      item.target = '_blank';
      item.onclick = function() { playCyberSound('click'); };
      item.innerHTML = 
        '<div class="bhavya-omni-icon">' + app.icon + '</div>' +
        '<div class="bhavya-omni-info">' +
          '<div class="bhavya-omni-name">' +
            escapeHTML(app.name) +
            (isCurrent ? '<span style="font-size: 10px; background: rgba(34,197,94,0.2); border: 1px solid rgba(34,197,94,0.6); color: #4ade80; padding: 1px 6px; border-radius: 4px; font-weight: bold;">● Active App</span>' : '') +
            '<span style="font-size: 10px; opacity: 0.6; border: 1px solid rgba(0,242,254,0.3); padding: 1px 5px; border-radius: 4px; color:#00f2fe;">' + escapeHTML(app.category) + '</span>' +
          '</div>' +
          '<div class="bhavya-omni-desc">' + escapeHTML(app.desc) + '</div>' +
        '</div>' +
        '<span style="color: rgba(0, 242, 254, 0.6); font-size: 13px; font-weight: bold;">↗</span>';
      paletteAppsList.appendChild(item);
    });
  }

  function openPalette() {
    playCyberSound('open');
    paletteOverlay.classList.add('active');
    paletteSearchInput.value = '';
    filteredApps = [...ECOSYSTEM_APPS];

    var curIdx = filteredApps.findIndex(function(a) { return isAppCurrent(a); });
    selectedIndex = curIdx >= 0 ? curIdx : 0;
    renderPaletteApps();
    setTimeout(function() { 
      if (paletteSearchInput) paletteSearchInput.focus();
      var sel = paletteAppsList.querySelector('.bhavya-omni-item.selected');
      if (sel) sel.scrollIntoView({ block: 'nearest' });
    }, 50);
  }

  function closePalette() {
    playCyberSound('click');
    paletteOverlay.classList.remove('active');
  }

  function togglePalette() {
    if (paletteOverlay.classList.contains('active')) closePalette();
    else openPalette();
  }

  paletteOverlay.onclick = function(e) {
    if (e.target === paletteOverlay) closePalette();
  };

  window.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      togglePalette();
    }
    if (e.key === 'Escape') {
      if (paletteOverlay.classList.contains('active')) closePalette();
      var chatWin = document.getElementById('bhavya-ai-chatbot-window');
      if (chatWin && chatWin.classList.contains('active')) chatWin.classList.remove('active');
    }
    if (paletteOverlay.classList.contains('active')) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        playCyberSound('click');
        selectedIndex = (selectedIndex + 1) % filteredApps.length;
        renderPaletteApps();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        playCyberSound('click');
        selectedIndex = (selectedIndex - 1 + filteredApps.length) % filteredApps.length;
        renderPaletteApps();
      } else if (e.key === 'Enter') {
        if (filteredApps[selectedIndex]) {
          playCyberSound('click');
          window.open(filteredApps[selectedIndex].url, '_blank');
          closePalette();
        }
      }
    }
  });

  paletteSearchInput.addEventListener('input', function() {
    var q = paletteSearchInput.value.toLowerCase().trim();
    filteredApps = ECOSYSTEM_APPS.filter(function(a) {
      return a.name.toLowerCase().includes(q) ||
        a.desc.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q);
    });
    selectedIndex = 0;
    renderPaletteApps();
  });

  // Quick Action Buttons
  var handoffChip = document.getElementById('bhavya-quick-handoff');
  if (handoffChip) {
    handoffChip.onclick = function() {
      playCyberSound('click');
      var ctx = BhavyaContinuity.grabCurrentContext();
      paletteSearchInput.value = '';
      paletteSearchInput.placeholder = 'Select target app to handoff: "' + ctx.title.slice(0, 28) + '..."';
      paletteAppsList.innerHTML = '';
      filteredApps = [...ECOSYSTEM_APPS];
      selectedIndex = 0;
      filteredApps.forEach(function(app, idx) {
        var item = document.createElement('a');
        item.className = 'bhavya-omni-item ' + (idx === selectedIndex ? 'selected ' : '');
        item.href = 'javascript:void(0)';
        item.innerHTML = 
          '<div class="bhavya-omni-icon">' + app.icon + '</div>' +
          '<div class="bhavya-omni-info">' +
            '<div class="bhavya-omni-name">⚡ Send to ' + escapeHTML(app.name) + '</div>' +
            '<div class="bhavya-omni-desc">' + escapeHTML(ctx.title) + '</div>' +
          '</div>' +
          '<span style="color: #00f2fe; font-size: 11px; font-weight: bold;">[Send ↗]</span>';
        item.onclick = function() {
          playCyberSound('open');
          BhavyaContinuity.sendTo(app.url, ctx);
          closePalette();
        };
        paletteAppsList.appendChild(item);
      });
    };
  }

  var synapseChip = document.getElementById('bhavya-quick-synapse');
  if (synapseChip) {
    synapseChip.onclick = function() {
      playCyberSound('click');
      var currentDossier = BhavyaSynapse.getProjectContext();
      var newGoal = prompt('🧠 Bhavya Synapse · Active Project Dossier\n\nCurrent Project: ' + currentDossier.activeProject + '\nCurrent Goal: ' + currentDossier.goal + '\n\nEnter updated focus/goal for the ecosystem (or press OK to keep):', currentDossier.goal);
      if (newGoal && newGoal.trim()) {
        BhavyaSynapse.setProject(currentDossier.activeProject, newGoal.trim(), currentDossier.techStack);
        BhavyaFailover.showToast('Synapse Brain updated: "' + newGoal.trim().slice(0, 30) + '..." synced across all apps.');
      }
    };
  }

  var govChip = document.getElementById('bhavya-quick-governor');
  if (govChip) {
    govChip.onclick = function() {
      playCyberSound('click');
      var stats = BhavyaTokenGovernor.getStats();
      BhavyaFailover.showToast('📊 Token Governor: ' + (stats.isUnlimited ? 'Unlimited Key Connected' : (stats.remaining.toLocaleString() + ' tokens available today (' + Math.round(stats.percent) + '% remaining)')));
    };
  }

  var clearChip = document.getElementById('bhavya-quick-clearcache');
  if (clearChip) {
    clearChip.onclick = function() {
      playCyberSound('click');
      try {
        localStorage.removeItem('bhavya_ecosystem_handoff_payload');
        BhavyaFailover.showToast('Ecosystem local storage cache refreshed.');
      } catch(e) {}
    };
  }

  // Global Exposure & Auto-Init
  window.BhavyaContinuity = BhavyaContinuity;
  window.BhavyaSynapse = BhavyaSynapse;
  window.BhavyaFailover = BhavyaFailover;
  try { BhavyaContinuity.init(); } catch(e) {}

  renderPaletteApps();
})();
