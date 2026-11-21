import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  BellRing,
  BookOpen,
  Building2,
  Calculator,
  CalendarClock,
  Camera,
  Check,
  ChevronRight,
  CloudUpload,
  Coins,
  ContactRound,
  Download,
  Gift,
  ImagePlus,
  MessageCircleMore,
  MessageSquare,
  MessageSquareShare,
  Package,
  Pencil,
  Phone,
  Plus,
  Printer,
  QrCode,
  Search,
  Share2,
  SlidersHorizontal,
  Trash2,
  User,
  UserPlus,
  Wallet,
  X,
} from 'lucide-react';
import {
  Contact,
  ContactType,
  InstallmentPlan,
  KhataEntry,
  KhataEntryType,
  Locale,
  PaymentGatewaysConfig,
  Product,
} from '../types/shop';
import { tr } from '../lib/i18n';
import { compressImageToDataUrl, formatTaka } from '../lib/shopService';
import { formatKhataSlipForThermalPrinter } from '../lib/thermalPrinter';
import { ThermalPrintModal } from './ThermalPrintModal';
import { BalanceCardModal } from './BalanceCardModal';
import { InstallmentsModal } from './InstallmentsModal';

export type QuickNavTarget =
  | 'tally'
  | 'cashbook'
  | 'telecom'
  | 'stock'
  | 'packages'
  | 'complaints'
  | 'reports';

