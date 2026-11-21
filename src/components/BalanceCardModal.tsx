import React, { useEffect, useState } from 'react';
import {
  Download,
  Loader2,
  MessageSquare,
  MessageSquareShare,
  Share2,
  X,
} from 'lucide-react';
import { Contact, Locale, PaymentGatewaysConfig } from '../types/shop';
import {
  BalanceCardResult,
  generateCustomerBalanceCardPng,
  shareOrDownloadBalanceCard,
} from '../lib/balanceCardShare';
import { formatTaka } from '../lib/shopService';

interface BalanceCardModalProps {
  locale: Locale;
  contact: Contact;
  shopName: string;
  shopPhone?: string;
  shopAddress?: string;
  gateways?: PaymentGatewaysConfig;
  whatsappUrl: string;
  smsUrl?: string;
  onClose: () => void;
  onDone?: (msg: string) => void;
}

export const BalanceCardModal: React.FC<BalanceCardModalProps> = ({
  locale,
  contact,
  shopName,
  shopPhone,
  shopAddress,
  gateways,
  whatsappUrl,
  smsUrl,
  onClose,
  onDone,
}) => {
  const [card, setCard] = useState<BalanceCardResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErrorMsg(null);
    void generateCustomerBalanceCardPng({
      contact,
      shopName,
      shopPhone,
      shopAddress,
      gateways,
      locale,
    })
      .then((res) => {
        if (!cancelled) setCard(res);
      })
      .catch((err) => {
        if (!cancelled) {
          setErrorMsg(
            err instanceof Error
              ? err.message
              : locale === 'bn'
              ? 'কার্ড তৈরি করা যায়নি।'
              : 'Failed to generate balance card.'
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [contact, shopName, shopPhone, shopAddress, gateways, locale]);

  const caption =
    locale === 'bn'
      ? `${shopName} - ${contact.name} এর বর্তমান হিসাব: ${formatTaka(
          Math.abs(contact.balance)
        )}`
      : `${shopName} - ${contact.name} balance: ${formatTaka(
          Math.abs(contact.balance)
        )}`;

  const handleShare = async () => {
    if (!card) return;
    const outcome = await shareOrDownloadBalanceCard(card, caption);
    onDone?.(
      outcome === 'shared'
        ? locale === 'bn'
          ? 'ব্যালেন্স কার্ড শেয়ার করা হয়েছে!'
          : 'Balance card shared!'
        : locale === 'bn'
        ? 'ব্যালেন্স কার্ড PNG ডাউনলোড হয়েছে!'
        : 'Balance card PNG downloaded!'
    );
  };

  const handleDownloadOnly = () => {
    if (!card) return;
    const a = document.createElement('a');
    a.href = card.dataUrl;
    a.download = card.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    onDone?.(
      locale === 'bn'
        ? 'ব্যালেন্স কার্ড PNG ডাউনলোড হয়েছে!'
        : 'Balance card PNG downloaded!'
    );
  };

  return (
    <div
      className="fixed inset-0 z-[75] bg-slate-900/55 backdrop-blur-md flex items-center justify-center p-4 no-print"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg glass-3d-tile rounded-3xl bg-white p-5 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">
              {locale === 'bn'
                ? 'কাস্টমার ব্যালেন্স কার্ড (PNG শেয়ার)'
                : 'Customer Balance Card (PNG)'}
            </h3>
            <p className="text-[11px] text-slate-500">
              {locale === 'bn'
                ? 'ছবি হিসেবে WhatsApp, Messenger বা গ্যালারিতে সেভ করে পাঠান'
                : 'Share as crisp PNG card via WhatsApp or download'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 min-h-[180px] flex items-center justify-center p-2">
          {loading ? (
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 py-10">
              <Loader2 className="w-4 h-4 animate-spin text-[#B91C1C]" />
              <span>
                {locale === 'bn' ? 'ব্যালেন্স কার্ড তৈরি হচ্ছে...' : 'Rendering card...'}
              </span>
            </div>
          ) : errorMsg ? (
            <p className="text-xs font-semibold text-rose-700 p-4">{errorMsg}</p>
          ) : card ? (
            <img
              src={card.dataUrl}
              alt={contact.name}
              className="w-full h-auto rounded-xl shadow-sm"
            />
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            disabled={!card}
            onClick={handleShare}
            className="btn-3d py-2.5 px-3 bg-[#B91C1C] hover:bg-[#991B1B] text-white text-xs font-bold rounded-xl cursor-pointer inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <Share2 className="w-4 h-4" />
            <span>{locale === 'bn' ? 'ছবি শেয়ার করুন' : 'Share Card PNG'}</span>
          </button>

          <button
            type="button"
            disabled={!card}
            onClick={handleDownloadOnly}
            className="btn-3d py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl cursor-pointer inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{locale === 'bn' ? 'PNG ডাউনলোড' : 'Download PNG'}</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200/70">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-xl"
          >
            <MessageSquareShare className="w-3.5 h-3.5" />
            <span>{locale === 'bn' ? 'WhatsApp মেসেজ' : 'WhatsApp Text'}</span>
          </a>
          {smsUrl && (
            <a
              href={smsUrl}
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-700 text-xs font-bold rounded-xl"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{locale === 'bn' ? 'ডিরেক্ট SMS' : 'Direct SMS'}</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
