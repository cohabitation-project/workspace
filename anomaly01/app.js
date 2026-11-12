// app.js — Anomaly01 Launcher application logic

(function () {
  'use strict';

  // ── State ──────────────────────────────────────────────────────────
  let stats = null;
  let apps = [];
  let adinStatus = null;
  let ambassadorStatus = null;
  let storageBreakdown = null;
  let chatHistory = [];
  let refreshTimer = null;

  // ── Helpers ────────────────────────────────────────────────────────

  function $(sel) { return document.querySelector(sel); }
  function $$(sel) { return document.querySelectorAll(sel); }

  function formatMB(mb) {
    if (mb >= 1000) return (mb / 1000).toFixed(1) + ' GB';
    return mb + ' MB';
  }

  function pct(used, total) {
    return Math.round((used / total) * 100);
  }

  function timeNow() {
    const d = new Date();
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function showToast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('visible');
    setTimeout(() => t.classList.remove('visible'), 2000);
  }

  // ── Status Bar ─────────────────────────────────────────────────────

  function updateStatusBar() {
    $('#status-time').textContent = timeNow();
    if (stats) {
      const bIcon = stats.battery.charging ? '\u26A1' : '\u{1F50B}';
      $('#status-battery').textContent = bIcon + ' ' + stats.battery.level + '%';
    }
    $('#status-network').textContent = '\u{1F4F6} LTE';
  }

  // ── Device Dashboard ───────────────────────────────────────────────

  function updateDashboard() {
    if (!stats) return;
    const r = stats.ram;
    const s = stats.storage;
    const b = stats.battery;
    const c = stats.cpu;

    setGauge('ram', pct(r.used, r.total), formatMB(r.used) + ' / ' + formatMB(r.total));
    setGauge('storage', pct(s.used, s.total), formatMB(s.used) + ' / ' + formatMB(s.total));
    setGauge('cpu', c.usage, c.usage + '% (' + c.cores + ' cores)');
    setGauge('battery', b.level, b.level + '%' + (b.charging ? ' charging' : '') + ' \u00B7 ' + b.temperature + '\u00B0C');
  }

  function setGauge(id, percent, label) {
    const bar = $('#gauge-' + id + ' .gauge-fill');
    const lbl = $('#gauge-' + id + ' .gauge-label');
    if (bar) bar.style.width = percent + '%';
    if (lbl) lbl.textContent = label;

    // Color coding
    if (bar) {
      bar.classList.remove('warn', 'crit');
      if (percent > 80) bar.classList.add('crit');
      else if (percent > 60) bar.classList.add('warn');
    }
  }

  // ── App Grid ───────────────────────────────────────────────────────

  function renderAppGrid() {
    const grid = $('#app-grid');
    grid.innerHTML = '';
    apps.forEach(app => {
      const el = document.createElement('button');
      el.className = 'app-icon';
      el.setAttribute('aria-label', 'Open ' + app.name);
      el.innerHTML = '<span class="app-icon-emoji">' + app.icon + '</span>' +
                     '<span class="app-icon-name">' + app.name + '</span>';
      el.addEventListener('click', () => {
        Anomaly.launchApp(app.package);
        showToast('Opening ' + app.name + '...');
      });
      grid.appendChild(el);
    });
  }

  // ── Resource Allocation ────────────────────────────────────────────

  function initResourceSliders() {
    bindSlider('slider-cpu', 'slider-cpu-val', v => v + '%');
    bindSlider('slider-ram', 'slider-ram-val', v => v + ' MB');
    bindSlider('slider-storage', 'slider-storage-val', v => v + ' GB');

    // Save prefs on any change
    $$('#resource-panel input').forEach(input => {
      input.addEventListener('change', saveResourcePrefs);
    });

    // Show honest status for ADIN and inference toggles
    initToggleNotices();
  }

  function bindSlider(sliderId, labelId, fmt) {
    const s = $('#' + sliderId);
    const l = $('#' + labelId);
    if (!s || !l) return;
    const update = () => { l.textContent = fmt(s.value); };
    s.addEventListener('input', update);
    update();
  }

  function saveResourcePrefs() {
    const prefs = {
      maxCpu: Number($('#slider-cpu').value),
      maxRam: Number($('#slider-ram').value),
      maxStorage: Number($('#slider-storage').value),
      hoursStart: $('#hours-start').value,
      hoursEnd: $('#hours-end').value,
      contributeToAdin: $('#toggle-adin').checked,
      allowInference: $('#toggle-inference').checked,
    };
    Anomaly.setResourcePrefs(prefs);
    showToast('Preferences saved');
  }

  function initToggleNotices() {
    const adinToggle = $('#toggle-adin');
    const inferenceToggle = $('#toggle-inference');
    const adinNotice = $('#adin-toggle-notice');
    const inferenceNotice = $('#inference-toggle-notice');

    if (adinToggle && adinNotice) {
      adinToggle.addEventListener('change', () => {
        if (adinToggle.checked) {
          adinNotice.textContent = 'ADIN is not yet available. This preference will be applied when ADIN connectivity is enabled.';
          adinNotice.classList.remove('hidden');
        } else {
          adinNotice.classList.add('hidden');
        }
      });
    }

    if (inferenceToggle && inferenceNotice) {
      inferenceToggle.addEventListener('change', () => {
        if (inferenceToggle.checked) {
          inferenceNotice.textContent = 'Inference tasks are not yet available on this device.';
          inferenceNotice.classList.remove('hidden');
        } else {
          inferenceNotice.classList.add('hidden');
        }
      });
      // Show notice on load if already checked
      if (inferenceToggle.checked) {
        inferenceNotice.textContent = 'Inference tasks are not yet available on this device.';
        inferenceNotice.classList.remove('hidden');
      }
    }
  }

  // ── ADIN Status ────────────────────────────────────────────────────

  function updateAdinPanel() {
    if (!adinStatus) return;
    const dot = $('#adin-dot');
    const lbl = $('#adin-connection');
    // ADIN has no backend — always show as not available
    dot.className = 'dot disconnected';
    lbl.textContent = 'Not available (UI only)';
    $('#adin-node-id').textContent = '\u2014';
    $('#adin-tasks').textContent = '0';
    $('#adin-current').textContent = 'None';
  }

  // ── Ambassador Chat ────────────────────────────────────────────────

  function updateAmbassadorMeta() {
    if (!ambassadorStatus) return;
    const dot = $('#amb-dot');
    // Ambassador chat uses canned responses — label honestly
    dot.className = 'dot disconnected';
    $('#amb-status-text').textContent = 'Canned responses (not connected to LLM)';
    $('#amb-last-reply').textContent = '';
  }

  function renderChat() {
    const container = $('#chat-messages');
    container.innerHTML = '';
    chatHistory.forEach(msg => {
      const div = document.createElement('div');
      div.className = 'chat-bubble ' + msg.role;
      div.textContent = msg.text;
      container.appendChild(div);
    });
    container.scrollTop = container.scrollHeight;
  }

  function initChat() {
    const input = $('#chat-input');
    const btn = $('#chat-send');

    async function send() {
      const text = input.value.trim();
      if (!text) return;
      input.value = '';

      chatHistory.push({ role: 'user', text: text });
      chatHistory.push({ role: 'thinking', text: 'Ambassador is thinking...' });
      renderChat();

      // Simulate delay
      await new Promise(r => setTimeout(r, 1000 + Math.random() * 500));

      // Remove thinking indicator
      chatHistory.pop();
      const resp = await Anomaly.sendToAmbassador(text);
      chatHistory.push({ role: 'assistant', text: '[Canned response] ' + resp.reply });
      renderChat();
    }

    btn.addEventListener('click', send);
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    });
  }

  // ── Storage Manager ────────────────────────────────────────────────

  function updateStoragePanel() {
    if (!storageBreakdown) return;

    const bar = $('#storage-bar');
    const legend = $('#storage-legend');
    bar.innerHTML = '';
    legend.innerHTML = '';

    if (storageBreakdown.detailed === false) {
      // No per-category data — show only Used and Available segments
      const total = (storageBreakdown.used || 0) + (storageBreakdown.available || 0);
      if (total <= 0) return;

      const categories = [
        { key: 'used',      label: 'Used',      color: '#ff79c6' },
        { key: 'available', label: 'Available', color: '#44475a' },
      ];

      categories.forEach(cat => {
        const val = storageBreakdown[cat.key] || 0;
        const p = (val / total) * 100;

        const seg = document.createElement('div');
        seg.className = 'storage-segment';
        seg.style.width = p + '%';
        seg.style.background = cat.color;
        bar.appendChild(seg);

        const li = document.createElement('div');
        li.className = 'storage-legend-item';
        li.innerHTML = '<span class="legend-dot" style="background:' + cat.color + '"></span>' +
                       cat.label + ' <span class="legend-size">' + formatMB(val) + '</span>';
        legend.appendChild(li);
      });

      // Show note about missing categories
      const note = document.createElement('div');
      note.style.cssText = 'font-size:0.75rem;color:#888;margin-top:8px;';
      note.textContent = storageBreakdown.note || 'Per-category breakdown requires storage access permission.';
      legend.appendChild(note);
    } else {
      // Detailed mode — show actual per-category data if we ever get it
      const total = Object.values(storageBreakdown).reduce((a, b) => (typeof b === 'number') ? a + b : a, 0);
      const categories = [
        { key: 'apps',      label: 'Apps',      color: '#50fa7b' },
        { key: 'photos',    label: 'Photos',    color: '#8be9fd' },
        { key: 'videos',    label: 'Videos',    color: '#ffb86c' },
        { key: 'system',    label: 'System',    color: '#ff79c6' },
        { key: 'available', label: 'Available', color: '#44475a' },
      ];

      categories.forEach(cat => {
        const val = storageBreakdown[cat.key] || 0;
        const p = (val / total) * 100;

        const seg = document.createElement('div');
        seg.className = 'storage-segment';
        seg.style.width = p + '%';
        seg.style.background = cat.color;
        bar.appendChild(seg);

        const li = document.createElement('div');
        li.className = 'storage-legend-item';
        li.innerHTML = '<span class="legend-dot" style="background:' + cat.color + '"></span>' +
                       cat.label + ' <span class="legend-size">' + formatMB(val) + '</span>';
        legend.appendChild(li);
      });
    }
  }

  async function handleCleanup() {
    // Check if we have actual cleanup capability
    if (storageBreakdown && storageBreakdown.detailed === false) {
      const panel = $('#cleanup-suggestions');
      panel.innerHTML = '';
      panel.classList.remove('hidden');
      const msg = document.createElement('div');
      msg.style.cssText = 'padding:16px 0;color:#888;font-size:0.85rem;';
      msg.textContent = 'Storage cleanup requires additional permissions. Enable in Settings.';
      panel.appendChild(msg);
      return;
    }

    const suggestions = await Anomaly.getCleanupSuggestions();
    const panel = $('#cleanup-suggestions');
    panel.innerHTML = '';
    panel.classList.remove('hidden');

    suggestions.forEach(s => {
      const row = document.createElement('label');
      row.className = 'cleanup-row';
      row.innerHTML = '<input type="checkbox" value="' + s.id + '" checked>' +
                      '<div class="cleanup-info">' +
                        '<strong>' + s.label + '</strong>' +
                        '<small>' + s.description + '</small>' +
                      '</div>' +
                      '<span class="cleanup-size">' + formatMB(s.size) + '</span>';
      panel.appendChild(row);
    });

    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'btn btn-accent';
    confirmBtn.textContent = 'Confirm Cleanup';
    confirmBtn.addEventListener('click', async () => {
      const checked = [...panel.querySelectorAll('input:checked')].map(i => i.value);
      if (checked.length === 0) { showToast('Nothing selected'); return; }
      const result = await Anomaly.performCleanup(checked);
      if (result.simulated) {
        showToast('Simulated \u2014 not connected to a real device');
      } else {
        showToast('Freed ' + formatMB(result.freedMB));
      }
      panel.classList.add('hidden');
      // Refresh storage
      storageBreakdown = await Anomaly.getStorageBreakdown();
      updateStoragePanel();
    });
    panel.appendChild(confirmBtn);
  }

  // ── Settings Panel ─────────────────────────────────────────────────

  function initSettings() {
    const settingsBtn = $('#btn-settings');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => {
        $$('.nav-tab').forEach(t => t.classList.remove('active'));
        $$('.section').forEach(s => s.classList.remove('active'));
        const settingsSection = $('#sec-settings');
        if (settingsSection) settingsSection.classList.add('active');
      });
    }

    const exitBtn = $('#btn-exit-app');
    if (exitBtn) {
      exitBtn.addEventListener('click', () => {
        if (typeof window.Anomaly !== 'undefined' && typeof window.Anomaly.exitApp === 'function') {
          window.Anomaly.exitApp();
        } else {
          showToast('Exit is only available on Android');
        }
      });
    }
  }

  // ── Section Navigation ─────────────────────────────────────────────

  function initNav() {
    $$('.nav-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        $$('.nav-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const target = tab.dataset.section;
        $$('.section').forEach(s => {
          s.classList.toggle('active', s.id === target);
        });
      });
    });
  }

  // ── Data Refresh ───────────────────────────────────────────────────

  async function refreshAll() {
    try {
      stats = await Anomaly.getDeviceStats();
      adinStatus = await Anomaly.getAdinStatus();
      ambassadorStatus = await Anomaly.getAmbassadorStatus();
      storageBreakdown = await Anomaly.getStorageBreakdown();

      updateStatusBar();
      updateDashboard();
      updateAdinPanel();
      updateAmbassadorMeta();
      updateStoragePanel();
    } catch (e) {
      console.error('Refresh error:', e);
    }
  }

  // ── Init ───────────────────────────────────────────────────────────

  async function init() {
    // Load apps once
    apps = await Anomaly.getInstalledApps();
    renderAppGrid();

    // First data load
    await refreshAll();

    // Wire up UI
    initNav();
    initResourceSliders();
    initChat();
    initSettings();
    $('#btn-cleanup').addEventListener('click', handleCleanup);

    // Periodic refresh
    refreshTimer = setInterval(refreshAll, 5000);

    // Update clock every second
    setInterval(updateStatusBar, 1000);
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
