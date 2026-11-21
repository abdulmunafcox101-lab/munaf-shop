import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownUp,
  Award,
  Check,
  MessageSquare,
  MessageSquareShare,
  Minus,
  Pencil,
  Plus,
  Printer,
  Receipt,
  ScanLine,
  Search,
  ShoppingBag,
  ShoppingCart,
  Trash2,
  Truck,
  X,
} from 'lucide-react';
import { Contact, Locale, Product, PurchaseOrder, SaleInvoice } from '../types/shop';
import { tr } from '../lib/i18n';
import { formatTaka } from '../lib/shopService';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { PurchaseOrderModal } from './PurchaseOrderModal';
import { ThermalPrintModal } from './ThermalPrintModal';
import { formatInvoiceForThermalPrinter } from '../lib/thermalPrinter';

interface StockPosTabProps {
  locale: Locale;
  shopName: string;
  shopPhone: string;
  shopAddress: string;
  products: Product[];
  contacts: Contact[];
  invoices: SaleInvoice[];
  purchaseOrders?: PurchaseOrder[];
  canViewProfit?: boolean;
  canDelete?: boolean;
  onSaveProduct: (
    input: {
      name: string;
      code: string;
      category: string;
      purchasePrice: number;
      salePrice: number;
      quantity: number;
      lowStockThreshold: number;
      expiryDate?: string;
    },
    existingId?: string
  ) => Promise<void>;
  onAdjustStock: (product: Product, delta: number) => Promise<void>;
  onDeleteProduct: (productId: string) => Promise<void>;
  onQuickSale: (input: {
    product: Product;
    qty: number;
    unitPrice: number;
    saleMode: 'cash' | 'due';
    contact?: Contact;
    note: string;
  }) => Promise<SaleInvoice>;
  onCartCheckout: (input: {
    cartItems: { product: Product; qty: number; unitPrice: number }[];
    discount: number;
    paymentMode: 'cash' | 'due';
    contact?: Contact;
    customerPhone?: string;
    redeemPoints?: number;
    note: string;
  }) => Promise<SaleInvoice>;
  onDeleteInvoice: (invoiceId: string) => Promise<void>;
  onCreatePurchaseOrder?: (input: {
    supplier?: Contact;
    supplierName: string;
    supplierPhone?: string;
    invoiceRef?: string;
    items: { product: Product; qty: number; unitCost: number }[];
    paymentMode: 'cash' | 'due';
    note?: string;
  }) => Promise<string>;
  onDeletePurchaseOrder?: (poId: string) => Promise<void>;
  onBarcodeAlert?: (message: string, spoken?: string) => void;
}

interface CartRow {
  product: Product;
  qty: number;
  unitPrice: number;
}

function getExpiryStatus(
  expiryDate?: string
): { state: 'none' | 'ok' | 'soon' | 'expired'; daysLeft: number } {
  if (!expiryDate || !/^\d{4}-\d{2}-\d{2}$/.test(expiryDate)) {
    return { state: 'none', daysLeft: 9999 };
  }
  const today = new Date();
  const todayMidnight = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  ).getTime();
  const [y, m, d] = expiryDate.split('-').map(Number);
  const expMidnight = new Date(y, m - 1, d).getTime();
  const daysLeft = Math.round((expMidnight - todayMidnight) / 86400_000);
  if (daysLeft < 0) return { state: 'expired', daysLeft };
  if (daysLeft <= 30) return { state: 'soon', daysLeft };
  return { state: 'ok', daysLeft };
}

