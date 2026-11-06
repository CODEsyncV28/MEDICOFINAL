import { DailyActivity } from '../types';
import { DailyActivityDocument } from '../types/firebase';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';

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

/**
 * Toggles a daily activity check-in status for a user on a given date.
 */
export async function toggleActivityStatus(
  userId: string,
  activityKey: string,
  dateString: string,
  completed: boolean
): Promise<void> {
  const docId = `${userId}_${dateString}_${activityKey}`;

  // 1. Cloud Firestore branch
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
        },
        { merge: true }
      );
      return;
    } catch (error) {
      console.warn('Error saving daily activity to Cloud Firestore:', error);
    }
  }

  // 2. Local Demo Storage branch
  const store = getLocalData<DailyActivityDocument>(LOCAL_ACTIVITIES_KEY);
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
 * Retrieves daily activities recorded for a user on a given date.
 */
export async function fetchDailyActivitiesForDate(
  userId: string,
  dateString: string
): Promise<DailyActivityDocument[]> {
  // 1. Cloud Firestore branch
  if (isFirebaseConfigured && db) {
    try {
      const actsRef = collection(db, 'dailyActivities');
      const q = query(actsRef, where('userId', '==', userId), where('dateString', '==', dateString));
      const snap = await getDocs(q);
      return snap.docs.map((d) => d.data() as DailyActivityDocument);
    } catch (error) {
      console.warn('Error fetching daily activities from Cloud Firestore:', error);
    }
  }

  // 2. Local Demo Storage branch
  const store = getLocalData<DailyActivityDocument>(LOCAL_ACTIVITIES_KEY);
  return Object.values(store).filter(
    (act) => act.userId === userId && act.dateString === dateString
  );
}

/**
 * Calculates habit adherence percentage.
 */
export function calculateAdherence(activities: DailyActivity[]): number {
  if (!activities || activities.length === 0) return 0;
  const completed = activities.filter((a) => a.completed).length;
  return Math.round((completed / activities.length) * 100);
}
