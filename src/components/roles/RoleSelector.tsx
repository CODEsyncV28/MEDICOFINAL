import React from 'react';
import { User, Stethoscope, Shield, ArrowRight, CheckCircle2, Sparkles, Info } from 'lucide-react';
import { RoleType } from '../../types';

interface RoleSelectorProps {
  currentRole: RoleType;
  onSelectRole: (role: RoleType) => void;
  onBackToLanding: () => void;
}

export const RoleSelector: React.FC<RoleSelectorProps> = ({
  currentRole,
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
      sampleProfile: 'Previewing as: Priya Sundaram (Prakriti Assessment: 75% complete)',
      ctaText: 'Enter Wellness User Portal',
    },
    {
      type: 'practitioner' as RoleType,
      title: 'AYUSH Practitioner',
      persona: 'Certified Physician (BAMS, MD, BUMS, etc.)',
      icon: Stethoscope,
      badge: 'Clinical Guidance',
      description:
        'Manage assigned seekers, monitor habit compliance, prescribe customized lifestyle and yoga regimens, review client notes, and draft evidence-based wellness educational guides.',
      keyFeatures: [
        'Roster of Assigned Seekers & Adherence',
        'Regimen Template Creation & Customization',
        'Virtual Lifestyle Consultation Schedule',
        'Educational Content Authoring & Submissions',
        'Verified CCIM / State Council Profile',
      ],
      sampleProfile: 'Previewing as: Dr. Ananya Sharma (BAMS, MD Ayurveda, 48 active clients)',
      ctaText: 'Enter Practitioner Portal',
    },
    {
      type: 'admin' as RoleType,
      title: 'Platform Administrator',
      persona: 'Governance, Verification & Operations',
      icon: Shield,
      badge: 'Platform Quality & Compliance',
      description:
        'Supervise platform-wide participation metrics, verify medical credentials and licenses of registering practitioners, and review educational publications before public release.',
      keyFeatures: [
        'Platform-Wide Analytics & AYUSH Breakdown',
        'Practitioner License Verification Queue',
        'Content Approval & Quality Assurance',
        'Safety & Compliance Oversight',
        'Community Participation Trends',
      ],
      sampleProfile: 'Previewing as: AYUSH Central Platform Governance Console',
      ctaText: 'Enter Administrator Portal',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10">
      {/* Header */}
      <div className="max-w-3xl space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#EBF2ED] text-[#244E38] rounded-full text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-[#2D5A43]" />
          <span>Interactive Role Preview Mode</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#142A1E]">
          Select Your Experience Portal
        </h1>
        <p className="text-sm sm:text-base text-[#405648] leading-relaxed">
          AYUSH Wellness Connect accommodates three key participants. Select a role below to explore realistic workflows, sample data records, and administrative interfaces.
        </p>
      </div>

      {/* Demonstration Notice */}
      <div className="p-4 rounded-xl bg-white border border-[#CCD5CB] flex items-start gap-3 text-xs sm:text-sm text-[#3E5547]">
        <Info className="w-5 h-5 text-[#2D5A43] shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-semibold text-[#1E3F2E]">
            Demonstration Environment · No Authentication Barrier
          </p>
          <p className="text-xs text-[#526B5C]">
            All three roles are fully unlocked for evaluation. Switch between roles anytime using the top navigation bar or this switcher without losing your session progress.
          </p>
        </div>
      </div>

      {/* Role Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {roles.map((r) => {
          const Icon = r.icon;
          const isSelected = currentRole === r.type;

          return (
            <div
              key={r.type}
              className={`rounded-2xl p-6 sm:p-8 flex flex-col justify-between transition-all bg-white border ${
                isSelected
                  ? 'border-[#2D5A43] ring-2 ring-[#2D5A43]/15 shadow-md'
                  : 'border-[#E4E8E3] hover:border-[#CCD5CB] shadow-xs'
              }`}
            >
              <div className="space-y-6">
                {/* Header of card */}
                <div className="flex items-start justify-between gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[#EBF2ED] text-[#2D5A43] flex items-center justify-center">
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-semibold text-[#2D5A43] bg-[#F2F7F4] px-2.5 py-1 rounded-md border border-[#DCE7E0]">
                    {r.badge}
                  </span>
                </div>

                <div className="space-y-1">
                  <h2 className="text-xl font-serif font-bold text-[#1E3F2E]">
                    {r.title}
                  </h2>
                  <p className="text-xs font-semibold text-[#526B5C]">
                    {r.persona}
                  </p>
                  <p className="text-xs sm:text-sm text-[#4E6457] leading-relaxed pt-2">
                    {r.description}
                  </p>
                </div>

                {/* Features list */}
                <div className="space-y-2.5 pt-2 border-t border-[#EEF2EC]">
                  <p className="text-xs font-bold text-[#1E3F2E] uppercase tracking-wider">
                    Included Workflows:
                  </p>
                  <ul className="space-y-2 text-xs text-[#3E5547]">
                    {r.keyFeatures.map((f, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#2D5A43] shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Sample Profile Note */}
                <div className="p-3 bg-[#F8FAF7] rounded-lg border border-[#E8EEE8] text-[11px] text-[#526B5C]">
                  {r.sampleProfile}
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-6">
                <button
                  type="button"
                  onClick={() => onSelectRole(r.type)}
                  className={`w-full inline-flex items-center justify-center gap-2 py-3 px-4 text-xs sm:text-sm font-semibold rounded-xl transition-colors ${
                    isSelected
                      ? 'bg-[#2D5A43] text-white hover:bg-[#234835]'
                      : 'bg-[#EBF2ED] text-[#1E3F2E] hover:bg-[#DCE7E0] border border-[#CCD5CB]'
                  }`}
                >
                  <span>{r.ctaText}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-center pt-4">
        <button
          type="button"
          onClick={onBackToLanding}
          className="text-xs sm:text-sm font-medium text-[#526B5C] hover:text-[#1E3F2E] underline"
        >
          Return to Platform Landing Page
        </button>
      </div>
    </div>
  );
};
