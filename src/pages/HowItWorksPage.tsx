import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export function HowItWorksPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-12">
      <div>
        <p className="text-sm font-medium text-[#0F766E]">Platform Guide</p>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#0F172A] mt-2">How Udaya Works</h1>
        <p className="mt-3 text-base text-slate-600 max-w-2xl leading-relaxed">
          Udaya connects equipment owners with contractors through two complementary paths: direct marketplace search and
          proactive Zero-Idle job matching.
        </p>
      </div>

      <section className="bg-white border border-slate-200 rounded-lg p-6 sm:p-8 space-y-6">
        <h2 className="font-display text-xl font-bold text-[#0F172A]">
          01. The Zero-Idle Matching Workflow
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-slate-700 leading-relaxed">
          <div>
            <h3 className="font-semibold text-[#0F172A]">Step 1: Describe the job once</h3>
            <p className="mt-1">
              Renters specify required equipment category, job city, start date, duration, optional target budget, and
              whether an operator or delivery transport is required.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-[#0F172A]">Step 2: Rule-based compatible matching</h3>
            <p className="mt-1">
              Udaya evaluates equipment category, service radius distance, budget alignment, and non-conflicting calendar
              dates. Every match displays explicit reasons why it qualified.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-[#0F172A]">Step 3: Owner availability confirmation</h3>
            <p className="mt-1">
              Matched owners receive an in-app alert. Listings are never labeled as owner-available until the owner
              reviews the job and submits availability and itemized pricing.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-[#0F172A]">Step 4: Compare quotes & book</h3>
            <p className="mt-1">
              Renters compare owner quotations side-by-side—with unconfirmed costs clearly flagged—and submit a formal
              rental request into the booking workflow.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-lg p-6 sm:p-8 space-y-4">
        <h2 className="font-display text-xl font-bold text-[#0F172A]">02. Booking State Lifecycle</h2>
        <p className="text-sm text-slate-600">
          Every rental request moves through explicit, auditable statuses so neither party confuses an enquiry with a
          confirmed reservation.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2 text-sm">
          {[
            ['Request submitted', 'Renter submitted desired dates and intended use. Dates are not locked yet.'],
            ['Owner reviewing', 'Owner has opened the request to verify machine readiness and site access.'],
            ['Quotation received', 'Owner confirmed itemized rental, transport, operator, and deposit terms.'],
            ['Accepted', 'Booking confirmed; overlapping dates are locked on the equipment calendar.'],
            ['Cancelled / Rejected', 'Request withdrawn by renter (while pending) or declined by owner.'],
            ['Completed', 'Rental period finished and equipment returned; calendar lock released.'],
          ].map(([state, desc]) => (
            <div key={state} className="p-4 bg-[#F8FAFC] border border-slate-200 rounded-md">
              <div className="font-semibold text-[#0F172A]">{state}</div>
              <p className="mt-1 text-xs text-slate-600 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-lg p-6 sm:p-8 space-y-4">
        <h2 className="font-display text-xl font-bold text-[#0F172A]">
          03. Transparent Estimates & Maintenance Verification
        </h2>
        <p className="text-sm text-slate-700 leading-relaxed">
          Equipment rental pricing often breaks down over hidden transport, operator, fuel, and deposit surprises. Udaya’s
          Cost Estimator separates refundable security deposits from rental expenses and marks unknown charges as
          &ldquo;Not yet confirmed&rdquo; instead of silently assuming zero. Maintenance records display explicit
          provenance: <strong>Owner-provided</strong>, <strong>Documents submitted</strong>, or{' '}
          <strong>Independently verified</strong> (assigned only after administrator review of submitted records).
        </p>
        <div className="pt-2 flex flex-wrap gap-3">
          <Link
            to="/marketplace"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-md"
          >
            <span>Explore Equipment</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
          <Link
            to="/cost-estimator"
            className="px-4 py-2 text-sm font-medium text-[#0F172A] border border-slate-300 hover:bg-slate-50 rounded-md"
          >
            Open Cost Estimator
          </Link>
        </div>
      </section>
    </div>
  );
}
