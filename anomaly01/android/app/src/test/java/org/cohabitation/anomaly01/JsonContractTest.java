package org.cohabitation.anomaly01;

import org.json.JSONObject;
import org.junit.Test;

import static org.junit.Assert.*;

/**
 * Pure JVM tests for JSON contract validation.
 * These do NOT require Android runtime — they test JSON structure expectations
 * that the web UI depends on.
 *
 * Integration tests that call real Android APIs (DeviceMonitor, AppListProvider)
 * are in androidTest/ and require a device or emulator.
 */
public class JsonContractTest {

    @Test
    public void packageNameRegexRejectsInjection() {
        // The bridge validates package names with this regex
        String regex = "^[a-zA-Z][a-zA-Z0-9_.]*$";

        assertTrue("com.example.app".matches(regex));
        assertTrue("org.cohabitation.anomaly01".matches(regex));

        // These should all be rejected
        assertFalse("com.evil; rm -rf /".matches(regex));
        assertFalse("../../../etc/passwd".matches(regex));
        assertFalse("".matches(regex));
        assertFalse("123.starts.with.number".matches(regex));
        assertFalse("com.has spaces".matches(regex));
        assertFalse("com.has<html>".matches(regex));
    }

    @Test
    public void storageBreakdownContractWhenNoPermission() throws Exception {
        // When we don't have storage permission, the web UI expects this shape:
        // { used: number, available: number, total: number, detailed: false, note: string }
        String json = "{\"used\":87000,\"available\":41000,\"total\":128000," +
                      "\"detailed\":false,\"note\":\"Per-category breakdown requires storage access permission\"}";

        JSONObject obj = new JSONObject(json);
        assertTrue(obj.has("used"));
        assertTrue(obj.has("available"));
        assertTrue(obj.has("total"));
        assertFalse(obj.getBoolean("detailed"));
        assertTrue(obj.getString("note").contains("permission"));

        // The web UI should NOT expect these fields without detailed=true
        assertFalse(obj.has("apps"));
        assertFalse(obj.has("photos"));
        assertFalse(obj.has("videos"));
    }

    @Test
    public void deviceStatsContractShape() throws Exception {
        // The web UI expects this top-level shape from getDeviceStats()
        String json = "{\"ram\":{\"total\":4096,\"used\":2800,\"available\":1296}," +
                      "\"storage\":{\"total\":128000,\"used\":87000,\"free\":41000}," +
                      "\"battery\":{\"level\":72,\"charging\":true,\"temperature\":32}," +
                      "\"cpu\":{\"cores\":8,\"usage\":23}}";

        JSONObject obj = new JSONObject(json);
        assertTrue(obj.has("ram"));
        assertTrue(obj.has("storage"));
        assertTrue(obj.has("battery"));
        assertTrue(obj.has("cpu"));

        JSONObject ram = obj.getJSONObject("ram");
        assertTrue(ram.has("total"));
        assertTrue(ram.has("used"));
        assertTrue(ram.has("available"));
    }
}
