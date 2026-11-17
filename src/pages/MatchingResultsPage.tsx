import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Clock, Plus } from 'lucide-react';
import { apiFetch, formatINR } from '../lib/api';
import type { JobMatch, JobRequest } from '../types';
import { EquipmentImage } from '../components/EquipmentCard';
import { MaintenanceVerificationLabel } from '../components/StatusLabel';

export function JobRequestsListPage() {
  const [jobs, setJobs] = useState<JobRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ jobRequests: JobRequest[] }>('/api/job-requests')
      .then((d) => setJobs(d.jobRequests))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#0F172A]">My Job Requests</h1>
          <p className="text-sm text-slate-600 mt-1">
            Review matched equipment, explainable match reasons, and owner quotations.
          </p>
        </div>
        <Link
          to="/renter/job-requests/new"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-md whitespace-nowrap"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          <span>New Job Request</span>
        </Link>
      </div>

      {loading ? (
        <div className="h-40 bg-white border border-slate-200 rounded-lg animate-pulse" />
      ) : jobs.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-10 text-center">
          <h2 className="font-display text-lg font-semibold text-[#0F172A]">No job requests yet</h2>
          <p className="text-sm text-slate-600 mt-1">
            Post your first job request to discover nearby equipment and compare quotes.
          </p>
          <Link
            to="/renter/job-requests/new"
            className="inline-block mt-4 px-5 py-2 text-sm font-medium text-white bg-[#0D9488] rounded-md"
          >
            Post a Job Request
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((j) => (
            <div key={j.id} className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="text-xs text-slate-500">
                  {j.category_name} · {j.job_city} {j.job_area ? `(${j.job_area})` : ''} · Starts{' '}
                  <span className="font-mono">{j.preferred_start_date}</span> ({j.duration_days} days)
                </div>
                <h2 className="font-display text-lg font-semibold text-[#0F172A] mt-1">{j.title}</h2>
                <div className="text-xs text-[#0F766E] mt-1 font-medium tabular-nums">
                  {j.match_count || 0} matches found · {j.response_count || 0} owner responses
                </div>
              </div>
              <Link
                to={`/renter/job-requests/${j.id}/matches`}
                className="px-4 py-2 text-sm font-medium text-white bg-[#0F172A] hover:bg-slate-800 rounded-md whitespace-nowrap text-center"
              >
                View Matches & Quotes
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function MatchingResultsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [job, setJob] = useState<JobRequest | null>(null);
  const [matches, setMatches] = useState<JobMatch[]>([]);
  const [nearbyAlternatives, setNearbyAlternatives] = useState<Array<{
    id: number;
    title: string;
    location_city: string;
    daily_rate: number;
    category_name: string;
    is_sample: number;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [requestingMatchId, setRequestingMatchId] = useState<number | null>(null);
  const [bookingMessage, setBookingMessage] = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    apiFetch<{
      jobRequest: JobRequest;
      matches: JobMatch[];
      nearbyAlternatives: Array<{
        id: number;
        title: string;
        location_city: string;
        daily_rate: number;
        category_name: string;
        is_sample: number;
      }>;
    }>(`/api/job-requests/${id}`)
      .then((d) => {
        setJob(d.jobRequest);
        setMatches(d.matches);
        setNearbyAlternatives(d.nearbyAlternatives || []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load match results.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleRequestFromMatch = async (m: JobMatch) => {
    if (!job) return;
    setRequestingMatchId(m.id);
    setBookingMessage('');
    try {
      const targetEquipmentId =
        m.owner_response_status === 'alternative_proposed' && m.alternative_equipment_id
          ? m.alternative_equipment_id
          : m.equipment_id;

      await apiFetch('/api/rental-requests', {
        method: 'POST',
        body: JSON.stringify({
          equipmentId: targetEquipmentId,
          jobRequestId: job.id,
          jobMatchId: m.id,
          startDate: job.preferred_start_date,
          durationDays: job.duration_days,
          jobLocation: job.job_area ? `${job.job_area}, ${job.job_city}` : job.job_city,
          intendedUse: job.work_description || job.title,
          requiresOperator: job.requires_operator,
          requiresTransport: job.requires_transport,
        }),
      });
      navigate('/renter/bookings');
    } catch (err) {
      setBookingMessage(err instanceof Error ? err.message : 'Could not create rental request.');
    } finally {
      setRequestingMatchId(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="h-64 bg-white border border-slate-200 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <div className="bg-white border border-slate-200 rounded-lg p-8 text-center">
          <p className="text-sm text-rose-700">{error || 'Job request not found.'}</p>
          <Link to="/renter/job-requests" className="inline-block mt-4 text-sm text-[#0F766E] underline">
            Back to job requests
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <Link
        to="/renter/job-requests"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-[#0F172A]"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        <span>All Job Requests</span>
      </Link>

      {/* Job Summary Header */}
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs text-slate-500">
              Job Request #{job.id} · {job.category_name} · {job.job_city}
              {job.job_area ? `, ${job.job_area}` : ''}
            </div>
            <h1 className="font-display text-2xl font-bold text-[#0F172A] mt-1">{job.title}</h1>
          </div>
          <div className="text-sm text-right">
            <div className="font-mono tabular-nums font-semibold text-[#0F172A]">
              Starts {job.preferred_start_date} · {job.duration_days} {job.duration_days === 1 ? 'day' : 'days'}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Budget: {job.budget_max ? formatINR(job.budget_max) : 'Not specified'} ·{' '}
              {job.requires_operator ? 'Operator needed' : 'Dry hire'} ·{' '}
              {job.requires_transport ? 'Delivery needed' : 'Pickup OK'}
            </div>
          </div>
        </div>
        {job.work_description && <p className="mt-3 text-sm text-slate-700">{job.work_description}</p>}
      </div>

      {bookingMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-800">{bookingMessage}</div>
      )}

      {/* Matching Results */}
      {matches.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-8 space-y-5">
          <div>
            <h2 className="font-display text-lg font-bold text-[#0F172A]">
              No exact listing matches found right now
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Your job request remains open as a demand request so local equipment owners can still review it and respond
              with availability or an alternative machine.
            </p>
          </div>

          {nearbyAlternatives.length > 0 && (
            <div className="pt-4 border-t border-slate-100">
              <h3 className="text-sm font-semibold text-[#0F172A] mb-3">Nearby Equipment Alternatives</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {nearbyAlternatives.map((alt) => (
                  <Link
                    key={alt.id}
                    to={`/equipment/${alt.id}`}
                    className="p-4 border border-slate-200 rounded-md hover:border-[#0D9488] flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="text-xs text-slate-500">
                        {alt.category_name} · {alt.location_city}
                        {alt.is_sample ? ' · Sample listing' : ''}
                      </div>
                      <div className="font-medium text-sm text-[#0F172A] mt-0.5">{alt.title}</div>
                    </div>
                    <div className="font-mono tabular-nums text-sm font-semibold text-[#0F172A] whitespace-nowrap">
                      {formatINR(alt.daily_rate)}/d
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="font-display text-lg font-bold text-[#0F172A]">
            Matched Equipment & Owner Responses ({matches.length})
          </h2>

          {matches.map((m) => {
            const ownerConfirmed =
              m.owner_response_status === 'available_quoted' ||
              m.owner_response_status === 'alternative_proposed';
            const effectiveDailyRate = m.quoted_daily_rate ?? m.daily_rate;
            const estBase = effectiveDailyRate * job.duration_days;
            const knownQuoteSum =
              estBase +
              (m.quoted_transport_charge ?? 0) +
              (m.quoted_operator_charge ?? 0) +
              (m.quoted_fuel_charge ?? 0) +
              (m.quoted_other_charge ?? 0);

            return (
              <div key={m.id} className="bg-white border border-slate-200 rounded-lg p-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-3">
                    <div className="aspect-[4/3] rounded-md overflow-hidden bg-slate-100 border border-slate-100">
                      <EquipmentImage src={m.image_url} alt={m.equipment_title} />
                    </div>
                    <div className="mt-2">
                      <MaintenanceVerificationLabel status={m.maintenance_verification} />
                    </div>
                  </div>

                  <div className="lg:col-span-5 space-y-3">
                    <div>
                      <div className="text-xs text-slate-500">
                        {m.business_name} · {m.location_city}
                        {m.is_sample ? ' · Sample listing' : ''}
                      </div>
                      <Link
                        to={`/equipment/${m.equipment_id}`}
                        className="font-display text-lg font-bold text-[#0F172A] hover:text-[#0F766E]"
                      >
                        {m.equipment_title}
                      </Link>
                      {m.owner_response_status === 'alternative_proposed' && m.alternative_equipment_title && (
                        <div className="mt-1 text-xs font-medium text-[#0F766E]">
                          Owner proposed alternative: {m.alternative_equipment_title}
                        </div>
                      )}
                    </div>

                    {/* Explicit confirmation status — NEVER falsely label owner as available unless confirmed */}
                    <div
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded border ${
                        ownerConfirmed
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : m.owner_response_status === 'declined'
                            ? 'bg-rose-50 text-rose-800 border-rose-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}
                    >
                      {ownerConfirmed ? (
                        <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                      ) : (
                        <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                      )}
                      <span>
                        {ownerConfirmed
                          ? 'Owner confirmed availability & submitted quote'
                          : m.owner_response_status === 'declined'
                            ? 'Owner declined'
                            : 'Calendar open on file · Owner confirmation pending'}
                      </span>
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-slate-700 mb-1.5">Why this listing matched:</div>
                      <ul className="space-y-1 text-xs text-slate-600">
                        {m.match_reasons.map((reason, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-[#0D9488] font-bold">·</span>
                            <span>{reason}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {m.owner_note && (
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700">
                        <span className="font-semibold">Owner note:</span> {m.owner_note}
                      </div>
                    )}
                  </div>

                  {/* Quote & Action Column */}
                  <div className="lg:col-span-4 border-t lg:border-t-0 lg:border-l border-slate-100 pt-4 lg:pt-0 lg:pl-6 flex flex-col justify-between gap-4">
                    <div className="space-y-2 text-xs">
                      <div className="font-semibold text-sm text-[#0F172A]">
                        {ownerConfirmed ? 'Owner Quotation Summary' : 'Listed Rate Estimate'}
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Base ({job.duration_days}d × {formatINR(effectiveDailyRate)})</span>
                        <span className="font-mono tabular-nums font-medium">{formatINR(estBase)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Transport</span>
                        <span className="font-mono tabular-nums">
                          {ownerConfirmed
                            ? formatINR(m.quoted_transport_charge)
                            : m.transport_available && m.transport_base_charge != null
                              ? `${formatINR(m.transport_base_charge)} (est.)`
                              : 'Not yet confirmed'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Operator</span>
                        <span className="font-mono tabular-nums">
                          {ownerConfirmed
                            ? formatINR(m.quoted_operator_charge)
                            : m.operator_available && m.operator_daily_charge != null
                              ? `${formatINR(m.operator_daily_charge * job.duration_days)} (est.)`
                              : 'Not yet confirmed'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Fuel</span>
                        <span className="font-mono tabular-nums">
                          {ownerConfirmed ? formatINR(m.quoted_fuel_charge) : 'Not yet confirmed'}
                        </span>
                      </div>
                      <div className="pt-2 border-t border-slate-100 flex justify-between text-sm font-bold text-[#0F172A]">
                        <span>{ownerConfirmed ? 'Confirmed Quote Total' : 'Base Estimate'}</span>
                        <span className="font-mono tabular-nums">
                          {ownerConfirmed ? formatINR(knownQuoteSum) : formatINR(estBase)}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>Refundable Deposit (separate)</span>
                        <span className="font-mono tabular-nums">
                          {formatINR(ownerConfirmed ? m.quoted_deposit : m.deposit_amount)}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <button
                        type="button"
                        disabled={m.owner_response_status === 'declined' || requestingMatchId === m.id}
                        onClick={() => handleRequestFromMatch(m)}
                        className="w-full py-2.5 px-4 text-sm font-medium text-white bg-[#0D9488] hover:bg-[#0F766E] disabled:bg-slate-300 rounded-md transition-colors"
                      >
                        {requestingMatchId === m.id
                          ? 'Submitting...'
                          : ownerConfirmed
                            ? 'Submit Rental Request from Quote'
                            : 'Request Dates & Quote'}
                      </button>
                      <Link
                        to={`/equipment/${m.equipment_id}`}
                        className="block text-center py-2 px-4 text-xs font-medium text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-md"
                      >
                        Inspect Equipment & Maintenance
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
