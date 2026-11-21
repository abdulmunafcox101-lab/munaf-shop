import React, { useEffect, useState } from 'react';
import { Timestamp } from 'firebase/firestore';
import {
  AlertTriangle,
  CalendarClock,
  Clock,
  Crown,
  Sparkles,
  Timer,
} from 'lucide-react';
import { Locale, PlanTier, ShopProfile } from '../types/shop';

export function formatExactDateTime(
  value: Timestamp | number | null | undefined,
  locale: Locale
): string {
  if (value === null || value === undefined) return '—';
  try {
    const date =
      typeof value === 'number' ? new Date(value) : value.toDate();
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString(locale === 'bn' ? 'bn-BD' : 'en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '—';
  }
}

export function toDatetimeLocalValue(ms: number): string {
  const date = new Date(ms);
  const tzOffsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(ms - tzOffsetMs).toISOString().slice(0, 16);
}

export function fromDatetimeLocalValue(val: string): number | undefined {
  if (!val) return undefined;
  const parsed = new Date(val).getTime();
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function padTwo(num: number, locale: Locale): string {
  const s = String(Math.max(0, Math.floor(num))).padStart(2, '0');
  if (locale !== 'bn') return s;
  const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return s.replace(/\d/g, (d) => bnDigits[Number(d)] ?? d);
}

export function toBnNumber(num: number, locale: Locale): string {
  const s = String(Math.max(0, Math.floor(num)));
  if (locale !== 'bn') return s;
  const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return s.replace(/\d/g, (d) => bnDigits[Number(d)] ?? d);
}

export function getPlanDisplayName(tier: PlanTier | undefined, locale: Locale): string {
  if (tier === 'business') return locale === 'bn' ? 'বিজনেস প্লাস' : 'Business Plus';
  if (tier === 'pro') return locale === 'bn' ? 'টেলিকম প্রো' : 'Telecom Pro';
  return locale === 'bn' ? 'ফ্রি খাতা' : 'Free Khata';
}

export function getRemainingDaysQuick(
  shop: Pick<ShopProfile, 'planTier' | 'planExpiresAt'>,
  nowMs: number
): { hasExpiry: boolean; isExpired: boolean; daysLeft: number } {
  const tier = shop.planTier ?? 'free';
  if (tier === 'free' || !shop.planExpiresAt) {
    return { hasExpiry: false, isExpired: false, daysLeft: 0 };
  }
  const expMs = shop.planExpiresAt.toMillis();
  const diff = expMs - nowMs;
  if (diff <= 0) {
    return { hasExpiry: true, isExpired: true, daysLeft: 0 };
  }
  return {
    hasExpiry: true,
    isExpired: false,
    daysLeft: Math.ceil(diff / 86400_000),
  };
}

interface CountdownState {
  hasSchedule: boolean;
  isExpired: boolean;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  percentRemaining: number;
  startMs: number | null;
  endMs: number | null;
}

export function useLiveCountdown(
  startedAt: Timestamp | null | undefined,
  expiresAt: Timestamp | null | undefined
): CountdownState {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!expiresAt) return;
    setNowMs(Date.now());
    const id = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(id);
  }, [expiresAt]);

  if (!expiresAt) {
    return {
      hasSchedule: false,
      isExpired: false,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      percentRemaining: 0,
      startMs: startedAt ? startedAt.toMillis() : null,
      endMs: null,
    };
  }

  const endMs = expiresAt.toMillis();
  const startMs = startedAt ? startedAt.toMillis() : endMs - 30 * 86400_000;
  const totalMs = Math.max(60_000, endMs - startMs);
  const remainingMs = Math.max(0, endMs - nowMs);
  const isExpired = remainingMs <= 0;

  const totalSeconds = Math.floor(remainingMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const percentRemaining = Math.max(
    0,
    Math.min(100, Math.round((remainingMs / totalMs) * 100))
  );

  return {
    hasSchedule: true,
    isExpired,
    days,
    hours,
    minutes,
    seconds,
    percentRemaining,
    startMs,
    endMs,
  };
}

