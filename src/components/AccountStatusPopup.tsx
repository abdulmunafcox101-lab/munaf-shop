import React, { useState } from 'react';
import {
  Ban,
  Check,
  Copy,
  LogOut,
  MessageCircle,
  PhoneCall,
  Send,
  ShieldAlert,
} from 'lucide-react';
import { Locale, ShopProfile } from '../types/shop';
import { SUPPORT_HELPLINE } from '../lib/shopService';
import { formatTimestamp } from './StatusStepper';

interface AccountStatusPopupProps {
  locale: Locale;
  shop: ShopProfile;
  userEmail: string;
  onSubmitAppeal: (input: {
    subject: string;
    category: string;
    message: string;
    contactPhone: string;
  }) => Promise<void>;
  onLogout: () => Promise<void>;
}

export const AccountStatusPopup: React.FC<AccountStatusPopupProps> = ({
  locale,
  shop,
  userEmail,
  onSubmitAppeal,
  onLogout,
}) => {
  const isBanned = shop.accountStatus === 'banned';
  const [copiedUid, setCopiedUid] = useState(false);
  const [showAppealForm, setShowAppealForm] = useState(false);
  const [appealMessage, setAppealMessage] = useState('');
  const [appealPhone, setAppealPhone] = useState(shop.phone || '');
  const [submitting, setSubmitting] = useState(false);
  const [appealSent, setAppealSent] = useState(false);

  const handleCopyUid = async () => {
    try {
      await navigator.clipboard.writeText(shop.ownerUid);
      setCopiedUid(true);
      setTimeout(() => setCopiedUid(false), 2000);
    } catch {
      // Clipboard unsupported
    }
  };

  const handleSendAppeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appealMessage.trim()) return;
    setSubmitting(true);
    try {
      await onSubmitAppeal({
        subject: isBanned
          ? locale === 'bn'
            ? 'অ্যাকাউন্ট আনব্যান আপিল আবেদন'
            : 'Account Unban Appeal'
          : locale === 'bn'
          ? 'অ্যাকাউন্ট আনব্লক আপিল আবেদন'
          : 'Account Unblock Appeal',
        category: 'সাধারণ সহায়তা',
        message: appealMessage.trim(),
        contactPhone: appealPhone.trim(),
      });
      setAppealSent(true);
      setAppealMessage('');
      setShowAppealForm(false);
    } finally {
      setSubmitting(false);
    }
  };

  const waText = encodeURIComponent(
    `আসসালামু আলাইকুম, আমার দোকান "${shop.shopName}" (UID: ${shop.ownerUid}) ${
      isBanned ? 'ব্যান' : 'ব্লক'
    } করা হয়েছে। কারণ: ${shop.banReason || 'উল্লেখ নেই'}। অনুগ্রহ করে রিভিউ করুন।`
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className="w-full max-w-lg glass-3d-tile rounded-3xl overflow-hidden shadow-2xl my-auto">
        <div
          className={`px-6 py-6 text-white ${
            isBanned
              ? 'bg-gradient-to-br from-[#991B1B] via-[#7F1D1D] to-[#450A0A]'
              : 'bg-gradient-to-br from-[#D97706] via-[#B45309] to-[#78350F]'
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center shrink-0">
                {isBanned ? (
                  <Ban className="w-6 h-6 text-red-100" />
                ) : (
                  <ShieldAlert className="w-6 h-6 text-amber-100" />
                )}
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-white/80">
                  {isBanned
                    ? locale === 'bn'
                      ? 'অ্যাকাউন্ট স্ট্যাটাস · স্থায়ী ব্যান'
                      : 'Account Status · Banned'
                    : locale === 'bn'
                    ? 'অ্যাকাউন্ট স্ট্যাটাস · সাময়িক ব্লক'
                    : 'Account Status · Blocked'}
                </p>
                <h2 className="text-xl font-bold mt-0.5 leading-snug">
                  {isBanned
                    ? locale === 'bn'
                      ? 'আপনার অ্যাকাউন্টটি ব্যান করা হয়েছে'
                      : 'Your Account Has Been Banned'
                    : locale === 'bn'
                    ? 'আপনার অ্যাকাউন্টটি সাময়িক ব্লক রয়েছে'
                    : 'Your Account Is Temporarily Blocked'}
                </h2>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="rounded-2xl bg-white/85 border border-slate-200/90 p-4 space-y-2.5 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-slate-900 text-sm">
                {shop.shopName}
              </span>
              <span
                className={`px-2.5 py-1 rounded-lg font-bold border ${
                  isBanned
                    ? 'bg-rose-50 text-rose-800 border-rose-200'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}
              >
                {isBanned
                  ? locale === 'bn'
                    ? 'ব্যান (Banned)'
                    : 'Banned'
                  : locale === 'bn'
                  ? 'ব্লক (Blocked)'
                  : 'Blocked'}
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/70 text-slate-600">
              <div className="space-y-0.5 min-w-0">
                <p className="font-mono-num truncate">
                  UID: <span className="font-bold text-slate-900">{shop.ownerUid}</span>
                </p>
                <p className="truncate">
                  {userEmail || shop.ownerEmail}
                  {shop.phone ? ` · ${shop.phone}` : ''}
                </p>
                {shop.bannedAt && (
                  <p className="text-[11px] text-slate-500 font-mono-num">
                    {locale === 'bn' ? 'তারিখ: ' : 'Date: '}
                    {formatTimestamp(shop.bannedAt, locale)}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={handleCopyUid}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer shrink-0"
              >
                {copiedUid ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copiedUid ? 'কপি হয়েছে' : 'UID কপি'}</span>
              </button>
            </div>
          </div>

          <div
            className={`rounded-2xl border p-4 space-y-1.5 ${
              isBanned
                ? 'bg-rose-50/90 border-rose-200'
                : 'bg-amber-50/90 border-amber-200'
            }`}
          >
            <p
              className={`text-xs font-bold uppercase tracking-wide ${
                isBanned ? 'text-rose-800' : 'text-amber-900'
              }`}
            >
              {locale === 'bn'
                ? 'যে কারণে ব্লক / ব্যান করা হয়েছে:'
                : 'Reason for Action:'}
            </p>
            <p className="text-sm font-semibold text-slate-900 leading-relaxed whitespace-pre-wrap">
              {shop.banReason?.trim()
                ? shop.banReason
                : locale === 'bn'
                ? 'প্ল্যাটফর্ম নীতিমালা বা এডমিন যাচাইয়ের কারণে আপনার অ্যাকাউন্টটি সাময়িকভাবে সীমাবদ্ধ করা হয়েছে। বিস্তারিত জানতে সাপোর্ট হেল্পলাইনে যোগাযোগ করুন।'
                : 'Your account has been restricted by platform administration. Contact support for details.'}
            </p>
          </div>

          {appealSent && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-2.5 text-xs font-semibold text-emerald-800">
              {locale === 'bn'
                ? 'আপনার আপিল মেসেজ এডমিন প্যানেলে পাঠানো হয়েছে। রিভিউ শেষে অ্যাকাউন্ট আনব্লক হলে সাথে সাথেই খাতা দেখতে পাবেন।'
                : 'Your appeal has been sent to the admin team.'}
            </div>
          )}

          {showAppealForm && (
            <form
              onSubmit={handleSendAppeal}
              className="rounded-2xl bg-white/95 border border-slate-200 p-4 space-y-3"
            >
              <p className="text-xs font-bold text-slate-900">
                {locale === 'bn'
                  ? 'এডমিনের কাছে আপিল / ব্যাখ্যা পাঠান'
                  : 'Send Appeal to Admin'}
              </p>
              <input
                type="tel"
                maxLength={30}
                value={appealPhone}
                onChange={(e) => setAppealPhone(e.target.value)}
                placeholder={locale === 'bn' ? 'যোগাযোগের মোবাইল নম্বর' : 'Contact phone'}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl font-mono-num"
              />
              <textarea
                rows={3}
                required
                maxLength={500}
                value={appealMessage}
                onChange={(e) => setAppealMessage(e.target.value)}
                placeholder={
                  locale === 'bn'
                    ? 'আপনার ব্যাখ্যা বা সঠিক তথ্য লিখুন...'
                    : 'Explain why your account should be restored...'
                }
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl resize-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAppealForm(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  {locale === 'bn' ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-3d inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-[#B91C1C] hover:bg-[#991B1B] rounded-xl cursor-pointer disabled:opacity-60"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    {submitting
                      ? locale === 'bn'
                        ? 'পাঠানো হচ্ছে...'
                        : 'Sending...'
                      : locale === 'bn'
                      ? 'আপিল পাঠান'
                      : 'Submit Appeal'}
                  </span>
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <a
              href={`tel:${SUPPORT_HELPLINE}`}
              className="btn-3d inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-[#B91C1C] hover:bg-[#991B1B] text-white text-xs font-bold rounded-xl"
            >
              <PhoneCall className="w-4 h-4" />
              <span>{locale === 'bn' ? `হেল্পলাইন (${SUPPORT_HELPLINE})` : `Call ${SUPPORT_HELPLINE}`}</span>
            </a>

            <a
              href={`https://wa.me/88${SUPPORT_HELPLINE}?text=${waText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-3d inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl"
            >
              <MessageCircle className="w-4 h-4" />
              <span>{locale === 'bn' ? 'হোয়াটসঅ্যাপ আপিল' : 'WhatsApp Appeal'}</span>
            </a>
          </div>

          <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-200/80">
            <button
              type="button"
              onClick={() => setShowAppealForm((v) => !v)}
              className="text-xs font-bold text-[#B91C1C] hover:underline cursor-pointer"
            >
              {locale === 'bn' ? 'অ্যাপ থেকেই আপিল পাঠান' : 'Send In-App Appeal'}
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200/70 rounded-xl cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{locale === 'bn' ? 'লগআউট' : 'Sign Out'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
