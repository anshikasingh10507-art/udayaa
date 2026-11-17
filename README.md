# Udaya — Zero-Idle Equipment Marketplace

**Core positioning:** *Udaya helps equipment find demand.*

Udaya is a full-stack equipment marketplace connecting machinery owners with contractors and businesses that need equipment temporarily—combining a traditional searchable marketplace with a proactive, rule-based **Zero-Idle Job Matching** workflow.

---

## Running Locally & Deploying

### Prerequisites
- Node.js `v22+` (uses built-in `node:sqlite` and `node:crypto`—no external database server required for local/demo execution)

### Local Development
```bash
npm install
npm run dev
```
The Express + Vite server runs on `http://localhost:3000`.

### Production Build & Run
```bash
npm run build
NODE_ENV=production npm start
```

### Environment Variables
See `.env.example` for optional configuration (`PORT`, `DB_PATH`, `SESSION_SECRET`, and documented placeholders if migrating storage/auth to Supabase in a future phase).

---

## Relational Database Schema (`server/db.ts`)

13 normalized tables with foreign-key constraints:
- `users`, `sessions`, `owner_profiles`
- `equipment_categories` (7 active construction categories + 5 future-expansion categories)
- `equipment_listings`, `availability_blocks`
- `maintenance_records` (`Owner-provided`, `Documents submitted`, `Independently verified`)
- `job_requests`, `job_matches`
- `rental_requests`, `enquiries`, `notifications`, `reports`

Sample listings and demo accounts are seeded automatically on first launch and clearly marked as `Sample listing`.

---

## Implemented Features
- **Public Marketplace:** Homepage, searchable & filterable marketplace (category, city, max daily rate, operator/transport options, date availability check), equipment detail page, How It Works, and About pages.
- **Role-Based Auth & Authorization:** Registration & login for Renters and Equipment Owners, plus protected Administrator moderation (`403` enforced server-side for unauthorized access or cross-owner edits).
- **Owner Workflows:** Fleet dashboard, add/edit/pause/remove listings, photo uploads, manual unavailable date blocks, maintenance record logging with checklist & document uploads, incoming Zero-Idle job responses, booking quote & acceptance management, and in-app enquiry replies.
- **Renter Workflows:** Renter dashboard, Zero-Idle job request creation, rule-based matching results with explainable reasons, quote comparison, rental request submission & cancellation, and in-app messaging.
- **Total Job Cost Estimator:** Separates refundable deposits from rental expenses and flags unknown charges as `Not yet confirmed` rather than silently treating them as ₹0.
- **Administrator Console (`/admin`):** Review reported listings, remove/restore listings, inspect user & listing records, and verify submitted maintenance documents.

## Incomplete Features & Deferred External Integrations
- **Online Payments & Escrow:** Bookings record `Unpaid (handled outside app during demo)`; no payment gateway is connected.
- **External Notifications:** Alerts work in-app (`/notifications`); SMS, WhatsApp, email, and push delivery are not integrated.
- **Live GPS / Telematics:** Service-radius matching uses city-level Haversine coordinates (`server/geo.ts`), not live hardware GPS trackers.
- **Automated KYC / GST Verification:** Business verification and independent inspection currently rely on manual administrator review.

---

## 3-Minute Pitching Competition Demo Script

1. **Problem & Positioning (Homepage `/`):** Highlight the hero *"Make Equipment Work. Not Sit Idle."* and explain that Udaya helps equipment find demand rather than leaving expensive machinery parked between projects.
2. **Owner Supplies Idle Capacity (`/login` -> Rajesh Sharma Demo):** Sign in as `owner@udaya.demo`, show the Owner Fleet Dashboard, and point out how a JCB 3CX Backhoe Loader is listed with maintenance records and service radius.
3. **Contractor Posts a Job (`/login` -> Vikram Patel Demo -> `/renter/job-requests/new`):** Switch to `renter@udaya.demo` and submit a new job request (e.g., *Foundation Excavation*, Pune, 3 days, operator & transport needed).
4. **Transparent Zero-Idle Matching (`/renter/job-requests/:id/matches`):** Show the generated matches and read out the explicit rule-based match reasons (category match, city/radius match, no conflicting bookings, owner confirmation pending).
5. **Owner Confirms Availability & Quotes (`/owner/job-requests`):** Switch back to the owner, open Notifications / Incoming Job Requests, and confirm availability with an itemized quote.
6. **Renter Compares & Requests Booking (`/renter/bookings` & `/cost-estimator`):** Return to the renter view to compare the owner-confirmed quote—pointing out how unconfirmed fuel stays marked *"Not yet confirmed"* and the refundable deposit is shown separately—and submit the rental request.
7. **Overlap Protection & Moderation (`/admin`):** Show how accepting a booking locks those dates from double-booking, and briefly show the protected Administrator console (`admin@udaya.demo`) reviewing reports and maintenance documents.
