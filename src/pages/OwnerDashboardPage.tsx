import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit3, Wrench, PauseCircle, PlayCircle } from 'lucide-react';
import { apiFetch, formatINR } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type { EquipmentListing, JobMatch, RentalRequest } from '../types';
import { EquipmentImage } from '../components/EquipmentCard';
import { BookingStatusLabel, MaintenanceVerificationLabel } from '../components/StatusLabel';

export function OwnerDashboardPage() {
  const { user, ownerProfile, refreshAuth } = useAuth();
  const [fleet, setFleet] = useState<EquipmentListing[]>([]);
  const [jobMatches, setJobMatches] = useState<JobMatch[]>([]);
  const [bookings, setBookings] = useState<RentalRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingProfile, setEditingProfile] = useState(false);
  const [businessName, setBusinessName] = useState(ownerProfile?.business_name || '');
  const [serviceArea, setServiceArea] = useState(ownerProfile?.service_area || '');
  const [serviceRadiusKm, setServiceRadiusKm] = useState(ownerProfile?.service_radius_km || 35);
  const [bio, setBio] = useState(ownerProfile?.bio || '');
  const [profileMsg, setProfileMsg] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [eqRes, jrRes, bkRes] = await Promise.all([
        apiFetch<{ equipment: EquipmentListing[] }>('/api/owner/equipment'),
        apiFetch<{ matchedRequests: JobMatch[] }>('/api/owner/job-requests'),
        apiFetch<{ rentalRequests: RentalRequest[] }>('/api/rental-requests?scope=owner'),
      ]);
      setFleet(eqRes.equipment);
      setJobMatches(jrRes.matchedRequests);
      setBookings(bkRes.rentalRequests);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (ownerProfile) {
      setBusinessName(ownerProfile.business_name);
      setServiceArea(ownerProfile.service_area);
      setServiceRadiusKm(ownerProfile.service_radius_km);
      setBio(ownerProfile.bio);
    }
  }, [ownerProfile]);

  const togglePause = async (item: EquipmentListing) => {
    const nextStatus = item.availability_status === 'available' ? 'paused' : 'available';
    await apiFetch(`/api/equipment/${item.id}`, {
      method: 'PUT',
      body: JSON.stringify({ availabilityStatus: nextStatus }),
    });
    await loadData();
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg('');
    await apiFetch('/api/owner/profile', {
      method: 'PUT',
      body: JSON.stringify({ businessName, serviceArea, serviceRadiusKm, bio }),
    });
    await refreshAuth();
    setEditingProfile(false);
    setProfileMsg('Owner profile updated.');
  };

  const pendingJobs = jobMatches.filter((m) => m.owner_response_status === 'pending').length;
  const activeBookings = bookings.filter((b) =>
    ['Request submitted', 'Owner reviewing', 'Quotation received', 'Accepted'].includes(b.status)
  ).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0F172A]">Owner Fleet Dashboard</h1>
          <p className="text-sm text-slate-600 mt-1">
            {ownerProfile?.business_name || user?.name} · Manage machinery listings, Zero-Idle job opportunities, and
            bookings.
          </p>
        </div>
        <Link
          to="/owner/listings/new"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-md whitespace-nowrap"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          <span>Add Equipment Listing</span>
        </Link>
      </div>

      {/* Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="text-xs font-medium text-slate-500">Listed Equipment</div>
          <div className="font-mono tabular-nums text-2xl font-bold text-[#0F172A] mt-1">{fleet.length}</div>
        </div>
        <Link
          to="/owner/job-requests"
          className="bg-white border border-slate-200 hover:border-[#0D9488] rounded-lg p-5 block transition-colors"
        >
          <div className="text-xs font-medium text-slate-500">Matched Job Opportunities</div>
          <div className="font-mono tabular-nums text-2xl font-bold text-[#0F766E] mt-1">
            {jobMatches.length}{' '}
            <span className="text-xs font-sans font-normal text-slate-500">({pendingJobs} awaiting response)</span>
          </div>
        </Link>
        <Link
          to="/owner/bookings"
          className="bg-white border border-slate-200 hover:border-[#0D9488] rounded-lg p-5 block transition-colors"
        >
          <div className="text-xs font-medium text-slate-500">Active Rental Requests</div>
          <div className="font-mono tabular-nums text-2xl font-bold text-[#0F172A] mt-1">{activeBookings}</div>
        </Link>
      </div>

      {/* Owner Profile Box */}
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-base font-semibold text-[#0F172A]">Owner Profile & Service Area</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {ownerProfile?.business_name} · Service area: {ownerProfile?.service_area} (Radius:{' '}
              {ownerProfile?.service_radius_km} km)
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEditingProfile((p) => !p)}
            className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded hover:bg-slate-50"
          >
            {editingProfile ? 'Cancel' : 'Edit Profile'}
          </button>
        </div>
        {profileMsg && <p className="text-xs text-emerald-700 mt-2">{profileMsg}</p>}
        {editingProfile && (
          <form onSubmit={handleSaveProfile} className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Business / Yard Name</label>
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Service Area</label>
              <input
                type="text"
                required
                value={serviceArea}
                onChange={(e) => setServiceArea(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Default Radius (km)</label>
              <input
                type="number"
                min="5"
                value={serviceRadiusKm}
                onChange={(e) => setServiceRadiusKm(Number(e.target.value) || 35)}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-md"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-xs font-medium text-slate-700 mb-1">Short Bio</label>
              <input
                type="text"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md"
              />
            </div>
            <div className="sm:col-span-3 flex justify-end">
              <button type="submit" className="px-4 py-2 text-xs font-medium text-white bg-[#0D9488] rounded-md">
                Save Profile
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Fleet Table / Cards */}
      <div className="space-y-4">
        <h2 className="font-display text-xl font-bold text-[#0F172A]">Your Equipment Fleet</h2>
        {loading ? (
          <div className="h-48 bg-white border border-slate-200 rounded-lg animate-pulse" />
        ) : fleet.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg p-10 text-center">
            <h3 className="font-display text-lg font-semibold text-[#0F172A]">No equipment listed yet</h3>
            <p className="text-sm text-slate-600 mt-1">
              Add your first machine so local contractors can discover it and Zero-Idle matching can route jobs to you.
            </p>
            <Link
              to="/owner/listings/new"
              className="inline-block mt-4 px-5 py-2 text-sm font-medium text-white bg-[#0D9488] rounded-md"
            >
              Add Equipment Listing
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {fleet.map((item) => (
              <div key={item.id} className="bg-white border border-slate-200 rounded-lg p-5 flex gap-4">
                <div className="w-28 h-24 rounded-md overflow-hidden bg-slate-100 shrink-0 border border-slate-100">
                  <EquipmentImage src={item.image_url} alt={item.title} />
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-between gap-2">
                  <div>
                    <div className="text-xs text-slate-500 truncate">
                      {item.category_name} · {item.location_city}
                      {item.is_sample ? ' · Sample listing' : ''}
                    </div>
                    <Link
                      to={`/equipment/${item.id}`}
                      className="font-display font-semibold text-[#0F172A] hover:text-[#0F766E] truncate block"
                    >
                      {item.title}
                    </Link>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="font-mono tabular-nums text-sm font-semibold text-[#0F172A]">
                        {formatINR(item.daily_rate)}/day
                      </span>
                      <span
                        className={`text-xs font-medium ${
                          item.availability_status === 'available' ? 'text-[#0F766E]' : 'text-amber-700'
                        }`}
                      >
                        · {item.availability_status}
                      </span>
                    </div>
                    <div className="mt-1.5">
                      <MaintenanceVerificationLabel status={item.latest_maintenance?.verification_status} />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
                    <Link
                      to={`/owner/listings/${item.id}/edit`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 border border-slate-300 rounded hover:bg-slate-50"
                    >
                      <Edit3 className="w-3 h-3" aria-hidden="true" />
                      <span>Edit</span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => togglePause(item)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 border border-slate-300 rounded hover:bg-slate-50"
                    >
                      {item.availability_status === 'available' ? (
                        <>
                          <PauseCircle className="w-3 h-3" aria-hidden="true" />
                          <span>Pause</span>
                        </>
                      ) : (
                        <>
                          <PlayCircle className="w-3 h-3" aria-hidden="true" />
                          <span>Activate</span>
                        </>
                      )}
                    </button>
                    <Link
                      to={`/owner/maintenance/${item.id}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 border border-slate-300 rounded hover:bg-slate-50"
                    >
                      <Wrench className="w-3 h-3" aria-hidden="true" />
                      <span>Maintenance</span>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Bookings Preview */}
      {bookings.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="font-display text-lg font-semibold text-[#0F172A]">Recent Rental Requests</h2>
            <Link to="/owner/bookings" className="text-xs font-medium text-[#0F766E] hover:underline">
              Manage all bookings
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {bookings.slice(0, 4).map((b) => (
              <div key={b.id} className="py-3 flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-[#0F172A]">
                    {b.equipment_title} — <span className="text-slate-600 font-normal">{b.renter_name}</span>
                  </div>
                  <div className="text-xs font-mono text-slate-500">
                    {b.start_date} to {b.end_date} · {b.job_location}
                  </div>
                </div>
                <BookingStatusLabel status={b.status} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
