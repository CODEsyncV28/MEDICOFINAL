import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  ASSESSMENT_CATEGORIES,
  EXPANDED_ASSESSMENT_QUESTIONS,
} from '../data/assessmentQuestions';
import {
  canNavigateToCategory,
  countCanonicalAnsweredQuestions,
  createResetAssessmentModalState,
  validateAssessmentCompletion,
} from '../utils/assessmentValidation';
import {
  GUEST_DINACHARYA_USER_ID,
  fetchDailyActivitiesForDate,
  mergeDailyActivitiesWithRecords,
  toggleActivityStatus,
} from '../services/dinacharyaService';
import { INITIAL_DAILY_ACTIVITIES } from '../data/mockData';
import { canAccessPortal, PORTAL_SECURITY_DISCLAIMER } from '../utils/portalAccess';
import { hashDemoPassword, signInUser, signUpUser } from '../services/authService';

function createCompleteAnswers(): Record<string, string> {
  const answers: Record<string, string> = {};
  for (const q of EXPANDED_ASSESSMENT_QUESTIONS) {
    answers[q.id] = q.options[0].value;
  }
  return answers;
}

describe('Phase 4.4A Stabilization Tests', () => {
  // 1. Incomplete assessment submission & category navigation guard
  it('1. Rejects incomplete assessment submission when fewer than 20 canonical questions are answered', () => {
    const emptyCheck = validateAssessmentCompletion({});
    assert.equal(emptyCheck.isValid, false);
    assert.equal(emptyCheck.answeredCount, 0);
    assert.equal(emptyCheck.totalQuestions, 20);
    assert.equal(emptyCheck.unansweredQuestions.length, 20);
    assert.ok(emptyCheck.message?.includes('20'));

    // Even if legacy alias keys q1..q3 are present alongside 17 canonical answers, must reject
    const partialAnswers = createCompleteAnswers();
    delete partialAnswers.circadian_waking_time;
    delete partialAnswers.sleep_bedtime_regularity;
    delete partialAnswers.screen_night_curfew;
    const partialWithLegacy: Record<string, string> = {
      ...partialAnswers,
      q1: 'gradual',
      q2: 'robust',
      q3: 'active',
    };

    assert.equal(countCanonicalAnsweredQuestions(partialWithLegacy), 17);
    const partialCheck = validateAssessmentCompletion(partialWithLegacy);
    assert.equal(partialCheck.isValid, false);
    assert.equal(partialCheck.answeredCount, 17);
    assert.equal(partialCheck.unansweredQuestions.length, 3);
    assert.deepEqual(partialCheck.unansweredQuestionIds, [
      'circadian_waking_time',
      'sleep_bedtime_regularity',
      'screen_night_curfew',
    ]);
    assert.equal(partialCheck.firstUnansweredIndex, 0);
    assert.equal(partialCheck.unansweredByCategory.length, 3);

    // Complete 20 canonical answers pass validation
    const fullCheck = validateAssessmentCompletion(createCompleteAnswers());
    assert.equal(fullCheck.isValid, true);
    assert.equal(fullCheck.answeredCount, 20);
    assert.equal(fullCheck.message, null);
  });

  it('2. Blocks category tab navigation from bypassing earlier unanswered questions', () => {
    const partial = {
      circadian_waking_energy: 'gradual',
    };
    const jumpToCat8 = canNavigateToCategory('screentime', partial);
    assert.equal(jumpToCat8.allowed, false);
    assert.equal(jumpToCat8.blockedByCategory?.categoryId, 'circadian');
    assert.equal(jumpToCat8.redirectIndex, 0);
    assert.ok(jumpToCat8.reason?.includes('Daily Routine & Circadian Rhythm'));

    // Once Dimension 1 is completely answered, navigating to Dimension 2 is allowed
    const cat1Answered: Record<string, string> = {};
    EXPANDED_ASSESSMENT_QUESTIONS.filter((q) => q.category === 'circadian').forEach((q) => {
      cat1Answered[q.id] = q.options[0].value;
    });
    const jumpToCat2 = canNavigateToCategory('sleep', cat1Answered);
    assert.equal(jumpToCat2.allowed, true);
    assert.equal(jumpToCat2.redirectIndex, 3);

    // Jumping past unanswered Dimension 2 to Dimension 5 is still blocked
    const jumpToCat5 = canNavigateToCategory('movement', cat1Answered);
    assert.equal(jumpToCat5.allowed, false);
    assert.equal(jumpToCat5.blockedByCategory?.categoryId, 'sleep');
  });

  // 2. Assessment modal state resetting on reopen
  it('3. Resets categoryNotes, step index, completion state, and validation errors on reopen', () => {
    const reopened = createResetAssessmentModalState({ circadian_waking_energy: 'gradual' });
    assert.deepEqual(reopened.categoryNotes, {});
    assert.equal(reopened.currentQuestionIndex, 0);
    assert.equal(reopened.isFinished, false);
    assert.equal(reopened.validationError, null);
    assert.equal(reopened.showValidationSummary, false);
    assert.deepEqual(reopened.answers, { circadian_waking_energy: 'gradual' });
  });

  // 3. Initial question-browser category displays questions
  it('4. Initial question-browser category matches ASSESSMENT_CATEGORIES[0] and has questions', () => {
    const firstCategory = ASSESSMENT_CATEGORIES[0];
    assert.equal(firstCategory.id, 'circadian');
    const firstCategoryQuestions = EXPANDED_ASSESSMENT_QUESTIONS.filter(
      (q) => q.category === firstCategory.id
    );
    assert.ok(
      firstCategoryQuestions.length >= 3,
      'First dimension must return questions immediately when browser opens'
    );

    const userDashboardPath = path.resolve(process.cwd(), 'src/components/dashboard/UserDashboard.tsx');
    const source = fs.readFileSync(userDashboardPath, 'utf8');
    assert.ok(
      !source.includes("'circadian_rhythm'"),
      'Broken category ID circadian_rhythm must not exist in UserDashboard.tsx'
    );
    assert.ok(
      source.includes("ASSESSMENT_CATEGORIES[0]?.id || 'circadian'"),
      'UserDashboard must initialize selectedPreviewCategory to ASSESSMENT_CATEGORIES[0].id'
    );
  });

  // 4. Guest Dinacharya persistence, deduplication & user isolation
  it('5. Persists guest Dinacharya state across reloads without duplicates and isolates signed-in users', async () => {
    const mockStorage = new Map<string, string>();
    (globalThis as any).window = {
      localStorage: {
        getItem: (k: string) => mockStorage.get(k) ?? null,
        setItem: (k: string, v: string) => mockStorage.set(k, v),
        removeItem: (k: string) => mockStorage.delete(k),
      },
    };

    const today = '2026-11-25';
    const signedInUid = 'user_isolated_42';

    // Guest toggles act-3 on and act-1 off
    await toggleActivityStatus(GUEST_DINACHARYA_USER_ID, 'act-3', today, true);
    await toggleActivityStatus(GUEST_DINACHARYA_USER_ID, 'act-3', today, true);
    await toggleActivityStatus(GUEST_DINACHARYA_USER_ID, 'act-1', today, false);

    // Signed-in user toggles act-5 on
    await toggleActivityStatus(signedInUid, 'act-5', today, true);

    const guestDocs = await fetchDailyActivitiesForDate(GUEST_DINACHARYA_USER_ID, today);
    assert.equal(guestDocs.length, 2, 'No duplicate activity records for guest');

    const hydratedGuest = mergeDailyActivitiesWithRecords(INITIAL_DAILY_ACTIVITIES, guestDocs, true);
    assert.equal(hydratedGuest.length, INITIAL_DAILY_ACTIVITIES.length);
    assert.equal(hydratedGuest.find((a) => a.id === 'act-1')?.completed, false);
    assert.equal(hydratedGuest.find((a) => a.id === 'act-2')?.completed, true);
    assert.equal(hydratedGuest.find((a) => a.id === 'act-3')?.completed, true);
    assert.equal(hydratedGuest.find((a) => a.id === 'act-5')?.completed, false, 'Guest does not see user toggle');

    const userDocs = await fetchDailyActivitiesForDate(signedInUid, today);
    assert.equal(userDocs.length, 1);
    const hydratedUser = mergeDailyActivitiesWithRecords(INITIAL_DAILY_ACTIVITIES, userDocs, false);
    assert.equal(hydratedUser.find((a) => a.id === 'act-1')?.completed, false, 'User does not inherit guest defaults');
    assert.equal(hydratedUser.find((a) => a.id === 'act-3')?.completed, false, 'User does not see guest toggle');
    assert.equal(hydratedUser.find((a) => a.id === 'act-5')?.completed, true);

    delete (globalThis as any).window;
  });

  // 5. Portal access rules, demo-mode gating & no plaintext passwords in localStorage
  it('6. Blocks guest and ordinary user accounts from Practitioner/Admin portals unless explicit Demo Mode is enabled', () => {
    // Guest without Demo Mode
    assert.equal(
      canAccessPortal({
        targetRole: 'user',
        accountRole: null,
        isAuthenticated: false,
        demoPortalEnabled: false,
        isFirebaseConfigured: false,
      }).allowed,
      true
    );
    assert.equal(
      canAccessPortal({
        targetRole: 'practitioner',
        accountRole: null,
        isAuthenticated: false,
        demoPortalEnabled: false,
        isFirebaseConfigured: false,
      }).allowed,
      false
    );
    assert.equal(
      canAccessPortal({
        targetRole: 'admin',
        accountRole: null,
        isAuthenticated: false,
        demoPortalEnabled: false,
        isFirebaseConfigured: false,
      }).allowed,
      false
    );

    // Ordinary signed-in user without Demo Mode
    assert.equal(
      canAccessPortal({
        targetRole: 'practitioner',
        accountRole: 'user',
        isAuthenticated: true,
        demoPortalEnabled: false,
        isFirebaseConfigured: false,
      }).allowed,
      false
    );
    assert.equal(
      canAccessPortal({
        targetRole: 'admin',
        accountRole: 'user',
        isAuthenticated: true,
        demoPortalEnabled: false,
        isFirebaseConfigured: false,
      }).allowed,
      false
    );

    // Explicit DEMO MODE portal switcher unlocks UI preview cleanly (and marks isDemoOverride)
    const demoPractitioner = canAccessPortal({
      targetRole: 'practitioner',
      accountRole: 'user',
      isAuthenticated: true,
      demoPortalEnabled: true,
      isFirebaseConfigured: false,
    });
    assert.equal(demoPractitioner.allowed, true);
    assert.equal(demoPractitioner.isDemoOverride, true);

    // When Firebase IS configured, client-side Demo Mode never unlocks restricted portals
    const firebaseLocked = canAccessPortal({
      targetRole: 'admin',
      accountRole: 'user',
      isAuthenticated: true,
      demoPortalEnabled: true,
      isFirebaseConfigured: true,
    });
    assert.equal(firebaseLocked.allowed, false);
    assert.ok(PORTAL_SECURITY_DISCLAIMER.includes('Firebase Security Rules'));
  });

  it('7. Stores salted credential hashes in localStorage and never stores raw passwords', async () => {
    const mockStorage = new Map<string, string>();
    (globalThis as any).window = {
      localStorage: {
        getItem: (k: string) => mockStorage.get(k) ?? null,
        setItem: (k: string, v: string) => mockStorage.set(k, v),
        removeItem: (k: string) => mockStorage.delete(k),
      },
    };

    const email = `hashed_${Date.now()}@ayushwellness.org`;
    const secret = 'Prakriti!2026';
    const reg = await signUpUser(email, secret, 'Hash Verification Seeker');
    assert.equal(reg.error, null);

    const rawUsersJson = mockStorage.get('ayush_auth_users') || '{}';
    assert.ok(!rawUsersJson.includes(secret), 'Raw password must NEVER be stored in localStorage');
    assert.ok(!rawUsersJson.includes('"password"'), 'Legacy password property must not exist');
    assert.ok(rawUsersJson.includes('"passwordHash"'), 'Salted hash must be stored');
    assert.ok(rawUsersJson.includes('"passwordSalt"'), 'Per-user salt must be stored');

    const badPass = await signInUser(email, 'WrongPassword99');
    assert.ok(badPass.error);
    const goodPass = await signInUser(email, secret);
    assert.equal(goodPass.error, null);
    assert.equal(goodPass.user?.role, 'user');

    const hashA = await hashDemoPassword(secret, 'saltA');
    const hashB = await hashDemoPassword(secret, 'saltB');
    assert.notEqual(hashA, hashB);

    delete (globalThis as any).window;
  });
});
