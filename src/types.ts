export type UserRole = 'renter' | 'owner' | 'admin';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  phone: string;
  city: string;
  created_at: string;
}

export interface OwnerProfile {
  user_id: number;
  business_name: string;
  service_area: string;
  service_radius_km: number;
  bio: string;
  verified_contact: number;
}

export type CategorySector =
  | 'construction'
  | 'laboratory'
  | 'precision_industrial'
  | 'surveying_geotech'
  | 'future_expansion';

export interface EquipmentCategory {
  id: number;
  slug: string;
  name: string;
  group_type: 'construction' | 'future_expansion';
  sector: CategorySector;
  description: string;
  sort_order: number;
  is_active: number;
}

export interface ChecklistItem {
  item: string;
  passed: boolean;
}

export interface MaintenanceRecord {
  id: number;
  equipment_id: number;
  condition_description: string;
  last_maintenance_date: string | null;
  checklist: ChecklistItem[];
  notes: string;
  document_name: string;
  verification_status: 'Owner-provided' | 'Documents submitted' | 'Independently verified';
  submitted_at: string;
}

export interface AvailabilityBlock {
  id: number;
  equipment_id: number;
  start_date: string;
  end_date: string;
  reason: string;
  booking_id: number | null;
}

export type VerificationBadgeTier = 'unverified' | 'documents_reviewed' | 'udaya_verified';

export interface EquipmentListing {
  id: number;
  owner_id: number;
  category_id: number;
  category_name: string;
  category_slug: string;
  category_sector?: CategorySector;
  title: string;
  make_model: string;
  description: string;
  location_city: string;
  location_area: string;
  latitude?: number | null;
  longitude?: number | null;
  service_radius_km: number;
  daily_rate: number;
  weekly_rate: number | null;
  operator_available: boolean;
  operator_daily_charge: number | null;
  transport_available: boolean;
  transport_base_charge: number | null;
  fuel_policy: 'renter_pays' | 'included' | 'estimated_extra';
  fuel_daily_estimate: number | null;
  deposit_amount: number | null;
  availability_status: 'available' | 'paused' | 'maintenance';
  condition_summary: string;
  image_url: string;
  is_sample: boolean;
  is_removed: boolean;
  is_verified_machinery?: boolean;
  verification_badge_tier?: VerificationBadgeTier;
  verification_certificate_id?: string;
  verified_at?: string | null;
  calibration_valid_until?: string | null;
  replacement_value_inr?: number | null;
  rent_only_high_capex?: boolean;
  owner_name?: string;
  owner_city?: string;
  owner_phone?: string;
  business_name?: string;
  owner_service_area?: string;
  owner_bio?: string;
  latest_maintenance?: MaintenanceRecord | null;
  availability_blocks?: AvailabilityBlock[];
  created_at: string;
  updated_at: string;
}

export interface JobRequest {
  id: number;
  renter_id: number;
  renter_name?: string;
  title: string;
  work_description: string;
  category_id: number;
  category_name: string;
  category_slug: string;
  job_city: string;
  job_area: string;
  preferred_start_date: string;
  duration_days: number;
  budget_max: number | null;
  requires_operator: boolean;
  requires_transport: boolean;
  status: 'open' | 'responses_received' | 'fulfilled' | 'cancelled';
  match_count?: number;
  response_count?: number;
  created_at: string;
}

export interface JobMatch {
  id: number;
  job_request_id: number;
  equipment_id: number;
  owner_id: number;
  match_score: number;
  match_reasons: string[];
  availability_note: string;
  owner_response_status: 'pending' | 'available_quoted' | 'alternative_proposed' | 'declined';
  quoted_daily_rate: number | null;
  quoted_transport_charge: number | null;
  quoted_operator_charge: number | null;
  quoted_fuel_charge: number | null;
  quoted_other_charge: number | null;
  quoted_deposit: number | null;
  owner_note: string;
  alternative_equipment_id: number | null;
  alternative_equipment_title?: string | null;
  alternative_daily_rate?: number | null;
  responded_at: string | null;
  equipment_title: string;
  make_model: string;
  location_city: string;
  location_area: string;
  daily_rate: number;
  operator_available: boolean;
  operator_daily_charge: number | null;
  transport_available: boolean;
  transport_base_charge: number | null;
  fuel_policy: string;
  fuel_daily_estimate: number | null;
  deposit_amount: number | null;
  image_url: string;
  availability_status: string;
  is_sample: boolean;
  owner_name: string;
  business_name: string;
  maintenance_verification: string | null;
  // Extra fields when viewed by owner
  job_title?: string;
  work_description?: string;
  job_city?: string;
  job_area?: string;
  preferred_start_date?: string;
  duration_days?: number;
  budget_max?: number | null;
  requires_operator?: boolean;
  requires_transport?: boolean;
  category_name?: string;
  renter_name?: string;
  listing_daily_rate?: number;
}

