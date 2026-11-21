import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Bell,
  Building2,
  Camera,
  Check,
  Copy,
  FileSpreadsheet,
  Hash,
  Lock,
  Phone,
  Printer,
  Smartphone,
  Store,
  Trash2,
  TrendingUp,
  UserCheck,
  Volume2,
} from 'lucide-react';
import {
  CashEntry,
  Contact,
  Locale,
  Product,
  SaleInvoice,
  ShiftClosing,
  ShopProfile,
  StaffMember,
  StaffRole,
  TelecomEntry,
} from '../types/shop';
import { tr } from '../lib/i18n';
import { compressImageToDataUrl, formatTaka } from '../lib/shopService';
import { hashPin } from '../lib/security';
import {
  getDecimalEnabled,
  getPushNotifyEnabled,
  getSoundEnabled,
  setDecimalEnabled,
  setPushNotifyEnabled,
  setSoundEnabled,
} from '../lib/appSettings';
import { playSoftNotificationChime } from '../lib/voiceNotifier';
import {
  dispatchSystemNotification,
  requestSystemNotificationPermission,
} from '../lib/systemNotifications';
import { getSavedPrinter, setSavedPrinter } from '../lib/thermalPrinter';
import { StaffManagementSection } from './StaffShiftSection';

const BUSINESS_TYPES = [
  'মুদি ও জেনারেল স্টোর',
  'টেলিকম ও MFS এজেন্ট',
  'কফি শপ ও রেস্টুরেন্ট',
  'ফার্মেসি ও হেলথকেয়ার',
  'পোশাক ও ফ্যাশন',
  'ইলেকট্রনিক্স ও মোবাইল',
  'হার্ডওয়্যার ও নির্মাণ সামগ্রী',
  'স্টেশনারি ও কসমেটিকস',
  'অন্যান্য ব্যবসা',
];

