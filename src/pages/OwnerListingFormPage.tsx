import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Upload, Trash2 } from 'lucide-react';
import { apiFetch, CITIES_LIST } from '../lib/api';
import type { AvailabilityBlock, EquipmentCategory, EquipmentListing } from '../types';
import { EquipmentImage } from '../components/EquipmentCard';

const IMAGE_PRESETS = [
  { label: 'Backhoe Loader / JCB', url: '/src/assets/images/eq_jcb_backhoe_1794920310957.jpg' },
  { label: 'Hydraulic Excavator', url: '/src/assets/images/hero_excavator_site_1794920310287.jpg' },
  { label: 'Utility Tractor', url: '/src/assets/images/eq_tractor_utility_1794920313456.jpg' },
  { label: 'Wheel Loader / Skid Steer', url: '/src/assets/images/eq_skid_loader_1794920313017.jpg' },
  { label: 'Concrete Mixer', url: '/src/assets/images/eq_concrete_mixer_1794920312061.jpg' },
  { label: 'Diesel Generator', url: '/src/assets/images/eq_diesel_generator_1794920312999.jpg' },
  { label: 'Analytical Lab HPLC / LC-MS', url: '/src/assets/images/eq_lab_hplc_spectrometer_1795217352610.jpg' },
  { label: 'Biotech Confocal Microscope', url: '/src/assets/images/eq_lab_confocal_microscope_1795217353612.jpg' },
  { label: '5-Axis Precision CNC Center', url: '/src/assets/images/eq_industrial_cnc_machine_1795217351702.jpg' },
  { label: '3D Terrestrial LiDAR Scanner', url: '/src/assets/images/eq_lidar_survey_scanner_1795217352658.jpg' },
];

