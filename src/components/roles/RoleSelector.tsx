import React from 'react';
import {
  User,
  Stethoscope,
  Shield,
  ArrowRight,
  CheckCircle2,
  Lock,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { RoleType } from '../../types';
import { canAccessPortal, PORTAL_SECURITY_DISCLAIMER } from '../../utils/portalAccess';

interface RoleSelectorProps {
  currentRole: RoleType;
  accountRole: RoleType | null;
  isAuthenticated: boolean;
  isConfigured: boolean;
  demoPortalEnabled: boolean;
  onToggleDemoPortal: (enabled: boolean) => void;
  onSelectRole: (role: RoleType) => void;
  onBackToLanding: () => void;
}

export const RoleSelector: React.FC<RoleSelectorProps> = ({
  currentRole,
  accountRole,
  isAuthenticated,
  isConfigured,
  demoPortalEnabled,
  onToggleDemoPortal,
  onSelectRole,
  onBackToLanding,
}) => {
  const roles = [
    {
      type: 'user' as RoleType,
      title: 'Wellness User',
      persona: 'Individual Seeker & Daily Practitioner',
      icon: User,
      badge: 'Daily Self-Care',
      description:
        'Track daily circadian rituals, log herbal teas and breathwork, take constitutional assessments, enroll in guided wellness programmes, and connect with certified AYUSH doctors.',
      keyFeatures: [
        'Interactive Daily Dinacharya Checklist',
        'Personalized Lifestyle Rhythm Assessment',
        'Enrolled Wellness Programmes & Progress',
        'Direct Practitioner Consultation Requests',
        'Curated Educational Guides & Recipes',
      ],
      sampleProfile: isAuthenticated
        ? `Signed-in account role: ${accountRole || 'user'}`
        : 'Previewing as: Guest Seeker (Local Persistent Demo Storage)',
      ctaText: 'Enter Wellness User Portal',
    },
    {
      type: 'practitioner' as RoleType,
      title: 'AYUSH Practitioner',
      persona: 'Certified Physician (BAMS, MD, BUMS, etc.)',
      icon: Stethoscope,
      badge: 'Restricted · Clinical Role',
      description:
        'Manage assigned seekers, monitor habit compliance, prescribe customized lifestyle and yoga regimens, review client notes, and draft evidence-based wellness educational guides.',
      keyFeatures: [
        'Roster of Assigned Seekers & Adherence',
        'Regimen Template Creation & Customization',
        'Virtual Lifestyle Consultation Schedule',
        'Educational Content Authoring & Submissions',
        'Demo CCIM / State Council Profile Preview',
      ],
      sampleProfile: 'Simulated practitioner preview: Dr. Ananya Sharma (BAMS, MD Ayurveda)',
      ctaText: 'Enter Practitioner Portal',
    },
    {
      type: 'admin' as RoleType,
      title: 'Platform Administrator',
      persona: 'Governance, Verification & Operations',
      icon: Shield,
      badge: 'Restricted · Governance Role',
      description:
        'Supervise platform-wide participation metrics, verify medical credentials and licenses of registering practitioners, and review educational publications before public release.',
      keyFeatures: [
        'Platform-Wide Analytics & AYUSH Breakdown',
        'Practitioner License Verification Queue',
        'Content Approval & Quality Assurance',
        'Safety & Compliance Oversight',
        'Community Participation Trends',
      ],
      sampleProfile: 'Simulated governance preview: AYUSH Central Platform Governance Console',
      ctaText: 'Enter Administrator Portal',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10">
      {/* Header */}
      <div className="max-w-3xl space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#CCFBF1] text-[#0F766E] rounded-full text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-[#0D9488]" />
          <span>Role Access & Hackathon Demo Switcher</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#0F172A]">
          Select Your Experience Portal
        </h1>
        <p className="text-sm sm:text-base text-[#475569] leading-relaxed">
          AYUSH Wellness Connect separates Seeker self-care from Practitioner and Administrator governance workspaces. Standard accounts and guests only have access to the Wellness User portal unless an authorized role is verified or the explicit Demo Mode switcher is enabled.
        </p>
      </div>

      {/* Authorization Boundary & Explicit DEMO MODE Portal Switcher */}
      <div className="p-5 rounded-2xl bg-white border border-[#CBD5E1] space-y-4 text-xs sm:text-sm text-[#475569] shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-[#0F172A]">
                {demoPortalEnabled
                  ? 'Portal Sandbox Switcher Active · All Portals Accessible (UI Preview Only)'
                  : 'Standard Role Access Active · Restricted Portals Locked'}
              </p>
              <p className="text-xs text-[#475569] leading-relaxed">
                {PORTAL_SECURITY_DISCLAIMER}
              </p>
              <p className="text-[11px] font-medium text-[#0284C7]">
                Current Account Identity:{' '}
                {isAuthenticated
                  ? `Signed-in Account (role: "${accountRole || 'user'}")`
                  : 'Unauthenticated Guest Preview'}
              </p>
            </div>
          </div>

          <div className="shrink-0 flex flex-col items-start md:items-end gap-1.5">
            <button
              type="button"
              role="switch"
              aria-checked={demoPortalEnabled}
              onClick={() => onToggleDemoPortal(!demoPortalEnabled)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                demoPortalEnabled
                  ? 'bg-amber-100 text-amber-950 border-amber-400 hover:bg-amber-200'
                  : 'bg-[#F1F5F9] text-[#0F172A] border-[#CBD5E1] hover:bg-[#E2E8F0]'
              }`}
            >
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  demoPortalEnabled ? 'bg-amber-600' : 'bg-slate-400'
                }`}
              />
              <span>
                {demoPortalEnabled
                  ? 'DEMO MODE Portal Switcher: ON (Disable)'
                  : 'Enable DEMO MODE Portal Switcher'}
              </span>
            </button>
            <span className="text-[10px] text-[#64748B]">
              Uses isolated local demo data · Never grants live Firebase privileges
            </span>
          </div>
        </div>
      </div>

      {/* Role Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {roles.map((r) => {
          const Icon = r.icon;
          const isSelected = currentRole === r.type;
          const access = canAccessPortal({
            targetRole: r.type,
            accountRole,
            isAuthenticated,
            demoPortalEnabled,
            isFirebaseConfigured: isConfigured,
          });

          return (
            <div
              key={r.type}
              className={`rounded-2xl p-6 sm:p-8 flex flex-col justify-between transition-all bg-white border ${
                !access.allowed
                  ? 'border-[#E2E8F0] opacity-85'
                  : isSelected
                  ? 'border-[#0284C7] ring-2 ring-[#0284C7]/15 shadow-md'
                  : 'border-[#E2E8F0] hover:border-[#CBD5E1] shadow-xs'
              }`}
            >
              <div className="space-y-6">
                {/* Header of card */}
                <div className="flex items-start justify-between gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[#F1F5F9] text-[#0284C7] flex items-center justify-center">
                    <Icon className="w-6 h-6" />
                  </div>
                  <span
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-md border ${
                      access.isDemoOverride
                        ? 'bg-amber-50 text-amber-900 border-amber-300'
                        : !access.allowed
                        ? 'bg-slate-100 text-slate-600 border-slate-200'
                        : 'text-[#0F766E] bg-[#CCFBF1] border-[#99F6E4]'
                    }`}
                  >
                    {access.isDemoOverride
                      ? 'DEMO MODE Preview'
                      : !access.allowed
                      ? 'Locked · Role Restricted'
                      : r.badge}
                  </span>
                </div>

                <div className="space-y-1">
                  <h2 className="text-xl font-serif font-bold text-[#0F172A]">
                    {r.title}
                  </h2>
                  <p className="text-xs font-semibold text-[#64748B]">
                    {r.persona}
                  </p>
                  <p className="text-xs sm:text-sm text-[#475569] leading-relaxed pt-2">
                    {r.description}
                  </p>
                </div>

                {/* Features list */}
                <div className="space-y-2.5 pt-2 border-t border-[#E2E8F0]">
                  <p className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                    Included Workflows:
                  </p>
                  <ul className="space-y-2 text-xs text-[#475569]">
                    {r.keyFeatures.map((f, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#0D9488] shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Sample Profile Note */}
                <div className="p-3 bg-[#F1F5F9] rounded-lg border border-[#E2E8F0] text-[11px] text-[#475569]">
                  {r.sampleProfile}
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-6 space-y-2">
                {access.allowed ? (
                  <button
                    type="button"
                    onClick={() => onSelectRole(r.type)}
                    className={`w-full inline-flex items-center justify-center gap-2 py-3 px-4 text-xs sm:text-sm font-semibold rounded-xl transition-colors ${
                      access.isDemoOverride
                        ? 'bg-amber-600 text-white hover:bg-amber-700'
                        : isSelected
                        ? 'bg-[#0284C7] text-white hover:bg-[#0369A1]'
                        : 'bg-[#F1F5F9] text-[#0F172A] hover:bg-[#E2E8F0] border border-[#CBD5E1]'
                    }`}
                  >
                    <span>
                      {access.isDemoOverride ? `DEMO MODE: ${r.ctaText}` : r.ctaText}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 text-xs sm:text-sm font-semibold rounded-xl bg-slate-100 text-slate-500 border border-slate-200 cursor-not-allowed"
                    title={access.reason}
                  >
                    <Lock className="w-4 h-4" />
                    <span>Restricted ({r.type === 'admin' ? 'Admin' : 'Practitioner'} Only)</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-center pt-4">
        <button
          type="button"
          onClick={onBackToLanding}
          className="text-xs sm:text-sm font-medium text-[#475569] hover:text-[#0F172A] underline"
        >
          Return to Platform Landing Page
        </button>
      </div>
    </div>
  );
};
