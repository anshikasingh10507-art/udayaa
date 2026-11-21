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
  `);

  runSchemaMigrations();
  seedInitialData();
  seedExpandedMachineryAndBadges();
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