interface PackageCountdownBannerProps {
  shop: ShopProfile;
  locale: Locale;
  variant?: 'full' | 'compact' | 'admin-mini';
  onUpgradeClick?: () => void;
}

export const PackageCountdownBanner: React.FC<PackageCountdownBannerProps> = ({
  shop,
  locale,
  variant = 'full',
  onUpgradeClick,
}) => {
  const tier: PlanTier = shop.planTier ?? 'free';
  const isPaid = tier === 'pro' || tier === 'business';
  const countdown = useLiveCountdown(shop.planStartedAt, shop.planExpiresAt);

  const cycleLabel =
    shop.planBillingCycle === 'yearly'
      ? locale === 'bn'
        ? 'বার্ষিক প্ল্যান'
        : 'Yearly Plan'
      : shop.planBillingCycle === 'monthly'
      ? locale === 'bn'
        ? 'মাসিক প্ল্যান'
        : 'Monthly Plan'
      : locale === 'bn'
      ? 'সক্রিয় মেয়াদ'
      : 'Active Cycle';

  if (variant === 'compact') {
    return (
      <button
        type="button"
        onClick={onUpgradeClick}
        className="w-full text-left rounded-2xl bg-white/10 hover:bg-white/16 border border-white/20 p-3 transition-colors cursor-pointer space-y-2"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-300 truncate">
            <Crown className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{getPlanDisplayName(tier, locale)}</span>
          </span>
          {isPaid && countdown.hasSchedule && (
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                countdown.isExpired
                  ? 'bg-rose-500/30 text-rose-100 border border-rose-300/30'
                  : 'bg-emerald-500/25 text-emerald-100 border border-emerald-300/30'
              }`}
            >
              {countdown.isExpired
                ? locale === 'bn'
                  ? 'মেয়াদ শেষ'
                  : 'Expired'
                : `${toBnNumber(countdown.days, locale)} ${locale === 'bn' ? 'দিন' : 'd'}`}
            </span>
          )}
        </div>

        {isPaid && countdown.hasSchedule ? (
          <>
            <div className="font-mono-num text-xs font-bold text-white tracking-tight">
              {countdown.isExpired ? (
                <span className="text-rose-200">
                  {locale === 'bn' ? 'রিনিউ প্রয়োজন (০০:০০:০০)' : 'Renewal Needed'}
                </span>
              ) : (
                <span>
                  {padTwo(countdown.days, locale)}
                  {locale === 'bn' ? 'দি ' : 'd '}
                  {padTwo(countdown.hours, locale)}
                  {locale === 'bn' ? 'ঘ ' : 'h '}
                  {padTwo(countdown.minutes, locale)}
                  {locale === 'bn' ? 'মি ' : 'm '}
                  {padTwo(countdown.seconds, locale)}
                  {locale === 'bn' ? 'সে' : 's'}
                </span>
              )}
            </div>

            <div className="h-1.5 w-full rounded-full bg-white/15 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  countdown.isExpired
                    ? 'bg-rose-400'
                    : countdown.percentRemaining <= 20
                    ? 'bg-amber-300'
                    : 'bg-emerald-400'
                }`}
                style={{ width: `${countdown.percentRemaining}%` }}
              />
            </div>

            <div className="space-y-0.5 text-[10px] text-red-100/90 font-mono-num">
              <p className="truncate">
                {locale === 'bn' ? 'শুরু: ' : 'Start: '}
                {formatExactDateTime(shop.planStartedAt, locale)}
              </p>
              <p className="truncate">
                {locale === 'bn' ? 'শেষ: ' : 'End: '}
                {formatExactDateTime(shop.planExpiresAt, locale)}
              </p>
            </div>
          </>
        ) : (
          <p className="text-[11px] text-red-100 leading-snug">
            {isPaid
              ? locale === 'bn'
                ? 'প্রিমিয়াম সুবিধা সক্রিয় আছে'
                : 'Premium features active'
              : locale === 'bn'
              ? 'টেলিকম প্রো / বিজনেস প্লাসে আপগ্রেড করুন →'
              : 'Upgrade to Telecom Pro / Business →'}
          </p>
        )}
      </button>
    );
  }

  if (variant === 'admin-mini') {
    if (!isPaid && !countdown.hasSchedule) {
      return (
        <div className="glass-3d-tile rounded-xl px-3 py-2 text-xs text-slate-600 flex items-center justify-between gap-2">
          <span>
            {locale === 'bn' ? 'ফ্রি খাতা চালু (কোনো পেইড মেয়াদ নেই)' : 'Free Tier (No expiry schedule)'}
          </span>
          {onUpgradeClick && (
            <button
              type="button"
              onClick={onUpgradeClick}
              className="text-[11px] font-bold text-[#B91C1C] hover:underline cursor-pointer shrink-0"
            >
              {locale === 'bn' ? 'মেয়াদ সেট করুন' : 'Set Plan & Expiry'}
            </button>
          )}
        </div>
      );
    }

    return (
      <div
        className={`rounded-xl border px-3.5 py-2.5 space-y-2 text-xs ${
          countdown.isExpired
            ? 'bg-rose-50/90 border-rose-200'
            : 'bg-slate-900 text-white border-slate-800'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 font-bold">
            <Timer
              className={`w-3.5 h-3.5 shrink-0 ${
                countdown.isExpired ? 'text-rose-600' : 'text-amber-300'
              }`}
            />
            <span className={countdown.isExpired ? 'text-rose-900' : 'text-white'}>
              {getPlanDisplayName(tier, locale)}
              {shop.planBillingCycle ? ` · ${cycleLabel}` : ''}
            </span>
          </div>

          {countdown.hasSchedule ? (
            <span
              className={`font-mono-num font-bold text-xs ${
                countdown.isExpired ? 'text-rose-700' : 'text-emerald-300'
              }`}
            >
              {countdown.isExpired
                ? locale === 'bn'
                  ? 'মেয়াদ শেষ'
                  : 'Expired'
                : `${padTwo(countdown.days, locale)}${locale === 'bn' ? 'দি ' : 'd '}${padTwo(
                    countdown.hours,
                    locale
                  )}${locale === 'bn' ? 'ঘ ' : 'h '}${padTwo(countdown.minutes, locale)}${
                    locale === 'bn' ? 'মি ' : 'm '
                  }${padTwo(countdown.seconds, locale)}${locale === 'bn' ? 'সে' : 's'}`}
            </span>
          ) : (
            <span className="text-[11px] text-amber-200 font-semibold">
              {locale === 'bn' ? 'কাস্টম মেয়াদ নির্ধারিত নেই' : 'No expiry set'}
            </span>
          )}
        </div>

        {countdown.hasSchedule && (
          <>
            <div
              className={`h-1.5 w-full rounded-full overflow-hidden ${
                countdown.isExpired ? 'bg-rose-200' : 'bg-white/15'
              }`}
            >
              <div
                className={`h-full rounded-full ${
                  countdown.isExpired
                    ? 'bg-rose-600'
                    : countdown.percentRemaining <= 20
                    ? 'bg-amber-400'
                    : 'bg-emerald-400'
                }`}
                style={{ width: `${countdown.percentRemaining}%` }}
              />
            </div>

            <div
              className={`grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] font-mono-num ${
                countdown.isExpired ? 'text-rose-800' : 'text-slate-300'
              }`}
            >
              <p className="truncate">
                <span className="opacity-80">
                  {locale === 'bn' ? 'মেয়াদ শুরু: ' : 'Start: '}
                </span>
                <span className="font-semibold">
                  {formatExactDateTime(shop.planStartedAt, locale)}
                </span>
              </p>
              <p className="truncate">
                <span className="opacity-80">
                  {locale === 'bn' ? 'মেয়াদ শেষ: ' : 'Expires: '}
                </span>
                <span className="font-semibold">
                  {formatExactDateTime(shop.planExpiresAt, locale)}
                </span>
              </p>
            </div>
          </>
        )}
      </div>
    );
  }

  // Full Futuristic 3D Glass Countdown Card
  return (
    <div className="relative glass-sheen animate-3d-enter overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950/95 via-[#1a0b12]/95 to-[#3a0a12]/95 backdrop-blur-[20px] border border-white/20 p-5 sm:p-6 text-white shadow-[0_24px_48px_-14px_rgba(15,23,42,0.52),inset_0_1px_0_rgba(255,255,255,0.22)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-24 w-64 h-64 rounded-full bg-red-500/20 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -left-24 w-64 h-64 rounded-full bg-amber-400/10 blur-3xl"
      />

      <div className="relative space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-[11px] font-bold tracking-wider text-amber-300 text-3d-amber-glow">
              <Timer className="w-4 h-4" />
              <span>
                {locale === 'bn'
                  ? 'লাইভ প্যাকেজ মেয়াদ ও কাউন্টডাউন'
                  : 'Live Subscription Countdown'}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white text-3d-light">
                {getPlanDisplayName(tier, locale)}
              </h3>
              {isPaid && (
                <span className="glass-text-plate-dark px-2.5 py-0.5 text-[11px] font-bold rounded-lg text-amber-200">
                  {cycleLabel}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isPaid && countdown.hasSchedule ? (
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border ${
                  countdown.isExpired
                    ? 'bg-rose-500/25 border-rose-300/40 text-rose-100'
                    : countdown.percentRemaining <= 20
                    ? 'bg-amber-500/25 border-amber-300/40 text-amber-100'
                    : 'bg-emerald-500/20 border-emerald-300/35 text-emerald-200'
                }`}
              >
                {countdown.isExpired ? (
                  <AlertTriangle className="w-3.5 h-3.5" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                <span>
                  {countdown.isExpired
                    ? locale === 'bn'
                      ? 'মেয়াদ শেষ হয়েছে'
                      : 'Package Expired'
                    : locale === 'bn'
                    ? `অবশিষ্ট ${toBnNumber(countdown.percentRemaining, locale)}%`
                    : `${countdown.percentRemaining}% Remaining`}
                </span>
              </span>
            ) : (
              onUpgradeClick && (
                <button
                  type="button"
                  onClick={onUpgradeClick}
                  className="btn-3d inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl cursor-pointer"
                >
                  <Crown className="w-3.5 h-3.5" />
                  <span>
                    {locale === 'bn' ? 'প্যাকেজ অ্যাক্টিভ করুন' : 'Activate Pro Plan'}
                  </span>
                </button>
              )
            )}
          </div>
        </div>

        {isPaid && countdown.hasSchedule ? (
          <>
            <div className="grid grid-cols-4 gap-2.5 sm:gap-4">
              {(
                [
                  [countdown.days, locale === 'bn' ? 'দিন' : 'Days'],
                  [countdown.hours, locale === 'bn' ? 'ঘণ্টা' : 'Hours'],
                  [countdown.minutes, locale === 'bn' ? 'মিনিট' : 'Minutes'],
                  [countdown.seconds, locale === 'bn' ? 'সেকেন্ড' : 'Seconds'],
                ] as [number, string][]
              ).map(([val, unit]) => (
                <div
                  key={unit}
                  className={`card-3d-depth rounded-2xl px-2 py-3.5 sm:py-4 text-center backdrop-blur-[20px] border shadow-[0_14px_28px_-10px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.22)] ${
                    countdown.isExpired
                      ? 'bg-rose-950/55 border-rose-300/30'
                      : 'bg-white/10 border-white/20'
                  }`}
                >
                  <p className="font-mono-num tabular-nums text-2xl sm:text-4xl font-bold tracking-tight text-white text-3d-light">
                    {padTwo(val, locale)}
                  </p>
                  <p className="mt-1 text-[11px] sm:text-xs font-semibold text-red-100/85">
                    {unit}
                  </p>
                </div>
              ))}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300">
                <span>
                  {locale === 'bn' ? 'প্যাকেজ সময়কাল অগ্রগতি' : 'Subscription Timeline'}
                </span>
                <span className="font-mono-num text-white">
                  {countdown.isExpired
                    ? locale === 'bn'
                      ? '০% বাকি'
                      : '0% left'
                    : `${toBnNumber(countdown.percentRemaining, locale)}% ${
                        locale === 'bn' ? 'সময় বাকি' : 'remaining'
                      }`}
                </span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-white/12 border border-white/10 overflow-hidden p-0.5">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    countdown.isExpired
                      ? 'bg-rose-500'
                      : countdown.percentRemaining <= 20
                      ? 'bg-gradient-to-r from-amber-400 to-orange-400'
                      : 'bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300'
                  }`}
                  style={{ width: `${countdown.percentRemaining}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/8 border border-white/15 px-4 py-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-300/30 flex items-center justify-center text-emerald-300 shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-slate-300">
                    {locale === 'bn' ? 'মেয়াদ শুরু টাইম' : 'Package Start Time'}
                  </p>
                  <p className="text-xs sm:text-sm font-bold font-mono-num text-white truncate">
                    {formatExactDateTime(shop.planStartedAt, locale)}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl bg-white/8 border border-white/15 px-4 py-3 flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${
                    countdown.isExpired
                      ? 'bg-rose-500/25 border-rose-300/40 text-rose-200'
                      : 'bg-amber-500/20 border-amber-300/30 text-amber-300'
                  }`}
                >
                  <CalendarClock className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-slate-300">
                    {locale === 'bn' ? 'মেয়াদ শেষ এর টাইম' : 'Package Expiry Time'}
                  </p>
                  <p className="text-xs sm:text-sm font-bold font-mono-num text-white truncate">
                    {formatExactDateTime(shop.planExpiresAt, locale)}
                  </p>
                </div>
              </div>
            </div>

            {countdown.isExpired && onUpgradeClick && (
              <div className="rounded-2xl bg-rose-500/20 border border-rose-300/35 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-xs text-rose-100 leading-relaxed">
                  {locale === 'bn'
                    ? 'আপনার পেইড প্যাকেজের মেয়াদ শেষ হয়ে গেছে। নিরবচ্ছিন্ন প্রিমিয়াম সেবা চালু রাখতে এখনই রিনিউ করুন।'
                    : 'Your paid subscription has expired. Renew now to continue uninterrupted premium features.'}
                </p>
                <button
                  type="button"
                  onClick={onUpgradeClick}
                  className="btn-3d px-4 py-2 text-xs font-bold bg-white text-[#991B1B] rounded-xl hover:bg-red-50 cursor-pointer shrink-0"
                >
                  {locale === 'bn' ? 'প্যাকেজ রিনিউ করুন' : 'Renew Package'}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="rounded-2xl bg-white/8 border border-white/15 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm font-bold text-white">
                {isPaid
                  ? locale === 'bn'
                    ? 'প্রিমিয়াম প্যাকেজ সক্রিয় রয়েছে'
                    : 'Premium Subscription Active'
                  : locale === 'bn'
                  ? 'ফ্রি খাতা প্যাকেজ ব্যবহার করছেন'
                  : 'You are on the Free Khata Plan'}
              </p>
              <p className="text-xs text-slate-300 leading-relaxed">
                {isPaid
                  ? locale === 'bn'
                    ? 'আপনার মেয়াদ শুরু ও শেষ হওয়ার সময় অ্যাডমিন কর্তৃক নির্ধারিত হলে এখানে লাইভ কাউন্টডাউন প্রদর্শিত হবে।'
                    : 'Once start and expiry timestamps are set, your live countdown will appear here.'
                  : locale === 'bn'
                  ? 'টেলিকম প্রো বা বিজনেস প্লাস প্যাকেজ নিলে এখানে মেয়াদ শুরু, শেষ টাইম এবং সেকেন্ড-বাই-সেকেন্ড কাউন্টডাউন চালু হবে।'
                  : 'Upgrade to Telecom Pro or Business Plus to unlock live countdown and start/expiry tracking.'}
              </p>
            </div>
            {!isPaid && onUpgradeClick && (
              <button
                type="button"
                onClick={onUpgradeClick}
                className="btn-3d px-4 py-2.5 text-xs font-bold bg-white text-[#991B1B] rounded-xl hover:bg-red-50 cursor-pointer shrink-0"
              >
                {locale === 'bn' ? 'আপগ্রেড দেখুন' : 'View Upgrades'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
