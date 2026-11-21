import React, { useState } from 'react';
import { ArrowUpRight, Check, Copy, ExternalLink, Wallet } from 'lucide-react';
import {
  Locale,
  PaymentAccountType,
  PaymentGatewayId,
  PaymentGatewaysConfig,
} from '../types/shop';
import { getGatewayDescriptors } from '../lib/shopService';

export const GatewayEmblem: React.FC<{
  id: PaymentGatewayId;
  size?: 'sm' | 'md';
}> = ({ id, size = 'md' }) => {
  const dim = size === 'sm' ? 'w-7 h-7 text-[11px] rounded-lg' : 'w-11 h-11 text-sm rounded-2xl';

  if (id === 'bKash') {
    return (
      <div
        className={`${dim} bg-gradient-to-br from-[#E2136E] to-[#B80D58] text-white font-extrabold flex items-center justify-center shadow-md shrink-0`}
        aria-hidden="true"
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
          <path d="M5 4.5L13.5 11L19.5 6.5L15 13L19 19.5L11.5 14.5L5.5 19.5L9.5 12.5L5 4.5Z" />
        </svg>
      </div>
    );
  }

  if (id === 'Nagad') {
    return (
      <div
        className={`${dim} bg-gradient-to-br from-[#F26522] to-[#D9381E] text-white font-extrabold flex items-center justify-center shadow-md shrink-0`}
        aria-hidden="true"
      >
        <span>ন</span>
      </div>
    );
  }

  if (id === 'Rocket') {
    return (
      <div
        className={`${dim} bg-gradient-to-br from-[#8C3494] to-[#641E6B] text-white font-extrabold flex items-center justify-center shadow-md shrink-0`}
        aria-hidden="true"
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current stroke-2">
          <path d="M12 3c3.5 3 5 7 5 11l-5 3-5-3c0-4 1.5-8 5-11Z" />
          <circle cx="12" cy="10" r="1.6" className="fill-current" />
          <path d="M7 14l-2 3 3-1M17 14l2 3-3-1" />
        </svg>
      </div>
    );
  }

  if (id === 'Upay') {
    return (
      <div
        className={`${dim} bg-gradient-to-br from-[#00529B] to-[#00366B] text-[#FFD200] font-extrabold flex items-center justify-center shadow-md shrink-0`}
        aria-hidden="true"
      >
        <span>উ</span>
      </div>
    );
  }

  return (
    <div
      className={`${dim} bg-gradient-to-br from-[#1A73E8] to-[#0D47A1] text-white font-extrabold flex items-center justify-center shadow-md shrink-0`}
      aria-hidden="true"
    >
      <span>G</span>
    </div>
  );
};

export function formatAccountTypeLabel(
  accountType: PaymentAccountType,
  locale: Locale
): string {
  switch (accountType) {
    case 'personal':
      return locale === 'bn' ? 'পার্সোনাল' : 'Personal';
    case 'merchant':
      return locale === 'bn' ? 'মার্চেন্ট' : 'Merchant';
    case 'agent':
      return locale === 'bn' ? 'এজেন্ট' : 'Agent';
    case 'gpay':
      return locale === 'bn' ? 'জি পে (GPay)' : 'GPay';
  }
}

interface PaymentGatewayCardsProps {
  locale: Locale;
  gateways: PaymentGatewaysConfig;
  onPayWithGateway?: (gatewayId: PaymentGatewayId) => void;
}

