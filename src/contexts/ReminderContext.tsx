import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { DailyActivity } from '../types';
import { DailyActivityDocument, UserProfileDocument } from '../types/firebase';
import {
  BrowserNotificationPermission,
  ConsolidatedReminderAlert,
  NotificationCenterItem,
  ReminderPreferences,
  ReminderScheduleState,
} from '../types/reminders';
import {
  DEFAULT_REMINDER_PREFERENCES,
  buildConsolidatedAlert,
  buildNotificationCenterItems,
  completeWaterOccurrence,
  createInitialScheduleState,
  dismissAllDueAlerts,
  dismissReminderItem,
  evaluateDueReminders,
  getTodayDateString,
  isWithinQuietHours,
  markRemindersNotified,
  sanitizeReminderPreferences,
  syncScheduleWithActivities,
} from '../utils/reminderLogic';
import {
  broadcastReminderSync,
  createBrowserNotificationTransport,
  createTabId,
  fetchReminderPreferences,
  fetchWaterCompletionsForDate,
  getBrowserNotificationPermission,
  getLocalReminderPreferences,
  loadScheduleState,
  recordWaterCompletion,
  requestBrowserNotificationPermission,
  saveReminderPreferences,
  saveScheduleState,
  subscribeReminderSync,
} from '../services/reminderService';

interface ReminderContextValue {
  preferences: ReminderPreferences;
  scheduleState: ReminderScheduleState;
  pendingItems: NotificationCenterItem[];
  completedItems: NotificationCenterItem[];
  unreadCount: number;
  quietHoursActive: boolean;
  browserPermission: BrowserNotificationPermission;
  activeAlert: ConsolidatedReminderAlert | null;
  isNotificationCentreOpen: boolean;
  highlightedActivityId: string | null;
  setNotificationCentreOpen: (open: boolean) => void;
  updatePreferences: (patch: Partial<ReminderPreferences>) => Promise<void>;
  toggleBrowserNotifications: (enable: boolean) => Promise<BrowserNotificationPermission>;
  completeHabitFromReminder: (activityId: string) => Promise<void>;
  completeWaterFromReminder: () => Promise<void>;
  dismissItem: (target: { kind: 'habit'; activityId: string } | { kind: 'water' }) => void;
  dismissAllAlerts: () => void;
  dismissActiveAlertBanner: () => void;
  navigateToActivity: (activityId?: string) => void;
}

const ReminderContext = createContext<ReminderContextValue | null>(null);

interface ReminderProviderProps {
  userId: string;
  userProfile?: UserProfileDocument | null;
  activities: DailyActivity[];
  onToggleActivity: (id: string) => Promise<void> | void;
  onNavigateToActivity: (activityId?: string) => void;
  onDateRollover?: (newDateString: string) => Promise<void> | void;
  children: React.ReactNode;
}

