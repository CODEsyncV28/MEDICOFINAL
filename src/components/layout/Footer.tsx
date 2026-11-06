import React from 'react';
import { ShieldCheck, Heart, Leaf } from 'lucide-react';
import { SafetyBanner } from '../common/SafetyBanner';

interface FooterProps {
  onNavigateLandingSection?: (sectionId: string) => void;
  onOpenRoles?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigateLandingSection, onOpenRoles }) => {
  return (
    <footer className="bg-[#1C3627] text-[#D8E4DC] pt-14 pb-10 border-t border-[#294B37]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Upper Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-12">
          {/* Col 1: Brand Info */}
          <div className="space-y-4 md:col-span-2">
            <div className="flex items-center gap-2">
              <span className="text-xl font-serif font-bold text-white tracking-tight">
                AYUSH Wellness Connect
              </span>
            </div>
            <p className="text-sm text-[#A8C2B3] leading-relaxed max-w-md">
              A digital lifestyle support and health education platform bridging traditional AYUSH wisdom with modern wellness habits. Empowering individuals with personalized daily routines, verified practitioner guidance, and verified education.
            </p>
            <div className="pt-2 text-xs text-[#87A895] flex items-center gap-2">
              <Leaf className="w-4 h-4 text-[#75BA94]" />
              <span>Ayurveda · Yoga & Naturopathy · Unani · Siddha · Homeopathy</span>
            </div>
          </div>

          {/* Col 2: Navigation Links */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-white tracking-wider uppercase">
              Platform Navigation
            </h4>
            <ul className="space-y-2 text-sm text-[#A8C2B3]">
              <li>
                <button
                  onClick={() => onNavigateLandingSection?.('hero-section')}
                  className="hover:text-white transition-colors"
                >
                  Brochure Overview
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigateLandingSection?.('ayush-intro-section')}
                  className="hover:text-white transition-colors"
                >
                  What is AYUSH (Part A)
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigateLandingSection?.('ayush-systems')}
                  className="hover:text-white transition-colors"
                >
                  Five Systems (Part B)
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigateLandingSection?.('ayush-in-india')}
                  className="hover:text-white transition-colors"
                >
                  AYUSH in India (Part C)
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigateLandingSection?.('what-platform-offers')}
                  className="hover:text-white transition-colors"
                >
                  What Platform Offers (Part D)
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigateLandingSection?.('disclaimer-section')}
                  className="hover:text-white text-[#F2A88D] transition-colors"
                >
                  Public Health Disclaimer (Part E)
                </button>
              </li>
              <li>
                <button
                  onClick={onOpenRoles}
                  className="text-[#84D4A8] hover:text-white font-medium transition-colors"
                >
                  Role Portals Preview
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Traditional Disciplines */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-white tracking-wider uppercase">
              AYUSH Systems
            </h4>
            <ul className="space-y-1.5 text-xs text-[#A8C2B3]">
              <li>
                <strong className="text-white font-medium">Ayurveda:</strong> Dosha & Agni Balance
              </li>
              <li>
                <strong className="text-white font-medium">Yoga & Naturopathy:</strong> Breath & Alignment
              </li>
              <li>
                <strong className="text-white font-medium">Unani:</strong> Humoral Equilibrium
              </li>
              <li>
                <strong className="text-white font-medium">Siddha:</strong> Kayakalpa Rejuvenation
              </li>
              <li>
                <strong className="text-white font-medium">Homeopathy:</strong> Individualized Vitality
              </li>
            </ul>
          </div>
        </div>

        {/* Prominent Safety Disclaimer in Footer */}
        <div className="bg-[#142A1E] border border-[#264A35] rounded-xl p-5 text-xs text-[#B2CCC0] leading-relaxed">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-[#6EB88F] shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-white mb-1">
                Mandatory Medical & Health Safety Disclaimer
              </p>
              <p>
                AYUSH Wellness Connect is an educational lifestyle support platform created to assist individuals in observing daily routines, learning classical health principles, and connecting with certified practitioners. This platform does not provide medical diagnoses, emergency healthcare, or clinical prescriptions. Traditional regimens must be undertaken in consultation with qualified physicians. If you are experiencing acute medical symptoms or taking prescription medication, please consult your primary physician immediately.
              </p>
            </div>
          </div>
        </div>

        {/* Lower row */}
        <div className="pt-6 border-t border-[#294B37] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#87A895]">
          <p>© 2026 AYUSH Wellness Connect. All rights reserved. Demonstration Platform.</p>
          <div className="flex items-center gap-6">
            <span>Evidence-Informed Traditional Health</span>
            <span>·</span>
            <span>Non-Diagnostic Lifestyle Education</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
