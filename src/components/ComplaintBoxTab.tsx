import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Headphones,
  LifeBuoy,
  MessageCircle,
  MessageSquareReply,
  MessageSquareWarning,
  PhoneCall,
  Send,
  ShieldAlert,
} from 'lucide-react';
import {
  Complaint,
  ComplaintSeverity,
  Locale,
  ShopProfile,
  SupportTicket,
} from '../types/shop';
import { SUPPORT_HELPLINE } from '../lib/shopService';
import {
  formatTimestamp,
  normalizeTicketStatus,
  StatusStepper,
} from './StatusStepper';

interface ComplaintBoxTabProps {
  locale: Locale;
  shop: ShopProfile;
  complaints: Complaint[];
  tickets: SupportTicket[];
  onCreateComplaint: (input: {
    title: string;
    category: string;
    severity: ComplaintSeverity;
    referenceInfo?: string;
    description: string;
    contactPhone: string;
  }) => Promise<void>;
  onToggleComplaintStatus: (
    complaintId: string,
    status: 'pending' | 'resolved'
  ) => Promise<void>;
  onCreateTicket: (input: {
    subject: string;
    category: string;
    message: string;
    contactPhone: string;
  }) => Promise<void>;
  onToggleTicketStatus: (
    ticketId: string,
    status: 'pending' | 'resolved'
  ) => Promise<void>;
}

type SectionView = 'complaints' | 'tickets';
type StatusFilter = 'all' | 'active' | 'resolved' | 'rejected';

const COMPLAINT_CATEGORIES_BN = [
  'পেমেন্ট ও ট্রানজেকশন',
  'প্যাকেজ ও মেয়াদ',
  'অ্যাপ টেকনিক্যাল সমস্যা',
  'সার্ভিস ও আচরণগত অভিযোগ',
  'অন্যান্য অভিযোগ',
];

