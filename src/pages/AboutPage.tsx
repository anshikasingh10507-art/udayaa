import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import type { EquipmentCategory } from '../types';

export function AboutPage() {
  const [futureCategories, setFutureCategories] = useState<EquipmentCategory[]>([]);

  useEffect(() => {
    apiFetch<{ categories: EquipmentCategory[] }>('/api/categories?includeFuture=true')
      .then((d) => setFutureCategories(d.categories.filter((c) => c.group_type === 'future_expansion')))
      .catch(() => {});
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-10">
      <div>
        <p className="text-sm font-medium text-[#0F766E]">About Udaya</p>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#0F172A] mt-2">
          Udaya helps equipment find demand.
        </h1>
        <p className="mt-3 text-base text-slate-600 max-w-2xl leading-relaxed">
          Across local construction and contracting ecosystems, machinery frequently sits idle between projects while
          nearby builders spend hours calling intermediaries to verify machine availability, operator support, and true
          delivered costs. Udaya is designed to turn passive listings into a proactive utilization network.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <h2 className="font-display text-lg font-bold text-[#0F172A]">Initial Focus: Construction Machinery</h2>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            Our initial marketplace concentrates on high-value construction and site machinery—JCBs, excavators, utility
            tractors, compact loaders, concrete mixers, generators, and compressors—where idle days represent
            significant unrecovered capital.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <h2 className="font-display text-lg font-bold text-[#0F172A]">Structured Future Category Expansion</h2>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            The underlying category schema already supports future expansion without re-architecting the marketplace:
          </p>
          <ul className="mt-3 space-y-1.5 text-sm text-slate-700">
            {futureCategories.map((c) => (
              <li key={c.id}>
                <span className="font-medium text-[#0F172A]">{c.name}</span> —{' '}
                <span className="text-xs text-slate-500">{c.description.replace('Future expansion: ', '')}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-6 sm:p-8 space-y-4">
        <h2 className="font-display text-xl font-bold text-[#0F172A]">
          Demonstration Scope & Future Integrations
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          Udaya is built to present real end-to-end workflows honestly without fabricating commercial traction or
          pretending external services are active when they are not.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 text-sm">
          <div>
            <h3 className="font-semibold text-[#0F172A]">Working in This Release</h3>
            <ul className="mt-2 space-y-1.5 text-slate-700 list-disc pl-5">
              <li>Role-based accounts for Equipment Owners, Renters, and Administrators</li>
              <li>Full equipment listing CRUD, image uploads, pause/maintenance toggles, and date blockouts</li>
              <li>Rule-based Zero-Idle job request matching with explainable match reasons</li>
              <li>In-app notifications, quotes, rental requests, overlap prevention, and enquiry threads</li>
              <li>Transparent Cost Estimator separating refundable deposits and unconfirmed charges</li>
              <li>Maintenance logging with explicit verification provenance and admin moderation</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-[#0F172A]">Deferred External Integrations</h3>
            <ul className="mt-2 space-y-1.5 text-slate-700 list-disc pl-5">
              <li>Online payment gateway & escrow settlement (bookings show unpaid demo status)</li>
              <li>SMS / WhatsApp / Email push alerts outside the in-app notification center</li>
              <li>Live GPS / telematics feed from equipment (uses city-level coordinates today)</li>
              <li>KYC & GST business document verification via external government APIs</li>
              <li>Managed cloud object storage (S3/Supabase Storage) for large multi-file galleries</li>
            </ul>
          </div>
        </div>
        <div className="pt-3 flex flex-wrap gap-3">
          <Link
            to="/login"
            className="inline-block px-5 py-2.5 text-sm font-medium text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-md"
          >
            Try the Live Demo Accounts
          </Link>
          <a
            href="/udaya-pitch-deck.pdf"
            download="Udaya-Pitch-Deck.pdf"
            className="inline-block px-5 py-2.5 text-sm font-medium text-[#0F172A] bg-white border border-slate-300 hover:bg-slate-50 rounded-md"
          >
            Download Pitch Deck (PDF)
          </a>
        </div>
      </div>
    </div>
  );
}
