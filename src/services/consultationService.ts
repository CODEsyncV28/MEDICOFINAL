import { ConsultationDocument, ConsultationStatus } from '../types/firebase';
import { db, isFirebaseConfigured } from '../lib/firebase';
import {
  Firestore,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';

function resolveActiveDb(firestoreOverride?: Firestore | null): Firestore | null {
  if (firestoreOverride) return firestoreOverride;
  return isFirebaseConfigured && db ? db : null;
}

const LOCAL_CONSULTATIONS_KEY = 'ayush_consultations_store';
const LOCAL_CONSULTATIONS_SEEDED_KEY = 'ayush_consultations_demo_seeded';
const memoryStore = new Map<string, string>();

export const CONSULTATION_TOPICS: { value: string; label: string }[] = [
  { value: 'circadian-routine', label: 'Circadian Routine & Sleep Hygiene (Dinacharya)' },
  { value: 'digestive-fire', label: 'Digestive Rhythm & Food Sensitivities (Agni)' },
  { value: 'postural-yoga', label: 'Postural Breathwork & Ergonomic Movement' },
  { value: 'seasonal-transition', label: 'Seasonal Diet & Herbal Tea Adjustment' },
  { value: 'general-review', label: 'Overall Lifestyle Assessment Review' },
];

export const PREFERRED_SLOTS: {
  value: 'morning' | 'afternoon' | 'evening';
  label: string;
}[] = [
  { value: 'morning', label: 'Morning (8-11 AM)' },
  { value: 'afternoon', label: 'Afternoon (1-4 PM)' },
  { value: 'evening', label: 'Evening (5-7 PM)' },
];

export function getConsultationTopicLabel(topic: string): string {
  const match = CONSULTATION_TOPICS.find((t) => t.value === topic);
  return match ? match.label : topic;
}

export function getPreferredSlotLabel(slot: 'morning' | 'afternoon' | 'evening'): string {
  const match = PREFERRED_SLOTS.find((s) => s.value === slot);
  return match ? match.label : slot;
}

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

export interface ConsultationInputValidation {
  isValid: boolean;
  errors: string[];
  message: string | null;
}

export function validateConsultationInput(input: {
  userId?: string;
  practitionerId?: string;
  topic?: string;
  preferredDate?: string;
  preferredSlot?: string;
}): ConsultationInputValidation {
  const errors: string[] = [];

  if (!input.userId || !input.userId.trim()) {
    errors.push('A seeker identifier is required.');
  }
  if (!input.practitionerId || !input.practitionerId.trim()) {
    errors.push('Please select a practitioner.');
  }
  if (!input.topic || !input.topic.trim()) {
    errors.push('Please choose a consultation focus area.');
  }
  if (!input.preferredDate || !input.preferredDate.trim()) {
    errors.push('Please select a preferred date.');
  } else {
    const parsed = new Date(`${input.preferredDate}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) {
      errors.push('Please select a valid preferred date.');
    }
  }
  if (
    input.preferredSlot !== 'morning' &&
    input.preferredSlot !== 'afternoon' &&
    input.preferredSlot !== 'evening'
  ) {
    errors.push('Please choose a preferred time window.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    message: errors.length > 0 ? errors[0] : null,
  };
}

/**
 * Explicitly seeds simulated demo consultation requests for demonstration mode
 * exactly once without overwriting real user-submitted records.
 */
export function seedDemoConsultations(): void {
  if (getStorageItem(LOCAL_CONSULTATIONS_SEEDED_KEY) === 'true') {
    return;
  }

  const store = getLocalData<ConsultationDocument>(LOCAL_CONSULTATIONS_KEY);
  const now = new Date().toISOString();
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const demoConsultations: ConsultationDocument[] = [
    {
      id: 'demo_consult_1',
      userId: 'demo_client_1',
      userName: 'Priya Sundaram',
      practitionerId: 'prac-1',
      practitionerName: 'Dr. Ananya Sharma',
      topic: 'circadian-routine',
      topicLabel: 'Circadian Sleep Restoration & Evening Wind-down (Dinacharya)',
      preferredDate: tomorrow,
      preferredSlot: 'morning',
      notes: 'Experiencing restless awakening around 3 AM. Warm milk with nutmeg helped slightly.',
      status: 'confirmed',
      scheduledTime: 'Tomorrow at 10:30 AM',
      practitionerNotes: 'Will review tongue observation and recommend evening Ashwagandha decoction.',
      isSimulated: true,
      createdAt: '2026-11-24T09:15:00.000Z',
      updatedAt: '2026-11-24T11:30:00.000Z',
    },
    {
      id: 'demo_consult_2',
      userId: 'demo_client_2',
      userName: 'Vikram Malhotra',
      practitionerId: 'prac-1',
      practitionerName: 'Dr. Ananya Sharma',
      topic: 'postural-yoga',
      topicLabel: 'Postural Spine Mobility & Ergonomics',
      preferredDate: tomorrow,
      preferredSlot: 'afternoon',
      notes: 'Upper cervical tightness after 6 hours of consecutive laptop work.',
      status: 'pending',
      scheduledTime: null,
      practitionerNotes: null,
      isSimulated: true,
      createdAt: '2026-11-24T13:20:00.000Z',
      updatedAt: now,
    },
    {
      id: 'demo_consult_3',
      userId: 'demo_client_3',
      userName: 'Farhan Qureshi',
      practitionerId: 'prac-1',
      practitionerName: 'Dr. Ananya Sharma',
      topic: 'digestive-fire',
      topicLabel: 'Metabolic Agni & Meal Interval Guidance',
      preferredDate: tomorrow,
      preferredSlot: 'evening',
      notes: 'Digestive heaviness when eating after 8 PM.',
      status: 'pending',
      scheduledTime: null,
      practitionerNotes: null,
      isSimulated: true,
      createdAt: '2026-11-24T16:45:00.000Z',
      updatedAt: now,
    },
  ];

  let changed = false;
  for (const item of demoConsultations) {
    if (!store[item.id]) {
      store[item.id] = item;
      changed = true;
    }
  }

  if (changed) {
    setLocalData(LOCAL_CONSULTATIONS_KEY, store);
  }
  setStorageItem(LOCAL_CONSULTATIONS_SEEDED_KEY, 'true');
}

export interface CreateConsultationInput {
  userId: string;
  userName: string;
  practitionerId: string;
  practitionerName: string;
  topic: string;
  preferredDate: string;
  preferredSlot: 'morning' | 'afternoon' | 'evening';
  notes?: string;
}

/**
 * Validates and creates a consultation request from a seeker to a verified practitioner,
 * persisting to Local Persistent Demo Storage (and Cloud Firestore when configured).
 */
export async function createConsultationRequest(
  input: CreateConsultationInput,
  firestoreOverride?: Firestore | null
): Promise<ConsultationDocument> {
  const validation = validateConsultationInput(input);
  if (!validation.isValid) {
    throw new Error(validation.message || 'Invalid consultation request details.');
  }

  const activeDb = resolveActiveDb(firestoreOverride);
  if (activeDb && input.practitionerId.trim() === 'prac-1') {
    throw new Error(
      'No verified practitioner account is available for live consultation scheduling.'
    );
  }

  const randomSuffix = Math.random().toString(36).slice(2, 7);
  const id = `consult_${Date.now()}_${randomSuffix}`;
  const now = new Date().toISOString();

  const docData: ConsultationDocument = {
    id,
    userId: input.userId.trim(),
    userName: input.userName.trim() || 'Wellness Seeker',
    practitionerId: input.practitionerId.trim(),
    practitionerName: input.practitionerName.trim(),
    topic: input.topic.trim(),
    topicLabel: getConsultationTopicLabel(input.topic.trim()),
    preferredDate: input.preferredDate.trim(),
    preferredSlot: input.preferredSlot,
    notes: input.notes?.trim() || '',
    status: 'pending',
    scheduledTime: null,
    practitionerNotes: null,
    isSimulated: false,
    createdAt: now,
    updatedAt: now,
  };

  if (activeDb) {
    await setDoc(doc(activeDb, 'consultations', id), docData);
    const store = getLocalData<ConsultationDocument>(LOCAL_CONSULTATIONS_KEY);
    store[id] = docData;
    setLocalData(LOCAL_CONSULTATIONS_KEY, store);
    return docData;
  }

  const store = getLocalData<ConsultationDocument>(LOCAL_CONSULTATIONS_KEY);
  store[id] = docData;
  setLocalData(LOCAL_CONSULTATIONS_KEY, store);
  return docData;
}

function sortNewestFirst(records: ConsultationDocument[]): ConsultationDocument[] {
  return [...records].sort((a, b) => {
    const tA = new Date(a.createdAt).getTime();
    const tB = new Date(b.createdAt).getTime();
    return tB - tA;
  });
}

/**
 * Fetches consultation requests belonging exclusively to a specific seeker UID.
 */
export async function fetchConsultationsForUser(
  userId: string,
  firestoreOverride?: Firestore | null
): Promise<ConsultationDocument[]> {
  if (!userId || !userId.trim()) return [];

  const activeDb = resolveActiveDb(firestoreOverride);
  if (activeDb) {
    const q = query(collection(activeDb, 'consultations'), where('userId', '==', userId));
    const snap = await getDocs(q);
    return sortNewestFirst(snap.docs.map((d) => d.data() as ConsultationDocument));
  }

  const store = getLocalData<ConsultationDocument>(LOCAL_CONSULTATIONS_KEY);
  return sortNewestFirst(
    Object.values(store).filter((record) => record.userId === userId)
  );
}

/**
 * Fetches consultation requests addressed exclusively to a specific practitioner ID.
 */
export async function fetchConsultationsForPractitioner(
  practitionerId: string,
  firestoreOverride?: Firestore | null
): Promise<ConsultationDocument[]> {
  if (!practitionerId || !practitionerId.trim()) return [];

  const activeDb = resolveActiveDb(firestoreOverride);
  if (activeDb) {
    if (practitionerId.trim() === 'prac-1') {
      return [];
    }
    const q = query(
      collection(activeDb, 'consultations'),
      where('practitionerId', '==', practitionerId)
    );
    const snap = await getDocs(q);
    return sortNewestFirst(snap.docs.map((d) => d.data() as ConsultationDocument));
  }

  const store = getLocalData<ConsultationDocument>(LOCAL_CONSULTATIONS_KEY);
  return sortNewestFirst(
    Object.values(store).filter((record) => record.practitionerId === practitionerId)
  );
}

export interface UpdateConsultationStatusPayload {
  status: ConsultationStatus;
  practitionerId?: string;
  scheduledTime?: string | null;
  practitionerNotes?: string | null;
}

export const TERMINAL_CONSULTATION_STATUSES: ConsultationStatus[] = [
  'rejected',
  'completed',
  'cancelled',
];

export function isValidPractitionerConsultationTransition(
  fromStatus: ConsultationStatus,
  toStatus: ConsultationStatus
): boolean {
  if (TERMINAL_CONSULTATION_STATUSES.includes(fromStatus)) {
    return false;
  }
  if (fromStatus === 'pending') {
    return (
      toStatus === 'confirmed' ||
      toStatus === 'rescheduled' ||
      toStatus === 'rejected' ||
      toStatus === 'cancelled'
    );
  }
  if (fromStatus === 'confirmed' || fromStatus === 'rescheduled') {
    return (
      toStatus === 'confirmed' ||
      toStatus === 'rescheduled' ||
      toStatus === 'completed' ||
      toStatus === 'cancelled'
    );
  }
  return false;
}

/**
 * Updates a consultation request status (confirmed, rescheduled, rejected, completed, cancelled)
 * along with optional scheduled appointment slot and practitioner review notes.
 */
export async function updateConsultationStatus(
  consultationId: string,
  payload: UpdateConsultationStatusPayload,
  firestoreOverride?: Firestore | null
): Promise<ConsultationDocument> {
  if (!consultationId || !consultationId.trim()) {
    throw new Error('Consultation ID is required.');
  }

  if (
    (payload.status === 'confirmed' || payload.status === 'rescheduled') &&
    (!payload.scheduledTime || !payload.scheduledTime.trim())
  ) {
    throw new Error('Please specify a scheduled appointment date and time.');
  }

  const now = new Date().toISOString();
  const activeDb = resolveActiveDb(firestoreOverride);
  const store = getLocalData<ConsultationDocument>(LOCAL_CONSULTATIONS_KEY);

  if (activeDb) {
    const consultRef = doc(activeDb, 'consultations', consultationId);
    const snap = await getDoc(consultRef);
    if (!snap.exists()) {
      throw new Error(`Consultation request "${consultationId}" was not found in Cloud Firestore.`);
    }

    const existing = snap.data() as ConsultationDocument;
    if (payload.practitionerId && existing.practitionerId !== payload.practitionerId) {
      throw new Error('Unauthorized: This consultation belongs to a different practitioner.');
    }
    if (!isValidPractitionerConsultationTransition(existing.status, payload.status)) {
      throw new Error(
        `Invalid consultation transition: cannot change status from "${existing.status}" to "${payload.status}".`
      );
    }

    const nextScheduledTime =
      payload.status === 'rejected' || payload.status === 'cancelled'
        ? null
        : payload.scheduledTime !== undefined
        ? payload.scheduledTime?.trim() || null
        : existing.scheduledTime ?? null;
    const nextPractitionerNotes =
      payload.practitionerNotes !== undefined
        ? payload.practitionerNotes?.trim() || null
        : existing.practitionerNotes ?? null;

    const updatePayload: Record<string, unknown> = {
      status: payload.status,
      scheduledTime: nextScheduledTime,
      updatedAt: now,
    };
    if (payload.practitionerNotes !== undefined) {
      updatePayload.practitionerNotes = nextPractitionerNotes;
    }

    await updateDoc(consultRef, updatePayload);

    const updated: ConsultationDocument = {
      ...existing,
      status: payload.status,
      scheduledTime: nextScheduledTime,
      practitionerNotes: nextPractitionerNotes,
      updatedAt: now,
    };

    store[consultationId] = updated;
    setLocalData(LOCAL_CONSULTATIONS_KEY, store);
    return updated;
  }

  // Demo Mode (Local Persistent Demo Storage)
  const existing = store[consultationId];
  if (!existing) {
    throw new Error(`Consultation request "${consultationId}" was not found.`);
  }

  if (payload.practitionerId && existing.practitionerId !== payload.practitionerId) {
    throw new Error('Unauthorized: This consultation belongs to a different practitioner.');
  }
  if (!isValidPractitionerConsultationTransition(existing.status, payload.status)) {
    throw new Error(
      `Invalid consultation transition: cannot change status from "${existing.status}" to "${payload.status}".`
    );
  }

  const updated: ConsultationDocument = {
    ...existing,
    status: payload.status,
    scheduledTime:
      payload.status === 'rejected' || payload.status === 'cancelled'
        ? null
        : payload.scheduledTime !== undefined
        ? payload.scheduledTime?.trim() || null
        : existing.scheduledTime ?? null,
    practitionerNotes:
      payload.practitionerNotes !== undefined
        ? payload.practitionerNotes?.trim() || null
        : existing.practitionerNotes ?? null,
    updatedAt: now,
  };

  store[consultationId] = updated;
  setLocalData(LOCAL_CONSULTATIONS_KEY, store);
  return updated;
}

/**
 * Convenience wrapper for confirming a consultation request and setting scheduled time.
 */
export async function confirmConsultation(
  consultationId: string,
  scheduledTime: string,
  practitionerNotes?: string,
  practitionerId?: string,
  firestoreOverride?: Firestore | null
): Promise<ConsultationDocument> {
  return updateConsultationStatus(
    consultationId,
    {
      status: 'confirmed',
      practitionerId,
      scheduledTime,
      practitionerNotes: practitionerNotes ?? null,
    },
    firestoreOverride
  );
}
