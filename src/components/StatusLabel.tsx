import { CheckCircle2, Clock, FileText, AlertCircle, XCircle, Ban, ShieldCheck } from 'lucide-react';
import type { BookingStatus, VerificationBadgeTier } from '../types';
import { useLanguage } from '../context/LanguageContext';

export function VerifiedMachineryBadge({
  isVerified,
  tier,
  certificateId,
  compact = false,
}: {
  isVerified?: boolean;
  tier?: VerificationBadgeTier | string | null;
  certificateId?: string | null;
  compact?: boolean;
}) {
  const { t } = useLanguage();
  const effectiveTier = isVerified || tier === 'udaya_verified' ? 'udaya_verified' : tier || 'unverified';

  if (effectiveTier === 'udaya_verified') {
    return (
      <span
        title={certificateId ? `Udaya Verified Machinery · Cert ${certificateId}` : 'Udaya Verified Machinery'}
        className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 whitespace-nowrap shrink-0"
      >
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" aria-hidden="true" />
        <span>{t('badge.verifiedMachinery')}</span>
        {!compact && certificateId && (
          <span className="font-mono text-[11px] font-normal text-emerald-700/90">
            · {certificateId}
          </span>
        )}
      </span>
    );
  }

  if (effectiveTier === 'documents_reviewed') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-teal-800 whitespace-nowrap shrink-0">
        <FileText className="w-3.5 h-3.5 text-teal-600 shrink-0" aria-hidden="true" />
        <span>{t('badge.documentsReviewed')}</span>
      </span>
    );
  }

  return null;
}

export function BookingStatusLabel({ status }: { status: BookingStatus | string }) {
  const configs: Record<string, { style: string; Icon: typeof Clock }> = {
    'Request submitted': {
      style: 'bg-slate-100 text-slate-800 border-slate-300',
      Icon: Clock,
    },
    'Owner reviewing': {
      style: 'bg-amber-50 text-amber-800 border-amber-200',
      Icon: Clock,
    },
    'Quotation received': {
      style: 'bg-teal-50 text-teal-800 border-teal-200',
      Icon: FileText,
    },
    Accepted: {
      style: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      Icon: CheckCircle2,
    },
    Rejected: {
      style: 'bg-rose-50 text-rose-800 border-rose-200',
      Icon: XCircle,
    },
    Cancelled: {
      style: 'bg-slate-100 text-slate-600 border-slate-300',
      Icon: Ban,
    },
    Completed: {
      style: 'bg-sky-50 text-sky-900 border-sky-200',
      Icon: CheckCircle2,
    },
  };

  const cfg = configs[status] || {
    style: 'bg-slate-100 text-slate-800 border-slate-300',
    Icon: AlertCircle,
  };
  const Icon = cfg.Icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded border whitespace-nowrap shrink-0 ${cfg.style}`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{status}</span>
    </span>
  );
}

export function MaintenanceVerificationLabel({
  status,
}: {
  status: 'Owner-provided' | 'Documents submitted' | 'Independently verified' | string | null | undefined;
}) {
  if (!status) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded border bg-slate-50 text-slate-600 border-slate-200 whitespace-nowrap shrink-0">
        <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>No maintenance record yet</span>
      </span>
    );
  }

  if (status === 'Independently verified') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded border bg-emerald-50 text-emerald-800 border-emerald-200 whitespace-nowrap shrink-0">
        <ShieldCheck className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>Independently verified</span>
      </span>
    );
  }

  if (status === 'Documents submitted') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded border bg-teal-50 text-teal-800 border-teal-200 whitespace-nowrap shrink-0">
        <FileText className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>Documents submitted</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded border bg-amber-50 text-amber-800 border-amber-200 whitespace-nowrap shrink-0">
      <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>Owner-provided</span>
    </span>
  );
}
