import React, { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, Globe, Menu, X, Cloud } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useFirebase } from '../context/FirebaseContext';
import { SUPPORTED_LANGUAGES, type LanguageCode } from '../lib/i18n';
import { VoiceAssistant } from './VoiceAssistant';

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, unreadCount, logout } = useAuth();
  const { firebaseUser, savedEquipment, signOutFirebase } = useFirebase();
  const { lang, setLang, t } = useLanguage();
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

  const isFullBleed3D = location.pathname === '/inspector-3d';

  const handleLogout = async () => {
    await logout();
    if (firebaseUser) {
      await signOutFirebase();
    }
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A]">
      {/* Top Bar Contract: Zone 1 (Brand wordmark) — Zone 2 (5 concise links) — Zone 3 (Language + Account action) */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4 lg:gap-8">
          <Link
            to="/"
            className="font-display text-xl font-bold tracking-tight text-[#0F172A] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488] rounded"
          >
            Udaya
          </Link>

          <nav className="hidden md:flex items-center gap-5 lg:gap-6 text-sm font-medium text-slate-600">
            <NavLink
              to="/marketplace"
              className={({ isActive }) =>
                `whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
                  isActive ? 'text-[#0F172A] border-[#0D9488]' : 'border-transparent hover:text-[#0F172A]'
                }`
              }
            >
              {t('nav.marketplace')}
            </NavLink>
            <NavLink
              to="/map"
              className={({ isActive }) =>
                `whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
                  isActive ? 'text-[#0F172A] border-[#0D9488]' : 'border-transparent hover:text-[#0F172A]'
                }`
              }
            >
              Map Locator
            </NavLink>
            <NavLink
              to="/inspector-3d"
              className={({ isActive }) =>
                `whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
                  isActive ? 'text-[#0F172A] border-[#0D9488]' : 'border-transparent hover:text-[#0F172A]'
                }`
              }
            >
              3D Inspector
            </NavLink>
            <NavLink
              to="/assistant"
              className={({ isActive }) =>
                `whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
                  isActive ? 'text-[#0F172A] border-[#0D9488]' : 'border-transparent hover:text-[#0F172A]'
                }`
              }
            >
              AI Concierge
            </NavLink>
            <NavLink
              to="/renter/job-requests/new"
              className={({ isActive }) =>
                `whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
                  isActive ? 'text-[#0F172A] border-[#0D9488]' : 'border-transparent hover:text-[#0F172A]'
                }`
              }
            >
              {t('nav.zeroIdle')}
            </NavLink>
          </nav>

          <div className="flex items-center gap-2.5 shrink-0">
            <label className="hidden sm:inline-flex items-center gap-1.5 px-2.5 h-10 bg-slate-50 border border-slate-200 rounded-md text-xs font-medium text-slate-700 hover:border-slate-300 transition-colors shrink-0">
              <Globe className="w-3.5 h-3.5 text-[#0F766E] shrink-0" aria-hidden="true" />
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value as LanguageCode)}
                aria-label="Select platform language"
                className="bg-transparent text-xs font-medium text-[#0F172A] focus:outline-none cursor-pointer pr-1"
              >
                {SUPPORTED_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.nativeName}
                  </option>
                ))}
              </select>
            </label>

            {user || firebaseUser ? (
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((prev) => !prev)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#0F172A] hover:bg-slate-800 rounded-md transition-colors whitespace-nowrap shrink-0 min-h-[40px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]"
                >
                  {firebaseUser && <Cloud className="w-3.5 h-3.5 text-teal-400 shrink-0" aria-hidden="true" />}
                  <span className="max-w-[130px] truncate">
                    {user?.name || firebaseUser?.displayName || firebaseUser?.email?.split('@')[0]}
                  </span>
                  {unreadCount > 0 && (
                    <span className="font-mono text-xs bg-[#0D9488] text-white px-1.5 py-0.5 rounded">
                      {unreadCount}
                    </span>
                  )}
                  <ChevronDown className="w-4 h-4 shrink-0" aria-hidden="true" />
                </button>

                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-lg shadow-lg py-2 z-50">
                    {user && (
                      <div className="px-4 py-2 border-b border-slate-100">
                        <div className="text-xs font-medium text-slate-500 capitalize">{user.role} account</div>
                        <div className="text-sm font-medium text-[#0F172A] truncate">{user.email}</div>
                      </div>
                    )}
                    {firebaseUser && (
                      <div className="px-4 py-2 border-b border-slate-100 bg-teal-50/40">
                        <div className="text-[11px] font-semibold text-[#0F766E] flex items-center gap-1">
                          <Cloud className="w-3 h-3" aria-hidden="true" />
                          <span>Google Cloud Sync</span>
                        </div>
                        <div className="text-xs text-slate-700 truncate">{firebaseUser.email}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {savedEquipment.length} saved equipment in watchlist
                        </div>
                      </div>
                    )}
                    {user && (
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
                    )}
                    {user?.role === 'renter' && (
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
                          Rental Requests & Escrow
                        </Link>
                      </>
                    )}
                    {user?.role === 'owner' && (
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
                          Bookings & Escrow Payouts
                        </Link>
                      </>
                    )}
                    <Link
                      to="/assistant"
                      className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      AI Concierge & Cloud Notes
                    </Link>
                    <Link
                      to="/cost-estimator"
                      className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      {t('nav.costEstimator')}
                    </Link>
                    {!user && (
                      <Link
                        to="/login"
                        className="block px-4 py-2 text-sm font-medium text-[#0F766E] hover:bg-slate-50"
                      >
                        Switch to Renter / Owner Account
                      </Link>
                    )}
                    {user && (
                      <Link
                        to="/notifications"
                        className="flex items-center justify-between px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        <span>Notifications</span>
                        {unreadCount > 0 && (
                          <span className="font-mono text-xs font-semibold text-[#0F766E]">{unreadCount} unread</span>
                        )}
                      </Link>
                    )}
                    <div className="border-t border-slate-100 mt-1 pt-1">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-rose-700 hover:bg-rose-50"
                      >
                        {t('nav.signOut')}
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
                {t('nav.signIn')}
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
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                <Globe className="w-3.5 h-3.5 text-[#0F766E]" aria-hidden="true" />
                <span>Language</span>
              </span>
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value as LanguageCode)}
                aria-label="Select platform language"
                className="px-2.5 py-1 text-xs border border-slate-200 rounded bg-slate-50 text-[#0F172A]"
              >
                {SUPPORTED_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.nativeName} ({l.englishName})
                  </option>
                ))}
              </select>
            </div>
            <Link to="/marketplace" className="py-2.5 text-slate-700">
              {t('nav.marketplace')}
            </Link>
            <Link to="/map" className="py-2.5 text-slate-700">
              Map Locator
            </Link>
            <Link to="/inspector-3d" className="py-2.5 text-slate-700">
              3D Inspector
            </Link>
            <Link to="/assistant" className="py-2.5 text-slate-700">
              AI Concierge & Live Voice
            </Link>
            <Link to="/renter/job-requests/new" className="py-2.5 text-slate-700">
              {t('nav.zeroIdle')}
            </Link>
            <Link to="/cost-estimator" className="py-2.5 text-slate-700">
              {t('nav.costEstimator')}
            </Link>
            <Link to="/how-it-works" className="py-2.5 text-slate-700">
              {t('nav.howItWorks')}
            </Link>
            {user && (
              <Link to={dashboardPath} className="py-2.5 text-[#0F766E] font-semibold border-t border-slate-100 mt-1">
                Go to {user.role} workspace
              </Link>
            )}
          </div>
        )}
      </header>

      {/* Contextual Workspace Navigation Strip */}
      {user && isWorkspaceRoute && (
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-6 overflow-x-auto text-sm">
            {user.role === 'renter' && (
              <>
                <WorkspaceTab to="/renter/dashboard" label="Overview" />
                <WorkspaceTab to="/renter/job-requests/new" label="Post Job Request" />
                <WorkspaceTab to="/renter/job-requests" label="Job Matches" />
                <WorkspaceTab to="/renter/bookings" label="Rental Requests & Escrow" />
                <WorkspaceTab to="/notifications" label={`Notifications${unreadCount > 0 ? ` (${unreadCount})` : ''}`} />
              </>
            )}
            {user.role === 'owner' && (
              <>
                <WorkspaceTab to="/owner/dashboard" label="Fleet Overview" />
                <WorkspaceTab to="/owner/listings/new" label="Add Listing" />
                <WorkspaceTab to="/owner/job-requests" label="Incoming Job Requests" />
                <WorkspaceTab to="/owner/bookings" label="Bookings & Escrow" />
                <WorkspaceTab to="/owner/enquiries" label="Enquiries" />
                <WorkspaceTab to="/owner/maintenance" label="Maintenance" />
                <WorkspaceTab to="/notifications" label={`Notifications${unreadCount > 0 ? ` (${unreadCount})` : ''}`} />
              </>
            )}
            {user.role === 'admin' && (
              <>
                <WorkspaceTab to="/admin" label="Moderation, Badges & Escrow" />
                <WorkspaceTab to="/notifications" label={`Notifications${unreadCount > 0 ? ` (${unreadCount})` : ''}`} />
              </>
            )}
          </div>
        </div>
      )}

      <main className="flex-1">{children}</main>

      {/* Hide floating voice trigger inside full-bleed 3D inspector so viewport stays uncluttered */}
      {!isFullBleed3D && <VoiceAssistant />}

      {!isFullBleed3D && (
        <footer className="bg-[#0F172A] text-slate-300 border-t border-slate-800 mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="font-display text-lg font-bold text-white">Udaya</div>
              <p className="mt-2 text-sm text-slate-400 max-w-md leading-relaxed">
                {t('footer.tagline')}
              </p>
              <p className="mt-3 text-xs text-slate-500">
                {t('footer.escrowNote')}
              </p>
            </div>
            <div>
              <div className="text-sm font-semibold text-white mb-3">Explore</div>
              <ul className="space-y-2 text-sm text-slate-400">
                <li>
                  <Link to="/marketplace" className="hover:text-white transition-colors">
                    {t('hero.findEquipment')}
                  </Link>
                </li>
                <li>
                  <Link to="/map" className="hover:text-white transition-colors">
                    Live Map & Route Locator
                  </Link>
                </li>
                <li>
                  <Link to="/inspector-3d" className="hover:text-white transition-colors">
                    Interactive 3D Inspector
                  </Link>
                </li>
                <li>
                  <Link to="/assistant" className="hover:text-white transition-colors">
                    AI Concierge & Live Voice
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <div className="text-sm font-semibold text-white mb-3">Platform</div>
              <ul className="space-y-2 text-sm text-slate-400">
                <li>
                  <Link to="/cost-estimator" className="hover:text-white transition-colors">
                    {t('nav.costEstimator')}
                  </Link>
                </li>
                <li>
                  <Link to="/how-it-works" className="hover:text-white transition-colors">
                    {t('nav.howItWorks')}
                  </Link>
                </li>
                <li>
                  <Link to="/about" className="hover:text-white transition-colors">
                    {t('nav.about')}
                  </Link>
                </li>
                <li>
                  <Link to="/login" className="hover:text-white transition-colors">
                    {t('nav.signIn')}
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800/80 py-4 px-4 sm:px-6 text-xs text-slate-500 max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>Udaya Zero-Idle Equipment & Lab Network · Multi-Language Accessible</span>
            <span>Verified Machinery · Escrow Protection · Live Maps · 3D Inspection · Cloud Sync</span>
          </div>
        </footer>
      )}
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
