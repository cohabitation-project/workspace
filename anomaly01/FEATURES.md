# Anomaly01 Feature Status

## Implemented (real Android APIs)

These features use actual device data when running on Android:

- **Device dashboard** — RAM, storage, battery, CPU gauges with live data refreshed every 5 seconds
- **App grid** — real list of installed launchable apps from PackageManager
- **App icons** — actual app icons rendered as base64 PNG in the WebView
- **App launching** — tapping an icon opens the real app via launch intent
- **Battery monitoring** — level, charging state, temperature from BatteryManager
- **RAM monitoring** — total, used, available from ActivityManager
- **Storage totals** — total, used, free from StatFs
- **CPU core count** — from Runtime.availableProcessors()
- **CPU usage** — from /proc/stat when kernel allows access
- **Onboarding flow** — native activity with three integration levels
- **Preference persistence** — resource allocation settings saved to SharedPreferences
- **Termux detection** — checks if the Ambassador runtime (Termux) is installed
- **Home launcher mode** — registers as a selectable default launcher via HOME intent filter

## Simulated (placeholder data)

These show realistic data but are not connected to real systems yet:

- **Storage breakdown by category** — proportional estimates (not actual per-category usage)
- **ADIN network panel** — always shows disconnected; no ADIN protocol implemented
- **Ambassador chat** — canned responses cycling through a fixed list
- **Ambassador running status** — reports "offline" (cannot detect Termux process state without IPC)
- **Cleanup suggestions** — hardcoded list; no actual file scanning
- **Cleanup execution** — reports success but does not delete files
- **Network indicator** — always shows "LTE" in the status bar

## Requires additional permissions

These features become real only after the user grants specific permissions:

| Feature | Permission | Integration level |
|---|---|---|
| Accurate storage breakdown | MANAGE_EXTERNAL_STORAGE | Expanded Workspace |
| Storage cleanup (file deletion) | MANAGE_EXTERNAL_STORAGE | Expanded Workspace |
| Per-app storage usage | USAGE_STATS_ACCESS | Expanded Workspace |

## Requires Geoffrey's approval before enabling

These features exist in the UI but should not be activated without explicit approval:

- **ADIN network participation** — the toggle exists in Resource Allocation but the backend does not. Enabling this implies sharing compute resources. Requires: ADIN protocol spec approval, network security review.
- **Ambassador integration** — connecting to a real local LLM via Termux requires: Termux IPC design approval, memory budget approval (the LLM uses ~500 MB RAM), security review of the IPC channel.
- **Set as default launcher** — the HOME intent filter is registered but the onboarding only suggests it at "Integrated Home" level. Making it the default replaces the phone's launcher. Requires: stability testing on the Moto G 5G, user confirmation they can switch back.
- **Storage cleanup execution** — the UI shows cleanup suggestions but actual file deletion requires: MANAGE_EXTERNAL_STORAGE permission grant, confirmation that the deletion logic is safe, testing on real data.
- **Inference task toggle** — the "Allow inference tasks" toggle in Resources is UI-only. Enabling real inference requires: ADIN protocol, task scheduling, resource enforcement.
