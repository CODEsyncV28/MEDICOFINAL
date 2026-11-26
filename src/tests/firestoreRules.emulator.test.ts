import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  initializeTestEnvironment,
  RulesTestEnvironment,
  assertSucceeds,
  assertFails,
} from '@firebase/rules-unit-testing';
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  serverTimestamp,
  setLogLevel,
} from 'firebase/firestore';

const PROJECT_ID = 'demo-ayush-wellness-test';
const RULES_PATH = path.resolve(process.cwd(), 'firestore.rules');

let testEnv: RulesTestEnvironment;

function parseEmulatorHost(): { host: string; port: number } {
  const raw = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
  const [host, portStr] = raw.split(':');
  return { host: host || '127.0.0.1', port: Number(portStr) || 8080 };
}

async function seedBaseUsersAndDocs() {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();

    // Users
    await setDoc(doc(db, 'users', 'user_123'), {
      uid: 'user_123',
      email: 'aarav@example.com',
      displayName: 'Aarav Sharma',
      role: 'user',
      isActive: true,
      agreedToTerms: true,
      assignedPractitionerId: 'dr_ayurveda_1',
      createdAt: '2026-11-01T00:00:00.000Z',
      updatedAt: '2026-11-01T00:00:00.000Z',
    });

    await setDoc(doc(db, 'users', 'user_other'), {
      uid: 'user_other',
      email: 'pooja@example.com',
      displayName: 'Pooja Patel',
      role: 'user',
      isActive: true,
      agreedToTerms: true,
      assignedPractitionerId: null,
      createdAt: '2026-11-01T00:00:00.000Z',
      updatedAt: '2026-11-01T00:00:00.000Z',
    });

    await setDoc(doc(db, 'users', 'dr_ayurveda_1'), {
      uid: 'dr_ayurveda_1',
      email: 'priya@ayush.org',
      displayName: 'Dr. Priya Varma',
      role: 'practitioner',
      isActive: true,
      agreedToTerms: true,
      createdAt: '2026-11-01T00:00:00.000Z',
      updatedAt: '2026-11-01T00:00:00.000Z',
    });

    await setDoc(doc(db, 'users', 'dr_other'), {
      uid: 'dr_other',
      email: 'rajesh@ayush.org',
      displayName: 'Dr. Rajesh Nair',
      role: 'practitioner',
      isActive: true,
      agreedToTerms: true,
      createdAt: '2026-11-01T00:00:00.000Z',
      updatedAt: '2026-11-01T00:00:00.000Z',
    });

    await setDoc(doc(db, 'users', 'admin_root'), {
      uid: 'admin_root',
      email: 'admin@ayush.org',
      displayName: 'Governance Admin',
      role: 'admin',
      isActive: true,
      agreedToTerms: true,
      createdAt: '2026-11-01T00:00:00.000Z',
      updatedAt: '2026-11-01T00:00:00.000Z',
    });

    // Client profiles
    await setDoc(doc(db, 'clientProfiles', 'user_123'), {
      userId: 'user_123',
      clientName: 'Aarav Sharma',
      primaryGoal: 'Circadian Balance',
      enrolledProgram: 'Dinacharya Foundations',
      discipline: 'Ayurveda',
      adherenceRate: 85,
      assessmentCompleted: true,
      status: 'Active',
      assignedPractitionerId: 'dr_ayurveda_1',
      practitionerNotes: 'Initial guidance shared',
      updatedAt: '2026-11-01T00:00:00.000Z',
    });
  });
}

