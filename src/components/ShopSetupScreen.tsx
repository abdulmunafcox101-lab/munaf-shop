import React, { useRef, useState } from 'react';
import { Camera, Store, Trash2 } from 'lucide-react';
import { Locale } from '../types/shop';
import { compressImageToDataUrl } from '../lib/shopService';

interface ShopSetupScreenProps {
  locale: Locale;
  userEmail: string;
  onCreateShop: (input: {
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
  onLogout: () => void;
}

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

export const ShopSetupScreen: React.FC<ShopSetupScreenProps> = ({
  locale,
  userEmail,
  onCreateShop,
  onLogout,
}) => {
  const [shopName, setShopName] = useState('মোনাফ টেলিকম');
  const [ownerName, setOwnerName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [nidNumber, setNidNumber] = useState('');
  const [businessAgeYears, setBusinessAgeYears] = useState('');
  const [shopSubtitle, setShopSubtitle] = useState('MUNAF SHOP');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const handlePhotoPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    try {
      const compressed = await compressImageToDataUrl(file, 160, 0.72);
      setPhotoUrl(compressed);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : locale === 'bn'
          ? 'ছবি প্রসেস করতে সমস্যা হয়েছে।'
          : 'Failed to process image.'
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!shopName.trim()) {
      setError(locale === 'bn' ? 'দোকানের নাম লিখুন।' : 'Please enter your shop name.');
      return;
    }
    setSaving(true);
    try {
      await onCreateShop({
        shopName: shopName.trim(),
        shopSubtitle: shopSubtitle.trim(),
        phone: phone.trim(),
        address: address.trim(),
        ownerName: ownerName.trim(),
        businessType: businessType.trim(),
        nidNumber: nidNumber.trim(),
        businessAgeYears: businessAgeYears.trim(),
        photoUrl,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : locale === 'bn'
          ? 'দোকান তৈরি করা যায়নি। আবার চেষ্টা করুন।'
          : 'Failed to create shop profile.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-lg glass-3d-tile animate-3d-enter rounded-3xl p-6 sm:p-7 space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 text-3d-dark">
              {locale === 'bn' ? 'আপনার তথ্য সমূহ ও দোকান সেটআপ' : 'Set Up Your Shop Profile'}
            </h2>
            <p className="text-xs text-slate-500">{userEmail}</p>
          </div>
          <div className="relative">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoPick}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              title={locale === 'bn' ? 'দোকান বা মালিকের ছবি' : 'Add photo'}
              className="w-16 h-16 rounded-full border-2 border-dashed border-slate-300 bg-slate-100 hover:border-[#B91C1C] overflow-hidden flex items-center justify-center relative cursor-pointer"
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

        <form onSubmit={handleSubmit} className="space-y-3.5">
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
              className="w-full px-3.5 py-2.5 text-sm bg-white/90 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B91C1C]"
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
                className="w-full px-3.5 py-2.5 text-sm bg-white/90 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B91C1C]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {locale === 'bn' ? 'ব্যবসার ধরণ' : 'Business Type'}
              </label>
              <select
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-white/90 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B91C1C]"
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
                {locale === 'bn' ? 'মোবাইল নম্বর *' : 'Mobile Number *'}
              </label>
              <input
                type="tel"
                required
                maxLength={30}
                placeholder="01XXXXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-white/90 border border-slate-300 rounded-xl font-mono-num focus:outline-none focus:ring-2 focus:ring-[#B91C1C]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {locale === 'bn' ? 'NID নম্বর (ঐচ্ছিক)' : 'NID Number (Optional)'}
              </label>
              <input
                type="text"
                maxLength={40}
                placeholder="10/13/17 digit NID"
                value={nidNumber}
                onChange={(e) => setNidNumber(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-white/90 border border-slate-300 rounded-xl font-mono-num focus:outline-none focus:ring-2 focus:ring-[#B91C1C]"
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
                placeholder={locale === 'bn' ? 'যেমন: ৫' : 'e.g. 5'}
                value={businessAgeYears}
                onChange={(e) => setBusinessAgeYears(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-white/90 border border-slate-300 rounded-xl font-mono-num focus:outline-none focus:ring-2 focus:ring-[#B91C1C]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {locale === 'bn' ? 'সাব-টাইটেল / ট্যাগলাইন' : 'Subtitle'}
              </label>
              <input
                type="text"
                maxLength={120}
                value={shopSubtitle}
                onChange={(e) => setShopSubtitle(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-white/90 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B91C1C]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {locale === 'bn' ? 'ব্যবসা প্রতিষ্ঠানের ঠিকানা' : 'Shop Address'}
            </label>
            <input
              type="text"
              maxLength={200}
              placeholder={locale === 'bn' ? 'বাজার / রোড, জেলা' : 'Market / Road, City'}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-white/90 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B91C1C]"
            />
          </div>

          {error && (
            <p className="text-xs font-medium text-red-700 bg-red-50/90 border border-red-200 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="btn-3d w-full py-3 px-4 bg-[#B91C1C] hover:bg-[#991B1B] text-white text-sm font-bold rounded-full transition-colors cursor-pointer disabled:opacity-60"
          >
            {saving
              ? locale === 'bn'
                ? 'তৈরি হচ্ছে...'
                : 'Creating...'
              : locale === 'bn'
              ? 'নিশ্চিত ও খাতা শুরু করুন'
              : 'Confirm & Start My Khata'}
          </button>
        </form>

        <button
          type="button"
          onClick={onLogout}
          className="text-xs font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
        >
          {locale === 'bn' ? 'অন্য অ্যাকাউন্ট দিয়ে লগইন করুন' : 'Use a different account'}
        </button>
      </div>
    </div>
  );
};
