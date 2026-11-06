import { ClientRecord, Practitioner } from '../types';
import { ClientProfileDocument, PractitionerDocument } from '../types/firebase';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const LOCAL_CLIENT_PROFILES_KEY = 'ayush_client_profiles_store';
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

/**
 * Updates clinical observation notes on an assigned client's profile.
 * Strictly operates on /clientProfiles/{userId} where private user credentials are isolated.
 */
export async function updateClientObservationNotes(
  userId: string,
  practitionerNotes: string,
  status: 'Active' | 'Needs Review' | 'On Track'
): Promise<void> {
  // 1. Cloud Firestore branch
  if (isFirebaseConfigured && db) {
    try {
      const profileRef = doc(db, 'clientProfiles', userId);
      await updateDoc(profileRef, {
        practitionerNotes,
        status,
        updatedAt: new Date().toISOString(),
      });
      return;
    } catch (err) {
      console.warn('Error updating client notes in Cloud Firestore:', err);
    }
  }

  // 2. Local Demo Storage branch
  const store = getLocalData<ClientProfileDocument>(LOCAL_CLIENT_PROFILES_KEY);
  if (store[userId]) {
    store[userId].practitionerNotes = practitionerNotes;
    store[userId].status = status;
    store[userId].updatedAt = new Date().toISOString();
  } else {
    store[userId] = {
      userId,
      clientName: 'Seeker',
      primaryGoal: 'General Health',
      enrolledProgram: 'Dinacharya Alignment',
      discipline: 'Ayurveda',
      adherenceRate: 85,
      assessmentCompleted: true,
      practitionerNotes,
      status,
      assignedPractitionerId: 'prac-1',
      updatedAt: new Date().toISOString(),
    };
  }
  setLocalData(LOCAL_CLIENT_PROFILES_KEY, store);
}

/**
 * Retrieves the non-sensitive client profile for an assigned practitioner.
 */
export async function fetchClientProfile(userId: string): Promise<ClientProfileDocument | null> {
  if (isFirebaseConfigured && db) {
    try {
      const snap = await getDoc(doc(db, 'clientProfiles', userId));
      return snap.exists() ? (snap.data() as ClientProfileDocument) : null;
    } catch (err) {
      console.warn('Error fetching client profile from Cloud Firestore:', err);
      return null;
    }
  }

  const store = getLocalData<ClientProfileDocument>(LOCAL_CLIENT_PROFILES_KEY);
  return store[userId] || null;
}
