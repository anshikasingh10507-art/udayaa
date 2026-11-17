import { CheckCircle2, Clock, FileText, AlertCircle, XCircle, Ban, ShieldCheck } from 'lucide-react';
import type { BookingStatus } from '../types';

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
