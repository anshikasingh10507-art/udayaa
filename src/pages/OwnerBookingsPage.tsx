import { useEffect, useState, useCallback } from 'react';
import { apiFetch, formatINR } from '../lib/api';
import type { RentalRequest } from '../types';
import { BookingStatusLabel, VerifiedMachineryBadge } from '../components/StatusLabel';
import { EscrowWorkflowPanel } from '../components/EscrowPanel';

export function OwnerBookingsPage() {
  const [bookings, setBookings] = useState<RentalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMsg, setActionMsg] = useState('');

  const [quoting, setQuoting] = useState<RentalRequest | null>(null);
  const [baseTotal, setBaseTotal] = useState('');
  const [transportCharge, setTransportCharge] = useState('');
  const [operatorCharge, setOperatorCharge] = useState('');
  const [fuelCharge, setFuelCharge] = useState('');
  const [otherCharge, setOtherCharge] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [ownerNotes, setOwnerNotes] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ rentalRequests: RentalRequest[] }>('/api/rental-requests?scope=owner');
      setBookings(data.rentalRequests);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load bookings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateStatus = async (id: number, status: string) => {
    setError('');
    setActionMsg('');
    try {
      await apiFetch(`/api/rental-requests/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      setActionMsg(`Request #${id} updated to "${status}".`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update booking status.');
    }
  };

  const openQuoteModal = (b: RentalRequest) => {
    setQuoting(b);
    setBaseTotal(String(b.base_rental_total));
    setTransportCharge(b.transport_charge != null ? String(b.transport_charge) : '');
    setOperatorCharge(b.operator_charge != null ? String(b.operator_charge) : '');
    setFuelCharge(b.fuel_charge != null ? String(b.fuel_charge) : '');
    setOtherCharge(b.other_charge != null ? String(b.other_charge) : '0');
    setDepositAmount(b.deposit_amount != null ? String(b.deposit_amount) : '');
    setOwnerNotes(b.owner_notes || '');
  };

  const submitQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quoting) return;
    setError('');
    try {
      await apiFetch(`/api/rental-requests/${quoting.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'Quotation received',
          baseRentalTotal: Number(baseTotal),
          transportCharge: transportCharge !== '' ? Number(transportCharge) : null,
          operatorCharge: operatorCharge !== '' ? Number(operatorCharge) : null,
          fuelCharge: fuelCharge !== '' ? Number(fuelCharge) : null,
          otherCharge: otherCharge !== '' ? Number(otherCharge) : null,
          depositAmount: depositAmount !== '' ? Number(depositAmount) : null,
          ownerNotes,
        }),
      });
      setQuoting(null);
      setActionMsg('Confirmed quotation sent to renter.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit quotation.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-[#0F172A]">Bookings &amp; Escrow Payouts</h1>
        <p className="text-sm text-slate-600 mt-1">
          Review incoming requests, confirm itemized quotes, track Udaya Escrow holds, and confirm equipment handover.
        </p>
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
        <div className="bg-white border border-slate-200 rounded-lg p-10 text-center text-sm text-slate-600">
          No rental requests received yet.
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((b) => (
            <div key={b.id} className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div>
                  <div className="text-xs text-slate-500">
                    <span className="font-mono">Request #{b.id}</span> · Renter: {b.renter_name} ({b.renter_phone || 'No phone'})
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <h2 className="font-display text-lg font-bold text-[#0F172A]">{b.equipment_title}</h2>
                    {b.is_verified_machinery && <VerifiedMachineryBadge isVerified compact />}
                  </div>
                  <div className="text-sm font-mono tabular-nums text-slate-700 mt-1">
                    {b.start_date} to {b.end_date} ({b.duration_days}d) · {b.job_location}
                  </div>
                  <p className="text-xs text-slate-600 mt-1">Intended use: {b.intended_use}</p>
                  {b.renter_notes && <p className="text-xs text-slate-500 mt-1">Renter note: {b.renter_notes}</p>}
                </div>

                <div className="flex flex-col md:items-end gap-2">
                  <BookingStatusLabel status={b.status} />
                  <div className="text-xs text-slate-500">{b.payment_status}</div>
                  <div className="text-xs font-mono tabular-nums text-slate-700">
                    Base: {formatINR(b.base_rental_total)} · Deposit: {formatINR(b.deposit_amount)}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex flex-wrap gap-2">
                {b.status === 'Request submitted' && (
                  <button
                    type="button"
                    onClick={() => updateStatus(b.id, 'Owner reviewing')}
                    className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded hover:bg-slate-50"
                  >
                    Mark Owner Reviewing
                  </button>
                )}
                {['Request submitted', 'Owner reviewing', 'Quotation received'].includes(b.status) && (
                  <>
                    <button
                      type="button"
                      onClick={() => openQuoteModal(b)}
                      className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded hover:bg-slate-50"
                    >
                      Send / Update Quote
                    </button>
                    <button
                      type="button"
                      onClick={() => updateStatus(b.id, 'Accepted')}
                      className="px-4 py-1.5 text-xs font-medium text-white bg-[#0D9488] hover:bg-[#0F766E] rounded"
                    >
                      Accept Booking
                    </button>
                    <button
                      type="button"
                      onClick={() => updateStatus(b.id, 'Rejected')}
                      className="px-3 py-1.5 text-xs font-medium text-rose-700 border border-rose-200 hover:bg-rose-50 rounded"
                    >
                      Decline
                    </button>
                  </>
                )}
                {b.status === 'Accepted' && (
                  <button
                    type="button"
                    onClick={() => updateStatus(b.id, 'Completed')}
                    className="px-4 py-1.5 text-xs font-medium text-white bg-[#0F172A] hover:bg-slate-800 rounded"
                  >
                    Mark Rental Completed
                  </button>
                )}
              </div>

              {(!['Cancelled', 'Rejected'].includes(b.status) || Boolean(b.escrow_status)) && (
                <EscrowWorkflowPanel booking={b} role="owner" onUpdated={load} />
              )}
            </div>
          ))}
        </div>
      )}

      {quoting && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={submitQuote}
            className="bg-white border border-slate-200 rounded-lg p-6 max-w-lg w-full space-y-4 shadow-xl"
          >
            <h2 className="font-display text-lg font-bold text-[#0F172A]">
              Confirm Charges & Send Quote (#{quoting.id})
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Base Rental Total (₹)</label>
                <input
                  type="number"
                  required
                  value={baseTotal}
                  onChange={(e) => setBaseTotal(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Transport Charge (₹)</label>
                <input
                  type="number"
                  value={transportCharge}
                  onChange={(e) => setTransportCharge(e.target.value)}
                  placeholder="Blank = unconfirmed"
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Operator Charge (₹)</label>
                <input
                  type="number"
                  value={operatorCharge}
                  onChange={(e) => setOperatorCharge(e.target.value)}
                  placeholder="Blank = unconfirmed"
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Fuel Charge (₹)</label>
                <input
                  type="number"
                  value={fuelCharge}
                  onChange={(e) => setFuelCharge(e.target.value)}
                  placeholder="Blank = unconfirmed"
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Other Charges (₹)</label>
                <input
                  type="number"
                  value={otherCharge}
                  onChange={(e) => setOtherCharge(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Refundable Deposit (₹)</label>
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="Blank = unconfirmed"
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-md"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Quotation Note</label>
              <textarea
                rows={2}
                value={ownerNotes}
                onChange={(e) => setOwnerNotes(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setQuoting(null)} className="px-4 py-2 text-xs text-slate-600">
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-medium text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-md"
              >
                Send Quotation
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
