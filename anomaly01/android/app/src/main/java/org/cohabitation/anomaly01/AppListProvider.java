package org.cohabitation.anomaly01;

import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.drawable.Drawable;
import android.util.Base64;

import java.io.ByteArrayOutputStream;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Enumerates installed launchable apps and provides their icons as
 * base64-encoded PNG strings suitable for display in the WebView.
 *
 * The app list is cached after the first query. Call {@link #getApps(boolean)}
 * with {@code forceRefresh = true} to rebuild the cache.
 */
public class AppListProvider {

    /** Data class representing a single launchable app. */
    public static class AppInfo {
        public final String packageName;
        public final String label;
        public final String iconBase64;

        public AppInfo(String packageName, String label, String iconBase64) {
            this.packageName = packageName;
            this.label = label;
            this.iconBase64 = iconBase64;
        }
    }

    private static final int ICON_SIZE_PX = 96;

    private final Context context;
    private List<AppInfo> cachedApps;

    public AppListProvider(Context context) {
        this.context = context.getApplicationContext();
    }

    /**
     * Returns the list of launchable apps, sorted alphabetically by label.
     *
     * @param forceRefresh If true, rebuilds the cache from PackageManager.
     */
    public List<AppInfo> getApps(boolean forceRefresh) {
        if (cachedApps != null && !forceRefresh) {
            return cachedApps;
        }

        PackageManager pm = context.getPackageManager();
        Intent mainIntent = new Intent(Intent.ACTION_MAIN, null);
        mainIntent.addCategory(Intent.CATEGORY_LAUNCHER);

        List<ResolveInfo> resolveInfos = pm.queryIntentActivities(mainIntent, 0);
        List<AppInfo> apps = new ArrayList<>();

        for (ResolveInfo ri : resolveInfos) {
            String pkg = ri.activityInfo.packageName;

            // Skip ourselves to avoid recursion
            if (pkg.equals(context.getPackageName())) continue;

            String label = ri.loadLabel(pm).toString();
            String iconBase64 = encodeIcon(ri.loadIcon(pm));

            apps.add(new AppInfo(pkg, label, iconBase64));
        }

        // Sort alphabetically by label
        Collections.sort(apps, (a, b) -> a.label.compareToIgnoreCase(b.label));

        cachedApps = apps;
        return cachedApps;
    }

    /**
     * Converts a Drawable icon to a base64-encoded PNG string.
     * The icon is scaled to {@link #ICON_SIZE_PX} to keep data transfer small.
     */
    private String encodeIcon(Drawable drawable) {
        try {
            Bitmap bitmap = Bitmap.createBitmap(ICON_SIZE_PX, ICON_SIZE_PX,
                    Bitmap.Config.ARGB_8888);
            Canvas canvas = new Canvas(bitmap);
            drawable.setBounds(0, 0, ICON_SIZE_PX, ICON_SIZE_PX);
            drawable.draw(canvas);

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            bitmap.compress(Bitmap.CompressFormat.PNG, 80, baos);
            bitmap.recycle();

            byte[] bytes = baos.toByteArray();
            return "data:image/png;base64," + Base64.encodeToString(bytes, Base64.NO_WRAP);
        } catch (Exception e) {
            // Fallback: return empty string; JS will use a placeholder
            return "";
        }
    }
}
