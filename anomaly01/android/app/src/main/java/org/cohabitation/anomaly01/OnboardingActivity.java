package org.cohabitation.anomaly01;

import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.RadioButton;
import android.widget.RadioGroup;
import android.widget.TextView;

/**
 * First-launch onboarding experience. Lets the user choose their integration
 * level before entering the launcher.
 *
 * Integration levels:
 * 1. Companion     — Anomaly01 runs as a regular app (no launcher, no special permissions)
 * 2. Integrated    — Offers to set Anomaly01 as the default home launcher
 * 3. Expanded      — Requests storage permission, offers ADIN network participation
 *
 * The user can change their level later from the settings panel in the launcher UI.
 *
 * If onboarding is already complete, this activity immediately forwards to
 * {@link LauncherActivity}.
 */
public class OnboardingActivity extends Activity {

    private static final String PREFS_NAME = "anomaly01_prefs";
    private static final String KEY_ONBOARDING_COMPLETE = "onboarding_complete";
    private static final String KEY_INTEGRATION_LEVEL = "integration_level";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Skip onboarding if already completed
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        if (prefs.getBoolean(KEY_ONBOARDING_COMPLETE, false)) {
            launchMain();
            return;
        }

        // Immersive mode
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        hideSystemUI();

        setContentView(R.layout.activity_onboarding);

        // Wire up the continue button
        Button btnContinue = findViewById(R.id.btn_continue);
        RadioGroup levelGroup = findViewById(R.id.radio_level);

        btnContinue.setOnClickListener(v -> {
            int selectedId = levelGroup.getCheckedRadioButtonId();
            String level = "companion"; // default

            if (selectedId == R.id.radio_companion) {
                level = "companion";
            } else if (selectedId == R.id.radio_integrated) {
                level = "integrated";
            } else if (selectedId == R.id.radio_expanded) {
                level = "expanded";
            }

            // Save onboarding state
            prefs.edit()
                    .putBoolean(KEY_ONBOARDING_COMPLETE, true)
                    .putString(KEY_INTEGRATION_LEVEL, level)
                    .apply();

            launchMain();
        });
    }

    private void launchMain() {
        Intent intent = new Intent(this, LauncherActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        startActivity(intent);
        finish();
    }

    private void hideSystemUI() {
        View decorView = getWindow().getDecorView();
        decorView.setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                | View.SYSTEM_UI_FLAG_FULLSCREEN
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN);
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystemUI();
    }
}
