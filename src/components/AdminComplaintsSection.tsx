import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Clock,
  Loader2,
  MessageCircle,
  MessageSquareReply,
  MessageSquareWarning,
  PhoneCall,
  Send,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import {
  Complaint,
  ComplaintSeverity,
  ComplaintStatus,
  Locale,
  ShopProfile,
} from '../types/shop';
import { formatTimestamp, normalizeTicketStatus, StatusStepper } from './StatusStepper';

interface AdminComplaintsSectionProps {
  locale: Locale;
  complaints: Complaint[];
  shopLookup: Map<string, ShopProfile>;
  search: string;
  onUpdateComplaint: (
    ownerUid: string,
    complaintId: string,
    input: {
      status: ComplaintStatus;
      adminReply?: string;
      statusReason?: string;
    }
  ) => Promise<void>;
  onOpenBanModal: (shop: ShopProfile) => void;
}

type ComplaintFilter = 'all' | 'pending' | 'processing' | 'resolved' | 'rejected';

const COMPLAINT_QUICK_REPLIES_BN = [
  {
    label: 'তদন্ত চলছে',
    status: 'processing' as const,
    reply:
      'আপনার অভিযোগটি গুরুত্বসহকারে গ্রহণ করা হয়েছে। আমাদের অ্যাডমিন টিম বিষয়টি যাচাই ও তদন্ত করছে।',
    reason: 'অভিযোগটি যাচাই ও প্রসেসিং পর্যায়ে রয়েছে',
  },
  {
    label: 'অভিযোগ সমাধান সফল',
    status: 'resolved' as const,
    reply:
      'আপনার অভিযোগের বিষয়টি সফলভাবে সমাধান করা হয়েছে। অনুগ্রহ করে অ্যাপ রিফ্রেশ করে যাচাই করুন। প্রয়োজনে 01608603364 নম্বরে কল করুন।',
    reason: 'অভিযোগের সমাধান সম্পন্ন হয়েছে',
  },
  {
    label: 'প্রমাণ অসম্পূর্ণ / বাতিল',
    status: 'rejected' as const,
    reply:
      'দুঃখিত, প্রদত্ত তথ্য বা TrxID যাচাইয়ে সঠিক প্রমাণ পাওয়া যায়নি। সঠিক স্ক্রিনশট বা রেফারেন্সসহ পুনরায় অভিযোগ করুন।',
    reason: 'প্রয়োজনীয় তথ্য বা প্রমাণ অসম্পূর্ণ',
  },
];

