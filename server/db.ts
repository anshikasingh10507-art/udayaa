import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { getCityCoordinates } from './geo.ts';

const dbPath = process.env.DB_PATH || path.resolve(process.cwd(), 'data', 'udaya.sqlite');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

export const db = new DatabaseSync(dbPath);

db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

export function initializeDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('renter', 'owner', 'admin')),
      phone TEXT NOT NULL DEFAULT '',
      city TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS owner_profiles (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      business_name TEXT NOT NULL,
      service_area TEXT NOT NULL,
      service_radius_km INTEGER NOT NULL DEFAULT 35,
      bio TEXT NOT NULL DEFAULT '',
      verified_contact INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS equipment_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      group_type TEXT NOT NULL CHECK(group_type IN ('construction', 'future_expansion')),
      description TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS equipment_listings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category_id INTEGER NOT NULL REFERENCES equipment_categories(id),
      title TEXT NOT NULL,
      make_model TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL,
      location_city TEXT NOT NULL,
      location_area TEXT NOT NULL DEFAULT '',
      latitude REAL,
      longitude REAL,
      service_radius_km INTEGER NOT NULL DEFAULT 35,
      daily_rate REAL NOT NULL,
      weekly_rate REAL,
      operator_available INTEGER NOT NULL DEFAULT 0,
      operator_daily_charge REAL,
      transport_available INTEGER NOT NULL DEFAULT 0,
      transport_base_charge REAL,
      fuel_policy TEXT NOT NULL DEFAULT 'renter_pays' CHECK(fuel_policy IN ('renter_pays', 'included', 'estimated_extra')),
      fuel_daily_estimate REAL,
      deposit_amount REAL,
      availability_status TEXT NOT NULL DEFAULT 'available' CHECK(availability_status IN ('available', 'paused', 'maintenance')),
      condition_summary TEXT NOT NULL DEFAULT '',
      image_url TEXT NOT NULL DEFAULT '',
      is_sample INTEGER NOT NULL DEFAULT 0,
      is_removed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS availability_blocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      equipment_id INTEGER NOT NULL REFERENCES equipment_listings(id) ON DELETE CASCADE,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      reason TEXT NOT NULL DEFAULT 'Unavailable',
      booking_id INTEGER
    );

    CREATE TABLE IF NOT EXISTS maintenance_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      equipment_id INTEGER NOT NULL REFERENCES equipment_listings(id) ON DELETE CASCADE,
      condition_description TEXT NOT NULL,
      last_maintenance_date TEXT,
      checklist_json TEXT NOT NULL DEFAULT '[]',
      notes TEXT NOT NULL DEFAULT '',
      document_name TEXT NOT NULL DEFAULT '',
      document_data_url TEXT NOT NULL DEFAULT '',
      verification_status TEXT NOT NULL DEFAULT 'Owner-provided' CHECK(verification_status IN ('Owner-provided', 'Documents submitted', 'Independently verified')),
      submitted_at TEXT NOT NULL,
      verified_by_admin_id INTEGER REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS job_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      renter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      work_description TEXT NOT NULL,
      category_id INTEGER NOT NULL REFERENCES equipment_categories(id),
      job_city TEXT NOT NULL,
      job_area TEXT NOT NULL DEFAULT '',
      latitude REAL,
      longitude REAL,
      preferred_start_date TEXT NOT NULL,
      duration_days INTEGER NOT NULL,
      budget_max REAL,
      requires_operator INTEGER NOT NULL DEFAULT 0,
      requires_transport INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'responses_received', 'fulfilled', 'cancelled')),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS job_matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_request_id INTEGER NOT NULL REFERENCES job_requests(id) ON DELETE CASCADE,
      equipment_id INTEGER NOT NULL REFERENCES equipment_listings(id) ON DELETE CASCADE,
      owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      match_score INTEGER NOT NULL DEFAULT 0,
      match_reasons_json TEXT NOT NULL DEFAULT '[]',
      availability_note TEXT NOT NULL DEFAULT '',
      owner_response_status TEXT NOT NULL DEFAULT 'pending' CHECK(owner_response_status IN ('pending', 'available_quoted', 'alternative_proposed', 'declined')),
      quoted_daily_rate REAL,
      quoted_transport_charge REAL,
      quoted_operator_charge REAL,
      quoted_fuel_charge REAL,
      quoted_other_charge REAL,
      quoted_deposit REAL,
      owner_note TEXT NOT NULL DEFAULT '',
      alternative_equipment_id INTEGER REFERENCES equipment_listings(id),
      responded_at TEXT
    );

    CREATE TABLE IF NOT EXISTS rental_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      equipment_id INTEGER NOT NULL REFERENCES equipment_listings(id) ON DELETE CASCADE,
      renter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      job_request_id INTEGER REFERENCES job_requests(id),
      job_match_id INTEGER REFERENCES job_matches(id),
      job_location TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      duration_days INTEGER NOT NULL,
      intended_use TEXT NOT NULL,
      requires_operator INTEGER NOT NULL DEFAULT 0,
      requires_transport INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'Request submitted' CHECK(status IN (
        'Request submitted',
        'Owner reviewing',
        'Quotation received',
        'Accepted',
        'Rejected',
        'Cancelled',
        'Completed'
      )),
      payment_status TEXT NOT NULL DEFAULT 'Unpaid (handled outside app during demo)',
      base_rental_total REAL NOT NULL,
      transport_charge REAL,
      operator_charge REAL,
      fuel_charge REAL,
      other_charge REAL,
      deposit_amount REAL,
      charges_confirmed_by_owner INTEGER NOT NULL DEFAULT 0,
      renter_notes TEXT NOT NULL DEFAULT '',
      owner_notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS enquiries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      equipment_id INTEGER NOT NULL REFERENCES equipment_listings(id) ON DELETE CASCADE,
      rental_request_id INTEGER REFERENCES rental_requests(id) ON DELETE SET NULL,
      sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      recipient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      link_path TEXT NOT NULL DEFAULT '/',
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reporter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      equipment_id INTEGER REFERENCES equipment_listings(id) ON DELETE SET NULL,
      rental_request_id INTEGER REFERENCES rental_requests(id) ON DELETE SET NULL,
      reason TEXT NOT NULL,
      details TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Open' CHECK(status IN ('Open', 'Under Review', 'Resolved', 'Listing Removed')),
      admin_notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      resolved_at TEXT
    );

    CREATE TABLE IF NOT EXISTS escrow_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rental_request_id INTEGER NOT NULL UNIQUE REFERENCES rental_requests(id) ON DELETE CASCADE,
      renter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      escrow_ref TEXT NOT NULL UNIQUE,
      rental_amount REAL NOT NULL,
      deposit_amount REAL NOT NULL DEFAULT 0,
      platform_fee REAL NOT NULL DEFAULT 0,
      total_funded REAL NOT NULL,
      payment_method TEXT NOT NULL DEFAULT 'UPI Escrow',
      status TEXT NOT NULL DEFAULT 'pending_funding' CHECK(status IN (
        'pending_funding',
        'funded_held',
        'handover_confirmed',
        'released_to_owner',
        'refunded_to_renter',
        'disputed'
      )),
      dispute_reason TEXT NOT NULL DEFAULT '',
      funded_at TEXT,
      handover_confirmed_at TEXT,
      released_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS escrow_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      escrow_id INTEGER NOT NULL REFERENCES escrow_transactions(id) ON DELETE CASCADE,
      actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      actor_role TEXT NOT NULL,
      event_type TEXT NOT NULL,
      note TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS equipment_reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      equipment_id INTEGER NOT NULL REFERENCES equipment_listings(id) ON DELETE CASCADE,
      reviewer_name TEXT NOT NULL,
      reviewer_role_label TEXT NOT NULL DEFAULT '',
      reviewer_city TEXT NOT NULL DEFAULT '',
      rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
      title TEXT NOT NULL,
      comment TEXT NOT NULL,
      rental_duration_days INTEGER NOT NULL DEFAULT 1,
      verified_rental INTEGER NOT NULL DEFAULT 1,
      is_sample INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );
  `);

  runSchemaMigrations();
  seedInitialData();
  seedExpandedMachineryAndBadges();
  seedComprehensiveDemoData();
}

function hasColumn(table: string, column: string): boolean {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  return cols.some((c) => c.name === column);
}

function runSchemaMigrations(): void {
  if (!hasColumn('equipment_categories', 'sector')) {
    db.exec(`ALTER TABLE equipment_categories ADD COLUMN sector TEXT NOT NULL DEFAULT 'construction'`);
  }
  if (!hasColumn('equipment_listings', 'is_verified_machinery')) {
    db.exec(`ALTER TABLE equipment_listings ADD COLUMN is_verified_machinery INTEGER NOT NULL DEFAULT 0`);
  }
  if (!hasColumn('equipment_listings', 'verification_badge_tier')) {
    db.exec(`ALTER TABLE equipment_listings ADD COLUMN verification_badge_tier TEXT NOT NULL DEFAULT 'unverified'`);
  }
  if (!hasColumn('equipment_listings', 'verification_certificate_id')) {
    db.exec(`ALTER TABLE equipment_listings ADD COLUMN verification_certificate_id TEXT NOT NULL DEFAULT ''`);
  }
  if (!hasColumn('equipment_listings', 'verified_at')) {
    db.exec(`ALTER TABLE equipment_listings ADD COLUMN verified_at TEXT`);
  }
  if (!hasColumn('equipment_listings', 'calibration_valid_until')) {
    db.exec(`ALTER TABLE equipment_listings ADD COLUMN calibration_valid_until TEXT`);
  }
  if (!hasColumn('equipment_listings', 'replacement_value_inr')) {
    db.exec(`ALTER TABLE equipment_listings ADD COLUMN replacement_value_inr REAL`);
  }
  if (!hasColumn('equipment_listings', 'rent_only_high_capex')) {
    db.exec(`ALTER TABLE equipment_listings ADD COLUMN rent_only_high_capex INTEGER NOT NULL DEFAULT 0`);
  }
}

function hashDemoPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function seedInitialData(): void {
  const catCount = (db.prepare('SELECT COUNT(*) as c FROM equipment_categories').get() as { c: number }).c;
  if (catCount === 0) {
    const insertCat = db.prepare(
      'INSERT INTO equipment_categories (slug, name, group_type, description, sort_order, is_active) VALUES (?, ?, ?, ?, ?, ?)'
    );
    const categories: Array<[string, string, 'construction' | 'future_expansion', string, number, number]> = [
      ['excavators-jcbs', 'Excavators and JCBs', 'construction', 'Backhoe loaders, hydraulic excavators, and trenching machines for site preparation.', 1, 1],
      ['tractors', 'Tractors', 'construction', 'Heavy-duty utility tractors, haulage tractors, and grading attachments.', 2, 1],
      ['loaders-earthmoving', 'Loaders and earthmoving equipment', 'construction', 'Skid-steer loaders, compact wheel loaders, and material handling equipment.', 3, 1],
      ['concrete-mixers', 'Concrete mixers', 'construction', 'Portable drum mixers and tilting concrete batching units for small to mid-size pours.', 4, 1],
      ['generators', 'Generators', 'construction', 'Mobile soundproofed diesel generators for backup and off-grid jobsite power.', 5, 1],
      ['compressors', 'Compressors', 'construction', 'Air compressors for pneumatic breakers, painting, and site testing.', 6, 1],
      ['other-construction', 'Other construction equipment', 'construction', 'Compactors, plate vibrators, scaffolding, and specialized civil hardware.', 7, 1],
      ['power-tools', 'Power tools', 'future_expansion', 'Future expansion: rotary hammers, angle grinders, and cordless tool kits.', 8, 0],
      ['gardening-equipment', 'Gardening equipment', 'future_expansion', 'Future expansion: brush cutters, lawn mowers, and landscaping equipment.', 9, 0],
      ['household-tools', 'Household tools', 'future_expansion', 'Future expansion: pressure washers, ladders, and home maintenance gear.', 10, 0],
      ['event-equipment', 'Event equipment', 'future_expansion', 'Future expansion: portable lighting towers, staging, and sound systems.', 11, 0],
      ['small-business-equipment', 'Small-business equipment', 'future_expansion', 'Future expansion: commercial cleaning, packaging, and workshop machines.', 12, 0],
    ];
    for (const c of categories) {
      insertCat.run(...c);
    }
  }

  const userCount = (db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }).c;
  if (userCount > 0) return;

  const now = new Date().toISOString();
  const insertUser = db.prepare(
    'INSERT INTO users (name, email, password_hash, role, phone, city, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );

  const owner1Res = insertUser.run(
    'Rajesh Sharma',
    'owner@udaya.demo',
    hashDemoPassword('demo1234'),
    'owner',
    '+91 98200 11223',
    'Pune',
    now
  );
  const owner1Id = Number(owner1Res.lastInsertRowid);

  const owner2Res = insertUser.run(
    'Meera Kulkarni',
    'meera.fleet@udaya.demo',
    hashDemoPassword('demo1234'),
    'owner',
    '+91 98200 44556',
    'Pimpri-Chinchwad',
    now
  );
  const owner2Id = Number(owner2Res.lastInsertRowid);

  const renterRes = insertUser.run(
    'Vikram Patel',
    'renter@udaya.demo',
    hashDemoPassword('demo1234'),
    'renter',
    '+91 98111 77889',
    'Pune',
    now
  );
  const renterId = Number(renterRes.lastInsertRowid);

  const adminRes = insertUser.run(
    'Udaya Operations Admin',
    'admin@udaya.demo',
    hashDemoPassword('admin1234'),
    'admin',
    '+91 98000 00001',
    'Pune',
    now
  );
  const adminId = Number(adminRes.lastInsertRowid);

  const insertProfile = db.prepare(
    'INSERT INTO owner_profiles (user_id, business_name, service_area, service_radius_km, bio, verified_contact) VALUES (?, ?, ?, ?, ?, ?)'
  );
  insertProfile.run(
    owner1Id,
    'Sharma Earthmovers & Fleet (Sample)',
    'Pune, Pimpri-Chinchwad, Hinjewadi, Chakan',
    45,
    'Family-run earthmoving and site machinery fleet sharing equipment between highway and residential contracts.',
    1
  );
  insertProfile.run(
    owner2Id,
    'Sahyadri Site Power & Mixers (Sample)',
    'Pimpri-Chinchwad, Pune, Talegaon',
    50,
    'Commercial contractor lending backup power generators and concrete equipment during project gaps.',
    1
  );

  const getCatId = (slug: string) =>
    (db.prepare('SELECT id FROM equipment_categories WHERE slug = ?').get(slug) as { id: number }).id;

  const insertListing = db.prepare(`
    INSERT INTO equipment_listings (
      owner_id, category_id, title, make_model, description, location_city, location_area,
      latitude, longitude, service_radius_km, daily_rate, weekly_rate,
      operator_available, operator_daily_charge, transport_available, transport_base_charge,
      fuel_policy, fuel_daily_estimate, deposit_amount, availability_status,
      condition_summary, image_url, is_sample, is_removed, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?)
  `);

  const puneCoords = getCityCoordinates('Pune')!;
  const pcmcCoords = getCityCoordinates('Pimpri-Chinchwad')!;
  const mumbaiCoords = getCityCoordinates('Mumbai')!;

  const eq1Id = Number(
    insertListing.run(
      owner1Id,
      getCatId('excavators-jcbs'),
      'JCB 3CX Backhoe Loader — 76 HP',
      'JCB 3CX Eco (2022)',
      'Well-maintained backhoe loader suitable for foundation trenching, drainage excavation, and material loading on residential and commercial plots.',
      'Pune',
      'Hinjewadi Phase 2',
      puneCoords.lat,
      puneCoords.lon,
      45,
      6500,
      36000,
      1,
      1400,
      1,
      2500,
      'renter_pays',
      1800,
      15000,
      'available',
      'Clean hydraulic lines, 85% tire tread remaining, serviced every 250 operating hours.',
      '/src/assets/images/eq_jcb_backhoe_1794920310957.jpg',
      now,
      now
    ).lastInsertRowid
  );

  const eq2Id = Number(
    insertListing.run(
      owner1Id,
      getCatId('tractors'),
      'Utility Loader Tractor — 55 HP with Front Bucket',
      'Loadmax S250 Utility 4WD',
      'Four-wheel-drive utility tractor equipped with front loader bucket for site clearing, soil leveling, and aggregate shifting.',
      'Pune',
      'Wakad / Baner Link',
      puneCoords.lat,
      puneCoords.lon,
      40,
      3200,
      18000,
      1,
      1000,
      1,
      1800,
      'renter_pays',
      900,
      8000,
      'available',
      'Strong clutch and PTO assembly; hydraulic bucket cylinder resealed recently.',
      '/src/assets/images/eq_tractor_utility_1794920313456.jpg',
      now,
      now
    ).lastInsertRowid
  );

  const eq3Id = Number(
    insertListing.run(
      owner2Id,
      getCatId('concrete-mixers'),
      'Heavy-Duty Portable Drum Concrete Mixer — 12 Cu.Ft.',
      'Duramix 12H Diesel',
      'Towable heavy-duty drum mixer ideal for slab pours, column footings, and boundary wall concrete batches.',
      'Pimpri-Chinchwad',
      'Bhosari MIDC',
      pcmcCoords.lat,
      pcmcCoords.lon,
      35,
      1400,
      7800,
      0,
      null,
      1,
      900,
      'renter_pays',
      450,
      3000,
      'available',
      'Drum blades intact with minimal wear; engine starts on first crank.',
      '/src/assets/images/eq_concrete_mixer_1794920312061.jpg',
      now,
      now
    ).lastInsertRowid
  );

  const eq4Id = Number(
    insertListing.run(
      owner2Id,
      getCatId('generators'),
      '100 kW Soundproofed Mobile Diesel Generator',
      'SilentPower DG-100',
      'Acoustic-enclosed 100 kW diesel generator on skid frame for construction power, dewatering pumps, and site lighting.',
      'Pimpri-Chinchwad',
      'Chakan Industrial Belt',
      pcmcCoords.lat,
      pcmcCoords.lon,
      60,
      4800,
      27000,
      0,
      null,
      1,
      3000,
      'estimated_extra',
      2400,
      12000,
      'available',
      'Auto-voltage regulator calibrated; acoustic canopy seals intact.',
      '/src/assets/images/eq_diesel_generator_1794920312999.jpg',
      now,
      now
    ).lastInsertRowid
  );

  const eq5Id = Number(
    insertListing.run(
      owner1Id,
      getCatId('loaders-earthmoving'),
      'Compact Wheel Loader & Skid-Steer Pair',
      'Compact Loader 906 / S740',
      'Maneuverable compact loader suited for tight urban sites, basement backfill, and warehouse yard clearing.',
      'Mumbai',
      'Andheri East',
      mumbaiCoords.lat,
      mumbaiCoords.lon,
      40,
      5800,
      32000,
      1,
      1500,
      1,
      3200,
      'renter_pays',
      1600,
      15000,
      'available',
      'Recently inspected drive motors and quick-coupler pins.',
      '/src/assets/images/eq_skid_loader_1794920313017.jpg',
      now,
      now
    ).lastInsertRowid
  );

  // Sample 6th listing in maintenance/unavailable state to demonstrate truthful availability filtering
  const eq6Id = Number(
    insertListing.run(
      owner2Id,
      getCatId('excavators-jcbs'),
      '20-Ton Hydraulic Crawler Excavator (Scheduled Service)',
      'Komatsu PC200-8',
      'Mid-size crawler excavator for deep bulk excavation and rock breaking.',
      'Pune',
      'Wagholi',
      puneCoords.lat,
      puneCoords.lon,
      50,
      11500,
      65000,
      1,
      1800,
      1,
      5500,
      'renter_pays',
      3500,
      25000,
      'maintenance',
      'Currently undergoing scheduled hydraulic pump seal replacement.',
      '/src/assets/images/hero_excavator_site_1794920310287.jpg',
      now,
      now
    ).lastInsertRowid
  );

  // Seed sample maintenance records (only eq1 is Independently verified by admin in sample data; others Owner-provided / Documents submitted)
  const insertMaint = db.prepare(`
    INSERT INTO maintenance_records (
      equipment_id, condition_description, last_maintenance_date, checklist_json,
      notes, document_name, document_data_url, verification_status, submitted_at, verified_by_admin_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertMaint.run(
    eq1Id,
    'Engine oil, hydraulic filter, and boom pin greasing completed at 2,400 hours.',
    '2026-10-28',
    JSON.stringify([
      { item: 'Engine oil & filter check', passed: true },
      { item: 'Hydraulic hoses & seals', passed: true },
      { item: 'Brakes & parking lock', passed: true },
      { item: 'Safety lights & horn', passed: true },
    ]),
    'Sample maintenance log reviewed during onboarding.',
    'sample-jcb-service-log.txt',
    '',
    'Independently verified',
    now,
    adminId
  );

  insertMaint.run(
    eq2Id,
    'Routine 500-hour transmission oil change and front axle inspection.',
    '2026-10-15',
    JSON.stringify([
      { item: 'Engine oil & filter check', passed: true },
      { item: 'Hydraulic hoses & seals', passed: true },
      { item: 'Brakes & parking lock', passed: true },
      { item: 'Safety lights & horn', passed: false },
    ]),
    'Right rear work lamp bulb scheduled for replacement before dispatch.',
    'sample-tractor-service-bill.pdf',
    '',
    'Documents submitted',
    now,
    null
  );

  insertMaint.run(
    eq3Id,
    'Drum belt tension adjusted and engine oil topped up.',
    '2026-11-02',
    JSON.stringify([
      { item: 'Drum rotation & bearings', passed: true },
      { item: 'Engine start & idle', passed: true },
    ]),
    'Owner self-reported check.',
    '',
    '',
    'Owner-provided',
    now,
    null
  );

  // Seed a sample availability block on eq1 for 2026-12-01 to 2026-12-03 so date-conflict logic is testable immediately
  db.prepare(
    'INSERT INTO availability_blocks (equipment_id, start_date, end_date, reason, booking_id) VALUES (?, ?, ?, ?, NULL)'
  ).run(eq1Id, '2026-12-01', '2026-12-03', 'Sample existing owner job commitment');

  // Seed one sample job request from Vikram Patel (renter) with a sample match & response
  const jobRes = db
    .prepare(
      `INSERT INTO job_requests (
        renter_id, title, work_description, category_id, job_city, job_area,
        latitude, longitude, preferred_start_date, duration_days, budget_max,
        requires_operator, requires_transport, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      renterId,
      'Foundation Trenching for Commercial Annex',
      'Need a backhoe loader for 3 days of footing excavation and spoil loading on a 4,500 sq.ft. plot.',
      getCatId('excavators-jcbs'),
      'Pune',
      'Baner',
      puneCoords.lat,
      puneCoords.lon,
      '2026-11-24',
      3,
      28000,
      1,
      1,
      'responses_received',
      now
    );
  const jobId = Number(jobRes.lastInsertRowid);

  const matchRes = db
    .prepare(
      `INSERT INTO job_matches (
        job_request_id, equipment_id, owner_id, match_score, match_reasons_json,
        availability_note, owner_response_status, quoted_daily_rate, quoted_transport_charge,
        quoted_operator_charge, quoted_fuel_charge, quoted_other_charge, quoted_deposit,
        owner_note, responded_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      jobId,
      eq1Id,
      owner1Id,
      96,
      JSON.stringify([
        'Exact category match: Excavators and JCBs',
        'Located in Pune (0 km from job city · within 45 km service radius)',
        'No conflicting confirmed bookings on file for 2026-11-24 to 2026-11-26',
        'Operator & delivery transport supported by owner',
        'Estimated base rental fits within your ₹28,000 budget',
      ]),
      'Owner confirmed availability for 2026-11-24 to 2026-11-26',
      'available_quoted',
      6200,
      2500,
      4200,
      null,
      0,
      15000,
      'Machine is free between Hinjewadi contracts. Offered discounted ₹6,200/day rate; fuel to be arranged by site.',
      now
    );
  const matchId = Number(matchRes.lastInsertRowid);

  // Seed one sample rental request in "Quotation received" status so renter & owner dashboards are populated on first demo
  db.prepare(
    `INSERT INTO rental_requests (
      equipment_id, renter_id, owner_id, job_request_id, job_match_id,
      job_location, start_date, end_date, duration_days, intended_use,
      requires_operator, requires_transport, status, payment_status,
      base_rental_total, transport_charge, operator_charge, fuel_charge, other_charge,
      deposit_amount, charges_confirmed_by_owner, renter_notes, owner_notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    eq1Id,
    renterId,
    owner1Id,
    jobId,
    matchId,
    'Baner, Pune',
    '2026-11-24',
    '2026-11-26',
    3,
    'Foundation footing trenching (sample rental request)',
    1,
    1,
    'Quotation received',
    'Unpaid (handled outside app during demo)',
    18600,
    2500,
    4200,
    null,
    0,
    15000,
    1,
    'Site gate clearance is 3.2m wide.',
    'Quote confirmed except diesel fuel (renter to refuel or confirm estimate).',
    now,
    now
  );

  // Sample notifications
  db.prepare(
    'INSERT INTO notifications (user_id, type, title, body, link_path, is_read, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)'
  ).run(
    renterId,
    'quote_received',
    'Owner quotation received for Foundation Trenching',
    'Rajesh Sharma confirmed availability on JCB 3CX Backhoe Loader at ₹6,200/day.',
    `/renter/job-requests/${jobId}/matches`,
    now
  );

  db.prepare(
    'INSERT INTO notifications (user_id, type, title, body, link_path, is_read, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)'
  ).run(
    owner1Id,
    'rental_request',
    'Sample rental request awaiting acceptance',
    'Vikram Patel reviewed your quote for JCB 3CX Backhoe Loader (Baner, Pune).',
    '/owner/bookings',
    now
  );

  // Sample report for Admin demonstration
  db.prepare(
    'INSERT INTO reports (reporter_id, equipment_id, rental_request_id, reason, details, status, admin_notes, created_at) VALUES (?, ?, NULL, ?, ?, ?, ?, ?)'
  ).run(
    renterId,
    eq6Id,
    'Availability discrepancy (sample report)',
    'Sample moderation record: verifying whether excavator under maintenance should remain hidden from active search.',
    'Open',
    '',
    now
  );
}

function seedExpandedMachineryAndBadges(): void {
  const now = new Date().toISOString();

  // Ensure sector values are set on existing categories
  db.prepare("UPDATE equipment_categories SET sector = 'future_expansion' WHERE group_type = 'future_expansion'").run();

  // Insert specialized high-capex active categories idempotently
  const newCategories: Array<[string, string, string, string, number]> = [
    [
      'lab-analytical',
      'Analytical & Biotech Lab Equipment',
      'laboratory',
      'High-capex HPLC systems, mass spectrometers, and spectroscopy units available for short-term R&D rental between lab runs.',
      8,
    ],
    [
      'lab-biotech-microscopy',
      'Confocal Microscopy & Genomics',
      'laboratory',
      'Motorized fluorescence/confocal microscopes, real-time qPCR thermocyclers, and sterile bio-imaging rigs.',
      9,
    ],
    [
      'industrial-cnc',
      'Precision CNC & Metrology',
      'precision_industrial',
      'Multi-axis CNC machining centers, coordinate measuring machines (CMM), and fabrication hardware.',
      10,
    ],
    [
      'surveying-geotech',
      '3D LiDAR & Geotechnical Survey',
      'surveying_geotech',
      'Terrestrial laser scanners, RTK survey rovers, and structural non-destructive testing instruments.',
      11,
    ],
  ];

  const insertCat = db.prepare(
    `INSERT OR IGNORE INTO equipment_categories (slug, name, group_type, sector, description, sort_order, is_active)
     VALUES (?, ?, 'construction', ?, ?, ?, 1)`
  );
  for (const [slug, name, sector, desc, sortOrder] of newCategories) {
    insertCat.run(slug, name, sector, desc, sortOrder);
    db.prepare('UPDATE equipment_categories SET sector = ?, is_active = 1 WHERE slug = ?').run(sector, slug);
  }

  // Ensure specialist lab/industrial owner account exists
  let labOwner = db
    .prepare('SELECT id FROM users WHERE email = ?')
    .get('lab.partner@udaya.demo') as { id: number } | undefined;

  if (!labOwner) {
    const res = db
      .prepare(
        'INSERT INTO users (name, email, password_hash, role, phone, city, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      )
      .run(
        'Dr. Ananya Deshmukh',
        'lab.partner@udaya.demo',
        hashDemoPassword('demo1234'),
        'owner',
        '+91 98231 66778',
        'Pune',
        now
      );
    labOwner = { id: Number(res.lastInsertRowid) };
    db.prepare(
      'INSERT OR IGNORE INTO owner_profiles (user_id, business_name, service_area, service_radius_km, bio, verified_contact) VALUES (?, ?, ?, ?, ?, 1)'
    ).run(
      labOwner.id,
      'Deccan Bio-Analytical & Precision Labs (Sample)',
      'Pune, Bengaluru, Mumbai, Pimpri-Chinchwad',
      80,
      'University spin-out and precision engineering consortium sharing idle high-capex analytical instruments and CNC capacity with vetted startups and researchers.',
      1
    );
  }

  const adminUser = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get() as { id: number } | undefined;
  const adminId = adminUser?.id ?? null;

  const getCatId = (slug: string) =>
    (db.prepare('SELECT id FROM equipment_categories WHERE slug = ?').get(slug) as { id: number } | undefined)?.id;

  const puneCoords = getCityCoordinates('Pune')!;
  const pcmcCoords = getCityCoordinates('Pimpri-Chinchwad')!;
  const blrCoords = getCityCoordinates('Bengaluru')!;
  const mumbaiCoords = getCityCoordinates('Mumbai')!;

  const specializedListings = [
    {
      slug: 'lab-analytical',
      title: 'Waters / Agilent LC-MS & HPLC Analytical System',
      makeModel: 'Acquity UPLC / Xevo TQ-S Mass Spec',
      description:
        'High-sensitivity liquid chromatography tandem mass spectrometer for pharma assay validation, impurity profiling, and biotech QA. Too costly (₹68L+ capex) for early-stage startups to purchase—rent by the day with calibrated columns and technician oversight.',
      city: 'Pune',
      area: 'Pashan Bio-Tech Innovation Park',
      coords: puneCoords,
      radius: 60,
      dailyRate: 14500,
      weeklyRate: 84000,
      operatorAvail: 1,
      operatorCharge: 3500,
      transportAvail: 0,
      transportCharge: null,
      fuelPolicy: 'included',
      fuelEstimate: 0,
      deposit: 60000,
      condition: 'NABL traceable calibration completed; ion source cleaned and mass-calibrated within ±0.01 Da.',
      image: '/src/assets/images/eq_lab_hplc_spectrometer_1795217352610.jpg',
      verified: 1,
      tier: 'udaya_verified',
      certId: 'UDY-CERT-LAB-2041',
      calUntil: '2027-06-30',
      replacementValue: 6800000,
      rentOnly: 1,
      maintDoc: 'nabl-hplc-calibration-2026.pdf',
      maintStatus: 'Independently verified',
    },
    {
      slug: 'lab-biotech-microscopy',
      title: 'Nikon A1R Confocal Microscope & Eppendorf qPCR Suite',
      makeModel: 'Nikon A1R HD25 + Mastercycler X50s',
      description:
        'Laser-scanning confocal fluorescence microscope on an anti-vibration optical table paired with a 96-well gradient thermal cycler. Ideal for university research cohorts, cellular imaging, and biotech startups requiring periodic high-resolution runs without ₹1.15 Cr capital lock-in.',
      city: 'Bengaluru',
      area: 'Electronic City Biotech Corridor',
      coords: blrCoords,
      radius: 50,
      dailyRate: 22000,
      weeklyRate: 125000,
      operatorAvail: 1,
      operatorCharge: 4000,
      transportAvail: 0,
      transportCharge: null,
      fuelPolicy: 'included',
      fuelEstimate: 0,
      deposit: 90000,
      condition: '405/488/561/640nm laser diodes aligned; piezo Z-stage verified to 15 nm repeatability.',
      image: '/src/assets/images/eq_lab_confocal_microscope_1795217353612.jpg',
      verified: 1,
      tier: 'udaya_verified',
      certId: 'UDY-CERT-BIO-3092',
      calUntil: '2027-04-15',
      replacementValue: 11500000,
      rentOnly: 1,
      maintDoc: 'optical-laser-alignment-cert.pdf',
      maintStatus: 'Independently verified',
    },
    {
      slug: 'industrial-cnc',
      title: 'DMG MORI DMU 60 eVo 5-Axis Precision CNC Center',
      makeModel: 'DMU 60 eVo Linear (5-Axis)',
      description:
        'Simultaneous 5-axis high-speed vertical machining center for aerospace brackets, EV battery housings, and medical implant prototyping. Rent idle night/weekend spindle capacity with certified CNC programmer support.',
      city: 'Pimpri-Chinchwad',
      area: 'Bhosari Precision Engineering Zone',
      coords: pcmcCoords,
      radius: 65,
      dailyRate: 28500,
      weeklyRate: 162000,
      operatorAvail: 1,
      operatorCharge: 4500,
      transportAvail: 0,
      transportCharge: null,
      fuelPolicy: 'included',
      fuelEstimate: 0,
      deposit: 100000,
      condition: 'Renishaw spindle probe calibrated; ballbar circularity test within 3 microns.',
      image: '/src/assets/images/eq_industrial_cnc_machine_1795217351702.jpg',
      verified: 1,
      tier: 'udaya_verified',
      certId: 'UDY-CERT-CNC-1184',
      calUntil: '2027-05-20',
      replacementValue: 14500000,
      rentOnly: 1,
      maintDoc: 'renishaw-ballbar-inspection.pdf',
      maintStatus: 'Independently verified',
    },
    {
      slug: 'surveying-geotech',
      title: 'RIEGL VZ-400i 3D Terrestrial LiDAR Laser Scanner',
      makeModel: 'RIEGL VZ-400i + Carbon Tripod',
      description:
        'Survey-grade 3D terrestrial laser scanner delivering 500,000 points/sec for bridge deformation mapping, BIM as-built modeling, and volumetric mining surveys. Delivered in shock-proof Pelican transit case.',
      city: 'Mumbai',
      area: 'Bandra Kurla Complex (BKC)',
      coords: mumbaiCoords,
      radius: 90,
      dailyRate: 16800,
      weeklyRate: 92000,
      operatorAvail: 1,
      operatorCharge: 3200,
      transportAvail: 1,
      transportCharge: 2200,
      fuelPolicy: 'included',
      fuelEstimate: 0,
      deposit: 55000,
      condition: 'Annual factory optics calibration certificate on file; dual lithium battery packs at 96% health.',
      image: '/src/assets/images/eq_lidar_survey_scanner_1795217352658.jpg',
      verified: 0,
      tier: 'documents_reviewed',
      certId: '',
      calUntil: '2027-03-01',
      replacementValue: 6200000,
      rentOnly: 1,
      maintDoc: 'lidar-optics-calibration-2026.pdf',
      maintStatus: 'Documents submitted',
    },
  ];

  const insertListing = db.prepare(`
    INSERT INTO equipment_listings (
      owner_id, category_id, title, make_model, description, location_city, location_area,
      latitude, longitude, service_radius_km, daily_rate, weekly_rate,
      operator_available, operator_daily_charge, transport_available, transport_base_charge,
      fuel_policy, fuel_daily_estimate, deposit_amount, availability_status,
      condition_summary, image_url, is_sample, is_removed,
      is_verified_machinery, verification_badge_tier, verification_certificate_id,
      verified_at, calibration_valid_until, replacement_value_inr, rent_only_high_capex,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'available', ?, ?, 1, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMaint = db.prepare(`
    INSERT INTO maintenance_records (
      equipment_id, condition_description, last_maintenance_date, checklist_json,
      notes, document_name, document_data_url, verification_status, submitted_at, verified_by_admin_id
    ) VALUES (?, ?, ?, ?, ?, ?, '', ?, ?, ?)
  `);

  for (const item of specializedListings) {
    const exists = db.prepare('SELECT id FROM equipment_listings WHERE title = ?').get(item.title);
    if (exists) continue;
    const catId = getCatId(item.slug);
    if (!catId) continue;

    const eqRes = insertListing.run(
      labOwner.id,
      catId,
      item.title,
      item.makeModel,
      item.description,
      item.city,
      item.area,
      item.coords.lat,
      item.coords.lon,
      item.radius,
      item.dailyRate,
      item.weeklyRate,
      item.operatorAvail,
      item.operatorCharge,
      item.transportAvail,
      item.transportCharge,
      item.fuelPolicy,
      item.fuelEstimate,
      item.deposit,
      item.condition,
      item.image,
      item.verified,
      item.tier,
      item.certId,
      item.verified ? now : null,
      item.calUntil,
      item.replacementValue,
      item.rentOnly,
      now,
      now
    );

    const eqId = Number(eqRes.lastInsertRowid);
    insertMaint.run(
      eqId,
      item.condition,
      '2026-10-20',
      JSON.stringify([
        { item: 'Calibration & accuracy certification', passed: true },
        { item: 'Power & safety interlocks check', passed: true },
        { item: 'Preventive service log verified', passed: true },
        { item: 'Cleanroom / transit protection ready', passed: true },
      ]),
      'High-capex instrument inspected prior to listing.',
      item.maintDoc,
      item.maintStatus,
      now,
      item.verified ? adminId : null
    );
  }

  // Sync verified badge onto existing JCB 3CX (which already has Independently verified maintenance) & set replacement values on existing machines
  db.prepare(
    `UPDATE equipment_listings
     SET is_verified_machinery = 1,
         verification_badge_tier = 'udaya_verified',
         verification_certificate_id = CASE WHEN verification_certificate_id = '' THEN 'UDY-CERT-CON-1001' ELSE verification_certificate_id END,
         verified_at = COALESCE(verified_at, ?),
         replacement_value_inr = COALESCE(replacement_value_inr, 3400000)
     WHERE title LIKE 'JCB 3CX%'`
  ).run(now);

  db.prepare(
    `UPDATE equipment_listings
     SET verification_badge_tier = CASE WHEN verification_badge_tier = 'unverified' THEN 'documents_reviewed' ELSE verification_badge_tier END,
         replacement_value_inr = COALESCE(replacement_value_inr, 1850000)
     WHERE title LIKE 'Utility Loader Tractor%'`
  ).run();

  db.prepare(
    `UPDATE equipment_listings
     SET replacement_value_inr = COALESCE(replacement_value_inr, 2600000)
     WHERE title LIKE '100 kW Soundproofed%'`
  ).run();
}

function isoDaysFromNow(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function isoTimestampDaysAgo(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
}

/**
 * Populates rich, internally consistent demonstration records across every table
 * (multi-city owners & renters, full-category machinery & lab catalog, maintenance logs,
 * Zero-Idle job requests & competing quotes, full-lifecycle bookings, Escrow ledger + audit events,
 * in-app enquiries, notifications, moderation reports, and sample reviews).
 * Strictly idempotent: never duplicates rows and never modifies or deletes user-created data.
 */
function seedComprehensiveDemoData(): void {
  const now = new Date().toISOString();

  // Helper lookups
  const getUserByEmail = (email: string) =>
    db.prepare('SELECT id, name, role, city FROM users WHERE email = ?').get(email) as
      | { id: number; name: string; role: string; city: string }
      | undefined;

  const getCatId = (slug: string) =>
    (db.prepare('SELECT id FROM equipment_categories WHERE slug = ?').get(slug) as { id: number } | undefined)?.id;

  const getEqIdByTitle = (title: string) =>
    (db.prepare('SELECT id FROM equipment_listings WHERE title = ?').get(title) as { id: number } | undefined)?.id;

  const ensureUser = (u: {
    name: string;
    email: string;
    password: string;
    role: 'renter' | 'owner' | 'admin';
    phone: string;
    city: string;
    createdAt: string;
    ownerProfile?: { businessName: string; serviceArea: string; radiusKm: number; bio: string };
  }): number => {
    const existing = getUserByEmail(u.email);
    let userId: number;
    if (existing) {
      userId = existing.id;
    } else {
      const res = db
        .prepare(
          'INSERT INTO users (name, email, password_hash, role, phone, city, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
        )
        .run(u.name, u.email, hashDemoPassword(u.password), u.role, u.phone, u.city, u.createdAt);
      userId = Number(res.lastInsertRowid);
    }

    if (u.role === 'owner' && u.ownerProfile) {
      db.prepare(
        `INSERT OR IGNORE INTO owner_profiles (user_id, business_name, service_area, service_radius_km, bio, verified_contact)
         VALUES (?, ?, ?, ?, ?, 1)`
      ).run(
        userId,
        u.ownerProfile.businessName,
        u.ownerProfile.serviceArea,
        u.ownerProfile.radiusKm,
        u.ownerProfile.bio
      );
    }
    return userId;
  };

  // Core existing demo accounts
  const owner1Id = getUserByEmail('owner@udaya.demo')?.id;
  const owner2Id = getUserByEmail('meera.fleet@udaya.demo')?.id;
  const labOwnerId = getUserByEmail('lab.partner@udaya.demo')?.id;
  const renter1Id = getUserByEmail('renter@udaya.demo')?.id;
  const adminId = getUserByEmail('admin@udaya.demo')?.id;
  if (!owner1Id || !owner2Id || !labOwnerId || !renter1Id || !adminId) {
    return;
  }

  // 1. Additional Multi-City Demo Users & Owner Profiles (Sample)
  const ownerHydId = ensureUser({
    name: 'Arjun Reddy',
    email: 'arjun.hyd@udaya.demo',
    password: 'demo1234',
    role: 'owner',
    phone: '+91 98490 22310',
    city: 'Hyderabad',
    createdAt: isoTimestampDaysAgo(42),
    ownerProfile: {
      businessName: 'Deccan Infra & Analytical Rentals (Sample)',
      serviceArea: 'Hyderabad, HITEC City, Genome Valley, Secunderabad',
      radiusKm: 60,
      bio: 'Sharing idle 20-ton earthmoving equipment and NABL-calibrated Genome Valley analytical instruments on flexible short-term contracts.',
    },
  });

  const ownerNcrId = ensureUser({
    name: 'Kavita Verma',
    email: 'kavita.ncr@udaya.demo',
    password: 'demo1234',
    role: 'owner',
    phone: '+91 98104 61209',
    city: 'Delhi NCR',
    createdAt: isoTimestampDaysAgo(35),
    ownerProfile: {
      businessName: 'NCR Precision Survey & Earthworks (Sample)',
      serviceArea: 'Delhi NCR, Gurugram, Noida, Ahmedabad corridor',
      radiusKm: 75,
      bio: 'Civil fleet and 3D geospatial survey instrumentation provider supporting metro, expressway, and industrial plant contractors.',
    },
  });

  const ownerBlrId = ensureUser({
    name: 'Siddharth Rao',
    email: 'siddharth.blr@udaya.demo',
    password: 'demo1234',
    role: 'owner',
    phone: '+91 98450 88412',
    city: 'Bengaluru',
    createdAt: isoTimestampDaysAgo(29),
    ownerProfile: {
      businessName: 'Peenya Precision CNC & Site Power (Sample)',
      serviceArea: 'Bengaluru, Peenya, Hosur Road, Chennai industrial belt',
      radiusKm: 70,
      bio: 'ISO-9001 precision machining shop and commercial backup power fleet monetizing weekend and inter-batch idle hours.',
    },
  });

  const renterPriyaId = ensureUser({
    name: 'Priya Nair',
    email: 'priya.contractor@udaya.demo',
    password: 'demo1234',
    role: 'renter',
    phone: '+91 98452 31094',
    city: 'Bengaluru',
    createdAt: isoTimestampDaysAgo(24),
  });

  const renterRohanId = ensureUser({
    name: 'Dr. Rohan Kulkarni',
    email: 'rohan.biotech@udaya.demo',
    password: 'demo1234',
    role: 'renter',
    phone: '+91 98224 55108',
    city: 'Pune',
    createdAt: isoTimestampDaysAgo(18),
  });

  // 2. Expanded Equipment Catalog (covering ALL categories & 9 Indian cities with verified local images)
  const insertListing = db.prepare(`
    INSERT INTO equipment_listings (
      owner_id, category_id, title, make_model, description, location_city, location_area,
      latitude, longitude, service_radius_km, daily_rate, weekly_rate,
      operator_available, operator_daily_charge, transport_available, transport_base_charge,
      fuel_policy, fuel_daily_estimate, deposit_amount, availability_status,
      condition_summary, image_url, is_sample, is_removed,
      is_verified_machinery, verification_badge_tier, verification_certificate_id,
      verified_at, calibration_valid_until, replacement_value_inr, rent_only_high_capex,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMaint = db.prepare(`
    INSERT INTO maintenance_records (
      equipment_id, condition_description, last_maintenance_date, checklist_json,
      notes, document_name, document_data_url, verification_status, submitted_at, verified_by_admin_id
    ) VALUES (?, ?, ?, ?, ?, ?, '', ?, ?, ?)
  `);

  const additionalListings = [
    {
      ownerId: owner1Id,
      slug: 'compressors',
      title: 'Atlas Copco XAS 185 Portable Screw Air Compressor',
      makeModel: 'Atlas Copco XAS 185 DD7 (185 CFM)',
      description:
        'Towable diesel rotary screw compressor delivering 7 bar steady pressure for pneumatic rock breakers, shotcreting, and pipeline pressure testing on tight urban construction sites.',
      city: 'Pune',
      area: 'Chakan MIDC Phase 1',
      radius: 50,
      dailyRate: 3800,
      weeklyRate: 21500,
      operatorAvail: 1,
      operatorCharge: 900,
      transportAvail: 1,
      transportCharge: 1500,
      fuelPolicy: 'renter_pays',
      fuelEstimate: 1100,
      deposit: 10000,
      status: 'available',
      condition: 'Separator filter replaced at 1,200 hrs; pressure relief valves and air-end seals passed hydrostatic check.',
      image: '/src/assets/images/eq_diesel_generator_1794920312999.jpg',
      verified: 1,
      tier: 'udaya_verified',
      certId: 'UDY-CERT-CMP-4102',
      calUntil: '2027-02-28',
      replacementValue: 1450000,
      rentOnly: 0,
      maintDoc: 'atlas-copco-pressure-cert-2026.pdf',
      maintStatus: 'Independently verified',
      maintDate: isoDaysFromNow(-18),
    },
    {
      ownerId: owner2Id,
      slug: 'other-construction',
      title: 'Wacker Neuson DPU 6555 Plate Compactor & Vibrator Kit',
      makeModel: 'Wacker Neuson DPU 6555He + Needle Vibrators',
      description:
        'Heavy-duty 65 kN reversible vibratory plate compactor bundled with dual concrete needle vibrators for sub-base road compaction, paver bedding, and plinth beam pours.',
      city: 'Pune',
      area: 'Bhosari Industrial Estate',
      radius: 40,
      dailyRate: 2200,
      weeklyRate: 12000,
      operatorAvail: 0,
      operatorCharge: null,
      transportAvail: 1,
      transportCharge: 950,
      fuelPolicy: 'renter_pays',
      fuelEstimate: 500,
      deposit: 6000,
      status: 'available',
      condition: 'Exciter bearings greased, shock mounts intact, electric starter battery replaced last month.',
      image: '/src/assets/images/eq_concrete_mixer_1794920312061.jpg',
      verified: 0,
      tier: 'documents_reviewed',
      certId: '',
      calUntil: null,
      replacementValue: 620000,
      rentOnly: 0,
      maintDoc: 'compactor-service-log-oct2026.pdf',
      maintStatus: 'Documents submitted',
      maintDate: isoDaysFromNow(-14),
    },
    {
      ownerId: ownerHydId,
      slug: 'excavators-jcbs',
      title: 'CAT 320D Hydraulic Track Excavator — 20 Ton',
      makeModel: 'Caterpillar 320D2 GC (1.0 Cum Bucket)',
      description:
        '20-ton crawler excavator suited for deep commercial basement excavation, stormwater culverts, and hard murrum earthworks. Includes rock breaker line plumbing.',
      city: 'Hyderabad',
      area: 'Gachibowli Financial District',
      radius: 65,
      dailyRate: 11500,
      weeklyRate: 64000,
      operatorAvail: 1,
      operatorCharge: 1800,
      transportAvail: 1,
      transportCharge: 5500,
      fuelPolicy: 'renter_pays',
      fuelEstimate: 3600,
      deposit: 30000,
      status: 'available',
      condition: 'Undercarriage rollers at 80% life; boom & stick pins re-shimmed with zero hydraulic weep.',
      image: '/src/assets/images/hero_excavator_site_1794920310287.jpg',
      verified: 1,
      tier: 'udaya_verified',
      certId: 'UDY-CERT-EXC-5021',
      calUntil: '2027-03-31',
      replacementValue: 7400000,
      rentOnly: 0,
      maintDoc: 'cat-320d-hydraulic-audit-2026.pdf',
      maintStatus: 'Independently verified',
      maintDate: isoDaysFromNow(-11),
    },
    {
      ownerId: owner1Id,
      slug: 'tractors',
      title: 'Mahindra 575 DI XP Plus Tractor + Tipping Trailer',
      makeModel: 'Mahindra 575 DI XP Plus (47 HP + 5T Trailer)',
      description:
        'Reliable utility tractor paired with a hydraulic tipping trolley for debris carting, murrum shifting, and rural road shoulder grading across Nashik and Pune outskirts.',
      city: 'Nashik',
      area: 'Ambad MIDC',
      radius: 55,
      dailyRate: 2900,
      weeklyRate: 16200,
      operatorAvail: 1,
      operatorCharge: 900,
      transportAvail: 1,
      transportCharge: 1400,
      fuelPolicy: 'renter_pays',
      fuelEstimate: 850,
      deposit: 7500,
      status: 'available',
      condition: 'Rear tires 90% tread; trailer hydraulic ram and PTO linkage inspected prior to monsoon season.',
      image: '/src/assets/images/eq_tractor_utility_1794920313456.jpg',
      verified: 0,
      tier: 'documents_reviewed',
      certId: '',
      calUntil: null,
      replacementValue: 1120000,
      rentOnly: 0,
      maintDoc: 'mahindra-575-fitness-2026.pdf',
      maintStatus: 'Documents submitted',
      maintDate: isoDaysFromNow(-22),
    },
    {
      ownerId: ownerNcrId,
      slug: 'loaders-earthmoving',
      title: 'Bobcat S570 Compact Skid-Steer Loader with Auger',
      makeModel: 'Bobcat S570 Vertical Lift (61 HP)',
      description:
        'Zero-tail-swing compact loader with quick-attach bucket and 300 mm hydraulic auger for basement cleanup, fencing post holes, and warehouse apron grading.',
      city: 'Delhi NCR',
      area: 'Udyog Vihar, Gurugram',
      radius: 70,
      dailyRate: 5200,
      weeklyRate: 29500,
      operatorAvail: 1,
      operatorCharge: 1300,
      transportAvail: 1,
      transportCharge: 2400,
      fuelPolicy: 'estimated_extra',
      fuelEstimate: 1400,
      deposit: 15000,
      status: 'available',
      condition: 'Auxiliary high-flow coupler tested; cabin ROPS/FOPS certified and backup alarm functional.',
      image: '/src/assets/images/eq_skid_loader_1794920313017.jpg',
      verified: 1,
      tier: 'udaya_verified',
      certId: 'UDY-CERT-LDR-6110',
      calUntil: '2027-01-30',
      replacementValue: 2950000,
      rentOnly: 0,
      maintDoc: 'bobcat-s570-safety-inspection.pdf',
      maintStatus: 'Independently verified',
      maintDate: isoDaysFromNow(-9),
    },
    {
      ownerId: ownerBlrId,
      slug: 'generators',
      title: 'Kirloskar 62.5 kVA Acoustic Silent DG Set',
      makeModel: 'KOEL Green KG1-62.5WS (CPCB-IV+)',
      description:
        'Low-noise acoustic enclosure diesel generator for commercial fit-outs, dewatering pumps, and hospital or lab power backup during grid shutdowns.',
      city: 'Chennai',
      area: 'Guindy Industrial Estate',
      radius: 60,
      dailyRate: 4900,
      weeklyRate: 28000,
      operatorAvail: 1,
      operatorCharge: 1100,
      transportAvail: 1,
      transportCharge: 2200,
      fuelPolicy: 'renter_pays',
      fuelEstimate: 2200,
      deposit: 12000,
      status: 'available',
      condition: 'Load-bank tested to 100% rated capacity; AVR frequency stability within ±0.4%.',
      image: '/src/assets/images/eq_diesel_generator_1794920312999.jpg',
      verified: 1,
      tier: 'udaya_verified',
      certId: 'UDY-CERT-GEN-7012',
      calUntil: '2027-04-10',
      replacementValue: 1650000,
      rentOnly: 0,
      maintDoc: 'koel-62kva-loadtest-2026.pdf',
      maintStatus: 'Independently verified',
      maintDate: isoDaysFromNow(-16),
    },
    {
      ownerId: ownerNcrId,
      slug: 'concrete-mixers',
      title: 'Schwing Stetter Self-Loading Concrete Mixer (2.5 Cum)',
      makeModel: 'SLM 2600 Electronic Weigh-Batching',
      description:
        'Mobile self-loading transit mixer with onboard digital load-cell batching and printer slip output for remote rural bridges, industrial slabs, and highway drains.',
      city: 'Ahmedabad',
      area: 'Sanand Industrial Corridor',
      radius: 80,
      dailyRate: 7400,
      weeklyRate: 42000,
      operatorAvail: 1,
      operatorCharge: 1500,
      transportAvail: 1,
      transportCharge: 3200,
      fuelPolicy: 'renter_pays',
      fuelEstimate: 2000,
      deposit: 20000,
      status: 'available',
      condition: 'Drum blades minimal wear; electronic water meter and weigh-scale calibrated recently.',
      image: '/src/assets/images/eq_concrete_mixer_1794920312061.jpg',
      verified: 0,
      tier: 'documents_reviewed',
      certId: '',
      calUntil: '2027-01-15',
      replacementValue: 4100000,
      rentOnly: 0,
      maintDoc: 'slm2600-weighbatch-cert.pdf',
      maintStatus: 'Documents submitted',
      maintDate: isoDaysFromNow(-20),
    },
    {
      ownerId: ownerHydId,
      slug: 'lab-analytical',
      title: 'Thermo Scientific Orbitrap Exploris GC-MS System',
      makeModel: 'Orbitrap Exploris GC 240 Mass Spec',
      description:
        'Ultra-high-resolution gas chromatography mass spectrometer for volatile impurity profiling, pesticide residue screening, and API stability studies. Avoid ₹92L capital purchase by booking calibrated bench shifts.',
      city: 'Hyderabad',
      area: 'Genome Valley Life Sciences Park',
      radius: 55,
      dailyRate: 19500,
      weeklyRate: 112000,
      operatorAvail: 1,
      operatorCharge: 4200,
      transportAvail: 0,
      transportCharge: null,
      fuelPolicy: 'included',
      fuelEstimate: 0,
      deposit: 75000,
      status: 'available',
      condition: 'ISO/IEC 17025 traceable tune passed; mass accuracy verified below 1 ppm with helium carrier line certified.',
      image: '/src/assets/images/eq_lab_hplc_spectrometer_1795217352610.jpg',
      verified: 1,
      tier: 'udaya_verified',
      certId: 'UDY-CERT-LAB-8140',
      calUntil: '2027-07-15',
      replacementValue: 9200000,
      rentOnly: 1,
      maintDoc: 'orbitrap-nabl-tune-2026.pdf',
      maintStatus: 'Independently verified',
      maintDate: isoDaysFromNow(-8),
    },
    {
      ownerId: ownerHydId,
      slug: 'lab-biotech-microscopy',
      title: 'Zeiss LSM 900 Airyscan Confocal Laser Microscope',
      makeModel: 'Zeiss LSM 900 + Airyscan 2 Multiplex',
      description:
        'Super-resolution confocal imaging station with live-cell incubation chamber for oncology, stem-cell, and organoid research groups needing periodic imaging access without ₹1.28 Cr outlay.',
      city: 'Hyderabad',
      area: 'HITEC City Bio-Incubator',
      radius: 45,
      dailyRate: 24000,
      weeklyRate: 138000,
      operatorAvail: 1,
      operatorCharge: 4500,
      transportAvail: 0,
      transportCharge: null,
      fuelPolicy: 'included',
      fuelEstimate: 0,
      deposit: 95000,
      status: 'available',
      condition: 'Airyscan detector array recalibrated; CO2 & 37°C stage incubator verified for 72-hour time-lapse runs.',
      image: '/src/assets/images/eq_lab_confocal_microscope_1795217353612.jpg',
      verified: 1,
      tier: 'udaya_verified',
      certId: 'UDY-CERT-BIO-8822',
      calUntil: '2027-08-01',
      replacementValue: 12800000,
      rentOnly: 1,
      maintDoc: 'zeiss-lsm900-optical-cert.pdf',
      maintStatus: 'Independently verified',
      maintDate: isoDaysFromNow(-12),
    },
    {
      ownerId: ownerBlrId,
      slug: 'industrial-cnc',
      title: 'Haas UMC-750 Universal 5-Axis CNC Machining Center',
      makeModel: 'Haas UMC-750SS (15,000 RPM Trunnion)',
      description:
        'Simultaneous 5-axis trunnion machining center available during idle night and weekend shifts for drone airframes, EV motor end-bells, and titanium medical fixtures with CAM verification.',
      city: 'Bengaluru',
      area: 'Peenya Industrial Area Phase 3',
      radius: 60,
      dailyRate: 25000,
      weeklyRate: 144000,
      operatorAvail: 1,
      operatorCharge: 4200,
      transportAvail: 0,
      transportCharge: null,
      fuelPolicy: 'included',
      fuelEstimate: 0,
      deposit: 90000,
      status: 'available',
      condition: 'Wireless Intuitive Probing System calibrated; spindle runout measured below 2.5 microns.',
      image: '/src/assets/images/eq_industrial_cnc_machine_1795217351702.jpg',
      verified: 1,
      tier: 'udaya_verified',
      certId: 'UDY-CERT-CNC-9045',
      calUntil: '2027-05-30',
      replacementValue: 13200000,
      rentOnly: 1,
      maintDoc: 'haas-umc750-laser-interferometer.pdf',
      maintStatus: 'Independently verified',
      maintDate: isoDaysFromNow(-7),
    },
    {
      ownerId: ownerNcrId,
      slug: 'surveying-geotech',
      title: 'Leica RTC360 3D Laser Scanner + Trimble R12i RTK Rover',
      makeModel: 'Leica RTC360 VIS + Trimble R12i IMU',
      description:
        'High-speed 2M pts/sec terrestrial LiDAR kit paired with tilt-compensated RTK GNSS rover for metro tunnel clearances, heritage restoration, and industrial plant piping BIM.',
      city: 'Delhi NCR',
      area: 'Noida Sector 62 Tech Park',
      radius: 90,
      dailyRate: 15200,
      weeklyRate: 86000,
      operatorAvail: 1,
      operatorCharge: 3000,
      transportAvail: 1,
      transportCharge: 1800,
      fuelPolicy: 'included',
      fuelEstimate: 0,
      deposit: 50000,
      status: 'available',
      condition: 'Factory angular accuracy check passed; 4 batteries, iPad Pro Cyclone FIELD 360 license included.',
      image: '/src/assets/images/eq_lidar_survey_scanner_1795217352658.jpg',
      verified: 1,
      tier: 'udaya_verified',
      certId: 'UDY-CERT-SRV-7715',
      calUntil: '2027-06-15',
      replacementValue: 5800000,
      rentOnly: 1,
      maintDoc: 'leica-rtc360-factory-cal.pdf',
      maintStatus: 'Independently verified',
      maintDate: isoDaysFromNow(-10),
    },
    {
      ownerId: owner2Id,
      slug: 'compressors',
      title: 'Kaishan 185 CFM Diesel Rotary Screw Compressor',
      makeModel: 'Kaishan LGCY-5.5/7 Portable',
      description:
        'Compact site compressor for pneumatic chipping hammers and sandblasting prep. Currently undergoing scheduled 1,000-hour oil-separator overhaul.',
      city: 'Mumbai',
      area: 'Thane Wagle Estate',
      radius: 45,
      dailyRate: 4100,
      weeklyRate: 23000,
      operatorAvail: 0,
      operatorCharge: null,
      transportAvail: 1,
      transportCharge: 1800,
      fuelPolicy: 'renter_pays',
      fuelEstimate: 1150,
      deposit: 10000,
      status: 'maintenance',
      condition: 'Scheduled 1,000-hour oil separator and air filter service in progress; re-opening shortly.',
      image: '/src/assets/images/eq_diesel_generator_1794920312999.jpg',
      verified: 0,
      tier: 'unverified',
      certId: '',
      calUntil: null,
      replacementValue: 1180000,
      rentOnly: 0,
      maintDoc: '',
      maintStatus: 'Owner-provided',
      maintDate: isoDaysFromNow(-30),
    },
  ];

  for (const item of additionalListings) {
    const existingId = getEqIdByTitle(item.title);
    if (existingId) continue;
    const catId = getCatId(item.slug);
    if (!catId) continue;
    const coords = getCityCoordinates(item.city) || { lat: 18.5204, lon: 73.8567 };

    const eqRes = insertListing.run(
      item.ownerId,
      catId,
      item.title,
      item.makeModel,
      item.description,
      item.city,
      item.area,
      coords.lat,
      coords.lon,
      item.radius,
      item.dailyRate,
      item.weeklyRate,
      item.operatorAvail,
      item.operatorCharge,
      item.transportAvail,
      item.transportCharge,
      item.fuelPolicy,
      item.fuelEstimate,
      item.deposit,
      item.status,
      item.condition,
      item.image,
      item.verified,
      item.tier,
      item.certId,
      item.verified ? isoTimestampDaysAgo(10) : null,
      item.calUntil,
      item.replacementValue,
      item.rentOnly,
      isoTimestampDaysAgo(21),
      now
    );

    const eqId = Number(eqRes.lastInsertRowid);
    insertMaint.run(
      eqId,
      item.condition,
      item.maintDate,
      JSON.stringify([
        { item: item.rentOnly ? 'Calibration & accuracy certification' : 'Hydraulic / engine pressure check', passed: true },
        { item: 'Safety guards & emergency shutoff check', passed: true },
        { item: 'Preventive service log reviewed', passed: item.maintStatus !== 'Owner-provided' },
        { item: 'Ready for inspected handover', passed: item.status === 'available' },
      ]),
      item.rentOnly
        ? 'High-capex instrument inspected and logged for demonstration marketplace.'
        : 'Routine fleet readiness inspection recorded.',
      item.maintDoc,
      item.maintStatus,
      isoTimestampDaysAgo(8),
      item.verified ? adminId : null
    );
  }

  // Resolve key equipment IDs for bookings, jobs, enquiries, and reviews
  const jcbId = getEqIdByTitle('JCB 3CX Backhoe Loader — 76 HP');
  const tractorId = getEqIdByTitle('Utility Loader Tractor — 55 HP with Front Bucket');
  const skidId = getEqIdByTitle('Compact Wheel Loader & Skid-Steer Pair');
  const gen100Id = getEqIdByTitle('100 kW Soundproofed Mobile Diesel Generator');
  const atlasCompId = getEqIdByTitle('Atlas Copco XAS 185 Portable Screw Air Compressor');
  const wackerId = getEqIdByTitle('Wacker Neuson DPU 6555 Plate Compactor & Vibrator Kit');
  const catExcId = getEqIdByTitle('CAT 320D Hydraulic Track Excavator — 20 Ton');
  const hplcId = getEqIdByTitle('Waters / Agilent LC-MS & HPLC Analytical System');
  const nikonId = getEqIdByTitle('Nikon A1R Confocal Microscope & Eppendorf qPCR Suite');
  const dmgCncId = getEqIdByTitle('DMG MORI DMU 60 eVo 5-Axis Precision CNC Center');
  const rieglId = getEqIdByTitle('RIEGL VZ-400i 3D Terrestrial LiDAR Laser Scanner');
  const orbitrapId = getEqIdByTitle('Thermo Scientific Orbitrap Exploris GC-MS System');
  const haasId = getEqIdByTitle('Haas UMC-750 Universal 5-Axis CNC Machining Center');
  const leicaId = getEqIdByTitle('Leica RTC360 3D Laser Scanner + Trimble R12i RTK Rover');
  const bobcatId = getEqIdByTitle('Bobcat S570 Compact Skid-Steer Loader with Auger');
  const kirloskarId = getEqIdByTitle('Kirloskar 62.5 kVA Acoustic Silent DG Set');

  // 3. Zero-Idle Job Requests & Competing Owner Matches
  const ensureJobRequest = (job: {
    renterId: number;
    title: string;
    desc: string;
    catSlug: string;
    city: string;
    area: string;
    startDate: string;
    days: number;
    budgetMax: number | null;
    reqOp: number;
    reqTrans: number;
    status: 'open' | 'responses_received' | 'fulfilled' | 'cancelled';
    createdAt: string;
  }): number | null => {
    const existing = db
      .prepare('SELECT id FROM job_requests WHERE title = ? AND renter_id = ?')
      .get(job.title, job.renterId) as { id: number } | undefined;
    if (existing) return existing.id;
    const catId = getCatId(job.catSlug);
    if (!catId) return null;
    const coords = getCityCoordinates(job.city) || { lat: 18.5204, lon: 73.8567 };
    const res = db
      .prepare(
        `INSERT INTO job_requests (
          renter_id, title, work_description, category_id, job_city, job_area,
          latitude, longitude, preferred_start_date, duration_days, budget_max,
          requires_operator, requires_transport, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        job.renterId,
        job.title,
        job.desc,
        catId,
        job.city,
        job.area,
        coords.lat,
        coords.lon,
        job.startDate,
        job.days,
        job.budgetMax,
        job.reqOp,
        job.reqTrans,
        job.status,
        job.createdAt
      );
    return Number(res.lastInsertRowid);
  };

  const ensureJobMatch = (m: {
    jobId: number | null;
    equipmentId: number | undefined;
    ownerId: number;
    score: number;
    reasons: string[];
    availNote: string;
    status: 'pending' | 'available_quoted' | 'alternative_proposed' | 'declined';
    quotedDaily: number | null;
    quotedTransport: number | null;
    quotedOperator: number | null;
    quotedFuel: number | null;
    quotedOther: number | null;
    quotedDeposit: number | null;
    ownerNote: string;
    altEquipmentId?: number | null;
    respondedAt: string | null;
  }) => {
    if (!m.jobId || !m.equipmentId) return;
    const existing = db
      .prepare('SELECT id FROM job_matches WHERE job_request_id = ? AND equipment_id = ?')
      .get(m.jobId, m.equipmentId);
    if (existing) return;
    db.prepare(
      `INSERT INTO job_matches (
        job_request_id, equipment_id, owner_id, match_score, match_reasons_json,
        availability_note, owner_response_status, quoted_daily_rate, quoted_transport_charge,
        quoted_operator_charge, quoted_fuel_charge, quoted_other_charge, quoted_deposit,
        owner_note, alternative_equipment_id, responded_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      m.jobId,
      m.equipmentId,
      m.ownerId,
      m.score,
      JSON.stringify(m.reasons),
      m.availNote,
      m.status,
      m.quotedDaily,
      m.quotedTransport,
      m.quotedOperator,
      m.quotedFuel,
      m.quotedOther,
      m.quotedDeposit,
      m.ownerNote,
      m.altEquipmentId ?? null,
      m.respondedAt
    );
  };

  const jobCompressorId = ensureJobRequest({
    renterId: renter1Id,
    title: 'Baner Commercial Basement Rock-Breaking Air Compressor',
    desc: 'Need 185 CFM towable compressor for 4 days of pneumatic breaker work along retaining wall foundation.',
    catSlug: 'compressors',
    city: 'Pune',
    area: 'Baner High Street',
    startDate: isoDaysFromNow(9),
    days: 4,
    budgetMax: 24000,
    reqOp: 1,
    reqTrans: 1,
    status: 'responses_received',
    createdAt: isoTimestampDaysAgo(3),
  });

  ensureJobMatch({
    jobId: jobCompressorId,
    equipmentId: atlasCompId,
    ownerId: owner1Id,
    score: 94,
    reasons: [
      'Exact category match: Air Compressors',
      'Located in Pune (within 50 km service radius)',
      'Udaya Verified Machinery Badge (UDY-CERT-CMP-4102)',
      'Operator and site tow delivery available',
    ],
    availNote: 'Owner confirmed availability and submitted itemized quotation',
    status: 'available_quoted',
    quotedDaily: 3700,
    quotedTransport: 1500,
    quotedOperator: 3600,
    quotedFuel: null,
    quotedOther: 0,
    quotedDeposit: 10000,
    ownerNote: 'Unit is serviced and ready in Chakan yard. Includes two 20m heavy-duty air hoses; diesel on renter account.',
    respondedAt: isoTimestampDaysAgo(2),
  });

  const jobLabId = ensureJobRequest({
    renterId: renter1Id,
    title: 'Pharmaceutical Impurity Profiling — 3-Day LC-MS Assay Batch',
    desc: 'Pre-clinical stability batch validation requiring NABL-calibrated LC-MS/HPLC instrument with certified analytical chemist support.',
    catSlug: 'lab-analytical',
    city: 'Pune',
    area: 'Pashan Innovation Park',
    startDate: isoDaysFromNow(12),
    days: 3,
    budgetMax: 65000,
    reqOp: 1,
    reqTrans: 0,
    status: 'responses_received',
    createdAt: isoTimestampDaysAgo(2),
  });

  ensureJobMatch({
    jobId: jobLabId,
    equipmentId: hplcId,
    ownerId: labOwnerId,
    score: 97,
    reasons: [
      'Exact category match: Analytical Lab & Spectroscopy',
      'Same locality: Pashan Bio-Tech Innovation Park, Pune',
      'NABL calibration valid through 2027-06-30',
      'High-Capex Rent-Only instrument with technician oversight',
    ],
    availNote: 'Owner confirmed cleanroom bench slot and submitted quote',
    status: 'available_quoted',
    quotedDaily: 14500,
    quotedTransport: 0,
    quotedOperator: 10500,
    quotedFuel: 0,
    quotedOther: 2500,
    quotedDeposit: 60000,
    ownerNote: 'Includes HPLC-grade solvents and C18 column usage fee (₹2,500 under Other). Escrow protects refundable deposit.',
    respondedAt: isoTimestampDaysAgo(1),
  });

  const jobCncId = ensureJobRequest({
    renterId: renter1Id,
    title: 'EV Battery Enclosure Prototype — 5-Axis CNC Machining Window',
    desc: 'Need 2-day 5-axis spindle slot for 6061-T6 aluminum cooling plate prototypes with CMM tolerance inspection.',
    catSlug: 'industrial-cnc',
    city: 'Pimpri-Chinchwad',
    area: 'Bhosari MIDC',
    startDate: isoDaysFromNow(14),
    days: 2,
    budgetMax: 72000,
    reqOp: 1,
    reqTrans: 0,
    status: 'open',
    createdAt: isoTimestampDaysAgo(1),
  });

  ensureJobMatch({
    jobId: jobCncId,
    equipmentId: dmgCncId,
    ownerId: labOwnerId,
    score: 95,
    reasons: [
      'Exact category match: Industrial CNC & Precision Machinery',
      'Same zone: Bhosari Precision Engineering Zone, Pimpri-Chinchwad',
      'Renishaw probe calibrated within 3 microns',
      'Calendar open on file · Owner confirmation pending',
    ],
    availNote: 'Calendar open on file — awaiting owner confirmation',
    status: 'pending',
    quotedDaily: null,
    quotedTransport: null,
    quotedOperator: null,
    quotedFuel: null,
    quotedOther: null,
    quotedDeposit: null,
    ownerNote: '',
    respondedAt: null,
  });

  // Incoming Zero-Idle Job Requests for owner@udaya.demo (Rajesh Sharma) from other renters!
  const jobPriyaPuneId = ensureJobRequest({
    renterId: renterPriyaId,
    title: 'Hinjewadi IT Park Utility Duct Trenching & Soil Backfill',
    desc: 'Need 76 HP backhoe loader for 5-day utility trench excavation and aggregate loading inside Phase 3 campus.',
    catSlug: 'excavators-jcbs',
    city: 'Pune',
    area: 'Hinjewadi Phase 3',
    startDate: isoDaysFromNow(11),
    days: 5,
    budgetMax: 48000,
    reqOp: 1,
    reqTrans: 1,
    status: 'open',
    createdAt: isoTimestampDaysAgo(1),
  });

  ensureJobMatch({
    jobId: jobPriyaPuneId,
    equipmentId: jcbId,
    ownerId: owner1Id,
    score: 96,
    reasons: [
      'Exact category match: Excavators & JCBs',
      'Within 4 km of Hinjewadi Phase 2 yard',
      'Udaya Verified Machinery Badge (UDY-CERT-CON-1001)',
      'Operator and transport delivery supported',
    ],
    availNote: 'Calendar open on file — awaiting owner confirmation',
    status: 'pending',
    quotedDaily: null,
    quotedTransport: null,
    quotedOperator: null,
    quotedFuel: null,
    quotedOther: null,
    quotedDeposit: null,
    ownerNote: '',
    respondedAt: null,
  });

  const jobRohanTractorId = ensureJobRequest({
    renterId: renterRohanId,
    title: 'Wakad Campus Landscaping & Topsoil Leveling',
    desc: 'Require 4WD utility loader tractor for 2 days to clear construction spoil and level campus courtyard.',
    catSlug: 'tractors',
    city: 'Pune',
    area: 'Wakad',
    startDate: isoDaysFromNow(16),
    days: 2,
    budgetMax: 12000,
    reqOp: 1,
    reqTrans: 1,
    status: 'responses_received',
    createdAt: isoTimestampDaysAgo(2),
  });

  ensureJobMatch({
    jobId: jobRohanTractorId,
    equipmentId: tractorId,
    ownerId: owner1Id,
    score: 91,
    reasons: [
      'Exact category match: Tractors',
      'Yard located in Wakad / Baner Link',
      'Within renter target budget',
    ],
    availNote: 'Owner proposed alternative equipment from fleet',
    status: 'alternative_proposed',
    quotedDaily: 4800,
    quotedTransport: 2000,
    quotedOperator: 2400,
    quotedFuel: null,
    quotedOther: 0,
    quotedDeposit: 12000,
    ownerNote: 'Tractor is booked on a nearby site; offering our Compact Skid-Steer Loader which maneuvers faster in tight campus courtyards.',
    altEquipmentId: skidId ?? null,
    respondedAt: isoTimestampDaysAgo(1),
  });

  // Open demand request (no direct match to owner1 yet, so it populates "Open Demand Requests in Marketplace" on OwnerJobRequestsPage!)
  ensureJobRequest({
    renterId: renterPriyaId,
    title: 'Kharadi Commercial Tower Basement Slab Compaction',
    desc: 'Looking for reversible plate compactor and backup silent generator for night concrete pour.',
    catSlug: 'other-construction',
    city: 'Pune',
    area: 'Kharadi',
    startDate: isoDaysFromNow(18),
    days: 3,
    budgetMax: 18000,
    reqOp: 0,
    reqTrans: 1,
    status: 'open',
    createdAt: isoTimestampDaysAgo(1),
  });

  ensureJobRequest({
    renterId: renterRohanId,
    title: 'BKC Metro Viaduct 3D LiDAR As-Built Deformation Scan',
    desc: 'Require survey-grade terrestrial LiDAR scanner with operator for 2-day bridge pier inspection.',
    catSlug: 'surveying-geotech',
    city: 'Mumbai',
    area: 'Bandra Kurla Complex',
    startDate: isoDaysFromNow(15),
    days: 2,
    budgetMax: 44000,
    reqOp: 1,
    reqTrans: 1,
    status: 'open',
    createdAt: isoTimestampDaysAgo(2),
  });

  // 4. Full-Lifecycle Rental Requests / Bookings + Escrow Ledger & Audit Events
  const ensureBookingAndEscrow = (spec: {
    equipmentId: number | undefined;
    renterId: number;
    ownerId: number;
    jobRequestId?: number | null;
    jobLocation: string;
    startDate: string;
    endDate: string;
    durationDays: number;
    intendedUse: string;
    reqOp: number;
    reqTrans: number;
    status: 'Request submitted' | 'Owner reviewing' | 'Quotation received' | 'Accepted' | 'Rejected' | 'Cancelled' | 'Completed';
    paymentStatus: string;
    baseTotal: number;
    transport: number | null;
    operator: number | null;
    fuel: number | null;
    other: number | null;
    deposit: number | null;
    confirmedByOwner: number;
    renterNotes: string;
    ownerNotes: string;
    createdAt: string;
    blockDates?: boolean;
    escrow?: {
      ref: string;
      status: 'pending_funding' | 'funded_held' | 'handover_confirmed' | 'released_to_owner' | 'refunded_to_renter' | 'disputed';
      method: string;
      disputeReason?: string;
      fundedAt: string | null;
      handoverAt: string | null;
      releasedAt: string | null;
      events: Array<{ actorUserId: number; actorRole: string; eventType: string; note: string; createdAt: string }>;
    };
  }): number | null => {
    if (!spec.equipmentId) return null;
    const existing = db
      .prepare('SELECT id FROM rental_requests WHERE equipment_id = ? AND renter_id = ? AND intended_use = ?')
      .get(spec.equipmentId, spec.renterId, spec.intendedUse) as { id: number } | undefined;

    let bookingId: number;
    if (existing) {
      bookingId = existing.id;
    } else {
      const res = db
        .prepare(
          `INSERT INTO rental_requests (
            equipment_id, renter_id, owner_id, job_request_id, job_match_id,
            job_location, start_date, end_date, duration_days, intended_use,
            requires_operator, requires_transport, status, payment_status,
            base_rental_total, transport_charge, operator_charge, fuel_charge, other_charge,
            deposit_amount, charges_confirmed_by_owner, renter_notes, owner_notes,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          spec.equipmentId,
          spec.renterId,
          spec.ownerId,
          spec.jobRequestId ?? null,
          spec.jobLocation,
          spec.startDate,
          spec.endDate,
          spec.durationDays,
          spec.intendedUse,
          spec.reqOp,
          spec.reqTrans,
          spec.status,
          spec.paymentStatus,
          spec.baseTotal,
          spec.transport,
          spec.operator,
          spec.fuel,
          spec.other,
          spec.deposit,
          spec.confirmedByOwner,
          spec.renterNotes,
          spec.ownerNotes,
          spec.createdAt,
          now
        );
      bookingId = Number(res.lastInsertRowid);
    }

    if (spec.blockDates) {
      const blkExists = db
        .prepare('SELECT id FROM availability_blocks WHERE booking_id = ?')
        .get(bookingId);
      if (!blkExists) {
        db.prepare(
          'INSERT INTO availability_blocks (equipment_id, start_date, end_date, reason, booking_id) VALUES (?, ?, ?, ?, ?)'
        ).run(spec.equipmentId, spec.startDate, spec.endDate, `Confirmed booking #${bookingId}`, bookingId);
      }
    }

    if (spec.escrow) {
      const existingEscrow = db
        .prepare('SELECT id FROM escrow_transactions WHERE escrow_ref = ? OR rental_request_id = ?')
        .get(spec.escrow.ref, bookingId) as { id: number } | undefined;
      if (!existingEscrow) {
        const rentalAmount =
          spec.baseTotal +
          (spec.transport ?? 0) +
          (spec.operator ?? 0) +
          (spec.fuel ?? 0) +
          (spec.other ?? 0);
        const depositAmount = spec.deposit ?? 0;
        const platformFee = Math.round(rentalAmount * 0.05);
        const totalFunded = rentalAmount + depositAmount;

        const escRes = db
          .prepare(
            `INSERT INTO escrow_transactions (
              rental_request_id, renter_id, owner_id, escrow_ref,
              rental_amount, deposit_amount, platform_fee, total_funded,
              payment_method, status, dispute_reason,
              funded_at, handover_confirmed_at, released_at, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            bookingId,
            spec.renterId,
            spec.ownerId,
            spec.escrow.ref,
            rentalAmount,
            depositAmount,
            platformFee,
            totalFunded,
            spec.escrow.method,
            spec.escrow.status,
            spec.escrow.disputeReason ?? '',
            spec.escrow.fundedAt,
            spec.escrow.handoverAt,
            spec.escrow.releasedAt,
            spec.createdAt,
            now
          );
        const escrowId = Number(escRes.lastInsertRowid);
        const insertEvent = db.prepare(
          'INSERT INTO escrow_events (escrow_id, actor_user_id, actor_role, event_type, note, created_at) VALUES (?, ?, ?, ?, ?, ?)'
        );
        for (const ev of spec.escrow.events) {
          insertEvent.run(escrowId, ev.actorUserId, ev.actorRole, ev.eventType, ev.note, ev.createdAt);
        }
      }
    }

    return bookingId;
  };

  // Booking A: Accepted + Escrow Funded & Held (Vikram Patel -> Rajesh Sharma)
  const bookingTractorId = ensureBookingAndEscrow({
    equipmentId: tractorId,
    renterId: renter1Id,
    ownerId: owner1Id,
    jobLocation: 'Baner Smart Road Phase 2, Pune',
    startDate: isoDaysFromNow(4),
    endDate: isoDaysFromNow(6),
    durationDays: 3,
    intendedUse: 'Sub-base soil grading and aggregate loading for commercial parking lot',
    reqOp: 1,
    reqTrans: 1,
    status: 'Accepted',
    paymentStatus: 'Escrow Funded & Held (UDY-ESC-2026-4101)',
    baseTotal: 9600,
    transport: 1800,
    operator: 3000,
    fuel: 0,
    other: 0,
    deposit: 8000,
    confirmedByOwner: 1,
    renterNotes: 'Site gate opens 7:30 AM; security pass pre-approved for Sharma Earthmovers.',
    ownerNotes: 'Confirmed operator Ramesh Jadhav with front-bucket 4WD tractor. Diesel on renter account.',
    createdAt: isoTimestampDaysAgo(4),
    blockDates: true,
    escrow: {
      ref: 'UDY-ESC-2026-4101',
      status: 'funded_held',
      method: 'UPI Escrow (Verified)',
      fundedAt: isoTimestampDaysAgo(3),
      handoverAt: null,
      releasedAt: null,
      events: [
        {
          actorUserId: renter1Id,
          actorRole: 'renter',
          eventType: 'escrow_funded',
          note: 'Renter funded ₹22,400 (₹14,400 rental + ₹8,000 refundable deposit) via UPI Escrow.',
          createdAt: isoTimestampDaysAgo(3),
        },
      ],
    },
  });

  // Booking B: Accepted + Escrow Handover Confirmed (Vikram Patel -> Lab Partner HPLC)
  const bookingHplcId = ensureBookingAndEscrow({
    equipmentId: hplcId,
    renterId: renter1Id,
    ownerId: labOwnerId,
    jobRequestId: jobLabId,
    jobLocation: 'Pashan Bio-Tech Innovation Park, Pune',
    startDate: isoDaysFromNow(1),
    endDate: isoDaysFromNow(3),
    durationDays: 3,
    intendedUse: 'Bio-assay purity profiling & LC-MS peak validation (Sample Demo Run)',
    reqOp: 1,
    reqTrans: 0,
    status: 'Accepted',
    paymentStatus: 'Escrow Active — Handover Confirmed (UDY-ESC-2026-4102)',
    baseTotal: 43500,
    transport: 0,
    operator: 10500,
    fuel: 0,
    other: 2500,
    deposit: 60000,
    confirmedByOwner: 1,
    renterNotes: 'Bringing 18 sealed vials for GMP-like impurity screening.',
    ownerNotes: 'Bench calibrated and NABL certificate shared on arrival. Ready for Day 1 sample injection.',
    createdAt: isoTimestampDaysAgo(6),
    blockDates: true,
    escrow: {
      ref: 'UDY-ESC-2026-4102',
      status: 'handover_confirmed',
      method: 'NEFT / Corporate Escrow',
      fundedAt: isoTimestampDaysAgo(5),
      handoverAt: isoTimestampDaysAgo(1),
      releasedAt: null,
      events: [
        {
          actorUserId: renter1Id,
          actorRole: 'renter',
          eventType: 'escrow_funded',
          note: 'Renter locked ₹1,16,500 (₹56,500 rental + ₹60,000 refundable deposit) via Corporate Escrow.',
          createdAt: isoTimestampDaysAgo(5),
        },
        {
          actorUserId: labOwnerId,
          actorRole: 'owner',
          eventType: 'handover_confirmed',
          note: 'Lab supervisor confirmed instrument handover and calibration log sign-off.',
          createdAt: isoTimestampDaysAgo(1),
        },
      ],
    },
  });

  // Booking C: Completed + Escrow Released to Owner (Vikram Patel -> Meera Fleet Generator)
  ensureBookingAndEscrow({
    equipmentId: gen100Id,
    renterId: renter1Id,
    ownerId: owner2Id,
    jobLocation: 'Balewadi High Street Tower Site, Pune',
    startDate: isoDaysFromNow(-14),
    endDate: isoDaysFromNow(-11),
    durationDays: 4,
    intendedUse: 'Continuous backup power for tower crane & concrete batching during MSEDCL feeder upgrade',
    reqOp: 1,
    reqTrans: 1,
    status: 'Completed',
    paymentStatus: 'Escrow Released to Owner (UDY-ESC-2026-4103)',
    baseTotal: 27200,
    transport: 3200,
    operator: 4800,
    fuel: 0,
    other: 0,
    deposit: 15000,
    confirmedByOwner: 1,
    renterNotes: 'Requires 3-phase 415V changeover panel cable (25m).',
    ownerNotes: 'Generator returned cleanly after 41 metered hours. Deposit released in full.',
    createdAt: isoTimestampDaysAgo(18),
    escrow: {
      ref: 'UDY-ESC-2026-4103',
      status: 'released_to_owner',
      method: 'UPI Escrow (Verified)',
      fundedAt: isoTimestampDaysAgo(16),
      handoverAt: isoTimestampDaysAgo(14),
      releasedAt: isoTimestampDaysAgo(10),
      events: [
        {
          actorUserId: renter1Id,
          actorRole: 'renter',
          eventType: 'escrow_funded',
          note: 'Renter funded ₹50,200 (₹35,200 rental + ₹15,000 refundable deposit).',
          createdAt: isoTimestampDaysAgo(16),
        },
        {
          actorUserId: owner2Id,
          actorRole: 'owner',
          eventType: 'handover_confirmed',
          note: 'Silent DG set delivered, earthed, and load-tested on site.',
          createdAt: isoTimestampDaysAgo(14),
        },
        {
          actorUserId: renter1Id,
          actorRole: 'renter',
          eventType: 'funds_released',
          note: 'Renter approved return inspection. ₹33,440 net released to owner (5% platform fee ₹1,760) and ₹15,000 deposit returned.',
          createdAt: isoTimestampDaysAgo(10),
        },
      ],
    },
  });

  // Booking D: Request submitted (awaiting owner review — Vikram Patel -> Rajesh Sharma Compressor)
  ensureBookingAndEscrow({
    equipmentId: atlasCompId,
    renterId: renter1Id,
    ownerId: owner1Id,
    jobRequestId: jobCompressorId,
    jobLocation: 'Baner High Street Commercial Plot, Pune',
    startDate: isoDaysFromNow(9),
    endDate: isoDaysFromNow(12),
    durationDays: 4,
    intendedUse: 'Pneumatic rock-breaking along basement retaining wall perimeter',
    reqOp: 1,
    reqTrans: 1,
    status: 'Request submitted',
    paymentStatus: 'Awaiting Owner Confirmation & Escrow Funding',
    baseTotal: 15200,
    transport: 1500,
    operator: 3600,
    fuel: null,
    other: null,
    deposit: 10000,
    confirmedByOwner: 0,
    renterNotes: 'Please confirm if two pneumatic jackhammers can be added as an optional accessory.',
    ownerNotes: '',
    createdAt: isoTimestampDaysAgo(1),
  });

  // Booking E: Cancelled booking (Vikram Patel -> Rajesh Sharma Skid-Steer)
  ensureBookingAndEscrow({
    equipmentId: skidId,
    renterId: renter1Id,
    ownerId: owner1Id,
    jobLocation: 'Aundh Residential Redevelopment, Pune',
    startDate: isoDaysFromNow(-8),
    endDate: isoDaysFromNow(-7),
    durationDays: 2,
    intendedUse: 'Debris clearing from basement ramp (rescheduled due to municipal permit delay)',
    reqOp: 1,
    reqTrans: 1,
    status: 'Cancelled',
    paymentStatus: 'Cancelled prior to escrow funding',
    baseTotal: 9600,
    transport: 2000,
    operator: 2400,
    fuel: null,
    other: 0,
    deposit: 12000,
    confirmedByOwner: 0,
    renterNotes: 'Permit shifted by 2 weeks; cancelling early.',
    ownerNotes: 'No problem, calendar reopened.',
    createdAt: isoTimestampDaysAgo(12),
  });

  // Booking F: Disputed Escrow Booking (Priya Nair -> Rajesh Sharma JCB) so Owner & Admin Escrow Dispute tab has realistic active case!
  const bookingDisputedId = ensureBookingAndEscrow({
    equipmentId: jcbId,
    renterId: renterPriyaId,
    ownerId: owner1Id,
    jobLocation: 'Hinjewadi Phase 1 Logistics Yard, Pune',
    startDate: isoDaysFromNow(-5),
    endDate: isoDaysFromNow(-3),
    durationDays: 3,
    intendedUse: 'Stormwater drainage trenching & rubble shifting (Sample Dispute Demonstration)',
    reqOp: 1,
    reqTrans: 1,
    status: 'Accepted',
    paymentStatus: 'Escrow Disputed — Frozen Pending Admin Review (UDY-ESC-2026-4104)',
    baseTotal: 19500,
    transport: 2500,
    operator: 4200,
    fuel: 0,
    other: 0,
    deposit: 15000,
    confirmedByOwner: 1,
    renterNotes: 'Need 8-hour shift starting 8:00 AM daily.',
    ownerNotes: 'Machine dispatched at 8:15 AM; operator log shows 24 operating hours completed.',
    createdAt: isoTimestampDaysAgo(9),
    escrow: {
      ref: 'UDY-ESC-2026-4104',
      status: 'disputed',
      method: 'UPI Escrow (Verified)',
      disputeReason:
        'Sample demo dispute: Renter reported 4-hour hydraulic hose pause on Day 2 and requested a half-day prorated adjustment before final release.',
      fundedAt: isoTimestampDaysAgo(7),
      handoverAt: isoTimestampDaysAgo(5),
      releasedAt: null,
      events: [
        {
          actorUserId: renterPriyaId,
          actorRole: 'renter',
          eventType: 'escrow_funded',
          note: 'Renter funded ₹41,200 (₹26,200 rental + ₹15,000 deposit) into Udaya Escrow.',
          createdAt: isoTimestampDaysAgo(7),
        },
        {
          actorUserId: owner1Id,
          actorRole: 'owner',
          eventType: 'handover_confirmed',
          note: 'Owner confirmed on-site machine arrival and hour-meter reading (3,412 hrs).',
          createdAt: isoTimestampDaysAgo(5),
        },
        {
          actorUserId: renterPriyaId,
          actorRole: 'renter',
          eventType: 'dispute_opened',
          note: 'Renter froze escrow payout pending verification of Day 2 4-hour hose replacement downtime.',
          createdAt: isoTimestampDaysAgo(2),
        },
      ],
    },
  });

  // Booking G: Completed High-Capex 5-Axis CNC Booking (Dr. Rohan -> Lab Partner)
  ensureBookingAndEscrow({
    equipmentId: dmgCncId,
    renterId: renterRohanId,
    ownerId: labOwnerId,
    jobLocation: 'Bhosari Precision Engineering Zone, Pimpri-Chinchwad',
    startDate: isoDaysFromNow(-12),
    endDate: isoDaysFromNow(-11),
    durationDays: 2,
    intendedUse: 'Medical-grade titanium orthopedic fixture batch (12 units, 5-axis finishing)',
    reqOp: 1,
    reqTrans: 0,
    status: 'Completed',
    paymentStatus: 'Escrow Released to Owner (UDY-ESC-2026-4105)',
    baseTotal: 57000,
    transport: 0,
    operator: 9000,
    fuel: 0,
    other: 0,
    deposit: 100000,
    confirmedByOwner: 1,
    renterNotes: 'STEP files and tolerance drawing uploaded ahead of shift.',
    ownerNotes: 'All 12 parts passed CMM inspection within ±4 microns. Deposit refunded.',
    createdAt: isoTimestampDaysAgo(17),
    escrow: {
      ref: 'UDY-ESC-2026-4105',
      status: 'released_to_owner',
      method: 'NEFT / Corporate Escrow',
      fundedAt: isoTimestampDaysAgo(15),
      handoverAt: isoTimestampDaysAgo(12),
      releasedAt: isoTimestampDaysAgo(10),
      events: [
        {
          actorUserId: renterRohanId,
          actorRole: 'renter',
          eventType: 'escrow_funded',
          note: 'Renter funded ₹1,66,000 (₹66,000 machining slot + ₹1,00,000 deposit).',
          createdAt: isoTimestampDaysAgo(15),
        },
        {
          actorUserId: labOwnerId,
          actorRole: 'owner',
          eventType: 'handover_confirmed',
          note: 'CNC programmer confirmed fixture setup and Renishaw probing calibration.',
          createdAt: isoTimestampDaysAgo(12),
        },
        {
          actorUserId: renterRohanId,
          actorRole: 'renter',
          eventType: 'funds_released',
          note: 'Parts inspected and accepted. ₹62,700 net settled to owner and ₹1,00,000 deposit returned.',
          createdAt: isoTimestampDaysAgo(10),
        },
      ],
    },
  });

  // Booking H: Refunded Escrow Booking (Dr. Rohan -> Lab Partner LiDAR) for complete Escrow state showcase in Admin
  ensureBookingAndEscrow({
    equipmentId: rieglId,
    renterId: renterRohanId,
    ownerId: labOwnerId,
    jobLocation: 'BKC Metro Station Survey Site, Mumbai',
    startDate: isoDaysFromNow(-20),
    endDate: isoDaysFromNow(-19),
    durationDays: 2,
    intendedUse: 'Exterior facade LiDAR scan (cancelled due to heavy unseasonal rain advisory)',
    reqOp: 1,
    reqTrans: 1,
    status: 'Cancelled',
    paymentStatus: 'Escrow Refunded to Renter (UDY-ESC-2026-4106)',
    baseTotal: 33600,
    transport: 2200,
    operator: 6400,
    fuel: 0,
    other: 0,
    deposit: 55000,
    confirmedByOwner: 1,
    renterNotes: 'Outdoor optical scan requires dry weather.',
    ownerNotes: 'Mutual weather cancellation approved prior to dispatch.',
    createdAt: isoTimestampDaysAgo(24),
    escrow: {
      ref: 'UDY-ESC-2026-4106',
      status: 'refunded_to_renter',
      method: 'UPI Escrow (Verified)',
      disputeReason: 'Mutual cancellation due to monsoon red-alert; no dispatch occurred.',
      fundedAt: isoTimestampDaysAgo(22),
      handoverAt: null,
      releasedAt: isoTimestampDaysAgo(20),
      events: [
        {
          actorUserId: renterRohanId,
          actorRole: 'renter',
          eventType: 'escrow_funded',
          note: 'Renter funded ₹97,200 (₹42,200 rental + ₹55,000 deposit).',
          createdAt: isoTimestampDaysAgo(22),
        },
        {
          actorUserId: adminId,
          actorRole: 'admin',
          eventType: 'admin_refund',
          note: 'Mutual pre-dispatch weather cancellation verified; full ₹97,200 refunded to renter.',
          createdAt: isoTimestampDaysAgo(20),
        },
      ],
    },
  });

  // Booking I: Owner reviewing (Priya Nair -> Rajesh Sharma Wacker/Tractor)
  ensureBookingAndEscrow({
    equipmentId: wackerId,
    renterId: renterPriyaId,
    ownerId: owner2Id,
    jobLocation: 'Kharadi Tech Park Approach Road, Pune',
    startDate: isoDaysFromNow(8),
    endDate: isoDaysFromNow(10),
    durationDays: 3,
    intendedUse: 'Interlocking paver sub-base compaction and curb trench backfill',
    reqOp: 0,
    reqTrans: 1,
    status: 'Owner reviewing',
    paymentStatus: 'Under Owner Review',
    baseTotal: 6600,
    transport: 950,
    operator: 0,
    fuel: null,
    other: 0,
    deposit: 6000,
    confirmedByOwner: 0,
    renterNotes: 'Need drop-off before 9 AM.',
    ownerNotes: 'Checking tempo availability for Kharadi drop-off.',
    createdAt: isoTimestampDaysAgo(1),
  });

  // 5. Realistic In-App Enquiries (populates OwnerEnquiriesPage for owner@udaya.demo, lab.partner, meera.fleet)
  const ensureEnquiry = (eq: {
    equipmentId: number | undefined;
    bookingId?: number | null;
    senderId: number;
    recipientId: number;
    message: string;
    createdAt: string;
  }) => {
    if (!eq.equipmentId) return;
    const exists = db
      .prepare('SELECT id FROM enquiries WHERE equipment_id = ? AND sender_id = ? AND message = ?')
      .get(eq.equipmentId, eq.senderId, eq.message);
    if (exists) return;
    db.prepare(
      'INSERT INTO enquiries (equipment_id, rental_request_id, sender_id, recipient_id, message, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(eq.equipmentId, eq.bookingId ?? null, eq.senderId, eq.recipientId, eq.message, eq.createdAt);
  };

  ensureEnquiry({
    equipmentId: jcbId,
    senderId: renter1Id,
    recipientId: owner1Id,
    message:
      'Hi Rajesh, does your JCB 3CX come with both a 600 mm trenching bucket and a standard front loader bucket? Our Wakad site has a narrow 3.2m entry gate.',
    createdAt: isoTimestampDaysAgo(4),
  });
  ensureEnquiry({
    equipmentId: jcbId,
    senderId: owner1Id,
    recipientId: renter1Id,
    message:
      'Hello Vikram — yes, both buckets are on our Chakan yard. Overall width is 2.35m so it clears a 3.2m gate comfortably.',
    createdAt: isoTimestampDaysAgo(4),
  });
  ensureEnquiry({
    equipmentId: atlasCompId,
    senderId: renter1Id,
    recipientId: owner1Id,
    message:
      'Can you bundle two pneumatic rock breakers and 40m air hoses with the Atlas Copco XAS 185 for our Baner retaining wall job next week?',
    createdAt: isoTimestampDaysAgo(1),
  });
  ensureEnquiry({
    equipmentId: tractorId,
    bookingId: bookingTractorId,
    senderId: renter1Id,
    recipientId: owner1Id,
    message:
      'Escrow is funded for our Baner grading booking. Please share operator Ramesh’s phone number a day before dispatch for site gate entry.',
    createdAt: isoTimestampDaysAgo(2),
  });
  ensureEnquiry({
    equipmentId: jcbId,
    senderId: renterPriyaId,
    recipientId: owner1Id,
    message:
      'We have a 5-day utility trenching package in Hinjewadi Phase 3. Can you provide operator night-shift rates if municipal water lines require evening work?',
    createdAt: isoTimestampDaysAgo(1),
  });
  ensureEnquiry({
    equipmentId: hplcId,
    bookingId: bookingHplcId,
    senderId: renter1Id,
    recipientId: labOwnerId,
    message:
      'Dr. Deshmukh, could you confirm whether C18 reverse-phase columns and HPLC-grade acetonitrile are included in the ₹2,500 consumables fee?',
    createdAt: isoTimestampDaysAgo(3),
  });
  ensureEnquiry({
    equipmentId: hplcId,
    bookingId: bookingHplcId,
    senderId: labOwnerId,
    recipientId: renter1Id,
    message:
      'Yes Vikram, standard C18 column access and up to 2L HPLC-grade mobile phase are covered. Bring your own reference standards.',
    createdAt: isoTimestampDaysAgo(2),
  });
  ensureEnquiry({
    equipmentId: dmgCncId,
    senderId: renterRohanId,
    recipientId: labOwnerId,
    message:
      'Do you support 5-axis simultaneous surfacing in Ti-6Al-4V Grade 5 titanium for our next medical implant batch? Happy to share STEP files for DFM review.',
    createdAt: isoTimestampDaysAgo(2),
  });
  ensureEnquiry({
    equipmentId: gen100Id,
    senderId: renterPriyaId,
    recipientId: owner2Id,
    message:
      'Checking noise compliance for our Balewadi residential tower: is the 100 kW enclosure certified below 75 dBA at 1 meter?',
    createdAt: isoTimestampDaysAgo(1),
  });

  // 6. Rich In-App Notifications across Renter, Owner, Lab Partner, and Admin
  const ensureNotif = (n: {
    userId: number;
    type: string;
    title: string;
    body: string;
    linkPath: string;
    isRead: number;
    createdAt: string;
  }) => {
    const exists = db
      .prepare('SELECT id FROM notifications WHERE user_id = ? AND title = ?')
      .get(n.userId, n.title);
    if (exists) return;
    db.prepare(
      'INSERT INTO notifications (user_id, type, title, body, link_path, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(n.userId, n.type, n.title, n.body, n.linkPath, n.isRead, n.createdAt);
  };

  // Renter (Vikram Patel) notifications
  ensureNotif({
    userId: renter1Id,
    type: 'escrow_handover',
    title: 'Handover confirmed for LC-MS & HPLC Analytical System',
    body: 'Deccan Bio-Analytical Labs confirmed calibrated bench handover (UDY-ESC-2026-4102). Review and release Escrow upon completion.',
    linkPath: '/renter/bookings',
    isRead: 0,
    createdAt: isoTimestampDaysAgo(1),
  });
  ensureNotif({
    userId: renter1Id,
    type: 'quote_received',
    title: 'Owner quote received for Baner Air Compressor job',
    body: 'Rajesh Sharma confirmed availability for Atlas Copco XAS 185 at ₹3,700/day with delivery.',
    linkPath: jobCompressorId ? `/renter/job-requests/${jobCompressorId}/matches` : '/renter/job-requests',
    isRead: 0,
    createdAt: isoTimestampDaysAgo(2),
  });
  ensureNotif({
    userId: renter1Id,
    type: 'escrow_funded',
    title: 'Udaya Escrow locked (UDY-ESC-2026-4101)',
    body: '₹22,400 safely held for Utility Loader Tractor booking with Sharma Earthmovers. Dates are now blocked.',
    linkPath: '/renter/bookings',
    isRead: 1,
    createdAt: isoTimestampDaysAgo(3),
  });
  ensureNotif({
    userId: renter1Id,
    type: 'escrow_released',
    title: 'Deposit refunded & booking completed (UDY-ESC-2026-4103)',
    body: 'Your ₹15,000 security deposit for the 100 kW Diesel Generator has been returned following clean handover.',
    linkPath: '/renter/bookings',
    isRead: 1,
    createdAt: isoTimestampDaysAgo(10),
  });

  // Owner (Rajesh Sharma) notifications
  ensureNotif({
    userId: owner1Id,
    type: 'job_match',
    title: 'New Zero-Idle job match in Hinjewadi Phase 3',
    body: 'Priya Nair requested a 76 HP Backhoe Loader for 5 days (budget ₹48,000). Submit availability & quote.',
    linkPath: '/owner/job-requests',
    isRead: 0,
    createdAt: isoTimestampDaysAgo(1),
  });
  ensureNotif({
    userId: owner1Id,
    type: 'enquiry',
    title: 'New enquiry on Atlas Copco XAS 185 Compressor',
    body: 'Vikram Patel asked about bundling two pneumatic rock breakers and 40m air hoses.',
    linkPath: '/owner/enquiries',
    isRead: 0,
    createdAt: isoTimestampDaysAgo(1),
  });
  ensureNotif({
    userId: owner1Id,
    type: 'escrow_dispute',
    title: 'Escrow dispute opened on Booking #' + (bookingDisputedId ?? ''),
    body: 'Priya Nair flagged Day 2 hose replacement downtime on UDY-ESC-2026-4104. Review in Bookings.',
    linkPath: '/owner/bookings',
    isRead: 0,
    createdAt: isoTimestampDaysAgo(2),
  });
  ensureNotif({
    userId: owner1Id,
    type: 'escrow_funded',
    title: 'Renter funded Escrow for Utility Loader Tractor',
    body: 'Vikram Patel locked ₹22,400 in Udaya Escrow (UDY-ESC-2026-4101). Confirm handover on dispatch.',
    linkPath: '/owner/bookings',
    isRead: 1,
    createdAt: isoTimestampDaysAgo(3),
  });

  // Lab Partner notifications
  ensureNotif({
    userId: labOwnerId,
    type: 'job_match',
    title: 'New 5-Axis CNC job match in Bhosari MIDC',
    body: 'Vikram Patel posted a 2-day EV battery enclosure machining window matching your DMG MORI DMU 60 eVo.',
    linkPath: '/owner/job-requests',
    isRead: 0,
    createdAt: isoTimestampDaysAgo(1),
  });
  ensureNotif({
    userId: labOwnerId,
    type: 'escrow_released',
    title: 'Escrow payout settled (UDY-ESC-2026-4105)',
    body: '₹62,700 net rental payout released for your DMG MORI 5-Axis CNC booking with Dr. Rohan Kulkarni.',
    linkPath: '/owner/bookings',
    isRead: 1,
    createdAt: isoTimestampDaysAgo(10),
  });

  // Admin notifications
  ensureNotif({
    userId: adminId,
    type: 'escrow_dispute',
    title: 'Active Escrow dispute requires review (UDY-ESC-2026-4104)',
    body: 'Dispute opened between Priya Nair and Sharma Earthmovers regarding Day 2 hydraulic downtime.',
    linkPath: '/admin',
    isRead: 0,
    createdAt: isoTimestampDaysAgo(2),
  });
  ensureNotif({
    userId: adminId,
    type: 'maintenance_review',
    title: '3 maintenance certificates pending independent verification',
    body: 'Review uploaded calibration and service logs for RIEGL LiDAR, Schwing Stetter SLM, and Wacker Neuson.',
    linkPath: '/admin',
    isRead: 0,
    createdAt: isoTimestampDaysAgo(1),
  });

  // 7. Admin Moderation Reports (mix of Open, Under Review, Resolved)
  const ensureReport = (rep: {
    reporterId: number;
    equipmentId: number | null | undefined;
    bookingId?: number | null;
    reason: string;
    details: string;
    status: 'Open' | 'Under Review' | 'Resolved' | 'Listing Removed';
    adminNotes: string;
    createdAt: string;
    resolvedAt: string | null;
  }) => {
    const exists = db
      .prepare('SELECT id FROM reports WHERE reason = ? AND details = ?')
      .get(rep.reason, rep.details);
    if (exists) return;
    db.prepare(
      `INSERT INTO reports (
        reporter_id, equipment_id, rental_request_id, reason, details,
        status, admin_notes, created_at, resolved_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      rep.reporterId,
      rep.equipmentId ?? null,
      rep.bookingId ?? null,
      rep.reason,
      rep.details,
      rep.status,
      rep.adminNotes,
      rep.createdAt,
      rep.resolvedAt
    );
  };

  ensureReport({
    reporterId: renterPriyaId,
    equipmentId: jcbId,
    bookingId: bookingDisputedId,
    reason: 'Escrow payment dispute (Sample)',
    details:
      'Sample demonstration dispute for UDY-ESC-2026-4104: Requesting administrator review of Day 2 4-hour hydraulic hose pause and hour-meter log.',
    status: 'Under Review',
    adminNotes: 'Requested operator logsheet and repair timestamp from Sharma Earthmovers.',
    createdAt: isoTimestampDaysAgo(2),
    resolvedAt: null,
  });

  ensureReport({
    reporterId: renterRohanId,
    equipmentId: rieglId,
    reason: 'Calibration certificate renewal check (Sample)',
    details:
      'Sample verification note: Requesting confirmation that the uploaded RIEGL VZ-400i optics certificate covers tripod tilt-compensator testing.',
    status: 'Open',
    adminNotes: '',
    createdAt: isoTimestampDaysAgo(1),
    resolvedAt: null,
  });

  ensureReport({
    reporterId: renter1Id,
    equipmentId: gen100Id,
    reason: 'Delivery surcharge clarification (Sample)',
    details:
      'Sample resolved case: Confirmed whether crane unloading at Balewadi site was separate from standard flat-bed transport fee.',
    status: 'Resolved',
    adminNotes: 'Owner clarified unloading terms in listing description; booking completed smoothly.',
    createdAt: isoTimestampDaysAgo(15),
    resolvedAt: isoTimestampDaysAgo(14),
  });

  // 8. Additional Realistic Availability Blocks on Popular Units
  const ensureBlock = (eqId: number | undefined, start: string, end: string, reason: string) => {
    if (!eqId) return;
    const exists = db
      .prepare('SELECT id FROM availability_blocks WHERE equipment_id = ? AND start_date = ? AND end_date = ?')
      .get(eqId, start, end);
    if (exists) return;
    db.prepare(
      'INSERT INTO availability_blocks (equipment_id, start_date, end_date, reason, booking_id) VALUES (?, ?, ?, ?, NULL)'
    ).run(eqId, start, end, reason);
  };

  ensureBlock(catExcId, isoDaysFromNow(6), isoDaysFromNow(8), 'Scheduled hydraulic filter service (Sample)');
  ensureBlock(dmgCncId, isoDaysFromNow(4), isoDaysFromNow(5), 'Internal aerospace production batch (Sample)');
  ensureBlock(nikonId, isoDaysFromNow(7), isoDaysFromNow(8), 'University faculty microscopy workshop (Sample)');
  ensureBlock(orbitrapId, isoDaysFromNow(10), isoDaysFromNow(11), 'Quarterly NABL mass-spec calibration check (Sample)');

  // 9. Sample Demonstration Reviews & Ratings (explicitly flagged is_sample = 1)
  const ensureReview = (rev: {
    equipmentId: number | undefined;
    reviewerName: string;
    roleLabel: string;
    city: string;
    rating: number;
    title: string;
    comment: string;
    durationDays: number;
    createdAt: string;
  }) => {
    if (!rev.equipmentId) return;
    const exists = db
      .prepare('SELECT id FROM equipment_reviews WHERE equipment_id = ? AND reviewer_name = ? AND title = ?')
      .get(rev.equipmentId, rev.reviewerName, rev.title);
    if (exists) return;
    db.prepare(
      `INSERT INTO equipment_reviews (
        equipment_id, reviewer_name, reviewer_role_label, reviewer_city, rating,
        title, comment, rental_duration_days, verified_rental, is_sample, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?)`
    ).run(
      rev.equipmentId,
      rev.reviewerName,
      rev.roleLabel,
      rev.city,
      rev.rating,
      rev.title,
      rev.comment,
      rev.durationDays,
      rev.createdAt
    );
  };

  const sampleReviews = [
    {
      equipmentId: jcbId,
      reviewerName: 'Vikram Patel',
      roleLabel: 'Civil Site Contractor',
      city: 'Pune',
      rating: 5,
      title: 'Clean hydraulics and punctual morning dispatch',
      comment:
        'Arrived on-site in Wakad at 7:45 AM with full maintenance checklist. Itemized operator and transport quote matched the final escrow settlement exactly.',
      durationDays: 3,
      createdAt: isoTimestampDaysAgo(11),
    },
    {
      equipmentId: jcbId,
      reviewerName: 'Suresh Deshmukh',
      roleLabel: 'Infrastructure Sub-Contractor',
      city: 'Pimpri-Chinchwad',
      rating: 4,
      title: 'Strong digging force for hard murrum trenching',
      comment:
        'Operator was experienced around buried telecom conduits. Minor 30-minute traffic delay on morning arrival, compensated with extra evening work.',
      durationDays: 5,
      createdAt: isoTimestampDaysAgo(26),
    },
    {
      equipmentId: hplcId,
      reviewerName: 'Dr. Rohan Kulkarni',
      roleLabel: 'Biotech R&D Lead',
      city: 'Pune',
      rating: 5,
      title: 'Saved us months of CRO backlog with NABL-traceable data',
      comment:
        'Being able to book a calibrated Waters LC-MS for 3 days instead of waiting 5 weeks for an outsourced CRO was a game-changer. Refundable ₹60,000 deposit returned via Escrow right after sign-off.',
      durationDays: 3,
      createdAt: isoTimestampDaysAgo(9),
    },
    {
      equipmentId: hplcId,
      reviewerName: 'Dr. Meenakshi Iyer',
      roleLabel: 'Formulation Scientist',
      city: 'Mumbai',
      rating: 5,
      title: 'Immaculate ion-source baseline and helpful technician',
      comment:
        'Verified Machinery certificate ID matched the physical calibration sticker in Pashan lab. Zero baseline drift across 42 injections.',
      durationDays: 2,
      createdAt: isoTimestampDaysAgo(19),
    },
    {
      equipmentId: dmgCncId,
      reviewerName: 'Dr. Rohan Kulkarni',
      roleLabel: 'MedTech Hardware Founder',
      city: 'Pune',
      rating: 5,
      title: 'Sub-5 micron repeatability on weekend spindle slot',
      comment:
        'Monetizing idle weekend capacity on a ₹1.45 Cr 5-axis CNC let our startup machine titanium fixtures locally without outsourcing overseas.',
      durationDays: 2,
      createdAt: isoTimestampDaysAgo(10),
    },
    {
      equipmentId: nikonId,
      reviewerName: 'Dr. Kavitha Menon',
      roleLabel: 'Cellular Biology Researcher',
      city: 'Bengaluru',
      rating: 5,
      title: 'Crisp Z-stack fluorescence imaging for organoid study',
      comment:
        'All four laser lines aligned cleanly and qPCR bench was pre-sanitized. Clear pricing upfront with zero hidden consumables fees.',
      durationDays: 2,
      createdAt: isoTimestampDaysAgo(14),
    },
    {
      equipmentId: gen100Id,
      reviewerName: 'Vikram Patel',
      roleLabel: 'Civil Site Contractor',
      city: 'Pune',
      rating: 5,
      title: 'Zero voltage drop across 41 hours of continuous crane load',
      comment:
        'Quiet acoustic enclosure kept neighboring apartments happy during our Balewadi feeder shutdown. Escrow settlement was smooth and transparent.',
      durationDays: 4,
      createdAt: isoTimestampDaysAgo(10),
    },
    {
      equipmentId: catExcId,
      reviewerName: 'Prakash Rao',
      roleLabel: 'Commercial Excavation Lead',
      city: 'Hyderabad',
      rating: 5,
      title: 'Reliable 20-ton crawler for deep basement rock work',
      comment:
        'Zero hydraulic leaks and tight bucket pins. Having the service inspection PDF verified on Udaya gave our safety officer immediate confidence.',
      durationDays: 6,
      createdAt: isoTimestampDaysAgo(15),
    },
    {
      equipmentId: orbitrapId,
      reviewerName: 'Dr. Niharika Sen',
      roleLabel: 'Analytical Chemistry Lead',
      city: 'Hyderabad',
      rating: 5,
      title: 'Sub-1 ppm mass accuracy for volatile impurity screening',
      comment:
        'Genome Valley facility was well organized and operator assisted with method setup. Ideal rent-only model for high-capex mass spectrometry.',
      durationDays: 2,
      createdAt: isoTimestampDaysAgo(12),
    },
    {
      equipmentId: haasId,
      reviewerName: 'Priya Nair',
      roleLabel: 'Aerospace Component Lead',
      city: 'Bengaluru',
      rating: 5,
      title: 'Fast turnaround on 5-axis EV motor housings',
      comment:
        'Peenya shop provided Renishaw probing reports with every piece. Much clearer cost breakdown than calling brokers manually.',
      durationDays: 3,
      createdAt: isoTimestampDaysAgo(13),
    },
    {
      equipmentId: leicaId,
      reviewerName: 'Amitabh Joshi',
      roleLabel: 'BIM & Geospatial Consultant',
      city: 'Delhi NCR',
      rating: 5,
      title: 'Rapid 2M pts/sec point cloud capture for metro station',
      comment:
        'Scanner arrived in hard case with 4 charged batteries and Cyclone FIELD license ready. Saved 2 full days compared to total station survey.',
      durationDays: 2,
      createdAt: isoTimestampDaysAgo(8),
    },
    {
      equipmentId: atlasCompId,
      reviewerName: 'Nitin Kulkarni',
      roleLabel: 'MEP & Pipeline Contractor',
      city: 'Pune',
      rating: 4,
      title: 'Steady 7 bar output for full 8-hour pneumatic testing',
      comment:
        'Good fuel economy and easy tow-hitch delivery to Chakan. Clear fuel-on-renter terms prevented billing disputes.',
      durationDays: 3,
      createdAt: isoTimestampDaysAgo(17),
    },
    {
      equipmentId: tractorId,
      reviewerName: 'Deepak Shinde',
      roleLabel: 'Residential Builder',
      city: 'Pune',
      rating: 5,
      title: 'Quick site clearing and soil leveling in Baner',
      comment:
        'Front loader bucket cleared 6 truckloads of debris in a single day. Honest daily rate and polite operator.',
      durationDays: 2,
      createdAt: isoTimestampDaysAgo(21),
    },
    {
      equipmentId: bobcatId,
      reviewerName: 'Harshvardhan Malik',
      roleLabel: 'Warehouse Fit-Out Manager',
      city: 'Delhi NCR',
      rating: 5,
      title: 'Auger attachment saved 3 days of manual foundation digging',
      comment:
        'Fit effortlessly through our 2.1m warehouse dock door in Gurugram. Verified safety certification sped up client EHS approval.',
      durationDays: 3,
      createdAt: isoTimestampDaysAgo(11),
    },
    {
      equipmentId: kirloskarId,
      reviewerName: 'Karthik Subramanian',
      roleLabel: 'Facility Operations Engineer',
      city: 'Chennai',
      rating: 5,
      title: 'Clean backup power during industrial substation maintenance',
      comment:
        'Delivered on schedule to Guindy estate with full load-test report. Very quiet unit.',
      durationDays: 3,
      createdAt: isoTimestampDaysAgo(16),
    },
  ];

  for (const rev of sampleReviews) {
    ensureReview(rev);
  }
}


