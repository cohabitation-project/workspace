# Build Requirements — Anomaly01 Android

## What you need

| Component | Size | Notes |
|---|---|---|
| JDK 17 (e.g., Eclipse Temurin) | ~300 MB | Required for Gradle and Android build tools |
| Android SDK command-line tools | ~150 MB | Includes `sdkmanager` |
| Android SDK platform 35 + build-tools | ~500 MB | Target API level |
| Android SDK platform-tools (adb) | ~50 MB | For installing APKs on devices |
| **Total** | **~1 GB** | |

**OR:** Android Studio (~2.5 GB), which includes all of the above.

## Install via Homebrew (macOS)

```bash
# JDK 17
brew install --cask temurin@17

# Android command-line tools
brew install --cask android-commandlinetools

# Accept licenses
yes | sdkmanager --licenses

# Install SDK components
sdkmanager "platforms;android-35" "build-tools;35.0.0" "platform-tools"
```

## Install via direct download (macOS or Linux)

1. **JDK 17:** Download Eclipse Temurin from https://adoptium.net/temurin/releases/?version=17
2. **Android command-line tools:** Download from https://developer.android.com/studio#command-line-tools-only
3. Unzip command-line tools and set `ANDROID_HOME`:
   ```bash
   export ANDROID_HOME=$HOME/Android/Sdk
   mkdir -p "$ANDROID_HOME/cmdline-tools"
   # Unzip the downloaded tools into $ANDROID_HOME/cmdline-tools/latest
   ```
4. Install SDK components:
   ```bash
   $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager \
     "platforms;android-35" "build-tools;35.0.0" "platform-tools"
   ```

## Build the APK

```bash
cd anomaly01/android
./gradlew assembleDebug
# APK at: app/build/outputs/apk/debug/app-debug.apk
```

## Install on a connected phone

```bash
adb install app/build/outputs/apk/debug/app-debug.apk
```

Make sure USB debugging is enabled on the phone and the device is authorized.

## Environment variables

If the build can't find the SDK, set:

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk   # macOS with Android Studio
# or
export ANDROID_HOME=$HOME/Android/Sdk            # manual install
```

If the build can't find JDK 17, set:

```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 17)  # macOS
```
