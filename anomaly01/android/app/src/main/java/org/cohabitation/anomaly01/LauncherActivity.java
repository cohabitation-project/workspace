package org.cohabitation.anomaly01;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.net.Uri;
import android.os.Bundle;
import android.view.KeyEvent;
import android.webkit.ConsoleMessage;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.webkit.WebViewAssetLoader;

/**
 * Main launcher activity. Displays the Anomaly01 web UI inside a WebView
 * and exposes device APIs to JavaScript through {@link AnomalyBridge}.
 *
 * Security notes:
 * - Assets are served via WebViewAssetLoader over a virtual https:// URL,
 *   preventing file:// protocol access to arbitrary device files.
 * - Navigation is restricted to our own asset URLs and about:blank.
 * - The system status bar and navigation buttons remain visible (companion mode).
 */
public class LauncherActivity extends Activity {

    private static final String ASSET_HOST = "appassets.androidplatform.net";
    private static final String ASSET_PATH_PREFIX = "/assets/";

    private WebView webView;
    private WebViewAssetLoader assetLoader;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_launcher);

        // Build the asset loader — serves assets/ via virtual https:// URL
        assetLoader = new WebViewAssetLoader.Builder()
                .addPathHandler(ASSET_PATH_PREFIX,
                        new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        webView = findViewById(R.id.webview_launcher);
        configureWebView();

        // Inject the native JS bridge.
        //
        // SECURITY: @JavascriptInterface methods must validate all inputs since
        // they are callable from any JS running in the WebView. Navigation is
        // restricted to our own assets (see shouldOverrideUrlLoading), but
        // defense in depth matters — never trust JS input blindly.
        webView.addJavascriptInterface(new AnomalyBridge(this), "Anomaly");

        // Load the launcher UI from assets via the safe virtual URL
        webView.loadUrl("https://" + ASSET_HOST + ASSET_PATH_PREFIX + "index.html");
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void configureWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setCacheMode(WebSettings.LOAD_NO_CACHE);

        // No file:// access — assets are served via WebViewAssetLoader
        // setAllowFileAccess, setAllowFileAccessFromFileURLs,
        // setAllowUniversalAccessFromFileURLs are intentionally NOT enabled.

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view,
                                                               WebResourceRequest request) {
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view,
                                                     WebResourceRequest request) {
                Uri url = request.getUrl();
                String urlStr = url.toString();

                // Allow our own asset URLs
                if (urlStr.startsWith("https://" + ASSET_HOST + ASSET_PATH_PREFIX)) {
                    return false; // let the WebView handle it
                }

                // Allow about:blank
                if ("about:blank".equals(urlStr)) {
                    return false;
                }

                // Block all other navigation
                return true;
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request,
                                        WebResourceError error) {
                super.onReceivedError(view, request, error);
                if (request.isForMainFrame()) {
                    Toast.makeText(LauncherActivity.this,
                            "Error loading launcher UI", Toast.LENGTH_SHORT).show();
                }
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onConsoleMessage(ConsoleMessage consoleMessage) {
                android.util.Log.d("Anomaly01-JS",
                        consoleMessage.message() + " -- line " +
                        consoleMessage.lineNumber() + " of " +
                        consoleMessage.sourceId());
                return true;
            }
        });

        // Transparent background for seamless dark theme
        webView.setBackgroundColor(0xFF0A0A0A);
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        // Back button navigates within WebView history instead of exiting
        if (keyCode == KeyEvent.KEYCODE_BACK && webView.canGoBack()) {
            webView.goBack();
            return true;
        }
        // If no WebView history, let default behavior happen (finish activity)
        return super.onKeyDown(keyCode, event);
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) {
            webView.evaluateJavascript(
                    "if(typeof refreshAll==='function') refreshAll();", null);
        }
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.destroy();
        }
        super.onDestroy();
    }
}