interface TallyKhataTabProps {
  locale: Locale;
  shopName: string;
  shopPhone: string;
  shopAddress?: string;
  contacts: Contact[];
  entries: KhataEntry[];
  products?: Product[];
  installments?: InstallmentPlan[];
  gateways?: PaymentGatewaysConfig;
  activeBranchName?: string;
  canDelete?: boolean;
  cashBalance: number;
  countdownHeaderSlot?: React.ReactNode;
  onNavigateTab?: (tab: QuickNavTarget, option?: string) => void;
  onOpenCalculator?: () => void;
  onOpenBranchSwitcher?: () => void;
  onCreateInstallmentPlan?: (input: {
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
  onCollectInstallment?: (
    plan: InstallmentPlan,
    input: { amount: number; note?: string; alsoRecordCash: boolean }
  ) => Promise<void>;
  onDeleteInstallmentPlan?: (planId: string) => Promise<void>;
  onCreateContact: (input: {
    name: string;
    phone: string;
    contactType: ContactType;
    address: string;
    dueDate?: string;
    photoUrl?: string;
    smsAlertEnabled?: boolean;
    openingType?: KhataEntryType;
    openingAmount?: number;
    openingNote?: string;
  }) => Promise<string>;
  onUpdateContact: (
    contactId: string,
    input: {
      name: string;
      phone: string;
      contactType: ContactType;
      address: string;
      dueDate?: string;
      photoUrl?: string;
      smsAlertEnabled?: boolean;
    }
  ) => Promise<void>;
  onDeleteContact: (contact: Contact, entryIds: string[]) => Promise<void>;
  onAddEntry: (
    contact: Contact,
    input: {
      entryType: KhataEntryType;
      amount: number;
      note: string;
      alsoRecordCash: boolean;
    }
  ) => Promise<void>;
  onDeleteEntry: (contact: Contact, entry: KhataEntry) => Promise<void>;
}

type ContactFilter = 'all' | 'pabo' | 'debo' | 'overdue' | 'customer' | 'supplier';

function getTodayIsoLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

function isContactOverdue(c: Contact): boolean {
  if (c.balance <= 0 || !c.dueDate) return false;
  return c.dueDate <= getTodayIsoLocal();
}

const AVATAR_TONES = [
  'bg-emerald-100 text-emerald-800 border-emerald-200/80',
  'bg-sky-100 text-sky-800 border-sky-200/80',
  'bg-amber-100 text-amber-800 border-amber-200/80',
  'bg-rose-100 text-rose-800 border-rose-200/80',
  'bg-violet-100 text-violet-800 border-violet-200/80',
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'ক';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

function getRelativeDayLabel(contact: Contact, locale: Locale): string {
  const ts = contact.lastEntryAt ?? contact.createdAt;
  if (!ts) return locale === 'bn' ? 'আজ' : 'Today';
  try {
    const diffDays = Math.floor((Date.now() - ts.toMillis()) / 86400_000);
    if (diffDays <= 0) return locale === 'bn' ? 'আজ' : 'Today';
    if (diffDays === 1) return locale === 'bn' ? 'গতকাল' : 'Yesterday';
    if (locale === 'bn') {
      const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
      const bnNum = String(diffDays).replace(/\d/g, (d) => bnDigits[Number(d)] ?? d);
      return `${bnNum} দিন`;
    }
    return `${diffDays}d`;
  } catch {
    return locale === 'bn' ? 'আজ' : 'Today';
  }
}

export const TallyKhataTab: React.FC<TallyKhataTabProps> = ({
  locale,
  shopName,
  shopPhone,
  shopAddress = '',
  contacts,
  entries,
  products = [],
  installments = [],
  gateways,
  activeBranchName,
  canDelete = true,
  cashBalance,
  countdownHeaderSlot,
  onNavigateTab,
  onOpenCalculator,
  onOpenBranchSwitcher,
  onCreateInstallmentPlan,
  onCollectInstallment,
  onDeleteInstallmentPlan,
  onCreateContact,
  onUpdateContact,
  onDeleteContact,
  onAddEntry,
  onDeleteEntry,
}) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<ContactFilter>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [showContactModal, setShowContactModal] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [cName, setCName] = useState('');
  const [cPhone, setCPhone] = useState('');
  const [cType, setCType] = useState<ContactType>('customer');
  const [cAddress, setCAddress] = useState('');
  const [cDueDate, setCDueDate] = useState('');
  const [cPhotoUrl, setCPhotoUrl] = useState('');
  const [cSmsAlert, setCSmsAlert] = useState(true);
  const [openingType, setOpeningType] = useState<KhataEntryType>('dilam');
  const [openingAmount, setOpeningAmount] = useState('');
  const [savingContact, setSavingContact] = useState(false);
  const [deletingContact, setDeletingContact] = useState(false);
  const [confirmDeleteContactTarget, setConfirmDeleteContactTarget] =
    useState<Contact | null>(null);
  const contactPhotoInputRef = useRef<HTMLInputElement | null>(null);

  const [entryModalType, setEntryModalType] = useState<KhataEntryType | null>(null);
  const [entryAmount, setEntryAmount] = useState('');
  const [entryNote, setEntryNote] = useState('');
  const [alsoCash, setAlsoCash] = useState(true);
  const [savingEntry, setSavingEntry] = useState(false);

  const [showGroupTagada, setShowGroupTagada] = useState(false);
  const [showInstallments, setShowInstallments] = useState(false);
  const [showBalanceCard, setShowBalanceCard] = useState(false);
  const [thermalPrintData, setThermalPrintData] = useState<{
    header: string;
    body58: string;
    body80: string;
  } | null>(null);
  const [confirmDeleteEntryId, setConfirmDeleteEntryId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        setShowContactModal(false);
        setEntryModalType(null);
        setShowGroupTagada(false);
        setShowInstallments(false);
        setShowBalanceCard(false);
        setThermalPrintData(null);
        setConfirmDeleteEntryId(null);
        setConfirmDeleteContactTarget(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const totalPabo = useMemo(
    () => contacts.filter((c) => c.balance > 0).reduce((s, c) => s + c.balance, 0),
    [contacts]
  );

  const totalDebo = useMemo(
    () =>
      contacts
        .filter((c) => c.balance < 0)
        .reduce((s, c) => s + Math.abs(c.balance), 0),
    [contacts]
  );

  const customerCount = useMemo(
    () => contacts.filter((c) => c.contactType === 'customer').length,
    [contacts]
  );
  const supplierCount = useMemo(
    () => contacts.filter((c) => c.contactType === 'supplier').length,
    [contacts]
  );

  const dueContacts = useMemo(
    () => contacts.filter((c) => c.balance > 0).sort((a, b) => b.balance - a.balance),
    [contacts]
  );

  const overdueCount = useMemo(
    () => contacts.filter((c) => isContactOverdue(c)).length,
    [contacts]
  );

  const alertStripCounts = useMemo(() => {
    const lowStock = products.filter((p) => p.quantity <= p.lowStockThreshold).length;
    const today = new Date();
    const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const expiring = products.filter((p) => {
      if (!p.expiryDate || !/^\d{4}-\d{2}-\d{2}$/.test(p.expiryDate)) return false;
      const [y, m, d] = p.expiryDate.split('-').map(Number);
      const diff = Math.round((new Date(y, m - 1, d).getTime() - todayMid) / 86400_000);
      return diff <= 30;
    }).length;
    const todayIso = getTodayIsoLocal();
    const activeKisti = installments.filter((i) => i.status === 'active');
    const dueKisti = activeKisti.filter((i) => i.nextDueDate <= todayIso).length;
    return { lowStock, expiring, activeKistiCount: activeKisti.length, dueKisti };
  }, [products, installments]);

  const filteredContacts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return contacts.filter((c) => {
      if (filter === 'pabo' && c.balance <= 0) return false;
      if (filter === 'debo' && c.balance >= 0) return false;
      if (filter === 'overdue' && !isContactOverdue(c)) return false;
      if (filter === 'customer' && c.contactType !== 'customer') return false;
      if (filter === 'supplier' && c.contactType !== 'supplier') return false;
      if (q && !c.name.toLowerCase().includes(q) && !c.phone.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [contacts, filter, search]);

  const selectedContact = useMemo(
    () => contacts.find((c) => c.id === selectedId) ?? null,
    [contacts, selectedId]
  );

  const selectedEntries = useMemo(
    () =>
      selectedContact
        ? entries.filter((e) => e.contactId === selectedContact.id)
        : [],
    [entries, selectedContact]
  );

  const exportQuickCsv = () => {
    const rows: string[][] = [
      [shopName, 'TallyKhata Backup'],
      ['Total Receivable (Pabo)', totalPabo.toFixed(2)],
      ['Total Payable (Debo)', totalDebo.toFixed(2)],
      ['Cash Balance', cashBalance.toFixed(2)],
      [],
      ['Name', 'Type', 'Mobile', 'Balance (BDT)', 'Status', 'Last Note'],
      ...contacts.map((c) => [
        c.name,
        c.contactType,
        c.phone,
        Math.abs(c.balance).toFixed(2),
        c.balance > 0 ? 'Pabo' : c.balance < 0 ? 'Debo' : 'Settled',
        c.lastNote ?? '',
      ]),
    ];
    const csv =
      '\uFEFF' +
      rows
        .map((r) =>
          r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
        )
        .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const d = new Date();
    const localDay = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      '0'
    )}-${String(d.getDate()).padStart(2, '0')}`;
    a.download = `khata_backup_${localDay}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openAddContact = () => {
    setEntryModalType(null);
    setShowGroupTagada(false);
    setConfirmDeleteContactTarget(null);
    setFormError(null);
    setEditingContact(null);
    setCName('');
    setCPhone('');
    setCType('customer');
    setCAddress('');
    setCDueDate('');
    setCPhotoUrl('');
    setCSmsAlert(true);
    setOpeningType('dilam');
    setOpeningAmount('');
    setShowContactModal(true);
  };

  const openEditContact = (c: Contact) => {
    setEntryModalType(null);
    setShowGroupTagada(false);
    setConfirmDeleteContactTarget(null);
    setFormError(null);
    setEditingContact(c);
    setCName(c.name);
    setCPhone(c.phone);
    setCType(c.contactType);
    setCAddress(c.address);
    setCDueDate(c.dueDate ?? '');
    setCPhotoUrl(c.photoUrl ?? '');
    setCSmsAlert(c.smsAlertEnabled ?? true);
    setOpeningAmount('');
    setShowContactModal(true);
  };

  const handleContactPhotoPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setFormError(null);
    try {
      const dataUrl = await compressImageToDataUrl(file, 144, 0.72);
      setCPhotoUrl(dataUrl);
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : locale === 'bn'
          ? 'ছবি সংযুক্ত করতে সমস্যা হয়েছে।'
          : 'Failed to process photo.'
      );
    }
  };

  const handlePickFromPhonebook = async () => {
    setFormError(null);
    type ContactPickerResult = { name?: string[]; tel?: string[] };
    const nav = navigator as unknown as {
      contacts?: {
        select?: (
          props: string[],
          options?: { multiple?: boolean }
        ) => Promise<ContactPickerResult[]>;
      };
    };

    if (!nav.contacts || typeof nav.contacts.select !== 'function') {
      setFormError(
        locale === 'bn'
          ? 'এই ব্রাউজারে সরাসরি ফোনবুক পিকার সাপোর্ট করে না — নিচে নাম ও মোবাইল নম্বর ম্যানুয়ালি লিখুন।'
          : 'Phonebook picker is not supported in this browser — please type name and number below.'
      );
      return;
    }

    try {
      const picked = await nav.contacts.select(['name', 'tel'], { multiple: false });
      const first = picked?.[0];
      if (!first) return;
      if (first.name?.[0]) setCName(first.name[0]);
      if (first.tel?.[0]) setCPhone(first.tel[0]);
    } catch {
      // User dismissed picker or blocked
    }
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cName.trim()) return;
    setFormError(null);
    setSavingContact(true);
    try {
      if (editingContact) {
        await onUpdateContact(editingContact.id, {
          name: cName.trim(),
          phone: cPhone.trim(),
          contactType: cType,
          address: cAddress.trim(),
          dueDate: cDueDate.trim(),
          photoUrl: cPhotoUrl,
          smsAlertEnabled: cSmsAlert,
        });
      } else {
        const newId = await onCreateContact({
          name: cName.trim(),
          phone: cPhone.trim(),
          contactType: cType,
          address: cAddress.trim(),
          dueDate: cDueDate.trim(),
          photoUrl: cPhotoUrl,
          smsAlertEnabled: cSmsAlert,
          openingType,
          openingAmount: Number(openingAmount) || 0,
        });
        setSelectedId(newId);
      }
      setShowContactModal(false);
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : locale === 'bn'
          ? 'সেভ করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।'
          : 'Failed to save contact.'
      );
    } finally {
      setSavingContact(false);
    }
  };

  const handleConfirmDeleteContact = async () => {
    if (!confirmDeleteContactTarget) return;
    setDeletingContact(true);
    setFormError(null);
    try {
      const target = confirmDeleteContactTarget;
      const relatedIds = entries
        .filter((e) => e.contactId === target.id)
        .map((e) => e.id);
      await onDeleteContact(target, relatedIds);
      if (selectedId === target.id) {
        setSelectedId(null);
      }
      setConfirmDeleteContactTarget(null);
      setShowContactModal(false);
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : locale === 'bn'
          ? 'কাস্টমার ডিলিট করতে সমস্যা হয়েছে।'
          : 'Failed to delete party.'
      );
    } finally {
      setDeletingContact(false);
    }
  };

