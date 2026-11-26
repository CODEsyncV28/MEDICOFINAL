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
      className={`border border-[#E2E8F0] bg-[#F1F5F9] text-[#0F172A] rounded-xl ${
        compact ? 'p-3 text-xs' : 'p-4 text-xs md:text-sm'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0 text-[#0284C7]">
          {compact ? <Info className="w-4 h-4" /> : <ShieldAlert className="w-5 h-5" />}
        </div>
        <div className="space-y-1">
          <p className="font-semibold text-[#0F172A]">
            Educational Wellness Platform Notice
          </p>
          <p className="text-[#475569] leading-relaxed">
            AYUSH Wellness Connect provides general lifestyle guidance, routine tracking, and traditional health literacy. It is strictly not intended to diagnose, treat, or replace formal medical advice. Always consult certified AYUSH physicians or clinical doctors for medical concerns.
          </p>
        </div>
      </div>
    </div>
  );
};
