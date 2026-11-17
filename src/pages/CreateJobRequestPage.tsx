import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, CITIES_LIST } from '../lib/api';
import type { EquipmentCategory } from '../types';

export function CreateJobRequestPage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<EquipmentCategory[]>([]);
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [jobCity, setJobCity] = useState('Pune');
  const [jobArea, setJobArea] = useState('');
  const [preferredStartDate, setPreferredStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 4);
    return d.toISOString().slice(0, 10);
  });
  const [durationDays, setDurationDays] = useState(3);
  const [budgetMax, setBudgetMax] = useState('');
  const [requiresOperator, setRequiresOperator] = useState(true);
  const [requiresTransport, setRequiresTransport] = useState(true);
  const [workDescription, setWorkDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<{ categories: EquipmentCategory[] }>('/api/categories')
      .then((d) => {
        setCategories(d.categories);
        if (d.categories.length > 0) setCategoryId(String(d.categories[0].id));
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await apiFetch<{ jobRequestId: number }>('/api/job-requests', {
        method: 'POST',
        body: JSON.stringify({
          title,
          categoryId: Number(categoryId),
          jobCity,
          jobArea,
          preferredStartDate,
          durationDays,
          budgetMax: budgetMax ? Number(budgetMax) : null,
          requiresOperator,
          requiresTransport,
          workDescription,
        }),
      });
      navigate(`/renter/job-requests/${res.jobRequestId}/matches`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit job request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <p className="text-xs font-medium text-[#0F766E]">Zero-Idle Matching</p>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0F172A] mt-1">
          Post a Job Request
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Describe your work requirements once. Udaya finds compatible equipment without date conflicts, notifies
          nearby owners, and explains why each listing matched.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-lg p-6 sm:p-8 space-y-5">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Job Title</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Plot Excavation & Drainage Trenching"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md bg-[#F8FAFC] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Equipment Category Needed</label>
            <select
              required
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md bg-[#F8FAFC] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Total Rental Budget (Optional, ₹)</label>
            <input
              type="number"
              min="0"
              value={budgetMax}
              onChange={(e) => setBudgetMax(e.target.value)}
              placeholder="e.g. 25000"
              className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-200 rounded-md bg-[#F8FAFC] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Job City</label>
            <select
              value={jobCity}
              onChange={(e) => setJobCity(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md bg-[#F8FAFC] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
            >
              {CITIES_LIST.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Locality / Site Area</label>
            <input
              type="text"
              value={jobArea}
              onChange={(e) => setJobArea(e.target.value)}
              placeholder="e.g. Baner Road"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md bg-[#F8FAFC] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Preferred Start Date</label>
            <input
              type="date"
              required
              value={preferredStartDate}
              onChange={(e) => setPreferredStartDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md bg-[#F8FAFC] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Estimated Duration (Days)</label>
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

        <div className="flex flex-wrap gap-6 text-sm text-slate-700">
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={requiresOperator}
              onChange={(e) => setRequiresOperator(e.target.checked)}
              className="rounded border-slate-300 text-[#0D9488]"
            />
            <span>Operator required</span>
          </label>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={requiresTransport}
              onChange={(e) => setRequiresTransport(e.target.checked)}
              className="rounded border-slate-300 text-[#0D9488]"
            />
            <span>Site delivery / transport required</span>
          </label>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Work Description & Site Constraints</label>
          <textarea
            rows={3}
            required
            value={workDescription}
            onChange={(e) => setWorkDescription(e.target.value)}
            placeholder="Describe soil type, trench depth, power load, or access constraints so owners can quote accurately..."
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md bg-[#F8FAFC] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
          />
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-800">{error}</div>
        )}

        <div className="pt-2 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-[#0F172A]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 text-sm font-medium text-white bg-[#0D9488] hover:bg-[#0F766E] disabled:bg-slate-400 rounded-md transition-colors"
          >
            {submitting ? 'Matching Equipment...' : 'Find Matching Equipment'}
          </button>
        </div>
      </form>
    </div>
  );
}
