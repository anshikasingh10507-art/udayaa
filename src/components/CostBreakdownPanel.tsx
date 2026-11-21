import { Info } from 'lucide-react';
import { formatINR } from '../lib/api';

export type ChargeConfirmationState = 'Owner-confirmed' | 'User-entered estimate' | 'Not yet confirmed';

export interface CostLineItem {
  label: string;
  amount: number | null;
  status: ChargeConfirmationState;
  note?: string;
}

export function CostBreakdownPanel({
  title = 'Estimated Rental Cost Breakdown',
  durationDays,
  baseRate,
  baseStatus,
  lines,
  depositAmount,
  depositStatus,
}: {
  title?: string;
  durationDays: number;
  baseRate: number;
  baseStatus: ChargeConfirmationState;
  lines: CostLineItem[];
  depositAmount: number | null;
  depositStatus: ChargeConfirmationState;
}) {
  const baseTotal = baseRate * Math.max(1, durationDays);
  let knownChargesSum = baseTotal;
  let hasUnknownCharges = baseStatus === 'Not yet confirmed';

  for (const line of lines) {
    if (line.amount == null || line.status === 'Not yet confirmed') {
      hasUnknownCharges = true;
    } else {
      knownChargesSum += line.amount;
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5">
      <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-100">
        <div>
          <h3 className="font-display text-base font-semibold text-[#0F172A]">{title}</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Estimated figures only — not a guaranteed final invoice until confirmed by owner.
          </p>
        </div>
      </div>

      <div className="divide-y divide-slate-100 text-sm mt-2">
        <div className="py-2.5 flex items-center justify-between gap-4">
          <div>
            <div className="font-medium text-[#0F172A]">
              Base equipment rental ({durationDays} {durationDays === 1 ? 'day' : 'days'} × {formatINR(baseRate)})
            </div>
            <div className="text-xs text-slate-500">{baseStatus}</div>
          </div>
          <div className="font-mono tabular-nums font-medium text-[#0F172A] whitespace-nowrap">
            {formatINR(baseTotal)}
          </div>
        </div>

        {lines.map((line) => (
          <div key={line.label} className="py-2.5 flex items-center justify-between gap-4">
            <div>
              <div className="font-medium text-[#0F172A]">{line.label}</div>
              <div className="text-xs text-slate-500">
                {line.status}
                {line.note ? ` · ${line.note}` : ''}
              </div>
            </div>
            <div
              className={`font-mono tabular-nums whitespace-nowrap ${
                line.amount == null || line.status === 'Not yet confirmed'
                  ? 'text-amber-700 text-xs font-sans font-medium'
                  : 'font-medium text-[#0F172A]'
              }`}
            >
              {line.amount == null || line.status === 'Not yet confirmed'
                ? 'Not yet confirmed'
                : formatINR(line.amount)}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 pt-3 border-t border-slate-200 flex items-baseline justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-[#0F172A]">
            {hasUnknownCharges ? 'Estimated subtotal (confirmed items only)' : 'Estimated rental cost'}
          </div>
          {hasUnknownCharges && (
            <div className="text-xs text-amber-700 mt-0.5">
              Excludes charges marked &ldquo;Not yet confirmed&rdquo; above.
            </div>
          )}
        </div>
        <div className="font-mono tabular-nums text-lg font-bold text-[#0F172A] whitespace-nowrap">
          {formatINR(knownChargesSum)}
          {hasUnknownCharges ? ' +' : ''}
        </div>
      </div>

      <div className="mt-4 p-3.5 bg-slate-50 border border-slate-200 rounded-md">
        <div className="flex items-center justify-between gap-4 text-sm">
          <span className="font-medium text-[#0F172A]">Refundable security deposit (separate)</span>
          <span className="font-mono tabular-nums font-semibold text-[#0F172A]">
            {depositAmount == null || depositStatus === 'Not yet confirmed'
              ? 'Not yet confirmed'
              : formatINR(depositAmount)}
          </span>
        </div>
        <div className="flex items-start gap-2 mt-1.5 text-xs text-slate-600">
          <Info className="w-3.5 h-3.5 text-[#0F766E] shrink-0 mt-0.5" aria-hidden="true" />
          <span>
            {depositStatus} · Held separately inside Udaya Escrow alongside rental funds prior to handover, and
            automatically refunded to the renter after return inspection and release.
          </span>
        </div>
      </div>
    </div>
  );
}
