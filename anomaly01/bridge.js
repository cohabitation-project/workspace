// bridge.js — Anomaly01 bridge abstraction layer
// On Android, window.Anomaly is injected by the native WebView (AnomalyBridge.java).
// In a browser, this file provides a simulated fallback for design iteration.

(function () {
  'use strict';

  // Detect the native Android bridge
  var isAndroid = (typeof window.Anomaly !== 'undefined') &&
                  (typeof window.Anomaly.getDeviceStats === 'function');

  // ── Simulated data (browser fallback) ──────────────────────────

  function simulatedStats() {
    var baseRam = 2800;
    var ramJitter = Math.floor(Math.random() * 400) - 200;
    var cpuJitter = Math.floor(Math.random() * 15) - 7;
    var batteryBase = 72;
    return {
      ram: {
        total: 4096,
        used: Math.max(1200, Math.min(3800, baseRam + ramJitter)),
        available: 4096 - Math.max(1200, Math.min(3800, baseRam + ramJitter))
      },
      storage: { total: 128000, used: 87000, free: 41000 },
      battery: {
        level: Math.max(5, Math.min(100, batteryBase + Math.floor(Math.random() * 6) - 3)),
        charging: true,
        temperature: 31 + Math.floor(Math.random() * 4)
      },
      cpu: {
        cores: 8,
        usage: Math.max(3, Math.min(95, 23 + cpuJitter))
      }
    };
  }

  function simulatedApps() {
    return [
      { package: 'com.whatsapp', name: 'WhatsApp', icon: '\u{1F4AC}', iconType: 'emoji' },
      { package: 'com.google.android.youtube', name: 'YouTube', icon: '\u25B6\uFE0F', iconType: 'emoji' },
      { package: 'com.instagram.android', name: 'Instagram', icon: '\u{1F4F7}', iconType: 'emoji' },
      { package: 'com.spotify.music', name: 'Spotify', icon: '\u{1F3B5}', iconType: 'emoji' },
      { package: 'com.google.android.gm', name: 'Gmail', icon: '\u2709\uFE0F', iconType: 'emoji' },
      { package: 'com.google.android.apps.maps', name: 'Maps', icon: '\u{1F5FA}\uFE0F', iconType: 'emoji' },
      { package: 'com.android.chrome', name: 'Chrome', icon: '\u{1F310}', iconType: 'emoji' },
      { package: 'com.twitter.android', name: 'X', icon: '\u{1F426}', iconType: 'emoji' },
      { package: 'com.google.android.apps.photos', name: 'Photos', icon: '\u{1F5BC}\uFE0F', iconType: 'emoji' },
      { package: 'org.telegram.messenger', name: 'Telegram', icon: '\u2708\uFE0F', iconType: 'emoji' },
      { package: 'com.netflix.mediaclient', name: 'Netflix', icon: '\u{1F3AC}', iconType: 'emoji' },
      { package: 'com.android.vending', name: 'Play Store', icon: '\u{1F6CD}\uFE0F', iconType: 'emoji' },
      { package: 'com.google.android.calendar', name: 'Calendar', icon: '\u{1F4C5}', iconType: 'emoji' },
      { package: 'com.android.settings', name: 'Settings', icon: '\u2699\uFE0F', iconType: 'emoji' },
      { package: 'com.google.android.apps.docs', name: 'Docs', icon: '\u{1F4C4}', iconType: 'emoji' },
      { package: 'com.slack', name: 'Slack', icon: '\u{1F4E2}', iconType: 'emoji' },
    ];
  }

  function simulatedAdinStatus() {
    return { connected: false, nodeId: null, tasksCompleted: 0, currentTask: null, uptime: 0 };
  }

  function simulatedAmbassadorStatus() {
    return { running: false, model: 'none', lastReply: 'N/A', memoryUsage: 0, installed: false };
  }

  function simulatedStorageBreakdown() {
    // No per-category data in simulation either — be honest
    return {
      used: 87000,
      available: 41000,
      total: 128000,
      detailed: false,
      note: 'Per-category breakdown requires storage access permission'
    };
  }

  var _ambassadorResponses = [
    "I can help with that. What would you like to know?",
    "Based on your device stats, everything looks healthy.",
    "Your battery is charging and should be full in about an hour.",
    "I'm running locally on your device using the Qwen2.5-0.5B model.",
    "Storage is at about 68% capacity. I can suggest some cleanup options if you'd like.",
    "The ADIN network contribution is currently paused. Toggle it on in Resource Allocation to start sharing idle compute.",
    "I don't have internet access right now, but I can answer from what I know locally.",
    "That's a great question. Let me think about it... I'd recommend checking Settings for more details.",
  ];
  var _responseIndex = 0;

  // ── Unified API ────────────────────────────────────────────────

  window.AnomalyAPI = {

    isNative: isAndroid,

    async getDeviceStats() {
      if (isAndroid) {
        try { return JSON.parse(window.Anomaly.getDeviceStats()); }
        catch (e) { console.error('Bridge getDeviceStats error:', e); }
      }
      return simulatedStats();
    },

    async getInstalledApps() {
      if (isAndroid) {
        try { return JSON.parse(window.Anomaly.getInstalledApps()); }
        catch (e) { console.error('Bridge getInstalledApps error:', e); }
      }
      return simulatedApps();
    },

    async launchApp(packageName) {
      if (isAndroid) {
        window.Anomaly.launchApp(packageName);
        return { success: true };
      }
      console.log('Simulated launch:', packageName);
      return { success: true };
    },

    async getAdinStatus() {
      // ADIN status is not yet implemented natively; always simulated
      return simulatedAdinStatus();
    },

    async getAmbassadorStatus() {
      if (isAndroid) {
        try { return JSON.parse(window.Anomaly.getAmbassadorStatus()); }
        catch (e) { console.error('Bridge getAmbassadorStatus error:', e); }
      }
      return simulatedAmbassadorStatus();
    },

    async setResourcePrefs(prefs) {
      if (isAndroid) {
        try { window.Anomaly.savePreferences(JSON.stringify(prefs)); }
        catch (e) { console.error('Bridge savePreferences error:', e); }
        return { success: true };
      }
      console.log('Simulated set prefs:', prefs);
      return { success: true };
    },

    async getStorageBreakdown() {
      if (isAndroid) {
        try { return JSON.parse(window.Anomaly.getStorageBreakdown()); }
        catch (e) { console.error('Bridge getStorageBreakdown error:', e); }
      }
      return simulatedStorageBreakdown();
    },

    async getNetworkType() {
      if (isAndroid) {
        try { return window.Anomaly.getNetworkType(); }
        catch (e) { return 'Unavailable'; }
      }
      return 'Unavailable'; // browser simulation cannot detect network
    },

    async sendToAmbassador(message) {
      // Ambassador chat is simulated in all environments for now
      console.log('Ambassador received:', message);
      var resp = _ambassadorResponses[_responseIndex % _ambassadorResponses.length];
      _responseIndex++;
      return { reply: resp };
    },

    async getCleanupSuggestions() {
      // Cleanup is not available without storage permission
      return [];
    },

    async performCleanup(ids) {
      // Simulated cleanup — never report as successful
      console.log('Cleanup requested (simulated):', ids);
      return { success: false, freedMB: 0, simulated: true };
    }
  };

  // For backward compatibility, also expose as window.Anomaly on browser
  // (native Android already has window.Anomaly from the Java bridge)
  if (!isAndroid) {
    // Keep the old window.Anomaly around for any direct callers
    window.Anomaly = window.AnomalyAPI;
  }

})();
