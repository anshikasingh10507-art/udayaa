import { useEffect, useState, useCallback } from 'react';
import { apiFetch } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type { Enquiry } from '../types';

export function OwnerEnquiriesPage() {
  const { user } = useAuth();
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyTo, setReplyTo] = useState<Enquiry | null>(null);
  const [replyMsg, setReplyMsg] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ enquiries: Enquiry[] }>('/api/enquiries');
      setEnquiries(data.enquiries);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyTo || !replyMsg.trim()) return;
    const recipientId = replyTo.sender_id === user?.id ? replyTo.recipient_id : replyTo.sender_id;
    await apiFetch('/api/enquiries', {
      method: 'POST',
      body: JSON.stringify({
        equipmentId: replyTo.equipment_id,
        rentalRequestId: replyTo.rental_request_id,
        recipientId,
        message: replyMsg.trim(),
      }),
    });
    setStatusMsg('Reply sent.');
    setReplyTo(null);
    setReplyMsg('');
    await load();
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-[#0F172A]">Rental Enquiries</h1>
        <p className="text-sm text-slate-600 mt-1">
          In-app messages from contractors and renters asking about your equipment listings.
        </p>
      </div>

      {statusMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-xs text-emerald-800">
          {statusMsg}
        </div>
      )}

      {loading ? (
        <div className="h-40 bg-white border border-slate-200 rounded-lg animate-pulse" />
      ) : enquiries.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-10 text-center text-sm text-slate-600">
          No enquiries received yet. Questions sent from your equipment detail pages will appear here.
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
          {enquiries.map((eq) => {
            const isIncoming = eq.recipient_id === user?.id;
            return (
              <div key={eq.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="text-xs text-slate-500">
                    <span className="font-semibold text-[#0F172A]">{eq.equipment_title}</span> ·{' '}
                    {isIncoming ? `From ${eq.sender_name}` : `Sent to ${eq.recipient_name}`} ·{' '}
                    <span className="font-mono">{eq.created_at.slice(0, 10)}</span>
                  </div>
                  <p className="text-sm text-slate-800 mt-1.5">{eq.message}</p>
                </div>
                {isIncoming && (
                  <button
                    type="button"
                    onClick={() => {
                      setReplyTo(eq);
                      setReplyMsg('');
                    }}
                    className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded hover:bg-slate-50 whitespace-nowrap shrink-0"
                  >
                    Reply in App
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {replyTo && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleReply}
            className="bg-white border border-slate-200 rounded-lg p-6 max-w-md w-full space-y-4 shadow-xl"
          >
            <h2 className="font-display text-lg font-bold text-[#0F172A]">Reply to {replyTo.sender_name}</h2>
            <p className="text-xs text-slate-600">Equipment: {replyTo.equipment_title}</p>
            <textarea
              rows={3}
              required
              value={replyMsg}
              onChange={(e) => setReplyMsg(e.target.value)}
              placeholder="Write your reply..."
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md"
            />
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setReplyTo(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-medium text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-md"
              >
                Send Reply
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
