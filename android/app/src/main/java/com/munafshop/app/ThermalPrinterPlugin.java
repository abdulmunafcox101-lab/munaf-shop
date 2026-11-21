package com.munafshop.app;

import android.Manifest;
import android.annotation.SuppressLint;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothManager;
import android.bluetooth.BluetoothSocket;
import android.content.Context;
import android.content.pm.PackageManager;
import android.os.Build;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(
    name = "ThermalPrinter",
    permissions = {
        @Permission(
            alias = "bluetoothScan",
            strings = { Manifest.permission.BLUETOOTH_SCAN }
        ),
        @Permission(
            alias = "bluetoothConnect",
            strings = { Manifest.permission.BLUETOOTH_CONNECT }
        )
    }
)
public class ThermalPrinterPlugin extends Plugin {
    private static final UUID SPP_UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");
    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    private boolean hasBluetoothPermissions() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            return ContextCompat.checkSelfPermission(getContext(), Manifest.permission.BLUETOOTH_CONNECT)
                == PackageManager.PERMISSION_GRANTED;
        }
        return true;
    }

    private BluetoothAdapter getBluetoothAdapter() {
        BluetoothManager bm = (BluetoothManager) getContext().getSystemService(Context.BLUETOOTH_SERVICE);
        if (bm != null && bm.getAdapter() != null) {
            return bm.getAdapter();
        }
        return BluetoothAdapter.getDefaultAdapter();
    }

    @PluginMethod
    public void requestPrinterPermissions(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !hasBluetoothPermissions()) {
            requestPermissionForAliases(new String[]{"bluetoothConnect", "bluetoothScan"}, call, "bluetoothPermsCallback");
            return;
        }
        JSObject ret = new JSObject();
        ret.put("granted", true);
        call.resolve(ret);
    }

    @PermissionCallback
    private void bluetoothPermsCallback(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("granted", hasBluetoothPermissions() || getPermissionState("bluetoothConnect") == PermissionState.GRANTED);
        call.resolve(ret);
    }

    @SuppressLint("MissingPermission")
    @PluginMethod
    public void listPairedPrinters(PluginCall call) {
        if (!hasBluetoothPermissions()) {
            requestPermissionForAliases(new String[]{"bluetoothConnect", "bluetoothScan"}, call, "listPairedCallback");
            return;
        }
        resolvePairedList(call);
    }

    @SuppressLint("MissingPermission")
    @PermissionCallback
    private void listPairedCallback(PluginCall call) {
        if (!hasBluetoothPermissions()) {
            call.reject("Bluetooth permission is required to list paired printers.");
            return;
        }
        resolvePairedList(call);
    }

    @SuppressLint("MissingPermission")
    private void resolvePairedList(PluginCall call) {
        try {
            BluetoothAdapter adapter = getBluetoothAdapter();
            if (adapter == null) {
                call.reject("Bluetooth is not supported on this device.");
                return;
            }
            if (!adapter.isEnabled()) {
                call.reject("Please turn on Bluetooth in Android settings first.");
                return;
            }
            Set<BluetoothDevice> bonded = adapter.getBondedDevices();
            JSArray devices = new JSArray();
            if (bonded != null) {
                for (BluetoothDevice dev : bonded) {
                    JSObject item = new JSObject();
                    item.put("name", dev.getName() != null ? dev.getName() : "Bluetooth Printer");
                    item.put("address", dev.getAddress());
                    devices.put(item);
                }
            }
            JSObject ret = new JSObject();
            ret.put("devices", devices);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Could not read paired printers: " + e.getMessage());
        }
    }

    @SuppressLint("MissingPermission")
    @PluginMethod
    public void printEscPosReceipt(PluginCall call) {
        String address = call.getString("deviceAddress", "");
        String receiptText = call.getString("receiptText", "");
        String shopHeader = call.getString("shopHeader", "MUNAF SHOP");

        if (address == null || address.trim().isEmpty()) {
            call.reject("Printer Bluetooth address is required.");
            return;
        }
        if (receiptText == null || receiptText.trim().isEmpty()) {
            call.reject("Receipt text cannot be empty.");
            return;
        }
        if (!hasBluetoothPermissions()) {
            call.reject("Bluetooth Connect permission is required before printing.");
            return;
        }

        BluetoothAdapter adapter = getBluetoothAdapter();
        if (adapter == null || !adapter.isEnabled()) {
            call.reject("Bluetooth is turned off. Please enable Bluetooth and pair your thermal printer.");
            return;
        }

        final String cleanAddr = address.trim();
        final String cleanHeader = shopHeader != null ? shopHeader.trim() : "MUNAF SHOP";
        final String bodyText = receiptText;

        executor.execute(() -> {
            BluetoothSocket socket = null;
            try {
                BluetoothDevice device = adapter.getRemoteDevice(cleanAddr);
                try {
                    adapter.cancelDiscovery();
                } catch (Exception ignored) {
                }

                socket = device.createRfcommSocketToServiceRecord(SPP_UUID);
                socket.connect();
                OutputStream os = socket.getOutputStream();

                // ESC @ Initialize
                os.write(new byte[]{0x1B, 0x40});
                // Center align + double emphasis for header
                os.write(new byte[]{0x1B, 0x61, 0x01});
                os.write(new byte[]{0x1B, 0x45, 0x01});
                os.write((cleanHeader + "\n").getBytes(StandardCharsets.UTF_8));
                os.write(new byte[]{0x1B, 0x45, 0x00});
                // Left align for body
                os.write(new byte[]{0x1B, 0x61, 0x00});
                os.write((bodyText + "\n\n\n").getBytes(StandardCharsets.UTF_8));
                // Feed & partial cut (ignored cleanly by printers without cutter)
                os.write(new byte[]{0x1B, 0x64, 0x03});
                os.write(new byte[]{0x1D, 0x56, 0x42, 0x00});
                os.flush();

                try {
                    Thread.sleep(250);
                } catch (InterruptedException ignored) {
                }

                JSObject ret = new JSObject();
                ret.put("printed", true);
                ret.put("deviceAddress", cleanAddr);
                call.resolve(ret);
            } catch (Exception e) {
                call.reject("Thermal print failed: " + e.getMessage());
            } finally {
                if (socket != null) {
                    try {
                        socket.close();
                    } catch (Exception ignored) {
                    }
                }
            }
        });
    }
}
