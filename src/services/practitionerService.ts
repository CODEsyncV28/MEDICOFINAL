import { ClientRecord } from '../types';
import { ClientProfileDocument } from '../types/firebase';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { collection, doc, getDoc, getDocs, query, updateDoc, where } from 'firebase/firestore';

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
  practitionerId: string
): Promise<ClientRecord[]> {
  if (!practitionerId || !practitionerId.trim()) return [];

  if (isFirebaseConfigured && db) {
    try {
      const q = query(
        collection(db, 'clientProfiles'),
        where('assignedPractitionerId', '==', practitionerId)
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) =>
        mapDocumentToClientRecord(d.data() as ClientProfileDocument)
      );
    } catch (err) {
      console.warn('Error fetching practitioner clients from Cloud Firestore:', err);
    }
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
  fallbackClient?: Partial<ClientRecord>
): Promise<ClientRecord> {
  if (!userId || !userId.trim()) {
    throw new Error('Client identifier is required.');
  }
  if (!practitionerId || !practitionerId.trim()) {
    throw new Error('Practitioner identifier is required.');
  }

  const now = new Date().toISOString();

  // 1. Cloud Firestore branch
  if (isFirebaseConfigured && db) {
    try {
      const profileRef = doc(db, 'clientProfiles', userId);
      await updateDoc(profileRef, {
        practitionerNotes,
        status,
        lastCheckIn: 'Updated just now',
        updatedAt: now,
      });
    } catch (err) {
      console.warn('Error updating client notes in Cloud Firestore:', err);
    }
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
  practitionerId: string = 'prac-1'
): Promise<ClientProfileDocument | null> {
  if (!userId || !userId.trim()) return null;

  if (isFirebaseConfigured && db) {
    try {
      const snap = await getDoc(doc(db, 'clientProfiles', userId));
      if (snap.exists()) {
        const data = snap.data() as ClientProfileDocument;
        return data.assignedPractitionerId === practitionerId ? data : null;
      }
      return null;
    } catch (err) {
      console.warn('Error fetching client profile from Cloud Firestore:', err);
      return null;
    }
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
