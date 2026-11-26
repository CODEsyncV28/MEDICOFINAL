import { Practitioner } from '../types';
import { PractitionerDocument, UserProfileDocument } from '../types/firebase';

export const DEFAULT_PRACTITIONER_PROFILE_ID = 'prac-1';

/**
 * Resolves the Practitioner identity passed into PractitionerDashboard & NewRegimenModal.
 *
 * - Authenticated Firestore practitioners (`role === 'practitioner'`) operate under
 *   their Firebase Auth UID (`request.auth.uid`), because Firestore security rules and
 *   indexed queries (`clientProfiles`, `consultations`, `wellnessPrograms`, `educationalArticles`)
 *   validate `request.auth.uid` directly.
 * - Demo Mode previews or non-practitioner evaluators keep the static demo practitioner
 *   record (`prac-1`) so seeded localStorage demo cohorts remain accessible.
 */
export function resolvePractitionerForWorkspace(
  basePractitioner: Practitioner,
  authUid: string | null | undefined,
  userProfile: UserProfileDocument | null | undefined,
  isDemoOverride: boolean = false,
  verifiedPractitioners: PractitionerDocument[] = []
): Practitioner {
  if (
    !isDemoOverride &&
    authUid &&
    authUid.trim() &&
    userProfile?.role === 'practitioner'
  ) {
    const cleanUid = authUid.trim();
    const matchedDoc = verifiedPractitioners.find(
      (p) => p.userId?.trim() === cleanUid
    );
    if (matchedDoc) {
      const mapped = mapPractitionerDocumentToPractitioner(matchedDoc, basePractitioner);
      return {
        ...mapped,
        id: cleanUid,
        name: userProfile.displayName?.trim() || mapped.name,
      };
    }
    return {
      ...basePractitioner,
      id: cleanUid,
      name: userProfile.displayName?.trim() || basePractitioner.name,
    };
  }

  return basePractitioner;
}

/**
 * Resolves which Practitioner a Wellness Seeker views and submits consultation requests to.
 *
 * Live Firebase Mode (`isFirebaseConfigured === true`):
 * - ONLY verified `/practitioners` records (`isVerified === true`, non-empty `userId !== 'prac-1'`)
 *   are offered.
 * - Priority 1: Explicitly assigned practitioner Auth UID (`clientProfileAssignedPractitionerId`
 *   from `/clientProfiles/{uid}`, or `userProfile.assignedPractitionerId`), matched strictly
 *   against verified practitioner profiles.
 * - Priority 2 (when unassigned): First verified practitioner in `/practitioners`.
 * - Returns `null` when no verified practitioner is available (NEVER falls back to `'prac-1'`).
 *
 * Demo Mode (`isFirebaseConfigured === false`):
 * - Uses assigned or verified practitioner if available, falling back to `basePractitioner` (`'prac-1'`).
 */
export function resolvePractitionerForSeeker(
  basePractitioner: Practitioner,
  userProfile: UserProfileDocument | null | undefined,
  verifiedPractitioners: PractitionerDocument[] = [],
  isFirebaseConfigured: boolean = false,
  clientProfileAssignedPractitionerId?: string | null
): Practitioner | null {
  const verifiedPool = verifiedPractitioners.filter(
    (p) =>
      p.isVerified === true &&
      Boolean(p.userId?.trim()) &&
      p.userId.trim() !== DEFAULT_PRACTITIONER_PROFILE_ID
  );

  const assignedUid =
    clientProfileAssignedPractitionerId?.trim() ||
    userProfile?.assignedPractitionerId?.trim() ||
    '';

  if (isFirebaseConfigured) {
    if (verifiedPool.length === 0) {
      return null;
    }

    if (assignedUid) {
      if (assignedUid === DEFAULT_PRACTITIONER_PROFILE_ID) {
        return null;
      }
      const matched = verifiedPool.find((p) => p.userId.trim() === assignedUid);
      return matched ? mapPractitionerDocumentToPractitioner(matched, basePractitioner) : null;
    }

    const verifiedDefault =
      verifiedPool.find((p) => p.id === basePractitioner.id) || verifiedPool[0];
    return mapPractitionerDocumentToPractitioner(verifiedDefault, basePractitioner);
  }

  // Demo Mode branch (`!isFirebaseConfigured`)
  if (assignedUid) {
    const matched = verifiedPool.find(
      (p) => p.userId.trim() === assignedUid || p.id === assignedUid
    );
    if (matched) {
      return mapPractitionerDocumentToPractitioner(matched, basePractitioner);
    }
    return {
      ...basePractitioner,
      id: assignedUid,
      name: userProfile?.assignedPractitionerName?.trim() || basePractitioner.name,
    };
  }

  const verifiedDefault =
    verifiedPool.find((p) => p.id === basePractitioner.id) || verifiedPool[0];
  if (verifiedDefault) {
    return mapPractitionerDocumentToPractitioner(verifiedDefault, basePractitioner);
  }

  return basePractitioner;
}

export function mapPractitionerDocumentToPractitioner(
  docItem: PractitionerDocument,
  fallback: Practitioner
): Practitioner {
  return {
    id: docItem.userId.trim(),
    name: docItem.name || fallback.name,
    qualification: docItem.qualification || fallback.qualification,
    discipline: docItem.discipline || fallback.discipline,
    specialization: docItem.specialization || fallback.specialization,
    experienceYears:
      typeof docItem.experienceYears === 'number'
        ? docItem.experienceYears
        : fallback.experienceYears,
    councilRegistration: docItem.councilRegistration || fallback.councilRegistration,
    activeClientsCount:
      typeof docItem.activeClientsCount === 'number'
        ? docItem.activeClientsCount
        : fallback.activeClientsCount,
    rating: typeof docItem.rating === 'number' ? docItem.rating : fallback.rating,
    bio: docItem.bio || fallback.bio,
    nextAvailableSlot: docItem.nextAvailableSlot || fallback.nextAvailableSlot,
  };
}
