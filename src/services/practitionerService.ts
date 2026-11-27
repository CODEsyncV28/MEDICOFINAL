import { ClientRecord } from '../types';
import { ClientProfileDocument, PractitionerDocument } from '../types/firebase';
import { db, isFirebaseConfigured } from '../lib/firebase';
import {
  Firestore,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';

function resolveActiveDb(
  firestoreOverride?: Firestore | null,
  useDemoStorage: boolean = false
): Firestore | null {
  if (useDemoStorage) return null;
  if (firestoreOverride) return firestoreOverride;
  return isFirebaseConfigured && db ? db : null;
}

const LOCAL_CLIENT_PROFILES_KEY = 'ayush_client_profiles_store';
const LOCAL_CLIENT_SEEDED_PREFIX = 'ayush_client_profiles_seeded_';
const memoryStore = new Map<string, string>();

function getStorageItem(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
    return memoryStore.get(key) ?? null;
  } catch {
    return memoryStore.get(key) ?? null;
  }
}

function setStorageItem(key: string, val: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, val);
    }
    memoryStore.set(key, val);
  } catch {
    memoryStore.set(key, val);
  }
}

function getLocalData<T>(key: string): Record<string, T> {
  try {
    const raw = getStorageItem(key);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function setLocalData<T>(key: string, data: Record<string, T>): void {
  setStorageItem(key, JSON.stringify(data));
}

function makeCompositeKey(practitionerId: string, userId: string): string {
  return `${practitionerId}::${userId}`;
}

function mapDocumentToClientRecord(docData: ClientProfileDocument): ClientRecord {
  return {
    id: docData.userId,
    name: docData.clientName,
    age: docData.age ?? 32,
    gender: docData.gender ?? 'Unspecified',
    primaryGoal: docData.primaryGoal,
    enrolledProgram: docData.enrolledProgram,
    discipline: docData.discipline,
    adherenceRate: docData.adherenceRate,
    assessmentCompleted: docData.assessmentCompleted,
    lastCheckIn: docData.lastCheckIn || 'Today',
    practitionerNotes: docData.practitionerNotes || '',
    status: docData.status,
    assignedPractitionerId: docData.assignedPractitionerId,
    isSimulated: docData.isSimulated,
    updatedAt: docData.updatedAt,
  };
}

/**
 * Seeds synthetic demo client profiles for a given practitioner once
 * so they appear clearly marked as demo records and preserve edits persistently.
 */
export function seedDemoClientProfiles(
  practitionerId: string,
  initialClients: ClientRecord[]
): void {
  if (!practitionerId || !practitionerId.trim()) return;
  const seededKey = `${LOCAL_CLIENT_SEEDED_PREFIX}${practitionerId}`;
  if (getStorageItem(seededKey) === 'true') {
    return;
  }

  const store = getLocalData<ClientProfileDocument>(LOCAL_CLIENT_PROFILES_KEY);
  let changed = false;

  for (const client of initialClients) {
    const compositeKey = makeCompositeKey(practitionerId, client.id);
    if (!store[compositeKey]) {
      store[compositeKey] = {
        userId: client.id,
        clientName: client.name,
        age: client.age,
        gender: client.gender,
        primaryGoal: client.primaryGoal,
        enrolledProgram: client.enrolledProgram,
        discipline: client.discipline,
        adherenceRate: client.adherenceRate,
        assessmentCompleted: client.assessmentCompleted,
        lastCheckIn: client.lastCheckIn,
        practitionerNotes: client.practitionerNotes,
        status: client.status,
        assignedPractitionerId: practitionerId,
        isSimulated: client.isSimulated ?? true,
        updatedAt: client.updatedAt || new Date().toISOString(),
      };
      changed = true;
    }
  }

  if (changed) {
    setLocalData(LOCAL_CLIENT_PROFILES_KEY, store);
  }
  setStorageItem(seededKey, 'true');
}

/**
 * Fetches assigned client records strictly scoped to the specified practitionerId.
 * Prevents one practitioner's notes or records from leaking into another practitioner's portal.
 */
export async function fetchClientsForPractitioner(
  practitionerId: string,
  firestoreOverride?: Firestore | null,
  useDemoStorage: boolean = false
): Promise<ClientRecord[]> {
  if (!practitionerId || !practitionerId.trim()) return [];

  const activeDb = resolveActiveDb(firestoreOverride, useDemoStorage);
  if (activeDb) {
    if (practitionerId.trim() === 'prac-1') {
      return [];
    }
    const q = query(
      collection(activeDb, 'clientProfiles'),
      where('assignedPractitionerId', '==', practitionerId)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) =>
      mapDocumentToClientRecord(d.data() as ClientProfileDocument)
    );
  }

  const store = getLocalData<ClientProfileDocument>(LOCAL_CLIENT_PROFILES_KEY);
  const seenUserIds = new Set<string>();
  const results: ClientRecord[] = [];

  for (const docItem of Object.values(store)) {
    if (
      docItem.assignedPractitionerId === practitionerId &&
      !seenUserIds.has(docItem.userId)
    ) {
      seenUserIds.add(docItem.userId);
      results.push(mapDocumentToClientRecord(docItem));
    }
  }

  return results;
}

/**
 * Updates clinical observation notes on an assigned client's profile,
 * strictly isolated under (practitionerId, userId).
 */
export async function updateClientObservationNotes(
  userId: string,
  practitionerNotes: string,
  status: 'Active' | 'Needs Review' | 'On Track',
  practitionerId: string = 'prac-1',
  fallbackClient?: Partial<ClientRecord>,
  firestoreOverride?: Firestore | null,
  useDemoStorage: boolean = false
): Promise<ClientRecord> {
  if (!userId || !userId.trim()) {
    throw new Error('Client identifier is required.');
  }
  if (!practitionerId || !practitionerId.trim()) {
    throw new Error('Practitioner identifier is required.');
  }

  const now = new Date().toISOString();
  const activeDb = resolveActiveDb(firestoreOverride, useDemoStorage);

  // 1. Cloud Firestore branch (authoritative in live mode)
  if (activeDb) {
    if (practitionerId.trim() === 'prac-1') {
      throw new Error(
        'Live Firebase mode requires an authenticated practitioner UID instead of demo ID prac-1.'
      );
    }
    const profileRef = doc(activeDb, 'clientProfiles', userId);
    const snap = await getDoc(profileRef);
    if (!snap.exists()) {
      throw new Error(`Client profile "${userId}" was not found in Cloud Firestore.`);
    }
    const existingRemote = snap.data() as ClientProfileDocument;
    if (existingRemote.assignedPractitionerId !== practitionerId) {
      throw new Error('Unauthorized: This client is not assigned to your practitioner account.');
    }

    await updateDoc(profileRef, {
      practitionerNotes,
      status,
      lastCheckIn: 'Updated just now',
      updatedAt: now,
    });

    const updatedRemote: ClientProfileDocument = {
      ...existingRemote,
      practitionerNotes,
      status,
      lastCheckIn: 'Updated just now',
      updatedAt: now,
    };

    const store = getLocalData<ClientProfileDocument>(LOCAL_CLIENT_PROFILES_KEY);
    store[makeCompositeKey(practitionerId, userId)] = updatedRemote;
    setLocalData(LOCAL_CLIENT_PROFILES_KEY, store);

    return mapDocumentToClientRecord(updatedRemote);
  }

  // 2. Local Demo Storage branch (strictly scoped per practitionerId + userId)
  const store = getLocalData<ClientProfileDocument>(LOCAL_CLIENT_PROFILES_KEY);
  const compositeKey = makeCompositeKey(practitionerId, userId);
  const existing = store[compositeKey];

  const updatedDoc: ClientProfileDocument = existing
    ? {
        ...existing,
        practitionerNotes,
        status,
        lastCheckIn: 'Updated just now',
        updatedAt: now,
      }
    : {
        userId,
        clientName: fallbackClient?.name || 'Seeker',
        age: fallbackClient?.age ?? 32,
        gender: fallbackClient?.gender ?? 'Unspecified',
        primaryGoal: fallbackClient?.primaryGoal || 'General Health',
        enrolledProgram: fallbackClient?.enrolledProgram || 'Dinacharya Alignment',
        discipline: fallbackClient?.discipline || 'Ayurveda',
        adherenceRate: fallbackClient?.adherenceRate ?? 85,
        assessmentCompleted: fallbackClient?.assessmentCompleted ?? true,
        lastCheckIn: 'Updated just now',
        practitionerNotes,
        status,
        assignedPractitionerId: practitionerId,
        isSimulated: fallbackClient?.isSimulated ?? false,
        updatedAt: now,
      };

  store[compositeKey] = updatedDoc;
  setLocalData(LOCAL_CLIENT_PROFILES_KEY, store);

  return mapDocumentToClientRecord(updatedDoc);
}

/**
 * Retrieves the non-sensitive client profile for an assigned practitioner.
 */
export async function fetchClientProfile(
  userId: string,
  practitionerId: string = 'prac-1',
  firestoreOverride?: Firestore | null,
  useDemoStorage: boolean = false
): Promise<ClientProfileDocument | null> {
  if (!userId || !userId.trim()) return null;

  const activeDb = resolveActiveDb(firestoreOverride, useDemoStorage);
  if (activeDb) {
    if (practitionerId.trim() === 'prac-1') {
      return null;
    }
    const snap = await getDoc(doc(activeDb, 'clientProfiles', userId));
    if (snap.exists()) {
      const data = snap.data() as ClientProfileDocument;
      return data.assignedPractitionerId === practitionerId ? data : null;
    }
    return null;
  }

  const store = getLocalData<ClientProfileDocument>(LOCAL_CLIENT_PROFILES_KEY);
  const compositeKey = makeCompositeKey(practitionerId, userId);
  if (store[compositeKey]) {
    return store[compositeKey];
  }
  const legacyDoc = store[userId];
  if (legacyDoc && legacyDoc.assignedPractitionerId === practitionerId) {
    return legacyDoc;
  }
  return null;
}

/**
 * Fetches verified AYUSH practitioner profiles from Cloud Firestore (/practitioners)
 * so seekers resolve verified practitioner Auth UIDs (`userId`) for consultations.
 * Strictly excludes unverified profiles and static demo ID `prac-1` as an Auth UID.
 */
export async function fetchVerifiedPractitioners(
  firestoreOverride?: Firestore | null
): Promise<PractitionerDocument[]> {
  const activeDb = resolveActiveDb(firestoreOverride);
  if (!activeDb) return [];

  const q = query(collection(activeDb, 'practitioners'), where('isVerified', '==', true));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => d.data() as PractitionerDocument)
    .filter(
      (docItem) =>
        docItem.isVerified === true &&
        Boolean(docItem.userId?.trim()) &&
        docItem.userId.trim() !== 'prac-1'
    );
}

