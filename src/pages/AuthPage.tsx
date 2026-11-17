import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CITIES_LIST } from '../lib/api';

export function AuthPage() {
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get('mode') === 'register' || searchParams.get('role') ? 'register' : 'login';
  const initialRole = searchParams.get('role') === 'owner' ? 'owner' : 'renter';
  const redirectPath = searchParams.get('redirect') || '';

  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'renter' | 'owner'>(initialRole);
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('Pune');
  const [businessName, setBusinessName] = useState('');
  const [serviceArea, setServiceArea] = useState('Pune, Pimpri-Chinchwad');
  const [serviceRadiusKm, setServiceRadiusKm] = useState(35);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const { login, register } = useAuth();
  const navigate = useNavigate();

  const routeAfterAuth = (userRole: string) => {
    if (redirectPath) {
      navigate(redirectPath);
      return;
    }
    if (userRole === 'admin') navigate('/admin');
    else if (userRole === 'owner') navigate('/owner/dashboard');
    else navigate('/renter/dashboard');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (mode === 'login') {
        const u = await login(email, password);
        routeAfterAuth(u.role);
      } else {
        const u = await register({
          name,
          email,
          password,
          role,
          phone,
          city,
          businessName: role === 'owner' ? businessName : undefined,
          serviceArea: role === 'owner' ? serviceArea : undefined,
          serviceRadiusKm: role === 'owner' ? serviceRadiusKm : undefined,
        });
        routeAfterAuth(u.role);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoLogin = async (demoEmail: string, demoPassword: string) => {
    setError('');
    setSubmitting(true);
    try {
      const u = await login(demoEmail, demoPassword);
      routeAfterAuth(u.role);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Demo login failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-6 sm:p-8">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit mb-6">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError('');
              }}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                mode === 'login' ? 'bg-white text-[#0F172A] shadow-sm' : 'text-slate-600 hover:text-[#0F172A]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError('');
              }}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                mode === 'register' ? 'bg-white text-[#0F172A] shadow-sm' : 'text-slate-600 hover:text-[#0F172A]'
              }`}
            >
              Create Account
            </button>
          </div>

          <h1 className="font-display text-2xl font-bold text-[#0F172A]">
            {mode === 'login' ? 'Sign in to Udaya' : 'Create your Udaya account'}
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            {mode === 'login'
              ? 'Access your renter requests, owner fleet, or job matching inbox.'
              : 'Register as a contractor/renter looking for machinery or an equipment owner listing idle assets.'}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Account Type</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setRole('renter')}
                      className={`p-3 text-left border rounded-md transition-colors ${
                        role === 'renter'
                          ? 'border-[#0D9488] bg-teal-50/50 text-[#0F172A]'
                          : 'border-slate-200 bg-[#F8FAFC] text-slate-600'
                      }`}
                    >
                      <div className="text-sm font-semibold">Renter / Contractor</div>
                      <div className="text-xs text-slate-500 mt-0.5">Search equipment & post job requests</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('owner')}
                      className={`p-3 text-left border rounded-md transition-colors ${
                        role === 'owner'
                          ? 'border-[#0D9488] bg-teal-50/50 text-[#0F172A]'
                          : 'border-slate-200 bg-[#F8FAFC] text-slate-600'
                      }`}
                    >
                      <div className="text-sm font-semibold">Equipment Owner</div>
                      <div className="text-xs text-slate-500 mt-0.5">List machinery & respond to jobs</div>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Suresh Deshmukh"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md bg-[#F8FAFC] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98..."
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md bg-[#F8FAFC] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Primary City</label>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md bg-[#F8FAFC] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                  >
                    {CITIES_LIST.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {role === 'owner' && (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-md space-y-3">
                    <div className="text-xs font-semibold text-[#0F172A]">Owner Profile Details</div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Business / Yard Name</label>
                      <input
                        type="text"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        placeholder="e.g. Deshmukh Earthmovers"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md bg-white"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Service Areas</label>
                        <input
                          type="text"
                          value={serviceArea}
                          onChange={(e) => setServiceArea(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md bg-white"
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
                          className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-md bg-white"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md bg-[#F8FAFC] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md bg-[#F8FAFC] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
              />
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-800">{error}</div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 text-sm font-medium text-white bg-[#0D9488] hover:bg-[#0F766E] disabled:bg-slate-400 rounded-md transition-colors"
            >
              {submitting ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        </div>

        {/* Demonstration Accounts Box for Pitching & Testing */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-6 space-y-4">
          <h2 className="font-display text-lg font-bold text-[#0F172A]">Demo Accounts (Sample Data)</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Use these sample accounts to demonstrate the complete Renter, Owner, and Administrator workflows without
            creating new credentials.
          </p>

          <div className="space-y-3">
            <div className="p-4 bg-[#F8FAFC] border border-slate-200 rounded-md">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-[#0F172A]">Vikram Patel · Renter</div>
                  <div className="text-xs font-mono text-slate-500">renter@udaya.demo / demo1234</div>
                </div>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleDemoLogin('renter@udaya.demo', 'demo1234')}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-[#0D9488] hover:bg-[#0F766E] rounded whitespace-nowrap"
                >
                  Sign In
                </button>
              </div>
            </div>

            <div className="p-4 bg-[#F8FAFC] border border-slate-200 rounded-md">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-[#0F172A]">Rajesh Sharma · Owner</div>
                  <div className="text-xs font-mono text-slate-500">owner@udaya.demo / demo1234</div>
                </div>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleDemoLogin('owner@udaya.demo', 'demo1234')}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-[#0F172A] hover:bg-slate-800 rounded whitespace-nowrap"
                >
                  Sign In
                </button>
              </div>
            </div>

            <div className="p-4 bg-[#F8FAFC] border border-slate-200 rounded-md">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-[#0F172A]">Operations · Administrator</div>
                  <div className="text-xs font-mono text-slate-500">admin@udaya.demo / admin1234</div>
                </div>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleDemoLogin('admin@udaya.demo', 'admin1234')}
                  className="px-3 py-1.5 text-xs font-medium text-[#0F172A] bg-white border border-slate-300 hover:bg-slate-50 rounded whitespace-nowrap"
                >
                  Sign In
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
