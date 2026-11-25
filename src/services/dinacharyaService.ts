import { DailyActivity } from '../types';
import { DailyActivityDocument } from '../types/firebase';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';

export const GUEST_DINACHARYA_USER_ID = 'guest_seeker';

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

function deduplicateActivityRecords(records: DailyActivityDocument[]): DailyActivityDocument[] {
  const byActivityKey = new Map<string, DailyActivityDocument>();
  for (const record of records) {
    const key = `${record.userId}::${record.dateString}::${record.activityKey}`;
    const existing = byActivityKey.get(key);
    if (!existing) {
      byActivityKey.set(key, record);
      continue;
    }
    const canonicalId = `${record.userId}_${record.dateString}_${record.activityKey}`;
    if (record.id === canonicalId && existing.id !== canonicalId) {
      byActivityKey.set(key, record);
    } else if ((record.completedAt || '') >= (existing.completedAt || '')) {
      byActivityKey.set(key, record);
    }
  }
  return Array.from(byActivityKey.values());
}

/**
 * Toggles a daily activity check-in status for a user (or isolated guest UID) on a given date.
 * Ensures a single canonical record per (userId, dateString, activityKey) without duplicates.
 */
export async function toggleActivityStatus(
  userId: string,
  activityKey: string,
  dateString: string,
  completed: boolean
): Promise<void> {
  const docId = `${userId}_${dateString}_${activityKey}`;
  const isGuestUser = userId === GUEST_DINACHARYA_USER_ID;

  // 1. Cloud Firestore branch (authenticated users only)
  if (isFirebaseConfigured && db && !isGuestUser) {
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
        },
        { merge: true }
      );
      return;
    } catch (error) {
      console.warn('Error saving daily activity to Cloud Firestore:', error);
    }
  }

  // 2. Local Demo Storage branch (isolated by userId, deduplicated by canonical docId)
  const store = getLocalData<DailyActivityDocument>(LOCAL_ACTIVITIES_KEY);
  for (const existingKey of Object.keys(store)) {
    const entry = store[existingKey];
    if (
      entry &&
      existingKey !== docId &&
      entry.userId === userId &&
      entry.dateString === dateString &&
      entry.activityKey === activityKey
    ) {
      delete store[existingKey];
    }
  }

  store[docId] = {
    id: docId,
    userId,
    activityKey,
    dateString,
    completed,
    completedAt: completed ? new Date().toISOString() : null,
  };
  setLocalData(LOCAL_ACTIVITIES_KEY, store);
}

/**
 * Retrieves deduplicated daily activities recorded for a user (or isolated guest UID) on a given date.
 */
export async function fetchDailyActivitiesForDate(
  userId: string,
  dateString: string
): Promise<DailyActivityDocument[]> {
  const isGuestUser = userId === GUEST_DINACHARYA_USER_ID;

  // 1. Cloud Firestore branch (authenticated users only)
  if (isFirebaseConfigured && db && !isGuestUser) {
    try {
      const actsRef = collection(db, 'dailyActivities');
      const q = query(actsRef, where('userId', '==', userId), where('dateString', '==', dateString));
      const snap = await getDocs(q);
      return deduplicateActivityRecords(snap.docs.map((d) => d.data() as DailyActivityDocument));
    } catch (error) {
      console.warn('Error fetching daily activities from Cloud Firestore:', error);
    }
  }

  // 2. Local Demo Storage branch
  const store = getLocalData<DailyActivityDocument>(LOCAL_ACTIVITIES_KEY);
  const filtered = Object.values(store).filter(
    (act) => act.userId === userId && act.dateString === dateString
  );
  return deduplicateActivityRecords(filtered);
}

/**
 * Merges stored completion docs onto the base daily activity template without duplicating items.
 * - For authenticated users (`useDefaultCompletionForMissing = false`), unrecorded items default to false.
 * - For guest preview (`useDefaultCompletionForMissing = true`), unrecorded items keep the template's initial demo completion.
 */
export function mergeDailyActivitiesWithRecords(
  baseActivities: DailyActivity[],
  recordedDocs: DailyActivityDocument[],
  useDefaultCompletionForMissing: boolean
): DailyActivity[] {
  const seenIds = new Set<string>();
  const dedupedRecords = deduplicateActivityRecords(recordedDocs);
  const result: DailyActivity[] = [];

  for (const act of baseActivities) {
    if (seenIds.has(act.id)) continue;
    seenIds.add(act.id);
    const recorded = dedupedRecords.find((d) => d.activityKey === act.id);
    result.push({
      ...act,
      completed: recorded
        ? Boolean(recorded.completed)
        : useDefaultCompletionForMissing
        ? Boolean(act.completed)
        : false,
    });
  }

  return result;
}

/**
 * Calculates habit adherence percentage.
 */
export function calculateAdherence(activities: DailyActivity[]): number {
  if (!activities || activities.length === 0) return 0;
  const completed = activities.filter((a) => a.completed).length;
  return Math.round((completed / activities.length) * 100);
}
