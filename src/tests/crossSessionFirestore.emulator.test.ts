import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, setLogLevel } from 'firebase/firestore';
import {
  saveOrSubmitProgram,
  fetchProgramsForPractitioner,
  fetchProgramsForAdminApproval,
  reviewProgramDecision,
  fetchPublishedProgramsForUser,
} from '../services/programService';
import {
  saveOrSubmitArticle,
  fetchArticlesForPractitioner,
  fetchArticlesForAdminModeration,
  reviewArticleDecision,
  fetchPublishedArticlesForUser,
} from '../services/contentService';
import {
  createConsultationRequest,
  fetchConsultationsForUser,
  fetchConsultationsForPractitioner,
  updateConsultationStatus,
} from '../services/consultationService';
import {
  fetchVerifiedPractitioners,
  fetchClientsForPractitioner,
  updateClientObservationNotes,
  fetchAssignedClientWellnessSnapshot,
  fetchSeekerAssignedPractitionerId,
} from '../services/practitionerService';
import {
  submitAssessment,
  fetchAssessmentHistory,
} from '../services/assessmentService';
import {
  fetchWellnessPlanHistory,
  fetchLatestWellnessPlan,
} from '../services/wellnessPlanService';
import { resolvePractitionerForSeeker } from '../utils/practitionerIdentity';
import { PRIMARY_PRACTITIONER } from '../data/mockData';
import { EXPANDED_ASSESSMENT_QUESTIONS } from '../data/assessmentQuestions';

const PROJECT_ID = 'demo-ayush-cross-session-test';
const RULES_PATH = path.resolve(process.cwd(), 'firestore.rules');

let testEnv: RulesTestEnvironment;

function parseEmulatorHost(): { host: string; port: number } {
  const raw = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
  const [host, portStr] = raw.split(':');
  return { host: host || '127.0.0.1', port: Number(portStr) || 8080 };
}

function buildAssessmentAnswers(choiceIndex: number): Record<string, string> {
  const answers: Record<string, string> = {};
  for (const q of EXPANDED_ASSESSMENT_QUESTIONS) {
    const opt = q.options[Math.min(choiceIndex, q.options.length - 1)];
    answers[q.id] = opt.value;
  }
  return answers;
}

