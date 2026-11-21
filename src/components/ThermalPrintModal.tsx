import React, { useEffect, useState } from 'react';
import { Bluetooth, Check, Loader2, Printer, RefreshCw, X } from 'lucide-react';
import { Locale } from '../types/shop';
import {
  getSavedPrinter,
  isNativePrinterSupported,
  listPairedBluetoothPrinters,
  PairedPrinterDevice,
  printBrowserReceiptSlip,
  printReceiptToBluetoothPrinter,
  setSavedPrinter,
} from '../lib/thermalPrinter';

interface ThermalPrintModalProps {
  locale: Locale;
  header: string;
  body58: string;
  body80: string;
  onClose: () => void;
  onSuccess?: (message: string) => void;
}

export const ThermalPrintModal: React.FC<ThermalPrintModalProps> = ({
  locale,
  header,
  body58,
  body80,
  onClose,
  onSuccess,
}) => {
  const [widthMm, setWidthMm] = useState<58 | 80>(58);
  const [devices, setDevices] = useState<PairedPrinterDevice[]>([]);
  const [selectedAddr, setSelectedAddr] = useState<string>(
    () => getSavedPrinter()?.address ?? ''
  );
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isNative = isNativePrinterSupported();
  const activeBody = widthMm === 80 ? body80 : body58;

  const loadDevices = async () => {
    if (!isNative) return;
    setLoadingDevices(true);
    setErrorMsg(null);
    try {
      const list = await listPairedBluetoothPrinters();
      setDevices(list);
      const saved = getSavedPrinter();
      if (saved && list.some((d) => d.address === saved.address)) {
        setSelectedAddr(saved.address);
      } else if (list.length > 0 && !selectedAddr) {
        setSelectedAddr(list[0].address);
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : locale === 'bn'
          ? 'পেয়ার করা প্রিন্টার খুঁজে পাওয়া যায়নি।'
          : 'Could not list paired Bluetooth printers.'
      );
    } finally {
      setLoadingDevices(false);
    }
  };

  useEffect(() => {
    if (isNative) {
      void loadDevices();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNative]);

  const handleSelectDevice = (dev: PairedPrinterDevice) => {
    setSelectedAddr(dev.address);
    setSavedPrinter(dev);
  };

  const handleBluetoothPrint = async () => {
    if (!selectedAddr) {
      setErrorMsg(
        locale === 'bn'
          ? 'অনুগ্রহ করে একটি পেয়ার করা প্রিন্টার বেছে নিন।'
          : 'Select a paired thermal printer first.'
      );
      return;
    }
    setPrinting(true);
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      await printReceiptToBluetoothPrinter(selectedAddr, header, activeBody);
      const doneText =
        locale === 'bn'
          ? 'থার্মাল প্রিন্টারে রিসিট পাঠানো হয়েছে!'
          : 'Receipt printed to thermal printer!';
      setStatusMsg(doneText);
      onSuccess?.(doneText);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : locale === 'bn'
          ? 'থার্মাল প্রিন্ট ব্যর্থ হয়েছে।'
          : 'Thermal print failed.'
      );
    } finally {
      setPrinting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] bg-slate-900/55 backdrop-blur-md flex items-center justify-center p-4 no-print"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md glass-3d-tile rounded-3xl bg-white p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-amber-300 flex items-center justify-center shrink-0">
              <Bluetooth className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                {locale === 'bn'
                  ? 'থার্মাল রিসিট প্রিন্টার (58mm / 80mm)'
                  : 'Bluetooth Thermal Printer'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {locale === 'bn'
                  ? 'ESC/POS ব্লুটুথ প্রিন্টার বা ৫৮ মিমি প্রিন্ট স্লিপ'
                  : 'Direct ESC/POS print or 58mm/80mm slip fallback'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
          {([58, 80] as const).map((mm) => (
            <button
              key={mm}
              type="button"
              onClick={() => setWidthMm(mm)}
              className={`py-2 text-xs font-bold rounded-lg cursor-pointer ${
                widthMm === mm
                  ? 'bg-white text-[#B91C1C] shadow-sm'
                  : 'text-slate-600'
              }`}
            >
              {mm}mm {locale === 'bn' ? 'পেপার' : 'Roll'}
            </button>
          ))}
        </div>

        {isNative ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">
                {locale === 'bn' ? 'পেয়ার করা ব্লুটুথ প্রিন্টার' : 'Paired Printers'}
              </span>
              <button
                type="button"
                onClick={() => void loadDevices()}
                disabled={loadingDevices}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#B91C1C] hover:underline cursor-pointer"
              >
                <RefreshCw
                  className={`w-3 h-3 ${loadingDevices ? 'animate-spin' : ''}`}
                />
                <span>{locale === 'bn' ? 'রিফ্রেশ' : 'Scan'}</span>
              </button>
            </div>

            {devices.length === 0 ? (
              <p className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5 text-xs text-amber-900">
                {loadingDevices
                  ? locale === 'bn'
                    ? 'প্রিন্টার খোঁজা হচ্ছে...'
                    : 'Searching paired printers...'
                  : locale === 'bn'
                  ? 'কোনো পেয়ার করা প্রিন্টার পাওয়া যায়নি। ফোনের Bluetooth সেটিংস থেকে প্রিন্টার Pair করে Refresh দিন।'
                  : 'No paired Bluetooth printers found. Pair your printer in Android Bluetooth settings first.'}
              </p>
            ) : (
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {devices.map((dev) => {
                  const selected = selectedAddr === dev.address;
                  return (
                    <button
                      key={dev.address}
                      type="button"
                      onClick={() => handleSelectDevice(dev)}
                      className={`w-full text-left px-3 py-2 rounded-xl border text-xs flex items-center justify-between cursor-pointer ${
                        selected
                          ? 'bg-rose-50 border-[#B91C1C] text-[#991B1B]'
                          : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-white'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="font-bold truncate">{dev.name}</p>
                        <p className="text-[10px] font-mono-num text-slate-500">
                          {dev.address}
                        </p>
                      </div>
                      {selected && <Check className="w-4 h-4 text-[#B91C1C] shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <p className="rounded-xl bg-sky-50 border border-sky-200 px-3 py-2 text-[11px] text-sky-900 font-medium">
            {locale === 'bn'
              ? 'সরাসরি ব্লুটুথ ESC/POS প্রিন্ট Android APK অ্যাপে কাজ করে। ব্রাউজারে নিচের 58mm/80mm স্লিপ প্রিন্ট ব্যবহার করুন।'
              : 'Direct Bluetooth ESC/POS printing runs inside the Android app. On web, use the 58mm/80mm slip print button below.'}
          </p>
        )}

        <div className="rounded-2xl bg-slate-900 text-slate-100 p-3.5 max-h-52 overflow-y-auto border border-slate-800">
          <p className="text-center font-mono-num font-bold text-xs text-amber-300 mb-1">
            {header}
          </p>
          <pre className="font-mono-num text-[11px] leading-relaxed whitespace-pre-wrap break-words">
            {activeBody}
          </pre>
        </div>

        {statusMsg && (
          <p className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
            {statusMsg}
          </p>
        )}
        {errorMsg && (
          <p className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
            {errorMsg}
          </p>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          {isNative && (
            <button
              type="button"
              disabled={printing || !selectedAddr}
              onClick={handleBluetoothPrint}
              className="btn-3d flex-1 py-2.5 px-3 bg-[#B91C1C] hover:bg-[#991B1B] text-white text-xs font-bold rounded-xl cursor-pointer inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {printing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Bluetooth className="w-4 h-4" />
              )}
              <span>
                {printing
                  ? locale === 'bn'
                    ? 'প্রিন্ট হচ্ছে...'
                    : 'Printing...'
                  : locale === 'bn'
                  ? 'ব্লুটুথ প্রিন্ট'
                  : 'Bluetooth Print'}
              </span>
            </button>
          )}
          <button
            type="button"
            onClick={() => printBrowserReceiptSlip(header, activeBody, widthMm)}
            className="btn-3d flex-1 py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl cursor-pointer inline-flex items-center justify-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            <span>
              {locale === 'bn'
                ? `${widthMm}mm স্লিপ প্রিন্ট`
                : `Print ${widthMm}mm Slip`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
