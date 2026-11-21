package com.munafshop.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AppUpdatePlugin.class);
        registerPlugin(ThermalPrinterPlugin.class);
        registerPlugin(SystemNotifyPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
