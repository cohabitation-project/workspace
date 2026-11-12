// bridge.js — Simulated Android native bridge API
// In production, window.Anomaly is injected by the Android WebView.
// This file provides a mock for browser-based design iteration.

window.Anomaly = {

  async getDeviceStats() {
    // Add slight randomness to simulate live readings
    const baseRam = 2800;
    const ramJitter = Math.floor(Math.random() * 400) - 200;
    const cpuJitter = Math.floor(Math.random() * 15) - 7;
    const batteryBase = 72;
    return {
      ram: {
        total: 4096,
        used: Math.max(1200, Math.min(3800, baseRam + ramJitter)),
        get available() { return this.total - this.used; }
      },
      storage: {
        total: 128000,
        used: 87000,
        free: 41000
      },
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
  },

  async getInstalledApps() {
    return [
      { package: 'com.whatsapp', name: 'WhatsApp', icon: '\u{1F4AC}' },
      { package: 'com.google.android.youtube', name: 'YouTube', icon: '\u25B6\uFE0F' },
      { package: 'com.instagram.android', name: 'Instagram', icon: '\u{1F4F7}' },
      { package: 'com.spotify.music', name: 'Spotify', icon: '\u{1F3B5}' },
      { package: 'com.google.android.gm', name: 'Gmail', icon: '\u2709\uFE0F' },
      { package: 'com.google.android.apps.maps', name: 'Maps', icon: '\u{1F5FA}\uFE0F' },
      { package: 'com.android.chrome', name: 'Chrome', icon: '\u{1F310}' },
      { package: 'com.twitter.android', name: 'X', icon: '\u{1F426}' },
      { package: 'com.google.android.apps.photos', name: 'Photos', icon: '\u{1F5BC}\uFE0F' },
      { package: 'org.telegram.messenger', name: 'Telegram', icon: '\u2708\uFE0F' },
      { package: 'com.netflix.mediaclient', name: 'Netflix', icon: '\u{1F3AC}' },
      { package: 'com.android.vending', name: 'Play Store', icon: '\u{1F6CD}\uFE0F' },
      { package: 'com.google.android.calendar', name: 'Calendar', icon: '\u{1F4C5}' },
      { package: 'com.android.settings', name: 'Settings', icon: '\u2699\uFE0F' },
      { package: 'com.google.android.apps.docs', name: 'Docs', icon: '\u{1F4C4}' },
      { package: 'com.slack', name: 'Slack', icon: '\u{1F4E2}' },
    ];
  },

  async launchApp(packageName) {
    console.log('Launch:', packageName);
    return { success: true };
  },

  async getAdinStatus() {
    return {
      connected: false,
      nodeId: null,
      tasksCompleted: 0,
      currentTask: null,
      uptime: 0
    };
  },

  async getAmbassadorStatus() {
    return {
      running: true,
      model: 'Qwen2.5-0.5B',
      lastReply: '2 min ago',
      memoryUsage: 480
    };
  },

  async setResourcePrefs(prefs) {
    console.log('Set prefs:', prefs);
    return { success: true };
  },

  async getStorageBreakdown() {
    return {
      apps: 34000,
      photos: 18000,
      videos: 22000,
      system: 13000,
      available: 41000
    };
  },

  // Simulated Ambassador chat — returns canned responses
  _ambassadorResponses: [
    "I can help with that. What would you like to know?",
    "Based on your device stats, everything looks healthy.",
    "Your battery is charging and should be full in about an hour.",
    "I'm running locally on your device using the Qwen2.5-0.5B model.",
    "Storage is at about 68% capacity. I can suggest some cleanup options if you'd like.",
    "The ADIN network contribution is currently paused. Toggle it on in Resource Allocation to start sharing idle compute.",
    "I don't have internet access right now, but I can answer from what I know locally.",
    "That's a great question. Let me think about it... I'd recommend checking Settings for more details.",
  ],

  _responseIndex: 0,

  async sendToAmbassador(message) {
    console.log('Ambassador received:', message);
    const resp = this._ambassadorResponses[this._responseIndex % this._ambassadorResponses.length];
    this._responseIndex++;
    return { reply: resp };
  },

  async getCleanupSuggestions() {
    return [
      { id: 'cache', label: 'Clear app caches', size: 1200, description: '1.2 GB of cached data from 12 apps' },
      { id: 'downloads', label: 'Old downloads', size: 800, description: '800 MB of files older than 30 days' },
      { id: 'duplicates', label: 'Duplicate photos', size: 450, description: '23 duplicate photos found' },
      { id: 'largefiles', label: 'Large unused files', size: 2100, description: '5 files over 200 MB not opened in 60 days' },
    ];
  },

  async performCleanup(ids) {
    console.log('Cleanup:', ids);
    return { success: true, freedMB: ids.length * 500 };
  }
};
