import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import type { EquipmentListing } from '../types';
import { CostBreakdownPanel, type ChargeConfirmationState, type CostLineItem } from '../components/CostBreakdownPanel';

export function CostEstimatorPage() {
  const [listings, setListings] = useState<EquipmentListing[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [durationDays, setDurationDays] = useState(3);
  const [baseRate, setBaseRate] = useState(6500);
  const [baseStatus, setBaseStatus] = useState<ChargeConfirmationState>('User-entered estimate');

  const [transportAmount, setTransportAmount] = useState<string>('2500');
  const [transportStatus, setTransportStatus] = useState<ChargeConfirmationState>('User-entered estimate');

  const [operatorAmount, setOperatorAmount] = useState<string>('4200');
  const [operatorStatus, setOperatorStatus] = useState<ChargeConfirmationState>('User-entered estimate');

  const [fuelAmount, setFuelAmount] = useState<string>('');
  const [fuelStatus, setFuelStatus] = useState<ChargeConfirmationState>('Not yet confirmed');

  const [otherAmount, setOtherAmount] = useState<string>('0');
  const [otherStatus, setOtherStatus] = useState<ChargeConfirmationState>('User-entered estimate');

  const [depositAmount, setDepositAmount] = useState<string>('15000');
  const [depositStatus, setDepositStatus] = useState<ChargeConfirmationState>('User-entered estimate');

  useEffect(() => {
    apiFetch<{ equipment: EquipmentListing[] }>('/api/equipment')
      .then((d) => setListings(d.equipment))
      .catch(() => {});
  }, []);

  const handleSelectEquipment = (idStr: string) => {
    setSelectedId(idStr);
    const eq = listings.find((item) => String(item.id) === idStr);
    if (!eq) return;

    setBaseRate(eq.daily_rate);
    setBaseStatus('Owner-confirmed');

    if (eq.transport_available && eq.transport_base_charge != null) {
      setTransportAmount(String(eq.transport_base_charge));
      setTransportStatus('Owner-confirmed');
    } else {
      setTransportAmount('');
      setTransportStatus('Not yet confirmed');
    }

    if (eq.operator_available && eq.operator_daily_charge != null) {
      setOperatorAmount(String(eq.operator_daily_charge * durationDays));
      setOperatorStatus('Owner-confirmed');
    } else if (!eq.operator_available) {
      setOperatorAmount('0');
      setOperatorStatus('Owner-confirmed');
    } else {
      setOperatorAmount('');
      setOperatorStatus('Not yet confirmed');
    }

    if (eq.fuel_policy === 'included') {
      setFuelAmount('0');
      setFuelStatus('Owner-confirmed');
    } else if (eq.fuel_daily_estimate != null) {
      setFuelAmount(String(eq.fuel_daily_estimate * durationDays));
      setFuelStatus('User-entered estimate');
    } else {
      setFuelAmount('');
      setFuelStatus('Not yet confirmed');
    }

    if (eq.deposit_amount != null) {
      setDepositAmount(String(eq.deposit_amount));
      setDepositStatus('Owner-confirmed');
    } else {
      setDepositAmount('');
      setDepositStatus('Not yet confirmed');
    }
  };

  const parseNum = (val: string, st: ChargeConfirmationState): number | null => {
    if (st === 'Not yet confirmed' || val.trim() === '') return null;
    const n = Number(val);
    return Number.isNaN(n) ? null : n;
  };

  const lines: CostLineItem[] = [
    {
      label: 'Transport / delivery charge',
      amount: parseNum(transportAmount, transportStatus),
      status: transportStatus,
    },
    {
      label: 'Operator charge',
      amount: parseNum(operatorAmount, operatorStatus),
      status: operatorStatus,
    },
    {
      label: 'Fuel charge',
      amount: parseNum(fuelAmount, fuelStatus),
      status: fuelStatus,
    },
    {
      label: 'Other additional charges',
      amount: parseNum(otherAmount, otherStatus),
      status: otherStatus,
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0F172A]">Total Job Cost Estimator</h1>
        <p className="text-sm text-slate-600 mt-1 max-w-2xl">
          Plan rental budgets transparently. Distinguish owner-confirmed figures from user estimates and unknown charges,
          and keep refundable deposits separate from rental expenses.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-6 space-y-5">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Pre-fill from Marketplace Listing (Optional)
            </label>
            <select
              value={selectedId}
              onChange={(e) => handleSelectEquipment(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md bg-[#F8FAFC]"
            >
              <option value="">Custom estimate (enter rates manually)</option>
              {listings.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title} — ₹{item.daily_rate}/day ({item.location_city})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Base Daily Rate (₹)</label>
              <input
                type="number"
                min="0"
                value={baseRate}
                onChange={(e) => setBaseRate(Math.max(0, Number(e.target.value) || 0))}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-md bg-[#F8FAFC]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Duration (Days)</label>
              <input
                type="number"
                min="1"
                max="365"
                value={durationDays}
                onChange={(e) => setDurationDays(Math.max(1, Number(e.target.value) || 1))}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-md bg-[#F8FAFC]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Rate Status</label>
              <select
                value={baseStatus}
                onChange={(e) => setBaseStatus(e.target.value as ChargeConfirmationState)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md bg-[#F8FAFC]"
              >
                <option value="Owner-confirmed">Owner-confirmed</option>
                <option value="User-entered estimate">User-entered estimate</option>
                <option value="Not yet confirmed">Not yet confirmed</option>
              </select>
            </div>
          </div>

          {[
            {
              label: 'Transport / Delivery Charge (₹)',
              val: transportAmount,
              setVal: setTransportAmount,
              st: transportStatus,
              setSt: setTransportStatus,
            },
            {
              label: 'Total Operator Charge (₹)',
              val: operatorAmount,
              setVal: setOperatorAmount,
              st: operatorStatus,
              setSt: setOperatorStatus,
            },
            {
              label: 'Total Fuel Charge (₹)',
              val: fuelAmount,
              setVal: setFuelAmount,
              st: fuelStatus,
              setSt: setFuelStatus,
            },
            {
              label: 'Other Additional Charges (₹)',
              val: otherAmount,
              setVal: setOtherAmount,
              st: otherStatus,
              setSt: setOtherStatus,
            },
            {
              label: 'Refundable Security Deposit (₹, separate)',
              val: depositAmount,
              setVal: setDepositAmount,
              st: depositStatus,
              setSt: setDepositStatus,
            },
          ].map((row) => (
            <div key={row.label} className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">{row.label}</label>
                <input
                  type="number"
                  min="0"
                  disabled={row.st === 'Not yet confirmed'}
                  value={row.st === 'Not yet confirmed' ? '' : row.val}
                  placeholder={row.st === 'Not yet confirmed' ? 'Not yet confirmed' : '0'}
                  onChange={(e) => row.setVal(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-md bg-[#F8FAFC] disabled:bg-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Confirmation State</label>
                <select
                  value={row.st}
                  onChange={(e) => row.setSt(e.target.value as ChargeConfirmationState)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md bg-[#F8FAFC]"
                >
                  <option value="Owner-confirmed">Owner-confirmed</option>
                  <option value="User-entered estimate">User-entered estimate</option>
                  <option value="Not yet confirmed">Not yet confirmed</option>
                </select>
              </div>
            </div>
          ))}
        </div>

        <div className="lg:col-span-5 lg:sticky lg:top-20">
          <CostBreakdownPanel
            durationDays={durationDays}
            baseRate={baseRate}
            baseStatus={baseStatus}
            lines={lines}
            depositAmount={parseNum(depositAmount, depositStatus)}
            depositStatus={depositStatus}
          />
        </div>
      </div>
    </div>
  );
}