export interface AssignedClientWellnessSnapshot {
  constitutionTendency: string | null;
  circadianBalanceCategory: string | null;
  digestiveAgniCategory: string | null;
  movementCategory: string | null;
  stressCategory: string | null;
  latestVersion: number | null;
  completedAt: string | null;
  planTitle: string | null;
  planPrimaryFocus: string | null;
  planSummary: string | null;
}

/**
 * Fetches permitted assessment and active wellness plan summary for an assigned client
 * using deterministic document IDs (`assess_{uid}` and `plan_{uid}_v{version}`),
 * matching `allow get` in firestore.rules (`isAssignedPractitioner(resource.data.userId)`).
 */
export async function fetchAssignedClientWellnessSnapshot(
  clientUid: string,
  firestoreOverride?: Firestore | null
): Promise<AssignedClientWellnessSnapshot | null> {
  if (!clientUid?.trim()) return null;

  const activeDb = resolveActiveDb(firestoreOverride);
  if (!activeDb) {
    return null;
  }

  try {
    const assessSnap = await getDoc(doc(activeDb, 'assessments', `assess_${clientUid}`));
    if (!assessSnap.exists()) {
      return null;
    }

    const assessData = assessSnap.data() as {
      latestVersion?: number;
      constitutionTendency?: string;
      circadianBalanceCategory?: string;
      digestiveAgniCategory?: string;
      movementCategory?: string;
      stressCategory?: string;
      completedAt?: string;
    };

    const latestVersion =
      typeof assessData.latestVersion === 'number' ? assessData.latestVersion : null;

    let planTitle: string | null = null;
    let planPrimaryFocus: string | null = null;
    let planSummary: string | null = null;

    if (latestVersion !== null && latestVersion >= 1) {
      try {
        const planSnap = await getDoc(
          doc(activeDb, 'wellnessPlans', `plan_${clientUid}_v${latestVersion}`)
        );
        if (planSnap.exists()) {
          const planData = planSnap.data() as {
            title?: string;
            primaryFocus?: string;
            summary?: string;
          };
          planTitle = planData.title || null;
          planPrimaryFocus = planData.primaryFocus || null;
          planSummary = planData.summary || null;
        }
      } catch {
        // Plan may not exist yet or not be readable
      }
    }

    return {
      constitutionTendency: assessData.constitutionTendency || null,
      circadianBalanceCategory: assessData.circadianBalanceCategory || null,
      digestiveAgniCategory: assessData.digestiveAgniCategory || null,
      movementCategory: assessData.movementCategory || null,
      stressCategory: assessData.stressCategory || null,
      latestVersion,
      completedAt: assessData.completedAt || null,
      planTitle,
      planPrimaryFocus,
      planSummary,
    };
  } catch (err: any) {
    // Firestore denies `get` on non-existent docs when rules read `resource.data.userId`
    if (err?.code === 'permission-denied' || err?.code === 'not-found') {
      return null;
    }
    throw err;
  }
}

