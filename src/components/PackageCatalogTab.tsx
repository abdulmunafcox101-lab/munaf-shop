import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  Crown,
  ExternalLink,
  Layers,
  PackageCheck,
  PhoneCall,
  Printer,
  ShieldCheck,
  Sparkles,
  Volume2,
  X,
} from 'lucide-react';
import {
  CatalogAccentColor,
  CatalogItem,
  Locale,
  PaymentGatewayId,
  PaymentGatewaysConfig,
  PlanPricingConfig,
  PlanTier,
  ShopProfile,
  UpgradeRequest,
} from '../types/shop';
import {
  formatTaka,
  getGatewayDescriptors,
  SUPPORT_HELPLINE,
} from '../lib/shopService';
import { VOICE_AVATAR_URL } from '../lib/voiceNotifier';
import {
  formatTimestamp,
  normalizeUpgradeStatus,
  StatusStepper,
} from './StatusStepper';
import {
  formatExactDateTime,
  PackageCountdownBanner,
} from './PackageCountdownBanner';
import {
  formatAccountTypeLabel,
  GatewayEmblem,
  PaymentGatewayCards,
} from './PaymentGatewayCards';

interface PackageCatalogTabProps {
  locale: Locale;
  shop: ShopProfile;
  pricing: PlanPricingConfig;
  gateways: PaymentGatewaysConfig;
  catalogItems: CatalogItem[];
  upgradeRequests: UpgradeRequest[];
  initialSubView?: 'plans' | 'catalog' | 'gateways' | 'history';
  onSubmitUpgrade: (input: {
    planTier: 'pro' | 'business' | 'catalog';
    catalogTitle?: string;
    billingCycle: 'monthly' | 'yearly';
    amount: number;
    paymentMethod: PaymentGatewayId;
    senderNumber: string;
    trxId: string;
  }) => Promise<void>;
  onSpeakReceipt?: (text: string) => void;
}

interface PlanDef {
  id: PlanTier;
  nameBn: string;
  nameEn: string;
  monthly: number;
  yearly: number;
  descBn: string;
  descEn: string;
  featuresBn: string[];
  featuresEn: string[];
}

const PLANS: PlanDef[] = [
  {
    id: 'free',
    nameBn: 'ফ্রি খাতা',
    nameEn: 'Free Khata',
    monthly: 0,
    yearly: 0,
    descBn: 'একটি দোকানের দৈনন্দিন বাকি ও ক্যাশ হিসাবের জন্য',
    descEn: 'Essential daily khata and cashbook for a single shop',
    featuresBn: [
      'দৈনিক বাকি / দিলাম-পেলাম খাতা',
      'ক্যাশবই ও বেসিক স্টক হিসাব',
      'হোয়াটসঅ্যাপ তাগাদা লিংক',
      'গুগল ক্লাউড ব্যাকআপ',
    ],
    featuresEn: [
      'Daily Receivable & Payable Khata',
      'Cashbook & Basic Inventory',
      'WhatsApp Reminder Links',
      'Google Cloud Backup',
    ],
  },
  {
    id: 'pro',
    nameBn: 'টেলিকম প্রো',
    nameEn: 'Telecom Pro',
    monthly: 199,
    yearly: 1990,
    descBn: 'রিচার্জ, বিকাশ-নগদ-রকেট-উপায় ও পূর্ণাঙ্গ দোকান পরিচালনার জন্য',
    descEn: 'Built for Telecom, MFS agents, and busy retail counters',
    featuresBn: [
      'ফ্লেক্সিলোড ও MFS কমিশন রেজিস্টার',
      'প্রিন্ট / PDF ও Excel (CSV) এক্সপোর্ট',
      'ক্যাশবইয়ে স্বয়ংক্রিয় এন্ট্রি সিঙ্ক',
      'অগ্রাধিকার হেল্পলাইন (01608603364)',
    ],
    featuresEn: [
      'Flexiload & MFS Commission Register',
      'Print / PDF & Excel (CSV) Export',
      'Auto-sync Telecom & Khata to Cashbook',
      'Priority Helpline (01608603364)',
    ],
  },
  {
    id: 'business',
    nameBn: 'বিজনেস প্লাস',
    nameEn: 'Business Plus',
    monthly: 499,
    yearly: 4990,
    descBn: 'হোলসেল, মাল্টি-ক্যাটাগরি স্টক ও ডেডিকেটেড সাপোর্ট',
    descEn: 'For wholesale shops, full stock valuation & VIP support',
    featuresBn: [
      'টেলিকম প্রো-এর সব সুবিধা অন্তর্ভুক্ত',
      'আনলিমিটেড পণ্য ও কম-স্টক সতর্কতা',
      'কাস্টম শপ ইনভয়েস ও লেজার প্রিন্ট',
      '২৪/৭ ভিআইপি ফোন ও হোয়াটসঅ্যাপ সাপোর্ট',
    ],
    featuresEn: [
      'Everything in Telecom Pro',
      'Unlimited Stock SKU & Low-Stock Alerts',
      'Custom Shop Invoice & Ledger Print',
      '24/7 VIP Phone & WhatsApp Support',
    ],
  },
];

const ACCENT_MAP: Record<
  CatalogAccentColor,
  { badgeText: string; iconBg: string; border: string; button: string }
