import React from 'react';
import { Timestamp } from 'firebase/firestore';
import { CheckCircle2, Clock, Loader2, XCircle } from 'lucide-react';
import { Locale, SupportTicketStatus, UpgradeRequestStatus } from '../types/shop';

export type NormalizedStage = 'pending' | 'processing' | 'success' | 'rejected';

export function normalizeTicketStatus(status: SupportTicketStatus): NormalizedStage {
  if (status === 'open' || status === 'pending') return 'pending';
  if (status === 'processing') return 'processing';
  if (status === 'resolved') return 'success';
  return 'rejected';
}

export function normalizeUpgradeStatus(status: UpgradeRequestStatus): NormalizedStage {
  if (status === 'pending') return 'pending';
  if (status === 'processing') return 'processing';
  if (status === 'active') return 'success';
  return 'rejected';
}

export function formatTimestamp(ts: Timestamp | null | undefined, locale: Locale): string {
  if (!ts) return '';
  try {
    return ts.toDate().toLocaleString(locale === 'bn' ? 'bn-BD' : 'en-US', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export function getStageMeta(
  stage: NormalizedStage,
  locale: Locale,
  kind: 'ticket' | 'upgrade'
) {
  switch (stage) {
    case 'pending':
      return {
        label: locale === 'bn' ? 'পেন্ডিং' : 'Pending',
        subLabel:
          kind === 'ticket'
            ? locale === 'bn'
              ? 'অপেক্ষমান'
              : 'Waiting'
            : locale === 'bn'
            ? 'যাচাই অপেক্ষমান'
            : 'Awaiting review',
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
        dotClass: 'bg-amber-500',
        Icon: Clock,
      };
    case 'processing':
      return {
        label: locale === 'bn' ? 'প্রসেসিং' : 'Processing',
        subLabel:
          kind === 'ticket'
            ? locale === 'bn'
              ? 'কাজ চলছে'
              : 'In progress'
            : locale === 'bn'
            ? 'পেমেন্ট যাচাই চলছে'
            : 'Verifying payment',
        badgeClass: 'bg-sky-50 text-sky-800 border-sky-200',
        dotClass: 'bg-sky-500',
        Icon: Loader2,
      };
    case 'success':
      return {
        label:
          kind === 'ticket'
            ? locale === 'bn'
              ? 'সফল / সমাধান'
              : 'Resolved'
            : locale === 'bn'
            ? 'সফল / অ্যাক্টিভ'
            : 'Active',
        subLabel:
          kind === 'ticket'
            ? locale === 'bn'
              ? 'সমাধান সম্পন্ন'
              : 'Completed'
            : locale === 'bn'
            ? 'প্যাকেজ চালু'
            : 'Activated',
        badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        dotClass: 'bg-emerald-500',
        Icon: CheckCircle2,
      };
    case 'rejected':
      return {
        label: locale === 'bn' ? 'বাতিল / রিজেক্ট' : 'Rejected',
        subLabel: locale === 'bn' ? 'অনুমোদিত নয়' : 'Declined',
        badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
        dotClass: 'bg-rose-500',
        Icon: XCircle,
      };
  }
}

interface StatusStepperProps {
  stage: NormalizedStage;
  locale: Locale;
  kind: 'ticket' | 'upgrade';
}

export const StatusStepper: React.FC<StatusStepperProps> = ({
  stage,
  locale,
  kind,
}) => {
  const step1Done = true;
  const step2Active = stage === 'processing';
  const step2Done = stage === 'processing' || stage === 'success' || stage === 'rejected';
  const step3Success = stage === 'success';
  const step3Rejected = stage === 'rejected';

  const steps = [
    {
      key: 'pending',
      label: locale === 'bn' ? '১. পেন্ডিং' : '1. Pending',
      active: stage === 'pending',
      done: step1Done,
      tone: 'amber',
    },
    {
      key: 'processing',
      label: locale === 'bn' ? '২. প্রসেসিং' : '2. Processing',
      active: step2Active,
      done: step2Done,
      tone: 'sky',
    },
    {
      key: 'final',
      label: step3Rejected
        ? locale === 'bn'
          ? '৩. বাতিল'
          : '3. Rejected'
        : kind === 'ticket'
        ? locale === 'bn'
          ? '৩. সফল'
          : '3. Resolved'
        : locale === 'bn'
        ? '৩. সফল'
        : '3. Active',
      active: step3Success || step3Rejected,
      done: step3Success || step3Rejected,
      tone: step3Rejected ? 'rose' : 'emerald',
    },
  ] as const;

  const badge = getStageMeta(stage, locale, kind);
  const BadgeIcon = badge.Icon;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-lg border ${badge.badgeClass}`}
        >
          <BadgeIcon className="w-3.5 h-3.5 shrink-0" />
          <span>{badge.label}</span>
        </span>
        <span className="text-[11px] font-medium text-slate-500">
          {badge.subLabel}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {steps.map((step) => {
          let barCls = 'bg-slate-200/80 text-slate-500 border-slate-200';
          if (step.done) {
            if (step.tone === 'amber') {
              barCls = 'bg-amber-100/90 text-amber-900 border-amber-300/80';
            } else if (step.tone === 'sky') {
              barCls = 'bg-sky-100/90 text-sky-900 border-sky-300/80';
            } else if (step.tone === 'emerald') {
              barCls = 'bg-emerald-100/90 text-emerald-900 border-emerald-300/80';
            } else if (step.tone === 'rose') {
              barCls = 'bg-rose-100/90 text-rose-900 border-rose-300/80';
            }
          }
          return (
            <div
              key={step.key}
              className={`px-2 py-1 rounded-lg border text-[10px] font-bold text-center truncate transition-colors ${barCls} ${
                step.active ? 'ring-1 ring-current/30 shadow-xs' : ''
              }`}
            >
              {step.label}
            </div>
          );
        })}
      </div>
    </div>
  );
};
