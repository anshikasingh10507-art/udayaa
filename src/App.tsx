import React from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { MarketplacePage } from './pages/MarketplacePage';
import { EquipmentDetailPage } from './pages/EquipmentDetailPage';
import { HowItWorksPage } from './pages/HowItWorksPage';
import { AboutPage } from './pages/AboutPage';
import { AuthPage } from './pages/AuthPage';
import { RenterDashboardPage } from './pages/RenterDashboardPage';
import { CreateJobRequestPage } from './pages/CreateJobRequestPage';
import { JobRequestsListPage, MatchingResultsPage } from './pages/MatchingResultsPage';
import { CostEstimatorPage } from './pages/CostEstimatorPage';
import { RenterBookingsPage } from './pages/RenterBookingsPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { OwnerDashboardPage } from './pages/OwnerDashboardPage';
import { OwnerListingFormPage } from './pages/OwnerListingFormPage';
import { OwnerJobRequestsPage } from './pages/OwnerJobRequestsPage';
import { OwnerEnquiriesPage } from './pages/OwnerEnquiriesPage';
import { OwnerBookingsPage } from './pages/OwnerBookingsPage';
import { OwnerMaintenancePage } from './pages/OwnerMaintenancePage';
import { AdminPage } from './pages/AdminPage';
import type { UserRole } from './types';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="h-40 bg-white border border-slate-200 rounded-lg animate-pulse" />
      </div>
    );
  }
  if (!user) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }
  return <>{children}</>;
}

function RequireRole({ role, children }: { role: UserRole; children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="h-40 bg-white border border-slate-200 rounded-lg animate-pulse" />
      </div>
    );
  }
  if (!user) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }
  if (user.role !== role) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-14">
        <div className="bg-white border border-slate-200 rounded-lg p-8 text-center">
          <h1 className="font-display text-xl font-bold text-[#0F172A]">Account Role Mismatch</h1>
          <p className="text-sm text-slate-600 mt-2">
            This workspace requires a <span className="font-semibold">{role}</span> account. You are currently signed
            in as a <span className="font-semibold">{user.role}</span>.
          </p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Layout>
          <Routes>
            {/* Public Pages */}
            <Route path="/" element={<HomePage />} />
            <Route path="/marketplace" element={<MarketplacePage />} />
            <Route path="/equipment/:id" element={<EquipmentDetailPage />} />
            <Route path="/how-it-works" element={<HowItWorksPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/cost-estimator" element={<CostEstimatorPage />} />
            <Route path="/login" element={<AuthPage />} />
            <Route path="/register" element={<AuthPage />} />

            {/* Renter Pages */}
            <Route
              path="/renter/dashboard"
              element={
                <RequireRole role="renter">
                  <RenterDashboardPage />
                </RequireRole>
              }
            />
            <Route
              path="/renter/job-requests/new"
              element={
                <RequireAuth>
                  <CreateJobRequestPage />
                </RequireAuth>
              }
            />
            <Route
              path="/renter/job-requests"
              element={
                <RequireAuth>
                  <JobRequestsListPage />
                </RequireAuth>
              }
            />
            <Route
              path="/renter/job-requests/:id/matches"
              element={
                <RequireAuth>
                  <MatchingResultsPage />
                </RequireAuth>
              }
            />
            <Route
              path="/renter/bookings"
              element={
                <RequireAuth>
                  <RenterBookingsPage />
                </RequireAuth>
              }
            />

            {/* Shared Notifications */}
            <Route
              path="/notifications"
              element={
                <RequireAuth>
                  <NotificationsPage />
                </RequireAuth>
              }
            />

            {/* Owner Pages */}
            <Route
              path="/owner/dashboard"
              element={
                <RequireRole role="owner">
                  <OwnerDashboardPage />
                </RequireRole>
              }
            />
            <Route
              path="/owner/listings/new"
              element={
                <RequireRole role="owner">
                  <OwnerListingFormPage />
                </RequireRole>
              }
            />
            <Route
              path="/owner/listings/:id/edit"
              element={
                <RequireRole role="owner">
                  <OwnerListingFormPage />
                </RequireRole>
              }
            />
            <Route
              path="/owner/job-requests"
              element={
                <RequireRole role="owner">
                  <OwnerJobRequestsPage />
                </RequireRole>
              }
            />
            <Route
              path="/owner/enquiries"
              element={
                <RequireRole role="owner">
                  <OwnerEnquiriesPage />
                </RequireRole>
              }
            />
            <Route
              path="/owner/bookings"
              element={
                <RequireRole role="owner">
                  <OwnerBookingsPage />
                </RequireRole>
              }
            />
            <Route
              path="/owner/maintenance"
              element={
                <RequireRole role="owner">
                  <OwnerMaintenancePage />
                </RequireRole>
              }
            />
            <Route
              path="/owner/maintenance/:equipmentId"
              element={
                <RequireRole role="owner">
                  <OwnerMaintenancePage />
                </RequireRole>
              }
            />

            {/* Administrator Page */}
            <Route path="/admin" element={<AdminPage />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </AuthProvider>
    </BrowserRouter>
  );
}