  const openEntryModal = (type: KhataEntryType) => {
    setShowContactModal(false);
    setShowGroupTagada(false);
    setFormError(null);
    setEntryModalType(type);
    setEntryAmount('');
    setEntryNote('');
    setAlsoCash(type === 'pelam');
  };

  const handleEntrySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContact || !entryModalType) return;
    const amt = Number(entryAmount) || 0;
    if (amt <= 0) return;

    setFormError(null);
    setSavingEntry(true);
    try {
      await onAddEntry(selectedContact, {
        entryType: entryModalType,
        amount: amt,
        note: entryNote.trim(),
        alsoRecordCash: alsoCash,
      });
      setEntryModalType(null);
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : locale === 'bn'
          ? 'লেনদেন সংরক্ষণে ত্রুটি হয়েছে।'
          : 'Failed to save transaction.'
      );
    } finally {
      setSavingEntry(false);
    }
  };

  const buildTagadaMessage = (contact: Contact) => {
    return locale === 'bn'
      ? `আসসালামু আলাইকুম ${contact.name},\n${shopName}-এ আপনার মোট বাকি হিসাব ${formatTaka(
          contact.balance
        )}। অনুগ্রহ করে সুবিধামতো বাকি পরিশোধ করবেন।\nধন্যবাদ।${
          shopPhone ? `\nযোগাযোগ: ${shopPhone}` : ''
        }`
      : `Hello ${contact.name}, your due balance at ${shopName} is ${formatTaka(
          contact.balance
        )}. Please settle at your convenience. Thank you.${
          shopPhone ? ` Contact: ${shopPhone}` : ''
        }`;
  };

  const buildWhatsAppTagadaUrl = (contact: Contact) => {
    const msg = buildTagadaMessage(contact);
    const digits = contact.phone.replace(/\D/g, '');
    const waPhone =
      digits.length >= 10
        ? digits.startsWith('88')
          ? digits
          : `88${digits}`
        : '';
    return `https://wa.me/${waPhone}?text=${encodeURIComponent(msg)}`;
  };

  const buildSmsTagadaUrl = (contact: Contact) => {
    const msg = buildTagadaMessage(contact);
    const digits = contact.phone.replace(/[^\d+]/g, '');
    return `sms:${digits}?body=${encodeURIComponent(msg)}`;
  };

  const formatEntryTime = (e: KhataEntry) => {
    if (!e.createdAt) return locale === 'bn' ? 'এইমাত্র' : 'Just now';
    return e.createdAt.toDate().toLocaleString(locale === 'bn' ? 'bn-BD' : 'en-GB', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const quickNotes =
    entryModalType === 'dilam'
      ? locale === 'bn'
        ? ['বাকি রিচার্জ', 'বাকি পণ্য', 'নগদ দিলাম', 'সাপ্লায়ার পেমেন্ট']
        : ['Due Recharge', 'Credit Goods', 'Cash Given', 'Supplier Payment']
      : locale === 'bn'
      ? ['নগদ জমা', 'বিকাশ / নগদ পেমেন্ট', 'বাকি আদায়', 'সাপ্লায়ার থেকে ক্রয়']
      : ['Cash Received', 'bKash / Nagad', 'Due Recovery', 'Purchase on Credit'];

  const quickTools = [
    {
      id: 'multi',
      label: locale === 'bn' ? 'মাল্টি ব্যবসা' : 'Branches',
      icon: BookOpen,
      tone: 'text-emerald-600 bg-emerald-50 border-emerald-200/80',
      onClick: () =>
        onOpenBranchSwitcher
          ? onOpenBranchSwitcher()
          : onNavigateTab?.('reports', 'profile'),
    },
    {
      id: 'stock',
      label: locale === 'bn' ? 'স্টক হিসাব' : 'Stock POS',
      icon: Package,
      tone: 'text-rose-600 bg-rose-50 border-rose-200/80',
      onClick: () => onNavigateTab?.('stock'),
    },
    {
      id: 'notes',
      label: locale === 'bn' ? 'ক্যাশবই ও নোট' : 'Cash & Notes',
      icon: Wallet,
      tone: 'text-amber-700 bg-amber-50 border-amber-200/80',
      onClick: () => onNavigateTab?.('cashbook'),
    },
    {
      id: 'tagada',
      label: locale === 'bn' ? 'গ্রুপ তাগাদা' : 'Due Alerts',
      icon: BellRing,
      tone: 'text-emerald-600 bg-emerald-50 border-emerald-200/80',
      onClick: () => {
        setShowContactModal(false);
        setEntryModalType(null);
        setShowGroupTagada(true);
      },
    },
    {
      id: 'qr',
      label: locale === 'bn' ? 'QR কোড' : 'QR Code',
      icon: QrCode,
      tone: 'text-rose-600 bg-rose-50 border-rose-200/80',
      onClick: () => onNavigateTab?.('packages', 'gateways'),
    },
    {
      id: 'backup',
      label: locale === 'bn' ? 'ডাটা ব্যাকআপ' : 'Backup CSV',
      icon: CloudUpload,
      tone: 'text-emerald-600 bg-emerald-50 border-emerald-200/80',
      onClick: exportQuickCsv,
    },
    {
      id: 'msg',
      label: locale === 'bn' ? 'অভিযোগ / হেল্প' : 'Support',
      icon: MessageCircleMore,
      tone: 'text-rose-600 bg-rose-50 border-rose-200/80',
      onClick: () => onNavigateTab?.('complaints'),
    },
    {
      id: 'calc',
      label: locale === 'bn' ? 'ক্যালকুলেটর' : 'Calculator',
      icon: Calculator,
      tone: 'text-sky-600 bg-sky-50 border-sky-200/80',
      onClick: () => onOpenCalculator?.(),
    },
  ];

  const netPosition = totalPabo - totalDebo;

  return (
    <div className="space-y-4 animate-3d-enter">
      {!selectedContact && (
        <div className="glass-card glass-sheen rounded-3xl p-4 sm:p-5 space-y-4 no-print">
          {countdownHeaderSlot}

          <div className="grid grid-cols-4 md:grid-cols-8 gap-2 sm:gap-3 pt-1">
            {quickTools.map((tool) => {
              const Icon = tool.icon;
              return (
                <button
                  key={tool.id}
                  type="button"
                  onClick={tool.onClick}
                  className="group card-3d-depth flex flex-col items-center text-center gap-1.5 py-2.5 px-1.5 rounded-2xl hover:bg-white/90 hover:shadow-xs transition-all cursor-pointer"
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

          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200/60">
            {onCreateInstallmentPlan && (
              <button
                type="button"
                onClick={() => setShowInstallments(true)}
                className="flex-1 min-w-[140px] flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-50 to-white border border-amber-200/90 hover:border-amber-300 text-xs font-bold text-slate-900 cursor-pointer"
              >
                <span className="inline-flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-amber-600" />
                  <span>{locale === 'bn' ? 'কিস্তি (EMI) খাতা' : 'Installments (EMI)'}</span>
                </span>
                <span className="font-mono-num px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[11px]">
                  {alertStripCounts.activeKistiCount}
                </span>
              </button>
            )}
            {onOpenBranchSwitcher && (
              <button
                type="button"
                onClick={onOpenBranchSwitcher}
                className="flex-1 min-w-[140px] flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-sky-50 to-white border border-sky-200/90 hover:border-sky-300 text-xs font-bold text-slate-900 cursor-pointer"
              >
                <span className="inline-flex items-center gap-1.5 min-w-0">
                  <Building2 className="w-4 h-4 text-sky-600 shrink-0" />
                  <span className="truncate">
                    {activeBranchName || (locale === 'bn' ? 'মূল দোকান' : 'Primary Shop')}
                  </span>
                </span>
                <span className="text-[10px] font-bold text-sky-700 shrink-0">
                  {locale === 'bn' ? 'বদলান' : 'Switch'}
                </span>
              </button>
            )}
          </div>
        </div>
      )}

      {!selectedContact &&
        (alertStripCounts.lowStock > 0 ||
          alertStripCounts.expiring > 0 ||
          alertStripCounts.dueKisti > 0 ||
          overdueCount > 0) && (
          <div className="glass-3d-tile rounded-2xl p-3 flex flex-wrap items-center gap-2 no-print border border-amber-200/80 bg-amber-50/70">
            <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-amber-900 mr-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              {locale === 'bn' ? 'আজকের সতর্কতা:' : 'Today Alerts:'}
            </span>
            {alertStripCounts.dueKisti > 0 && onCreateInstallmentPlan && (
              <button
                type="button"
                onClick={() => setShowInstallments(true)}
                className="px-2.5 py-1 rounded-lg bg-amber-600 text-white text-[11px] font-bold cursor-pointer"
              >
                {locale === 'bn'
                  ? `বাকি কিস্তি (${alertStripCounts.dueKisti})`
                  : `Due Kisti (${alertStripCounts.dueKisti})`}
              </button>
            )}
            {overdueCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setShowFilters(true);
                  setFilter('overdue');
                }}
                className="px-2.5 py-1 rounded-lg bg-rose-600 text-white text-[11px] font-bold cursor-pointer"
              >
                {locale === 'bn'
                  ? `বাকি তারিখ পার (${overdueCount})`
                  : `Overdue Dues (${overdueCount})`}
              </button>
            )}
            {(alertStripCounts.lowStock > 0 || alertStripCounts.expiring > 0) && (
              <button
                type="button"
                onClick={() => onNavigateTab?.('stock')}
                className="px-2.5 py-1 rounded-lg bg-white border border-amber-300 text-amber-900 text-[11px] font-bold cursor-pointer"
              >
                {locale === 'bn'
                  ? `কম স্টক (${alertStripCounts.lowStock}) · মেয়াদ শেষ/কাছাকাছি (${alertStripCounts.expiring})`
                  : `Low Stock (${alertStripCounts.lowStock}) · Expiring (${alertStripCounts.expiring})`}
              </button>
            )}
          </div>
        )}

      <div className="glass-card rounded-3xl p-3 sm:p-4 space-y-2.5 no-print">
        <div className="grid grid-cols-2 gap-3">
          <div className="card-3d-depth rounded-2xl bg-gradient-to-br from-rose-50/90 to-white border border-rose-200/70 px-4 py-3.5 text-center shadow-xs">
            <p className="text-xs font-bold text-rose-700/90 tracking-wide">
              {tr(locale, 'pabo')}
            </p>
            <p className="text-2xl sm:text-3xl font-bold text-[#DC2626] font-mono-num mt-1 text-3d-crimson">
              {formatTaka(totalPabo)}
            </p>
          </div>
          <div className="card-3d-depth rounded-2xl bg-gradient-to-br from-emerald-50/90 to-white border border-emerald-200/70 px-4 py-3.5 text-center shadow-xs">
            <p className="text-xs font-bold text-emerald-700/90 tracking-wide">
              {tr(locale, 'debo')}
            </p>
            <p className="text-2xl sm:text-3xl font-bold text-emerald-700 font-mono-num mt-1 text-3d-emerald">
              {formatTaka(totalDebo)}
            </p>
          </div>
        </div>

        <div className="glass-text-plate rounded-xl px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-slate-600">
            {locale === 'bn'
              ? `মোট খাতা (${contacts.length} জন) · নিট অবস্থা`
              : `Total Ledgers (${contacts.length}) · Net Position`}
          </span>
          <span
            className={`font-mono-num font-bold ${
              netPosition > 0
                ? 'text-[#DC2626]'
                : netPosition < 0
                ? 'text-emerald-700'
                : 'text-slate-700'
            }`}
          >
            {netPosition > 0
              ? `${locale === 'bn' ? 'নিট পাবো' : 'Net Receivable'}: ${formatTaka(netPosition)}`
              : netPosition < 0
              ? `${locale === 'bn' ? 'নিট দেবো' : 'Net Payable'}: ${formatTaka(
                  Math.abs(netPosition)
                )}`
              : locale === 'bn'
              ? 'সমান সমান (৳০)'
              : 'Balanced (৳0)'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div
          className={`lg:col-span-5 glass-card rounded-3xl overflow-hidden no-print ${
            selectedContact ? 'hidden lg:block' : 'block'
          }`}
        >
          <div className="p-4 border-b border-slate-200/80 space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={locale === 'bn' ? 'খোঁজ' : tr(locale, 'search_contact')}
                  className="w-full pl-9 pr-8 py-2.5 text-sm bg-slate-100/85 border border-slate-200/80 rounded-full focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#B91C1C]"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    aria-label="Clear search"
                    className="p-1 text-slate-400 hover:text-slate-700 absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowFilters((v) => !v)}
                title={locale === 'bn' ? 'ফিল্টার' : 'Filter'}
                className={`w-10 h-10 rounded-full border flex items-center justify-center cursor-pointer transition-colors shrink-0 ${
                  showFilters || filter !== 'all'
                    ? 'bg-[#B91C1C] text-white border-[#B91C1C]'
                    : 'bg-slate-100/90 text-slate-700 border-slate-200 hover:bg-white'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={exportQuickCsv}
                title={locale === 'bn' ? 'খাতা ব্যাকআপ (CSV)' : 'Export CSV Backup'}
                className="w-10 h-10 rounded-full bg-slate-100/90 border border-slate-200 hover:bg-white text-slate-700 flex items-center justify-center cursor-pointer shrink-0"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>

            {(showFilters || filter !== 'all') && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                {(
                  [
                    ['all', tr(locale, 'all')],
                    ['pabo', tr(locale, 'pabo_short')],
                    ['debo', tr(locale, 'debo_short')],
                    [
                      'overdue',
                      locale === 'bn'
                        ? `তারিখ পার (${overdueCount})`
                        : `Overdue (${overdueCount})`,
                    ],
                    ['customer', tr(locale, 'customer')],
                    ['supplier', tr(locale, 'supplier')],
                  ] as [ContactFilter, string][]
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFilter(key)}
                    className={`px-3 py-1 text-xs font-semibold rounded-full whitespace-nowrap transition-colors cursor-pointer ${
                      filter === key
                        ? 'bg-[#B91C1C] text-white shadow-sm'
                        : 'bg-white/80 border border-slate-200 text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between text-xs pt-0.5">
              <span className="font-bold text-slate-800">
                {locale === 'bn'
                  ? `কাস্টমার ${customerCount} / সাপ্লায়ার ${supplierCount}`
                  : `Customers ${customerCount} / Suppliers ${supplierCount}`}
              </span>
              <span className="font-semibold">
                <span className="text-[#DC2626]">{tr(locale, 'pabo_short')}</span>
                <span className="text-slate-400 mx-1">/</span>
                <span className="text-emerald-700">{tr(locale, 'debo_short')}</span>
              </span>
            </div>
          </div>

          <div className="p-3 space-y-2.5 max-h-[540px] overflow-y-auto pb-20 lg:pb-3">
            {filteredContacts.length === 0 ? (
              <div className="glass-3d-tile rounded-2xl p-8 text-center space-y-3">
                <p className="text-sm text-slate-500">{tr(locale, 'no_contacts')}</p>
                <button
                  type="button"
                  onClick={openAddContact}
                  className="btn-3d inline-flex items-center gap-1.5 px-4 py-2 bg-[#B91C1C] text-white text-xs font-bold rounded-full cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{tr(locale, 'add_contact')}</span>
                </button>
              </div>
            ) : (
              filteredContacts.map((c, idx) => {
                const isSelected = selectedContact?.id === c.id;
                const isPabo = c.balance > 0;
                const isDebo = c.balance < 0;
                const tone = AVATAR_TONES[idx % AVATAR_TONES.length];
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedId(c.id)}
                    className={`w-full text-left rounded-2xl px-3.5 py-3 flex items-center justify-between gap-3 cursor-pointer border transition-all min-h-[60px] ${
                      isSelected
                        ? 'bg-rose-50/85 border-[#B91C1C]/45 shadow-sm'
                        : 'bg-white/85 border-slate-200/80 hover:bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {c.photoUrl ? (
                        <img
                          src={c.photoUrl}
                          alt={c.name}
                          className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-xs shrink-0"
                        />
                      ) : (
                        <div
                          className={`w-10 h-10 rounded-full border font-bold text-xs flex items-center justify-center shrink-0 ${tone}`}
                        >
                          {getInitials(c.name)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">
                          {c.name}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          {getRelativeDayLabel(c, locale)}
                          {c.phone ? ` · ${c.phone}` : ''}
                          {isContactOverdue(c) && (
                            <span className="text-rose-700 font-bold">
                              {` · ${locale === 'bn' ? 'তারিখ পার' : 'Overdue'}: ${c.dueDate}`}
                            </span>
                          )}
                          {!isContactOverdue(c) && c.dueDate && c.balance > 0
                            ? ` · ${c.dueDate}`
                            : ''}
                          {c.lastNote ? ` · ${c.lastNote}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="text-right">
                        <p
                          className={`text-sm font-bold font-mono-num ${
                            isPabo
                              ? 'text-[#DC2626]'
                              : isDebo
                              ? 'text-emerald-700'
                              : 'text-slate-400'
                          }`}
                        >
                          {formatTaka(Math.abs(c.balance))}
                        </p>
                        <p
                          className={`text-[10px] font-semibold ${
                            isPabo
                              ? 'text-[#B91C1C]'
                              : isDebo
                              ? 'text-emerald-700'
                              : 'text-slate-400'
                          }`}
                        >
                          {isPabo
                            ? tr(locale, 'pabo_short')
                            : isDebo
                            ? tr(locale, 'debo_short')
                            : tr(locale, 'settled')}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div
          className={`lg:col-span-7 glass-card rounded-3xl overflow-hidden ${
            selectedContact ? 'block' : 'hidden lg:block'
          }`}
        >
          {!selectedContact ? (
            <div className="p-12 text-center space-y-4">
              <p className="text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
                {tr(locale, 'select_contact_hint')}
              </p>
              <button
                type="button"
                onClick={openAddContact}
                className="btn-3d inline-flex items-center gap-2 px-5 py-2.5 bg-[#B91C1C] hover:bg-[#991B1B] text-white text-xs font-bold rounded-full cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>
                  {locale === 'bn' ? 'নতুন কাস্টমার/সাপ্লায়ার' : tr(locale, 'add_contact')}
                </span>
              </button>
            </div>
          ) : (
            <div>
              <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedId(null)}
                    className="lg:hidden p-1.5 -ml-1 rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer no-print"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  {selectedContact.photoUrl ? (
                    <img
                      src={selectedContact.photoUrl}
                      alt={selectedContact.name}
                      className="w-11 h-11 rounded-full object-cover border-2 border-white shadow-sm shrink-0"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-rose-100 text-[#B91C1C] border border-rose-200 font-bold text-sm flex items-center justify-center shrink-0">
                      {getInitials(selectedContact.name)}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-bold text-slate-900">
                        {selectedContact.name}
                      </h3>
                      <button
                        type="button"
                        onClick={() => openEditContact(selectedContact)}
                        title={locale === 'bn' ? 'এডিট করুন' : 'Edit'}
                        className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer no-print"
                      >
                        <Pencil className="w-3 h-3" />
                        <span>{locale === 'bn' ? 'এডিট' : 'Edit'}</span>
                      </button>
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteContactTarget(selectedContact)}
                          title={locale === 'bn' ? 'ডিলিট করুন' : 'Delete'}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 rounded-lg cursor-pointer no-print"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>{locale === 'bn' ? 'ডিলিট' : 'Delete'}</span>
                        </button>
                      )}
                      {(selectedContact.loyaltyPoints ?? 0) > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-100 text-amber-900 text-[11px] font-extrabold font-mono-num">
                          <Gift className="w-3 h-3 text-amber-700" />
                          {selectedContact.loyaltyPoints} pts
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                      <span>
                        {selectedContact.contactType === 'customer'
                          ? tr(locale, 'customer')
                          : tr(locale, 'supplier')}
                      </span>
                      {selectedContact.phone && (
                        <>
                          <span>·</span>
                          <a
                            href={`tel:${selectedContact.phone}`}
                            className="inline-flex items-center gap-1 text-slate-700 hover:underline font-mono-num"
                          >
                            <Phone className="w-3 h-3" />
                            <span>{selectedContact.phone}</span>
                          </a>
                        </>
                      )}
                      {selectedContact.address && (
                        <>
                          <span>·</span>
                          <span>{selectedContact.address}</span>
                        </>
                      )}
                      {selectedContact.dueDate && selectedContact.balance > 0 && (
                        <>
                          <span>·</span>
                          <span
                            className={`inline-flex items-center gap-1 font-bold ${
                              isContactOverdue(selectedContact)
                                ? 'text-rose-600'
                                : 'text-amber-700'
                            }`}
                          >
                            <CalendarClock className="w-3 h-3" />
                            {locale === 'bn'
                              ? `আদায়ের তারিখ: ${selectedContact.dueDate}`
                              : `Due: ${selectedContact.dueDate}`}
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <p className="text-xs font-semibold text-slate-500">
                    {selectedContact.balance > 0
                      ? locale === 'bn'
                        ? 'বর্তমান পাবো'
                        : 'Current Receivable'
                      : selectedContact.balance < 0
                      ? locale === 'bn'
                        ? 'বর্তমান দেবো'
                        : 'Current Payable'
                      : tr(locale, 'settled')}
                  </p>
                  <p
                    className={`text-2xl font-bold font-mono-num ${
                      selectedContact.balance > 0
                        ? 'text-[#DC2626]'
                        : selectedContact.balance < 0
                        ? 'text-emerald-700'
                        : 'text-slate-700'
                    }`}
                  >
                    {formatTaka(Math.abs(selectedContact.balance))}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-white/50 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-2.5 no-print">
                <div className="flex items-center gap-2.5 flex-1">
                  <button
                    type="button"
                    onClick={() => openEntryModal('dilam')}
                    className="btn-3d flex-1 sm:flex-none px-5 py-2.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer whitespace-nowrap"
                  >
                    {tr(locale, 'dilam')}
                  </button>
                  <button
                    type="button"
                    onClick={() => openEntryModal('pelam')}
                    className="btn-3d flex-1 sm:flex-none px-5 py-2.5 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer whitespace-nowrap"
                  >
                    {tr(locale, 'pelam')}
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {selectedContact.balance > 0 && (
                    <>
                      <a
                        href={buildWhatsAppTagadaUrl(selectedContact)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50/90 border border-emerald-200 hover:bg-emerald-100 rounded-xl whitespace-nowrap"
                      >
                        <MessageSquareShare className="w-3.5 h-3.5" />
                        <span>{tr(locale, 'tagada')}</span>
                      </a>
                      {selectedContact.phone && (
                        <a
                          href={buildSmsTagadaUrl(selectedContact)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-sky-700 bg-sky-50/90 border border-sky-200 hover:bg-sky-100 rounded-xl whitespace-nowrap"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>SMS</span>
                        </a>
                      )}
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowBalanceCard(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-xl cursor-pointer whitespace-nowrap"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>{locale === 'bn' ? 'কার্ড শেয়ার' : 'Card PNG'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const slip58 = formatKhataSlipForThermalPrinter(
                        selectedContact,
                        selectedEntries,
                        { shopName, phone: shopPhone, address: shopAddress },
                        58,
                        locale
                      );
                      const slip80 = formatKhataSlipForThermalPrinter(
                        selectedContact,
                        selectedEntries,
                        { shopName, phone: shopPhone, address: shopAddress },
                        80,
                        locale
                      );
                      setThermalPrintData({
                        header: slip58.header,
                        body58: slip58.body,
                        body80: slip80.body,
                      });
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-800 bg-slate-100 border border-slate-300 hover:bg-white rounded-xl cursor-pointer whitespace-nowrap"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>{locale === 'bn' ? 'থার্মাল' : 'Thermal'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white/85 border border-slate-300 hover:bg-white rounded-xl cursor-pointer whitespace-nowrap"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>{locale === 'bn' ? 'প্রিন্ট' : 'Print'}</span>
                  </button>
                </div>
              </div>

              <div className="p-3 sm:p-4 space-y-2.5">
                {selectedEntries.length === 0 ? (
                  <div className="glass-3d-tile rounded-2xl p-10 text-center text-sm text-slate-500">
                    {tr(locale, 'no_entries')}
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-12 px-4 py-1.5 text-xs font-semibold text-slate-600">
                      <span className="col-span-5">
                        {locale === 'bn' ? 'তারিখ ও বিবরণ' : 'Date & Note'}
                      </span>
                      <span className="col-span-3 text-right text-red-700">
                        {locale === 'bn' ? 'দিলাম' : 'Gave'}
                      </span>
                      <span className="col-span-3 text-right text-emerald-700">
                        {locale === 'bn' ? 'পেলাম' : 'Got'}
                      </span>
                      <span className="col-span-1 text-right no-print" />
                    </div>

                    <div className="space-y-2.5">
                      {selectedEntries.map((entry) => {
                        const isConfirm = confirmDeleteEntryId === entry.id;
                        return (
                          <div
                            key={entry.id}
                            className="glass-3d-tile rounded-2xl px-4 py-3 grid grid-cols-12 items-center gap-2 text-sm"
                          >
                            <div className="col-span-5 min-w-0">
                              <p className="font-semibold text-slate-900 truncate">
                                {entry.note ||
                                  (entry.entryType === 'dilam'
                                    ? tr(locale, 'dilam')
                                    : tr(locale, 'pelam'))}
                              </p>
                              <p className="text-[11px] text-slate-500 font-mono-num mt-0.5">
                                {formatEntryTime(entry)}
                              </p>
                            </div>

                            <div className="col-span-3 text-right font-bold font-mono-num text-red-600">
                              {entry.entryType === 'dilam'
                                ? formatTaka(entry.amount)
                                : '—'}
                            </div>

                            <div className="col-span-3 text-right font-bold font-mono-num text-emerald-600">
                              {entry.entryType === 'pelam'
                                ? formatTaka(entry.amount)
                                : '—'}
                            </div>

                            <div className="col-span-1 text-right no-print flex justify-end">
                              {canDelete &&
                                (isConfirm ? (
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      setConfirmDeleteEntryId(null);
                                      await onDeleteEntry(selectedContact, entry);
                                    }}
                                    className="px-2 py-1 text-[10px] font-bold bg-rose-600 text-white rounded-lg cursor-pointer inline-flex items-center gap-0.5"
                                  >
                                    <Check className="w-3 h-3" />
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    title={locale === 'bn' ? 'মুছুন' : 'Delete'}
                                    onClick={() => setConfirmDeleteEntryId(entry.id)}
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
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {!selectedContact && (
        <button
          type="button"
          onClick={openAddContact}
          className="fixed bottom-20 right-4 lg:bottom-8 lg:right-8 z-30 btn-3d glass-3d-crimson text-white px-4 sm:px-5 py-3 rounded-full inline-flex items-center gap-2 text-xs sm:text-sm font-bold cursor-pointer no-print"
        >
          <UserPlus className="w-4 h-4 shrink-0" />
          <span>
            {locale === 'bn' ? 'নতুন কাস্টমার/সাপ্লায়ার' : tr(locale, 'add_contact')}
          </span>
        </button>
      )}

      {showGroupTagada && (
        <div
          onClick={() => setShowGroupTagada(false)}
          className="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-md flex items-center justify-center p-4 no-print"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md glass-3d-tile rounded-3xl p-5 sm:p-6 space-y-4 max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {locale === 'bn' ? 'গ্রুপ তাগাদা (বাকি আদায়)' : 'Group Due Reminders'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {locale === 'bn'
                    ? 'হোয়াটসঅ্যাপে এক ক্লিকে তাগাদা পাঠান'
                    : 'Send instant WhatsApp due reminders'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowGroupTagada(false)}
                className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {dueContacts.length === 0 ? (
              <p className="py-8 text-center text-xs font-semibold text-slate-500">
                {locale === 'bn'
                  ? 'এই মুহূর্তে কারো কাছে কোনো বাকি পাওনা নেই।'
                  : 'No customers with due balances right now.'}
              </p>
            ) : (
              <div className="space-y-2.5">
                {dueContacts.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-2xl bg-white/90 border border-slate-200/80 p-3 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{c.name}</p>
                      <p className="text-xs font-mono-num text-[#DC2626] font-bold">
                        {formatTaka(c.balance)} {c.phone ? `· ${c.phone}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {c.phone && (
                        <a
                          href={buildSmsTagadaUrl(c)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold bg-sky-50 border border-sky-200 hover:bg-sky-100 text-sky-700 rounded-xl"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>SMS</span>
                        </a>
                      )}
                      <a
                        href={buildWhatsAppTagadaUrl(c)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-3d inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
                      >
                        <MessageSquareShare className="w-3.5 h-3.5" />
                        <span>{tr(locale, 'tagada')}</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showContactModal && (
        <div
          onClick={() => setShowContactModal(false)}
          className="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-md flex items-center justify-center p-4 no-print"
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleSaveContact}
            className="w-full max-w-md glass-3d-tile rounded-3xl p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-bold text-slate-900">
                {editingContact
                  ? locale === 'bn'
                    ? 'কাস্টমার/সাপ্লায়ার এডিট করুন'
                    : 'Edit Customer / Supplier'
                  : locale === 'bn'
                  ? 'নতুন কাস্টমার/সাপ্লায়ার'
                  : tr(locale, 'add_contact')}
              </h3>
              <button
                type="button"
                onClick={() => setShowContactModal(false)}
                className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <p className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                {formError}
              </p>
            )}

            {/* Avatar Photo Picker + Customer / Supplier Type Radios */}
            <div className="flex items-center gap-3">
              <div className="relative shrink-0">
                <input
                  ref={contactPhotoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleContactPhotoPick}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => contactPhotoInputRef.current?.click()}
                  title={locale === 'bn' ? 'ছবি যোগ করুন' : 'Upload photo'}
                  className="w-15 h-15 rounded-full bg-slate-200/80 border-2 border-white shadow-sm overflow-hidden flex items-center justify-center relative cursor-pointer"
                >
                  {cPhotoUrl ? (
                    <img
                      src={cPhotoUrl}
                      alt={cName || 'Contact'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-7 h-7 text-slate-400" />
                  )}
                  <span className="absolute bottom-0 right-0 w-5.5 h-5.5 rounded-full bg-white border border-slate-200 text-slate-700 flex items-center justify-center shadow-xs">
                    <Camera className="w-3 h-3" />
                  </span>
                </button>
                {cPhotoUrl && (
                  <button
                    type="button"
                    onClick={() => setCPhotoUrl('')}
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center cursor-pointer"
                    title={locale === 'bn' ? 'ছবি সরান' : 'Remove'}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <div className="flex-1 grid grid-cols-2 gap-2">
                {(['customer', 'supplier'] as ContactType[]).map((ct) => {
                  const active = cType === ct;
                  return (
                    <button
                      key={ct}
                      type="button"
                      onClick={() => setCType(ct)}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                        active
                          ? 'bg-white border-[#B91C1C] text-[#B91C1C] shadow-xs'
                          : 'bg-white/75 border-slate-200 text-slate-600'
                      }`}
                    >
                      <span
                        className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                          active ? 'border-[#B91C1C]' : 'border-slate-400'
                        }`}
                      >
                        {active && <span className="w-1.5 h-1.5 rounded-full bg-[#B91C1C]" />}
                      </span>
                      <span>
                        {ct === 'customer'
                          ? locale === 'bn'
                            ? 'কাস্টমার'
                            : 'Customer'
                          : locale === 'bn'
                          ? 'সাপ্লায়ার'
                          : 'Supplier'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {!editingContact && (
              <button
                type="button"
                onClick={handlePickFromPhonebook}
                className="w-full py-2.5 px-4 rounded-full bg-slate-100 hover:bg-slate-200/80 border border-slate-200/80 text-slate-800 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <ContactRound className="w-4 h-4 text-[#B91C1C]" />
                <span>
                  {locale === 'bn' ? 'ফোনবুক থেকে যোগ করি' : 'Pick from Phonebook'}
                </span>
              </button>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {locale === 'bn' ? 'নাম *' : 'Name *'}
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  maxLength={100}
                  value={cName}
                  onChange={(e) => setCName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B91C1C]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {locale === 'bn' ? 'মোবাইল নম্বর' : 'Mobile Number'}
                </label>
                <input
                  type="tel"
                  maxLength={30}
                  placeholder="01XXXXXXXXX"
                  value={cPhone}
                  onChange={(e) => setCPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl font-mono-num focus:outline-none focus:ring-2 focus:ring-[#B91C1C]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {locale === 'bn' ? 'ঠিকানা / এলাকা' : 'Address'}
                </label>
                <input
                  type="text"
                  maxLength={200}
                  value={cAddress}
                  onChange={(e) => setCAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B91C1C]"
                />
              </div>

              {!editingContact && (
                <div className="pt-1 space-y-2">
                  <label className="block text-xs font-semibold text-slate-700">
                    {locale === 'bn'
                      ? 'পূর্বের বাকি (জের) — ঐচ্ছিক'
                      : 'Opening Balance (Optional)'}
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={openingType}
                      onChange={(e) => setOpeningType(e.target.value as KhataEntryType)}
                      className="px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl bg-white"
                    >
                      <option value="dilam">
                        {locale === 'bn' ? 'পাবো (দিলাম)' : 'Receivable'}
                      </option>
                      <option value="pelam">
                        {locale === 'bn' ? 'দেবো (পেলাম)' : 'Payable'}
                      </option>
                    </select>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0"
                      value={openingAmount}
                      onChange={(e) => setOpeningAmount(e.target.value)}
                      className="flex-1 px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl font-mono-num"
                    />
                  </div>
                </div>
              )}

              {/* Bottom Chips Row: Due Date, টালি-মেসেজ Toggle, ছবি Button */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 rounded-full px-3 py-1.5">
                  <CalendarClock className="w-3.5 h-3.5 text-slate-600" />
                  <input
                    type="date"
                    value={cDueDate}
                    onChange={(e) => setCDueDate(e.target.value)}
                    aria-label={locale === 'bn' ? 'আদায়ের তারিখ' : 'Due date'}
                    className="text-xs font-semibold text-slate-700 bg-transparent focus:outline-none font-mono-num"
                  />
                </div>

                <label className="inline-flex items-center gap-2 bg-slate-100 border border-slate-200 rounded-full px-3 py-1.5 text-xs font-semibold text-slate-800 cursor-pointer">
                  <span>{locale === 'bn' ? 'টালি-মেসেজ' : 'Tally SMS'}</span>
                  <input
                    type="checkbox"
                    checked={cSmsAlert}
                    onChange={(e) => setCSmsAlert(e.target.checked)}
                    className="accent-emerald-600 w-4 h-4 cursor-pointer"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => contactPhotoInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-full px-3 py-1.5 text-xs font-semibold text-slate-800 cursor-pointer"
                >
                  <ImagePlus className="w-3.5 h-3.5 text-[#B91C1C]" />
                  <span>{locale === 'bn' ? 'ছবি' : 'Photo'}</span>
                </button>
              </div>
            </div>

            <div className="pt-2 space-y-2.5">
              <button
                type="submit"
                disabled={savingContact}
                className="btn-3d w-full py-3 px-4 text-sm font-bold text-white bg-[#B91C1C] hover:bg-[#991B1B] rounded-full cursor-pointer disabled:opacity-60"
              >
                {savingContact
                  ? locale === 'bn'
                    ? 'সংরক্ষণ হচ্ছে...'
                    : 'Saving...'
                  : locale === 'bn'
                  ? 'নিশ্চিত'
                  : tr(locale, 'save')}
              </button>

              {editingContact && canDelete && (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteContactTarget(editingContact)}
                  className="w-full py-2 px-4 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-full cursor-pointer inline-flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>
                    {locale === 'bn'
                      ? 'এই কাস্টমার / সাপ্লায়ার ডিলিট করুন'
                      : 'Delete This Customer / Supplier'}
                  </span>
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {confirmDeleteContactTarget && (
        <div
          onClick={() => !deletingContact && setConfirmDeleteContactTarget(null)}
          className="fixed inset-0 z-[60] bg-slate-900/55 backdrop-blur-sm flex items-center justify-center p-4 no-print"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm glass-3d-tile rounded-3xl p-6 space-y-4"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">
                  {locale === 'bn' ? 'খাতা ডিলিট নিশ্চিত করুন' : 'Delete Party Ledger?'}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {locale === 'bn'
                    ? `আপনি কি নিশ্চিতভাবে "${confirmDeleteContactTarget.name}" এবং তাঁর সকল লেনদেন স্থায়ীভাবে ডিলিট করতে চান? ডিলিট করলে আর ফেরত পাওয়া যাবে না।`
                    : `Are you sure you want to permanently delete "${confirmDeleteContactTarget.name}" and all their ledger entries?`}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={deletingContact}
                onClick={() => setConfirmDeleteContactTarget(null)}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
              >
                {tr(locale, 'cancel')}
              </button>
              <button
                type="button"
                disabled={deletingContact}
                onClick={handleConfirmDeleteContact}
                className="btn-3d px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl cursor-pointer disabled:opacity-60"
              >
                {deletingContact
                  ? locale === 'bn'
                    ? 'ডিলিট হচ্ছে...'
                    : 'Deleting...'
                  : locale === 'bn'
                  ? 'হ্যাঁ, ডিলিট করুন'
                  : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {entryModalType && selectedContact && (
        <div
          onClick={() => setEntryModalType(null)}
          className="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-md flex items-center justify-center p-4 no-print"
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleEntrySubmit}
            className="w-full max-w-md glass-3d-tile rounded-2xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between gap-2">
              <h3
                className={`text-base font-bold ${
                  entryModalType === 'dilam' ? 'text-red-600' : 'text-emerald-600'
                }`}
              >
                {entryModalType === 'dilam'
                  ? tr(locale, 'dilam')
                  : tr(locale, 'pelam')}{' '}
                · {selectedContact.name}
              </h3>
              <button
                type="button"
                onClick={() => setEntryModalType(null)}
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
                {locale === 'bn' ? 'টাকার পরিমাণ (৳) *' : 'Amount (৳) *'}
              </label>
              <input
                type="number"
                min="0.01"
                max="100000000"
                step="0.01"
                required
                autoFocus
                value={entryAmount}
                onChange={(e) => setEntryAmount(e.target.value)}
                placeholder="0"
                className="w-full px-3.5 py-2.5 text-xl font-bold font-mono-num bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B91C1C]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {locale === 'bn' ? 'বিবরণ / নোট' : 'Note / Details'}
              </label>
              <input
                type="text"
                maxLength={300}
                value={entryNote}
                onChange={(e) => setEntryNote(e.target.value)}
                placeholder={
                  locale === 'bn'
                    ? 'যেমন: ফ্লেক্সিলোড, বিকাশ, চার্জার...'
                    : 'e.g. Recharge, item, cash...'
                }
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {quickNotes.map((qn) => (
                  <button
                    key={qn}
                    type="button"
                    onClick={() => setEntryNote(qn)}
                    className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md cursor-pointer"
                  >
                    {qn}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={alsoCash}
                onChange={(e) => setAlsoCash(e.target.checked)}
              />
              <span>
                {locale === 'bn'
                  ? 'ক্যাশবইয়েও স্বয়ংক্রিয়ভাবে যোগ করুন'
                  : 'Also record this amount in Cashbook'}
              </span>
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEntryModalType(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                {tr(locale, 'cancel')}
              </button>
              <button
                type="submit"
                disabled={savingEntry}
                className={`btn-3d px-5 py-2 text-xs font-bold text-white rounded-lg cursor-pointer disabled:opacity-60 ${
                  entryModalType === 'dilam'
                    ? 'bg-[#DC2626] hover:bg-[#B91C1C]'
                    : 'bg-[#16A34A] hover:bg-[#15803D]'
                }`}
              >
                {tr(locale, 'save')}
              </button>
            </div>
          </form>
        </div>
      )}
      {showInstallments &&
        onCreateInstallmentPlan &&
        onCollectInstallment &&
        onDeleteInstallmentPlan && (
          <InstallmentsModal
            locale={locale}
            shopName={shopName}
            contacts={contacts}
            installments={installments}
            canDelete={canDelete}
            onCreatePlan={onCreateInstallmentPlan}
            onCollectPayment={onCollectInstallment}
            onDeletePlan={onDeleteInstallmentPlan}
            onClose={() => setShowInstallments(false)}
          />
        )}

      {showBalanceCard && selectedContact && (
        <BalanceCardModal
          locale={locale}
          contact={selectedContact}
          shopName={shopName}
          shopPhone={shopPhone}
          shopAddress={shopAddress}
          gateways={gateways}
          whatsappUrl={buildWhatsAppTagadaUrl(selectedContact)}
          smsUrl={selectedContact.phone ? buildSmsTagadaUrl(selectedContact) : undefined}
          onClose={() => setShowBalanceCard(false)}
        />
      )}

      {thermalPrintData && (
        <ThermalPrintModal
          locale={locale}
          header={thermalPrintData.header}
          body58={thermalPrintData.body58}
          body80={thermalPrintData.body80}
          onClose={() => setThermalPrintData(null)}
        />
      )}
    </div>
  );
};
