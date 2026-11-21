import React, { useMemo, useState } from 'react';
import {
  CalendarClock,
  Check,
  CheckCircle2,
  Coins,
  MessageSquare,
  MessageSquareShare,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { Contact, InstallmentPlan, Locale } from '../types/shop';
import { formatTaka, normalizeIsoDate } from '../lib/shopService';
import { tr } from '../lib/i18n';

interface InstallmentsModalProps {
  locale: Locale;
  shopName: string;
  contacts: Contact[];
  installments: InstallmentPlan[];
  canDelete: boolean;
  onCreatePlan: (input: {
    contact?: Contact;
    contactName: string;
    customerPhone?: string;
    itemTitle: string;
    totalAmount: number;
    downPayment: number;
    installmentCount: number;
    frequency: 'weekly' | 'monthly';
    nextDueDate: string;
    note?: string;
    alsoRecordCashDownPayment: boolean;
  }) => Promise<string>;
  onCollectPayment: (
    plan: InstallmentPlan,
    input: { amount: number; note?: string; alsoRecordCash: boolean }
  ) => Promise<void>;
  onDeletePlan: (planId: string) => Promise<void>;
  onClose: () => void;
}

export const InstallmentsModal: React.FC<InstallmentsModalProps> = ({
  locale,
  shopName,
  contacts,
  installments,
  canDelete,
  onCreatePlan,
  onCollectPayment,
  onDeletePlan,
  onClose,
}) => {
  const [view, setView] = useState<'list' | 'new'>('list');
  const [filter, setFilter] = useState<'active' | 'completed' | 'all'>('active');

  const [contactId, setContactId] = useState('');
  const [contactName, setContactName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [itemTitle, setItemTitle] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [downPayment, setDownPayment] = useState('0');
  const [installmentCount, setInstallmentCount] = useState('6');
  const [frequency, setFrequency] = useState<'weekly' | 'monthly'>('monthly');
  const [nextDueDate, setNextDueDate] = useState(() => normalizeIsoDate());
  const [note, setNote] = useState('');
  const [cashDownSync, setCashDownSync] = useState(true);
  const [saving, setSaving] = useState(false);

  const [collectTarget, setCollectTarget] = useState<InstallmentPlan | null>(null);
  const [collectAmount, setCollectAmount] = useState('');
  const [collectNote, setCollectNote] = useState('');
  const [collectCashSync, setCollectCashSync] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const todayIso = normalizeIsoDate();

  const summary = useMemo(() => {
    const active = installments.filter((p) => p.status === 'active');
    const overdue = active.filter((p) => p.nextDueDate <= todayIso);
    const totalRemaining = active.reduce((s, p) => s + p.remainingAmount, 0);
    return {
      activeCount: active.length,
      overdueCount: overdue.length,
      totalRemaining,
    };
  }, [installments, todayIso]);

  const filteredPlans = useMemo(() => {
    return installments.filter((p) => {
      if (filter === 'all') return true;
      return p.status === filter;
    });
  }, [installments, filter]);

  const previewKistiAmt = useMemo(() => {
    const t = Math.max(0, Number(totalAmount) || 0);
    const d = Math.min(t, Math.max(0, Number(downPayment) || 0));
    const c = Math.max(1, Math.floor(Number(installmentCount) || 1));
    return Math.max(0, (t - d) / c);
  }, [totalAmount, downPayment, installmentCount]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const matchedContact = contacts.find((c) => c.id === contactId);
    const cleanName = matchedContact?.name || contactName.trim();
    if (!cleanName || !itemTitle.trim() || (Number(totalAmount) || 0) <= 0) return;
    setErrorMsg(null);
    setSaving(true);
    try {
      await onCreatePlan({
        contact: matchedContact,
        contactName: cleanName,
        customerPhone: customerPhone.trim() || matchedContact?.phone || '',
        itemTitle: itemTitle.trim(),
        totalAmount: Number(totalAmount),
        downPayment: Number(downPayment) || 0,
        installmentCount: Math.max(1, Math.floor(Number(installmentCount) || 1)),
        frequency,
        nextDueDate: normalizeIsoDate(nextDueDate),
        note: note.trim(),
        alsoRecordCashDownPayment: cashDownSync,
      });
      setContactId('');
      setContactName('');
      setCustomerPhone('');
      setItemTitle('');
      setTotalAmount('');
      setDownPayment('0');
      setInstallmentCount('6');
      setNote('');
      setView('list');
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : locale === 'bn'
          ? 'কিস্তি সেভ করতে সমস্যা হয়েছে।'
          : 'Failed to create installment plan.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCollectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collectTarget) return;
    const amt = Number(collectAmount) || 0;
    if (amt <= 0) return;
    setErrorMsg(null);
    setSaving(true);
    try {
      await onCollectPayment(collectTarget, {
        amount: amt,
        note: collectNote.trim(),
        alsoRecordCash: collectCashSync,
      });
      setCollectTarget(null);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : locale === 'bn'
          ? 'কিস্তি জমা করতে সমস্যা হয়েছে।'
          : 'Failed to record installment payment.'
      );
    } finally {
      setSaving(false);
    }
  };

  const buildKistiReminder = (p: InstallmentPlan) =>
    locale === 'bn'
      ? `আসসালামু আলাইকুম ${p.contactName},\n${shopName}-এ "${p.itemTitle}" কিস্তির (${
          p.paidCount + 1
        }/${p.installmentCount}) ${formatTaka(
          Math.min(p.installmentAmount, p.remainingAmount)
        )} পরিশোধের তারিখ: ${p.nextDueDate}। মোট বাকি: ${formatTaka(
          p.remainingAmount
        )}। ধন্যবাদ।`
      : `Hello ${p.contactName}, installment reminder from ${shopName} for "${p.itemTitle}" (${
          p.paidCount + 1
        }/${p.installmentCount}): ${formatTaka(
          Math.min(p.installmentAmount, p.remainingAmount)
        )} due on ${p.nextDueDate}. Remaining: ${formatTaka(p.remainingAmount)}.`;

  return (
    <div
      className="fixed inset-0 z-[70] bg-slate-900/55 backdrop-blur-md flex items-center justify-center p-4 no-print"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl glass-3d-tile rounded-3xl bg-white p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
              <CalendarClock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                {locale === 'bn'
                  ? 'কিস্তি ও EMI ম্যানেজার'
                  : 'Installment (Kisti / EMI) Manager'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {locale === 'bn'
                  ? `চলমান: ${summary.activeCount} · বকেয়া/আজ: ${summary.overdueCount} · মোট পাওনা: ${formatTaka(summary.totalRemaining)}`
                  : `Active: ${summary.activeCount} · Due/Overdue: ${summary.overdueCount} · Remaining: ${formatTaka(summary.totalRemaining)}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex p-1 bg-slate-100 rounded-xl gap-1">
            <button
              type="button"
              onClick={() => setView('list')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg cursor-pointer ${
                view === 'list' ? 'bg-white text-[#B91C1C] shadow-sm' : 'text-slate-600'
              }`}
            >
              {locale === 'bn' ? `কিস্তি তালিকা (${installments.length})` : `Plans (${installments.length})`}
            </button>
            <button
              type="button"
              onClick={() => {
                setErrorMsg(null);
                setView('new');
              }}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg cursor-pointer inline-flex items-center gap-1 ${
                view === 'new' ? 'bg-white text-[#B91C1C] shadow-sm' : 'text-slate-600'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{locale === 'bn' ? 'নতুন কিস্তি' : 'New Kisti'}</span>
            </button>
          </div>

          {view === 'list' && (
            <div className="inline-flex gap-1">
              {(
                [
                  ['active', locale === 'bn' ? 'চলমান' : 'Active'],
                  ['completed', locale === 'bn' ? 'সম্পন্ন' : 'Done'],
                  ['all', locale === 'bn' ? 'সব' : 'All'],
                ] as const
              ).map(([k, lbl]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setFilter(k)}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg cursor-pointer ${
                    filter === k
                      ? 'bg-[#B91C1C] text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>
          )}
        </div>

        {errorMsg && (
          <p className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700">
            {errorMsg}
          </p>
        )}

        {view === 'new' ? (
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {locale === 'bn' ? 'খাতা থেকে কাস্টমার (ঐচ্ছিক)' : 'Select Saved Party'}
                </label>
                <select
                  value={contactId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setContactId(id);
                    const c = contacts.find((x) => x.id === id);
                    if (c) {
                      setContactName(c.name);
                      setCustomerPhone(c.phone);
                    }
                  }}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl"
                >
                  <option value="">
                    {locale === 'bn' ? '-- ম্যানুয়ালি লিখুন বা বাছুন --' : '-- Manual or pick --'}
                  </option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone || c.contactType})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {locale === 'bn' ? 'কাস্টমারের নাম *' : 'Customer Name *'}
                </label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {locale === 'bn' ? 'মোবাইল নম্বর' : 'Mobile'}
                </label>
                <input
                  type="tel"
                  maxLength={30}
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl font-mono-num"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {locale === 'bn' ? 'পণ্য বা কিস্তির বিবরণ *' : 'Item / Plan Title *'}
                </label>
                <input
                  type="text"
                  required
                  maxLength={120}
                  value={itemTitle}
                  onChange={(e) => setItemTitle(e.target.value)}
                  placeholder={locale === 'bn' ? 'যেমন: মোবাইল ফোন, ফ্রিজ...' : 'e.g. Smartphone, TV...'}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {locale === 'bn' ? 'মোট দাম (৳) *' : 'Total (৳) *'}
                </label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  required
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl font-mono-num"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {locale === 'bn' ? 'জমা / ডাউন (৳)' : 'Down Pay (৳)'}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={downPayment}
                  onChange={(e) => setDownPayment(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl font-mono-num"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {locale === 'bn' ? 'মোট কিস্তি সংখ্যা' : 'Installments'}
                </label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  required
                  value={installmentCount}
                  onChange={(e) => setInstallmentCount(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl font-mono-num"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {locale === 'bn' ? 'কিস্তির ধরন' : 'Frequency'}
                </label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as 'weekly' | 'monthly')}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl"
                >
                  <option value="monthly">{locale === 'bn' ? 'মাসিক কিস্তি' : 'Monthly'}</option>
                  <option value="weekly">{locale === 'bn' ? 'সাপ্তাহিক কিস্তি' : 'Weekly'}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {locale === 'bn' ? 'পরবর্তী কিস্তির তারিখ *' : 'Next Due Date *'}
                </label>
                <input
                  type="date"
                  required
                  value={nextDueDate}
                  onChange={(e) => setNextDueDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl font-mono-num"
                />
              </div>
            </div>

            <div className="rounded-2xl bg-violet-50 border border-violet-200 px-3.5 py-2.5 flex items-center justify-between text-xs font-bold text-violet-900">
              <span>{locale === 'bn' ? 'প্রতি কিস্তিতে পরিশোধ:' : 'Per Installment:'}</span>
              <span className="font-mono-num text-sm">{formatTaka(previewKistiAmt)}</span>
            </div>

            <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={cashDownSync}
                onChange={(e) => setCashDownSync(e.target.checked)}
              />
              <span>
                {locale === 'bn'
                  ? 'ডাউন পেমেন্ট টাকা ক্যাশবইয়ে যোগ করুন'
                  : 'Sync down payment into Cashbook'}
              </span>
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setView('list')}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                {tr(locale, 'cancel')}
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
                  ? 'কিস্তি চালু করুন'
                  : 'Create Plan'}
              </button>
            </div>
          </form>
        ) : filteredPlans.length === 0 ? (
          <div className="py-10 text-center space-y-3">
            <CalendarClock className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs font-semibold text-slate-500">
              {locale === 'bn'
                ? 'এই তালিকায় কোনো কিস্তি নেই। নতুন কিস্তি যোগ করুন।'
                : 'No installment plans here yet.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPlans.map((p) => {
              const isOverdue = p.status === 'active' && p.nextDueDate <= todayIso;
              const digits = (p.customerPhone ?? '').replace(/\D/g, '');
              const waPhone =
                digits.length >= 10
                  ? digits.startsWith('88')
                    ? digits
                    : `88${digits}`
                  : '';
              const waUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(
                buildKistiReminder(p)
              )}`;
              const smsUrl = `sms:${(p.customerPhone ?? '').replace(/[^\d+]/g, '')}?body=${encodeURIComponent(
                buildKistiReminder(p)
              )}`;
              const pct = Math.min(
                100,
                Math.round((p.paidCount / Math.max(1, p.installmentCount)) * 100)
              );

              return (
                <div
                  key={p.id}
                  className={`rounded-2xl border p-4 space-y-2.5 ${
                    isOverdue
                      ? 'bg-rose-50/75 border-rose-200'
                      : p.status === 'completed'
                      ? 'bg-emerald-50/60 border-emerald-200'
                      : 'bg-slate-50/80 border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-extrabold text-slate-900 truncate">
                          {p.contactName}
                        </p>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            p.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : isOverdue
                              ? 'bg-rose-600 text-white'
                              : 'bg-violet-100 text-violet-800'
                          }`}
                        >
                          {p.status === 'completed'
                            ? locale === 'bn'
                              ? 'পরিশোধিত'
                              : 'Completed'
                            : isOverdue
                            ? locale === 'bn'
                              ? `বকেয়া তারিখ: ${p.nextDueDate}`
                              : `Due: ${p.nextDueDate}`
                            : `${p.nextDueDate}`}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {p.itemTitle} · {p.paidCount}/{p.installmentCount}{' '}
                        {p.frequency === 'weekly'
                          ? locale === 'bn'
                            ? '(সাপ্তাহিক)'
                            : '(Weekly)'
                          : locale === 'bn'
                          ? '(মাসিক)'
                          : '(Monthly)'}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-sm font-extrabold font-mono-num text-[#B91C1C]">
                        {formatTaka(p.remainingAmount)}
                      </p>
                      <p className="text-[10px] text-slate-500 font-mono-num">
                        {locale === 'bn' ? 'মোট:' : 'Total:'} {formatTaka(p.totalAmount)}
                      </p>
                    </div>
                  </div>

                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        p.status === 'completed' ? 'bg-emerald-600' : 'bg-[#B91C1C]'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                    <span className="text-[11px] font-bold text-slate-700 font-mono-num">
                      {locale === 'bn' ? 'কিস্তি প্রতি:' : 'Installment:'}{' '}
                      {formatTaka(Math.min(p.installmentAmount, p.remainingAmount || p.installmentAmount))}
                    </span>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {p.status === 'active' && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setCollectTarget(p);
                              setCollectAmount(
                                String(
                                  Number(
                                    Math.min(p.installmentAmount, p.remainingAmount).toFixed(2)
                                  )
                                )
                              );
                              setCollectNote('');
                              setCollectCashSync(true);
                            }}
                            className="btn-3d inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-[#16A34A] hover:bg-[#15803D] text-white rounded-xl cursor-pointer"
                          >
                            <Coins className="w-3.5 h-3.5" />
                            <span>{locale === 'bn' ? 'কিস্তি জমা' : 'Collect'}</span>
                          </button>

                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl"
                          >
                            <MessageSquareShare className="w-3.5 h-3.5" />
                            <span>WA</span>
                          </a>

                          {p.customerPhone && (
                            <a
                              href={smsUrl}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold bg-sky-50 border border-sky-200 text-sky-700 rounded-xl"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>SMS</span>
                            </a>
                          )}
                        </>
                      )}

                      {p.status === 'completed' && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{locale === 'bn' ? 'সম্পন্ন' : 'Paid'}</span>
                        </span>
                      )}

                      {canDelete &&
                        (confirmDeleteId === p.id ? (
                          <button
                            type="button"
                            onClick={() => {
                              setConfirmDeleteId(null);
                              void onDeletePlan(p.id);
                            }}
                            className="px-2 py-1.5 text-[10px] font-bold bg-rose-600 text-white rounded-lg cursor-pointer inline-flex items-center gap-0.5"
                          >
                            <Check className="w-3 h-3" />
                            <span>{locale === 'bn' ? 'নিশ্চিত' : 'Confirm'}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(p.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                            aria-label="Delete installment plan"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {collectTarget && (
        <div
          className="fixed inset-0 z-[80] bg-slate-900/55 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setCollectTarget(null);
          }}
        >
          <form
            onSubmit={handleCollectSubmit}
            className="w-full max-w-sm glass-3d-tile rounded-2xl bg-white p-5 space-y-3.5"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-extrabold text-slate-900">
                {locale === 'bn' ? 'কিস্তি জমা নিন' : 'Collect Kisti Payment'} ·{' '}
                {collectTarget.contactName}
              </h4>
              <button
                type="button"
                onClick={() => setCollectTarget(null)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {locale === 'bn' ? 'পরিমাণ (৳) *' : 'Amount (৳) *'}
              </label>
              <input
                type="number"
                min="0.01"
                max={collectTarget.remainingAmount}
                step="0.01"
                required
                autoFocus
                value={collectAmount}
                onChange={(e) => setCollectAmount(e.target.value)}
                className="w-full px-3 py-2 text-lg font-bold font-mono-num bg-white border border-slate-300 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {locale === 'bn' ? 'নোট (ঐচ্ছিক)' : 'Note'}
              </label>
              <input
                type="text"
                maxLength={300}
                value={collectNote}
                onChange={(e) => setCollectNote(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl"
              />
            </div>
            <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={collectCashSync}
                onChange={(e) => setCollectCashSync(e.target.checked)}
              />
              <span>
                {locale === 'bn'
                  ? 'ক্যাশবইয়ে স্বয়ংক্রিয় জমা দেখান'
                  : 'Record in Cashbook'}
              </span>
            </label>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setCollectTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 rounded-xl cursor-pointer"
              >
                {tr(locale, 'cancel')}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="btn-3d px-4 py-2 text-xs font-bold text-white bg-[#16A34A] hover:bg-[#15803D] rounded-xl cursor-pointer"
              >
                {locale === 'bn' ? 'জমা নিশ্চিত' : 'Confirm'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