interface ReportsSettingsTabProps {
  locale: Locale;
  shop: ShopProfile;
  contacts: Contact[];
  cashEntries: CashEntry[];
  products: Product[];
  invoices?: SaleInvoice[];
  telecomEntries?: TelecomEntry[];
  staffMembers?: StaffMember[];
  shiftClosings?: ShiftClosing[];
  isStaffSession?: boolean;
  canViewProfit?: boolean;
  activeBranchName?: string;
  initialReportView?: 'summary' | 'analytics' | 'profile' | 'security' | 'staff';
  voiceEnabled?: boolean;
  onToggleVoice?: () => void;
  onUpdateShop: (input: {
    shopName: string;
    shopSubtitle: string;
    phone: string;
    address: string;
    ownerName?: string;
    businessType?: string;
    nidNumber?: string;
    businessAgeYears?: string;
    photoUrl?: string;
  }) => Promise<void>;
  onSavePinHash: (hash: string | null) => Promise<void>;
  onSaveStaff?: (
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
  onToggleStaffActive?: (staff: StaffMember) => Promise<void>;
  onDeleteStaff?: (staffId: string) => Promise<void>;
  onDeleteShiftClosing?: (shiftId: string) => Promise<void>;
  onOpenOperatorSwitcher?: () => void;
  onOpenBranchSwitcher?: () => void;
}

const EXPENSE_CATEGORIES = new Set([
  'খরচ',
  'দোকান ভাড়া ও বিল',
  'কর্মচারী খরচ',
  'অন্যান্য খরচ',
]);

function toLocalDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(date.getDate()).padStart(2, '0')}`;
}

export const ReportsSettingsTab: React.FC<ReportsSettingsTabProps> = ({
  locale,
  shop,
  contacts,
  cashEntries,
  products,
  invoices = [],
  telecomEntries = [],
  staffMembers = [],
  shiftClosings = [],
  isStaffSession = false,
  canViewProfit = true,
  activeBranchName,
  initialReportView,
  voiceEnabled = true,
  onToggleVoice,
  onUpdateShop,
  onSavePinHash,
  onSaveStaff,
  onToggleStaffActive,
  onDeleteStaff,
  onDeleteShiftClosing,
  onOpenOperatorSwitcher,
  onOpenBranchSwitcher,
}) => {
  const [shopName, setShopName] = useState(shop.shopName);
  const [shopSubtitle, setShopSubtitle] = useState(shop.shopSubtitle);
  const [ownerName, setOwnerName] = useState(shop.ownerName ?? '');
  const [businessType, setBusinessType] = useState(shop.businessType ?? '');
  const [nidNumber, setNidNumber] = useState(shop.nidNumber ?? '');
  const [businessAgeYears, setBusinessAgeYears] = useState(shop.businessAgeYears ?? '');
  const [photoUrl, setPhotoUrl] = useState(shop.photoUrl ?? '');
  const [phone, setPhone] = useState(shop.phone);
  const [address, setAddress] = useState(shop.address);
  const [newPin, setNewPin] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedUid, setCopiedUid] = useState(false);
  const [decimalEnabled, setDecimalState] = useState<boolean>(getDecimalEnabled);
  const [soundEnabled, setSoundState] = useState<boolean>(getSoundEnabled);
  const [pushEnabled, setPushState] = useState<boolean>(getPushNotifyEnabled);
  const [savedPrinter, setSavedPrinterState] = useState(getSavedPrinter);
  const [reportView, setReportView] = useState<
    'summary' | 'analytics' | 'profile' | 'security' | 'staff'
  >(initialReportView ?? 'summary');

  const shopPhotoRef = useRef<HTMLInputElement | null>(null);
  const phoneInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (initialReportView) {
      setReportView(initialReportView);
      setMsg(null);
      setErrorMsg(null);
    }
  }, [initialReportView]);

  useEffect(() => {
    setShopName(shop.shopName);
    setShopSubtitle(shop.shopSubtitle);
    setOwnerName(shop.ownerName ?? '');
    setBusinessType(shop.businessType ?? '');
    setNidNumber(shop.nidNumber ?? '');
    setBusinessAgeYears(shop.businessAgeYears ?? '');
    setPhotoUrl(shop.photoUrl ?? '');
    setPhone(shop.phone);
    setAddress(shop.address);
  }, [
    shop.shopName,
    shop.shopSubtitle,
    shop.ownerName,
    shop.businessType,
    shop.nidNumber,
    shop.businessAgeYears,
    shop.photoUrl,
    shop.phone,
    shop.address,
  ]);

  const summary = useMemo(() => {
    const totalPabo = contacts
      .filter((c) => c.balance > 0)
      .reduce((s, c) => s + c.balance, 0);
    const totalDebo = contacts
      .filter((c) => c.balance < 0)
      .reduce((s, c) => s + Math.abs(c.balance), 0);
    const totalCashIn = cashEntries
      .filter((c) => c.cashType === 'cash_in')
      .reduce((s, c) => s + c.amount, 0);
    const totalCashOut = cashEntries
      .filter((c) => c.cashType === 'cash_out')
      .reduce((s, c) => s + c.amount, 0);
    const stockSaleValue = products.reduce(
      (s, p) => s + p.salePrice * p.quantity,
      0
    );
    const stockBuyValue = products.reduce(
      (s, p) => s + p.purchasePrice * p.quantity,
      0
    );
    return {
      totalPabo,
      totalDebo,
      totalCashIn,
      totalCashOut,
      netCash: totalCashIn - totalCashOut,
      stockSaleValue,
      stockBuyValue,
    };
  }, [contacts, cashEntries, products]);

  const analytics = useMemo(() => {
    const invoiceSales = invoices.reduce((s, inv) => s + inv.totalAmount, 0);
    const grossProductProfit = invoices.reduce((s, inv) => s + inv.profitAmount, 0);
    const telecomCommission = telecomEntries.reduce((s, t) => s + t.commission, 0);
    const operatingExpenses = cashEntries
      .filter((c) => c.cashType === 'cash_out' && EXPENSE_CATEGORIES.has(c.category))
      .reduce((s, c) => s + c.amount, 0);
    const netProfit = grossProductProfit + telecomCommission - operatingExpenses;

    // 7-day chart buckets
    const days: { key: string; label: string; cashIn: number; cashOut: number; sales: number }[] = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
      const key = toLocalDateKey(d);
      const label = d.toLocaleDateString(locale === 'bn' ? 'bn-BD' : 'en-GB', {
        weekday: 'short',
      });
      days.push({ key, label, cashIn: 0, cashOut: 0, sales: 0 });
    }
    const dayMap = new Map(days.map((d) => [d.key, d]));

    cashEntries.forEach((c) => {
      const dt = c.createdAt ? c.createdAt.toDate() : new Date();
      const bucket = dayMap.get(toLocalDateKey(dt));
      if (!bucket) return;
      if (c.cashType === 'cash_in') bucket.cashIn += c.amount;
      else bucket.cashOut += c.amount;
    });

    invoices.forEach((inv) => {
      const dt = inv.createdAt ? inv.createdAt.toDate() : new Date();
      const bucket = dayMap.get(toLocalDateKey(dt));
      if (!bucket) return;
      bucket.sales += inv.totalAmount;
    });

    const maxChartVal = Math.max(
      100,
      ...days.map((d) => Math.max(d.cashIn, d.cashOut, d.sales))
    );

    // Top selling products from invoices
    const prodAgg = new Map<string, { name: string; qty: number; revenue: number }>();
    invoices.forEach((inv) => {
      inv.items.forEach((it) => {
        const cur = prodAgg.get(it.productId) ?? {
          name: it.name,
          qty: 0,
          revenue: 0,
        };
        cur.qty += it.qty;
        cur.revenue += it.lineTotal;
        prodAgg.set(it.productId, cur);
      });
    });
    const topProducts = Array.from(prodAgg.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const lowStockProducts = products.filter((p) => p.quantity <= p.lowStockThreshold);

    return {
      invoiceSales,
      grossProductProfit,
      telecomCommission,
      operatingExpenses,
      netProfit,
      days,
      maxChartVal,
      topProducts,
      lowStockCount: lowStockProducts.length,
    };
  }, [invoices, telecomEntries, cashEntries, products, locale]);

  const exportCsv = () => {
    const rows: string[][] = [
      [shop.shopName, shop.shopSubtitle],
      ['Total Receivable (Pabo)', summary.totalPabo.toFixed(2)],
      ['Total Payable (Debo)', summary.totalDebo.toFixed(2)],
      ['Total Cash In', summary.totalCashIn.toFixed(2)],
      ['Total Cash Out', summary.totalCashOut.toFixed(2)],
      ['Net Cash Balance', summary.netCash.toFixed(2)],
      ...(canViewProfit
        ? [['Estimated Net Profit', analytics.netProfit.toFixed(2)]]
        : []),
      [],
      ['Party Name', 'Type', 'Mobile', 'Balance (BDT)', 'Status'],
      ...contacts.map((c) => [
        c.name,
        c.contactType,
        c.phone,
        Math.abs(c.balance).toFixed(2),
        c.balance > 0 ? 'Pabo' : c.balance < 0 ? 'Debo' : 'Settled',
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
    a.download = `tallykhata_report_${localDay}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleShopPhotoPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setErrorMsg(null);
    try {
      const compressed = await compressImageToDataUrl(file, 160, 0.72);
      setPhotoUrl(compressed);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : locale === 'bn'
          ? 'ছবি প্রসেস করতে সমস্যা হয়েছে।'
          : 'Failed to process shop image.'
      );
    }
  };

  const handleSaveShop = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setErrorMsg(null);
    setSavingProfile(true);
    try {
      await onUpdateShop({
        shopName,
        shopSubtitle,
        phone,
        address,
        ownerName,
        businessType,
        nidNumber,
        businessAgeYears,
        photoUrl,
      });
      setMsg(
        locale === 'bn'
          ? 'আপনার দোকানের সকল তথ্য সফলভাবে আপডেট হয়েছে।'
          : 'Shop profile & business details updated.'
      );
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : locale === 'bn'
          ? 'দোকানের তথ্য আপডেট করতে সমস্যা হয়েছে।'
          : 'Failed to update shop profile.'
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setErrorMsg(null);
    const trimmed = newPin.trim();
    if (!/^\d{4,6}$/.test(trimmed)) {
      setErrorMsg(
        locale === 'bn' ? '৪ থেকে ৬ সংখ্যার পিন দিন।' : 'PIN must be 4–6 digits.'
      );
      return;
    }
    try {
      const h = await hashPin(trimmed);
      await onSavePinHash(h);
      setNewPin('');
      setMsg(locale === 'bn' ? 'পিন লক চালু হয়েছে।' : 'PIN lock updated.');
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : locale === 'bn'
          ? 'পিন সেভ করতে সমস্যা হয়েছে।'
          : 'Failed to save PIN.'
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass-3d-tile rounded-2xl p-2 inline-flex flex-wrap items-center gap-1.5 no-print">
        {(
          [
            ['summary', locale === 'bn' ? 'ব্যবসায়িক রিপোর্ট' : 'Business Report'],
            ['analytics', locale === 'bn' ? 'লাভ-ক্ষতি ও গ্রাফ' : 'Profit & Charts'],
            ['staff', locale === 'bn' ? 'স্টাফ ও শিফট' : 'Staff & Shift'],
            ['profile', locale === 'bn' ? 'সেটিংস ও তথ্য' : 'Settings & Info'],
            ['security', locale === 'bn' ? 'পিন লক নিরাপত্তা' : 'PIN Security'],
          ] as ['summary' | 'analytics' | 'staff' | 'profile' | 'security', string][]
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setReportView(id);
              setMsg(null);
              setErrorMsg(null);
            }}
            className={`px-4 py-2 text-xs font-bold rounded-xl cursor-pointer transition-all whitespace-nowrap ${
              reportView === id
                ? 'bg-[#B91C1C] text-white shadow-sm'
                : 'text-slate-700 hover:bg-white/80'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {reportView === 'summary' && (
        <div className="glass-3d-tile rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {shop.shopName} ·{' '}
                {locale === 'bn' ? 'ব্যবসায়িক রিপোর্ট' : 'Business Summary'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {shop.address || shop.shopSubtitle}
              </p>
            </div>
            <div className="flex items-center gap-2 no-print">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white/85 border border-slate-300 rounded-xl hover:bg-white cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{locale === 'bn' ? 'প্রিন্ট / PDF' : 'Print / PDF'}</span>
              </button>
              <button
                type="button"
                onClick={exportCsv}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white/85 border border-slate-300 rounded-xl hover:bg-white cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>{locale === 'bn' ? 'Excel / CSV' : 'Export CSV'}</span>
              </button>
            </div>
          </div>

          <div className="mt-4 space-y-2.5 text-sm">
            <div className="glass-3d-tile rounded-xl px-4 py-3 flex justify-between items-center">
              <span className="text-slate-600">{tr(locale, 'pabo')}</span>
              <span className="font-bold font-mono-num text-emerald-600">
                {formatTaka(summary.totalPabo)}
              </span>
            </div>
            <div className="glass-3d-tile rounded-xl px-4 py-3 flex justify-between items-center">
              <span className="text-slate-600">{tr(locale, 'debo')}</span>
              <span className="font-bold font-mono-num text-red-600">
                {formatTaka(summary.totalDebo)}
              </span>
            </div>
            <div className="glass-3d-tile rounded-xl px-4 py-3 flex justify-between items-center">
              <span className="text-slate-600">
                {locale === 'bn' ? 'সর্বমোট ক্যাশ ইন' : 'Total Cash In'}
              </span>
              <span className="font-semibold font-mono-num text-emerald-700">
                +{formatTaka(summary.totalCashIn)}
              </span>
            </div>
            <div className="glass-3d-tile rounded-xl px-4 py-3 flex justify-between items-center">
              <span className="text-slate-600">
                {locale === 'bn' ? 'সর্বমোট ক্যাশ আউট' : 'Total Cash Out'}
              </span>
              <span className="font-semibold font-mono-num text-red-600">
                -{formatTaka(summary.totalCashOut)}
              </span>
            </div>
            <div className="glass-3d-tile rounded-xl px-4 py-3 flex justify-between items-center font-bold">
              <span className="text-slate-900">{tr(locale, 'cash_balance')}</span>
              <span className="font-mono-num text-slate-900">
                {formatTaka(summary.netCash)}
              </span>
            </div>
            {canViewProfit && (
              <div className="glass-3d-tile rounded-xl px-4 py-3 flex justify-between items-center">
                <span className="text-slate-600">
                  {locale === 'bn' ? 'মজুদ পণ্যের ক্রয়মূল্য' : 'Stock Purchase Value'}
                </span>
                <span className="font-semibold font-mono-num text-slate-700">
                  {formatTaka(summary.stockBuyValue)}
                </span>
              </div>
            )}
            <div className="glass-3d-tile rounded-xl px-4 py-3 flex justify-between items-center">
              <span className="text-slate-600">
                {locale === 'bn' ? 'মজুদ পণ্যের বিক্রয়মূল্য' : 'Stock Sale Value'}
              </span>
              <span className="font-semibold font-mono-num text-slate-900">
                {formatTaka(summary.stockSaleValue)}
              </span>
            </div>
          </div>
        </div>
      )}

      {reportView === 'analytics' && (
        <div className="space-y-5">
          {!canViewProfit ? (
            <div className="glass-3d-tile rounded-2xl p-5 text-xs font-bold text-amber-900 bg-amber-50 border border-amber-200">
              {locale === 'bn'
                ? 'স্টাফ মোডে নিট লাভ ও ক্রয়মূল্যের তথ্য মালিকের অনুমতির কারণে লুকানো আছে।'
                : 'Net profit & purchase margin KPIs are hidden in Staff Mode.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="glass-3d-tile rounded-2xl p-4 space-y-1">
                <p className="text-xs font-semibold text-slate-500">
                  {locale === 'bn' ? 'পণ্য বিক্রি থেকে লাভ' : 'Gross Product Profit'}
                </p>
                <p className="text-xl font-extrabold font-mono-num text-emerald-700">
                  {formatTaka(analytics.grossProductProfit)}
                </p>
                <p className="text-[11px] text-slate-500 font-mono-num">
                  {locale === 'bn' ? 'মোট মেমো বিক্রি:' : 'POS Sales:'}{' '}
                  {formatTaka(analytics.invoiceSales)}
                </p>
              </div>

              <div className="glass-3d-tile rounded-2xl p-4 space-y-1">
                <p className="text-xs font-semibold text-slate-500">
                  {locale === 'bn' ? 'টেলিকম / MFS কমিশন' : 'Telecom Commission'}
                </p>
                <p className="text-xl font-extrabold font-mono-num text-sky-700">
                  +{formatTaka(analytics.telecomCommission)}
                </p>
                <p className="text-[11px] text-slate-500 font-mono-num">
                  {telecomEntries.length} {locale === 'bn' ? 'টি লেনদেন' : 'entries'}
                </p>
              </div>

              <div className="glass-3d-tile rounded-2xl p-4 space-y-1">
                <p className="text-xs font-semibold text-slate-500">
                  {locale === 'bn' ? 'দোকান খরচ (ভাড়া/বিল/অন্যান্য)' : 'Operating Expenses'}
                </p>
                <p className="text-xl font-extrabold font-mono-num text-rose-600">
                  -{formatTaka(analytics.operatingExpenses)}
                </p>
                <p className="text-[11px] text-slate-500">
                  {locale === 'bn' ? 'ক্যাশবই আউট অনুযায়ী' : 'From Cashbook expenses'}
                </p>
              </div>

              <div className="glass-3d-crimson text-white rounded-2xl p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-red-100">
                    {locale === 'bn' ? 'সর্বমোট নিট লাভ' : 'Net Business Profit'}
                  </p>
                  <TrendingUp className="w-4 h-4 text-amber-300" />
                </div>
                <p className="text-2xl font-extrabold font-mono-num text-amber-200">
                  {formatTaka(analytics.netProfit)}
                </p>
                <p className="text-[11px] text-red-100/90">
                  {locale === 'bn'
                    ? 'বিক্রয় লাভ + কমিশন − খরচ'
                    : 'Sales Profit + Commission − Expense'}
                </p>
              </div>
            </div>
          )}

          <div className="glass-3d-tile rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#B91C1C]" />
                <h3 className="text-sm font-extrabold text-slate-900">
                  {locale === 'bn'
                    ? 'গত ৭ দিনের ক্যাশ ইন, ক্যাশ আউট ও বিক্রি গ্রাফ'
                    : 'Last 7 Days Cash In / Out & POS Sales'}
                </h3>
              </div>
              <div className="flex items-center gap-3 text-[11px] font-bold">
                <span className="inline-flex items-center gap-1 text-emerald-700">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                  {locale === 'bn' ? 'ক্যাশ ইন' : 'Cash In'}
                </span>
                <span className="inline-flex items-center gap-1 text-rose-700">
                  <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" />
                  {locale === 'bn' ? 'ক্যাশ আউট' : 'Cash Out'}
                </span>
                <span className="inline-flex items-center gap-1 text-amber-700">
                  <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
                  {locale === 'bn' ? 'POS বিক্রি' : 'POS Sales'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2 items-end h-44 pt-4 border-b border-slate-200/80 pb-2">
              {analytics.days.map((d) => {
                const inPct = Math.round((d.cashIn / analytics.maxChartVal) * 100);
                const outPct = Math.round((d.cashOut / analytics.maxChartVal) * 100);
                const salePct = Math.round((d.sales / analytics.maxChartVal) * 100);
                return (
                  <div
                    key={d.key}
                    className="flex flex-col items-center gap-1.5 h-full justify-end"
                  >
                    <div className="flex items-end gap-1 h-32 w-full justify-center">
                      <div
                        title={`In: ${formatTaka(d.cashIn)}`}
                        style={{ height: `${Math.max(4, inPct)}%` }}
                        className="w-2.5 sm:w-3.5 rounded-t-md bg-emerald-500 transition-all"
                      />
                      <div
                        title={`Out: ${formatTaka(d.cashOut)}`}
                        style={{ height: `${Math.max(4, outPct)}%` }}
                        className="w-2.5 sm:w-3.5 rounded-t-md bg-rose-500 transition-all"
                      />
                      <div
                        title={`Sales: ${formatTaka(d.sales)}`}
                        style={{ height: `${Math.max(4, salePct)}%` }}
                        className="w-2.5 sm:w-3.5 rounded-t-md bg-amber-500 transition-all"
                      />
                    </div>
                    <span className="text-[10px] font-bold text-slate-600">
                      {d.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="glass-3d-tile rounded-2xl p-5 space-y-3">
              <h3 className="text-sm font-extrabold text-slate-900">
                {locale === 'bn' ? 'সর্বাধিক বিক্রিত পণ্য' : 'Top Selling Products'}
              </h3>
              {analytics.topProducts.length === 0 ? (
                <p className="text-xs text-slate-500 py-4">
                  {locale === 'bn'
                    ? 'POS কার্ট বা কুইক সেল থেকে বিক্রি করলে এখানে তালিকা দেখাবে।'
                    : 'Sell items via POS to view top selling products.'}
                </p>
              ) : (
                <div className="space-y-2">
                  {analytics.topProducts.map((tp, idx) => (
                    <div
                      key={`${tp.name}_${idx}`}
                      className="flex items-center justify-between gap-2 rounded-xl bg-white/80 border border-slate-200/70 px-3 py-2 text-xs"
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 truncate">
                          {idx + 1}. {tp.name}
                        </p>
                        <p className="text-[11px] text-slate-500 font-mono-num">
                          {tp.qty} {locale === 'bn' ? 'পিস বিক্রি' : 'sold'}
                        </p>
                      </div>
                      <span className="font-extrabold font-mono-num text-emerald-700 shrink-0">
                        {formatTaka(tp.revenue)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="glass-3d-tile rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-slate-900">
                  {locale === 'bn' ? 'সর্বোচ্চ বাকি পাওনা' : 'Top Due Customers'}
                </h3>
                {analytics.lowStockCount > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold">
                    <AlertTriangle className="w-3 h-3" />
                    {analytics.lowStockCount} {locale === 'bn' ? 'কম স্টক' : 'Low Stock'}
                  </span>
                )}
              </div>
              {contacts.filter((c) => c.balance > 0).length === 0 ? (
                <p className="text-xs text-slate-500 py-4">
                  {locale === 'bn'
                    ? 'কোনো বাকি পাওনা নেই।'
                    : 'No customer dues right now.'}
                </p>
              ) : (
                <div className="space-y-2">
                  {contacts
                    .filter((c) => c.balance > 0)
                    .sort((a, b) => b.balance - a.balance)
                    .slice(0, 5)
                    .map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between gap-2 rounded-xl bg-white/80 border border-slate-200/70 px-3 py-2 text-xs"
                      >
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate">{c.name}</p>
                          <p className="text-[11px] text-slate-500 font-mono-num truncate">
                            {c.phone || (locale === 'bn' ? 'নম্বর নেই' : 'No phone')}
                            {c.dueDate ? ` · 📅 ${c.dueDate}` : ''}
                          </p>
                        </div>
                        <span className="font-extrabold font-mono-num text-[#DC2626] shrink-0">
                          {formatTaka(c.balance)}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {reportView === 'profile' && (
        <div className="space-y-5 max-w-2xl no-print">
          {/* App Settings Toggles Card */}
          <div className="glass-3d-tile rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  {locale === 'bn' ? 'অ্যাপ সেটিংস' : 'App Settings'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {locale === 'bn'
                    ? 'টাকার ফরম্যাট, সাউন্ড ও দ্রুত নিরাপত্তা নিয়ন্ত্রণ করুন'
                    : 'Customize currency formatting, sounds & security'}
                </p>
              </div>
            </div>

            <div className="divide-y divide-slate-200/70">
              {/* Decimal toggle */}
              <div className="py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-rose-50 text-[#B91C1C] flex items-center justify-center shrink-0">
                    <Hash className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-slate-900">
                      {locale === 'bn' ? 'টাকার অংকে দশমিক' : 'Show Currency Decimals'}
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono-num">
                      {decimalEnabled
                        ? locale === 'bn'
                          ? 'উদাহরণঃ ৳১২,০০০.০০'
                          : 'Example: ৳12,000.00'
                        : locale === 'bn'
                        ? 'উদাহরণঃ ৳১২,০০০'
                        : 'Example: ৳12,000'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={decimalEnabled}
                  onClick={() => {
                    const next = !decimalEnabled;
                    setDecimalState(next);
                    setDecimalEnabled(next);
                  }}
                  className={`relative w-12 h-6.5 rounded-full transition-colors cursor-pointer shrink-0 ${
                    decimalEnabled ? 'bg-[#B91C1C]' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5.5 h-5.5 rounded-full bg-white shadow transition-transform ${
                      decimalEnabled ? 'translate-x-5.5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Notification Sound toggle */}
              <div className="py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-slate-900">
                      {locale === 'bn' ? 'নোটিফিকেশন সাউন্ড' : 'Notification Sound'}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {locale === 'bn'
                        ? 'লেনদেন ও টালিখাতা নোটিফিকেশনে সাউন্ড এলার্ট'
                        : 'Play chime sound on khata & order alerts'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={soundEnabled}
                  onClick={() => {
                    const next = !soundEnabled;
                    setSoundState(next);
                    setSoundEnabled(next);
                    if (next) {
                      playSoftNotificationChime('general');
                    }
                  }}
                  className={`relative w-12 h-6.5 rounded-full transition-colors cursor-pointer shrink-0 ${
                    soundEnabled ? 'bg-[#B91C1C]' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5.5 h-5.5 rounded-full bg-white shadow transition-transform ${
                      soundEnabled ? 'translate-x-5.5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Voice Notification toggle */}
              {onToggleVoice && (
                <div className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                      <Volume2 className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-slate-900">
                        {locale === 'bn' ? 'ভয়েস নোটিফিকেশন' : 'Voice Alerts'}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {locale === 'bn'
                          ? 'কথা বলে অর্ডার ও হিসাব জানিয়ে দেবে'
                          : 'Spoken Bengali / English audio alerts'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={voiceEnabled}
                    onClick={onToggleVoice}
                    className={`relative w-12 h-6.5 rounded-full transition-colors cursor-pointer shrink-0 ${
                      voiceEnabled ? 'bg-emerald-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5.5 h-5.5 rounded-full bg-white shadow transition-transform ${
                        voiceEnabled ? 'translate-x-5.5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              )}
              {/* System / Push Notification toggle */}
              <div className="py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center shrink-0">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-slate-900">
                      {locale === 'bn' ? 'অ্যান্ড্রয়েড পুশ নোটিফিকেশন' : 'System Push Notifications'}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {locale === 'bn'
                        ? 'অর্ডার, কিস্তি ও অভিযোগের নোটিফিকেশন স্ট্যাটাস বারে দেখাবে'
                        : 'Show native status-bar notifications on alerts'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={pushEnabled}
                  onClick={async () => {
                    const next = !pushEnabled;
                    if (next) {
                      const granted = await requestSystemNotificationPermission();
                      setPushState(granted);
                      setPushNotifyEnabled(granted);
                      if (granted) {
                        void dispatchSystemNotification({
                          title: shop.shopName,
                          body:
                            locale === 'bn'
                              ? 'সিস্টেম নোটিফিকেশন সফলভাবে চালু হয়েছে!'
                              : 'System push notifications enabled!',
                        });
                      }
                    } else {
                      setPushState(false);
                      setPushNotifyEnabled(false);
                    }
                  }}
                  className={`relative w-12 h-6.5 rounded-full transition-colors cursor-pointer shrink-0 ${
                    pushEnabled ? 'bg-sky-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5.5 h-5.5 rounded-full bg-white shadow transition-transform ${
                      pushEnabled ? 'translate-x-5.5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {onOpenBranchSwitcher && (
                <button
                  type="button"
                  onClick={onOpenBranchSwitcher}
                  className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-white/85 border border-slate-200 hover:border-[#B91C1C]/50 text-xs font-bold text-slate-800 cursor-pointer"
                >
                  <span className="inline-flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-sky-600" />
                    <span>{locale === 'bn' ? 'মাল্টি-শপ / শাখা' : 'Switch Shop / Branch'}</span>
                  </span>
                  <span className="text-[10px] font-bold text-sky-700 truncate max-w-[95px]">
                    {activeBranchName || (locale === 'bn' ? 'মূল দোকান' : 'Primary')}
                  </span>
                </button>
              )}

              {onOpenOperatorSwitcher && (
                <button
                  type="button"
                  onClick={onOpenOperatorSwitcher}
                  className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-white/85 border border-slate-200 hover:border-[#B91C1C]/50 text-xs font-bold text-slate-800 cursor-pointer"
                >
                  <span className="inline-flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-amber-600" />
                    <span>{locale === 'bn' ? 'স্টাফ / মালিক বদলান' : 'Switch Operator'}</span>
                  </span>
                  <span className="text-[10px] font-bold text-amber-700">
                    {isStaffSession
                      ? locale === 'bn'
                        ? 'স্টাফ মোড'
                        : 'Staff'
                      : locale === 'bn'
                      ? 'মালিক মোড'
                      : 'Owner'}
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  phoneInputRef.current?.focus();
                  phoneInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
                className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-white/85 border border-slate-200 hover:border-[#B91C1C]/50 text-xs font-bold text-slate-800 cursor-pointer"
              >
                <span className="inline-flex items-center gap-2">
                  <Phone className="w-4 h-4 text-[#B91C1C]" />
                  <span>{locale === 'bn' ? 'মোবাইল নম্বর পরিবর্তন' : 'Change Mobile Number'}</span>
                </span>
                <span className="text-[10px] font-mono-num text-slate-500 truncate max-w-[95px]">
                  {phone || '—'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setReportView('security')}
                className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-white/85 border border-slate-200 hover:border-[#B91C1C]/50 text-xs font-bold text-slate-800 cursor-pointer"
              >
                <span className="inline-flex items-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-700" />
                  <span>
                    {shop.pinHash
                      ? locale === 'bn'
                        ? 'PIN পরিবর্তন করুন'
                        : 'Change PIN'
                      : locale === 'bn'
                      ? 'PIN সেট করুন'
                      : 'Set PIN'}
                  </span>
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    shop.pinHash
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-amber-50 text-amber-700'
                  }`}
                >
                  {shop.pinHash
                    ? locale === 'bn'
                      ? 'চালু'
                      : 'ON'
                    : locale === 'bn'
                    ? 'বন্ধ'
                    : 'OFF'}
                </span>
              </button>
            </div>

            {savedPrinter && (
              <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-slate-700">
                  {locale === 'bn' ? 'সেভ করা প্রিন্টার:' : 'Saved Printer:'}{' '}
                  <strong className="font-mono-num">{savedPrinter.name}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSavedPrinter(null);
                    setSavedPrinterState(null);
                  }}
                  className="text-rose-600 font-bold hover:underline cursor-pointer"
                >
                  {locale === 'bn' ? 'মুছুন' : 'Clear'}
                </button>
              </div>
            )}
          </div>

          {/* Complete Business Info Card */}
          <form
            onSubmit={handleSaveShop}
            className="glass-3d-tile rounded-2xl p-5 sm:p-6 space-y-4"
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  {locale === 'bn' ? 'আপনার তথ্য সমূহ' : 'Your Business Details'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {locale === 'bn'
                    ? 'ব্যবসা প্রতিষ্ঠানের নাম, ছবি, NID ও যোগাযোগের তথ্য আপডেট করুন'
                    : 'Update your shop photo, owner details, NID & address'}
                </p>
              </div>

              <div className="relative shrink-0">
                <input
                  ref={shopPhotoRef}
                  type="file"
                  accept="image/*"
                  onChange={handleShopPhotoPick}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => shopPhotoRef.current?.click()}
                  className="w-16 h-16 rounded-full border-2 border-dashed border-slate-300 bg-slate-100 hover:border-[#B91C1C] overflow-hidden flex items-center justify-center relative cursor-pointer"
                  title={locale === 'bn' ? 'দোকানের ছবি পরিবর্তন করুন' : 'Change shop photo'}
                >
                  {photoUrl ? (
                    <img src={photoUrl} alt={shopName} className="w-full h-full object-cover" />
                  ) : (
                    <Store className="w-6 h-6 text-slate-500" />
                  )}
                  <span className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-[#B91C1C] text-white flex items-center justify-center shadow">
                    <Camera className="w-3 h-3" />
                  </span>
                </button>
                {photoUrl && (
                  <button
                    type="button"
                    onClick={() => setPhotoUrl('')}
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center cursor-pointer"
                    title={locale === 'bn' ? 'ছবি সরান' : 'Remove photo'}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            <div className="rounded-xl bg-slate-50/90 border border-slate-200 px-3 py-2 flex items-center justify-between gap-2 text-xs">
              <div className="min-w-0">
                <span className="text-slate-500">UID: </span>
                <span className="font-mono-num font-bold text-slate-800 break-all">
                  {shop.ownerUid}
                </span>
              </div>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(shop.ownerUid);
                    setCopiedUid(true);
                    setTimeout(() => setCopiedUid(false), 1800);
                  } catch {
                    // ignore
                  }
                }}
                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-100 cursor-pointer shrink-0"
              >
                {copiedUid ? (
                  <Check className="w-3 h-3 text-emerald-600" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                <span>
                  {copiedUid
                    ? locale === 'bn'
                      ? 'কপি হয়েছে'
                      : 'Copied'
                    : locale === 'bn'
                    ? 'কপি'
                    : 'Copy'}
                </span>
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {locale === 'bn' ? 'ব্যবসা প্রতিষ্ঠানের নাম *' : 'Business / Shop Name *'}
                </label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-white/90 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {locale === 'bn' ? 'আপনার নাম' : 'Owner Name'}
                  </label>
                  <input
                    type="text"
                    maxLength={100}
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder={locale === 'bn' ? 'মালিকের নাম' : 'Your full name'}
                    className="w-full px-3 py-2.5 text-sm bg-white/90 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {locale === 'bn' ? 'ব্যবসার ধরণ' : 'Business Type'}
                  </label>
                  <select
                    value={businessType}
                    onChange={(e) => setBusinessType(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm bg-white/90 border border-slate-300 rounded-xl"
                  >
                    <option value="">
                      {locale === 'bn' ? 'ব্যবসার ধরণ বেছে নিন' : 'Select business type'}
                    </option>
                    {BUSINESS_TYPES.map((bt) => (
                      <option key={bt} value={bt}>
                        {bt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {locale === 'bn' ? 'মোবাইল নম্বর' : 'Mobile Number'}
                  </label>
                  <input
                    ref={phoneInputRef}
                    type="tel"
                    maxLength={30}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="01XXXXXXXXX"
                    className="w-full px-3 py-2.5 text-sm bg-white/90 border border-slate-300 rounded-xl font-mono-num"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {locale === 'bn' ? 'NID নম্বর' : 'NID Number'}
                  </label>
                  <input
                    type="text"
                    maxLength={40}
                    value={nidNumber}
                    onChange={(e) => setNidNumber(e.target.value)}
                    placeholder="10 / 13 / 17 digit NID"
                    className="w-full px-3 py-2.5 text-sm bg-white/90 border border-slate-300 rounded-xl font-mono-num"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {locale === 'bn'
                      ? 'প্রতিষ্ঠানের আনুমানিক বয়স (বছর)'
                      : 'Business Age (Years)'}
                  </label>
                  <input
                    type="text"
                    maxLength={20}
                    value={businessAgeYears}
                    onChange={(e) => setBusinessAgeYears(e.target.value)}
                    placeholder={locale === 'bn' ? 'যেমন: ৫' : 'e.g. 5'}
                    className="w-full px-3 py-2.5 text-sm bg-white/90 border border-slate-300 rounded-xl font-mono-num"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {locale === 'bn' ? 'সাব-টাইটেল' : 'Subtitle'}
                  </label>
                  <input
                    type="text"
                    maxLength={120}
                    value={shopSubtitle}
                    onChange={(e) => setShopSubtitle(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm bg-white/90 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {locale === 'bn' ? 'ব্যবসা প্রতিষ্ঠানের ঠিকানা' : 'Address'}
                </label>
                <input
                  type="text"
                  maxLength={200}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder={locale === 'bn' ? 'বাজার / রোড, জেলা' : 'Market / Road, City'}
                  className="w-full px-3 py-2.5 text-sm bg-white/90 border border-slate-300 rounded-xl"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={savingProfile}
                className="btn-3d px-6 py-2.5 bg-[#B91C1C] hover:bg-[#991B1B] text-white text-xs font-bold rounded-full cursor-pointer disabled:opacity-60"
              >
                {savingProfile
                  ? locale === 'bn'
                    ? 'সংরক্ষণ হচ্ছে...'
                    : 'Saving...'
                  : locale === 'bn'
                  ? 'নিশ্চিত ও সংরক্ষণ করুন'
                  : 'Confirm & Save'}
              </button>
              {msg && (
                <span className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5">
                  {msg}
                </span>
              )}
              {errorMsg && (
                <span className="text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-1.5">
                  {errorMsg}
                </span>
              )}
            </div>
          </form>
        </div>
      )}

      {reportView === 'security' && (
        <div className="glass-3d-tile rounded-2xl p-6 space-y-4 max-w-xl no-print">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#B91C1C]" />
            <h3 className="text-sm font-bold text-slate-900">
              {locale === 'bn' ? 'খাতা পিন লক নিরাপত্তা' : 'App PIN Lock Security'}
            </h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            {shop.pinHash
              ? locale === 'bn'
                ? 'বর্তমানে পিন লক চালু আছে। আপনি চাইলে নতুন পিন সেট করতে অথবা বন্ধ করতে পারেন।'
                : 'PIN lock is currently active. Enter a new 4–6 digit PIN to change it, or disable below.'
              : locale === 'bn'
              ? 'খাতা লক করার জন্য ৪ থেকে ৬ সংখ্যার পিন সেট করুন।'
              : 'Set a 4–6 digit PIN to lock your khata when stepping away.'}
          </p>

          <form onSubmit={handleSetPin} className="flex items-center gap-2">
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
              placeholder="৪–৬ সংখ্যার পিন"
              className="flex-1 px-3 py-2 text-sm bg-white/90 border border-slate-300 rounded-xl font-mono-num"
            />
            <button
              type="submit"
              className="btn-3d px-4 py-2 bg-[#B91C1C] hover:bg-[#991B1B] text-white text-xs font-bold rounded-xl cursor-pointer whitespace-nowrap"
            >
              {locale === 'bn' ? 'পিন সেট করুন' : 'Set PIN'}
            </button>
          </form>

          {shop.pinHash && (
            <button
              type="button"
              onClick={async () => {
                setMsg(null);
                setErrorMsg(null);
                try {
                  await onSavePinHash(null);
                  setMsg(locale === 'bn' ? 'পিন লক বন্ধ করা হয়েছে।' : 'PIN lock disabled.');
                } catch (err) {
                  setErrorMsg(
                    err instanceof Error
                      ? err.message
                      : locale === 'bn'
                      ? 'পিন লক বন্ধ করতে সমস্যা হয়েছে।'
                      : 'Failed to disable PIN.'
                  );
                }
              }}
              className="text-xs font-semibold text-red-600 hover:underline cursor-pointer"
            >
              {locale === 'bn' ? 'পিন লক বন্ধ করুন' : 'Disable PIN Lock'}
            </button>
          )}

          {msg && (
            <p className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
              {msg}
            </p>
          )}
          {errorMsg && (
            <p className="text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
              {errorMsg}
            </p>
          )}
        </div>
      )}
      {reportView === 'staff' &&
        onSaveStaff &&
        onToggleStaffActive &&
        onDeleteStaff &&
        onDeleteShiftClosing &&
        onOpenOperatorSwitcher && (
          <StaffManagementSection
            locale={locale}
            staffMembers={staffMembers}
            shiftClosings={shiftClosings}
            isStaffSession={isStaffSession}
            onSaveStaff={onSaveStaff}
            onToggleStaffActive={onToggleStaffActive}
            onDeleteStaff={onDeleteStaff}
            onDeleteShiftClosing={onDeleteShiftClosing}
            onOpenOperatorSwitcher={onOpenOperatorSwitcher}
          />
        )}
    </div>
  );
};
