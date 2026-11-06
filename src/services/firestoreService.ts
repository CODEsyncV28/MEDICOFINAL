import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth, isFirebaseConfigured } from '../lib/firebase';
import {
  LifestyleAssessmentDocument,
  DailyActivityDocument,
  WellnessProgramDocument,
  EducationalArticleDocument,
  PractitionerDocument,
  ConsultationDocument,
  ContentApprovalDocument,
  ClientProfileDocument,
} from '../types/firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  };
}

/**
 * Standardized error reporter for Firestore access violations and network issues.
 */
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
    },
  };
  console.error('[AYUSH Firestore Error]:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Local storage keys for persistent demo/offline mode
const LOCAL_ASSESSMENTS_KEY = 'ayush_firestore_assessments';
const LOCAL_ACTIVITIES_KEY = 'ayush_firestore_dailyActivities';

const memoryStore = new Map<string, string>();

function getLocalData<T>(key: string): Record<string, T> {
  try {
    const raw = typeof window !== 'undefined' && window.localStorage
      ? window.localStorage.getItem(key)
      : memoryStore.get(key);
    return raw ? JSON.parse(raw) : {};
  } catch {
    const raw = memoryStore.get(key);
    return raw ? JSON.parse(raw) : {};
  }
}

function setLocalData<T>(key: string, data: Record<string, T>): void {
  try {
    const val = JSON.stringify(data);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, val);
    }
    memoryStore.set(key, val);
  } catch {
    memoryStore.set(key, JSON.stringify(data));
  }
}

// Re-export modular domain services
export * from './assessmentService';
export * from './wellnessPlanService';
export * from './lifestyleAnalysisService';
export * from './dinacharyaService';
export * from './practitionerService';
export * from './consultationService';
export * from './adminService';

