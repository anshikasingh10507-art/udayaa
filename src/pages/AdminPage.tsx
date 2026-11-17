import { useEffect, useState, useCallback } from 'react';
import { apiFetch, formatINR } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type { ReportItem } from '../types';
import { MaintenanceVerificationLabel } from '../components/StatusLabel';

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
    category_name: string;
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
}

export function AdminPage() {
  const { user } = useAuth();
  const [data, setData] = useState<AdminOverview | null>(null);
  const [tab, setTab] = useState<'reports' | 'listings' | 'maintenance' | 'users'>('reports');
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
            Administrative moderation and platform records are restricted to authorized administrator accounts.
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

  const handleVerifyMaint = async (maintId: number) => {
    setMsg('');
    setError('');
    try {
      await apiFetch(`/api/admin/maintenance/${maintId}/verify`, { method: 'PATCH' });
      setMsg(`Maintenance record #${maintId} marked Independently verified.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to verify record.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0F172A]">
          Administrator Moderation & Records
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Review reported listings, manage fraudulent or inappropriate inventory, inspect records, and verify submitted
          maintenance documents.
        </p>
      </div>

      {error && <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-800">{error}</div>}
      {msg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-xs text-emerald-800">{msg}</div>
      )}

      <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit">
        {[
          ['reports', `Reports (${data?.reports.length ?? 0})`],
          ['listings', `Listings (${data?.listings.length ?? 0})`],
          ['maintenance', `Maintenance Verification (${data?.maintenanceSubmissions.length ?? 0})`],
          ['users', `Users (${data?.users.length ?? 0})`],
        ].map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k as 'reports' | 'listings' | 'maintenance' | 'users')}
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
                    <th className="py-3 px-4 font-medium">Owner</th>
                    <th className="py-3 px-4 font-medium">City</th>
                    <th className="py-3 px-4 font-medium text-right">Daily Rate</th>
                    <th className="py-3 px-4 font-medium">State</th>
                    <th className="py-3 px-4 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.listings.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-mono text-xs">{l.id}</td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-[#0F172A]">{l.title}</div>
                        <div className="text-xs text-slate-500">
                          {l.category_name} {l.is_sample ? '· Sample' : ''}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-700">{l.owner_name}</td>
                      <td className="py-3 px-4 text-xs text-slate-700">{l.location_city}</td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums">{formatINR(l.daily_rate)}</td>
                      <td className="py-3 px-4 text-xs">
                        {l.is_removed ? (
                          <span className="text-rose-700 font-medium">Removed by admin</span>
                        ) : (
                          <span className="text-slate-700">{l.availability_status}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleToggleListing(l.id, !l.is_removed)}
                          className={`px-3 py-1 text-xs font-medium rounded border ${
                            l.is_removed
                              ? 'border-slate-300 text-slate-700 hover:bg-slate-50'
                              : 'border-rose-200 text-rose-700 hover:bg-rose-50'
                          }`}
                        >
                          {l.is_removed ? 'Restore' : 'Remove'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
