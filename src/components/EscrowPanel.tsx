import React, { useState, useEffect } from 'react';
import { Lock, CheckCircle2, AlertTriangle, ShieldCheck, ArrowRight, X } from 'lucide-react';
import { apiFetch, formatINR } from '../lib/api';
import { useLanguage } from '../context/LanguageContext';
import type { EscrowEvent, EscrowStatus, RentalRequest } from '../types';

export function EscrowStatusBadge({ status }: { status?: EscrowStatus | null }) {
  const { t } = useLanguage();
  if (!status || status === 'pending_funding') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
        <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
        <span>{t('escrow.statusPending')}</span>
      </span>
    );
  }
  if (status === 'funded_held') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0F766E]">
        <Lock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>{t('escrow.statusFunded')}</span>
      </span>
    );
  }
  if (status === 'handover_confirmed') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-800">
        <ShieldCheck className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>{t('escrow.statusHandover')}</span>
      </span>
    );
  }
  if (status === 'released_to_owner') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>{t('escrow.statusReleased')}</span>
      </span>
    );
  }
  if (status === 'refunded_to_renter') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-800">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>{t('escrow.statusRefunded')}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700">
      <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{t('escrow.statusDisputed')}</span>
    </span>
  );
}

export function EscrowWorkflowPanel({
  booking,
  role,
  onUpdated,
}: {
  booking: RentalRequest;
  role: 'renter' | 'owner';
  onUpdated: () => Promise<void>;
}) {
  const { t } = useLanguage();
  const [showFundModal, setShowFundModal] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [events, setEvents] = useState<EscrowEvent[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'UPI Escrow' | 'Bank Transfer (NEFT/RTGS)' | 'Corporate Card'>(
    'UPI Escrow'
  );
  const [disputeReason, setDisputeReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  const rentalAmount =
    booking.base_rental_total +
    (booking.transport_charge ?? 0) +
    (booking.operator_charge ?? 0) +
    (booking.fuel_charge ?? 0) +
    (booking.other_charge ?? 0);
  const depositAmount = booking.deposit_amount ?? 0;
  const totalDue = rentalAmount + depositAmount;
  const platformFee = booking.escrow_platform_fee ?? Math.round(rentalAmount * 0.05);
  const ownerNet = Math.max(0, rentalAmount - platformFee);

  const status = booking.escrow_status;
  const canFund =
    role === 'renter' &&
    (!status || status === 'pending_funding') &&
    ['Quotation received', 'Accepted', 'Request submitted', 'Owner reviewing'].includes(booking.status);
  const canConfirmHandover = status === 'funded_held';
  const canRelease = role === 'renter' && (status === 'funded_held' || status === 'handover_confirmed');
  const canDispute = status === 'funded_held' || status === 'handover_confirmed';

  useEffect(() => {
    if (!showTimeline || !booking.escrow_id) return;
    apiFetch<{ events: EscrowEvent[] }>(`/api/escrow/booking/${booking.id}`)
      .then((res) => setEvents(res.events || []))
      .catch(() => {});
  }, [showTimeline, booking.id, booking.escrow_id, status]);

  const handleFund = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrMsg('');
    try {
      await apiFetch(`/api/escrow/${booking.id}/fund`, {
        method: 'POST',
        body: JSON.stringify({ paymentMethod }),
      });
      setShowFundModal(false);
      await onUpdated();
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : 'Unable to fund escrow.');
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmHandover = async () => {
    setBusy(true);
    setErrMsg('');
    try {
      await apiFetch(`/api/escrow/${booking.id}/confirm-handover`, { method: 'POST' });
      await onUpdated();
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : 'Unable to confirm handover.');
    } finally {
      setBusy(false);
    }
  };

  const handleRelease = async () => {
    setBusy(true);
    setErrMsg('');
    try {
      await apiFetch(`/api/escrow/${booking.id}/release`, { method: 'POST' });
      await onUpdated();
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : 'Unable to release escrow.');
    } finally {
      setBusy(false);
    }
  };

  const handleDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputeReason.trim()) return;
    setBusy(true);
    setErrMsg('');
    try {
      await apiFetch(`/api/escrow/${booking.id}/dispute`, {
        method: 'POST',
        body: JSON.stringify({ reason: disputeReason.trim() }),
      });
      setShowDisputeModal(false);
      setDisputeReason('');
      await onUpdated();
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : 'Unable to open dispute.');
    } finally {
      setBusy(false);
    }
  };

  const stepIndex =
    !status || status === 'pending_funding'
      ? 0
      : status === 'funded_held'
        ? 1
        : status === 'handover_confirmed'
          ? 2
          : 3;

  return (
    <div className="bg-[#F8FAFC] border border-slate-200 rounded-md p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#0F172A]">{t('escrow.title')}</span>
            {booking.escrow_ref && (
              <span className="text-xs font-mono text-slate-500">· {booking.escrow_ref}</span>
            )}
          </div>
          <EscrowStatusBadge status={status} />
        </div>

        <div className="text-right font-mono tabular-nums text-xs text-slate-700">
          <div>
            Rental: <span className="font-semibold text-[#0F172A]">{formatINR(rentalAmount)}</span> · Deposit:{' '}
            <span className="font-semibold text-[#0F172A]">{formatINR(depositAmount)}</span>
          </div>
          {role === 'owner' && (
            <div className="text-[11px] text-slate-500 mt-0.5">
              Est. Owner Net Payout (after 5% fee): <span className="font-semibold text-emerald-700">{formatINR(ownerNet)}</span>
            </div>
          )}
        </div>
      </div>

      {/* 4-Step Milestone Bar */}
      <div className="grid grid-cols-4 gap-2 pt-1 text-[11px]">
        {[
          { label: '1. Fund Escrow', done: stepIndex >= 1 },
          { label: '2. Held Safely', done: stepIndex >= 1 },
          { label: '3. Handover Verified', done: stepIndex >= 2 },
          {
            label:
              status === 'disputed'
                ? '4. Disputed'
                : status === 'refunded_to_renter'
                  ? '4. Refunded'
                  : '4. Payout & Refund',
            done: stepIndex >= 3,
          },
        ].map((step) => (
          <div key={step.label} className="space-y-1">
            <div
              className={`h-1.5 rounded-full ${
                status === 'disputed' && step.label.startsWith('4')
                  ? 'bg-rose-500'
                  : step.done
                    ? 'bg-[#0D9488]'
                    : 'bg-slate-200'
              }`}
            />
            <div className={`truncate ${step.done ? 'font-medium text-[#0F172A]' : 'text-slate-500'}`}>
              {step.label}
            </div>
          </div>
        ))}
      </div>

      {booking.escrow_dispute_reason && status === 'disputed' && (
        <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-xs text-rose-800">
          <span className="font-semibold">Frozen dispute reason:</span> {booking.escrow_dispute_reason}
        </div>
      )}

      {errMsg && <div className="text-xs text-rose-700 font-medium">{errMsg}</div>}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        {canFund && (
          <button
            type="button"
            disabled={busy}
            onClick={() => setShowFundModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-[#0F172A] hover:bg-slate-800 rounded transition-colors"
          >
            <Lock className="w-3.5 h-3.5 text-teal-400" aria-hidden="true" />
            <span>{t('escrow.fundButton')}</span>
          </button>
        )}
        {canConfirmHandover && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleConfirmHandover()}
            className="px-3.5 py-1.5 text-xs font-medium text-white bg-[#0D9488] hover:bg-[#0F766E] rounded transition-colors"
          >
            {t('escrow.confirmHandover')}
          </button>
        )}
        {canRelease && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleRelease()}
            className="px-3.5 py-1.5 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded transition-colors"
          >
            {t('escrow.releaseFunds')}
          </button>
        )}
        {canDispute && (
          <button
            type="button"
            disabled={busy}
            onClick={() => setShowDisputeModal(true)}
            className="px-3 py-1.5 text-xs font-medium text-rose-700 border border-rose-200 bg-white hover:bg-rose-50 rounded transition-colors"
          >
            {t('escrow.openDispute')}
          </button>
        )}
        {booking.escrow_id && (
          <button
            type="button"
            onClick={() => setShowTimeline((p) => !p)}
            className="ml-auto text-xs font-medium text-slate-600 hover:text-[#0F172A] underline"
          >
            {showTimeline ? 'Hide Audit Trail' : 'Escrow Audit Trail'}
          </button>
        )}
      </div>

      {showTimeline && events.length > 0 && (
        <div className="pt-2 border-t border-slate-200 space-y-1.5">
          {events.map((ev) => (
            <div key={ev.id} className="text-xs text-slate-600 flex items-start justify-between gap-3">
              <div>
                <span className="font-mono font-semibold text-[#0F172A]">{ev.event_type}</span> — {ev.note}
              </div>
              <span className="font-mono text-[11px] text-slate-400 shrink-0">{ev.created_at.slice(0, 16).replace('T', ' ')}</span>
            </div>
          ))}
        </div>
      )}

      {/* Fund Escrow Modal */}
      {showFundModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleFund}
            className="bg-white border border-slate-200 rounded-lg p-6 max-w-md w-full space-y-4 shadow-xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-bold text-[#0F172A]">{t('escrow.title')}</h3>
                <p className="text-xs text-slate-600 mt-0.5">{booking.equipment_title}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowFundModal(false)}
                className="text-slate-400 hover:text-slate-700"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-[#F8FAFC] border border-slate-200 rounded-md p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Rental charges ({booking.duration_days}d)</span>
                <span className="font-mono tabular-nums font-medium">{formatINR(rentalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Refundable security deposit (held separately)</span>
                <span className="font-mono tabular-nums font-medium">{formatINR(depositAmount)}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-[#0F172A]">
                <span>Total Held in Escrow</span>
                <span className="font-mono tabular-nums">{formatINR(totalDue)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-700">Escrow Funding Rail (Sandbox)</label>
              <div className="grid grid-cols-1 gap-2">
                {(['UPI Escrow', 'Bank Transfer (NEFT/RTGS)', 'Corporate Card'] as const).map((method) => (
                  <label
                    key={method}
                    className={`flex items-center justify-between px-3 py-2.5 border rounded-md text-xs font-medium cursor-pointer ${
                      paymentMethod === method
                        ? 'border-[#0D9488] bg-teal-50/60 text-[#0F172A]'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>{method}</span>
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={paymentMethod === method}
                      onChange={() => setPaymentMethod(method)}
                      className="text-[#0D9488]"
                    />
                  </label>
                ))}
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Your funds are held in Udaya Escrow—never sent directly to the owner upfront. Once equipment is returned
              safely, the rental payout is released (5% escrow service fee deducted from owner payout) and your full{' '}
              {formatINR(depositAmount)} deposit is refunded.
            </p>

            {errMsg && <div className="text-xs text-rose-700">{errMsg}</div>}

            <div className="flex justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={() => setShowFundModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-md"
              >
                <span>{busy ? 'Funding Escrow...' : `Lock ${formatINR(totalDue)} in Escrow`}</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Dispute Modal */}
      {showDisputeModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleDispute}
            className="bg-white border border-slate-200 rounded-lg p-6 max-w-md w-full space-y-4 shadow-xl"
          >
            <h3 className="font-display text-lg font-bold text-[#0F172A]">Freeze Escrow & Open Dispute</h3>
            <p className="text-xs text-slate-600">
              Opening a dispute immediately freezes held escrow funds ({booking.escrow_ref}) and alerts an Udaya
              Administrator for independent mediation.
            </p>
            <textarea
              rows={3}
              required
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              placeholder="Describe the equipment breakdown, calibration mismatch, or return discrepancy..."
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md bg-[#F8FAFC]"
            />
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDisputeModal(false)}
                className="px-4 py-2 text-xs text-slate-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="px-4 py-2 text-xs font-medium text-white bg-rose-700 hover:bg-rose-800 rounded-md"
              >
                {busy ? 'Freezing...' : 'Freeze Escrow Funds'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
