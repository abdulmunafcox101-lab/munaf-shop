import React, { useEffect, useMemo, useState } from 'react';
import {
  Ban,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Crown,
  Headphones,
  Loader2,
  MessageCircle,
  MessageSquareReply,
  Minus,
  PhoneCall,
  Plus,
  RotateCcw,
  Save,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  Store,
  Tag,
  Trash2,
  UserPlus,
  X,
  XCircle,
} from 'lucide-react';
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
import {
  AdminUpdateShopPlanInput,
  DEFAULT_PRICING,
  formatTaka,
  SUPER_ADMIN_EMAIL,
} from '../lib/shopService';
import {
  formatTimestamp,
  normalizeTicketStatus,
  normalizeUpgradeStatus,
  StatusStepper,
} from './StatusStepper';
import {
  formatExactDateTime,
  fromDatetimeLocalValue,
  PackageCountdownBanner,
  toDatetimeLocalValue,
} from './PackageCountdownBanner';
import { GatewayEmblem } from './PaymentGatewayCards';
import { AdminGatewaysSection } from './AdminGatewaysSection';
import { AdminComplaintsSection } from './AdminComplaintsSection';
import { AdminCatalogSection } from './AdminCatalogSection';
import { AdminAppUpdateSection } from './AdminAppUpdateSection';

interface AdminPanelTabProps {
  locale: Locale;
  currentEmail: string;
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

type AdminSection =
  | 'shops'
  | 'complaints'
  | 'tickets'
  | 'upgrades'
  | 'gateways'
  | 'pricing'
  | 'catalog'
  | 'app_update'
  | 'admins';
type TicketFilter = 'all' | 'pending' | 'processing' | 'resolved' | 'rejected';
type UpgradeFilter = 'all' | 'pending' | 'processing' | 'active' | 'rejected';
type ShopStatusFilter = 'all' | 'active' | 'restricted';

const TICKET_QUICK_REPLIES_BN = [
  {
    label: 'যাচাই চলছে',
    status: 'processing' as const,
    reply: 'আসসালামু আলাইকুম, আপনার সমস্যাটি আমাদের টেকনিক্যাল টিম পর্যালোচনা করছে। শীঘ্রই সমাধান জানানো হবে।',
    reason: 'সাপোর্ট টিম তথ্য যাচাই ও প্রসেসিং করছে',
  },
  {
    label: 'সমাধান সফল',
    status: 'resolved' as const,
    reply: 'আপনার অনুরোধকৃত সমস্যাটি সফলভাবে সমাধান করা হয়েছে। অনুগ্রহ করে অ্যাপটি রিফ্রেশ করে দেখুন। প্রয়োজনে 01608603364 নম্বরে কল করুন।',
    reason: 'সমস্যাটি সফলভাবে সমাধান হয়েছে',
  },
  {
    label: 'অসম্পূর্ণ তথ্য / বাতিল',
    status: 'rejected' as const,
    reply: 'দুঃখিত, প্রদত্ত তথ্য অসম্পূর্ণ বা সঠিক নয়। অনুগ্রহ করে সঠিক বিবরণ ও মোবাইল নম্বরসহ নতুন টিকেট দিন অথবা 01608603364 নম্বরে যোগাযোগ করুন।',
    reason: 'প্রয়োজনীয় তথ্য অসম্পূর্ণ বা সঠিক নয়',
  },
];

const UPGRADE_REASON_PRESETS_BN: Record<UpgradeRequestStatus, string[]> = {
  pending: ['পেমেন্ট তথ্য অনুমোদনের অপেক্ষায় রয়েছে'],
  processing: ['TrxID ও সেন্ডার নম্বর যাচাই করা হচ্ছে'],
  active: ['পেমেন্ট সফলভাবে যাচাই হয়েছে — প্যাকেজ সক্রিয় করা হয়েছে'],
  rejected: [
    'প্রদত্ত TrxID বা পেমেন্ট পাওয়া যায়নি',
    'পাঠানো টাকার পরিমাণ প্যাকেজ মূল্যের সাথে মিলছে না',
  ],
};

const BAN_REASON_PRESETS_BN = [
  'ভুয়া TrxID বা অসত্য পেমেন্ট তথ্য জমা দেওয়া হয়েছে',
  'প্ল্যাটফর্ম নীতিমালা ভঙ্গ ও সন্দেহজনক কার্যকলাপ',
  'সাবস্ক্রিপশন বকেয়া থাকায় সাময়িক স্থগিত করা হয়েছে',
  'পরিচয় ও দোকানের তথ্য যাচাইয়ের জন্য সাময়িক ব্লক',
];

export const AdminPanelTab: React.FC<AdminPanelTabProps> = ({
  locale,
  currentEmail,
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
  const [section, setSection] = useState<AdminSection>('shops');
  const [search, setSearch] = useState('');
  const [shopFilter, setShopFilter] = useState<ShopStatusFilter>('all');
  const [ticketFilter, setTicketFilter] = useState<TicketFilter>('all');
  const [upgradeFilter, setUpgradeFilter] = useState<UpgradeFilter>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [editingTicketId, setEditingTicketId] = useState<string | null>(null);
  const [draftTicketStatus, setDraftTicketStatus] =
    useState<Exclude<SupportTicketStatus, 'open'>>('processing');
  const [draftTicketReply, setDraftTicketReply] = useState('');
  const [draftTicketReason, setDraftTicketReason] = useState('');

  const [editingUpgrade, setEditingUpgrade] = useState<UpgradeRequest | null>(null);
  const [draftUpgradeStatus, setDraftUpgradeStatus] =
    useState<UpgradeRequestStatus>('active');
  const [draftUpgradeReason, setDraftUpgradeReason] = useState('');
  const [draftUpgradeStartLocal, setDraftUpgradeStartLocal] = useState('');
  const [draftUpgradeEndLocal, setDraftUpgradeEndLocal] = useState('');

  const [planModalShop, setPlanModalShop] = useState<ShopProfile | null>(null);
  const [draftPlanTier, setDraftPlanTier] = useState<PlanTier>('pro');
  const [draftPlanCycle, setDraftPlanCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [draftPlanStartLocal, setDraftPlanStartLocal] = useState('');
  const [draftPlanEndLocal, setDraftPlanEndLocal] = useState('');

  const [banModalShop, setBanModalShop] = useState<ShopProfile | null>(null);
  const [draftAccountStatus, setDraftAccountStatus] =
    useState<AccountStatus>('blocked');
  const [draftBanReason, setDraftBanReason] = useState('');

  const [proMonthly, setProMonthly] = useState(pricing.proMonthly);
  const [proYearly, setProYearly] = useState(pricing.proYearly);
  const [businessMonthly, setBusinessMonthly] = useState(pricing.businessMonthly);
  const [businessYearly, setBusinessYearly] = useState(pricing.businessYearly);
  const [discountNote, setDiscountNote] = useState(pricing.discountNote ?? '');
  const [savingPricing, setSavingPricing] = useState(false);

  const [newAdminUid, setNewAdminUid] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [confirmRemoveAdminUid, setConfirmRemoveAdminUid] = useState<string | null>(null);

  useEffect(() => {
    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        setEditingUpgrade(null);
        setPlanModalShop(null);
        setBanModalShop(null);
        setConfirmRemoveAdminUid(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    setProMonthly(pricing.proMonthly);
    setProYearly(pricing.proYearly);
    setBusinessMonthly(pricing.businessMonthly);
    setBusinessYearly(pricing.businessYearly);
    setDiscountNote(pricing.discountNote ?? '');
  }, [pricing]);

  const shopLookup = useMemo(() => {
    const map = new Map<string, ShopProfile>();
    allShops.forEach((s) => map.set(s.ownerUid, s));
    return map;
  }, [allShops]);

  const stats = useMemo(() => {
    const paidShops = allShops.filter(
      (s) => s.planTier === 'pro' || s.planTier === 'business'
    ).length;
    const restrictedShops = allShops.filter(
      (s) => s.accountStatus === 'blocked' || s.accountStatus === 'banned'
    ).length;
    const pendingUpgrades = allUpgradeRequests.filter(
      (u) => u.status === 'pending' || u.status === 'processing'
    ).length;
    const activeTickets = allSupportTickets.filter((t) => {
      const s = normalizeTicketStatus(t.status);
      return s === 'pending' || s === 'processing';
    }).length;
    const activeComplaints = allComplaints.filter((c) => {
      const s = normalizeTicketStatus(c.status);
      return s === 'pending' || s === 'processing';
    }).length;
    return {
      totalShops: allShops.length,
      paidShops,
      restrictedShops,
      pendingUpgrades,
      activeTickets,
      activeComplaints,
    };
  }, [allShops, allUpgradeRequests, allSupportTickets, allComplaints]);

  const ticketCounts = useMemo(() => {
    const counts = { all: allSupportTickets.length, pending: 0, processing: 0, resolved: 0, rejected: 0 };
    allSupportTickets.forEach((t) => {
      const stage = normalizeTicketStatus(t.status);
      if (stage === 'pending') counts.pending += 1;
      else if (stage === 'processing') counts.processing += 1;
      else if (stage === 'success') counts.resolved += 1;
      else counts.rejected += 1;
    });
    return counts;
  }, [allSupportTickets]);

  const upgradeCounts = useMemo(() => {
    const counts = { all: allUpgradeRequests.length, pending: 0, processing: 0, active: 0, rejected: 0 };
    allUpgradeRequests.forEach((u) => {
      const stage = normalizeUpgradeStatus(u.status);
      if (stage === 'pending') counts.pending += 1;
      else if (stage === 'processing') counts.processing += 1;
      else if (stage === 'success') counts.active += 1;
      else counts.rejected += 1;
    });
    return counts;
  }, [allUpgradeRequests]);

  const filteredShops = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allShops.filter((s) => {
      const st = s.accountStatus ?? 'active';
      if (shopFilter === 'active' && st !== 'active') return false;
      if (shopFilter === 'restricted' && st === 'active') return false;
      if (!q) return true;
      return (
        s.shopName.toLowerCase().includes(q) ||
        s.phone.toLowerCase().includes(q) ||
        (s.ownerEmail ?? '').toLowerCase().includes(q) ||
        s.ownerUid.toLowerCase().includes(q) ||
        s.address.toLowerCase().includes(q)
      );
    });
  }, [allShops, shopFilter, search]);

  const filteredUpgrades = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allUpgradeRequests.filter((u) => {
      if (upgradeFilter !== 'all' && u.status !== upgradeFilter) return false;
      if (!q) return true;
      const shop = shopLookup.get(u.ownerUid);
      const shopName = shop?.shopName.toLowerCase() ?? '';
      const shopPhone = shop?.phone.toLowerCase() ?? '';
      return (
        u.trxId.toLowerCase().includes(q) ||
        u.senderNumber.toLowerCase().includes(q) ||
        shopName.includes(q) ||
        shopPhone.includes(q) ||
        u.ownerUid.toLowerCase().includes(q)
      );
    });
  }, [allUpgradeRequests, upgradeFilter, search, shopLookup]);

