import React, { useState } from 'react';
import {
  BookOpenCheck,
  CloudCog,
  Eye,
  EyeOff,
  Globe,
  Headphones,
  KeyRound,
  Lock,
  Mail,
  PackageCheck,
  Phone,
  ShieldCheck,
  Store,
  User as UserIcon,
  UserPlus,
  WifiOff,
} from 'lucide-react';
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { Locale } from '../types/shop';
import {
  createShopProfile,
  phoneOrEmailToAuthEmail,
  SUPPORT_HELPLINE,
} from '../lib/shopService';
import { PWAInstallButton } from './PWAInstallBanner';

interface AuthScreenProps {
  locale: Locale;
  onToggleLocale: () => void;
}

type AuthMode = 'google' | 'login' | 'register';

function mapAuthError(err: unknown, locale: Locale): string {
  const code =
    typeof err === 'object' && err !== null && 'code' in err
      ? String((err as { code?: unknown }).code)
      : '';
  const msg = err instanceof Error ? err.message : String(err ?? '');

  if (code === 'auth/operation-not-allowed') {
    return locale === 'bn'
      ? 'Firebase Console > Authentication > Sign-in method এ গিয়ে Email/Password চালু (Enable) করুন।'
      : 'Please enable Email/Password sign-in provider in Firebase Console > Authentication > Sign-in method.';
  }
  if (code === 'auth/email-already-in-use') {
    return locale === 'bn'
      ? 'এই মোবাইল নম্বর বা ইমেইল দিয়ে আগেই অ্যাকাউন্ট খোলা হয়েছে। লগইন ট্যাব থেকে প্রবেশ করুন।'
      : 'An account with this mobile number or email already exists. Please sign in instead.';
  }
  if (
    code === 'auth/invalid-credential' ||
    code === 'auth/wrong-password' ||
    code === 'auth/user-not-found'
  ) {
    return locale === 'bn'
      ? 'মোবাইল নম্বর / ইমেইল অথবা পাসওয়ার্ড সঠিক নয়।'
      : 'Invalid mobile number / email or password.';
  }
  if (code === 'auth/weak-password') {
    return locale === 'bn'
      ? 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।'
      : 'Password must be at least 6 characters.';
  }
  if (code === 'auth/too-many-requests') {
    return locale === 'bn'
      ? 'অনেকবার ভুল চেষ্টা করা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।'
      : 'Too many attempts. Please try again later.';
  }
  return msg || (locale === 'bn' ? 'সাইন-ইন করতে সমস্যা হয়েছে।' : 'Sign-in failed.');
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  locale,
  onToggleLocale,
}) => {
  const [mode, setMode] = useState<AuthMode>('google');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [showPass, setShowPass] = useState(false);

  // Manual login state
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Manual registration state
  const [regOwnerName, setRegOwnerName] = useState('');
  const [regShopName, setRegShopName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const handleGoogleLogin = async () => {
    setError(null);
    setInfoMsg(null);
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setError(
        locale === 'bn'
          ? 'প্রথমবার Google লগইনের জন্য ইন্টারনেট চালু করুন। একবার লগইন করলে পরবর্তীতে অফলাইনেও কাজ করবে।'
          : 'Please connect to the internet for initial Google sign-in. Once signed in, the app works offline.'
      );
      return;
    }
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setError(mapAuthError(err, locale));
    } finally {
      setLoading(false);
    }
  };

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMsg(null);
    const idTrimmed = loginIdentifier.trim();
    if (!idTrimmed) {
      setError(
        locale === 'bn'
          ? 'মোবাইল নম্বর বা ইমেইল লিখুন।'
          : 'Please enter your mobile number or email.'
      );
      return;
    }
    if (!idTrimmed.includes('@') && idTrimmed.replace(/\D/g, '').length < 9) {
      setError(
        locale === 'bn'
          ? 'সঠিক ১১ সংখ্যার মোবাইল নম্বর অথবা ইমেইল লিখুন।'
          : 'Enter a valid mobile number or email address.'
      );
      return;
    }
    if (loginPassword.length < 6) {
      setError(
        locale === 'bn'
          ? 'কমপক্ষে ৬ অক্ষরের পাসওয়ার্ড দিন।'
          : 'Password must be at least 6 characters.'
      );
      return;
    }
    setLoading(true);
    try {
      const { authEmail } = phoneOrEmailToAuthEmail(idTrimmed);
      await signInWithEmailAndPassword(auth, authEmail, loginPassword);
    } catch (err) {
      setError(mapAuthError(err, locale));
    } finally {
      setLoading(false);
    }
  };

  const handleManualRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMsg(null);

    const ownerName = regOwnerName.trim();
    const shopName = regShopName.trim();
    const cleanPhone = regPhone.trim();
    const phoneDigits = cleanPhone.replace(/\D/g, '');
    const cleanEmail = regEmail.trim().toLowerCase();

    if (!ownerName) {
      setError(locale === 'bn' ? 'আপনার নাম লিখুন।' : 'Please enter your full name.');
      return;
    }
    if (!shopName) {
      setError(locale === 'bn' ? 'দোকানের নাম লিখুন।' : 'Please enter your shop name.');
      return;
    }
    if (phoneDigits.length < 9) {
      setError(
        locale === 'bn'
          ? 'সঠিক মোবাইল নম্বর দিন (যেমন: 017XXXXXXXX)।'
          : 'Please enter a valid mobile number.'
      );
      return;
    }
    if (regPassword.length < 6) {
      setError(
        locale === 'bn'
          ? 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।'
          : 'Password must be at least 6 characters.'
      );
      return;
    }

    const { authEmail } = cleanEmail
      ? phoneOrEmailToAuthEmail(cleanEmail)
      : phoneOrEmailToAuthEmail(cleanPhone);

    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, authEmail, regPassword);
      try {
        await updateProfile(cred.user, { displayName: ownerName });
      } catch {
        // Non-fatal
      }
      if (cleanEmail) {
        void sendEmailVerification(cred.user).catch(() => {
          // Non-fatal
        });
      }
      await createShopProfile(cred.user.uid, {
        shopName,
        shopSubtitle: 'MUNAF SHOP',
        ownerName,
        phone: cleanPhone,
        address: '',
        ownerEmail: cleanEmail || authEmail,
        authMethod: 'manual',
      });
    } catch (err) {
      setError(mapAuthError(err, locale));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setError(null);
    setInfoMsg(null);
    const idTrimmed = loginIdentifier.trim();
    if (!idTrimmed.includes('@')) {
      setError(
        locale === 'bn'
          ? 'পাসওয়ার্ড রিসেট করতে নিচের ঘরে আপনার নিবন্ধিত ইমেইল লিখুন।'
          : 'Enter your registered email address first to reset your password.'
      );
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, idTrimmed.toLowerCase());
      setInfoMsg(
        locale === 'bn'
          ? 'পাসওয়ার্ড রিসেট লিংক আপনার ইমেইলে পাঠানো হয়েছে।'
          : 'Password reset email has been sent.'
      );
    } catch (err) {
      setError(mapAuthError(err, locale));
    } finally {
      setLoading(false);
    }
  };

  const highlights = [
    {
      icon: BookOpenCheck,
      title:
        locale === 'bn' ? 'স্মার্ট টালিখাতা ও বাকি তাগাদা' : 'Smart TallyKhata & Due Alerts',
      desc:
        locale === 'bn'
          ? 'ক্রেতা-সাপ্লায়ারের দিলাম/পেলাম হিসাব, বাকি পরিশোধের তারিখ ও SMS/WhatsApp তাগাদা।'
          : 'Customer & supplier ledger, payment due dates, and instant SMS or WhatsApp reminders.',
    },
    {
      icon: PackageCheck,
      title:
        locale === 'bn'
          ? 'POS বিলিং, বারকোড স্ক্যান ও মেমো'
          : 'POS Cart, Barcode Scan & Digital Memo',
      desc:
        locale === 'bn'
          ? 'ক্যামেরা দিয়ে বারকোড স্ক্যান, কার্ট চেকআউট, প্রিন্টযোগ্য মেমো ও মেয়াদ সতর্কতা।'
          : 'Camera barcode scanning, multi-item checkout, printable receipts, and expiry tracking.',
    },
    {
      icon: WifiOff,
      title:
        locale === 'bn'
          ? 'অফলাইন ও অনলাইনে সমানভাবে সচল'
          : 'Seamless Offline & Cloud Sync',
      desc:
        locale === 'bn'
          ? 'ইন্টারনেট না থাকলেও দোকানদারি থামবে না — অনলাইন হলেই ডাটা অটো ব্যাকআপ হবে।'
          : 'Keep selling and recording transactions without internet; data syncs automatically.',
    },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-10">
      <div className="w-full max-w-5xl glass-card animate-3d-enter rounded-3xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch shadow-2xl">
        {/* Left Hero Brand & Feature Column */}
        <div className="lg:col-span-6 glass-3d-crimson glass-sheen p-6 sm:p-8 lg:p-10 text-white flex flex-col justify-between gap-8 relative overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-amber-300/15 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-24 -left-16 w-64 h-64 rounded-full bg-rose-400/15 blur-3xl"
          />

          <div className="relative space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <img
                  src="/assets/aistudio/file_00000000351481f488ee43b477fe5afb_522353d9.png"
                  alt="MUNAF SHOP"
                  referrerPolicy="no-referrer"
                  className="w-12 h-12 rounded-2xl object-cover object-top border-2 border-amber-300/80 shadow-md shrink-0"
                />
                <div>
                  <p className="text-lg font-extrabold tracking-tight leading-none text-3d-light">
                    MUNAF SHOP
                  </p>
                  <p className="text-xs text-amber-200/95 font-medium mt-1 text-3d-amber-glow">
                    {locale === 'bn'
                      ? 'মোনাফ টেলিকম · ডিজিটাল ব্যবসা সহকারী'
                      : 'Digital Shop Khata & POS Suite'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onToggleLocale}
                className="glass-text-plate-dark inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl cursor-pointer whitespace-nowrap shrink-0 min-h-[40px]"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>{locale === 'bn' ? 'English' : 'বাংলা'}</span>
              </button>
            </div>

            <div className="space-y-3 pt-1">
              <h1 className="text-2xl sm:text-3xl font-extrabold leading-tight tracking-tight text-3d-light">
                {locale === 'bn'
                  ? 'আপনার পুরো দোকানের হিসাব, স্টক ও MFS — এক জায়গায় নিরাপদে।'
                  : 'Complete shop ledger, POS stock & MFS register — built for speed.'}
              </h1>
              <p className="text-sm text-red-100/95 leading-relaxed max-w-xl">
                {locale === 'bn'
                  ? 'খাতা-কলমের ঝামেলা ছাড়াই প্রতিদিনকার বাকি, নগদ ক্যাশ, টেলিকম রিচার্জ এবং লাভ-ক্ষতির সঠিক হিসাব রাখুন।'
                  : 'Leave paper notebooks behind with real-time credit tracking, daily cashbook, telecom register, and profit analytics.'}
              </p>
            </div>

            <div className="space-y-3.5 pt-2">
              {highlights.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="glass-text-plate-dark card-3d-depth flex items-start gap-3.5 rounded-2xl p-3.5"
                  >
                    <div className="w-9 h-9 rounded-xl bg-amber-300/20 border border-amber-200/30 text-amber-200 flex items-center justify-center shrink-0 mt-0.5">
                      <Icon className="w-4.5 h-4.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white leading-snug text-3d-light">
                        {item.title}
                      </p>
                      <p className="text-xs text-red-100/90 mt-0.5 leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="relative pt-4 border-t border-white/15 flex flex-wrap items-center justify-between gap-3 text-xs text-red-100">
            <span className="inline-flex items-center gap-1.5 font-medium">
              <CloudCog className="w-4 h-4 text-amber-300" />
              <span>
                {locale === 'bn'
                  ? 'ক্লাউড সিঙ্ক ও পিন লক সুরক্ষা'
                  : 'Cloud Sync & PIN Lock Security'}
              </span>
            </span>
            <a
              href={`tel:${SUPPORT_HELPLINE}`}
              className="inline-flex items-center gap-1.5 font-mono-num font-bold text-amber-200 hover:text-white transition-colors"
            >
              <Headphones className="w-3.5 h-3.5" />
              <span>{SUPPORT_HELPLINE}</span>
            </a>
          </div>
        </div>

        {/* Right Sign-In & Manual Registration Column */}
        <div className="lg:col-span-6 bg-white/90 p-6 sm:p-8 flex flex-col justify-center gap-5">
          <div className="space-y-1.5">
            <p className="text-xs font-bold text-[#991B1B] tracking-wide">
              {locale === 'bn' ? 'নিরাপদ প্রবেশ ও রেজিস্ট্রেশন' : 'Secure Access & Sign Up'}
            </p>
            <h2 className="text-2xl font-extrabold text-slate-900 text-3d-dark">
              {mode === 'register'
                ? locale === 'bn'
                  ? 'নতুন দোকান রেজিস্ট্রার করুন'
                  : 'Register New Shop'
                : mode === 'login'
                ? locale === 'bn'
                  ? 'নম্বর বা ইমেইল দিয়ে লগইন'
                  : 'Manual Sign In'
                : locale === 'bn'
                ? 'দোকানে লগইন করুন'
                : 'Sign in to Your Shop'}
            </h2>
          </div>

          {/* Segmented Mode Switcher */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => {
                setMode('google');
                setError(null);
                setInfoMsg(null);
              }}
              className={`py-2 px-2 rounded-xl text-[11px] sm:text-xs font-bold cursor-pointer transition-all ${
                mode === 'google'
                  ? 'bg-white text-[#B91C1C] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Google
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
                setInfoMsg(null);
              }}
              className={`py-2 px-2 rounded-xl text-[11px] sm:text-xs font-bold cursor-pointer transition-all ${
                mode === 'login'
                  ? 'bg-white text-[#B91C1C] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {locale === 'bn' ? 'নম্বর লগইন' : 'Sign In'}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
                setInfoMsg(null);
              }}
              className={`py-2 px-2 rounded-xl text-[11px] sm:text-xs font-bold cursor-pointer transition-all ${
                mode === 'register'
                  ? 'bg-[#B91C1C] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {locale === 'bn' ? 'ম্যানুয়াল রেজিস্ট্রার' : 'Register'}
            </button>
          </div>

          {error && (
            <p className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5 leading-relaxed">
              {error}
            </p>
          )}
          {infoMsg && (
            <p className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-2.5 leading-relaxed">
              {infoMsg}
            </p>
          )}

          {mode === 'google' && (
            <div className="space-y-4">
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {locale === 'bn'
                  ? 'আপনার Google অ্যাকাউন্ট দিয়ে এক ক্লিকে লগইন করুন অথবা উপরে "ম্যানুয়াল রেজিস্ট্রার" ট্যাব থেকে মোবাইল নম্বর দিয়ে নতুন খাতা খুলুন।'
                  : 'Sign in instantly with Google, or use Mobile Number & Manual Registration above.'}
              </p>

              <div className="space-y-2.5 py-2 border-y border-slate-200/80 text-xs text-slate-700">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    {locale === 'bn'
                      ? 'কোনো ফেক বা ডেমো ডাটা নয় — প্রথমবার লগইনেই আপনার নিজের হিসাব শুরু'
                      : 'Zero fake demo data — start immediately with your own clean ledger'}
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    {locale === 'bn'
                      ? 'ফোন হারিয়ে গেলেও কেবল নম্বর বা ইমেইল দিয়ে সব ডাটা ফেরত পাবেন'
                      : 'Recover your entire business history anytime across devices'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                disabled={loading}
                onClick={handleGoogleLogin}
                className="btn-3d w-full min-h-[48px] py-3 px-5 bg-[#B91C1C] hover:bg-[#991B1B] text-white text-sm font-bold rounded-xl cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2.5"
              >
                <span>
                  {loading
                    ? locale === 'bn'
                      ? 'লগইন হচ্ছে...'
                      : 'Signing in...'
                    : locale === 'bn'
                    ? 'Google দিয়ে দোকানে প্রবেশ করুন'
                    : 'Continue with Google'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setError(null);
                }}
                className="w-full py-2.5 px-4 border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold rounded-xl cursor-pointer flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4 text-[#B91C1C]" />
                <span>
                  {locale === 'bn'
                    ? 'মোবাইল নম্বর দিয়ে ম্যানুয়ালি রেজিস্ট্রার করুন'
                    : 'Register Manually with Mobile Number'}
                </span>
              </button>
            </div>
          )}

          {mode === 'login' && (
            <form onSubmit={handleManualLogin} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {locale === 'bn' ? 'মোবাইল নম্বর অথবা ইমেইল *' : 'Mobile Number or Email *'}
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    placeholder={
                      locale === 'bn'
                        ? '017XXXXXXXX অথবা email@example.com'
                        : '017XXXXXXXX or email@example.com'
                    }
                    className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B91C1C]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {locale === 'bn' ? 'পাসওয়ার্ড *' : 'Password *'}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••"
                    className="w-full pl-9 pr-10 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B91C1C]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="p-1 text-slate-400 hover:text-slate-700 absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer"
                    aria-label="Toggle password visibility"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={handleResetPassword}
                  className="text-slate-600 hover:text-[#B91C1C] font-semibold cursor-pointer inline-flex items-center gap-1"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>{locale === 'bn' ? 'পাসওয়ার্ড ভুলে গেছেন?' : 'Forgot Password?'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className="font-bold text-[#B91C1C] hover:underline cursor-pointer"
                >
                  {locale === 'bn' ? 'নতুন অ্যাকাউন্ট খুলুন' : 'Create Account'}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-3d w-full min-h-[46px] py-3 px-5 bg-[#B91C1C] hover:bg-[#991B1B] text-white text-sm font-bold rounded-xl cursor-pointer disabled:opacity-60"
              >
                {loading
                  ? locale === 'bn'
                    ? 'প্রবেশ করা হচ্ছে...'
                    : 'Signing in...'
                  : locale === 'bn'
                  ? 'লগইন করুন'
                  : 'Sign In'}
              </button>
            </form>
          )}

          {mode === 'register' && (
            <form onSubmit={handleManualRegister} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {locale === 'bn' ? 'আপনার নাম *' : 'Your Name *'}
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      maxLength={100}
                      value={regOwnerName}
                      onChange={(e) => setRegOwnerName(e.target.value)}
                      placeholder={locale === 'bn' ? 'যেমন: আব্দুর রহিম' : 'Owner name'}
                      className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B91C1C]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {locale === 'bn' ? 'দোকানের নাম *' : 'Shop Name *'}
                  </label>
                  <div className="relative">
                    <Store className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      maxLength={100}
                      value={regShopName}
                      onChange={(e) => setRegShopName(e.target.value)}
                      placeholder={locale === 'bn' ? 'মোনাফ স্টোর' : 'Shop name'}
                      className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B91C1C]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {locale === 'bn' ? 'মোবাইল নম্বর *' : 'Mobile Number *'}
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    maxLength={20}
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="01XXXXXXXXX"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-xl font-mono-num focus:outline-none focus:ring-2 focus:ring-[#B91C1C]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {locale === 'bn' ? 'ইমেইল (ঐচ্ছিক — রিকভারির জন্য)' : 'Email (Optional)'}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    maxLength={140}
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="name@gmail.com"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B91C1C]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {locale === 'bn' ? 'পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর) *' : 'Password (min 6 chars) *'}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="••••••"
                    className="w-full pl-9 pr-10 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B91C1C]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="p-1 text-slate-400 hover:text-slate-700 absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer"
                    aria-label="Toggle password visibility"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-3d w-full min-h-[46px] py-3 px-5 bg-[#B91C1C] hover:bg-[#991B1B] text-white text-sm font-bold rounded-xl cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>
                  {loading
                    ? locale === 'bn'
                      ? 'অ্যাকাউন্ট তৈরি হচ্ছে...'
                      : 'Creating Account...'
                    : locale === 'bn'
                    ? 'রেজিস্ট্রার ও খাতা শুরু করুন'
                    : 'Register & Start Khata'}
                </span>
              </button>
            </form>
          )}

          <PWAInstallButton locale={locale} variant="auth" />

          <div className="pt-1 flex items-center justify-between text-xs text-slate-500">
            <span>{locale === 'bn' ? 'সহায়তা হেল্পলাইন' : 'Support Helpline'}</span>
            <a
              href={`tel:${SUPPORT_HELPLINE}`}
              className="font-mono-num font-bold text-[#B91C1C] hover:underline"
            >
              {SUPPORT_HELPLINE}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
