import React, { useState } from 'react';
import { Menu, X, ArrowRight, ShieldCheck, User, Stethoscope, Shield, LogOut } from 'lucide-react';
import { RoleType } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { canAccessPortal } from '../../utils/portalAccess';
import { NotificationCentre } from '../reminders/NotificationCentre';

interface NavbarProps {
  currentView: 'landing' | 'roles' | 'dashboard';
  currentRole: RoleType;
  demoPortalEnabled: boolean;
  onNavigate: (view: 'landing' | 'roles' | 'dashboard') => void;
  onSelectRole: (role: RoleType) => void;
  onOpenAuth?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  currentRole,
  demoPortalEnabled,
  onNavigate,
  onSelectRole,
  onOpenAuth,
}) => {
  const { firebaseUser, userProfile, logout, isConfigured } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isDemoPreviewActive =
    demoPortalEnabled &&
    (currentRole === 'practitioner' || currentRole === 'admin') &&
    userProfile?.role !== currentRole &&
    !(currentRole === 'practitioner' && userProfile?.role === 'admin');

  const canEnterPractitioner = canAccessPortal({
    targetRole: 'practitioner',
    accountRole: (userProfile?.role as RoleType) || null,
    isAuthenticated: Boolean(firebaseUser),
    demoPortalEnabled,
    isFirebaseConfigured: isConfigured,
  }).allowed;

  const canEnterAdmin = canAccessPortal({
    targetRole: 'admin',
    accountRole: (userProfile?.role as RoleType) || null,
    isAuthenticated: Boolean(firebaseUser),
    demoPortalEnabled,
    isFirebaseConfigured: isConfigured,
  }).allowed;

  const getRoleLabel = (role: RoleType) => {
    switch (role) {
      case 'user':
        return 'Wellness User';
      case 'practitioner':
        return 'AYUSH Practitioner';
      case 'admin':
        return 'Administrator';
    }
  };

  const handleNavClick = (sectionId?: string) => {
    setMobileMenuOpen(false);
    if (currentView !== 'landing') {
      onNavigate('landing');
      // allow state to update before scrolling
      setTimeout(() => {
        if (sectionId) {
          const el = document.getElementById(sectionId);
          el?.scrollIntoView({ behavior: 'smooth' });
        }
      }, 80);
    } else if (sectionId) {
      const el = document.getElementById(sectionId);
      el?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#FCFBF6]/95 backdrop-blur-md border-b border-[#E8E2D0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-2 sm:gap-4 h-20">
          {/* Zone 1: Botanical Lotus + Brand Wordmark */}
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              onNavigate('landing');
            }}
            className="flex items-center gap-2.5 text-left group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3A6B4C] rounded-lg p-1 -m-1 shrink-0"
            aria-label="AYUSH Wellness Connect - Home"
          >
            <svg
              viewBox="0 0 40 36"
              className="w-8 h-7 shrink-0"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M20 4C16.5 10.5 16.5 18 20 25C23.5 18 23.5 10.5 20 4Z"
                fill="#7A9A48"
                stroke="#B59449"
                strokeWidth="1.2"
              />
              <path
                d="M19.5 25C13.5 22 9.5 15.5 9.5 9.5C14.5 11.5 18 16.5 19.5 25Z"
                fill="#96B25E"
                stroke="#B59449"
                strokeWidth="1.1"
              />
              <path
                d="M20.5 25C26.5 22 30.5 15.5 30.5 9.5C25.5 11.5 22 16.5 20.5 25Z"
                fill="#96B25E"
                stroke="#B59449"
                strokeWidth="1.1"
              />
              <path
                d="M19 26C12 25.5 6 21.5 4 16C9.5 16.5 14.5 20 19 26Z"
                fill="#C4A459"
                fillOpacity="0.85"
              />
              <path
                d="M21 26C28 25.5 34 21.5 36 16C30.5 16.5 25.5 20 21 26Z"
                fill="#C4A459"
                fillOpacity="0.85"
              />
              <path
                d="M10 29C14.5 27.5 25.5 27.5 30 29"
                stroke="#3A6B4C"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <span className="flex flex-col leading-none">
              <span className="text-base sm:text-lg font-serif font-bold tracking-tight text-[#163828] whitespace-nowrap shrink-0 group-hover:text-[#3A6B4C] transition-colors">
                AYUSH
              </span>
              <span className="text-[11px] sm:text-xs font-serif font-medium tracking-tight text-[#2B4636] whitespace-nowrap shrink-0">
                Wellness Connect
              </span>
            </span>
          </button>

          {/* Zone 2: Clean single-line text links */}
          <nav className="hidden lg:flex items-center gap-4 xl:gap-6 text-xs xl:text-[13px] font-medium text-[#355241]">
            <button
              onClick={() => handleNavClick()}
              className={`hover:text-[#163828] transition-colors whitespace-nowrap shrink-0 pb-1 border-b-2 ${
                currentView === 'landing' ? 'border-[#3A6B4C] text-[#163828] font-semibold' : 'border-transparent'
              }`}
            >
              Overview
            </button>
            {currentView === 'landing' && (
              <>
                <button
                  onClick={() => handleNavClick('ayush-intro-section')}
                  className="hover:text-[#163828] transition-colors whitespace-nowrap shrink-0 pb-1 border-b-2 border-transparent"
                >
                  What is AYUSH?
                </button>
                <button
                  onClick={() => handleNavClick('ayush-systems')}
                  className="hover:text-[#163828] transition-colors whitespace-nowrap shrink-0 pb-1 border-b-2 border-transparent"
                >
                  Five Systems
                </button>
                <button
                  onClick={() => handleNavClick('ayush-in-india')}
                  className="hover:text-[#163828] transition-colors whitespace-nowrap shrink-0 pb-1 border-b-2 border-transparent"
                >
                  AYUSH in India
                </button>
                <button
                  onClick={() => handleNavClick('what-platform-offers')}
                  className="hover:text-[#163828] transition-colors whitespace-nowrap shrink-0 pb-1 border-b-2 border-transparent"
                >
                  Platform Offerings
                </button>
              </>
            )}
            <button
              onClick={() => handleNavClick('disclaimer-section')}
              className="hover:text-[#163828] transition-colors whitespace-nowrap shrink-0 pb-1 border-b-2 border-transparent text-[#355241]"
            >
              Disclaimer
            </button>
          </nav>

          {/* Right-side controls wrapper (Notification Centre + Zone 3 + Mobile Menu) */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <NotificationCentre />

            {/* Zone 3: 1 Primary Action (Prominent Get Started or Role Switcher) */}
            <div className="hidden sm:flex items-center gap-2.5 shrink-0">
            <span
              className="hidden xl:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium whitespace-nowrap border bg-white text-[#163828] border-[#DCE3D2] shadow-2xs"
              title={isConfigured ? 'Connected to live Firebase Cloud Firestore' : 'Running in local persistent demo storage mode'}
            >
              <span className={`w-2 h-2 rounded-full ${isConfigured ? 'bg-[#2E7D4F]' : 'bg-amber-600'}`} />
              <span>{isConfigured ? 'Cloud Firestore' : 'Demo Storage Active'}</span>
            </span>

            {firebaseUser ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 pl-2 pr-3 py-1.5 rounded-full bg-[#F2EDE0] border border-[#D8D0BC] text-xs">
                  <span className="w-5 h-5 rounded-full bg-[#163828] text-white flex items-center justify-center font-bold text-[10px]">
                    {(userProfile?.displayName || firebaseUser.email || 'U')[0].toUpperCase()}
                  </span>
                  <span className="font-semibold text-[#163828] max-w-[120px] truncate">
                    {userProfile?.displayName || firebaseUser.email?.split('@')[0]}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => logout()}
                  className="px-2 py-1 text-xs text-[#41574A] hover:text-[#163828] hover:bg-[#EFEAD9] rounded-lg transition-colors flex items-center gap-1"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Sign Out</span>
                </button>
              </div>
            ) : onOpenAuth ? (
              <button
                type="button"
                onClick={onOpenAuth}
                className="px-3 py-2 text-xs font-medium text-[#163828] hover:text-[#3A6B4C] transition-colors whitespace-nowrap shrink-0"
              >
                Sign In / Register
              </button>
            ) : null}

            {currentView === 'dashboard' ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#4B5F52] hidden md:inline">
                  {isDemoPreviewActive ? 'DEMO MODE:' : 'Active Portal:'}
                </span>
                <button
                  type="button"
                  onClick={() => onNavigate('roles')}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-full transition-colors whitespace-nowrap shrink-0 border ${
                    isDemoPreviewActive
                      ? 'text-amber-950 bg-amber-50 hover:bg-amber-100 border-amber-300'
                      : 'text-[#163828] bg-[#F3EFE0] hover:bg-[#EAE3CE] border-[#D7CEB7]'
                  }`}
                  title="Open Portal Access & Demo Switcher"
                >
                  {currentRole === 'user' && <User className="w-3.5 h-3.5 text-[#3A6B4C]" />}
                  {currentRole === 'practitioner' && <Stethoscope className="w-3.5 h-3.5 text-[#3A6B4C]" />}
                  {currentRole === 'admin' && <Shield className="w-3.5 h-3.5 text-[#3A6B4C]" />}
                  <span>{getRoleLabel(currentRole)}</span>
                  <span className="text-[11px] text-[#3A6B4C] underline font-bold ml-1">Portal</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onNavigate('roles')}
                  className="hidden 2xl:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#3A6B4C] hover:text-[#163828] hover:bg-[#F3EFE0] rounded-full transition-colors whitespace-nowrap shrink-0"
                >
                  <span>Portal Access</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onSelectRole('user');
                    onNavigate('dashboard');
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white bg-[#163828] hover:bg-[#1E4A35] active:bg-[#10291D] rounded-full shadow-xs transition-colors whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#163828]"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Mobile menu hamburger */}
          <div className="lg:hidden flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => {
                onSelectRole('user');
                onNavigate('dashboard');
              }}
              className="px-3 py-1.5 text-[11px] font-semibold text-white bg-[#163828] rounded-full sm:hidden whitespace-nowrap"
            >
              Get Started
            </button>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-1.5 sm:p-2 text-[#163828] rounded-lg hover:bg-[#EFEAD9] focus:outline-none focus:ring-2 focus:ring-[#3A6B4C]"
                aria-label="Toggle navigation menu"
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? <X className="w-5 h-5 sm:w-6 sm:h-6" /> : <Menu className="w-5 h-5 sm:w-6 sm:h-6" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-[#E8E2D0] bg-[#FAF6EB] px-4 pt-3 pb-6 space-y-4">
          <nav className="flex flex-col space-y-2 text-base font-medium text-[#475569]">
            <button
              onClick={() => handleNavClick()}
              className="text-left py-2 px-3 rounded-lg hover:bg-[#F1F5F9] transition-colors"
            >
              Overview
            </button>
            <button
              onClick={() => handleNavClick('ayush-intro-section')}
              className="text-left py-2 px-3 rounded-lg hover:bg-[#F1F5F9] transition-colors"
            >
              What is AYUSH?
            </button>
            <button
              onClick={() => handleNavClick('ayush-systems')}
              className="text-left py-2 px-3 rounded-lg hover:bg-[#F1F5F9] transition-colors"
            >
              Five Systems
            </button>
            <button
              onClick={() => handleNavClick('ayush-in-india')}
              className="text-left py-2 px-3 rounded-lg hover:bg-[#F1F5F9] transition-colors"
            >
              AYUSH in India
            </button>
            <button
              onClick={() => handleNavClick('what-platform-offers')}
              className="text-left py-2 px-3 rounded-lg hover:bg-[#F1F5F9] transition-colors"
            >
              Platform Offerings
            </button>
            <button
              onClick={() => handleNavClick('disclaimer-section')}
              className="text-left py-2 px-3 rounded-lg hover:bg-amber-50 text-amber-700 transition-colors font-medium"
            >
              Public Health Disclaimer
            </button>
          </nav>

          {/* Mobile Auth Controls */}
          <div className="pt-3 border-t border-[#E2E8F0] px-2 flex items-center justify-between gap-2">
            {firebaseUser ? (
              <>
                <span className="text-xs font-semibold text-[#0F172A] truncate">
                  {userProfile?.displayName || firebaseUser.email}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-[#0284C7] bg-[#F1F5F9] rounded-lg"
                >
                  Sign Out
                </button>
              </>
            ) : onOpenAuth ? (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAuth();
                }}
                className="w-full py-2 text-xs font-semibold text-[#0F172A] bg-white border border-[#CBD5E1] rounded-lg"
              >
                Sign In / Register
              </button>
            ) : null}
          </div>

          <div className="pt-3 border-t border-[#E2E8F0] space-y-2">
            <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider px-3">
              {demoPortalEnabled ? 'DEMO MODE Portal Switcher (Preview Only)' : 'Portal Access'}
            </p>
            <div className="grid grid-cols-1 gap-2 px-2">
              <button
                type="button"
                onClick={() => {
                  onSelectRole('user');
                  onNavigate('dashboard');
                  setMobileMenuOpen(false);
                }}
                className={`flex items-center justify-between p-2.5 rounded-lg text-sm ${
                  currentRole === 'user' && currentView === 'dashboard'
                    ? 'bg-[#0284C7] text-white font-medium'
                    : 'bg-white text-[#0F172A] border border-[#E2E8F0]'
                }`}
              >
                <span>Wellness User Portal</span>
                <span className="text-xs opacity-75">Seeker</span>
              </button>
              {canEnterPractitioner && (
                <button
                  type="button"
                  onClick={() => {
                    onSelectRole('practitioner');
                    onNavigate('dashboard');
                    setMobileMenuOpen(false);
                  }}
                  className={`flex items-center justify-between p-2.5 rounded-lg text-sm ${
                    currentRole === 'practitioner' && currentView === 'dashboard'
                      ? userProfile?.role === 'practitioner' || userProfile?.role === 'admin'
                        ? 'bg-[#0284C7] text-white font-medium'
                        : 'bg-amber-600 text-white font-medium'
                      : userProfile?.role === 'practitioner' || userProfile?.role === 'admin'
                      ? 'bg-white text-[#0F172A] border border-[#E2E8F0]'
                      : 'bg-amber-50 text-amber-950 border border-amber-300'
                  }`}
                >
                  <span>
                    {userProfile?.role === 'practitioner' || userProfile?.role === 'admin'
                      ? 'Practitioner Portal'
                      : 'DEMO MODE: Practitioner Portal'}
                  </span>
                  <span className="text-xs opacity-75">
                    {userProfile?.role === 'practitioner' || userProfile?.role === 'admin'
                      ? 'Clinical'
                      : 'Preview'}
                  </span>
                </button>
              )}
              {canEnterAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    onSelectRole('admin');
                    onNavigate('dashboard');
                    setMobileMenuOpen(false);
                  }}
                  className={`flex items-center justify-between p-2.5 rounded-lg text-sm ${
                    currentRole === 'admin' && currentView === 'dashboard'
                      ? userProfile?.role === 'admin'
                        ? 'bg-[#0284C7] text-white font-medium'
                        : 'bg-amber-600 text-white font-medium'
                      : userProfile?.role === 'admin'
                      ? 'bg-white text-[#0F172A] border border-[#E2E8F0]'
                      : 'bg-amber-50 text-amber-950 border border-amber-300'
                  }`}
                >
                  <span>
                    {userProfile?.role === 'admin'
                      ? 'Admin Portal'
                      : 'DEMO MODE: Admin Portal'}
                  </span>
                  <span className="text-xs opacity-75">
                    {userProfile?.role === 'admin' ? 'Governance' : 'Preview'}
                  </span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  onNavigate('roles');
                  setMobileMenuOpen(false);
                }}
                className="flex items-center justify-between p-2.5 rounded-lg text-xs font-semibold bg-[#F1F5F9] text-[#0284C7] border border-[#CBD5E1]"
              >
                <span>Manage Portal Access / Demo Switcher</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