export type BookingStatus =
  | 'Request submitted'
  | 'Owner reviewing'
  | 'Quotation received'
  | 'Accepted'
  | 'Rejected'
  | 'Cancelled'
  | 'Completed';

export type EscrowStatus =
  | 'pending_funding'
  | 'funded_held'
  | 'handover_confirmed'
  | 'released_to_owner'
  | 'refunded_to_renter'
  | 'disputed';

export interface EscrowEvent {
  id: number;
  escrow_id: number;
  actor_user_id: number | null;
  actor_name?: string | null;
  actor_role: string;
  event_type: string;
  note: string;
  created_at: string;
}

export interface EscrowTransaction {
  id: number;
  rental_request_id: number;
  renter_id: number;
  owner_id: number;
  escrow_ref: string;
  rental_amount: number;
  deposit_amount: number;
  platform_fee: number;
  total_funded: number;
  payment_method: string;
  status: EscrowStatus;
  dispute_reason: string;
  funded_at: string | null;
  handover_confirmed_at: string | null;
  released_at: string | null;
  created_at: string;
  updated_at: string;
  // Admin view joins
  equipment_title?: string;
  renter_name?: string;
  owner_name?: string;
  start_date?: string;
  end_date?: string;
  booking_status?: string;
}

export interface RentalRequest {
  id: number;
  equipment_id: number;
  renter_id: number;
  owner_id: number;
  job_request_id: number | null;
  job_match_id: number | null;
  job_location: string;
  start_date: string;
  end_date: string;
  duration_days: number;
  intended_use: string;
  requires_operator: number;
  requires_transport: number;
  status: BookingStatus;
  payment_status: string;
  base_rental_total: number;
  transport_charge: number | null;
  operator_charge: number | null;
  fuel_charge: number | null;
  other_charge: number | null;
  deposit_amount: number | null;
  charges_confirmed_by_owner: number;
  renter_notes: string;
  owner_notes: string;
  equipment_title: string;
  make_model: string;
  location_city: string;
  image_url: string;
  listing_daily_rate: number;
  is_sample: number;
  is_verified_machinery?: number;
  renter_name: string;
  renter_phone: string;
  owner_name: string;
  owner_phone: string;
  business_name: string;
  escrow_id?: number | null;
  escrow_ref?: string | null;
  escrow_status?: EscrowStatus | null;
  escrow_rental_amount?: number | null;
  escrow_deposit_amount?: number | null;
  escrow_platform_fee?: number | null;
  escrow_total_funded?: number | null;
  escrow_payment_method?: string | null;
  escrow_funded_at?: string | null;
  escrow_handover_confirmed_at?: string | null;
  escrow_released_at?: string | null;
  escrow_dispute_reason?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Enquiry {
  id: number;
  equipment_id: number;
  rental_request_id: number | null;
  sender_id: number;
  recipient_id: number;
  message: string;
  equipment_title: string;
  sender_name: string;
  recipient_name: string;
  created_at: string;
}

export interface NotificationItem {
  id: number;
  user_id: number;
  type: string;
  title: string;
  body: string;
  link_path: string;
  is_read: boolean;
  created_at: string;
}

export interface ReportItem {
  id: number;
  reporter_id: number;
  reporter_name: string;
  reporter_email: string;
  equipment_id: number | null;
  equipment_title: string | null;
  equipment_is_removed: number | null;
  rental_request_id: number | null;
  reason: string;
  details: string;
  status: 'Open' | 'Under Review' | 'Resolved' | 'Listing Removed';
  admin_notes: string;
  created_at: string;
  resolved_at: string | null;
}
