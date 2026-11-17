import { db } from './db.ts';
import { getCityCoordinates, haversineKm } from './geo.ts';

export function addDaysToIsoDate(startDate: string, durationDays: number): string {
  const date = new Date(`${startDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + Math.max(0, durationDays - 1));
  return date.toISOString().slice(0, 10);
}

export function datesOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  return startA <= endB && endA >= startB;
}

export function hasEquipmentDateConflict(
  equipmentId: number,
  startDate: string,
  endDate: string,
  excludeBookingId?: number
): { conflict: boolean; reason: string | null } {
  const blocks = db
    .prepare('SELECT id, start_date, end_date, reason, booking_id FROM availability_blocks WHERE equipment_id = ?')
    .all(equipmentId) as Array<{
    id: number;
    start_date: string;
    end_date: string;
    reason: string;
    booking_id: number | null;
  }>;

  for (const b of blocks) {
    if (excludeBookingId && b.booking_id === excludeBookingId) continue;
    if (datesOverlap(startDate, endDate, b.start_date, b.end_date)) {
      return {
        conflict: true,
        reason: `Blocked ${b.start_date} to ${b.end_date}: ${b.reason}`,
      };
    }
  }

  const accepted = db
    .prepare(
      `SELECT id, start_date, end_date FROM rental_requests
       WHERE equipment_id = ? AND status = 'Accepted'`
    )
    .all(equipmentId) as Array<{ id: number; start_date: string; end_date: string }>;

  for (const r of accepted) {
    if (excludeBookingId && r.id === excludeBookingId) continue;
    if (datesOverlap(startDate, endDate, r.start_date, r.end_date)) {
      return {
        conflict: true,
        reason: `Confirmed booking #${r.id} (${r.start_date} to ${r.end_date})`,
      };
    }
  }

  return { conflict: false, reason: null };
}

export interface JobMatchCandidate {
  equipmentId: number;
  ownerId: number;
  matchScore: number;
  matchReasons: string[];
  availabilityNote: string;
}

export function runRuleBasedMatching(jobRequestId: number): JobMatchCandidate[] {
  const job = db.prepare('SELECT * FROM job_requests WHERE id = ?').get(jobRequestId) as {
    id: number;
    renter_id: number;
    category_id: number;
    job_city: string;
    latitude: number | null;
    longitude: number | null;
    preferred_start_date: string;
    duration_days: number;
    budget_max: number | null;
    requires_operator: number;
    requires_transport: number;
  } | undefined;

  if (!job) return [];

  const jobEndDate = addDaysToIsoDate(job.preferred_start_date, job.duration_days);
  const jobCoords =
    job.latitude != null && job.longitude != null
      ? { lat: job.latitude, lon: job.longitude }
      : getCityCoordinates(job.job_city);

  const listings = db
    .prepare(
      `SELECT l.*, c.name as category_name
       FROM equipment_listings l
       JOIN equipment_categories c ON c.id = l.category_id
       WHERE l.is_removed = 0 AND l.availability_status = 'available' AND l.owner_id != ?`
    )
    .all(job.renter_id) as Array<{
    id: number;
    owner_id: number;
    category_id: number;
    category_name: string;
    title: string;
    location_city: string;
    latitude: number | null;
    longitude: number | null;
    service_radius_km: number;
    daily_rate: number;
    operator_available: number;
    operator_daily_charge: number | null;
    transport_available: number;
    transport_base_charge: number | null;
  }>;

  const candidates: JobMatchCandidate[] = [];

  for (const item of listings) {
    // 1. Strict category match required for primary match
    if (item.category_id !== job.category_id) continue;

    // 2. Date conflict check — never present conflicting equipment as available
    const conflict = hasEquipmentDateConflict(item.id, job.preferred_start_date, jobEndDate);
    if (conflict.conflict) continue;

    const reasons: string[] = [];
    let score = 40; // Base score for compatible category + no date conflicts

    reasons.push(`Category match: ${item.category_name}`);
    reasons.push(
      `No conflicting bookings on file for ${job.preferred_start_date} to ${jobEndDate} (owner confirmation pending)`
    );

    // 3. Location / service radius check
    const eqCoords =
      item.latitude != null && item.longitude != null
        ? { lat: item.latitude, lon: item.longitude }
        : getCityCoordinates(item.location_city);

    let withinRadius = true;
    if (job.job_city.trim().toLowerCase() === item.location_city.trim().toLowerCase()) {
      score += 30;
      reasons.push(`Located in ${item.location_city} (same city · within ${item.service_radius_km} km service radius)`);
    } else if (jobCoords && eqCoords) {
      const distKm = haversineKm(jobCoords.lat, jobCoords.lon, eqCoords.lat, eqCoords.lon);
      if (distKm <= item.service_radius_km) {
        score += 22;
        reasons.push(`Approx. ${distKm} km away from ${job.job_city} (within ${item.service_radius_km} km radius)`);
      } else if (distKm <= item.service_radius_km * 2) {
        score += 8;
        reasons.push(`Approx. ${distKm} km away (${item.location_city} — beyond standard ${item.service_radius_km} km radius; transport quote needed)`);
      } else {
        withinRadius = false;
      }
    } else {
      score += 10;
      reasons.push(`Listed in ${item.location_city} (distance unverified — confirm delivery with owner)`);
    }

    if (!withinRadius) continue;

    // 4. Budget evaluation
    const baseTotal = item.daily_rate * job.duration_days;
    const estOperator =
      job.requires_operator && item.operator_available && item.operator_daily_charge != null
        ? item.operator_daily_charge * job.duration_days
        : 0;
    const estTransport =
      job.requires_transport && item.transport_available && item.transport_base_charge != null
        ? item.transport_base_charge
        : 0;
    const estSubtotal = baseTotal + estOperator + estTransport;

    if (job.budget_max != null && job.budget_max > 0) {
      if (estSubtotal <= job.budget_max) {
        score += 15;
        reasons.push(`Estimated rental subtotal (₹${estSubtotal.toLocaleString('en-IN')}) fits within your ₹${job.budget_max.toLocaleString('en-IN')} budget`);
      } else if (baseTotal <= job.budget_max * 1.15) {
        score += 5;
        reasons.push(`Base rate ₹${baseTotal.toLocaleString('en-IN')} is near your ₹${job.budget_max.toLocaleString('en-IN')} budget (confirm extras with owner)`);
      } else {
        reasons.push(`Estimated subtotal ₹${estSubtotal.toLocaleString('en-IN')} exceeds target budget — owner may submit a custom quote`);
      }
    }

    // 5. Operator & Transport fit
    if (job.requires_operator) {
      if (item.operator_available) {
        score += 8;
        reasons.push('Owner indicates operator option is available');
      } else {
        reasons.push('Operator not listed — confirm operator arrangement with owner');
      }
    }

    if (job.requires_transport) {
      if (item.transport_available) {
        score += 7;
        reasons.push('Owner indicates site transport option is available');
      } else {
        reasons.push('Delivery not listed — confirm transport or self-pickup with owner');
      }
    }

    candidates.push({
      equipmentId: item.id,
      ownerId: item.owner_id,
      matchScore: Math.min(100, score),
      matchReasons: reasons,
      availabilityNote: 'No conflicting confirmed bookings on file · Owner confirmation pending',
    });
  }

  candidates.sort((a, b) => b.matchScore - a.matchScore);
  return candidates;
}
