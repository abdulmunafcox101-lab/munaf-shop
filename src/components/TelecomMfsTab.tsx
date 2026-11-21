import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  Building2,
  Check,
  CheckCircle2,
  Lightbulb,
  PhoneCall,
  Plus,
  QrCode,
  Search,
  Send,
  ShoppingBag,
  Smartphone,
  Trash2,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react';
import {
  Locale,
  PaymentGatewaysConfig,
  TelecomEntry,
  TelecomOperator,
  TelecomServiceType,
} from '../types/shop';
import { formatTaka } from '../lib/shopService';
import { PaymentGatewayCards } from './PaymentGatewayCards';

interface TelecomMfsTabProps {
  locale: Locale;
  shopName?: string;
  gateways?: PaymentGatewaysConfig;
  telecomEntries: TelecomEntry[];
  onOpenPackages?: (subView?: 'plans' | 'catalog' | 'gateways' | 'history') => void;
  onAddTelecom: (input: {
    operator: TelecomOperator;
    serviceType: TelecomServiceType;
    customerPhone: string;
    amount: number;
    commission: number;
    paymentStatus: 'paid' | 'due';
    note: string;
    syncCashbook: boolean;
  }) => Promise<void>;
  onDeleteTelecom: (txId: string) => Promise<void>;
}

const OPERATORS: TelecomOperator[] = [
  'bKash',
  'Nagad',
  'Rocket',
  'Upay',
  'GPay',
  'Grameenphone',
  'Robi',
  'Banglalink',
  'Teletalk',
  'Other',
];

const SERVICES: { id: TelecomServiceType; bn: string; en: string }[] = [
  { id: 'recharge', bn: 'ফ্লেক্সিলোড / রিচার্জ', en: 'Mobile Recharge' },
  { id: 'cash_in', bn: 'ক্যাশ ইন (MFS)', en: 'Cash In (MFS)' },
  { id: 'cash_out', bn: 'ক্যাশ আউট (MFS)', en: 'Cash Out (MFS)' },
  { id: 'send_money', bn: 'সেন্ড মানি / বিল পে', en: 'Send Money / Bill' },
  { id: 'sim_sale', bn: 'সিম বিক্রি / অ্যাক্টিভেশন', en: 'SIM Sale' },
];

