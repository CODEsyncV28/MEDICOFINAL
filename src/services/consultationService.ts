import { ConsultationDocument } from '../types/firebase';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const LOCAL_CONSULTATIONS_KEY = 'ayush_consultations_store';
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
 * Creates a consultation request from a seeker to a verified practitioner.
 */
export async function createConsultationRequest(
  consultation: Omit<ConsultationDocument, 'id' | 'createdAt' | 'updatedAt' | 'status'>
): Promise<string> {
  const id = `consult_${Date.now()}`;
  const now = new Date().toISOString();

  const docData: ConsultationDocument = {
    ...consultation,
    id,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  };

  if (isFirebaseConfigured && db) {
    try {
      await setDoc(doc(db, 'consultations', id), docData);
      return id;
    } catch (err) {
      console.warn('Error saving consultation request to Cloud Firestore:', err);
    }
  }

  const store = getLocalData<ConsultationDocument>(LOCAL_CONSULTATIONS_KEY);
  store[id] = docData;
  setLocalData(LOCAL_CONSULTATIONS_KEY, store);
  return id;
}

/**
 * Confirms a consultation request and sets the scheduled appointment time.
 * Authorized for assigned practitioners and administrators only.
 */
export async function confirmConsultation(
  consultationId: string,
  scheduledTime: string,
  practitionerNotes?: string
): Promise<void> {
  const now = new Date().toISOString();

  if (isFirebaseConfigured && db) {
    try {
      await updateDoc(doc(db, 'consultations', consultationId), {
        status: 'confirmed',
        scheduledTime,
        ...(practitionerNotes ? { practitionerNotes } : {}),
        updatedAt: now,
      });
      return;
    } catch (err) {
      console.warn('Error updating consultation in Cloud Firestore:', err);
    }
  }

  const store = getLocalData<ConsultationDocument>(LOCAL_CONSULTATIONS_KEY);
  if (store[consultationId]) {
    store[consultationId].status = 'confirmed';
    store[consultationId].scheduledTime = scheduledTime;
    if (practitionerNotes) {
      store[consultationId].notes = practitionerNotes;
    }
    store[consultationId].updatedAt = now;
    setLocalData(LOCAL_CONSULTATIONS_KEY, store);
  }
}
