import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type { NotificationItem } from '../types';

export function NotificationsPage() {
  const { refreshNotifications } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ notifications: NotificationItem[] }>('/api/notifications');
      setItems(data.notifications);
      await refreshNotifications();
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [refreshNotifications]);

  useEffect(() => {
    load();
  }, [load]);

  const handleMarkAllRead = async () => {
    await apiFetch('/api/notifications/read-all', { method: 'POST' });
    await load();
  };

  const handleOpenNotification = async (item: NotificationItem) => {
    if (!item.is_read) {
      await apiFetch(`/api/notifications/${item.id}/read`, { method: 'PATCH' });
      await refreshNotifications();
    }
    navigate(item.link_path || '/');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#0F172A]">In-App Notifications</h1>
          <p className="text-sm text-slate-600 mt-1">
            Job request matches, owner quotations, booking status changes, and enquiries. (Email/SMS alerts are not
            active in this demonstration.)
          </p>
        </div>
        {items.some((i) => !i.is_read) && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-slate-300 rounded-md hover:bg-slate-50"
          >
            <CheckCheck className="w-4 h-4 text-[#0D9488]" aria-hidden="true" />
            <span>Mark all as read</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="h-40 bg-white border border-slate-200 rounded-lg animate-pulse" />
      ) : items.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-10 text-center">
          <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" aria-hidden="true" />
          <h2 className="font-display text-lg font-semibold text-[#0F172A]">No notifications yet</h2>
          <p className="text-sm text-slate-600 mt-1">
            Activity from job matches, rental requests, and enquiries will appear here.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
          {items.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => handleOpenNotification(n)}
              className={`w-full text-left p-5 hover:bg-slate-50 transition-colors flex items-start justify-between gap-4 ${
                n.is_read ? 'opacity-75' : 'bg-teal-50/30'
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-display font-semibold text-sm text-[#0F172A]">{n.title}</span>
                  {!n.is_read && (
                    <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-[#0D9488] text-white">
                      New
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-600 mt-1">{n.body}</p>
              </div>
              <span className="text-xs font-mono text-slate-400 whitespace-nowrap shrink-0">
                {n.created_at.slice(0, 10)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
