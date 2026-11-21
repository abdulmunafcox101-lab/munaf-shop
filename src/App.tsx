/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import {
  collection,
  collectionGroup,
  doc,
  onSnapshot,
  query,
  waitForPendingWrites,
  where,
} from 'firebase/firestore';
import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  Building2,
  Calculator,
  ChevronDown,
  Crown,
  Globe,
  Headphones,
  Inbox,
  Layers,
  Lock,
  LogOut,
  Menu,
  MessageSquareWarning,
  Package,
  QrCode,
  Settings,
  Smartphone,
  Timer,
  UserCheck,
  Volume2,
  VolumeX,
  Wallet,
  X,
} from 'lucide-react';
import { auth, db, handleFirestoreError, OperationType } from './lib/firebase';
import {
  AdminUser,
  AppUpdateConfig,
  CashEntry,
  CatalogItem,
  Complaint,
  Contact,
  InstallmentPlan,
  KhataEntry,
  Locale,
  PaymentGatewaysConfig,
  PlanPricingConfig,
  Product,
  PurchaseOrder,
  SaleInvoice,
  ShiftClosing,
  ShopBranch,
  ShopProfile,
  StaffMember,
  SupportTicket,
  TelecomEntry,
  UpgradeRequest,
} from './types/shop';
import { tr } from './lib/i18n';
import {
  addCashEntry,
  addKhataTransaction,
  addTelecomEntry,
  adjustProductStock,
  adminAddSubAdmin,
  adminApproveUpgradeRequest,
  adminDeleteCatalogItem,
  adminRemoveSubAdmin,
  adminSaveAppUpdateConfig,
  adminSaveCatalogItem,
  adminSavePaymentGateways,
  adminSavePlatformPricing,
  adminUpdateComplaint,
  adminUpdateShopAccountStatus,
  adminUpdateShopPlan,
  adminUpdateSupportTicket,
  createComplaint,
  createContactWithOptionalBalance,
  createInstallmentPlan,
  createPurchaseOrder,
  createShiftClosing,
  createShopProfile,
  createSupportTicket,
  DEFAULT_APP_UPDATE_CONFIG,
  DEFAULT_PAYMENT_GATEWAYS,
  DEFAULT_PRICING,
  deleteCashEntry,
  deleteContactAndEntries,
  deleteInstallmentPlan,
  deleteKhataTransaction,
  deleteProduct,
  deletePurchaseOrder,
  deleteSaleInvoice,
  deleteShiftClosing,
  deleteShopBranch,
  deleteStaffMember,
  deleteTelecomEntry,
  recordInstallmentPayment,
  recordPosCartSale,
  recordQuickProductSale,
  saveProduct,
  saveShopBranch,
  saveStaffMember,
  sendComplaintNotificationEmail,
  sendOrderNotificationEmail,
  setClientUpdateBlocked,
  submitUpgradeRequest,
  SUPER_ADMIN_EMAIL,
  SUPPORT_HELPLINE,
  syncShopOwnerEmail,
  toggleStaffActive,
  updateComplaintUserStatus,
  updateContactDetails,
  updateShopPin,
  updateShopProfile,
  updateSupportTicketStatus,
} from './lib/shopService';
import {
  FORCE_UPDATE_EVENT,
  getCachedInstalledVersion,
  getInstalledAppVersion,
  InstalledAppVersion,
  isAppVersionOutdated,
} from './lib/appVersion';
import { SETTINGS_CHANGED_EVENT } from './lib/appSettings';
import { dispatchSystemNotification } from './lib/systemNotifications';
import {
  AppNotification,
  getSavedVoiceEnabled,
  NotificationCategory,
  setSavedVoiceEnabled,
  speakHumanNotification,
  stopActiveSpeech,
} from './lib/voiceNotifier';
import {
  NotificationCenterControls,
  SpokenToastBanner,
} from './components/NotificationCenter';
import { AuthScreen } from './components/AuthScreen';
import { ShopSetupScreen } from './components/ShopSetupScreen';
import { PinLockScreen } from './components/PinLockScreen';
import { MandatoryUpdateScreen } from './components/MandatoryUpdateScreen';
import { TallyKhataTab } from './components/TallyKhataTab';
import { CashbookTab } from './components/CashbookTab';
import { TelecomMfsTab } from './components/TelecomMfsTab';
import { StockPosTab } from './components/StockPosTab';
import { PackageCatalogTab } from './components/PackageCatalogTab';
import { ComplaintBoxTab } from './components/ComplaintBoxTab';
import { ReportsSettingsTab } from './components/ReportsSettingsTab';
import { AdminPortal } from './components/AdminPortal';
import { AccountStatusPopup } from './components/AccountStatusPopup';
import { CalculatorModal } from './components/CalculatorModal';
import { BranchSwitcherModal } from './components/BranchSwitcherModal';
import { OperatorSwitcherModal } from './components/StaffShiftSection';
import {
  getRemainingDaysQuick,
  PackageCountdownBanner,
  padTwo,
  toBnNumber,
  useLiveCountdown,
} from './components/PackageCountdownBanner';
import {
  OfflineIndicator,
  PWAInstallButton,
} from './components/PWAInstallBanner';

type TabId =
  | 'tally'
  | 'cashbook'
  | 'telecom'
  | 'stock'
  | 'packages'
  | 'complaints'
  | 'reports';

type PackageSubView = 'plans' | 'catalog' | 'gateways' | 'history';
type ReportSubView = 'summary' | 'analytics' | 'staff' | 'profile' | 'security';

const PENDING_TS_SORT = Number.MAX_SAFE_INTEGER;
function tsMillisOrPending(
  ts: { toMillis: () => number } | null | undefined
): number {
  return ts ? ts.toMillis() : PENDING_TS_SORT;
}

function detectAdminRoute(): boolean {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname;
  const hash = window.location.hash;
  const search = window.location.search;
  return (
    path === '/admin' ||
    path.startsWith('/admin/') ||
    hash === '#/admin' ||
    hash.startsWith('#/admin/') ||
    search.includes('admin=1')
  );
}

