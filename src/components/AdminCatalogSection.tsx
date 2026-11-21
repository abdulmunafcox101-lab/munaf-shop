import React, { useState } from 'react';
import {
  Check,
  Edit3,
  Layers,
  Plus,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { CatalogAccentColor, CatalogItem, Locale } from '../types/shop';
import { formatTaka } from '../lib/shopService';

interface AdminCatalogSectionProps {
  locale: Locale;
  catalogItems: CatalogItem[];
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
}

const CATALOG_PRESETS = [
  {
    title: 'SMS তাগাদা প্যাক (১০০০ SMS)',
    category: 'এসএমএস ও নোটিফিকেশন',
    price: 350,
    unitLabel: '১০০০ মেসেজ',
    description: 'বাকি আদায়ের জন্য ক্রেতাদের মোবাইলে সরাসরি ব্র্যান্ডেড SMS তাগাদা পাঠান।',
    features: '১০০০ মাস্কিং/নন-মাস্কিং SMS\nমেয়াদ ১ বছর\nঅটো বাকি রিপোর্ট লিংক',
    accentColor: 'emerald' as CatalogAccentColor,
    sortOrder: 1,
  },
  {
    title: 'থার্মাল Bluetooth প্রিন্টার প্যাক',
    category: 'হার্ডওয়্যার ও POS',
    price: 2650,
    unitLabel: 'সম্পূর্ণ সেটআপ',
    description: 'দোকানের রসিদ ও টালিখাতা মেমো সরাসরি মোবাইল থেকে প্রিন্ট করার জন্য প্রিন্টার ও সেটআপ।',
    features: '৫৮মিমি Bluetooth প্রিন্টার\n২ রোল থার্মাল পেপার ফ্রি\nলাইফটাইম অ্যাপ সেটআপ সাপোর্ট',
    accentColor: 'sky' as CatalogAccentColor,
    sortOrder: 2,
  },
  {
    title: 'কাস্টম ব্র্যান্ডেড ওয়েব শপ',
    category: 'ডিজিটাল সার্ভিস',
    price: 1200,
    unitLabel: 'এককালীন সেটআপ',
    description: 'আপনার দোকানের নামে আলাদা অনলাইন অর্ডার ও ক্যাটালগ লিংক তৈরি করে দেওয়া হবে।',
    features: 'নিজস্ব দোকানের লোগো ও ব্যানার\nহোয়াটসঅ্যাপ অর্ডার ইন্টিগ্রেশন\nবিকাশ/নগদ/রকেট পেমেন্ট গাইড',
    accentColor: 'violet' as CatalogAccentColor,
    sortOrder: 3,
  },
];

export const AdminCatalogSection: React.FC<AdminCatalogSectionProps> = ({
  locale,
  catalogItems,
  onSaveCatalogItem,
  onDeleteCatalogItem,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('ডিজিটাল সার্ভিস');
  const [price, setPrice] = useState<number>(300);
  const [unitLabel, setUnitLabel] = useState('প্রতি প্যাক');
  const [description, setDescription] = useState('');
  const [features, setFeatures] = useState('');
  const [accentColor, setAccentColor] = useState<CatalogAccentColor>('crimson');
  const [sortOrder, setSortOrder] = useState<number>(1);
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDeleteItemId, setConfirmDeleteItemId] = useState<string | null>(null);

  const sortedItems = [...catalogItems].sort((a, b) => a.sortOrder - b.sortOrder);

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setCategory('ডিজিটাল সার্ভিস');
    setPrice(300);
    setUnitLabel('প্রতি প্যাক');
    setDescription('');
    setFeatures('');
    setAccentColor('crimson');
    setSortOrder(sortedItems.length + 1);
    setEnabled(true);
  };

  const loadForEdit = (item: CatalogItem) => {
    setEditingId(item.id);
    setTitle(item.title);
    setCategory(item.category);
    setPrice(item.price);
    setUnitLabel(item.unitLabel ?? '');
    setDescription(item.description ?? '');
    setFeatures(item.features ?? '');
    setAccentColor(item.accentColor);
    setSortOrder(item.sortOrder);
    setEnabled(item.enabled);
  };

  const applyPreset = (p: (typeof CATALOG_PRESETS)[number]) => {
    setEditingId(null);
    setTitle(p.title);
    setCategory(p.category);
    setPrice(p.price);
    setUnitLabel(p.unitLabel);
    setDescription(p.description);
    setFeatures(p.features);
    setAccentColor(p.accentColor);
    setSortOrder(p.sortOrder);
    setEnabled(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setFormError(null);
    setSaving(true);
    try {
      await onSaveCatalogItem(
        {
          title: title.trim(),
          category: category.trim() || 'সার্ভিস',
          price,
          unitLabel: unitLabel.trim(),
          description: description.trim(),
          features: features.trim(),
          accentColor,
          enabled,
          sortOrder,
        },
        editingId ?? undefined
      );
      resetForm();
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : locale === 'bn'
          ? 'ক্যাটালগ সেভ করতে সমস্যা হয়েছে।'
          : 'Failed to save catalog item.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="glass-3d-tile rounded-2xl p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {locale === 'bn'
                ? 'ডিজিটাল সার্ভিস ও প্রোডাক্ট ক্যাটালগ ম্যানেজার'
                : 'Digital Service & Product Catalog Manager'}
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              {locale === 'bn'
                ? 'এখান থেকে আলাদা ক্যাটালগ আইটেম যোগ বা এডিট করুন — ইউজারের "ক্যাটালগ ও পেমেন্ট" পেজে লাইভ দেখাবে।'
                : 'Add or edit special catalog offerings shown on the user Catalog & Payment page.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {CATALOG_PRESETS.map((preset) => (
            <button
              key={preset.title}
              type="button"
              onClick={() => applyPreset(preset)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold bg-amber-50/90 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl cursor-pointer"
            >
              <Sparkles className="w-3 h-3 text-amber-600" />
              <span>+ {preset.title.split('(')[0].trim()}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-5 glass-3d-tile rounded-2xl p-5 space-y-3.5"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-900">
              {editingId
                ? locale === 'bn'
                  ? 'ক্যাটালগ আইটেম এডিট'
                  : 'Edit Catalog Item'
                : locale === 'bn'
                ? 'নতুন ক্যাটালগ আইটেম যোগ করুন'
                : 'Add Catalog Item'}
            </h4>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-xs font-semibold text-slate-500 hover:text-slate-900 inline-flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>{locale === 'bn' ? 'রিসেট' : 'Reset'}</span>
              </button>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {locale === 'bn' ? 'শিরোনাম *' : 'Title *'}
            </label>
            <input
              type="text"
              required
              maxLength={100}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                locale === 'bn' ? 'যেমন: SMS তাগাদা প্যাক' : 'e.g. SMS Reminder Pack'
              }
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {locale === 'bn' ? 'ক্যাটাগরি *' : 'Category *'}
              </label>
              <input
                type="text"
                required
                maxLength={60}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {locale === 'bn' ? 'মূল্য (টাকা) *' : 'Price (BDT) *'}
              </label>
              <input
                type="number"
                min={0}
                max={10000000}
                required
                value={price}
                onChange={(e) => setPrice(Math.max(0, Number(e.target.value) || 0))}
                className="w-full px-3 py-2 text-sm font-bold font-mono-num bg-white border border-slate-300 rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {locale === 'bn' ? 'ইউনিট / মেয়াদ লেবেল' : 'Unit / Duration Label'}
              </label>
              <input
                type="text"
                maxLength={40}
                value={unitLabel}
                onChange={(e) => setUnitLabel(e.target.value)}
                placeholder={locale === 'bn' ? 'যেমন: ১ মাস / ১ প্যাক' : 'e.g. 1 month'}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {locale === 'bn' ? 'ক্রম (Sort Order)' : 'Sort Order'}
              </label>
              <input
                type="number"
                min={0}
                max={100000}
                value={sortOrder}
                onChange={(e) =>
                  setSortOrder(Math.max(0, Number(e.target.value) || 0))
                }
                className="w-full px-3 py-2 text-xs font-mono-num bg-white border border-slate-300 rounded-xl"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {locale === 'bn' ? 'থিম কালার' : 'Accent Color'}
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {(
                [
                  ['crimson', 'লাল'],
                  ['emerald', 'সবুজ'],
                  ['sky', 'নীল'],
                  ['amber', 'সোনালি'],
                  ['violet', 'বেগুনি'],
                ] as [CatalogAccentColor, string][]
              ).map(([clr, lbl]) => (
                <button
                  key={clr}
                  type="button"
                  onClick={() => setAccentColor(clr)}
                  className={`py-1.5 text-[11px] font-bold rounded-lg border cursor-pointer ${
                    accentColor === clr
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {locale === 'bn' ? 'সংক্ষিপ্ত বিবরণ' : 'Description'}
            </label>
            <textarea
              rows={2}
              maxLength={240}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {locale === 'bn'
                ? 'সুবিধাসমূহ (প্রতি লাইনে একটি করে লিখুন)'
                : 'Features (one per line)'}
            </label>
            <textarea
              rows={3}
              maxLength={400}
              value={features}
              onChange={(e) => setFeatures(e.target.value)}
              placeholder={
                locale === 'bn'
                  ? 'সুবিধা ১\nসুবিধা ২\nসুবিধা ৩'
                  : 'Feature 1\nFeature 2'
              }
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl resize-none"
            />
          </div>

          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="rounded border-slate-300 text-[#B91C1C]"
            />
            <span>
              {locale === 'bn'
                ? 'ইউজারের ক্যাটালগ পেজে সক্রিয় দেখান'
                : 'Visible on User Catalog'}
            </span>
          </label>

          {formError && (
            <p className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700">
              {formError}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="btn-3d w-full py-2.5 px-4 bg-[#B91C1C] hover:bg-[#991B1B] text-white text-xs font-bold rounded-xl inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
          >
            {editingId ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            <span>
              {saving
                ? locale === 'bn'
                  ? 'সেভ হচ্ছে...'
                  : 'Saving...'
                : editingId
                ? locale === 'bn'
                  ? 'ক্যাটালগ আপডেট করুন'
                  : 'Update Catalog Item'
                : locale === 'bn'
                ? 'ক্যাটালগে যোগ করুন'
                : 'Add to Catalog'}
            </span>
          </button>
        </form>

        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-900">
              {locale === 'bn'
                ? `বর্তমান ক্যাটালগ আইটেম (${sortedItems.length})`
                : `Published Catalog Items (${sortedItems.length})`}
            </h4>
          </div>

          {sortedItems.length === 0 ? (
            <div className="glass-3d-tile rounded-2xl p-8 text-center text-xs text-slate-500">
              {locale === 'bn'
                ? 'এখনো কোনো ক্যাটালগ আইটেম যোগ করা হয়নি। উপরের প্রিসেট বাটন ক্লিক করে দ্রুত যোগ করতে পারেন।'
                : 'No custom catalog items added yet. Click any quick preset above or create one.'}
            </div>
          ) : (
            <div className="space-y-2.5">
              {sortedItems.map((item) => (
                <div
                  key={item.id}
                  className="glass-3d-tile rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold text-slate-900">{item.title}</p>
                      <span className="text-[11px] font-bold text-slate-500">
                        · {item.category} · #{item.sortOrder}
                      </span>
                      <span
                        className={`text-[11px] font-bold ${
                          item.enabled ? 'text-emerald-700' : 'text-slate-400'
                        }`}
                      >
                        · {item.enabled ? 'সক্রিয়' : 'লুকানো'}
                      </span>
                    </div>
                    <p className="text-xs font-bold font-mono-num text-[#B91C1C]">
                      {formatTaka(item.price)}
                      {item.unitLabel ? ` / ${item.unitLabel}` : ''}
                    </p>
                    {item.description && (
                      <p className="text-xs text-slate-600 line-clamp-2">
                        {item.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => loadForEdit(item)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>{locale === 'bn' ? 'এডিট' : 'Edit'}</span>
                    </button>
                    {confirmDeleteItemId === item.id ? (
                      <button
                        type="button"
                        onClick={async () => {
                          setConfirmDeleteItemId(null);
                          setFormError(null);
                          try {
                            await onDeleteCatalogItem(item.id);
                          } catch (err) {
                            setFormError(
                              err instanceof Error
                                ? err.message
                                : locale === 'bn'
                                ? 'ক্যাটালগ মুছে ফেলতে সমস্যা হয়েছে।'
                                : 'Failed to delete catalog item.'
                            );
                          }
                        }}
                        className="px-2.5 py-1.5 text-[11px] font-bold bg-rose-600 text-white rounded-xl cursor-pointer inline-flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" />
                        <span>{locale === 'bn' ? 'নিশ্চিত?' : 'Confirm?'}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteItemId(item.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 bg-white border border-slate-200 rounded-xl cursor-pointer"
                        title={locale === 'bn' ? 'মুছুন' : 'Delete'}
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
    </div>
  );
};
