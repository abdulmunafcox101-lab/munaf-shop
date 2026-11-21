import React, { useMemo, useState } from 'react';
import { PackagePlus, Plus, Trash2, Truck, X } from 'lucide-react';
import { Contact, Locale, Product } from '../types/shop';
import { formatTaka } from '../lib/shopService';
import { tr } from '../lib/i18n';

interface PurchaseOrderModalProps {
  locale: Locale;
  products: Product[];
  contacts: Contact[];
  onCreatePurchaseOrder: (input: {
    supplier?: Contact;
    supplierName: string;
    supplierPhone?: string;
    invoiceRef?: string;
    items: { product: Product; qty: number; unitCost: number }[];
    paymentMode: 'cash' | 'due';
    note?: string;
  }) => Promise<string>;
  onClose: () => void;
}

interface PoDraftItem {
  product: Product;
  qty: number;
  unitCost: number;
}

export const PurchaseOrderModal: React.FC<PurchaseOrderModalProps> = ({
  locale,
  products,
  contacts,
  onCreatePurchaseOrder,
  onClose,
}) => {
  const suppliers = useMemo(
    () =>
      contacts.filter((c) => c.contactType === 'supplier').length > 0
        ? contacts.filter((c) => c.contactType === 'supplier')
        : contacts,
    [contacts]
  );

  const [supplierId, setSupplierId] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [invoiceRef, setInvoiceRef] = useState('');
  const [paymentMode, setPaymentMode] = useState<'cash' | 'due'>('cash');
  const [note, setNote] = useState('');

  const [pickProductId, setPickProductId] = useState('');
  const [pickQty, setPickQty] = useState('10');
  const [pickCost, setPickCost] = useState('');
  const [items, setItems] = useState<PoDraftItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const totalAmount = useMemo(
    () => items.reduce((s, row) => s + row.qty * row.unitCost, 0),
    [items]
  );

  const handleAddLine = () => {
    const prod = products.find((p) => p.id === pickProductId);
    if (!prod) return;
    const qty = Math.max(1, Math.floor(Number(pickQty) || 1));
    const unitCost = Math.max(0, Number(pickCost) || prod.purchasePrice || 0);
    setItems((prev) => {
      const idx = prev.findIndex((x) => x.product.id === prod.id);
      if (idx >= 0) {
        return prev.map((row, i) =>
          i === idx ? { ...row, qty: row.qty + qty, unitCost } : row
        );
      }
      return [...prev, { product: prod, qty, unitCost }];
    });
    setPickProductId('');
    setPickQty('10');
    setPickCost('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const matchedSupplier = contacts.find((c) => c.id === supplierId);
    const cleanSupplier = matchedSupplier?.name || supplierName.trim();
    if (!cleanSupplier) {
      setErrorMsg(
        locale === 'bn'
          ? 'সাপ্লায়ারের নাম লিখুন বা তালিকা থেকে বেছে নিন।'
          : 'Enter or select a supplier.'
      );
      return;
    }
    if (paymentMode === 'due' && !matchedSupplier) {
      setErrorMsg(
        locale === 'bn'
          ? 'বাকিতে ক্রয়ের জন্য টালিখাতা থেকে একটি সাপ্লায়ার বেছে নিন।'
          : 'Select a saved party from Khata for credit purchases.'
      );
      return;
    }
    if (items.length === 0) {
      setErrorMsg(
        locale === 'bn'
          ? 'কমপক্ষে একটি পণ্য তালিকায় যোগ করুন।'
          : 'Add at least one product to the purchase order.'
      );
      return;
    }
    setErrorMsg(null);
    setSaving(true);
    try {
      await onCreatePurchaseOrder({
        supplier: matchedSupplier,
        supplierName: cleanSupplier,
        supplierPhone: supplierPhone.trim() || matchedSupplier?.phone || '',
        invoiceRef: invoiceRef.trim(),
        items,
        paymentMode,
        note: note.trim(),
      });
      onClose();
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : locale === 'bn'
          ? 'পণ্য ক্রয় সংরক্ষণ করতে সমস্যা হয়েছে।'
          : 'Failed to save purchase order.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[72] bg-slate-900/55 backdrop-blur-md flex items-center justify-center p-4 no-print"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-xl glass-3d-tile rounded-3xl bg-white p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                {locale === 'bn'
                  ? 'সাপ্লায়ার ক্রয় ও অটো স্টক ইন (PO)'
                  : 'Supplier Purchase Order & Restock'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {locale === 'bn'
                  ? 'নতুন মাল তুললেই অটো স্টক ও ক্রয়মূল্য আপডেট হবে'
                  : 'Automatically increments product stock and updates buy price'}
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {locale === 'bn' ? 'সাপ্লায়ার নির্বাচন' : 'Saved Supplier'}
            </label>
            <select
              value={supplierId}
              onChange={(e) => {
                const id = e.target.value;
                setSupplierId(id);
                const s = contacts.find((c) => c.id === id);
                if (s) {
                  setSupplierName(s.name);
                  setSupplierPhone(s.phone);
                }
              }}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl"
            >
              <option value="">
                {locale === 'bn' ? '-- বাছুন বা নিচে নাম লিখুন --' : '-- Pick or type --'}
              </option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.contactType === 'supplier' ? 'Supplier' : 'Party'})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {locale === 'bn' ? 'সাপ্লায়ার / কোম্পানির নাম *' : 'Supplier Name *'}
            </label>
            <input
              type="text"
              required
              maxLength={100}
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {locale === 'bn' ? 'চালান / ইনভয়েস নং' : 'Challan / Invoice Ref'}
            </label>
            <input
              type="text"
              maxLength={50}
              value={invoiceRef}
              onChange={(e) => setInvoiceRef(e.target.value)}
              placeholder="CH-1024"
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl font-mono-num"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {locale === 'bn' ? 'পরিশোধের মাধ্যম' : 'Payment Mode'}
            </label>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value as 'cash' | 'due')}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl"
            >
              <option value="cash">
                {locale === 'bn' ? 'নগদ ক্যাশবই থেকে' : 'Cash (Cashbook Out)'}
              </option>
              <option value="due">
                {locale === 'bn' ? 'বাকি (সাপ্লায়ার খাতায় দেবো)' : 'Due (Supplier Payable)'}
              </option>
            </select>
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3 space-y-2.5">
          <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <PackagePlus className="w-4 h-4 text-[#B91C1C]" />
            <span>{locale === 'bn' ? 'পণ্য যোগ করুন' : 'Add Products to Restock'}</span>
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
            <select
              value={pickProductId}
              onChange={(e) => {
                const pid = e.target.value;
                setPickProductId(pid);
                const p = products.find((x) => x.id === pid);
                if (p) setPickCost(String(p.purchasePrice));
              }}
              className="sm:col-span-5 px-2.5 py-2 text-xs bg-white border border-slate-300 rounded-xl"
            >
              <option value="">
                {locale === 'bn' ? '-- পণ্য বাছুন --' : '-- Choose Product --'}
              </option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({locale === 'bn' ? 'মজুদ:' : 'Stock:'} {p.quantity})
                </option>
              ))}
            </select>
            <input
              type="number"
              min="1"
              placeholder={locale === 'bn' ? 'পরিমাণ' : 'Qty'}
              value={pickQty}
              onChange={(e) => setPickQty(e.target.value)}
              className="sm:col-span-3 px-2.5 py-2 text-xs bg-white border border-slate-300 rounded-xl font-mono-num"
            />
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder={locale === 'bn' ? 'দর (৳)' : 'Unit Cost'}
              value={pickCost}
              onChange={(e) => setPickCost(e.target.value)}
              className="sm:col-span-2 px-2.5 py-2 text-xs bg-white border border-slate-300 rounded-xl font-mono-num"
            />
            <button
              type="button"
              disabled={!pickProductId}
              onClick={handleAddLine}
              className="sm:col-span-2 btn-3d py-2 px-2 bg-slate-900 text-white text-xs font-bold rounded-xl cursor-pointer inline-flex items-center justify-center gap-1 disabled:opacity-40"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{locale === 'bn' ? 'যোগ' : 'Add'}</span>
            </button>
          </div>

          {items.length > 0 && (
            <div className="space-y-1.5 pt-1">
              {items.map((row) => (
                <div
                  key={row.product.id}
                  className="bg-white rounded-xl border border-slate-200 px-3 py-2 flex items-center justify-between gap-2 text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 truncate">{row.product.name}</p>
                    <p className="text-[11px] text-slate-500 font-mono-num">
                      +{row.qty} × {formatTaka(row.unitCost)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-bold font-mono-num text-slate-900">
                      {formatTaka(row.qty * row.unitCost)}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setItems((prev) =>
                          prev.filter((x) => x.product.id !== row.product.id)
                        )
                      }
                      className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-slate-900 text-white px-4 py-3 flex items-center justify-between text-sm font-extrabold">
          <span>{locale === 'bn' ? 'সর্বমোট ক্রয়মূল্য:' : 'Purchase Total:'}</span>
          <span className="font-mono-num text-amber-300">{formatTaka(totalAmount)}</span>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            {locale === 'bn' ? 'নোট (ঐচ্ছিক)' : 'Note'}
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

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 rounded-xl cursor-pointer"
          >
            {tr(locale, 'cancel')}
          </button>
          <button
            type="submit"
            disabled={saving || items.length === 0}
            className="btn-3d px-5 py-2 text-xs font-bold text-white bg-[#B91C1C] hover:bg-[#991B1B] rounded-xl cursor-pointer disabled:opacity-50"
          >
            {saving
              ? locale === 'bn'
                ? 'সংরক্ষণ হচ্ছে...'
                : 'Saving...'
              : locale === 'bn'
              ? 'PO সম্পন্ন ও স্টক যোগ করুন'
              : 'Complete PO & Restock'}
          </button>
        </div>
      </form>
    </div>
  );
};
