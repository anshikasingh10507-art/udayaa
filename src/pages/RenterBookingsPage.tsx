import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch, formatINR } from '../lib/api';
import type { RentalRequest } from '../types';
import { BookingStatusLabel, VerifiedMachineryBadge } from '../components/StatusLabel';
import { CostBreakdownPanel } from '../components/CostBreakdownPanel';
import { EscrowWorkflowPanel } from '../components/EscrowPanel';

export function RenterBookingsPage() {
  const [bookings, setBookings] = useState<RentalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMsg, setActionMsg] = useState('');
  const [enquiryTarget, setEnquiryTarget] = useState<RentalRequest | null>(null);
  const [enquiryText, setEnquiryText] = useState('');
  const [expandedCostId, setExpandedCostId] = useState<number | null>(null);

  const loadBookings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ rentalRequests: RentalRequest[] }>('/api/rental-requests?scope=renter');
      setBookings(data.rentalRequests);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load rental requests.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const handleStatusUpdate = async (id: number, status: 'Cancelled' | 'Accepted') => {
    setActionMsg('');
    setError('');
    try {
      await apiFetch(`/api/rental-requests/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      setActionMsg(`Rental request #${id} updated to "${status}".`);
      await loadBookings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update rental request.');
    }
  };

  const handleSendEnquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enquiryTarget || !enquiryText.trim()) return;
    try {
      await apiFetch('/api/enquiries', {
        method: 'POST',
        body: JSON.stringify({
          equipmentId: enquiryTarget.equipment_id,
          rentalRequestId: enquiryTarget.id,
          recipientId: enquiryTarget.owner_id,
          message: enquiryText.trim(),
        }),
      });
      setActionMsg(`Message sent to ${enquiryTarget.owner_name}.`);
      setEnquiryTarget(null);
      setEnquiryText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send message.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#0F172A]">Rental Requests &amp; Escrow Payments</h1>
          <p className="text-sm text-slate-600 mt-1">
            Track status progression, fund Udaya Escrow safely, confirm handover/return, and message equipment owners.
          </p>
        </div>
        <Link
          to="/marketplace"
          className="px-4 py-2 text-sm font-medium text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-md whitespace-nowrap"
        >
          Browse Marketplace
        </Link>
      </div>

      {error && <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-800">{error}</div>}
      {actionMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-xs text-emerald-800">
          {actionMsg}
        </div>
      )}

      {loading ? (
        <div className="h-48 bg-white border border-slate-200 rounded-lg animate-pulse" />
      ) : bookings.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-10 text-center">
          <h2 className="font-display text-lg font-semibold text-[#0F172A]">No rental requests yet</h2>
          <p className="text-sm text-slate-600 mt-1">
            Submit a request from any equipment page or from your Zero-Idle job matching results.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((b) => {
            const canCancel = ['Request submitted', 'Owner reviewing', 'Quotation received'].includes(b.status);
            const canAcceptQuote = b.status === 'Quotation received';
            const confirmedSum =
              b.base_rental_total +
              (b.transport_charge ?? 0) +
              (b.operator_charge ?? 0) +
              (b.fuel_charge ?? 0) +
              (b.other_charge ?? 0);

            return (
              <div key={b.id} className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="font-mono">Request #{b.id}</span>
                      <span>·</span>
                      <span>{b.business_name}</span>
                      <span>·</span>
                      <span>{b.job_location}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <Link
                        to={`/equipment/${b.equipment_id}`}
                        className="font-display text-lg font-bold text-[#0F172A] hover:text-[#0F766E]"
                      >
                        {b.equipment_title}
                      </Link>
                      {b.is_verified_machinery && <VerifiedMachineryBadge isVerified compact />}
                    </div>
                    <div className="text-sm text-slate-700 mt-1 font-mono tabular-nums">
                      {b.start_date} to {b.end_date} ({b.duration_days} {b.duration_days === 1 ? 'day' : 'days'})
                    </div>
                    <p className="text-xs text-slate-600 mt-1">Intended use: {b.intended_use}</p>
                  </div>

                  <div className="flex flex-col md:items-end gap-2">
                    <BookingStatusLabel status={b.status} />
                    <div className="text-xs text-slate-500">{b.payment_status}</div>
                    <div className="font-mono tabular-nums text-base font-bold text-[#0F172A]">
                      Est. {formatINR(confirmedSum)}
                      {b.transport_charge == null || b.operator_charge == null || b.fuel_charge == null ? ' +' : ''}
                    </div>
                  </div>
                </div>

                {b.owner_notes && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700">
                    <span className="font-semibold">Owner quotation / note:</span> {b.owner_notes}
                  </div>
                )}

                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setExpandedCostId(expandedCostId === b.id ? null : b.id)}
                      className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded hover:bg-slate-50"
                    >
                      {expandedCostId === b.id ? 'Hide Cost Breakdown' : 'View Cost Breakdown'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEnquiryTarget(b);
                        setEnquiryText('');
                      }}
                      className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded hover:bg-slate-50"
                    >
                      Message Owner
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {canAcceptQuote && (
                      <button
                        type="button"
                        onClick={() => handleStatusUpdate(b.id, 'Accepted')}
                        className="px-4 py-1.5 text-xs font-medium text-white bg-[#0D9488] hover:bg-[#0F766E] rounded"
                      >
                        Accept Quotation
                      </button>
                    )}
                    {canCancel && (
                      <button
                        type="button"
                        onClick={() => handleStatusUpdate(b.id, 'Cancelled')}
                        className="px-3 py-1.5 text-xs font-medium text-rose-700 border border-rose-200 hover:bg-rose-50 rounded"
                      >
                        Cancel Request
                      </button>
                    )}
                  </div>
                </div>

                {/* Udaya Escrow Protection & Milestone Settlement Panel */}
                {(!['Cancelled', 'Rejected'].includes(b.status) || Boolean(b.escrow_status)) && (
                  <EscrowWorkflowPanel booking={b} role="renter" onUpdated={loadBookings} />
                )}

                {expandedCostId === b.id && (
                  <div className="pt-2">
                    <CostBreakdownPanel
                      durationDays={b.duration_days}
                      baseRate={Math.round(b.base_rental_total / Math.max(1, b.duration_days))}
                      baseStatus={b.charges_confirmed_by_owner ? 'Owner-confirmed' : 'User-entered estimate'}
                      lines={[
                        {
                          label: 'Transport / delivery charge',
                          amount: b.transport_charge,
                          status: b.transport_charge != null ? (b.charges_confirmed_by_owner ? 'Owner-confirmed' : 'User-entered estimate') : 'Not yet confirmed',
                        },
                        {
                          label: 'Operator charge',
                          amount: b.operator_charge,
                          status: b.operator_charge != null ? (b.charges_confirmed_by_owner ? 'Owner-confirmed' : 'User-entered estimate') : 'Not yet confirmed',
                        },
                        {
                          label: 'Fuel charge',
                          amount: b.fuel_charge,
                          status: b.fuel_charge != null ? (b.charges_confirmed_by_owner ? 'Owner-confirmed' : 'User-entered estimate') : 'Not yet confirmed',
                        },
                        {
                          label: 'Other charges',
                          amount: b.other_charge,
                          status: b.other_charge != null ? (b.charges_confirmed_by_owner ? 'Owner-confirmed' : 'User-entered estimate') : 'Not yet confirmed',
                        },
                      ]}
                      depositAmount={b.deposit_amount}
                      depositStatus={b.deposit_amount != null ? (b.charges_confirmed_by_owner ? 'Owner-confirmed' : 'User-entered estimate') : 'Not yet confirmed'}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {enquiryTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSendEnquiry}
            className="bg-white border border-slate-200 rounded-lg p-6 max-w-md w-full space-y-4 shadow-xl"
          >
            <h2 className="font-display text-lg font-bold text-[#0F172A]">
              Message {enquiryTarget.owner_name}
            </h2>
            <p className="text-xs text-slate-600">
              Regarding {enquiryTarget.equipment_title} (Request #{enquiryTarget.id})
            </p>
            <textarea
              rows={3}
              required
              value={enquiryText}
              onChange={(e) => setEnquiryText(e.target.value)}
              placeholder="Write your question or dispatch instructions..."
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md bg-[#F8FAFC]"
            />
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEnquiryTarget(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600"
              >
                Close
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-medium text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-md"
              >
                Send Message
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
