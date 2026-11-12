package org.cohabitation.anomaly01;

import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.Test;

import static org.junit.Assert.*;

/**
 * Unit tests for bridge-related JSON contract validation.
 * These tests verify JSON structure without requiring Android runtime.
 * Integration tests (requiring a device/emulator) belong in androidTest/.
 */
public class AnomalyBridgeTest {

    @Test
    public void deviceStatsJsonStructure() throws Exception {
        // Verify the expected JSON contract for device stats
        String sample = "{\"ram\":{\"total\":4096,\"used\":2800,\"available\":1296},"
                + "\"storage\":{\"total\":128000,\"used\":87000,\"free\":41000},"
                + "\"battery\":{\"level\":72,\"charging\":true,\"temperature\":31},"
                + "\"cpu\":{\"cores\":8,\"usage\":23}}";

        JSONObject stats = new JSONObject(sample);

        // RAM
        JSONObject ram = stats.getJSONObject("ram");
        assertTrue(ram.getLong("total") > 0);
        assertTrue(ram.getLong("used") >= 0);
        assertTrue(ram.getLong("available") >= 0);

        // Storage
        JSONObject storage = stats.getJSONObject("storage");
        assertTrue(storage.getLong("total") > 0);
        assertTrue(storage.getLong("free") >= 0);

        // Battery
        JSONObject battery = stats.getJSONObject("battery");
        int level = battery.getInt("level");
        assertTrue(level >= 0 && level <= 100);
        // charging is boolean — getBoolean will throw if missing or wrong type
        battery.getBoolean("charging");

        // CPU
        JSONObject cpu = stats.getJSONObject("cpu");
        assertTrue(cpu.getInt("cores") > 0);
        int usage = cpu.getInt("usage");
        assertTrue(usage >= 0 && usage <= 100);
    }

    @Test
    public void appListJsonStructure() throws Exception {
        String sample = "[{\"package\":\"com.example.app\",\"name\":\"Example\","
                + "\"icon\":\"data:image/png;base64,abc\",\"iconType\":\"base64\"}]";

        JSONArray apps = new JSONArray(sample);
        assertEquals(1, apps.length());

        JSONObject app = apps.getJSONObject(0);
        assertNotNull(app.getString("package"));
        assertNotNull(app.getString("name"));
        assertNotNull(app.getString("icon"));
        assertEquals("base64", app.getString("iconType"));
    }

    @Test
    public void storageBreakdownJsonStructure() throws Exception {
        // New format: used/available/total with detailed flag
        String sample = "{\"used\":87000,\"available\":41000,\"total\":128000,"
                + "\"detailed\":false,\"note\":\"Per-category breakdown requires storage access permission\"}";

        JSONObject storage = new JSONObject(sample);
        assertTrue(storage.getLong("used") >= 0);
        assertTrue(storage.getLong("available") >= 0);
        assertTrue(storage.getLong("total") > 0);
        assertFalse(storage.getBoolean("detailed"));
        assertNotNull(storage.getString("note"));
    }

    @Test
    public void ambassadorStatusJsonStructure() throws Exception {
        String sample = "{\"installed\":true,\"running\":false,\"model\":\"Qwen2.5-0.5B\","
                + "\"lastSeen\":\"unknown\",\"lastReply\":\"N/A\",\"memoryUsage\":0}";

        JSONObject status = new JSONObject(sample);
        status.getBoolean("installed");
        status.getBoolean("running");
        assertNotNull(status.getString("model"));
    }

    @Test
    public void packageNameValidation() {
        // Valid package names
        assertTrue("com.example.app".matches("^[a-zA-Z][a-zA-Z0-9_.]*$"));
        assertTrue("org.cohabitation.anomaly01".matches("^[a-zA-Z][a-zA-Z0-9_.]*$"));

        // Invalid package names (should be rejected by launchApp)
        assertFalse("".matches("^[a-zA-Z][a-zA-Z0-9_.]*$"));
        assertFalse("123.bad".matches("^[a-zA-Z][a-zA-Z0-9_.]*$"));
        assertFalse("com.evil;rm -rf".matches("^[a-zA-Z][a-zA-Z0-9_.]*$"));
        assertFalse("../../../etc/passwd".matches("^[a-zA-Z][a-zA-Z0-9_.]*$"));
    }
}