async function seedActors() {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();

    await setDoc(doc(db, 'users', 'seeker_uid_1'), {
      uid: 'seeker_uid_1',
      email: 'seeker1@example.com',
      displayName: 'Aarav Seeker',
      role: 'user',
      isActive: true,
      agreedToTerms: true,
      assignedPractitionerId: 'prac_uid_1',
      createdAt: '2026-11-01T00:00:00.000Z',
      updatedAt: '2026-11-01T00:00:00.000Z',
    });

    await setDoc(doc(db, 'users', 'seeker_uid_2'), {
      uid: 'seeker_uid_2',
      email: 'seeker2@example.com',
      displayName: 'Meera Seeker',
      role: 'user',
      isActive: true,
      agreedToTerms: true,
      assignedPractitionerId: null,
      createdAt: '2026-11-01T00:00:00.000Z',
      updatedAt: '2026-11-01T00:00:00.000Z',
    });

    await setDoc(doc(db, 'users', 'prac_uid_1'), {
      uid: 'prac_uid_1',
      email: 'ananya@ayush.org',
      displayName: 'Dr. Ananya Sharma',
      role: 'practitioner',
      isActive: true,
      agreedToTerms: true,
      createdAt: '2026-11-01T00:00:00.000Z',
      updatedAt: '2026-11-01T00:00:00.000Z',
    });

    await setDoc(doc(db, 'users', 'prac_uid_other'), {
      uid: 'prac_uid_other',
      email: 'unassigned@ayush.org',
      displayName: 'Dr. Vikram Rao',
      role: 'practitioner',
      isActive: true,
      agreedToTerms: true,
      createdAt: '2026-11-01T00:00:00.000Z',
      updatedAt: '2026-11-01T00:00:00.000Z',
    });

    await setDoc(doc(db, 'users', 'admin_uid_1'), {
      uid: 'admin_uid_1',
      email: 'admin@ayush.org',
      displayName: 'Platform Admin',
      role: 'admin',
      isActive: true,
      agreedToTerms: true,
      createdAt: '2026-11-01T00:00:00.000Z',
      updatedAt: '2026-11-01T00:00:00.000Z',
    });

    // Verified practitioner (Auth UID = prac_uid_1) & unverified practitioner
    await setDoc(doc(db, 'practitioners', 'prac_doc_verified'), {
      id: 'prac_doc_verified',
      userId: 'prac_uid_1',
      name: 'Dr. Ananya Sharma',
      qualification: 'BAMS, MD (Ayurveda)',
      discipline: 'Ayurveda',
      specialization: 'Circadian Wellness',
      experienceYears: 12,
      councilRegistration: 'NCISM-84920',
      isVerified: true,
      activeClientsCount: 12,
      rating: 4.9,
      bio: 'Verified AYUSH practitioner.',
      nextAvailableSlot: 'Tomorrow 10:30 AM',
      createdAt: '2026-11-01T00:00:00.000Z',
    });

    await setDoc(doc(db, 'practitioners', 'prac_doc_unverified'), {
      id: 'prac_doc_unverified',
      userId: 'prac_uid_other',
      name: 'Dr. Vikram Rao',
      qualification: 'BAMS',
      discipline: 'Ayurveda',
      councilRegistration: 'NCISM-99999',
      isVerified: false,
      rating: 0,
      activeClientsCount: 0,
      createdAt: '2026-11-01T00:00:00.000Z',
    });

    // Authoritative clientProfile assignment using practitioner Auth UID
    await setDoc(doc(db, 'clientProfiles', 'seeker_uid_1'), {
      userId: 'seeker_uid_1',
      clientName: 'Aarav Seeker',
      age: 34,
      gender: 'Male',
      primaryGoal: 'Consistent 10:30 PM Sleep Anchor',
      enrolledProgram: 'Dinacharya Foundations',
      discipline: 'Ayurveda',
      adherenceRate: 78,
      assessmentCompleted: false,
      lastCheckIn: 'Today',
      practitionerNotes: 'Baseline circadian review pending.',
      status: 'Active',
      assignedPractitionerId: 'prac_uid_1',
      isSimulated: false,
      updatedAt: '2026-11-01T00:00:00.000Z',
    });
  });
}

