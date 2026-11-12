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

  // ── ADIN Status ────────────────────────────────────────────────────

  function updateAdinPanel() {
    if (!adinStatus) return;
    var dot = $('#adin-dot');
    var lbl = $('#adin-connection');
    if (adinStatus.connected) {
      dot.className = 'dot connected';
      lbl.textContent = 'Connected';
    } else {
      dot.className = 'dot disconnected';
      lbl.textContent = 'Disconnected';
    }
    $('#adin-node-id').textContent = adinStatus.nodeId || '\u2014';
    $('#adin-tasks').textContent = adinStatus.tasksCompleted;
    $('#adin-current').textContent = adinStatus.currentTask || 'None';
  }

  // ── Ambassador Chat ────────────────────────────────────────────────

  function updateAmbassadorMeta() {
    if (!ambassadorStatus) return;
    var dot = $('#amb-dot');
    if (ambassadorStatus.running) {
      dot.className = 'dot connected';
      $('#amb-status-text').textContent = 'Running \u00B7 ' + ambassadorStatus.model;
    } else {
      dot.className = 'dot disconnected';
      $('#amb-status-text').textContent = 'Offline';
    }
    $('#amb-last-reply').textContent = 'Last reply: ' + (ambassadorStatus.lastReply || 'N/A');
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
      chatHistory.push({ role: 'assistant', text: resp.reply });
      renderChat();
      if (ambassadorStatus) {
        ambassadorStatus.lastReply = 'just now';
        updateAmbassadorMeta();
      }
    }

    btn.addEventListener('click', send);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    });
  }

  // ── Storage Manager ────────────────────────────────────────────────

  function updateStoragePanel() {
    if (!storageBreakdown) return;
    var total = Object.values(storageBreakdown).reduce(function (a, b) { return a + b; }, 0);
    var categories = [
      { key: 'apps',      label: 'Apps',      color: '#50fa7b' },
      { key: 'photos',    label: 'Photos',    color: '#8be9fd' },
      { key: 'videos',    label: 'Videos',    color: '#ffb86c' },
      { key: 'system',    label: 'System',    color: '#ff79c6' },
      { key: 'available', label: 'Available', color: '#44475a' },
    ];

    var bar = $('#storage-bar');
    var legend = $('#storage-legend');
    bar.innerHTML = '';
    legend.innerHTML = '';

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

  async function handleCleanup() {
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
      showToast('Freed ' + formatMB(result.freedMB));
      panel.classList.add('hidden');
      storageBreakdown = await API.getStorageBreakdown();
      updateStoragePanel();
    });
    panel.appendChild(confirmBtn);
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