> = {
  crimson: {
    badgeText: 'text-[#B91C1C]',
    iconBg: 'bg-red-50 border-red-200 text-[#B91C1C]',
    border: 'border-red-200/70',
    button: 'bg-[#B91C1C] hover:bg-[#991B1B]',
  },
  emerald: {
    badgeText: 'text-emerald-700',
    iconBg: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    border: 'border-emerald-200/70',
    button: 'bg-emerald-600 hover:bg-emerald-700',
  },
  sky: {
    badgeText: 'text-sky-700',
    iconBg: 'bg-sky-50 border-sky-200 text-sky-700',
    border: 'border-sky-200/70',
    button: 'bg-sky-600 hover:bg-sky-700',
  },
  amber: {
    badgeText: 'text-amber-700',
    iconBg: 'bg-amber-50 border-amber-200 text-amber-700',
    border: 'border-amber-200/70',
    button: 'bg-amber-600 hover:bg-amber-700',
  },
  violet: {
    badgeText: 'text-violet-700',
    iconBg: 'bg-violet-50 border-violet-200 text-violet-700',
    border: 'border-violet-200/70',
    button: 'bg-violet-600 hover:bg-violet-700',
  },
};

type CheckoutSelection =
  | {
      kind: 'plan';
      planTier: 'pro' | 'business';
      title: string;
      amount: number;
    }
  | {
      kind: 'catalog';
      planTier: 'catalog';
      title: string;
      unitLabel?: string;
      amount: number;
    };

interface PaymentSuccessReceipt {
  title: string;
  subtitle: string;
  amount: number;
  paymentMethod: PaymentGatewayId;
  senderNumber: string;
  trxId: string;
  submittedAtText: string;
}