describe('Cross-Session Service Integration Tests (Firestore Emulator + Real Rules)', () => {
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
    await seedActors();
  });

  it('1. Programs: cross-session create -> remote-session review/publish -> seeker visibility & revision loop', async () => {
    const pracDb = testEnv.authenticatedContext('prac_uid_1').firestore() as any;
    const adminDb = testEnv.authenticatedContext('admin_uid_1').firestore() as any;
    const seekerDb = testEnv.authenticatedContext('seeker_uid_1').firestore() as any;

    // Session A (Practitioner): create and submit program via service
    const createdProg = await saveOrSubmitProgram(
      {
        title: 'Seasonal Agni & Sleep Alignment',
        discipline: 'Ayurveda',
        category: 'Lifestyle Education',
        durationWeeks: 6,
        level: 'Beginner',
        description: 'Structured six-week circadian and digestive rhythm curriculum.',
        creatorPractitionerId: 'prac_uid_1',
        practitionerName: 'Dr. Ananya Sharma',
        practitionerTitle: 'BAMS, MD',
        submitForReview: true,
      },
      pracDb
    );
    assert.equal(createdProg.status, 'pending_approval');
    assert.equal(createdProg.isPublished, false);

    // Seed a second remote-session program directly in Firestore (NOT in local cache)
    await setDoc(doc(pracDb, 'wellnessPrograms', 'prog_remote_session'), {
      id: 'prog_remote_session',
      title: 'Remote Session Morning Breathwork',
      discipline: 'Yoga & Naturopathy',
      category: 'Yoga',
      durationWeeks: 4,
      totalSessions: 16,
      creatorPractitionerId: 'prac_uid_1',
      practitionerName: 'Dr. Ananya Sharma',
      practitionerTitle: 'BAMS, MD',
      description: 'Created on another browser/device without localStorage entry.',
      nextSessionTemplate: 'Module 1: Nasal Clearing',
      level: 'Beginner',
      status: 'pending_approval',
      isPublished: false,
      submittedAt: '2026-11-10T00:00:00.000Z',
      reviewedByAdminId: null,
      reviewedAt: null,
      publishedAt: null,
      reviewNotes: null,
      isSimulated: false,
      createdAt: '2026-11-10T00:00:00.000Z',
      updatedAt: '2026-11-10T00:00:00.000Z',
    });

    // Verify seeker cannot see unpublished programs yet
    const publishedBefore = await fetchPublishedProgramsForUser(undefined, seekerDb);
    assert.equal(publishedBefore.length, 0);

    // Session B (Admin): load moderation queue and approve remote-session program
    const adminQueue = await fetchProgramsForAdminApproval(adminDb);
    assert.ok(adminQueue.some((p) => p.id === 'prog_remote_session'));
    assert.ok(adminQueue.some((p) => p.id === createdProg.id));

    const approvedRemote = await reviewProgramDecision(
      {
        programId: 'prog_remote_session',
        decision: 'published',
        reviewerId: 'admin_uid_1',
        reviewerRole: 'admin',
        reviewNotes: 'Approved across sessions.',
      },
      adminDb
    );
    assert.equal(approvedRemote.status, 'published');
    assert.equal(approvedRemote.isPublished, true);

    // Request revision on the first program -> must remain hidden from seekers
    const revisedProg = await reviewProgramDecision(
      {
        programId: createdProg.id,
        decision: 'revision_requested',
        reviewerId: 'admin_uid_1',
        reviewerRole: 'admin',
        reviewNotes: 'Add non-diagnostic disclaimer.',
      },
      adminDb
    );
    assert.equal(revisedProg.status, 'revision_requested');
    assert.equal(revisedProg.isPublished, false);

    // Non-admin attempt must fail
    await assert.rejects(
      reviewProgramDecision(
        {
          programId: createdProg.id,
          decision: 'published',
          reviewerId: 'prac_uid_1',
          reviewerRole: 'admin',
        },
        pracDb
      )
    );

    // Session C (Seeker): only published program is visible
    const publishedAfter = await fetchPublishedProgramsForUser(undefined, seekerDb);
    assert.equal(publishedAfter.length, 1);
    assert.equal(publishedAfter[0].id, 'prog_remote_session');

    // Practitioner edits revision-requested program remotely (simulating fresh session) & resubmits
    const pracList = await fetchProgramsForPractitioner('prac_uid_1', pracDb);
    assert.equal(pracList.length, 2);
    const resubmitted = await saveOrSubmitProgram(
      {
        id: createdProg.id,
        title: 'Seasonal Agni & Sleep Alignment',
        discipline: 'Ayurveda',
        category: 'Lifestyle Education',
        durationWeeks: 6,
        level: 'Beginner',
        description: 'Educational non-diagnostic six-week circadian and digestive curriculum.',
        creatorPractitionerId: 'prac_uid_1',
        practitionerName: 'Dr. Ananya Sharma',
        practitionerTitle: 'BAMS, MD',
        submitForReview: true,
      },
      pracDb
    );
    assert.equal(resubmitted.status, 'pending_approval');
  });

  it('2. Articles: cross-session authoring -> remote-session moderation -> seeker catalog & post-publish edit lock', async () => {
    const pracDb = testEnv.authenticatedContext('prac_uid_1').firestore() as any;
    const adminDb = testEnv.authenticatedContext('admin_uid_1').firestore() as any;
    const seekerDb = testEnv.authenticatedContext('seeker_uid_1').firestore() as any;

    // Seed remote-session article directly into Firestore (absent from localStorage)
    await setDoc(doc(pracDb, 'educationalArticles', 'art_remote_1'), {
      id: 'art_remote_1',
      title: 'Evening Digital Sunset Hygiene',
      discipline: 'Ayurveda',
      category: 'Lifestyle Education',
      readTime: '5 min read',
      authorId: 'prac_uid_1',
      authorName: 'Dr. Ananya Sharma',
      authorQualification: 'BAMS, MD',
      summary: 'Non-diagnostic circadian hygiene checklist for evening wind-down.',
      fullContent: 'Detailed educational overview on blue light reduction and calming infusions.',
      keyTakeaways: ['Dim lights 45 minutes prior to bed.'],
      status: 'pending_approval',
      submittedAt: '2026-11-11T00:00:00.000Z',
      reviewedByAdminId: null,
      reviewedAt: null,
      publishedAt: null,
      reviewNotes: null,
      isSimulated: false,
      createdAt: '2026-11-11T00:00:00.000Z',
      updatedAt: '2026-11-11T00:00:00.000Z',
    });

    // Also create via service
    const serviceArticle = await saveOrSubmitArticle(
      {
        title: 'Warm Ushapan Hydration Practice',
        discipline: 'Ayurveda',
        category: 'Nutrition',
        summary: 'Morning warm water ritual supporting comfortable bowel elimination.',
        fullContent: 'Sip 300ml lukewarm water upon rising.',
        authorId: 'prac_uid_1',
        authorName: 'Dr. Ananya Sharma',
        authorQualification: 'BAMS, MD',
        submitForReview: true,
      },
      pracDb
    );
    assert.equal(serviceArticle.status, 'pending_approval');

    // Seeker sees nothing yet
    assert.equal((await fetchPublishedArticlesForUser(undefined, seekerDb)).length, 0);

    // Admin moderates remote article
    const adminQueue = await fetchArticlesForAdminModeration(adminDb);
    assert.ok(adminQueue.some((a) => a.id === 'art_remote_1'));

    const publishedArt = await reviewArticleDecision(
      {
        articleId: 'art_remote_1',
        decision: 'published',
        reviewerId: 'admin_uid_1',
        reviewerRole: 'admin',
        reviewNotes: 'Approved for Learning Corner.',
      },
      adminDb
    );
    assert.equal(publishedArt.status, 'published');

    // Seeker sees only published article
    const seekerArticles = await fetchPublishedArticlesForUser(undefined, seekerDb);
    assert.equal(seekerArticles.length, 1);
    assert.equal(seekerArticles[0].id, 'art_remote_1');

    // Practitioner cannot edit published article
    await assert.rejects(
      saveOrSubmitArticle(
        {
          id: 'art_remote_1',
          title: 'Tampered After Publish',
          discipline: 'Ayurveda',
          category: 'Lifestyle Education',
          summary: 'Attempted overwrite after admin approval.',
          authorId: 'prac_uid_1',
          authorName: 'Dr. Ananya Sharma',
          authorQualification: 'BAMS, MD',
          submitForReview: false,
        },
        pracDb
      )
    );

    const pracArticles = await fetchArticlesForPractitioner('prac_uid_1', pracDb);
    assert.equal(pracArticles.length, 2);
  });

  it('3. Consultations & Practitioner Identity: verified-only resolution, remote status transitions & terminal locking', async () => {
    const seekerDb = testEnv.authenticatedContext('seeker_uid_1').firestore() as any;
    const pracDb = testEnv.authenticatedContext('prac_uid_1').firestore() as any;
    const otherPracDb = testEnv.authenticatedContext('prac_uid_other').firestore() as any;

    // Verified practitioners excludes unverified & prac-1
    const verifiedList = await fetchVerifiedPractitioners(seekerDb);
    assert.equal(verifiedList.length, 1);
    assert.equal(verifiedList[0].userId, 'prac_uid_1');

    const assignedUid = await fetchSeekerAssignedPractitionerId('seeker_uid_1', seekerDb);
    assert.equal(assignedUid, 'prac_uid_1');

    const resolvedPrac = resolvePractitionerForSeeker(
      PRIMARY_PRACTITIONER,
      null,
      verifiedList,
      true,
      assignedUid
    );
    assert.ok(resolvedPrac);
    assert.equal(resolvedPrac.id, 'prac_uid_1');

    // Reject prac-1 in live mode
    await assert.rejects(
      createConsultationRequest(
        {
          userId: 'seeker_uid_1',
          userName: 'Aarav Seeker',
          practitionerId: 'prac-1',
          practitionerName: 'Demo',
          topic: 'circadian-routine',
          preferredDate: '2026-12-01',
          preferredSlot: 'morning',
        },
        seekerDb
      )
    );

    // Seed a remote-session consultation directly in Firestore (NOT in localStorage)
    await setDoc(doc(seekerDb, 'consultations', 'consult_remote_1'), {
      id: 'consult_remote_1',
      userId: 'seeker_uid_1',
      userName: 'Aarav Seeker',
      practitionerId: 'prac_uid_1',
      practitionerName: 'Dr. Ananya Sharma',
      topic: 'circadian-routine',
      topicLabel: 'Circadian Routine & Sleep Hygiene (Dinacharya)',
      preferredDate: '2026-12-02',
      preferredSlot: 'morning',
      notes: 'Remote session request.',
      status: 'pending',
      scheduledTime: null,
      practitionerNotes: null,
      isSimulated: false,
      createdAt: '2026-11-26T00:00:00.000Z',
      updatedAt: '2026-11-26T00:00:00.000Z',
    });

    // Unassigned practitioner cannot view or update
    assert.equal((await fetchConsultationsForPractitioner('prac_uid_other', otherPracDb)).length, 0);
    await assert.rejects(
      updateConsultationStatus(
        'consult_remote_1',
        {
          status: 'confirmed',
          practitionerId: 'prac_uid_other',
          scheduledTime: '2026-12-02 10:00 AM',
        },
        otherPracDb
      )
    );

    // Assigned practitioner fetches & transitions: pending -> confirmed -> completed -> locked
    const pracConsults = await fetchConsultationsForPractitioner('prac_uid_1', pracDb);
    assert.equal(pracConsults.length, 1);
    assert.equal(pracConsults[0].id, 'consult_remote_1');

    const confirmed = await updateConsultationStatus(
      'consult_remote_1',
      {
        status: 'confirmed',
        practitionerId: 'prac_uid_1',
        scheduledTime: '2026-12-02 · 10:30 AM',
        practitionerNotes: 'Please track sleep latency.',
      },
      pracDb
    );
    assert.equal(confirmed.status, 'confirmed');

    // Cannot reject an already-confirmed consultation
    await assert.rejects(
      updateConsultationStatus(
        'consult_remote_1',
        {
          status: 'rejected',
          practitionerId: 'prac_uid_1',
          scheduledTime: null,
        },
        pracDb
      )
    );

    const completed = await updateConsultationStatus(
      'consult_remote_1',
      {
        status: 'completed',
        practitionerId: 'prac_uid_1',
        scheduledTime: confirmed.scheduledTime,
        practitionerNotes: 'Completed review.',
      },
      pracDb
    );
    assert.equal(completed.status, 'completed');

    // Terminal lock prevents reopening completed consultation
    await assert.rejects(
      updateConsultationStatus(
        'consult_remote_1',
        {
          status: 'rescheduled',
          practitionerId: 'prac_uid_1',
          scheduledTime: '2026-12-03 · 10:30 AM',
        },
        pracDb
      )
    );

    // Seeker sees updated status
    const seekerConsults = await fetchConsultationsForUser('seeker_uid_1', seekerDb);
    assert.equal(seekerConsults.length, 1);
    assert.equal(seekerConsults[0].status, 'completed');
  });

  it('4. Multi-version Assessment -> Wellness Plan -> Assigned Practitioner Snapshot & Unassigned Denial', async () => {
    const seekerDb = testEnv.authenticatedContext('seeker_uid_1').firestore() as any;
    const otherSeekerDb = testEnv.authenticatedContext('seeker_uid_2').firestore() as any;
    const pracDb = testEnv.authenticatedContext('prac_uid_1').firestore() as any;
    const otherPracDb = testEnv.authenticatedContext('prac_uid_other').firestore() as any;

    // Assessment v1 -> Plan v1
    const v1 = await submitAssessment(
      'seeker_uid_1',
      buildAssessmentAnswers(0),
      { circadian: 'Baseline v1 observation' },
      seekerDb
    );
    assert.equal(v1.assessment.version, 1);
    assert.equal(v1.plan.version, 1);

    // Assessment v2 -> Plan v2 (with comparison)
    const v2 = await submitAssessment(
      'seeker_uid_1',
      buildAssessmentAnswers(2),
      { circadian: 'Improved sleep timing v2' },
      seekerDb
    );
    assert.equal(v2.assessment.version, 2);
    assert.equal(v2.plan.version, 2);
    assert.ok(v2.assessment.comparisonWithPrevious);

    // Both versions persisted in Firestore
    const assessHistory = await fetchAssessmentHistory('seeker_uid_1', seekerDb);
    assert.equal(assessHistory.length, 2);
    assert.equal(assessHistory[0].version, 2);
    assert.equal(assessHistory[1].version, 1);

    const planHistory = await fetchWellnessPlanHistory('seeker_uid_1', seekerDb);
    assert.equal(planHistory.length, 2);
    const latestPlan = await fetchLatestWellnessPlan('seeker_uid_1', seekerDb);
    assert.equal(latestPlan?.version, 2);

    // Other seeker cannot read seeker_uid_1 assessments or plans
    await assert.rejects(fetchAssessmentHistory('seeker_uid_1', otherSeekerDb));
    await assert.rejects(getDoc(doc(otherSeekerDb, 'wellnessPlans', 'plan_seeker_uid_1_v2')));

    // Assigned practitioner can read client profile, permitted wellness snapshot, and save observation notes
    const assignedClients = await fetchClientsForPractitioner('prac_uid_1', pracDb);
    assert.equal(assignedClients.length, 1);
    assert.equal(assignedClients[0].id, 'seeker_uid_1');

    const snapshot = await fetchAssignedClientWellnessSnapshot('seeker_uid_1', pracDb);
    assert.ok(snapshot);
    assert.equal(snapshot.latestVersion, 2);
    assert.ok(snapshot.planTitle?.includes('Version 2'));

    const updatedClient = await updateClientObservationNotes(
      'seeker_uid_1',
      'Circadian improvements noted in v2 assessment.',
      'On Track',
      'prac_uid_1',
      assignedClients[0],
      pracDb
    );
    assert.equal(updatedClient.status, 'On Track');

    // Unassigned practitioner cannot access client profile, wellness snapshot, or update notes
    assert.equal((await fetchClientsForPractitioner('prac_uid_other', otherPracDb)).length, 0);
    assert.equal(await fetchAssignedClientWellnessSnapshot('seeker_uid_1', otherPracDb), null);
    await assert.rejects(
      updateClientObservationNotes(
        'seeker_uid_1',
        'Unauthorized note',
        'Needs Review',
        'prac_uid_other',
        assignedClients[0],
        otherPracDb
      )
    );
  });
});
