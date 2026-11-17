import React, { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, unreadCount, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setMenuOpen(false);
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const dashboardPath =
    user?.role === 'admin'
      ? '/admin'
      : user?.role === 'owner'
        ? '/owner/dashboard'
        : '/renter/dashboard';

  const isWorkspaceRoute =
    location.pathname.startsWith('/renter') ||
    location.pathname.startsWith('/owner') ||
    location.pathname.startsWith('/notifications') ||
    location.pathname.startsWith('/admin');

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A]">
      {/* Top Bar Contract: Zone 1 (Brand wordmark) — Zone 2 (4-5 concise links) — Zone 3 (1 primary action) */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          <Link
            to="/"
            className="font-display text-xl font-bold tracking-tight text-[#0F172A] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488] rounded"
          >
            Udaya
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <NavLink
              to="/marketplace"
              className={({ isActive }) =>
                `whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
                  isActive ? 'text-[#0F172A] border-[#0D9488]' : 'border-transparent hover:text-[#0F172A]'
                }`
              }
            >
              Marketplace
            </NavLink>
            <NavLink
              to="/renter/job-requests/new"
              className={({ isActive }) =>
                `whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
                  isActive ? 'text-[#0F172A] border-[#0D9488]' : 'border-transparent hover:text-[#0F172A]'
                }`
              }
            >
              Zero-Idle Match
            </NavLink>
            <NavLink
              to="/cost-estimator"
              className={({ isActive }) =>
                `whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
                  isActive ? 'text-[#0F172A] border-[#0D9488]' : 'border-transparent hover:text-[#0F172A]'
                }`
              }
            >
              Cost Estimator
            </NavLink>
            <NavLink
              to="/how-it-works"
              className={({ isActive }) =>
                `whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
                  isActive ? 'text-[#0F172A] border-[#0D9488]' : 'border-transparent hover:text-[#0F172A]'
                }`
              }
            >
              How It Works
            </NavLink>
            <NavLink
              to="/about"
              className={({ isActive }) =>
                `whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
                  isActive ? 'text-[#0F172A] border-[#0D9488]' : 'border-transparent hover:text-[#0F172A]'
                }`
              }
            >
              About
            </NavLink>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            {user ? (
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((prev) => !prev)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#0F172A] hover:bg-slate-800 rounded-md transition-colors whitespace-nowrap shrink-0 min-h-[40px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]"
                >
                  <span className="max-w-[140px] truncate">{user.name}</span>
                  {unreadCount > 0 && (
                    <span className="font-mono text-xs bg-[#0D9488] text-white px-1.5 py-0.5 rounded">
                      {unreadCount}
                    </span>
                  )}
                  <ChevronDown className="w-4 h-4 shrink-0" aria-hidden="true" />
                </button>

                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-60 bg-white border border-slate-200 rounded-lg shadow-lg py-2 z-50">
                    <div className="px-4 py-2 border-b border-slate-100">
                      <div className="text-xs font-medium text-slate-500 capitalize">{user.role} account</div>
                      <div className="text-sm font-medium text-[#0F172A] truncate">{user.email}</div>
                    </div>
                    <Link
                      to={dashboardPath}
                      className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      {user.role === 'admin'
                        ? 'Admin Moderation Console'
                        : user.role === 'owner'
                          ? 'Owner Dashboard'
                          : 'Renter Dashboard'}
                    </Link>
                    {user.role === 'renter' && (
                      <>
                        <Link
                          to="/renter/job-requests"
                          className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                        >
                          My Job Requests
                        </Link>
                        <Link
                          to="/renter/bookings"
                          className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                        >
                          Rental Requests & Bookings
                        </Link>
                      </>
                    )}
                    {user.role === 'owner' && (
                      <>
                        <Link
                          to="/owner/listings/new"
                          className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                        >
                          Add Equipment Listing
                        </Link>
                        <Link
                          to="/owner/job-requests"
                          className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                        >
                          Incoming Job Requests
                        </Link>
                        <Link
                          to="/owner/bookings"
                          className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                        >
                          Booking Management
                        </Link>
                        <Link
                          to="/owner/maintenance"
                          className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                        >
                          Maintenance Records
                        </Link>
                      </>
                    )}
                    <Link
                      to="/notifications"
                      className="flex items-center justify-between px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <span>Notifications</span>
                      {unreadCount > 0 && (
                        <span className="font-mono text-xs font-semibold text-[#0F766E]">{unreadCount} unread</span>
                      )}
                    </Link>
                    <div className="border-t border-slate-100 mt-1 pt-1">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-rose-700 hover:bg-rose-50"
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-md transition-colors whitespace-nowrap shrink-0 min-h-[40px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]"
              >
                Sign In
              </Link>
            )}

            <button
              type="button"
              onClick={() => setMobileOpen((prev) => !prev)}
              aria-label="Toggle navigation menu"
              className="md:hidden inline-flex items-center justify-center w-11 h-11 rounded-md text-slate-700 hover:bg-slate-100"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile navigation drawer */}
        {mobileOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-4 py-3 flex flex-col gap-2 text-sm font-medium">
            <Link to="/marketplace" className="py-2.5 text-slate-700">
              Marketplace
            </Link>
            <Link to="/renter/job-requests/new" className="py-2.5 text-slate-700">
              Zero-Idle Match
            </Link>
            <Link to="/cost-estimator" className="py-2.5 text-slate-700">
              Cost Estimator
            </Link>
            <Link to="/how-it-works" className="py-2.5 text-slate-700">
              How It Works
            </Link>
            <Link to="/about" className="py-2.5 text-slate-700">
              About
            </Link>
            {user && (
              <Link to={dashboardPath} className="py-2.5 text-[#0F766E] font-semibold border-t border-slate-100 mt-1">
                Go to {user.role} workspace
              </Link>
            )}
          </div>
        )}
      </header>

      {/* Contextual Workspace Navigation Strip (only rendered inside Renter/Owner/Admin workspace pages) */}
      {user && isWorkspaceRoute && (
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-6 overflow-x-auto text-sm">
            {user.role === 'renter' && (
              <>
                <WorkspaceTab to="/renter/dashboard" label="Overview" />
                <WorkspaceTab to="/renter/job-requests/new" label="Post Job Request" />
                <WorkspaceTab to="/renter/job-requests" label="Job Matches" />
                <WorkspaceTab to="/renter/bookings" label="Rental Requests" />
                <WorkspaceTab to="/notifications" label={`Notifications${unreadCount > 0 ? ` (${unreadCount})` : ''}`} />
              </>
            )}
            {user.role === 'owner' && (
              <>
                <WorkspaceTab to="/owner/dashboard" label="Fleet Overview" />
                <WorkspaceTab to="/owner/listings/new" label="Add Listing" />
                <WorkspaceTab to="/owner/job-requests" label="Incoming Job Requests" />
                <WorkspaceTab to="/owner/bookings" label="Bookings" />
                <WorkspaceTab to="/owner/enquiries" label="Enquiries" />
                <WorkspaceTab to="/owner/maintenance" label="Maintenance" />
                <WorkspaceTab to="/notifications" label={`Notifications${unreadCount > 0 ? ` (${unreadCount})` : ''}`} />
              </>
            )}
            {user.role === 'admin' && (
              <>
                <WorkspaceTab to="/admin" label="Moderation & Records" />
                <WorkspaceTab to="/notifications" label={`Notifications${unreadCount > 0 ? ` (${unreadCount})` : ''}`} />
              </>
            )}
          </div>
        </div>
      )}

      <main className="flex-1">{children}</main>

      <footer className="bg-[#0F172A] text-slate-300 border-t border-slate-800 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="font-display text-lg font-bold text-white">Udaya</div>
            <p className="mt-2 text-sm text-slate-400 max-w-md leading-relaxed">
              Udaya helps equipment find demand. Built to connect machinery owners with contractors through transparent
              rental pricing, maintenance visibility, and rule-based Zero-Idle job matching.
            </p>
            <p className="mt-3 text-xs text-slate-500">
              Demonstration environment: sample listings are clearly marked. Payments, SMS/email alerts, and live GPS
              tracking are handled outside the app during the demo phase.
            </p>
          </div>
          <div>
            <div className="text-sm font-semibold text-white mb-3">Marketplace</div>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>
                <Link to="/marketplace" className="hover:text-white transition-colors">
                  Browse Equipment
                </Link>
              </li>
              <li>
                <Link to="/renter/job-requests/new" className="hover:text-white transition-colors">
                  Post a Job Request
                </Link>
              </li>
              <li>
                <Link to="/cost-estimator" className="hover:text-white transition-colors">
                  Total Job Cost Estimator
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-white transition-colors">
                  List Your Equipment
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <div className="text-sm font-semibold text-white mb-3">Platform</div>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>
                <Link to="/how-it-works" className="hover:text-white transition-colors">
                  How Udaya Works
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-white transition-colors">
                  About & Scope
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-white transition-colors">
                  Sign In / Register
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-800/80 py-4 px-4 sm:px-6 text-xs text-slate-500 max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Udaya Equipment Marketplace · Demonstration Release</span>
          <span>Construction machinery focus · Built for transparent utilization</span>
        </div>
      </footer>
    </div>
  );
}

function WorkspaceTab({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      end={to === '/renter/dashboard' || to === '/owner/dashboard' || to === '/renter/job-requests' || to === '/admin'}
      className={({ isActive }) =>
        `py-3 border-b-2 whitespace-nowrap shrink-0 font-medium transition-colors ${
          isActive ? 'border-[#0D9488] text-[#0F766E]' : 'border-transparent text-slate-600 hover:text-[#0F172A]'
        }`
      }
    >
      {label}
    </NavLink>
  );
}
