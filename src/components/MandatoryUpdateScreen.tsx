import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowDownToLine,
  CheckCircle2,
  ExternalLink,
  Globe,
  Lock,
  RefreshCw,
  Settings,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { AppUpdateConfig, Locale } from '../types/shop';
import {
  ApkDownloadProgress,
  InstalledAppVersion,
  openAndroidInstallSettings,
  openExternalApkUrl,
  triggerNativeApkInstall,
} from '../lib/appVersion';
import { normalizeSafeUpdateUrl, SUPPORT_HELPLINE } from '../lib/shopService';

interface MandatoryUpdateScreenProps {
  locale: Locale;
  onToggleLocale?: () => void;
  installedVersion: InstalledAppVersion;
  config: AppUpdateConfig;
  onRecheckUpdate: () => Promise<void>;
  onForceDismiss?: () => void;
}

function formatMb(bytes?: number): string {
  if (!bytes || bytes <= 0) return '0 MB';
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const MandatoryUpdateScreen: React.FC<MandatoryUpdateScreenProps> = ({
  locale,
  onToggleLocale,
  installedVersion,
  config,
  onRecheckUpdate,
  onForceDismiss,
}) => {
  const [downloading, setDownloading] = useState(false);
  const [rechecking, setRechecking] = useState(false);
  const [progress, setProgress] = useState<ApkDownloadProgress | null>(null);
  const [needsPermission, setNeedsPermission] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const downloadUrl =
    normalizeSafeUpdateUrl(config.apkDownloadUrl) ||
    (typeof window !== 'undefined' && window.location?.origin
      ? `${window.location.origin}/api/apk-download`
      : '');

  const handleUpdateNow = async () => {
    setErrorMsg(null);
    setStatusMessage(null);
    setNeedsPermission(false);

    if (!downloadUrl) {
      setErrorMsg(
        locale === 'bn'
          ? 'APK ডাউনলোড লিংক এখনো কনফিগার করা হয়নি। অনুগ্রহ করে অ্যাডমিনের সাথে যোগাযোগ করুন।'
          : 'APK download link is not configured yet. Please contact the shop owner.'
      );
      return;
    }

    setDownloading(true);
    setProgress({ status: 'starting', percent: 0 });
    try {
      const res = await triggerNativeApkInstall(
        downloadUrl,
        config.latestVersionName,
        (prog) => {
          setProgress(prog);
          if (prog.status === 'permission_required') {
            setNeedsPermission(true);
          }
          if (prog.status === 'error' && prog.message) {
            setErrorMsg(prog.message);
          }
        }
      );

      if (res.mode === 'permission_required') {
        setNeedsPermission(true);
        setStatusMessage(
          locale === 'bn'
            ? 'অনুগ্রহ করে সেটিংস থেকে "Install unknown apps" অনুমতি চালু করে আবার Update Now চাপুন।'
            : 'Please enable "Install unknown apps" in Android Settings, then tap Update Now again.'
        );
      } else if (res.mode === 'native_installer') {
        setStatusMessage(
          locale === 'bn'
            ? 'আপডেট ফাইল প্রস্তুত! Android ইনস্টলার থেকে "Install" বাটনে চাপ দিন। ইনস্টল সম্পন্ন হলে অ্যাপ আবার চালু হবে।'
            : 'Update package ready! Tap "Install" on the Android prompt. The app will unlock automatically after updating.'
        );
      } else {
        setStatusMessage(
          locale === 'bn'
            ? 'ব্রাউজারে APK ডাউনলোড শুরু হয়েছে। ডাউনলোড শেষ হলে ফাইলটি ওপেন করে ইনস্টল করুন।'
            : 'APK download started in your browser. Open the downloaded file to install the update.'
        );
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : locale === 'bn'
          ? 'আপডেট ডাউনলোড করতে সমস্যা হয়েছে। নিচের সরাসরি লিংক ব্যবহার করুন।'
          : 'Failed to download update. Please use the direct browser download link below.'
      );
    } finally {
      setDownloading(false);
    }
  };

  const handleOpenSettings = async () => {
    const opened = await openAndroidInstallSettings();
    if (!opened) {
      setErrorMsg(
        locale === 'bn'
          ? 'ফোনের Settings > Apps > MUNAF SHOP > Install unknown apps চালু করুন।'
          : 'Open Phone Settings > Apps > MUNAF SHOP > Install unknown apps and enable it.'
      );
    }
  };

  const handleRecheck = async () => {
    setRechecking(true);
    setErrorMsg(null);
    try {
      await onRecheckUpdate();
    } finally {
      setRechecking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-gradient-to-br from-[#faf6ee] via-[#fffaf2] to-[#fbeee6] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-lg glass-3d-tile rounded-3xl overflow-hidden shadow-2xl border border-amber-200/80 my-auto">
        <div className="glass-3d-crimson px-6 py-6 text-white relative overflow-hidden">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6 text-amber-300" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-amber-200">
                  MUNAF SHOP · {locale === 'bn' ? 'বাধ্যতামূলক আপডেট' : 'Mandatory Update'}
                </p>
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
                  {locale === 'bn' ? 'নতুন ভার্সন আপডেট প্রয়োজন' : 'App Update Required'}
                </h1>
              </div>
            </div>

            {onToggleLocale && (
              <button
                type="button"
                onClick={onToggleLocale}
                className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 cursor-pointer shrink-0"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>{locale === 'bn' ? 'EN' : 'বাংলা'}</span>
              </button>
            )}
          </div>

          <p className="mt-3 text-xs sm:text-sm text-red-50 leading-relaxed">
            {locale === 'bn'
              ? 'নিরাপত্তা ও নতুন ফিচার নিশ্চিত করতে আপনার অ্যাপের পুরোনো ভার্সন সাময়িকভাবে লক করা হয়েছে। ড্যাশবোর্ড ও সকল হিসাব পুনরায় ব্যবহার করতে অনুগ্রহ করে নতুন ভার্সন ইনস্টল করুন।'
              : 'Your installed version is outdated. Dashboard and all features are locked until you install the latest version of MUNAF SHOP.'}
          </p>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-slate-100/90 border border-slate-200 px-4 py-3">
              <p className="text-[11px] font-semibold text-slate-500">
                {locale === 'bn' ? 'বর্তমান ভার্সন' : 'Installed Version'}
              </p>
              <p className="mt-1 text-base font-extrabold text-slate-800 font-mono-num">
                v{installedVersion.versionName}
              </p>
              <p className="text-[11px] text-slate-500 font-mono-num">
                Code: {installedVersion.versionCode} ({installedVersion.platform})
              </p>
            </div>

            <div className="rounded-2xl bg-emerald-50/90 border border-emerald-200 px-4 py-3">
              <p className="text-[11px] font-semibold text-emerald-700">
                {locale === 'bn' ? 'নতুন ভার্সন' : 'Latest Version'}
              </p>
              <p className="mt-1 text-base font-extrabold text-emerald-900 font-mono-num">
                v{config.latestVersionName}
              </p>
              <p className="text-[11px] text-emerald-700 font-mono-num">
                Code: {config.latestVersionCode}
              </p>
            </div>
          </div>

          {config.updateDescription && (
            <div className="rounded-2xl bg-white/85 border border-amber-200/80 p-4 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#991B1B]">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>{locale === 'bn' ? 'নতুন আপডেটে যা থাকছে:' : "What's New in This Update:"}</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-700 whitespace-pre-line leading-relaxed">
                {config.updateDescription}
              </p>
            </div>
          )}

          <div className="rounded-2xl bg-rose-50/85 border border-rose-200/80 px-4 py-3 flex items-start gap-2.5 text-xs text-rose-900">
            <Lock className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
            <span>
              {locale === 'bn'
                ? 'আপডেট সম্পন্ন না হওয়া পর্যন্ত ড্যাশবোর্ড, খাতা এন্ট্রি ও সার্ভার এপিআই কার্যক্রম বন্ধ থাকবে।'
                : 'Dashboard, ledger writes, and critical server APIs remain locked until the update is installed.'}
            </span>
          </div>

          {downloading && progress && (
            <div className="rounded-2xl bg-slate-900 text-white p-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span>
                  {progress.status === 'installing'
                    ? locale === 'bn'
                      ? 'ইনস্টলার খোলা হচ্ছে...'
                      : 'Opening Installer...'
                    : locale === 'bn'
                    ? 'APK ডাউনলোড হচ্ছে...'
                    : 'Downloading APK...'}
                </span>
                <span className="font-mono-num text-amber-300">
                  {progress.percent > 0 ? `${progress.percent}%` : '...'}
                </span>
              </div>
              <div className="w-full h-2.5 bg-white/15 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all duration-200"
                  style={{ width: `${Math.max(6, Math.min(100, progress.percent || 10))}%` }}
                />
              </div>
              {progress.downloadedBytes ? (
                <p className="text-[11px] text-slate-300 font-mono-num">
                  {formatMb(progress.downloadedBytes)}
                  {progress.totalBytes ? ` / ${formatMb(progress.totalBytes)}` : ''}
                </p>
              ) : null}
            </div>
          )}

          {needsPermission && (
            <div className="rounded-2xl bg-amber-50 border border-amber-300 p-4 space-y-2.5 text-xs text-amber-950">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <p className="font-semibold leading-relaxed">
                  {locale === 'bn'
                    ? 'আপডেট ইনস্টল করার জন্য ফোনের "Install unknown apps" অনুমতি প্রয়োজন।'
                    : 'Android requires "Install unknown apps" permission to install updates.'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenSettings}
                className="w-full py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>
                  {locale === 'bn' ? 'অ্যান্ড্রয়েড সেটিংস খুলুন' : 'Open Android Install Settings'}
                </span>
              </button>
            </div>
          )}

          {statusMessage && (
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-xs font-semibold text-emerald-800 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{statusMessage}</span>
            </div>
          )}

          {errorMsg && (
            <div className="rounded-2xl bg-rose-50 border border-rose-200 px-4 py-3 text-xs font-semibold text-rose-700">
              {errorMsg}
            </div>
          )}

          <div className="space-y-2.5">
            <button
              type="button"
              disabled={downloading}
              onClick={handleUpdateNow}
              className="btn-3d w-full py-3.5 px-5 bg-[#B91C1C] hover:bg-[#991B1B] text-white text-sm font-extrabold rounded-2xl inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 shadow-lg"
            >
              <ArrowDownToLine className="w-4.5 h-4.5" />
              <span>
                {downloading
                  ? locale === 'bn'
                    ? 'ডাউনলোড হচ্ছে...'
                    : 'Downloading Update...'
                  : locale === 'bn'
                  ? 'Update Now (এখনই আপডেট করুন)'
                  : 'Update Now'}
              </span>
            </button>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {downloadUrl && (
                <button
                  type="button"
                  onClick={() => {
                    void openExternalApkUrl(downloadUrl);
                  }}
                  className="py-2.5 px-3 bg-white/90 hover:bg-white border border-slate-300 text-slate-800 text-xs font-bold rounded-xl inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-[#B91C1C]" />
                  <span>
                    {locale === 'bn' ? 'ব্রাউজার দিয়ে ডাউনলোড' : 'Download in Browser'}
                  </span>
                </button>
              )}

              <button
                type="button"
                disabled={rechecking}
                onClick={handleRecheck}
                className="py-2.5 px-3 bg-white/90 hover:bg-white border border-slate-300 text-slate-800 text-xs font-bold rounded-xl inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${rechecking ? 'animate-spin' : ''}`} />
                <span>
                  {locale === 'bn' ? 'আপডেট পুনরায় যাচাই' : 'Recheck Version'}
                </span>
              </button>
            </div>

            {onForceDismiss && (
              <button
                type="button"
                onClick={onForceDismiss}
                className="w-full py-2.5 px-4 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-bold rounded-xl inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>
                  {locale === 'bn' ? 'আমি আপডেট করেছি (অ্যাপে প্রবেশ করুন)' : 'I Have Updated (Continue to App)'}
                </span>
              </button>
            )}
          </div>

          <p className="text-center text-[11px] text-slate-500">
            {locale === 'bn'
              ? `যেকোনো সহায়তার জন্য হেল্পলাইন: ${SUPPORT_HELPLINE}`
              : `Need help? Call Helpline: ${SUPPORT_HELPLINE}`}
          </p>
        </div>
      </div>
    </div>
  );
};
