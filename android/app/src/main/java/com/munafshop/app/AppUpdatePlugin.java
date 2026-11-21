package com.munafshop.app;

import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "AppUpdate")
public class AppUpdatePlugin extends Plugin {
    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    @PluginMethod
    public void getAppInfo(PluginCall call) {
        try {
            PackageManager pm = getContext().getPackageManager();
            PackageInfo pInfo = pm.getPackageInfo(getContext().getPackageName(), 0);
            long versionCode;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                versionCode = pInfo.getLongVersionCode();
            } else {
                versionCode = pInfo.versionCode;
            }
            boolean canInstall = true;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                canInstall = pm.canRequestPackageInstalls();
            }
            JSObject ret = new JSObject();
            ret.put("versionCode", versionCode);
            ret.put("versionName", pInfo.versionName != null ? pInfo.versionName : "1.0.0");
            ret.put("packageName", getContext().getPackageName());
            ret.put("canRequestPackageInstalls", canInstall);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to read Android package info: " + e.getMessage());
        }
    }

    @PluginMethod
    public void openInstallPermissionSettings(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                Intent intent = new Intent(
                    Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                    Uri.parse("package:" + getContext().getPackageName())
                );
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);
                JSObject ret = new JSObject();
                ret.put("opened", true);
                call.resolve(ret);
                return;
            } catch (Exception e) {
                call.reject("Could not open install permission settings: " + e.getMessage());
                return;
            }
        }
        JSObject ret = new JSObject();
        ret.put("opened", false);
        call.resolve(ret);
    }

    @PluginMethod
    public void openExternalDownloadUrl(PluginCall call) {
        String urlStr = call.getString("url", "");
        if (urlStr == null || (!urlStr.startsWith("https://") && !urlStr.startsWith("http://"))) {
            call.reject("Invalid APK download URL.");
            return;
        }
        openInBrowser(urlStr);
        JSObject ret = new JSObject();
        ret.put("opened", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void downloadAndInstallApk(PluginCall call) {
        String urlStr = call.getString("url", "");
        String versionName = call.getString("versionName", "latest");
        if (urlStr == null || (!urlStr.startsWith("https://") && !urlStr.startsWith("http://"))) {
            call.reject("Valid HTTPS APK download link required.");
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            boolean canInstall = getContext().getPackageManager().canRequestPackageInstalls();
            if (!canInstall) {
                emitProgress("permission_required", 0, 0, 0, "Please enable 'Install unknown apps' for MUNAF SHOP.");
                try {
                    Intent permIntent = new Intent(
                        Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                        Uri.parse("package:" + getContext().getPackageName())
                    );
                    permIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    getContext().startActivity(permIntent);
                } catch (Exception ignored) {
                }
                JSObject ret = new JSObject();
                ret.put("started", false);
                ret.put("needsInstallPermission", true);
                ret.put("message", "Unknown app install permission required.");
                call.resolve(ret);
                return;
            }
        }

        emitProgress("starting", 2, 0, 0, "Connecting to update server...");

        executor.execute(() -> {
            HttpURLConnection conn = null;
            try {
                String currentUrl = urlStr.trim();
                int redirects = 0;
                while (redirects < 6) {
                    URL url = new URL(currentUrl);
                    conn = (HttpURLConnection) url.openConnection();
                    conn.setInstanceFollowRedirects(false);
                    conn.setConnectTimeout(15000);
                    conn.setReadTimeout(30000);
                    conn.setRequestProperty("User-Agent", "MunafShopUpdater/1.0");
                    int code = conn.getResponseCode();
                    if (code == HttpURLConnection.HTTP_MOVED_TEMP
                        || code == HttpURLConnection.HTTP_MOVED_PERM
                        || code == HttpURLConnection.HTTP_SEE_OTHER
                        || code == 307
                        || code == 308) {
                        String nextLoc = conn.getHeaderField("Location");
                        conn.disconnect();
                        if (nextLoc == null || nextLoc.isEmpty()) break;
                        currentUrl = new URL(url, nextLoc).toString();
                        redirects++;
                        continue;
                    }
                    break;
                }

                if (conn == null) {
                    openInBrowser(urlStr);
                    resolveBrowserFallback(call, "Opened browser for APK download.");
                    return;
                }

                int status = conn.getResponseCode();
                String contentType = conn.getContentType() != null ? conn.getContentType().toLowerCase() : "";
                if (status < 200 || status >= 300 || contentType.contains("text/html")) {
                    conn.disconnect();
                    openInBrowser(urlStr);
                    emitProgress("opened_browser", 100, 0, 0, "Opening download link in browser...");
                    resolveBrowserFallback(call, "Download opened in browser.");
                    return;
                }

                long totalBytes = conn.getContentLengthLong();
                File updatesDir = new File(getContext().getCacheDir(), "updates");
                if (!updatesDir.exists()) {
                    updatesDir.mkdirs();
                }
                String safeVer = versionName.replaceAll("[^a-zA-Z0-9._-]", "_");
                File outFile = new File(updatesDir, "munaf-shop-" + safeVer + ".apk");
                if (outFile.exists()) {
                    outFile.delete();
                }

                InputStream rawIn = new BufferedInputStream(conn.getInputStream());
                byte[] buffer = new byte[16384];
                int firstRead = rawIn.read(buffer);
                if (firstRead <= 0 || buffer[0] != 0x50 || buffer[1] != 0x4B) {
                    rawIn.close();
                    conn.disconnect();
                    openInBrowser(urlStr);
                    emitProgress("opened_browser", 100, 0, 0, "Opening download link in browser...");
                    resolveBrowserFallback(call, "Link is not a direct APK file; opened in browser.");
                    return;
                }

                long downloaded = 0;
                int lastPercent = -1;
                try (FileOutputStream fos = new FileOutputStream(outFile)) {
                    fos.write(buffer, 0, firstRead);
                    downloaded += firstRead;

                    int count;
                    while ((count = rawIn.read(buffer)) != -1) {
                        fos.write(buffer, 0, count);
                        downloaded += count;
                        int percent = totalBytes > 0
                            ? (int) Math.min(99, (downloaded * 100L) / totalBytes)
                            : 50;
                        if (percent != lastPercent) {
                            lastPercent = percent;
                            emitProgress("downloading", percent, downloaded, totalBytes, "Downloading APK...");
                        }
                    }
                    fos.flush();
                } finally {
                    rawIn.close();
                    conn.disconnect();
                }

                emitProgress("installing", 100, downloaded, downloaded, "Launching APK installer...");
                Uri apkUri = FileProvider.getUriForFile(
                    getContext(),
                    getContext().getPackageName() + ".fileprovider",
                    outFile
                );
                Intent installIntent = new Intent(Intent.ACTION_VIEW);
                installIntent.setDataAndType(apkUri, "application/vnd.android.package-archive");
                installIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_GRANT_READ_URI_PERMISSION);
                getContext().startActivity(installIntent);

                JSObject ret = new JSObject();
                ret.put("started", true);
                ret.put("openedBrowser", false);
                ret.put("message", "APK installer launched.");
                call.resolve(ret);
            } catch (Exception e) {
                if (conn != null) {
                    conn.disconnect();
                }
                openInBrowser(urlStr);
                emitProgress("opened_browser", 100, 0, 0, "Opened link in browser.");
                resolveBrowserFallback(call, "Fallback opened in browser: " + e.getMessage());
            }
        });
    }

    private void openInBrowser(String urlStr) {
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(urlStr.trim()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
        } catch (Exception ignored) {
        }
    }

    private void resolveBrowserFallback(PluginCall call, String msg) {
        JSObject ret = new JSObject();
        ret.put("started", true);
        ret.put("openedBrowser", true);
        ret.put("message", msg);
        call.resolve(ret);
    }

    private void emitProgress(String status, int percent, long downloaded, long total, String message) {
        JSObject data = new JSObject();
        data.put("status", status);
        data.put("percent", percent);
        data.put("downloadedBytes", downloaded);
        data.put("totalBytes", total);
        data.put("message", message);
        notifyListeners("apkDownloadProgress", data);
    }
}
