// app.js — Anomaly01 Launcher application logic
// Uses window.AnomalyAPI (from bridge.js) which abstracts native vs simulated data.

(function () {
  'use strict';

  // ── State ──────────────────────────────────────────────────────────
  var stats = null;
  var apps = [];
  var adinStatus = null;
  var ambassadorStatus = null;
  var storageBreakdown = null;
  var chatHistory = [];
  var refreshTimer = null;

  // Use the unified API from bridge.js
  var API = window.AnomalyAPI || window.Anomaly;

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
    var d = new Date();
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function showToast(msg) {
    var t = $('#toast');
    t.textContent = msg;
    t.classList.add('visible');
    setTimeout(function () { t.classList.remove('visible'); }, 2000);
  }

  // ── Status Bar ─────────────────────────────────────────────────────

  function updateStatusBar() {
    $('#status-time').textContent = timeNow();
    if (stats) {
      var bIcon = stats.battery.charging ? '\u26A1' : '\u{1F50B}';
      $('#status-battery').textContent = bIcon + ' ' + stats.battery.level + '%';
    }
    $('#status-network').textContent = '\u{1F4F6} LTE';
  }

  // ── Device Dashboard ───────────────────────────────────────────────

  function updateDashboard() {
    if (!stats) return;
    var r = stats.ram;
    var s = stats.storage;
    var b = stats.battery;
    var c = stats.cpu;

    setGauge('ram', pct(r.used, r.total), formatMB(r.used) + ' / ' + formatMB(r.total));
    setGauge('storage', pct(s.used, s.total), formatMB(s.used) + ' / ' + formatMB(s.total));
    setGauge('cpu', c.usage, c.usage + '% (' + c.cores + ' cores)');
    setGauge('battery', b.level, b.level + '%' + (b.charging ? ' charging' : '') + ' \u00B7 ' + b.temperature + '\u00B0C');
  }

  function setGauge(id, percent, label) {
    var bar = $('#gauge-' + id + ' .gauge-fill');
    var lbl = $('#gauge-' + id + ' .gauge-label');
    if (bar) bar.style.width = percent + '%';
    if (lbl) lbl.textContent = label;

    if (bar) {
      bar.classList.remove('warn', 'crit');
      if (percent > 80) bar.classList.add('crit');
      else if (percent > 60) bar.classList.add('warn');
    }
  }

  // ── App Grid ───────────────────────────────────────────────────────

  function renderAppGrid() {
    var grid = $('#app-grid');
    grid.innerHTML = '';
    apps.forEach(function (app) {
      var el = document.createElement('button');
      el.className = 'app-icon';
      el.setAttribute('aria-label', 'Open ' + app.name);

      // Handle both base64 icons (from Android) and emoji (simulation)
      var iconHtml;
      if (app.iconType === 'base64' && app.icon && app.icon.startsWith('data:')) {
        iconHtml = '<img class="app-icon-img" src="' + app.icon +
                   '" alt="" style="width:48px;height:48px;border-radius:12px;">';
      } else {
        iconHtml = '<span class="app-icon-emoji">' + (app.icon || '\u{1F4E6}') + '</span>';
      }

      el.innerHTML = iconHtml +
                     '<span class="app-icon-name">' + app.name + '</span>';
      el.addEventListener('click', function () {
        API.launchApp(app.package);
        showToast('Opening ' + app.name + '...');
      });
      grid.appendChild(el);
    });
  }

  // ── Resource Allocation ────────────────────────────────────────────

  function initResourceSliders() {
    bindSlider('slider-cpu', 'slider-cpu-val', function (v) { return v + '%'; });
    bindSlider('slider-ram', 'slider-ram-val', function (v) { return v + ' MB'; });
    bindSlider('slider-storage', 'slider-storage-val', function (v) { return v + ' GB'; });

    $$('#resource-panel input').forEach(function (input) {
      input.addEventListener('change', saveResourcePrefs);
    });

    // Show honest status for ADIN and inference toggles
    initToggleNotices();
  }

  function bindSlider(sliderId, labelId, fmt) {
    var s = $('#' + sliderId);
    var l = $('#' + labelId);
    if (!s || !l) return;
    var update = function () { l.textContent = fmt(s.value); };
    s.addEventListener('input', update);
    update();
  }

  function saveResourcePrefs() {
    var prefs = {
      maxCpu: Number($('#slider-cpu').value),
      maxRam: Number($('#slider-ram').value),
      maxStorage: Number($('#slider-storage').value),
      hoursStart: $('#hours-start').value,
      hoursEnd: $('#hours-end').value,
      contributeToAdin: $('#toggle-adin').checked,
      allowInference: $('#toggle-inference').checked,
    };
    API.setResourcePrefs(prefs);
    showToast('Preferences saved');
  }

  function initToggleNotices() {
    var adinToggle = $('#toggle-adin');
    var inferenceToggle = $('#toggle-inference');
    var adinNotice = $('#adin-toggle-notice');
    var inferenceNotice = $('#inference-toggle-notice');

    if (adinToggle && adinNotice) {
      adinToggle.addEventListener('change', function () {
        if (adinToggle.checked) {
          adinNotice.textContent = 'ADIN is not yet available. This preference will be applied when ADIN connectivity is enabled.';
          adinNotice.classList.remove('hidden');
        } else {
          adinNotice.classList.add('hidden');
        }
      });
    }

    if (inferenceToggle && inferenceNotice) {
      inferenceToggle.addEventListener('change', function () {
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
    var dot = $('#adin-dot');
    var lbl = $('#adin-connection');
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
    var dot = $('#amb-dot');
    // Ambassador chat uses canned responses — label honestly
    dot.className = 'dot disconnected';
    $('#amb-status-text').textContent = 'Canned responses (not connected to LLM)';
    $('#amb-last-reply').textContent = '';
  }

  function renderChat() {
    var container = $('#chat-messages');
    container.innerHTML = '';
    chatHistory.forEach(function (msg) {
      var div = document.createElement('div');
      div.className = 'chat-bubble ' + msg.role;
      div.textContent = msg.text;
      container.appendChild(div);
    });
    container.scrollTop = container.scrollHeight;
  }

  function initChat() {
    var input = $('#chat-input');
    var btn = $('#chat-send');

    async function send() {
      var text = input.value.trim();
      if (!text) return;
      input.value = '';

      chatHistory.push({ role: 'user', text: text });
      chatHistory.push({ role: 'thinking', text: 'Ambassador is thinking...' });
      renderChat();

      await new Promise(function (r) { setTimeout(r, 1000 + Math.random() * 500); });

      chatHistory.pop();
      var resp = await API.sendToAmbassador(text);
      chatHistory.push({ role: 'assistant', text: '[Canned response] ' + resp.reply });
      renderChat();
    }

    btn.addEventListener('click', send);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    });
  }

  // ── Storage Manager ────────────────────────────────────────────────

  function updateStoragePanel() {
    if (!storageBreakdown) return;

    var bar = $('#storage-bar');
    var legend = $('#storage-legend');
    bar.innerHTML = '';
    legend.innerHTML = '';

    if (storageBreakdown.detailed === false) {
      // No per-category data — show only Used and Available segments
      var total = (storageBreakdown.used || 0) + (storageBreakdown.available || 0);
      if (total <= 0) return;

      var categories = [
        { key: 'used',      label: 'Used',      color: '#ff79c6' },
        { key: 'available', label: 'Available', color: '#44475a' },
      ];

      categories.forEach(function (cat) {
        var val = storageBreakdown[cat.key] || 0;
        var p = (val / total) * 100;

        var seg = document.createElement('div');
        seg.className = 'storage-segment';
        seg.style.width = p + '%';
        seg.style.background = cat.color;
        bar.appendChild(seg);

        var li = document.createElement('div');
        li.className = 'storage-legend-item';
        li.innerHTML = '<span class="legend-dot" style="background:' + cat.color + '"></span>' +
                       cat.label + ' <span class="legend-size">' + formatMB(val) + '</span>';
        legend.appendChild(li);
      });

      // Show note about missing categories
      var note = document.createElement('div');
      note.style.cssText = 'font-size:0.75rem;color:#888;margin-top:8px;';
      note.textContent = storageBreakdown.note || 'Per-category breakdown requires storage access permission.';
      legend.appendChild(note);
    } else {
      // Detailed mode — show actual per-category data if we ever get it
      var total = Object.values(storageBreakdown).reduce(function (a, b) {
        return (typeof b === 'number') ? a + b : a;
      }, 0);
      var categories = [
        { key: 'apps',      label: 'Apps',      color: '#50fa7b' },
        { key: 'photos',    label: 'Photos',    color: '#8be9fd' },
        { key: 'videos',    label: 'Videos',    color: '#ffb86c' },
        { key: 'system',    label: 'System',    color: '#ff79c6' },
        { key: 'available', label: 'Available', color: '#44475a' },
      ];

      categories.forEach(function (cat) {
        var val = storageBreakdown[cat.key] || 0;
        var p = (val / total) * 100;

        var seg = document.createElement('div');
        seg.className = 'storage-segment';
        seg.style.width = p + '%';
        seg.style.background = cat.color;
        bar.appendChild(seg);

        var li = document.createElement('div');
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
      var panel = $('#cleanup-suggestions');
      panel.innerHTML = '';
      panel.classList.remove('hidden');
      var msg = document.createElement('div');
      msg.style.cssText = 'padding:16px 0;color:#888;font-size:0.85rem;';
      msg.textContent = 'Storage cleanup requires additional permissions. Enable in Settings.';
      panel.appendChild(msg);
      return;
    }

    var suggestions = await API.getCleanupSuggestions();
    var panel = $('#cleanup-suggestions');
    panel.innerHTML = '';
    panel.classList.remove('hidden');

    suggestions.forEach(function (s) {
      var row = document.createElement('label');
      row.className = 'cleanup-row';
      row.innerHTML = '<input type="checkbox" value="' + s.id + '" checked>' +
                      '<div class="cleanup-info">' +
                        '<strong>' + s.label + '</strong>' +
                        '<small>' + s.description + '</small>' +
                      '</div>' +
                      '<span class="cleanup-size">' + formatMB(s.size) + '</span>';
      panel.appendChild(row);
    });

    var confirmBtn = document.createElement('button');
    confirmBtn.className = 'btn btn-accent';
    confirmBtn.textContent = 'Confirm Cleanup';
    confirmBtn.addEventListener('click', async function () {
      var checked = Array.from(panel.querySelectorAll('input:checked')).map(function (i) { return i.value; });
      if (checked.length === 0) { showToast('Nothing selected'); return; }
      var result = await API.performCleanup(checked);
      if (result.simulated) {
        showToast('Cleanup not available \u2014 enable storage access in Settings');
      } else {
        showToast('Freed ' + formatMB(result.freedMB));
      }
      panel.classList.add('hidden');
      storageBreakdown = await API.getStorageBreakdown();
      updateStoragePanel();
    });
    panel.appendChild(confirmBtn);
  }

  // ── Settings Panel ─────────────────────────────────────────────────

  function initSettings() {
    var settingsBtn = $('#btn-settings');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', function () {
        // Navigate to settings section
        $$('.nav-tab').forEach(function (t) { t.classList.remove('active'); });
        $$('.section').forEach(function (s) { s.classList.remove('active'); });
        var settingsSection = $('#sec-settings');
        if (settingsSection) settingsSection.classList.add('active');
      });
    }

    var exitBtn = $('#btn-exit-app');
    if (exitBtn) {
      exitBtn.addEventListener('click', function () {
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
    $$('.nav-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        $$('.nav-tab').forEach(function (t) { t.classList.remove('active'); });
        tab.classList.add('active');
        var target = tab.dataset.section;
        $$('.section').forEach(function (s) {
          s.classList.toggle('active', s.id === target);
        });
      });
    });
  }

  // ── Data Refresh ───────────────────────────────────────────────────

  // Expose refreshAll globally so native code can call it on resume
  window.refreshAll = async function () {
    try {
      stats = await API.getDeviceStats();
      adinStatus = await API.getAdinStatus();
      ambassadorStatus = await API.getAmbassadorStatus();
      storageBreakdown = await API.getStorageBreakdown();

      updateStatusBar();
      updateDashboard();
      updateAdinPanel();
      updateAmbassadorMeta();
      updateStoragePanel();
    } catch (e) {
      console.error('Refresh error:', e);
    }
  };

  // ── Init ───────────────────────────────────────────────────────────

  async function init() {
    apps = await API.getInstalledApps();
    renderAppGrid();

    await window.refreshAll();

    initNav();
    initResourceSliders();
    initChat();
    initSettings();
    $('#btn-cleanup').addEventListener('click', handleCleanup);

    refreshTimer = setInterval(window.refreshAll, 5000);
    setInterval(updateStatusBar, 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
