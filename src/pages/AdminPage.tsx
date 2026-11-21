import { useEffect, useState, useCallback } from 'react';
import { ShieldCheck } from 'lucide-react';
import { apiFetch, formatINR } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type { EscrowStatus, ReportItem } from '../types';
import { MaintenanceVerificationLabel, VerifiedMachineryBadge } from '../components/StatusLabel';
import { EscrowStatusBadge } from '../components/EscrowPanel';

interface AdminEscrowRow {
  id: number;
  rental_request_id: number;
  escrow_ref: string;
  rental_amount: number;
  deposit_amount: number;
  platform_fee: number;
  total_funded: number;
  payment_method: string;
  status: EscrowStatus;
  dispute_reason: string;
  equipment_title: string;
  renter_name: string;
  owner_name: string;
  start_date: string;
  end_date: string;
  booking_status: string;
  created_at: string;
}

interface AdminOverview {
  users: Array<{ id: number; name: string; email: string; role: string; city: string; created_at: string }>;
  listings: Array<{
    id: number;
    title: string;
    location_city: string;
    daily_rate: number;
    availability_status: string;
    is_sample: number;
    is_removed: number;
    is_verified_machinery: number;
    verification_badge_tier: string;
    verification_certificate_id: string;
    replacement_value_inr: number | null;
    category_name: string;
    category_sector?: string;
    owner_name: string;
    owner_email: string;
  }>;
  reports: ReportItem[];
  maintenanceSubmissions: Array<{
    id: number;
    equipment_id: number;
    equipment_title: string;
    owner_name: string;
    condition_description: string;
    document_name: string;
    verification_status: string;
    submitted_at: string;
  }>;
  escrowTransactions: AdminEscrowRow[];
}

