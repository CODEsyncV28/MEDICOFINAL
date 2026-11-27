import { DailyActivity } from '../types';
import { DailyActivityDocument } from '../types/firebase';
import {
  ActivityReminderState,
  ConsolidatedReminderAlert,
  NotificationCenterItem,
  ReminderPreferences,
  ReminderScheduleState,
} from '../types/reminders';

export const WATER_ACTIVITY_KEY_PREFIX = 'water_intake_';

export const DEFAULT_REMINDER_PREFERENCES: ReminderPreferences = {
  remindersEnabled: true,
  intervalMinutes: 30,
  waterRemindersEnabled: true,
  waterIntervalMinutes: 60,
  quietHoursEnabled: true,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
  inAppNotificationsEnabled: true,
  browserNotificationsEnabled: false,
  updatedAt: new Date(0).toISOString(),
};

export function getTodayDateString(nowMs: number = Date.now()): string {
  return new Date(nowMs).toISOString().split('T')[0];
}

export function isValidHHMM(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function parseTimeToMinutes(hhmm: string): number {
  if (!isValidHHMM(hhmm)) return 0;
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function clampIntervalMinutes(value: unknown, fallback: number): number {
  const num = typeof value === 'number' ? Math.round(value) : Number(value);
  if (!Number.isFinite(num) || num < 5) return fallback;
  return Math.min(240, Math.max(5, num));
}

export function sanitizeReminderPreferences(
  raw?: Partial<ReminderPreferences> | null
): ReminderPreferences {
  const source = raw || {};
  return {
    remindersEnabled:
      typeof source.remindersEnabled === 'boolean'
        ? source.remindersEnabled
        : DEFAULT_REMINDER_PREFERENCES.remindersEnabled,
    intervalMinutes: clampIntervalMinutes(
      source.intervalMinutes,
      DEFAULT_REMINDER_PREFERENCES.intervalMinutes
    ),
    waterRemindersEnabled:
      typeof source.waterRemindersEnabled === 'boolean'
        ? source.waterRemindersEnabled
        : DEFAULT_REMINDER_PREFERENCES.waterRemindersEnabled,
    waterIntervalMinutes: clampIntervalMinutes(
      source.waterIntervalMinutes,
      DEFAULT_REMINDER_PREFERENCES.waterIntervalMinutes
    ),
    quietHoursEnabled:
      typeof source.quietHoursEnabled === 'boolean'
        ? source.quietHoursEnabled
        : DEFAULT_REMINDER_PREFERENCES.quietHoursEnabled,
    quietHoursStart:
      typeof source.quietHoursStart === 'string' && isValidHHMM(source.quietHoursStart)
        ? source.quietHoursStart
        : DEFAULT_REMINDER_PREFERENCES.quietHoursStart,
    quietHoursEnd:
      typeof source.quietHoursEnd === 'string' && isValidHHMM(source.quietHoursEnd)
        ? source.quietHoursEnd
        : DEFAULT_REMINDER_PREFERENCES.quietHoursEnd,
    inAppNotificationsEnabled:
      typeof source.inAppNotificationsEnabled === 'boolean'
        ? source.inAppNotificationsEnabled
        : DEFAULT_REMINDER_PREFERENCES.inAppNotificationsEnabled,
    browserNotificationsEnabled:
      typeof source.browserNotificationsEnabled === 'boolean'
        ? source.browserNotificationsEnabled
        : DEFAULT_REMINDER_PREFERENCES.browserNotificationsEnabled,
    updatedAt:
      typeof source.updatedAt === 'string' && source.updatedAt.length > 0
        ? source.updatedAt
        : new Date().toISOString(),
  };
}

/**
 * Evaluates whether `nowMs` falls within the user's configured quiet hours.
 * Supports both same-day windows (e.g. 13:00-15:00) and overnight wrap-around (e.g. 22:00-07:00).
 */
export function isWithinQuietHours(
  nowMs: number,
  prefs: ReminderPreferences
): boolean {
  if (!prefs.quietHoursEnabled) return false;
  const startMin = parseTimeToMinutes(prefs.quietHoursStart);
  const endMin = parseTimeToMinutes(prefs.quietHoursEnd);
  if (startMin === endMin) return false;

  const d = new Date(nowMs);
  const currentMin = d.getHours() * 60 + d.getMinutes();

  if (startMin < endMin) {
    return currentMin >= startMin && currentMin < endMin;
  }
  // Overnight wrap-around (e.g. 22:00 -> 07:00)
  return currentMin >= startMin || currentMin < endMin;
}

export function createInitialScheduleState(
  userId: string,
  dateString: string,
  nowMs: number
): ReminderScheduleState {
  return {
    userId,
    dateString,
    habits: {},
    water: {
      occurrenceId: `${WATER_ACTIVITY_KEY_PREFIX}${dateString}_1`,
      nextDueAt: nowMs,
      lastNotifiedAt: null,
      dismissedAt: null,
      acknowledgedAt: null,
      completedCountToday: 0,
      lastCompletedAt: null,
    },
    updatedAt: nowMs,
  };
}

function getLatestWaterCompletionInfo(
  persistedWaterCompletions: DailyActivityDocument[],
  dateString: string
): { count: number; lastCompletedAt: string | null; lastCompletedMs: number | null } {
  const completedToday = persistedWaterCompletions.filter(
    (doc) =>
      doc.dateString === dateString &&
      doc.completed === true &&
      doc.activityKey.startsWith(WATER_ACTIVITY_KEY_PREFIX)
  );
  if (completedToday.length === 0) {
    return { count: 0, lastCompletedAt: null, lastCompletedMs: null };
  }

  let latestIso: string | null = null;
  let latestMs = 0;
  for (const doc of completedToday) {
    if (doc.completedAt) {
      const parsed = Date.parse(doc.completedAt);
      if (Number.isFinite(parsed) && parsed >= latestMs) {
        latestMs = parsed;
        latestIso = doc.completedAt;
      }
    }
  }

  return {
    count: completedToday.length,
    lastCompletedAt: latestIso,
    lastCompletedMs: latestMs > 0 ? latestMs : null,
  };
}

/**
 * Reconciles persisted schedule state with today's Dinacharya checklist and persisted water completions.
 * - Resets cleanly on user change or midnight date rollover.
 * - Immediately removes reminder tracking for completed Dinacharya activities.
 * - Re-enables tracking if an activity is unchecked back to pending.
 * - Ensures water reminder nextDueAt respects already-completed occurrences across refreshes/logins.
 */
export function syncScheduleWithActivities(
  existingState: ReminderScheduleState | null,
  userId: string,
  dateString: string,
  activities: DailyActivity[],
  prefs: ReminderPreferences,
  nowMs: number,
  persistedWaterCompletions: DailyActivityDocument[] = []
): ReminderScheduleState {
  const base =
    existingState &&
    existingState.userId === userId &&
    existingState.dateString === dateString
      ? existingState
      : createInitialScheduleState(userId, dateString, nowMs);

  const habitIntervalMs = prefs.intervalMinutes * 60_000;
  const waterIntervalMs = prefs.waterIntervalMinutes * 60_000;

  const nextHabits: Record<string, ActivityReminderState> = {};
  for (const act of activities) {
    if (act.completed) {
      // Completed activities immediately stop generating reminders
      continue;
    }

    const prev = base.habits[act.id];
    if (prev) {
      // If user shortened their interval since last notification/dismissal, pull nextDueAt in cleanly
      const anchor = prev.lastNotifiedAt ?? prev.dismissedAt;
      const adjustedNextDueAt =
        anchor !== null
          ? Math.min(prev.nextDueAt, anchor + habitIntervalMs)
          : prev.nextDueAt;
      nextHabits[act.id] = {
        ...prev,
        nextDueAt: adjustedNextDueAt,
      };
    } else {
      nextHabits[act.id] = {
        nextDueAt: nowMs,
        lastNotifiedAt: null,
        dismissedAt: null,
        acknowledgedAt: null,
      };
    }
  }

  const waterStats = getLatestWaterCompletionInfo(persistedWaterCompletions, dateString);
  const completedCountToday = Math.max(base.water.completedCountToday, waterStats.count);
  const lastCompletedAt =
    waterStats.lastCompletedAt &&
    (!base.water.lastCompletedAt || waterStats.lastCompletedAt > base.water.lastCompletedAt)
      ? waterStats.lastCompletedAt
      : base.water.lastCompletedAt;

  let waterNextDueAt = base.water.nextDueAt;
  const waterAnchor =
    waterStats.lastCompletedMs ??
    (lastCompletedAt ? Date.parse(lastCompletedAt) : null) ??
    base.water.lastNotifiedAt ??
    base.water.dismissedAt;

  if (waterAnchor && Number.isFinite(waterAnchor)) {
    const earliestAfterCompletion =
      waterStats.lastCompletedMs && Number.isFinite(waterStats.lastCompletedMs)
        ? waterStats.lastCompletedMs + waterIntervalMs
        : 0;
    waterNextDueAt = Math.max(
      earliestAfterCompletion,
      Math.min(waterNextDueAt, waterAnchor + waterIntervalMs)
    );
  }

  const expectedWaterSeq = completedCountToday + 1;
  const expectedOccurrenceId = `${WATER_ACTIVITY_KEY_PREFIX}${dateString}_${expectedWaterSeq}`;
  const isNewOccurrence = base.water.occurrenceId !== expectedOccurrenceId;

  return {
    userId,
    dateString,
    habits: nextHabits,
    water: {
      occurrenceId: expectedOccurrenceId,
      nextDueAt: waterNextDueAt,
      lastNotifiedAt: isNewOccurrence ? null : base.water.lastNotifiedAt,
      dismissedAt: isNewOccurrence ? null : base.water.dismissedAt,
      acknowledgedAt: isNewOccurrence ? null : base.water.acknowledgedAt,
      completedCountToday,
      lastCompletedAt,
    },
    updatedAt: nowMs,
  };
}

export interface DueReminderEvaluation {
  dueHabitIds: string[];
  dueWater: boolean;
  quietHoursActive: boolean;
  alert: ConsolidatedReminderAlert | null;
}

export function buildConsolidatedAlert(
  dueHabits: DailyActivity[],
  dueWater: boolean,
  nowMs: number
): ConsolidatedReminderAlert | null {
  if (dueHabits.length === 0 && !dueWater) {
    return null;
  }

  const dueHabitIds = dueHabits.map((h) => h.id);
  let title = 'Gentle Dinacharya Reminder';
  let body = '';

  if (dueHabits.length > 0 && dueWater) {
    title = `${dueHabits.length + 1} Wellness Check-ins Pending`;
    const names = dueHabits.slice(0, 2).map((h) => h.title).join(', ');
    const extra = dueHabits.length > 2 ? ` +${dueHabits.length - 2} more` : '';
    body = `Pending rituals: ${names}${extra}, plus a mindful water break.`;
  } else if (dueHabits.length === 1) {
    title = `Time for ${dueHabits[0].title}`;
    body = `${dueHabits[0].timeOfDay} ritual (${dueHabits[0].durationMinutes} min) · ${dueHabits[0].benefit}`;
  } else if (dueHabits.length > 1) {
    title = `${dueHabits.length} Dinacharya Rituals Pending`;
    const names = dueHabits.slice(0, 2).map((h) => h.title).join(', ');
    const extra = dueHabits.length > 2 ? ` and ${dueHabits.length - 2} more` : '';
    body = `Take a mindful moment for ${names}${extra}.`;
  } else if (dueWater) {
    title = 'Mindful Hydration Pause';
    body = 'Take a gentle sip of warm or room-temperature water when comfortable.';
  }

  return {
    id: `alert_${nowMs}_${dueHabitIds.join('_')}${dueWater ? '_water' : ''}`,
    title,
    body,
    dueHabitIds,
    includesWater: dueWater,
    triggeredAt: nowMs,
  };
}

/**
 * Evaluates which pending habits and/or water check-in are currently due.
 * Consolidates multiple simultaneously due items into one calm alert payload.
 */
export function evaluateDueReminders(
  state: ReminderScheduleState,
  activities: DailyActivity[],
  prefs: ReminderPreferences,
  nowMs: number
): DueReminderEvaluation {
  if (!prefs.remindersEnabled) {
    return { dueHabitIds: [], dueWater: false, quietHoursActive: false, alert: null };
  }

  const quietHoursActive = isWithinQuietHours(nowMs, prefs);
  if (quietHoursActive) {
    return { dueHabitIds: [], dueWater: false, quietHoursActive: true, alert: null };
  }

  const dueHabits: DailyActivity[] = [];
  for (const act of activities) {
    if (act.completed) continue;
    const habitState = state.habits[act.id];
    if (habitState && habitState.nextDueAt <= nowMs) {
      dueHabits.push(act);
    }
  }

  const dueWater =
    prefs.waterRemindersEnabled && state.water.nextDueAt <= nowMs;

  if (dueHabits.length === 0 && !dueWater) {
    return { dueHabitIds: [], dueWater: false, quietHoursActive: false, alert: null };
  }

  const dueHabitIds = dueHabits.map((h) => h.id);
  const alert = buildConsolidatedAlert(dueHabits, dueWater, nowMs);

  return {
    dueHabitIds,
    dueWater,
    quietHoursActive: false,
    alert,
  };
}

/**
 * Records that due reminders were delivered and advances their nextDueAt by the configured interval.
 */
export function markRemindersNotified(
  state: ReminderScheduleState,
  dueHabitIds: string[],
  dueWater: boolean,
  prefs: ReminderPreferences,
  nowMs: number
): ReminderScheduleState {
  const habitIntervalMs = prefs.intervalMinutes * 60_000;
  const waterIntervalMs = prefs.waterIntervalMinutes * 60_000;

  const nextHabits: Record<string, ActivityReminderState> = { ...state.habits };
  for (const id of dueHabitIds) {
    const existing = nextHabits[id];
    if (existing) {
      nextHabits[id] = {
        ...existing,
        lastNotifiedAt: nowMs,
        nextDueAt: nowMs + habitIntervalMs,
      };
    }
  }

  const nextWater = dueWater
    ? {
        ...state.water,
        lastNotifiedAt: nowMs,
        nextDueAt: nowMs + waterIntervalMs,
      }
    : state.water;

  return {
    ...state,
    habits: nextHabits,
    water: nextWater,
    updatedAt: nowMs,
  };
}

/**
 * Temporarily dismisses/snoozes a reminder until the next scheduled interval
 * WITHOUT marking the underlying activity or water occurrence as completed.
 */
export function dismissReminderItem(
  state: ReminderScheduleState,
  target: { kind: 'habit'; activityId: string } | { kind: 'water' },
  prefs: ReminderPreferences,
  nowMs: number
): ReminderScheduleState {
  if (target.kind === 'water') {
    return {
      ...state,
      water: {
        ...state.water,
        dismissedAt: nowMs,
        acknowledgedAt: nowMs,
        nextDueAt: nowMs + prefs.waterIntervalMinutes * 60_000,
      },
      updatedAt: nowMs,
    };
  }

  const existing = state.habits[target.activityId];
  if (!existing) return state;

  return {
    ...state,
    habits: {
      ...state.habits,
      [target.activityId]: {
        ...existing,
        dismissedAt: nowMs,
        acknowledgedAt: nowMs,
        nextDueAt: nowMs + prefs.intervalMinutes * 60_000,
      },
    },
    updatedAt: nowMs,
  };
}

/**
 * Dismisses all currently unread/due alerts temporarily without completing any activity.
 */
export function dismissAllDueAlerts(
  state: ReminderScheduleState,
  prefs: ReminderPreferences,
  nowMs: number
): ReminderScheduleState {
  const habitIntervalMs = prefs.intervalMinutes * 60_000;
  const waterIntervalMs = prefs.waterIntervalMinutes * 60_000;

  const nextHabits: Record<string, ActivityReminderState> = {};
  for (const [id, item] of Object.entries(state.habits)) {
    const isDueNow = item.nextDueAt <= nowMs;
    nextHabits[id] = {
      ...item,
      acknowledgedAt: nowMs,
      dismissedAt: isDueNow ? nowMs : item.dismissedAt,
      nextDueAt: isDueNow ? nowMs + habitIntervalMs : item.nextDueAt,
    };
  }

  const waterDueNow = state.water.nextDueAt <= nowMs;
  return {
    ...state,
    habits: nextHabits,
    water: {
      ...state.water,
      acknowledgedAt: nowMs,
      dismissedAt: waterDueNow ? nowMs : state.water.dismissedAt,
      nextDueAt: waterDueNow ? nowMs + waterIntervalMs : state.water.nextDueAt,
    },
    updatedAt: nowMs,
  };
}

/**
 * Completes the current scheduled water intake occurrence, stops reminders for this occurrence,
 * and schedules the next water reminder occurrence at `nowMs + waterIntervalMinutes`.
 */
export function completeWaterOccurrence(
  state: ReminderScheduleState,
  prefs: ReminderPreferences,
  nowMs: number,
  dateString: string
): { nextState: ReminderScheduleState; completedOccurrenceId: string; completedAtIso: string } {
  const completedOccurrenceId = state.water.occurrenceId;
  const completedAtIso = new Date(nowMs).toISOString();
  const nextCount = state.water.completedCountToday + 1;

  return {
    completedOccurrenceId,
    completedAtIso,
    nextState: {
      ...state,
      water: {
        occurrenceId: `${WATER_ACTIVITY_KEY_PREFIX}${dateString}_${nextCount + 1}`,
        nextDueAt: nowMs + prefs.waterIntervalMinutes * 60_000,
        lastNotifiedAt: null,
        dismissedAt: null,
        acknowledgedAt: null,
        completedCountToday: nextCount,
        lastCompletedAt: completedAtIso,
      },
      updatedAt: nowMs,
    },
  };
}

function isItemUnread(
  itemState: { nextDueAt: number; lastNotifiedAt: number | null; acknowledgedAt: number | null },
  nowMs: number,
  remindersEnabled: boolean,
  quietHoursActive: boolean
): boolean {
  if (!remindersEnabled) return false;
  const firedSignal = itemState.lastNotifiedAt ?? 0;
  const dueSignal = !quietHoursActive && itemState.nextDueAt <= nowMs ? itemState.nextDueAt : 0;
  const latestSignal = Math.max(firedSignal, dueSignal);
  if (latestSignal <= 0) return false;
  if (!itemState.acknowledgedAt) return true;
  return latestSignal > itemState.acknowledgedAt;
}

export function buildNotificationCenterItems(
  state: ReminderScheduleState,
  activities: DailyActivity[],
  prefs: ReminderPreferences,
  nowMs: number,
  persistedWaterCompletions: DailyActivityDocument[] = []
): {
  pendingItems: NotificationCenterItem[];
  completedItems: NotificationCenterItem[];
  unreadCount: number;
} {
  const pendingItems: NotificationCenterItem[] = [];
  const completedItems: NotificationCenterItem[] = [];
  const seenIds = new Set<string>();
  const quietHoursActive = isWithinQuietHours(nowMs, prefs);

  // 1. Dedicated Water Intake Reminder (Pending Occurrence)
  if (prefs.waterRemindersEnabled) {
    const waterUnread =
      prefs.remindersEnabled &&
      isItemUnread(state.water, nowMs, prefs.remindersEnabled, quietHoursActive);
    const waterDue =
      prefs.remindersEnabled &&
      !quietHoursActive &&
      (waterUnread || state.water.nextDueAt <= nowMs);
    const waterId = state.water.occurrenceId;
    seenIds.add(waterId);
    pendingItems.push({
      id: waterId,
      kind: 'water',
      occurrenceId: state.water.occurrenceId,
      title: 'Mindful Water Hydration',
      subtitle:
        state.water.completedCountToday > 0
          ? `Every ${prefs.waterIntervalMinutes} min · ${state.water.completedCountToday} check-in${state.water.completedCountToday === 1 ? '' : 's'} today`
          : `Gentle reminder every ${prefs.waterIntervalMinutes} min`,
      status: 'pending',
      scheduledAt: state.water.nextDueAt,
      lastNotifiedAt: state.water.lastNotifiedAt,
      isDue: waterDue,
      isUnread: waterUnread,
    });
  }

  // 2. Dinacharya Daily Activities (Pending vs Completed)
  for (const act of activities) {
    if (act.completed) {
      const id = `done_${act.id}`;
      if (seenIds.has(id)) continue;
      seenIds.add(id);
      completedItems.push({
        id,
        kind: 'habit',
        activityId: act.id,
        title: act.title,
        subtitle: `${act.timeOfDay} · ${act.durationMinutes} min · ${act.discipline}`,
        timeOfDay: act.timeOfDay,
        status: 'completed',
        scheduledAt: nowMs,
        lastNotifiedAt: null,
        completedAt: null,
        isDue: false,
        isUnread: false,
      });
    } else {
      const habitState = state.habits[act.id] || {
        nextDueAt: nowMs,
        lastNotifiedAt: null,
        dismissedAt: null,
        acknowledgedAt: null,
      };
      const id = `pending_${act.id}`;
      if (seenIds.has(id)) continue;
      seenIds.add(id);
      const isUnread =
        prefs.remindersEnabled &&
        isItemUnread(habitState, nowMs, prefs.remindersEnabled, quietHoursActive);
      const isDue =
        prefs.remindersEnabled &&
        !quietHoursActive &&
        (isUnread || habitState.nextDueAt <= nowMs);

      pendingItems.push({
        id,
        kind: 'habit',
        activityId: act.id,
        title: act.title,
        subtitle: `${act.timeOfDay} ritual · ${act.durationMinutes} min`,
        timeOfDay: act.timeOfDay,
        status: 'pending',
        scheduledAt: habitState.nextDueAt,
        lastNotifiedAt: habitState.lastNotifiedAt,
        isDue,
        isUnread,
      });
    }
  }

  // 3. Completed Water Check-ins Today
  const completedWaterToday = persistedWaterCompletions
    .filter(
      (doc) =>
        doc.dateString === state.dateString &&
        doc.completed === true &&
        doc.activityKey.startsWith(WATER_ACTIVITY_KEY_PREFIX)
    )
    .sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || ''));

  for (const waterDoc of completedWaterToday) {
    const id = `done_${waterDoc.activityKey}`;
    if (seenIds.has(id)) continue;
    seenIds.add(id);
    completedItems.push({
      id,
      kind: 'water',
      occurrenceId: waterDoc.activityKey,
      title: 'Mindful Water Hydration',
      subtitle: 'Completed scheduled hydration check-in',
      status: 'completed',
      scheduledAt: waterDoc.completedAt ? Date.parse(waterDoc.completedAt) : nowMs,
      lastNotifiedAt: null,
      completedAt: waterDoc.completedAt || null,
      isDue: false,
      isUnread: false,
    });
  }

  // Sort pending: unread/due first, then earliest scheduled time
  pendingItems.sort((a, b) => {
    if (a.isUnread !== b.isUnread) return a.isUnread ? -1 : 1;
    if (a.isDue !== b.isDue) return a.isDue ? -1 : 1;
    return a.scheduledAt - b.scheduledAt;
  });

  const unreadCount = pendingItems.filter((item) => item.isUnread).length;

  return {
    pendingItems,
    completedItems,
    unreadCount,
  };
}

export function formatReminderTimeLabel(timestampMs: number | string | null | undefined): string {
  if (!timestampMs) return 'Scheduled';
  const date = typeof timestampMs === 'number' ? new Date(timestampMs) : new Date(timestampMs);
  if (Number.isNaN(date.getTime())) return 'Scheduled';
  try {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  } catch {
    return date.toLocaleTimeString();
  }
}
