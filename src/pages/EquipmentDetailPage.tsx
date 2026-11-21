import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  Flag,
  Wrench,
  ShieldCheck,
  Lock,
  FlaskConical,
  Box,
  MapPin,
  Bookmark,
  BookmarkCheck,
  Star,
} from 'lucide-react';
import { apiFetch, formatINR } from '../lib/api';
import type { EquipmentListing, EquipmentReview, MaintenanceRecord } from '../types';
import { useAuth } from '../context/AuthContext';
import { useFirebase } from '../context/FirebaseContext';
import { EquipmentImage } from '../components/EquipmentCard';
import { MaintenanceVerificationLabel, VerifiedMachineryBadge } from '../components/StatusLabel';
import { CostBreakdownPanel, type CostLineItem } from '../components/CostBreakdownPanel';

export function EquipmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { isBookmarked, toggleBookmark } = useFirebase();
  const navigate = useNavigate();

  const [equipment, setEquipment] = useState<EquipmentListing | null>(null);
  const [maintenanceHistory, setMaintenanceHistory] = useState<MaintenanceRecord[]>([]);
  const [reviews, setReviews] = useState<EquipmentReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Rental request & estimator state
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().slice(0, 10);
  });
  const [durationDays, setDurationDays] = useState(3);
  const [jobLocation, setJobLocation] = useState('');
  const [intendedUse, setIntendedUse] = useState('');
  const [requiresOperator, setRequiresOperator] = useState(false);
  const [requiresTransport, setRequiresTransport] = useState(false);
  const [renterNotes, setRenterNotes] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [requestResult, setRequestResult] = useState('');
  const [requestError, setRequestError] = useState('');

  // Enquiry form
  const [enquiryMsg, setEnquiryMsg] = useState('');
  const [enquirySent, setEnquirySent] = useState('');
  const [enquiryError, setEnquiryError] = useState('');

  // Report modal/panel
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState('Misleading pricing or availability');
  const [reportDetails, setReportDetails] = useState('');
  const [reportSent, setReportSent] = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    apiFetch<{
      equipment: EquipmentListing;
      maintenanceHistory: MaintenanceRecord[];
      reviews?: EquipmentReview[];
    }>(`/api/equipment/${id}`)
      .then((data) => {
        setEquipment(data.equipment);
        setMaintenanceHistory(data.maintenanceHistory || []);
        setReviews(data.reviews || []);
        setJobLocation(data.equipment.location_city);
        setRequiresOperator(data.equipment.operator_available);
        setRequiresTransport(data.equipment.transport_available);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load equipment details.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="h-96 bg-white border border-slate-200 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (error || !equipment) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <div className="bg-white border border-slate-200 rounded-lg p-8 text-center">
          <h1 className="font-display text-xl font-bold text-[#0F172A]">Equipment Unavailable</h1>
          <p className="text-sm text-slate-600 mt-2">{error || 'This listing could not be found.'}</p>
          <Link to="/marketplace" className="inline-block mt-4 text-sm font-medium text-[#0F766E] hover:underline">
            Return to marketplace
          </Link>
        </div>
      </div>
    );
  }

  const isUnavailable = equipment.availability_status !== 'available';
  const isOwnListing = user?.id === equipment.owner_id;

  // Build transparent cost lines
  const costLines: CostLineItem[] = [
    {
      label: 'Transport / delivery charge',
      amount:
        requiresTransport && equipment.transport_available && equipment.transport_base_charge != null
          ? equipment.transport_base_charge
          : requiresTransport
            ? null
            : 0,
      status: requiresTransport
        ? equipment.transport_available && equipment.transport_base_charge != null
          ? 'Owner-confirmed'
          : 'Not yet confirmed'
        : 'User-entered estimate',
      note: requiresTransport ? 'Round-trip / site delivery subject to exact distance' : 'Self-pickup selected',
    },
    {
      label: `Operator charge (${durationDays} ${durationDays === 1 ? 'day' : 'days'})`,
      amount:
        requiresOperator && equipment.operator_available && equipment.operator_daily_charge != null
          ? equipment.operator_daily_charge * durationDays
          : requiresOperator
            ? null
            : 0,
      status: requiresOperator
        ? equipment.operator_available && equipment.operator_daily_charge != null
          ? 'Owner-confirmed'
          : 'Not yet confirmed'
        : 'User-entered estimate',
      note: requiresOperator ? 'Operator included' : 'Dry hire (no operator requested)',
    },
    {
      label: 'Fuel charge',
      amount:
        equipment.fuel_policy === 'included'
          ? 0
          : equipment.fuel_daily_estimate != null
            ? equipment.fuel_daily_estimate * durationDays
            : null,
      status:
        equipment.fuel_policy === 'included'
          ? 'Owner-confirmed'
          : equipment.fuel_daily_estimate != null
            ? 'User-entered estimate'
            : 'Not yet confirmed',
      note:
        equipment.fuel_policy === 'included'
          ? 'Included in base rate'
          : equipment.fuel_policy === 'renter_pays'
            ? 'Renter arranges diesel directly'
            : 'Estimated daily fuel usage',
    },
  ];

  const handleSubmitRentalRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate(`/login?redirect=/equipment/${equipment.id}`);
      return;
    }
    setRequestError('');
    setRequestResult('');
    setSubmittingRequest(true);
    try {
      await apiFetch('/api/rental-requests', {
        method: 'POST',
        body: JSON.stringify({
          equipmentId: equipment.id,
          startDate,
          durationDays,
          jobLocation,
          intendedUse,
          requiresOperator,
          requiresTransport,
          renterNotes,
        }),
      });
      setRequestResult(
        'Rental request submitted. It is not a confirmed booking yet — the owner will review dates and charges.'
      );
      setIntendedUse('');
      setRenterNotes('');
    } catch (err) {
      setRequestError(err instanceof Error ? err.message : 'Unable to submit rental request.');
    } finally {
      setSubmittingRequest(false);
    }
  };

  const handleSendEnquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate(`/login?redirect=/equipment/${equipment.id}`);
      return;
    }
    setEnquiryError('');
    setEnquirySent('');
    try {
      await apiFetch('/api/enquiries', {
        method: 'POST',
        body: JSON.stringify({
          equipmentId: equipment.id,
          message: enquiryMsg,
        }),
      });
      setEnquirySent('Enquiry sent to the equipment owner via Udaya in-app messaging.');
      setEnquiryMsg('');
    } catch (err) {
      setEnquiryError(err instanceof Error ? err.message : 'Unable to send enquiry.');
    }
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate(`/login?redirect=/equipment/${equipment.id}`);
      return;
    }
    try {
      await apiFetch('/api/reports', {
        method: 'POST',
        body: JSON.stringify({
          equipmentId: equipment.id,
          reason: reportReason,
          details: reportDetails,
        }),
      });
      setReportSent('Report submitted for administrator review.');
      setReportDetails('');
    } catch (err) {
      setReportSent(err instanceof Error ? err.message : 'Unable to submit report.');
    }
  };

  const latestMaint = maintenanceHistory[0] || equipment.latest_maintenance || null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <Link
        to="/marketplace"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-[#0F172A] mb-6"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        <span>Back to Marketplace</span>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Image, Description, Availability Blocks, Maintenance */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="aspect-[4/3] bg-slate-100">
              <EquipmentImage src={equipment.image_url} alt={equipment.title} />
            </div>
            <div className="p-6">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-2">
                <span className="font-medium text-slate-700">{equipment.category_name}</span>
                <span aria-hidden="true">·</span>
                <span>
                  {equipment.location_area ? `${equipment.location_area}, ` : ''}
                  {equipment.location_city}
                </span>
                <span aria-hidden="true">·</span>
                <span>Service radius: {equipment.service_radius_km} km</span>
                {equipment.is_sample && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="text-amber-700 font-medium">Sample listing</span>
                  </>
                )}
              </div>

              <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0F172A]">{equipment.title}</h1>
              {equipment.make_model && (
                <p className="text-sm text-slate-500 mt-1">Make / Model: {equipment.make_model}</p>
              )}

              {/* Verified Machinery Badge & High-Capex Asset Callout */}
              {(equipment.is_verified_machinery || equipment.verification_badge_tier === 'documents_reviewed' || equipment.rent_only_high_capex) && (
                <div className="mt-4 p-4 rounded-md border border-emerald-200 bg-emerald-50/50 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <VerifiedMachineryBadge
                      isVerified={equipment.is_verified_machinery}
                      tier={equipment.verification_badge_tier}
                      certificateId={equipment.verification_certificate_id}
                    />
                    {equipment.calibration_valid_until && (
                      <span className="text-xs text-slate-700 font-mono">
                        Calibration valid until: {equipment.calibration_valid_until}
                      </span>
                    )}
                  </div>
                  {equipment.rent_only_high_capex && (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-700 pt-1 border-t border-emerald-200/70">
                      <span className="inline-flex items-center gap-1 font-semibold text-[#0F766E]">
                        <FlaskConical className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>High-Capex Rent-Only Equipment</span>
                      </span>
                      {equipment.replacement_value_inr && (
                        <span>
                          Est. replacement value:{' '}
                          <span className="font-mono font-semibold text-[#0F172A]">
                            {formatINR(equipment.replacement_value_inr)}
                          </span>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Interactive Inspection & Cloud Actions */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Link
                  to={`/inspector-3d?model=${
                    equipment.category_sector === 'laboratory'
                      ? 'hplc'
                      : equipment.category_sector === 'precision_industrial'
                        ? 'cnc'
                        : 'excavator'
                  }`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#0F172A] hover:bg-slate-800 rounded-md transition-colors"
                >
                  <Box className="w-3.5 h-3.5 text-teal-400" aria-hidden="true" />
                  <span>Inspect in 3D</span>
                </Link>
                <Link
                  to="/map"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#0F172A] bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                >
                  <MapPin className="w-3.5 h-3.5 text-[#0D9488]" aria-hidden="true" />
                  <span>Yard Map & Delivery Route</span>
                </Link>
                <button
                  type="button"
                  onClick={() =>
                    void toggleBookmark({
                      equipmentId: equipment.id,
                      title: equipment.title,
                      categoryName: equipment.category_name || 'Equipment',
                      locationCity: equipment.location_city,
                      dailyRate: equipment.daily_rate,
                      imageUrl: equipment.image_url || '',
                      isVerified: Boolean(equipment.is_verified_machinery),
                    })
                  }
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors ${
                    isBookmarked(equipment.id)
                      ? 'bg-teal-50 text-[#0F766E] border-teal-300'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {isBookmarked(equipment.id) ? (
                    <>
                      <BookmarkCheck className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Saved to Cloud</span>
                    </>
                  ) : (
                    <>
                      <Bookmark className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Save to Watchlist</span>
                    </>
                  )}
                </button>
              </div>

              {isUnavailable && (
                <div className="mt-4 p-3.5 bg-amber-50 border border-amber-200 rounded-md flex items-start gap-2.5 text-sm text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <span className="font-semibold">Not accepting requests:</span> This listing is currently marked as{' '}
                    <span className="font-medium">{equipment.availability_status}</span>.
                  </div>
                </div>
              )}

              <div className="mt-5 pt-5 border-t border-slate-100">
                <h2 className="font-display text-base font-semibold text-[#0F172A]">Equipment Overview</h2>
                <p className="mt-2 text-sm text-slate-700 leading-relaxed">{equipment.description}</p>
              </div>

              <div className="mt-5 pt-5 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-xs text-slate-500">Daily Rate</div>
                  <div className="font-mono tabular-nums font-semibold text-[#0F172A] mt-0.5">
                    {formatINR(equipment.daily_rate)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Weekly Rate</div>
                  <div className="font-mono tabular-nums font-semibold text-[#0F172A] mt-0.5">
                    {equipment.weekly_rate ? formatINR(equipment.weekly_rate) : 'Not listed'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Operator</div>
                  <div className="font-medium text-[#0F172A] mt-0.5">
                    {equipment.operator_available
                      ? equipment.operator_daily_charge != null
                        ? `${formatINR(equipment.operator_daily_charge)} / day`
                        : 'Available (quote needed)'
                      : 'Not included'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Delivery / Transport</div>
                  <div className="font-medium text-[#0F172A] mt-0.5">
                    {equipment.transport_available
                      ? equipment.transport_base_charge != null
                        ? `From ${formatINR(equipment.transport_base_charge)}`
                        : 'Available (quote needed)'
                      : 'Renter pickup'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Fuel Policy</div>
                  <div className="font-medium text-[#0F172A] mt-0.5 capitalize">
                    {equipment.fuel_policy.replace('_', ' ')}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Owner / Yard</div>
                  <div className="font-medium text-[#0F172A] mt-0.5">{equipment.business_name || equipment.owner_name}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Schedule & Availability Blocks */}
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#0F766E]" aria-hidden="true" />
              <h2 className="font-display text-lg font-semibold text-[#0F172A]">Scheduled Unavailability</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Confirmed bookings and owner maintenance blocks prevent overlapping reservations. Final availability for open
              dates is confirmed by the owner upon request review.
            </p>
            {equipment.availability_blocks && equipment.availability_blocks.length > 0 ? (
              <ul className="mt-4 divide-y divide-slate-100 text-sm">
                {equipment.availability_blocks.map((b) => (
                  <li key={b.id} className="py-2.5 flex items-center justify-between gap-4">
                    <span className="font-mono tabular-nums text-slate-800">
                      {b.start_date} to {b.end_date}
                    </span>
                    <span className="text-xs text-slate-500">{b.reason}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-slate-600">
                No conflicting bookings or blockouts currently recorded on file.
              </p>
            )}
          </div>

          {/* Equipment Health & Maintenance Records */}
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-[#0F766E]" aria-hidden="true" />
                <h2 className="font-display text-lg font-semibold text-[#0F172A]">
                  Equipment Condition & Maintenance Record
                </h2>
              </div>
              <MaintenanceVerificationLabel status={latestMaint?.verification_status} />
            </div>

            {equipment.condition_summary && (
              <p className="mt-3 text-sm text-slate-700">{equipment.condition_summary}</p>
            )}

            {latestMaint ? (
              <div className="mt-4 pt-4 border-t border-slate-100 space-y-3 text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600">
                  <div>
                    Last maintenance date:{' '}
                    <span className="font-mono text-[#0F172A]">
                      {latestMaint.last_maintenance_date || 'Not specified'}
                    </span>
                  </div>
                  <div>
                    Record submitted:{' '}
                    <span className="font-mono text-[#0F172A]">{latestMaint.submitted_at.slice(0, 10)}</span>
                  </div>
                </div>
                <p className="text-slate-700">{latestMaint.condition_description}</p>
                {latestMaint.checklist && latestMaint.checklist.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {latestMaint.checklist.map((chk, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-slate-700">
                        <CheckCircle2
                          className={`w-3.5 h-3.5 shrink-0 ${chk.passed ? 'text-emerald-600' : 'text-amber-600'}`}
                          aria-hidden="true"
                        />
                        <span>
                          {chk.item} ({chk.passed ? 'Passed' : 'Attention noted'})
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {latestMaint.document_name && (
                  <div className="text-xs text-slate-500">
                    Supporting document attached: <span className="font-mono text-slate-700">{latestMaint.document_name}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-500">
                No detailed maintenance log has been submitted for this equipment yet.
              </p>
            )}
          </div>

          {/* Sample Renter Reviews & Operational Feedback */}
          {reviews.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-lg p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" aria-hidden="true" />
                  <h2 className="font-display text-lg font-semibold text-[#0F172A]">
                    Renter Feedback &amp; Ratings
                  </h2>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {equipment.average_rating != null && (
                    <span className="font-mono tabular-nums font-semibold text-[#0F172A]">
                      {equipment.average_rating.toFixed(1)} / 5.0 ({reviews.length})
                    </span>
                  )}
                  <span className="text-amber-700 font-medium">· Sample demonstration reviews</span>
                </div>
              </div>

              <div className="mt-4 divide-y divide-slate-100">
                {reviews.map((rev) => (
                  <div key={rev.id} className="py-4 first:pt-2 last:pb-0 space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="text-sm font-semibold text-[#0F172A]">{rev.reviewer_name}</span>
                        {rev.reviewer_role_label && (
                          <span className="text-xs text-slate-500"> · {rev.reviewer_role_label}</span>
                        )}
                        {rev.reviewer_city && (
                          <span className="text-xs text-slate-500"> ({rev.reviewer_city})</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 font-mono text-xs text-slate-600">
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" aria-hidden="true" />
                        <span className="font-semibold text-[#0F172A]">{rev.rating}.0</span>
                        <span>· {rev.rental_duration_days}d rental</span>
                        <span>· {rev.created_at.slice(0, 10)}</span>
                      </div>
                    </div>
                    <div className="text-sm font-medium text-[#0F172A]">{rev.title}</div>
                    <p className="text-sm text-slate-600 leading-relaxed">{rev.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* In-App Enquiry & Report */}
          <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#0F766E]" aria-hidden="true" />
                <h2 className="font-display text-base font-semibold text-[#0F172A]">Ask the Owner a Question</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowReport((p) => !p)}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-rose-700"
              >
                <Flag className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Report listing</span>
              </button>
            </div>

            {isOwnListing ? (
              <p className="text-sm text-slate-600">
                This is your equipment listing.{' '}
                <Link to={`/owner/listings/${equipment.id}/edit`} className="text-[#0F766E] font-medium hover:underline">
                  Edit listing details
                </Link>
              </p>
            ) : (
              <form onSubmit={handleSendEnquiry} className="space-y-3">
                <textarea
                  rows={2}
                  required
                  value={enquiryMsg}
                  onChange={(e) => setEnquiryMsg(e.target.value)}
                  placeholder="Ask about bucket size, site clearance, transport charges, or custom shifts..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md bg-[#F8FAFC] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                />
                {enquiryError && <p className="text-xs text-rose-700">{enquiryError}</p>}
                {enquirySent && <p className="text-xs text-emerald-700 font-medium">{enquirySent}</p>}
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium text-[#0F172A] bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-md transition-colors"
                >
                  {user ? 'Send In-App Enquiry' : 'Sign In to Send Enquiry'}
                </button>
              </form>
            )}

            {showReport && (
              <form onSubmit={handleSubmitReport} className="pt-4 border-t border-slate-100 space-y-3">
                <div className="text-xs font-semibold text-rose-800">Report Listing to Administrator</div>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md bg-[#F8FAFC]"
                >
                  <option>Misleading pricing or availability</option>
                  <option>Suspected fraudulent or duplicate listing</option>
                  <option>Incorrect condition or safety concern</option>
                  <option>Other issue</option>
                </select>
                <textarea
                  rows={2}
                  required
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Provide factual details for moderation review..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md bg-[#F8FAFC]"
                />
                {reportSent && <p className="text-xs text-teal-800 font-medium">{reportSent}</p>}
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs font-medium text-white bg-rose-700 hover:bg-rose-800 rounded-md"
                >
                  Submit Report
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Right Column: Contiguous Rental Request & Cost Breakdown Module */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-20">
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <div className="flex items-baseline justify-between pb-4 border-b border-slate-100">
              <div>
                <span className="font-mono tabular-nums text-2xl font-bold text-[#0F172A]">
                  {formatINR(equipment.daily_rate)}
                </span>
                <span className="text-sm text-slate-500"> / day</span>
              </div>
              <span className="text-xs font-medium text-slate-600">
                {equipment.availability_status === 'available'
                  ? 'Open for requests'
                  : equipment.availability_status}
              </span>
            </div>

            {isOwnListing ? (
              <div className="mt-4 space-y-3">
                <p className="text-sm text-slate-600">You manage this equipment listing.</p>
                <div className="flex gap-3">
                  <Link
                    to={`/owner/listings/${equipment.id}/edit`}
                    className="flex-1 text-center px-4 py-2.5 text-sm font-medium text-white bg-[#0F172A] rounded-md hover:bg-slate-800"
                  >
                    Edit Listing
                  </Link>
                  <Link
                    to={`/owner/maintenance/${equipment.id}`}
                    className="flex-1 text-center px-4 py-2.5 text-sm font-medium border border-slate-300 rounded-md hover:bg-slate-50"
                  >
                    Maintenance Log
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitRentalRequest} className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md bg-[#F8FAFC] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Duration (Days)</label>
                    <input
                      type="number"
                      min="1"
                      max="180"
                      required
                      value={durationDays}
                      onChange={(e) => setDurationDays(Math.max(1, Number(e.target.value) || 1))}
                      className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-200 rounded-md bg-[#F8FAFC] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Job Site Location</label>
                  <input
                    type="text"
                    required
                    value={jobLocation}
                    onChange={(e) => setJobLocation(e.target.value)}
                    placeholder="e.g. Baner, Pune"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md bg-[#F8FAFC] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Intended Work / Application</label>
                  <input
                    type="text"
                    required
                    value={intendedUse}
                    onChange={(e) => setIntendedUse(e.target.value)}
                    placeholder="e.g. Foundation trenching & soil loading"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md bg-[#F8FAFC] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                  />
                </div>

                <div className="flex flex-col gap-2 text-sm text-slate-700">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={requiresOperator}
                      onChange={(e) => setRequiresOperator(e.target.checked)}
                      className="rounded border-slate-300 text-[#0D9488]"
                    />
                    <span>Request operator</span>
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={requiresTransport}
                      onChange={(e) => setRequiresTransport(e.target.checked)}
                      className="rounded border-slate-300 text-[#0D9488]"
                    />
                    <span>Request site delivery / transport</span>
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Site Notes (Optional)</label>
                  <textarea
                    rows={2}
                    value={renterNotes}
                    onChange={(e) => setRenterNotes(e.target.value)}
                    placeholder="Gate access, shift timing, or ground conditions..."
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md bg-[#F8FAFC]"
                  />
                </div>

                {requestError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-800">
                    {requestError}
                  </div>
                )}
                {requestResult && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-xs text-emerald-800 space-y-1">
                    <p className="font-medium">{requestResult}</p>
                    <Link to="/renter/bookings" className="inline-block font-semibold underline">
                      Track request status
                    </Link>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submittingRequest || isUnavailable}
                  className="w-full py-2.5 px-4 text-sm font-medium text-white bg-[#0D9488] hover:bg-[#0F766E] disabled:bg-slate-300 disabled:cursor-not-allowed rounded-md transition-colors"
                >
                  {isUnavailable
                    ? 'Currently Unavailable'
                    : submittingRequest
                      ? 'Submitting Request...'
                      : user
                        ? 'Submit Rental Request'
                        : 'Sign In to Request Rental'}
                </button>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-md flex items-start gap-2.5 text-xs text-slate-700">
                  <Lock className="w-4 h-4 text-[#0F766E] shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <span className="font-semibold text-[#0F172A]">Udaya Escrow Protection:</span> Once the owner
                    accepts or quotes, fund the rental &amp; refundable deposit via Udaya Escrow in your Bookings
                    workspace. Funds release only after handover and return inspection.
                  </div>
                </div>
              </form>
            )}
          </div>

          <CostBreakdownPanel
            durationDays={durationDays}
            baseRate={equipment.daily_rate}
            baseStatus="Owner-confirmed"
            lines={costLines}
            depositAmount={equipment.deposit_amount}
            depositStatus={equipment.deposit_amount != null ? 'Owner-confirmed' : 'Not yet confirmed'}
          />
        </div>
      </div>
    </div>
  );
}
