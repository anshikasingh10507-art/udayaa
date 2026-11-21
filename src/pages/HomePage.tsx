import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ArrowRight, CheckCircle2, FileText, ShieldCheck, Calendar, FlaskConical, Lock } from 'lucide-react';
import { apiFetch, CITIES_LIST } from '../lib/api';
import type { EquipmentCategory, EquipmentListing } from '../types';
import { EquipmentCard, EquipmentImage } from '../components/EquipmentCard';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export function HomePage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<EquipmentCategory[]>([]);
  const [listings, setListings] = useState<EquipmentListing[]>([]);
  const [highCapexListings, setHighCapexListings] = useState<EquipmentListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCity, setSearchCity] = useState('');

  useEffect(() => {
    Promise.all([
      apiFetch<{ categories: EquipmentCategory[] }>('/api/categories'),
      apiFetch<{ equipment: EquipmentListing[] }>('/api/equipment'),
    ])
      .then(([catRes, eqRes]) => {
        setCategories(catRes.categories);
        const all = eqRes.equipment || [];
        const specialized = all.filter((item) => item.rent_only_high_capex);
        const construction = all.filter((item) => !item.rent_only_high_capex);
        setHighCapexListings(specialized.slice(0, 4));
        // Show a balanced showcase: 3 verified/specialized + 3 construction listings
        const featured = [...construction.slice(0, 3), ...specialized.slice(0, 3)];
        setListings(featured.length > 0 ? featured : all.slice(0, 6));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set('q', searchQuery.trim());
    if (searchCity) params.set('city', searchCity);
    navigate(`/marketplace?${params.toString()}`);
  };

  const listEquipmentTarget = user?.role === 'owner' ? '/owner/listings/new' : '/login?role=owner';
  const postJobTarget = user ? '/renter/job-requests/new' : '/login?redirect=/renter/job-requests/new';

  const sectorLabel = (sector?: string) => {
    if (sector === 'laboratory') return 'Lab & Biotech';
    if (sector === 'precision_industrial') return 'Precision CNC';
    if (sector === 'surveying_geotech') return '3D Survey';
    return 'Construction';
  };

  return (
    <div>
      {/* 1. Hero Section — Split 2-column with balanced height and single dominant CTA */}
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
            <div className="lg:col-span-7 flex flex-col justify-center">
              <p className="text-sm font-medium text-[#0F766E] mb-3">
                {t('hero.kicker')}
              </p>
              <h1
                className="font-display font-bold text-[#0F172A] tracking-tight leading-[1.1] max-w-2xl"
                style={{ fontSize: 'clamp(2.25rem, 4vw, 3.5rem)', textWrap: 'balance' }}
              >
                {t('hero.title')}
              </h1>
              <p className="mt-4 text-base sm:text-lg text-slate-600 max-w-xl leading-relaxed">
                {t('hero.subtitle')}
              </p>

              {/* Inline Search Bar */}
              <form
                onSubmit={handleSearch}
                className="mt-7 bg-[#F8FAFC] border border-slate-200 rounded-lg p-2 flex flex-col sm:flex-row gap-2 max-w-2xl"
              >
                <div className="flex-1 flex items-center gap-2 px-3 bg-white border border-slate-200 rounded-md min-h-[44px]">
                  <Search className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('hero.searchPlaceholder')}
                    aria-label="Search equipment"
                    className="w-full text-sm bg-transparent text-[#0F172A] placeholder:text-slate-400 focus:outline-none"
                  />
                </div>
                <select
                  value={searchCity}
                  onChange={(e) => setSearchCity(e.target.value)}
                  aria-label="Select location city"
                  className="sm:w-44 px-3 bg-white border border-slate-200 rounded-md text-sm text-[#0F172A] min-h-[44px] focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                >
                  <option value="">{t('hero.allLocations')}</option>
                  {CITIES_LIST.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-sm font-medium text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-md transition-colors whitespace-nowrap shrink-0 min-h-[44px]"
                >
                  {t('hero.findEquipment')}
                </button>
              </form>

              {/* Secondary & Third CTAs */}
              <div className="mt-5 flex flex-wrap items-center gap-4 text-sm">
                <Link
                  to={listEquipmentTarget}
                  className="inline-flex items-center gap-1.5 px-4 py-2 font-medium text-[#0F172A] bg-white border border-slate-300 hover:border-slate-400 rounded-md transition-colors whitespace-nowrap shrink-0"
                >
                  <span>{t('hero.listEquipment')}</span>
                </Link>
                <Link
                  to={postJobTarget}
                  className="inline-flex items-center gap-1.5 px-4 py-2 font-medium text-[#C2410C] bg-orange-50 border border-orange-200 hover:bg-orange-100 rounded-md transition-colors whitespace-nowrap shrink-0"
                >
                  <span>{t('hero.postJob')}</span>
                  <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
                </Link>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="h-full min-h-[280px] rounded-lg overflow-hidden border border-slate-200 bg-slate-100 relative">
                <EquipmentImage
                  src="/src/assets/images/hero_excavator_site_1794920310287.jpg"
                  alt="Hydraulic excavator prepared on a commercial construction site"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/85 via-slate-950/45 to-transparent p-5 text-white">
                  <div className="text-xs font-medium text-teal-300">{t('hero.positioningLabel')}</div>
                  <div className="font-display text-base font-semibold mt-0.5">
                    {t('hero.positioningText')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Equipment & Lab Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="font-display text-2xl font-bold text-[#0F172A]">{t('home.categoriesTitle')}</h2>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl">
              {t('home.categoriesSubtitle')}
            </p>
          </div>
          <Link to="/marketplace" className="text-sm font-medium text-[#0F766E] hover:underline whitespace-nowrap shrink-0">
            {t('home.viewMarketplace')}
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to={`/marketplace?category=${cat.slug}`}
              className="bg-white border border-slate-200 hover:border-[#0D9488] rounded-lg p-4 transition-colors flex flex-col justify-between gap-2"
            >
              <div>
                <div className="text-[11px] font-medium text-[#0F766E] mb-1">
                  {sectorLabel(cat.sector)}
                </div>
                <div className="font-display font-semibold text-[#0F172A] text-base">{cat.name}</div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">{cat.description}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* 2.5 Rent-Only High-Capex Lab & Precision Machinery Showcase */}
      {highCapexListings.length > 0 && (
        <section className="bg-slate-50 border-y border-slate-200 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0F766E] mb-1.5">
                  <FlaskConical className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{t('badge.highCapexRentOnly')}</span>
                </div>
                <h2 className="font-display text-2xl font-bold text-[#0F172A]">{t('home.highCapexTitle')}</h2>
                <p className="text-sm text-slate-600 mt-1 max-w-2xl">
                  {t('home.highCapexSubtitle')}
                </p>
              </div>
              <Link
                to="/marketplace?rentOnlyHighCapex=true"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[#0F766E] hover:underline whitespace-nowrap shrink-0"
              >
                <span>{t('home.browseAll')}</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {highCapexListings.map((item) => (
                <EquipmentCard key={item.id} item={item} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 3. Verified & Selected Equipment Listings */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="font-display text-2xl font-bold text-[#0F172A]">{t('home.featuredTitle')}</h2>
            <p className="text-sm text-slate-600 mt-1">
              {t('home.featuredSubtitle')}
            </p>
          </div>
          <Link
            to="/marketplace"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#0F766E] hover:underline whitespace-nowrap shrink-0"
          >
            <span>{t('home.browseAll')}</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-white border border-slate-200 rounded-lg h-80 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((item) => (
              <EquipmentCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>

      {/* 4. Zero-Idle Matching & Escrow Workflow */}
      <section className="bg-[#0F172A] text-white py-14 mt-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="max-w-2xl mb-10">
            <p className="text-xs font-medium text-teal-300">{t('home.workflowKicker')}</p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold mt-1.5">
              {t('home.workflowTitle')}
            </h2>
            <p className="text-sm text-slate-300 mt-2 leading-relaxed">
              {t('home.workflowSubtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                step: '01. Post Job Requirements',
                desc: 'Enter equipment or lab instrument category, city, start date, duration, target budget, and operator/technician needs.',
              },
              {
                step: '02. Verified Rule Matching',
                desc: 'Udaya checks category compatibility, non-conflicting calendar dates, service radius, and verified inspection badges.',
              },
              {
                step: '03. Fund Udaya Escrow',
                desc: 'Rental fee and refundable security deposit are locked in Udaya Escrow once accepted—blocking overlapping dates automatically.',
              },
              {
                step: '04. Handover & Release',
                desc: 'After verified handover and safe return inspection, funds release to the owner and the security deposit returns to the renter.',
              },
            ].map((item) => (
              <div key={item.step} className="bg-slate-800/70 border border-slate-700 rounded-lg p-5">
                <h3 className="font-display text-base font-semibold text-white">{item.step}</h3>
                <p className="mt-2 text-sm text-slate-300 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              to={postJobTarget}
              className="px-5 py-2.5 text-sm font-medium bg-[#0D9488] hover:bg-[#0F766E] text-white rounded-md transition-colors whitespace-nowrap"
            >
              {t('home.tryZeroIdle')}
            </Link>
            <Link
              to="/how-it-works"
              className="px-5 py-2.5 text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded-md transition-colors whitespace-nowrap"
            >
              {t('home.readWorkflow')}
            </Link>
          </div>
        </div>
      </section>

      {/* 5. Benefits for Renters & Owners + Trust & Cost Clarity */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white border border-slate-200 rounded-lg p-6 sm:p-8">
            <h2 className="font-display text-xl font-bold text-[#0F172A]">For Renters, Labs & Contractors</h2>
            <ul className="mt-4 space-y-3 text-sm text-slate-700">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#0D9488] shrink-0 mt-0.5" aria-hidden="true" />
                <span>Filter by category, city, daily rate, operator support, and open calendar dates.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#0D9488] shrink-0 mt-0.5" aria-hidden="true" />
                <span>Post a job request once and receive availability confirmations with transparent match reasons.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#0D9488] shrink-0 mt-0.5" aria-hidden="true" />
                <span>Know upfront which charges are owner-confirmed versus unconfirmed before committing.</span>
              </li>
            </ul>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-6 sm:p-8">
            <h2 className="font-display text-xl font-bold text-[#0F172A]">For Equipment Owners</h2>
            <ul className="mt-4 space-y-3 text-sm text-slate-700">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#0D9488] shrink-0 mt-0.5" aria-hidden="true" />
                <span>List idle machinery with custom service radius, transport terms, and operator rates.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#0D9488] shrink-0 mt-0.5" aria-hidden="true" />
                <span>Receive relevant local job requests in-app instead of waiting passively for calls.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#0D9488] shrink-0 mt-0.5" aria-hidden="true" />
                <span>Prevent double-bookings with date-conflict checks and manual maintenance blockouts.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Transparent Estimates & Maintenance Foundation */}
        <div className="mt-8 bg-white border border-slate-200 rounded-lg p-6 sm:p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="flex items-center gap-2 font-display font-semibold text-[#0F172A]">
              <FileText className="w-4 h-4 text-[#0F766E]" aria-hidden="true" />
              <span>Transparent Cost Estimator</span>
            </div>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Base rental, transport, operator, fuel, and other charges are itemized separately from refundable deposits.
              Unknown costs display as &ldquo;Not yet confirmed&rdquo; rather than hidden zeros.
            </p>
          </div>
          <div>
            <div className="flex items-center gap-2 font-display font-semibold text-[#0F172A]">
              <ShieldCheck className="w-4 h-4 text-[#0F766E]" aria-hidden="true" />
              <span>Explicit Maintenance Labels</span>
            </div>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Records clearly distinguish between Owner-provided notes, Documents submitted, and Independently verified
              after authorized admin review—never invented scores.
            </p>
          </div>
          <div>
            <div className="flex items-center gap-2 font-display font-semibold text-[#0F172A]">
              <Calendar className="w-4 h-4 text-[#0F766E]" aria-hidden="true" />
              <span>Truthful Availability Checks</span>
            </div>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Confirmed bookings block overlapping dates automatically. Owners are only shown as confirmed available after
              explicitly responding.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
