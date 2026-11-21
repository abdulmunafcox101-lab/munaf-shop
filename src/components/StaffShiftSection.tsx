import React, { useState } from 'react';
import {
  Check,
  Clock,
  KeyRound,
  Plus,
  ShieldCheck,
  Trash2,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { Locale, ShiftClosing, StaffMember, StaffRole } from '../types/shop';
import { hashPin, verifyPin } from '../lib/security';
import { formatTaka } from '../lib/shopService';
import { tr } from '../lib/i18n';

export const OperatorSwitcherModal: React.FC<{
  locale: Locale;
  ownerPinHash: string | null;
  staffMembers: StaffMember[];
  activeStaff: StaffMember | null;
  onSwitchOperator: (staff: StaffMember | null) => void;
  onClose: () => void;
}> = ({
  locale,
  ownerPinHash,
  staffMembers,
  activeStaff,
  onSwitchOperator,
  onClose,
}) => {
  const [target, setTarget] = useState<'owner' | StaffMember | null>(null);
  const [pin, setPin] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const activeStaffList = staffMembers.filter((s) => s.active);

  const handleSelectTarget = (choice: 'owner' | StaffMember) => {
    setErrorMsg(null);
    setPin('');
    if (choice === 'owner' && !ownerPinHash) {
      onSwitchOperator(null);
      onClose();
      return;
    }
    setTarget(choice);
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target) return;
    setErrorMsg(null);
    setVerifying(true);
    try {
      const hashToCheck =
        target === 'owner' ? ownerPinHash || '' : target.pinHash;
      const ok = await verifyPin(pin.trim(), hashToCheck);
      if (!ok) {
        setErrorMsg(
          locale === 'bn' ? 'পিন নম্বর ভুল হয়েছে!' : 'Incorrect PIN code.'
        );
        return;
      }
      onSwitchOperator(target === 'owner' ? null : target);
      onClose();
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[78] bg-slate-900/55 backdrop-blur-md flex items-center justify-center p-4 no-print"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-sm glass-3d-tile rounded-3xl bg-white p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-[#B91C1C]" />
            <h3 className="text-sm font-extrabold text-slate-900">
              {locale === 'bn'
                ? 'অপারেটর / স্টাফ পরিবর্তন'
                : 'Switch Active Operator'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {!target ? (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => handleSelectTarget('owner')}
              className={`w-full text-left px-3.5 py-3 rounded-2xl border flex items-center justify-between cursor-pointer ${
                !activeStaff
                  ? 'bg-rose-50 border-[#B91C1C] text-[#991B1B]'
                  : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-white'
              }`}
            >
              <div>
                <p className="text-sm font-extrabold">
                  {locale === 'bn' ? 'মালিক (Owner Mode)' : 'Owner (Full Access)'}
                </p>
                <p className="text-[11px] text-slate-500">
                  {locale === 'bn'
                    ? 'সকল লাভ, হিসাব ও ডিলিট পারমিশন'
                    : 'Full profit reports & delete access'}
                </p>
              </div>
              {!activeStaff && <Check className="w-4 h-4 text-[#B91C1C]" />}
            </button>

            {activeStaffList.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-3">
                {locale === 'bn'
                  ? 'কোনো সক্রিয় স্টাফ যুক্ত নেই। রিপোর্ট > স্টাফ সেটিংস থেকে স্টাফ যোগ করুন।'
                  : 'No active staff yet. Add staff from Reports > Staff & Shift.'}
              </p>
            ) : (
              activeStaffList.map((st) => {
                const isCur = activeStaff?.id === st.id;
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => handleSelectTarget(st)}
                    className={`w-full text-left px-3.5 py-2.5 rounded-2xl border flex items-center justify-between cursor-pointer ${
                      isCur
                        ? 'bg-rose-50 border-[#B91C1C] text-[#991B1B]'
                        : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-white'
                    }`}
                  >
                    <div>
                      <p className="text-xs font-extrabold">{st.name}</p>
                      <p className="text-[10px] text-slate-500 uppercase">
                        {st.role} ·{' '}
                        {st.canViewProfit
                          ? locale === 'bn'
                            ? 'লাভ দৃশ্যমান'
                            : 'Profit ON'
                          : locale === 'bn'
                          ? 'লাভ লুকানো'
                          : 'Profit Hidden'}
                      </p>
                    </div>
                    {isCur && <Check className="w-4 h-4 text-[#B91C1C]" />}
                  </button>
                );
              })
            )}
          </div>
        ) : (
          <form onSubmit={handleVerifySubmit} className="space-y-3">
            <p className="text-xs font-semibold text-slate-700">
              {locale === 'bn'
                ? `${
                    target === 'owner' ? 'মালিক (Owner)' : target.name
                  } এর ৪-৬ সংখ্যার পিন দিন:`
                : `Enter 4–6 digit PIN for ${
                    target === 'owner' ? 'Owner' : target.name
                  }:`}
            </p>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              required
              autoFocus
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              className="w-full px-3.5 py-2.5 text-center text-xl font-bold font-mono-num bg-white border border-slate-300 rounded-xl"
            />
            {errorMsg && (
              <p className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                {errorMsg}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setTarget(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 cursor-pointer"
              >
                {locale === 'bn' ? 'পেছনে' : 'Back'}
              </button>
              <button
                type="submit"
                disabled={verifying}
                className="btn-3d px-4 py-2 text-xs font-bold text-white bg-[#B91C1C] rounded-xl cursor-pointer"
              >
                {locale === 'bn' ? 'যাচাই ও চালু' : 'Unlock'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export const ShiftClosingModal: React.FC<{
  locale: Locale;
  activeOperatorName: string;
  todayIn: number;
  todayOut: number;
  currentCash: number;
  onCreateShiftClosing: (input: {
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
  onClose: () => void;
}> = ({
  locale,
  activeOperatorName,
  todayIn,
  todayOut,
  currentCash,
  onCreateShiftClosing,
  onClose,
}) => {
  const openingCash = Number((currentCash - (todayIn - todayOut)).toFixed(2));
  const [shiftLabel, setShiftLabel] = useState(
    locale === 'bn' ? 'সন্ধ্যা / দৈনিক শিফট ক্লোজ' : 'Daily Shift Close'
  );
  const [actualCash, setActualCash] = useState(String(Math.max(0, currentCash)));
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const countedNum = Math.max(0, Number(actualCash) || 0);
  const variance = Number((countedNum - currentCash).toFixed(2));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSaving(true);
    try {
      await onCreateShiftClosing({
        staffName: activeOperatorName,
        shiftLabel: shiftLabel.trim() || 'Day Shift',
        openingCash,
        cashInTotal: Math.max(0, todayIn),
        cashOutTotal: Math.max(0, todayOut),
        expectedClosing: currentCash,
        actualCashCount: countedNum,
        variance,
        note: note.trim(),
      });
      onClose();
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : locale === 'bn'
          ? 'শিফট ক্লোজ সেভ করতে সমস্যা হয়েছে।'
          : 'Failed to save shift closing.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[76] bg-slate-900/55 backdrop-blur-md flex items-center justify-center p-4 no-print"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md glass-3d-tile rounded-3xl bg-white p-5 sm:p-6 space-y-4"
      >
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#B91C1C]" />
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                {locale === 'bn'
                  ? 'দৈনিক শিফট ক্যাশ ক্লোজিং (Handover)'
                  : 'Daily Shift Cash Closing'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {locale === 'bn' ? 'দায়িত্বপ্রাপ্ত:' : 'Operator:'} {activeOperatorName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3 space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-600">{locale === 'bn' ? 'শুরুর ক্যাশ' : 'Opening Cash'}</span>
            <span className="font-mono-num font-bold">{formatTaka(openingCash)}</span>
          </div>
          <div className="flex justify-between text-emerald-700">
            <span>{locale === 'bn' ? 'আজ ক্যাশ ইন (+)' : 'Today In (+)'}</span>
            <span className="font-mono-num font-bold">{formatTaka(todayIn)}</span>
          </div>
          <div className="flex justify-between text-rose-700">
            <span>{locale === 'bn' ? 'আজ ক্যাশ আউট (-)' : 'Today Out (-)'}</span>
            <span className="font-mono-num font-bold">{formatTaka(todayOut)}</span>
          </div>
          <div className="flex justify-between pt-1.5 border-t border-slate-200 font-extrabold text-slate-900">
            <span>{locale === 'bn' ? 'হিসাব অনুযায়ী ক্যাশ' : 'Expected Closing'}</span>
            <span className="font-mono-num">{formatTaka(currentCash)}</span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            {locale === 'bn' ? 'শিফটের নাম' : 'Shift Name'}
          </label>
          <input
            type="text"
            required
            maxLength={60}
            value={shiftLabel}
            onChange={(e) => setShiftLabel(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            {locale === 'bn' ? 'ক্যাশবাক্সে হাতে গণনা করা টাকা (৳) *' : 'Actual Counted Cash (৳) *'}
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            required
            value={actualCash}
            onChange={(e) => setActualCash(e.target.value)}
            className="w-full px-3.5 py-2.5 text-xl font-bold font-mono-num bg-white border border-slate-300 rounded-xl"
          />
        </div>

        <div
          className={`rounded-xl px-3 py-2 text-xs font-bold flex justify-between ${
            Math.abs(variance) < 0.01
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : variance > 0
              ? 'bg-sky-50 text-sky-800 border border-sky-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <span>
            {Math.abs(variance) < 0.01
              ? locale === 'bn'
                ? 'ক্যাশ হ্যান্ডওভার সম্পূর্ণ মিলেছে'
                : 'Exact Match'
              : variance > 0
              ? locale === 'bn'
                ? 'বাড়তি ক্যাশ (+)'
                : 'Surplus (+)'
              : locale === 'bn'
              ? 'ঘাটতি ক্যাশ (-)'
              : 'Shortage (-)'}
          </span>
          <span className="font-mono-num">{formatTaka(Math.abs(variance))}</span>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            {locale === 'bn' ? 'হ্যান্ডওভার নোট (ঐচ্ছিক)' : 'Note'}
          </label>
          <input
            type="text"
            maxLength={300}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl"
          />
        </div>

        {errorMsg && (
          <p className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700">
            {errorMsg}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 cursor-pointer"
          >
            {tr(locale, 'cancel')}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="btn-3d px-5 py-2 text-xs font-bold text-white bg-[#B91C1C] hover:bg-[#991B1B] rounded-xl cursor-pointer"
          >
            {saving
              ? locale === 'bn'
                ? 'সেভ হচ্ছে...'
                : 'Saving...'
              : locale === 'bn'
              ? 'শিফট ক্লোজ রেকর্ড করুন'
              : 'Record Shift Close'}
          </button>
        </div>
      </form>
    </div>
  );
};

export const StaffManagementSection: React.FC<{
  locale: Locale;
  staffMembers: StaffMember[];
  shiftClosings: ShiftClosing[];
  isStaffSession: boolean;
  onSaveStaff: (
    input: {
      name: string;
      phone?: string;
      role: StaffRole;
      pinHash: string;
      canViewProfit: boolean;
      canDeleteRecords: boolean;
      active: boolean;
    },
    existingId?: string
  ) => Promise<string>;
  onToggleStaffActive: (staff: StaffMember) => Promise<void>;
  onDeleteStaff: (staffId: string) => Promise<void>;
  onDeleteShiftClosing: (shiftId: string) => Promise<void>;
  onOpenOperatorSwitcher: () => void;
}> = ({
  locale,
  staffMembers,
  shiftClosings,
  isStaffSession,
  onSaveStaff,
  onToggleStaffActive,
  onDeleteStaff,
  onDeleteShiftClosing,
  onOpenOperatorSwitcher,
}) => {
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<StaffRole>('cashier');
  const [pin, setPin] = useState('');
  const [canViewProfit, setCanViewProfit] = useState(false);
  const [canDeleteRecords, setCanDeleteRecords] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !/^\d{4,6}$/.test(pin.trim())) {
      setErrorMsg(
        locale === 'bn'
          ? 'স্টাফের নাম এবং ৪-৬ সংখ্যার পিন দিন।'
          : 'Enter staff name and 4–6 digit PIN.'
      );
      return;
    }
    setErrorMsg(null);
    setSaving(true);
    try {
      const pinHash = await hashPin(pin.trim());
      await onSaveStaff({
        name: name.trim(),
        phone: phone.trim(),
        role,
        pinHash,
        canViewProfit,
        canDeleteRecords,
        active: true,
      });
      setName('');
      setPhone('');
      setPin('');
      setCanViewProfit(false);
      setCanDeleteRecords(false);
      setShowAdd(false);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : locale === 'bn'
          ? 'স্টাফ সেভ করতে সমস্যা হয়েছে।'
          : 'Failed to save staff member.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 max-w-2xl no-print">
      <div className="glass-3d-tile rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#B91C1C]" />
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                {locale === 'bn'
                  ? 'স্টাফ / কর্মচারী ও রোল নিয়ন্ত্রণ'
                  : 'Staff & Role Permissions'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {locale === 'bn'
                  ? 'ক্যাশিয়ার বা ম্যানেজার পিন সেট করে লাভ ও ডিলিট পারমিশন নিয়ন্ত্রণ করুন'
                  : 'Control PIN access, profit visibility & delete rights'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenOperatorSwitcher}
              className="px-3 py-1.5 text-xs font-bold bg-slate-900 text-white rounded-xl cursor-pointer inline-flex items-center gap-1"
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-300" />
              <span>{locale === 'bn' ? 'অপারেটর বদল' : 'Switch Operator'}</span>
            </button>

            {!isStaffSession && (
              <button
                type="button"
                onClick={() => setShowAdd((v) => !v)}
                className="btn-3d px-3 py-1.5 text-xs font-bold bg-[#B91C1C] text-white rounded-xl cursor-pointer inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{locale === 'bn' ? 'নতুন স্টাফ' : 'Add Staff'}</span>
              </button>
            )}
          </div>
        </div>

        {showAdd && !isStaffSession && (
          <form
            onSubmit={handleAddStaff}
            className="rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-3"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                required
                maxLength={100}
                placeholder={locale === 'bn' ? 'কর্মচারীর নাম *' : 'Staff Name *'}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl"
              />
              <input
                type="tel"
                maxLength={30}
                placeholder={locale === 'bn' ? 'মোবাইল নম্বর' : 'Phone'}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl font-mono-num"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as StaffRole)}
                className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl"
              >
                <option value="cashier">{locale === 'bn' ? 'ক্যাশিয়ার (Cashier)' : 'Cashier'}</option>
                <option value="salesman">{locale === 'bn' ? 'সেলসম্যান (Salesman)' : 'Salesman'}</option>
                <option value="manager">{locale === 'bn' ? 'ম্যানেজার (Manager)' : 'Manager'}</option>
              </select>
              <input
                type="password"
                inputMode="numeric"
                required
                maxLength={6}
                placeholder={locale === 'bn' ? '৪-৬ সংখ্যার পিন *' : '4-6 digit PIN *'}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl font-mono-num"
              />
            </div>

            <div className="flex flex-wrap gap-4 text-xs font-semibold text-slate-700">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={canViewProfit}
                  onChange={(e) => setCanViewProfit(e.target.checked)}
                />
                <span>{locale === 'bn' ? 'ক্রয়মূল্য ও লাভ দেখতে পারবে' : 'Can view purchase cost & profit'}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={canDeleteRecords}
                  onChange={(e) => setCanDeleteRecords(e.target.checked)}
                />
                <span>{locale === 'bn' ? 'হিসাব ডিলিট করতে পারবে' : 'Can delete entries'}</span>
              </label>
            </div>

            {errorMsg && (
              <p className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                {errorMsg}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 cursor-pointer"
              >
                {tr(locale, 'cancel')}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="btn-3d px-4 py-1.5 text-xs font-bold text-white bg-[#B91C1C] rounded-xl cursor-pointer"
              >
                {locale === 'bn' ? 'স্টাফ সেভ করুন' : 'Save Staff'}
              </button>
            </div>
          </form>
        )}

        {staffMembers.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-4">
            {locale === 'bn'
              ? 'এখনো কোনো স্টাফ যোগ করা হয়নি।'
              : 'No staff members added yet.'}
          </p>
        ) : (
          <div className="space-y-2">
            {staffMembers.map((st) => (
              <div
                key={st.id}
                className="rounded-xl bg-white/90 border border-slate-200 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck
                      className={`w-4 h-4 ${
                        st.active ? 'text-emerald-600' : 'text-slate-400'
                      }`}
                    />
                    <span className="font-bold text-slate-900">{st.name}</span>
                    <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                      {st.role}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {st.canViewProfit
                      ? locale === 'bn'
                        ? 'লাভ দৃশ্যমান'
                        : 'Profit: Yes'
                      : locale === 'bn'
                      ? 'লাভ লুকানো'
                      : 'Profit: No'}{' '}
                    ·{' '}
                    {st.canDeleteRecords
                      ? locale === 'bn'
                        ? 'ডিলিট: চালু'
                        : 'Delete: Yes'
                      : locale === 'bn'
                      ? 'ডিলিট: বন্ধ'
                      : 'Delete: No'}
                  </p>
                </div>

                {!isStaffSession && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => void onToggleStaffActive(st)}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg cursor-pointer ${
                        st.active
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {st.active
                        ? locale === 'bn'
                          ? 'সক্রিয়'
                          : 'Active'
                        : locale === 'bn'
                        ? 'নিষ্ক্রিয়'
                        : 'Paused'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void onDeleteStaff(st.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="glass-3d-tile rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2.5">
          <Clock className="w-4 h-4 text-[#B91C1C]" />
          <h3 className="text-sm font-extrabold text-slate-900">
            {locale === 'bn'
              ? `দৈনিক শিফট ক্লোজিং লগ (${shiftClosings.length})`
              : `Shift Handover History (${shiftClosings.length})`}
          </h3>
        </div>

        {shiftClosings.length === 0 ? (
          <p className="text-xs text-slate-500 py-3">
            {locale === 'bn'
              ? 'ক্যাশবক্স ট্যাবের "শিফট ক্লোজ" বাটন থেকে প্রতিদিনের ক্যাশ হ্যান্ডওভার সেভ করুন।'
              : 'Use "Shift Close" in Cashbox tab to log daily cash handovers.'}
          </p>
        ) : (
          <div className="space-y-2">
            {shiftClosings.slice(0, 15).map((sh) => (
              <div
                key={sh.id}
                className="rounded-xl bg-white/90 border border-slate-200 px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs"
              >
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 truncate">
                    {sh.shiftLabel} · {sh.staffName}
                  </p>
                  <p className="text-[11px] text-slate-500 font-mono-num">
                    {locale === 'bn' ? 'প্রত্যাশিত:' : 'Expected:'}{' '}
                    {formatTaka(sh.expectedClosing)} ·{' '}
                    {locale === 'bn' ? 'গণনা:' : 'Counted:'}{' '}
                    {formatTaka(sh.actualCashCount)}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`font-mono-num font-bold px-2 py-0.5 rounded-md text-[11px] ${
                      Math.abs(sh.variance) < 0.01
                        ? 'bg-emerald-50 text-emerald-700'
                        : sh.variance > 0
                        ? 'bg-sky-50 text-sky-700'
                        : 'bg-rose-50 text-rose-700'
                    }`}
                  >
                    {sh.variance >= 0 ? '+' : ''}
                    {formatTaka(sh.variance)}
                  </span>
                  {!isStaffSession && (
                    <button
                      type="button"
                      onClick={() => void onDeleteShiftClosing(sh.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