export const PackageCatalogTab: React.FC<PackageCatalogTabProps> = ({
  locale,
  shop,
  pricing,
  gateways,
  catalogItems,
  upgradeRequests,
  initialSubView,
  onSubmitUpgrade,
  onSpeakReceipt,
}) => {
  const currentPlan: PlanTier = shop.planTier ?? 'free';

  const livePlans = useMemo(
    () =>
      PLANS.map((plan) => {
        if (plan.id === 'pro') {
          return { ...plan, monthly: pricing.proMonthly, yearly: pricing.proYearly };
        }
        if (plan.id === 'business') {
          return {
            ...plan,
            monthly: pricing.businessMonthly,
            yearly: pricing.businessYearly,
          };
        }
        return plan;
      }),
    [pricing]
  );

  const gatewayDescriptors = useMemo(
    () => getGatewayDescriptors(gateways),
    [gateways]
  );
  const enabledGateways = useMemo(
    () => gatewayDescriptors.filter((g) => g.enabled),
    [gatewayDescriptors]
  );

  const activeCatalogItems = useMemo(
    () =>
      catalogItems
        .filter((item) => item.enabled)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [catalogItems]
  );

  const [catalogCategoryFilter, setCatalogCategoryFilter] = useState<string>('all');
  const catalogCategories = useMemo(() => {
    const set = new Set<string>();
    activeCatalogItems.forEach((c) => {
      if (c.category) set.add(c.category);
    });
    return Array.from(set);
  }, [activeCatalogItems]);

  const visibleCatalogItems = useMemo(() => {
    if (catalogCategoryFilter === 'all') return activeCatalogItems;
    return activeCatalogItems.filter((c) => c.category === catalogCategoryFilter);
  }, [activeCatalogItems, catalogCategoryFilter]);

  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [subView, setSubView] = useState<'plans' | 'catalog' | 'gateways' | 'history'>(
    initialSubView ?? 'plans'
  );
  const [checkout, setCheckout] = useState<CheckoutSelection | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentGatewayId>('bKash');
  const [senderNumber, setSenderNumber] = useState(shop.phone || '');
  const [trxId, setTrxId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [copiedGatewayNumber, setCopiedGatewayNumber] = useState(false);
  const [copiedAutoAmount, setCopiedAutoAmount] = useState(false);
  const [bkashLinkOpened, setBkashLinkOpened] = useState(false);
  const [successReceipt, setSuccessReceipt] = useState<PaymentSuccessReceipt | null>(null);
  const [copiedReceiptTrx, setCopiedReceiptTrx] = useState(false);

  useEffect(() => {
    if (initialSubView) {
      setSubView(initialSubView);
      setCheckout(null);
      setSuccessReceipt(null);
    }
  }, [initialSubView]);

  useEffect(() => {
    if (shop.phone && !senderNumber) {
      setSenderNumber(shop.phone);
    }
  }, [shop.phone, senderNumber]);

  useEffect(() => {
    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        setCheckout(null);
        setSuccessReceipt(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const activePlanObj = livePlans.find((p) => p.id === currentPlan) ?? livePlans[0];

  const selectedGatewayInfo = useMemo(() => {
    return (
      enabledGateways.find((g) => g.id === paymentMethod) ??
      enabledGateways[0] ??
      gatewayDescriptors[0]
    );
  }, [enabledGateways, gatewayDescriptors, paymentMethod]);

  const effectiveCheckoutAmount = useMemo(() => {
    if (!checkout) return 0;
    if (checkout.kind === 'catalog') return checkout.amount;
    const planObj = livePlans.find((p) => p.id === checkout.planTier);
    if (!planObj) return checkout.amount;
    return billingCycle === 'monthly' ? planObj.monthly : planObj.yearly;
  }, [checkout, livePlans, billingCycle]);

  const openPlanCheckout = (
    planTier: 'pro' | 'business',
    preferredGateway?: PaymentGatewayId
  ) => {
    const planObj = livePlans.find((p) => p.id === planTier);
    if (!planObj) return;
    const amount = billingCycle === 'monthly' ? planObj.monthly : planObj.yearly;
    const firstEnabled = preferredGateway ?? enabledGateways[0]?.id ?? 'bKash';
    setPaymentMethod(firstEnabled);
    setBkashLinkOpened(false);
    setCopiedAutoAmount(false);
    setCheckoutError(null);
    setSuccessReceipt(null);
    setCheckout({
      kind: 'plan',
      planTier,
      title: locale === 'bn' ? planObj.nameBn : planObj.nameEn,
      amount,
    });
  };

  const openCatalogCheckout = (item: CatalogItem) => {
    const firstEnabled = enabledGateways[0]?.id ?? 'bKash';
    setPaymentMethod(firstEnabled);
    setBkashLinkOpened(false);
    setCopiedAutoAmount(false);
    setCheckoutError(null);
    setSuccessReceipt(null);
    setCheckout({
      kind: 'catalog',
      planTier: 'catalog',
      title: item.title,
      unitLabel: item.unitLabel,
      amount: item.price,
    });
  };

  const handleCopyModalNumber = async () => {
    if (!selectedGatewayInfo?.number) return;
    try {
      await navigator.clipboard.writeText(selectedGatewayInfo.number);
      setCopiedGatewayNumber(true);
      setTimeout(() => setCopiedGatewayNumber(false), 1800);
    } catch {
      // Clipboard blocked
    }
  };

  const handleCopyExactAmount = async () => {
    if (!effectiveCheckoutAmount) return;
    try {
      await navigator.clipboard.writeText(String(effectiveCheckoutAmount));
      setCopiedAutoAmount(true);
      setTimeout(() => setCopiedAutoAmount(false), 2200);
    } catch {
      // Clipboard blocked
    }
  };

  const handleOpenBkashLink = () => {
    setBkashLinkOpened(true);
    void handleCopyExactAmount();
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkout || !trxId.trim()) return;
    const finalMethod = selectedGatewayInfo?.id ?? paymentMethod;
    const cleanTrx = trxId.trim().toUpperCase();
    const cleanSender = senderNumber.trim();
    const finalAmount = effectiveCheckoutAmount;
    const planObj =
      checkout.kind === 'plan'
        ? livePlans.find((p) => p.id === checkout.planTier)
        : null;
    const finalTitle =
      checkout.kind === 'plan' && planObj
        ? locale === 'bn'
          ? planObj.nameBn
          : planObj.nameEn
        : checkout.title;
    const finalSubtitle =
      checkout.kind === 'plan'
        ? billingCycle === 'monthly'
          ? locale === 'bn'
            ? 'মাসিক প্যাকেজ'
            : 'Monthly Plan'
          : locale === 'bn'
          ? 'বার্ষিক প্যাকেজ'
          : 'Yearly Plan'
        : checkout.unitLabel || (locale === 'bn' ? 'ক্যাটালগ সার্ভিস' : 'Catalog Order');

    setCheckoutError(null);
    setSubmitting(true);
    try {
      await onSubmitUpgrade({
        planTier: checkout.planTier,
        catalogTitle: checkout.kind === 'catalog' ? checkout.title : undefined,
        billingCycle,
        amount: finalAmount,
        paymentMethod: finalMethod,
        senderNumber: cleanSender,
        trxId: cleanTrx,
      });
      setCheckout(null);
      setTrxId('');
      setBkashLinkOpened(false);
      setSuccessReceipt({
        title: finalTitle,
        subtitle: finalSubtitle,
        amount: finalAmount,
        paymentMethod: finalMethod,
        senderNumber: cleanSender,
        trxId: cleanTrx,
        submittedAtText: new Date().toLocaleString(
          locale === 'bn' ? 'bn-BD' : 'en-US',
          { dateStyle: 'medium', timeStyle: 'short' }
        ),
      });
    } catch (err) {
      setCheckoutError(
        err instanceof Error
          ? err.message
          : locale === 'bn'
          ? 'পেমেন্ট তথ্য জমা দিতে সমস্যা হয়েছে। আবার চেষ্টা করুন।'
          : 'Failed to submit payment confirmation.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-3d-enter">
      <PackageCountdownBanner
        variant="full"
        shop={shop}
        locale={locale}
        onUpgradeClick={() => {
          setSubView('plans');
          openPlanCheckout(currentPlan === 'business' ? 'business' : 'pro');
        }}
      />

      <div className="glass-3d-tile rounded-2xl p-2 inline-flex flex-wrap items-center gap-1.5">
        {(
          [
            ['plans', locale === 'bn' ? 'প্যাকেজ প্ল্যান' : 'Subscription Plans'],
            ['catalog', locale === 'bn' ? `বিশেষ ক্যাটালগ (${activeCatalogItems.length})` : `Special Catalog (${activeCatalogItems.length})`],
            ['gateways', locale === 'bn' ? 'পেমেন্ট গেটওয়ে ও নম্বর' : 'Payment Gateways'],
            ['history', locale === 'bn' ? `পেমেন্ট হিস্টোরি (${upgradeRequests.length})` : `Payment History (${upgradeRequests.length})`],
          ] as ['plans' | 'catalog' | 'gateways' | 'history', string][]
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setSubView(id);
              setCheckout(null);
              setSuccessReceipt(null);
            }}
            className={`px-4 py-2 text-xs font-bold rounded-xl cursor-pointer transition-all whitespace-nowrap ${
              subView === id
                ? 'bg-[#B91C1C] text-white shadow-sm'
                : 'text-slate-700 hover:bg-white/80'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {subView === 'gateways' && (
        <PaymentGatewayCards
          locale={locale}
          gateways={gateways}
          onPayWithGateway={(gwId) =>
            openPlanCheckout(currentPlan === 'business' ? 'business' : 'pro', gwId)
          }
        />
      )}

      {subView === 'plans' && (
      <section className="glass-3d-tile rounded-2xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-600" />
              <h3 className="text-lg font-bold text-slate-900 text-3d-dark">
                {locale === 'bn'
                  ? 'সাবস্ক্রিপশন প্যাকেজ ক্যাটালগ'
                  : 'Subscription Package Catalog'}
              </h3>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              {locale === 'bn' ? 'বর্তমান প্যাকেজ:' : 'Current Plan:'}{' '}
              <span className="font-bold text-[#B91C1C]">
                {locale === 'bn' ? activePlanObj.nameBn : activePlanObj.nameEn}
              </span>{' '}
              · {locale === 'bn' ? 'সাপোর্ট:' : 'Helpline:'}{' '}
              <span className="font-mono-num font-bold text-slate-800">
                {SUPPORT_HELPLINE}
              </span>
            </p>
          </div>

          <div className="inline-flex items-center gap-1 p-1 bg-slate-200/75 rounded-xl self-start">
            <button
              type="button"
              onClick={() => setBillingCycle('monthly')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-colors ${
                billingCycle === 'monthly'
                  ? 'bg-white text-[#B91C1C] shadow-sm'
                  : 'text-slate-600'
              }`}
            >
              {locale === 'bn' ? 'মাসিক (Monthly)' : 'Monthly'}
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('yearly')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-colors ${
                billingCycle === 'yearly'
                  ? 'bg-white text-[#B91C1C] shadow-sm'
                  : 'text-slate-600'
              }`}
            >
              {locale === 'bn' ? 'বার্ষিক · সাশ্রয়ী' : 'Yearly · Save 16%'}
            </button>
          </div>
        </div>

        {pricing.discountNote && (
          <div className="rounded-xl bg-amber-50/90 border border-amber-200 px-4 py-2.5 text-xs font-bold text-amber-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{pricing.discountNote}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {livePlans.map((plan) => {
            const isCurrent = currentPlan === plan.id;
            const price = billingCycle === 'monthly' ? plan.monthly : plan.yearly;
            const isPro = plan.id === 'pro';
            const notExpired =
              !shop.planExpiresAt || shop.planExpiresAt.toMillis() > Date.now();
            return (
              <div
                key={plan.id}
                className={`glass-3d-tile card-3d-depth rounded-2xl p-5 flex flex-col justify-between space-y-5 ${
                  isPro ? 'ring-2 ring-[#B91C1C]/35' : ''
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-base font-bold text-slate-900 text-3d-dark">
                      {locale === 'bn' ? plan.nameBn : plan.nameEn}
                    </h4>
                    {isCurrent ? (
                      <span className="text-xs font-bold text-emerald-700 inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{locale === 'bn' ? 'সক্রিয়' : 'Active'}</span>
                      </span>
                    ) : isPro ? (
                      <span className="text-xs font-bold text-[#B91C1C] inline-flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{locale === 'bn' ? 'জনপ্রিয়' : 'Popular'}</span>
                      </span>
                    ) : null}
                  </div>

                  <div>
                    <p className="text-2xl font-bold font-mono-num text-slate-900 text-3d-dark">
                      {formatTaka(price)}
                      {price > 0 && (
                        <span className="text-xs font-medium text-slate-500 ml-1">
                          /
                          {billingCycle === 'monthly'
                            ? locale === 'bn'
                              ? 'মাস'
                              : 'mo'
                            : locale === 'bn'
                            ? 'বছর'
                            : 'yr'}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      {locale === 'bn' ? plan.descBn : plan.descEn}
                    </p>
                  </div>

                  <ul className="space-y-2 pt-2 border-t border-slate-200/70 text-xs text-slate-700">
                    {(locale === 'bn' ? plan.featuresBn : plan.featuresEn).map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {plan.id === 'free' ? (
                  <div className="pt-2 text-xs font-semibold text-slate-500">
                    {isCurrent
                      ? locale === 'bn'
                        ? 'বর্তমানে চালু আছে'
                        : 'Current Active Tier'
                      : locale === 'bn'
                      ? 'বেসিক প্যাকেজ'
                      : 'Starter Tier'}
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={isCurrent && notExpired}
                    onClick={() => openPlanCheckout(plan.id as 'pro' | 'business')}
                    className={`w-full py-2.5 px-4 text-xs font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-55 ${
                      isCurrent && notExpired
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'btn-3d bg-[#B91C1C] hover:bg-[#991B1B] text-white'
                    }`}
                  >
                    {isCurrent
                      ? !notExpired
                        ? locale === 'bn'
                          ? `${plan.nameBn} রিনিউ করুন`
                          : `Renew ${plan.nameEn}`
                        : locale === 'bn'
                        ? 'এই প্যাকেজ চালু আছে'
                        : 'Current Plan'
                      : locale === 'bn'
                      ? `${plan.nameBn} আপগ্রেড করুন`
                      : `Upgrade to ${plan.nameEn}`}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>
      )}

      {subView === 'catalog' && (
      <section className="glass-3d-tile rounded-2xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50/90 border border-amber-200/80 flex items-center justify-center text-amber-700 shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {locale === 'bn'
                  ? 'বিশেষ সার্ভিস ও প্রোডাক্ট ক্যাটালগ'
                  : 'Special Services & Product Catalog'}
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                {locale === 'bn'
                  ? 'অ্যাডমিন প্যানেল থেকে যুক্ত বিশেষ ডিজিটাল সার্ভিস, এসএমএস প্যাক ও টুলস সরাসরি অর্ডার করুন।'
                  : 'Browse digital add-ons, SMS packs, and merchant tools configured in the Admin Catalog.'}
              </p>
            </div>
          </div>

          {catalogCategories.length > 0 && (
            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-200/75 rounded-xl self-start">
              <button
                type="button"
                onClick={() => setCatalogCategoryFilter('all')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer ${
                  catalogCategoryFilter === 'all'
                    ? 'bg-white text-[#B91C1C] shadow-xs'
                    : 'text-slate-600'
                }`}
              >
                {locale === 'bn' ? 'সব ক্যাটালগ' : 'All'}
              </button>
              {catalogCategories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCatalogCategoryFilter(cat)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer ${
                    catalogCategoryFilter === cat
                      ? 'bg-white text-[#B91C1C] shadow-xs'
                      : 'text-slate-600'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {visibleCatalogItems.length === 0 ? (
          <div className="glass-3d-tile rounded-2xl p-8 text-center space-y-2">
            <PackageCheck className="w-8 h-8 mx-auto text-slate-400" />
            <p className="text-sm font-semibold text-slate-700">
              {locale === 'bn'
                ? 'এই মুহূর্তে কোনো অতিরিক্ত ক্যাটালগ আইটেম যুক্ত করা হয়নি।'
                : 'No additional catalog items published yet.'}
            </p>
            <p className="text-xs text-slate-500">
              {locale === 'bn'
                ? 'অ্যাডমিন প্যানেলের "মূল্য ও ক্যাটালগ" সেকশন থেকে নতুন ক্যাটালগ যুক্ত করলে তা সাথে সাথেই এখানে দেখাবে।'
                : 'Items added from the Admin Pricing & Catalog tab will appear here instantly.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleCatalogItems.map((item) => {
              const theme = ACCENT_MAP[item.accentColor] ?? ACCENT_MAP.crimson;
              const featureList = (item.features ?? '')
                .split('\n')
                .map((f) => f.trim())
                .filter(Boolean);

              return (
                <div
                  key={item.id}
                  className={`glass-3d-tile rounded-2xl p-5 flex flex-col justify-between gap-4 border ${theme.border}`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className={`text-[11px] font-bold ${theme.badgeText}`}>
                          {item.category}
                        </p>
                        <h4 className="text-base font-bold text-slate-900 mt-0.5">
                          {item.title}
                        </h4>
                      </div>
                      <div
                        className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${theme.iconBg}`}
                      >
                        <Layers className="w-4 h-4" />
                      </div>
                    </div>

                    <p className="text-2xl font-bold font-mono-num text-slate-900">
                      {formatTaka(item.price)}
                      {item.unitLabel && (
                        <span className="text-xs font-medium text-slate-500 ml-1.5">
                          / {item.unitLabel}
                        </span>
                      )}
                    </p>

                    {item.description && (
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {item.description}
                      </p>
                    )}

                    {featureList.length > 0 && (
                      <ul className="space-y-1.5 pt-2 border-t border-slate-200/70 text-xs text-slate-700">
                        {featureList.map((feat) => (
                          <li key={feat} className="flex items-start gap-2">
                            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => openCatalogCheckout(item)}
                    className={`btn-3d w-full py-2.5 px-4 text-xs font-bold text-white rounded-xl cursor-pointer transition-colors ${theme.button}`}
                  >
                    {locale === 'bn' ? 'অর্ডার ও পেমেন্ট করুন' : 'Order & Pay Now'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
      )}

      {subView === 'history' && (
        upgradeRequests.length === 0 ? (
          <div className="glass-3d-tile rounded-2xl p-10 text-center space-y-2">
            <Crown className="w-8 h-8 mx-auto text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">
              {locale === 'bn'
                ? 'এখনো কোনো প্যাকেজ বা ক্যাটালগ পেমেন্ট জমা দেওয়া হয়নি।'
                : 'No package or catalog payments submitted yet.'}
            </p>
          </div>
        ) : (
        <section className="glass-3d-tile rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
            <h4 className="text-sm font-bold text-slate-900">
              {locale === 'bn'
                ? 'আপগ্রেড ও ক্যাটালগ পেমেন্ট স্ট্যাটাস হিস্টোরি'
                : 'Upgrade & Catalog Payment History'}
            </h4>
            <span className="text-xs font-semibold text-slate-500 font-mono-num">
              {upgradeRequests.length}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {upgradeRequests.map((req) => {
              const stage = normalizeUpgradeStatus(req.status);
              const titleText =
                req.planTier === 'catalog'
                  ? req.catalogTitle || (locale === 'bn' ? 'ক্যাটালগ অর্ডার' : 'Catalog Order')
                  : req.planTier === 'pro'
                  ? locale === 'bn'
                    ? 'টেলিকম প্রো'
                    : 'Telecom Pro'
                  : locale === 'bn'
                  ? 'বিজনেস প্লাস'
                  : 'Business Plus';

              return (
                <div key={req.id} className="glass-3d-tile rounded-2xl p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <GatewayEmblem id={req.paymentMethod} size="sm" />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">
                          {titleText}
                          {req.planTier !== 'catalog' && (
                            <span className="text-xs font-medium text-slate-500 ml-1">
                              ·{' '}
                              {req.billingCycle === 'monthly'
                                ? locale === 'bn'
                                  ? 'মাসিক'
                                  : 'Monthly'
                                : locale === 'bn'
                                ? 'বার্ষিক'
                                : 'Yearly'}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-slate-600 font-mono-num mt-0.5">
                          {req.paymentMethod} · TrxID: {req.trxId}
                          {req.createdAt
                            ? ` · ${formatTimestamp(req.createdAt, locale)}`
                            : ''}
                        </p>
                      </div>
                    </div>
                    <p className="text-base font-bold font-mono-num text-[#B91C1C] shrink-0">
                      {formatTaka(req.amount)}
                    </p>
                  </div>

                  <StatusStepper stage={stage} locale={locale} kind="upgrade" />

                  {(req.startedAt || req.expiresAt) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-xl bg-slate-900 text-white px-3 py-2.5 text-[11px] font-mono-num">
                      <div>
                        <span className="text-slate-300">
                          {locale === 'bn' ? 'মেয়াদ শুরু: ' : 'Start: '}
                        </span>
                        <span className="font-bold text-emerald-300">
                          {formatExactDateTime(req.startedAt, locale)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-300">
                          {locale === 'bn' ? 'মেয়াদ শেষ: ' : 'Expiry: '}
                        </span>
                        <span className="font-bold text-amber-300">
                          {formatExactDateTime(req.expiresAt, locale)}
                        </span>
                      </div>
                    </div>
                  )}

                  {req.statusReason && (
                    <div className="rounded-xl bg-slate-50/90 border border-slate-200/80 px-3 py-2 text-xs text-slate-700">
                      <span className="font-bold text-slate-900">
                        {locale === 'bn' ? 'অ্যাডমিন নোট / কারণ: ' : 'Reason: '}
                      </span>
                      <span>{req.statusReason}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
        )
      )}

      {checkout && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-md flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setCheckout(null);
          }}
        >
          <form
            onSubmit={handleCheckoutSubmit}
            className="w-full max-w-lg glass-3d-tile rounded-2xl p-6 space-y-4 max-h-[92vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-bold text-slate-900">
                {locale === 'bn'
                  ? 'পেমেন্ট গেটওয়ে ও TrxID কনফার্মেশন'
                  : 'Payment Gateway & TrxID Confirmation'}
              </h3>
              <button
                type="button"
                onClick={() => setCheckout(null)}
                className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {checkout.kind === 'plan' && (
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
                  {(['pro', 'business'] as const).map((tier) => {
                    const pObj = livePlans.find((p) => p.id === tier);
                    const active = checkout.planTier === tier;
                    return (
                      <button
                        key={tier}
                        type="button"
                        onClick={() => {
                          if (!pObj) return;
                          setCheckout({
                            kind: 'plan',
                            planTier: tier,
                            title: locale === 'bn' ? pObj.nameBn : pObj.nameEn,
                            amount:
                              billingCycle === 'monthly' ? pObj.monthly : pObj.yearly,
                          });
                        }}
                        className={`flex-1 py-1.5 px-2 text-[11px] font-bold rounded-lg cursor-pointer transition-colors ${
                          active
                            ? 'bg-white text-[#B91C1C] shadow-xs'
                            : 'text-slate-600'
                        }`}
                      >
                        {pObj ? (locale === 'bn' ? pObj.nameBn : pObj.nameEn) : tier}
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
                  {(['monthly', 'yearly'] as const).map((cy) => (
                    <button
                      key={cy}
                      type="button"
                      onClick={() => setBillingCycle(cy)}
                      className={`flex-1 py-1.5 px-2 text-[11px] font-bold rounded-lg cursor-pointer transition-colors ${
                        billingCycle === cy
                          ? 'bg-white text-[#B91C1C] shadow-xs'
                          : 'text-slate-600'
                      }`}
                    >
                      {cy === 'monthly'
                        ? locale === 'bn'
                          ? 'মাসিক'
                          : 'Monthly'
                        : locale === 'bn'
                        ? 'বার্ষিক'
                        : 'Yearly'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-xl bg-slate-900 text-white p-4 flex items-center justify-between gap-3">
              <div className="min-w-0 space-y-0.5">
                <p className="text-[11px] text-slate-300">
                  {checkout.kind === 'catalog'
                    ? locale === 'bn'
                      ? 'নির্বাচিত ক্যাটালগ · টাকা অটো-সেট'
                      : 'Selected Catalog · Auto Amount'
                    : locale === 'bn'
                    ? 'নির্বাচিত প্যাকেজ · টাকা অটো-সেট'
                    : 'Selected Plan · Auto Amount'}
                </p>
                <p className="text-sm font-bold truncate">
                  {checkout.kind === 'plan'
                    ? locale === 'bn'
                      ? livePlans.find((p) => p.id === checkout.planTier)?.nameBn ??
                        checkout.title
                      : livePlans.find((p) => p.id === checkout.planTier)?.nameEn ??
                        checkout.title
                    : checkout.title}
                  {checkout.kind === 'plan'
                    ? ` · ${
                        billingCycle === 'monthly'
                          ? locale === 'bn'
                            ? 'মাসিক'
                            : 'Monthly'
                          : locale === 'bn'
                          ? 'বার্ষিক'
                          : 'Yearly'
                      }`
                    : checkout.unitLabel
                    ? ` · ${checkout.unitLabel}`
                    : ''}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-2xl font-bold font-mono-num text-amber-300">
                  {formatTaka(effectiveCheckoutAmount)}
                </p>
                <button
                  type="button"
                  onClick={handleCopyExactAmount}
                  className="text-[10px] font-bold text-emerald-300 hover:text-emerald-200 underline cursor-pointer"
                >
                  {copiedAutoAmount
                    ? locale === 'bn'
                      ? 'টাকা কপি হয়েছে'
                      : 'Amount Copied'
                    : locale === 'bn'
                    ? 'টাকা কপি করুন'
                    : 'Copy Amount'}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-700">
                {locale === 'bn'
                  ? 'পেমেন্ট মাধ্যম নির্বাচন করুন (বিকাশ / নগদ / রকেট / উপায় / জি পে):'
                  : 'Select Payment Gateway:'}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {(enabledGateways.length > 0 ? enabledGateways : gatewayDescriptors).map(
                  (gw) => {
                    const active = selectedGatewayInfo?.id === gw.id;
                    return (
                      <button
                        key={gw.id}
                        type="button"
                        onClick={() => {
                          setPaymentMethod(gw.id);
                          setBkashLinkOpened(false);
                        }}
                        className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all ${
                          active
                            ? `bg-white ${gw.borderClass} ring-2 ring-current/25 shadow-sm ${gw.textClass}`
                            : 'bg-white/70 border-slate-200 text-slate-700 hover:bg-white'
                        }`}
                      >
                        <GatewayEmblem id={gw.id} size="sm" />
                        <span className="text-[11px] font-bold">{gw.id}</span>
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            {selectedGatewayInfo && (
              <div
                className={`rounded-xl ${selectedGatewayInfo.softBgClass} border ${selectedGatewayInfo.borderClass} p-4 space-y-3`}
              >
                {selectedGatewayInfo.paymentLink && (
                  <div className="rounded-xl bg-white/95 border border-[#E2136E]/30 p-3.5 space-y-2.5 shadow-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#C20E5D]">
                          {locale === 'bn'
                            ? 'bKash অফিশিয়াল পেমেন্ট লিংক'
                            : 'Official bKash Payment Link'}
                        </p>
                        <p className="text-[11px] text-slate-600 font-mono-num truncate mt-0.5">
                          {selectedGatewayInfo.paymentLink}
                        </p>
                      </div>
                      <span className="text-xs font-bold font-mono-num text-slate-900 shrink-0">
                        {formatTaka(effectiveCheckoutAmount)}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      {locale === 'bn'
                        ? `নিচের বাটনে ক্লিক করলে প্যাকেজের নির্ধারিত ${formatTaka(effectiveCheckoutAmount)} অটো-কপি হয়ে সরাসরি বিকাশ পেমেন্ট পেজ ওপেন হবে। পেমেন্ট শেষ করে প্রাপ্ত TrxID নিচে বসিয়ে জমা দিন।`
                        : `Clicking below automatically copies ${formatTaka(effectiveCheckoutAmount)} and opens the official bKash Payment Link. After paying, submit your TrxID below.`}
                    </p>

                    <a
                      href={selectedGatewayInfo.paymentLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={handleOpenBkashLink}
                      className="btn-3d w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-[#E2136E] hover:bg-[#C20E5D] rounded-xl transition-colors"
                    >
                      <span>
                        {locale === 'bn'
                          ? `bKash লিংক দিয়ে পে করুন (${formatTaka(effectiveCheckoutAmount)})`
                          : `Pay ${formatTaka(effectiveCheckoutAmount)} via bKash Link`}
                      </span>
                      <ExternalLink className="w-4 h-4 shrink-0" />
                    </a>

                    {bkashLinkOpened && (
                      <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-[11px] font-semibold text-emerald-800 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>
                          {locale === 'bn'
                            ? `${formatTaka(effectiveCheckoutAmount)} ক্লিপবোর্ডে কপি হয়েছে ও পেমেন্ট লিংক খোলা হয়েছে — পেমেন্ট সম্পন্ন করে নিচে TrxID দিন।`
                            : `${formatTaka(effectiveCheckoutAmount)} copied & link opened — enter your TrxID below once paid.`}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className={`text-xs font-bold ${selectedGatewayInfo.textClass}`}>
                      {locale === 'bn'
                        ? selectedGatewayInfo.nameBn
                        : selectedGatewayInfo.nameEn}{' '}
                      · {formatAccountTypeLabel(selectedGatewayInfo.accountType, locale)}
                    </p>
                    <p className="text-lg font-bold font-mono-num text-slate-900 mt-0.5 break-all">
                      {selectedGatewayInfo.number || SUPPORT_HELPLINE}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyModalNumber}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-800 cursor-pointer shrink-0"
                  >
                    {copiedGatewayNumber ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                    )}
                    <span>
                      {copiedGatewayNumber
                        ? locale === 'bn'
                          ? 'কপি হয়েছে'
                          : 'Copied'
                        : locale === 'bn'
                        ? 'নম্বর কপি'
                        : 'Copy'}
                    </span>
                  </button>
                </div>
                {selectedGatewayInfo.note && (
                  <p className="text-[11px] text-slate-700">
                    {selectedGatewayInfo.note}
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {locale === 'bn' ? 'প্যাকেজের টাকা (অটো)' : 'Auto Amount'}
                </label>
                <div className="w-full px-3 py-2 text-sm font-bold font-mono-num bg-emerald-50/80 border border-emerald-200 text-emerald-800 rounded-xl flex items-center justify-between">
                  <span>{formatTaka(effectiveCheckoutAmount)}</span>
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {locale === 'bn'
                    ? 'যে নম্বর থেকে পাঠিয়েছেন'
                    : 'Sender Number / ID'}
                </label>
                <input
                  type="text"
                  maxLength={30}
                  placeholder="01XXXXXXXXX"
                  value={senderNumber}
                  onChange={(e) => setSenderNumber(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl font-mono-num"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {locale === 'bn'
                    ? 'ট্রানজেকশন আইডি (TrxID) *'
                    : 'Transaction ID (TrxID) *'}
                </label>
                <input
                  type="text"
                  required
                  maxLength={60}
                  autoFocus
                  placeholder="e.g. BL98X72K1Q"
                  value={trxId}
                  onChange={(e) => setTrxId(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl font-mono-num uppercase"
                />
              </div>
            </div>

            {checkoutError && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700">
                {checkoutError}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCheckout(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl cursor-pointer"
              >
                {locale === 'bn' ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="btn-3d px-5 py-2 text-xs font-bold text-white bg-[#B91C1C] hover:bg-[#991B1B] rounded-xl cursor-pointer disabled:opacity-60"
              >
                {submitting
                  ? locale === 'bn'
                    ? 'জমা হচ্ছে...'
                    : 'Submitting...'
                  : locale === 'bn'
                  ? `পেমেন্ট কনফার্ম করুন (${formatTaka(effectiveCheckoutAmount)})`
                  : `Confirm Payment (${formatTaka(effectiveCheckoutAmount)})`}
              </button>
            </div>
          </form>
        </div>
      )}

      {successReceipt && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/55 backdrop-blur-md flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSuccessReceipt(null);
          }}
        >
          <div className="w-full max-w-md glass-3d-tile rounded-3xl p-6 space-y-5 text-center border border-emerald-200/80 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-end no-print">
              <button
                type="button"
                onClick={() => setSuccessReceipt(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mx-auto flex items-center justify-center gap-3">
              <img
                src={VOICE_AVATAR_URL}
                alt="MUNAF SHOP Support"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-200 shadow-md"
              />
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white flex items-center justify-center shadow-md">
                <CheckCircle2 className="w-8 h-8" />
              </div>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-xl font-bold text-slate-900">
                {locale === 'bn'
                  ? 'অর্ডার ও পেমেন্ট সফল হয়েছে!'
                  : 'Order & Payment Successful!'}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
                {locale === 'bn'
                  ? `ধন্যবাদ! আপনার ${formatTaka(successReceipt.amount)} পেমেন্ট তথ্য নিরাপদে গ্রহণ করা হয়েছে। ভেরিফিকেশনের পর আপনার প্যাকেজটি স্বয়ংক্রিয়ভাবে সক্রিয় হবে।`
                  : `Thank you! Your ${formatTaka(successReceipt.amount)} payment confirmation has been received and queued for instant activation.`}
              </p>
              {onSpeakReceipt && (
                <button
                  type="button"
                  onClick={() =>
                    onSpeakReceipt(
                      locale === 'bn'
                        ? `আপনার অর্ডার সফল হয়েছে। ${successReceipt.title} এর জন্য ${successReceipt.amount} টাকা পেমেন্ট রিসিট জমা হয়েছে।`
                        : `Your order is successful. Payment receipt of ${successReceipt.amount} taka for ${successReceipt.title} has been submitted.`
                    )
                  }
                  className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl cursor-pointer no-print"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>
                    {locale === 'bn'
                      ? 'আওয়াজ দিয়ে রিসিট শুনুন'
                      : 'Play Voice Confirmation'}
                  </span>
                </button>
              )}
            </div>

            <div className="rounded-2xl bg-white/90 border border-slate-200/90 p-4 text-left space-y-3 shadow-xs">
              <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-200/70">
                <div>
                  <p className="text-[11px] font-semibold text-slate-500">
                    {locale === 'bn' ? 'প্যাকেজ / সার্ভিস' : 'Package / Service'}
                  </p>
                  <p className="text-sm font-bold text-slate-900">
                    {successReceipt.title} · {successReceipt.subtitle}
                  </p>
                </div>
                <p className="text-xl font-bold font-mono-num text-emerald-700 shrink-0">
                  {formatTaka(successReceipt.amount)}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-[11px] text-slate-500">
                    {locale === 'bn' ? 'পেমেন্ট মাধ্যম' : 'Gateway'}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5 font-bold text-slate-900">
                    <GatewayEmblem id={successReceipt.paymentMethod} size="sm" />
                    <span>{successReceipt.paymentMethod}</span>
                  </div>
                </div>
                <div>
                  <p className="text-[11px] text-slate-500">
                    {locale === 'bn' ? 'প্রেরক নম্বর' : 'Sender Number'}
                  </p>
                  <p className="font-bold font-mono-num text-slate-900 mt-1">
                    {successReceipt.senderNumber || '—'}
                  </p>
                </div>
                <div className="col-span-2 flex items-center justify-between gap-2 rounded-xl bg-slate-50 border border-slate-200/80 px-3 py-2">
                  <div>
                    <p className="text-[10px] font-semibold text-slate-500 uppercase">
                      {locale === 'bn' ? 'ট্রানজেকশন আইডি (TrxID)' : 'Transaction ID'}
                    </p>
                    <p className="text-sm font-bold font-mono-num text-slate-900">
                      {successReceipt.trxId}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(successReceipt.trxId);
                        setCopiedReceiptTrx(true);
                        setTimeout(() => setCopiedReceiptTrx(false), 1800);
                      } catch {
                        // Ignore clipboard restriction
                      }
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold bg-white border border-slate-200 rounded-lg text-slate-700 cursor-pointer"
                  >
                    {copiedReceiptTrx ? (
                      <Check className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    <span>
                      {copiedReceiptTrx
                        ? locale === 'bn'
                          ? 'কপি হয়েছে'
                          : 'Copied'
                        : locale === 'bn'
                        ? 'কপি'
                        : 'Copy'}
                    </span>
                  </button>
                </div>
              </div>

              <StatusStepper stage="pending" locale={locale} kind="upgrade" />

              <p className="text-[11px] text-slate-500 font-mono-num text-center pt-1">
                {successReceipt.submittedAtText}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-1 no-print">
              <a
                href={`tel:${SUPPORT_HELPLINE}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl"
              >
                <PhoneCall className="w-3.5 h-3.5 text-[#B91C1C]" />
                <span>{SUPPORT_HELPLINE}</span>
              </a>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-slate-600" />
                <span>{locale === 'bn' ? 'রিসিট প্রিন্ট' : 'Print Receipt'}</span>
              </button>
              <button
                type="button"
                onClick={() => setSuccessReceipt(null)}
                className="btn-3d inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{locale === 'bn' ? 'ঠিক আছে' : 'Done'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
