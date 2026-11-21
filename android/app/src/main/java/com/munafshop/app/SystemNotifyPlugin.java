package com.munafshop.app;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "SystemNotify",
    permissions = {
        @Permission(
            alias = "notifications",
            strings = { Manifest.permission.POST_NOTIFICATIONS }
        )
    }
)
public class SystemNotifyPlugin extends Plugin {
    private static final String CHANNEL_ID = "munaf_shop_alerts";

    @Override
    public void load() {
        createNotificationChannel();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "MUNAF SHOP Alerts",
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Order updates, kisti due reminders, low stock, and admin alerts.");
            NotificationManager manager = (NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private boolean isGranted() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            return ContextCompat.checkSelfPermission(getContext(), Manifest.permission.POST_NOTIFICATIONS)
                == PackageManager.PERMISSION_GRANTED;
        }
        return NotificationManagerCompat.from(getContext()).areNotificationsEnabled();
    }

    @PluginMethod
    public void hasNotificationPermission(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("granted", isGranted());
        call.resolve(ret);
    }

    @PluginMethod
    public void requestNotificationPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU && !isGranted()) {
            requestPermissionForAlias("notifications", call, "notifyPermsCallback");
            return;
        }
        JSObject ret = new JSObject();
        ret.put("granted", isGranted());
        call.resolve(ret);
    }

    @PermissionCallback
    private void notifyPermsCallback(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("granted", isGranted() || getPermissionState("notifications") == PermissionState.GRANTED);
        call.resolve(ret);
    }

    @PluginMethod
    public void showNotification(PluginCall call) {
        String title = call.getString("title", "MUNAF SHOP");
        String body = call.getString("body", "");
        int id = call.getInt("id", (int) (System.currentTimeMillis() % 100000));

        if (!isGranted()) {
            JSObject ret = new JSObject();
            ret.put("shown", false);
            ret.put("reason", "permission_denied");
            call.resolve(ret);
            return;
        }

        try {
            createNotificationChannel();
            Intent intent = new Intent(getContext(), MainActivity.class);
            intent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            int pendingFlags = Build.VERSION.SDK_INT >= Build.VERSION_CODES.M
                ? PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                : PendingIntent.FLAG_UPDATE_CURRENT;
            PendingIntent pendingIntent = PendingIntent.getActivity(getContext(), 0, intent, pendingFlags);

            int iconRes = getContext().getApplicationInfo().icon;
            if (iconRes == 0) {
                iconRes = android.R.drawable.ic_dialog_info;
            }

            NotificationCompat.Builder builder = new NotificationCompat.Builder(getContext(), CHANNEL_ID)
                .setSmallIcon(iconRes)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent);

            NotificationManagerCompat.from(getContext()).notify(id, builder.build());
            JSObject ret = new JSObject();
            ret.put("shown", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to show Android notification: " + e.getMessage());
        }
    }
}
