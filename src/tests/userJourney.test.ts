import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  signUpUser,
  signInUser,
  signOutCurrentUser,
  fetchUserProfile,
} from '../services/authService';
import {
  saveUserAssessment,
  fetchUserAssessment,
  toggleActivityStatus,
  fetchDailyActivitiesForDate,
} from '../services/firestoreService';
import { calculateAssessmentSummary } from '../utils/lifestyleLogic';

describe('AYUSH Wellness Connect - Core User Journey Verification Suite', () => {
  const testUserA = {
    email: `seeker_${Date.now()}_a@ayushwellness.org`,
    password: 'securePassword123',
    displayName: 'Aarav Sharma',
  };

  const testUserB = {
    email: `seeker_${Date.now()}_b@ayushwellness.org`,
    password: 'password456',
    displayName: 'Pooja Patel',
  };

  let userAUid: string;
  let userBUid: string;
  const today = new Date().toISOString().split('T')[0];

  // 1. User Registration
  it('1. User registration creates account with role strictly set to "user"', async () => {
    const regResult = await signUpUser(testUserA.email, testUserA.password, testUserA.displayName);
    assert.equal(regResult.error, null, 'Registration must succeed without errors');
    assert.ok(regResult.user, 'User profile must be returned');
    assert.equal(regResult.user?.role, 'user', 'Role must always be defaulted to user');
    assert.equal(regResult.user?.displayName, testUserA.displayName);
    assert.equal(regResult.user?.email, testUserA.email.toLowerCase());
    assert.ok(regResult.user?.uid, 'UID must be generated');

    userAUid = regResult.user!.uid;

    // Verify stored profile in users collection
    const profile = await fetchUserProfile(userAUid);
    assert.ok(profile, 'Profile must exist in users collection');
    assert.equal(profile?.role, 'user');
  });

  // 2. Duplicate Registration Prevention
  it('2. Attempting to register an existing email is rejected', async () => {
    const dupResult = await signUpUser(testUserA.email, 'anotherPassword', 'Duplicate User');
    assert.ok(dupResult.error, 'Duplicate registration must return error');
    assert.equal(dupResult.user, null);
  });

  // 3. User Login
  it('3. User login verifies credentials and authenticates returning user', async () => {
    // Test invalid password first
    const badLogin = await signInUser(testUserA.email, 'wrongPassword');
    assert.ok(badLogin.error, 'Invalid password must return error');

    // Test valid password
    const goodLogin = await signInUser(testUserA.email, testUserA.password);
    assert.equal(goodLogin.error, null);
    assert.equal(goodLogin.user?.uid, userAUid);
    assert.equal(goodLogin.user?.displayName, testUserA.displayName);
  });

  // 4. Lifestyle Assessment Save & Calculation
  it('4. Lifestyle assessment accepts answers, computes summary, and saves to Firestore', async () => {
    const answers = {
      q1: 'energized',
      q2: 'robust',
      q3: 'active',
      q4: 'breathwork',
    };

    const summary = calculateAssessmentSummary(answers);
    assert.equal(summary.circadianBalanceCategory, 'Alert Sunrise Awakening (Pitta-Vata Alignment)');
    assert.equal(summary.digestiveAgniCategory, 'Robust Digestive Fire (Teekshna Agni)');
    assert.equal(summary.constitutionTendency, 'Pitta-Predominant Vitality');
    assert.ok(summary.guidanceNote.includes('Not a clinical diagnosis'));

    // Save assessment for User A
    await saveUserAssessment(userAUid, answers, {
      circadian: summary.circadianBalanceCategory,
      agni: summary.digestiveAgniCategory,
      movement: summary.movementCategory,
      stress: summary.stressCategory,
    });

    // Retrieve assessment from Firestore
    const savedDoc = await fetchUserAssessment(userAUid);
    assert.ok(savedDoc, 'Assessment document must be retrieved');
    assert.equal(savedDoc?.userId, userAUid);
    assert.equal(savedDoc?.totalAnswered, 4);
    assert.equal(savedDoc?.isComplete, true);
    assert.equal(savedDoc?.answers.q1, 'energized');
    assert.equal(savedDoc?.circadianBalanceCategory, summary.circadianBalanceCategory);
    assert.equal(savedDoc?.digestiveAgniCategory, summary.digestiveAgniCategory);
  });

  // 5. Daily Habit Tracking Save & Retrieval
  it('5. Daily habit tracking saves completion status for today and retrieves it', async () => {
    // Initially, fetch activities for User A on today
    const initialList = await fetchDailyActivitiesForDate(userAUid, today);
    const initialCompleted = initialList.find((a) => a.activityKey === 'act-1')?.completed;
    assert.equal(initialCompleted, undefined, 'Initially no recorded habits for new user on today');

    // Toggle act-1 to completed: true
    await toggleActivityStatus(userAUid, 'act-1', today, true);

    // Toggle act-2 to completed: true
    await toggleActivityStatus(userAUid, 'act-2', today, true);

    // Toggle act-3 to completed: false
    await toggleActivityStatus(userAUid, 'act-3', today, false);

    // Fetch back today's records
    const updatedList = await fetchDailyActivitiesForDate(userAUid, today);
    assert.equal(updatedList.length, 3, 'Must contain 3 recorded activities for today');

    const act1 = updatedList.find((a) => a.activityKey === 'act-1');
    const act2 = updatedList.find((a) => a.activityKey === 'act-2');
    const act3 = updatedList.find((a) => a.activityKey === 'act-3');

    assert.equal(act1?.completed, true, 'act-1 must be recorded as true');
    assert.equal(act2?.completed, true, 'act-2 must be recorded as true');
    assert.equal(act3?.completed, false, 'act-3 must be recorded as false');
  });

  // 6. Persistence across Logout, Reload & Login
  it('6. Assessment and habit records persist across logout and re-login', async () => {
    // Logout User A
    await signOutCurrentUser();

    // Register User B
    const regB = await signUpUser(testUserB.email, testUserB.password, testUserB.displayName);
    assert.ok(regB.user);
    userBUid = regB.user!.uid;

    // Verify User B has NO assessment yet
    const bAssessment = await fetchUserAssessment(userBUid);
    assert.equal(bAssessment, null, 'User B must not have any assessment initially');

    // Verify User B has NO daily activities recorded for today
    const bActivities = await fetchDailyActivitiesForDate(userBUid, today);
    assert.equal(bActivities.length, 0, 'User B must have 0 activities initially');

    // User B records different habits
    await toggleActivityStatus(userBUid, 'act-4', today, true);

    // Logout User B
    await signOutCurrentUser();

    // User A logs back in
    const loginA = await signInUser(testUserA.email, testUserA.password);
    assert.ok(loginA.user);
    assert.equal(loginA.user?.uid, userAUid);

    // User A retrieves their original assessment
    const reloadedDocA = await fetchUserAssessment(userAUid);
    assert.ok(reloadedDocA, 'User A assessment must persist after logout and re-login');
    assert.equal(reloadedDocA?.answers.q1, 'energized');
    assert.equal(reloadedDocA?.answers.q2, 'robust');

    // User A retrieves their original habits for today
    const reloadedActivitiesA = await fetchDailyActivitiesForDate(userAUid, today);
    assert.equal(reloadedActivitiesA.length, 3, 'User A activities must persist');
    assert.equal(reloadedActivitiesA.find((a) => a.activityKey === 'act-1')?.completed, true);
    assert.equal(reloadedActivitiesA.find((a) => a.activityKey === 'act-4'), undefined);
  });

  // 7. Security: Ownership isolation between users
  it('7. User B cannot access or overwrite User A records', async () => {
    // User B should not see User A's activities when querying their own
    const bActivities = await fetchDailyActivitiesForDate(userBUid, today);
    assert.equal(bActivities.length, 1);
    assert.equal(bActivities[0].activityKey, 'act-4');
    assert.equal(bActivities[0].userId, userBUid);

    // User B's assessment remains isolated
    const bAssessment = await fetchUserAssessment(userBUid);
    assert.equal(bAssessment, null);
  });
});