/**
 * Reads `/clientProfiles/{userId}.assignedPractitionerId` for the signed-in seeker.
 * Returns `null` if no clientProfile exists yet or no verified Auth UID is assigned.
 */
export async function fetchSeekerAssignedPractitionerId(
  userUid: string,
  firestoreOverride?: Firestore | null
): Promise<string | null> {
  if (!userUid?.trim()) return null;
  const activeDb = resolveActiveDb(firestoreOverride);
  if (!activeDb) return null;

  try {
    const snap = await getDoc(doc(activeDb, 'clientProfiles', userUid.trim()));
    if (!snap.exists()) return null;
    const data = snap.data() as ClientProfileDocument;
    const assigned = data.assignedPractitionerId?.trim();
    if (!assigned || assigned === 'prac-1') return null;
    return assigned;
  } catch (err: any) {
    if (err?.code === 'permission-denied' || err?.code === 'not-found') {
      return null;
    }
    throw err;
  }
}

const LOCAL_PRACTITIONER_SETTINGS_KEY = 'ayush_practitioner_settings_v1';

export interface PractitionerConsultationSettingsInput {
  practitionerId: string;
  consultationFee: number | null;
  consultationCurrency: string;
  consultationFormat: 'online' | 'in_person' | 'both' | null;
  location: string | null;
  languages: string[];
  nextAvailableSlot: string;
  bio: string;
}

