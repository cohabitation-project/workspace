# Anomaly01 Android Build

Native Android launcher wrapping the Anomaly01 web UI in a WebView with a real JavaScript bridge to device APIs.

## Requirements

- **JDK 17** (OpenJDK or Oracle)
- **Android SDK** with platform 35 (Android 15) and build tools
- **Android Studio Ladybug (2024.2+)** or Gradle CLI 8.7+

No external dependencies beyond the Android SDK. Pure Java, no Kotlin.

## Build

### Android Studio

1. Open the `anomaly01/android/` folder as a project
2. Let Gradle sync (it downloads the Android Gradle Plugin automatically)
3. Build > Make Project
4. Run on a connected device or emulator

### Command line

```bash
cd anomaly01/android
./gradlew assembleDebug
```

The APK appears at `app/build/outputs/apk/debug/app-debug.apk`.

## Install on Moto G 5G

1. Enable USB debugging: Settings > About phone > tap Build number 7 times, then Settings > Developer options > USB debugging
2. Connect via USB and accept the debug prompt on the phone
3. Install:

```bash
adb install app/build/outputs/apk/debug/app-debug.apk
```

4. Open the app. It starts with an onboarding screen to choose your integration level.
5. If you chose "Integrated Home", press the home button and select Anomaly01 as your launcher.

## What's real vs. simulated

### Real (from Android APIs)
- **RAM stats** — ActivityManager.getMemoryInfo() (total, used, available)
- **Storage stats** — StatFs on /data (total, used, free)
- **Battery** — sticky broadcast (level, charging, temperature)
- **CPU cores** — Runtime.availableProcessors()
- **CPU usage** — /proc/stat (best effort; returns 0 if kernel blocks access)
- **Installed apps** — PackageManager with MAIN/LAUNCHER intent filter
- **App icons** — encoded as base64 PNGs from PackageManager drawables
- **App launching** — PackageManager.getLaunchIntentForPackage()
- **Ambassador detection** — checks if Termux package is installed
- **Preferences** — saved to SharedPreferences

### Simulated (placeholder data)
- **Storage breakdown by category** — estimated proportions (apps 40%, photos 20%, videos 25%, system 15%) because StorageStatsManager requires MANAGE_EXTERNAL_STORAGE
- **ADIN network status** — always shows disconnected (ADIN is not yet implemented)
- **Ambassador chat** — canned responses (real Ambassador integration requires Termux IPC)
- **Cleanup suggestions** — hardcoded suggestions (real cleanup requires storage permission)
- **CPU usage** — falls back to 0% on devices where /proc/stat is restricted

## Permissions

| Permission | Why | When requested |
|---|---|---|
| QUERY_ALL_PACKAGES | List installed apps in the app grid | Always (declared in manifest) |
| INTERNET | Future network features | Always (declared in manifest) |
| MANAGE_EXTERNAL_STORAGE | Storage breakdown and cleanup | Only if user selects "Expanded Workspace" level |

## Privacy

- **No network calls.** The app never phones home. INTERNET permission is declared for future use only.
- **No data collection.** All device stats stay on-device. Nothing is uploaded.
- **No file access.** The app reads system stats (RAM, storage totals, battery) which are available to any app. It does NOT read files, photos, messages, contacts, or location.
- **App list is local.** The list of installed apps is queried from PackageManager and displayed only in the local WebView. It is not transmitted anywhere.
- **Preferences are local.** User settings are stored in SharedPreferences on-device only.
- **Icons are ephemeral.** App icons are base64-encoded in memory for the WebView and not persisted to disk.

## Browser testing

The web UI still works in a browser for design iteration. Open `anomaly01/index.html` directly (or the assets copy). The bridge.js fallback detects the absence of the native `window.Anomaly` object and provides simulated data.
