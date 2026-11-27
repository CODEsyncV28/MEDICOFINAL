import React from 'react';
import { ShieldAlert, Info } from 'lucide-react';

interface SafetyBannerProps {
  compact?: boolean;
}

export const SafetyBanner: React.FC<SafetyBannerProps> = ({ compact = false }) => {
  return (
    <div
      role="region"
      aria-label="Health and Safety Notice"
      className={`border border-[#DDD5BF] bg-[#F5F0E1] text-[#163828] rounded-2xl ${
        compact ? 'p-3 text-xs' : 'p-4 sm:p-5 text-xs md:text-sm'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0 text-[#3A6B4C]">
          {compact ? <Info className="w-4 h-4" /> : <ShieldAlert className="w-5 h-5" />}
        </div>
        <div className="space-y-1">
          <p className="font-semibold text-[#163828]">
            Educational Wellness Platform Notice
          </p>
          <p className="text-[#41574A] leading-relaxed">
            AYUSH Wellness Connect provides general lifestyle guidance, routine tracking, and traditional health literacy. It is strictly not intended to diagnose, treat, or replace formal medical advice. Always consult certified AYUSH physicians or clinical doctors for medical concerns.
          </p>
        </div>
      </div>
    </div>
  );
};
