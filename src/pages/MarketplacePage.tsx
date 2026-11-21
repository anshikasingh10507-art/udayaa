import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, SlidersHorizontal, ArrowRight, ShieldCheck, FlaskConical } from 'lucide-react';
import { apiFetch, CITIES_LIST } from '../lib/api';
import type { EquipmentCategory, EquipmentListing } from '../types';
import { EquipmentCard } from '../components/EquipmentCard';
import { useLanguage } from '../context/LanguageContext';

export function MarketplacePage() {
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState<EquipmentCategory[]>([]);
  const [equipment, setEquipment] = useState<EquipmentListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [q, setQ] = useState(searchParams.get('q') || '');
  const [sector, setSector] = useState(searchParams.get('sector') || 'all');
  const [category, setCategory] = useState(searchParams.get('category') || 'all');
  const [city, setCity] = useState(searchParams.get('city') || '');
  const [maxRate, setMaxRate] = useState(searchParams.get('maxRate') || '');
  const [startDate, setStartDate] = useState(searchParams.get('startDate') || '');
  const [durationDays, setDurationDays] = useState(searchParams.get('durationDays') || '1');
  const [verifiedOnly, setVerifiedOnly] = useState(searchParams.get('verifiedOnly') === 'true');
  const [rentOnlyHighCapex, setRentOnlyHighCapex] = useState(searchParams.get('rentOnlyHighCapex') === 'true');
  const [availableOnly, setAvailableOnly] = useState(searchParams.get('availableOnly') === 'true');
  const [operatorOnly, setOperatorOnly] = useState(searchParams.get('operatorOnly') === 'true');
  const [transportOnly, setTransportOnly] = useState(searchParams.get('transportOnly') === 'true');

  // Sync local filter state whenever URL query params change (e.g. via Voice Assistant navigation)
  const searchKey = searchParams.toString();
  useEffect(() => {
    setQ(searchParams.get('q') || '');
    setSector(searchParams.get('sector') || 'all');
    setCategory(searchParams.get('category') || 'all');
    setCity(searchParams.get('city') || '');
    setMaxRate(searchParams.get('maxRate') || '');
    setStartDate(searchParams.get('startDate') || '');
    setDurationDays(searchParams.get('durationDays') || '1');
    setVerifiedOnly(searchParams.get('verifiedOnly') === 'true');
    setRentOnlyHighCapex(searchParams.get('rentOnlyHighCapex') === 'true');
    setAvailableOnly(searchParams.get('availableOnly') === 'true');
    setOperatorOnly(searchParams.get('operatorOnly') === 'true');
    setTransportOnly(searchParams.get('transportOnly') === 'true');
  }, [searchKey]);

  useEffect(() => {
    apiFetch<{ categories: EquipmentCategory[] }>('/api/categories')
      .then((d) => setCategories(d.categories))
      .catch(() => {});
  }, []);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set('q', q.trim());
      if (sector && sector !== 'all') params.set('sector', sector);
      if (category && category !== 'all') params.set('category', category);
      if (city) params.set('city', city);
      if (maxRate) params.set('maxRate', maxRate);
      if (verifiedOnly) params.set('verifiedOnly', 'true');
      if (rentOnlyHighCapex) params.set('rentOnlyHighCapex', 'true');
      if (availableOnly) params.set('availableOnly', 'true');
      if (operatorOnly) params.set('operatorOnly', 'true');
      if (transportOnly) params.set('transportOnly', 'true');
      if (startDate) {
        params.set('startDate', startDate);
        params.set('durationDays', durationDays || '1');
      }
      const data = await apiFetch<{ equipment: EquipmentListing[] }>(`/api/equipment?${params.toString()}`);
      setEquipment(data.equipment);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load equipment listings.');
    } finally {
      setLoading(false);
    }
  }, [q, sector, category, city, maxRate, verifiedOnly, rentOnlyHighCapex, availableOnly, operatorOnly, transportOnly, startDate, durationDays]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    const next = new URLSearchParams();
    if (q.trim()) next.set('q', q.trim());
    if (sector && sector !== 'all') next.set('sector', sector);
    if (category && category !== 'all') next.set('category', category);
    if (city) next.set('city', city);
    if (maxRate) next.set('maxRate', maxRate);
    if (verifiedOnly) next.set('verifiedOnly', 'true');
    if (rentOnlyHighCapex) next.set('rentOnlyHighCapex', 'true');
    if (availableOnly) next.set('availableOnly', 'true');
    if (operatorOnly) next.set('operatorOnly', 'true');
    if (transportOnly) next.set('transportOnly', 'true');
    if (startDate) next.set('startDate', startDate);
    setSearchParams(next);
  };

  const resetFilters = () => {
    setQ('');
    setSector('all');
    setCategory('all');
    setCity('');
    setMaxRate('');
    setStartDate('');
    setDurationDays('1');
    setVerifiedOnly(false);
    setRentOnlyHighCapex(false);
    setAvailableOnly(false);
    setOperatorOnly(false);
    setTransportOnly(false);
    setSearchParams({});
  };

  const visibleCategories =
    sector === 'all' ? categories : categories.filter((c) => !c.sector || c.sector === sector);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0F172A]">{t('market.title')}</h1>
          <p className="text-sm text-slate-600 mt-1">
            {t('market.subtitle')}
          </p>
        </div>
        <Link
          to="/renter/job-requests/new"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-md transition-colors whitespace-nowrap shrink-0"
        >
          <span>{t('market.postJobInstead')}</span>
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </Link>
      </div>

      {/* Filters Panel */}
      <form onSubmit={handleApply} className="mt-6 bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#0F172A]">
          <SlidersHorizontal className="w-4 h-4 text-[#0F766E]" aria-hidden="true" />
          <span>{t('market.filterHeader')}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">{t('market.keywordLabel')}</label>
            <div className="flex items-center gap-2 px-3 bg-[#F8FAFC] border border-slate-200 rounded-md h-10">
              <Search className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t('market.keywordPlaceholder')}
                className="w-full text-sm bg-transparent focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">{t('market.sectorLabel')}</label>
            <select
              value={sector}
              onChange={(e) => {
                setSector(e.target.value);
                setCategory('all');
              }}
              className="w-full px-3 bg-[#F8FAFC] border border-slate-200 rounded-md h-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
            >
              <option value="all">{t('market.sectorAll')}</option>
              <option value="construction">{t('market.sectorConstruction')}</option>
              <option value="laboratory">{t('market.sectorLab')}</option>
              <option value="precision_industrial">{t('market.sectorCnc')}</option>
              <option value="surveying_geotech">{t('market.sectorSurvey')}</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">{t('market.categoryLabel')}</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 bg-[#F8FAFC] border border-slate-200 rounded-md h-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
            >
              <option value="all">{t('market.allCategories')}</option>
              {visibleCategories.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">{t('market.cityLabel')}</label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full px-3 bg-[#F8FAFC] border border-slate-200 rounded-md h-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
            >
              <option value="">{t('market.allCities')}</option>
              {CITIES_LIST.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">{t('market.maxRateLabel')}</label>
            <input
              type="number"
              min="0"
              value={maxRate}
              onChange={(e) => setMaxRate(e.target.value)}
              placeholder="e.g. 25000"
              className="w-full px-3 bg-[#F8FAFC] border border-slate-200 rounded-md h-10 text-sm font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
            />
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5 text-sm text-slate-700">
            <label className="inline-flex items-center gap-2 cursor-pointer font-medium text-emerald-800">
              <input
                type="checkbox"
                checked={verifiedOnly}
                onChange={(e) => setVerifiedOnly(e.target.checked)}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-600"
              />
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
              <span>{t('market.verifiedOnly')}</span>
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer font-medium text-[#0F766E]">
              <input
                type="checkbox"
                checked={rentOnlyHighCapex}
                onChange={(e) => setRentOnlyHighCapex(e.target.checked)}
                className="rounded border-slate-300 text-[#0D9488] focus:ring-[#0D9488]"
              />
              <FlaskConical className="w-4 h-4 text-[#0F766E] shrink-0" aria-hidden="true" />
              <span>{t('market.highCapexOnly')}</span>
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={availableOnly}
                onChange={(e) => setAvailableOnly(e.target.checked)}
                className="rounded border-slate-300 text-[#0D9488] focus:ring-[#0D9488]"
              />
              <span>{t('market.excludeUnavailable')}</span>
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={operatorOnly}
                onChange={(e) => setOperatorOnly(e.target.checked)}
                className="rounded border-slate-300 text-[#0D9488] focus:ring-[#0D9488]"
              />
              <span>{t('market.operatorAvailable')}</span>
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={transportOnly}
                onChange={(e) => setTransportOnly(e.target.checked)}
                className="rounded border-slate-300 text-[#0D9488] focus:ring-[#0D9488]"
              />
              <span>{t('market.transportAvailable')}</span>
            </label>
            {availableOnly && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Check date:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-2 py-1 text-xs border border-slate-200 rounded bg-[#F8FAFC]"
                />
                <input
                  type="number"
                  min="1"
                  max="90"
                  value={durationDays}
                  onChange={(e) => setDurationDays(e.target.value)}
                  aria-label="Duration days"
                  className="w-16 px-2 py-1 text-xs border border-slate-200 rounded bg-[#F8FAFC] font-mono"
                />
                <span className="text-xs text-slate-500">days</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={resetFilters}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-[#0F172A]"
            >
              {t('market.resetFilters')}
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium text-white bg-[#0F172A] hover:bg-slate-800 rounded-md transition-colors"
            >
              {t('market.applyFilters')}
            </button>
          </div>
        </div>
      </form>

      {/* Results */}
      <div className="mt-6">
        <div className="text-sm text-slate-600 mb-4 tabular-nums">
          {loading ? 'Loading listings...' : `${equipment.length} ${equipment.length === 1 ? 'listing' : 'listings'} shown`}
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-800">{error}</div>
        )}

        {!loading && equipment.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg p-10 text-center">
            <h2 className="font-display text-lg font-semibold text-[#0F172A]">No equipment matches these filters</h2>
            <p className="text-sm text-slate-600 mt-1 max-w-md mx-auto">
              Try widening your search criteria or post a Zero-Idle job request so nearby equipment owners can respond with availability.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={resetFilters}
                className="px-4 py-2 text-sm font-medium border border-slate-300 rounded-md hover:bg-slate-50"
              >
                {t('market.resetFilters')}
              </button>
              <Link
                to="/renter/job-requests/new"
                className="px-4 py-2 text-sm font-medium text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-md"
              >
                {t('hero.postJob')}
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {equipment.map((item) => (
              <EquipmentCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
