import { useEffect, useState, useCallback } from 'react';
import { apiFetch, formatINR } from '../lib/api';
import type { EquipmentListing, JobMatch, JobRequest } from '../types';

export function OwnerJobRequestsPage() {
  const [matchedRequests, setMatchedRequests] = useState<JobMatch[]>([]);
  const [openDemandRequests, setOpenDemandRequests] = useState<JobRequest[]>([]);
  const [fleet, setFleet] = useState<EquipmentListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Response modal state
  const [activeMatch, setActiveMatch] = useState<JobMatch | null>(null);
  const [activeOpenJob, setActiveOpenJob] = useState<JobRequest | null>(null);
  const [responseStatus, setResponseStatus] = useState<'available_quoted' | 'alternative_proposed' | 'declined'>(
    'available_quoted'
  );
  const [selectedEquipmentId, setSelectedEquipmentId] = useState('');
  const [quotedDailyRate, setQuotedDailyRate] = useState('');
  const [quotedTransport, setQuotedTransport] = useState('');
  const [quotedOperator, setQuotedOperator] = useState('');
  const [quotedFuel, setQuotedFuel] = useState('');
  const [quotedDeposit, setQuotedDeposit] = useState('');
  const [ownerNote, setOwnerNote] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [jr, eq] = await Promise.all([
        apiFetch<{ matchedRequests: JobMatch[]; openDemandRequests: JobRequest[] }>('/api/owner/job-requests'),
        apiFetch<{ equipment: EquipmentListing[] }>('/api/owner/equipment'),
      ]);
      setMatchedRequests(jr.matchedRequests);
      setOpenDemandRequests(jr.openDemandRequests);
      setFleet(eq.equipment);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load job requests.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openRespondModal = (m: JobMatch) => {
    setActiveOpenJob(null);
    setActiveMatch(m);
    setResponseStatus('available_quoted');
    setSelectedEquipmentId(String(m.equipment_id));
    setQuotedDailyRate(String(m.quoted_daily_rate ?? m.listing_daily_rate ?? ''));
    setQuotedTransport(m.quoted_transport_charge != null ? String(m.quoted_transport_charge) : '');
    setQuotedOperator(m.quoted_operator_charge != null ? String(m.quoted_operator_charge) : '');
    setQuotedFuel(m.quoted_fuel_charge != null ? String(m.quoted_fuel_charge) : '');
    setQuotedDeposit(m.quoted_deposit != null ? String(m.quoted_deposit) : '');
    setOwnerNote(m.owner_note || '');
    setError('');
  };

  const openDemandRespondModal = (j: JobRequest) => {
    setActiveMatch(null);
    setActiveOpenJob(j);
    const firstAvail = fleet.find((f) => f.availability_status === 'available');
    setSelectedEquipmentId(firstAvail ? String(firstAvail.id) : '');
    setQuotedDailyRate(firstAvail ? String(firstAvail.daily_rate) : '');
    setQuotedTransport('');
    setQuotedOperator('');
    setQuotedFuel('');
    setQuotedDeposit(firstAvail?.deposit_amount != null ? String(firstAvail.deposit_amount) : '');
    setOwnerNote('');
    setError('');
  };

  const handleSubmitResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    try {
      if (activeMatch) {
        await apiFetch(`/api/owner/job-matches/${activeMatch.id}/respond`, {
          method: 'POST',
          body: JSON.stringify({
            responseStatus,
            alternativeEquipmentId: responseStatus === 'alternative_proposed' ? Number(selectedEquipmentId) : null,
            quotedDailyRate: quotedDailyRate !== '' ? Number(quotedDailyRate) : null,
            quotedTransportCharge: quotedTransport !== '' ? Number(quotedTransport) : null,
            quotedOperatorCharge: quotedOperator !== '' ? Number(quotedOperator) : null,
            quotedFuelCharge: quotedFuel !== '' ? Number(quotedFuel) : null,
            quotedDeposit: quotedDeposit !== '' ? Number(quotedDeposit) : null,
            ownerNote,
          }),
        });
        setSuccessMsg('Response sent to renter and in-app notification created.');
        setActiveMatch(null);
      } else if (activeOpenJob) {
        await apiFetch(`/api/owner/job-requests/${activeOpenJob.id}/respond`, {
          method: 'POST',
          body: JSON.stringify({
            equipmentId: Number(selectedEquipmentId),
            quotedDailyRate: quotedDailyRate !== '' ? Number(quotedDailyRate) : null,
            quotedTransportCharge: quotedTransport !== '' ? Number(quotedTransport) : null,
            quotedOperatorCharge: quotedOperator !== '' ? Number(quotedOperator) : null,
            quotedFuelCharge: quotedFuel !== '' ? Number(quotedFuel) : null,
            quotedDeposit: quotedDeposit !== '' ? Number(quotedDeposit) : null,
            ownerNote,
          }),
        });
        setSuccessMsg('Proactive offer sent to renter.');
        setActiveOpenJob(null);
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit response.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-[#0F172A]">Incoming Zero-Idle Job Requests</h1>
        <p className="text-sm text-slate-600 mt-1">
          Opportunities matched to your machinery. Confirm real availability and send itemized quotes, propose an
          alternative unit, or decline.
        </p>
      </div>

      {error && <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-800">{error}</div>}
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-xs text-emerald-800">
          {successMsg}
        </div>
      )}

      {loading ? (
        <div className="h-48 bg-white border border-slate-200 rounded-lg animate-pulse" />
      ) : (
        <>
          <div className="space-y-4">
            <h2 className="font-display text-lg font-bold text-[#0F172A]">
              Direct Matches for Your Equipment ({matchedRequests.length})
            </h2>
            {matchedRequests.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-lg p-8 text-center text-sm text-slate-600">
                No job requests have matched your listed categories yet.
              </div>
            ) : (
              matchedRequests.map((m) => (
                <div key={m.id} className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div>
                      <div className="text-xs text-slate-500">
                        Matched to <span className="font-semibold text-[#0F172A]">{m.equipment_title}</span> · Renter:{' '}
                        {m.renter_name}
                      </div>
                      <h3 className="font-display text-lg font-bold text-[#0F172A] mt-1">{m.job_title}</h3>
                      <div className="text-xs text-slate-600 mt-1 font-mono tabular-nums">
                        {m.job_city} {m.job_area ? `(${m.job_area})` : ''} · Starts {m.preferred_start_date} for{' '}
                        {m.duration_days} day(s) · Target budget:{' '}
                        {m.budget_max ? formatINR(m.budget_max) : 'Not specified'}
                      </div>
                      <p className="text-sm text-slate-700 mt-2">{m.work_description}</p>
                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-600">
                        <span>{m.requires_operator ? 'Operator requested' : 'Dry hire'}</span>
                        <span>·</span>
                        <span>{m.requires_transport ? 'Delivery requested' : 'Pickup OK'}</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-start md:items-end gap-2 shrink-0">
                      <span
                        className={`px-2.5 py-1 text-xs font-medium rounded border ${
                          m.owner_response_status === 'available_quoted' ||
                          m.owner_response_status === 'alternative_proposed'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : m.owner_response_status === 'declined'
                              ? 'bg-rose-50 text-rose-800 border-rose-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        {m.owner_response_status === 'pending'
                          ? 'Awaiting your response'
                          : m.owner_response_status === 'available_quoted'
                            ? 'Availability & quote sent'
                            : m.owner_response_status === 'alternative_proposed'
                              ? 'Alternative proposed'
                              : 'Declined'}
                      </span>

                      <button
                        type="button"
                        onClick={() => openRespondModal(m)}
                        className="px-4 py-2 text-xs font-medium text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-md"
                      >
                        {m.owner_response_status === 'pending' ? 'Respond with Availability & Quote' : 'Update Response'}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {openDemandRequests.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <h2 className="font-display text-lg font-bold text-[#0F172A]">
                Open Demand Requests in Marketplace ({openDemandRequests.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {openDemandRequests.map((j) => (
                  <div key={j.id} className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between gap-3">
                    <div>
                      <div className="text-xs text-slate-500">
                        {j.category_name} · {j.job_city} · {j.preferred_start_date} ({j.duration_days}d)
                      </div>
                      <h3 className="font-display font-semibold text-[#0F172A] mt-1">{j.title}</h3>
                      <p className="text-xs text-slate-600 mt-1 line-clamp-2">{j.work_description}</p>
                    </div>
                    <button
                      type="button"
                      disabled={fleet.length === 0}
                      onClick={() => openDemandRespondModal(j)}
                      className="w-fit px-3 py-1.5 text-xs font-medium border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50"
                    >
                      Propose Equipment & Quote
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {(activeMatch || activeOpenJob) && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleSubmitResponse}
            className="bg-white border border-slate-200 rounded-lg p-6 max-w-lg w-full space-y-4 shadow-xl"
          >
            <h2 className="font-display text-lg font-bold text-[#0F172A]">
              {activeMatch ? `Respond to "${activeMatch.job_title}"` : `Offer Equipment for "${activeOpenJob?.title}"`}
            </h2>

            {activeMatch && (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Response Type</label>
                <select
                  value={responseStatus}
                  onChange={(e) =>
                    setResponseStatus(e.target.value as 'available_quoted' | 'alternative_proposed' | 'declined')
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md"
                >
                  <option value="available_quoted">Confirm Availability & Submit Quote</option>
                  <option value="alternative_proposed">Propose Alternative Equipment from Fleet</option>
                  <option value="declined">Decline Job Request</option>
                </select>
              </div>
            )}

            {(activeOpenJob || responseStatus === 'alternative_proposed') && (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Select Equipment from Your Fleet</label>
                <select
                  required
                  value={selectedEquipmentId}
                  onChange={(e) => setSelectedEquipmentId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md"
                >
                  {fleet.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.title} (₹{f.daily_rate}/day · {f.availability_status})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {responseStatus !== 'declined' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Quoted Daily Rate (₹)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={quotedDailyRate}
                    onChange={(e) => setQuotedDailyRate(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Transport Charge (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={quotedTransport}
                    onChange={(e) => setQuotedTransport(e.target.value)}
                    placeholder="Blank = Not yet confirmed"
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Total Operator Charge (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={quotedOperator}
                    onChange={(e) => setQuotedOperator(e.target.value)}
                    placeholder="Blank = Not yet confirmed"
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Total Fuel Charge (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={quotedFuel}
                    onChange={(e) => setQuotedFuel(e.target.value)}
                    placeholder="Blank = Not yet confirmed"
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-md"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">Refundable Deposit (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={quotedDeposit}
                    onChange={(e) => setQuotedDeposit(e.target.value)}
                    placeholder="Blank = Not yet confirmed"
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-md"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Notes for Renter</label>
              <textarea
                rows={2}
                value={ownerNote}
                onChange={(e) => setOwnerNote(e.target.value)}
                placeholder="Clarify shift hours, fuel arrangement, or site access requirements..."
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md"
              />
            </div>

            {error && <p className="text-xs text-rose-700">{error}</p>}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setActiveMatch(null);
                  setActiveOpenJob(null);
                }}
                className="px-4 py-2 text-xs font-medium text-slate-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-medium text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-md"
              >
                Send Response
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
