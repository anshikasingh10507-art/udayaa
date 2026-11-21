import express from 'express';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';
import { Modality } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { db, initializeDatabase } from './server/db.ts';
import {
  attachSessionCookie,
  authenticateOptional,
  clearSessionCookie,
  createSession,
  deleteSession,
  hashPassword,
  requireAuth,
  requireRole,
  verifyPassword,
} from './server/auth.ts';
import type { AuthedRequest } from './server/auth.ts';
import { getCityCoordinates, SUPPORTED_CITIES } from './server/geo.ts';
import { addDaysToIsoDate, hasEquipmentDateConflict, runRuleBasedMatching } from './server/matching.ts';
import {
  getGeminiClient,
  runGroundedChatWithGemini,
  runVoiceAssistantWithGemini,
  synthesizeSpeechWithGemini,
  transcribeAudioWithGemini,
  type GroundedChatMode,
  type GroundedChatTurn,
} from './server/gemini.ts';

initializeDatabase();

const app = express();
const PORT = process.env.NODE_ENV === 'production' ? Number(process.env.PORT) || 3000 : 3000;

app.use(express.json({ limit: '6mb' }));
app.use(authenticateOptional);

function createNotification(
  userId: number,
  type: string,
  title: string,
  body: string,
  linkPath: string
): void {
  db.prepare(
    'INSERT INTO notifications (user_id, type, title, body, link_path, is_read, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)'
  ).run(userId, type, title, body, linkPath, new Date().toISOString());
}

function enrichEquipmentRow(row: Record<string, unknown>) {
  const maint = db
    .prepare(
      `SELECT id, condition_description, last_maintenance_date, checklist_json, notes,
              document_name, verification_status, submitted_at
       FROM maintenance_records
       WHERE equipment_id = ?
       ORDER BY id DESC LIMIT 1`
    )
    .get(row.id as number) as Record<string, unknown> | undefined;

  const blocks = db
    .prepare(
      'SELECT id, start_date, end_date, reason, booking_id FROM availability_blocks WHERE equipment_id = ? ORDER BY start_date ASC'
    )
    .all(row.id as number);

  return {
    ...row,
    operator_available: Boolean(row.operator_available),
    transport_available: Boolean(row.transport_available),
    is_sample: Boolean(row.is_sample),
    is_removed: Boolean(row.is_removed),
    is_verified_machinery: Boolean(row.is_verified_machinery),
    rent_only_high_capex: Boolean(row.rent_only_high_capex),
    latest_maintenance: maint
      ? {
          ...maint,
          checklist: (() => {
            try {
              return JSON.parse(String(maint.checklist_json || '[]'));
            } catch {
              return [];
            }
          })(),
        }
      : null,
    availability_blocks: blocks,
  };
}

// Health & Meta
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'udaya-api', cities: SUPPORTED_CITIES });
});

app.get('/api/categories', (req, res) => {
  const includeFuture = req.query.includeFuture === 'true';
  const rows = includeFuture
    ? db.prepare('SELECT * FROM equipment_categories ORDER BY sort_order ASC').all()
    : db.prepare('SELECT * FROM equipment_categories WHERE is_active = 1 ORDER BY sort_order ASC').all();
  res.json({ categories: rows });
});

// Authentication & Profiles
app.post('/api/auth/register', (req, res) => {
  const { name, email, password, role, phone, city, businessName, serviceArea, serviceRadiusKm } = req.body ?? {};
  if (!name || !email || !password) {
    res.status(400).json({ error: 'Name, email, and password are required.' });
    return;
  }
  if (typeof password !== 'string' || password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters.' });
    return;
  }
  const normalizedRole = role === 'owner' ? 'owner' : 'renter';
  const cleanEmail = String(email).trim().toLowerCase();

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
  if (existing) {
    res.status(409).json({ error: 'An account with this email already exists.' });
    return;
  }

  const now = new Date().toISOString();
  const result = db
    .prepare(
      'INSERT INTO users (name, email, password_hash, role, phone, city, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    )
    .run(
      String(name).trim(),
      cleanEmail,
      hashPassword(password),
      normalizedRole,
      String(phone || '').trim(),
      String(city || 'Pune').trim(),
      now
    );

  const userId = Number(result.lastInsertRowid);

  if (normalizedRole === 'owner') {
    db.prepare(
      'INSERT INTO owner_profiles (user_id, business_name, service_area, service_radius_km, bio, verified_contact) VALUES (?, ?, ?, ?, ?, 0)'
    ).run(
      userId,
      String(businessName || `${String(name).trim()} Equipment`).trim(),
      String(serviceArea || city || 'Pune').trim(),
      Number(serviceRadiusKm) || 35,
      ''
    );
  }

  const token = createSession(userId);
  attachSessionCookie(res, token);

  const user = db
    .prepare('SELECT id, name, email, role, phone, city, created_at FROM users WHERE id = ?')
    .get(userId);
  const ownerProfile =
    normalizedRole === 'owner'
      ? db.prepare('SELECT * FROM owner_profiles WHERE user_id = ?').get(userId)
      : null;

  res.status(201).json({ user, ownerProfile, token });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required.' });
    return;
  }
  const cleanEmail = String(email).trim().toLowerCase();
  const userRow = db
    .prepare('SELECT id, name, email, password_hash, role, phone, city, created_at FROM users WHERE email = ?')
    .get(cleanEmail) as
    | {
        id: number;
        name: string;
        email: string;
        password_hash: string;
        role: 'renter' | 'owner' | 'admin';
        phone: string;
        city: string;
        created_at: string;
      }
    | undefined;

  if (!userRow || !verifyPassword(String(password), userRow.password_hash)) {
    res.status(401).json({ error: 'Invalid email or password.' });
    return;
  }

  const token = createSession(userRow.id);
  attachSessionCookie(res, token);

  const ownerProfile =
    userRow.role === 'owner'
      ? db.prepare('SELECT * FROM owner_profiles WHERE user_id = ?').get(userRow.id)
      : null;

  res.json({
    user: {
      id: userRow.id,
      name: userRow.name,
      email: userRow.email,
      role: userRow.role,
      phone: userRow.phone,
      city: userRow.city,
      created_at: userRow.created_at,
    },
    ownerProfile,
    token,
  });
});

app.post('/api/auth/logout', (req: AuthedRequest, res) => {
  if (req.sessionToken) {
    deleteSession(req.sessionToken);
  }
  clearSessionCookie(res);
  res.json({ ok: true });
});

app.get('/api/auth/me', (req: AuthedRequest, res) => {
  if (!req.user) {
    res.json({ user: null, ownerProfile: null });
    return;
  }
  const ownerProfile =
    req.user.role === 'owner'
      ? db.prepare('SELECT * FROM owner_profiles WHERE user_id = ?').get(req.user.id)
      : null;
  res.json({ user: req.user, ownerProfile });
});

app.put('/api/owner/profile', requireRole('owner'), (req: AuthedRequest, res) => {
  const { businessName, serviceArea, serviceRadiusKm, bio, phone, city } = req.body ?? {};
  const userId = req.user!.id;

  if (phone !== undefined || city !== undefined) {
    db.prepare('UPDATE users SET phone = COALESCE(?, phone), city = COALESCE(?, city) WHERE id = ?').run(
      phone ? String(phone).trim() : null,
      city ? String(city).trim() : null,
      userId
    );
  }

  db.prepare(
    `INSERT INTO owner_profiles (user_id, business_name, service_area, service_radius_km, bio, verified_contact)
     VALUES (?, ?, ?, ?, ?, 0)
     ON CONFLICT(user_id) DO UPDATE SET
       business_name = excluded.business_name,
       service_area = excluded.service_area,
       service_radius_km = excluded.service_radius_km,
       bio = excluded.bio`
  ).run(
    userId,
    String(businessName || `${req.user!.name} Equipment`).trim(),
    String(serviceArea || req.user!.city || 'Pune').trim(),
    Math.max(5, Number(serviceRadiusKm) || 35),
    String(bio || '').trim()
  );

  const ownerProfile = db.prepare('SELECT * FROM owner_profiles WHERE user_id = ?').get(userId);
  res.json({ ownerProfile });
});

