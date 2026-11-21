import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  BarChart3,
  Check,
  ChevronRight,
  Clock,
  Eye,
  EyeOff,
  HandCoins,
  Scale,
  Trash2,
  X,
} from 'lucide-react';
import { CashEntry, CashType, Locale } from '../types/shop';
import { tr } from '../lib/i18n';
import { formatTaka } from '../lib/shopService';
import { ShiftClosingModal } from './StaffShiftSection';

interface CashbookTabProps {
  locale: Locale;
  cashEntries: CashEntry[];
  activeOperatorName?: string;
  canDelete?: boolean;
  onAddCash: (input: {
    cashType: CashType;
    category: string;
    amount: number;
    note: string;
  }) => Promise<void>;
  onDeleteCash: (cashId: string) => Promise<void>;
  onCreateShiftClosing?: (input: {
    staffName: string;
    shiftLabel: string;
    openingCash: number;
    cashInTotal: number;
    cashOutTotal: number;
    expectedClosing: number;
    actualCashCount: number;
    variance: number;
    note?: string;
  }) => Promise<string>;
  onOpenReports?: () => void;
}

const CASH_IN_CATEGORIES = [
  'ক্যাশ বেচা',
  'মালিক দিল',
  'বাকি আদায়',
  'ফ্লেক্সিলোড / রিচার্জ',
  'বিকাশ / নগদ / রকেট',
  'অন্যান্য জমা',
];

const CASH_OUT_CATEGORIES = [
  'ক্যাশ কেনা',
  'খরচ',
  'মালিক নিল',
  'পেমেন্ট দেয়া',
  'দোকান ভাড়া ও বিল',
  'অন্যান্য খরচ',
];

function toLocalDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(date.getDate()).padStart(2, '0')}`;
}

function toLocalMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export const CashbookTab: React.FC<CashbookTabProps> = ({
  locale,
  cashEntries,
  activeOperatorName = 'Owner',
  canDelete = true,
  onAddCash,
  onDeleteCash,
  onCreateShiftClosing,
  onOpenReports,
}) => {
  const [range, setRange] = useState<'today' | 'month' | 'all'>('today');
  const [hideBalances, setHideBalances] = useState(false);

  const [modalType, setModalType] = useState<CashType | null>(null);
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const [showReconcile, setShowReconcile] = useState(false);
  const [showShiftClose, setShowShiftClose] = useState(false);
  const [physicalCashInput, setPhysicalCashInput] = useState('');
  const [reconciling, setReconciling] = useState(false);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        setModalType(null);
        setShowReconcile(false);
        setShowShiftClose(false);
        setConfirmDeleteId(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const now = new Date();
  const todayPrefix = toLocalDateKey(now);
  const monthPrefix = toLocalMonthKey(now);

  const isEntryToday = (e: CashEntry) => {
    if (!e.createdAt) return true;
    return toLocalDateKey(e.createdAt.toDate()) === todayPrefix;
  };

  const totalCashIn = useMemo(
    () =>
      cashEntries
        .filter((e) => e.cashType === 'cash_in')
        .reduce((s, e) => s + e.amount, 0),
    [cashEntries]
  );

  const totalCashOut = useMemo(
    () =>
      cashEntries
        .filter((e) => e.cashType === 'cash_out')
        .reduce((s, e) => s + e.amount, 0),
    [cashEntries]
  );

  const currentCash = totalCashIn - totalCashOut;

  const todayIn = useMemo(
    () =>
      cashEntries
        .filter((e) => e.cashType === 'cash_in' && isEntryToday(e))
        .reduce((s, e) => s + e.amount, 0),
    [cashEntries, todayPrefix]
  );

  const todayOut = useMemo(
    () =>
      cashEntries
        .filter((e) => e.cashType === 'cash_out' && isEntryToday(e))
        .reduce((s, e) => s + e.amount, 0),
    [cashEntries, todayPrefix]
  );

  const todayCategorySums = useMemo(() => {
    const map = new Map<string, number>();
    cashEntries.filter(isEntryToday).forEach((e) => {
      map.set(e.category, (map.get(e.category) ?? 0) + e.amount);
    });
    return {
      cashSale:
        (map.get('ক্যাশ বেচা') ?? 0) +
        (map.get('নগদ বিক্রি') ?? 0) +
        (map.get('নগদ পণ্য বিক্রি') ?? 0),
      cashBuy: (map.get('ক্যাশ কেনা') ?? 0) + (map.get('পণ্য কেনা') ?? 0),
      expense:
        (map.get('খরচ') ?? 0) +
        (map.get('দোকান ভাড়া ও বিল') ?? 0) +
        (map.get('কর্মচারী খরচ') ?? 0) +
        (map.get('অন্যান্য খরচ') ?? 0),
      ownerIn: map.get('মালিক দিল') ?? 0,
      ownerOut: map.get('মালিক নিল') ?? 0,
      bakiAday: (map.get('বাকি আদায়') ?? 0) + (map.get('টালি পেলাম') ?? 0),
      paymentDeya: (map.get('পেমেন্ট দেয়া') ?? 0) + (map.get('টালি দিলাম') ?? 0),
    };
  }, [cashEntries, todayPrefix]);

  const filtered = useMemo(() => {
    return cashEntries.filter((e) => {
      if (range === 'all') return true;
      const dt = e.createdAt ? e.createdAt.toDate() : new Date();
      if (range === 'today') return toLocalDateKey(dt) === todayPrefix;
      return toLocalMonthKey(dt) === monthPrefix;
    });
  }, [cashEntries, range, todayPrefix, monthPrefix]);

  const openModal = (type: CashType, presetCategory?: string) => {
    setShowReconcile(false);
    setFormError(null);
    setModalType(type);
    setCategory(
      presetCategory ??
        (type === 'cash_in' ? CASH_IN_CATEGORIES[0] : CASH_OUT_CATEGORIES[0])
    );
    setAmount('');
    setNote('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalType) return;
    const amt = Number(amount) || 0;
    if (amt <= 0 || !category.trim()) return;

    setFormError(null);
    setSaving(true);
    try {
      await onAddCash({
        cashType: modalType,
        category: category.trim(),
        amount: amt,
        note: note.trim(),
      });
      setModalType(null);
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : locale === 'bn'
          ? 'ক্যাশ এন্ট্রি সেভ করতে সমস্যা হয়েছে।'
          : 'Failed to save cash entry.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleReconcileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const counted = Number(physicalCashInput);
    if (!Number.isFinite(counted) || counted < 0) return;
    const diff = Number((counted - currentCash).toFixed(2));
    if (Math.abs(diff) < 0.01) {
      setShowReconcile(false);
      return;
    }

    setFormError(null);
    setReconciling(true);
    try {
      await onAddCash({
        cashType: diff > 0 ? 'cash_in' : 'cash_out',
        category: diff > 0 ? 'অন্যান্য জমা' : 'অন্যান্য খরচ',
        amount: Math.abs(diff),
        note:
          locale === 'bn'
            ? `ক্যাশবক্স মিলানো সমন্বয় (হাতে ক্যাশ: ${formatTaka(counted)})`
            : `Cashbox reconciliation adjustment (Physical: ${formatTaka(counted)})`,
      });
      setShowReconcile(false);
      setPhysicalCashInput('');
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : locale === 'bn'
          ? 'সমন্বয় করতে সমস্যা হয়েছে।'
          : 'Failed to save adjustment.'
      );
    } finally {
      setReconciling(false);
    }
  };

  const displayMoney = (val: number) =>
    hideBalances ? '৳ ••••' : formatTaka(val);

  const quickCategoryRows: {
    label: string;
    cashType: CashType;
    sum: number;
  }[] = [
    {
      label: locale === 'bn' ? 'ক্যাশ বেচা' : 'Cash Sale',
      cashType: 'cash_in',
      sum: todayCategorySums.cashSale,
    },
    {
      label: locale === 'bn' ? 'ক্যাশ কেনা' : 'Cash Purchase',
      cashType: 'cash_out',
      sum: todayCategorySums.cashBuy,
    },
    {
      label: locale === 'bn' ? 'খরচ' : 'Expense',
      cashType: 'cash_out',
      sum: todayCategorySums.expense,
    },
    {
      label: locale === 'bn' ? 'মালিক দিল' : 'Owner Added',
      cashType: 'cash_in',
      sum: todayCategorySums.ownerIn,
    },
    {
      label: locale === 'bn' ? 'মালিক নিল' : 'Owner Withdrew',
      cashType: 'cash_out',
      sum: todayCategorySums.ownerOut,
    },
  ];

  const cycleRange = () => {
    setRange((prev) =>
      prev === 'today' ? 'month' : prev === 'month' ? 'all' : 'today'
    );
  };

  const rangeBadgeLabel =
    range === 'today'
      ? locale === 'bn'
        ? 'আজকের'
        : 'Today'
      : range === 'month'
      ? locale === 'bn'
        ? 'এই মাস'
        : 'Month'
      : locale === 'bn'
      ? 'সব সময়'
      : 'All Time';

  const parsedPhysical =
    physicalCashInput.trim() === '' ? null : Number(physicalCashInput);
  const reconcileDiff =
    parsedPhysical !== null && Number.isFinite(parsedPhysical)
      ? parsedPhysical - currentCash
      : null;

  return (
    <div className="space-y-4 animate-3d-enter">
      <div className="glass-3d-tile glass-sheen rounded-3xl overflow-hidden divide-y divide-amber-900/10">
        <div className="grid grid-cols-2 divide-x divide-amber-900/10 p-4 sm:p-5 bg-gradient-to-br from-[#F7E8C3]/65 to-[#FBF5E4]/65">
          <div className="text-center pr-3">
            <p className="text-xl sm:text-2xl font-bold text-slate-900 font-mono-num text-3d-gold">
              {displayMoney(todayCategorySums.cashSale)}
            </p>
            <p className="text-xs font-semibold text-slate-700 mt-1">
              {locale === 'bn' ? 'আজকের বেচা' : "Today's Sales"}
            </p>
          </div>
          <div className="text-center pl-3">
            <p
              className={`text-xl sm:text-2xl font-bold font-mono-num ${
                currentCash >= 0 ? 'text-slate-900 text-3d-gold' : 'text-red-600 text-3d-crimson'
              }`}
            >
              {displayMoney(currentCash)}
            </p>
            <p className="text-xs font-semibold text-slate-700 mt-1">
              {locale === 'bn' ? 'বর্তমান ক্যাশ' : tr(locale, 'cash_balance')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 divide-x divide-amber-900/10 px-4 py-3 bg-white/75 text-xs sm:text-sm">
          <div className="flex items-center justify-center gap-2 pr-2">
            <span className="font-semibold text-slate-600">
              {locale === 'bn' ? 'আজ পেলাম' : tr(locale, 'today_in')}
            </span>
            <span className="font-bold text-emerald-600 font-mono-num">
              {displayMoney(todayIn)}
            </span>
          </div>
          <div className="flex items-center justify-center gap-2 pl-2">
            <span className="font-semibold text-slate-600">
              {locale === 'bn' ? 'আজ দিলাম' : tr(locale, 'today_out')}
            </span>
            <span className="font-bold text-red-600 font-mono-num">
              {displayMoney(todayOut)}
            </span>
          </div>
        </div>
      </div>

      <div className="glass-3d-tile rounded-2xl p-3.5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenReports?.()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-[#E9D19C]/75 hover:bg-[#E9D19C] text-slate-900 rounded-full cursor-pointer transition-colors"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>{locale === 'bn' ? 'রিপোর্ট' : 'Report'}</span>
            </button>

            <button
              type="button"
              onClick={cycleRange}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-full cursor-pointer transition-colors"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-[#B91C1C]" />
              <span>{rangeBadgeLabel}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {onCreateShiftClosing && (
              <button
                type="button"
                onClick={() => {
                  setModalType(null);
                  setShowReconcile(false);
                  setShowShiftClose(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-[#B91C1C]/10 hover:bg-[#B91C1C]/15 text-[#991B1B] rounded-full cursor-pointer transition-colors"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{locale === 'bn' ? 'শিফট ক্লোজ' : 'Shift Close'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setModalType(null);
                setFormError(null);
                setPhysicalCashInput(String(Math.max(0, currentCash)));
                setShowReconcile(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-full cursor-pointer transition-colors"
            >
              <Scale className="w-3.5 h-3.5" />
              <span>{locale === 'bn' ? 'ক্যাশবক্স মিলাই' : 'Reconcile'}</span>
            </button>

            <button
              type="button"
              onClick={() => setHideBalances((v) => !v)}
              title={
                hideBalances
                  ? locale === 'bn'
                    ? 'টাকা দেখান'
                    : 'Show amounts'
                  : locale === 'bn'
                  ? 'টাকা লুকান'
                  : 'Hide amounts'
              }
              className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center cursor-pointer transition-colors"
            >
              {hideBalances ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200/70 px-1">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-700">
              {locale === 'bn' ? 'বাকি আদায়' : 'Due Collected'}
            </span>
            <span className="font-bold text-emerald-600 font-mono-num">
              {displayMoney(todayCategorySums.bakiAday)}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-700">
              {locale === 'bn' ? 'পেমেন্ট দেয়া' : 'Payments Given'}
            </span>
            <span className="font-bold text-red-600 font-mono-num">
              {displayMoney(todayCategorySums.paymentDeya)}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-2.5">
        {quickCategoryRows.map((row) => {
          const isIn = row.cashType === 'cash_in';
          return (
            <button
              key={row.label}
              type="button"
              onClick={() => openModal(row.cashType, row.label)}
              className="w-full text-left glass-3d-tile card-3d-depth rounded-2xl px-4 py-3.5 flex items-center justify-between gap-3 cursor-pointer"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <span
                  className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    isIn
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-200/80'
                      : 'bg-rose-50 text-rose-600 border border-rose-200/80'
                  }`}
                >
                  <HandCoins className="w-5 h-5" />
                </span>
                <span className="text-sm sm:text-base font-bold text-slate-900 truncate">
                  {row.label}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`text-sm sm:text-base font-bold font-mono-num ${
                    isIn ? 'text-emerald-600' : 'text-red-600'
                  }`}
                >
                  {hideBalances ? '•••' : row.sum.toFixed(2)}
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </button>
          );
        })}
      </div>

      <div className="glass-3d-tile rounded-2xl p-3.5 flex items-center gap-2.5">
        <button
          type="button"
          onClick={() => openModal('cash_in')}
          className="btn-3d flex-1 py-2.5 px-4 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
        >
          + {tr(locale, 'cash_in')}
        </button>
        <button
          type="button"
          onClick={() => openModal('cash_out')}
          className="btn-3d flex-1 py-2.5 px-4 bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
        >
          - {tr(locale, 'cash_out')}
        </button>
      </div>

      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
            {locale === 'bn'
              ? `ক্যাশ লেনদেন (${rangeBadgeLabel})`
              : `Cash History (${rangeBadgeLabel})`}
          </h4>
          <span className="text-xs font-mono-num text-slate-500">
            {filtered.length}
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="glass-3d-tile rounded-2xl p-8 text-center text-sm text-slate-500">
            {tr(locale, 'no_cash')}
          </div>
        ) : (
          <div className="space-y-2.5">
            {filtered.map((tx) => {
              const isIn = tx.cashType === 'cash_in';
              const isConfirm = confirmDeleteId === tx.id;
              return (
                <div
                  key={tx.id}
                  className="glass-3d-tile rounded-2xl px-4 py-3 grid grid-cols-1 sm:grid-cols-12 items-center gap-2 sm:gap-3 text-sm"
                >
                  <div className="sm:col-span-5 flex items-center gap-2.5 min-w-0">
                    {isIn ? (
                      <ArrowDownLeft className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4 text-red-600 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{tx.category}</p>
                      {tx.note && (
                        <p className="text-xs text-slate-500 truncate">{tx.note}</p>
                      )}
                    </div>
                  </div>

                  <div className="sm:col-span-3 text-xs text-slate-500 font-mono-num">
                    {tx.createdAt
                      ? tx.createdAt.toDate().toLocaleString(locale === 'bn' ? 'bn-BD' : 'en-GB', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : locale === 'bn'
                      ? 'এইমাত্র'
                      : 'Just now'}
                  </div>

                  <div className="sm:col-span-4 flex items-center justify-between sm:justify-end gap-2.5">
                    <span
                      className={`font-bold font-mono-num ${
                        isIn ? 'text-emerald-600' : 'text-red-600'
                      }`}
                    >
                      {isIn ? '+' : '-'}
                      {displayMoney(tx.amount)}
                    </span>

                    {canDelete &&
                      (isConfirm ? (
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={async () => {
                              setConfirmDeleteId(null);
                              await onDeleteCash(tx.id);
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
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showReconcile && (
        <div
          onClick={() => setShowReconcile(false)}
          className="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-md flex items-center justify-center p-4"
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleReconcileSubmit}
            className="w-full max-w-md glass-3d-tile rounded-2xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-bold text-slate-900">
                {locale === 'bn' ? 'ক্যাশবক্স মিলানো (Reconcile)' : 'Reconcile Cashbox'}
              </h3>
              <button
                type="button"
                onClick={() => setShowReconcile(false)}
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

            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-600">
                {locale === 'bn' ? 'অ্যাপের হিসাব অনুযায়ী ক্যাশ:' : 'Book Cash Balance:'}
              </span>
              <span className="text-sm font-bold font-mono-num text-slate-900">
                {formatTaka(currentCash)}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {locale === 'bn'
                  ? 'হাতে গণনা করা প্রকৃত ক্যাশ (৳) *'
                  : 'Counted Physical Cash (৳) *'}
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                autoFocus
                value={physicalCashInput}
                onChange={(e) => setPhysicalCashInput(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xl font-bold font-mono-num bg-white border border-slate-300 rounded-xl"
              />
            </div>

            {reconcileDiff !== null && (
              <div
                className={`rounded-xl px-3.5 py-2.5 text-xs font-bold flex items-center justify-between ${
                  Math.abs(reconcileDiff) < 0.01
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : reconcileDiff > 0
                    ? 'bg-sky-50 text-sky-800 border border-sky-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                <span>
                  {Math.abs(reconcileDiff) < 0.01
                    ? locale === 'bn'
                      ? 'ক্যাশ সম্পূর্ণ মিলেছে!'
                      : 'Cash matches perfectly!'
                    : reconcileDiff > 0
                    ? locale === 'bn'
                      ? 'হাতে ক্যাশ বেশি আছে:'
                      : 'Cash Surplus:'
                    : locale === 'bn'
                    ? 'হাতে ক্যাশ কম আছে:'
                    : 'Cash Shortage:'}
                </span>
                <span className="font-mono-num">
                  {Math.abs(reconcileDiff) < 0.01
                    ? '৳০'
                    : formatTaka(Math.abs(reconcileDiff))}
                </span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowReconcile(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                {tr(locale, 'cancel')}
              </button>
              <button
                type="submit"
                disabled={reconciling}
                className="btn-3d px-5 py-2 text-xs font-bold text-white bg-[#B91C1C] hover:bg-[#991B1B] rounded-lg cursor-pointer disabled:opacity-60"
              >
                {reconcileDiff !== null && Math.abs(reconcileDiff) < 0.01
                  ? locale === 'bn'
                    ? 'ঠিক আছে'
                    : 'Done'
                  : locale === 'bn'
                  ? 'সমন্বয় সেভ করুন'
                  : 'Save Adjustment'}
              </button>
            </div>
          </form>
        </div>
      )}

      {modalType && (
        <div
          onClick={() => setModalType(null)}
          className="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-md flex items-center justify-center p-4"
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleSubmit}
            className="w-full max-w-md glass-3d-tile rounded-2xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between gap-2">
              <h3
                className={`text-base font-bold ${
                  modalType === 'cash_in' ? 'text-emerald-600' : 'text-red-600'
                }`}
              >
                {modalType === 'cash_in' ? tr(locale, 'cash_in') : tr(locale, 'cash_out')}
              </h3>
              <button
                type="button"
                onClick={() => setModalType(null)}
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

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {locale === 'bn' ? 'ক্যাটাগরি' : 'Category'}
              </label>
              <input
                type="text"
                required
                maxLength={80}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(modalType === 'cash_in'
                  ? CASH_IN_CATEGORIES
                  : CASH_OUT_CATEGORIES
                ).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`px-2.5 py-1 text-[11px] font-medium rounded-md cursor-pointer ${
                      category === cat
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {locale === 'bn' ? 'টাকার পরিমাণ (৳) *' : 'Amount (৳) *'}
              </label>
              <input
                type="number"
                min="0.01"
                max="100000000"
                step="0.01"
                required
                autoFocus
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xl font-bold font-mono-num bg-white border border-slate-300 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {locale === 'bn' ? 'নোট (ঐচ্ছিক)' : 'Note (Optional)'}
              </label>
              <input
                type="text"
                maxLength={300}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                {tr(locale, 'cancel')}
              </button>
              <button
                type="submit"
                disabled={saving}
                className={`btn-3d px-5 py-2 text-xs font-bold text-white rounded-lg cursor-pointer disabled:opacity-60 ${
                  modalType === 'cash_in'
                    ? 'bg-[#16A34A] hover:bg-[#15803D]'
                    : 'bg-[#DC2626] hover:bg-[#B91C1C]'
                }`}
              >
                {tr(locale, 'save')}
              </button>
            </div>
          </form>
        </div>
      )}
      {showShiftClose && onCreateShiftClosing && (
        <ShiftClosingModal
          locale={locale}
          activeOperatorName={activeOperatorName}
          todayIn={todayIn}
          todayOut={todayOut}
          currentCash={currentCash}
          onCreateShiftClosing={onCreateShiftClosing}
          onClose={() => setShowShiftClose(false)}
        />
      )}
    </div>
  );
};
