package org.cohabitation.anomaly01;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.webkit.JavascriptInterface;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.List;

/**
 * JavaScript bridge exposed to the WebView as {@code window.Anomaly}.
 * Each public method annotated with {@link JavascriptInterface} is callable
 * from the web UI.
 *
 * SECURITY: @JavascriptInterface methods must validate all inputs since they
 * are callable from any JS running in the WebView. The bridge is only
 * accessible from our own bundled assets because LauncherActivity blocks
 * navigation to external URLs, but defense in depth matters — never trust
 * JS input blindly.
 *
 * IMPORTANT: Methods called from JS run on a background WebView thread,
 * not the UI thread. Any UI work must be posted to the main thread.
 */
public class AnomalyBridge {

    private static final String PREFS_NAME = "anomaly01_prefs";

    private final Context context;
    private final Activity activity;
    private final DeviceMonitor deviceMonitor;
    private final AppListProvider appListProvider;

    /** Marker so JS can detect the native bridge vs. the simulation fallback. */
    @JavascriptInterface
    public boolean get_isNative() {
        return true;
    }

    public AnomalyBridge(Activity activity) {
        this.activity = activity;
        this.context = activity.getApplicationContext();
        this.deviceMonitor = new DeviceMonitor(this.context);
        this.appListProvider = new AppListProvider(this.context);
    }

    // ── Device Stats ────────────────────────────────────────────────

    /**
     * Returns a JSON string with RAM, storage, battery and CPU information.
     * Called frequently by the dashboard for live gauges.
     */
    @JavascriptInterface
    public String getDeviceStats() {
        try {
            JSONObject ram = deviceMonitor.getMemoryInfo();
            JSONObject storage = deviceMonitor.getStorageInfo();
            JSONObject battery = deviceMonitor.getBatteryInfo();
            JSONObject cpu = deviceMonitor.getCpuInfo();

            JSONObject result = new JSONObject();
            result.put("ram", ram);
            result.put("storage", storage);
            result.put("battery", battery);
            result.put("cpu", cpu);
            return result.toString();
        } catch (JSONException e) {
            return "{}";
        }
    }

    // ── Installed Apps ──────────────────────────────────────────────

    /**
     * Returns a JSON array of launchable apps. Each entry has:
     * package (String), name (String), icon (String — base64 PNG or emoji fallback).
     */
    @JavascriptInterface
    public String getInstalledApps() {
        List<AppListProvider.AppInfo> appList = appListProvider.getApps(false);
        JSONArray arr = new JSONArray();
        for (AppListProvider.AppInfo app : appList) {
            try {
                JSONObject obj = new JSONObject();
                obj.put("package", app.packageName);
                obj.put("name", app.label);
                obj.put("icon", app.iconBase64);
                obj.put("iconType", "base64");
                arr.put(obj);
            } catch (JSONException e) {
                // skip this app
            }
        }
        return arr.toString();
    }

    /**
     * Launches an app by package name. Validates the package before launching.
     */
    @JavascriptInterface
    public void launchApp(String packageName) {
        if (packageName == null || packageName.isEmpty()) return;

        // Basic validation: only allow standard package name characters
        if (!packageName.matches("^[a-zA-Z][a-zA-Z0-9_.]*$")) return;

        PackageManager pm = context.getPackageManager();
        Intent intent = pm.getLaunchIntentForPackage(packageName);
        if (intent != null) {
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
        }
    }

    // ── Storage Breakdown ───────────────────────────────────────────

    /**
     * Returns a JSON object with storage categories in MB.
     * Uses StorageStatsManager if available, else provides estimates
     * based on total/free space.
     */
    @JavascriptInterface
    public String getStorageBreakdown() {
        try {
            return deviceMonitor.getStorageBreakdown().toString();
        } catch (Exception e) {
            return "{}";
        }
    }

    // ── Ambassador Status ───────────────────────────────────────────

    /**
     * Checks whether Termux (the Ambassador runtime) is installed and
     * reports its status. Does NOT access Termux data or files.
     */
    @JavascriptInterface
    public String getAmbassadorStatus() {
        try {
            JSONObject status = new JSONObject();
            boolean installed = isPackageInstalled("com.termux");
            status.put("installed", installed);
            // We can't reliably detect if Termux is running without
            // special permissions, so we report best-effort
            status.put("running", false);
            status.put("model", installed ? "Qwen2.5-0.5B" : "none");
            status.put("lastSeen", "unknown");
            status.put("lastReply", "N/A");
            status.put("memoryUsage", 0);
            return status.toString();
        } catch (JSONException e) {
            return "{}";
        }
    }

    // ── Preferences ─────────────────────────────────────────────────

    /**
     * Saves user preferences as a JSON string to SharedPreferences.
     */
    @JavascriptInterface
    public void savePreferences(String prefsJson) {
        SharedPreferences sp = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        sp.edit().putString("user_prefs", prefsJson).apply();
    }

    /**
     * Loads previously saved user preferences, or returns "{}".
     */
    @JavascriptInterface
    public String loadPreferences() {
        SharedPreferences sp = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        return sp.getString("user_prefs", "{}");
    }

    // ── App Lifecycle ───────────────────────────────────────────────

    /**
     * Exits the Anomaly01 launcher, returning the user to their
     * previous home screen or app.
     */
    @JavascriptInterface
    public void exitApp() {
        activity.runOnUiThread(() -> activity.finish());
    }

    // ── Helpers ─────────────────────────────────────────────────────

    private boolean isPackageInstalled(String packageName) {
        try {
            context.getPackageManager().getPackageInfo(packageName, 0);
            return true;
        } catch (PackageManager.NameNotFoundException e) {
            return false;
        }
    }
}
