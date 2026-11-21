import React, { useEffect, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  Share,
  Smartphone,
  WifiOff,
  X,
} from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';
import { Locale } from '../types/shop';

interface PWAInstallButtonProps {
  locale: Locale;
  variant?: 'header' | 'menu' | 'sidebar' | 'auth';
  onBeforeOpenModal?: () => void;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  locale,
  variant = 'header',
  onBeforeOpenModal,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  useEffect(() => {
    if (!showGuideModal) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowGuideModal(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showGuideModal]);

  // Suppress button automatically if already running as installed standalone PWA
  if (isInstalled) {
    return null;
  }

  // In compact header, only render when native prompt is ready or on iOS
  if (variant === 'header' && !isInstallable && !isIOS) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      await install();
      return;
    }
    onBeforeOpenModal?.();
    setShowGuideModal(true);
  };

  const handleCopyAppLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      // Ignore clipboard failure in restricted iframes
    }
  };

  return (
    <>
      {variant === 'header' && (
        <button
          type="button"
          onClick={() => void handleClick()}
          className="inline-flex flex-col items-center justify-center px-2 py-1 rounded-xl bg-white/80 hover:bg-white text-[#B91C1C] shadow-sm cursor-pointer transition-colors"
        >
          <Download className="w-4 h-4" />
          <span className="text-[10px] font-bold leading-tight mt-0.5">
            {locale === 'bn' ? 'অ্যাপ' : 'Install'}
          </span>
        </button>
      )}

      {variant === 'menu' && (
        <button
          type="button"
          onClick={() => void handleClick()}
          className="w-full glass-3d-tile rounded-2xl p-3.5 flex items-center justify-between gap-3 text-left cursor-pointer border border-rose-200/70 bg-gradient-to-r from-rose-50/90 via-white to-amber-50/90"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#B91C1C] text-white flex items-center justify-center shrink-0 shadow-sm">
              <Smartphone className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-extrabold text-slate-900 truncate">
                {locale === 'bn'
                  ? 'অ্যাপ হিসেবে ইনস্টল করুন'
                  : 'Install as Mobile App'}
              </p>
              <p className="text-[11px] text-slate-600 truncate">
                {locale === 'bn'
                  ? 'হোম স্ক্রিনে রাখুন ও অফলাইনে ব্যবহার করুন'
                  : 'Add to Home Screen for native offline access'}
              </p>
            </div>
          </div>
          <Download className="w-4 h-4 text-[#B91C1C] shrink-0" />
        </button>
      )}

      {variant === 'sidebar' && (
        <button
          type="button"
          onClick={() => void handleClick()}
          className="w-full text-left rounded-2xl bg-amber-400/20 hover:bg-amber-400/30 border border-amber-300/35 p-3 transition-colors cursor-pointer space-y-1"
        >
          <div className="flex items-center justify-between gap-2 text-amber-200 font-bold">
            <span className="inline-flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5" />
              <span>
                {locale === 'bn' ? 'অ্যাপ ইনস্টল করুন' : 'Install App'}
              </span>
            </span>
            <Download className="w-3.5 h-3.5" />
          </div>
          <p className="text-[11px] text-red-100 leading-snug">
            {locale === 'bn'
              ? 'ডেস্কটপ বা ফোনে সরাসরি অ্যাপ হিসেবে সেভ করুন'
              : 'Install directly as a standalone desktop or mobile app'}
          </p>
        </button>
      )}

      {variant === 'auth' && (
        <button
          type="button"
          onClick={() => void handleClick()}
          className="w-full py-2.5 px-4 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200/80 text-amber-900 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <Download className="w-4 h-4 text-[#B91C1C]" />
          <span>
            {locale === 'bn'
              ? 'মোবাইল অ্যাপ হিসেবে ইনস্টল করুন'
              : 'Install as Mobile / Desktop App'}
          </span>
        </button>
      )}

      {showGuideModal && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/55 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowGuideModal(false);
          }}
        >
          <div className="w-full max-w-sm glass-3d-tile rounded-3xl p-5 space-y-4 bg-white">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <img
                  src="/assets/aistudio/file_00000000351481f488ee43b477fe5afb_522353d9.png"
                  alt="MUNAF SHOP"
                  className="w-11 h-11 rounded-2xl object-cover object-top border border-rose-200 shadow-sm shrink-0"
                />
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    {isIOS
                      ? locale === 'bn'
                        ? 'iPhone / iPad এ অ্যাপ ইনস্টল'
                        : 'Install on iPhone / iPad'
                      : locale === 'bn'
                      ? 'মোবাইল ও ডেস্কটপ অ্যাপ ইনস্টল'
                      : 'Install MUNAF SHOP App'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {locale === 'bn'
                      ? 'হোম স্ক্রিন থেকে সরাসরি অ্যাপের মতো খুলবে'
                      : 'Launches standalone just like a native app'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="p-1.5 rounded-full bg-slate-100 text-slate-600 hover:text-slate-900 cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isIOS ? (
              <ol className="space-y-2.5 text-xs text-slate-700 bg-slate-50 rounded-2xl p-3.5 border border-slate-200/80">
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#B91C1C] text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                    ১
                  </span>
                  <span>
                    {locale === 'bn' ? (
                      <>
                        Safari ব্রাউজারের নিচে{' '}
                        <strong className="inline-flex items-center gap-1 text-slate-900">
                          <Share className="w-3.5 h-3.5 inline" /> Share
                        </strong>{' '}
                        বাটনে ট্যাপ করুন।
                      </>
                    ) : (
                      <>
                        Tap the{' '}
                        <strong className="inline-flex items-center gap-1 text-slate-900">
                          <Share className="w-3.5 h-3.5 inline" /> Share
                        </strong>{' '}
                        button in Safari toolbar.
                      </>
                    )}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#B91C1C] text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                    ২
                  </span>
                  <span>
                    {locale === 'bn' ? (
                      <>
                        নিচে স্ক্রল করে{' '}
                        <strong className="text-slate-900">
                          Add to Home Screen
                        </strong>{' '}
                        এ ট্যাপ করুন এবং Add দিন।
                      </>
                    ) : (
                      <>
                        Scroll down and tap{' '}
                        <strong className="text-slate-900">
                          Add to Home Screen
                        </strong>
                        , then tap Add.
                      </>
                    )}
                  </span>
                </li>
              </ol>
            ) : (
              <div className="space-y-2.5 text-xs text-slate-700 bg-slate-50 rounded-2xl p-3.5 border border-slate-200/80">
                <p className="leading-relaxed">
                  {locale === 'bn'
                    ? '১. Chrome / Edge ব্রাউজারের মেনু (⋮) অথবা অ্যাড্রেস বারের Install আইকনে ট্যাপ করুন।'
                    : '1. Open your browser menu (⋮) or tap the Install icon in the address bar.'}
                </p>
                <p className="leading-relaxed">
                  {locale === 'bn'
                    ? '২. "Install app" বা "Add to Home screen" সিলেক্ট করুন।'
                    : '2. Choose "Install app" or "Add to Home screen".'}
                </p>
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => void handleCopyAppLink()}
                    className="w-full py-2 px-3 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-800 font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {copiedUrl ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>
                          {locale === 'bn'
                            ? 'অ্যাপ লিংক কপি হয়েছে'
                            : 'App Link Copied'}
                        </span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-600" />
                        <span>
                          {locale === 'bn'
                            ? 'সরাসরি ওপেন করতে লিংক কপি করুন'
                            : 'Copy Direct App URL'}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="w-full py-2.5 rounded-xl bg-[#B91C1C] hover:bg-[#991B1B] text-white text-xs font-bold cursor-pointer"
            >
              {locale === 'bn' ? 'বুঝেছি' : 'Got It'}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineIndicator: React.FC<{
  locale: Locale;
  hasPendingSync?: boolean;
}> = ({ locale, hasPendingSync = false }) => {
  const isOnline = useOnlineStatus();

  if (isOnline && !hasPendingSync) return null;

  if (!isOnline) {
    return (
      <div className="fixed bottom-20 lg:bottom-4 left-4 z-[65] flex items-center gap-2 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-bold text-white shadow-lg no-print">
        <WifiOff className="w-3.5 h-3.5 shrink-0" />
        <span>
          {hasPendingSync
            ? locale === 'bn'
              ? 'অফলাইন মোড — ডাটা ফোনে সেভ আছে (নেট এলে সিঙ্ক হবে)'
              : 'Offline Mode — Saved locally (will sync when online)'
            : locale === 'bn'
            ? 'অফলাইন মোড — ফোনের ডাটায় কাজ চলছে'
            : 'Offline Mode — Working from local device cache'}
        </span>
      </div>
    );
  }

  return (
    <div className="fixed bottom-20 lg:bottom-4 left-4 z-[65] flex items-center gap-2 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-lg no-print">
      <span className="w-2 h-2 rounded-full bg-white animate-ping shrink-0" />
      <span>
        {locale === 'bn'
          ? 'অনলাইন হয়েছে — অফলাইন ডাটা ক্লাউডে সিঙ্ক হচ্ছে...'
          : 'Back Online — Syncing offline changes to cloud...'}
      </span>
    </div>
  );
};
