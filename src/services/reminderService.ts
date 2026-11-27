import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { DailyActivityDocument, UserProfileDocument } from '../types/firebase';
import {
  BrowserNotificationPermission,
  NotificationTransport,
  NotificationTransportPayload,
  ReminderPreferences,
  ReminderScheduleState,
} from '../types/reminders';
import {
  DEFAULT_REMINDER_PREFERENCES,
  WATER_ACTIVITY_KEY_PREFIX,
  sanitizeReminderPreferences,
} from '../utils/reminderLogic';
import {
  GUEST_DINACHARYA_USER_ID,
  fetchDailyActivitiesForDate,
  toggleActivityStatus,
} from './dinacharyaService';

const PREFS_KEY_PREFIX = 'ayush_reminder_prefs_';
const SCHEDULE_KEY_PREFIX = 'ayush_reminder_schedule_';
const BROADCAST_CHANNEL_NAME = 'ayush_wellness_reminders_v1';

const memoryStore = new Map<string, string>();

export interface ReminderSyncEvent {
  type: 'prefs_updated' | 'schedule_updated' | 'activity_toggled' | 'water_completed';
  userId: string;
  senderTabId: string;
  timestamp: number;
}

function getStorageValue(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
    return memoryStore.get(key) ?? null;
  } catch {
    return memoryStore.get(key) ?? null;
  }
}

function setStorageValue(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
    memoryStore.set(key, value);
  } catch {
    memoryStore.set(key, value);
  }
}

export function getLocalReminderPreferences(userId: string): ReminderPreferences {
  const raw = getStorageValue(`${PREFS_KEY_PREFIX}${userId}`);
  if (!raw) {
    return {
      ...DEFAULT_REMINDER_PREFERENCES,
      updatedAt: new Date().toISOString(),
    };
  }
  try {
    return sanitizeReminderPreferences(JSON.parse(raw));
  } catch {
    return {
      ...DEFAULT_REMINDER_PREFERENCES,
      updatedAt: new Date().toISOString(),
    };
  }
}

export function setLocalReminderPreferences(
  userId: string,
  prefs: ReminderPreferences
): ReminderPreferences {
  const sanitized = sanitizeReminderPreferences({
    ...prefs,
    updatedAt: prefs.updatedAt || new Date().toISOString(),
  });
  setStorageValue(`${PREFS_KEY_PREFIX}${userId}`, JSON.stringify(sanitized));
  return sanitized;
}

/**
 * Fetches reminder preferences for `userId`.
 * Uses Cloud Firestore user profile when configured and authenticated, with local cache fallback.
 */
export async function fetchReminderPreferences(
  userId: string,
  profileHint?: UserProfileDocument | null
): Promise<ReminderPreferences> {
  const isGuest = !userId || userId === GUEST_DINACHARYA_USER_ID;

  if (profileHint?.reminderPreferences) {
    const synced = setLocalReminderPreferences(userId, profileHint.reminderPreferences);
    return synced;
  }

  if (isFirebaseConfigured && db && !isGuest) {
    try {
      const snap = await getDoc(doc(db, 'users', userId));
      if (snap.exists()) {
        const data = snap.data() as UserProfileDocument;
        if (data.reminderPreferences) {
          return setLocalReminderPreferences(userId, data.reminderPreferences);
        }
      }
    } catch (err) {
      console.warn('Unable to read reminder preferences from Firestore, using local cache:', err);
    }
  }

  return getLocalReminderPreferences(userId);
}

/**
 * Persists user reminder preferences to per-user local cache and, for authenticated
 * Firebase users, to `/users/{userId}.reminderPreferences`.
 */