export const ComplaintBoxTab: React.FC<ComplaintBoxTabProps> = ({
  locale,
  shop,
  complaints,
  tickets,
  onCreateComplaint,
  onToggleComplaintStatus,
  onCreateTicket,
  onToggleTicketStatus,
}) => {
  const [view, setView] = useState<SectionView>('complaints');

  const [cmpTitle, setCmpTitle] = useState('');
  const [cmpCategory, setCmpCategory] = useState(COMPLAINT_CATEGORIES_BN[0]);
  const [cmpSeverity, setCmpSeverity] = useState<ComplaintSeverity>('urgent');
  const [cmpReference, setCmpReference] = useState('');
  const [cmpPhone, setCmpPhone] = useState(shop.phone || '');
  const [cmpDesc, setCmpDesc] = useState('');
  const [sendingComplaint, setSendingComplaint] = useState(false);
  const [complaintFilter, setComplaintFilter] = useState<StatusFilter>('all');

  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('সাধারণ সহায়তা');
  const [contactPhone, setContactPhone] = useState(shop.phone || '');
  const [message, setMessage] = useState('');
  const [sendingTicket, setSendingTicket] = useState(false);
  const [ticketFilter, setTicketFilter] = useState<StatusFilter>('all');

  const filteredComplaints = useMemo(() => {
    return complaints.filter((c) => {
      const stage = normalizeTicketStatus(c.status);
      if (complaintFilter === 'active') return stage === 'pending' || stage === 'processing';
      if (complaintFilter === 'resolved') return stage === 'success';
      if (complaintFilter === 'rejected') return stage === 'rejected';
      return true;
    });
  }, [complaints, complaintFilter]);

  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      const stage = normalizeTicketStatus(t.status);
      if (ticketFilter === 'active') return stage === 'pending' || stage === 'processing';
      if (ticketFilter === 'resolved') return stage === 'success';
      if (ticketFilter === 'rejected') return stage === 'rejected';
      return true;
    });
  }, [tickets, ticketFilter]);

  const handleComplaintSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cmpTitle.trim() || !cmpDesc.trim()) return;
    setSendingComplaint(true);
    try {
      await onCreateComplaint({
        title: cmpTitle.trim(),
        category: cmpCategory,
        severity: cmpSeverity,
        referenceInfo: cmpReference.trim(),
        contactPhone: cmpPhone.trim(),
        description: cmpDesc.trim(),
      });
      setCmpTitle('');
      setCmpReference('');
      setCmpDesc('');
    } finally {
      setSendingComplaint(false);
    }
  };

  const handleTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    setSendingTicket(true);
    try {
      await onCreateTicket({
        subject: subject.trim(),
        category,
        contactPhone: contactPhone.trim(),
        message: message.trim(),
      });
      setSubject('');
      setMessage('');
    } finally {
      setSendingTicket(false);
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
    <div className="space-y-6 animate-3d-enter">
      <div className="glass-3d-crimson glass-sheen rounded-3xl p-6 sm:p-7 text-white flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-300 text-3d-amber-glow">
            {locale === 'bn'
              ? 'আলাদা ইউজার অভিযোগ বক্স · ২৪/৭ হেল্পলাইন · তাৎক্ষণিক ইমেইল অ্যালার্ট'
              : 'Dedicated Complaint Box · 24/7 Helpline · Instant Email Alert'}
          </p>
          <h2 className="font-display text-2xl sm:text-3xl font-bold font-mono-num tracking-tight text-3d-light">
            {SUPPORT_HELPLINE}
          </h2>
          <p className="text-xs sm:text-sm text-red-100/95 max-w-xl leading-relaxed">
            {locale === 'bn'
              ? 'যেকোনো পেমেন্ট সমস্যা, অ্যাপ ত্রুটি বা সার্ভিস সংক্রান্ত অভিযোগ জমা দিন — আপনার অভিযোগ সরাসরি অ্যাডমিন প্যানেল ও ইমেইলে পৌঁছে যাবে।'
              : 'Submit formal complaints about payments, packages, or app issues — delivered instantly to the admin panel and email inbox.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <a
            href={`tel:${SUPPORT_HELPLINE}`}
            className="btn-3d inline-flex items-center gap-2 px-4 py-2.5 bg-white text-[#991B1B] text-xs font-bold rounded-xl hover:bg-red-50 transition-colors whitespace-nowrap"
          >
            <PhoneCall className="w-4 h-4" />
            <span>
              {locale === 'bn'
                ? `সরাসরি কল (${SUPPORT_HELPLINE})`
                : `Call ${SUPPORT_HELPLINE}`}
            </span>
          </a>
          <a
            href={`https://wa.me/88${SUPPORT_HELPLINE}?text=${encodeURIComponent(
              `আসসালামু আলাইকুম, ${shop.shopName} থেকে অভিযোগ / সাপোর্ট বিষয়ে যোগাযোগ করছি।`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-3d inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-colors whitespace-nowrap"
          >
            <MessageCircle className="w-4 h-4" />
            <span>{locale === 'bn' ? 'হোয়াটসঅ্যাপ' : 'WhatsApp'}</span>
          </a>
        </div>
      </div>

      <div className="glass-3d-tile rounded-2xl p-2 inline-flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => setView('complaints')}
          className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl cursor-pointer transition-all ${
            view === 'complaints'
              ? 'bg-[#B91C1C] text-white shadow-sm'
              : 'text-slate-700 hover:bg-white/75'
          }`}
        >
          <MessageSquareWarning className="w-4 h-4" />
          <span>
            {locale === 'bn'
              ? `অভিযোগ বক্স (${complaints.length})`
              : `Complaint Box (${complaints.length})`}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setView('tickets')}
          className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl cursor-pointer transition-all ${
            view === 'tickets'
              ? 'bg-[#B91C1C] text-white shadow-sm'
              : 'text-slate-700 hover:bg-white/75'
          }`}
        >
          <Headphones className="w-4 h-4" />
          <span>
            {locale === 'bn'
              ? `সাধারণ সাপোর্ট টিকেট (${tickets.length})`
              : `Support Tickets (${tickets.length})`}
          </span>
        </button>
      </div>

      {view === 'complaints' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <form
            onSubmit={handleComplaintSubmit}
            className="lg:col-span-5 glass-card rounded-3xl p-6 space-y-4"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-200/70 flex items-center justify-center text-[#B91C1C] shrink-0">
                <MessageSquareWarning className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="font-display text-sm font-bold text-slate-900">
                  {locale === 'bn' ? 'নতুন অভিযোগ জমা দিন' : 'File a Formal Complaint'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {locale === 'bn'
                    ? 'অভিযোগ সরাসরি এডমিন প্যানেল ও ইমেইলে পৌঁছাবে'
                    : 'Delivered directly to admin panel & email'}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {locale === 'bn' ? 'অভিযোগের শিরোনাম *' : 'Complaint Title *'}
                </label>
                <input
                  type="text"
                  required
                  maxLength={120}
                  value={cmpTitle}
                  onChange={(e) => setCmpTitle(e.target.value)}
                  placeholder={
                    locale === 'bn'
                      ? 'যেমন: বিকাশ পেমেন্ট করেছি কিন্তু প্যাকেজ চালু হয়নি'
                      : 'e.g. Payment sent but package not yet active'
                  }
                  className="w-full px-3 py-2 text-sm bg-white/90 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {locale === 'bn' ? 'গুরুত্বের মাত্রা' : 'Urgency Level'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      ['normal', locale === 'bn' ? 'সাধারণ' : 'Normal'],
                      ['urgent', locale === 'bn' ? 'জরুরি' : 'Urgent'],
                      ['critical', locale === 'bn' ? 'অতি জরুরি' : 'Critical'],
                    ] as [ComplaintSeverity, string][]
                  ).map(([sev, lbl]) => (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => setCmpSeverity(sev)}
                      className={`py-2 px-2 text-xs font-bold rounded-xl border cursor-pointer transition-colors ${
                        cmpSeverity === sev
                          ? sev === 'critical'
                            ? 'bg-rose-600 text-white border-rose-600'
                            : sev === 'urgent'
                            ? 'bg-amber-500 text-white border-amber-500'
                            : 'bg-slate-800 text-white border-slate-800'
                          : 'bg-white/85 text-slate-700 border-slate-200 hover:bg-white'
                      }`}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {locale === 'bn' ? 'অভিযোগের ধরন' : 'Category'}
                  </label>
                  <select
                    value={cmpCategory}
                    onChange={(e) => setCmpCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold bg-white/90 border border-slate-300 rounded-xl"
                  >
                    {COMPLAINT_CATEGORIES_BN.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {locale === 'bn' ? 'যোগাযোগের নম্বর' : 'Contact Phone'}
                  </label>
                  <input
                    type="tel"
                    maxLength={30}
                    value={cmpPhone}
                    onChange={(e) => setCmpPhone(e.target.value)}
                    placeholder="01XXXXXXXXX"
                    className="w-full px-3 py-2 text-sm bg-white/90 border border-slate-300 rounded-xl font-mono-num"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {locale === 'bn'
                    ? 'TrxID / প্রাসঙ্গিক রেফারেন্স (ঐচ্ছিক)'
                    : 'TrxID / Reference Info (Optional)'}
                </label>
                <input
                  type="text"
                  maxLength={80}
                  value={cmpReference}
                  onChange={(e) => setCmpReference(e.target.value)}
                  placeholder={
                    locale === 'bn'
                      ? 'যেমন: TrxID BL98X72K1Q বা পেমেন্ট নম্বর'
                      : 'e.g. TrxID or order ref'
                  }
                  className="w-full px-3 py-2 text-sm bg-white/90 border border-slate-300 rounded-xl font-mono-num"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    {locale === 'bn' ? 'বিস্তারিত অভিযোগ *' : 'Complaint Details *'}
                  </label>
                  <span className="text-[11px] text-slate-400 font-mono-num">
                    {cmpDesc.length}/600
                  </span>
                </div>
                <textarea
                  rows={4}
                  required
                  maxLength={600}
                  value={cmpDesc}
                  onChange={(e) => setCmpDesc(e.target.value)}
                  placeholder={
                    locale === 'bn'
                      ? 'আপনার অভিযোগটি পরিষ্কারভাবে লিখুন যাতে দ্রুত সমাধান করা যায়...'
                      : 'Describe the issue clearly so our team can resolve it fast...'
                  }
                  className="w-full px-3 py-2 text-sm bg-white/90 border border-slate-300 rounded-xl resize-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={sendingComplaint}
              className="btn-3d w-full py-2.5 px-4 bg-[#B91C1C] hover:bg-[#991B1B] text-white text-xs font-bold rounded-xl inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <Send className="w-3.5 h-3.5" />
              <span>
                {sendingComplaint
                  ? locale === 'bn'
                    ? 'অভিযোগ পাঠানো হচ্ছে...'
                    : 'Submitting Complaint...'
                  : locale === 'bn'
                  ? 'অভিযোগ বক্সে জমা দিন'
                  : 'Submit Complaint'}
              </span>
            </button>
          </form>

          <div className="lg:col-span-7 glass-card rounded-3xl p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-display text-sm font-bold text-slate-900">
                  {locale === 'bn'
                    ? 'আপনার অভিযোগ তালিকা ও এডমিন সমাধান'
                    : 'Your Complaints & Admin Resolution'}
                </h3>
                <p className="text-xs text-slate-500 font-mono-num">
                  {complaints.length} {locale === 'bn' ? 'টি অভিযোগ' : 'complaints'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/70">
                {(
                  [
                    ['all', locale === 'bn' ? 'সব' : 'All'],
                    ['active', locale === 'bn' ? 'চলমান' : 'Active'],
                    ['resolved', locale === 'bn' ? 'সফল' : 'Resolved'],
                    ['rejected', locale === 'bn' ? 'বাতিল' : 'Rejected'],
                  ] as [StatusFilter, string][]
                ).map(([id, lbl]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setComplaintFilter(id)}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg cursor-pointer transition-colors ${
                      complaintFilter === id
                        ? 'bg-white text-[#B91C1C] shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            </div>

            {filteredComplaints.length === 0 ? (
              <div className="rounded-2xl bg-white/80 border border-slate-200/80 py-10 px-4 text-center space-y-1">
                <p className="text-sm font-semibold text-slate-700">
                  {locale === 'bn'
                    ? 'এই তালিকায় এখনো কোনো অভিযোগ নেই।'
                    : 'No complaints found in this view.'}
                </p>
                <p className="text-xs text-slate-500">
                  {locale === 'bn'
                    ? `জরুরি প্রয়োজনে সরাসরি ${SUPPORT_HELPLINE} নম্বরে কল করুন।`
                    : `Call ${SUPPORT_HELPLINE} anytime for urgent support.`}
                </p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {filteredComplaints.map((cmp) => {
                  const stage = normalizeTicketStatus(cmp.status);
                  const canResolve = stage === 'pending' || stage === 'processing';
                  const canReopen = stage === 'success';
                  const sev = severityMeta(cmp.severity);
                  const SevIcon = sev.Icon;

                  return (
                    <div key={cmp.id} className="rounded-2xl bg-white/90 border border-slate-200/85 p-4 space-y-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="space-y-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-bold text-slate-900">
                              {cmp.title}
                            </p>
                            <span
                              className={`inline-flex items-center gap-1 text-[11px] font-bold ${sev.cls}`}
                            >
                              <SevIcon className="w-3.5 h-3.5 shrink-0" />
                              <span>{sev.label}</span>
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">
                            {cmp.category}
                            {cmp.referenceInfo ? ` · Ref: ${cmp.referenceInfo}` : ''}
                            {cmp.contactPhone ? ` · ${cmp.contactPhone}` : ''}
                            {cmp.createdAt
                              ? ` · ${formatTimestamp(cmp.createdAt, locale)}`
                              : ''}
                          </p>
                        </div>

                        {(canResolve || canReopen) && (
                          <button
                            type="button"
                            onClick={() =>
                              onToggleComplaintStatus(
                                cmp.id,
                                canResolve ? 'resolved' : 'pending'
                              )
                            }
                            className={`text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer transition-colors ${
                              canResolve
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200'
                            }`}
                          >
                            {canResolve
                              ? locale === 'bn'
                                ? 'সমাধান হয়েছে'
                                : 'Mark Resolved'
                              : locale === 'bn'
                              ? 'পুনরায় খুলুন'
                              : 'Reopen'}
                          </button>
                        )}
                      </div>

                      <StatusStepper stage={stage} locale={locale} kind="ticket" />

                      <div className="rounded-xl bg-white/85 border border-slate-200/80 p-3 space-y-1">
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                          {locale === 'bn' ? 'অভিযোগের বিবরণ' : 'Complaint Details'}
                        </p>
                        <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                          {cmp.description}
                        </p>
                      </div>

                      {(cmp.adminReply || cmp.statusReason) && (
                        <div className="rounded-xl bg-red-50/75 border border-red-200/70 p-3.5 space-y-2">
                          {cmp.adminReply && (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#B91C1C]">
                                  <MessageSquareReply className="w-3.5 h-3.5" />
                                  <span>
                                    {locale === 'bn'
                                      ? 'এডমিনের সমাধান বার্তা'
                                      : 'Admin Resolution Reply'}
                                  </span>
                                </span>
                                {cmp.repliedAt && (
                                  <span className="text-[11px] text-slate-500 font-mono-num">
                                    {formatTimestamp(cmp.repliedAt, locale)}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-900 leading-relaxed whitespace-pre-wrap">
                                {cmp.adminReply}
                              </p>
                            </div>
                          )}

                          {cmp.statusReason && (
                            <div
                              className={`text-xs text-slate-700 ${
                                cmp.adminReply ? 'pt-2 border-t border-red-200/60' : ''
                              }`}
                            >
                              <span className="font-bold text-slate-900">
                                {locale === 'bn' ? 'কারণ / নোট: ' : 'Reason: '}
                              </span>
                              <span>{cmp.statusReason}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <form
            onSubmit={handleTicketSubmit}
            className="lg:col-span-5 glass-card rounded-3xl p-6 space-y-4"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-200/70 flex items-center justify-center text-[#B91C1C] shrink-0">
                <LifeBuoy className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="font-display text-sm font-bold text-slate-900">
                  {locale === 'bn'
                    ? 'কাস্টমার সাপোর্ট টিকেট পাঠান'
                    : 'Submit Support Ticket'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {locale === 'bn'
                    ? 'টিকেট সরাসরি এডমিন প্যানেল ও ইমেইলে পৌঁছাবে'
                    : 'Sent directly to admin panel & email'}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {locale === 'bn' ? 'বিষয় *' : 'Subject *'}
                </label>
                <input
                  type="text"
                  required
                  maxLength={120}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder={
                    locale === 'bn'
                      ? 'যেমন: পিন রিসেট / হিসাব সিঙ্ক সহায়তা'
                      : 'e.g. PIN help or sync question'
                  }
                  className="w-full px-3 py-2 text-sm bg-white/90 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {locale === 'bn' ? 'সমস্যার ধরন' : 'Category'}
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold bg-white/90 border border-slate-300 rounded-xl"
                  >
                    <option value="সাধারণ সহায়তা">সাধারণ সহায়তা</option>
                    <option value="প্যাকেজ ও পেমেন্ট">প্যাকেজ ও পেমেন্ট</option>
                    <option value="টালিখাতা ও ব্যাকআপ">টালিখাতা ও ব্যাকআপ</option>
                    <option value="রিচার্জ ও MFS">রিচার্জ ও MFS</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {locale === 'bn' ? 'আপনার মোবাইল নম্বর' : 'Your Phone'}
                  </label>
                  <input
                    type="tel"
                    maxLength={30}
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="01XXXXXXXXX"
                    className="w-full px-3 py-2 text-sm bg-white/90 border border-slate-300 rounded-xl font-mono-num"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {locale === 'bn' ? 'বিস্তারিত বিবরণ *' : 'Message *'}
                </label>
                <textarea
                  rows={4}
                  required
                  maxLength={500}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={
                    locale === 'bn'
                      ? 'আপনার প্রশ্ন বা সহায়তার অনুরোধ লিখুন...'
                      : 'Describe how we can help...'
                  }
                  className="w-full px-3 py-2 text-sm bg-white/90 border border-slate-300 rounded-xl resize-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={sendingTicket}
              className="btn-3d w-full py-2.5 px-4 bg-[#B91C1C] hover:bg-[#991B1B] text-white text-xs font-bold rounded-xl inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <Send className="w-3.5 h-3.5" />
              <span>
                {sendingTicket
                  ? locale === 'bn'
                    ? 'পাঠানো হচ্ছে...'
                    : 'Submitting...'
                  : locale === 'bn'
                  ? 'সাপোর্ট টিকেট জমা দিন'
                  : 'Submit Ticket'}
              </span>
            </button>
          </form>

          <div className="lg:col-span-7 glass-card rounded-3xl p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-display text-sm font-bold text-slate-900">
                  {locale === 'bn'
                    ? 'আপনার সাপোর্ট টিকেট ও এডমিন রিপ্লাই'
                    : 'Your Support Tickets & Admin Replies'}
                </h3>
                <p className="text-xs text-slate-500 font-mono-num">
                  {tickets.length} {locale === 'bn' ? 'টি টিকেট' : 'tickets'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/70">
                {(
                  [
                    ['all', locale === 'bn' ? 'সব' : 'All'],
                    ['active', locale === 'bn' ? 'চলমান' : 'Active'],
                    ['resolved', locale === 'bn' ? 'সফল' : 'Resolved'],
                    ['rejected', locale === 'bn' ? 'বাতিল' : 'Rejected'],
                  ] as [StatusFilter, string][]
                ).map(([id, lbl]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTicketFilter(id)}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg cursor-pointer transition-colors ${
                      ticketFilter === id
                        ? 'bg-white text-[#B91C1C] shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            </div>

            {filteredTickets.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">
                {locale === 'bn'
                  ? `কোনো টিকেট পাওয়া যায়নি। সরাসরি ${SUPPORT_HELPLINE} নম্বরে কল করুন।`
                  : `No tickets found. Call ${SUPPORT_HELPLINE} anytime.`}
              </p>
            ) : (
              <div className="space-y-3.5">
                {filteredTickets.map((tkt) => {
                  const stage = normalizeTicketStatus(tkt.status);
                  const canUserMarkResolved =
                    stage === 'pending' || stage === 'processing';
                  const canUserReopen = stage === 'success';

                  return (
                    <div key={tkt.id} className="rounded-2xl bg-white/90 border border-slate-200/85 p-4 space-y-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <p className="text-sm font-bold text-slate-900">{tkt.subject}</p>
                          <p className="text-xs text-slate-500">
                            {tkt.category}
                            {tkt.contactPhone ? ` · ${tkt.contactPhone}` : ''}
                            {tkt.createdAt
                              ? ` · ${formatTimestamp(tkt.createdAt, locale)}`
                              : ''}
                          </p>
                        </div>

                        {(canUserMarkResolved || canUserReopen) && (
                          <button
                            type="button"
                            onClick={() =>
                              onToggleTicketStatus(
                                tkt.id,
                                canUserMarkResolved ? 'resolved' : 'pending'
                              )
                            }
                            className={`text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer transition-colors ${
                              canUserMarkResolved
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200'
                            }`}
                          >
                            {canUserMarkResolved
                              ? locale === 'bn'
                                ? 'সমাধান হয়েছে'
                                : 'Mark Resolved'
                              : locale === 'bn'
                              ? 'পুনরায় খুলুন'
                              : 'Reopen'}
                          </button>
                        )}
                      </div>

                      <StatusStepper stage={stage} locale={locale} kind="ticket" />

                      <div className="rounded-xl bg-white/85 border border-slate-200/80 p-3 space-y-1">
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                          {locale === 'bn' ? 'আপনার বার্তা' : 'Your Message'}
                        </p>
                        <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                          {tkt.message}
                        </p>
                      </div>

                      {(tkt.adminReply || tkt.statusReason) && (
                        <div className="rounded-xl bg-red-50/75 border border-red-200/70 p-3.5 space-y-2">
                          {tkt.adminReply && (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#B91C1C]">
                                  <MessageSquareReply className="w-3.5 h-3.5" />
                                  <span>
                                    {locale === 'bn'
                                      ? 'এডমিন সাপোর্ট রিপ্লাই'
                                      : 'Admin Support Reply'}
                                  </span>
                                </span>
                                {tkt.repliedAt && (
                                  <span className="text-[11px] text-slate-500 font-mono-num">
                                    {formatTimestamp(tkt.repliedAt, locale)}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-900 leading-relaxed whitespace-pre-wrap">
                                {tkt.adminReply}
                              </p>
                            </div>
                          )}

                          {tkt.statusReason && (
                            <div
                              className={`text-xs text-slate-700 ${
                                tkt.adminReply ? 'pt-2 border-t border-red-200/60' : ''
                              }`}
                            >
                              <span className="font-bold text-slate-900">
                                {locale === 'bn' ? 'কারণ / নোট: ' : 'Reason: '}
                              </span>
                              <span>{tkt.statusReason}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
