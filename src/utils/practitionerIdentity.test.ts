import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_PRACTITIONER_PROFILE_ID,
  resolvePractitionerForSeeker,
  resolvePractitionerForWorkspace,
} from './practitionerIdentity';
import { PRIMARY_PRACTITIONER } from '../data/mockData';
import { PractitionerDocument, UserProfileDocument } from '../types/firebase';

describe('practitionerIdentity resolution', () => {
  const verifiedDoc: PractitionerDocument = {
    id: 'prac-1',
    userId: 'uid_prac_ananya',
    name: 'Dr. Ananya Sharma',
    qualification: 'BAMS, MD (Ayurveda)',
    discipline: 'Ayurveda',
    specialization: 'Circadian Wellness',
    experienceYears: 12,
    councilRegistration: 'NCISM-84920',
    isVerified: true,
    activeClientsCount: 48,
    rating: 4.95,
    bio: 'Verified AYUSH physician.',
    nextAvailableSlot: 'Tomorrow 10:30 AM',
    createdAt: '2026-10-01T00:00:00.000Z',
  };

  it('keeps static prac-1 for Demo Mode and unauthenticated preview', () => {
    const guest = resolvePractitionerForWorkspace(PRIMARY_PRACTITIONER, null, null, false);
    assert.equal(guest.id, DEFAULT_PRACTITIONER_PROFILE_ID);

    const demoOverride = resolvePractitionerForWorkspace(
      PRIMARY_PRACTITIONER,
      'uid_seeker_1',
      {
        uid: 'uid_seeker_1',
        email: 'seeker@example.com',
        displayName: 'Seeker',
        role: 'user',
        createdAt: '2026-11-01T00:00:00.000Z',
        updatedAt: '2026-11-01T00:00:00.000Z',
        agreedToTerms: true,
      },
      true
    );
    assert.equal(demoOverride.id, DEFAULT_PRACTITIONER_PROFILE_ID);
  });

  it('maps authenticated practitioner workspace to Firebase Auth UID', () => {
    const pracProfile: UserProfileDocument = {
      uid: 'uid_prac_ananya',
      email: 'ananya@ayush.org',
      displayName: 'Dr. Ananya Sharma',
      role: 'practitioner',
      createdAt: '2026-11-01T00:00:00.000Z',
      updatedAt: '2026-11-01T00:00:00.000Z',
      agreedToTerms: true,
    };
    const resolved = resolvePractitionerForWorkspace(
      PRIMARY_PRACTITIONER,
      'uid_prac_ananya',
      pracProfile,
      false
    );
    assert.equal(resolved.id, 'uid_prac_ananya');
    assert.equal(resolved.name, 'Dr. Ananya Sharma');
  });

  it('maps seeker target practitioner to assignedPractitionerId or verified practitioner Auth UID', () => {
    const seekerWithAssignment: UserProfileDocument = {
      uid: 'uid_seeker_1',
      email: 'seeker@example.com',
      displayName: 'Aarav',
      role: 'user',
      assignedPractitionerId: 'uid_prac_custom',
      assignedPractitionerName: 'Dr. Custom',
      createdAt: '2026-11-01T00:00:00.000Z',
      updatedAt: '2026-11-01T00:00:00.000Z',
      agreedToTerms: true,
    };

    const assignedResolved = resolvePractitionerForSeeker(
      PRIMARY_PRACTITIONER,
      seekerWithAssignment,
      [verifiedDoc]
    );
    assert.ok(assignedResolved);
    assert.equal(assignedResolved.id, 'uid_prac_custom');
    assert.equal(assignedResolved.name, 'Dr. Custom');

    const verifiedFallback = resolvePractitionerForSeeker(PRIMARY_PRACTITIONER, null, [verifiedDoc]);
    assert.ok(verifiedFallback);
    assert.equal(verifiedFallback.id, 'uid_prac_ananya');

    const offlineFallback = resolvePractitionerForSeeker(PRIMARY_PRACTITIONER, null, []);
    assert.ok(offlineFallback);
    assert.equal(offlineFallback.id, 'prac-1');
  });

  it('never falls back to prac-1 or unverified practitioners in live Firebase mode', () => {
    const unverifiedDoc: PractitionerDocument = {
      ...verifiedDoc,
      id: 'prac-unverified',
      userId: 'uid_prac_unverified',
      isVerified: false,
    };
    const fakePrac1Doc: PractitionerDocument = {
      ...verifiedDoc,
      id: 'prac-1',
      userId: 'prac-1',
      isVerified: true,
    };

    // Empty verified pool -> returns null (clear empty state)
    assert.equal(
      resolvePractitionerForSeeker(PRIMARY_PRACTITIONER, null, [], true),
      null
    );

    // Unverified or prac-1 docs in pool -> ignored, returns null
    assert.equal(
      resolvePractitionerForSeeker(
        PRIMARY_PRACTITIONER,
        null,
        [unverifiedDoc, fakePrac1Doc],
        true
      ),
      null
    );

    // Client assigned to unverified practitioner -> returns null
    assert.equal(
      resolvePractitionerForSeeker(
        PRIMARY_PRACTITIONER,
        null,
        [verifiedDoc, unverifiedDoc],
        true,
        'uid_prac_unverified'
      ),
      null
    );

    // Client assigned to verified practitioner via clientProfiles -> returns verified Auth UID
    const assignedLive = resolvePractitionerForSeeker(
      PRIMARY_PRACTITIONER,
      null,
      [verifiedDoc, unverifiedDoc],
      true,
      'uid_prac_ananya'
    );
    assert.ok(assignedLive);
    assert.equal(assignedLive.id, 'uid_prac_ananya');

    // Unassigned seeker in live mode with verified practitioner available -> gets verified UID
    const unassignedLive = resolvePractitionerForSeeker(
      PRIMARY_PRACTITIONER,
      null,
      [unverifiedDoc, verifiedDoc],
      true,
      null
    );
    assert.ok(unassignedLive);
    assert.equal(unassignedLive.id, 'uid_prac_ananya');
  });
});
