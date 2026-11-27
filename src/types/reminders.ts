export interface ReminderPreferences {
  remindersEnabled: boolean;
  intervalMinutes: number;
  waterRemindersEnabled: boolean;
  waterIntervalMinutes: number;
  quietHoursEnabled: boolean;
  quietHoursStart: string; // HH:mm (24h)
  quietHoursEnd: string; // HH:mm (24h)
  inAppNotificationsEnabled: boolean;
  browserNotificationsEnabled: boolean;
  updatedAt: string;
}

export interface ActivityReminderState {
  nextDueAt: number;
  lastNotifiedAt: number | null;
  dismissedAt: number | null;
  acknowledgedAt: number | null;
}

export interface WaterOccurrenceState {
  occurrenceId: string;
  nextDueAt: number;
  lastNotifiedAt: number | null;
  dismissedAt: number | null;
  acknowledgedAt: number | null;
  completedCountToday: number;
  lastCompletedAt: string | null;
}

export interface ReminderScheduleState {
  userId: string;
  dateString: string; // YYYY-MM-DD
  habits: Record<string, ActivityReminderState>;
  water: WaterOccurrenceState;
  updatedAt: number;
}

export interface NotificationCenterItem {
  id: string;
  kind: 'habit' | 'water';
  activityId?: string;
  occurrenceId?: string;
  title: string;
  subtitle: string;
  timeOfDay?: 'Morning' | 'Afternoon' | 'Evening';
  status: 'pending' | 'completed';
  scheduledAt: number;
  lastNotifiedAt: number | null;
  completedAt?: string | null;
  isDue: boolean;
  isUnread: boolean;
}

export type BrowserNotificationPermission = 'default' | 'granted' | 'denied' | 'unsupported';

export interface ConsolidatedReminderAlert {
  id: string;
  title: string;
  body: string;
  dueHabitIds: string[];
  includesWater: boolean;
  triggeredAt: number;
}

export interface NotificationTransportPayload {
  id: string;
  title: string;
  body: string;
  tag: string;
  targetActivityId?: string;
  data?: Record<string, unknown>;
}

/**
 * Future-ready notification delivery interface supporting in-app,
 * Web Notifications API, and future Service Worker / mobile push adapters.
 */
export interface NotificationTransport {
  readonly channel: 'in_app' | 'browser' | 'push';
  isSupported: () => boolean;
  deliver: (payload: NotificationTransportPayload) => Promise<boolean> | boolean;
}
