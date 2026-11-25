import { RoleType } from '../types';

export const PORTAL_SECURITY_DISCLAIMER =
  'Client-side role controls and the DEMO MODE portal switcher are for hackathon demonstration and UI preview only—they do not provide production-grade security. Real role authorization and data isolation must be enforced server-side via authenticated tokens and Firebase Security Rules.';

export interface PortalAccessInput {
  targetRole: RoleType;
  accountRole: RoleType | null;
  isAuthenticated: boolean;
  demoPortalEnabled: boolean;
  isFirebaseConfigured: boolean;
}

export interface PortalAccessDecision {
  allowed: boolean;
  isDemoOverride: boolean;
  reason: string;
}

/**
 * Evaluates whether a user may enter the requested portal.
 * - Wellness User portal ('user') is open to seekers and guests.
 * - Practitioner and Administrator portals require matching verified account privileges
 *   or an explicit local DEMO MODE portal switcher opt-in (when Firebase is not configured).
 */
export function canAccessPortal({
  targetRole,
  accountRole,
  isAuthenticated,
  demoPortalEnabled,
  isFirebaseConfigured,
}: PortalAccessInput): PortalAccessDecision {
  if (targetRole === 'user') {
    return {
      allowed: true,
      isDemoOverride: false,
      reason: 'Seeker portal is available for personalized wellness tracking.',
    };
  }

  const hasVerifiedPractitionerRole =
    isAuthenticated && (accountRole === 'practitioner' || accountRole === 'admin');
  const hasVerifiedAdminRole = isAuthenticated && accountRole === 'admin';

  if (targetRole === 'practitioner' && hasVerifiedPractitionerRole) {
    return {
      allowed: true,
      isDemoOverride: false,
      reason: 'Authorized practitioner credentials verified on account profile.',
    };
  }

  if (targetRole === 'admin' && hasVerifiedAdminRole) {
    return {
      allowed: true,
      isDemoOverride: false,
      reason: 'Authorized administrator credentials verified on account profile.',
    };
  }

  if (!isFirebaseConfigured && demoPortalEnabled) {
    return {
      allowed: true,
      isDemoOverride: true,
      reason:
        'Entered via explicit DEMO MODE portal switcher (UI preview only; account role remains unchanged).',
    };
  }

  return {
    allowed: false,
    isDemoOverride: false,
    reason:
      targetRole === 'admin'
        ? 'Administrator portal requires an admin account (enforced by Firebase Security Rules in production). Enable the explicit DEMO MODE portal switcher for hackathon preview.'
        : 'Practitioner portal requires a verified practitioner account (enforced by Firebase Security Rules in production). Enable the explicit DEMO MODE portal switcher for hackathon preview.',
  };
}