export const ReminderProvider: React.FC<ReminderProviderProps> = ({
  userId,
  userProfile,
  activities,
  onToggleActivity,
  onNavigateToActivity,
  onDateRollover,
  children,
}) => {
  const tabIdRef = useRef<string>(createTabId());
  const todayStr = getTodayDateString();

  const [preferences, setPreferences] = useState<ReminderPreferences>(() =>
    userProfile?.reminderPreferences
      ? sanitizeReminderPreferences(userProfile.reminderPreferences)
      : getLocalReminderPreferences(userId)
  );
  const [waterCompletions, setWaterCompletions] = useState<DailyActivityDocument[]>([]);
  const [scheduleState, setScheduleState] = useState<ReminderScheduleState>(() => {
    const existing = loadScheduleState(userId);
    const initialPrefs = userProfile?.reminderPreferences
      ? sanitizeReminderPreferences(userProfile.reminderPreferences)
      : getLocalReminderPreferences(userId);
    return syncScheduleWithActivities(
      existing,
      userId,
      todayStr,
      activities,
      initialPrefs,
      Date.now(),
      []
    );
  });

  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [activeAlert, setActiveAlert] = useState<ConsolidatedReminderAlert | null>(null);
  const [isNotificationCentreOpen, setNotificationCentreOpen] = useState<boolean>(false);
  const [highlightedActivityId, setHighlightedActivityId] = useState<string | null>(null);
  const [browserPermission, setBrowserPermission] = useState<BrowserNotificationPermission>(() =>
    getBrowserNotificationPermission()
  );

  // Refs for fresh access in interval / visibility listeners without churn
  const activitiesRef = useRef(activities);
  activitiesRef.current = activities;
  const prefsRef = useRef(preferences);
  prefsRef.current = preferences;
  const scheduleRef = useRef(scheduleState);
  scheduleRef.current = scheduleState;
  const waterCompletionsRef = useRef(waterCompletions);
  waterCompletionsRef.current = waterCompletions;
  const activeDateRef = useRef(todayStr);

  const navigateToActivity = useCallback(
    (activityId?: string) => {
      setNotificationCentreOpen(false);
      onNavigateToActivity(activityId);
      if (activityId) {
        setHighlightedActivityId(activityId);
        setTimeout(() => {
          setHighlightedActivityId((curr) => (curr === activityId ? null : curr));
        }, 4000);
      }
    },
    [onNavigateToActivity]
  );

  const browserTransport = useMemo(
    () =>
      createBrowserNotificationTransport((targetId) => {
        navigateToActivity(targetId);
      }),
    [navigateToActivity]
  );

  // Evaluate due reminders & trigger consolidated in-app / browser notifications
  const runEvaluation = useCallback(
    (currentState: ReminderScheduleState, currentPrefs: ReminderPreferences, currentNow: number) => {
      const evaluation = evaluateDueReminders(
        currentState,
        activitiesRef.current,
        currentPrefs,
        currentNow
      );

      if (!evaluation.alert) {
        return currentState;
      }

      const updatedState = markRemindersNotified(
        currentState,
        evaluation.dueHabitIds,
        evaluation.dueWater,
        currentPrefs,
        currentNow
      );
      saveScheduleState(updatedState);
      broadcastReminderSync({
        type: 'schedule_updated',
        userId: updatedState.userId,
        senderTabId: tabIdRef.current,
        timestamp: currentNow,
      });

      if (currentPrefs.inAppNotificationsEnabled) {
        setActiveAlert(evaluation.alert);
      }

      if (currentPrefs.browserNotificationsEnabled && browserTransport.isSupported()) {
        browserTransport.deliver({
          id: evaluation.alert.id,
          title: evaluation.alert.title,
          body: evaluation.alert.body,
          tag: `ayush_reminder_${updatedState.userId}_${updatedState.dateString}`,
          targetActivityId: evaluation.dueHabitIds[0],
        });
      }

      return updatedState;
    },
    [browserTransport]
  );

  // Hydrate preferences, water completions, and schedule when userId changes
  useEffect(() => {
    let mounted = true;
    const currentToday = getTodayDateString();
    activeDateRef.current = currentToday;

    async function hydrateForUser() {
      const [loadedPrefs, loadedWaterDocs] = await Promise.all([
        fetchReminderPreferences(userId, userProfile),
        fetchWaterCompletionsForDate(userId, currentToday),
      ]);

      if (!mounted) return;
      const currentNow = Date.now();
      setPreferences(loadedPrefs);
      setWaterCompletions(loadedWaterDocs);
      setBrowserPermission(getBrowserNotificationPermission());

      const storedSchedule = loadScheduleState(userId);
      const synced = syncScheduleWithActivities(
        storedSchedule,
        userId,
        currentToday,
        activitiesRef.current,
        loadedPrefs,
        currentNow,
        loadedWaterDocs
      );
      saveScheduleState(synced);
      const evaluated = runEvaluation(synced, loadedPrefs, currentNow);
      setScheduleState(evaluated);
      setNowMs(currentNow);
    }

    hydrateForUser();

    return () => {
      mounted = false;
    };
  }, [userId, userProfile?.reminderPreferences, runEvaluation]);

  // Keep schedule synchronized whenever Dinacharya activities or preferences change
  useEffect(() => {
    const currentNow = Date.now();
    const currentToday = getTodayDateString(currentNow);
    const synced = syncScheduleWithActivities(
      scheduleRef.current,
      userId,
      currentToday,
      activities,
      preferences,
      currentNow,
      waterCompletionsRef.current
    );

    const quietNow = isWithinQuietHours(currentNow, preferences);

    // Clear or dynamically prune active alert banner if items were completed or quiet hours became active
    setActiveAlert((prev) => {
      if (
        !prev ||
        !preferences.remindersEnabled ||
        !preferences.inAppNotificationsEnabled ||
        quietNow
      ) {
        return null;
      }
      const remainingHabits = activities.filter(
        (a) => !a.completed && prev.dueHabitIds.includes(a.id)
      );
      const waterStillActive =
        prev.includesWater &&
        preferences.waterRemindersEnabled &&
        synced.water.lastCompletedAt === scheduleRef.current.water.lastCompletedAt;

      return buildConsolidatedAlert(remainingHabits, waterStillActive, prev.triggeredAt);
    });

    const evaluated = runEvaluation(synced, preferences, currentNow);
    saveScheduleState(evaluated);
    setScheduleState(evaluated);
    setNowMs(currentNow);
  }, [activities, preferences, userId, runEvaluation]);

  // Cross-tab synchronization listener
  useEffect(() => {
    return subscribeReminderSync(userId, tabIdRef.current, async (event) => {
      const currentNow = Date.now();
      const currentToday = getTodayDateString(currentNow);

      if (event.type === 'prefs_updated') {
        const freshPrefs = getLocalReminderPreferences(userId);
        setPreferences(freshPrefs);
      }

      if (event.type === 'water_completed') {
        const freshWater = await fetchWaterCompletionsForDate(userId, currentToday);
        setWaterCompletions(freshWater);
      }

      const freshSchedule = loadScheduleState(userId);
      if (freshSchedule) {
        const synced = syncScheduleWithActivities(
          freshSchedule,
          userId,
          currentToday,
          activitiesRef.current,
          prefsRef.current,
          currentNow,
          waterCompletionsRef.current
        );
        setScheduleState(synced);
      }
      setNowMs(currentNow);
    });
  }, [userId]);

  // Heartbeat scheduler + visibility/focus check + midnight date-rollover check
  useEffect(() => {
    const checkTick = async () => {
      const currentNow = Date.now();
      const currentToday = getTodayDateString(currentNow);
      setBrowserPermission(getBrowserNotificationPermission());

      if (currentToday !== activeDateRef.current) {
        activeDateRef.current = currentToday;
        if (onDateRollover) {
          await onDateRollover(currentToday);
        }
        const freshWater = await fetchWaterCompletionsForDate(userId, currentToday);
        setWaterCompletions(freshWater);
        const rolledOver = createInitialScheduleState(userId, currentToday, currentNow);
        const syncedRollover = syncScheduleWithActivities(
          rolledOver,
          userId,
          currentToday,
          activitiesRef.current,
          prefsRef.current,
          currentNow,
          freshWater
        );
        const evaluated = runEvaluation(syncedRollover, prefsRef.current, currentNow);
        setScheduleState(evaluated);
        setNowMs(currentNow);
        return;
      }

      const stored = loadScheduleState(userId) || scheduleRef.current;
      const synced = syncScheduleWithActivities(
        stored,
        userId,
        currentToday,
        activitiesRef.current,
        prefsRef.current,
        currentNow,
        waterCompletionsRef.current
      );
      const evaluated = runEvaluation(synced, prefsRef.current, currentNow);
      setScheduleState(evaluated);
      setNowMs(currentNow);
    };

    const intervalId = window.setInterval(checkTick, 30_000);
    const handleVisibilityOrFocus = () => {
      checkTick();
    };

    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, [userId, onDateRollover, runEvaluation]);

  const updatePreferences = useCallback(
    async (patch: Partial<ReminderPreferences>) => {
      const saved = await saveReminderPreferences(userId, patch);
      setPreferences(saved);
      broadcastReminderSync({
        type: 'prefs_updated',
        userId,
        senderTabId: tabIdRef.current,
        timestamp: Date.now(),
      });
      if (
        !saved.remindersEnabled ||
        !saved.inAppNotificationsEnabled ||
        isWithinQuietHours(Date.now(), saved)
      ) {
        setActiveAlert(null);
      }
    },
    [userId]
  );

  const toggleBrowserNotifications = useCallback(
    async (enable: boolean): Promise<BrowserNotificationPermission> => {
      if (!enable) {
        await updatePreferences({ browserNotificationsEnabled: false });
        return getBrowserNotificationPermission();
      }

      const currentPerm = getBrowserNotificationPermission();
      if (currentPerm === 'unsupported') {
        setBrowserPermission('unsupported');
        await updatePreferences({ browserNotificationsEnabled: false });
        return 'unsupported';
      }

      const finalPerm =
        currentPerm === 'granted'
          ? 'granted'
          : await requestBrowserNotificationPermission();
      setBrowserPermission(finalPerm);

      if (finalPerm === 'granted') {
        await updatePreferences({ browserNotificationsEnabled: true });
      } else {
        await updatePreferences({ browserNotificationsEnabled: false });
      }
      return finalPerm;
    },
    [updatePreferences]
  );

  const completeHabitFromReminder = useCallback(
    async (activityId: string) => {
      const target = activitiesRef.current.find((a) => a.id === activityId);
      if (target && !target.completed) {
        await onToggleActivity(activityId);
        broadcastReminderSync({
          type: 'activity_toggled',
          userId,
          senderTabId: tabIdRef.current,
          timestamp: Date.now(),
        });
      }
    },
    [onToggleActivity, userId]
  );

  const completeWaterFromReminder = useCallback(async () => {
    const currentNow = Date.now();
    const currentToday = getTodayDateString(currentNow);
    const { nextState, completedOccurrenceId, completedAtIso } = completeWaterOccurrence(
      scheduleRef.current,
      prefsRef.current,
      currentNow,
      currentToday
    );

    saveScheduleState(nextState);
    setScheduleState(nextState);
    setNowMs(currentNow);

    const newDoc: DailyActivityDocument = {
      id: `${userId}_${currentToday}_${completedOccurrenceId}`,
      userId,
      activityKey: completedOccurrenceId,
      dateString: currentToday,
      completed: true,
      completedAt: completedAtIso,
    };
    setWaterCompletions((prev) => [newDoc, ...prev.filter((d) => d.id !== newDoc.id)]);

    setActiveAlert((prev) => {
      if (!prev) return null;
      const remainingHabits = activitiesRef.current.filter(
        (a) => !a.completed && prev.dueHabitIds.includes(a.id)
      );
      return buildConsolidatedAlert(remainingHabits, false, prev.triggeredAt);
    });

    await recordWaterCompletion(userId, currentToday, completedOccurrenceId);
    broadcastReminderSync({
      type: 'water_completed',
      userId,
      senderTabId: tabIdRef.current,
      timestamp: currentNow,
    });
  }, [userId]);

  const dismissItem = useCallback(
    (target: { kind: 'habit'; activityId: string } | { kind: 'water' }) => {
      const currentNow = Date.now();
      const updated = dismissReminderItem(
        scheduleRef.current,
        target,
        prefsRef.current,
        currentNow
      );
      saveScheduleState(updated);
      setScheduleState(updated);
      setNowMs(currentNow);

      setActiveAlert((prev) => {
        if (!prev) return null;
        const remainingHabitIds =
          target.kind === 'habit'
            ? prev.dueHabitIds.filter((id) => id !== target.activityId)
            : prev.dueHabitIds;
        const remainingHabits = activitiesRef.current.filter(
          (a) => !a.completed && remainingHabitIds.includes(a.id)
        );
        const includeWater = target.kind === 'water' ? false : prev.includesWater;
        return buildConsolidatedAlert(remainingHabits, includeWater, prev.triggeredAt);
      });

      broadcastReminderSync({
        type: 'schedule_updated',
        userId,
        senderTabId: tabIdRef.current,
        timestamp: currentNow,
      });
    },
    [userId]
  );

  const dismissAllAlerts = useCallback(() => {
    const currentNow = Date.now();
    const updated = dismissAllDueAlerts(scheduleRef.current, prefsRef.current, currentNow);
    saveScheduleState(updated);
    setScheduleState(updated);
    setActiveAlert(null);
    setNowMs(currentNow);
    broadcastReminderSync({
      type: 'schedule_updated',
      userId,
      senderTabId: tabIdRef.current,
      timestamp: currentNow,
    });
  }, [userId]);

  const dismissActiveAlertBanner = useCallback(() => {
    dismissAllAlerts();
  }, [dismissAllAlerts]);

  const quietHoursActive = useMemo(
    () => isWithinQuietHours(nowMs, preferences),
    [nowMs, preferences]
  );

  const { pendingItems, completedItems, unreadCount } = useMemo(
    () =>
      buildNotificationCenterItems(
        scheduleState,
        activities,
        preferences,
        nowMs,
        waterCompletions
      ),
    [scheduleState, activities, preferences, nowMs, waterCompletions]
  );

  const value: ReminderContextValue = {
    preferences,
    scheduleState,
    pendingItems,
    completedItems,
    unreadCount,
    quietHoursActive,
    browserPermission,
    activeAlert,
    isNotificationCentreOpen,
    highlightedActivityId,
    setNotificationCentreOpen,
    updatePreferences,
    toggleBrowserNotifications,
    completeHabitFromReminder,
    completeWaterFromReminder,
    dismissItem,
    dismissAllAlerts,
    dismissActiveAlertBanner,
    navigateToActivity,
  };

  return <ReminderContext.Provider value={value}>{children}</ReminderContext.Provider>;
};

export function useReminders(): ReminderContextValue {
  const ctx = useContext(ReminderContext);
  if (!ctx) {
    throw new Error('useReminders must be used within a ReminderProvider');
  }
  return ctx;
}

export function useOptionalReminders(): ReminderContextValue | null {
  return useContext(ReminderContext);
}