export const PaymentGatewayCards: React.FC<PaymentGatewayCardsProps> = ({
  locale,
  gateways,
  onPayWithGateway,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const descriptors = getGatewayDescriptors(gateways).filter((g) => g.enabled);
  const [selectedId, setSelectedId] = useState<PaymentGatewayId>(
    descriptors[0]?.id ?? 'bKash'
  );

  const activeGateway =
    descriptors.find((g) => g.id === selectedId) ?? descriptors[0] ?? null;

  const handleCopy = async (numberText: string, id: string) => {
    if (!numberText) return;
    try {
      await navigator.clipboard.writeText(numberText);
      setCopiedId(id);
      setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 1800);
    } catch {
      // Clipboard blocked
    }
  };

  return (
    <section className="glass-3d-tile rounded-2xl p-5 sm:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50/90 border border-red-200/80 flex items-center justify-center text-[#B91C1C] shrink-0">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {locale === 'bn'
                ? 'পেমেন্ট গেটওয়ে ও মোবাইল ব্যাংকিং নম্বর'
                : 'Payment Gateways & Mobile Banking Numbers'}
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              {locale === 'bn'
                ? 'নিচের যেকোনো একটি মাধ্যম (বিকাশ, নগদ, রকেট, উপায় বা জি পে) ক্লিক করুন — নির্বাচিত মাধ্যমের তথ্যই কেবল দেখাবে।'
                : 'Select a payment gateway below to view its number and instructions without clutter.'}
            </p>
          </div>
        </div>
        <span className="text-xs font-semibold text-slate-500 font-mono-num self-start sm:self-center">
          {descriptors.length} {locale === 'bn' ? 'টি মাধ্যম সক্রিয়' : 'active gateways'}
        </span>
      </div>

      {descriptors.length === 0 || !activeGateway ? (
        <div className="glass-3d-tile rounded-2xl p-8 text-center text-sm text-slate-500">
          {locale === 'bn'
            ? 'বর্তমানে কোনো পেমেন্ট গেটওয়ে সক্রিয় নেই। হেল্পলাইনে যোগাযোগ করুন।'
            : 'No payment gateways are currently active. Please contact support.'}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {descriptors.map((gw) => {
              const active = activeGateway.id === gw.id;
              return (
                <button
                  key={gw.id}
                  type="button"
                  onClick={() => setSelectedId(gw.id)}
                  className={`p-3 rounded-2xl border flex items-center gap-2.5 cursor-pointer transition-all text-left ${
                    active
                      ? `bg-white ${gw.borderClass} ring-2 ring-current/25 shadow-md ${gw.textClass}`
                      : 'bg-white/70 border-slate-200 text-slate-700 hover:bg-white'
                  }`}
                >
                  <GatewayEmblem id={gw.id} size="sm" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate">
                      {locale === 'bn' ? gw.nameBn : gw.nameEn}
                    </p>
                    <p className="text-[10px] text-slate-500 truncate">
                      {formatAccountTypeLabel(gw.accountType, locale)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {(() => {
            const gw = activeGateway;
            const isCopied = copiedId === gw.id;
            return (
              <div
                key={gw.id}
                className={`glass-3d-tile rounded-2xl p-5 space-y-4 border ${gw.borderClass}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <GatewayEmblem id={gw.id} />
                    <div className="min-w-0">
                      <h4 className="text-base font-bold text-slate-900 truncate">
                        {locale === 'bn' ? gw.nameBn : gw.nameEn}
                      </h4>
                      <p className={`text-xs font-bold ${gw.textClass}`}>
                        {formatAccountTypeLabel(gw.accountType, locale)}
                        {gw.paymentLink && (
                          <span className="text-slate-500 font-medium">
                            {' · '}
                            {locale === 'bn' ? 'অফিসিয়াল পেমেন্ট লিংক যুক্ত' : 'Direct Pay Link'}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCopy(gw.number, gw.id)}
                      disabled={!gw.number}
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-white/90 hover:bg-white border border-slate-200 text-slate-800 rounded-xl cursor-pointer transition-colors disabled:opacity-50"
                    >
                      {isCopied ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                      )}
                      <span>
                        {isCopied
                          ? locale === 'bn'
                            ? 'কপি হয়েছে'
                            : 'Copied'
                          : locale === 'bn'
                          ? 'নম্বর কপি'
                          : 'Copy'}
                      </span>
                    </button>

                    {onPayWithGateway && (
                      <button
                        type="button"
                        onClick={() => onPayWithGateway(gw.id)}
                        className={`btn-3d inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white rounded-xl cursor-pointer transition-colors ${gw.buttonBgClass}`}
                      >
                        <span>
                          {locale === 'bn' ? `${gw.nameBn} দিয়ে পেমেন্ট` : `Pay via ${gw.nameEn}`}
                        </span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div
                    className={`rounded-xl ${gw.softBgClass} border ${gw.borderClass} px-4 py-3 space-y-1`}
                  >
                    <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
                      {locale === 'bn' ? 'অফিসিয়াল নম্বর / আইডি' : 'Official Number / ID'}
                    </p>
                    <p className="text-lg font-bold font-mono-num text-slate-900 break-all">
                      {gw.number || '—'}
                    </p>
                  </div>

                  {gw.paymentLink ? (
                    <a
                      href={gw.paymentLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between gap-2 rounded-xl bg-white/90 hover:bg-white border border-[#E2136E]/35 px-4 py-3 text-xs font-bold text-[#C20E5D] transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-[11px] text-slate-500 font-semibold">
                          {locale === 'bn' ? 'bKash সরাসরি পেমেন্ট লিংক' : 'Direct bKash Link'}
                        </p>
                        <p className="truncate font-mono-num mt-0.5">{gw.paymentLink}</p>
                      </div>
                      <ExternalLink className="w-4 h-4 shrink-0" />
                    </a>
                  ) : (
                    <div className="rounded-xl bg-white/80 border border-slate-200/80 px-4 py-3 flex items-center">
                      <p className="text-xs text-slate-700 leading-relaxed">
                        {gw.note ||
                          (locale === 'bn'
                            ? 'উপরের নম্বরে টাকা পাঠিয়ে TrxID সহ পেমেন্ট কনফার্ম করুন।'
                            : 'Send payment to the number above and submit your TrxID.')}
                      </p>
                    </div>
                  )}
                </div>

                {gw.paymentLink && gw.note && (
                  <p className="text-xs text-slate-600 leading-relaxed">{gw.note}</p>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </section>
  );
};
