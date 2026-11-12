package org.cohabitation.anomaly01;

import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
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
 * The selected level is saved as a preference only. No permissions are requested
 * during onboarding — they will be requested individually when each feature is
 * actually used.
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

        // No immersive mode — the user needs to see the status bar, clock,
        // battery indicator, and have access to Back/Home/Recent buttons.

        setContentView(R.layout.activity_onboarding);

        // Wire up the continue button
        Button btnContinue = findViewById(R.id.btn_continue);
        RadioGroup levelGroup = findViewById(R.id.radio_level);
        TextView summaryText = findViewById(R.id.text_level_summary);

        // Show level summary when selection changes
        levelGroup.setOnCheckedChangeListener((group, checkedId) -> {
            if (summaryText != null) {
                if (checkedId == R.id.radio_companion) {
                    summaryText.setText(
                        "Companion mode: Anomaly01 runs as a regular app.\n\n" +
                        "Permissions will be requested individually when you use " +
                        "each feature, not now.");
                } else if (checkedId == R.id.radio_integrated) {
                    summaryText.setText(
                        "Integrated mode: Anomaly01 can be set as your home screen.\n\n" +
                        "Permissions will be requested individually when you use " +
                        "each feature, not now.");
                } else if (checkedId == R.id.radio_expanded) {
                    summaryText.setText(
                        "Expanded mode: Enables storage management and ADIN options " +
                        "in the UI.\n\n" +
                        "Permissions will be requested individually when you use " +
                        "each feature, not now.");
                }
            }
        });

        // Trigger initial summary for the default selection
        levelGroup.check(R.id.radio_companion);

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

            // Save onboarding state — this is a preference, not a permission grant
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
}
