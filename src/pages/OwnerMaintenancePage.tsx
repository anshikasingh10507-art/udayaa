import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Upload } from 'lucide-react';
import { apiFetch } from '../lib/api';
import type { EquipmentListing, MaintenanceRecord } from '../types';
import { MaintenanceVerificationLabel } from '../components/StatusLabel';

const DEFAULT_CHECKLIST = [
  { item: 'Engine oil & filter check', passed: true },
  { item: 'Hydraulic hoses & seals', passed: true },
  { item: 'Brakes & parking lock', passed: true },
  { item: 'Safety lights, horn & mirrors', passed: true },
];

export function OwnerMaintenancePage() {
  const { equipmentId } = useParams<{ equipmentId?: string }>();
  const [fleet, setFleet] = useState<EquipmentListing[]>([]);
  const [selectedId, setSelectedId] = useState(equipmentId || '');
  const [history, setHistory] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [conditionDescription, setConditionDescription] = useState('');
  const [lastMaintenanceDate, setLastMaintenanceDate] = useState('');
  const [checklist, setChecklist] = useState(DEFAULT_CHECKLIST);
  const [notes, setNotes] = useState('');
  const [documentName, setDocumentName] = useState('');
  const [documentDataUrl, setDocumentDataUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<{ equipment: EquipmentListing[] }>('/api/owner/equipment')
      .then((d) => {
        setFleet(d.equipment);
        if (!selectedId && d.equipment.length > 0) {
          setSelectedId(String(d.equipment[0].id));
        }
      })
      .finally(() => setLoading(false));
  }, [selectedId]);

  const loadHistory = useCallback(async () => {
    if (!selectedId) return;
    try {
      const d = await apiFetch<{ maintenanceHistory: MaintenanceRecord[] }>(`/api/equipment/${selectedId}`);
      setHistory(d.maintenanceHistory || []);
    } catch {
      setHistory([]);
    }
  }, [selectedId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      setError('Supporting document must be under 3 MB.');
      return;
    }
    setDocumentName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setDocumentDataUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;
    setError('');
    setMsg('');
    setSubmitting(true);
    try {
      await apiFetch(`/api/equipment/${selectedId}/maintenance`, {
        method: 'POST',
        body: JSON.stringify({
          conditionDescription,
          lastMaintenanceDate: lastMaintenanceDate || null,
          checklist,
          notes,
          documentName,
          documentDataUrl,
        }),
      });
      setMsg(
        documentName
          ? 'Maintenance record saved with status "Documents submitted". An administrator can verify submitted records.'
          : 'Maintenance record saved with status "Owner-provided".'
      );
      setConditionDescription('');
      setNotes('');
      setDocumentName('');
      setDocumentDataUrl('');
      await loadHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save maintenance record.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-[#0F172A]">Maintenance Record Management</h1>
        <p className="text-sm text-slate-600 mt-1">
          Log equipment condition, inspection checklists, and service receipts. Records without attachments are labeled{' '}
          <strong>Owner-provided</strong>; records with documents are labeled <strong>Documents submitted</strong>.
        </p>
      </div>

      {loading ? (
        <div className="h-48 bg-white border border-slate-200 rounded-lg animate-pulse" />
      ) : fleet.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-8 text-center text-sm text-slate-600">
          Add an equipment listing first to submit maintenance records.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <form onSubmit={handleSubmit} className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Select Equipment</label>
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md bg-[#F8FAFC]"
              >
                {fleet.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Condition Description</label>
              <textarea
                rows={2}
                required
                value={conditionDescription}
                onChange={(e) => setConditionDescription(e.target.value)}
                placeholder="Describe current mechanical condition, hour meter reading, and recent service..."
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md bg-[#F8FAFC]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Last Maintenance Date (Optional)</label>
              <input
                type="date"
                value={lastMaintenanceDate}
                onChange={(e) => setLastMaintenanceDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md bg-[#F8FAFC]"
              />
            </div>

            <div>
              <div className="text-xs font-medium text-slate-700 mb-2">Inspection Checklist</div>
              <div className="space-y-2">
                {checklist.map((c, idx) => (
                  <label key={c.item} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={c.passed}
                      onChange={(e) => {
                        const next = [...checklist];
                        next[idx] = { ...c, passed: e.target.checked };
                        setChecklist(next);
                      }}
                      className="rounded border-slate-300 text-[#0D9488]"
                    />
                    <span>{c.item}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Additional Notes</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any parts replaced or pending inspection notes"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md bg-[#F8FAFC]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Upload Maintenance Invoice / Photo (Optional)
              </label>
              <label className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium bg-[#F8FAFC] border border-slate-300 rounded-md cursor-pointer hover:bg-slate-100">
                <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{documentName || 'Choose document or photo'}</span>
                <input type="file" onChange={handleFile} className="hidden" />
              </label>
            </div>

            {error && <p className="text-xs text-rose-700">{error}</p>}
            {msg && <p className="text-xs text-emerald-700 font-medium">{msg}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 text-sm font-medium text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-md"
            >
              {submitting ? 'Saving Record...' : 'Save Maintenance Record'}
            </button>
          </form>

          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-6 space-y-4">
            <h2 className="font-display text-base font-bold text-[#0F172A]">Submitted Record History</h2>
            {history.length === 0 ? (
              <p className="text-sm text-slate-500">No maintenance logs recorded for this listing yet.</p>
            ) : (
              <div className="space-y-4">
                {history.map((rec) => (
                  <div key={rec.id} className="p-4 bg-[#F8FAFC] border border-slate-200 rounded-md space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <MaintenanceVerificationLabel status={rec.verification_status} />
                      <span className="text-xs font-mono text-slate-500">{rec.submitted_at.slice(0, 10)}</span>
                    </div>
                    <p className="text-sm text-slate-800">{rec.condition_description}</p>
                    {rec.last_maintenance_date && (
                      <div className="text-xs text-slate-500">
                        Service date: <span className="font-mono">{rec.last_maintenance_date}</span>
                      </div>
                    )}
                    {rec.document_name && (
                      <div className="text-xs text-slate-600">
                        File: <span className="font-mono">{rec.document_name}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
