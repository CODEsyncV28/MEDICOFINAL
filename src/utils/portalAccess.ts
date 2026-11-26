import { RoleType } from '../types';

export const PORTAL_SECURITY_DISCLAIMER =
  'Client-side Demo Sandbox switching is for UI evaluation on local browser demo data only—it never grants live Firebase privileges or modifies account roles. Real role authorization, clinical record access, and administrative governance actions are strictly enforced server-side via authenticated tokens and Firebase Security Rules.';

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
 * - Practitioner and Administrator portals grant full live access to verified account roles,
 *   or isolated local sandbox UI preview when demoPortalEnabled is active (never granting live privileges).
 */
export function canAccessPortal({
  targetRole,
  accountRole,
  isAuthenticated,
  demoPortalEnabled,
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

  if (demoPortalEnabled) {
    return {
      allowed: true,
      isDemoOverride: true,
      reason:
        targetRole === 'admin'
          ? 'Entered Admin Portal in Demo Sandbox mode (local preview data only; live administrative privileges require an authorized admin account).'
          : 'Entered Practitioner Portal in Demo Sandbox mode (local preview data only; live clinical records require a verified practitioner account).',
    };
  }

  return {
    allowed: false,
    isDemoOverride: false,
    reason:
      targetRole === 'admin'
        ? 'Administrator portal requires an admin account (enforced by Firebase Security Rules in production). Enable the Portal Switcher for sandbox preview.'
        : 'Practitioner portal requires a verified practitioner account (enforced by Firebase Security Rules in production). Enable the Portal Switcher for sandbox preview.',
  };
}
