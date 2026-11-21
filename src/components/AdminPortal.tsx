import React, { useState } from 'react';
import { signInWithPopup, User } from 'firebase/auth';
import {
  ArrowLeft,
  Globe,
  LogOut,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { auth, googleProvider } from '../lib/firebase';
import { AdminUpdateShopPlanInput } from '../lib/shopService';
import {
  AccountStatus,
  AdminUser,
  AppUpdateConfig,
  CatalogAccentColor,
  CatalogItem,
  Complaint,
  ComplaintStatus,
  Locale,
  PaymentGatewaysConfig,
  PlanPricingConfig,
  PlanTier,
  ShopProfile,
  SupportTicket,
  SupportTicketStatus,
  UpgradeRequest,
  UpgradeRequestStatus,
} from '../types/shop';
import { AdminPanelTab } from './AdminPanelTab';

interface AdminPortalProps {
  locale: Locale;
  onToggleLocale: () => void;
  user: User | null;
  authReady: boolean;
  adminChecked: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  allShops: ShopProfile[];
  allUpgradeRequests: UpgradeRequest[];
  allSupportTickets: SupportTicket[];
  allComplaints: Complaint[];
  subAdmins: AdminUser[];
  pricing: PlanPricingConfig;
  gateways: PaymentGatewaysConfig;
  catalogItems: CatalogItem[];
  appUpdateConfig: AppUpdateConfig;
  notificationControls?: React.ReactNode;
  onExitAdmin: () => void;
  onLogout: () => Promise<void>;
  onUpdateShopPlan: (
    ownerUid: string,
    input: PlanTier | AdminUpdateShopPlanInput
  ) => Promise<void>;
  onUpdateAccountStatus: (
    ownerUid: string,
    input: { accountStatus: AccountStatus; banReason?: string }
  ) => Promise<void>;
  onSavePricing: (input: {
    proMonthly: number;
    proYearly: number;
    businessMonthly: number;
    businessYearly: number;
    discountNote?: string;
  }) => Promise<void>;
  onSaveGateways: (input: Omit<PaymentGatewaysConfig, 'updatedAt'>) => Promise<void>;
  onSaveCatalogItem: (
    input: {
      title: string;
      category: string;
      price: number;
      unitLabel?: string;
      description?: string;
      features?: string;
      accentColor: CatalogAccentColor;
      enabled: boolean;
      sortOrder: number;
    },
    existingId?: string
  ) => Promise<void>;
  onDeleteCatalogItem: (itemId: string) => Promise<void>;
  onApproveUpgrade: (
    req: UpgradeRequest,
    nextStatus: UpgradeRequestStatus,
    statusReason?: string,
    customRange?: { startedAtMs?: number; expiresAtMs?: number }
  ) => Promise<void>;
  onUpdateTicket: (
    ownerUid: string,
    ticketId: string,
    input: {
      status: Exclude<SupportTicketStatus, 'open'>;
      adminReply?: string;
      statusReason?: string;
    }
  ) => Promise<void>;
  onUpdateComplaint: (
    ownerUid: string,
    complaintId: string,
    input: {
      status: ComplaintStatus;
      adminReply?: string;
      statusReason?: string;
    }
  ) => Promise<void>;
  onAddSubAdmin: (uid: string, email: string) => Promise<void>;
  onRemoveSubAdmin: (uid: string) => Promise<void>;
  onSaveAppUpdate: (input: {
    latestVersionName: string;
    latestVersionCode: number;
    minSupportedVersionCode: number;
    apkDownloadUrl: string;
    updateDescription: string;
    forceUpdate: boolean;
  }) => Promise<void>;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  locale,
  onToggleLocale,
  user,
  authReady,
  adminChecked,
  isAdmin,
  isSuperAdmin,
  allShops,
  allUpgradeRequests,
  allSupportTickets,
  allComplaints,
  subAdmins,
  pricing,
  gateways,
  catalogItems,
  appUpdateConfig,
  notificationControls,
  onExitAdmin,
  onLogout,
  onUpdateShopPlan,
  onUpdateAccountStatus,
  onSavePricing,
  onSaveGateways,
  onSaveCatalogItem,
  onDeleteCatalogItem,
  onApproveUpgrade,
  onUpdateTicket,
  onUpdateComplaint,
  onAddSubAdmin,
  onRemoveSubAdmin,
  onSaveAppUpdate,
}) => {
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleAdminSignIn = async () => {
    setAuthError(null);
    setSigningIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Sign-in failed.');
    } finally {
      setSigningIn(false);
    }
  };

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass-3d-tile rounded-2xl px-6 py-4 text-sm font-semibold text-slate-700">
          {locale === 'bn' ? 'এডমিন পোর্টাল লোড হচ্ছে...' : 'Loading Admin Portal...'}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md glass-3d-tile rounded-3xl overflow-hidden">
          <div className="glass-3d-crimson px-6 py-7 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <img
                  src="/assets/aistudio/file_00000000351481f488ee43b477fe5afb_522353d9.png"
                  alt="MUNAF SHOP"
                  className="w-9 h-9 rounded-xl object-cover object-top border border-amber-300/80 shadow-sm shrink-0"
                />
                <span className="text-base font-bold tracking-tight">
                  {locale === 'bn' ? 'মোনাফ টেলিকম · এডমিন' : 'MUNAF SHOP · Admin'}
                </span>
              </div>
              <button
                type="button"
                onClick={onToggleLocale}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 cursor-pointer"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>{locale === 'bn' ? 'EN' : 'বাংলা'}</span>
              </button>
            </div>
            <h1 className="mt-5 text-2xl font-bold">
              {locale === 'bn'
                ? 'আলাদা এডমিন কন্ট্রোল পোর্টাল'
                : 'Dedicated Admin Control Portal'}
            </h1>
            <p className="mt-2 text-xs text-red-100 leading-relaxed">
              {locale === 'bn'
                ? 'দোকান অনুমোদন, প্যাকেজ অ্যাক্টিভেশন ও কাস্টমার সাপোর্ট টিকেট পরিচালনার জন্য অনুমোদিত এডমিন Google অ্যাকাউন্ট দিয়ে প্রবেশ করুন।'
                : 'Sign in with an authorized administrator Google account to manage shops, upgrades, and support tickets.'}
            </p>
          </div>

          <div className="p-6 space-y-4">
            {authError && (
              <p className="text-xs text-red-700 bg-red-50/90 border border-red-200 rounded-xl px-3 py-2">
                {authError}
              </p>
            )}

            <button
              type="button"
              disabled={signingIn}
              onClick={handleAdminSignIn}
              className="btn-3d w-full py-3 px-4 bg-[#B91C1C] hover:bg-[#991B1B] text-white text-sm font-bold rounded-xl cursor-pointer disabled:opacity-60"
            >
              {signingIn
                ? locale === 'bn'
                  ? 'লগইন হচ্ছে...'
                  : 'Signing in...'
                : locale === 'bn'
                ? 'এডমিন Google অ্যাকাউন্ট দিয়ে লগইন'
                : 'Sign in as Admin'}
            </button>

            <button
              type="button"
              onClick={onExitAdmin}
              className="w-full py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>
                {locale === 'bn'
                  ? 'ইউজার শপ অ্যাপে ফিরে যান'
                  : 'Back to Shop User App'}
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!adminChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass-3d-tile rounded-2xl px-6 py-4 text-sm font-semibold text-slate-700">
          {locale === 'bn' ? 'অ্যাডমিন অনুমতি যাচাই হচ্ছে...' : 'Verifying admin access...'}
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md glass-3d-tile rounded-3xl p-7 text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-red-50/90 border border-red-200 flex items-center justify-center text-[#B91C1C]">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            {locale === 'bn' ? 'এডমিন অ্যাক্সেস অনুমোদিত নয়' : 'Admin Access Denied'}
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            {locale === 'bn'
              ? `বর্তমান অ্যাকাউন্ট (${user.email}) একটি সাধারণ ইউজার অ্যাকাউন্ট। এডমিন প্যানেলে শুধুমাত্র অনুমোদিত এডমিন প্রবেশ করতে পারবেন।`
              : `Your signed-in account (${user.email}) does not have administrator privileges.`}
          </p>
          <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
            <button
              type="button"
              onClick={onExitAdmin}
              className="btn-3d flex-1 py-2.5 px-4 bg-[#B91C1C] hover:bg-[#991B1B] text-white text-xs font-bold rounded-xl cursor-pointer"
            >
              {locale === 'bn' ? 'ইউজার শপে যান' : 'Go to Shop App'}
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="flex-1 py-2.5 px-4 bg-white/85 border border-slate-300 hover:bg-white text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
            >
              {locale === 'bn' ? 'লগআউট করুন' : 'Sign Out'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-3 sm:p-5 max-w-[1380px] mx-auto space-y-4">
      <header className="h-16 glass-card rounded-2xl px-4 sm:px-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <img
            src="/assets/aistudio/file_00000000351481f488ee43b477fe5afb_522353d9.png"
            alt="MUNAF SHOP"
            className="w-9 h-9 rounded-xl object-cover object-top border border-rose-200 shadow-sm shrink-0"
          />
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900 truncate">
              {locale === 'bn' ? 'MUNAF SHOP · এডমিন প্যানেল' : 'MUNAF SHOP · Admin Portal'}
            </p>
            <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {notificationControls}
          <button
            type="button"
            onClick={onExitAdmin}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white/85 border border-slate-200 hover:bg-white rounded-xl cursor-pointer whitespace-nowrap"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{locale === 'bn' ? 'শপ অ্যাপ' : 'Shop App'}</span>
          </button>

          <button
            type="button"
            onClick={onToggleLocale}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white/85 border border-slate-200 hover:bg-white rounded-xl cursor-pointer whitespace-nowrap"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{locale === 'bn' ? 'EN' : 'বাংলা'}</span>
          </button>

          <button
            type="button"
            onClick={onLogout}
            title={locale === 'bn' ? 'লগআউট' : 'Sign Out'}
            className="p-2 text-slate-600 hover:bg-red-50 hover:text-red-600 rounded-xl cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <AdminPanelTab
        locale={locale}
        currentEmail={user.email ?? ''}
        isSuperAdmin={isSuperAdmin}
        allShops={allShops}
        allUpgradeRequests={allUpgradeRequests}
        allSupportTickets={allSupportTickets}
        allComplaints={allComplaints}
        subAdmins={subAdmins}
        pricing={pricing}
        gateways={gateways}
        catalogItems={catalogItems}
        appUpdateConfig={appUpdateConfig}
        onUpdateShopPlan={onUpdateShopPlan}
        onUpdateAccountStatus={onUpdateAccountStatus}
        onSavePricing={onSavePricing}
        onSaveGateways={onSaveGateways}
        onSaveCatalogItem={onSaveCatalogItem}
        onDeleteCatalogItem={onDeleteCatalogItem}
        onApproveUpgrade={onApproveUpgrade}
        onUpdateTicket={onUpdateTicket}
        onUpdateComplaint={onUpdateComplaint}
        onAddSubAdmin={onAddSubAdmin}
        onRemoveSubAdmin={onRemoveSubAdmin}
        onSaveAppUpdate={onSaveAppUpdate}
      />
    </div>
  );
};
