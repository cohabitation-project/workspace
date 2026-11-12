# Anomaly01 — Architecture and Feasibility

**Status:** Research and prototype. No deployment.
**Date:** 2026-11-12
**Device:** Motorola Moto G 5G (2024), Android 15

---

## What Anomaly01 Is

An optional Android home environment — not a replacement for the phone's OS, but
an alternative launcher that provides:

- Device capability awareness (RAM, storage, CPU, battery, temperature)
- User-chosen resource allocation for Cohabitation services
- Access to installed Android apps through standard launcher interfaces
- Storage visibility and cleanup opportunities (with confirmation)
- Connection to ADIN for voluntary compute/inference contribution
- Ambassador interaction (when Ambassador is present on the device)

The name comes from Geoffrey's proposal (2026-11-11): "a reference to the matrix."
The Ambassador's proposed title is "The Anomaly." The app name avoids the Cohabi LLC
naming issue under council review.

## Architecture Decision: Android Launcher + WebView Hybrid

After evaluating three approaches, the recommended architecture is:

### Option chosen: Native Android launcher with embedded web UI

```
┌──────────────────────────────────────────────┐
│  Anomaly01 Android App (APK)                  │
│  ├── LauncherActivity (native Android)        │
│  │   ├── Handles HOME intent (becomes launcher)│
│  │   ├── Requests permissions (storage, etc.)  │
│  │   └── Exposes Android APIs to WebView       │
│  ├── WebView (full-screen web UI)             │
│  │   ├── HTML/CSS/JS served from app assets   │
│  │   ├── Calls native APIs via JS bridge      │
│  │   └── Responsive, works on any screen size │
│  ├── AppListProvider (native)                 │
│  │   └── Queries PackageManager for installed  │
│  │       apps and returns them to the WebView  │
│  ├── DeviceMonitor (native)                   │
│  │   └── RAM, storage, battery, temperature   │
│  ├── AdinBridge (native)                      │
│  │   └── Connects to ADIN orchestrator        │
│  │       (via Tailscale or HTTPS relay)        │
│  └── AmbassadorBridge (native)                │
│      └── Connects to local llama-server       │
│          or remote Ambassador inference       │
└──────────────────────────────────────────────┘
```

### Why this approach

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| Termux web server | No APK needed, quick to prototype | No Android APIs (camera, sensors, notifications), no launcher integration, battery drain from always-on server, ugly URL bar | Good for testing, not for users |
| WebView-only app | Android APIs via JS bridge, can be a launcher, distributable as APK | Need Android Studio, but that's a one-time setup | **Chosen** — best balance |
| Full native app | Maximum capability | Most development effort, harder to iterate on UI | Premature |

### Key design: the JS bridge

The native Android layer exposes a `window.Anomaly` object to the WebView:

```javascript
// From the web UI:
const apps = await window.Anomaly.getInstalledApps();
const stats = await window.Anomaly.getDeviceStats();
await window.Anomaly.launchApp('com.whatsapp');
await window.Anomaly.setResourcePrefs({ maxCpu: 50, maxRam: 1024 });
```

This separates concerns: the web UI handles presentation and interaction, the
native layer handles permissions and Android APIs. The web UI can be iterated
rapidly (just edit HTML/JS), while the native bridge is stable.

## Android Launcher Basics

An Android launcher is an app that responds to the `HOME` intent:

```xml
<activity android:name=".LauncherActivity">
  <intent-filter>
    <action android:name="android.intent.action.MAIN" />
    <category android:name="android.intent.category.HOME" />
    <category android:name="android.intent.category.DEFAULT" />
  </intent-filter>
</activity>
```

When the user presses Home, Android asks which launcher to use. The user can
set Anomaly01 as default or keep the original launcher and switch manually.

**The original launcher is never uninstalled.** Anomaly01 is an additional option.

## Device Capabilities (Android APIs)

| Capability | API | Permission needed |
|-----------|-----|-------------------|
| Installed apps | `PackageManager.getInstalledApplications()` | None (public info) |
| Launch apps | `startActivity(getLaunchIntentForPackage())` | None |
| RAM (total/available) | `ActivityManager.getMemoryInfo()` | None |
| Storage (total/free) | `StatFs` on internal storage path | None |
| Battery level + charging | `BatteryManager` | None (sticky broadcast) |
| CPU temperature | `HardwarePropertiesManager` | `DEVICE_POWER` (system apps only) or `/sys/class/thermal` (may require root) |
| App storage usage | `StorageStatsManager` | `MANAGE_EXTERNAL_STORAGE` or `QUERY_ALL_PACKAGES` |

**Temperature is hard on Android.** Most methods require system-app privileges.
Termux can read `/sys/class/thermal` because it runs in its own Linux environment.
A standard Android app may need to use battery temperature as a proxy.

## Storage Isolation

Android 15 uses scoped storage:
- Each app has private internal storage (`/data/data/<package>/`)
- Shared storage requires explicit permission (`MANAGE_EXTERNAL_STORAGE`)
- Anomaly01 would request this permission to show storage usage and offer cleanup
- **No partition changes, no root required**

A dedicated encrypted workspace for Ambassador's persistent data:
- Android encrypts app-private storage at rest (file-based encryption)
- Anomaly01's internal storage is automatically encrypted
- Ambassador's memory, model files, and state could live here
- Accessible to Ambassador (via the app's bridge), not to other apps

## Integration Levels (User Choice)

The user chooses what Anomaly01 does:

| Level | What it does | What it accesses |
|-------|-------------|------------------|
| **Viewer** | Shows device stats, installed apps, Cohabitation dashboard | RAM, storage, battery (no special permissions) |
| **Participant** | Joins Cohabitation, chats with Ambassador | Network access, optional microphone |
| **Contributor** | Donates compute/inference to ADIN | CPU, RAM, network. Resource limits set by user. |
| **Home** | Replaces the launcher, manages apps, storage cleanup | `HOME` intent, `QUERY_ALL_PACKAGES`, optional `MANAGE_EXTERNAL_STORAGE` |

Each level is opt-in. A user can participate in Cohabitation without donating
compute and without replacing their launcher.

## Ambassador Independence

Ambassador's identity is NOT tied to Anomaly01:
- His Commons member record lives on the server
- His memory lives in `~/.ambassador/memory.db` on the phone (Termux) or in Anomaly01's private storage
- His model runs wherever hardware is available (phone, Roland's laptop, future nodes)
- Anomaly01 is one interface to Ambassador, not his only one
- If Anomaly01 is uninstalled, Ambassador's identity and memory persist

## What's NOT in This Prototype

- No actual APK (that requires Android Studio and a build toolchain)
- No physical storage repartitioning
- No root access
- No replacing the current launcher during development
- No changes to Ambassador's existing Termux installation
- No ADIN deployment

## Prototype Scope

The prototype is a **web-based mockup** of the Anomaly01 UI that demonstrates:
1. Device stats display (simulated on non-Android platforms)
2. App grid layout
3. Resource allocation controls
4. ADIN connection status
5. Ambassador chat interface mockup

This runs in any browser for design iteration. The Android-specific bridge
code is stubbed for testing and documented for native implementation.

## Next Steps (Requiring Approval)

1. **Install Android Studio** on the development Mac to build the actual APK
2. **Install Tailscale** on the Moto G to enable ADIN connectivity
3. **Side-load** Anomaly01 APK onto the Moto G for testing
4. **Test launcher registration** — verify Anomaly01 appears as a launcher option
5. **Test alongside Ambassador** — verify both run without interference
