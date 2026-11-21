import React, { useState } from 'react';
import { Building2, Check, Plus, Trash2, X } from 'lucide-react';
import { Locale, ShopBranch } from '../types/shop';
import { tr } from '../lib/i18n';

interface BranchSwitcherModalProps {
  locale: Locale;
  primaryShopName: string;
  primaryShopAddress?: string;
  branches: ShopBranch[];
  activeBranchId: string;
  canManage: boolean;
  onSelectBranch: (branchId: string) => void;
  onSaveBranch: (
    input: {
      name: string;
      address?: string;
      phone?: string;
      businessType?: string;
      isDefault?: boolean;
    },
    existingId?: string
  ) => Promise<string>;
  onDeleteBranch: (branchId: string) => Promise<void>;
  onClose: () => void;
}

export const BranchSwitcherModal: React.FC<BranchSwitcherModalProps> = ({
  locale,
  primaryShopName,
  primaryShopAddress,
  branches,
  activeBranchId,
  canManage,
  onSelectBranch,
  onSaveBranch,
  onDeleteBranch,
  onClose,
}) => {
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setErrorMsg(null);
    setSaving(true);
    try {
      const newId = await onSaveBranch({
        name: name.trim(),
        address: address.trim(),
        phone: phone.trim(),
        isDefault: false,
      });
      setName('');
      setAddress('');
      setPhone('');
      setShowAdd(false);
      onSelectBranch(newId);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : locale === 'bn'
          ? 'শাখা তৈরি করতে সমস্যা হয়েছে।'
          : 'Failed to create branch.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[77] bg-slate-900/55 backdrop-blur-md flex items-center justify-center p-4 no-print"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md glass-3d-tile rounded-3xl bg-white p-5 sm:p-6 space-y-4 max-h-[88vh] overflow-y-auto">
        <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                {locale === 'bn'
                  ? 'মাল্টি-শপ / শাখা পরিবর্তন'
                  : 'Multi-Shop / Branch Switcher'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {locale === 'bn'
                  ? 'একাধিক দোকান বা শাখার হিসাব আলাদা রাখুন'
                  : 'Switch between main shop and additional branches'}
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

        <div className="space-y-2">
          <button
            type="button"
            onClick={() => {
              onSelectBranch('main');
              onClose();
            }}
            className={`w-full text-left px-3.5 py-3 rounded-2xl border flex items-center justify-between cursor-pointer ${
              activeBranchId === 'main'
                ? 'bg-rose-50 border-[#B91C1C] text-[#991B1B]'
                : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-white'
            }`}
          >
            <div className="min-w-0">
              <p className="text-sm font-extrabold truncate">
                {primaryShopName} ({locale === 'bn' ? 'মূল দোকান' : 'Primary'})
              </p>
              {primaryShopAddress && (
                <p className="text-[11px] text-slate-500 truncate">{primaryShopAddress}</p>
              )}
            </div>
            {activeBranchId === 'main' && <Check className="w-4 h-4 text-[#B91C1C] shrink-0" />}
          </button>

          {branches.map((br) => {
            const selected = activeBranchId === br.id;
            return (
              <div
                key={br.id}
                className={`rounded-2xl border px-3.5 py-2.5 flex items-center justify-between gap-2 ${
                  selected
                    ? 'bg-rose-50 border-[#B91C1C] text-[#991B1B]'
                    : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    onSelectBranch(br.id);
                    onClose();
                  }}
                  className="flex-1 text-left min-w-0 cursor-pointer"
                >
                  <p className="text-sm font-bold truncate">{br.name}</p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {[br.address, br.phone].filter(Boolean).join(' · ') ||
                      (locale === 'bn' ? 'অতিরিক্ত শাখা' : 'Branch Shop')}
                  </p>
                </button>
                <div className="flex items-center gap-1.5 shrink-0">
                  {selected && <Check className="w-4 h-4 text-[#B91C1C]" />}
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => {
                        if (selected) onSelectBranch('main');
                        void onDeleteBranch(br.id);
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer"
                      aria-label="Delete branch"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {canManage && !showAdd && (
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="w-full py-2.5 px-4 rounded-xl border border-dashed border-[#B91C1C]/50 text-[#B91C1C] hover:bg-rose-50 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{locale === 'bn' ? 'নতুন শাখা / ব্যবসা যোগ করুন' : 'Add New Branch'}</span>
          </button>
        )}

        {canManage && showAdd && (
          <form
            onSubmit={handleAdd}
            className="rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-2.5"
          >
            <input
              type="text"
              required
              maxLength={100}
              placeholder={locale === 'bn' ? 'শাখা বা নতুন দোকানের নাম *' : 'Branch Name *'}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                maxLength={200}
                placeholder={locale === 'bn' ? 'ঠিকানা' : 'Address'}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl"
              />
              <input
                type="tel"
                maxLength={30}
                placeholder={locale === 'bn' ? 'ফোন' : 'Phone'}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl font-mono-num"
              />
            </div>
            {errorMsg && (
              <p className="text-xs font-semibold text-rose-700">{errorMsg}</p>
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
                {locale === 'bn' ? 'শাখা তৈরি করুন' : 'Create Branch'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
