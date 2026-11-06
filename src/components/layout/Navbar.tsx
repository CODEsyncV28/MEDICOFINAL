import React, { useState } from 'react';
import { Menu, X, ArrowRight, ShieldCheck, User, Stethoscope, Shield, LogOut } from 'lucide-react';
import { RoleType } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

interface NavbarProps {
  currentView: 'landing' | 'roles' | 'dashboard';
  currentRole: RoleType;
  onNavigate: (view: 'landing' | 'roles' | 'dashboard') => void;
  onSelectRole: (role: RoleType) => void;
  onOpenAuth?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  currentRole,
  onNavigate,
  onSelectRole,
  onOpenAuth,
}) => {
  const { firebaseUser, userProfile, logout, isConfigured } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    <header className="sticky top-0 z-40 bg-[#FAFAF7]/95 backdrop-blur-md border-b border-[#E4E8E3]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-8 h-20">
          {/* Zone 1: Brand Wordmark (Single text element in display face) */}
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              onNavigate('landing');
            }}
            className="text-left group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2D5A43] rounded-lg p-1 -m-1"
            aria-label="AYUSH Wellness Connect - Home"
          >
            <span className="text-xl sm:text-2xl font-serif font-bold tracking-tight text-[#1E3F2E] whitespace-nowrap shrink-0 group-hover:text-[#2D5A43] transition-colors">
              AYUSH Wellness Connect
            </span>
          </button>

          {/* Zone 2: Clean single-line text links */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-[#405448]">
            <button
              onClick={() => handleNavClick()}
              className={`hover:text-[#1E3F2E] transition-colors whitespace-nowrap shrink-0 pb-1 border-b-2 ${
                currentView === 'landing' ? 'border-[#2D5A43] text-[#1E3F2E] font-semibold' : 'border-transparent'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => handleNavClick('ayush-intro-section')}
              className="hover:text-[#1E3F2E] transition-colors whitespace-nowrap shrink-0 pb-1 border-b-2 border-transparent"
            >
              What is AYUSH?
            </button>
            <button
              onClick={() => handleNavClick('ayush-systems')}
              className="hover:text-[#1E3F2E] transition-colors whitespace-nowrap shrink-0 pb-1 border-b-2 border-transparent"
            >
              Five Systems
            </button>
            <button
              onClick={() => handleNavClick('ayush-in-india')}
              className="hover:text-[#1E3F2E] transition-colors whitespace-nowrap shrink-0 pb-1 border-b-2 border-transparent"
            >
              AYUSH in India
            </button>
            <button
              onClick={() => handleNavClick('what-platform-offers')}
              className="hover:text-[#1E3F2E] transition-colors whitespace-nowrap shrink-0 pb-1 border-b-2 border-transparent"
            >
              Platform Offerings
            </button>
            <button
              onClick={() => handleNavClick('disclaimer-section')}
              className="hover:text-[#1E3F2E] transition-colors whitespace-nowrap shrink-0 pb-1 border-b-2 border-transparent text-[#A64B2A]"
            >
              Disclaimer
            </button>
          </nav>

          {/* Zone 3: 1 Primary Action (Prominent Get Started or Role Switcher) */}
          <div className="hidden sm:flex items-center gap-3 shrink-0">
            <span
              className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#EBF2ED] text-[#244E38] border border-[#CCDCD2]"
              title={isConfigured ? 'Connected to live Firebase Cloud Firestore' : 'Running in local persistent demo storage mode'}
            >
              <span className={`w-2 h-2 rounded-full ${isConfigured ? 'bg-emerald-600' : 'bg-amber-600'}`} />
              <span>{isConfigured ? 'Cloud Firestore' : 'Demo Storage Active'}</span>
            </span>

            {firebaseUser ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 pl-2 pr-3 py-1.5 rounded-full bg-[#EBF2ED] border border-[#CCDCD2] text-xs">
                  <span className="w-5 h-5 rounded-full bg-[#2D5A43] text-white flex items-center justify-center font-bold text-[10px]">
                    {(userProfile?.displayName || firebaseUser.email || 'U')[0].toUpperCase()}
                  </span>
                  <span className="font-semibold text-[#1C3A29] max-w-[120px] truncate">
                    {userProfile?.displayName || firebaseUser.email?.split('@')[0]}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => logout()}
                  className="px-2 py-1 text-xs text-[#526B5C] hover:text-[#1E3F2E] hover:bg-[#EBF2ED] rounded-lg transition-colors flex items-center gap-1"
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
                className="px-3 py-2 text-xs font-semibold text-[#1E3F2E] hover:text-[#2D5A43] transition-colors whitespace-nowrap shrink-0"
              >
                Sign In / Register
              </button>
            ) : null}

            {currentView === 'dashboard' ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#526B5C] hidden md:inline">Active Portal:</span>
                <button
                  onClick={() => onNavigate('roles')}
                  className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-[#1E3F2E] bg-[#EBF2ED] hover:bg-[#DCE7E0] border border-[#D1DDD5] rounded-xl transition-colors whitespace-nowrap shrink-0"
                  title="Switch to another portal"
                >
                  {currentRole === 'user' && <User className="w-3.5 h-3.5 text-[#2D5A43]" />}
                  {currentRole === 'practitioner' && <Stethoscope className="w-3.5 h-3.5 text-[#2D5A43]" />}
                  {currentRole === 'admin' && <Shield className="w-3.5 h-3.5 text-[#2D5A43]" />}
                  <span>{getRoleLabel(currentRole)}</span>
                  <span className="text-[11px] text-[#2D5A43] underline font-bold ml-1">Switch</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onNavigate('roles')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#2D5A43] hover:text-[#173827] hover:bg-[#EBF2ED] rounded-xl transition-colors whitespace-nowrap shrink-0"
                >
                  <span>Select Role</span>
                </button>
                <button
                  onClick={() => onNavigate('roles')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white bg-[#2D5A43] hover:bg-[#234835] active:bg-[#1A3728] rounded-xl shadow-xs transition-colors whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#2D5A43]"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Mobile menu hamburger */}
          <div className="lg:hidden flex items-center gap-2">
            <button
              onClick={() => onNavigate('roles')}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-[#2D5A43] rounded-lg sm:hidden whitespace-nowrap"
            >
              Get Started
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-[#2D5A43] rounded-lg hover:bg-[#EBF2ED] focus:outline-none focus:ring-2 focus:ring-[#2D5A43]"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-[#E4E8E3] bg-[#FAFAF7] px-4 pt-3 pb-6 space-y-4">
          <nav className="flex flex-col space-y-2 text-base font-medium text-[#2E4237]">
            <button
              onClick={() => handleNavClick()}
              className="text-left py-2 px-3 rounded-lg hover:bg-[#EBF2ED] transition-colors"
            >
              Overview
            </button>
            <button
              onClick={() => handleNavClick('ayush-intro-section')}
              className="text-left py-2 px-3 rounded-lg hover:bg-[#EBF2ED] transition-colors"
            >
              What is AYUSH?
            </button>
            <button
              onClick={() => handleNavClick('ayush-systems')}
              className="text-left py-2 px-3 rounded-lg hover:bg-[#EBF2ED] transition-colors"
            >
              Five Systems
            </button>
            <button
              onClick={() => handleNavClick('ayush-in-india')}
              className="text-left py-2 px-3 rounded-lg hover:bg-[#EBF2ED] transition-colors"
            >
              AYUSH in India
            </button>
            <button
              onClick={() => handleNavClick('what-platform-offers')}
              className="text-left py-2 px-3 rounded-lg hover:bg-[#EBF2ED] transition-colors"
            >
              Platform Offerings
            </button>
            <button
              onClick={() => handleNavClick('disclaimer-section')}
              className="text-left py-2 px-3 rounded-lg hover:bg-[#FAF4EF] text-[#A64B2A] transition-colors font-medium"
            >
              Public Health Disclaimer
            </button>
          </nav>

          <div className="pt-3 border-t border-[#E4E8E3] space-y-2">
            <p className="text-xs font-semibold text-[#526B5C] uppercase tracking-wider px-3">
              Switch Role Preview
            </p>
            <div className="grid grid-cols-1 gap-2 px-2">
              <button
                onClick={() => {
                  onSelectRole('user');
                  onNavigate('dashboard');
                  setMobileMenuOpen(false);
                }}
                className={`flex items-center justify-between p-2.5 rounded-lg text-sm ${
                  currentRole === 'user' && currentView === 'dashboard'
                    ? 'bg-[#2D5A43] text-white font-medium'
                    : 'bg-white text-[#1E3F2E] border border-[#E4E8E3]'
                }`}
              >
                <span>Wellness User Portal</span>
                <span className="text-xs opacity-75">Seeker</span>
              </button>
              <button
                onClick={() => {
                  onSelectRole('practitioner');
                  onNavigate('dashboard');
                  setMobileMenuOpen(false);
                }}
                className={`flex items-center justify-between p-2.5 rounded-lg text-sm ${
                  currentRole === 'practitioner' && currentView === 'dashboard'
                    ? 'bg-[#2D5A43] text-white font-medium'
                    : 'bg-white text-[#1E3F2E] border border-[#E4E8E3]'
                }`}
              >
                <span>Practitioner Portal</span>
                <span className="text-xs opacity-75">BAMS / MD</span>
              </button>
              <button
                onClick={() => {
                  onSelectRole('admin');
                  onNavigate('dashboard');
                  setMobileMenuOpen(false);
                }}
                className={`flex items-center justify-between p-2.5 rounded-lg text-sm ${
                  currentRole === 'admin' && currentView === 'dashboard'
                    ? 'bg-[#2D5A43] text-white font-medium'
                    : 'bg-white text-[#1E3F2E] border border-[#E4E8E3]'
                }`}
              >
                <span>Admin Portal</span>
                <span className="text-xs opacity-75">Governance</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
