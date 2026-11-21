import React, { useState } from 'react';
import { Lock, LogOut } from 'lucide-react';
import { Locale } from '../types/shop';
import { hashPin, verifyPin } from '../lib/security';

interface PinLockScreenProps {
  locale: Locale;
  shopName: string;
  storedPinHash: string | null;
  onSavePinHash: (hash: string) => Promise<void>;
  onUnlock: () => void;
  onLogout: () => void;
}

export const PinLockScreen: React.FC<PinLockScreenProps> = ({
  locale,
  shopName,
  storedPinHash,
  onSavePinHash,
  onUnlock,
  onLogout,
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const hasPin = Boolean(storedPinHash);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = pin.trim();
    if (!/^\d{4,6}$/.test(trimmed)) {
      setError(locale === 'bn' ? '৪ থেকে ৬ সংখ্যার পিন দিন।' : 'Enter a 4 to 6 digit PIN.');
      return;
    }

    setBusy(true);
    try {
      if (!storedPinHash) {
        const hash = await hashPin(trimmed);
        await onSavePinHash(hash);
        onUnlock();
      } else {
        const ok = await verifyPin(trimmed, storedPinHash);
        if (!ok) {
          setError(locale === 'bn' ? 'ভুল পিন! আবার চেষ্টা করুন।' : 'Incorrect PIN.');
        } else {
          onUnlock();
        }
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : locale === 'bn'
          ? 'পিন যাচাই বা সংরক্ষণ করা যায়নি।'
          : 'Failed to process PIN.'
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm glass-3d-tile animate-3d-enter rounded-3xl p-7 text-center">
        <div className="relative w-14 h-14 mx-auto">
          <img
            src="/assets/aistudio/file_00000000351481f488ee43b477fe5afb_522353d9.png"
            alt={shopName}
            className="w-14 h-14 rounded-2xl object-cover object-top border-2 border-rose-200 shadow-md"
          />
          <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#B91C1C] text-white flex items-center justify-center shadow">
            <Lock className="w-3 h-3" />
          </span>
        </div>

        <h2 className="mt-4 text-lg font-bold text-slate-900 text-3d-dark">{shopName}</h2>
        <p className="mt-2 text-xs text-slate-600">
          {hasPin
            ? locale === 'bn'
              ? 'খাতা খুলতে আপনার ৪–৬ সংখ্যার পিন দিন'
              : 'Enter your 4–6 digit PIN to unlock'
            : locale === 'bn'
            ? 'নিরাপত্তার জন্য ৪–৬ সংখ্যার নতুন পিন সেট করুন'
            : 'Set a 4–6 digit PIN to lock your khata'}
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            placeholder="••••"
            autoFocus
            className="w-full py-3 px-4 text-center text-2xl font-mono-num tracking-[0.5em] bg-white/90 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B91C1C]"
          />

          {error && <p className="text-xs font-medium text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="btn-3d w-full py-2.5 px-4 bg-[#B91C1C] hover:bg-[#991B1B] text-white text-sm font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-60"
          >
            {hasPin
              ? locale === 'bn'
                ? 'আনলক করুন'
                : 'Unlock'
              : locale === 'bn'
              ? 'পিন সেভ করুন'
              : 'Save PIN'}
          </button>
        </form>

        <button
          type="button"
          onClick={onLogout}
          className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>{locale === 'bn' ? 'লগআউট' : 'Sign Out'}</span>
        </button>
      </div>
    </div>
  );
};