export function OwnerListingFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [categories, setCategories] = useState<EquipmentCategory[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [title, setTitle] = useState('');
  const [makeModel, setMakeModel] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [locationCity, setLocationCity] = useState('Pune');
  const [locationArea, setLocationArea] = useState('');
  const [serviceRadiusKm, setServiceRadiusKm] = useState(35);
  const [dailyRate, setDailyRate] = useState('');
  const [weeklyRate, setWeeklyRate] = useState('');
  const [operatorAvailable, setOperatorAvailable] = useState(true);
  const [operatorDailyCharge, setOperatorDailyCharge] = useState('');
  const [transportAvailable, setTransportAvailable] = useState(true);
  const [transportBaseCharge, setTransportBaseCharge] = useState('');
  const [fuelPolicy, setFuelPolicy] = useState<'renter_pays' | 'included' | 'estimated_extra'>('renter_pays');
  const [fuelDailyEstimate, setFuelDailyEstimate] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [availabilityStatus, setAvailabilityStatus] = useState<'available' | 'paused' | 'maintenance'>('available');
  const [conditionSummary, setConditionSummary] = useState('');
  const [replacementValueInr, setReplacementValueInr] = useState('');
  const [calibrationValidUntil, setCalibrationValidUntil] = useState('');
  const [rentOnlyHighCapex, setRentOnlyHighCapex] = useState(false);
  const [imageUrl, setImageUrl] = useState(IMAGE_PRESETS[0].url);

  // Date blockout state (Edit mode)
  const [blocks, setBlocks] = useState<AvailabilityBlock[]>([]);
  const [blockStart, setBlockStart] = useState('');
  const [blockEnd, setBlockEnd] = useState('');
  const [blockReason, setBlockReason] = useState('Scheduled maintenance / external contract');

  useEffect(() => {
    apiFetch<{ categories: EquipmentCategory[] }>('/api/categories')
      .then((d) => {
        setCategories(d.categories);
        if (!isEdit && d.categories.length > 0) setCategoryId(String(d.categories[0].id));
      })
      .catch(() => {});
  }, [isEdit]);

  useEffect(() => {
    if (!id) return;
    apiFetch<{ equipment: EquipmentListing }>(`/api/equipment/${id}`)
      .then((d) => {
        const eq = d.equipment;
        setTitle(eq.title);
        setMakeModel(eq.make_model);
        setCategoryId(String(eq.category_id));
        setDescription(eq.description);
        setLocationCity(eq.location_city);
        setLocationArea(eq.location_area);
        setServiceRadiusKm(eq.service_radius_km);
        setDailyRate(String(eq.daily_rate));
        setWeeklyRate(eq.weekly_rate != null ? String(eq.weekly_rate) : '');
        setOperatorAvailable(eq.operator_available);
        setOperatorDailyCharge(eq.operator_daily_charge != null ? String(eq.operator_daily_charge) : '');
        setTransportAvailable(eq.transport_available);
        setTransportBaseCharge(eq.transport_base_charge != null ? String(eq.transport_base_charge) : '');
        setFuelPolicy(eq.fuel_policy);
        setFuelDailyEstimate(eq.fuel_daily_estimate != null ? String(eq.fuel_daily_estimate) : '');
        setDepositAmount(eq.deposit_amount != null ? String(eq.deposit_amount) : '');
        setAvailabilityStatus(eq.availability_status);
        setConditionSummary(eq.condition_summary);
        setReplacementValueInr(eq.replacement_value_inr != null ? String(eq.replacement_value_inr) : '');
        setCalibrationValidUntil(eq.calibration_valid_until || '');
        setRentOnlyHighCapex(Boolean(eq.rent_only_high_capex));
        setImageUrl(eq.image_url);
        setBlocks(eq.availability_blocks || []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load listing.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      setError('Image file must be under 3 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImageUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const payload = {
        title,
        makeModel,
        categoryId: Number(categoryId),
        description,
        locationCity,
        locationArea,
        serviceRadiusKm,
        dailyRate: Number(dailyRate),
        weeklyRate: weeklyRate ? Number(weeklyRate) : null,
        operatorAvailable,
        operatorDailyCharge: operatorAvailable && operatorDailyCharge ? Number(operatorDailyCharge) : null,
        transportAvailable,
        transportBaseCharge: transportAvailable && transportBaseCharge ? Number(transportBaseCharge) : null,
        fuelPolicy,
        fuelDailyEstimate: fuelDailyEstimate ? Number(fuelDailyEstimate) : null,
        depositAmount: depositAmount ? Number(depositAmount) : null,
        availabilityStatus,
        conditionSummary,
        replacementValueInr: replacementValueInr ? Number(replacementValueInr) : null,
        calibrationValidUntil: calibrationValidUntil || null,
        rentOnlyHighCapex,
        imageUrl,
      };
      if (isEdit && id) {
        await apiFetch(`/api/equipment/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await apiFetch('/api/equipment', { method: 'POST', body: JSON.stringify(payload) });
      }
      navigate('/owner/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save equipment listing.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    await apiFetch(`/api/equipment/${id}`, { method: 'DELETE' });
    navigate('/owner/dashboard');
  };

  const handleAddBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !blockStart || !blockEnd) return;
    setError('');
    try {
      const res = await apiFetch<{ block: AvailabilityBlock }>(`/api/equipment/${id}/blocks`, {
        method: 'POST',
        body: JSON.stringify({ startDate: blockStart, endDate: blockEnd, reason: blockReason }),
      });
      setBlocks((prev) => [...prev, res.block]);
      setBlockStart('');
      setBlockEnd('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add unavailable dates.');
    }
  };

  const handleRemoveBlock = async (blockId: number) => {
    if (!id) return;
    await apiFetch(`/api/equipment/${id}/blocks/${blockId}`, { method: 'DELETE' });
    setBlocks((prev) => prev.filter((b) => b.id !== blockId));
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <div className="h-96 bg-white border border-slate-200 rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0F172A]">
            {isEdit ? 'Edit Equipment Listing' : 'Add Equipment Listing'}
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Provide clear pricing, location, and condition details so contractors can request or match accurately.
          </p>
        </div>
        {isEdit && (
          <button
            type="button"
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-rose-700 border border-rose-200 hover:bg-rose-50 rounded-md"
          >
            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Remove Listing</span>
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-lg p-6 sm:p-8 space-y-6">
        {/* Image Upload & Preset Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center pb-6 border-b border-slate-100">
          <div className="sm:col-span-4 aspect-[4/3] rounded-md overflow-hidden bg-slate-100 border border-slate-200">
            <EquipmentImage src={imageUrl} alt={title || 'Equipment preview'} />
          </div>
          <div className="sm:col-span-8 space-y-3">
            <label className="block text-xs font-semibold text-[#0F172A]">Equipment Photograph</label>
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium bg-[#F8FAFC] border border-slate-300 rounded-md cursor-pointer hover:bg-slate-100">
                <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Upload Image File</span>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
              <select
                value={IMAGE_PRESETS.some((p) => p.url === imageUrl) ? imageUrl : ''}
                onChange={(e) => {
                  if (e.target.value) setImageUrl(e.target.value);
                }}
                aria-label="Choose equipment preset photo"
                className="px-3 py-2 text-xs border border-slate-200 rounded-md bg-white"
              >
                <option value="">Or select equipment category photo...</option>
                {IMAGE_PRESETS.map((p) => (
                  <option key={p.url} value={p.url}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-slate-500">
              Upload a real photo of your machine (max 3 MB) or pick a matching category photo.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-700 mb-1">Listing Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. JCB 3DX Backhoe Loader — 76 HP"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md bg-[#F8FAFC]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Category</label>
            <select
              required
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md bg-[#F8FAFC]"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Make / Model / Year</label>
            <input
              type="text"
              value={makeModel}
              onChange={(e) => setMakeModel(e.target.value)}
              placeholder="e.g. JCB 3DX Super (2023)"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md bg-[#F8FAFC]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Description & Capabilities</label>
          <textarea
            rows={3}
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe capacity, attachments included, and ideal site jobs..."
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md bg-[#F8FAFC]"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Location City</label>
            <select
              value={locationCity}
              onChange={(e) => setLocationCity(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md bg-[#F8FAFC]"
            >
              {CITIES_LIST.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Yard / Locality</label>
            <input
              type="text"
              value={locationArea}
              onChange={(e) => setLocationArea(e.target.value)}
              placeholder="e.g. Chakan MIDC"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md bg-[#F8FAFC]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Service Radius (km)</label>
            <input
              type="number"
              min="5"
              max="300"
              value={serviceRadiusKm}
              onChange={(e) => setServiceRadiusKm(Number(e.target.value) || 35)}
              className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-md bg-[#F8FAFC]"
            />
          </div>
        </div>

        {/* Pricing & Terms */}
        <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Daily Rental Rate (₹)</label>
            <input
              type="number"
              min="100"
              required
              value={dailyRate}
              onChange={(e) => setDailyRate(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-md bg-[#F8FAFC]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Weekly Rate (Optional, ₹)</label>
            <input
              type="number"
              min="0"
              value={weeklyRate}
              onChange={(e) => setWeeklyRate(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-md bg-[#F8FAFC]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Refundable Deposit (₹)</label>
            <input
              type="number"
              min="0"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              placeholder="Leave blank if unconfirmed"
              className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-md bg-[#F8FAFC]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 bg-[#F8FAFC] border border-slate-200 rounded-md space-y-2">
            <label className="inline-flex items-center gap-2 text-sm font-medium text-[#0F172A] cursor-pointer">
              <input
                type="checkbox"
                checked={operatorAvailable}
                onChange={(e) => setOperatorAvailable(e.target.checked)}
                className="rounded border-slate-300 text-[#0D9488]"
              />
              <span>Operator available</span>
            </label>
            {operatorAvailable && (
              <div>
                <label className="block text-xs text-slate-600 mb-1">Operator Charge per Day (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={operatorDailyCharge}
                  onChange={(e) => setOperatorDailyCharge(e.target.value)}
                  placeholder="Leave blank if quoted per job"
                  className="w-full px-3 py-1.5 text-sm font-mono border border-slate-200 rounded bg-white"
                />
              </div>
            )}
          </div>

          <div className="p-4 bg-[#F8FAFC] border border-slate-200 rounded-md space-y-2">
            <label className="inline-flex items-center gap-2 text-sm font-medium text-[#0F172A] cursor-pointer">
              <input
                type="checkbox"
                checked={transportAvailable}
                onChange={(e) => setTransportAvailable(e.target.checked)}
                className="rounded border-slate-300 text-[#0D9488]"
              />
              <span>Delivery / transport available</span>
            </label>
            {transportAvailable && (
              <div>
                <label className="block text-xs text-slate-600 mb-1">Base Transport Charge (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={transportBaseCharge}
                  onChange={(e) => setTransportBaseCharge(e.target.value)}
                  placeholder="Leave blank if quoted by distance"
                  className="w-full px-3 py-1.5 text-sm font-mono border border-slate-200 rounded bg-white"
                />
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Fuel Policy</label>
            <select
              value={fuelPolicy}
              onChange={(e) => setFuelPolicy(e.target.value as 'renter_pays' | 'included' | 'estimated_extra')}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md bg-[#F8FAFC]"
            >
              <option value="renter_pays">Renter arranges fuel</option>
              <option value="included">Fuel included in rate</option>
              <option value="estimated_extra">Estimated daily fuel extra</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Daily Fuel Estimate (₹, optional)</label>
            <input
              type="number"
              min="0"
              value={fuelDailyEstimate}
              onChange={(e) => setFuelDailyEstimate(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-md bg-[#F8FAFC]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Listing Availability Status</label>
            <select
              value={availabilityStatus}
              onChange={(e) => setAvailabilityStatus(e.target.value as 'available' | 'paused' | 'maintenance')}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md bg-[#F8FAFC]"
            >
              <option value="available">Available for requests</option>
              <option value="paused">Paused (hidden from search)</option>
              <option value="maintenance">Under maintenance (unavailable)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Condition Summary</label>
          <input
            type="text"
            value={conditionSummary}
            onChange={(e) => setConditionSummary(e.target.value)}
            placeholder="e.g. Serviced at 2,100 hrs, ISO 17025 calibrated, hydraulic hoses inspected"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md bg-[#F8FAFC]"
          />
        </div>

        {/* High-Capex Lab / Precision Machinery Metadata */}
        <div className="pt-4 border-t border-slate-100 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="text-xs font-semibold text-[#0F172A]">
                High-Capex Lab, CNC &amp; Precision Asset Details (Optional)
              </div>
              <p className="text-xs text-slate-500">
                Highlight costly rent-only instruments (spectrometers, microscopes, CNC, LiDAR) with asset valuation and calibration validity.
              </p>
            </div>
            <label className="inline-flex items-center gap-2 text-xs font-medium text-[#0F766E] cursor-pointer whitespace-nowrap shrink-0">
              <input
                type="checkbox"
                checked={rentOnlyHighCapex}
                onChange={(e) => setRentOnlyHighCapex(e.target.checked)}
                className="rounded border-slate-300 text-[#0D9488]"
              />
              <span>Mark as High-Capex · Rent Only</span>
            </label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Estimated Replacement Value (₹, optional)
              </label>
              <input
                type="number"
                min="0"
                value={replacementValueInr}
                onChange={(e) => setReplacementValueInr(e.target.value)}
                placeholder="e.g. 6800000 for ₹68L lab equipment"
                className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-md bg-[#F8FAFC]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Calibration / Inspection Valid Until (optional)
              </label>
              <input
                type="date"
                value={calibrationValidUntil}
                onChange={(e) => setCalibrationValidUntil(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md bg-[#F8FAFC]"
              />
            </div>
          </div>
        </div>

        {error && <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-800">{error}</div>}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/owner/dashboard')}
            className="px-4 py-2 text-sm font-medium text-slate-600"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 text-sm font-medium text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-md"
          >
            {submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Publish Equipment Listing'}
          </button>
        </div>
      </form>

      {/* Unavailable Date Blockout Manager (Edit Mode) */}
      {isEdit && (
        <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
          <h2 className="font-display text-lg font-bold text-[#0F172A]">Block Unavailable Dates</h2>
          <p className="text-xs text-slate-600">
            Block dates for offline contracts or maintenance so Zero-Idle matching and renters cannot request conflicting
            days.
          </p>
          <form onSubmit={handleAddBlock} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Start Date</label>
              <input
                type="date"
                required
                value={blockStart}
                onChange={(e) => setBlockStart(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">End Date</label>
              <input
                type="date"
                required
                value={blockEnd}
                onChange={(e) => setBlockEnd(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Reason</label>
              <input
                type="text"
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-[#0F172A] hover:bg-slate-800 rounded-md h-[38px]"
            >
              Block Dates
            </button>
          </form>

          {blocks.length > 0 && (
            <ul className="divide-y divide-slate-100 text-sm pt-2">
              {blocks.map((b) => (
                <li key={b.id} className="py-2.5 flex items-center justify-between gap-4">
                  <div>
                    <span className="font-mono text-slate-800">
                      {b.start_date} to {b.end_date}
                    </span>{' '}
                    <span className="text-xs text-slate-500">· {b.reason}</span>
                  </div>
                  {b.booking_id == null ? (
                    <button
                      type="button"
                      onClick={() => handleRemoveBlock(b.id)}
                      className="text-xs text-rose-700 hover:underline"
                    >
                      Unblock
                    </button>
                  ) : (
                    <span className="text-xs text-slate-400">Locked by booking #{b.booking_id}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
