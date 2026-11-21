import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Link2,
  Lock,
  Rocket,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { AppUpdateConfig, Locale } from '../types/shop';
import { APP_VERSION_CODE, APP_VERSION_NAME } from '../lib/appVersion';
import { SUPER_ADMIN_EMAIL } from '../lib/shopService';

interface AdminAppUpdateSectionProps {
  locale: Locale;
  isSuperAdmin: boolean;
  config: AppUpdateConfig;
  onSaveAppUpdate: (input: {
    latestVersionName: string;
    latestVersionCode: number;
    minSupportedVersionCode: number;
    apkDownloadUrl: string;
    updateDescription: string;
    forceUpdate: boolean;
  }) => Promise<void>;
}

export const AdminAppUpdateSection: React.FC<AdminAppUpdateSectionProps> = ({
  locale,
  isSuperAdmin,
  config,
  onSaveAppUpdate,
}) => {
  const [latestVersionName, setLatestVersionName] = useState(config.latestVersionName);
  const [latestVersionCode, setLatestVersionCode] = useState(config.latestVersionCode);
  const [minSupportedVersionCode, setMinSupportedVersionCode] = useState(
    config.minSupportedVersionCode
  );
  const [apkDownloadUrl, setApkDownloadUrl] = useState(config.apkDownloadUrl);
  const [updateDescription, setUpdateDescription] = useState(config.updateDescription);
  const [forceUpdate, setForceUpdate] = useState(config.forceUpdate);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState<string | null>(null);

  useEffect(() => {
    setLatestVersionName(config.latestVersionName);
    setLatestVersionCode(config.latestVersionCode);
    setMinSupportedVersionCode(config.minSupportedVersionCode);
    setApkDownloadUrl(config.apkDownloadUrl);
    setUpdateDescription(config.updateDescription);
    setForceUpdate(config.forceUpdate);
  }, [config]);

  const builtInApkEndpoint =
    typeof window !== 'undefined' && window.location?.origin
      ? `${window.location.origin}/api/apk-download`
      : '/api/apk-download';

  if (!isSuperAdmin) {
    return (
      <div className="glass-3d-tile rounded-2xl p-6 sm:p-8 border border-rose-200/80 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-700 shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">
              {locale === 'bn'
                ? 'App Update Management — শুধুমাত্র Owner অনুমতি'
                : 'App Update Management — Owner Only Access'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {locale === 'bn'
                ? `এই সিস্টেমে শুধুমাত্র মূল মালিক (${SUPER_ADMIN_EMAIL}) নতুন ভার্সন প্রকাশ ও বাধ্যতামূলক আপডেট চালু করতে পারবেন। সাব-অ্যাডমিনদের জন্য এই সেকশন লক করা হয়েছে।`
                : `Only the Platform Owner (${SUPER_ADMIN_EMAIL}) can publish new app versions or enable mandatory updates. Sub-admins have read-only status.`}
            </p>
          </div>
        </div>

        <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-xs grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <span className="text-slate-500">Published Version: </span>
            <span className="font-bold font-mono-num text-slate-900">
              v{config.latestVersionName} (Code {config.latestVersionCode})
            </span>
          </div>
          <div>
            <span className="text-slate-500">Min Supported Code: </span>
            <span className="font-bold font-mono-num text-slate-900">
              {config.minSupportedVersionCode}
            </span>
          </div>
          <div>
            <span className="text-slate-500">Mandatory Lock: </span>
            <span
              className={`font-bold ${
                config.forceUpdate ? 'text-rose-700' : 'text-emerald-700'
              }`}
            >
              {config.forceUpdate ? 'ACTIVE' : 'OFF'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSavedSuccess(null);

    const parsedLatest = Math.max(1, Math.round(Number(latestVersionCode) || 1));
    const parsedMin = Math.max(
      1,
      Math.min(parsedLatest, Math.round(Number(minSupportedVersionCode) || parsedLatest))
    );

    if (forceUpdate && !apkDownloadUrl.trim()) {
      setErrorMsg(
        locale === 'bn'
          ? 'Mandatory Update চালু করতে হলে একটি বৈধ APK Download Link দিন।'
          : 'Please enter a valid APK Download Link before enabling mandatory update.'
      );
      return;
    }

    setSaving(true);
    try {
      await onSaveAppUpdate({
        latestVersionName: latestVersionName.trim() || '1.0.0',
        latestVersionCode: parsedLatest,
        minSupportedVersionCode: parsedMin,
        apkDownloadUrl: apkDownloadUrl.trim(),
        updateDescription: updateDescription.trim(),
        forceUpdate,
      });
      setSavedSuccess(
        locale === 'bn'
          ? 'নতুন অ্যাপ আপডেট নীতিমালা সফলভাবে প্রকাশ ও সার্ভারের সাথে সিঙ্ক হয়েছে!'
          : 'App update policy published & synced with server!'
      );
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : locale === 'bn'
          ? 'আপডেট সেভ করতে সমস্যা হয়েছে।'
          : 'Failed to publish update policy.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDisableForce = async () => {
    setErrorMsg(null);
    setSavedSuccess(null);
    setSaving(true);
    try {
      await onSaveAppUpdate({
        latestVersionName: latestVersionName.trim() || '1.0.0',
        latestVersionCode: Math.max(1, Math.round(Number(latestVersionCode) || 1)),
        minSupportedVersionCode: Math.max(
          1,
          Math.round(Number(minSupportedVersionCode) || 1)
        ),
        apkDownloadUrl: apkDownloadUrl.trim(),
        updateDescription: updateDescription.trim(),
        forceUpdate: false,
      });
      setForceUpdate(false);
      setSavedSuccess(
        locale === 'bn'
          ? 'বাধ্যতামূলক আপডেট লক বন্ধ করা হয়েছে। এখন সব ব্যবহারকারী অ্যাপ ব্যবহার করতে পারবেন।'
          : 'Mandatory update lock disabled. Users can now access the app.'
      );
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Failed to disable mandatory update.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="glass-3d-tile rounded-2xl p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 text-xs font-bold text-[#B91C1C]">
            <ShieldCheck className="w-4 h-4" />
            <span>Owner Verified · {SUPER_ADMIN_EMAIL}</span>
          </div>
          <h3 className="text-lg font-extrabold text-slate-900">
            {locale === 'bn'
              ? 'App Update Management (বাধ্যতামূলক আপডেট নিয়ন্ত্রণ)'
              : 'App Update Management'}
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            {locale === 'bn'
              ? 'নতুন Version Code প্রকাশ করে Mandatory Update চালু করলে পুরোনো ভার্সনের সব Android ও Web অ্যাপ লক হয়ে যাবে এবং সার্ভার থেকেও পুরোনো ভার্সনের API বন্ধ হয়ে যাবে।'
              : 'Publishing a higher Version Code with Mandatory Force Update locks older app clients and rejects important API calls from outdated versions.'}
          </p>
        </div>

        <div className="rounded-2xl bg-slate-900 text-white px-4 py-3 text-xs space-y-1 shrink-0">
          <p className="text-slate-300 font-semibold">
            {locale === 'bn' ? 'বর্তমান অ্যাপ বিল্ড' : 'Current Web/APK Baseline'}
          </p>
          <p className="font-mono-num font-bold text-amber-300 text-sm">
            v{APP_VERSION_NAME} (Version Code: {APP_VERSION_CODE})
          </p>
          <p className="text-[11px] text-slate-300">
            {locale === 'bn' ? 'লাইভ স্ট্যাটাস: ' : 'Live Gate: '}
            <span
              className={
                config.forceUpdate
                  ? 'text-rose-400 font-bold'
                  : 'text-emerald-400 font-bold'
              }
            >
              {config.forceUpdate
                ? `ACTIVE (Min Code ${Math.max(
                    config.minSupportedVersionCode,
                    config.latestVersionCode
                  )})`
                : 'INACTIVE'}
            </span>
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="glass-3d-tile rounded-2xl p-5 sm:p-6 space-y-5"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {locale === 'bn' ? 'নতুন Version Name *' : 'Version Name *'}
            </label>
            <input
              type="text"
              required
              maxLength={40}
              value={latestVersionName}
              onChange={(e) => setLatestVersionName(e.target.value)}
              placeholder="e.g. 1.1.0"
              className="w-full px-3.5 py-2.5 text-sm font-bold font-mono-num bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B91C1C]"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              {locale === 'bn'
                ? 'ইউজারের স্ক্রিনে যেভাবে দেখাবে (যেমন: 1.0.1)'
                : 'Shown to users on the update gate screen'}
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {locale === 'bn' ? 'নতুন Version Code *' : 'Latest Version Code *'}
            </label>
            <input
              type="number"
              required
              min={1}
              max={1000000}
              value={latestVersionCode}
              onChange={(e) => {
                const val = Math.max(1, Number(e.target.value) || 1);
                setLatestVersionCode(val);
                setMinSupportedVersionCode(val);
              }}
              className="w-full px-3.5 py-2.5 text-sm font-bold font-mono-num bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B91C1C]"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              {locale === 'bn'
                ? `পুরোনো APK কোড (${APP_VERSION_CODE}) থেকে বড় সংখ্যা দিলে আপডেট বাধ্যতামূলক হবে`
                : `Values above ${APP_VERSION_CODE} lock existing installs`}
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {locale === 'bn'
                ? 'সর্বনিম্ন অনুমোদিত Version Code'
                : 'Min Supported Version Code'}
            </label>
            <input
              type="number"
              required
              min={1}
              max={latestVersionCode}
              value={minSupportedVersionCode}
              onChange={(e) => setMinSupportedVersionCode(Math.max(1, Number(e.target.value) || 1))}
              className="w-full px-3.5 py-2.5 text-sm font-bold font-mono-num bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B91C1C]"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              {locale === 'bn'
                ? 'এই কোডের নিচের সব ভার্সন API সহ ব্লক হবে'
                : 'Clients below this code are rejected by server & UI'}
            </p>
          </div>
        </div>

        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
            <label className="text-xs font-bold text-slate-700 inline-flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-[#B91C1C]" />
              <span>
                {locale === 'bn'
                  ? 'APK ডাউনলোড লিংক (APK Download Link) *'
                  : 'APK Download Link *'}
              </span>
            </label>
            <button
              type="button"
              onClick={() => setApkDownloadUrl(builtInApkEndpoint)}
              className="px-2.5 py-1 text-[11px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg cursor-pointer inline-flex items-center gap-1"
            >
              <Smartphone className="w-3 h-3" />
              <span>
                {locale === 'bn'
                  ? 'সার্ভারের সরাসরি APK লিংক বসান'
                  : 'Use Built-in /api/apk-download'}
              </span>
            </button>
          </div>
          <input
            type="url"
            maxLength={500}
            value={apkDownloadUrl}
            onChange={(e) => setApkDownloadUrl(e.target.value)}
            placeholder="https://example.com/munaf-shop-v1.1.0.apk"
            className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-mono-num bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B91C1C]"
          />
          <p className="mt-1 text-[11px] text-slate-500">
            {locale === 'bn'
              ? 'সরাসরি APK ফাইল URL দিন। "Update Now" বাটনে চাপ দিলে অ্যাপ এই লিংক থেকে APK ডাউনলোড ও ইনস্টল করবে।'
              : 'Direct URL to the signed/debug APK file. Pressing Update Now downloads & installs from this link.'}
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-slate-700">
              {locale === 'bn'
                ? 'আপডেটের বিবরণ (Update Description)'
                : 'Update Description (Changelog)'}
            </label>
            <span className="text-[11px] text-slate-400 font-mono-num">
              {updateDescription.length}/800
            </span>
          </div>
          <textarea
            rows={4}
            maxLength={800}
            value={updateDescription}
            onChange={(e) => setUpdateDescription(e.target.value)}
            placeholder={
              locale === 'bn'
                ? 'যেমন: • নতুন দ্রুত ক্যাশবই রিপোর্ট\n• বাগ ফিক্স ও নিরাপত্তা উন্নতি\n• কাস্টমার ছবি ও মেমো আপগ্রেড'
                : '• Security enhancements\n• Faster ledger sync\n• Bug fixes'
            }
            className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl resize-y focus:outline-none focus:ring-2 focus:ring-[#B91C1C]"
          />
        </div>

        <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-[#B91C1C] shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-slate-900">
                {locale === 'bn'
                  ? 'বাধ্যতামূলক আপডেট লক (Force Mandatory Update)'
                  : 'Force Mandatory Update Lock'}
              </p>
              <p className="text-[11px] text-slate-600 mt-0.5">
                {locale === 'bn'
                  ? 'চালু থাকলে পুরোনো ভার্সনের কেউ আপডেট ছাড়া ড্যাশবোর্ডে প্রবেশ করতে পারবে না।'
                  : 'When ON, all older app versions are locked until updated.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setForceUpdate((v) => !v)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border cursor-pointer transition-colors shrink-0 ${
              forceUpdate
                ? 'bg-rose-600 text-white border-rose-600'
                : 'bg-white text-slate-700 border-slate-300'
            }`}
          >
            {forceUpdate ? (
              <ToggleRight className="w-5 h-5" />
            ) : (
              <ToggleLeft className="w-5 h-5 text-slate-400" />
            )}
            <span>{forceUpdate ? 'ON (Mandatory)' : 'OFF'}</span>
          </button>
        </div>

        {errorMsg && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-xs font-semibold text-rose-700">
            {errorMsg}
          </div>
        )}

        {savedSuccess && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-xs font-semibold text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{savedSuccess}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2 border-t border-slate-200/80">
          {config.forceUpdate && (
            <button
              type="button"
              disabled={saving}
              onClick={handleDisableForce}
              className="px-4 py-2.5 text-xs font-bold bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-xl cursor-pointer disabled:opacity-60"
            >
              {locale === 'bn' ? 'আপডেট লক বন্ধ করুন' : 'Disable Mandatory Lock'}
            </button>
          )}

          <button
            type="submit"
            disabled={saving}
            className="btn-3d inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-[#B91C1C] hover:bg-[#991B1B] rounded-xl cursor-pointer disabled:opacity-60"
          >
            <Rocket className="w-4 h-4" />
            <span>
              {saving
                ? locale === 'bn'
                  ? 'প্রকাশ হচ্ছে...'
                  : 'Publishing...'
                : locale === 'bn'
                ? 'আপডেট প্রকাশ করুন (Publish Update)'
                : 'Publish App Update'}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
};