// ---------------------------------------------------------------------------
// 1. ASSESSMENTS SERVICE (Backwards-Compatible Facade)
// ---------------------------------------------------------------------------
export async function saveUserAssessment(
  userId: string,
  answers: Record<string, string>,
  categories: {
    circadian?: string;
    agni?: string;
    movement?: string;
    stress?: string;
  }
): Promise<void> {
  const assessmentId = `assess_${userId}`;
  const path = `assessments/${assessmentId}`;

  // Real Cloud Firestore branch
  if (isFirebaseConfigured && db) {
    try {
      const docRef = doc(db, 'assessments', assessmentId);
      const payload = {
        id: assessmentId,
        userId,
        answers,
        totalAnswered: Object.keys(answers).length,
        totalQuestions: Object.keys(answers).length >= 15 ? 20 : 4,
        isComplete: Object.keys(answers).length >= 4,
        circadianBalanceCategory: categories.circadian || 'Gradual Morning Awakening',
        digestiveAgniCategory: categories.agni || 'Moderate Agni Tendency',
        movementCategory: categories.movement || 'Active Rhythm',
        stressCategory: categories.stress || 'Mindful Resting',
        updatedAt: new Date().toISOString(),
        updatedAtServer: serverTimestamp(),
      };
      await setDoc(docRef, payload, { merge: true });
      return;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
      return;
    }
  }

  // Persistent Local Firestore Branch (Demo/Sandbox mode)
  try {
    const store = getLocalData<LifestyleAssessmentDocument>(LOCAL_ASSESSMENTS_KEY);
    const docData: LifestyleAssessmentDocument = {
      id: assessmentId,
      userId,
      answers,
      totalAnswered: Object.keys(answers).length,
      totalQuestions: Object.keys(answers).length >= 15 ? 20 : 4,
      isComplete: Object.keys(answers).length >= 4,
      circadianBalanceCategory: categories.circadian || 'Gradual Morning Awakening',
      digestiveAgniCategory: categories.agni || 'Moderate Agni Tendency',
      movementCategory: categories.movement || 'Active Rhythm',
      stressCategory: categories.stress || 'Mindful Resting',
      updatedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };
    store[assessmentId] = docData;
    setLocalData(LOCAL_ASSESSMENTS_KEY, store);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function fetchUserAssessment(userId: string): Promise<LifestyleAssessmentDocument | null> {
  const assessmentId = `assess_${userId}`;
  const path = `assessments/${assessmentId}`;

  // Real Cloud Firestore branch
  if (isFirebaseConfigured && db) {
    try {
      const snap = await getDoc(doc(db, 'assessments', assessmentId));
      return snap.exists() ? (snap.data() as LifestyleAssessmentDocument) : null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return null;
    }
  }

  // Persistent Local Firestore Branch (Demo/Sandbox mode)
  try {
    const store = getLocalData<LifestyleAssessmentDocument>(LOCAL_ASSESSMENTS_KEY);
    return store[assessmentId] || null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

// ---------------------------------------------------------------------------
// 2. DAILY ACTIVITIES SERVICE
// ---------------------------------------------------------------------------
export async function toggleActivityStatus(
  userId: string,
  activityKey: string,
  dateString: string,
  completed: boolean
): Promise<void> {
  const docId = `${userId}_${dateString}_${activityKey}`;
  const path = `dailyActivities/${docId}`;

  // Real Cloud Firestore branch
  if (isFirebaseConfigured && db) {
    try {
      const docRef = doc(db, 'dailyActivities', docId);
      await setDoc(
        docRef,
        {
          id: docId,
          userId,
          activityKey,
          dateString,
          completed,
          completedAt: completed ? new Date().toISOString() : null,
          updatedAtServer: serverTimestamp(),
        },
        { merge: true }
      );
      return;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
      return;
    }
  }

  // Persistent Local Firestore Branch (Demo/Sandbox mode)
  try {
    const store = getLocalData<DailyActivityDocument>(LOCAL_ACTIVITIES_KEY);
    const docData: DailyActivityDocument = {
      id: docId,
      userId,
      activityKey,
      dateString,
      completed,
      completedAt: completed ? new Date().toISOString() : null,
    };
    store[docId] = docData;
    setLocalData(LOCAL_ACTIVITIES_KEY, store);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function fetchDailyActivitiesForDate(
  userId: string,
  dateString: string
): Promise<DailyActivityDocument[]> {
  const path = 'dailyActivities';

  // Real Cloud Firestore branch
  if (isFirebaseConfigured && db) {
    try {
      const q = query(
        collection(db, 'dailyActivities'),
        where('userId', '==', userId),
        where('dateString', '==', dateString)
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => d.data() as DailyActivityDocument);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  }

  // Persistent Local Firestore Branch (Demo/Sandbox mode)
  try {
    const store = getLocalData<DailyActivityDocument>(LOCAL_ACTIVITIES_KEY);
    return Object.values(store).filter(
      (act) => act.userId === userId && act.dateString === dateString
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

// ---------------------------------------------------------------------------
// 3. WELLNESS PROGRAMS SERVICE
// ---------------------------------------------------------------------------
export async function fetchPublishedPrograms(): Promise<WellnessProgramDocument[]> {
  if (!db || !isFirebaseConfigured) return [];
  const path = 'wellnessPrograms';

  try {
    const q = query(collection(db, 'wellnessPrograms'), where('isPublished', '==', true));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as WellnessProgramDocument);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function createProgramRegimen(
  programData: Omit<WellnessProgramDocument, 'id' | 'createdAt'>
): Promise<string> {
  if (!db || !isFirebaseConfigured) throw new Error('Database not configured.');
  const id = `prog_${Date.now()}`;
  const path = `wellnessPrograms/${id}`;

  try {
    await setDoc(doc(db, 'wellnessPrograms', id), {
      ...programData,
      id,
      createdAt: new Date().toISOString(),
      createdAtServer: serverTimestamp(),
    });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    return id;
  }
}

// ---------------------------------------------------------------------------
// 4. EDUCATIONAL ARTICLES SERVICE
// ---------------------------------------------------------------------------
export async function fetchPublishedArticles(): Promise<EducationalArticleDocument[]> {
  if (!db || !isFirebaseConfigured) return [];
  const path = 'educationalArticles';

  try {
    const q = query(
      collection(db, 'educationalArticles'),
      where('status', '==', 'published')
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as EducationalArticleDocument);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

// ---------------------------------------------------------------------------
// 5. CONSULTATIONS SERVICE
// ---------------------------------------------------------------------------
export async function createConsultation(
  consultation: Omit<ConsultationDocument, 'id' | 'createdAt' | 'updatedAt' | 'status'>
): Promise<string> {
  if (!db || !isFirebaseConfigured) throw new Error('Database not configured.');
  const id = `consult_${Date.now()}`;
  const path = `consultations/${id}`;

  try {
    await setDoc(doc(db, 'consultations', id), {
      ...consultation,
      id,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdAtServer: serverTimestamp(),
    });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    return id;
  }
}

// ---------------------------------------------------------------------------
// 6. CONTENT APPROVALS SERVICE (ADMIN & PRACTITIONER)
// ---------------------------------------------------------------------------
export async function fetchPendingApprovals(): Promise<ContentApprovalDocument[]> {
  if (!db || !isFirebaseConfigured) return [];
  const path = 'contentApprovals';

  try {
    const q = query(collection(db, 'contentApprovals'), where('status', '==', 'Pending Review'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as ContentApprovalDocument);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function updateApprovalDecision(
  approvalId: string,
  status: 'Approved' | 'Revision Requested',
  adminId: string,
  reviewNotes: string
): Promise<void> {
  if (!db || !isFirebaseConfigured) return;
  const path = `contentApprovals/${approvalId}`;

  try {
    await updateDoc(doc(db, 'contentApprovals', approvalId), {
      status,
      reviewedByAdminId: adminId,
      reviewNotes,
      reviewedAt: new Date().toISOString(),
      reviewedAtServer: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// ---------------------------------------------------------------------------
// 7. LIMITED CLIENT PROFILES SERVICE (PRACTITIONER-FACING)
// ---------------------------------------------------------------------------
export async function fetchClientProfile(clientUid: string): Promise<ClientProfileDocument | null> {
  if (!db || !isFirebaseConfigured) return null;
  const path = `clientProfiles/${clientUid}`;

  try {
    const snap = await getDoc(doc(db, 'clientProfiles', clientUid));
    return snap.exists() ? (snap.data() as ClientProfileDocument) : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

export async function updatePractitionerClientNotes(
  clientUid: string,
  notes: string,
  status: 'Active' | 'Needs Review' | 'On Track'
): Promise<void> {
  if (!db || !isFirebaseConfigured) return;
  const path = `clientProfiles/${clientUid}`;

  try {
    await updateDoc(doc(db, 'clientProfiles', clientUid), {
      practitionerNotes: notes,
      status,
      lastCheckIn: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      updatedAtServer: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}