export function AdminPage() {
  const { user } = useAuth();
  const [data, setData] = useState<AdminOverview | null>(null);
  const [tab, setTab] = useState<'reports' | 'listings' | 'escrow' | 'maintenance' | 'users'>('listings');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch<AdminOverview>('/api/admin/overview');
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load administrator data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'admin') {
      load();
    } else {
      setLoading(false);
    }
  }, [user, load]);

  if (!user || user.role !== 'admin') {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-14">
        <div className="bg-white border border-rose-200 rounded-lg p-8 text-center">
          <h1 className="font-display text-xl font-bold text-[#0F172A]">Administrator Access Required</h1>
          <p className="text-sm text-slate-600 mt-2">
            Administrative moderation, Verified Machinery Badges, and Escrow dispute controls are restricted to
            authorized administrator accounts.
          </p>
        </div>
      </div>
    );
  }

  const handleResolveReport = async (reportId: number, status: string, removeListing: boolean) => {
    setMsg('');
    await apiFetch(`/api/admin/reports/${reportId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        status,
        removeListing,
        adminNotes: removeListing ? 'Listing removed following moderation review.' : 'Reviewed by administrator.',
      }),
    });
    setMsg(`Report #${reportId} updated to "${status}".`);
    await load();
  };

  const handleToggleListing = async (listingId: number, remove: boolean) => {
    setMsg('');
    await apiFetch(`/api/admin/equipment/${listingId}/moderate`, {
      method: 'PATCH',
      body: JSON.stringify({ isRemoved: remove }),
    });
    setMsg(remove ? `Listing #${listingId} removed.` : `Listing #${listingId} restored.`);
    await load();
  };

  const handleToggleVerifiedBadge = async (listingId: number, grant: boolean) => {
    setMsg('');
    setError('');
    try {
      const res = await apiFetch<{ certificateId?: string }>(`/api/admin/equipment/${listingId}/verify`, {
        method: 'PATCH',
        body: JSON.stringify({ verified: grant }),
      });
      setMsg(
        grant
          ? `Udaya Verified Machinery Badge granted to listing #${listingId} (${res.certificateId}).`
          : `Verified Machinery Badge revoked for listing #${listingId}.`
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update verification badge.');
    }
  };

  const handleResolveEscrow = async (
    bookingId: number,
    resolution: 'released_to_owner' | 'refunded_to_renter'
  ) => {
    setMsg('');
    setError('');
    try {
      await apiFetch(`/api/admin/escrow/${bookingId}/resolve`, {
        method: 'POST',
        body: JSON.stringify({
          resolution,
          note:
            resolution === 'released_to_owner'
              ? 'Administrator verified completion and released held escrow funds to owner.'
              : 'Administrator reviewed dispute and issued full escrow refund to renter.',
        }),
      });
      setMsg(`Escrow for Booking #${bookingId} resolved (${resolution.replace(/_/g, ' ')}).`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to resolve escrow transaction.');
    }
  };

  const handleVerifyMaint = async (maintId: number) => {
    setMsg('');
    setError('');
    try {
      await apiFetch(`/api/admin/maintenance/${maintId}/verify`, { method: 'PATCH' });
      setMsg(`Maintenance record #${maintId} marked Independently verified & badge granted.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to verify record.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0F172A]">
          Administrator Moderation, Badges &amp; Escrow Console
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Grant or revoke Verified Machinery Badges, resolve frozen Escrow disputes, verify maintenance certificates,
          and moderate reported listings.
        </p>
      </div>

      {error && <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-800">{error}</div>}
      {msg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-xs text-emerald-800">{msg}</div>
      )}

      {/* Live Marketplace & Escrow Metrics Strip (computed from database records) */}
      {data && (() => {
        const activeListings = data.listings.filter((l) => !l.is_removed);
        const verifiedCount = activeListings.filter((l) => Boolean(l.is_verified_machinery)).length;
        const totalEscrowVolume = (data.escrowTransactions || []).reduce((sum, e) => sum + Number(e.total_funded || 0), 0);
        const disputedEscrows = (data.escrowTransactions || []).filter((e) => e.status === 'disputed').length;
        const openReports = data.reports.filter((r) => r.status === 'Open' || r.status === 'Under Review').length;

        const sectorCounts = [
          {
            label: 'Construction & Power',
            count: activeListings.filter((l) => !l.category_sector || l.category_sector === 'construction').length,
          },
          {
            label: 'Lab & Biotech',
            count: activeListings.filter((l) => l.category_sector === 'laboratory').length,
          },
          {
            label: 'Precision CNC',
            count: activeListings.filter((l) => l.category_sector === 'precision_industrial').length,
          },
          {
            label: '3D Survey & LiDAR',
            count: activeListings.filter((l) => l.category_sector === 'surveying_geotech').length,
          },
        ];
        const totalSectorCount = Math.max(1, activeListings.length);

        const escrowCounts = [
          {
            label: 'Released to Owner',
            count: (data.escrowTransactions || []).filter((e) => e.status === 'released_to_owner').length,
            barClass: 'bg-emerald-600',
          },
          {
            label: 'Held / Active Handover',
            count: (data.escrowTransactions || []).filter((e) =>
              ['funded_held', 'handover_confirmed'].includes(e.status)
            ).length,
            barClass: 'bg-[#0D9488]',
          },
          {
            label: 'Disputed / Frozen',
            count: disputedEscrows,
            barClass: 'bg-rose-600',
          },
          {
            label: 'Refunded to Renter',
            count: (data.escrowTransactions || []).filter((e) => e.status === 'refunded_to_renter').length,
            barClass: 'bg-slate-500',
          },
        ];
        const totalEscrowTx = Math.max(1, (data.escrowTransactions || []).length);

        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-lg p-5">
                <div className="text-xs font-medium text-slate-500">Active Fleet Listings</div>
                <div className="font-mono tabular-nums text-2xl font-bold text-[#0F172A] mt-1">
                  {activeListings.length}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {data.users.filter((u) => u.role === 'owner').length} owners ·{' '}
                  {data.users.filter((u) => u.role === 'renter').length} renters (Sample)
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg p-5">
                <div className="text-xs font-medium text-slate-500">Udaya Verified Machinery</div>
                <div className="font-mono tabular-nums text-2xl font-bold text-[#0F766E] mt-1">
                  {verifiedCount}{' '}
                  <span className="text-xs font-sans font-normal text-slate-500">
                    / {activeListings.length} ({Math.round((verifiedCount / totalSectorCount) * 100)}%)
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {data.maintenanceSubmissions.filter((m) => m.verification_status === 'Documents submitted').length}{' '}
                  docs pending review
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg p-5">
                <div className="text-xs font-medium text-slate-500">Sample Escrow Volume</div>
                <div className="font-mono tabular-nums text-2xl font-bold text-[#0F172A] mt-1">
                  {formatINR(totalEscrowVolume)}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {(data.escrowTransactions || []).length} ledger records · {disputedEscrows} disputed
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg p-5">
                <div className="text-xs font-medium text-slate-500">Open Moderation Queue</div>
                <div className="font-mono tabular-nums text-2xl font-bold text-[#C2410C] mt-1">{openReports}</div>
                <div className="text-xs text-slate-500 mt-1">
                  {data.reports.length} total reports logged
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-sm font-semibold text-[#0F172A]">Active Inventory by Sector</h2>
                  <span className="text-[11px] text-slate-500">Sample demonstration catalog</span>
                </div>
                <div className="space-y-2.5">
                  {sectorCounts.map((s) => (
                    <div key={s.label} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-700">{s.label}</span>
                        <span className="font-mono tabular-nums font-medium text-[#0F172A]">
                          {s.count} ({Math.round((s.count / totalSectorCount) * 100)}%)
                        </span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#0D9488] rounded-full"
                          style={{ width: `${Math.round((s.count / totalSectorCount) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-sm font-semibold text-[#0F172A]">Escrow Settlement Status</h2>
                  <span className="text-[11px] text-slate-500">Sample demonstration ledger</span>
                </div>
                <div className="space-y-2.5">
                  {escrowCounts.map((es) => (
                    <div key={es.label} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-700">{es.label}</span>
                        <span className="font-mono tabular-nums font-medium text-[#0F172A]">{es.count}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${es.barClass}`}
                          style={{ width: `${Math.round((es.count / totalEscrowTx) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit">
        {[
          ['listings', `Listings & Badges (${data?.listings.length ?? 0})`],
          ['escrow', `Escrow & Disputes (${data?.escrowTransactions?.length ?? 0})`],
          ['reports', `Reports (${data?.reports.length ?? 0})`],
          ['maintenance', `Maintenance Verification (${data?.maintenanceSubmissions.length ?? 0})`],
          ['users', `Users (${data?.users.length ?? 0})`],
        ].map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k as 'reports' | 'listings' | 'escrow' | 'maintenance' | 'users')}
            className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${
              tab === k ? 'bg-white text-[#0F172A] shadow-sm' : 'text-slate-600 hover:text-[#0F172A]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading || !data ? (
        <div className="h-48 bg-white border border-slate-200 rounded-lg animate-pulse" />
      ) : (
        <>
          {tab === 'reports' && (
            <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
              {data.reports.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-600">No reports filed.</div>
              ) : (
                data.reports.map((r) => (
                  <div key={r.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="text-xs text-slate-500">
                        <span className="font-mono">Report #{r.id}</span> · By {r.reporter_name} ({r.reporter_email}) ·{' '}
                        <span className="font-semibold text-[#0F172A]">{r.status}</span>
                      </div>
                      <div className="font-semibold text-sm text-[#0F172A] mt-1">
                        {r.reason} {r.equipment_title ? `— ${r.equipment_title}` : ''}
                      </div>
                      <p className="text-xs text-slate-600 mt-1">{r.details}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleResolveReport(r.id, 'Resolved', false)}
                        className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded hover:bg-slate-50"
                      >
                        Mark Resolved
                      </button>
                      {r.equipment_id && !r.equipment_is_removed && (
                        <button
                          type="button"
                          onClick={() => handleResolveReport(r.id, 'Listing Removed', true)}
                          className="px-3 py-1.5 text-xs font-medium text-white bg-rose-700 hover:bg-rose-800 rounded"
                        >
                          Remove Reported Listing
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'listings' && (
            <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
                  <tr>
                    <th className="py-3 px-4 font-medium">ID</th>
                    <th className="py-3 px-4 font-medium">Equipment</th>
                    <th className="py-3 px-4 font-medium">Owner &amp; City</th>
                    <th className="py-3 px-4 font-medium text-right">Daily Rate</th>
                    <th className="py-3 px-4 font-medium">Verification Badge</th>
                    <th className="py-3 px-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.listings.map((l) => {
                    const isVerified = Boolean(l.is_verified_machinery);
                    return (
                      <tr key={l.id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 font-mono text-xs">{l.id}</td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-[#0F172A]">{l.title}</div>
                          <div className="text-xs text-slate-500">
                            {l.category_name} {l.is_sample ? '· Sample' : ''}
                            {l.is_removed ? ' · Removed by admin' : ''}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-700">
                          <div>{l.owner_name}</div>
                          <div className="text-slate-500">{l.location_city}</div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums">{formatINR(l.daily_rate)}</td>
                        <td className="py-3 px-4 text-xs">
                          {isVerified ? (
                            <VerifiedMachineryBadge
                              isVerified
                              tier={l.verification_badge_tier}
                              certificateId={l.verification_certificate_id}
                            />
                          ) : (
                            <span className="text-slate-500 capitalize">
                              {l.verification_badge_tier?.replace('_', ' ') || 'Unverified'}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleToggleVerifiedBadge(l.id, !isVerified)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded border whitespace-nowrap ${
                                isVerified
                                  ? 'border-amber-300 text-amber-800 hover:bg-amber-50'
                                  : 'border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100'
                              }`}
                            >
                              <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>{isVerified ? 'Revoke Badge' : 'Grant Verified Badge'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleListing(l.id, !l.is_removed)}
                              className={`px-2.5 py-1 text-xs font-medium rounded border whitespace-nowrap ${
                                l.is_removed
                                  ? 'border-slate-300 text-slate-700 hover:bg-slate-50'
                                  : 'border-rose-200 text-rose-700 hover:bg-rose-50'
                              }`}
                            >
                              {l.is_removed ? 'Restore' : 'Remove'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'escrow' && (
            <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
              {!data.escrowTransactions || data.escrowTransactions.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-600">
                  No escrow transactions funded yet. Renters can fund Escrow from their Bookings workspace.
                </div>
              ) : (
                data.escrowTransactions.map((e) => {
                  const canResolve = ['funded_held', 'handover_confirmed', 'disputed'].includes(e.status);
                  return (
                    <div key={e.id} className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span className="font-mono font-semibold text-[#0F172A]">{e.escrow_ref}</span>
                          <span>·</span>
                          <span>Booking #{e.rental_request_id}</span>
                          <span>·</span>
                          <span>
                            {e.start_date} to {e.end_date}
                          </span>
                          <span>·</span>
                          <EscrowStatusBadge status={e.status} />
                        </div>
                        <div className="font-semibold text-sm text-[#0F172A]">{e.equipment_title}</div>
                        <div className="text-xs text-slate-600">
                          Renter: <span className="font-medium text-[#0F172A]">{e.renter_name}</span> → Owner:{' '}
                          <span className="font-medium text-[#0F172A]">{e.owner_name}</span> · Method: {e.payment_method}
                        </div>
                        <div className="text-xs font-mono tabular-nums text-slate-700">
                          Total Held: {formatINR(e.total_funded)} (Rental {formatINR(e.rental_amount)} + Deposit{' '}
                          {formatINR(e.deposit_amount)} · 5% Fee {formatINR(e.platform_fee)})
                        </div>
                        {e.dispute_reason && (
                          <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-xs text-rose-800">
                            <span className="font-semibold">Dispute reason:</span> {e.dispute_reason}
                          </div>
                        )}
                      </div>

                      {canResolve && (
                        <div className="flex flex-wrap gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleResolveEscrow(e.rental_request_id, 'released_to_owner')}
                            className="px-3 py-1.5 text-xs font-medium text-white bg-[#0D9488] hover:bg-[#0F766E] rounded whitespace-nowrap"
                          >
                            Release to Owner
                          </button>
                          <button
                            type="button"
                            onClick={() => handleResolveEscrow(e.rental_request_id, 'refunded_to_renter')}
                            className="px-3 py-1.5 text-xs font-medium text-rose-700 border border-rose-200 hover:bg-rose-50 rounded whitespace-nowrap"
                          >
                            Refund to Renter
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {tab === 'maintenance' && (
            <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
              {data.maintenanceSubmissions.map((m) => (
                <div key={m.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-sm text-[#0F172A]">{m.equipment_title}</span>
                      <MaintenanceVerificationLabel status={m.verification_status} />
                    </div>
                    <div className="text-xs text-slate-500">
                      Owner: {m.owner_name} · Submitted {m.submitted_at.slice(0, 10)} · Document:{' '}
                      <span className="font-mono">{m.document_name || 'None'}</span>
                    </div>
                    <p className="text-xs text-slate-700">{m.condition_description}</p>
                  </div>
                  {m.verification_status === 'Documents submitted' && (
                    <button
                      type="button"
                      onClick={() => handleVerifyMaint(m.id)}
                      className="px-4 py-1.5 text-xs font-medium text-white bg-[#0D9488] hover:bg-[#0F766E] rounded whitespace-nowrap shrink-0"
                    >
                      Mark Independently Verified
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {tab === 'users' && (
            <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
                  <tr>
                    <th className="py-3 px-4 font-medium">ID</th>
                    <th className="py-3 px-4 font-medium">Name</th>
                    <th className="py-3 px-4 font-medium">Email</th>
                    <th className="py-3 px-4 font-medium">Role</th>
                    <th className="py-3 px-4 font-medium">City</th>
                    <th className="py-3 px-4 font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.users.map((u) => (
                    <tr key={u.id}>
                      <td className="py-3 px-4 font-mono text-xs">{u.id}</td>
                      <td className="py-3 px-4 font-medium text-[#0F172A]">{u.name}</td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-600">{u.email}</td>
                      <td className="py-3 px-4 text-xs capitalize font-medium">{u.role}</td>
                      <td className="py-3 px-4 text-xs text-slate-600">{u.city}</td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-500">{u.created_at.slice(0, 10)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