export function getDemoPractitionerSettingsOverride(
  practitionerId: string
): Partial<PractitionerConsultationSettingsInput> | null {
  const store = getLocalData<Partial<PractitionerConsultationSettingsInput>>(
    LOCAL_PRACTITIONER_SETTINGS_KEY
  );
  return store[practitionerId] || null;
}

/**
 * Updates verified practitioner consultation charges, format, location, languages,
 * and availability slot in Cloud Firestore (/practitioners/{practitionerId}) or local demo store.
 */
export async function updatePractitionerConsultationSettings(
  input: PractitionerConsultationSettingsInput,
  firestoreOverride?: Firestore | null,
  useDemoStorage: boolean = false
): Promise<void> {
  const pracId = input.practitionerId?.trim();
  if (!pracId) {
    throw new Error('Practitioner identifier is required.');
  }
  if (
    input.consultationFee !== null &&
    (!Number.isFinite(input.consultationFee) ||
      input.consultationFee < 0 ||
      input.consultationFee > 100000)
  ) {
    throw new Error('Consultation fee must be a valid amount between 0 and 100,000.');
  }

  const now = new Date().toISOString();
  const payload = {
    consultationFee: input.consultationFee,
    consultationCurrency: (input.consultationCurrency || 'INR').trim().toUpperCase(),
    consultationFormat: input.consultationFormat,
    location: input.location?.trim() || null,
    languages: input.languages.map((l) => l.trim()).filter(Boolean).slice(0, 12),
    nextAvailableSlot: input.nextAvailableSlot.trim(),
    bio: input.bio.trim(),
    updatedAt: now,
  };

  const activeDb = resolveActiveDb(firestoreOverride, useDemoStorage);
  if (activeDb && pracId !== 'prac-1') {
    const q = query(collection(activeDb, 'practitioners'), where('userId', '==', pracId));
    const snap = await getDocs(q);
    if (!snap.empty) {
      await updateDoc(snap.docs[0].ref, payload);
    } else {
      await updateDoc(doc(activeDb, 'practitioners', pracId), payload);
    }
  }

  const store = getLocalData<Partial<PractitionerConsultationSettingsInput>>(
    LOCAL_PRACTITIONER_SETTINGS_KEY
  );
  store[pracId] = payload;
  setLocalData(LOCAL_PRACTITIONER_SETTINGS_KEY, store);
}

