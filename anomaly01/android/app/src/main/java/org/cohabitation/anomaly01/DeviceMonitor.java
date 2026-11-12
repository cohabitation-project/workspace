package org.cohabitation.anomaly01;

import android.app.ActivityManager;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.BatteryManager;
import android.os.Environment;
import android.os.StatFs;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.FileReader;
import java.io.IOException;

/**
 * Utility class that reads real device metrics using Android system APIs.
 * All values are returned as JSONObjects for easy serialization to the WebView.
 *
 * Data accessed:
 * - RAM: total/available via ActivityManager (no special permission)
 * - Storage: internal storage via StatFs (no special permission)
 * - Battery: level, charging state, temperature via sticky broadcast
 * - CPU: core count via Runtime, usage from /proc/stat (best effort)
 */
public class DeviceMonitor {

    private final Context context;

    public DeviceMonitor(Context context) {
        this.context = context;
    }

    // ── RAM ─────────────────────────────────────────────────────────

    /**
     * Returns { total, used, available } in MB.
     */
    public JSONObject getMemoryInfo() throws JSONException {
        ActivityManager am = (ActivityManager) context.getSystemService(Context.ACTIVITY_SERVICE);
        ActivityManager.MemoryInfo mi = new ActivityManager.MemoryInfo();
        am.getMemoryInfo(mi);

        long totalMB = mi.totalMem / (1024 * 1024);
        long availMB = mi.availMem / (1024 * 1024);
        long usedMB = totalMB - availMB;

        JSONObject obj = new JSONObject();
        obj.put("total", totalMB);
        obj.put("used", usedMB);
        obj.put("available", availMB);
        return obj;
    }

    // ── Storage ─────────────────────────────────────────────────────

    /**
     * Returns { total, used, free } in MB for internal storage.
     */
    public JSONObject getStorageInfo() throws JSONException {
        StatFs stat = new StatFs(Environment.getDataDirectory().getPath());
        long totalBytes = stat.getTotalBytes();
        long freeBytes = stat.getAvailableBytes();
        long usedBytes = totalBytes - freeBytes;

        JSONObject obj = new JSONObject();
        obj.put("total", totalBytes / (1024 * 1024));
        obj.put("used", usedBytes / (1024 * 1024));
        obj.put("free", freeBytes / (1024 * 1024));
        return obj;
    }

    /**
     * Returns storage usage as used/available/total — only what we can
     * actually measure without special permissions.
     *
     * Per-category breakdown (apps, photos, videos) is NOT provided because
     * we don't have MANAGE_EXTERNAL_STORAGE. Fabricating percentages would
     * be dishonest.
     */
    public JSONObject getStorageBreakdown() throws JSONException {
        StatFs stat = new StatFs(Environment.getDataDirectory().getPath());
        long totalMB = stat.getTotalBytes() / (1024 * 1024);
        long freeMB = stat.getAvailableBytes() / (1024 * 1024);
        long usedMB = totalMB - freeMB;

        JSONObject obj = new JSONObject();
        obj.put("used", usedMB);
        obj.put("available", freeMB);
        obj.put("total", totalMB);
        obj.put("detailed", false);
        obj.put("note", "Per-category breakdown requires storage access permission");
        return obj;
    }

    // ── Battery ─────────────────────────────────────────────────────

    /**
     * Returns { level, charging, temperature } using the battery sticky intent.
     * Temperature is in degrees Celsius.
     */
    public JSONObject getBatteryInfo() throws JSONException {
        IntentFilter filter = new IntentFilter(Intent.ACTION_BATTERY_CHANGED);
        Intent batteryStatus = context.registerReceiver(null, filter);

        int level = 0;
        boolean charging = false;
        float temperature = 0;

        if (batteryStatus != null) {
            int rawLevel = batteryStatus.getIntExtra(BatteryManager.EXTRA_LEVEL, -1);
            int scale = batteryStatus.getIntExtra(BatteryManager.EXTRA_SCALE, -1);
            if (rawLevel >= 0 && scale > 0) {
                level = Math.round((rawLevel / (float) scale) * 100);
            }

            int status = batteryStatus.getIntExtra(BatteryManager.EXTRA_STATUS, -1);
            charging = status == BatteryManager.BATTERY_STATUS_CHARGING
                    || status == BatteryManager.BATTERY_STATUS_FULL;

            int rawTemp = batteryStatus.getIntExtra(BatteryManager.EXTRA_TEMPERATURE, 0);
            temperature = rawTemp / 10.0f;
        }

        JSONObject obj = new JSONObject();
        obj.put("level", level);
        obj.put("charging", charging);
        obj.put("temperature", Math.round(temperature));
        return obj;
    }

    // ── CPU ─────────────────────────────────────────────────────────

    /**
     * Returns { cores, usage }.
     * Core count from Runtime; usage is best-effort from /proc/stat.
     * If /proc/stat is unreadable, usage defaults to 0.
     */
    public JSONObject getCpuInfo() throws JSONException {
        int cores = Runtime.getRuntime().availableProcessors();
        int usage = estimateCpuUsage();

        JSONObject obj = new JSONObject();
        obj.put("cores", cores);
        obj.put("usage", usage);
        return obj;
    }

    /**
     * Reads /proc/stat twice with a short delay to calculate CPU usage percentage.
     * Returns 0 if /proc/stat is not readable (common on newer Android versions).
     */
    private int estimateCpuUsage() {
        try {
            long[] first = readCpuTimes();
            if (first == null) return 0;

            Thread.sleep(200);

            long[] second = readCpuTimes();
            if (second == null) return 0;

            long idleDelta = second[1] - first[1];
            long totalDelta = second[0] - first[0];

            if (totalDelta <= 0) return 0;
            return (int) (100 * (totalDelta - idleDelta) / totalDelta);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return 0;
        }
    }

    /**
     * Reads the first "cpu" line from /proc/stat.
     * Returns [totalTime, idleTime] or null if unreadable.
     */
    private long[] readCpuTimes() {
        try (BufferedReader reader = new BufferedReader(new FileReader("/proc/stat"))) {
            String line = reader.readLine();
            if (line == null || !line.startsWith("cpu ")) return null;

            String[] parts = line.trim().split("\\s+");
            if (parts.length < 5) return null;

            long user = Long.parseLong(parts[1]);
            long nice = Long.parseLong(parts[2]);
            long system = Long.parseLong(parts[3]);
            long idle = Long.parseLong(parts[4]);
            long iowait = parts.length > 5 ? Long.parseLong(parts[5]) : 0;
            long irq = parts.length > 6 ? Long.parseLong(parts[6]) : 0;
            long softirq = parts.length > 7 ? Long.parseLong(parts[7]) : 0;

            long total = user + nice + system + idle + iowait + irq + softirq;
            return new long[]{total, idle};
        } catch (IOException | NumberFormatException e) {
            return null;
        }
    }
}
