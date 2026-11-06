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
      className={`border border-[#E4E8E3] bg-[#F7F9F6] text-[#2C4A3A] rounded-xl ${
        compact ? 'p-3 text-xs' : 'p-4 text-xs md:text-sm'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0 text-[#2D5A43]">
          {compact ? <Info className="w-4 h-4" /> : <ShieldAlert className="w-5 h-5" />}
        </div>
        <div className="space-y-1">
          <p className="font-semibold text-[#1E3F2E]">
            Educational Wellness Platform Notice
          </p>
          <p className="text-[#3A5345] leading-relaxed">
            AYUSH Wellness Connect provides general lifestyle guidance, routine tracking, and traditional health literacy. It is strictly not intended to diagnose, treat, or replace formal medical advice. Always consult certified AYUSH physicians or clinical doctors for medical concerns.
          </p>
        </div>
      </div>
    </div>
  );
};
