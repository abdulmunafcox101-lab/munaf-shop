import React, { useEffect, useState } from 'react';
import { RotateCcw, Save, Wallet } from 'lucide-react';
import {
  Locale,
  PaymentAccountType,
  PaymentGatewaysConfig,
} from '../types/shop';
import {
  DEFAULT_BKASH_PAYMENT_LINK,
  DEFAULT_PAYMENT_GATEWAYS,
  getGatewayDescriptors,
  SUPPORT_HELPLINE,
} from '../lib/shopService';
import { GatewayEmblem } from './PaymentGatewayCards';

interface AdminGatewaysSectionProps {
  locale: Locale;
  gateways: PaymentGatewaysConfig;
  onSaveGateways: (input: Omit<PaymentGatewaysConfig, 'updatedAt'>) => Promise<void>;
}

export const AdminGatewaysSection: React.FC<AdminGatewaysSectionProps> = ({
  locale,
  gateways,
  onSaveGateways,
}) => {
  const [draft, setDraft] = useState<Omit<PaymentGatewaysConfig, 'updatedAt'>>({
    bkashNumber: gateways.bkashNumber,
    bkashType: gateways.bkashType,
    bkashEnabled: gateways.bkashEnabled,
    bkashNote: gateways.bkashNote ?? '',
    bkashPaymentLink: gateways.bkashPaymentLink ?? DEFAULT_BKASH_PAYMENT_LINK,
    nagadNumber: gateways.nagadNumber,
    nagadType: gateways.nagadType,
    nagadEnabled: gateways.nagadEnabled,
    nagadNote: gateways.nagadNote ?? '',
    rocketNumber: gateways.rocketNumber,
    rocketType: gateways.rocketType,
    rocketEnabled: gateways.rocketEnabled,
    rocketNote: gateways.rocketNote ?? '',
    upayNumber: gateways.upayNumber,
    upayType: gateways.upayType,
    upayEnabled: gateways.upayEnabled,
    upayNote: gateways.upayNote ?? '',
    gpayNumber: gateways.gpayNumber,
    gpayType: gateways.gpayType,
    gpayEnabled: gateways.gpayEnabled,
    gpayNote: gateways.gpayNote ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [activeGateway, setActiveGateway] = useState<
    'bKash' | 'Nagad' | 'Rocket' | 'Upay' | 'GPay'
  >('bKash');

  useEffect(() => {
    setDraft({
      bkashNumber: gateways.bkashNumber,
      bkashType: gateways.bkashType,
      bkashEnabled: gateways.bkashEnabled,
      bkashNote: gateways.bkashNote ?? '',
      bkashPaymentLink: gateways.bkashPaymentLink ?? DEFAULT_BKASH_PAYMENT_LINK,
      nagadNumber: gateways.nagadNumber,
      nagadType: gateways.nagadType,
      nagadEnabled: gateways.nagadEnabled,
      nagadNote: gateways.nagadNote ?? '',
      rocketNumber: gateways.rocketNumber,
      rocketType: gateways.rocketType,
      rocketEnabled: gateways.rocketEnabled,
      rocketNote: gateways.rocketNote ?? '',
      upayNumber: gateways.upayNumber,
      upayType: gateways.upayType,
      upayEnabled: gateways.upayEnabled,
      upayNote: gateways.upayNote ?? '',
      gpayNumber: gateways.gpayNumber,
      gpayType: gateways.gpayType,
      gpayEnabled: gateways.gpayEnabled,
      gpayNote: gateways.gpayNote ?? '',
    });
  }, [gateways]);

  const descriptors = getGatewayDescriptors(draft);

  const updateGatewayField = (
    id: 'bKash' | 'Nagad' | 'Rocket' | 'Upay' | 'GPay',
    patch: {
      number?: string;
      accountType?: PaymentAccountType;
      enabled?: boolean;
      note?: string;
      paymentLink?: string;
    }
  ) => {
    setDraft((prev) => {
      if (id === 'bKash') {
        return {
          ...prev,
          bkashNumber: patch.number ?? prev.bkashNumber,
          bkashType: patch.accountType ?? prev.bkashType,
          bkashEnabled: patch.enabled ?? prev.bkashEnabled,
          bkashNote: patch.note ?? prev.bkashNote,
          bkashPaymentLink: patch.paymentLink ?? prev.bkashPaymentLink,
        };
      }
      if (id === 'Nagad') {
        return {
          ...prev,
          nagadNumber: patch.number ?? prev.nagadNumber,
          nagadType: patch.accountType ?? prev.nagadType,
          nagadEnabled: patch.enabled ?? prev.nagadEnabled,
          nagadNote: patch.note ?? prev.nagadNote,
        };
      }
      if (id === 'Rocket') {
        return {
          ...prev,
          rocketNumber: patch.number ?? prev.rocketNumber,
          rocketType: patch.accountType ?? prev.rocketType,
          rocketEnabled: patch.enabled ?? prev.rocketEnabled,
          rocketNote: patch.note ?? prev.rocketNote,
        };
      }
      if (id === 'Upay') {
        return {
          ...prev,
          upayNumber: patch.number ?? prev.upayNumber,
          upayType: patch.accountType ?? prev.upayType,
          upayEnabled: patch.enabled ?? prev.upayEnabled,
          upayNote: patch.note ?? prev.upayNote,
        };
      }
      return {
        ...prev,
        gpayNumber: patch.number ?? prev.gpayNumber,
        gpayType: patch.accountType ?? prev.gpayType,
        gpayEnabled: patch.enabled ?? prev.gpayEnabled,
        gpayNote: patch.note ?? prev.gpayNote,
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setSaving(true);
    try {
      await onSaveGateways(draft);
    } catch (err) {
      setSaveError(
        err instanceof Error
          ? err.message
          : locale === 'bn'
          ? 'পেমেন্ট গেটওয়ে সেভ করতে সমস্যা হয়েছে।'
          : 'Failed to save payment gateways.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="glass-3d-tile rounded-2xl p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-[#B91C1C] shrink-0">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {locale === 'bn'
                ? 'পেমেন্ট গেটওয়ে নম্বর ম্যানেজমেন্ট (বিকাশ · নগদ · রকেট · উপায় · জি পে)'
                : 'Payment Gateways Management (bKash, Nagad, Rocket, Upay, GPay)'}
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              {locale === 'bn'
                ? 'এখানে প্রতিটি পেমেন্ট গেটওয়ের আলাদা নম্বর, ধরন ও নির্দেশনা সেট করুন — ইউজার অ্যাকাউন্টের পেমেন্ট পেজে সাথে সাথেই আপডেট হবে।'
                : 'Configure each gateway number, account type, active status, and instructions. Changes sync live to all users.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setDraft({ ...DEFAULT_PAYMENT_GATEWAYS })}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl cursor-pointer self-start"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>{locale === 'bn' ? 'ডিফল্ট রিসেট' : 'Reset Defaults'}</span>
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        {descriptors.map((gw) => {
          const isSelected = activeGateway === gw.id;
          return (
            <button
              key={gw.id}
              type="button"
              onClick={() => setActiveGateway(gw.id)}
              className={`p-3 rounded-2xl border flex items-center gap-2.5 cursor-pointer transition-all text-left ${
                isSelected
                  ? `bg-white ${gw.borderClass} ring-2 ring-current/25 shadow-md ${gw.textClass}`
                  : 'bg-white/75 border-slate-200 text-slate-700 hover:bg-white'
              }`}
            >
              <GatewayEmblem id={gw.id} size="sm" />
              <div className="min-w-0">
                <p className="text-xs font-bold truncate">
                  {locale === 'bn' ? gw.nameBn : gw.nameEn}
                </p>
                <p
                  className={`text-[10px] font-bold truncate ${
                    gw.enabled ? 'text-emerald-700' : 'text-slate-400'
                  }`}
                >
                  {gw.enabled
                    ? locale === 'bn'
                      ? 'চালু'
                      : 'Active'
                    : locale === 'bn'
                    ? 'বন্ধ'
                    : 'Off'}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="max-w-2xl">
        {descriptors
          .filter((gw) => gw.id === activeGateway)
          .map((gw) => (
          <div
            key={gw.id}
            className={`glass-3d-tile rounded-2xl p-5 space-y-4 border ${gw.borderClass} ${
              !gw.enabled ? 'opacity-75' : ''
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <GatewayEmblem id={gw.id} />
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-slate-900 truncate">
                    {locale === 'bn' ? gw.nameBn : gw.nameEn}
                  </h4>
                  <p className={`text-[11px] font-bold ${gw.textClass}`}>
                    {gw.enabled
                      ? locale === 'bn'
                        ? 'সক্রিয় রয়েছে'
                        : 'Enabled'
                      : locale === 'bn'
                      ? 'বন্ধ আছে'
                      : 'Disabled'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => updateGatewayField(gw.id, { enabled: !gw.enabled })}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl border cursor-pointer transition-colors ${
                  gw.enabled
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                    : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                }`}
              >
                {gw.enabled
                  ? locale === 'bn'
                    ? 'চালু'
                    : 'Active'
                  : locale === 'bn'
                  ? 'বন্ধ'
                  : 'Off'}
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    {gw.id === 'GPay'
                      ? locale === 'bn'
                        ? 'GPay নম্বর / আইডি'
                        : 'GPay Number / ID'
                      : locale === 'bn'
                      ? 'পেমেন্ট নম্বর'
                      : 'Payment Number'}
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      updateGatewayField(gw.id, { number: SUPPORT_HELPLINE })
                    }
                    className="text-[11px] font-bold text-[#B91C1C] hover:underline cursor-pointer"
                  >
                    {locale === 'bn' ? 'হেল্পলাইন বসান' : 'Use Helpline'}
                  </button>
                </div>
                <input
                  type="text"
                  maxLength={gw.id === 'GPay' ? 60 : 30}
                  value={gw.number}
                  onChange={(e) =>
                    updateGatewayField(gw.id, { number: e.target.value })
                  }
                  placeholder="01XXXXXXXXX"
                  className="w-full px-3 py-2 text-sm font-bold font-mono-num bg-white border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {locale === 'bn' ? 'অ্যাকাউন্টের ধরন' : 'Account Type'}
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(
                    [
                      ['personal', locale === 'bn' ? 'পার্সোনাল' : 'Personal'],
                      ['merchant', locale === 'bn' ? 'মার্চেন্ট' : 'Merchant'],
                      ['agent', locale === 'bn' ? 'এজেন্ট' : 'Agent'],
                      ['gpay', 'GPay'],
                    ] as [PaymentAccountType, string][]
                  ).map(([tId, tLabel]) => (
                    <button
                      key={tId}
                      type="button"
                      onClick={() => updateGatewayField(gw.id, { accountType: tId })}
                      className={`py-1.5 px-1 text-[11px] font-bold rounded-lg border cursor-pointer truncate ${
                        gw.accountType === tId
                          ? `${gw.buttonBgClass} text-white border-transparent`
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {tLabel}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    {locale === 'bn' ? 'পেমেন্ট নির্দেশনা' : 'Instruction Note'}
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono-num">
                    {gw.note.length}/150
                  </span>
                </div>
                <input
                  type="text"
                  maxLength={150}
                  value={gw.note}
                  onChange={(e) =>
                    updateGatewayField(gw.id, { note: e.target.value })
                  }
                  placeholder={
                    locale === 'bn'
                      ? 'যেমন: Send Money করে TrxID দিন'
                      : 'e.g. Send Money & submit TrxID'
                  }
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl"
                />
              </div>

              {gw.id === 'bKash' && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-[#C20E5D]">
                      {locale === 'bn'
                        ? 'bKash পেমেন্ট লিংক (Direct Link)'
                        : 'bKash Payment Link URL'}
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        updateGatewayField('bKash', {
                          paymentLink: DEFAULT_BKASH_PAYMENT_LINK,
                        })
                      }
                      className="text-[11px] font-bold text-[#C20E5D] hover:underline cursor-pointer"
                    >
                      {locale === 'bn' ? 'ডিফল্ট লিংক' : 'Default Link'}
                    </button>
                  </div>
                  <input
                    type="url"
                    maxLength={240}
                    value={draft.bkashPaymentLink ?? ''}
                    onChange={(e) =>
                      updateGatewayField('bKash', { paymentLink: e.target.value })
                    }
                    placeholder={DEFAULT_BKASH_PAYMENT_LINK}
                    className="w-full px-3 py-2 text-xs bg-white border border-[#E2136E]/35 rounded-xl font-mono-num"
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {saveError && (
        <p className="rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-xs font-semibold text-rose-700">
          {saveError}
        </p>
      )}

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={saving}
          className="btn-3d inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-[#B91C1C] hover:bg-[#991B1B] rounded-xl cursor-pointer disabled:opacity-60"
        >
          <Save className="w-4 h-4" />
          <span>
            {saving
              ? locale === 'bn'
                ? 'সেভ হচ্ছে...'
                : 'Saving...'
              : locale === 'bn'
              ? 'সব পেমেন্ট গেটওয়ে সেভ ও লাইভ করুন'
              : 'Save & Publish Gateways'}
          </span>
        </button>
      </div>
    </form>
  );
};
