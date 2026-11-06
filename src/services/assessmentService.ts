import {
  AssessmentVersionRecord,
  WellnessPlan,
} from '../types/assessment';
import { analyzeAssessmentAnswers, compareAssessments } from './lifestyleAnalysisService';
import { generateWellnessPlan, saveWellnessPlan } from './wellnessPlanService';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { doc, getDoc, setDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';

const LOCAL_ASSESSMENTS_HISTORY_KEY = 'ayush_assessments_history_store';
const memoryAssessmentsStore = new Map<string, string>();

function getLocalHistory(): Record<string, AssessmentVersionRecord[]> {
  try {
    const raw = typeof window !== 'undefined' && window.localStorage
      ? window.localStorage.getItem(LOCAL_ASSESSMENTS_HISTORY_KEY)
      : memoryAssessmentsStore.get(LOCAL_ASSESSMENTS_HISTORY_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    const raw = memoryAssessmentsStore.get(LOCAL_ASSESSMENTS_HISTORY_KEY);
    return raw ? JSON.parse(raw) : {};
  }
}

function setLocalHistory(data: Record<string, AssessmentVersionRecord[]>): void {
  try {
    const val = JSON.stringify(data);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(LOCAL_ASSESSMENTS_HISTORY_KEY, val);
    }
    memoryAssessmentsStore.set(LOCAL_ASSESSMENTS_HISTORY_KEY, val);
  } catch {
    memoryAssessmentsStore.set(LOCAL_ASSESSMENTS_HISTORY_KEY, JSON.stringify(data));
  }
}

/**
 * Submits a new lifestyle assessment, automatically:
 * 1. Incrementing version number
 * 2. Analyzing answers using transparent lifestyle logic
 * 3. Comparing with the previous assessment (identifying improvements, unchanged, focus areas)
 * 4. Generating a revised educational wellness plan
 * 5. Persisting both assessment record and wellness plan without overwriting past versions
 */
export async function submitAssessment(
  userId: string,
  answers: Record<string, string>,
  categoryNotes?: Record<string, string>
): Promise<{ assessment: AssessmentVersionRecord; plan: WellnessPlan }> {
  // 1. Fetch previous assessment history to find latest version
  const history = await fetchAssessmentHistory(userId);
  const previousRecord = history.length > 0 ? history[0] : null;
  const nextVersion = previousRecord ? previousRecord.version + 1 : 1;

  // 2. Perform transparent lifestyle analysis
  const analysis = analyzeAssessmentAnswers(answers);

  const completedAt = new Date().toISOString();
  const assessmentId = `assess_${userId}_v${nextVersion}`;

  // 3. Draft assessment record
  const draftRecord: AssessmentVersionRecord = {
    id: assessmentId,
    userId,
    version: nextVersion,
    completedAt,
    answers,
    categoryNotes: categoryNotes || {},
    totalAnswered: Object.keys(answers).length,
    totalQuestions: 20,
    isComplete: true,
    analysis,
  };

  // 4. Compare with previous assessment if available
  if (previousRecord) {
    const comparison = compareAssessments(draftRecord, previousRecord);
    draftRecord.comparisonWithPrevious = comparison;
  } else {
    draftRecord.comparisonWithPrevious = null;
  }

  // 5. Generate and save the revised wellness plan
  const plan = generateWellnessPlan(userId, draftRecord);
  await saveWellnessPlan(plan);

  // 6. Save versioned assessment to Cloud Firestore if configured
  if (isFirebaseConfigured && db) {
    try {
      // Save versioned record under assessments/{assess_userId}/history/{version}
      const versionDocRef = doc(db, 'assessments', `assess_${userId}`, 'history', `v${nextVersion}`);
      await setDoc(versionDocRef, {
        ...draftRecord,
        updatedAtServer: serverTimestamp(),
      });

      // Update primary current assessment doc for backwards compatibility
      const mainDocRef = doc(db, 'assessments', `assess_${userId}`);
      await setDoc(mainDocRef, {
        id: `assess_${userId}`,
        userId,
        latestVersion: nextVersion,
        answers,
        totalAnswered: Object.keys(answers).length,
        totalQuestions: 20,
        isComplete: true,
        circadianBalanceCategory: analysis.circadianRhythmCategory,
        digestiveAgniCategory: analysis.digestiveAgniCategory,
        movementCategory: analysis.movementPranaCategory,
        stressCategory: analysis.stressMindCategory,
        constitutionTendency: analysis.constitutionTendency,
        completedAt,
        updatedAt: completedAt,
        updatedAtServer: serverTimestamp(),
      }, { merge: true });
    } catch (err) {
      console.warn('Could not persist assessment version to Cloud Firestore:', err);
    }
  }

  // 7. Save to local demo storage
  try {
    const store = getLocalHistory();
    const userRecords = store[userId] || [];
    userRecords.unshift(draftRecord);
    userRecords.sort((a, b) => b.version - a.version);
    store[userId] = userRecords;
    setLocalHistory(store);
  } catch (err) {
    console.warn('Error saving local assessment version:', err);
  }

  return { assessment: draftRecord, plan };
}

/**
 * Fetches the latest assessment record for a user.
 */
export async function fetchLatestAssessment(userId: string): Promise<AssessmentVersionRecord | null> {
  const history = await fetchAssessmentHistory(userId);
  return history.length > 0 ? history[0] : null;
}

/**
 * Fetches full chronological assessment history for a user.
 */
export async function fetchAssessmentHistory(userId: string): Promise<AssessmentVersionRecord[]> {
  // 1. Cloud Firestore branch
  if (isFirebaseConfigured && db) {
    try {
      const historyCol = collection(db, 'assessments', `assess_${userId}`, 'history');
      const snap = await getDocs(historyCol);
      if (!snap.empty) {
        const records = snap.docs.map((d) => d.data() as AssessmentVersionRecord);
        records.sort((a, b) => b.version - a.version);
        return records;
      }
    } catch (err) {
      console.warn('Error fetching assessment history from Cloud Firestore:', err);
    }
  }

  // 2. Persistent Local Storage branch
  const store = getLocalHistory();
  const userRecords = store[userId] || [];
  userRecords.sort((a, b) => b.version - a.version);
  return userRecords;
}

/**
 * Fetches a specific assessment version.
 */
export async function fetchAssessmentByVersion(
  userId: string,
  version: number
): Promise<AssessmentVersionRecord | null> {
  const history = await fetchAssessmentHistory(userId);
  return history.find((r) => r.version === version) || null;
}