  const filteredTickets = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allSupportTickets.filter((t) => {
      const norm = normalizeTicketStatus(t.status);
      if (ticketFilter === 'pending' && norm !== 'pending') return false;
      if (ticketFilter === 'processing' && norm !== 'processing') return false;
      if (ticketFilter === 'resolved' && norm !== 'success') return false;
      if (ticketFilter === 'rejected' && norm !== 'rejected') return false;
      if (!q) return true;
      const shop = shopLookup.get(t.ownerUid);
      const shopName = shop?.shopName.toLowerCase() ?? '';
      return (
        t.subject.toLowerCase().includes(q) ||
        t.message.toLowerCase().includes(q) ||
        t.contactPhone.toLowerCase().includes(q) ||
        t.ownerUid.toLowerCase().includes(q) ||
        (t.adminReply ?? '').toLowerCase().includes(q) ||
        shopName.includes(q)
      );
    });
  }, [allSupportTickets, ticketFilter, search, shopLookup]);

  const copyText = async (val: string, key: string) => {
    try {
      await navigator.clipboard.writeText(val);
      setCopiedId(key);
      setTimeout(() => setCopiedId((prev) => (prev === key ? null : prev)), 1800);
    } catch {
      // Clipboard blocked
    }
  };

  const planName = (tier?: PlanTier | 'catalog', catalogTitle?: string) => {
    if (tier === 'catalog') {
      return catalogTitle || (locale === 'bn' ? 'ক্যাটালগ অর্ডার' : 'Catalog Order');
    }
    if (tier === 'business') return locale === 'bn' ? 'বিজনেস প্লাস' : 'Business Plus';
    if (tier === 'pro') return locale === 'bn' ? 'টেলিকম প্রো' : 'Telecom Pro';
    return locale === 'bn' ? 'ফ্রি খাতা' : 'Free';
  };

  const openTicketComposer = (tkt: SupportTicket) => {
    setEditingUpgrade(null);
    setPlanModalShop(null);
    setBanModalShop(null);
    setActionError(null);
    if (editingTicketId === tkt.id) {
      setEditingTicketId(null);
      return;
    }
    const currentStatus: Exclude<SupportTicketStatus, 'open'> =
      tkt.status === 'open' ? 'pending' : tkt.status;
    setEditingTicketId(tkt.id);
    setDraftTicketStatus(currentStatus);
    setDraftTicketReply(tkt.adminReply ?? '');
    setDraftTicketReason(tkt.statusReason ?? '');
  };

  const handleSaveTicket = async (tkt: SupportTicket, e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setBusyId(tkt.id);
    try {
      await onUpdateTicket(tkt.ownerUid, tkt.id, {
        status: draftTicketStatus,
        adminReply: draftTicketReply.trim(),
        statusReason: draftTicketReason.trim(),
      });
      setEditingTicketId(null);
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : locale === 'bn'
          ? 'টিকেট আপডেট করতে সমস্যা হয়েছে।'
          : 'Failed to update support ticket.'
      );
    } finally {
      setBusyId(null);
    }
  };

  const openUpgradeEditor = (req: UpgradeRequest, presetStatus?: UpgradeRequestStatus) => {
    setEditingTicketId(null);
    setPlanModalShop(null);
    setBanModalShop(null);
    setModalError(null);
    const nextStatus = presetStatus ?? req.status;
    setEditingUpgrade(req);
    setDraftUpgradeStatus(nextStatus);
    setDraftUpgradeReason(
      req.statusReason ||
        (presetStatus ? UPGRADE_REASON_PRESETS_BN[presetStatus][0] ?? '' : '')
    );
    const defaultStartMs = req.startedAt ? req.startedAt.toMillis() : Date.now();
    const defaultDays = req.billingCycle === 'yearly' ? 365 : 30;
    const defaultEndMs = req.expiresAt
      ? req.expiresAt.toMillis()
      : defaultStartMs + defaultDays * 86400_000;
    setDraftUpgradeStartLocal(toDatetimeLocalValue(defaultStartMs));
    setDraftUpgradeEndLocal(toDatetimeLocalValue(defaultEndMs));
  };

  const handleSaveUpgrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUpgrade) return;
    setModalError(null);
    let customRange: { startedAtMs?: number; expiresAtMs?: number } | undefined;
    if (draftUpgradeStatus === 'active') {
      const startMs = fromDatetimeLocalValue(draftUpgradeStartLocal);
      const endMs = fromDatetimeLocalValue(draftUpgradeEndLocal);
      if (startMs && endMs && endMs <= startMs) {
        setModalError(
          locale === 'bn'
            ? 'মেয়াদ শেষের সময় অবশ্যই শুরুর সময়ের পরের হতে হবে।'
            : 'Expiry time must be after start time.'
        );
        return;
      }
      customRange = { startedAtMs: startMs, expiresAtMs: endMs };
    }
    setBusyId(editingUpgrade.id);
    try {
      await onApproveUpgrade(
        editingUpgrade,
        draftUpgradeStatus,
        draftUpgradeReason.trim(),
        customRange
      );
      setEditingUpgrade(null);
    } catch (err) {
      setModalError(
        err instanceof Error
          ? err.message
          : locale === 'bn'
          ? 'অর্ডার স্ট্যাটাস সেভ করতে সমস্যা হয়েছে।'
          : 'Failed to update upgrade request.'
      );
    } finally {
      setBusyId(null);
    }
  };

  const openPlanModal = (shop: ShopProfile) => {
    setEditingTicketId(null);
    setEditingUpgrade(null);
    setBanModalShop(null);
    setModalError(null);
    const currentTier: PlanTier = shop.planTier ?? 'free';
    const nextTier: PlanTier = currentTier === 'free' ? 'pro' : currentTier;
    const cycle = shop.planBillingCycle ?? 'monthly';
    const startMs = shop.planStartedAt ? shop.planStartedAt.toMillis() : Date.now();
    const defaultDays = cycle === 'yearly' ? 365 : 30;
    const endMs = shop.planExpiresAt
      ? shop.planExpiresAt.toMillis()
      : startMs + defaultDays * 86400_000;

    setPlanModalShop(shop);
    setDraftPlanTier(nextTier);
    setDraftPlanCycle(cycle);
    setDraftPlanStartLocal(toDatetimeLocalValue(startMs));
    setDraftPlanEndLocal(toDatetimeLocalValue(endMs));
  };

  const applyPlanPresetDays = (days: number, cycle?: 'monthly' | 'yearly') => {
    const baseStartMs = fromDatetimeLocalValue(draftPlanStartLocal) ?? Date.now();
    if (!draftPlanStartLocal) {
      setDraftPlanStartLocal(toDatetimeLocalValue(baseStartMs));
    }
    if (cycle) setDraftPlanCycle(cycle);
    setDraftPlanEndLocal(toDatetimeLocalValue(baseStartMs + days * 86400_000));
  };

  const handleSavePlanSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planModalShop) return;
    setModalError(null);
    if (draftPlanTier !== 'free') {
      const startMs = fromDatetimeLocalValue(draftPlanStartLocal) ?? Date.now();
      const endMs = fromDatetimeLocalValue(draftPlanEndLocal);
      if (endMs && endMs <= startMs) {
        setModalError(
          locale === 'bn'
            ? 'মেয়াদ শেষের সময় অবশ্যই শুরুর সময়ের পরের হতে হবে।'
            : 'Expiry time must be after start time.'
        );
        return;
      }
    }
    setBusyId(`plan_${planModalShop.ownerUid}`);
    try {
      if (draftPlanTier === 'free') {
        await onUpdateShopPlan(planModalShop.ownerUid, { planTier: 'free' });
      } else {
        await onUpdateShopPlan(planModalShop.ownerUid, {
          planTier: draftPlanTier,
          billingCycle: draftPlanCycle,
          startedAtMs: fromDatetimeLocalValue(draftPlanStartLocal) ?? Date.now(),
          expiresAtMs: fromDatetimeLocalValue(draftPlanEndLocal),
        });
      }
      setPlanModalShop(null);
    } catch (err) {
      setModalError(
        err instanceof Error
          ? err.message
          : locale === 'bn'
          ? 'প্যাকেজ মেয়াদ সেভ করতে সমস্যা হয়েছে।'
          : 'Failed to save plan schedule.'
      );
    } finally {
      setBusyId(null);
    }
  };

  const openBanModal = (shop: ShopProfile) => {
    setEditingTicketId(null);
    setEditingUpgrade(null);
    setPlanModalShop(null);
    setModalError(null);
    const cur = shop.accountStatus ?? 'active';
    setBanModalShop(shop);
    setDraftAccountStatus(cur === 'active' ? 'blocked' : cur);
    setDraftBanReason(shop.banReason ?? '');
  };

  const handleSaveBanStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!banModalShop) return;
    setModalError(null);
    setBusyId(`ban_${banModalShop.ownerUid}`);
    try {
      await onUpdateAccountStatus(banModalShop.ownerUid, {
        accountStatus: draftAccountStatus,
        banReason: draftAccountStatus === 'active' ? '' : draftBanReason.trim(),
      });
      setBanModalShop(null);
    } catch (err) {
      setModalError(
        err instanceof Error
          ? err.message
          : locale === 'bn'
          ? 'অ্যাকাউন্ট স্ট্যাটাস আপডেট করতে সমস্যা হয়েছে।'
          : 'Failed to update account status.'
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleSavePricingForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setSavingPricing(true);
    try {
      await onSavePricing({
        proMonthly,
        proYearly,
        businessMonthly,
        businessYearly,
        discountNote: discountNote.trim(),
      });
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : locale === 'bn'
          ? 'প্যাকেজ মূল্য সেভ করতে সমস্যা হয়েছে।'
          : 'Failed to save pricing.'
      );
    } finally {
      setSavingPricing(false);
    }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminUid.trim() || !newAdminEmail.trim()) return;
    setActionError(null);
    setBusyId('add_admin');
    try {
      await onAddSubAdmin(newAdminUid.trim(), newAdminEmail.trim());
      setNewAdminUid('');
      setNewAdminEmail('');
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : locale === 'bn'
          ? 'নতুন সাব-এডমিন যোগ করতে সমস্যা হয়েছে।'
          : 'Failed to add sub-admin.'
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      {actionError && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 px-4 py-3 text-xs font-semibold text-rose-700 flex items-center justify-between gap-2">
          <span>{actionError}</span>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="p-1 hover:bg-rose-100 rounded-lg cursor-pointer"
            aria-label="Dismiss error"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      <div className="glass-3d-crimson rounded-3xl p-5 sm:p-6 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-300">
            <ShieldCheck className="w-4 h-4" />
            <span>
              {locale === 'bn'
                ? 'সুপার এডমিন কন্ট্রোল প্যানেল'
                : 'Super Admin Control Panel'}
            </span>
          </div>
          <h2 className="mt-1.5 text-xl sm:text-2xl font-bold tracking-tight">
            {locale === 'bn'
              ? 'মোনাফ টেলিকম প্ল্যাটফর্ম ম্যানেজমেন্ট'
              : 'MUNAF SHOP Platform Administration'}
          </h2>
          <p className="text-xs text-red-100 mt-1 font-mono-num">
            {currentEmail} · {locale === 'bn' ? 'হেল্পলাইন: 01608603364' : 'Helpline: 01608603364'}
          </p>
        </div>

        <div className="rounded-2xl bg-white/10 border border-white/20 px-4 py-3 text-xs text-red-50 space-y-0.5 sm:text-right">
          <p className="font-bold text-white">
            {locale === 'bn' ? 'রিয়েল-টাইম ক্লাউড সিঙ্ক' : 'Live Firestore Sync'}
          </p>
          <p>
            {locale === 'bn'
              ? 'ইউজার আইডি, ব্লক/ব্যান, প্যাকেজ মূল্য ও সাপোর্ট নিয়ন্ত্রণ'
              : 'User IDs, block/ban, dynamic pricing & support'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-3d-tile rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-600">
              {locale === 'bn' ? 'মোট ইউজার / দোকান' : 'Total Users / Shops'}
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900 font-mono-num">
              {stats.totalShops}
            </p>
            {stats.restrictedShops > 0 && (
              <p className="text-[11px] font-semibold text-rose-600 font-mono-num">
                {stats.restrictedShops} {locale === 'bn' ? 'টি ব্লক/ব্যান' : 'restricted'}
              </p>
            )}
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200/80 flex items-center justify-center text-[#B91C1C]">
            <Store className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-3d-tile rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-600">
              {locale === 'bn' ? 'পেইড প্যাকেজ চালু' : 'Paid Shops'}
            </p>
            <p className="mt-1 text-2xl font-bold text-emerald-700 font-mono-num">
              {stats.paidShops}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-700">
            <Crown className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-3d-tile rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-600">
              {locale === 'bn' ? 'চলমান আপগ্রেড' : 'Pending Upgrades'}
            </p>
            <p className="mt-1 text-2xl font-bold text-[#B91C1C] font-mono-num">
              {stats.pendingUpgrades}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-700">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-3d-tile rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-600">
              {locale === 'bn' ? 'সক্রিয় সাপোর্ট টিকেট' : 'Active Tickets'}
            </p>
            <p className="mt-1 text-2xl font-bold text-sky-700 font-mono-num">
              {stats.activeTickets}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200/80 flex items-center justify-center text-sky-700">
            <Headphones className="w-5 h-5" />
          </div>
        </div>
      </div>

      <div className="glass-3d-tile rounded-2xl p-3.5 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-200/75 rounded-xl">
          {(
            [
              [
                'shops',
                locale === 'bn'
                  ? `ইউজার ও দোকান (${stats.totalShops})`
                  : `Users & Shops (${stats.totalShops})`,
              ],
              [
                'complaints',
                locale === 'bn'
                  ? `অভিযোগ বক্স (${stats.activeComplaints})`
                  : `Complaints (${stats.activeComplaints})`,
              ],
              [
                'tickets',
                locale === 'bn'
                  ? `সাপোর্ট (${stats.activeTickets})`
                  : `Support (${stats.activeTickets})`,
              ],
              [
                'upgrades',
                locale === 'bn'
                  ? `প্যাকেজ অনুমোদন (${stats.pendingUpgrades})`
                  : `Upgrades (${stats.pendingUpgrades})`,
              ],
              [
                'gateways',
                locale === 'bn' ? 'পেমেন্ট গেটওয়ে' : 'Gateways',
              ],
              [
                'pricing',
                locale === 'bn' ? 'প্যাকেজ মূল্য' : 'Pricing',
              ],
              [
                'catalog',
                locale === 'bn'
                  ? `ক্যাটালগ (${catalogItems.length})`
                  : `Catalog (${catalogItems.length})`,
              ],
              [
                'app_update',
                'App Update Management',
              ],
              ...(isSuperAdmin
                ? ([
                    [
                      'admins',
                      locale === 'bn' ? 'অ্যাডমিন অ্যাক্সেস' : 'Admins',
                    ],
                  ] as [AdminSection, string][])
                : []),
            ] as [AdminSection, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setSection(id);
                setEditingTicketId(null);
                setEditingUpgrade(null);
                setPlanModalShop(null);
                setBanModalShop(null);
              }}
              className={`px-3.5 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all whitespace-nowrap ${
                section === id
                  ? 'bg-white text-[#B91C1C] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {section !== 'admins' &&
          section !== 'pricing' &&
          section !== 'catalog' &&
          section !== 'app_update' &&
          section !== 'gateways' && (
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                locale === 'bn'
                  ? 'ইউজার আইডি, ইমেইল, নম্বর, দোকান বা TrxID...'
                  : 'Search UID, email, phone, shop, TrxID...'
              }
              className="w-full pl-9 pr-3 py-2 text-sm bg-white/85 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B91C1C]"
            />
          </div>
        )}
      </div>

      {section === 'complaints' && (
        <AdminComplaintsSection
          locale={locale}
          complaints={allComplaints}
          shopLookup={shopLookup}
          search={search}
          onUpdateComplaint={onUpdateComplaint}
          onOpenBanModal={openBanModal}
        />
      )}

      {section === 'gateways' && (
        <AdminGatewaysSection
          locale={locale}
          gateways={gateways}
          onSaveGateways={onSaveGateways}
        />
      )}

      {section === 'shops' && (
        <div className="space-y-4">
          <div className="glass-3d-tile rounded-2xl p-3 flex flex-wrap items-center gap-1.5">
            {(
              [
                ['all', locale === 'bn' ? `সব ইউজার (${stats.totalShops})` : `All (${stats.totalShops})`],
                ['active', locale === 'bn' ? `সক্রিয় (${stats.totalShops - stats.restrictedShops})` : `Active (${stats.totalShops - stats.restrictedShops})`],
                ['restricted', locale === 'bn' ? `ব্লক / ব্যান (${stats.restrictedShops})` : `Blocked / Banned (${stats.restrictedShops})`],
              ] as [ShopStatusFilter, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setShopFilter(id)}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl cursor-pointer transition-colors ${
                  shopFilter === id
                    ? 'bg-[#B91C1C] text-white shadow-xs'
                    : 'bg-white/75 text-slate-600 hover:text-slate-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {filteredShops.length === 0 ? (
            <div className="glass-3d-tile rounded-2xl p-10 text-center text-sm text-slate-500">
              {locale === 'bn' ? 'কোনো ইউজার বা দোকান পাওয়া যায়নি।' : 'No users or shops found.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredShops.map((s) => {
                const accountStatus = s.accountStatus ?? 'active';
                const isBlocked = accountStatus === 'blocked';
                const isBanned = accountStatus === 'banned';
                const digits = (s.phone || '').replace(/\D/g, '');
                const waPhone =
                  digits.length >= 10
                    ? digits.startsWith('88')
                      ? digits
                      : `88${digits}`
                    : '';

                return (
                  <div
                    key={s.ownerUid}
                    className={`glass-3d-tile rounded-2xl p-5 space-y-3.5 ${
                      isBanned
                        ? 'ring-2 ring-rose-300'
                        : isBlocked
                        ? 'ring-2 ring-amber-300'
                        : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-bold text-slate-900 truncate">
                            {s.shopName}
                          </h3>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold rounded-md border ${
                              isBanned
                                ? 'bg-rose-50 text-rose-800 border-rose-200'
                                : isBlocked
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}
                          >
                            {isBanned
                              ? locale === 'bn'
                                ? 'ব্যান (Banned)'
                                : 'Banned'
                              : isBlocked
                              ? locale === 'bn'
                                ? 'ব্লক (Blocked)'
                                : 'Blocked'
                              : locale === 'bn'
                              ? 'সক্রিয়'
                              : 'Active'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {s.shopSubtitle}
                          {s.address ? ` · ${s.address}` : ''}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <select
                          disabled={busyId === s.ownerUid}
                          value={s.planTier ?? 'free'}
                          onChange={async (e) => {
                            const nextPlan = e.target.value as PlanTier;
                            setActionError(null);
                            setBusyId(s.ownerUid);
                            try {
                              await onUpdateShopPlan(s.ownerUid, nextPlan);
                            } catch (err) {
                              setActionError(
                                err instanceof Error
                                  ? err.message
                                  : locale === 'bn'
                                  ? 'প্ল্যান পরিবর্তন করতে সমস্যা হয়েছে।'
                                  : 'Failed to update plan.'
                              );
                            } finally {
                              setBusyId(null);
                            }
                          }}
                          className="px-2.5 py-1.5 text-xs font-bold bg-white border border-slate-300 rounded-xl text-slate-800 cursor-pointer"
                        >
                          <option value="free">
                            {locale === 'bn' ? 'ফ্রি খাতা' : 'Free'}
                          </option>
                          <option value="pro">
                            {locale === 'bn' ? 'টেলিকম প্রো' : 'Pro'}
                          </option>
                          <option value="business">
                            {locale === 'bn' ? 'বিজনেস প্লাস' : 'Business'}
                          </option>
                        </select>

                        <button
                          type="button"
                          onClick={() => openPlanModal(s)}
                          title={locale === 'bn' ? 'মেয়াদ ও সময় সেট করুন' : 'Set Plan Schedule'}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl cursor-pointer"
                        >
                          <CalendarClock className="w-3.5 h-3.5 text-amber-300" />
                          <span>{locale === 'bn' ? 'মেয়াদ' : 'Timer'}</span>
                        </button>
                      </div>
                    </div>

                    <PackageCountdownBanner
                      variant="admin-mini"
                      shop={s}
                      locale={locale}
                      onUpgradeClick={() => openPlanModal(s)}
                    />

                    <div className="rounded-xl bg-white/85 border border-slate-200/80 p-3 space-y-2 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span className="text-slate-500 font-semibold">User ID: </span>
                          <span className="font-mono-num font-bold text-slate-900 break-all">
                            {s.ownerUid}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyText(s.ownerUid, `uid_${s.ownerUid}`)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer shrink-0"
                        >
                          {copiedId === `uid_${s.ownerUid}` ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span>
                            {copiedId === `uid_${s.ownerUid}`
                              ? locale === 'bn'
                                ? 'কপি হয়েছে'
                                : 'Copied'
                              : locale === 'bn'
                              ? 'কপি'
                              : 'Copy'}
                          </span>
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-200/60">
                        <div className="space-y-0.5 min-w-0">
                          <p className="font-mono-num text-slate-800">
                            <span className="text-slate-500">মোবাইল: </span>
                            <span className="font-bold">
                              {s.phone || (locale === 'bn' ? 'নম্বর দেওয়া হয়নি' : 'Not set')}
                            </span>
                          </p>
                          <p className="text-slate-700 truncate">
                            <span className="text-slate-500">ইমেইল: </span>
                            <span className="font-medium">
                              {s.ownerEmail || (locale === 'bn' ? 'ইমেইল সিঙ্ক অপেক্ষমান' : 'Pending sync')}
                            </span>
                          </p>
                        </div>

                        {s.phone && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => copyText(s.phone, `ph_${s.ownerUid}`)}
                              className="px-2 py-1 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
                            >
                              {copiedId === `ph_${s.ownerUid}` ? 'কপি হয়েছে' : 'নম্বর কপি'}
                            </button>
                            <a
                              href={`tel:${s.phone}`}
                              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                            >
                              <PhoneCall className="w-3 h-3" />
                              <span>{locale === 'bn' ? 'কল' : 'Call'}</span>
                            </a>
                            {waPhone && (
                              <a
                                href={`https://wa.me/${waPhone}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg hover:bg-emerald-100"
                              >
                                <MessageCircle className="w-3 h-3" />
                                <span>WA</span>
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {(isBlocked || isBanned) && (
                      <div
                        className={`rounded-xl border px-3.5 py-2.5 text-xs ${
                          isBanned
                            ? 'bg-rose-50/90 border-rose-200 text-rose-900'
                            : 'bg-amber-50/90 border-amber-200 text-amber-900'
                        }`}
                      >
                        <span className="font-bold">
                          {locale === 'bn' ? 'ব্লক/ব্যানের কারণ: ' : 'Restriction Reason: '}
                        </span>
                        <span>{s.banReason || '—'}</span>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/70">
                      <button
                        type="button"
                        onClick={() => openPlanModal(s)}
                        className="text-[11px] font-bold text-[#B91C1C] hover:underline cursor-pointer inline-flex items-center gap-1"
                      >
                        <CalendarClock className="w-3.5 h-3.5" />
                        <span>
                          {locale === 'bn' ? 'প্যাকেজ ও মেয়াদ পরিবর্তন' : 'Edit Plan & Expiry'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => openBanModal(s)}
                        className={`btn-3d inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl cursor-pointer ${
                          isBlocked || isBanned
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'bg-rose-600 hover:bg-rose-700 text-white'
                        }`}
                      >
                        {isBlocked || isBanned ? (
                          <ShieldAlert className="w-3.5 h-3.5" />
                        ) : (
                          <Ban className="w-3.5 h-3.5" />
                        )}
                        <span>
                          {isBlocked || isBanned
                            ? locale === 'bn'
                              ? 'স্ট্যাটাস / আনব্লক'
                              : 'Manage / Unblock'
                            : locale === 'bn'
                            ? 'ব্লক / ব্যান করুন'
                            : 'Block / Ban User'}
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {section === 'tickets' && (
        <div className="space-y-4">
          <div className="glass-3d-tile rounded-2xl p-3 flex flex-wrap items-center gap-1.5">
            {(
              [
                ['all', locale === 'bn' ? `সব (${ticketCounts.all})` : `All (${ticketCounts.all})`],
                ['pending', locale === 'bn' ? `পেন্ডিং (${ticketCounts.pending})` : `Pending (${ticketCounts.pending})`],
                ['processing', locale === 'bn' ? `প্রসেসিং (${ticketCounts.processing})` : `Processing (${ticketCounts.processing})`],
                ['resolved', locale === 'bn' ? `সফল (${ticketCounts.resolved})` : `Resolved (${ticketCounts.resolved})`],
                ['rejected', locale === 'bn' ? `বাতিল (${ticketCounts.rejected})` : `Rejected (${ticketCounts.rejected})`],
              ] as [TicketFilter, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setTicketFilter(id);
                  setEditingTicketId(null);
                }}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl cursor-pointer transition-colors ${
                  ticketFilter === id
                    ? 'bg-[#B91C1C] text-white shadow-xs'
                    : 'bg-white/75 text-slate-600 hover:text-slate-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {filteredTickets.length === 0 ? (
            <div className="glass-3d-tile rounded-2xl p-10 text-center text-sm text-slate-500">
              {locale === 'bn'
                ? 'এই ফিল্টারে কোনো সাপোর্ট টিকেট পাওয়া যায়নি।'
                : 'No support tickets found for this filter.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredTickets.map((tkt) => {
                const shop = shopLookup.get(tkt.ownerUid);
                const stage = normalizeTicketStatus(tkt.status);
                const isEditing = editingTicketId === tkt.id;
                const phone = tkt.contactPhone || shop?.phone || '';
                const digits = phone.replace(/\D/g, '');
                const waPhone =
                  digits.length >= 10
                    ? digits.startsWith('88')
                      ? digits
                      : `88${digits}`
                    : '';

                return (
                  <div
                    key={`${tkt.ownerUid}_${tkt.id}`}
                    className="glass-3d-tile rounded-2xl p-5 space-y-4"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                      <div className="space-y-1 min-w-0 flex-1">
                        <h3 className="text-base font-bold text-slate-900">
                          {tkt.subject}
                        </h3>
                        <p className="text-xs text-slate-600 font-medium">
                          {shop?.shopName || tkt.ownerUid} · {tkt.category}
                          {phone ? ` · ${phone}` : ''}
                          {shop?.ownerEmail ? ` · ${shop.ownerEmail}` : ''}
                          {tkt.createdAt
                            ? ` · ${formatTimestamp(tkt.createdAt, locale)}`
                            : ''}
                        </p>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono-num">
                          <span>UID: {tkt.ownerUid}</span>
                          <button
                            type="button"
                            onClick={() => copyText(tkt.ownerUid, `tkt_${tkt.id}`)}
                            className="font-bold text-[#B91C1C] hover:underline cursor-pointer"
                          >
                            {copiedId === `tkt_${tkt.id}` ? 'কপি হয়েছে' : 'কপি'}
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {phone && (
                          <>
                            <a
                              href={`tel:${phone}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-white border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50"
                            >
                              <PhoneCall className="w-3.5 h-3.5" />
                              <span>{locale === 'bn' ? 'কল' : 'Call'}</span>
                            </a>
                            {waPhone && (
                              <a
                                href={`https://wa.me/${waPhone}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 hover:bg-emerald-100"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                                <span>WhatsApp</span>
                              </a>
                            )}
                          </>
                        )}

                        {shop && (
                          <button
                            type="button"
                            onClick={() => openBanModal(shop)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-xl bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 cursor-pointer"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            <span>{locale === 'bn' ? 'ব্লক/ব্যান' : 'Block/Ban'}</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => openTicketComposer(tkt)}
                          className="btn-3d inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-[#B91C1C] hover:bg-[#991B1B] text-white cursor-pointer"
                        >
                          <MessageSquareReply className="w-3.5 h-3.5" />
                          <span>
                            {isEditing
                              ? locale === 'bn'
                                ? 'বন্ধ করুন'
                                : 'Close'
                              : locale === 'bn'
                              ? 'রিপ্লাই ও স্ট্যাটাস'
                              : 'Reply & Status'}
                          </span>
                        </button>
                      </div>
                    </div>

                    <StatusStepper stage={stage} locale={locale} kind="ticket" />

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      <div className="rounded-xl bg-white/80 border border-slate-200/80 p-3.5 space-y-1">
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                          {locale === 'bn' ? 'দোকানদারের মেসেজ' : 'User Message'}
                        </p>
                        <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                          {tkt.message}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-50/90 border border-slate-200/80 p-3.5 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[11px] font-bold text-[#B91C1C] uppercase tracking-wide">
                            {locale === 'bn' ? 'এডমিন রিপ্লাই ও কারণ' : 'Admin Reply & Reason'}
                          </p>
                          {tkt.repliedAt && (
                            <span className="text-[11px] text-slate-500 font-mono-num">
                              {formatTimestamp(tkt.repliedAt, locale)}
                            </span>
                          )}
                        </div>
                        {tkt.adminReply ? (
                          <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                            {tkt.adminReply}
                          </p>
                        ) : (
                          <p className="text-xs text-slate-400 italic">
                            {locale === 'bn'
                              ? 'এখনো কোনো রিপ্লাই পাঠানো হয়নি।'
                              : 'No admin reply sent yet.'}
                          </p>
                        )}
                        {tkt.statusReason && (
                          <div className="pt-2 border-t border-slate-200/80 text-xs text-slate-700">
                            <span className="font-bold text-slate-900">
                              {locale === 'bn' ? 'কারণ: ' : 'Reason: '}
                            </span>
                            <span>{tkt.statusReason}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {isEditing && (
                      <form
                        onSubmit={(e) => handleSaveTicket(tkt, e)}
                        className="rounded-2xl bg-white/95 border border-red-200/80 p-4 space-y-3.5 shadow-sm"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs font-bold text-slate-900">
                            {locale === 'bn'
                              ? 'স্ট্যাটাস নির্বাচন, রিপ্লাই ও কারণ লিখুন'
                              : 'Update Status, Reply & Reason'}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {TICKET_QUICK_REPLIES_BN.map((preset) => (
                              <button
                                key={preset.label}
                                type="button"
                                onClick={() => {
                                  setDraftTicketStatus(preset.status);
                                  setDraftTicketReply(preset.reply);
                                  setDraftTicketReason(preset.reason);
                                }}
                                className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-red-50 hover:text-[#B91C1C] border border-slate-200 rounded-lg cursor-pointer transition-colors"
                              >
                                {preset.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {(
                            [
                              ['pending', locale === 'bn' ? 'পেন্ডিং' : 'Pending', Clock],
                              ['processing', locale === 'bn' ? 'প্রসেসিং' : 'Processing', Loader2],
                              ['resolved', locale === 'bn' ? 'সফল / সমাধান' : 'Resolved', CheckCircle2],
                              ['rejected', locale === 'bn' ? 'বাতিল / রিজেক্ট' : 'Rejected', XCircle],
                            ] as const
                          ).map(([st, lbl, Icon]) => {
                            const selected = draftTicketStatus === st;
                            return (
                              <button
                                key={st}
                                type="button"
                                onClick={() => setDraftTicketStatus(st)}
                                className={`flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold rounded-xl border cursor-pointer transition-all ${
                                  selected
                                    ? st === 'resolved'
                                      ? 'bg-emerald-600 text-white border-emerald-600'
                                      : st === 'processing'
                                      ? 'bg-sky-600 text-white border-sky-600'
                                      : st === 'rejected'
                                      ? 'bg-rose-600 text-white border-rose-600'
                                      : 'bg-amber-500 text-white border-amber-500'
                                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                <Icon className="w-3.5 h-3.5" />
                                <span>{lbl}</span>
                              </button>
                            );
                          })}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                          <div className="lg:col-span-7">
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-xs font-semibold text-slate-700">
                                {locale === 'bn'
                                  ? 'ইউজারকে রিপ্লাই মেসেজ (ইউজার সরাসরি দেখবে)'
                                  : 'Reply to User'}
                              </label>
                              <span className="text-[11px] text-slate-400 font-mono-num">
                                {draftTicketReply.length}/500
                              </span>
                            </div>
                            <textarea
                              rows={3}
                              maxLength={500}
                              value={draftTicketReply}
                              onChange={(e) => setDraftTicketReply(e.target.value)}
                              placeholder={
                                locale === 'bn'
                                  ? 'সাপোর্ট টিকেটের উত্তর লিখুন...'
                                  : 'Write your reply to the shop owner...'
                              }
                              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-[#B91C1C]"
                            />
                          </div>

                          <div className="lg:col-span-5">
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-xs font-semibold text-slate-700">
                                {locale === 'bn'
                                  ? 'স্ট্যাটাসের কারণ / রেজন (Reason)'
                                  : 'Status Reason'}
                              </label>
                              <span className="text-[11px] text-slate-400 font-mono-num">
                                {draftTicketReason.length}/300
                              </span>
                            </div>
                            <textarea
                              rows={3}
                              maxLength={300}
                              value={draftTicketReason}
                              onChange={(e) => setDraftTicketReason(e.target.value)}
                              placeholder={
                                locale === 'bn'
                                  ? 'যেমন: টেকনিক্যাল টিম কাজ করছে / সমাধান সম্পন্ন...'
                                  : 'e.g. Under review / Resolved / Missing info...'
                              }
                              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-[#B91C1C]"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingTicketId(null)}
                            className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                          >
                            {locale === 'bn' ? 'বাতিল' : 'Cancel'}
                          </button>
                          <button
                            type="submit"
                            disabled={busyId === tkt.id}
                            className="btn-3d inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#B91C1C] hover:bg-[#991B1B] rounded-xl cursor-pointer disabled:opacity-60"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>
                              {busyId === tkt.id
                                ? locale === 'bn'
                                  ? 'সেভ হচ্ছে...'
                                  : 'Saving...'
                                : locale === 'bn'
                                ? 'রিপ্লাই ও স্ট্যাটাস পাঠান'
                                : 'Save & Send Reply'}
                            </span>
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {section === 'upgrades' && (
        <div className="space-y-4">
          <div className="glass-3d-tile rounded-2xl p-3 flex flex-wrap items-center gap-1.5">
            {(
              [
                ['all', locale === 'bn' ? `সব (${upgradeCounts.all})` : `All (${upgradeCounts.all})`],
                ['pending', locale === 'bn' ? `পেন্ডিং (${upgradeCounts.pending})` : `Pending (${upgradeCounts.pending})`],
                ['processing', locale === 'bn' ? `প্রসেসিং (${upgradeCounts.processing})` : `Processing (${upgradeCounts.processing})`],
                ['active', locale === 'bn' ? `সফল / অ্যাক্টিভ (${upgradeCounts.active})` : `Active (${upgradeCounts.active})`],
                ['rejected', locale === 'bn' ? `বাতিল (${upgradeCounts.rejected})` : `Rejected (${upgradeCounts.rejected})`],
              ] as [UpgradeFilter, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setUpgradeFilter(id);
                  setEditingUpgrade(null);
                }}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl cursor-pointer transition-colors ${
                  upgradeFilter === id
                    ? 'bg-[#B91C1C] text-white shadow-xs'
                    : 'bg-white/75 text-slate-600 hover:text-slate-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {filteredUpgrades.length === 0 ? (
            <div className="glass-3d-tile rounded-2xl p-10 text-center text-sm text-slate-500">
              {locale === 'bn'
                ? 'এই ফিল্টারে কোনো প্যাকেজ আপগ্রেড অনুরোধ পাওয়া যায়নি।'
                : 'No package upgrade requests found.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredUpgrades.map((req) => {
                const shop = shopLookup.get(req.ownerUid);
                const stage = normalizeUpgradeStatus(req.status);
                return (
                  <div
                    key={`${req.ownerUid}_${req.id}`}
                    className="glass-3d-tile rounded-2xl p-5 space-y-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <GatewayEmblem id={req.paymentMethod} size="sm" />
                        <div className="min-w-0">
                          <p className="text-base font-bold text-slate-900 truncate">
                            {shop?.shopName || req.ownerUid}
                          </p>
                          <p className="text-xs text-slate-600 mt-0.5 font-mono-num">
                            {planName(req.planTier, req.catalogTitle)}
                            {req.planTier !== 'catalog' &&
                              ` · ${
                                req.billingCycle === 'monthly'
                                  ? locale === 'bn'
                                    ? 'মাসিক'
                                    : 'Monthly'
                                  : locale === 'bn'
                                  ? 'বার্ষিক'
                                  : 'Yearly'
                              }`}{' '}
                            · {req.paymentMethod}
                          </p>
                          <p className="text-xs text-slate-600 mt-0.5 font-mono-num">
                            TrxID: <span className="font-bold text-slate-900">{req.trxId}</span>
                            {req.senderNumber ? ` · From: ${req.senderNumber}` : ''}
                          </p>
                        <p className="text-[11px] text-slate-500 mt-0.5 font-mono-num">
                          UID: {req.ownerUid}
                          {shop?.phone ? ` · Shop: ${shop.phone}` : ''}
                        </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-lg font-bold font-mono-num text-[#B91C1C]">
                          {formatTaka(req.amount)}
                        </p>
                        {req.createdAt && (
                          <p className="text-[11px] text-slate-500 font-mono-num">
                            {formatTimestamp(req.createdAt, locale)}
                          </p>
                        )}
                      </div>
                    </div>

                    <StatusStepper stage={stage} locale={locale} kind="upgrade" />

                    {(req.startedAt || req.expiresAt) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-xl bg-slate-900 text-white px-3.5 py-2.5 text-[11px] font-mono-num">
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
                      <div className="rounded-xl bg-slate-50/90 border border-slate-200/80 px-3.5 py-2.5 text-xs text-slate-700">
                        <span className="font-bold text-slate-900">
                          {locale === 'bn' ? 'কারণ / নোট: ' : 'Reason: '}
                        </span>
                        <span>{req.statusReason}</span>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/70">
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => openUpgradeEditor(req, 'processing')}
                          className="px-2.5 py-1.5 text-[11px] font-bold rounded-lg bg-sky-50 text-sky-800 border border-sky-200 hover:bg-sky-100 cursor-pointer"
                        >
                          {locale === 'bn' ? 'প্রসেসিং' : 'Processing'}
                        </button>
                        <button
                          type="button"
                          onClick={() => openUpgradeEditor(req, 'active')}
                          className="px-2.5 py-1.5 text-[11px] font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
                        >
                          {locale === 'bn' ? 'সফল ও অ্যাক্টিভ' : 'Approve & Active'}
                        </button>
                        <button
                          type="button"
                          onClick={() => openUpgradeEditor(req, 'rejected')}
                          className="px-2.5 py-1.5 text-[11px] font-bold rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 cursor-pointer"
                        >
                          {locale === 'bn' ? 'বাতিল / রিজেক্ট' : 'Reject'}
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => openUpgradeEditor(req)}
                        className="text-xs font-bold text-[#B91C1C] hover:underline cursor-pointer"
                      >
                        {locale === 'bn' ? 'কারণ লিখুন' : 'Edit Reason'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {section === 'pricing' && (
        <div className="space-y-6">
          <form onSubmit={handleSavePricingForm} className="glass-3d-tile rounded-2xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-[#B91C1C]" />
                <h3 className="text-base font-bold text-slate-900">
                  {locale === 'bn'
                    ? 'প্যাকেজ মূল্য উঠানামা ও অফার নিয়ন্ত্রণ'
                    : 'Dynamic Package Pricing Control'}
                </h3>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                {locale === 'bn'
                  ? 'এখান থেকে মূল্য বাড়ালে বা কমালে সাথে সাথেই সকল ইউজারের প্যাকেজ আপগ্রেড পেজে নতুন দাম আপডেট হয়ে যাবে।'
                  : 'Adjust monthly and yearly plan pricing here. Changes sync immediately to all user accounts.'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setProMonthly(DEFAULT_PRICING.proMonthly);
                setProYearly(DEFAULT_PRICING.proYearly);
                setBusinessMonthly(DEFAULT_PRICING.businessMonthly);
                setBusinessYearly(DEFAULT_PRICING.businessYearly);
                setDiscountNote('');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl cursor-pointer self-start"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{locale === 'bn' ? 'ডিফল্ট মূল্য' : 'Reset Defaults'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="glass-3d-tile rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-base font-bold text-slate-900">
                  {locale === 'bn' ? 'টেলিকম প্রো (Telecom Pro)' : 'Telecom Pro'}
                </h4>
                <span className="text-xs font-bold text-[#B91C1C] font-mono-num">
                  {formatTaka(proMonthly)}/মাস · {formatTaka(proYearly)}/বছর
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {locale === 'bn' ? 'মাসিক মূল্য (টাকা)' : 'Monthly Price (BDT)'}
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setProMonthly((v) => Math.max(0, v - 50))}
                      className="px-3 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                      <span>50</span>
                    </button>
                    <input
                      type="number"
                      min={0}
                      max={1000000}
                      value={proMonthly}
                      onChange={(e) => setProMonthly(Math.max(0, Number(e.target.value) || 0))}
                      className="flex-1 px-3 py-2 text-sm font-bold font-mono-num text-center bg-white border border-slate-300 rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={() => setProMonthly((v) => v + 50)}
                      className="px-3 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>50</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {locale === 'bn' ? 'বার্ষিক মূল্য (টাকা)' : 'Yearly Price (BDT)'}
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setProYearly((v) => Math.max(0, v - 100))}
                      className="px-3 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                      <span>100</span>
                    </button>
                    <input
                      type="number"
                      min={0}
                      max={10000000}
                      value={proYearly}
                      onChange={(e) => setProYearly(Math.max(0, Number(e.target.value) || 0))}
                      className="flex-1 px-3 py-2 text-sm font-bold font-mono-num text-center bg-white border border-slate-300 rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={() => setProYearly((v) => v + 100)}
                      className="px-3 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>100</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-3d-tile rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-base font-bold text-slate-900">
                  {locale === 'bn' ? 'বিজনেস প্লাস (Business Plus)' : 'Business Plus'}
                </h4>
                <span className="text-xs font-bold text-[#B91C1C] font-mono-num">
                  {formatTaka(businessMonthly)}/মাস · {formatTaka(businessYearly)}/বছর
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {locale === 'bn' ? 'মাসিক মূল্য (টাকা)' : 'Monthly Price (BDT)'}
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setBusinessMonthly((v) => Math.max(0, v - 50))}
                      className="px-3 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                      <span>50</span>
                    </button>
                    <input
                      type="number"
                      min={0}
                      max={1000000}
                      value={businessMonthly}
                      onChange={(e) => setBusinessMonthly(Math.max(0, Number(e.target.value) || 0))}
                      className="flex-1 px-3 py-2 text-sm font-bold font-mono-num text-center bg-white border border-slate-300 rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={() => setBusinessMonthly((v) => v + 50)}
                      className="px-3 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>50</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {locale === 'bn' ? 'বার্ষিক মূল্য (টাকা)' : 'Yearly Price (BDT)'}
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setBusinessYearly((v) => Math.max(0, v - 100))}
                      className="px-3 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                      <span>100</span>
                    </button>
                    <input
                      type="number"
                      min={0}
                      max={10000000}
                      value={businessYearly}
                      onChange={(e) => setBusinessYearly(Math.max(0, Number(e.target.value) || 0))}
                      className="flex-1 px-3 py-2 text-sm font-bold font-mono-num text-center bg-white border border-slate-300 rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={() => setBusinessYearly((v) => v + 100)}
                      className="px-3 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>100</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">
                {locale === 'bn'
                  ? 'বিশেষ অফার / ডিসকাউন্ট নোট (ঐচ্ছিক — ইউজার প্যাকেজ পেজে দেখাবে)'
                  : 'Optional Promo / Offer Banner Note'}
              </label>
              <span className="text-[11px] text-slate-400 font-mono-num">
                {discountNote.length}/120
              </span>
            </div>
            <input
              type="text"
              maxLength={120}
              value={discountNote}
              onChange={(e) => setDiscountNote(e.target.value)}
              placeholder={
                locale === 'bn'
                  ? 'যেমন: সীমিত সময়ের জন্য টেলিকম প্রো প্যাকেজে বিশেষ ছাড় চলছে!'
                  : 'e.g. Limited time offer on Telecom Pro!'
              }
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingPricing}
              className="btn-3d inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-[#B91C1C] hover:bg-[#991B1B] rounded-xl cursor-pointer disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              <span>
                {savingPricing
                  ? locale === 'bn'
                    ? 'সেভ হচ্ছে...'
                    : 'Saving...'
                  : locale === 'bn'
                  ? 'নতুন প্যাকেজ মূল্য লাইভ করুন'
                  : 'Save & Publish Pricing'}
              </span>
            </button>
          </div>
        </form>
        </div>
      )}

      {section === 'catalog' && (
        <AdminCatalogSection
          locale={locale}
          catalogItems={catalogItems}
          onSaveCatalogItem={onSaveCatalogItem}
          onDeleteCatalogItem={onDeleteCatalogItem}
        />
      )}

      {section === 'app_update' && (
        <AdminAppUpdateSection
          locale={locale}
          isSuperAdmin={isSuperAdmin}
          config={appUpdateConfig}
          onSaveAppUpdate={onSaveAppUpdate}
        />
      )}

      {section === 'admins' && isSuperAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <form
            onSubmit={handleAddAdmin}
            className="lg:col-span-5 glass-3d-tile rounded-2xl p-5 space-y-4"
          >
            <div className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-[#B91C1C]" />
              <h3 className="text-sm font-bold text-slate-900">
                {locale === 'bn' ? 'নতুন সাব-এডমিন যোগ করুন' : 'Add Sub-Admin'}
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {locale === 'bn'
                ? 'ইউজার ও দোকান তালিকা থেকে UID এবং ইমেইল কপি করে এখানে এডমিন অ্যাক্সেস দিতে পারবেন।'
                : 'Grant admin panel access to another verified user using their shop UID and email.'}
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  User UID *
                </label>
                <input
                  type="text"
                  required
                  maxLength={128}
                  value={newAdminUid}
                  onChange={(e) => setNewAdminUid(e.target.value)}
                  placeholder="Firebase UID"
                  className="w-full px-3 py-2 text-xs font-mono-num bg-white border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  maxLength={150}
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  placeholder="staff@gmail.com"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={busyId === 'add_admin'}
              className="btn-3d w-full py-2.5 px-4 bg-[#B91C1C] hover:bg-[#991B1B] text-white text-xs font-bold rounded-xl cursor-pointer disabled:opacity-60"
            >
              {locale === 'bn' ? 'এডমিন যুক্ত করুন' : 'Add Admin'}
            </button>
          </form>

          <div className="lg:col-span-7 glass-3d-tile rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900">
              {locale === 'bn' ? 'অনুমোদিত এডমিন তালিকা' : 'Authorized Admins'}
            </h3>
            <div className="space-y-2.5 text-xs">
              <div className="glass-3d-tile rounded-xl px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900">{SUPER_ADMIN_EMAIL}</p>
                  <p className="text-slate-500">
                    {locale === 'bn' ? 'প্রধান সুপার এডমিন (স্থায়ী)' : 'Primary Super Admin'}
                  </p>
                </div>
                <span className="font-bold text-emerald-700">Super Admin</span>
              </div>

              {subAdmins.map((adm) => (
                <div
                  key={adm.uid}
                  className="glass-3d-tile rounded-xl px-4 py-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 truncate">{adm.email}</p>
                    <p className="text-slate-500 font-mono-num truncate">UID: {adm.uid}</p>
                  </div>
                  {confirmRemoveAdminUid === adm.uid ? (
                    <button
                      type="button"
                      onClick={async () => {
                        setConfirmRemoveAdminUid(null);
                        setActionError(null);
                        try {
                          await onRemoveSubAdmin(adm.uid);
                        } catch (err) {
                          setActionError(
                            err instanceof Error
                              ? err.message
                              : locale === 'bn'
                              ? 'এডমিন সরাতে সমস্যা হয়েছে।'
                              : 'Failed to remove admin.'
                          );
                        }
                      }}
                      className="px-2.5 py-1 text-[11px] font-bold bg-rose-600 text-white rounded-lg cursor-pointer inline-flex items-center gap-1"
                    >
                      <Check className="w-3 h-3" />
                      <span>{locale === 'bn' ? 'নিশ্চিত?' : 'Confirm?'}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmRemoveAdminUid(adm.uid)}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg cursor-pointer"
                      title={locale === 'bn' ? 'সরান' : 'Remove'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {banModalShop && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-md flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setBanModalShop(null);
          }}
        >
          <form
            onSubmit={handleSaveBanStatus}
            className="w-full max-w-md glass-3d-tile rounded-2xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-bold text-slate-900">
                {locale === 'bn'
                  ? 'ইউজার অ্যাকাউন্ট ব্লক / ব্যান নিয়ন্ত্রণ'
                  : 'Manage User Account Status'}
              </h3>
              <button
                type="button"
                onClick={() => setBanModalShop(null)}
                className="p-1 text-slate-500 hover:text-slate-800 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-xl bg-slate-50/90 border border-slate-200 p-3 text-xs space-y-1">
              <p className="font-bold text-slate-900">{banModalShop.shopName}</p>
              <p className="font-mono-num text-slate-600 break-all">
                UID: {banModalShop.ownerUid}
              </p>
              <p className="text-slate-600">
                {banModalShop.phone || 'নম্বর নেই'}
                {banModalShop.ownerEmail ? ` · ${banModalShop.ownerEmail}` : ''}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  ['active', locale === 'bn' ? 'সক্রিয় / আনব্লক' : 'Active'],
                  ['blocked', locale === 'bn' ? 'সাময়িক ব্লক' : 'Block'],
                  ['banned', locale === 'bn' ? 'স্থায়ী ব্যান' : 'Ban'],
                ] as [AccountStatus, string][]
              ).map(([st, lbl]) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setDraftAccountStatus(st)}
                  className={`py-2 px-2.5 text-xs font-bold rounded-xl border cursor-pointer ${
                    draftAccountStatus === st
                      ? st === 'active'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : st === 'blocked'
                        ? 'bg-amber-500 text-white border-amber-500'
                        : 'bg-rose-600 text-white border-rose-600'
                      : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>

            {draftAccountStatus !== 'active' && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-700">
                  {locale === 'bn'
                    ? 'দ্রুত কারণ বাছাই করুন (ইউজারের পপঅপে দেখাবে):'
                    : 'Quick Reason Presets (shown in user popup):'}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {BAN_REASON_PRESETS_BN.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setDraftBanReason(preset)}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-red-50 hover:text-[#B91C1C] border border-slate-200 rounded-lg cursor-pointer text-left"
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="text-xs font-semibold text-slate-700">
                    {locale === 'bn' ? 'ব্লক / ব্যানের বিস্তারিত কারণ *' : 'Ban Reason *'}
                  </label>
                  <span className="text-[11px] text-slate-400 font-mono-num">
                    {draftBanReason.length}/300
                  </span>
                </div>
                <textarea
                  rows={3}
                  required
                  maxLength={300}
                  value={draftBanReason}
                  onChange={(e) => setDraftBanReason(e.target.value)}
                  placeholder={
                    locale === 'bn'
                      ? 'কি কারণে ব্লক বা ব্যান করা হচ্ছে লিখুন — ইউজার একাউন্টে পপঅপে এটি দেখবে...'
                      : 'Enter reason shown to the user...'
                  }
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl resize-none"
                />
              </div>
            )}

            {modalError && (
              <p className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700">
                {modalError}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setBanModalShop(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl cursor-pointer"
              >
                {locale === 'bn' ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={busyId === `ban_${banModalShop.ownerUid}`}
                className={`btn-3d px-5 py-2 text-xs font-bold text-white rounded-xl cursor-pointer disabled:opacity-60 ${
                  draftAccountStatus === 'active'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-[#B91C1C] hover:bg-[#991B1B]'
                }`}
              >
                {busyId === `ban_${banModalShop.ownerUid}`
                  ? locale === 'bn'
                    ? 'সেভ হচ্ছে...'
                    : 'Saving...'
                  : draftAccountStatus === 'active'
                  ? locale === 'bn'
                    ? 'অ্যাকাউন্ট আনব্লক করুন'
                    : 'Restore Account'
                  : locale === 'bn'
                  ? 'কনফার্ম ও সেভ করুন'
                  : 'Apply Status'}
              </button>
            </div>
          </form>
        </div>
      )}

      {editingUpgrade && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingUpgrade(null);
          }}
        >
          <form
            onSubmit={handleSaveUpgrade}
            className="w-full max-w-md glass-3d-tile rounded-2xl p-6 space-y-4 my-auto"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-bold text-slate-900">
                {locale === 'bn'
                  ? 'প্যাকেজ অনুরোধ স্ট্যাটাস ও মেয়াদ'
                  : 'Update Package Upgrade Status'}
              </h3>
              <button
                type="button"
                onClick={() => setEditingUpgrade(null)}
                className="p-1 text-slate-500 hover:text-slate-800 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-xl bg-slate-50/90 border border-slate-200 p-3 text-xs space-y-0.5">
              <p className="font-bold text-slate-900">
                {shopLookup.get(editingUpgrade.ownerUid)?.shopName || editingUpgrade.ownerUid}
              </p>
              <p className="font-mono-num text-slate-600">
                {planName(editingUpgrade.planTier, editingUpgrade.catalogTitle)} ·{' '}
                {formatTaka(editingUpgrade.amount)} · TrxID: {editingUpgrade.trxId}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ['pending', locale === 'bn' ? 'পেন্ডিং' : 'Pending'],
                  ['processing', locale === 'bn' ? 'প্রসেসিং' : 'Processing'],
                  ['active', locale === 'bn' ? 'সফল / অ্যাক্টিভ' : 'Active'],
                  ['rejected', locale === 'bn' ? 'বাতিল / রিজেক্ট' : 'Rejected'],
                ] as [UpgradeRequestStatus, string][]
              ).map(([st, lbl]) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => {
                    setDraftUpgradeStatus(st);
                    if (!draftUpgradeReason.trim()) {
                      setDraftUpgradeReason(UPGRADE_REASON_PRESETS_BN[st][0] ?? '');
                    }
                  }}
                  className={`py-2 px-3 text-xs font-bold rounded-xl border cursor-pointer ${
                    draftUpgradeStatus === st
                      ? st === 'active'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : st === 'processing'
                        ? 'bg-sky-600 text-white border-sky-600'
                        : st === 'rejected'
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-amber-500 text-white border-amber-500'
                      : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>

            {draftUpgradeStatus === 'active' && (
              <div className="rounded-xl bg-slate-900 text-white p-3.5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-amber-300 inline-flex items-center gap-1.5">
                    <CalendarClock className="w-3.5 h-3.5" />
                    <span>
                      {locale === 'bn'
                        ? 'মেয়াদ শুরু ও শেষ টাইম নির্ধারণ'
                        : 'Set Start & Expiry Time'}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const nowMs = Date.now();
                      const days = editingUpgrade.billingCycle === 'yearly' ? 365 : 30;
                      setDraftUpgradeStartLocal(toDatetimeLocalValue(nowMs));
                      setDraftUpgradeEndLocal(
                        toDatetimeLocalValue(nowMs + days * 86400_000)
                      );
                    }}
                    className="text-[11px] font-bold text-emerald-300 hover:underline cursor-pointer"
                  >
                    {locale === 'bn' ? 'এখন থেকে সেট' : 'Reset to Now'}
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {[
                    [7, '৭ দিন'],
                    [15, '১৫ দিন'],
                    [30, '৩০ দিন'],
                    [90, '৯০ দিন'],
                    [365, '১ বছর'],
                  ].map(([days, label]) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => {
                        const base =
                          fromDatetimeLocalValue(draftUpgradeStartLocal) ?? Date.now();
                        setDraftUpgradeStartLocal(toDatetimeLocalValue(base));
                        setDraftUpgradeEndLocal(
                          toDatetimeLocalValue(base + Number(days) * 86400_000)
                        );
                      }}
                      className="px-2 py-1 text-[11px] font-bold rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                    >
                      +{label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-2.5 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      {locale === 'bn' ? 'মেয়াদ শুরু টাইম' : 'Start Date & Time'}
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={draftUpgradeStartLocal}
                      onChange={(e) => setDraftUpgradeStartLocal(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs font-mono-num bg-white text-slate-900 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      {locale === 'bn' ? 'মেয়াদ শেষ এর টাইম' : 'Expiry Date & Time'}
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={draftUpgradeEndLocal}
                      onChange={(e) => setDraftUpgradeEndLocal(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs font-mono-num bg-white text-slate-900 rounded-lg"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex flex-wrap gap-1.5">
                {UPGRADE_REASON_PRESETS_BN[draftUpgradeStatus].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setDraftUpgradeReason(preset)}
                    className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-red-50 hover:text-[#B91C1C] border border-slate-200 rounded-lg cursor-pointer text-left"
                  >
                    {preset}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="text-xs font-semibold text-slate-700">
                  {locale === 'bn' ? 'কারণ / নোট (ইউজার দেখবে)' : 'Status Reason'}
                </label>
                <span className="text-[11px] text-slate-400 font-mono-num">
                  {draftUpgradeReason.length}/300
                </span>
              </div>
              <textarea
                rows={3}
                maxLength={300}
                value={draftUpgradeReason}
                onChange={(e) => setDraftUpgradeReason(e.target.value)}
                placeholder={
                  locale === 'bn'
                    ? 'যেমন: TrxID যাচাই চলছে বা বাতিলের কারণ...'
                    : 'Enter reason or note visible to the user...'
                }
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl resize-none"
              />
            </div>

            {modalError && (
              <p className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700">
                {modalError}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setEditingUpgrade(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl cursor-pointer"
              >
                {locale === 'bn' ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={busyId === editingUpgrade.id}
                className="btn-3d px-5 py-2 text-xs font-bold text-white bg-[#B91C1C] hover:bg-[#991B1B] rounded-xl cursor-pointer disabled:opacity-60"
              >
                {busyId === editingUpgrade.id
                  ? locale === 'bn'
                    ? 'সেভ হচ্ছে...'
                    : 'Saving...'
                  : locale === 'bn'
                  ? 'স্ট্যাটাস আপডেট করুন'
                  : 'Save Status'}
              </button>
            </div>
          </form>
        </div>
      )}

      {planModalShop && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPlanModalShop(null);
          }}
        >
          <form
            onSubmit={handleSavePlanSchedule}
            className="w-full max-w-md glass-3d-tile rounded-2xl p-6 space-y-4 my-auto"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CalendarClock className="w-5 h-5 text-[#B91C1C]" />
                <h3 className="text-base font-bold text-slate-900">
                  {locale === 'bn'
                    ? 'প্যাকেজ ও মেয়াদ টাইমার সেট'
                    : 'Set Package & Countdown Timer'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPlanModalShop(null)}
                className="p-1 text-slate-500 hover:text-slate-800 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-xl bg-slate-50/90 border border-slate-200 p-3 text-xs space-y-0.5">
              <p className="font-bold text-slate-900">{planModalShop.shopName}</p>
              <p className="font-mono-num text-slate-600 break-all">
                UID: {planModalShop.ownerUid}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  ['free', locale === 'bn' ? 'ফ্রি খাতা' : 'Free'],
                  ['pro', locale === 'bn' ? 'টেলিকম প্রো' : 'Telecom Pro'],
                  ['business', locale === 'bn' ? 'বিজনেস প্লাস' : 'Business Plus'],
                ] as [PlanTier, string][]
              ).map(([tierId, label]) => (
                <button
                  key={tierId}
                  type="button"
                  onClick={() => setDraftPlanTier(tierId)}
                  className={`py-2 px-2 text-xs font-bold rounded-xl border cursor-pointer ${
                    draftPlanTier === tierId
                      ? 'bg-[#B91C1C] text-white border-[#B91C1C]'
                      : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {draftPlanTier !== 'free' && (
              <div className="space-y-3 rounded-2xl bg-slate-900 text-white p-4">
                <div className="grid grid-cols-2 gap-2 p-1 bg-white/10 rounded-xl">
                  <button
                    type="button"
                    onClick={() => applyPlanPresetDays(30, 'monthly')}
                    className={`py-1.5 text-xs font-bold rounded-lg cursor-pointer ${
                      draftPlanCycle === 'monthly'
                        ? 'bg-white text-slate-900'
                        : 'text-slate-200'
                    }`}
                  >
                    {locale === 'bn' ? 'মাসিক (৩০ দিন)' : 'Monthly (30d)'}
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPlanPresetDays(365, 'yearly')}
                    className={`py-1.5 text-xs font-bold rounded-lg cursor-pointer ${
                      draftPlanCycle === 'yearly'
                        ? 'bg-white text-slate-900'
                        : 'text-slate-200'
                    }`}
                  >
                    {locale === 'bn' ? 'বার্ষিক (৩৬৫ দিন)' : 'Yearly (365d)'}
                  </button>
                </div>

                <div>
                  <p className="text-[11px] font-semibold text-slate-300 mb-1.5">
                    {locale === 'bn' ? 'দ্রুত মেয়াদ প্রিসেট:' : 'Quick Duration Presets:'}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      [7, '৭ দিন ট্রায়াল'],
                      [15, '১৫ দিন'],
                      [30, '৩০ দিন'],
                      [90, '৯০ দিন'],
                      [365, '১ বছর'],
                    ].map(([days, label]) => (
                      <button
                        key={days}
                        type="button"
                        onClick={() => applyPlanPresetDays(Number(days))}
                        className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-white/12 hover:bg-white/22 text-amber-200 cursor-pointer"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-semibold text-slate-200">
                        {locale === 'bn' ? 'মেয়াদ শুরু টাইম *' : 'Package Start Time *'}
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setDraftPlanStartLocal(toDatetimeLocalValue(Date.now()))
                        }
                        className="text-[11px] font-bold text-emerald-300 hover:underline cursor-pointer"
                      >
                        {locale === 'bn' ? 'এখনকার সময়' : 'Set Now'}
                      </button>
                    </div>
                    <input
                      type="datetime-local"
                      required
                      value={draftPlanStartLocal}
                      onChange={(e) => setDraftPlanStartLocal(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono-num bg-white text-slate-900 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-200 mb-1">
                      {locale === 'bn' ? 'মেয়াদ শেষ এর টাইম *' : 'Package Expiry Time *'}
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={draftPlanEndLocal}
                      onChange={(e) => setDraftPlanEndLocal(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono-num bg-white text-slate-900 rounded-xl"
                    />
                  </div>
                </div>
              </div>
            )}

            {modalError && (
              <p className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700">
                {modalError}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPlanModalShop(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl cursor-pointer"
              >
                {locale === 'bn' ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={busyId === `plan_${planModalShop.ownerUid}`}
                className="btn-3d px-5 py-2 text-xs font-bold text-white bg-[#B91C1C] hover:bg-[#991B1B] rounded-xl cursor-pointer disabled:opacity-60"
              >
                {busyId === `plan_${planModalShop.ownerUid}`
                  ? locale === 'bn'
                    ? 'সেভ হচ্ছে...'
                    : 'Saving...'
                  : locale === 'bn'
                  ? 'প্যাকেজ ও মেয়াদ সেভ করুন'
                  : 'Save Plan Schedule'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