export const TelecomMfsTab: React.FC<TelecomMfsTabProps> = ({
  locale,
  shopName = 'MUNAF SHOP',
  gateways,
  telecomEntries,
  onOpenPackages,
  onAddTelecom,
  onDeleteTelecom,
}) => {
  const [search, setSearch] = useState('');
  const [operatorFilter, setOperatorFilter] = useState<'all' | TelecomOperator>('all');
  const [showModal, setShowModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  const [operator, setOperator] = useState<TelecomOperator>('bKash');
  const [serviceType, setServiceType] = useState<TelecomServiceType>('cash_in');
  const [customerPhone, setCustomerPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [commission, setCommission] = useState('0');
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'due'>('paid');
  const [note, setNote] = useState('');
  const [syncCashbook, setSyncCashbook] = useState(true);
  const [saving, setSaving] = useState(false);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        setShowModal(false);
        setShowQrModal(false);
        setConfirmDeleteId(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const summary = useMemo(() => {
    const totalVolume = telecomEntries.reduce((s, t) => s + t.amount, 0);
    const totalCommission = telecomEntries.reduce((s, t) => s + t.commission, 0);
    const dueTotal = telecomEntries
      .filter((t) => t.paymentStatus === 'due')
      .reduce((s, t) => s + t.amount, 0);
    return { totalVolume, totalCommission, dueTotal };
  }, [telecomEntries]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return telecomEntries.filter((tx) => {
      if (operatorFilter !== 'all' && tx.operator !== operatorFilter) return false;
      if (
        q &&
        !tx.customerPhone.toLowerCase().includes(q) &&
        !tx.operator.toLowerCase().includes(q) &&
        !tx.note.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [telecomEntries, operatorFilter, search]);

  const serviceLabel = (type: TelecomServiceType) => {
    const found = SERVICES.find((s) => s.id === type);
    return found ? (locale === 'bn' ? found.bn : found.en) : type;
  };

  const openModal = (
    presetOp?: TelecomOperator,
    presetSvc?: TelecomServiceType,
    presetNote?: string
  ) => {
    setShowQrModal(false);
    setFormError(null);
    setOperator(presetOp ?? 'bKash');
    setServiceType(presetSvc ?? 'cash_in');
    setCustomerPhone('');
    setAmount('');
    setCommission('0');
    setPaymentStatus('paid');
    setNote(presetNote ?? '');
    setSyncCashbook(true);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(amount) || 0;
    const comm = Math.max(0, Number(commission) || 0);
    if (amt <= 0) return;

    setFormError(null);
    setSaving(true);
    try {
      await onAddTelecom({
        operator,
        serviceType,
        customerPhone: customerPhone.trim(),
        amount: amt,
        commission: comm,
        paymentStatus,
        note: note.trim(),
        syncCashbook,
      });
      setShowModal(false);
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : locale === 'bn'
          ? 'এন্ট্রি সংরক্ষণে সমস্যা হয়েছে।'
          : 'Failed to save entry.'
      );
    } finally {
      setSaving(false);
    }
  };

  const tallyPayTools = [
    {
      id: 'add_money',
      label: locale === 'bn' ? 'অ্যাড মানি' : 'Add Money',
      icon: Wallet,
      tone: 'text-emerald-700 bg-emerald-50 border-emerald-200/80',
      onClick: () => openModal('bKash', 'cash_in', 'অ্যাড মানি'),
    },
    {
      id: 'send_money',
      label: locale === 'bn' ? 'সেন্ড মানি' : 'Send Money',
      icon: Send,
      tone: 'text-sky-700 bg-sky-50 border-sky-200/80',
      onClick: () => openModal('bKash', 'send_money', 'সেন্ড মানি'),
    },
    {
      id: 'bank',
      label: locale === 'bn' ? 'ব্যাংক ট্রান্সফার' : 'Bank Transfer',
      icon: Building2,
      tone: 'text-indigo-700 bg-indigo-50 border-indigo-200/80',
      onClick: () => openModal('Other', 'send_money', 'ব্যাংক ট্রান্সফার'),
    },
    {
      id: 'wallet',
      label: locale === 'bn' ? 'ওয়ালেট ট্রান্সফার' : 'Wallet',
      icon: ArrowLeftRight,
      tone: 'text-amber-700 bg-amber-50 border-amber-200/80',
      onClick: () => openModal('Nagad', 'cash_in', 'ওয়ালেট ট্রান্সফার'),
    },
    {
      id: 'recharge',
      label: locale === 'bn' ? 'মোবাইল রিচার্জ' : 'Recharge',
      icon: Smartphone,
      tone: 'text-[#B91C1C] bg-rose-50 border-rose-200/80',
      onClick: () => openModal('Grameenphone', 'recharge'),
    },
    {
      id: 'payment',
      label: locale === 'bn' ? 'পেমেন্ট' : 'Payment',
      icon: ShoppingBag,
      tone: 'text-pink-700 bg-pink-50 border-pink-200/80',
      onClick: () => onOpenPackages?.('plans'),
    },
    {
      id: 'qr',
      label: locale === 'bn' ? 'QR কোড' : 'QR Code',
      icon: QrCode,
      tone: 'text-[#B91C1C] bg-red-50 border-red-200/80',
      onClick: () => {
        setShowModal(false);
        setShowQrModal(true);
      },
    },
    {
      id: 'bill',
      label: locale === 'bn' ? 'বিল পেমেন্ট' : 'Bill Pay',
      icon: Lightbulb,
      tone: 'text-amber-700 bg-amber-50 border-amber-200/80',
      onClick: () => openModal('Nagad', 'send_money', 'বিদ্যুৎ / গ্যাস বিল পে'),
    },
  ];

  return (
    <div className="space-y-5 animate-3d-enter">
      <div className="glass-card glass-sheen rounded-3xl p-4 sm:p-5 space-y-5">
        <div className="grid grid-cols-4 md:grid-cols-8 gap-2.5 sm:gap-3">
          {tallyPayTools.map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.id}
                type="button"
                onClick={tool.onClick}
                className="group card-3d-depth flex flex-col items-center text-center gap-1.5 py-2 px-1 rounded-2xl hover:bg-white/85 transition-colors cursor-pointer"
              >
                <span
                  className={`w-11 h-11 rounded-2xl border flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform ${tool.tone}`}
                >
                  <Icon className="w-5 h-5" />
                </span>
                <span className="text-[11px] font-semibold text-slate-800 leading-tight text-3d-dark">
                  {tool.label}
                </span>
              </button>
            );
          })}
        </div>

        <div className="glass-3d-tile rounded-3xl p-5 sm:p-6 flex flex-col items-center text-center space-y-4 border border-amber-200/60">
          <div className="card-3d-depth glass-sheen w-40 h-44 rounded-2xl bg-gradient-to-b from-[#B91C1C] to-[#7F1D1D] p-3 text-white flex flex-col items-center justify-between shadow-lg border border-white/25">
            <p className="text-[10px] font-bold tracking-wide text-amber-200 text-3d-amber-glow">
              {locale === 'bn' ? 'পেমেন্ট করুন সকল ওয়ালেটে' : 'PAY VIA ANY WALLET'}
            </p>
            <div className="w-24 h-24 rounded-xl bg-white p-2 flex items-center justify-center text-[#B91C1C] shadow-inner">
              <QrCode className="w-20 h-20 stroke-[1.6]" />
            </div>
            <p className="text-[11px] font-bold truncate max-w-full text-3d-light">{shopName}</p>
          </div>

          <div className="space-y-2 max-w-md text-left">
            <div className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                {locale === 'bn'
                  ? 'টালিপে QR ও গেটওয়ে দিয়ে বিকাশ, নগদ, রকেট, উপায় ও জি পে-তে পেমেন্ট নিন ও হিসাব রাখুন।'
                  : 'Accept payments via bKash, Nagad, Rocket, Upay & GPay and log MFS entries seamlessly.'}
              </span>
            </div>
            <div className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                {locale === 'bn'
                  ? 'ইনস্ট্যান্ট মোবাইল রিচার্জ, কমিশন হিসাব এবং ক্যাশবইয়ে স্বয়ংক্রিয় সিঙ্ক চালু রয়েছে।'
                  : 'Track flexiload recharges, commission earnings, and instant Cashbook sync.'}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => openModal('bKash', 'cash_in')}
              className="btn-3d px-6 py-3 rounded-full bg-[#B91C1C] hover:bg-[#991B1B] text-white text-xs sm:text-sm font-bold cursor-pointer inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>
                {locale === 'bn'
                  ? 'টালিপে / MFS এন্ট্রি যোগ করুন'
                  : 'Record TallyPay / MFS Entry'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowModal(false);
                setShowQrModal(true);
              }}
              className="px-5 py-3 rounded-full bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs sm:text-sm font-bold cursor-pointer inline-flex items-center gap-1.5"
            >
              <QrCode className="w-4 h-4 text-[#B91C1C]" />
              <span>{locale === 'bn' ? 'গেটওয়ে নম্বর ও QR' : 'View Gateways'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-3d-tile card-3d-depth rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-600">
              {locale === 'bn' ? 'মোট রিচার্জ ও MFS লেনদেন' : 'Total Telecom & MFS'}
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900 font-mono-num text-3d-dark">
              {formatTaka(summary.totalVolume)}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-50/90 border border-red-200/80 flex items-center justify-center text-[#B91C1C]">
            <Smartphone className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-3d-tile card-3d-depth rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-600">
              {locale === 'bn' ? 'কনফর্ম কমিশন আয়' : 'Commission Earned'}
            </p>
            <p className="mt-1 text-2xl font-bold text-emerald-600 font-mono-num text-3d-emerald">
              +{formatTaka(summary.totalCommission)}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50/90 border border-emerald-200/80 flex items-center justify-center text-emerald-600">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-3d-tile card-3d-depth rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-600">
              {locale === 'bn' ? 'টেলিকম বাকি (Due)' : 'Pending Telecom Due'}
            </p>
            <p className="mt-1 text-2xl font-bold text-red-600 font-mono-num text-3d-crimson">
              {formatTaka(summary.dueTotal)}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50/90 border border-amber-200/80 flex items-center justify-center text-amber-700">
            <PhoneCall className="w-5 h-5" />
          </div>
        </div>
      </div>

      <div className="glass-3d-tile rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                locale === 'bn'
                  ? 'নম্বর, অপারেটর বা নোট খুঁজুন...'
                  : 'Search phone, operator, note...'
              }
              className="w-full pl-9 pr-8 py-2 text-sm bg-white/80 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B91C1C]"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="p-1 text-slate-400 hover:text-slate-700 absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <select
            value={operatorFilter}
            onChange={(e) =>
              setOperatorFilter(e.target.value as 'all' | TelecomOperator)
            }
            className="px-3 py-2 text-xs font-semibold bg-white/85 border border-slate-200 rounded-xl text-slate-700 cursor-pointer"
          >
            <option value="all">
              {locale === 'bn' ? 'সব অপারেটর' : 'All Operators'}
            </option>
            {OPERATORS.map((op) => (
              <option key={op} value={op}>
                {op}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => openModal('Grameenphone', 'recharge')}
            className="px-3 py-2 text-xs font-semibold bg-white/80 hover:bg-white border border-slate-200 text-slate-800 rounded-xl cursor-pointer transition-colors"
          >
            {locale === 'bn' ? '+ ফ্লেক্সিলোড' : '+ Recharge'}
          </button>
          <button
            type="button"
            onClick={() => openModal('bKash', 'cash_in')}
            className="btn-3d inline-flex items-center gap-1.5 px-4 py-2 bg-[#B91C1C] hover:bg-[#991B1B] text-white text-xs font-bold rounded-xl cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>{locale === 'bn' ? 'নতুন টেলিকম এন্ট্রি' : 'New Telecom Entry'}</span>
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="glass-3d-tile rounded-2xl p-10 text-center space-y-3">
          <p className="text-sm text-slate-600">
            {locale === 'bn'
              ? 'এখনো কোনো ফ্লেক্সিলোড, বিকাশ, নগদ বা সিম লেনদেন যোগ করা হয়নি।'
              : 'No telecom or MFS transactions recorded yet.'}
          </p>
          <button
            type="button"
            onClick={() => openModal()}
            className="btn-3d inline-flex items-center gap-1.5 px-4 py-2 bg-[#B91C1C] text-white text-xs font-bold rounded-xl cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{locale === 'bn' ? 'প্রথম এন্ট্রি যোগ করুন' : 'Record First Entry'}</span>
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          <div className="hidden md:grid grid-cols-12 px-4 py-1 text-xs font-semibold text-slate-600">
            <span className="col-span-4">
              {locale === 'bn' ? 'অপারেটর ও সার্ভিস' : 'Operator & Service'}
            </span>
            <span className="col-span-3">
              {locale === 'bn' ? 'গ্রাহক নম্বর' : 'Customer Number'}
            </span>
            <span className="col-span-2 text-right">
              {locale === 'bn' ? 'পরিমাণ' : 'Amount'}
            </span>
            <span className="col-span-1 text-right">
              {locale === 'bn' ? 'কমিশন' : 'Comm.'}
            </span>
            <span className="col-span-2 text-right">
              {locale === 'bn' ? 'অবস্থা' : 'Status'}
            </span>
          </div>

          {filtered.map((tx) => {
            const isConfirm = confirmDeleteId === tx.id;
            return (
              <div
                key={tx.id}
                className="glass-3d-tile rounded-2xl px-4 py-3.5 grid grid-cols-1 md:grid-cols-12 items-center gap-2 md:gap-3 text-sm"
              >
                <div className="md:col-span-4 min-w-0">
                  <p className="font-bold text-slate-900 truncate">
                    {tx.operator} ·{' '}
                    <span className="font-medium text-slate-700">
                      {serviceLabel(tx.serviceType)}
                    </span>
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">
                    {tx.createdAt
                      ? tx.createdAt
                          .toDate()
                          .toLocaleString(locale === 'bn' ? 'bn-BD' : 'en-GB', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                      : locale === 'bn'
                      ? 'এইমাত্র'
                      : 'Just now'}
                    {tx.note ? ` · ${tx.note}` : ''}
                  </p>
                </div>

                <div className="md:col-span-3 font-mono-num text-xs sm:text-sm text-slate-700">
                  {tx.customerPhone || '—'}
                </div>

                <div className="md:col-span-2 md:text-right font-bold font-mono-num text-slate-900">
                  {formatTaka(tx.amount)}
                </div>

                <div className="md:col-span-1 md:text-right font-semibold font-mono-num text-emerald-600 text-xs sm:text-sm">
                  +{formatTaka(tx.commission)}
                </div>

                <div className="md:col-span-2 flex items-center justify-between md:justify-end gap-2">
                  <span
                    className={`text-xs font-bold ${
                      tx.paymentStatus === 'paid'
                        ? 'text-emerald-700'
                        : 'text-red-600'
                    }`}
                  >
                    {tx.paymentStatus === 'paid'
                      ? locale === 'bn'
                        ? 'নগদ পরিশোধ'
                        : 'Paid'
                      : locale === 'bn'
                      ? 'বাকি'
                      : 'Due'}
                  </span>

                  {isConfirm ? (
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={async () => {
                          setConfirmDeleteId(null);
                          await onDeleteTelecom(tx.id);
                        }}
                        className="px-2 py-1 text-[11px] font-bold bg-rose-600 text-white rounded-lg cursor-pointer inline-flex items-center gap-0.5"
                      >
                        <Check className="w-3 h-3" />
                        <span>{locale === 'bn' ? 'মুছুন' : 'Delete'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="p-1 text-slate-500 hover:text-slate-800 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(tx.id)}
                      title={locale === 'bn' ? 'মুছুন' : 'Delete'}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showQrModal && gateways && (
        <div
          onClick={() => setShowQrModal(false)}
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-4xl glass-3d-tile rounded-3xl p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-[#B91C1C]" />
                <h3 className="text-base font-bold text-slate-900">
                  {locale === 'bn'
                    ? 'টালিপে পেমেন্ট গেটওয়ে ও QR কোড'
                    : 'TallyPay Payment Gateways & QR'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <PaymentGatewayCards
              locale={locale}
              gateways={gateways}
              onPayWithGateway={() => {
                setShowQrModal(false);
                onOpenPackages?.('plans');
              }}
            />
          </div>
        </div>
      )}

      {showModal && (
        <div
          onClick={() => setShowModal(false)}
          className="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-md flex items-center justify-center p-4"
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleSubmit}
            className="w-full max-w-md glass-3d-tile rounded-2xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-bold text-slate-900">
                {locale === 'bn'
                  ? 'ফ্লেক্সিলোড / MFS এন্ট্রি যোগ করুন'
                  : 'Add Telecom / MFS Entry'}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1 text-slate-500 hover:text-slate-800 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <p className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                {formError}
              </p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {locale === 'bn' ? 'অপারেটর / ওয়ালেট' : 'Operator / Wallet'}
                </label>
                <select
                  value={operator}
                  onChange={(e) => setOperator(e.target.value as TelecomOperator)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl"
                >
                  {OPERATORS.map((op) => (
                    <option key={op} value={op}>
                      {op}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {locale === 'bn' ? 'সার্ভিসের ধরন' : 'Service Type'}
                </label>
                <select
                  value={serviceType}
                  onChange={(e) =>
                    setServiceType(e.target.value as TelecomServiceType)
                  }
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl"
                >
                  {SERVICES.map((sv) => (
                    <option key={sv.id} value={sv.id}>
                      {locale === 'bn' ? sv.bn : sv.en}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {locale === 'bn' ? 'গ্রাহকের মোবাইল নম্বর' : 'Customer Phone'}
              </label>
              <input
                type="tel"
                maxLength={30}
                placeholder="01XXXXXXXXX"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl font-mono-num"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {locale === 'bn' ? 'টাকার পরিমাণ (৳) *' : 'Amount (৳) *'}
                </label>
                <input
                  type="number"
                  min="1"
                  max="100000000"
                  step="0.01"
                  required
                  autoFocus
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 text-base font-bold font-mono-num bg-white border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {locale === 'bn' ? 'কমিশন (৳)' : 'Commission (৳)'}
                </label>
                <input
                  type="number"
                  min="0"
                  max="10000000"
                  step="0.01"
                  value={commission}
                  onChange={(e) => setCommission(e.target.value)}
                  className="w-full px-3 py-2 text-base font-bold font-mono-num bg-white border border-slate-300 rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-200/70 rounded-xl">
              <button
                type="button"
                onClick={() => setPaymentStatus('paid')}
                className={`py-2 text-xs font-bold rounded-lg cursor-pointer ${
                  paymentStatus === 'paid'
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-slate-600'
                }`}
              >
                {locale === 'bn' ? 'নগদ পরিশোধ (Paid)' : 'Paid'}
              </button>
              <button
                type="button"
                onClick={() => setPaymentStatus('due')}
                className={`py-2 text-xs font-bold rounded-lg cursor-pointer ${
                  paymentStatus === 'due'
                    ? 'bg-white text-red-700 shadow-sm'
                    : 'text-slate-600'
                }`}
              >
                {locale === 'bn' ? 'বাকি (Due)' : 'Due'}
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {locale === 'bn' ? 'নোট (ঐচ্ছিক)' : 'Note (Optional)'}
              </label>
              <input
                type="text"
                maxLength={200}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={
                  locale === 'bn' ? 'অফার / TrxID / বিবরণ' : 'Offer / TrxID / note'
                }
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl"
              />
            </div>

            {paymentStatus === 'paid' && (
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={syncCashbook}
                  onChange={(e) => setSyncCashbook(e.target.checked)}
                />
                <span>
                  {locale === 'bn'
                    ? 'ক্যাশবইয়েও স্বয়ংক্রিয়ভাবে হিসাব যোগ করুন'
                    : 'Auto-sync paid amount to Cashbook'}
                </span>
              </label>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl cursor-pointer"
              >
                {locale === 'bn' ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="btn-3d px-5 py-2 text-xs font-bold text-white bg-[#B91C1C] hover:bg-[#991B1B] rounded-xl cursor-pointer disabled:opacity-60"
              >
                {saving
                  ? locale === 'bn'
                    ? 'সংরক্ষণ হচ্ছে...'
                    : 'Saving...'
                  : locale === 'bn'
                  ? 'সংরক্ষণ করুন'
                  : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