// Equipment Marketplace (Public Browse + Owner CRUD)
app.get('/api/equipment', (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  const category = String(req.query.category || '').trim();
  const sector = String(req.query.sector || '').trim();
  const city = String(req.query.city || '').trim().toLowerCase();
  const maxRate = req.query.maxRate ? Number(req.query.maxRate) : null;
  const availableOnly = req.query.availableOnly === 'true';
  const operatorOnly = req.query.operatorOnly === 'true';
  const transportOnly = req.query.transportOnly === 'true';
  const verifiedOnly = req.query.verifiedOnly === 'true';
  const rentOnlyCapex = req.query.rentOnlyHighCapex === 'true';
  const startDate = String(req.query.startDate || '').trim();
  const durationDays = Number(req.query.durationDays || 1);

  const rows = db
    .prepare(
      `SELECT l.*, c.name as category_name, c.slug as category_slug, c.sector as category_sector,
              u.name as owner_name, u.city as owner_city,
              COALESCE(op.business_name, u.name) as business_name
       FROM equipment_listings l
       JOIN equipment_categories c ON c.id = l.category_id
       JOIN users u ON u.id = l.owner_id
       LEFT JOIN owner_profiles op ON op.user_id = l.owner_id
       WHERE l.is_removed = 0 AND l.availability_status != 'paused'
       ORDER BY l.is_verified_machinery DESC, l.is_sample ASC, l.id DESC`
    )
    .all() as Array<Record<string, unknown>>;

  const filtered = rows.filter((r) => {
    if (availableOnly && r.availability_status !== 'available') return false;
    if (operatorOnly && !r.operator_available) return false;
    if (transportOnly && !r.transport_available) return false;
    if (verifiedOnly && !r.is_verified_machinery) return false;
    if (rentOnlyCapex && !r.rent_only_high_capex) return false;
    if (maxRate && !Number.isNaN(maxRate) && Number(r.daily_rate) > maxRate) return false;
    if (sector && sector !== 'all') {
      if (String(r.category_sector) !== sector) return false;
    }
    if (category && category !== 'all') {
      if (String(r.category_slug) !== category && String(r.category_id) !== category) return false;
    }
    if (city && city !== 'all') {
      const locMatch =
        String(r.location_city).toLowerCase().includes(city) ||
        String(r.location_area).toLowerCase().includes(city);
      if (!locMatch) return false;
    }
    if (q) {
      const hay = `${r.title} ${r.make_model} ${r.description} ${r.location_city} ${r.location_area} ${r.category_name} ${r.category_sector}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (startDate && availableOnly) {
      const endDate = addDaysToIsoDate(startDate, Math.max(1, durationDays));
      const conflict = hasEquipmentDateConflict(Number(r.id), startDate, endDate);
      if (conflict.conflict) return false;
    }
    return true;
  });

  res.json({ equipment: filtered.map(enrichEquipmentRow) });
});

app.get('/api/equipment/:id', (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const row = db
    .prepare(
      `SELECT l.*, c.name as category_name, c.slug as category_slug, c.sector as category_sector,
              u.name as owner_name, u.city as owner_city, u.phone as owner_phone,
              COALESCE(op.business_name, u.name) as business_name,
              op.service_area as owner_service_area,
              op.bio as owner_bio
       FROM equipment_listings l
       JOIN equipment_categories c ON c.id = l.category_id
       JOIN users u ON u.id = l.owner_id
       LEFT JOIN owner_profiles op ON op.user_id = l.owner_id
       WHERE l.id = ?`
    )
    .get(id) as Record<string, unknown> | undefined;

  if (!row || (row.is_removed && req.user?.role !== 'admin' && req.user?.id !== row.owner_id)) {
    res.status(404).json({ error: 'Equipment listing not found.' });
    return;
  }

  const maintHistory = db
    .prepare(
      `SELECT id, condition_description, last_maintenance_date, checklist_json, notes,
              document_name, verification_status, submitted_at
       FROM maintenance_records
       WHERE equipment_id = ?
       ORDER BY id DESC`
    )
    .all(id);

  res.json({
    equipment: enrichEquipmentRow(row),
    maintenanceHistory: maintHistory.map((m: Record<string, unknown>) => ({
      ...m,
      checklist: (() => {
        try {
          return JSON.parse(String(m.checklist_json || '[]'));
        } catch {
          return [];
        }
      })(),
    })),
  });
});

app.get('/api/owner/equipment', requireRole('owner'), (req: AuthedRequest, res) => {
  const rows = db
    .prepare(
      `SELECT l.*, c.name as category_name, c.slug as category_slug
       FROM equipment_listings l
       JOIN equipment_categories c ON c.id = l.category_id
       WHERE l.owner_id = ? AND l.is_removed = 0
       ORDER BY l.id DESC`
    )
    .all(req.user!.id) as Array<Record<string, unknown>>;

  res.json({ equipment: rows.map(enrichEquipmentRow) });
});

app.post('/api/equipment', requireRole('owner'), (req: AuthedRequest, res) => {
  const b = req.body ?? {};
  if (!b.title || !b.categoryId || !b.locationCity || !b.dailyRate) {
    res.status(400).json({ error: 'Title, category, location city, and daily rate are required.' });
    return;
  }

  const dailyRate = Number(b.dailyRate);
  if (Number.isNaN(dailyRate) || dailyRate <= 0) {
    res.status(400).json({ error: 'Daily rate must be a positive number.' });
    return;
  }

  const coords = getCityCoordinates(String(b.locationCity));
  const now = new Date().toISOString();

  const defaultImagesBySlug: Record<string, string> = {
    'excavators-jcbs': '/src/assets/images/eq_jcb_backhoe_1794920310957.jpg',
    tractors: '/src/assets/images/eq_tractor_utility_1794920313456.jpg',
    'loaders-earthmoving': '/src/assets/images/eq_skid_loader_1794920313017.jpg',
    'concrete-mixers': '/src/assets/images/eq_concrete_mixer_1794920312061.jpg',
    generators: '/src/assets/images/eq_diesel_generator_1794920312999.jpg',
    'lab-analytical': '/src/assets/images/eq_lab_hplc_spectrometer_1795217352610.jpg',
    'lab-biotech-microscopy': '/src/assets/images/eq_lab_confocal_microscope_1795217353612.jpg',
    'industrial-cnc': '/src/assets/images/eq_industrial_cnc_machine_1795217351702.jpg',
    'surveying-geotech': '/src/assets/images/eq_lidar_survey_scanner_1795217352658.jpg',
  };
  const cat = db.prepare('SELECT slug, sector FROM equipment_categories WHERE id = ?').get(Number(b.categoryId)) as
    | { slug: string; sector: string }
    | undefined;
  if (!cat) {
    res.status(400).json({ error: 'Invalid equipment category.' });
    return;
  }

  const imageUrl =
    typeof b.imageUrl === 'string' && b.imageUrl.trim()
      ? b.imageUrl.trim()
      : defaultImagesBySlug[cat.slug] || '/src/assets/images/hero_excavator_site_1794920310287.jpg';

  const result = db
    .prepare(
      `INSERT INTO equipment_listings (
        owner_id, category_id, title, make_model, description, location_city, location_area,
        latitude, longitude, service_radius_km, daily_rate, weekly_rate,
        operator_available, operator_daily_charge, transport_available, transport_base_charge,
        fuel_policy, fuel_daily_estimate, deposit_amount, availability_status,
        condition_summary, image_url, is_sample, is_removed,
        replacement_value_inr, calibration_valid_until, rent_only_high_capex,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?, ?)`
    )
    .run(
      req.user!.id,
      Number(b.categoryId),
      String(b.title).trim(),
      String(b.makeModel || '').trim(),
      String(b.description || '').trim(),
      String(b.locationCity).trim(),
      String(b.locationArea || '').trim(),
      coords?.lat ?? null,
      coords?.lon ?? null,
      Math.max(5, Number(b.serviceRadiusKm) || 35),
      dailyRate,
      b.weeklyRate ? Number(b.weeklyRate) : null,
      b.operatorAvailable ? 1 : 0,
      b.operatorAvailable && b.operatorDailyCharge !== '' && b.operatorDailyCharge != null
        ? Number(b.operatorDailyCharge)
        : null,
      b.transportAvailable ? 1 : 0,
      b.transportAvailable && b.transportBaseCharge !== '' && b.transportBaseCharge != null
        ? Number(b.transportBaseCharge)
        : null,
      ['renter_pays', 'included', 'estimated_extra'].includes(b.fuelPolicy) ? b.fuelPolicy : 'renter_pays',
      b.fuelDailyEstimate !== '' && b.fuelDailyEstimate != null ? Number(b.fuelDailyEstimate) : null,
      b.depositAmount !== '' && b.depositAmount != null ? Number(b.depositAmount) : null,
      ['available', 'paused', 'maintenance'].includes(b.availabilityStatus) ? b.availabilityStatus : 'available',
      String(b.conditionSummary || '').trim(),
      imageUrl,
      b.replacementValueInr !== '' && b.replacementValueInr != null ? Number(b.replacementValueInr) : null,
      b.calibrationValidUntil ? String(b.calibrationValidUntil).trim() : null,
      b.rentOnlyHighCapex || cat.sector !== 'construction' ? 1 : 0,
      now,
      now
    );

  const created = db
    .prepare(
      `SELECT l.*, c.name as category_name, c.slug as category_slug, c.sector as category_sector
       FROM equipment_listings l
       JOIN equipment_categories c ON c.id = l.category_id
       WHERE l.id = ?`
    )
    .get(Number(result.lastInsertRowid)) as Record<string, unknown>;

  res.status(201).json({ equipment: enrichEquipmentRow(created) });
});

app.put('/api/equipment/:id', requireAuth, (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM equipment_listings WHERE id = ?').get(id) as
    | { id: number; owner_id: number; is_removed: number }
    | undefined;

  if (!existing || existing.is_removed) {
    res.status(404).json({ error: 'Listing not found.' });
    return;
  }
  if (existing.owner_id !== req.user!.id && req.user!.role !== 'admin') {
    res.status(403).json({ error: 'Unauthorized: you can only edit your own equipment listings.' });
    return;
  }

  const b = req.body ?? {};
  const coords = b.locationCity ? getCityCoordinates(String(b.locationCity)) : null;
  const now = new Date().toISOString();

  db.prepare(
    `UPDATE equipment_listings SET
      category_id = COALESCE(?, category_id),
      title = COALESCE(?, title),
      make_model = COALESCE(?, make_model),
      description = COALESCE(?, description),
      location_city = COALESCE(?, location_city),
      location_area = COALESCE(?, location_area),
      latitude = COALESCE(?, latitude),
      longitude = COALESCE(?, longitude),
      service_radius_km = COALESCE(?, service_radius_km),
      daily_rate = COALESCE(?, daily_rate),
      weekly_rate = ?,
      operator_available = COALESCE(?, operator_available),
      operator_daily_charge = ?,
      transport_available = COALESCE(?, transport_available),
      transport_base_charge = ?,
      fuel_policy = COALESCE(?, fuel_policy),
      fuel_daily_estimate = ?,
      deposit_amount = ?,
      availability_status = COALESCE(?, availability_status),
      condition_summary = COALESCE(?, condition_summary),
      image_url = COALESCE(?, image_url),
      replacement_value_inr = ?,
      calibration_valid_until = ?,
      rent_only_high_capex = COALESCE(?, rent_only_high_capex),
      updated_at = ?
     WHERE id = ?`
  ).run(
    b.categoryId ? Number(b.categoryId) : null,
    b.title ? String(b.title).trim() : null,
    b.makeModel !== undefined ? String(b.makeModel).trim() : null,
    b.description !== undefined ? String(b.description).trim() : null,
    b.locationCity ? String(b.locationCity).trim() : null,
    b.locationArea !== undefined ? String(b.locationArea).trim() : null,
    coords?.lat ?? null,
    coords?.lon ?? null,
    b.serviceRadiusKm ? Number(b.serviceRadiusKm) : null,
    b.dailyRate ? Number(b.dailyRate) : null,
    b.weeklyRate !== undefined && b.weeklyRate !== '' && b.weeklyRate !== null ? Number(b.weeklyRate) : null,
    b.operatorAvailable !== undefined ? (b.operatorAvailable ? 1 : 0) : null,
    b.operatorAvailable && b.operatorDailyCharge !== '' && b.operatorDailyCharge != null
      ? Number(b.operatorDailyCharge)
      : null,
    b.transportAvailable !== undefined ? (b.transportAvailable ? 1 : 0) : null,
    b.transportAvailable && b.transportBaseCharge !== '' && b.transportBaseCharge != null
      ? Number(b.transportBaseCharge)
      : null,
    b.fuelPolicy && ['renter_pays', 'included', 'estimated_extra'].includes(b.fuelPolicy) ? b.fuelPolicy : null,
    b.fuelDailyEstimate !== undefined && b.fuelDailyEstimate !== '' && b.fuelDailyEstimate !== null
      ? Number(b.fuelDailyEstimate)
      : null,
    b.depositAmount !== undefined && b.depositAmount !== '' && b.depositAmount !== null
      ? Number(b.depositAmount)
      : null,
    b.availabilityStatus && ['available', 'paused', 'maintenance'].includes(b.availabilityStatus)
      ? b.availabilityStatus
      : null,
    b.conditionSummary !== undefined ? String(b.conditionSummary).trim() : null,
    b.imageUrl ? String(b.imageUrl).trim() : null,
    b.replacementValueInr !== undefined && b.replacementValueInr !== '' && b.replacementValueInr !== null
      ? Number(b.replacementValueInr)
      : null,
    b.calibrationValidUntil ? String(b.calibrationValidUntil).trim() : null,
    b.rentOnlyHighCapex !== undefined ? (b.rentOnlyHighCapex ? 1 : 0) : null,
    now,
    id
  );

  const updated = db
    .prepare(
      `SELECT l.*, c.name as category_name, c.slug as category_slug
       FROM equipment_listings l
       JOIN equipment_categories c ON c.id = l.category_id
       WHERE l.id = ?`
    )
    .get(id) as Record<string, unknown>;

  res.json({ equipment: enrichEquipmentRow(updated) });
});

app.delete('/api/equipment/:id', requireAuth, (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT id, owner_id FROM equipment_listings WHERE id = ?').get(id) as
    | { id: number; owner_id: number }
    | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Listing not found.' });
    return;
  }
  if (existing.owner_id !== req.user!.id && req.user!.role !== 'admin') {
    res.status(403).json({ error: 'Unauthorized: you cannot remove another owner’s listing.' });
    return;
  }
  db.prepare('UPDATE equipment_listings SET is_removed = 1, availability_status = ? WHERE id = ?').run('paused', id);
  res.json({ ok: true });
});

// Availability blocks (owner blocks dates for maintenance / external bookings)
app.post('/api/equipment/:id/blocks', requireRole('owner'), (req: AuthedRequest, res) => {
  const equipmentId = Number(req.params.id);
  const listing = db.prepare('SELECT id, owner_id FROM equipment_listings WHERE id = ?').get(equipmentId) as
    | { id: number; owner_id: number }
    | undefined;
  if (!listing || listing.owner_id !== req.user!.id) {
    res.status(403).json({ error: 'Unauthorized.' });
    return;
  }
  const { startDate, endDate, reason } = req.body ?? {};
  if (!startDate || !endDate || startDate > endDate) {
    res.status(400).json({ error: 'Valid start date and end date are required.' });
    return;
  }
  const result = db
    .prepare('INSERT INTO availability_blocks (equipment_id, start_date, end_date, reason, booking_id) VALUES (?, ?, ?, ?, NULL)')
    .run(equipmentId, String(startDate), String(endDate), String(reason || 'Owner unavailable').trim());

  res.status(201).json({
    block: db.prepare('SELECT * FROM availability_blocks WHERE id = ?').get(Number(result.lastInsertRowid)),
  });
});

app.delete('/api/equipment/:id/blocks/:blockId', requireRole('owner'), (req: AuthedRequest, res) => {
  const equipmentId = Number(req.params.id);
  const blockId = Number(req.params.blockId);
  const listing = db.prepare('SELECT id, owner_id FROM equipment_listings WHERE id = ?').get(equipmentId) as
    | { id: number; owner_id: number }
    | undefined;
  if (!listing || listing.owner_id !== req.user!.id) {
    res.status(403).json({ error: 'Unauthorized.' });
    return;
  }
  db.prepare('DELETE FROM availability_blocks WHERE id = ? AND equipment_id = ? AND booking_id IS NULL').run(
    blockId,
    equipmentId
  );
  res.json({ ok: true });
});

// Maintenance Records
app.post('/api/equipment/:id/maintenance', requireRole('owner'), (req: AuthedRequest, res) => {
  const equipmentId = Number(req.params.id);
  const listing = db.prepare('SELECT id, owner_id FROM equipment_listings WHERE id = ?').get(equipmentId) as
    | { id: number; owner_id: number }
    | undefined;
  if (!listing || listing.owner_id !== req.user!.id) {
    res.status(403).json({ error: 'Unauthorized: you can only manage maintenance for your own equipment.' });
    return;
  }

  const { conditionDescription, lastMaintenanceDate, checklist, notes, documentName, documentDataUrl } = req.body ?? {};
  if (!conditionDescription || !String(conditionDescription).trim()) {
    res.status(400).json({ error: 'Equipment condition description is required.' });
    return;
  }

  const hasDoc = Boolean(documentName && String(documentName).trim());
  const verificationStatus = hasDoc ? 'Documents submitted' : 'Owner-provided';
  const now = new Date().toISOString();

  const result = db
    .prepare(
      `INSERT INTO maintenance_records (
        equipment_id, condition_description, last_maintenance_date, checklist_json,
        notes, document_name, document_data_url, verification_status, submitted_at, verified_by_admin_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`
    )
    .run(
      equipmentId,
      String(conditionDescription).trim(),
      lastMaintenanceDate ? String(lastMaintenanceDate) : null,
      JSON.stringify(Array.isArray(checklist) ? checklist : []),
      String(notes || '').trim(),
      String(documentName || '').trim(),
      String(documentDataUrl || '').trim(),
      verificationStatus,
      now
    );

  db.prepare('UPDATE equipment_listings SET condition_summary = ?, updated_at = ? WHERE id = ?').run(
    String(conditionDescription).trim(),
    now,
    equipmentId
  );

  res.status(201).json({
    record: db.prepare('SELECT * FROM maintenance_records WHERE id = ?').get(Number(result.lastInsertRowid)),
  });
});

// Zero-Idle Job Requests & Matching
app.post('/api/job-requests', requireAuth, (req: AuthedRequest, res) => {
  const b = req.body ?? {};
  if (!b.title || !b.categoryId || !b.jobCity || !b.preferredStartDate || !b.durationDays) {
    res.status(400).json({ error: 'Job title, equipment category, city, start date, and duration are required.' });
    return;
  }

  const duration = Math.max(1, Number(b.durationDays));
  const coords = getCityCoordinates(String(b.jobCity));
  const now = new Date().toISOString();

  const result = db
    .prepare(
      `INSERT INTO job_requests (
        renter_id, title, work_description, category_id, job_city, job_area,
        latitude, longitude, preferred_start_date, duration_days, budget_max,
        requires_operator, requires_transport, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?)`
    )
    .run(
      req.user!.id,
      String(b.title).trim(),
      String(b.workDescription || '').trim(),
      Number(b.categoryId),
      String(b.jobCity).trim(),
      String(b.jobArea || '').trim(),
      coords?.lat ?? null,
      coords?.lon ?? null,
      String(b.preferredStartDate),
      duration,
      b.budgetMax !== '' && b.budgetMax != null ? Number(b.budgetMax) : null,
      b.requiresOperator ? 1 : 0,
      b.requiresTransport ? 1 : 0,
      now
    );

  const jobId = Number(result.lastInsertRowid);
  const candidates = runRuleBasedMatching(jobId);

  const insertMatch = db.prepare(`
    INSERT INTO job_matches (
      job_request_id, equipment_id, owner_id, match_score, match_reasons_json,
      availability_note, owner_response_status
    ) VALUES (?, ?, ?, ?, ?, ?, 'pending')
  `);

  const notifiedOwners = new Set<number>();
  for (const c of candidates) {
    insertMatch.run(jobId, c.equipmentId, c.ownerId, c.matchScore, JSON.stringify(c.matchReasons), c.availabilityNote);
    if (!notifiedOwners.has(c.ownerId)) {
      notifiedOwners.add(c.ownerId);
      createNotification(
        c.ownerId,
        'job_match',
        `New Zero-Idle job opportunity in ${String(b.jobCity).trim()}`,
        `"${String(b.title).trim()}" matched your listed equipment for ${duration} day(s) starting ${b.preferredStartDate}.`,
        '/owner/job-requests'
      );
    }
  }

  res.status(201).json({
    jobRequestId: jobId,
    matchCount: candidates.length,
  });
});

app.get('/api/job-requests', requireAuth, (req: AuthedRequest, res) => {
  const rows = db
    .prepare(
      `SELECT j.*, c.name as category_name, c.slug as category_slug,
              (SELECT COUNT(*) FROM job_matches m WHERE m.job_request_id = j.id) as match_count,
              (SELECT COUNT(*) FROM job_matches m WHERE m.job_request_id = j.id AND m.owner_response_status IN ('available_quoted', 'alternative_proposed')) as response_count
       FROM job_requests j
       JOIN equipment_categories c ON c.id = j.category_id
       WHERE j.renter_id = ?
       ORDER BY j.id DESC`
    )
    .all(req.user!.id);

  res.json({ jobRequests: rows });
});

app.get('/api/job-requests/:id', requireAuth, (req: AuthedRequest, res) => {
  const jobId = Number(req.params.id);
  const job = db
    .prepare(
      `SELECT j.*, c.name as category_name, c.slug as category_slug, u.name as renter_name
       FROM job_requests j
       JOIN equipment_categories c ON c.id = j.category_id
       JOIN users u ON u.id = j.renter_id
       WHERE j.id = ?`
    )
    .get(jobId) as Record<string, unknown> | undefined;

  if (!job) {
    res.status(404).json({ error: 'Job request not found.' });
    return;
  }

  const matches = db
    .prepare(
      `SELECT m.*,
              l.title as equipment_title, l.make_model, l.location_city, l.location_area,
              l.daily_rate, l.operator_available, l.operator_daily_charge,
              l.transport_available, l.transport_base_charge, l.fuel_policy, l.fuel_daily_estimate,
              l.deposit_amount, l.image_url, l.availability_status, l.is_sample,
              u.name as owner_name, COALESCE(op.business_name, u.name) as business_name,
              alt.title as alternative_equipment_title, alt.daily_rate as alternative_daily_rate,
              (SELECT verification_status FROM maintenance_records mr WHERE mr.equipment_id = l.id ORDER BY mr.id DESC LIMIT 1) as maintenance_verification
       FROM job_matches m
       JOIN equipment_listings l ON l.id = m.equipment_id
       JOIN users u ON u.id = m.owner_id
       LEFT JOIN owner_profiles op ON op.user_id = m.owner_id
       LEFT JOIN equipment_listings alt ON alt.id = m.alternative_equipment_id
       WHERE m.job_request_id = ?
       ORDER BY m.owner_response_status = 'available_quoted' DESC, m.match_score DESC`
    )
    .all(jobId) as Array<Record<string, unknown>>;

  const isOwnerMatched = matches.some((m) => Number(m.owner_id) === req.user!.id);
  if (Number(job.renter_id) !== req.user!.id && !isOwnerMatched && req.user!.role !== 'admin') {
    res.status(403).json({ error: 'Unauthorized to view this job request.' });
    return;
  }

  // Also fetch nearby alternatives in case matches are empty
  let nearbyAlternatives: Array<Record<string, unknown>> = [];
  if (matches.length === 0) {
    nearbyAlternatives = db
      .prepare(
        `SELECT l.id, l.title, l.location_city, l.daily_rate, l.image_url, l.is_sample, c.name as category_name
         FROM equipment_listings l
         JOIN equipment_categories c ON c.id = l.category_id
         WHERE l.is_removed = 0 AND l.availability_status = 'available' AND l.owner_id != ?
         ORDER BY (l.location_city = ?) DESC, l.id DESC
         LIMIT 4`
      )
      .all(job.renter_id as number, String(job.job_city)) as Array<Record<string, unknown>>;
  }

  res.json({
    jobRequest: {
      ...job,
      requires_operator: Boolean(job.requires_operator),
      requires_transport: Boolean(job.requires_transport),
    },
    matches: matches.map((m) => ({
      ...m,
      match_reasons: (() => {
        try {
          return JSON.parse(String(m.match_reasons_json || '[]'));
        } catch {
          return [];
        }
      })(),
      is_sample: Boolean(m.is_sample),
      operator_available: Boolean(m.operator_available),
      transport_available: Boolean(m.transport_available),
    })),
    nearbyAlternatives,
  });
});

app.get('/api/owner/job-requests', requireRole('owner'), (req: AuthedRequest, res) => {
  const ownerId = req.user!.id;

  const matched = db
    .prepare(
      `SELECT m.*,
              j.title as job_title, j.work_description, j.job_city, j.job_area,
              j.preferred_start_date, j.duration_days, j.budget_max,
              j.requires_operator, j.requires_transport, j.status as job_status,
              c.name as category_name,
              u.name as renter_name,
              l.title as equipment_title, l.daily_rate as listing_daily_rate
       FROM job_matches m
       JOIN job_requests j ON j.id = m.job_request_id
       JOIN equipment_categories c ON c.id = j.category_id
       JOIN users u ON u.id = j.renter_id
       JOIN equipment_listings l ON l.id = m.equipment_id
       WHERE m.owner_id = ?
       ORDER BY j.id DESC, m.id DESC`
    )
    .all(ownerId) as Array<Record<string, unknown>>;

  // Also show open demand requests with 0 matches in the marketplace so owners can respond proactively
  const openDemand = db
    .prepare(
      `SELECT j.*, c.name as category_name, u.name as renter_name
       FROM job_requests j
       JOIN equipment_categories c ON c.id = j.category_id
       JOIN users u ON u.id = j.renter_id
       WHERE j.status IN ('open', 'responses_received')
         AND j.renter_id != ?
         AND NOT EXISTS (SELECT 1 FROM job_matches m WHERE m.job_request_id = j.id AND m.owner_id = ?)
       ORDER BY j.id DESC
       LIMIT 10`
    )
    .all(ownerId, ownerId);

  res.json({
    matchedRequests: matched.map((m) => ({
      ...m,
      match_reasons: (() => {
        try {
          return JSON.parse(String(m.match_reasons_json || '[]'));
        } catch {
          return [];
        }
      })(),
      requires_operator: Boolean(m.requires_operator),
      requires_transport: Boolean(m.requires_transport),
    })),
    openDemandRequests: openDemand,
  });
});

app.post('/api/owner/job-matches/:matchId/respond', requireRole('owner'), (req: AuthedRequest, res) => {
  const matchId = Number(req.params.matchId);
  const match = db
    .prepare(
      `SELECT m.*, j.renter_id, j.title as job_title, j.preferred_start_date, j.duration_days
       FROM job_matches m
       JOIN job_requests j ON j.id = m.job_request_id
       WHERE m.id = ?`
    )
    .get(matchId) as
    | {
        id: number;
        job_request_id: number;
        equipment_id: number;
        owner_id: number;
        renter_id: number;
        job_title: string;
        preferred_start_date: string;
        duration_days: number;
      }
    | undefined;

  if (!match) {
    res.status(404).json({ error: 'Job match not found.' });
    return;
  }
  if (match.owner_id !== req.user!.id) {
    res.status(403).json({ error: 'Unauthorized: you can only respond to your own equipment matches.' });
    return;
  }

  const b = req.body ?? {};
  const status = ['available_quoted', 'alternative_proposed', 'declined'].includes(b.responseStatus)
    ? b.responseStatus
    : 'available_quoted';

  const targetEqId =
    status === 'alternative_proposed' && b.alternativeEquipmentId
      ? Number(b.alternativeEquipmentId)
      : match.equipment_id;

  if (status !== 'declined') {
    const endDate = addDaysToIsoDate(match.preferred_start_date, match.duration_days);
    const conflict = hasEquipmentDateConflict(targetEqId, match.preferred_start_date, endDate);
    if (conflict.conflict) {
      res.status(409).json({
        error: `Cannot confirm availability: ${conflict.reason}`,
      });
      return;
    }
  }

  const now = new Date().toISOString();
  const availabilityNote =
    status === 'declined'
      ? 'Owner declined this job request'
      : status === 'alternative_proposed'
        ? `Owner confirmed alternative equipment for ${match.preferred_start_date}`
        : `Owner confirmed availability for ${match.preferred_start_date}`;

  db.prepare(
    `UPDATE job_matches SET
      owner_response_status = ?,
      availability_note = ?,
      quoted_daily_rate = ?,
      quoted_transport_charge = ?,
      quoted_operator_charge = ?,
      quoted_fuel_charge = ?,
      quoted_other_charge = ?,
      quoted_deposit = ?,
      owner_note = ?,
      alternative_equipment_id = ?,
      responded_at = ?
     WHERE id = ?`
  ).run(
    status,
    availabilityNote,
    b.quotedDailyRate !== '' && b.quotedDailyRate != null ? Number(b.quotedDailyRate) : null,
    b.quotedTransportCharge !== '' && b.quotedTransportCharge != null ? Number(b.quotedTransportCharge) : null,
    b.quotedOperatorCharge !== '' && b.quotedOperatorCharge != null ? Number(b.quotedOperatorCharge) : null,
    b.quotedFuelCharge !== '' && b.quotedFuelCharge != null ? Number(b.quotedFuelCharge) : null,
    b.quotedOtherCharge !== '' && b.quotedOtherCharge != null ? Number(b.quotedOtherCharge) : null,
    b.quotedDeposit !== '' && b.quotedDeposit != null ? Number(b.quotedDeposit) : null,
    String(b.ownerNote || '').trim(),
    status === 'alternative_proposed' && b.alternativeEquipmentId ? Number(b.alternativeEquipmentId) : null,
    now,
    matchId
  );

  if (status === 'available_quoted' || status === 'alternative_proposed') {
    db.prepare("UPDATE job_requests SET status = 'responses_received' WHERE id = ? AND status = 'open'").run(
      match.job_request_id
    );
    createNotification(
      match.renter_id,
      'quote_received',
      `Owner responded to "${match.job_title}"`,
      `${req.user!.name} submitted availability & quotation details. Compare and submit a rental request.`,
      `/renter/job-requests/${match.job_request_id}/matches`
    );
  }

  res.json({ ok: true });
});

app.post('/api/owner/job-requests/:jobId/respond', requireRole('owner'), (req: AuthedRequest, res) => {
  const jobId = Number(req.params.jobId);
  const { equipmentId, quotedDailyRate, quotedTransportCharge, quotedOperatorCharge, quotedFuelCharge, quotedOtherCharge, quotedDeposit, ownerNote } =
    req.body ?? {};

  const job = db.prepare('SELECT * FROM job_requests WHERE id = ?').get(jobId) as
    | { id: number; renter_id: number; title: string; preferred_start_date: string; duration_days: number }
    | undefined;
  if (!job) {
    res.status(404).json({ error: 'Job request not found.' });
    return;
  }

  const eq = db.prepare('SELECT id, owner_id, title FROM equipment_listings WHERE id = ? AND is_removed = 0').get(
    Number(equipmentId)
  ) as { id: number; owner_id: number; title: string } | undefined;
  if (!eq || eq.owner_id !== req.user!.id) {
    res.status(403).json({ error: 'Select one of your active equipment listings to respond.' });
    return;
  }

  const endDate = addDaysToIsoDate(job.preferred_start_date, job.duration_days);
  const conflict = hasEquipmentDateConflict(eq.id, job.preferred_start_date, endDate);
  if (conflict.conflict) {
    res.status(409).json({ error: `Cannot confirm availability: ${conflict.reason}` });
    return;
  }

  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO job_matches (
      job_request_id, equipment_id, owner_id, match_score, match_reasons_json,
      availability_note, owner_response_status, quoted_daily_rate, quoted_transport_charge,
      quoted_operator_charge, quoted_fuel_charge, quoted_other_charge, quoted_deposit,
      owner_note, responded_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'available_quoted', ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    jobId,
    eq.id,
    req.user!.id,
    75,
    JSON.stringify(['Owner proactively responded to your demand request']),
    `Owner confirmed availability for ${job.preferred_start_date} to ${endDate}`,
    quotedDailyRate !== '' && quotedDailyRate != null ? Number(quotedDailyRate) : null,
    quotedTransportCharge !== '' && quotedTransportCharge != null ? Number(quotedTransportCharge) : null,
    quotedOperatorCharge !== '' && quotedOperatorCharge != null ? Number(quotedOperatorCharge) : null,
    quotedFuelCharge !== '' && quotedFuelCharge != null ? Number(quotedFuelCharge) : null,
    quotedOtherCharge !== '' && quotedOtherCharge != null ? Number(quotedOtherCharge) : null,
    quotedDeposit !== '' && quotedDeposit != null ? Number(quotedDeposit) : null,
    String(ownerNote || '').trim(),
    now
  );

  db.prepare("UPDATE job_requests SET status = 'responses_received' WHERE id = ? AND status = 'open'").run(jobId);
  createNotification(
    job.renter_id,
    'quote_received',
    `New owner offer on "${job.title}"`,
    `${req.user!.name} offered ${eq.title} for your job request.`,
    `/renter/job-requests/${jobId}/matches`
  );

  res.status(201).json({ ok: true });
});

// Rental Requests & Booking Workflow
app.post('/api/rental-requests', requireAuth, (req: AuthedRequest, res) => {
  const b = req.body ?? {};
  const equipmentId = Number(b.equipmentId);
  const startDate = String(b.startDate || '').trim();
  const durationDays = Math.max(1, Number(b.durationDays) || 1);
  const jobLocation = String(b.jobLocation || '').trim();
  const intendedUse = String(b.intendedUse || '').trim();

  if (!equipmentId || !startDate || !jobLocation || !intendedUse) {
    res.status(400).json({ error: 'Equipment, start date, job location, and intended use are required.' });
    return;
  }

  const listing = db
    .prepare('SELECT * FROM equipment_listings WHERE id = ? AND is_removed = 0')
    .get(equipmentId) as Record<string, unknown> | undefined;

  if (!listing) {
    res.status(404).json({ error: 'Equipment listing not found.' });
    return;
  }
  if (Number(listing.owner_id) === req.user!.id) {
    res.status(400).json({ error: 'You cannot submit a rental request for your own equipment.' });
    return;
  }
  if (listing.availability_status !== 'available') {
    res.status(409).json({
      error: `This equipment is currently marked "${listing.availability_status}" and cannot accept rental requests.`,
    });
    return;
  }

  const endDate = addDaysToIsoDate(startDate, durationDays);
  const conflict = hasEquipmentDateConflict(equipmentId, startDate, endDate);
  if (conflict.conflict) {
    res.status(409).json({
      error: `Selected dates conflict with an existing schedule: ${conflict.reason}`,
    });
    return;
  }

  // If originating from a jobMatch, pull quoted numbers cleanly
  let initialStatus: string = 'Request submitted';
  let chargesConfirmed = 0;
  let dailyRate = Number(listing.daily_rate);
  let transportCharge: number | null =
    b.requiresTransport && listing.transport_available && listing.transport_base_charge != null
      ? Number(listing.transport_base_charge)
      : null;
  let operatorCharge: number | null =
    b.requiresOperator && listing.operator_available && listing.operator_daily_charge != null
      ? Number(listing.operator_daily_charge) * durationDays
      : null;
  let fuelCharge: number | null =
    listing.fuel_policy === 'included'
      ? 0
      : listing.fuel_daily_estimate != null
        ? Number(listing.fuel_daily_estimate) * durationDays
        : null;
  let otherCharge: number | null = null;
  let depositAmount: number | null = listing.deposit_amount != null ? Number(listing.deposit_amount) : null;
  let ownerNotes = '';

  if (b.jobMatchId) {
    const jm = db.prepare('SELECT * FROM job_matches WHERE id = ?').get(Number(b.jobMatchId)) as
      | Record<string, unknown>
      | undefined;
    if (jm && (jm.owner_response_status === 'available_quoted' || jm.owner_response_status === 'alternative_proposed')) {
      initialStatus = 'Quotation received';
      chargesConfirmed = 1;
      if (jm.quoted_daily_rate != null) dailyRate = Number(jm.quoted_daily_rate);
      transportCharge = jm.quoted_transport_charge != null ? Number(jm.quoted_transport_charge) : null;
      operatorCharge = jm.quoted_operator_charge != null ? Number(jm.quoted_operator_charge) : null;
      fuelCharge = jm.quoted_fuel_charge != null ? Number(jm.quoted_fuel_charge) : null;
      otherCharge = jm.quoted_other_charge != null ? Number(jm.quoted_other_charge) : null;
      depositAmount = jm.quoted_deposit != null ? Number(jm.quoted_deposit) : depositAmount;
      ownerNotes = String(jm.owner_note || '');
    }
  }

  const baseRentalTotal = dailyRate * durationDays;
  const now = new Date().toISOString();

  const result = db
    .prepare(
      `INSERT INTO rental_requests (
        equipment_id, renter_id, owner_id, job_request_id, job_match_id,
        job_location, start_date, end_date, duration_days, intended_use,
        requires_operator, requires_transport, status, payment_status,
        base_rental_total, transport_charge, operator_charge, fuel_charge, other_charge,
        deposit_amount, charges_confirmed_by_owner, renter_notes, owner_notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      equipmentId,
      req.user!.id,
      Number(listing.owner_id),
      b.jobRequestId ? Number(b.jobRequestId) : null,
      b.jobMatchId ? Number(b.jobMatchId) : null,
      jobLocation,
      startDate,
      endDate,
      durationDays,
      intendedUse,
      b.requiresOperator ? 1 : 0,
      b.requiresTransport ? 1 : 0,
      initialStatus,
      'Awaiting Udaya Escrow Funding',
      baseRentalTotal,
      transportCharge,
      operatorCharge,
      fuelCharge,
      otherCharge,
      depositAmount,
      chargesConfirmed,
      String(b.renterNotes || '').trim(),
      ownerNotes,
      now,
      now
    );

  const reqId = Number(result.lastInsertRowid);
  createNotification(
    Number(listing.owner_id),
    'rental_request',
    `New rental request for ${listing.title}`,
    `${req.user!.name} requested ${durationDays} day(s) starting ${startDate} at ${jobLocation}.`,
    '/owner/bookings'
  );

  res.status(201).json({
    rentalRequest: db.prepare('SELECT * FROM rental_requests WHERE id = ?').get(reqId),
  });
});

app.get('/api/rental-requests', requireAuth, (req: AuthedRequest, res) => {
  const scope = req.query.scope === 'owner' ? 'owner' : 'renter';
  const userId = req.user!.id;

  const whereClause = scope === 'owner' ? 'r.owner_id = ?' : 'r.renter_id = ?';
  const rows = db
    .prepare(
      `SELECT r.*,
              l.title as equipment_title, l.make_model, l.location_city, l.image_url, l.daily_rate as listing_daily_rate,
              l.is_sample, l.is_verified_machinery,
              renter.name as renter_name, renter.phone as renter_phone,
              owner.name as owner_name, owner.phone as owner_phone,
              COALESCE(op.business_name, owner.name) as business_name,
              e.id as escrow_id, e.escrow_ref, e.status as escrow_status,
              e.rental_amount as escrow_rental_amount, e.deposit_amount as escrow_deposit_amount,
              e.platform_fee as escrow_platform_fee, e.total_funded as escrow_total_funded,
              e.payment_method as escrow_payment_method, e.funded_at as escrow_funded_at,
              e.handover_confirmed_at as escrow_handover_confirmed_at, e.released_at as escrow_released_at,
              e.dispute_reason as escrow_dispute_reason
       FROM rental_requests r
       JOIN equipment_listings l ON l.id = r.equipment_id
       JOIN users renter ON renter.id = r.renter_id
       JOIN users owner ON owner.id = r.owner_id
       LEFT JOIN owner_profiles op ON op.user_id = r.owner_id
       LEFT JOIN escrow_transactions e ON e.rental_request_id = r.id
       WHERE ${whereClause}
       ORDER BY r.id DESC`
    )
    .all(userId);

  res.json({ rentalRequests: rows });
});

app.patch('/api/rental-requests/:id/status', requireAuth, (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM rental_requests WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined;

  if (!existing) {
    res.status(404).json({ error: 'Rental request not found.' });
    return;
  }

  const userId = req.user!.id;
  const isOwner = Number(existing.owner_id) === userId;
  const isRenter = Number(existing.renter_id) === userId;

  if (!isOwner && !isRenter && req.user!.role !== 'admin') {
    res.status(403).json({ error: 'Unauthorized: you cannot modify this booking.' });
    return;
  }

  const b = req.body ?? {};
  const nextStatus = String(b.status || '').trim();
  const currentStatus = String(existing.status);

  const validStatuses = [
    'Request submitted',
    'Owner reviewing',
    'Quotation received',
    'Accepted',
    'Rejected',
    'Cancelled',
    'Completed',
  ];
  if (!validStatuses.includes(nextStatus)) {
    res.status(400).json({ error: 'Invalid booking status.' });
    return;
  }

  // Enforce role-specific transition rules
  if (isRenter && !isOwner) {
    if (nextStatus === 'Cancelled') {
      if (!['Request submitted', 'Owner reviewing', 'Quotation received'].includes(currentStatus)) {
        res.status(400).json({
          error: `Cannot cancel a booking that is already "${currentStatus}". Contact the owner via enquiries.`,
        });
        return;
      }
    } else if (nextStatus === 'Accepted' && currentStatus === 'Quotation received') {
      // Allow renter to accept a received quotation, subject to overlap check below
    } else {
      res.status(403).json({ error: 'Renters can only accept a quotation or cancel pending requests.' });
      return;
    }
  }

  if (isOwner) {
    if (nextStatus === 'Accepted') {
      const conflict = hasEquipmentDateConflict(
        Number(existing.equipment_id),
        String(existing.start_date),
        String(existing.end_date),
        id
      );
      if (conflict.conflict) {
        res.status(409).json({
          error: `Cannot accept booking due to overlapping confirmed dates: ${conflict.reason}`,
        });
        return;
      }
    }
  }

  if (nextStatus === 'Accepted') {
    const conflict = hasEquipmentDateConflict(
      Number(existing.equipment_id),
      String(existing.start_date),
      String(existing.end_date),
      id
    );
    if (conflict.conflict) {
      res.status(409).json({
        error: `Cannot confirm booking: ${conflict.reason}`,
      });
      return;
    }
  }

  const now = new Date().toISOString();
  const baseTotal =
    b.baseRentalTotal !== undefined && b.baseRentalTotal !== '' && b.baseRentalTotal !== null
      ? Number(b.baseRentalTotal)
      : Number(existing.base_rental_total);

  const transportCharge: number | null =
    b.transportCharge !== undefined
      ? b.transportCharge === '' || b.transportCharge === null
        ? null
        : Number(b.transportCharge)
      : existing.transport_charge != null
        ? Number(existing.transport_charge)
        : null;

  const operatorCharge: number | null =
    b.operatorCharge !== undefined
      ? b.operatorCharge === '' || b.operatorCharge === null
        ? null
        : Number(b.operatorCharge)
      : existing.operator_charge != null
        ? Number(existing.operator_charge)
        : null;

  const fuelCharge: number | null =
    b.fuelCharge !== undefined
      ? b.fuelCharge === '' || b.fuelCharge === null
        ? null
        : Number(b.fuelCharge)
      : existing.fuel_charge != null
        ? Number(existing.fuel_charge)
        : null;

  const otherCharge: number | null =
    b.otherCharge !== undefined
      ? b.otherCharge === '' || b.otherCharge === null
        ? null
        : Number(b.otherCharge)
      : existing.other_charge != null
        ? Number(existing.other_charge)
        : null;

  const depositAmount: number | null =
    b.depositAmount !== undefined
      ? b.depositAmount === '' || b.depositAmount === null
        ? null
        : Number(b.depositAmount)
      : existing.deposit_amount != null
        ? Number(existing.deposit_amount)
        : null;

  const chargesConfirmed =
    isOwner && (nextStatus === 'Quotation received' || nextStatus === 'Accepted')
      ? 1
      : Number(existing.charges_confirmed_by_owner);

  db.prepare(
    `UPDATE rental_requests SET
      status = ?,
      base_rental_total = ?,
      transport_charge = ?,
      operator_charge = ?,
      fuel_charge = ?,
      other_charge = ?,
      deposit_amount = ?,
      charges_confirmed_by_owner = ?,
      owner_notes = COALESCE(?, owner_notes),
      updated_at = ?
     WHERE id = ?`
  ).run(
    nextStatus,
    baseTotal,
    transportCharge,
    operatorCharge,
    fuelCharge,
    otherCharge,
    depositAmount,
    chargesConfirmed,
    b.ownerNotes !== undefined ? String(b.ownerNotes).trim() : null,
    now,
    id
  );

  // Sync availability_blocks on Accepted / Cancelled / Completed
  if (nextStatus === 'Accepted') {
    const existingBlock = db.prepare('SELECT id FROM availability_blocks WHERE booking_id = ?').get(id);
    if (!existingBlock) {
      db.prepare(
        'INSERT INTO availability_blocks (equipment_id, start_date, end_date, reason, booking_id) VALUES (?, ?, ?, ?, ?)'
      ).run(
        Number(existing.equipment_id),
        String(existing.start_date),
        String(existing.end_date),
        `Confirmed booking #${id}`,
        id
      );
    }
    if (existing.job_request_id) {
      db.prepare("UPDATE job_requests SET status = 'fulfilled' WHERE id = ?").run(Number(existing.job_request_id));
    }
  } else if (nextStatus === 'Cancelled' || nextStatus === 'Rejected' || nextStatus === 'Completed') {
    db.prepare('DELETE FROM availability_blocks WHERE booking_id = ?').run(id);
  }

  const targetNotifyUser = isOwner ? Number(existing.renter_id) : Number(existing.owner_id);
  const linkPath = isOwner ? '/renter/bookings' : '/owner/bookings';
  createNotification(
    targetNotifyUser,
    'booking_status',
    `Rental request #${id} updated to "${nextStatus}"`,
    `Booking for ${existing.start_date} to ${existing.end_date} is now ${nextStatus}.`,
    linkPath
  );

  res.json({ rentalRequest: db.prepare('SELECT * FROM rental_requests WHERE id = ?').get(id) });
});

// In-App Enquiries
app.get('/api/enquiries', requireAuth, (req: AuthedRequest, res) => {
  const userId = req.user!.id;
  const equipmentId = req.query.equipmentId ? Number(req.query.equipmentId) : null;

  let query = `
    SELECT e.*, l.title as equipment_title,
           s.name as sender_name, r.name as recipient_name
    FROM enquiries e
    JOIN equipment_listings l ON l.id = e.equipment_id
    JOIN users s ON s.id = e.sender_id
    JOIN users r ON r.id = e.recipient_id
    WHERE (e.sender_id = ? OR e.recipient_id = ?)
  `;
  const params: Array<number> = [userId, userId];

  if (equipmentId) {
    query += ' AND e.equipment_id = ?';
    params.push(equipmentId);
  }
  query += ' ORDER BY e.id DESC';

  const rows = db.prepare(query).all(...params);
  res.json({ enquiries: rows });
});

app.post('/api/enquiries', requireAuth, (req: AuthedRequest, res) => {
  const { equipmentId, rentalRequestId, recipientId, message } = req.body ?? {};
  if (!equipmentId || !message || !String(message).trim()) {
    res.status(400).json({ error: 'Equipment ID and message are required.' });
    return;
  }

  const listing = db.prepare('SELECT id, owner_id, title FROM equipment_listings WHERE id = ?').get(Number(equipmentId)) as
    | { id: number; owner_id: number; title: string }
    | undefined;
  if (!listing) {
    res.status(404).json({ error: 'Equipment not found.' });
    return;
  }

  const targetRecipient = recipientId ? Number(recipientId) : listing.owner_id;
  if (targetRecipient === req.user!.id) {
    res.status(400).json({ error: 'Cannot send an enquiry to yourself.' });
    return;
  }

  const now = new Date().toISOString();
  const result = db
    .prepare(
      'INSERT INTO enquiries (equipment_id, rental_request_id, sender_id, recipient_id, message, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .run(
      listing.id,
      rentalRequestId ? Number(rentalRequestId) : null,
      req.user!.id,
      targetRecipient,
      String(message).trim(),
      now
    );

  createNotification(
    targetRecipient,
    'enquiry',
    `New enquiry on ${listing.title}`,
    `${req.user!.name}: "${String(message).trim().slice(0, 90)}"`,
    targetRecipient === listing.owner_id ? '/owner/enquiries' : '/renter/bookings'
  );

  res.status(201).json({
    enquiry: db.prepare('SELECT * FROM enquiries WHERE id = ?').get(Number(result.lastInsertRowid)),
  });
});

// Notifications
app.get('/api/notifications', requireAuth, (req: AuthedRequest, res) => {
  const rows = db
    .prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 50')
    .all(req.user!.id) as Array<Record<string, unknown>>;
  const unreadCount = rows.filter((n) => !n.is_read).length;
  res.json({
    notifications: rows.map((r) => ({ ...r, is_read: Boolean(r.is_read) })),
    unreadCount,
  });
});

app.patch('/api/notifications/:id/read', requireAuth, (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(id, req.user!.id);
  res.json({ ok: true });
});

app.post('/api/notifications/read-all', requireAuth, (req: AuthedRequest, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.user!.id);
  res.json({ ok: true });
});

// Reporting & Disputes
app.post('/api/reports', requireAuth, (req: AuthedRequest, res) => {
  const { equipmentId, rentalRequestId, reason, details } = req.body ?? {};
  if (!reason || !details) {
    res.status(400).json({ error: 'Reason and details are required to submit a report.' });
    return;
  }
  const now = new Date().toISOString();
  const result = db
    .prepare(
      'INSERT INTO reports (reporter_id, equipment_id, rental_request_id, reason, details, status, admin_notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    )
    .run(
      req.user!.id,
      equipmentId ? Number(equipmentId) : null,
      rentalRequestId ? Number(rentalRequestId) : null,
      String(reason).trim(),
      String(details).trim(),
      'Open',
      '',
      now
    );

  res.status(201).json({
    report: db.prepare('SELECT * FROM reports WHERE id = ?').get(Number(result.lastInsertRowid)),
  });
});

// Administrator Routes (Strictly Protected — 403 for ordinary users)
app.get('/api/admin/overview', requireRole('admin'), (_req, res) => {
  const users = db
    .prepare('SELECT id, name, email, role, phone, city, created_at FROM users ORDER BY id DESC')
    .all();

  const listings = db
    .prepare(
      `SELECT l.id, l.title, l.location_city, l.daily_rate, l.availability_status, l.is_sample, l.is_removed,
              l.is_verified_machinery, l.verification_badge_tier, l.verification_certificate_id, l.replacement_value_inr,
              c.name as category_name, c.sector as category_sector, u.name as owner_name, u.email as owner_email
       FROM equipment_listings l
       JOIN equipment_categories c ON c.id = l.category_id
       JOIN users u ON u.id = l.owner_id
       ORDER BY l.id DESC`
    )
    .all();

  const reports = db
    .prepare(
      `SELECT rep.*, u.name as reporter_name, u.email as reporter_email,
              l.title as equipment_title, l.is_removed as equipment_is_removed
       FROM reports rep
       JOIN users u ON u.id = rep.reporter_id
       LEFT JOIN equipment_listings l ON l.id = rep.equipment_id
       ORDER BY rep.id DESC`
    )
    .all();

  const maintenanceSubmissions = db
    .prepare(
      `SELECT mr.*, l.title as equipment_title, u.name as owner_name
       FROM maintenance_records mr
       JOIN equipment_listings l ON l.id = mr.equipment_id
       JOIN users u ON u.id = l.owner_id
       ORDER BY mr.id DESC`
    )
    .all();

  const escrowTransactions = db
    .prepare(
      `SELECT e.*, r.start_date, r.end_date, r.status as booking_status,
              l.title as equipment_title, renter.name as renter_name, owner.name as owner_name
       FROM escrow_transactions e
       JOIN rental_requests r ON r.id = e.rental_request_id
       JOIN equipment_listings l ON l.id = r.equipment_id
       JOIN users renter ON renter.id = e.renter_id
       JOIN users owner ON owner.id = e.owner_id
       ORDER BY e.id DESC`
    )
    .all();

  res.json({ users, listings, reports, maintenanceSubmissions, escrowTransactions });
});

app.patch('/api/admin/reports/:id', requireRole('admin'), (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const { status, adminNotes, removeListing } = req.body ?? {};

  const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(id) as
    | { id: number; equipment_id: number | null }
    | undefined;
  if (!report) {
    res.status(404).json({ error: 'Report not found.' });
    return;
  }

  const valid = ['Open', 'Under Review', 'Resolved', 'Listing Removed'];
  const nextStatus = valid.includes(status) ? status : 'Under Review';
  const resolvedAt = nextStatus === 'Resolved' || nextStatus === 'Listing Removed' ? new Date().toISOString() : null;

  db.prepare('UPDATE reports SET status = ?, admin_notes = ?, resolved_at = ? WHERE id = ?').run(
    nextStatus,
    String(adminNotes || '').trim(),
    resolvedAt,
    id
  );

  if (removeListing && report.equipment_id) {
    db.prepare("UPDATE equipment_listings SET is_removed = 1, availability_status = 'paused' WHERE id = ?").run(
      report.equipment_id
    );
  }

  res.json({ ok: true });
});

app.patch('/api/admin/equipment/:id/moderate', requireRole('admin'), (req, res) => {
  const id = Number(req.params.id);
  const { isRemoved } = req.body ?? {};
  db.prepare('UPDATE equipment_listings SET is_removed = ? WHERE id = ?').run(isRemoved ? 1 : 0, id);
  res.json({ ok: true });
});

app.patch('/api/admin/equipment/:id/verify', requireRole('admin'), (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const { verified, tier } = req.body ?? {};
  const listing = db
    .prepare('SELECT id, owner_id, title, verification_certificate_id FROM equipment_listings WHERE id = ?')
    .get(id) as { id: number; owner_id: number; title: string; verification_certificate_id: string } | undefined;

  if (!listing) {
    res.status(404).json({ error: 'Equipment listing not found.' });
    return;
  }

  const now = new Date().toISOString();
  const isVerified = Boolean(verified);
  const nextTier = isVerified
    ? 'udaya_verified'
    : tier === 'documents_reviewed'
      ? 'documents_reviewed'
      : 'unverified';
  const certId = isVerified
    ? listing.verification_certificate_id || `UDY-CERT-${crypto.randomInt(1000, 9999)}`
    : '';

  db.prepare(
    `UPDATE equipment_listings
     SET is_verified_machinery = ?, verification_badge_tier = ?, verification_certificate_id = ?, verified_at = ?, updated_at = ?
     WHERE id = ?`
  ).run(isVerified ? 1 : 0, nextTier, certId, isVerified ? now : null, now, id);

  createNotification(
    listing.owner_id,
    'verification_badge',
    isVerified ? `Verified Machinery Badge granted: ${listing.title}` : `Verification status updated: ${listing.title}`,
    isVerified
      ? `Your listing passed administrator inspection and now displays the Udaya Verified Machinery Badge (${certId}).`
      : `Verification badge status was set to ${nextTier}.`,
    `/equipment/${listing.id}`
  );

  res.json({ ok: true, isVerified, verificationBadgeTier: nextTier, certificateId: certId });
});

app.patch('/api/admin/maintenance/:id/verify', requireRole('admin'), (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const record = db.prepare('SELECT * FROM maintenance_records WHERE id = ?').get(id) as
    | { id: number; equipment_id: number; document_name: string }
    | undefined;
  if (!record) {
    res.status(404).json({ error: 'Maintenance record not found.' });
    return;
  }
  if (!record.document_name) {
    res.status(400).json({
      error: 'Only maintenance records with submitted supporting documents can be marked Independently verified.',
    });
    return;
  }
  const now = new Date().toISOString();
  db.prepare(
    "UPDATE maintenance_records SET verification_status = 'Independently verified', verified_by_admin_id = ? WHERE id = ?"
  ).run(req.user!.id, id);

  const certId = `UDY-CERT-${crypto.randomInt(1000, 9999)}`;
  db.prepare(
    `UPDATE equipment_listings
     SET is_verified_machinery = 1,
         verification_badge_tier = 'udaya_verified',
         verification_certificate_id = CASE WHEN verification_certificate_id = '' THEN ? ELSE verification_certificate_id END,
         verified_at = COALESCE(verified_at, ?),
         updated_at = ?
     WHERE id = ?`
  ).run(certId, now, now, record.equipment_id);

  res.json({ ok: true });
});

// =========================================================================
// ESCROW PAYMENTS WORKFLOW (Protected, Server-Authoritative Ledger)
// =========================================================================
function recordEscrowEvent(
  escrowId: number,
  actorUserId: number,
  actorRole: string,
  eventType: string,
  note: string
): void {
  db.prepare(
    'INSERT INTO escrow_events (escrow_id, actor_user_id, actor_role, event_type, note, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(escrowId, actorUserId, actorRole, eventType, note, new Date().toISOString());
}

app.get('/api/escrow/booking/:bookingId', requireAuth, (req: AuthedRequest, res) => {
  const bookingId = Number(req.params.bookingId);
  const booking = db.prepare('SELECT * FROM rental_requests WHERE id = ?').get(bookingId) as
    | Record<string, unknown>
    | undefined;
  if (!booking) {
    res.status(404).json({ error: 'Booking not found.' });
    return;
  }
  if (
    Number(booking.renter_id) !== req.user!.id &&
    Number(booking.owner_id) !== req.user!.id &&
    req.user!.role !== 'admin'
  ) {
    res.status(403).json({ error: 'Unauthorized to view this escrow record.' });
    return;
  }

  const escrow = db.prepare('SELECT * FROM escrow_transactions WHERE rental_request_id = ?').get(bookingId) as
    | { id: number }
    | undefined;
  const events = escrow
    ? db
        .prepare(
          `SELECT ev.*, u.name as actor_name
           FROM escrow_events ev
           LEFT JOIN users u ON u.id = ev.actor_user_id
           WHERE ev.escrow_id = ?
           ORDER BY ev.id ASC`
        )
        .all(escrow.id)
    : [];

  res.json({ escrow: escrow || null, events });
});

app.post('/api/escrow/:bookingId/fund', requireAuth, (req: AuthedRequest, res) => {
  const bookingId = Number(req.params.bookingId);
  const booking = db.prepare('SELECT * FROM rental_requests WHERE id = ?').get(bookingId) as
    | Record<string, unknown>
    | undefined;
  if (!booking) {
    res.status(404).json({ error: 'Booking not found.' });
    return;
  }
  if (Number(booking.renter_id) !== req.user!.id) {
    res.status(403).json({ error: 'Only the renter who submitted this request can fund escrow.' });
    return;
  }
  if (!['Quotation received', 'Accepted', 'Request submitted', 'Owner reviewing'].includes(String(booking.status))) {
    res.status(400).json({ error: `Cannot fund escrow when booking status is "${booking.status}".` });
    return;
  }

  // Ensure calendar dates are still conflict-free before funding & locking booking
  if (String(booking.status) !== 'Accepted') {
    const conflict = hasEquipmentDateConflict(
      Number(booking.equipment_id),
      String(booking.start_date),
      String(booking.end_date),
      bookingId
    );
    if (conflict.conflict) {
      res.status(409).json({ error: `Cannot fund escrow due to overlapping dates: ${conflict.reason}` });
      return;
    }
  }

  const existingEscrow = db
    .prepare('SELECT * FROM escrow_transactions WHERE rental_request_id = ?')
    .get(bookingId) as { id: number; status: string } | undefined;
  if (existingEscrow && existingEscrow.status !== 'pending_funding') {
    res.status(409).json({ error: 'Escrow is already funded for this booking.' });
    return;
  }

  const allowedMethods = ['UPI Escrow', 'Bank Transfer (NEFT/RTGS)', 'Corporate Card'];
  const rawMethod = String(req.body?.paymentMethod || 'UPI Escrow');
  const paymentMethod = allowedMethods.includes(rawMethod) ? rawMethod : 'UPI Escrow';

  const rentalAmount =
    Number(booking.base_rental_total || 0) +
    Number(booking.transport_charge || 0) +
    Number(booking.operator_charge || 0) +
    Number(booking.fuel_charge || 0) +
    Number(booking.other_charge || 0);
  const depositAmount = Number(booking.deposit_amount || 0);
  const platformFee = Math.round(rentalAmount * 0.05);
  const totalFunded = rentalAmount + depositAmount;
  const now = new Date().toISOString();
  const escrowRef = `ESC-UDY-${new Date().getFullYear()}-${crypto.randomInt(10000, 99999)}`;

  let escrowId: number;
  if (existingEscrow) {
    db.prepare(
      `UPDATE escrow_transactions
       SET rental_amount = ?, deposit_amount = ?, platform_fee = ?, total_funded = ?,
           payment_method = ?, status = 'funded_held', funded_at = ?, updated_at = ?
       WHERE id = ?`
    ).run(rentalAmount, depositAmount, platformFee, totalFunded, paymentMethod, now, now, existingEscrow.id);
    escrowId = existingEscrow.id;
  } else {
    const insertRes = db
      .prepare(
        `INSERT INTO escrow_transactions (
          rental_request_id, renter_id, owner_id, escrow_ref, rental_amount, deposit_amount,
          platform_fee, total_funded, payment_method, status, funded_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'funded_held', ?, ?, ?)`
      )
      .run(
        bookingId,
        Number(booking.renter_id),
        Number(booking.owner_id),
        escrowRef,
        rentalAmount,
        depositAmount,
        platformFee,
        totalFunded,
        paymentMethod,
        now,
        now,
        now
      );
    escrowId = Number(insertRes.lastInsertRowid);
  }

  recordEscrowEvent(
    escrowId,
    req.user!.id,
    req.user!.role,
    'FUNDED',
    `Renter funded ₹${Math.round(totalFunded).toLocaleString('en-IN')} into Udaya Escrow via ${paymentMethod} (Rental ₹${Math.round(rentalAmount).toLocaleString('en-IN')} + Refundable Deposit ₹${Math.round(depositAmount).toLocaleString('en-IN')}).`
  );

  // Confirm booking and lock dates in availability_blocks
  db.prepare(
    `UPDATE rental_requests
     SET status = 'Accepted', payment_status = 'Escrow Funded (Held Safely)', updated_at = ?
     WHERE id = ?`
  ).run(now, bookingId);

  const existingBlock = db.prepare('SELECT id FROM availability_blocks WHERE booking_id = ?').get(bookingId);
  if (!existingBlock) {
    db.prepare(
      'INSERT INTO availability_blocks (equipment_id, start_date, end_date, reason, booking_id) VALUES (?, ?, ?, ?, ?)'
    ).run(
      Number(booking.equipment_id),
      String(booking.start_date),
      String(booking.end_date),
      `Escrow-confirmed booking #${bookingId}`,
      bookingId
    );
  }

  createNotification(
    Number(booking.owner_id),
    'escrow_funded',
    `Escrow funded for Booking #${bookingId}`,
    `${req.user!.name} placed ₹${Math.round(totalFunded).toLocaleString('en-IN')} into Udaya Escrow. Safe to dispatch equipment on ${booking.start_date}.`,
    '/owner/bookings'
  );

  const escrow = db.prepare('SELECT * FROM escrow_transactions WHERE id = ?').get(escrowId);
  res.status(201).json({ escrow });
});

app.post('/api/escrow/:bookingId/confirm-handover', requireAuth, (req: AuthedRequest, res) => {
  const bookingId = Number(req.params.bookingId);
  const escrow = db.prepare('SELECT * FROM escrow_transactions WHERE rental_request_id = ?').get(bookingId) as
    | { id: number; renter_id: number; owner_id: number; status: string }
    | undefined;
  if (!escrow) {
    res.status(404).json({ error: 'No escrow record found for this booking.' });
    return;
  }
  if (escrow.renter_id !== req.user!.id && escrow.owner_id !== req.user!.id) {
    res.status(403).json({ error: 'Unauthorized.' });
    return;
  }
  if (escrow.status !== 'funded_held') {
    res.status(400).json({ error: `Handover can only be confirmed when escrow is held (current: ${escrow.status}).` });
    return;
  }

  const now = new Date().toISOString();
  db.prepare(
    `UPDATE escrow_transactions SET status = 'handover_confirmed', handover_confirmed_at = ?, updated_at = ? WHERE id = ?`
  ).run(now, now, escrow.id);
  db.prepare(
    `UPDATE rental_requests SET payment_status = 'Escrow Held · Equipment Handover Confirmed', updated_at = ? WHERE id = ?`
  ).run(now, bookingId);

  recordEscrowEvent(
    escrow.id,
    req.user!.id,
    req.user!.role,
    'HANDOVER_CONFIRMED',
    `${req.user!.name} (${req.user!.role}) confirmed safe equipment handover and site/lab inspection.`
  );

  const otherUser = req.user!.id === escrow.owner_id ? escrow.renter_id : escrow.owner_id;
  createNotification(
    otherUser,
    'escrow_handover',
    `Equipment handover confirmed on Booking #${bookingId}`,
    `Escrow funds remain securely held until equipment return & release.`,
    otherUser === escrow.owner_id ? '/owner/bookings' : '/renter/bookings'
  );

  res.json({ escrow: db.prepare('SELECT * FROM escrow_transactions WHERE id = ?').get(escrow.id) });
});

app.post('/api/escrow/:bookingId/release', requireAuth, (req: AuthedRequest, res) => {
  const bookingId = Number(req.params.bookingId);
  const escrow = db.prepare('SELECT * FROM escrow_transactions WHERE rental_request_id = ?').get(bookingId) as
    | {
        id: number;
        renter_id: number;
        owner_id: number;
        rental_amount: number;
        deposit_amount: number;
        platform_fee: number;
        status: string;
      }
    | undefined;
  if (!escrow) {
    res.status(404).json({ error: 'No escrow record found for this booking.' });
    return;
  }
  if (escrow.renter_id !== req.user!.id && req.user!.role !== 'admin') {
    res.status(403).json({ error: 'Only the renter (or an administrator) can release held escrow funds.' });
    return;
  }
  if (!['funded_held', 'handover_confirmed'].includes(escrow.status)) {
    res.status(400).json({ error: `Escrow cannot be released from status "${escrow.status}".` });
    return;
  }

  const now = new Date().toISOString();
  const ownerNet = Math.max(0, escrow.rental_amount - escrow.platform_fee);
  db.prepare(
    `UPDATE escrow_transactions SET status = 'released_to_owner', released_at = ?, updated_at = ? WHERE id = ?`
  ).run(now, now, escrow.id);
  db.prepare(
    `UPDATE rental_requests SET status = 'Completed', payment_status = 'Escrow Released · Deposit Refunded', updated_at = ? WHERE id = ?`
  ).run(now, bookingId);
  db.prepare('DELETE FROM availability_blocks WHERE booking_id = ?').run(bookingId);

  recordEscrowEvent(
    escrow.id,
    req.user!.id,
    req.user!.role,
    'RELEASED',
    `Released ₹${Math.round(ownerNet).toLocaleString('en-IN')} net payout to owner (5% escrow fee: ₹${Math.round(escrow.platform_fee).toLocaleString('en-IN')}) and refunded ₹${Math.round(escrow.deposit_amount).toLocaleString('en-IN')} security deposit to renter.`
  );

  createNotification(
    escrow.owner_id,
    'escrow_released',
    `Escrow payout released for Booking #${bookingId}`,
    `₹${Math.round(ownerNet).toLocaleString('en-IN')} has been released to your account following return confirmation.`,
    '/owner/bookings'
  );

  res.json({ escrow: db.prepare('SELECT * FROM escrow_transactions WHERE id = ?').get(escrow.id) });
});

app.post('/api/escrow/:bookingId/dispute', requireAuth, (req: AuthedRequest, res) => {
  const bookingId = Number(req.params.bookingId);
  const reason = String(req.body?.reason || '').trim();
  if (!reason) {
    res.status(400).json({ error: 'Please explain the issue to freeze escrow funds for dispute review.' });
    return;
  }
  const escrow = db.prepare('SELECT * FROM escrow_transactions WHERE rental_request_id = ?').get(bookingId) as
    | { id: number; renter_id: number; owner_id: number; status: string }
    | undefined;
  if (!escrow) {
    res.status(404).json({ error: 'No escrow record found for this booking.' });
    return;
  }
  if (escrow.renter_id !== req.user!.id && escrow.owner_id !== req.user!.id) {
    res.status(403).json({ error: 'Unauthorized.' });
    return;
  }
  if (!['funded_held', 'handover_confirmed'].includes(escrow.status)) {
    res.status(400).json({ error: 'Disputes can only be opened while escrow funds are held.' });
    return;
  }

  const now = new Date().toISOString();
  db.prepare(
    `UPDATE escrow_transactions SET status = 'disputed', dispute_reason = ?, updated_at = ? WHERE id = ?`
  ).run(reason, now, escrow.id);
  db.prepare(
    `UPDATE rental_requests SET payment_status = 'Escrow Frozen (Dispute Under Admin Review)', updated_at = ? WHERE id = ?`
  ).run(now, bookingId);

  recordEscrowEvent(escrow.id, req.user!.id, req.user!.role, 'DISPUTED', `Dispute opened: ${reason}`);

  const booking = db.prepare('SELECT equipment_id FROM rental_requests WHERE id = ?').get(bookingId) as
    | { equipment_id: number }
    | undefined;
  db.prepare(
    'INSERT INTO reports (reporter_id, equipment_id, rental_request_id, reason, details, status, admin_notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(req.user!.id, booking?.equipment_id ?? null, bookingId, 'Escrow payment dispute', reason, 'Open', '', now);

  res.json({ escrow: db.prepare('SELECT * FROM escrow_transactions WHERE id = ?').get(escrow.id) });
});

app.post('/api/admin/escrow/:bookingId/resolve', requireRole('admin'), (req: AuthedRequest, res) => {
  const bookingId = Number(req.params.bookingId);
  const resolution = req.body?.resolution === 'refunded_to_renter' ? 'refunded_to_renter' : 'released_to_owner';
  const note = String(req.body?.note || '').trim() || `Administrator resolved escrow as ${resolution}.`;

  const escrow = db.prepare('SELECT * FROM escrow_transactions WHERE rental_request_id = ?').get(bookingId) as
    | { id: number; renter_id: number; owner_id: number; status: string }
    | undefined;
  if (!escrow) {
    res.status(404).json({ error: 'Escrow record not found.' });
    return;
  }

  const now = new Date().toISOString();
  db.prepare(
    `UPDATE escrow_transactions SET status = ?, released_at = ?, updated_at = ? WHERE id = ?`
  ).run(resolution, now, now, escrow.id);

  const nextPaymentStatus =
    resolution === 'refunded_to_renter'
      ? 'Escrow Refunded to Renter (Admin Resolved)'
      : 'Escrow Released to Owner (Admin Resolved)';
  const nextBookingStatus = resolution === 'refunded_to_renter' ? 'Cancelled' : 'Completed';

  db.prepare('UPDATE rental_requests SET status = ?, payment_status = ?, updated_at = ? WHERE id = ?').run(
    nextBookingStatus,
    nextPaymentStatus,
    now,
    bookingId
  );
  db.prepare('DELETE FROM availability_blocks WHERE booking_id = ?').run(bookingId);

  recordEscrowEvent(escrow.id, req.user!.id, 'admin', 'ADMIN_RESOLVED', note);

  createNotification(escrow.renter_id, 'escrow_resolved', `Escrow resolved for Booking #${bookingId}`, note, '/renter/bookings');
  createNotification(escrow.owner_id, 'escrow_resolved', `Escrow resolved for Booking #${bookingId}`, note, '/owner/bookings');

  res.json({ ok: true, resolution });
});

// =========================================================================
// MULTILINGUAL VOICE ASSISTANT ROUTES (Server-Side @google/genai)
// =========================================================================
app.post('/api/voice/transcribe', async (req, res) => {
  try {
    const { audioBase64, mimeType, languageName } = req.body ?? {};
    if (!audioBase64 || typeof audioBase64 !== 'string') {
      res.status(400).json({ error: 'Audio payload is required for transcription.' });
      return;
    }
    const transcript = await transcribeAudioWithGemini(
      audioBase64,
      String(mimeType || 'audio/webm'),
      String(languageName || 'English')
    );
    res.json({ transcript });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unable to transcribe audio.';
    res.status(502).json({ error: msg });
  }
});

app.post('/api/voice/assist', async (req, res) => {
  try {
    const { query, languageCode, languageName, currentPath } = req.body ?? {};
    if (!query || !String(query).trim()) {
      res.status(400).json({ error: 'Voice or text query is required.' });
      return;
    }

    const categories = db
      .prepare('SELECT slug, name, sector FROM equipment_categories WHERE is_active = 1 ORDER BY sort_order ASC')
      .all() as Array<{ slug: string; name: string; sector: string }>;

    const listings = db
      .prepare(
        `SELECT l.id, l.title, c.name as category_name, c.slug as category_slug, c.sector,
                l.location_city, l.daily_rate, l.replacement_value_inr, l.is_verified_machinery, l.availability_status,
                l.image_url
         FROM equipment_listings l
         JOIN equipment_categories c ON c.id = l.category_id
         WHERE l.is_removed = 0 AND l.availability_status != 'paused'
         ORDER BY l.is_verified_machinery DESC, l.id DESC
         LIMIT 30`
      )
      .all() as Array<{
      id: number;
      title: string;
      category_name: string;
      category_slug: string;
      sector: string;
      location_city: string;
      daily_rate: number;
      replacement_value_inr: number | null;
      is_verified_machinery: number;
      availability_status: string;
      image_url: string;
    }>;

    const result = await runVoiceAssistantWithGemini({
      query: String(query).trim(),
      languageCode: String(languageCode || 'en'),
      languageName: String(languageName || 'English'),
      currentPath: String(currentPath || '/'),
      categories,
      catalog: listings.map((l) => ({
        id: l.id,
        title: l.title,
        category_name: l.category_name,
        category_slug: l.category_slug,
        sector: l.sector,
        location_city: l.location_city,
        daily_rate: l.daily_rate,
        replacement_value_inr: l.replacement_value_inr,
        is_verified_machinery: Boolean(l.is_verified_machinery),
        availability_status: l.availability_status,
      })),
    });

    const recommendedItems = listings
      .filter((l) => result.recommendedIds.includes(l.id))
      .map((l) => ({
        id: l.id,
        title: l.title,
        category_name: l.category_name,
        location_city: l.location_city,
        daily_rate: l.daily_rate,
        is_verified_machinery: Boolean(l.is_verified_machinery),
        image_url: l.image_url,
      }));

    res.json({
      replyText: result.replyText,
      action: result.action,
      recommendedItems,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Voice assistant request failed.';
    res.status(502).json({ error: msg });
  }
});

app.post('/api/voice/speak', async (req, res) => {
  try {
    const { text, languageName } = req.body ?? {};
    if (!text || !String(text).trim()) {
      res.status(400).json({ error: 'Text is required for speech output.' });
      return;
    }
    const audioBase64 = await synthesizeSpeechWithGemini(
      String(text).trim(),
      String(languageName || 'English')
    );
    res.json({ audioBase64, mimeType: 'audio/wav' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Text-to-speech failed.';
    res.status(502).json({ error: msg });
  }
});

// =========================================================================
// MULTI-TURN GROUNDED CHATBOT (General, Fast Flash Lite, Google Search, Google Maps)
// =========================================================================
function buildLiveCatalogSummary(): string {
  const listings = db
    .prepare(
      `SELECT l.id, l.title, c.name as category_name, c.sector, l.location_city, l.location_area,
              l.daily_rate, l.is_verified_machinery, l.rent_only_high_capex, l.availability_status
       FROM equipment_listings l
       JOIN equipment_categories c ON c.id = l.category_id
       WHERE l.is_removed = 0 AND l.availability_status != 'paused'
       ORDER BY l.is_verified_machinery DESC, l.id DESC
       LIMIT 24`
    )
    .all() as Array<{
    id: number;
    title: string;
    category_name: string;
    sector: string;
    location_city: string;
    location_area: string;
    daily_rate: number;
    is_verified_machinery: number;
    rent_only_high_capex: number;
    availability_status: string;
  }>;

  return listings
    .map(
      (l) =>
        `[#${l.id}] ${l.title} (${l.category_name}, ${l.sector}) — ${l.location_area ? `${l.location_area}, ` : ''}${l.location_city} — INR ${l.daily_rate}/day${l.is_verified_machinery ? ' [Udaya Verified]' : ''}${l.rent_only_high_capex ? ' [High-Capex Rent-Only]' : ''} — ${l.availability_status}`
    )
    .join('\n');
}

app.post('/api/chat/message', async (req, res) => {
  try {
    const { message, history, mode, languageName, latLng } = req.body ?? {};
    if (!message || !String(message).trim()) {
      res.status(400).json({ error: 'Message text is required.' });
      return;
    }

    const cleanHistory: GroundedChatTurn[] = Array.isArray(history)
      ? history
          .filter(
            (h): h is GroundedChatTurn =>
              Boolean(h) && (h.role === 'user' || h.role === 'assistant') && typeof h.text === 'string'
          )
          .slice(-14)
      : [];

    const safeMode: GroundedChatMode = ['general', 'fast', 'search', 'maps'].includes(mode)
      ? mode
      : 'general';

    const parsedLatLng =
      latLng &&
      typeof latLng.latitude === 'number' &&
      typeof latLng.longitude === 'number' &&
      Number.isFinite(latLng.latitude) &&
      Number.isFinite(latLng.longitude)
        ? { latitude: latLng.latitude, longitude: latLng.longitude }
        : null;

    const result = await runGroundedChatWithGemini({
      history: cleanHistory,
      message: String(message).trim(),
      mode: safeMode,
      languageName: String(languageName || 'English'),
      latLng: parsedLatLng,
      catalogSummary: buildLiveCatalogSummary(),
    });

    res.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unable to process AI chat request.';
    res.status(502).json({ error: msg });
  }
});

// =========================================================================
// REAL-TIME GEMINI LIVE API VOICE BRIDGE (ws -> gemini-3.8-live)
// =========================================================================
function attachLiveVoiceBridge(httpServer: http.Server) {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (request, socket, head) => {
    try {
      const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
      if (url.pathname === '/api/live-voice') {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request, url);
        });
      }
    } catch {
      socket.destroy();
    }
  });

  wss.on('connection', async (clientWs: WebSocket, _req: http.IncomingMessage, url: URL) => {
    const languageName = (url.searchParams.get('lang') || 'English').slice(0, 40);
    const voiceName = (url.searchParams.get('voice') || 'Zephyr').slice(0, 24);
    const allowedVoices = new Set(['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr']);
    const selectedVoice = allowedVoices.has(voiceName) ? voiceName : 'Zephyr';

    let liveSession: Awaited<ReturnType<ReturnType<typeof getGeminiClient>['live']['connect']>> | null = null;
    let isClosed = false;

    const safeSend = (payload: Record<string, unknown>) => {
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify(payload));
      }
    };

    try {
      const ai = getGeminiClient();
      const catalogSummary = buildLiveCatalogSummary();

      liveSession = await ai.live.connect({
        model: 'gemini-3.8-live',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: selectedVoice },
            },
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: `You are Udaya Live Voice Advisor for the Udaya Zero-Idle Equipment & High-Capex Lab Marketplace.
Speak naturally, concisely, and warmly in ${languageName}. Keep spoken answers brief (1-3 sentences per turn) like a real phone conversation.
Help users compare construction machinery (excavators, JCBs, concrete mixers, generators) and high-capex rent-only lab/industrial equipment (HPLC spectrometers, confocal microscopes, 5-axis CNC, LiDAR scanners), explain Udaya Verified Machinery certificates, and walk through Escrow Protection and Zero-Idle matching.
Ground your recommendations strictly in this live catalog:
${catalogSummary}`,
        },
        callbacks: {
          onopen: () => {
            safeSend({ type: 'ready', voice: selectedVoice, language: languageName });
          },
          onmessage: (message: {
            serverContent?: {
              interrupted?: boolean;
              turnComplete?: boolean;
              inputTranscription?: { text?: string };
              outputTranscription?: { text?: string };
              modelTurn?: {
                parts?: Array<{
                  inlineData?: { data?: string; mimeType?: string };
                  text?: string;
                }>;
              };
            };
          }) => {
            const sc = message.serverContent;

            if (!sc) return;

            if (sc.interrupted) {
              safeSend({ type: 'interrupted' });
            }
            if (sc.inputTranscription?.text) {
              safeSend({ type: 'input_transcript', text: sc.inputTranscription.text });
            }
            if (sc.outputTranscription?.text) {
              safeSend({ type: 'output_transcript', text: sc.outputTranscription.text });
            }
            if (sc.modelTurn?.parts) {
              for (const part of sc.modelTurn.parts) {
                if (part.inlineData?.data) {
                  safeSend({
                    type: 'audio',
                    data: part.inlineData.data,
                    mimeType: part.inlineData.mimeType || 'audio/pcm;rate=24000',
                  });
                }
              }
            }
            if (sc.turnComplete) {
              safeSend({ type: 'turn_complete' });
            }
          },
          onerror: (err: unknown) => {
            const errMsg = err instanceof Error ? err.message : 'Live voice stream encountered an error.';
            safeSend({ type: 'error', error: errMsg });
          },
          onclose: () => {
            if (!isClosed) {
              safeSend({ type: 'closed' });
            }
          },
        },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to start Gemini Live session.';
      safeSend({ type: 'error', error: msg });
      clientWs.close();
      return;
    }

    clientWs.on('message', (rawData) => {
      if (!liveSession || isClosed) return;
      try {
        const parsed = JSON.parse(String(rawData)) as {
          type?: string;
          data?: string;
          text?: string;
        };
        if (parsed.type === 'audio' && typeof parsed.data === 'string' && parsed.data.length > 0) {
          liveSession.sendRealtimeInput({
            audio: {
              data: parsed.data,
              mimeType: 'audio/pcm;rate=16000',
            },
          });
        } else if (parsed.type === 'text' && typeof parsed.text === 'string' && parsed.text.trim()) {
          liveSession.sendClientContent({
            turns: parsed.text.trim().slice(0, 1000),
            turnComplete: true,
          });
        }
      } catch {
        // Ignore malformed client frames
      }
    });

    clientWs.on('close', () => {
      isClosed = true;
      try {
        liveSession?.close();
      } catch {
        // Ignore close error
      }
      liveSession = null;
    });
  });
}

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  const httpServer = http.createServer(app);
  attachLiveVoiceBridge(httpServer);

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Udaya server running on http://localhost:${PORT}`);
  });
}

startServer();