export const AdminComplaintsSection: React.FC<AdminComplaintsSectionProps> = ({
  locale,
  complaints,
  shopLookup,
  search,
  onUpdateComplaint,
  onOpenBanModal,
}) => {
  const [filter, setFilter] = useState<ComplaintFilter>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftStatus, setDraftStatus] = useState<ComplaintStatus>('processing');
  const [draftReply, setDraftReply] = useState('');
  const [draftReason, setDraftReason] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c = { all: complaints.length, pending: 0, processing: 0, resolved: 0, rejected: 0 };
    complaints.forEach((cmp) => {
      const stage = normalizeTicketStatus(cmp.status);
      if (stage === 'pending') c.pending += 1;
      else if (stage === 'processing') c.processing += 1;
      else if (stage === 'success') c.resolved += 1;
      else c.rejected += 1;
    });
    return c;
  }, [complaints]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return complaints.filter((cmp) => {
      const norm = normalizeTicketStatus(cmp.status);
      if (filter === 'pending' && norm !== 'pending') return false;
      if (filter === 'processing' && norm !== 'processing') return false;
      if (filter === 'resolved' && norm !== 'success') return false;
      if (filter === 'rejected' && norm !== 'rejected') return false;
      if (!q) return true;
      const shop = shopLookup.get(cmp.ownerUid);
      const shopName = shop?.shopName.toLowerCase() ?? '';
      return (
        cmp.title.toLowerCase().includes(q) ||
        cmp.description.toLowerCase().includes(q) ||
        (cmp.referenceInfo ?? '').toLowerCase().includes(q) ||
        cmp.contactPhone.toLowerCase().includes(q) ||
        cmp.ownerUid.toLowerCase().includes(q) ||
        shopName.includes(q)
      );
    });
  }, [complaints, filter, search, shopLookup]);

  const openComposer = (cmp: Complaint) => {
    if (editingId === cmp.id) {
      setEditingId(null);
      return;
    }
    setEditingId(cmp.id);
    setDraftStatus(cmp.status);
    setDraftReply(cmp.adminReply ?? '');
    setDraftReason(cmp.statusReason ?? '');
  };

  const handleSave = async (cmp: Complaint, e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setBusyId(cmp.id);
    try {
      await onUpdateComplaint(cmp.ownerUid, cmp.id, {
        status: draftStatus,
        adminReply: draftReply.trim(),
        statusReason: draftReason.trim(),
      });
      setEditingId(null);
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : locale === 'bn'
          ? 'অভিযোগ আপডেট করতে সমস্যা হয়েছে।'
          : 'Failed to update complaint.'
      );
    } finally {
      setBusyId(null);
    }
  };

  const copyUid = async (uid: string, key: string) => {
    try {
      await navigator.clipboard.writeText(uid);
      setCopiedId(key);
      setTimeout(() => setCopiedId((p) => (p === key ? null : p)), 1600);
    } catch {
      // Clipboard blocked
    }
  };

  const severityMeta = (sev: ComplaintSeverity) => {
    if (sev === 'critical') {
      return {
        label: locale === 'bn' ? 'অতি জরুরি' : 'Critical',
        cls: 'text-rose-700',
        Icon: ShieldAlert,
      };
    }
    if (sev === 'urgent') {
      return {
        label: locale === 'bn' ? 'জরুরি' : 'Urgent',
        cls: 'text-amber-700',
        Icon: AlertTriangle,
      };
    }
    return {
      label: locale === 'bn' ? 'সাধারণ' : 'Normal',
      cls: 'text-slate-600',
      Icon: MessageSquareWarning,
    };
  };

  return (
    <div className="space-y-4">
      <div className="glass-3d-tile rounded-2xl p-3 flex flex-wrap items-center gap-1.5">
        {(
          [
            ['all', locale === 'bn' ? `সব অভিযোগ (${counts.all})` : `All (${counts.all})`],
            ['pending', locale === 'bn' ? `পেন্ডিং (${counts.pending})` : `Pending (${counts.pending})`],
            ['processing', locale === 'bn' ? `প্রসেসিং (${counts.processing})` : `Processing (${counts.processing})`],
            ['resolved', locale === 'bn' ? `সফল (${counts.resolved})` : `Resolved (${counts.resolved})`],
            ['rejected', locale === 'bn' ? `বাতিল (${counts.rejected})` : `Rejected (${counts.rejected})`],
          ] as [ComplaintFilter, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setFilter(id);
              setEditingId(null);
            }}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl cursor-pointer transition-colors ${
              filter === id
                ? 'bg-[#B91C1C] text-white shadow-xs'
                : 'bg-white/75 text-slate-600 hover:text-slate-900'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {actionError && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 px-4 py-3 text-xs font-semibold text-rose-700">
          {actionError}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="glass-3d-tile rounded-2xl p-10 text-center text-sm text-slate-500">
          {locale === 'bn'
            ? 'এই ফিল্টারে কোনো ইউজার অভিযোগ পাওয়া যায়নি।'
            : 'No complaints found for this filter.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filtered.map((cmp) => {
            const shop = shopLookup.get(cmp.ownerUid);
            const stage = normalizeTicketStatus(cmp.status);
            const isEditing = editingId === cmp.id;
            const phone = cmp.contactPhone || shop?.phone || '';
            const digits = phone.replace(/\D/g, '');
            const waPhone =
              digits.length >= 10
                ? digits.startsWith('88')
                  ? digits
                  : `88${digits}`
                : '';
            const sev = severityMeta(cmp.severity);
            const SevIcon = sev.Icon;

            return (
              <div
                key={`${cmp.ownerUid}_${cmp.id}`}
                className="glass-3d-tile rounded-2xl p-5 space-y-4"
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900">{cmp.title}</h3>
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-bold ${sev.cls}`}
                      >
                        <SevIcon className="w-3.5 h-3.5 shrink-0" />
                        <span>{sev.label}</span>
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 font-medium">
                      {shop?.shopName || cmp.ownerUid} · {cmp.category}
                      {cmp.referenceInfo ? ` · Ref: ${cmp.referenceInfo}` : ''}
                      {phone ? ` · ${phone}` : ''}
                      {cmp.createdAt
                        ? ` · ${formatTimestamp(cmp.createdAt, locale)}`
                        : ''}
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono-num">
                      <span>UID: {cmp.ownerUid}</span>
                      <button
                        type="button"
                        onClick={() => copyUid(cmp.ownerUid, `cmp_${cmp.id}`)}
                        className="font-bold text-[#B91C1C] hover:underline cursor-pointer"
                      >
                        {copiedId === `cmp_${cmp.id}` ? 'কপি হয়েছে' : 'কপি'}
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
                        onClick={() => onOpenBanModal(shop)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-xl bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 cursor-pointer"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>{locale === 'bn' ? 'ব্লক/ব্যান' : 'Block/Ban'}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => openComposer(cmp)}
                      className="btn-3d inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-[#B91C1C] hover:bg-[#991B1B] text-white cursor-pointer"
                    >
                      <MessageSquareReply className="w-3.5 h-3.5" />
                      <span>
                        {isEditing
                          ? locale === 'bn'
                            ? 'বন্ধ করুন'
                            : 'Close'
                          : locale === 'bn'
                          ? 'অভিযোগ সমাধান ও রিপ্লাই'
                          : 'Resolve & Reply'}
                      </span>
                    </button>
                  </div>
                </div>

                <StatusStepper stage={stage} locale={locale} kind="ticket" />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  <div className="rounded-xl bg-white/80 border border-slate-200/80 p-3.5 space-y-1">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                      {locale === 'bn' ? 'ইউজারের অভিযোগ' : 'User Complaint'}
                    </p>
                    <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                      {cmp.description}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50/90 border border-slate-200/80 p-3.5 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] font-bold text-[#B91C1C] uppercase tracking-wide">
                        {locale === 'bn' ? 'এডমিন সমাধান ও কারণ' : 'Admin Reply & Reason'}
                      </p>
                      {cmp.repliedAt && (
                        <span className="text-[11px] text-slate-500 font-mono-num">
                          {formatTimestamp(cmp.repliedAt, locale)}
                        </span>
                      )}
                    </div>
                    {cmp.adminReply ? (
                      <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                        {cmp.adminReply}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400 italic">
                        {locale === 'bn'
                          ? 'এখনো কোনো সমাধান বার্তা পাঠানো হয়নি।'
                          : 'No admin reply sent yet.'}
                      </p>
                    )}
                    {cmp.statusReason && (
                      <div className="pt-2 border-t border-slate-200/80 text-xs text-slate-700">
                        <span className="font-bold text-slate-900">
                          {locale === 'bn' ? 'কারণ: ' : 'Reason: '}
                        </span>
                        <span>{cmp.statusReason}</span>
                      </div>
                    )}
                  </div>
                </div>

                {isEditing && (
                  <form
                    onSubmit={(e) => handleSave(cmp, e)}
                    className="rounded-2xl bg-white/95 border border-red-200/80 p-4 space-y-3.5 shadow-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-bold text-slate-900">
                        {locale === 'bn'
                          ? 'অভিযোগের স্ট্যাটাস ও সমাধান বার্তা লিখুন'
                          : 'Update Complaint Status & Resolution'}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {COMPLAINT_QUICK_REPLIES_BN.map((preset) => (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => {
                              setDraftStatus(preset.status);
                              setDraftReply(preset.reply);
                              setDraftReason(preset.reason);
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
                        const selected = draftStatus === st;
                        return (
                          <button
                            key={st}
                            type="button"
                            onClick={() => setDraftStatus(st)}
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
                              ? 'ইউজারকে সমাধান / রিপ্লাই বার্তা'
                              : 'Resolution Reply to User'}
                          </label>
                          <span className="text-[11px] text-slate-400 font-mono-num">
                            {draftReply.length}/500
                          </span>
                        </div>
                        <textarea
                          rows={3}
                          maxLength={500}
                          value={draftReply}
                          onChange={(e) => setDraftReply(e.target.value)}
                          placeholder={
                            locale === 'bn'
                              ? 'অভিযোগের সমাধান বা উত্তর লিখুন...'
                              : 'Write your resolution reply...'
                          }
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl resize-none"
                        />
                      </div>

                      <div className="lg:col-span-5">
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-semibold text-slate-700">
                            {locale === 'bn' ? 'স্ট্যাটাসের কারণ' : 'Status Reason'}
                          </label>
                          <span className="text-[11px] text-slate-400 font-mono-num">
                            {draftReason.length}/300
                          </span>
                        </div>
                        <textarea
                          rows={3}
                          maxLength={300}
                          value={draftReason}
                          onChange={(e) => setDraftReason(e.target.value)}
                          placeholder={
                            locale === 'bn'
                              ? 'যেমন: সমাধান সম্পন্ন / তথ্য যাচাই চলছে...'
                              : 'Reason shown to user...'
                          }
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl resize-none"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                      >
                        {locale === 'bn' ? 'বাতিল' : 'Cancel'}
                      </button>
                      <button
                        type="submit"
                        disabled={busyId === cmp.id}
                        className="btn-3d inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#B91C1C] hover:bg-[#991B1B] rounded-xl cursor-pointer disabled:opacity-60"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>
                          {busyId === cmp.id
                            ? locale === 'bn'
                              ? 'সেভ হচ্ছে...'
                              : 'Saving...'
                            : locale === 'bn'
                            ? 'সমাধান ও রিপ্লাই পাঠান'
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
  );
};
