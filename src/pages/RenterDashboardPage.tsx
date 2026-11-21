import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Plus } from 'lucide-react';
import { apiFetch, formatINR } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type { JobRequest, NotificationItem, RentalRequest } from '../types';
import { BookingStatusLabel } from '../components/StatusLabel';

export function RenterDashboardPage() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<JobRequest[]>([]);
  const [bookings, setBookings] = useState<RentalRequest[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch<{ jobRequests: JobRequest[] }>('/api/job-requests'),
      apiFetch<{ rentalRequests: RentalRequest[] }>('/api/rental-requests?scope=renter'),
      apiFetch<{ notifications: NotificationItem[] }>('/api/notifications'),
    ])
      .then(([j, b, n]) => {
        setJobs(j.jobRequests);
        setBookings(b.rentalRequests);
        setNotifications(n.notifications.slice(0, 5));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0F172A]">
            Renter Dashboard
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Welcome back, {user?.name}. Track your Zero-Idle job requests and equipment rental bookings.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/marketplace"
            className="px-4 py-2 text-sm font-medium text-[#0F172A] bg-white border border-slate-300 hover:bg-slate-50 rounded-md whitespace-nowrap"
          >
            Browse Equipment
          </Link>
          <Link
            to="/renter/job-requests/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-md whitespace-nowrap"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>Post Job Request</span>
          </Link>
        </div>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="text-xs font-medium text-slate-500">Job Requests Posted</div>
          <div className="font-mono tabular-nums text-2xl font-bold text-[#0F172A] mt-1">{jobs.length}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="text-xs font-medium text-slate-500">Rental Requests</div>
          <div className="font-mono tabular-nums text-2xl font-bold text-[#0F172A] mt-1">{bookings.length}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="text-xs font-medium text-slate-500">Unread Alerts</div>
          <div className="font-mono tabular-nums text-2xl font-bold text-[#0F766E] mt-1">
            {notifications.filter((n) => !n.is_read).length}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="h-48 bg-white border border-slate-200 rounded-lg animate-pulse" />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Active Job Requests */}
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="font-display text-lg font-semibold text-[#0F172A]">Zero-Idle Job Requests</h2>
              <Link to="/renter/job-requests" className="text-xs font-medium text-[#0F766E] hover:underline">
                View all
              </Link>
            </div>
            {jobs.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-600">
                No job requests posted yet. Describe your job to match nearby equipment automatically.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {jobs.slice(0, 4).map((j) => (
                  <div key={j.id} className="py-3.5 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="font-medium text-sm text-[#0F172A] truncate">{j.title}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {j.category_name} · {j.job_city} · {j.preferred_start_date} ({j.duration_days}d)
                      </div>
                      <div className="text-xs text-[#0F766E] mt-0.5 tabular-nums">
                        {j.match_count || 0} matched listings · {j.response_count || 0} owner responses
                      </div>
                    </div>
                    <Link
                      to={`/renter/job-requests/${j.id}/matches`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-slate-300 rounded hover:bg-slate-50 whitespace-nowrap shrink-0"
                    >
                      <span>Matches</span>
                      <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Rental Requests */}
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="font-display text-lg font-semibold text-[#0F172A]">Rental Requests & Bookings</h2>
              <Link to="/renter/bookings" className="text-xs font-medium text-[#0F766E] hover:underline">
                Manage all
              </Link>
            </div>
            {bookings.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-600">
                No rental requests submitted yet. Browse the marketplace or compare matches to send a request.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {bookings.slice(0, 4).map((b) => (
                  <div key={b.id} className="py-3.5 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="font-medium text-sm text-[#0F172A] truncate">{b.equipment_title}</div>
                      <div className="text-xs text-slate-500 mt-0.5 font-mono tabular-nums">
                        {b.start_date} to {b.end_date} · Base {formatINR(b.base_rental_total)}
                      </div>
                    </div>
                    <BookingStatusLabel status={b.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recent Activity & Notifications */}
      {!loading && notifications.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="font-display text-lg font-semibold text-[#0F172A]">Recent Activity &amp; Alerts</h2>
            <Link to="/notifications" className="text-xs font-medium text-[#0F766E] hover:underline">
              View all notifications
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {notifications.map((n) => (
              <Link
                key={n.id}
                to={n.link_path || '/notifications'}
                className="py-3 flex items-start justify-between gap-4 hover:bg-slate-50/70 transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[#0F172A] truncate">{n.title}</span>
                    {!n.is_read && (
                      <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-[#0D9488] text-white shrink-0">
                        New
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5 line-clamp-1">{n.body}</p>
                </div>
                <span className="text-xs font-mono text-slate-400 whitespace-nowrap shrink-0">
                  {n.created_at.slice(0, 10)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
