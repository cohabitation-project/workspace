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
- **Onboarding flow** — native activity with three integration levels (saves preference only, no permissions requested)
- **Preference persistence** — resource allocation settings saved to SharedPreferences
- **Termux detection** — checks if the Ambassador runtime (Termux) is installed
- **Home launcher mode** — registers as a selectable default launcher via HOME intent filter
- **Exit button** — Settings panel includes "Exit Anomaly01" which calls finish() on the activity
- **WebView security** — assets served via WebViewAssetLoader (no file:// access), navigation restricted to own assets

## Not available without permission

These features are explicitly unavailable and the UI says so honestly:

- **Storage categories** — per-category breakdown (apps, photos, videos, system) is not available without MANAGE_EXTERNAL_STORAGE. The storage bar shows only "Used" and "Available" segments. No fabricated percentages.
- **Storage cleanup** — cleanup button shows "Storage cleanup requires additional permissions. Enable in Settings." Cleanup never fakes success.

## UI-only (no backend)

These show UI elements but are clearly labeled as non-functional:

- **ADIN network panel** — always shows "Not available (UI only)". No ADIN protocol is implemented.
- **ADIN toggle** — when enabled, shows: "ADIN is not yet available. This preference will be applied when ADIN connectivity is enabled."
- **Inference toggle** — when enabled, shows: "Inference tasks are not yet available on this device."
- **Ambassador chat** — returns canned responses, clearly labeled as "[Canned response]" in the chat UI. Not connected to any LLM.
- **Network indicator** — always shows "LTE" in the status bar (cosmetic)

## Requires Geoffrey's approval before enabling

These features exist in the UI but should not be activated without explicit approval:

- **ADIN network participation** — the toggle exists in Resource Allocation but the backend does not. Enabling this implies sharing compute resources. Requires: ADIN protocol spec approval, network security review.
- **Ambassador integration** — connecting to a real local LLM via Termux requires: Termux IPC design approval, memory budget approval (the LLM uses ~500 MB RAM), security review of the IPC channel.
- **Set as default launcher** — the HOME intent filter is registered but the onboarding only suggests it at "Integrated Home" level. Making it the default replaces the phone's launcher. Requires: stability testing on the Moto G 5G, user confirmation they can switch back.
- **Storage cleanup execution** — actual file deletion requires: MANAGE_EXTERNAL_STORAGE permission grant, confirmation that the deletion logic is safe, testing on real data.
- **Inference task toggle** — the "Allow inference tasks" toggle in Resources is UI-only. Enabling real inference requires: ADIN protocol, task scheduling, resource enforcement.