describe('Firestore Emulator Security Rules Suite (Real Rules Engine)', () => {
  before(async () => {
    setLogLevel('silent');
    const { host, port } = parseEmulatorHost();
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        host,
        port,
        rules: fs.readFileSync(RULES_PATH, 'utf8'),
      },
    });
  });

  after(async () => {
    if (testEnv) {
      await testEnv.cleanup();
    }
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
    await seedBaseUsersAndDocs();
  });

  // 1. Default Catch-All Deny
  it('1. Default catch-all denies read & write on unmatched collections and subcollections (even for admin)', async () => {
    const unauthDb = testEnv.unauthenticatedContext().firestore();
    const userDb = testEnv.authenticatedContext('user_123').firestore();
    const adminDb = testEnv.authenticatedContext('admin_root').firestore();

    await assertFails(getDoc(doc(unauthDb, '_connection_test', 'status')));
    await assertFails(getDoc(doc(userDb, 'arbitraryCollection', 'doc1')));
    await assertFails(setDoc(doc(userDb, 'arbitraryCollection', 'doc1'), { foo: 'bar' }));
    await assertFails(getDoc(doc(adminDb, 'unmappedCollection', 'secret')));
    await assertFails(setDoc(doc(adminDb, 'unmappedCollection', 'secret'), { foo: 'bar' }));
    await assertFails(setDoc(doc(userDb, 'users', 'user_123', 'privateSub', 's1'), { leak: true }));
    await assertFails(getDoc(doc(adminDb, 'users', 'user_123', 'privateSub', 's1')));
  });

  // 2. Users Collection Security & PII Isolation
  it('2. /users/{userId}: enforces PII isolation, blocks role escalation, blocks user list scraping', async () => {
    const unauthDb = testEnv.unauthenticatedContext().firestore();
    const userDb = testEnv.authenticatedContext('user_123').firestore();
    const otherUserDb = testEnv.authenticatedContext('user_other').firestore();
    const pracDb = testEnv.authenticatedContext('dr_ayurveda_1').firestore();
    const adminDb = testEnv.authenticatedContext('admin_root').firestore();

    // Unauthenticated & cross-user & practitioner reads denied
    await assertFails(getDoc(doc(unauthDb, 'users', 'user_123')));
    await assertFails(getDoc(doc(otherUserDb, 'users', 'user_123')));
    await assertFails(getDoc(doc(pracDb, 'users', 'user_123')));
    await assertFails(getDocs(collection(userDb, 'users')));
    await assertFails(getDocs(collection(pracDb, 'users')));

    // Owner and admin reads allowed
    await assertSucceeds(getDoc(doc(userDb, 'users', 'user_123')));
    await assertSucceeds(getDoc(doc(adminDb, 'users', 'user_123')));
    await assertSucceeds(getDocs(collection(adminDb, 'users')));

    // Safe owner update allowed
    await assertSucceeds(
      updateDoc(doc(userDb, 'users', 'user_123'), {
        displayName: 'Aarav S.',
        updatedAt: '2026-11-02T00:00:00.000Z',
        updatedAtServer: serverTimestamp(),
      })
    );

    // Privilege escalation & shadow field injection denied
    await assertFails(updateDoc(doc(userDb, 'users', 'user_123'), { role: 'admin' }));
    await assertFails(updateDoc(doc(userDb, 'users', 'user_123'), { role: 'practitioner' }));
    await assertFails(updateDoc(doc(userDb, 'users', 'user_123'), { assignedPractitionerId: 'dr_other' }));
    await assertFails(updateDoc(doc(userDb, 'users', 'user_123'), { isActive: false }));
    await assertFails(updateDoc(doc(userDb, 'users', 'user_123'), { ghostField: 'hack' }));

    // New user registration: role 'user' allowed; role 'admin' on signup denied
    const newUserDb = testEnv.authenticatedContext('new_seeker_99').firestore();
    await assertFails(
      setDoc(doc(newUserDb, 'users', 'new_seeker_99'), {
        uid: 'new_seeker_99',
        email: 'hacker@example.com',
        displayName: 'Hacker',
        role: 'admin',
        agreedToTerms: true,
        createdAt: '2026-11-01T00:00:00.000Z',
      })
    );
    await assertSucceeds(
      setDoc(doc(newUserDb, 'users', 'new_seeker_99'), {
        uid: 'new_seeker_99',
        email: 'seeker@example.com',
        displayName: 'New Seeker',
        role: 'user',
        agreedToTerms: true,
        prakritiBaseline: null,
        createdAt: '2026-11-01T00:00:00.000Z',
        updatedAt: '2026-11-01T00:00:00.000Z',
        createdAtServer: serverTimestamp(),
        updatedAtServer: serverTimestamp(),
      })
    );
  });

  // 3. ClientProfiles Collection
  it('3. /clientProfiles/{userId}: enforces assigned practitioner scoping on get & list queries', async () => {
    const assignedPracDb = testEnv.authenticatedContext('dr_ayurveda_1').firestore();
    const unassignedPracDb = testEnv.authenticatedContext('dr_other').firestore();
    const ownerDb = testEnv.authenticatedContext('user_123').firestore();
    const otherDb = testEnv.authenticatedContext('user_other').firestore();

    // Assigned practitioner can get and query assigned clients
    await assertSucceeds(getDoc(doc(assignedPracDb, 'clientProfiles', 'user_123')));
    await assertSucceeds(
      getDocs(
        query(collection(assignedPracDb, 'clientProfiles'), where('assignedPractitionerId', '==', 'dr_ayurveda_1'))
      )
    );

    // Unassigned practitioner & unrelated user denied
    await assertFails(getDoc(doc(unassignedPracDb, 'clientProfiles', 'user_123')));
    await assertFails(getDocs(collection(unassignedPracDb, 'clientProfiles')));
    await assertFails(
      getDocs(
        query(collection(unassignedPracDb, 'clientProfiles'), where('assignedPractitionerId', '==', 'dr_ayurveda_1'))
      )
    );
    await assertFails(getDoc(doc(otherDb, 'clientProfiles', 'user_123')));

    // Assigned practitioner can update clinical notes, but not userId or assignedPractitionerId
    await assertSucceeds(
      updateDoc(doc(assignedPracDb, 'clientProfiles', 'user_123'), {
        practitionerNotes: 'Continue warm water in morning',
        status: 'On Track',
        updatedAt: '2026-11-02T00:00:00.000Z',
      })
    );
    await assertFails(
      updateDoc(doc(assignedPracDb, 'clientProfiles', 'user_123'), {
        assignedPractitionerId: 'dr_other',
      })
    );

    // Owner cannot edit practitionerNotes, and cannot self-assign practitioner on create
    await assertFails(
      updateDoc(doc(ownerDb, 'clientProfiles', 'user_123'), {
        practitionerNotes: 'I am cured',
      })
    );
    await assertFails(
      setDoc(doc(otherDb, 'clientProfiles', 'user_other'), {
        userId: 'user_other',
        clientName: 'Pooja Patel',
        assignedPractitionerId: 'dr_ayurveda_1',
        updatedAt: '2026-11-02T00:00:00.000Z',
      })
    );

    // Assignment source consistency: isAssignedPractitioner reads /clientProfiles/{uid}, NOT /users/{uid}.
    // Even if /users/{uid} has null/different assignedPractitionerId, /clientProfiles/{uid}.assignedPractitionerId governs access.
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const adminSeedDb = ctx.firestore();
      await setDoc(doc(adminSeedDb, 'clientProfiles', 'user_other'), {
        userId: 'user_other',
        clientName: 'Pooja Patel',
        assignedPractitionerId: 'dr_other',
        updatedAt: '2026-11-02T00:00:00.000Z',
      });
      await setDoc(doc(adminSeedDb, 'assessments', 'assess_user_other'), {
        id: 'assess_user_other',
        userId: 'user_other',
        answers: { circadian_waking_energy: 'gradual' },
        totalAnswered: 1,
        totalQuestions: 20,
        isComplete: true,
        updatedAt: '2026-11-02T00:00:00.000Z',
      });
    });
    // /users/user_other has assignedPractitionerId: null, yet /clientProfiles/user_other assigns dr_other -> ALLOWED
    await assertSucceeds(getDoc(doc(unassignedPracDb, 'assessments', 'assess_user_other')));
    // dr_ayurveda_1 is NOT assigned in clientProfiles/user_other -> DENIED
    await assertFails(getDoc(doc(assignedPracDb, 'assessments', 'assess_user_other')));
  });

  // 4. Assessments & History Subcollection
  it('4. /assessments/{id} & /assessments/{id}/history/{versionId}: supports app versioning, blocks cross-user & history tampering', async () => {
    const ownerDb = testEnv.authenticatedContext('user_123').firestore();
    const otherDb = testEnv.authenticatedContext('user_other').firestore();
    const assignedPracDb = testEnv.authenticatedContext('dr_ayurveda_1').firestore();
    const unassignedPracDb = testEnv.authenticatedContext('dr_other').firestore();

    // App creates history/v1 BEFORE main doc
    await assertSucceeds(
      setDoc(doc(ownerDb, 'assessments', 'assess_user_123', 'history', 'v1'), {
        id: 'assess_user_123_v1',
        userId: 'user_123',
        version: 1,
        completedAt: '2026-11-02T00:00:00.000Z',
        answers: { circadian_waking_energy: 'gradual' },
        categoryNotes: {},
        totalAnswered: 1,
        totalQuestions: 20,
        isComplete: true,
        analysis: { constitutionTendency: 'Pitta-Balanced' },
        comparisonWithPrevious: null,
        updatedAtServer: serverTimestamp(),
      })
    );

    // Main doc creation with merge
    await assertSucceeds(
      setDoc(
        doc(ownerDb, 'assessments', 'assess_user_123'),
        {
          id: 'assess_user_123',
          userId: 'user_123',
          latestVersion: 1,
          answers: { circadian_waking_energy: 'gradual' },
          totalAnswered: 1,
          totalQuestions: 20,
          isComplete: true,
          updatedAt: '2026-11-02T00:00:00.000Z',
          updatedAtServer: serverTimestamp(),
        },
        { merge: true }
      )
    );

    // Owner list history succeeds; assigned practitioner get succeeds
    await assertSucceeds(getDocs(collection(ownerDb, 'assessments', 'assess_user_123', 'history')));
    await assertSucceeds(getDoc(doc(assignedPracDb, 'assessments', 'assess_user_123')));
    await assertSucceeds(getDoc(doc(assignedPracDb, 'assessments', 'assess_user_123', 'history', 'v1')));

    // Unrelated user & unassigned practitioner denied
    await assertFails(getDoc(doc(otherDb, 'assessments', 'assess_user_123')));
    await assertFails(getDoc(doc(otherDb, 'assessments', 'assess_user_123', 'history', 'v1')));
    await assertFails(getDocs(collection(otherDb, 'assessments', 'assess_user_123', 'history')));
    await assertFails(getDoc(doc(unassignedPracDb, 'assessments', 'assess_user_123', 'history', 'v1')));

    // Wrong doc ID or cross-user write denied
    await assertFails(
      setDoc(doc(otherDb, 'assessments', 'assess_user_123'), {
        id: 'assess_user_123',
        userId: 'user_other',
        answers: {},
        totalAnswered: 0,
        totalQuestions: 20,
        isComplete: false,
        updatedAt: '2026-11-02T00:00:00.000Z',
      })
    );

    // Owner cannot mutate or delete immutable history snapshot
    await assertFails(
      updateDoc(doc(ownerDb, 'assessments', 'assess_user_123', 'history', 'v1'), {
        totalAnswered: 20,
      })
    );
    await assertFails(deleteDoc(doc(ownerDb, 'assessments', 'assess_user_123', 'history', 'v1')));
  });

  // 5. Wellness Plans Collection
  it('5. /wellnessPlans/{planId}: allows owner CRUD & query, blocks unauthorized access and hijacking', async () => {
    const ownerDb = testEnv.authenticatedContext('user_123').firestore();
    const otherDb = testEnv.authenticatedContext('user_other').firestore();
    const assignedPracDb = testEnv.authenticatedContext('dr_ayurveda_1').firestore();
    const unassignedPracDb = testEnv.authenticatedContext('dr_other').firestore();

    const validPlan = {
      id: 'plan_user_123_v1',
      userId: 'user_123',
      version: 1,
      assessmentId: 'assess_user_123_v1',
      generatedAt: '2026-11-02T00:00:00.000Z',
      title: 'Version 1 Personal Dinacharya Plan',
      constitutionTendency: 'Pitta-Balanced',
      primaryFocus: 'Digestive Balance',
      summary: 'Tailored educational wellness plan.',
      dailyRoutine: [],
      morningHabits: [],
      eveningHabits: [],
      sleepSuggestions: [],
      foodAndNutrition: [],
      physicalActivity: [],
      stressAndBreathing: [],
      weeklyGoals: [],
      educationalDisclaimer: 'Non-diagnostic educational guidance.',
    };

    await assertSucceeds(setDoc(doc(ownerDb, 'wellnessPlans', 'plan_user_123_v1'), validPlan, { merge: true }));
    await assertSucceeds(
      getDocs(query(collection(ownerDb, 'wellnessPlans'), where('userId', '==', 'user_123')))
    );
    await assertSucceeds(getDoc(doc(assignedPracDb, 'wellnessPlans', 'plan_user_123_v1')));

    // Unauthorized access & spoofing denied
    await assertFails(getDoc(doc(otherDb, 'wellnessPlans', 'plan_user_123_v1')));
    await assertFails(getDocs(collection(otherDb, 'wellnessPlans')));
    await assertFails(getDoc(doc(unassignedPracDb, 'wellnessPlans', 'plan_user_123_v1')));
    await assertFails(
      setDoc(doc(otherDb, 'wellnessPlans', 'plan_user_123_v1'), {
        ...validPlan,
        userId: 'user_other',
      })
    );
  });

  // 6. Daily Activities Collection (Anti-Hijacking Fix)
  it('6. /dailyActivities/{activityId}: prevents cross-user ownership hijacking on update & validates dateString', async () => {
    const ownerDb = testEnv.authenticatedContext('user_123').firestore();
    const otherDb = testEnv.authenticatedContext('user_other').firestore();

    const docId = 'user_123_2026-11-26_ushapan';
    await assertSucceeds(
      setDoc(
        doc(ownerDb, 'dailyActivities', docId),
        {
          id: docId,
          userId: 'user_123',
          activityKey: 'ushapan',
          dateString: '2026-11-26',
          completed: true,
          completedAt: '2026-11-26T06:30:00.000Z',
        },
        { merge: true }
      )
    );

    await assertSucceeds(
      getDocs(
        query(
          collection(ownerDb, 'dailyActivities'),
          where('userId', '==', 'user_123'),
          where('dateString', '==', '2026-11-26')
        )
      )
    );

    // Attacker tries to hijack existing record by setting userId to their own UID
    await assertFails(
      setDoc(
        doc(otherDb, 'dailyActivities', docId),
        {
          id: docId,
          userId: 'user_other',
          activityKey: 'ushapan',
          dateString: '2026-11-26',
          completed: false,
          completedAt: null,
        },
        { merge: true }
      )
    );

    // Invalid dateString rejected
    await assertFails(
      setDoc(doc(ownerDb, 'dailyActivities', 'bad_date_doc'), {
        id: 'bad_date_doc',
        userId: 'user_123',
        activityKey: 'ushapan',
        dateString: 'not-a-date',
        completed: true,
      })
    );
  });

  // 7. Wellness Programs & Educational Articles (Governance & Anti-Self-Publish)
  it('7. /wellnessPrograms & /educationalArticles: blocks self-publishing & draft leaks, allows Admin approval', async () => {
    const pracDb = testEnv.authenticatedContext('dr_ayurveda_1').firestore();
    const seekerDb = testEnv.authenticatedContext('user_123').firestore();
    const adminDb = testEnv.authenticatedContext('admin_root').firestore();

    // Practitioner creates draft program & draft article
    await assertSucceeds(
      setDoc(doc(pracDb, 'wellnessPrograms', 'prog_1'), {
        id: 'prog_1',
        title: 'Circadian Reset',
        discipline: 'Ayurveda',
        creatorPractitionerId: 'dr_ayurveda_1',
        isPublished: false,
        status: 'pending_approval',
      })
    );

    await assertSucceeds(
      setDoc(doc(pracDb, 'educationalArticles', 'art_1'), {
        id: 'art_1',
        title: 'Principles of Dinacharya',
        discipline: 'Ayurveda',
        authorId: 'dr_ayurveda_1',
        status: 'pending_approval',
        summary: 'Foundational daily routine principles.',
      })
    );

    // Practitioner CANNOT self-publish
    await assertFails(
      setDoc(doc(pracDb, 'wellnessPrograms', 'prog_bad'), {
        id: 'prog_bad',
        title: 'Bypassed Program',
        discipline: 'Ayurveda',
        creatorPractitionerId: 'dr_ayurveda_1',
        isPublished: true,
        status: 'published',
      })
    );
    await assertFails(
      updateDoc(doc(pracDb, 'wellnessPrograms', 'prog_1'), {
        status: 'published',
        isPublished: false,
      })
    );
    await assertFails(
      setDoc(doc(pracDb, 'educationalArticles', 'art_bad'), {
        id: 'art_bad',
        title: 'Unreviewed Article',
        discipline: 'Ayurveda',
        authorId: 'dr_ayurveda_1',
        status: 'published',
        summary: 'Bypass attempt',
      })
    );

    // Seeker cannot read unpublished draft or run unfiltered list
    await assertFails(getDoc(doc(seekerDb, 'wellnessPrograms', 'prog_1')));
    await assertFails(getDoc(doc(seekerDb, 'educationalArticles', 'art_1')));
    await assertFails(getDocs(collection(seekerDb, 'wellnessPrograms')));

    // Inconsistent program (isPublished: true without status: 'published') must NOT be readable by seekers
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'wellnessPrograms', 'prog_inconsistent'), {
        id: 'prog_inconsistent',
        title: 'Inconsistent Flag Program',
        discipline: 'Ayurveda',
        creatorPractitionerId: 'dr_ayurveda_1',
        isPublished: true,
        status: 'draft',
      });
    });
    await assertFails(getDoc(doc(seekerDb, 'wellnessPrograms', 'prog_inconsistent')));

    // Admin approves both; seeker can now query published items using exact app filters
    await assertSucceeds(
      updateDoc(doc(adminDb, 'wellnessPrograms', 'prog_1'), {
        status: 'published',
        isPublished: true,
        reviewedByAdminId: 'admin_root',
        reviewedAt: '2026-11-05T00:00:00.000Z',
        publishedAt: '2026-11-05T00:00:00.000Z',
        reviewNotes: 'Approved.',
        updatedAt: '2026-11-05T00:00:00.000Z',
      })
    );
    await assertSucceeds(
      updateDoc(doc(adminDb, 'educationalArticles', 'art_1'), {
        status: 'published',
        reviewedByAdminId: 'admin_root',
        reviewedAt: '2026-11-05T00:00:00.000Z',
        publishedAt: '2026-11-05T00:00:00.000Z',
        reviewNotes: 'Approved.',
        updatedAt: '2026-11-05T00:00:00.000Z',
      })
    );

    await assertSucceeds(
      getDocs(
        query(
          collection(seekerDb, 'wellnessPrograms'),
          where('isPublished', '==', true),
          where('status', '==', 'published')
        )
      )
    );
    await assertSucceeds(
      getDocs(query(collection(seekerDb, 'educationalArticles'), where('status', '==', 'published')))
    );

    // Practitioner cannot overwrite already-published article
    await assertFails(
      updateDoc(doc(pracDb, 'educationalArticles', 'art_1'), {
        title: 'Tampered After Publish',
        status: 'pending_approval',
      })
    );

    // Revision-requested draft save compatibility: practitioner saves revision_requested article as draft
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'educationalArticles', 'art_rev'), {
        id: 'art_rev',
        title: 'Needs Disclaimer Refinement',
        discipline: 'Ayurveda',
        authorId: 'dr_ayurveda_1',
        status: 'revision_requested',
        summary: 'Initial summary.',
        reviewedByAdminId: 'admin_root',
        reviewedAt: '2026-11-05T00:00:00.000Z',
        publishedAt: null,
        reviewNotes: 'Add non-diagnostic disclaimer.',
      });
    });
    await assertSucceeds(
      updateDoc(doc(pracDb, 'educationalArticles', 'art_rev'), {
        summary: 'Updated non-diagnostic educational summary.',
        status: 'draft',
        publishedAt: null,
        reviewedByAdminId: 'admin_root',
        updatedAt: '2026-11-06T00:00:00.000Z',
      })
    );
    // Resubmitting for review must clear reviewedByAdminId
    await assertFails(
      updateDoc(doc(pracDb, 'educationalArticles', 'art_rev'), {
        status: 'pending_approval',
        reviewedByAdminId: 'admin_root',
      })
    );
    await assertSucceeds(
      updateDoc(doc(pracDb, 'educationalArticles', 'art_rev'), {
        status: 'pending_approval',
        reviewedByAdminId: null,
        reviewedAt: null,
        reviewNotes: null,
        submittedAt: '2026-11-06T01:00:00.000Z',
        updatedAt: '2026-11-06T01:00:00.000Z',
      })
    );
  });

  // 8. Practitioners Credential Governance
  it('8. /practitioners/{id}: prevents self-verification and rating/clientCount spoofing', async () => {
    const pracDb = testEnv.authenticatedContext('dr_ayurveda_1').firestore();
    const adminDb = testEnv.authenticatedContext('admin_root').firestore();

    // Cannot create pre-verified profile
    await assertFails(
      setDoc(doc(pracDb, 'practitioners', 'prac_1'), {
        id: 'prac_1',
        userId: 'dr_ayurveda_1',
        name: 'Dr. Priya Varma',
        qualification: 'BAMS, MD',
        councilRegistration: 'NCISM-12345',
        isVerified: true,
      })
    );

    // Creating unverified profile succeeds
    await assertSucceeds(
      setDoc(doc(pracDb, 'practitioners', 'prac_1'), {
        id: 'prac_1',
        userId: 'dr_ayurveda_1',
        name: 'Dr. Priya Varma',
        qualification: 'BAMS, MD',
        councilRegistration: 'NCISM-12345',
        isVerified: false,
        rating: 0,
        activeClientsCount: 0,
      })
    );

    // Practitioner can edit bio, NOT isVerified, rating, or activeClientsCount
    await assertSucceeds(updateDoc(doc(pracDb, 'practitioners', 'prac_1'), { bio: 'Ayurveda specialist.' }));
    await assertFails(updateDoc(doc(pracDb, 'practitioners', 'prac_1'), { isVerified: true }));
    await assertFails(updateDoc(doc(pracDb, 'practitioners', 'prac_1'), { rating: 5.0 }));
    await assertFails(updateDoc(doc(pracDb, 'practitioners', 'prac_1'), { activeClientsCount: 999 }));

    // Admin can verify
    await assertSucceeds(updateDoc(doc(adminDb, 'practitioners', 'prac_1'), { isVerified: true }));
  });

  // 9. Consultations & Content Approvals (State Locking & Anti-Self-Approval)
  it('9. /consultations & /contentApprovals: enforces state transitions, terminal locking, and blocks self-approval', async () => {
    const seekerDb = testEnv.authenticatedContext('user_123').firestore();
    const otherDb = testEnv.authenticatedContext('user_other').firestore();
    const pracDb = testEnv.authenticatedContext('dr_ayurveda_1').firestore();
    const otherPracDb = testEnv.authenticatedContext('dr_other').firestore();
    const adminDb = testEnv.authenticatedContext('admin_root').firestore();

    // Seeker cannot create pre-confirmed consultation
    await assertFails(
      setDoc(doc(seekerDb, 'consultations', 'c_bad'), {
        id: 'c_bad',
        userId: 'user_123',
        practitionerId: 'dr_ayurveda_1',
        topic: 'Sleep Routine',
        status: 'confirmed',
        scheduledTime: '2026-12-01T10:00:00Z',
        createdAt: '2026-11-26T00:00:00Z',
      })
    );

    // Seeker creates valid pending consultation
    await assertSucceeds(
      setDoc(doc(seekerDb, 'consultations', 'c_1'), {
        id: 'c_1',
        userId: 'user_123',
        practitionerId: 'dr_ayurveda_1',
        topic: 'Sleep Routine',
        preferredSlot: 'morning',
        status: 'pending',
        scheduledTime: null,
        practitionerNotes: null,
        createdAt: '2026-11-26T00:00:00Z',
        updatedAt: '2026-11-26T00:00:00Z',
      })
    );

    // Seeker & practitioner scoped list queries succeed; unrelated user/practitioner denied
    await assertSucceeds(getDocs(query(collection(seekerDb, 'consultations'), where('userId', '==', 'user_123'))));
    await assertSucceeds(getDocs(query(collection(pracDb, 'consultations'), where('practitionerId', '==', 'dr_ayurveda_1'))));
    await assertFails(getDocs(collection(otherDb, 'consultations')));
    await assertFails(getDocs(query(collection(otherPracDb, 'consultations'), where('practitionerId', '==', 'dr_ayurveda_1'))));

    // Seeker cannot self-confirm or jump straight to completed; unassigned user/practitioner cannot read
    await assertFails(updateDoc(doc(seekerDb, 'consultations', 'c_1'), { status: 'confirmed' }));
    await assertFails(updateDoc(doc(pracDb, 'consultations', 'c_1'), { status: 'completed' }));
    await assertFails(updateDoc(doc(pracDb, 'consultations', 'c_1'), { status: 'confirmed', scheduledTime: '' }));
    await assertFails(getDoc(doc(otherDb, 'consultations', 'c_1')));
    await assertFails(getDoc(doc(otherPracDb, 'consultations', 'c_1')));

    // Seeker can edit notes while pending
    await assertSucceeds(
      updateDoc(doc(seekerDb, 'consultations', 'c_1'), {
        notes: 'Updated sleep log note',
        updatedAt: '2026-11-26T01:00:00Z',
      })
    );

    // Assigned practitioner confirms -> reschedules -> completes
    await assertSucceeds(
      updateDoc(doc(pracDb, 'consultations', 'c_1'), {
        status: 'confirmed',
        scheduledTime: '2026-12-01T10:00:00Z',
        practitionerNotes: 'Bring sleep log',
        updatedAt: '2026-11-26T02:00:00Z',
      })
    );
    // Confirmed consultation CANNOT be rejected (must cancel or reschedule) and seeker cannot alter preferredSlot
    await assertFails(
      updateDoc(doc(pracDb, 'consultations', 'c_1'), { status: 'rejected', scheduledTime: null })
    );
    await assertFails(
      updateDoc(doc(seekerDb, 'consultations', 'c_1'), { preferredSlot: 'evening' })
    );
    await assertSucceeds(
      updateDoc(doc(pracDb, 'consultations', 'c_1'), {
        status: 'rescheduled',
        scheduledTime: '2026-12-02T11:00:00Z',
        updatedAt: '2026-11-26T03:00:00Z',
      })
    );
    await assertSucceeds(updateDoc(doc(pracDb, 'consultations', 'c_1'), { status: 'completed' }));

    // Terminal state lock: neither seeker nor practitioner can modify completed consultation
    await assertFails(updateDoc(doc(seekerDb, 'consultations', 'c_1'), { status: 'cancelled', scheduledTime: null }));
    await assertFails(updateDoc(doc(pracDb, 'consultations', 'c_1'), { status: 'rescheduled' }));

    // Rejection is STRICTLY terminal: once rejected, neither practitioner nor seeker can reopen or mutate
    await assertSucceeds(
      setDoc(doc(seekerDb, 'consultations', 'c_rej'), {
        id: 'c_rej',
        userId: 'user_123',
        practitionerId: 'dr_ayurveda_1',
        topic: 'Digestive Rhythm',
        preferredSlot: 'evening',
        status: 'pending',
        scheduledTime: null,
        practitionerNotes: null,
        createdAt: '2026-11-26T00:00:00Z',
        updatedAt: '2026-11-26T00:00:00Z',
      })
    );
    await assertSucceeds(
      updateDoc(doc(pracDb, 'consultations', 'c_rej'), {
        status: 'rejected',
        scheduledTime: null,
        practitionerNotes: 'Evening clinic closed; please request a morning slot.',
        updatedAt: '2026-11-26T04:00:00Z',
      })
    );
    await assertFails(
      updateDoc(doc(pracDb, 'consultations', 'c_rej'), {
        status: 'confirmed',
        scheduledTime: '2026-12-03T09:00:00Z',
      })
    );
    await assertFails(
      updateDoc(doc(pracDb, 'consultations', 'c_rej'), {
        status: 'rescheduled',
        scheduledTime: '2026-12-03T09:00:00Z',
      })
    );
    await assertFails(
      updateDoc(doc(pracDb, 'consultations', 'c_rej'), {
        status: 'cancelled',
        scheduledTime: null,
      })
    );
    await assertFails(
      updateDoc(doc(seekerDb, 'consultations', 'c_rej'), {
        status: 'cancelled',
      })
    );

    // Seeker cancelling a confirmed consultation succeeds & clears scheduledTime; cancelled is terminal
    await assertSucceeds(
      setDoc(doc(seekerDb, 'consultations', 'c_cancel'), {
        id: 'c_cancel',
        userId: 'user_123',
        practitionerId: 'dr_ayurveda_1',
        topic: 'Postural Yoga',
        preferredSlot: 'morning',
        status: 'pending',
        scheduledTime: null,
        practitionerNotes: null,
        createdAt: '2026-11-26T00:00:00Z',
        updatedAt: '2026-11-26T00:00:00Z',
      })
    );
    await assertSucceeds(
      updateDoc(doc(pracDb, 'consultations', 'c_cancel'), {
        status: 'confirmed',
        scheduledTime: '2026-12-05T09:00:00Z',
      })
    );
    await assertSucceeds(
      updateDoc(doc(seekerDb, 'consultations', 'c_cancel'), {
        status: 'cancelled',
        scheduledTime: null,
        updatedAt: '2026-11-26T05:00:00Z',
      })
    );
    await assertFails(
      updateDoc(doc(pracDb, 'consultations', 'c_cancel'), {
        status: 'confirmed',
        scheduledTime: '2026-12-05T10:00:00Z',
      })
    );

    // Content approvals: normal user cannot submit; practitioner creates Pending Review; cannot self-approve
    await assertFails(
      setDoc(doc(seekerDb, 'contentApprovals', 'app_user'), {
        id: 'app_user',
        targetId: 'art_1',
        submittedByAuthorId: 'user_123',
        status: 'Pending Review',
        submittedAt: '2026-11-26T00:00:00Z',
      })
    );
    await assertSucceeds(
      setDoc(doc(pracDb, 'contentApprovals', 'app_1'), {
        id: 'app_1',
        targetType: 'article',
        targetId: 'art_1',
        submittedByAuthorId: 'dr_ayurveda_1',
        status: 'Pending Review',
        submittedAt: '2026-11-26T00:00:00Z',
      })
    );
    await assertFails(updateDoc(doc(pracDb, 'contentApprovals', 'app_1'), { status: 'Approved' }));
    await assertSucceeds(
      updateDoc(doc(adminDb, 'contentApprovals', 'app_1'), {
        status: 'Approved',
        reviewedByAdminId: 'admin_root',
        reviewNotes: 'Approved by Admin.',
        reviewedAt: '2026-11-26T06:00:00Z',
        updatedAt: '2026-11-26T06:00:00Z',
      })
    );
  });
});