const TallyTrialStrip: React.FC<{
  shop: ShopProfile;
  locale: Locale;
  onUpgradeClick: () => void;
}> = ({ shop, locale, onUpgradeClick }) => {
  const tier = shop.planTier ?? 'free';
  const isPaid = tier === 'pro' || tier === 'business';
  const countdown = useLiveCountdown(shop.planStartedAt, shop.planExpiresAt);

  return (
    <button
      type="button"
      onClick={onUpgradeClick}
      className="w-full glass-3d-tile card-3d-depth rounded-2xl px-4 py-3.5 text-center bg-gradient-to-r from-[#fce9f1]/95 via-[#fdf2f7]/95 to-[#fce9f1]/95 border border-rose-200/70 cursor-pointer space-y-1.5"
    >
      <p className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 text-3d-dark">
        {isPaid && countdown.hasSchedule
          ? countdown.isExpired
            ? locale === 'bn'
              ? 'প্যাকেজের মেয়াদ শেষ হয়েছে'
              : 'Package Expired'
            : locale === 'bn'
            ? 'প্যাকেজ মেয়াদ শেষ হতে'
            : 'Package Ends In'
          : locale === 'bn'
          ? 'টালিখাতা গোল্ড ও প্রিমিয়াম'
          : 'TallyKhata Gold & Pro'}
      </p>

      {isPaid && countdown.hasSchedule ? (
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-bold font-mono-num">
          {countdown.isExpired ? (
            <span className="text-rose-700">
              {locale === 'bn'
                ? 'নিরবচ্ছিন্ন সেবা চালু রাখতে রিনিউ করুন →'
                : 'Renew now to continue →'}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[#B91C1C]">
              <Timer className="w-3.5 h-3.5" />
              <span>
                {padTwo(countdown.days, locale)} {locale === 'bn' ? 'দিন' : 'd'} ·{' '}
                {padTwo(countdown.hours, locale)} {locale === 'bn' ? 'ঘণ্টা' : 'h'} ·{' '}
                {padTwo(countdown.minutes, locale)} {locale === 'bn' ? 'মি' : 'm'} ·{' '}
                {padTwo(countdown.seconds, locale)} {locale === 'bn' ? 'সে' : 's'}
              </span>
            </span>
          )}
        </div>
      ) : (
        <p className="text-xs font-semibold text-[#B91C1C]">
          {locale === 'bn'
            ? 'অটো ক্যাশ সিঙ্ক, MFS রেজিস্টার ও ক্যাটালগ প্যাকেজ চালু করুন →'
            : 'Unlock MFS Register, Auto Sync & Premium Plans →'}
        </p>
      )}
    </button>
  );
};

export default function App() {
  const [isAdminRoute, setIsAdminRoute] = useState<boolean>(detectAdminRoute);

  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [shop, setShop] = useState<ShopProfile | null>(null);
  const [shopLoaded, setShopLoaded] = useState(false);
  const [isSubAdmin, setIsSubAdmin] = useState(false);
  const [adminChecked, setAdminChecked] = useState(false);

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [khataEntries, setKhataEntries] = useState<KhataEntry[]>([]);
  const [cashEntries, setCashEntries] = useState<CashEntry[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [invoices, setInvoices] = useState<SaleInvoice[]>([]);
  const [telecomEntries, setTelecomEntries] = useState<TelecomEntry[]>([]);
  const [branches, setBranches] = useState<ShopBranch[]>([]);
  const [installments, setInstallments] = useState<InstallmentPlan[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [shiftClosings, setShiftClosings] = useState<ShiftClosing[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [upgradeRequests, setUpgradeRequests] = useState<UpgradeRequest[]>([]);

  const [activeBranchId, setActiveBranchId] = useState<string>(() => {
    try {
      return localStorage.getItem('munaf_active_branch_v1') || 'main';
    } catch {
      return 'main';
    }
  });
  const [activeStaff, setActiveStaff] = useState<StaffMember | null>(null);
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [showOperatorModal, setShowOperatorModal] = useState(false);

  const [allShops, setAllShops] = useState<ShopProfile[]>([]);
  const [allUpgradeRequests, setAllUpgradeRequests] = useState<UpgradeRequest[]>([]);
  const [allSupportTickets, setAllSupportTickets] = useState<SupportTicket[]>([]);
  const [allComplaints, setAllComplaints] = useState<Complaint[]>([]);
  const [subAdmins, setSubAdmins] = useState<AdminUser[]>([]);
  const [pricing, setPricing] = useState<PlanPricingConfig>(DEFAULT_PRICING);
  const [gateways, setGateways] = useState<PaymentGatewaysConfig>(
    DEFAULT_PAYMENT_GATEWAYS
  );
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [appUpdateConfig, setAppUpdateConfig] = useState<AppUpdateConfig>(
    DEFAULT_APP_UPDATE_CONFIG
  );
  const [installedVersion, setInstalledVersion] = useState<InstalledAppVersion>(
    getCachedInstalledVersion
  );
  const [serverForcedUpdate, setServerForcedUpdate] = useState(false);

  const [locale, setLocale] = useState<Locale>('bn');
  const [activeTab, setActiveTab] = useState<TabId>('tally');
  const [packagesSubView, setPackagesSubView] = useState<PackageSubView>('plans');
  const [reportsSubView, setReportsSubView] = useState<ReportSubView>('summary');
  const [menuOpen, setMenuOpen] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [activeToast, setActiveToast] = useState<AppNotification | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(getSavedVoiceEnabled);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [hasPendingSync, setHasPendingSync] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [, setSettingsRev] = useState(0);

  const userUpgradeStatesRef = useRef<Map<string, string> | null>(null);
  const userComplaintStatesRef = useRef<Map<string, string> | null>(null);
  const userTicketStatesRef = useRef<Map<string, string> | null>(null);
  const adminUpgradeIdsRef = useRef<Set<string> | null>(null);
  const adminComplaintIdsRef = useRef<Set<string> | null>(null);
  const adminTicketIdsRef = useRef<Set<string> | null>(null);

  const isSuperAdmin = Boolean(
    user?.email &&
      user.emailVerified &&
      user.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()
  );
  const isAdmin = isSuperAdmin || isSubAdmin;
  const isOwnerAdminBypass = isAdminRoute && (!user || isSuperAdmin);
  const isMandatoryUpdateBlocked =
    !isOwnerAdminBypass &&
    (serverForcedUpdate ||
      isAppVersionOutdated(installedVersion.versionCode, appUpdateConfig));

  useEffect(() => {
    setClientUpdateBlocked(isMandatoryUpdateBlocked);
  }, [isMandatoryUpdateBlocked]);

  const voiceEnabledRef = useRef(voiceEnabled);
  voiceEnabledRef.current = voiceEnabled;
  const localeRef = useRef(locale);
  localeRef.current = locale;

  const notify = useCallback(
    (opts: {
      title: string;
      message: string;
      spokenText?: string;
      category?: NotificationCategory;
      speak?: boolean;
    }) => {
      const cat = opts.category ?? 'general';
      const spoken = (opts.spokenText ?? opts.message).trim();
      const item: AppNotification = {
        id: `ntf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
        title: opts.title,
        message: opts.message,
        spokenText: spoken,
        category: cat,
        createdAtMs: Date.now(),
        read: false,
      };
      setNotifications((prev) => [item, ...prev].slice(0, 40));
      setActiveToast(item);

      if (opts.speak !== false && voiceEnabledRef.current && spoken) {
        void speakHumanNotification(spoken, localeRef.current, cat, setIsSpeaking);
      }

      void dispatchSystemNotification({
        title: opts.title,
        body: opts.message,
      });

      window.setTimeout(() => {
        setActiveToast((prev) => (prev?.id === item.id ? null : prev));
      }, 6500);
    },
    []
  );

  const handleToggleVoice = useCallback(() => {
    const next = !voiceEnabledRef.current;
    setVoiceEnabled(next);
    setSavedVoiceEnabled(next);
    if (!next) {
      stopActiveSpeech();
      setIsSpeaking(false);
    } else {
      const msg =
        localeRef.current === 'bn'
          ? 'ভয়েস নোটিফিকেশন চালু করা হয়েছে।'
          : 'Voice notifications enabled.';
      void speakHumanNotification(msg, localeRef.current, 'general', setIsSpeaking);
    }
  }, []);

  const handleReplayNotification = useCallback((item: AppNotification) => {
    void speakHumanNotification(
      item.spokenText || item.message,
      localeRef.current,
      item.category,
      setIsSpeaking
    );
  }, []);

  const handleTestVoice = useCallback(() => {
    const isBn = localeRef.current === 'bn';
    notify({
      title: isBn ? 'অর্ডার সফল হয়েছে!' : 'Order Successful!',
      message: isBn
        ? 'আপনার অর্ডার সফল হয়েছে! পেমেন্ট তথ্য যাচাই করে শীঘ্রই সক্রিয় করা হবে।'
        : 'Your order is successful! Your payment will be activated shortly.',
      spokenText: isBn
        ? 'আপনার অর্ডার সফল হয়েছে! ধন্যবাদ।'
        : 'Your order is successful! Thank you.',
      category: 'order',
      speak: true,
    });
  }, [notify]);

  useEffect(() => {
    const syncRoute = () => setIsAdminRoute(detectAdminRoute());
    window.addEventListener('popstate', syncRoute);
    window.addEventListener('hashchange', syncRoute);
    return () => {
      window.removeEventListener('popstate', syncRoute);
      window.removeEventListener('hashchange', syncRoute);
    };
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const onSettingsChanged = () => setSettingsRev((v) => v + 1);
    window.addEventListener(SETTINGS_CHANGED_EVENT, onSettingsChanged);
    return () => window.removeEventListener(SETTINGS_CHANGED_EVENT, onSettingsChanged);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        setMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  const markPendingSyncCheck = useCallback(() => {
    setHasPendingSync(true);
    void waitForPendingWrites(db)
      .then(() => {
        setHasPendingSync(false);
      })
      .catch(() => {
        // Ignore if cancelled/signed out
      });
  }, []);

  useEffect(() => {
    const onOnline = () => {
      void waitForPendingWrites(db)
        .then(() => {
          setHasPendingSync(false);
        })
        .catch(() => {
          // Ignore
        });
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthReady(true);
      if (!u) {
        setShop(null);
        setShopLoaded(false);
        setIsSubAdmin(false);
        setAdminChecked(false);
        setContacts([]);
        setKhataEntries([]);
        setCashEntries([]);
        setProducts([]);
        setInvoices([]);
        setTelecomEntries([]);
        setBranches([]);
        setInstallments([]);
        setPurchaseOrders([]);
        setStaffMembers([]);
        setShiftClosings([]);
        setActiveStaff(null);
        setActiveBranchId('main');
        setShowBranchModal(false);
        setShowOperatorModal(false);
        setSupportTickets([]);
        setComplaints([]);
        setUpgradeRequests([]);
        setAllShops([]);
        setAllUpgradeRequests([]);
        setAllSupportTickets([]);
        setAllComplaints([]);
        setSubAdmins([]);
        setIsLocked(false);
        userUpgradeStatesRef.current = null;
        userComplaintStatesRef.current = null;
        userTicketStatesRef.current = null;
        adminUpgradeIdsRef.current = null;
        adminComplaintIdsRef.current = null;
        adminTicketIdsRef.current = null;
      }
    });
    return () => unsub();
  }, []);

  const checkAppUpdateStatus = useCallback(async () => {
    const versionInfo = await getInstalledAppVersion();
    setInstalledVersion(versionInfo);

    try {
      const res = await fetch(
        `/api/app-update?versionCode=${encodeURIComponent(String(versionInfo.versionCode))}`,
        {
          method: 'GET',
          headers: {
            'X-App-Version-Code': String(versionInfo.versionCode),
            'X-App-Version-Name': versionInfo.versionName,
            'X-App-Platform': versionInfo.platform,
          },
        }
      );
      if (res.ok) {
        const data = (await res.json()) as {
          updateRequired?: boolean;
          policy?: Partial<AppUpdateConfig>;
        };
        if (data.policy) {
          setAppUpdateConfig((prev) => ({
            ...prev,
            latestVersionName: data.policy?.latestVersionName || prev.latestVersionName,
            latestVersionCode:
              Number(data.policy?.latestVersionCode) || prev.latestVersionCode,
            minSupportedVersionCode:
              Number(data.policy?.minSupportedVersionCode) ||
              prev.minSupportedVersionCode,
            apkDownloadUrl: data.policy?.apkDownloadUrl ?? prev.apkDownloadUrl,
            updateDescription: data.policy?.updateDescription ?? prev.updateDescription,
            forceUpdate: Boolean(data.policy?.forceUpdate),
            publishedBy: data.policy?.publishedBy || 'Owner',
          }));
        }
        setServerForcedUpdate(Boolean(data.updateRequired));
      }
    } catch {
      // Non-blocking fallback: Firestore listener below also tracks live policy
    }
  }, []);

  useEffect(() => {
    void checkAppUpdateStatus();

    const unsubAppUpdate = onSnapshot(
      doc(db, 'platformConfig', 'appUpdate'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as Partial<AppUpdateConfig>;
          const nextConfig: AppUpdateConfig = {
            latestVersionName:
              data.latestVersionName || DEFAULT_APP_UPDATE_CONFIG.latestVersionName,
            latestVersionCode:
              Number(data.latestVersionCode) ||
              DEFAULT_APP_UPDATE_CONFIG.latestVersionCode,
            minSupportedVersionCode:
              Number(data.minSupportedVersionCode) ||
              Number(data.latestVersionCode) ||
              DEFAULT_APP_UPDATE_CONFIG.minSupportedVersionCode,
            apkDownloadUrl: data.apkDownloadUrl ?? '',
            updateDescription: data.updateDescription ?? '',
            forceUpdate: Boolean(data.forceUpdate),
            publishedBy: data.publishedBy || 'Owner',
            updatedAt: data.updatedAt ?? null,
          };
          setAppUpdateConfig(nextConfig);
          const currentVer = getCachedInstalledVersion();
          setServerForcedUpdate(
            isAppVersionOutdated(currentVer.versionCode, nextConfig)
          );
        } else {
          setAppUpdateConfig(DEFAULT_APP_UPDATE_CONFIG);
          setServerForcedUpdate(false);
        }
      },
      () => {
        // Ignore transient offline read error; API check also guards
      }
    );

    const onForcedUpdateEvent = (ev: Event) => {
      const detail = (ev as CustomEvent<Partial<AppUpdateConfig> | null>).detail;
      if (detail) {
        setAppUpdateConfig((prev) => ({
          ...prev,
          latestVersionName: detail.latestVersionName || prev.latestVersionName,
          latestVersionCode:
            Number(detail.latestVersionCode) || prev.latestVersionCode,
          minSupportedVersionCode:
            Number(detail.minSupportedVersionCode) || prev.minSupportedVersionCode,
          apkDownloadUrl: detail.apkDownloadUrl ?? prev.apkDownloadUrl,
          updateDescription: detail.updateDescription ?? prev.updateDescription,
          forceUpdate:
            typeof detail.forceUpdate === 'boolean'
              ? detail.forceUpdate
              : true,
        }));
      }
      setServerForcedUpdate(true);
    };

    const onResumeCheck = () => {
      if (document.visibilityState === 'visible') {
        void checkAppUpdateStatus();
      }
    };
    const onFocusCheck = () => {
      void checkAppUpdateStatus();
    };

    window.addEventListener(FORCE_UPDATE_EVENT, onForcedUpdateEvent);
    window.addEventListener('focus', onFocusCheck);
    document.addEventListener('visibilitychange', onResumeCheck);

    return () => {
      unsubAppUpdate();
      window.removeEventListener(FORCE_UPDATE_EVENT, onForcedUpdateEvent);
      window.removeEventListener('focus', onFocusCheck);
      document.removeEventListener('visibilitychange', onResumeCheck);
    };
  }, [checkAppUpdateStatus]);

  useEffect(() => {
    if (!authReady || !user) return;
    const unsubPricing = onSnapshot(
      doc(db, 'platformConfig', 'pricing'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as Partial<PlanPricingConfig>;
          setPricing({
            proMonthly: data.proMonthly ?? DEFAULT_PRICING.proMonthly,
            proYearly: data.proYearly ?? DEFAULT_PRICING.proYearly,
            businessMonthly: data.businessMonthly ?? DEFAULT_PRICING.businessMonthly,
            businessYearly: data.businessYearly ?? DEFAULT_PRICING.businessYearly,
            discountNote: data.discountNote ?? '',
            updatedAt: data.updatedAt ?? null,
          });
        } else {
          setPricing(DEFAULT_PRICING);
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, 'platformConfig/pricing')
    );

    const unsubGateways = onSnapshot(
      doc(db, 'platformConfig', 'gateways'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as Partial<PaymentGatewaysConfig>;
          setGateways({
            bkashNumber: data.bkashNumber ?? DEFAULT_PAYMENT_GATEWAYS.bkashNumber,
            bkashType: data.bkashType ?? DEFAULT_PAYMENT_GATEWAYS.bkashType,
            bkashEnabled: data.bkashEnabled ?? DEFAULT_PAYMENT_GATEWAYS.bkashEnabled,
            bkashNote: data.bkashNote ?? DEFAULT_PAYMENT_GATEWAYS.bkashNote,
            bkashPaymentLink:
              data.bkashPaymentLink ?? DEFAULT_PAYMENT_GATEWAYS.bkashPaymentLink,
            nagadNumber: data.nagadNumber ?? DEFAULT_PAYMENT_GATEWAYS.nagadNumber,
            nagadType: data.nagadType ?? DEFAULT_PAYMENT_GATEWAYS.nagadType,
            nagadEnabled: data.nagadEnabled ?? DEFAULT_PAYMENT_GATEWAYS.nagadEnabled,
            nagadNote: data.nagadNote ?? DEFAULT_PAYMENT_GATEWAYS.nagadNote,
            rocketNumber: data.rocketNumber ?? DEFAULT_PAYMENT_GATEWAYS.rocketNumber,
            rocketType: data.rocketType ?? DEFAULT_PAYMENT_GATEWAYS.rocketType,
            rocketEnabled: data.rocketEnabled ?? DEFAULT_PAYMENT_GATEWAYS.rocketEnabled,
            rocketNote: data.rocketNote ?? DEFAULT_PAYMENT_GATEWAYS.rocketNote,
            upayNumber: data.upayNumber ?? DEFAULT_PAYMENT_GATEWAYS.upayNumber,
            upayType: data.upayType ?? DEFAULT_PAYMENT_GATEWAYS.upayType,
            upayEnabled: data.upayEnabled ?? DEFAULT_PAYMENT_GATEWAYS.upayEnabled,
            upayNote: data.upayNote ?? DEFAULT_PAYMENT_GATEWAYS.upayNote,
            gpayNumber: data.gpayNumber ?? DEFAULT_PAYMENT_GATEWAYS.gpayNumber,
            gpayType: data.gpayType ?? DEFAULT_PAYMENT_GATEWAYS.gpayType,
            gpayEnabled: data.gpayEnabled ?? DEFAULT_PAYMENT_GATEWAYS.gpayEnabled,
            gpayNote: data.gpayNote ?? DEFAULT_PAYMENT_GATEWAYS.gpayNote,
            updatedAt: data.updatedAt ?? null,
          });
        } else {
          setGateways(DEFAULT_PAYMENT_GATEWAYS);
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, 'platformConfig/gateways')
    );

    const unsubCatalog = onSnapshot(
      query(collection(db, 'catalogItems'), where('isPublic', '==', true)),
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<CatalogItem, 'id'>),
        }));
        list.sort((a, b) => a.sortOrder - b.sortOrder);
        setCatalogItems(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'catalogItems')
    );

    return () => {
      unsubPricing();
      unsubGateways();
      unsubCatalog();
    };
  }, [authReady, user]);

  useEffect(() => {
    if (!authReady || !user || isAdminRoute || isMandatoryUpdateBlocked) return;
    const uid = user.uid;

    const shopPath = `shops/${uid}`;
    const unsubShop = onSnapshot(
      doc(db, 'shops', uid),
      (snap) => {
        if (snap.metadata.hasPendingWrites) markPendingSyncCheck();
        if (snap.exists()) {
          const data = snap.data() as ShopProfile;
          setShop(data);
          if (!data.ownerEmail && user.email) {
            void syncShopOwnerEmail(uid, user.email);
          }
        } else {
          setShop(null);
        }
        setShopLoaded(true);
      },
      (err) => handleFirestoreError(err, OperationType.GET, shopPath)
    );

    const contactsPath = `shops/${uid}/contacts`;
    const unsubContacts = onSnapshot(
      query(collection(db, 'shops', uid, 'contacts'), where('ownerUid', '==', uid)),
      (snap) => {
        if (snap.metadata.hasPendingWrites) markPendingSyncCheck();
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Contact, 'id'>),
        }));
        list.sort((a, b) => {
          const ta = tsMillisOrPending(a.lastEntryAt);
          const tb = tsMillisOrPending(b.lastEntryAt);
          return tb - ta;
        });
        setContacts(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, contactsPath)
    );

    const khataPath = `shops/${uid}/khataEntries`;
    const unsubKhata = onSnapshot(
      query(collection(db, 'shops', uid, 'khataEntries'), where('ownerUid', '==', uid)),
      (snap) => {
        if (snap.metadata.hasPendingWrites) markPendingSyncCheck();
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<KhataEntry, 'id'>),
        }));
        list.sort((a, b) => {
          const ta = tsMillisOrPending(a.createdAt);
          const tb = tsMillisOrPending(b.createdAt);
          return tb - ta;
        });
        setKhataEntries(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, khataPath)
    );

    const cashPath = `shops/${uid}/cashEntries`;
    const unsubCash = onSnapshot(
      query(collection(db, 'shops', uid, 'cashEntries'), where('ownerUid', '==', uid)),
      (snap) => {
        if (snap.metadata.hasPendingWrites) markPendingSyncCheck();
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<CashEntry, 'id'>),
        }));
        list.sort((a, b) => {
          const ta = tsMillisOrPending(a.createdAt);
          const tb = tsMillisOrPending(b.createdAt);
          return tb - ta;
        });
        setCashEntries(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, cashPath)
    );

    const prodPath = `shops/${uid}/products`;
    const unsubProds = onSnapshot(
      query(collection(db, 'shops', uid, 'products'), where('ownerUid', '==', uid)),
      (snap) => {
        if (snap.metadata.hasPendingWrites) markPendingSyncCheck();
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Product, 'id'>),
        }));
        list.sort((a, b) => a.name.localeCompare(b.name));
        setProducts(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, prodPath)
    );

    const invoicesPath = `shops/${uid}/invoices`;
    const unsubInvoices = onSnapshot(
      query(collection(db, 'shops', uid, 'invoices'), where('ownerUid', '==', uid)),
      (snap) => {
        if (snap.metadata.hasPendingWrites) markPendingSyncCheck();
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<SaleInvoice, 'id'>),
        }));
        list.sort((a, b) => {
          const ta = tsMillisOrPending(a.createdAt);
          const tb = tsMillisOrPending(b.createdAt);
          return tb - ta;
        });
        setInvoices(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, invoicesPath)
    );

    const telecomPath = `shops/${uid}/telecomEntries`;
    const unsubTelecom = onSnapshot(
      query(collection(db, 'shops', uid, 'telecomEntries'), where('ownerUid', '==', uid)),
      (snap) => {
        if (snap.metadata.hasPendingWrites) markPendingSyncCheck();
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<TelecomEntry, 'id'>),
        }));
        list.sort((a, b) => {
          const ta = tsMillisOrPending(a.createdAt);
          const tb = tsMillisOrPending(b.createdAt);
          return tb - ta;
        });
        setTelecomEntries(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, telecomPath)
    );

    const ticketsPath = `shops/${uid}/supportTickets`;
    const unsubTickets = onSnapshot(
      query(collection(db, 'shops', uid, 'supportTickets'), where('ownerUid', '==', uid)),
      (snap) => {
        if (snap.metadata.hasPendingWrites) markPendingSyncCheck();
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<SupportTicket, 'id'>),
        }));
        list.sort((a, b) => {
          const ta = tsMillisOrPending(a.createdAt);
          const tb = tsMillisOrPending(b.createdAt);
          return tb - ta;
        });

        const nextMap = new Map<string, string>();
        list.forEach((item) =>
          nextMap.set(item.id, `${item.status}::${item.adminReply ?? ''}`)
        );
        const prevMap = userTicketStatesRef.current;
        if (prevMap) {
          for (const item of list) {
            const prevSig = prevMap.get(item.id);
            const curSig = nextMap.get(item.id);
            if (prevSig && curSig && prevSig !== curSig && item.adminReply) {
              const isBn = localeRef.current === 'bn';
              notify({
                title: isBn ? 'সাপোর্ট টিকেটে রিপ্লাই এসেছে!' : 'Support Reply Received!',
                message: `${item.subject}: ${item.adminReply}`,
                spokenText: isBn
                  ? `আপনার সাপোর্ট টিকেটে অ্যাডমিনের নতুন রিপ্লাই এসেছে।`
                  : `You have a new support reply from admin.`,
                category: 'support',
              });
              break;
            }
          }
        }
        userTicketStatesRef.current = nextMap;
        setSupportTickets(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, ticketsPath)
    );

    const complaintsPath = `shops/${uid}/complaints`;
    const unsubComplaints = onSnapshot(
      query(collection(db, 'shops', uid, 'complaints'), where('ownerUid', '==', uid)),
      (snap) => {
        if (snap.metadata.hasPendingWrites) markPendingSyncCheck();
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Complaint, 'id'>),
        }));
        list.sort((a, b) => {
          const ta = tsMillisOrPending(a.createdAt);
          const tb = tsMillisOrPending(b.createdAt);
          return tb - ta;
        });

        const nextMap = new Map<string, string>();
        list.forEach((item) =>
          nextMap.set(item.id, `${item.status}::${item.adminReply ?? ''}`)
        );
        const prevMap = userComplaintStatesRef.current;
        if (prevMap) {
          for (const item of list) {
            const prevSig = prevMap.get(item.id);
            const curSig = nextMap.get(item.id);
            if (prevSig && curSig && prevSig !== curSig) {
              const isBn = localeRef.current === 'bn';
              if (item.adminReply || item.status === 'resolved') {
                notify({
                  title: isBn ? 'অভিযোগের সমাধান এসেছে!' : 'Complaint Updated!',
                  message: item.adminReply || item.title,
                  spokenText: isBn
                    ? `অ্যাডমিন থেকে আপনার অভিযোগের উত্তর ও সমাধান এসেছে।`
                    : `Admin has responded to your complaint.`,
                  category: 'complaint',
                });
                break;
              }
            }
          }
        }
        userComplaintStatesRef.current = nextMap;
        setComplaints(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, complaintsPath)
    );

    const upgradesPath = `shops/${uid}/upgradeRequests`;
    const unsubUpgrades = onSnapshot(
      query(collection(db, 'shops', uid, 'upgradeRequests'), where('ownerUid', '==', uid)),
      (snap) => {
        if (snap.metadata.hasPendingWrites) markPendingSyncCheck();
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<UpgradeRequest, 'id'>),
        }));
        list.sort((a, b) => {
          const ta = tsMillisOrPending(a.createdAt);
          const tb = tsMillisOrPending(b.createdAt);
          return tb - ta;
        });

        const nextMap = new Map<string, string>();
        list.forEach((item) => nextMap.set(item.id, item.status));
        const prevMap = userUpgradeStatesRef.current;
        if (prevMap) {
          for (const item of list) {
            const prevStatus = prevMap.get(item.id);
            if (prevStatus && prevStatus !== item.status) {
              const isBn = localeRef.current === 'bn';
              if (item.status === 'active') {
                notify({
                  title: isBn ? 'প্যাকেজ অনুমোদন ও সক্রিয়!' : 'Package Activated!',
                  message: isBn
                    ? 'অভিনন্দন! আপনার প্যাকেজ সফলভাবে অনুমোদন ও সক্রিয় হয়েছে।'
                    : 'Congratulations! Your package is now active.',
                  spokenText: isBn
                    ? 'অভিনন্দন! আপনার প্যাকেজ সফলভাবে অনুমোদন ও সক্রিয় হয়েছে।'
                    : 'Congratulations! Your package is now active.',
                  category: 'upgrade',
                });
                break;
              } else if (item.status === 'processing') {
                notify({
                  title: isBn ? 'অর্ডার প্রসেসিংয়ে রয়েছে' : 'Order Processing',
                  message: isBn
                    ? 'আপনার পেমেন্ট অনুরোধ এখন যাচাই ও প্রসেসিংয়ে রয়েছে।'
                    : 'Your payment request is being processed.',
                  spokenText: isBn
                    ? 'আপনার অর্ডারটি এখন যাচাই ও প্রসেসিংয়ে রয়েছে।'
                    : 'Your order is currently processing.',
                  category: 'upgrade',
                });
                break;
              } else if (item.status === 'rejected') {
                notify({
                  title: isBn ? 'অনুরোধ বাতিল হয়েছে' : 'Request Rejected',
                  message:
                    item.statusReason ||
                    (isBn
                      ? 'আপনার পেমেন্ট অনুরোধ বাতিল হয়েছে।'
                      : 'Your payment request was rejected.'),
                  spokenText: isBn
                    ? 'দুঃখিত, আপনার পেমেন্ট অনুরোধটি বাতিল করা হয়েছে। কারণ দেখে আবার চেষ্টা করুন।'
                    : 'Sorry, your payment request was rejected.',
                  category: 'upgrade',
                });
                break;
              }
            }
          }
        }
        userUpgradeStatesRef.current = nextMap;
        setUpgradeRequests(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, upgradesPath)
    );

    const branchesPath = `shops/${uid}/branches`;
    const unsubBranches = onSnapshot(
      query(collection(db, 'shops', uid, 'branches'), where('ownerUid', '==', uid)),
      (snap) => {
        if (snap.metadata.hasPendingWrites) markPendingSyncCheck();
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<ShopBranch, 'id'>),
        }));
        list.sort((a, b) => tsMillisOrPending(a.createdAt) - tsMillisOrPending(b.createdAt));
        setBranches(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, branchesPath)
    );

    const installmentsPath = `shops/${uid}/installments`;
    const unsubInstallments = onSnapshot(
      query(collection(db, 'shops', uid, 'installments'), where('ownerUid', '==', uid)),
      (snap) => {
        if (snap.metadata.hasPendingWrites) markPendingSyncCheck();
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<InstallmentPlan, 'id'>),
        }));
        list.sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate));
        setInstallments(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, installmentsPath)
    );

    const poPath = `shops/${uid}/purchaseOrders`;
    const unsubPOs = onSnapshot(
      query(collection(db, 'shops', uid, 'purchaseOrders'), where('ownerUid', '==', uid)),
      (snap) => {
        if (snap.metadata.hasPendingWrites) markPendingSyncCheck();
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<PurchaseOrder, 'id'>),
        }));
        list.sort((a, b) => tsMillisOrPending(b.createdAt) - tsMillisOrPending(a.createdAt));
        setPurchaseOrders(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, poPath)
    );

    const staffPath = `shops/${uid}/staffMembers`;
    const unsubStaff = onSnapshot(
      query(collection(db, 'shops', uid, 'staffMembers'), where('ownerUid', '==', uid)),
      (snap) => {
        if (snap.metadata.hasPendingWrites) markPendingSyncCheck();
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<StaffMember, 'id'>),
        }));
        list.sort((a, b) => a.name.localeCompare(b.name));
        setStaffMembers(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, staffPath)
    );

    const shiftsPath = `shops/${uid}/shiftClosings`;
    const unsubShifts = onSnapshot(
      query(collection(db, 'shops', uid, 'shiftClosings'), where('ownerUid', '==', uid)),
      (snap) => {
        if (snap.metadata.hasPendingWrites) markPendingSyncCheck();
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<ShiftClosing, 'id'>),
        }));
        list.sort((a, b) => tsMillisOrPending(b.createdAt) - tsMillisOrPending(a.createdAt));
        setShiftClosings(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, shiftsPath)
    );

    return () => {
      unsubShop();
      unsubContacts();
      unsubKhata();
      unsubCash();
      unsubProds();
      unsubInvoices();
      unsubTelecom();
      unsubTickets();
      unsubComplaints();
      unsubUpgrades();
      unsubBranches();
      unsubInstallments();
      unsubPOs();
      unsubStaff();
      unsubShifts();
    };
  }, [authReady, user, isAdminRoute, isMandatoryUpdateBlocked, notify, markPendingSyncCheck]);

  useEffect(() => {
    if (!authReady || !user || !isAdminRoute) return;
    const uid = user.uid;

    const unsubAdminSelf = onSnapshot(
      doc(db, 'admins', uid),
      (snap) => {
        setIsSubAdmin(snap.exists());
        setAdminChecked(true);
      },
      (err) => handleFirestoreError(err, OperationType.GET, `admins/${uid}`)
    );

    return () => unsubAdminSelf();
  }, [authReady, user, isAdminRoute]);

  useEffect(() => {
    if (!authReady || !user || !isAdminRoute || !isAdmin) return;

    const unsubAllShops = onSnapshot(
      collection(db, 'shops'),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as ShopProfile);
        list.sort((a, b) => {
          const ta = a.createdAt?.toMillis() ?? 0;
          const tb = b.createdAt?.toMillis() ?? 0;
          return tb - ta;
        });
        setAllShops(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'shops')
    );

    const unsubAllUpgrades = onSnapshot(
      collectionGroup(db, 'upgradeRequests'),
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<UpgradeRequest, 'id'>),
        }));
        list.sort((a, b) => {
          const ta = a.createdAt?.toMillis() ?? 0;
          const tb = b.createdAt?.toMillis() ?? 0;
          return tb - ta;
        });

        const nextIds = new Set(list.map((x) => x.id));
        const prevIds = adminUpgradeIdsRef.current;
        if (prevIds) {
          const newlyAdded = list.find((x) => !prevIds.has(x.id));
          if (newlyAdded) {
            const isBn = localeRef.current === 'bn';
            notify({
              title: isBn ? 'নতুন অর্ডার এসেছে!' : 'New Order Received!',
              message: `${newlyAdded.paymentMethod} · ৳${newlyAdded.amount} · TrxID: ${newlyAdded.trxId}`,
              spokenText: isBn
                ? `নতুন একটি ${newlyAdded.amount} টাকার প্যাকেজ বা ক্যাটালগ অর্ডার এসেছে!`
                : `A new order of ${newlyAdded.amount} taka has arrived!`,
              category: 'order',
            });
          }
        }
        adminUpgradeIdsRef.current = nextIds;
        setAllUpgradeRequests(list);
      },
      (err) =>
        handleFirestoreError(err, OperationType.LIST, 'collectionGroup/upgradeRequests')
    );

    const unsubAllTickets = onSnapshot(
      collectionGroup(db, 'supportTickets'),
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<SupportTicket, 'id'>),
        }));
        list.sort((a, b) => {
          const ta = a.createdAt?.toMillis() ?? 0;
          const tb = b.createdAt?.toMillis() ?? 0;
          return tb - ta;
        });

        const nextIds = new Set(list.map((x) => x.id));
        const prevIds = adminTicketIdsRef.current;
        if (prevIds) {
          const newlyAdded = list.find((x) => !prevIds.has(x.id));
          if (newlyAdded) {
            const isBn = localeRef.current === 'bn';
            notify({
              title: isBn ? 'নতুন সাপোর্ট টিকেট!' : 'New Support Ticket!',
              message: newlyAdded.subject,
              spokenText: isBn
                ? 'কাস্টমার সাপোর্ট থেকে একটি নতুন টিকেট এসেছে!'
                : 'A new customer support ticket has arrived!',
              category: 'support',
            });
          }
        }
        adminTicketIdsRef.current = nextIds;
        setAllSupportTickets(list);
      },
      (err) =>
        handleFirestoreError(err, OperationType.LIST, 'collectionGroup/supportTickets')
    );

    const unsubAllComplaints = onSnapshot(
      collectionGroup(db, 'complaints'),
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Complaint, 'id'>),
        }));
        list.sort((a, b) => {
          const ta = a.createdAt?.toMillis() ?? 0;
          const tb = b.createdAt?.toMillis() ?? 0;
          return tb - ta;
        });

        const nextIds = new Set(list.map((x) => x.id));
        const prevIds = adminComplaintIdsRef.current;
        if (prevIds) {
          const newlyAdded = list.find((x) => !prevIds.has(x.id));
          if (newlyAdded) {
            const isBn = localeRef.current === 'bn';
            notify({
              title: isBn ? 'নতুন অভিযোগ জমা হয়েছে!' : 'New Complaint Arrived!',
              message: newlyAdded.title,
              spokenText: isBn
                ? 'কাস্টমার অভিযোগ বক্সে একটি নতুন অভিযোগ এসেছে!'
                : 'A new customer complaint has been submitted!',
              category: 'complaint',
            });
          }
        }
        adminComplaintIdsRef.current = nextIds;
        setAllComplaints(list);
      },
      (err) =>
        handleFirestoreError(err, OperationType.LIST, 'collectionGroup/complaints')
    );

    const unsubAdmins = onSnapshot(
      collection(db, 'admins'),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as AdminUser);
        setSubAdmins(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'admins')
    );

    return () => {
      unsubAllShops();
      unsubAllUpgrades();
      unsubAllTickets();
      unsubAllComplaints();
      unsubAdmins();
    };
  }, [authReady, user, isAdminRoute, isAdmin, notify]);

  const canViewProfit = activeStaff ? activeStaff.canViewProfit : true;
  const canDeleteRecords = activeStaff ? activeStaff.canDeleteRecords : true;
  const activeOperatorName = activeStaff
    ? activeStaff.name
    : shop?.ownerName || (locale === 'bn' ? 'মালিক (Owner)' : 'Owner');

  const handleSelectBranch = useCallback((branchId: string) => {
    setActiveBranchId(branchId);
    try {
      localStorage.setItem('munaf_active_branch_v1', branchId);
    } catch {
      // Ignore storage failure
    }
  }, []);

  const activeBranchObj = useMemo(
    () => branches.find((b) => b.id === activeBranchId) ?? null,
    [branches, activeBranchId]
  );

  const activeBranchName = activeBranchObj
    ? activeBranchObj.name
    : shop?.shopName || (locale === 'bn' ? 'মূল দোকান' : 'Primary Shop');

  const matchesBranch = useCallback(
    (b?: string) => (activeBranchId === 'main' ? !b || b === 'main' : b === activeBranchId),
    [activeBranchId]
  );

  const branchContacts = useMemo(
    () => contacts.filter((c) => matchesBranch(c.branchId)),
    [contacts, matchesBranch]
  );
  const branchKhataEntries = useMemo(
    () => khataEntries.filter((e) => matchesBranch(e.branchId)),
    [khataEntries, matchesBranch]
  );
  const branchCashEntries = useMemo(
    () => cashEntries.filter((c) => matchesBranch(c.branchId)),
    [cashEntries, matchesBranch]
  );
  const branchProducts = useMemo(
    () => products.filter((p) => matchesBranch(p.branchId)),
    [products, matchesBranch]
  );
  const branchInvoices = useMemo(
    () => invoices.filter((i) => matchesBranch(i.branchId)),
    [invoices, matchesBranch]
  );
  const branchTelecomEntries = useMemo(
    () => telecomEntries.filter((t) => matchesBranch(t.branchId)),
    [telecomEntries, matchesBranch]
  );
  const branchInstallments = useMemo(
    () => installments.filter((i) => matchesBranch(i.branchId)),
    [installments, matchesBranch]
  );
  const branchPurchaseOrders = useMemo(
    () => purchaseOrders.filter((p) => matchesBranch(p.branchId)),
    [purchaseOrders, matchesBranch]
  );
  const branchShiftClosings = useMemo(
    () => shiftClosings.filter((s) => matchesBranch(s.branchId)),
    [shiftClosings, matchesBranch]
  );

  const cashBalance = useMemo(() => {
    const inSum = branchCashEntries
      .filter((c) => c.cashType === 'cash_in')
      .reduce((s, c) => s + c.amount, 0);
    const outSum = branchCashEntries
      .filter((c) => c.cashType === 'cash_out')
      .reduce((s, c) => s + c.amount, 0);
    return inSum - outSum;
  }, [branchCashEntries]);

  const handleLogout = async () => {
    setNotificationOpen(false);
    setMenuOpen(false);
    stopActiveSpeech();
    setIsSpeaking(false);
    try {
      await signOut(auth);
    } catch {
      // Ignore auth sign-out edge errors
    }
  };

  const exitAdminRoute = () => {
    setNotificationOpen(false);
    setMenuOpen(false);
    window.history.pushState({}, '', '/');
    setIsAdminRoute(false);
  };

  const handleSelectTab = (tabId: TabId, subOption?: string) => {
    setNotificationOpen(false);
    setMenuOpen(false);
    if (
      tabId === 'packages' &&
      (subOption === 'plans' ||
        subOption === 'catalog' ||
        subOption === 'gateways' ||
        subOption === 'history')
    ) {
      setPackagesSubView(subOption);
    }
    if (
      tabId === 'reports' &&
      (subOption === 'summary' ||
        subOption === 'analytics' ||
        subOption === 'staff' ||
        subOption === 'profile' ||
        subOption === 'security')
    ) {
      setReportsSubView(subOption);
    }
    setActiveTab(tabId);
  };

  const notificationControlsEl = (
    <NotificationCenterControls
      locale={locale}
      notifications={notifications}
      voiceEnabled={voiceEnabled}
      isSpeaking={isSpeaking}
      open={notificationOpen}
      compactInboxStyle={!isAdminRoute}
      onOpenChange={(next) => {
        setNotificationOpen(next);
        if (next) {
          setMenuOpen(false);
          setActiveToast(null);
        }
      }}
      onToggleVoice={handleToggleVoice}
      onMarkAllRead={() =>
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      }
      onClearAll={() => {
        setNotifications([]);
        setNotificationOpen(false);
      }}
      onReplayNotification={handleReplayNotification}
      onTestVoice={() => {
        setNotificationOpen(false);
        handleTestVoice();
      }}
    />
  );

  if (isMandatoryUpdateBlocked) {
    return (
      <MandatoryUpdateScreen
        locale={locale}
        onToggleLocale={() => setLocale((l) => (l === 'bn' ? 'en' : 'bn'))}
        installedVersion={installedVersion}
        config={appUpdateConfig}
        onRecheckUpdate={checkAppUpdateStatus}
        onForceDismiss={() => setServerForcedUpdate(false)}
      />
    );
  }

  if (isAdminRoute) {
    return (
      <>
        <AdminPortal
          locale={locale}
          onToggleLocale={() => {
            setNotificationOpen(false);
            setLocale((l) => (l === 'bn' ? 'en' : 'bn'));
          }}
          user={user}
          authReady={authReady}
          adminChecked={adminChecked}
          isAdmin={isAdmin}
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
          notificationControls={notificationControlsEl}
          onExitAdmin={exitAdminRoute}
          onLogout={handleLogout}
          onUpdateShopPlan={async (ownerUid, input) => {
            await adminUpdateShopPlan(ownerUid, input);
            notify({
              title: locale === 'bn' ? 'প্যাকেজ আপডেট' : 'Plan Updated',
              message:
                locale === 'bn'
                  ? 'দোকানের প্যাকেজ ও মেয়াদ আপডেট হয়েছে।'
                  : 'Shop plan & schedule updated.',
              category: 'admin',
            });
          }}
          onUpdateAccountStatus={async (ownerUid, input) => {
            await adminUpdateShopAccountStatus(ownerUid, {
              ...input,
              adminEmail: user?.email ?? SUPER_ADMIN_EMAIL,
            });
            const msg =
              input.accountStatus === 'active'
                ? locale === 'bn'
                  ? 'অ্যাকাউন্ট পুনরায় সক্রিয় হয়েছে।'
                  : 'Account restored to active.'
                : input.accountStatus === 'blocked'
                ? locale === 'bn'
                  ? 'ইউজার অ্যাকাউন্ট ব্লক করা হয়েছে।'
                  : 'User account blocked.'
                : locale === 'bn'
                ? 'ইউজার অ্যাকাউন্ট ব্যান করা হয়েছে।'
                : 'User account banned.';
            notify({
              title: locale === 'bn' ? 'অ্যাকাউন্ট স্ট্যাটাস' : 'Account Status',
              message: msg,
              category: 'admin',
            });
          }}
          onSavePricing={async (input) => {
            await adminSavePlatformPricing(input);
            notify({
              title: locale === 'bn' ? 'প্যাকেজ মূল্য লাইভ' : 'Pricing Published',
              message:
                locale === 'bn'
                  ? 'নতুন প্যাকেজ মূল্য সফলভাবে লাইভ করা হয়েছে!'
                  : 'Package pricing updated!',
              category: 'admin',
            });
          }}
          onSaveGateways={async (input) => {
            await adminSavePaymentGateways(input);
            notify({
              title: locale === 'bn' ? 'পেমেন্ট গেটওয়ে সেভ' : 'Gateways Published',
              message:
                locale === 'bn'
                  ? 'পেমেন্ট গেটওয়ে নম্বর ও লিংক সফলভাবে সেভ ও লাইভ হয়েছে!'
                  : 'Payment gateway numbers and links published!',
              category: 'admin',
            });
          }}
          onSaveCatalogItem={async (input, existingId) => {
            await adminSaveCatalogItem(input, existingId);
            notify({
              title: locale === 'bn' ? 'ক্যাটালগ সেভ হয়েছে' : 'Catalog Saved',
              message:
                locale === 'bn'
                  ? `${input.title} সফলভাবে ক্যাটালগে সেভ হয়েছে।`
                  : `${input.title} saved to catalog.`,
              category: 'admin',
            });
          }}
          onDeleteCatalogItem={async (itemId) => {
            await adminDeleteCatalogItem(itemId);
            notify({
              title: locale === 'bn' ? 'ক্যাটালগ মুছে ফেলা হয়েছে' : 'Item Deleted',
              message:
                locale === 'bn'
                  ? 'ক্যাটালগ আইটেম মুছে ফেলা হয়েছে।'
                  : 'Catalog item deleted.',
              category: 'admin',
            });
          }}
          onApproveUpgrade={async (req, nextStatus, statusReason, customRange) => {
            await adminApproveUpgradeRequest(
              req,
              nextStatus,
              statusReason,
              customRange
            );
            const msg =
              nextStatus === 'active'
                ? locale === 'bn'
                  ? 'অর্ডার ও প্যাকেজ সফলভাবে অনুমোদন হয়েছে!'
                  : 'Package approved & countdown started!'
                : nextStatus === 'processing'
                ? locale === 'bn'
                  ? 'প্যাকেজ অনুরোধ প্রসেসিংয়ে নেওয়া হয়েছে।'
                  : 'Upgrade marked as processing.'
                : nextStatus === 'rejected'
                ? locale === 'bn'
                  ? 'প্যাকেজ অনুরোধ বাতিল করা হয়েছে।'
                  : 'Upgrade request rejected.'
                : locale === 'bn'
                ? 'অনুরোধ পেন্ডিং করা হয়েছে।'
                : 'Request set to pending.';
            notify({
              title: locale === 'bn' ? 'অর্ডার আপডেট' : 'Order Updated',
              message: msg,
              category: 'upgrade',
            });
          }}
          onUpdateTicket={async (ownerUid, ticketId, input) => {
            await adminUpdateSupportTicket(ownerUid, ticketId, input);
            notify({
              title: locale === 'bn' ? 'সাপোর্ট রিপ্লাই সেভ' : 'Reply Sent',
              message:
                locale === 'bn'
                  ? 'সাপোর্ট টিকেট ও রিপ্লাই সফলভাবে পাঠানো হয়েছে।'
                  : 'Support reply & status saved.',
              category: 'support',
            });
          }}
          onUpdateComplaint={async (ownerUid, complaintId, input) => {
            await adminUpdateComplaint(ownerUid, complaintId, input);
            notify({
              title: locale === 'bn' ? 'অভিযোগ সমাধান সেভ' : 'Complaint Resolved',
              message:
                locale === 'bn'
                  ? 'অভিযোগের সমাধান ও রিপ্লাই সফলভাবে পাঠানো হয়েছে।'
                  : 'Complaint resolution saved.',
              category: 'complaint',
            });
          }}
          onAddSubAdmin={async (uid, email) => {
            await adminAddSubAdmin(uid, email);
            notify({
              title: locale === 'bn' ? 'এডমিন যুক্ত' : 'Admin Added',
              message: locale === 'bn' ? 'নতুন এডমিন যোগ হয়েছে।' : 'Sub-admin added.',
              category: 'admin',
            });
          }}
          onRemoveSubAdmin={async (uid) => {
            await adminRemoveSubAdmin(uid);
            notify({
              title: locale === 'bn' ? 'এডমিন সরানো' : 'Admin Removed',
              message: locale === 'bn' ? 'এডমিন সরানো হয়েছে।' : 'Sub-admin removed.',
              category: 'admin',
            });
          }}
          onSaveAppUpdate={async (input) => {
            if (!isSuperAdmin || !user) {
              throw new Error('Only the Platform Owner can publish app updates.');
            }
            const idToken = await user.getIdToken();
            await adminSaveAppUpdateConfig(input, idToken);
            notify({
              title: locale === 'bn' ? 'অ্যাপ আপডেট প্রকাশিত!' : 'App Update Published!',
              message: input.forceUpdate
                ? locale === 'bn'
                  ? `v${input.latestVersionName} (Code ${input.latestVersionCode}) বাধ্যতামূলক আপডেট চালু হয়েছে।`
                  : `Mandatory update active for v${input.latestVersionName} (Code ${input.latestVersionCode}).`
                : locale === 'bn'
                ? 'বাধ্যতামূলক আপডেট লক বন্ধ ও কনফিগ সেভ হয়েছে।'
                : 'Update config saved with mandatory lock OFF.',
              category: 'admin',
            });
          }}
        />
        <SpokenToastBanner
          locale={locale}
          activeToast={activeToast}
          isSpeaking={isSpeaking}
          onReplay={handleReplayNotification}
          onDismiss={() => setActiveToast(null)}
        />
        <OfflineIndicator locale={locale} hasPendingSync={hasPendingSync} />
      </>
    );
  }

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-3d-tile rounded-2xl px-6 py-4 text-sm font-semibold text-slate-700">
          {locale === 'bn' ? 'লোড হচ্ছে...' : 'Loading...'}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <AuthScreen
          locale={locale}
          onToggleLocale={() => setLocale((l) => (l === 'bn' ? 'en' : 'bn'))}
        />
        <OfflineIndicator locale={locale} hasPendingSync={hasPendingSync} />
      </>
    );
  }

  if (!shopLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-3d-tile rounded-2xl px-6 py-4 text-sm font-semibold text-slate-700">
          {locale === 'bn' ? 'দোকানের খাতা লোড হচ্ছে...' : 'Loading your khata...'}
        </div>
      </div>
    );
  }

  if (!shop) {
    return (
      <ShopSetupScreen
        locale={locale}
        userEmail={user.email ?? ''}
        onCreateShop={async (input) => {
          await createShopProfile(user.uid, {
            ...input,
            ownerEmail: user.email ?? '',
          });
          notify({
            title: locale === 'bn' ? 'স্বাগতম!' : 'Welcome!',
            message:
              locale === 'bn'
                ? `${input.shopName} সফলভাবে তৈরি হয়েছে!`
                : `${input.shopName} created successfully!`,
            category: 'general',
          });
        }}
        onLogout={handleLogout}
      />
    );
  }

  if (shop.accountStatus === 'blocked' || shop.accountStatus === 'banned') {
    return (
      <>
        <AccountStatusPopup
          locale={locale}
          shop={shop}
          userEmail={user.email ?? ''}
          onSubmitAppeal={async (input) => {
            await createSupportTicket(user.uid, input);
            void user
              .getIdToken()
              .then((idToken) =>
                sendComplaintNotificationEmail(idToken, {
                  kind: 'ticket',
                  shopName: shop.shopName,
                  contactPhone: input.contactPhone || shop.phone,
                  customerEmail: user.email ?? '',
                  title: input.subject,
                  category: input.category,
                  details: input.message,
                })
              )
              .catch(() => {
                // Ignore non-critical email notification errors
              });
            notify({
              title: locale === 'bn' ? 'আপিল পাঠানো হয়েছে' : 'Appeal Submitted',
              message:
                locale === 'bn'
                  ? 'আপনার আপিল টিকেট সফলভাবে পাঠানো হয়েছে।'
                  : 'Appeal ticket submitted.',
              category: 'support',
            });
          }}
          onLogout={handleLogout}
        />
        <SpokenToastBanner
          locale={locale}
          activeToast={activeToast}
          isSpeaking={isSpeaking}
          onReplay={handleReplayNotification}
          onDismiss={() => setActiveToast(null)}
        />
      </>
    );
  }

  if (isLocked) {
    return (
      <PinLockScreen
        locale={locale}
        shopName={shop.shopName}
        storedPinHash={shop.pinHash}
        onSavePinHash={async (hash) => {
          await updateShopPin(user.uid, hash);
        }}
        onUnlock={() => setIsLocked(false)}
        onLogout={handleLogout}
      />
    );
  }

  const navItems: {
    id: TabId;
    label: string;
    mobileLabel: string;
    icon: typeof BookOpenCheck;
  }[] = [
    {
      id: 'tally',
      label: tr(locale, 'tally'),
      mobileLabel: locale === 'bn' ? 'টালি' : 'Tally',
      icon: BookOpenCheck,
    },
    {
      id: 'cashbook',
      label: tr(locale, 'cashbook'),
      mobileLabel: locale === 'bn' ? 'ক্যাশ' : 'Cash',
      icon: Wallet,
    },
    {
      id: 'telecom',
      label: tr(locale, 'telecom'),
      mobileLabel: 'MFS',
      icon: Smartphone,
    },
    {
      id: 'stock',
      label: tr(locale, 'stock'),
      mobileLabel: locale === 'bn' ? 'স্টক' : 'Stock',
      icon: Package,
    },
    {
      id: 'packages',
      label: tr(locale, 'packages'),
      mobileLabel: locale === 'bn' ? 'ক্যাটালগ' : 'Catalog',
      icon: Crown,
    },
    {
      id: 'complaints',
      label: tr(locale, 'complaints'),
      mobileLabel: locale === 'bn' ? 'অভিযোগ' : 'Box',
      icon: MessageSquareWarning,
    },
    {
      id: 'reports',
      label: tr(locale, 'reports'),
      mobileLabel: locale === 'bn' ? 'রিপোর্ট' : 'More',
      icon: BarChart3,
    },
  ];

  const planLabel =
    shop.planTier === 'business'
      ? locale === 'bn'
        ? 'বিজনেস প্লাস'
        : 'Business Plus'
      : shop.planTier === 'pro'
      ? locale === 'bn'
        ? 'টেলিকম প্রো'
        : 'Telecom Pro'
      : locale === 'bn'
      ? 'ফ্রি খাতা'
      : 'Free Plan';

  const planExpiryQuick = getRemainingDaysQuick(shop, nowMs);

  return (
    <div className="min-h-screen flex flex-col lg:flex-row lg:p-4 lg:gap-4 max-w-[1440px] mx-auto">
      <aside className="hidden lg:flex lg:w-64 lg:flex-col glass-3d-crimson text-white shrink-0 rounded-3xl overflow-hidden no-print">
        <div className="h-18 px-5 flex items-center gap-3 border-b border-white/15">
          <img
            src={
              shop.photoUrl ||
              '/assets/aistudio/file_00000000351481f488ee43b477fe5afb_522353d9.png'
            }
            alt={shop.shopName}
            className="w-10 h-10 rounded-xl object-cover object-top border-2 border-amber-300/80 shadow-sm shrink-0"
          />
          <div className="min-w-0">
            <p className="font-bold tracking-tight text-sm truncate text-3d-light">{shop.shopName}</p>
            <p className="text-[11px] text-red-100 truncate">
              {shop.shopSubtitle} · {planLabel}
            </p>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectTab(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-white text-[#991B1B] shadow-md'
                    : 'text-red-50 hover:bg-white/12'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/15 space-y-3 text-xs text-red-100">
          <PackageCountdownBanner
            variant="compact"
            shop={shop}
            locale={locale}
            onUpgradeClick={() => handleSelectTab('packages')}
          />

          <PWAInstallButton locale={locale} variant="sidebar" />

          <button
            type="button"
            onClick={() => handleSelectTab('complaints')}
            className="w-full text-left rounded-2xl bg-white/10 hover:bg-white/18 border border-white/15 p-3 transition-colors cursor-pointer space-y-1"
          >
            <div className="flex items-center gap-1.5 text-amber-300 font-bold">
              <Headphones className="w-3.5 h-3.5" />
              <span>{locale === 'bn' ? 'অভিযোগ ও সাপোর্ট' : 'Complaints & Help'}</span>
            </div>
            <p className="font-mono-num text-sm font-bold text-white">
              {SUPPORT_HELPLINE}
            </p>
          </button>

          <div className="space-y-0.5 px-1">
            <p className="font-semibold text-white truncate">
              {user.displayName || shop.shopName}
            </p>
            <p className="truncate text-[11px] text-red-200">{user.email}</p>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 pb-24 lg:pb-0">
        <header className="glass-gold-header glass-sheen rounded-b-[28px] lg:rounded-3xl px-4 sm:px-6 pt-3.5 pb-4 space-y-3 shrink-0 no-print">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <button
                type="button"
                onClick={() => handleSelectTab('reports', 'profile')}
                className="glass-text-plate inline-flex items-center gap-2 pl-1.5 pr-3.5 py-1.5 rounded-2xl text-slate-900 cursor-pointer max-w-full"
              >
                <img
                  src={
                    shop.photoUrl ||
                    '/assets/aistudio/file_00000000351481f488ee43b477fe5afb_522353d9.png'
                  }
                  alt={shop.shopName}
                  referrerPolicy="no-referrer"
                  className="w-6.5 h-6.5 rounded-xl object-cover object-top border border-amber-400 shrink-0"
                />
                <span className="font-display text-sm font-bold truncate max-w-[160px] sm:max-w-[260px] text-3d-gold">
                  {shop.shopName}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              </button>

              <div className="flex flex-wrap items-center gap-1.5 pl-1 text-xs font-bold text-slate-800/90">
                <span>
                  {shop.planTier === 'free' || !shop.planTier
                    ? locale === 'bn'
                      ? 'গোল্ড (ফ্রি খাতা)'
                      : 'Gold (Free Plan)'
                    : planLabel}
                </span>
                {planExpiryQuick.hasExpiry && (
                  <span
                    className={`font-mono-num text-[11px] px-1.5 py-0.5 rounded-md ${
                      planExpiryQuick.isExpired
                        ? 'bg-rose-600 text-white'
                        : 'bg-white/65 text-slate-900'
                    }`}
                  >
                    {planExpiryQuick.isExpired
                      ? locale === 'bn'
                        ? 'মেয়াদ শেষ'
                        : 'Expired'
                      : locale === 'bn'
                      ? `${toBnNumber(planExpiryQuick.daysLeft, locale)} দিন`
                      : `${planExpiryQuick.daysLeft}d`}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setShowBranchModal(true)}
                  className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-white/70 hover:bg-white text-slate-900 border border-amber-900/15 cursor-pointer"
                >
                  <Building2 className="w-3 h-3 text-amber-700" />
                  <span className="truncate max-w-[100px]">{activeBranchName}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowOperatorModal(true)}
                  className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md border cursor-pointer ${
                    activeStaff
                      ? 'bg-[#B91C1C] text-white border-[#991B1B]'
                      : 'bg-white/70 hover:bg-white text-slate-900 border-amber-900/15'
                  }`}
                >
                  <UserCheck className="w-3 h-3" />
                  <span className="truncate max-w-[90px]">
                    {activeStaff ? activeStaff.name : 'Owner'}
                  </span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
              <PWAInstallButton
                locale={locale}
                variant="header"
                onBeforeOpenModal={() => {
                  setNotificationOpen(false);
                  setMenuOpen(false);
                }}
              />
              {notificationControlsEl}

              <button
                type="button"
                onClick={() => {
                  setNotificationOpen(false);
                  setMenuOpen(false);
                  setShowCalculator(true);
                }}
                title={locale === 'bn' ? 'ক্যালকুলেটর' : 'Calculator'}
                className="inline-flex flex-col items-center justify-center px-2 py-1 rounded-xl hover:bg-white/45 text-slate-900 cursor-pointer transition-colors"
              >
                <Calculator className="w-4 h-4" />
                <span className="text-[10px] font-bold leading-tight mt-0.5">
                  {locale === 'bn' ? 'হিসাব' : 'Calc'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectTab('complaints')}
                className={`inline-flex flex-col items-center justify-center px-2 py-1 rounded-xl cursor-pointer transition-colors ${
                  activeTab === 'complaints'
                    ? 'bg-white/90 text-[#B91C1C]'
                    : 'hover:bg-white/45 text-slate-900'
                }`}
              >
                <MessageSquareWarning className="w-4 h-4" />
                <span className="text-[10px] font-bold leading-tight mt-0.5">
                  {locale === 'bn' ? 'সাপোর্ট' : 'Support'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setNotificationOpen(false);
                  setMenuOpen(false);
                  setLocale((l) => (l === 'bn' ? 'en' : 'bn'));
                }}
                className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-slate-800 bg-white/75 border border-amber-900/15 hover:bg-white rounded-xl cursor-pointer"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>{locale === 'bn' ? 'EN' : 'বাংলা'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setNotificationOpen(false);
                  setMenuOpen(false);
                  setIsLocked(true);
                }}
                title={tr(locale, 'lock_app')}
                className="hidden sm:inline-flex p-2 text-slate-800 bg-white/65 hover:bg-white rounded-xl cursor-pointer"
              >
                <Lock className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleLogout}
                title={tr(locale, 'logout')}
                className="hidden sm:inline-flex p-2 text-slate-800 bg-white/65 hover:bg-rose-50 hover:text-rose-700 rounded-xl cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleSelectTab('packages', 'plans')}
            className="w-full pt-2.5 border-t border-amber-900/12 flex items-center justify-between gap-3 text-left cursor-pointer group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-white/95 shadow-sm flex items-center justify-center text-amber-600 shrink-0">
                <Crown className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate text-3d-gold">
                  {shop.planTier === 'free' || !shop.planTier
                    ? locale === 'bn'
                      ? 'টালিখাতা গোল্ড ও প্যাকেজ কিনুন'
                      : 'Buy TallyKhata Gold & Plans'
                    : locale === 'bn'
                    ? `${planLabel} · প্যাকেজ ও মেয়াদ দেখুন`
                    : `${planLabel} · View Plans & Expiry`}
                </p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-800 group-hover:translate-x-0.5 transition-transform shrink-0" />
          </button>
        </header>

        <main className="flex-1 w-full px-3 sm:px-4 lg:px-0 pt-4">
          {activeTab === 'tally' && (
            <TallyKhataTab
              locale={locale}
              shopName={shop.shopName}
              shopPhone={shop.phone}
              shopAddress={shop.address}
              contacts={branchContacts}
              entries={branchKhataEntries}
              products={branchProducts}
              installments={branchInstallments}
              gateways={gateways}
              activeBranchName={activeBranchName}
              canDelete={canDeleteRecords}
              cashBalance={cashBalance}
              countdownHeaderSlot={
                <TallyTrialStrip
                  shop={shop}
                  locale={locale}
                  onUpgradeClick={() => handleSelectTab('packages', 'plans')}
                />
              }
              onNavigateTab={(tab, option) => handleSelectTab(tab, option)}
              onOpenCalculator={() => setShowCalculator(true)}
              onOpenBranchSwitcher={() => setShowBranchModal(true)}
              onCreateInstallmentPlan={async (input) => {
                const id = await createInstallmentPlan(user.uid, {
                  ...input,
                  branchId: activeBranchId,
                });
                notify({
                  title: locale === 'bn' ? 'কিস্তি প্ল্যান তৈরি' : 'Installment Created',
                  message:
                    locale === 'bn'
                      ? `${input.contactName} এর জন্য কিস্তি সিডিউল চালু হয়েছে।`
                      : `Installment schedule started for ${input.contactName}.`,
                  category: 'khata',
                });
                return id;
              }}
              onCollectInstallment={async (plan, input) => {
                await recordInstallmentPayment(user.uid, plan, input);
                notify({
                  title: locale === 'bn' ? 'কিস্তি জমা হয়েছে' : 'Installment Collected',
                  message:
                    locale === 'bn'
                      ? `${plan.contactName} এর ৳${input.amount} কিস্তি সফলভাবে আদায় হয়েছে।`
                      : `Collected ৳${input.amount} installment from ${plan.contactName}.`,
                  category: 'khata',
                });
              }}
              onDeleteInstallmentPlan={async (planId) => {
                await deleteInstallmentPlan(user.uid, planId);
                notify({
                  title: locale === 'bn' ? 'কিস্তি মুছে ফেলা' : 'Plan Deleted',
                  message:
                    locale === 'bn'
                      ? 'কিস্তি প্ল্যান মুছে ফেলা হয়েছে।'
                      : 'Installment plan deleted.',
                  category: 'khata',
                });
              }}
              onCreateContact={async (input) => {
                const id = await createContactWithOptionalBalance(user.uid, {
                  ...input,
                  branchId: activeBranchId,
                });
                notify({
                  title: locale === 'bn' ? 'নতুন খাতা যুক্ত' : 'Party Added',
                  message:
                    locale === 'bn'
                      ? `${input.name} এর খাতা সফলভাবে যুক্ত হয়েছে।`
                      : `${input.name} added to khata.`,
                  category: 'khata',
                });
                return id;
              }}
              onUpdateContact={async (cid, input) => {
                await updateContactDetails(user.uid, cid, input);
                notify({
                  title: locale === 'bn' ? 'তথ্য আপডেট' : 'Party Updated',
                  message:
                    locale === 'bn'
                      ? `${input.name} এর তথ্য সফলভাবে আপডেট হয়েছে।`
                      : `${input.name} details updated.`,
                  category: 'khata',
                });
              }}
              onDeleteContact={async (contact, entryIds) => {
                await deleteContactAndEntries(user.uid, contact.id, entryIds);
                notify({
                  title: locale === 'bn' ? 'কাস্টমার ডিলিট হয়েছে' : 'Party Deleted',
                  message:
                    locale === 'bn'
                      ? `${contact.name} ও এর সকল লেনদেন সফলভাবে মুছে ফেলা হয়েছে।`
                      : `${contact.name} and related entries deleted.`,
                  category: 'khata',
                });
              }}
              onAddEntry={async (contact, input) => {
                await addKhataTransaction(user.uid, contact, {
                  ...input,
                  branchId: activeBranchId,
                });
                notify({
                  title: locale === 'bn' ? 'টালি হিসাব সংরক্ষিত' : 'Khata Entry Saved',
                  message:
                    locale === 'bn'
                      ? `${contact.name} এর ${input.amount} টাকা হিসাব সফলভাবে খাতায় সংরক্ষিত হয়েছে।`
                      : `Saved ${input.amount} taka entry for ${contact.name}.`,
                  category: 'khata',
                });
              }}
              onDeleteEntry={async (contact, entry) => {
                await deleteKhataTransaction(user.uid, contact, entry);
                notify({
                  title: locale === 'bn' ? 'লেনদেন মুছে ফেলা' : 'Entry Deleted',
                  message:
                    locale === 'bn'
                      ? 'লেনদেন সফলভাবে মুছে ফেলা হয়েছে।'
                      : 'Khata entry deleted.',
                  category: 'khata',
                });
              }}
            />
          )}

          {activeTab === 'cashbook' && (
            <CashbookTab
              locale={locale}
              cashEntries={branchCashEntries}
              activeOperatorName={activeOperatorName}
              canDelete={canDeleteRecords}
              onOpenReports={() => handleSelectTab('reports', 'summary')}
              onAddCash={async (input) => {
                await addCashEntry(user.uid, {
                  ...input,
                  branchId: activeBranchId,
                });
                notify({
                  title: locale === 'bn' ? 'ক্যাশবই এন্ট্রি সফল' : 'Cash Entry Saved',
                  message:
                    locale === 'bn'
                      ? `ক্যাশবইয়ে ${input.amount} টাকা সফলভাবে যুক্ত হয়েছে।`
                      : `Recorded ${input.amount} taka in cashbook.`,
                  category: 'cash',
                });
              }}
              onDeleteCash={async (cashId) => {
                await deleteCashEntry(user.uid, cashId);
                notify({
                  title: locale === 'bn' ? 'এন্ট্রি মুছে ফেলা' : 'Entry Deleted',
                  message:
                    locale === 'bn'
                      ? 'ক্যাশবই এন্ট্রি মুছে ফেলা হয়েছে।'
                      : 'Cash entry deleted.',
                  category: 'cash',
                });
              }}
              onCreateShiftClosing={async (input) => {
                const id = await createShiftClosing(user.uid, {
                  ...input,
                  branchId: activeBranchId,
                });
                notify({
                  title: locale === 'bn' ? 'শিফট ক্লোজ সফল' : 'Shift Closed',
                  message:
                    locale === 'bn'
                      ? `${input.shiftLabel} (${input.staffName}) এর ক্যাশ হিসাব সেভ হয়েছে।`
                      : `Shift closing saved for ${input.staffName}.`,
                  category: 'cash',
                });
                return id;
              }}
            />
          )}

          {activeTab === 'telecom' && (
            <TelecomMfsTab
              locale={locale}
              shopName={shop.shopName}
              gateways={gateways}
              telecomEntries={branchTelecomEntries}
              onOpenPackages={(subView) => handleSelectTab('packages', subView)}
              onAddTelecom={async (input) => {
                await addTelecomEntry(user.uid, {
                  ...input,
                  branchId: activeBranchId,
                });
                notify({
                  title: locale === 'bn' ? 'টেলিকম / MFS সফল' : 'Telecom Entry Saved',
                  message:
                    locale === 'bn'
                      ? `${input.operator} এ ${input.amount} টাকা লেনদেন সফলভাবে সম্পন্ন হয়েছে।`
                      : `${input.operator} transaction of ${input.amount} taka saved.`,
                  category: 'telecom',
                });
              }}
              onDeleteTelecom={async (txId) => {
                await deleteTelecomEntry(user.uid, txId);
                notify({
                  title: locale === 'bn' ? 'এন্ট্রি মুছে ফেলা' : 'Entry Deleted',
                  message:
                    locale === 'bn'
                      ? 'টেলিকম এন্ট্রি মুছে ফেলা হয়েছে।'
                      : 'Telecom entry deleted.',
                  category: 'telecom',
                });
              }}
            />
          )}

          {activeTab === 'stock' && (
            <StockPosTab
              locale={locale}
              shopName={shop.shopName}
              shopPhone={shop.phone}
              shopAddress={shop.address}
              products={branchProducts}
              contacts={branchContacts}
              invoices={branchInvoices}
              purchaseOrders={branchPurchaseOrders}
              canViewProfit={canViewProfit}
              canDelete={canDeleteRecords}
              onSaveProduct={async (input, existingId) => {
                await saveProduct(
                  user.uid,
                  { ...input, branchId: activeBranchId },
                  existingId
                );
                notify({
                  title: locale === 'bn' ? 'পণ্য সংরক্ষিত' : 'Product Saved',
                  message:
                    locale === 'bn'
                      ? `${input.name} সফলভাবে স্টকে সংরক্ষিত হয়েছে।`
                      : `${input.name} saved to inventory.`,
                  category: 'stock',
                });
              }}
              onAdjustStock={async (product, delta) => {
                await adjustProductStock(user.uid, product, delta);
                notify({
                  title: locale === 'bn' ? 'স্টক আপডেট' : 'Stock Updated',
                  message:
                    locale === 'bn'
                      ? `${product.name} এর স্টক সফলভাবে আপডেট হয়েছে।`
                      : `Stock updated for ${product.name}.`,
                  category: 'stock',
                });
              }}
              onDeleteProduct={async (productId) => {
                await deleteProduct(user.uid, productId);
                notify({
                  title: locale === 'bn' ? 'পণ্য মুছে ফেলা' : 'Product Deleted',
                  message:
                    locale === 'bn' ? 'পণ্য মুছে ফেলা হয়েছে।' : 'Product deleted.',
                  category: 'stock',
                });
              }}
              onQuickSale={async (input) => {
                const inv = await recordQuickProductSale(user.uid, {
                  ...input,
                  branchId: activeBranchId,
                });
                notify({
                  title: locale === 'bn' ? 'বিক্রি সফল হয়েছে!' : 'Sale Completed!',
                  message:
                    locale === 'bn'
                      ? `${input.product.name} বিক্রি সফল হয়েছে ও ডিজিটাল মেমো তৈরি হয়েছে।`
                      : `Sale of ${input.product.name} completed & invoice created.`,
                  category: 'stock',
                });
                return inv;
              }}
              onCartCheckout={async (input) => {
                const inv = await recordPosCartSale(user.uid, {
                  ...input,
                  branchId: activeBranchId,
                });
                notify({
                  title: locale === 'bn' ? 'POS বিল সম্পন্ন!' : 'POS Checkout Done!',
                  message:
                    locale === 'bn'
                      ? `${inv.invoiceNo} · ৳${inv.totalAmount} বিল সফলভাবে সংরক্ষিত হয়েছে।`
                      : `${inv.invoiceNo} · ৳${inv.totalAmount} saved & stock updated.`,
                  category: 'stock',
                });
                return inv;
              }}
              onDeleteInvoice={async (invoiceId) => {
                await deleteSaleInvoice(user.uid, invoiceId);
                notify({
                  title: locale === 'bn' ? 'মেমো মুছে ফেলা হয়েছে' : 'Invoice Deleted',
                  message:
                    locale === 'bn'
                      ? 'ডিজিটাল মেমো তালিকা থেকে মুছে ফেলা হয়েছে।'
                      : 'Invoice removed from history.',
                  category: 'stock',
                });
              }}
              onCreatePurchaseOrder={async (input) => {
                const id = await createPurchaseOrder(user.uid, {
                  ...input,
                  branchId: activeBranchId,
                });
                notify({
                  title: locale === 'bn' ? 'ক্রয় অর্ডার সেভ হয়েছে' : 'Purchase Order Saved',
                  message:
                    locale === 'bn'
                      ? `${input.supplierName} থেকে নতুন স্টক সফলভাবে যুক্ত হয়েছে।`
                      : `Restocked from ${input.supplierName}.`,
                  category: 'stock',
                });
                return id;
              }}
              onDeletePurchaseOrder={async (poId) => {
                await deletePurchaseOrder(user.uid, poId);
                notify({
                  title: locale === 'bn' ? 'ক্রয় রিসিট মুছে ফেলা' : 'PO Deleted',
                  message:
                    locale === 'bn'
                      ? 'ক্রয় অর্ডার রেকর্ড মুছে ফেলা হয়েছে।'
                      : 'Purchase order removed.',
                  category: 'stock',
                });
              }}
              onBarcodeAlert={(msg, spoken) =>
                notify({
                  title: locale === 'bn' ? 'বারকোড স্ক্যান' : 'Barcode Scan',
                  message: msg,
                  spokenText: spoken ?? msg,
                  category: 'stock',
                })
              }
            />
          )}

          {activeTab === 'packages' && (
            <PackageCatalogTab
              locale={locale}
              shop={shop}
              pricing={pricing}
              gateways={gateways}
              catalogItems={catalogItems}
              upgradeRequests={upgradeRequests}
              initialSubView={packagesSubView}
              onSubmitUpgrade={async (input) => {
                await submitUpgradeRequest(user.uid, input);
                const label =
                  input.catalogTitle ||
                  (input.planTier === 'business'
                    ? locale === 'bn'
                      ? 'বিজনেস প্লাস'
                      : 'Business Plus'
                    : locale === 'bn'
                    ? 'টেলিকম প্রো'
                    : 'Telecom Pro');
                void user
                  .getIdToken()
                  .then((idToken) =>
                    sendOrderNotificationEmail(idToken, {
                      shopName: shop.shopName,
                      shopPhone: shop.phone,
                      customerEmail: user.email ?? '',
                      planTitle: label,
                      billingCycle: input.billingCycle,
                      amount: input.amount,
                      paymentMethod: input.paymentMethod,
                      senderNumber: input.senderNumber,
                      trxId: input.trxId,
                    })
                  )
                  .catch(() => {
                    // Ignore non-critical email notification errors
                  });
                notify({
                  title:
                    locale === 'bn'
                      ? 'অর্ডার সফল হয়েছে!'
                      : 'Order Successful!',
                  message:
                    locale === 'bn'
                      ? `আপনার ${label} অর্ডার (${input.amount} টাকা) সফল হয়েছে। শীঘ্রই এটি সক্রিয় করা হবে।`
                      : `Your ${label} order (${input.amount} taka) is successful and awaiting activation.`,
                  spokenText:
                    locale === 'bn'
                      ? `আপনার অর্ডার সফল হয়েছে! ${label} এর জন্য ${input.amount} টাকা পেমেন্ট রিসিট জমা হয়েছে।`
                      : `Your order is successful! Payment of ${input.amount} taka for ${label} has been received.`,
                  category: 'order',
                });
              }}
              onSpeakReceipt={(text) => {
                void speakHumanNotification(text, locale, 'order', setIsSpeaking);
              }}
            />
          )}

          {activeTab === 'complaints' && (
            <ComplaintBoxTab
              locale={locale}
              shop={shop}
              complaints={complaints}
              tickets={supportTickets}
              onCreateComplaint={async (input) => {
                await createComplaint(user.uid, input);
                void user
                  .getIdToken()
                  .then((idToken) =>
                    sendComplaintNotificationEmail(idToken, {
                      kind: 'complaint',
                      shopName: shop.shopName,
                      contactPhone: input.contactPhone || shop.phone,
                      customerEmail: user.email ?? '',
                      title: input.title,
                      category: input.category,
                      severity: input.severity,
                      referenceInfo: input.referenceInfo,
                      details: input.description,
                    })
                  )
                  .catch(() => {
                    // Ignore non-critical email notification errors
                  });
                notify({
                  title: locale === 'bn' ? 'অভিযোগ জমা হয়েছে' : 'Complaint Submitted',
                  message:
                    locale === 'bn'
                      ? 'আপনার অভিযোগ সফলভাবে অভিযোগ বক্সে জমা হয়েছে। আমাদের টিম দ্রুত ব্যবস্থা নেবে।'
                      : 'Your complaint has been submitted to the admin team.',
                  category: 'complaint',
                });
              }}
              onToggleComplaintStatus={async (complaintId, status) => {
                await updateComplaintUserStatus(user.uid, complaintId, status);
                notify({
                  title: locale === 'bn' ? 'স্ট্যাটাস আপডেট' : 'Complaint Updated',
                  message:
                    locale === 'bn'
                      ? 'অভিযোগের স্ট্যাটাস সফলভাবে আপডেট হয়েছে।'
                      : 'Complaint status updated.',
                  category: 'complaint',
                });
              }}
              onCreateTicket={async (input) => {
                await createSupportTicket(user.uid, input);
                void user
                  .getIdToken()
                  .then((idToken) =>
                    sendComplaintNotificationEmail(idToken, {
                      kind: 'ticket',
                      shopName: shop.shopName,
                      contactPhone: input.contactPhone || shop.phone,
                      customerEmail: user.email ?? '',
                      title: input.subject,
                      category: input.category,
                      details: input.message,
                    })
                  )
                  .catch(() => {
                    // Ignore non-critical email notification errors
                  });
                notify({
                  title: locale === 'bn' ? 'সাপোর্ট টিকেট পাঠানো' : 'Ticket Submitted',
                  message:
                    locale === 'bn'
                      ? 'আপনার সাপোর্ট টিকেট সফলভাবে পাঠানো হয়েছে।'
                      : 'Support ticket submitted successfully.',
                  category: 'support',
                });
              }}
              onToggleTicketStatus={async (ticketId, status) => {
                await updateSupportTicketStatus(user.uid, ticketId, status);
                notify({
                  title: locale === 'bn' ? 'টিকেট আপডেট' : 'Ticket Updated',
                  message:
                    locale === 'bn'
                      ? 'টিকেটের অবস্থা সফলভাবে আপডেট হয়েছে।'
                      : 'Ticket status updated.',
                  category: 'support',
                });
              }}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsSettingsTab
              locale={locale}
              shop={shop}
              contacts={branchContacts}
              cashEntries={branchCashEntries}
              products={branchProducts}
              invoices={branchInvoices}
              telecomEntries={branchTelecomEntries}
              staffMembers={staffMembers}
              shiftClosings={branchShiftClosings}
              isStaffSession={Boolean(activeStaff)}
              canViewProfit={canViewProfit}
              activeBranchName={activeBranchName}
              initialReportView={reportsSubView}
              voiceEnabled={voiceEnabled}
              onToggleVoice={handleToggleVoice}
              onUpdateShop={async (input) => {
                await updateShopProfile(user.uid, input);
                notify({
                  title: locale === 'bn' ? 'প্রোফাইল আপডেট' : 'Shop Updated',
                  message:
                    locale === 'bn'
                      ? 'দোকানের তথ্য সফলভাবে আপডেট হয়েছে।'
                      : 'Shop profile updated.',
                  category: 'general',
                });
              }}
              onSavePinHash={async (hash) => {
                await updateShopPin(user.uid, hash);
                notify({
                  title: locale === 'bn' ? 'পিন লক আপডেট' : 'PIN Updated',
                  message:
                    locale === 'bn'
                      ? 'নিরাপত্তা পিন সফলভাবে আপডেট হয়েছে।'
                      : 'Security PIN updated.',
                  category: 'general',
                });
              }}
              onSaveStaff={async (input, existingId) => {
                const id = await saveStaffMember(user.uid, input, existingId);
                notify({
                  title: locale === 'bn' ? 'স্টাফ সংরক্ষিত' : 'Staff Saved',
                  message:
                    locale === 'bn'
                      ? `${input.name} এর স্টাফ তথ্য সেভ হয়েছে।`
                      : `Saved staff profile for ${input.name}.`,
                  category: 'general',
                });
                return id;
              }}
              onToggleStaffActive={async (staff) => {
                await toggleStaffActive(user.uid, staff);
                notify({
                  title: locale === 'bn' ? 'স্ট্যাটাস আপডেট' : 'Staff Updated',
                  message:
                    locale === 'bn'
                      ? `${staff.name} এর অ্যাকাউন্ট স্ট্যাটাস পরিবর্তন হয়েছে।`
                      : `Updated active status for ${staff.name}.`,
                  category: 'general',
                });
              }}
              onDeleteStaff={async (staffId) => {
                await deleteStaffMember(user.uid, staffId);
                if (activeStaff?.id === staffId) setActiveStaff(null);
                notify({
                  title: locale === 'bn' ? 'স্টাফ মুছে ফেলা' : 'Staff Removed',
                  message:
                    locale === 'bn' ? 'স্টাফ তালিকা থেকে সরানো হয়েছে।' : 'Staff removed.',
                  category: 'general',
                });
              }}
              onDeleteShiftClosing={async (shiftId) => {
                await deleteShiftClosing(user.uid, shiftId);
                notify({
                  title: locale === 'bn' ? 'শিফট রেকর্ড মুছে ফেলা' : 'Shift Removed',
                  message:
                    locale === 'bn'
                      ? 'শিফট ক্লোজিং মুছে ফেলা হয়েছে।'
                      : 'Shift closing deleted.',
                  category: 'general',
                });
              }}
              onOpenOperatorSwitcher={() => setShowOperatorModal(true)}
              onOpenBranchSwitcher={() => setShowBranchModal(true)}
            />
          )}
        </main>
      </div>

      {menuOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden bg-slate-900/45 backdrop-blur-sm flex items-end justify-center no-print"
          onClick={(e) => {
            if (e.target === e.currentTarget) setMenuOpen(false);
          }}
        >
          <div className="w-full max-w-lg bg-[#faf8f4] rounded-t-3xl border-t border-white shadow-[0_-20px_48px_-12px_rgba(15,23,42,0.28)] px-5 pt-2.5 pb-24 space-y-4 max-h-[85vh] overflow-y-auto animate-panel-rise">
            <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto" aria-hidden="true" />
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200/80">
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src={
                    shop.photoUrl ||
                    '/assets/aistudio/file_00000000351481f488ee43b477fe5afb_522353d9.png'
                  }
                  alt={shop.shopName}
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 rounded-xl object-cover object-top border border-rose-200 shadow-sm shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-base font-bold text-slate-900 truncate">
                    {shop.shopName}
                  </p>
                  <p className="text-xs text-slate-500 font-mono-num truncate">
                    {user.email} · {planLabel}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="p-2 rounded-full bg-white border border-slate-200 text-slate-600 hover:text-slate-900 cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <PackageCountdownBanner
              variant="admin-mini"
              shop={shop}
              locale={locale}
              onUpgradeClick={() => handleSelectTab('packages', 'plans')}
            />

            <PWAInstallButton
              locale={locale}
              variant="menu"
              onBeforeOpenModal={() => setMenuOpen(false)}
            />

            <div className="grid grid-cols-2 gap-2.5">
              {(
                [
                  {
                    id: 'stock' as const,
                    label: locale === 'bn' ? 'স্টক হিসাব (POS)' : 'Stock & POS',
                    icon: Package,
                    tone: 'text-rose-600 bg-rose-50',
                  },
                  {
                    id: 'packages' as const,
                    sub: 'plans',
                    label: locale === 'bn' ? 'প্যাকেজ প্ল্যান' : 'Gold Plans',
                    icon: Crown,
                    tone: 'text-amber-600 bg-amber-50',
                  },
                  {
                    id: 'packages' as const,
                    sub: 'catalog',
                    label: locale === 'bn' ? 'বিশেষ ক্যাটালগ' : 'Special Catalog',
                    icon: Layers,
                    tone: 'text-violet-600 bg-violet-50',
                  },
                  {
                    id: 'packages' as const,
                    sub: 'gateways',
                    label: locale === 'bn' ? 'পেমেন্ট ও QR' : 'Gateways & QR',
                    icon: QrCode,
                    tone: 'text-emerald-600 bg-emerald-50',
                  },
                  {
                    id: 'complaints' as const,
                    label: locale === 'bn' ? 'অভিযোগ বক্স' : 'Complaint Box',
                    icon: MessageSquareWarning,
                    tone: 'text-rose-600 bg-rose-50',
                  },
                  {
                    id: 'reports' as const,
                    sub: 'summary',
                    label: locale === 'bn' ? 'ব্যবসায়িক রিপোর্ট' : 'Business Reports',
                    icon: BarChart3,
                    tone: 'text-sky-600 bg-sky-50',
                  },
                  {
                    id: 'reports' as const,
                    sub: 'analytics',
                    label: locale === 'bn' ? 'লাভ-ক্ষতি ও গ্রাফ' : 'Profit & Charts',
                    icon: BarChart3,
                    tone: 'text-emerald-600 bg-emerald-50',
                  },
                  {
                    id: 'reports' as const,
                    sub: 'staff',
                    label: locale === 'bn' ? 'স্টাফ ও শিফট হিসাব' : 'Staff & Shifts',
                    icon: UserCheck,
                    tone: 'text-indigo-600 bg-indigo-50',
                  },
                  {
                    id: 'reports' as const,
                    sub: 'profile',
                    label: locale === 'bn' ? 'দোকান সেটিংস' : 'Shop Settings',
                    icon: Settings,
                    tone: 'text-slate-700 bg-slate-100',
                  },
                  {
                    id: 'reports' as const,
                    sub: 'security',
                    label: locale === 'bn' ? 'পিন লক নিরাপত্তা' : 'PIN Security',
                    icon: Lock,
                    tone: 'text-emerald-700 bg-emerald-50',
                  },
                ] as {
                  id: TabId;
                  sub?: string;
                  label: string;
                  icon: typeof Package;
                  tone: string;
                }[]
              ).map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={`${item.id}_${item.sub ?? 'main'}`}
                    type="button"
                    onClick={() => handleSelectTab(item.id, item.sub)}
                    className="glass-3d-tile rounded-2xl p-3.5 flex items-center gap-2.5 text-left cursor-pointer"
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${item.tone}`}
                    >
                      <Icon className="w-4.5 h-4.5" />
                    </div>
                    <span className="text-xs font-bold text-slate-900 leading-tight">
                      {item.label}
                    </span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setShowBranchModal(true);
                }}
                className="glass-3d-tile rounded-2xl p-3.5 flex items-center gap-2.5 text-left cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-amber-700 bg-amber-50">
                  <Building2 className="w-4.5 h-4.5" />
                </div>
                <span className="text-xs font-bold text-slate-900 leading-tight truncate">
                  {activeBranchName}
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setShowOperatorModal(true);
                }}
                className="glass-3d-tile rounded-2xl p-3.5 flex items-center gap-2.5 text-left cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-[#B91C1C] bg-rose-50">
                  <UserCheck className="w-4.5 h-4.5" />
                </div>
                <span className="text-xs font-bold text-slate-900 leading-tight truncate">
                  {activeStaff ? activeStaff.name : 'Owner Mode'}
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setShowCalculator(true);
                }}
                className="glass-3d-tile rounded-2xl p-3.5 flex items-center gap-2.5 text-left cursor-pointer col-span-2"
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-amber-700 bg-amber-50">
                  <Calculator className="w-4.5 h-4.5" />
                </div>
                <span className="text-xs font-bold text-slate-900 leading-tight">
                  {locale === 'bn' ? 'দোকান ক্যালকুলেটর (দ্রুত হিসাব)' : 'Quick Shop Calculator'}
                </span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/80">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setLocale((l) => (l === 'bn' ? 'en' : 'bn'));
                }}
                className="glass-3d-tile rounded-xl px-3 py-2.5 flex items-center justify-center gap-2 text-xs font-bold text-slate-800 cursor-pointer"
              >
                <Globe className="w-4 h-4 text-slate-600" />
                <span>{locale === 'bn' ? 'Switch to English' : 'বাংলা ভাষা'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  handleToggleVoice();
                }}
                className="glass-3d-tile rounded-xl px-3 py-2.5 flex items-center justify-center gap-2 text-xs font-bold text-slate-800 cursor-pointer"
              >
                {voiceEnabled ? (
                  <Volume2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <VolumeX className="w-4 h-4 text-slate-400" />
                )}
                <span>
                  {voiceEnabled
                    ? locale === 'bn'
                      ? 'ভয়েস অ্যালার্ট চালু'
                      : 'Voice On'
                    : locale === 'bn'
                    ? 'ভয়েস অ্যালার্ট বন্ধ'
                    : 'Voice Muted'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setIsLocked(true);
                }}
                className="glass-3d-tile rounded-xl px-3 py-2.5 flex items-center justify-center gap-2 text-xs font-bold text-slate-800 cursor-pointer"
              >
                <Lock className="w-4 h-4 text-amber-600" />
                <span>{tr(locale, 'lock_app')}</span>
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="glass-3d-tile rounded-xl px-3 py-2.5 flex items-center justify-center gap-2 text-xs font-bold text-rose-700 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>{tr(locale, 'logout')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-xl border-t border-slate-200/80 shadow-[0_-10px_28px_-14px_rgba(15,23,42,0.16)] grid grid-cols-4 items-center h-16 px-2 z-50 no-print">
        {(
          [
            {
              id: 'tally' as const,
              label: locale === 'bn' ? 'টালি' : 'Tally',
              icon: BookOpenCheck,
            },
            {
              id: 'cashbook' as const,
              label: locale === 'bn' ? 'ক্যাশবক্স' : 'Cashbox',
              icon: Inbox,
            },
            {
              id: 'telecom' as const,
              label: locale === 'bn' ? 'টালিপে' : 'TallyPay',
              icon: Wallet,
            },
          ] as const
        ).map((item) => {
          const Icon = item.icon;
          const active = !menuOpen && activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelectTab(item.id)}
              className={`flex flex-col items-center justify-center gap-0.5 py-1 cursor-pointer transition-colors ${
                active ? 'text-[#B91C1C]' : 'text-slate-600'
              }`}
            >
              <span
                className={`inline-flex items-center justify-center px-4 py-1 rounded-full transition-colors ${
                  active ? 'bg-rose-100/90 text-[#B91C1C]' : ''
                }`}
              >
                <Icon className="w-4.5 h-4.5 shrink-0" />
              </span>
              <span className="text-[11px] font-bold leading-none mt-0.5">
                {item.label}
              </span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => {
            setNotificationOpen(false);
            setMenuOpen((prev) => !prev);
          }}
          className={`flex flex-col items-center justify-center gap-0.5 py-1 cursor-pointer transition-colors ${
            menuOpen ||
            activeTab === 'stock' ||
            activeTab === 'packages' ||
            activeTab === 'complaints' ||
            activeTab === 'reports'
              ? 'text-[#B91C1C]'
              : 'text-slate-600'
          }`}
        >
          <span
            className={`inline-flex items-center justify-center px-4 py-1 rounded-full transition-colors ${
              menuOpen ||
              activeTab === 'stock' ||
              activeTab === 'packages' ||
              activeTab === 'complaints' ||
              activeTab === 'reports'
                ? 'bg-rose-100/90 text-[#B91C1C]'
                : ''
            }`}
          >
            {menuOpen ? (
              <X className="w-4.5 h-4.5 shrink-0" />
            ) : (
              <Menu className="w-4.5 h-4.5 shrink-0" />
            )}
          </span>
          <span className="text-[11px] font-bold leading-none mt-0.5">
            {locale === 'bn' ? 'মেনু' : 'Menu'}
          </span>
        </button>
      </nav>

      <SpokenToastBanner
        locale={locale}
        activeToast={activeToast}
        isSpeaking={isSpeaking}
        onReplay={handleReplayNotification}
        onDismiss={() => setActiveToast(null)}
      />
      <OfflineIndicator locale={locale} hasPendingSync={hasPendingSync} />
      {showCalculator && (
        <CalculatorModal
          locale={locale}
          onClose={() => setShowCalculator(false)}
        />
      )}
      {showBranchModal && (
        <BranchSwitcherModal
          locale={locale}
          primaryShopName={shop.shopName}
          primaryShopAddress={shop.address}
          branches={branches}
          activeBranchId={activeBranchId}
          canManage={!activeStaff}
          onSelectBranch={handleSelectBranch}
          onSaveBranch={async (input, existingId) => {
            const id = await saveShopBranch(user.uid, input, existingId);
            notify({
              title: locale === 'bn' ? 'নতুন শাখা সংরক্ষিত' : 'Branch Saved',
              message:
                locale === 'bn'
                  ? `${input.name} সফলভাবে তৈরি হয়েছে।`
                  : `Branch ${input.name} saved.`,
              category: 'general',
            });
            return id;
          }}
          onDeleteBranch={async (branchId) => {
            await deleteShopBranch(user.uid, branchId);
            if (activeBranchId === branchId) {
              handleSelectBranch('main');
            }
            notify({
              title: locale === 'bn' ? 'শাখা মুছে ফেলা' : 'Branch Deleted',
              message:
                locale === 'bn' ? 'শাখা তালিকা থেকে সরানো হয়েছে।' : 'Branch deleted.',
              category: 'general',
            });
          }}
          onClose={() => setShowBranchModal(false)}
        />
      )}
      {showOperatorModal && (
        <OperatorSwitcherModal
          locale={locale}
          ownerPinHash={shop.pinHash}
          staffMembers={staffMembers}
          activeStaff={activeStaff}
          onSwitchOperator={(staff) => {
            setActiveStaff(staff);
            notify({
              title: locale === 'bn' ? 'অপারেটর পরিবর্তন' : 'Operator Switched',
              message: staff
                ? locale === 'bn'
                  ? `${staff.name} মোড চালু হয়েছে।`
                  : `Switched to ${staff.name}.`
                : locale === 'bn'
                ? 'মালিক (Owner) মোড চালু হয়েছে।'
                : 'Switched to Owner mode.',
              category: 'general',
            });
          }}
          onClose={() => setShowOperatorModal(false)}
        />
      )}
    </div>
  );
}