export const StockPosTab: React.FC<StockPosTabProps> = ({
  locale,
  shopName,
  shopPhone,
  shopAddress,
  products,
  contacts,
  invoices,
  purchaseOrders = [],
  canViewProfit = true,
  canDelete = true,
  onSaveProduct,
  onAdjustStock,
  onDeleteProduct,
  onQuickSale,
  onCartCheckout,
  onDeleteInvoice,
  onCreatePurchaseOrder,
  onDeletePurchaseOrder,
  onBarcodeAlert,
}) => {
  const [subView, setSubView] = useState<'pos' | 'invoices' | 'purchases'>('pos');
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'expiring'>('all');

  const [showForm, setShowForm] = useState(false);
  const [showPoModal, setShowPoModal] = useState(false);
  const [confirmDeletePoId, setConfirmDeletePoId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Product | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState('Mobile & Telecom');
  const [buyPrice, setBuyPrice] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [qty, setQty] = useState('');
  const [threshold, setThreshold] = useState('5');
  const [expiryDate, setExpiryDate] = useState('');

  const [sellingProduct, setSellingProduct] = useState<Product | null>(null);
  const [saleQty, setSaleQty] = useState('1');
  const [saleUnitPrice, setSaleUnitPrice] = useState('');
  const [saleMode, setSaleMode] = useState<'cash' | 'due'>('cash');
  const [saleContactId, setSaleContactId] = useState('');
  const [saleNote, setSaleNote] = useState('');

  const [adjustProduct, setAdjustProduct] = useState<Product | null>(null);
  const [adjustDelta, setAdjustDelta] = useState('');
  const [adjustType, setAdjustType] = useState<'in' | 'out'>('in');
  const [confirmDeleteProductId, setConfirmDeleteProductId] = useState<string | null>(null);
  const [confirmDeleteInvoiceId, setConfirmDeleteInvoiceId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Multi-item POS Cart state
  const [cart, setCart] = useState<CartRow[]>([]);
  const [showCartDrawer, setShowCartDrawer] = useState(false);
  const [cartDiscount, setCartDiscount] = useState('0');
  const [cartPayMode, setCartPayMode] = useState<'cash' | 'due'>('cash');
  const [cartContactId, setCartContactId] = useState('');
  const [cartPhone, setCartPhone] = useState('');
  const [cartNote, setCartNote] = useState('');
  const [useLoyaltyPoints, setUseLoyaltyPoints] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);

  // Digital Memo / Thermal Receipt Preview Modal
  const [activeReceipt, setActiveReceipt] = useState<SaleInvoice | null>(null);
  const [thermalData, setThermalData] = useState<{
    header: string;
    body58: string;
    body80: string;
  } | null>(null);

  // Camera Barcode Scanner Mode
  const [scannerTarget, setScannerTarget] = useState<'pos' | 'form' | null>(null);
  const [unmatchedScannedCode, setUnmatchedScannedCode] = useState<string | null>(null);

  useEffect(() => {
    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        setShowForm(false);
        setShowPoModal(false);
        setSellingProduct(null);
        setAdjustProduct(null);
        setConfirmDeleteProductId(null);
        setConfirmDeleteInvoiceId(null);
        setConfirmDeletePoId(null);
        setShowCartDrawer(false);
        setActiveReceipt(null);
        setThermalData(null);
        setScannerTarget(null);
        setUnmatchedScannedCode(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const lowCount = useMemo(
    () => products.filter((p) => p.quantity <= p.lowStockThreshold).length,
    [products]
  );

  const expiringCount = useMemo(
    () =>
      products.filter((p) => {
        const exp = getExpiryStatus(p.expiryDate);
        return exp.state === 'expired' || exp.state === 'soon';
      }).length,
    [products]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (stockFilter === 'low' && p.quantity > p.lowStockThreshold) return false;
      if (stockFilter === 'expiring') {
        const exp = getExpiryStatus(p.expiryDate);
        if (exp.state !== 'expired' && exp.state !== 'soon') return false;
      }
      if (q && !p.name.toLowerCase().includes(q) && !p.code.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [products, search, stockFilter]);

  const cartTotalCount = useMemo(
    () => cart.reduce((s, item) => s + item.qty, 0),
    [cart]
  );

  const cartSubtotal = useMemo(
    () => cart.reduce((s, item) => s + item.qty * item.unitPrice, 0),
    [cart]
  );

  const selectedCartContact = useMemo(
    () => contacts.find((c) => c.id === cartContactId),
    [contacts, cartContactId]
  );

  const cartDiscountNum = Math.max(
    0,
    Math.min(cartSubtotal, Number(cartDiscount) || 0)
  );
  const availableLoyaltyPoints = Math.max(
    0,
    Math.floor(selectedCartContact?.loyaltyPoints ?? 0)
  );
  const loyaltyRedeemDiscount =
    useLoyaltyPoints && selectedCartContact
      ? Math.min(availableLoyaltyPoints, Math.floor(Math.max(0, cartSubtotal - cartDiscountNum)))
      : 0;
  const cartNetTotal = Math.max(
    0,
    Number((cartSubtotal - cartDiscountNum - loyaltyRedeemDiscount).toFixed(2))
  );
  const cartCostTotal = useMemo(
    () => cart.reduce((s, item) => s + item.qty * item.product.purchasePrice, 0),
    [cart]
  );

  const stockValuation = useMemo(() => {
    const totalUnits = products.reduce((s, p) => s + p.quantity, 0);
    const totalCost = products.reduce((s, p) => s + p.purchasePrice * p.quantity, 0);
    const totalSale = products.reduce((s, p) => s + p.salePrice * p.quantity, 0);
    return {
      totalUnits,
      totalCost,
      totalSale,
      potentialProfit: totalSale - totalCost,
    };
  }, [products]);

  const addToCart = (product: Product) => {
    if (product.quantity <= 0) {
      onBarcodeAlert?.(
        locale === 'bn'
          ? `${product.name} বর্তমানে স্টকে নেই!`
          : `${product.name} is out of stock!`
      );
      return;
    }
    setCart((prev) => {
      const existing = prev.find((r) => r.product.id === product.id);
      if (existing) {
        if (existing.qty >= product.quantity) return prev;
        return prev.map((r) =>
          r.product.id === product.id ? { ...r, qty: r.qty + 1 } : r
        );
      }
      return [...prev, { product, qty: 1, unitPrice: product.salePrice }];
    });
  };

  const updateCartQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((r) => {
          if (r.product.id !== productId) return r;
          const next = Math.min(r.product.quantity, r.qty + delta);
          return { ...r, qty: next };
        })
        .filter((r) => r.qty > 0)
    );
  };

  const updateCartPrice = (productId: string, price: number) => {
    setCart((prev) =>
      prev.map((r) =>
        r.product.id === productId ? { ...r, unitPrice: Math.max(0, price) } : r
      )
    );
  };

  const openAddEdit = (p?: Product, presetCode?: string) => {
    setSellingProduct(null);
    setAdjustProduct(null);
    setShowCartDrawer(false);
    setFormError(null);
    setEditing(p ?? null);
    setName(p?.name ?? '');
    setCode(p?.code ?? (presetCode ? presetCode.toUpperCase() : ''));
    setCategory(p?.category ?? 'Mobile & Telecom');
    setBuyPrice(p ? String(p.purchasePrice) : '');
    setSellPrice(p ? String(p.salePrice) : '');
    setQty(p ? String(p.quantity) : '0');
    setThreshold(p ? String(p.lowStockThreshold) : '5');
    setExpiryDate(p?.expiryDate ?? '');
    setShowForm(true);
  };

  const handleBarcodeDetected = (scanned: string) => {
    const clean = scanned.trim().toUpperCase();
    if (!clean) return;

    if (scannerTarget === 'form') {
      setCode(clean);
      setScannerTarget(null);
      return;
    }

    setScannerTarget(null);
    const match = products.find((p) => p.code.trim().toUpperCase() === clean);
    if (match) {
      if (match.quantity > 0) {
        addToCart(match);
        setShowCartDrawer(true);
        onBarcodeAlert?.(
          locale === 'bn'
            ? `${match.name} কার্টে যোগ করা হয়েছে।`
            : `Added ${match.name} to cart.`,
          locale === 'bn'
            ? `${match.name} কার্টে যুক্ত হয়েছে।`
            : `${match.name} added to cart.`
        );
      } else {
        setSearch(clean);
        onBarcodeAlert?.(
          locale === 'bn'
            ? `${match.name} পাওয়া গেছে, তবে স্টক ০।`
            : `Found ${match.name}, but stock is 0.`
        );
      }
    } else {
      setUnmatchedScannedCode(clean);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;
    setFormError(null);
    try {
      await onSaveProduct(
        {
          name: name.trim(),
          code: code.trim().toUpperCase(),
          category: category.trim() || 'General',
          purchasePrice: Number(buyPrice) || 0,
          salePrice: Number(sellPrice) || 0,
          quantity: Math.max(0, Math.floor(Number(qty) || 0)),
          lowStockThreshold: Math.max(0, Math.floor(Number(threshold) || 0)),
          expiryDate: expiryDate.trim(),
        },
        editing?.id
      );
      setShowForm(false);
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : locale === 'bn'
          ? 'পণ্য সেভ করতে সমস্যা হয়েছে।'
          : 'Failed to save product.'
      );
    }
  };

  const handleQuickSaleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sellingProduct) return;
    const q = Math.floor(Number(saleQty) || 0);
    const price = Number(saleUnitPrice) || 0;
    if (q <= 0 || q > sellingProduct.quantity || price <= 0) return;

    const contact = contacts.find((c) => c.id === saleContactId);
    if (saleMode === 'due' && !contact) return;

    setFormError(null);
    try {
      const invoice = await onQuickSale({
        product: sellingProduct,
        qty: q,
        unitPrice: price,
        saleMode,
        contact,
        note: saleNote.trim(),
      });
      setSellingProduct(null);
      setActiveReceipt(invoice);
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : locale === 'bn'
          ? 'বিক্রি সম্পন্ন করতে সমস্যা হয়েছে।'
          : 'Failed to complete sale.'
      );
    }
  };

  const handleCartCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    const contact = contacts.find((c) => c.id === cartContactId);
    if (cartPayMode === 'due' && !contact) return;

    setFormError(null);
    setCheckingOut(true);
    try {
      const invoice = await onCartCheckout({
        cartItems: cart,
        discount: cartDiscountNum,
        paymentMode: cartPayMode,
        contact,
        customerPhone: cartPhone.trim() || contact?.phone || '',
        redeemPoints: loyaltyRedeemDiscount,
        note: cartNote.trim(),
      });
      setCart([]);
      setCartDiscount('0');
      setCartPhone('');
      setCartNote('');
      setUseLoyaltyPoints(false);
      setShowCartDrawer(false);
      setActiveReceipt(invoice);
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : locale === 'bn'
          ? 'বিল সম্পন্ন করতে সমস্যা হয়েছে।'
          : 'Checkout failed.'
      );
    } finally {
      setCheckingOut(false);
    }
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustProduct) return;
    const n = Math.floor(Number(adjustDelta) || 0);
    if (n <= 0) return;
    setFormError(null);
    try {
      await onAdjustStock(adjustProduct, adjustType === 'in' ? n : -n);
      setAdjustProduct(null);
      setAdjustDelta('');
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : locale === 'bn'
          ? 'স্টক আপডেট করতে সমস্যা হয়েছে।'
          : 'Failed to update stock.'
      );
    }
  };

  const buildReceiptText = (inv: SaleInvoice) => {
    const dateStr = inv.createdAt
      ? inv.createdAt.toDate().toLocaleString(locale === 'bn' ? 'bn-BD' : 'en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : locale === 'bn'
      ? 'আজ'
      : 'Today';
    const lines = inv.items.map(
      (it, idx) =>
        `${idx + 1}. ${it.name} (${it.qty} × ${formatTaka(it.unitPrice)}) = ${formatTaka(
          it.lineTotal
        )}`
    );
    return [
      `*${shopName}*${shopPhone ? ` (${shopPhone})` : ''}`,
      `${locale === 'bn' ? 'মেমো নং' : 'Memo'}: ${inv.invoiceNo} · ${dateStr}`,
      inv.contactName
        ? `${locale === 'bn' ? 'ক্রেতা' : 'Customer'}: ${inv.contactName}`
        : '',
      '----------------',
      ...lines,
      '----------------',
      inv.discount > 0
        ? `${locale === 'bn' ? 'ছাড়' : 'Discount'}: -${formatTaka(inv.discount)}`
        : '',
      `*${locale === 'bn' ? 'সর্বমোট বিল' : 'Total'}: ${formatTaka(inv.totalAmount)}* (${
        inv.paymentMode === 'cash'
          ? locale === 'bn'
            ? 'নগদ পরিশোধিত'
            : 'Paid Cash'
          : locale === 'bn'
          ? 'বাকি (খাতায়)'
          : 'Due'
      })`,
      locale === 'bn' ? 'ধন্যবাদ, আবার আসবেন।' : 'Thank you for your business!',
    ]
      .filter(Boolean)
      .join('\n');
  };

  const buildWhatsAppReceiptUrl = (inv: SaleInvoice) => {
    const msg = buildReceiptText(inv);
    const digits = (inv.customerPhone ?? '').replace(/\D/g, '');
    const waPhone =
      digits.length >= 10
        ? digits.startsWith('88')
          ? digits
          : `88${digits}`
        : '';
    return `https://wa.me/${waPhone}?text=${encodeURIComponent(msg)}`;
  };

  const buildSmsReceiptUrl = (inv: SaleInvoice) => {
    const msg = buildReceiptText(inv).replace(/\*/g, '');
    const digits = (inv.customerPhone ?? '').replace(/[^\d+]/g, '');
    return `sms:${digits}?body=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="space-y-5 animate-3d-enter">
      <div className="flex flex-wrap items-center justify-between gap-3 no-print">
        <div className="glass-3d-tile rounded-2xl p-1.5 inline-flex items-center gap-1">
          <button
            type="button"
            onClick={() => setSubView('pos')}
            className={`px-4 py-2 text-xs font-bold rounded-xl cursor-pointer transition-all whitespace-nowrap ${
              subView === 'pos'
                ? 'bg-[#B91C1C] text-white shadow-sm'
                : 'text-slate-700 hover:bg-white/80'
            }`}
          >
            {locale === 'bn' ? 'স্টক ও POS কার্ট' : 'Stock & POS'}
          </button>
          <button
            type="button"
            onClick={() => setSubView('invoices')}
            className={`px-4 py-2 text-xs font-bold rounded-xl cursor-pointer transition-all whitespace-nowrap inline-flex items-center gap-1.5 ${
              subView === 'invoices'
                ? 'bg-[#B91C1C] text-white shadow-sm'
                : 'text-slate-700 hover:bg-white/80'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>
              {locale === 'bn'
                ? `মেমো / বিল (${invoices.length})`
                : `Invoices (${invoices.length})`}
            </span>
          </button>
          {onCreatePurchaseOrder && (
            <button
              type="button"
              onClick={() => setSubView('purchases')}
              className={`px-4 py-2 text-xs font-bold rounded-xl cursor-pointer transition-all whitespace-nowrap inline-flex items-center gap-1.5 ${
                subView === 'purchases'
                  ? 'bg-[#B91C1C] text-white shadow-sm'
                  : 'text-slate-700 hover:bg-white/80'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>
                {locale === 'bn'
                  ? `ক্রয় অর্ডার (${purchaseOrders.length})`
                  : `Purchases (${purchaseOrders.length})`}
              </span>
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onCreatePurchaseOrder && (
            <button
              type="button"
              onClick={() => setShowPoModal(true)}
              className="btn-3d inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl cursor-pointer whitespace-nowrap"
            >
              <Truck className="w-4 h-4" />
              <span>{locale === 'bn' ? 'পণ্য ক্রয় / PO' : 'New Purchase'}</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setScannerTarget('pos')}
            className="btn-3d inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl cursor-pointer whitespace-nowrap"
          >
            <ScanLine className="w-4 h-4 text-amber-300" />
            <span>{locale === 'bn' ? 'বারকোড স্ক্যান' : 'Scan Barcode'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setFormError(null);
              setShowCartDrawer(true);
            }}
            className={`btn-3d inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl cursor-pointer whitespace-nowrap ${
              cartTotalCount > 0
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-white border border-slate-300 text-slate-800 hover:bg-slate-50'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>
              {locale === 'bn' ? 'কার্ট / মেমো' : 'Cart'} ({cartTotalCount})
            </span>
          </button>
        </div>
      </div>

      {subView === 'pos' ? (
        <>
          {(lowCount > 0 || expiringCount > 0) && (
            <div className="glass-3d-tile rounded-2xl p-3 flex flex-wrap items-center justify-between gap-2 border border-amber-200 bg-amber-50/70 no-print">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  {locale === 'bn'
                    ? `স্টক সতর্কতা: ${lowCount}টি কম স্টক · ${expiringCount}টি মেয়াদোত্তীর্ণ বা ৩০ দিনের মধ্যে মেয়াদ শেষ`
                    : `Stock Alert: ${lowCount} low stock · ${expiringCount} expired or expiring within 30 days`}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {lowCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setStockFilter('low')}
                    className="px-2.5 py-1 text-[11px] font-bold bg-rose-600 text-white rounded-lg cursor-pointer"
                  >
                    {locale === 'bn' ? 'কম স্টক দেখুন' : 'View Low'}
                  </button>
                )}
                {expiringCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setStockFilter('expiring')}
                    className="px-2.5 py-1 text-[11px] font-bold bg-amber-600 text-white rounded-lg cursor-pointer"
                  >
                    {locale === 'bn' ? 'মেয়াদ দেখুন' : 'View Expiring'}
                  </button>
                )}
              </div>
            </div>
          )}

          <div
            className={`grid grid-cols-1 ${
              canViewProfit ? 'sm:grid-cols-3' : 'sm:grid-cols-2'
            } gap-3 no-print`}
          >
            <div className="glass-3d-tile card-3d-depth rounded-2xl p-4">
              <p className="text-xs font-semibold text-slate-600">
                {locale === 'bn' ? 'মোট পণ্য ও মজুদ' : 'Products & Units'}
              </p>
              <p className="mt-1 text-xl font-bold font-mono-num text-slate-900 text-3d-dark">
                {products.length} · {stockValuation.totalUnits}{' '}
                <span className="text-xs font-sans font-medium text-slate-500">
                  {locale === 'bn' ? 'পিস' : 'units'}
                </span>
              </p>
            </div>
            {canViewProfit && (
              <div className="glass-3d-tile card-3d-depth rounded-2xl p-4">
                <p className="text-xs font-semibold text-slate-600">
                  {locale === 'bn' ? 'মোট স্টক ক্রয়মূল্য' : 'Stock Purchase Value'}
                </p>
                <p className="mt-1 text-xl font-bold font-mono-num text-slate-900 text-3d-dark">
                  {formatTaka(stockValuation.totalCost)}
                </p>
              </div>
            )}
            <div className="glass-3d-tile card-3d-depth rounded-2xl p-4">
              <p className="text-xs font-semibold text-slate-600">
                {canViewProfit
                  ? locale === 'bn'
                    ? 'সম্ভাব্য বিক্রি ও লাভ'
                    : 'Sale Value & Est. Profit'
                  : locale === 'bn'
                  ? 'মোট স্টক বিক্রয়মূল্য'
                  : 'Stock Sale Value'}
              </p>
              <p className="mt-1 text-xl font-bold font-mono-num text-emerald-700 text-3d-emerald">
                {formatTaka(stockValuation.totalSale)}
              </p>
            </div>
          </div>

          <div className="glass-3d-tile rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 no-print">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={
                  locale === 'bn'
                    ? 'পণ্যের নাম বা বারকোড খুঁজুন...'
                    : 'Search product name or code...'
                }
                className="w-full pl-9 pr-8 py-2 text-sm bg-white/85 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B91C1C]"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="p-1 text-slate-400 hover:text-slate-700 absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setStockFilter((v) => (v === 'low' ? 'all' : 'low'))}
                className={`px-3 py-2 text-xs font-semibold rounded-xl border cursor-pointer whitespace-nowrap ${
                  stockFilter === 'low'
                    ? 'bg-red-50/90 border-red-300 text-red-700'
                    : 'bg-white/85 border-slate-200 text-slate-700 hover:bg-white'
                }`}
              >
                {locale === 'bn' ? 'কম স্টক' : 'Low Stock'} ({lowCount})
              </button>

              <button
                type="button"
                onClick={() =>
                  setStockFilter((v) => (v === 'expiring' ? 'all' : 'expiring'))
                }
                className={`px-3 py-2 text-xs font-semibold rounded-xl border cursor-pointer whitespace-nowrap inline-flex items-center gap-1 ${
                  stockFilter === 'expiring'
                    ? 'bg-amber-50 border-amber-300 text-amber-800'
                    : 'bg-white/85 border-slate-200 text-slate-700 hover:bg-white'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>
                  {locale === 'bn' ? 'মেয়াদ সতর্কতা' : 'Expiring'} ({expiringCount})
                </span>
              </button>

              <button
                type="button"
                onClick={() => openAddEdit()}
                className="btn-3d inline-flex items-center gap-1.5 px-4 py-2 bg-[#B91C1C] hover:bg-[#991B1B] text-white text-xs font-bold rounded-xl cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>{locale === 'bn' ? 'নতুন পণ্য' : 'Add Product'}</span>
              </button>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="glass-3d-tile rounded-2xl p-10 text-center space-y-3 no-print">
              <p className="text-sm text-slate-500">{tr(locale, 'no_products')}</p>
              <button
                type="button"
                onClick={() => openAddEdit()}
                className="btn-3d inline-flex items-center gap-1.5 px-4 py-2 bg-[#B91C1C] text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{locale === 'bn' ? 'প্রথম পণ্য যোগ করুন' : 'Add First Product'}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2.5 no-print">
              <div className="hidden md:grid grid-cols-12 px-4 py-1 text-xs font-semibold text-slate-600">
                <span className={canViewProfit ? 'col-span-4' : 'col-span-6'}>
                  {locale === 'bn' ? 'পণ্য' : 'Product'}
                </span>
                {canViewProfit && (
                  <span className="col-span-2 text-right">
                    {locale === 'bn' ? 'কেনা দাম' : 'Buy'}
                  </span>
                )}
                <span className="col-span-2 text-right">
                  {locale === 'bn' ? 'বিক্রি দাম' : 'Sell'}
                </span>
                <span className="col-span-1 text-right">
                  {locale === 'bn' ? 'স্টক' : 'Stock'}
                </span>
                <span className="col-span-3 text-right">
                  {locale === 'bn' ? 'অ্যাকশন' : 'Actions'}
                </span>
              </div>

              {filtered.map((p) => {
                const isLow = p.quantity <= p.lowStockThreshold;
                const exp = getExpiryStatus(p.expiryDate);
                const inCart = cart.find((r) => r.product.id === p.id);
                return (
                  <div
                    key={p.id}
                    className="glass-3d-tile rounded-2xl px-4 py-3.5 grid grid-cols-1 md:grid-cols-12 items-center gap-2.5 md:gap-3 text-sm"
                  >
                    <div
                      className={`${
                        canViewProfit ? 'md:col-span-4' : 'md:col-span-6'
                      } min-w-0 space-y-0.5`}
                    >
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-semibold text-slate-900 truncate">{p.name}</p>
                        {exp.state === 'expired' && (
                          <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 text-[10px] font-extrabold">
                            {locale === 'bn' ? 'মেয়াদোত্তীর্ণ' : 'Expired'}
                          </span>
                        )}
                        {exp.state === 'soon' && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-extrabold">
                            {locale === 'bn'
                              ? `${exp.daysLeft} দিন বাকি`
                              : `${exp.daysLeft}d left`}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 font-mono-num truncate">
                        {p.code} · {p.category}
                        {p.expiryDate ? ` · Exp: ${p.expiryDate}` : ''}
                      </p>
                    </div>

                    {canViewProfit && (
                      <div className="md:col-span-2 flex md:block justify-between text-xs sm:text-sm text-slate-600 md:text-right font-mono-num">
                        <span className="md:hidden font-sans text-slate-500">
                          {locale === 'bn' ? 'কেনা:' : 'Buy:'}
                        </span>
                        <span>{formatTaka(p.purchasePrice)}</span>
                      </div>
                    )}

                    <div className="md:col-span-2 flex md:block justify-between text-xs sm:text-sm font-semibold text-slate-900 md:text-right font-mono-num">
                      <span className="md:hidden font-sans font-normal text-slate-500">
                        {locale === 'bn' ? 'বিক্রি:' : 'Sell:'}
                      </span>
                      <span>{formatTaka(p.salePrice)}</span>
                    </div>

                    <div
                      className={`md:col-span-1 flex md:block justify-between font-bold md:text-right font-mono-num ${
                        isLow ? 'text-red-600' : 'text-slate-900'
                      }`}
                    >
                      <span className="md:hidden font-sans font-normal text-slate-500">
                        {locale === 'bn' ? 'মজুদ:' : 'Stock:'}
                      </span>
                      <span>{p.quantity}</span>
                    </div>

                    <div className="md:col-span-3 flex flex-wrap items-center justify-end gap-1 pt-1 md:pt-0 border-t md:border-t-0 border-slate-200/60">
                      <button
                        type="button"
                        disabled={p.quantity <= 0}
                        onClick={() => addToCart(p)}
                        className="inline-flex items-center gap-1 px-2 py-1.5 text-[11px] font-bold text-[#B91C1C] bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg cursor-pointer disabled:opacity-40 whitespace-nowrap"
                      >
                        <ShoppingCart className="w-3 h-3" />
                        <span>
                          {inCart
                            ? `+${inCart.qty}`
                            : locale === 'bn'
                            ? '+কার্ট'
                            : '+Cart'}
                        </span>
                      </button>

                      <button
                        type="button"
                        disabled={p.quantity <= 0}
                        onClick={() => {
                          setShowForm(false);
                          setAdjustProduct(null);
                          setFormError(null);
                          setSellingProduct(p);
                          setSaleQty('1');
                          setSaleUnitPrice(String(p.salePrice));
                          setSaleMode('cash');
                          setSaleContactId('');
                          setSaleNote('');
                        }}
                        className="btn-3d inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-white bg-[#16A34A] hover:bg-[#15803D] rounded-lg cursor-pointer disabled:opacity-40 whitespace-nowrap"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>{locale === 'bn' ? 'বিক্রি' : 'Sell'}</span>
                      </button>

                      <button
                        type="button"
                        title={locale === 'bn' ? 'স্টক ইন/আউট' : 'Stock In/Out'}
                        onClick={() => {
                          setShowForm(false);
                          setSellingProduct(null);
                          setFormError(null);
                          setAdjustProduct(p);
                          setAdjustDelta('');
                          setAdjustType('in');
                        }}
                        className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                      >
                        <ArrowDownUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => openAddEdit(p)}
                        className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {canDelete &&
                        (confirmDeleteProductId === p.id ? (
                          <button
                            type="button"
                            onClick={() => {
                              setConfirmDeleteProductId(null);
                              void onDeleteProduct(p.id);
                            }}
                            className="px-2 py-1 text-[10px] font-bold bg-rose-600 text-white rounded-lg cursor-pointer inline-flex items-center gap-1"
                          >
                            <Check className="w-3 h-3" />
                            <span>{locale === 'bn' ? 'নিশ্চিত' : 'Confirm'}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteProductId(p.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg cursor-pointer"
                            aria-label="Delete product"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : subView === 'invoices' ? (
        <div className="space-y-3 no-print">
          {invoices.length === 0 ? (
            <div className="glass-3d-tile rounded-2xl p-10 text-center space-y-2">
              <Receipt className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold text-slate-500">
                {locale === 'bn'
                  ? 'এখনো কোনো বিক্রির মেমো তৈরি হয়নি।'
                  : 'No sales invoices created yet.'}
              </p>
            </div>
          ) : (
            invoices.map((inv) => {
              const dtStr = inv.createdAt
                ? inv.createdAt.toDate().toLocaleString(locale === 'bn' ? 'bn-BD' : 'en-GB', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : locale === 'bn'
                ? 'এইমাত্র'
                : 'Just now';
              const isConfirmDel = confirmDeleteInvoiceId === inv.id;
              return (
                <div
                  key={inv.id}
                  className="glass-3d-tile rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono-num text-xs font-extrabold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                        {inv.invoiceNo}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          inv.paymentMode === 'cash'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {inv.paymentMode === 'cash'
                          ? locale === 'bn'
                            ? 'নগদ'
                            : 'Cash'
                          : locale === 'bn'
                          ? 'বাকি'
                          : 'Due'}
                      </span>
                      {inv.contactName && (
                        <span className="text-xs font-semibold text-slate-700">
                          {inv.contactName}
                        </span>
                      )}
                      <span className="text-[11px] text-slate-500 font-mono-num">
                        {dtStr}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 truncate">
                      {inv.items.map((it) => `${it.name} × ${it.qty}`).join(', ')}
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    <div className="text-left sm:text-right">
                      <p className="text-base font-extrabold font-mono-num text-slate-900">
                        {formatTaka(inv.totalAmount)}
                      </p>
                      {canViewProfit && (
                        <p className="text-[11px] font-bold font-mono-num text-emerald-700">
                          {locale === 'bn' ? 'লাভ:' : 'Profit:'} {formatTaka(inv.profitAmount)}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setActiveReceipt(inv)}
                        className="btn-3d inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-slate-900 text-white rounded-xl cursor-pointer"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        <span>{locale === 'bn' ? 'মেমো দেখুন' : 'Memo'}</span>
                      </button>

                      {canDelete &&
                        (isConfirmDel ? (
                          <button
                            type="button"
                            onClick={() => {
                              setConfirmDeleteInvoiceId(null);
                              void onDeleteInvoice(inv.id);
                            }}
                            className="px-2 py-1.5 text-[10px] font-bold bg-rose-600 text-white rounded-lg cursor-pointer inline-flex items-center gap-0.5"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteInvoiceId(inv.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                            aria-label="Delete invoice"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ))}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="space-y-3 no-print">
          {purchaseOrders.length === 0 ? (
            <div className="glass-3d-tile rounded-2xl p-10 text-center space-y-3">
              <Truck className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold text-slate-500">
                {locale === 'bn'
                  ? 'এখনো কোনো সাপ্লায়ার ক্রয় অর্ডার (PO) তৈরি হয়নি।'
                  : 'No supplier purchase orders recorded yet.'}
              </p>
              {onCreatePurchaseOrder && (
                <button
                  type="button"
                  onClick={() => setShowPoModal(true)}
                  className="btn-3d inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{locale === 'bn' ? 'প্রথম ক্রয় অর্ডার করুন' : 'Create Purchase Order'}</span>
                </button>
              )}
            </div>
          ) : (
            purchaseOrders.map((po) => {
              const dtStr = po.createdAt
                ? po.createdAt.toDate().toLocaleString(locale === 'bn' ? 'bn-BD' : 'en-GB', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : locale === 'bn'
                ? 'এইমাত্র'
                : 'Just now';
              const isConfirmDel = confirmDeletePoId === po.id;
              return (
                <div
                  key={po.id}
                  className="glass-3d-tile rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-extrabold text-slate-900">
                        {po.supplierName}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          po.paymentMode === 'cash'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {po.paymentMode === 'cash'
                          ? locale === 'bn'
                            ? 'নগদ ক্রয়'
                            : 'Paid Cash'
                          : locale === 'bn'
                          ? 'বাকি (সাপ্লায়ার দেবো)'
                          : 'On Credit'}
                      </span>
                      {po.invoiceRef && (
                        <span className="text-[11px] font-mono-num text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                          #{po.invoiceRef}
                        </span>
                      )}
                      <span className="text-[11px] text-slate-500 font-mono-num">
                        {dtStr}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 truncate">
                      {po.items.map((it) => `${it.name} × ${it.qty}`).join(', ')}
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    <p className="text-base font-extrabold font-mono-num text-slate-900">
                      {formatTaka(po.totalAmount)}
                    </p>
                    {canDelete &&
                      onDeletePurchaseOrder &&
                      (isConfirmDel ? (
                        <button
                          type="button"
                          onClick={() => {
                            setConfirmDeletePoId(null);
                            void onDeletePurchaseOrder(po.id);
                          }}
                          className="px-2 py-1.5 text-[10px] font-bold bg-rose-600 text-white rounded-lg cursor-pointer inline-flex items-center gap-0.5"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeletePoId(po.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                          aria-label="Delete purchase order"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {showCartDrawer && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-md flex items-center justify-center p-4 no-print"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCartDrawer(false);
          }}
        >
          <form
            onSubmit={handleCartCheckoutSubmit}
            className="w-full max-w-lg glass-3d-tile rounded-3xl p-5 sm:p-6 bg-white space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-[#B91C1C]" />
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    {locale === 'bn' ? 'POS বিলিং কার্ট' : 'POS Billing Cart'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {locale === 'bn'
                      ? 'একাধিক পণ্য একসাথে বিল ও মেমো তৈরি করুন'
                      : 'Checkout multiple products with digital receipt'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setScannerTarget('pos')}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-900 text-white text-[11px] font-bold rounded-lg cursor-pointer"
                >
                  <ScanLine className="w-3.5 h-3.5 text-amber-300" />
                  <span>{locale === 'bn' ? 'স্ক্যান' : 'Scan'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowCartDrawer(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {cart.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <ShoppingCart className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-semibold text-slate-500">
                  {locale === 'bn'
                    ? 'কার্ট খালি! পণ্যের "+কার্ট" বাটনে চাপ দিন অথবা বারকোড স্ক্যান করুন।'
                    : 'Cart is empty. Tap +Cart on products or scan a barcode.'}
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {cart.map((item) => (
                    <div
                      key={item.product.id}
                      className="rounded-2xl bg-slate-50 border border-slate-200/80 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {item.product.name}
                        </p>
                        <p className="text-[11px] text-slate-500 font-mono-num">
                          {locale === 'bn' ? 'মজুদ:' : 'Stock:'} {item.product.quantity}
                        </p>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-2">
                        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-1 py-0.5">
                          <button
                            type="button"
                            onClick={() => updateCartQty(item.product.id, -1)}
                            className="p-1 text-slate-600 hover:text-rose-600 cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-bold font-mono-num w-6 text-center">
                            {item.qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateCartQty(item.product.id, 1)}
                            disabled={item.qty >= item.product.quantity}
                            className="p-1 text-slate-600 hover:text-emerald-600 cursor-pointer disabled:opacity-40"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) =>
                            updateCartPrice(item.product.id, Number(e.target.value) || 0)
                          }
                          className="w-20 px-2 py-1 text-xs font-mono-num font-bold bg-white border border-slate-200 rounded-lg text-right"
                        />

                        <span className="text-xs font-extrabold font-mono-num text-slate-900 w-16 text-right">
                          {formatTaka(item.qty * item.unitPrice)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setCartPayMode('cash')}
                    className={`py-2 text-xs font-bold rounded-lg cursor-pointer ${
                      cartPayMode === 'cash'
                        ? 'bg-white text-emerald-700 shadow-sm'
                        : 'text-slate-600'
                    }`}
                  >
                    {locale === 'bn' ? 'নগদ (ক্যাশবই)' : 'Cash Sale'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCartPayMode('due')}
                    className={`py-2 text-xs font-bold rounded-lg cursor-pointer ${
                      cartPayMode === 'due'
                        ? 'bg-white text-rose-700 shadow-sm'
                        : 'text-slate-600'
                    }`}
                  >
                    {locale === 'bn' ? 'বাকি (টালিখাতা)' : 'Due Sale (Khata)'}
                  </button>
                </div>

                {cartPayMode === 'due' ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {locale === 'bn' ? 'ক্রেতা নির্বাচন করুন *' : 'Select Customer *'}
                    </label>
                    {contacts.length === 0 ? (
                      <p className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs font-medium text-amber-900">
                        {locale === 'bn'
                          ? 'বাকিতে বিলের জন্য আগে টালি ট্যাব থেকে একজন ক্রেতা যোগ করুন।'
                          : 'Add a customer in Tally first for due billing.'}
                      </p>
                    ) : (
                      <select
                        required
                        value={cartContactId}
                        onChange={(e) => {
                          setCartContactId(e.target.value);
                          const c = contacts.find((x) => x.id === e.target.value);
                          if (c?.phone) setCartPhone(c.phone);
                        }}
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl"
                      >
                        <option value="">
                          {locale === 'bn' ? '-- ক্রেতা বেছে নিন --' : '-- Select party --'}
                        </option>
                        {contacts.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.phone || c.contactType})
                            {(c.loyaltyPoints ?? 0) > 0 ? ` · ${c.loyaltyPoints} pts` : ''}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {contacts.length > 0 && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          {locale === 'bn'
                            ? 'ক্রেতা সিলেক্ট করুন (লয়্যালটি পয়েন্টের জন্য — ঐচ্ছিক)'
                            : 'Select Customer (Optional, for Loyalty Points)'}
                        </label>
                        <select
                          value={cartContactId}
                          onChange={(e) => {
                            setCartContactId(e.target.value);
                            setUseLoyaltyPoints(false);
                            const c = contacts.find((x) => x.id === e.target.value);
                            if (c?.phone) setCartPhone(c.phone);
                          }}
                          className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl"
                        >
                          <option value="">
                            {locale === 'bn' ? '-- নগদ সাধারণ ক্রেতা --' : '-- Walk-in Customer --'}
                          </option>
                          {contacts.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} ({c.phone || c.contactType})
                              {(c.loyaltyPoints ?? 0) > 0 ? ` · ${c.loyaltyPoints} pts` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        {locale === 'bn'
                          ? 'ক্রেতার মোবাইল (মেমো পাঠাতে — ঐচ্ছিক)'
                          : 'Customer Mobile (Optional, for WhatsApp/SMS)'}
                      </label>
                      <input
                        type="tel"
                        maxLength={30}
                        placeholder="01XXXXXXXXX"
                        value={cartPhone}
                        onChange={(e) => setCartPhone(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl font-mono-num"
                      />
                    </div>
                  </div>
                )}

                {selectedCartContact && availableLoyaltyPoints > 0 && (
                  <label className="flex items-center justify-between gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs font-bold text-amber-900 cursor-pointer">
                    <span className="inline-flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-amber-600" />
                      <span>
                        {locale === 'bn'
                          ? `পয়েন্ট ছাড় ব্যবহার (${availableLoyaltyPoints} pts = ৳${availableLoyaltyPoints})`
                          : `Redeem Loyalty Points (${availableLoyaltyPoints} pts)`}
                      </span>
                    </span>
                    <input
                      type="checkbox"
                      checked={useLoyaltyPoints}
                      onChange={(e) => setUseLoyaltyPoints(e.target.checked)}
                      className="accent-amber-600 w-4 h-4"
                    />
                  </label>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {locale === 'bn' ? 'ছাড় / ডিসকাউন্ট (৳)' : 'Discount (৳)'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={cartSubtotal}
                      step="0.01"
                      value={cartDiscount}
                      onChange={(e) => setCartDiscount(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl font-mono-num"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {locale === 'bn' ? 'নোট (ঐচ্ছিক)' : 'Note'}
                    </label>
                    <input
                      type="text"
                      maxLength={300}
                      value={cartNote}
                      onChange={(e) => setCartNote(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl"
                    />
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-900 text-white p-4 space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-300">
                    <span>{locale === 'bn' ? 'মোট মূল্য' : 'Subtotal'}</span>
                    <span className="font-mono-num">{formatTaka(cartSubtotal)}</span>
                  </div>
                  {(cartDiscountNum > 0 || loyaltyRedeemDiscount > 0) && (
                    <div className="flex justify-between text-xs text-amber-300">
                      <span>
                        {loyaltyRedeemDiscount > 0
                          ? locale === 'bn'
                            ? 'ছাড় + পয়েন্ট রিডিম'
                            : 'Discount + Points'
                          : locale === 'bn'
                          ? 'ছাড়'
                          : 'Discount'}
                      </span>
                      <span className="font-mono-num">
                        -{formatTaka(cartDiscountNum + loyaltyRedeemDiscount)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-extrabold pt-1 border-t border-white/15">
                    <span>{locale === 'bn' ? 'সর্বমোট বিল' : 'Grand Total'}</span>
                    <span className="font-mono-num text-emerald-300">
                      {formatTaka(cartNetTotal)}
                    </span>
                  </div>
                  {canViewProfit && (
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>{locale === 'bn' ? 'সম্ভাব্য লাভ' : 'Estimated Profit'}</span>
                      <span className="font-mono-num text-emerald-400">
                        {formatTaka(cartNetTotal - cartCostTotal)}
                      </span>
                    </div>
                  )}
                </div>

                {formError && (
                  <p className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700">
                    {formError}
                  </p>
                )}

                <div className="flex items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setCart([])}
                    className="px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl cursor-pointer"
                  >
                    {locale === 'bn' ? 'কার্ট খালি করুন' : 'Clear Cart'}
                  </button>
                  <button
                    type="submit"
                    disabled={
                      checkingOut ||
                      cart.length === 0 ||
                      (cartPayMode === 'due' && contacts.length === 0)
                    }
                    className="btn-3d px-5 py-2.5 text-xs font-extrabold text-white bg-[#16A34A] hover:bg-[#15803D] rounded-xl cursor-pointer disabled:opacity-50"
                  >
                    {checkingOut
                      ? locale === 'bn'
                        ? 'সেভ হচ্ছে...'
                        : 'Saving...'
                      : locale === 'bn'
                      ? 'বিল সম্পন্ন ও মেমো তৈরি'
                      : 'Complete Sale & Memo'}
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      )}

      {activeReceipt && (
        <div
          className="fixed inset-0 z-[70] bg-slate-900/55 backdrop-blur-md flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveReceipt(null);
          }}
        >
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between no-print">
              <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                {locale === 'bn' ? 'ডিজিটাল বিক্রয় মেমো' : 'Digital Sales Memo'}
              </span>
              <button
                type="button"
                onClick={() => setActiveReceipt(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-center border-b border-dashed border-slate-300 pb-3 space-y-0.5">
              <h3 className="text-lg font-extrabold text-slate-900">{shopName}</h3>
              {shopAddress && <p className="text-[11px] text-slate-500">{shopAddress}</p>}
              {shopPhone && (
                <p className="text-xs font-mono-num text-slate-700">{shopPhone}</p>
              )}
              <div className="pt-1.5 flex items-center justify-between text-[11px] text-slate-600 font-mono-num">
                <span>{activeReceipt.invoiceNo}</span>
                <span>
                  {activeReceipt.createdAt
                    ? activeReceipt.createdAt
                        .toDate()
                        .toLocaleString(locale === 'bn' ? 'bn-BD' : 'en-GB', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                    : ''}
                </span>
              </div>
              {activeReceipt.contactName && (
                <p className="text-xs font-semibold text-slate-800 pt-1">
                  {locale === 'bn' ? 'ক্রেতা:' : 'Customer:'} {activeReceipt.contactName}
                </p>
              )}
            </div>

            <div className="space-y-2 text-xs">
              {activeReceipt.items.map((it, idx) => (
                <div key={`${it.productId}_${idx}`} className="flex justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{it.name}</p>
                    <p className="text-[11px] text-slate-500 font-mono-num">
                      {it.qty} × {formatTaka(it.unitPrice)}
                    </p>
                  </div>
                  <span className="font-bold font-mono-num text-slate-900 shrink-0">
                    {formatTaka(it.lineTotal)}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-dashed border-slate-300 pt-3 space-y-1 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>{locale === 'bn' ? 'সাবটোটাল' : 'Subtotal'}</span>
                <span className="font-mono-num">{formatTaka(activeReceipt.subtotal)}</span>
              </div>
              {activeReceipt.discount > 0 && (
                <div className="flex justify-between text-amber-700">
                  <span>{locale === 'bn' ? 'ছাড়' : 'Discount'}</span>
                  <span className="font-mono-num">-{formatTaka(activeReceipt.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-extrabold text-slate-900 pt-1">
                <span>{locale === 'bn' ? 'সর্বমোট' : 'Total'}</span>
                <span className="font-mono-num">{formatTaka(activeReceipt.totalAmount)}</span>
              </div>
              <p className="text-[11px] text-center font-bold text-slate-600 pt-1">
                {activeReceipt.paymentMode === 'cash'
                  ? locale === 'bn'
                    ? 'পেমেন্ট স্ট্যাটাস: নগদ পরিশোধিত'
                    : 'Status: Paid in Cash'
                  : locale === 'bn'
                  ? 'পেমেন্ট স্ট্যাটাস: বাকি (খাতায় যোগ)'
                  : 'Status: Recorded as Due'}
              </p>
              {((activeReceipt.loyaltyEarned ?? 0) > 0 ||
                (activeReceipt.loyaltyRedeemed ?? 0) > 0) && (
                <p className="text-[11px] text-center font-bold text-amber-700 bg-amber-50 rounded-lg py-1">
                  {(activeReceipt.loyaltyEarned ?? 0) > 0
                    ? locale === 'bn'
                      ? `নতুন লয়্যালটি পয়েন্ট: +${activeReceipt.loyaltyEarned} pts`
                      : `Earned: +${activeReceipt.loyaltyEarned} pts`
                    : ''}
                  {(activeReceipt.loyaltyRedeemed ?? 0) > 0
                    ? ` · ${locale === 'bn' ? 'ব্যবহৃত' : 'Used'}: ${activeReceipt.loyaltyRedeemed} pts`
                    : ''}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 no-print">
              <button
                type="button"
                onClick={() => {
                  const s58 = formatInvoiceForThermalPrinter(
                    activeReceipt,
                    { shopName, phone: shopPhone, address: shopAddress },
                    58,
                    locale
                  );
                  const s80 = formatInvoiceForThermalPrinter(
                    activeReceipt,
                    { shopName, phone: shopPhone, address: shopAddress },
                    80,
                    locale
                  );
                  setThermalData({
                    header: s58.header,
                    body58: s58.body,
                    body80: s80.body,
                  });
                }}
                className="flex items-center justify-center gap-1 py-2 px-2 text-xs font-bold bg-[#B91C1C] text-white rounded-xl cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{locale === 'bn' ? 'থার্মাল' : 'Thermal'}</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center justify-center gap-1 py-2 px-2 text-xs font-bold bg-slate-900 text-white rounded-xl cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{locale === 'bn' ? 'প্রিন্ট' : 'Print'}</span>
              </button>
              <a
                href={buildWhatsAppReceiptUrl(activeReceipt)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1 py-2 px-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
              >
                <MessageSquareShare className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </a>
              <a
                href={buildSmsReceiptUrl(activeReceipt)}
                className="flex items-center justify-center gap-1 py-2 px-2 text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white rounded-xl"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>SMS</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {unmatchedScannedCode && (
        <div
          className="fixed inset-0 z-[72] bg-slate-900/50 backdrop-blur-md flex items-center justify-center p-4 no-print"
          onClick={(e) => {
            if (e.target === e.currentTarget) setUnmatchedScannedCode(null);
          }}
        >
          <div className="w-full max-w-sm glass-3d-tile rounded-2xl p-5 bg-white space-y-3 text-center">
            <ScanLine className="w-8 h-8 text-[#B91C1C] mx-auto" />
            <h3 className="text-sm font-extrabold text-slate-900">
              {locale === 'bn'
                ? 'এই বারকোডের পণ্য স্টকে নেই'
                : 'Barcode Not Found in Stock'}
            </h3>
            <p className="text-xs font-mono-num font-bold bg-slate-100 rounded-lg py-1.5 px-3 text-slate-800">
              {unmatchedScannedCode}
            </p>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setUnmatchedScannedCode(null)}
                className="flex-1 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl cursor-pointer"
              >
                {tr(locale, 'cancel')}
              </button>
              <button
                type="button"
                onClick={() => {
                  const scanned = unmatchedScannedCode;
                  setUnmatchedScannedCode(null);
                  openAddEdit(undefined, scanned);
                }}
                className="flex-1 btn-3d py-2 text-xs font-bold text-white bg-[#B91C1C] rounded-xl cursor-pointer"
              >
                {locale === 'bn' ? 'নতুন পণ্য হিসেবে যোগ' : 'Add New Product'}
              </button>
            </div>
          </div>
        </div>
      )}

      {scannerTarget && (
        <BarcodeScannerModal
          locale={locale}
          onDetected={handleBarcodeDetected}
          onClose={() => setScannerTarget(null)}
        />
      )}

      {showForm && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-md flex items-center justify-center p-4 no-print"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowForm(false);
          }}
        >
          <form
            onSubmit={handleSave}
            className="w-full max-w-md glass-3d-tile rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-bold text-slate-900">
                {editing
                  ? locale === 'bn'
                    ? 'পণ্য এডিট করুন'
                    : 'Edit Product'
                  : locale === 'bn'
                  ? 'নতুন পণ্য যোগ করুন'
                  : 'Add Product'}
              </h3>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {locale === 'bn' ? 'পণ্যের নাম *' : 'Product Name *'}
                </label>
                <input
                  type="text"
                  required
                  maxLength={120}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {locale === 'bn' ? 'কোড / বারকোড *' : 'Code / Barcode *'}
                  </label>
                  <div className="flex gap-1">
                    <input
                      type="text"
                      required
                      maxLength={40}
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono-num"
                    />
                    <button
                      type="button"
                      onClick={() => setScannerTarget('form')}
                      title={locale === 'bn' ? 'বারকোড স্ক্যান' : 'Scan'}
                      className="px-2.5 py-2 bg-slate-900 text-amber-300 rounded-lg cursor-pointer shrink-0"
                    >
                      <ScanLine className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {locale === 'bn' ? 'ক্যাটাগরি' : 'Category'}
                  </label>
                  <input
                    type="text"
                    maxLength={60}
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {locale === 'bn' ? 'কেনা দাম (৳)' : 'Purchase Price (৳)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={buyPrice}
                    onChange={(e) => setBuyPrice(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono-num"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {locale === 'bn' ? 'বিক্রি দাম (৳) *' : 'Sale Price (৳) *'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={sellPrice}
                    onChange={(e) => setSellPrice(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono-num"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {locale === 'bn' ? 'পরিমাণ' : 'Quantity'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono-num"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {locale === 'bn' ? 'কম স্টক সতর্কতা' : 'Low Alert'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono-num"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {locale === 'bn'
                    ? 'মেয়াদ উত্তীর্ণের তারিখ (ঐচ্ছিক)'
                    : 'Expiry Date (Optional)'}
                </label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono-num"
                />
              </div>
            </div>
            {formError && (
              <p className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700">
                {formError}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                {tr(locale, 'cancel')}
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-white bg-[#B91C1C] hover:bg-[#991B1B] rounded-lg cursor-pointer"
              >
                {tr(locale, 'save')}
              </button>
            </div>
          </form>
        </div>
      )}

      {sellingProduct && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-md flex items-center justify-center p-4 no-print"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSellingProduct(null);
          }}
        >
          <form
            onSubmit={handleQuickSaleSubmit}
            className="w-full max-w-md glass-3d-tile rounded-2xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-bold text-slate-900">
                {locale === 'bn' ? 'বিক্রি করুন' : 'Quick Sale'} · {sellingProduct.name}
              </h3>
              <button
                type="button"
                onClick={() => setSellingProduct(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setSaleMode('cash')}
                className={`py-2 text-xs font-bold rounded-md cursor-pointer ${
                  saleMode === 'cash'
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-slate-600'
                }`}
              >
                {locale === 'bn' ? 'নগদ বিক্রি (ক্যাশবই)' : 'Cash Sale'}
              </button>
              <button
                type="button"
                onClick={() => setSaleMode('due')}
                className={`py-2 text-xs font-bold rounded-md cursor-pointer ${
                  saleMode === 'due'
                    ? 'bg-white text-red-700 shadow-sm'
                    : 'text-slate-600'
                }`}
              >
                {locale === 'bn' ? 'বাকিতে বিক্রি (টালিখাতা)' : 'Due Sale (Khata)'}
              </button>
            </div>

            {saleMode === 'due' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {locale === 'bn' ? 'ক্রেতা নির্বাচন করুন *' : 'Select Customer *'}
                </label>
                {contacts.length === 0 ? (
                  <p className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs font-medium text-amber-900">
                    {locale === 'bn'
                      ? 'বাকিতে বিক্রির জন্য আগে টালি ট্যাব থেকে একজন ক্রেতা যোগ করুন।'
                      : 'Add a customer in the Tally tab first to record a due sale.'}
                  </p>
                ) : (
                  <select
                    required
                    value={saleContactId}
                    onChange={(e) => setSaleContactId(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                  >
                    <option value="">
                      {locale === 'bn' ? '-- ক্রেতা বেছে নিন --' : '-- Select party --'}
                    </option>
                    {contacts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.phone || c.contactType})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {locale === 'bn'
                    ? `পরিমাণ (মজুদ: ${sellingProduct.quantity})`
                    : `Qty (Stock: ${sellingProduct.quantity})`}
                </label>
                <input
                  type="number"
                  min="1"
                  max={sellingProduct.quantity}
                  required
                  value={saleQty}
                  onChange={(e) => setSaleQty(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono-num"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {locale === 'bn' ? 'একক দাম (৳)' : 'Unit Price (৳)'}
                </label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  required
                  value={saleUnitPrice}
                  onChange={(e) => setSaleUnitPrice(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono-num"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {locale === 'bn' ? 'নোট (ঐচ্ছিক)' : 'Note (Optional)'}
              </label>
              <input
                type="text"
                maxLength={300}
                value={saleNote}
                onChange={(e) => setSaleNote(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>

            <div className="flex items-center justify-between pt-1 text-sm font-bold">
              <span>{locale === 'bn' ? 'মোট বিল:' : 'Total:'}</span>
              <span className="font-mono-num text-[#B91C1C]">
                {formatTaka((Number(saleQty) || 0) * (Number(saleUnitPrice) || 0))}
              </span>
            </div>

            {formError && (
              <p className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700">
                {formError}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSellingProduct(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                {tr(locale, 'cancel')}
              </button>
              <button
                type="submit"
                disabled={saleMode === 'due' && contacts.length === 0}
                className="px-5 py-2 text-xs font-bold text-white bg-[#16A34A] hover:bg-[#15803D] rounded-lg cursor-pointer disabled:opacity-50"
              >
                {locale === 'bn' ? 'বিক্রি ও মেমো' : 'Complete & Memo'}
              </button>
            </div>
          </form>
        </div>
      )}

      {adjustProduct && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-md flex items-center justify-center p-4 no-print"
          onClick={(e) => {
            if (e.target === e.currentTarget) setAdjustProduct(null);
          }}
        >
          <form
            onSubmit={handleAdjustSubmit}
            className="w-full max-w-sm glass-3d-tile rounded-2xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-bold text-slate-900">
                {locale === 'bn' ? 'স্টক আপডেট' : 'Adjust Stock'} · {adjustProduct.name}
              </h3>
              <button
                type="button"
                onClick={() => setAdjustProduct(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setAdjustType('in')}
                className={`py-1.5 text-xs font-bold rounded-md cursor-pointer ${
                  adjustType === 'in'
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-slate-600'
                }`}
              >
                {locale === 'bn' ? 'স্টক যোগ (+)' : 'Stock In (+)'}
              </button>
              <button
                type="button"
                onClick={() => setAdjustType('out')}
                className={`py-1.5 text-xs font-bold rounded-md cursor-pointer ${
                  adjustType === 'out' ? 'bg-white text-red-700 shadow-sm' : 'text-slate-600'
                }`}
              >
                {locale === 'bn' ? 'স্টক বাদ (-)' : 'Stock Out (-)'}
              </button>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {locale === 'bn' ? 'পরিমাণ' : 'Quantity'}
              </label>
              <input
                type="number"
                min="1"
                required
                value={adjustDelta}
                onChange={(e) => setAdjustDelta(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono-num"
              />
            </div>
            {formError && (
              <p className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700">
                {formError}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAdjustProduct(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                {tr(locale, 'cancel')}
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-white bg-[#B91C1C] rounded-lg cursor-pointer"
              >
                {tr(locale, 'save')}
              </button>
            </div>
          </form>
        </div>
      )}

      {showPoModal && onCreatePurchaseOrder && (
        <PurchaseOrderModal
          locale={locale}
          products={products}
          contacts={contacts}
          onCreatePurchaseOrder={onCreatePurchaseOrder}
          onClose={() => setShowPoModal(false)}
        />
      )}

      {thermalData && (
        <ThermalPrintModal
          locale={locale}
          header={thermalData.header}
          body58={thermalData.body58}
          body80={thermalData.body80}
          onClose={() => setThermalData(null)}
        />
      )}
    </div>
  );
};