export async function saveReminderPreferences(
  userId: string,
  prefs: Partial<ReminderPreferences>
): Promise<ReminderPreferences> {
  const current = getLocalReminderPreferences(userId);
  const next = setLocalReminderPreferences(userId, {
    ...current,
    ...prefs,
    updatedAt: new Date().toISOString(),
  });

  const isGuest = !userId || userId === GUEST_DINACHARYA_USER_ID;
  if (isFirebaseConfigured && db && !isGuest) {
    try {
      await setDoc(
        doc(db, 'users', userId),
        {
          reminderPreferences: next,
          updatedAt: next.updatedAt,
          updatedAtServer: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('Could not persist reminderPreferences to Firestore user profile:', err);
    }
  }

  return next;
}

export function loadScheduleState(userId: string): ReminderScheduleState | null {
  const raw = getStorageValue(`${SCHEDULE_KEY_PREFIX}${userId}`);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ReminderScheduleState;
    if (!parsed || parsed.userId !== userId || !parsed.water) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveScheduleState(state: ReminderScheduleState): void {
  setStorageValue(`${SCHEDULE_KEY_PREFIX}${state.userId}`, JSON.stringify(state));
}

/**
 * Reuses existing `/dailyActivities` persistence for water intake occurrence completions.
 */
export async function fetchWaterCompletionsForDate(
  userId: string,
  dateString: string
): Promise<DailyActivityDocument[]> {
  const docs = await fetchDailyActivitiesForDate(userId, dateString);
  return docs.filter((d) => d.activityKey.startsWith(WATER_ACTIVITY_KEY_PREFIX));
}

export async function recordWaterCompletion(
  userId: string,
  dateString: string,
  occurrenceId: string
): Promise<void> {
  await toggleActivityStatus(userId, occurrenceId, dateString, true);
}

/**
 * Cross-tab synchronization using BroadcastChannel with `storage` event fallback.
 */
export function createTabId(): string {
  return `tab_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function broadcastReminderSync(event: ReminderSyncEvent): void {
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      channel.postMessage(event);
      channel.close();
    }
  } catch {
    // Fallback handled naturally by localStorage `storage` events in other tabs
  }
}

export function subscribeReminderSync(
  userId: string,
  currentTabId: string,
  onSync: (event: ReminderSyncEvent) => void
): () => void {
  let channel: BroadcastChannel | null = null;
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      channel.onmessage = (msg: MessageEvent<ReminderSyncEvent>) => {
        const data = msg.data;
        if (!data || data.senderTabId === currentTabId || data.userId !== userId) return;
        onSync(data);
      };
    }
  } catch {
    channel = null;
  }

  const handleStorage = (ev: StorageEvent) => {
    if (!ev.key) return;
    if (ev.key === `${PREFS_KEY_PREFIX}${userId}`) {
      onSync({
        type: 'prefs_updated',
        userId,
        senderTabId: 'storage',
        timestamp: Date.now(),
      });
    } else if (ev.key === `${SCHEDULE_KEY_PREFIX}${userId}`) {
      onSync({
        type: 'schedule_updated',
        userId,
        senderTabId: 'storage',
        timestamp: Date.now(),
      });
    }
  };

  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('storage', handleStorage);
  }

  return () => {
    try {
      channel?.close();
    } catch {
      // ignore
    }
    if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
      window.removeEventListener('storage', handleStorage);
    }
  };
}

/**
 * Browser Notification API helpers (permission requested ONLY upon explicit user action).
 */
export function getBrowserNotificationPermission(): BrowserNotificationPermission {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') {
    return 'unsupported';
  }
  return Notification.permission as BrowserNotificationPermission;
}

export async function requestBrowserNotificationPermission(): Promise<BrowserNotificationPermission> {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') {
    return 'unsupported';
  }
  try {
    const result = await Notification.requestPermission();
    return result as BrowserNotificationPermission;
  } catch {
    return getBrowserNotificationPermission();
  }
}

export function createBrowserNotificationTransport(
  onNotificationClick?: (targetActivityId?: string) => void
): NotificationTransport {
  return {
    channel: 'browser',
    isSupported: () =>
      typeof window !== 'undefined' &&
      typeof Notification !== 'undefined' &&
      Notification.permission === 'granted',
    deliver: (payload: NotificationTransportPayload) => {
      if (
        typeof window === 'undefined' ||
        typeof Notification === 'undefined' ||
        Notification.permission !== 'granted'
      ) {
        return false;
      }

      try {
        const notification = new Notification(payload.title, {
          body: payload.body,
          tag: payload.tag,
        });
        notification.onclick = () => {
          try {
            window.focus();
          } catch {
            // ignore focus errors
          }
          notification.close();
          onNotificationClick?.(payload.targetActivityId);
        };
        return true;
      } catch (err) {
        console.warn('Browser notification delivery failed:', err);
        return false;
      }
    },
  };
}
