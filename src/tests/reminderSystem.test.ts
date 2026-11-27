import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_DAILY_ACTIVITIES } from '../data/mockData';
import { DailyActivity } from '../types';
import {
  DEFAULT_REMINDER_PREFERENCES,
  buildNotificationCenterItems,
  completeWaterOccurrence,
  dismissAllDueAlerts,
  dismissReminderItem,
  evaluateDueReminders,
  isWithinQuietHours,
  markRemindersNotified,
  sanitizeReminderPreferences,
  syncScheduleWithActivities,
} from '../utils/reminderLogic';
import {
  createBrowserNotificationTransport,
  fetchReminderPreferences,
  fetchWaterCompletionsForDate,
  getBrowserNotificationPermission,
  loadScheduleState,
  recordWaterCompletion,
  requestBrowserNotificationPermission,
  saveReminderPreferences,
  saveScheduleState,
} from '../services/reminderService';
import {
  calculateAdherence,
  fetchDailyActivitiesForDate,
  mergeDailyActivitiesWithRecords,
  toggleActivityStatus,
} from '../services/dinacharyaService';

function createDaytimeMs(hour: number, minute = 0): number {
  const d = new Date(2026, 10, 26, hour, minute, 0, 0);
  return d.getTime();
}

function installMockLocalStorage() {
  const store = new Map<string, string>();
  (globalThis as any).window = {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, v),
      removeItem: (k: string) => store.delete(k),
    },
  };
  return store;
}

describe('Smart Wellness Reminder & Notification System', () => {
  const today = '2026-11-26';

  beforeEach(() => {
    delete (globalThis as any).window;
    delete (globalThis as any).Notification;
  });

  it('1. Pending Dinacharya activities generate reminders and completed ones do not', () => {
    const now = createDaytimeMs(10, 0);
    const prefs = sanitizeReminderPreferences({ ...DEFAULT_REMINDER_PREFERENCES, waterRemindersEnabled: false });
    const state = syncScheduleWithActivities(null, 'user_1', today, INITIAL_DAILY_ACTIVITIES, prefs, now);

    // act-1 and act-2 are completed; act-3, act-4, act-5 are pending
    assert.equal(state.habits['act-1'], undefined);
    assert.equal(state.habits['act-2'], undefined);
    assert.ok(state.habits['act-3']);
    assert.ok(state.habits['act-4']);
    assert.ok(state.habits['act-5']);

    const evalRes = evaluateDueReminders(state, INITIAL_DAILY_ACTIVITIES, prefs, now);
    assert.deepEqual(evalRes.dueHabitIds, ['act-3', 'act-4', 'act-5']);
    assert.equal(evalRes.dueWater, false);
    assert.ok(evalRes.alert);
  });

  it('2. Reminders repeat at the configured interval and consolidate multiple pending items', () => {
    const t0 = createDaytimeMs(10, 0);
    const prefs = sanitizeReminderPreferences({
      ...DEFAULT_REMINDER_PREFERENCES,
      intervalMinutes: 30,
      waterRemindersEnabled: false,
    });
    let state = syncScheduleWithActivities(null, 'user_1', today, INITIAL_DAILY_ACTIVITIES, prefs, t0);
    const firstEval = evaluateDueReminders(state, INITIAL_DAILY_ACTIVITIES, prefs, t0);
    assert.ok(firstEval.alert);
    assert.equal(firstEval.dueHabitIds.length, 3);
    assert.ok(firstEval.alert?.title.includes('3 Dinacharya Rituals Pending'));

    state = markRemindersNotified(state, firstEval.dueHabitIds, firstEval.dueWater, prefs, t0);

    // 15 minutes later: not due yet
    const t15 = t0 + 15 * 60_000;
    const midEval = evaluateDueReminders(state, INITIAL_DAILY_ACTIVITIES, prefs, t15);
    assert.equal(midEval.alert, null);

    // 30 minutes later: repeats for still-pending activities
    const t30 = t0 + 30 * 60_000;
    const repeatEval = evaluateDueReminders(state, INITIAL_DAILY_ACTIVITIES, prefs, t30);
    assert.ok(repeatEval.alert);
    assert.deepEqual(repeatEval.dueHabitIds, ['act-3', 'act-4', 'act-5']);
  });

  it('3. Completing an activity immediately stops its reminders', () => {
    const t0 = createDaytimeMs(10, 0);
    const prefs = sanitizeReminderPreferences({ ...DEFAULT_REMINDER_PREFERENCES, waterRemindersEnabled: false });
    let state = syncScheduleWithActivities(null, 'user_1', today, INITIAL_DAILY_ACTIVITIES, prefs, t0);
    state = markRemindersNotified(state, ['act-3', 'act-4', 'act-5'], false, prefs, t0);

    // Complete act-3 and act-4
    const updatedActivities: DailyActivity[] = INITIAL_DAILY_ACTIVITIES.map((a) =>
      a.id === 'act-3' || a.id === 'act-4' ? { ...a, completed: true } : a
    );
    const t30 = t0 + 30 * 60_000;
    state = syncScheduleWithActivities(state, 'user_1', today, updatedActivities, prefs, t30);

    assert.equal(state.habits['act-3'], undefined);
    assert.equal(state.habits['act-4'], undefined);
    const nextEval = evaluateDueReminders(state, updatedActivities, prefs, t30);
    assert.deepEqual(nextEval.dueHabitIds, ['act-5']);
  });

  it('4. Dismissing an alert snoozes it without marking the activity completed', () => {
    const t0 = createDaytimeMs(11, 0);
    const prefs = sanitizeReminderPreferences({
      ...DEFAULT_REMINDER_PREFERENCES,
      intervalMinutes: 30,
      waterRemindersEnabled: false,
    });
    let state = syncScheduleWithActivities(null, 'user_1', today, INITIAL_DAILY_ACTIVITIES, prefs, t0);

    // Dismiss act-3 individually
    state = dismissReminderItem(state, { kind: 'habit', activityId: 'act-3' }, prefs, t0);
    assert.ok(state.habits['act-3']);
    assert.equal(state.habits['act-3'].nextDueAt, t0 + 30 * 60_000);

    // Underlying checklist item remains incomplete
    const act3 = INITIAL_DAILY_ACTIVITIES.find((a) => a.id === 'act-3');
    assert.equal(act3?.completed, false);

    // Notification centre still shows act-3 as pending, with unread cleared for now
    const derived = buildNotificationCenterItems(state, INITIAL_DAILY_ACTIVITIES, prefs, t0);
    const pendingAct3 = derived.pendingItems.find((i) => i.activityId === 'act-3');
    assert.ok(pendingAct3);
    assert.equal(pendingAct3.status, 'pending');
    assert.equal(pendingAct3.isUnread, false);

    // Dismiss all due alerts also keeps items pending
    state = dismissAllDueAlerts(state, prefs, t0);
    const afterDismissAll = buildNotificationCenterItems(state, INITIAL_DAILY_ACTIVITIES, prefs, t0);
    assert.equal(afterDismissAll.unreadCount, 0);
    assert.equal(afterDismissAll.pendingItems.length, 3);
  });

  it('5. Water intake reminders work independently: completing stops current occurrence and schedules next', () => {
    const t0 = createDaytimeMs(10, 0);
    const prefs = sanitizeReminderPreferences({
      ...DEFAULT_REMINDER_PREFERENCES,
      waterRemindersEnabled: true,
      waterIntervalMinutes: 45,
    });

    // Complete all Dinacharya habits so only water is active
    const allDone = INITIAL_DAILY_ACTIVITIES.map((a) => ({ ...a, completed: true }));
    let state = syncScheduleWithActivities(null, 'user_1', today, allDone, prefs, t0);

    const eval1 = evaluateDueReminders(state, allDone, prefs, t0);
    assert.equal(eval1.dueWater, true);
    assert.deepEqual(eval1.dueHabitIds, []);
    assert.equal(eval1.alert?.title, 'Mindful Hydration Pause');

    // Complete current water occurrence
    const completed = completeWaterOccurrence(state, prefs, t0, today);
    state = completed.nextState;
    assert.equal(state.water.completedCountToday, 1);
    assert.equal(state.water.occurrenceId, `water_intake_${today}_2`);
    assert.equal(state.water.nextDueAt, t0 + 45 * 60_000);

    // Immediately after completion: no reminder due
    const evalAfter = evaluateDueReminders(state, allDone, prefs, t0 + 10 * 60_000);
    assert.equal(evalAfter.dueWater, false);
    assert.equal(evalAfter.alert, null);

    // At 45 minutes: next occurrence becomes due
    const evalNext = evaluateDueReminders(state, allDone, prefs, t0 + 45 * 60_000);
    assert.equal(evalNext.dueWater, true);
    assert.ok(evalNext.alert);

    // Disabling water reminders stops water alerts
    const disabledWaterPrefs = sanitizeReminderPreferences({ ...prefs, waterRemindersEnabled: false });
    const evalDisabled = evaluateDueReminders(state, allDone, disabledWaterPrefs, t0 + 45 * 60_000);
    assert.equal(evalDisabled.dueWater, false);
    assert.equal(evalDisabled.alert, null);
  });

  it('6. Preferences, schedule state, and water completions persist per user across refreshes and logins', async () => {
    installMockLocalStorage();

    await saveReminderPreferences('user_A', {
      intervalMinutes: 15,
      waterIntervalMinutes: 90,
      quietHoursStart: '21:30',
      quietHoursEnd: '06:30',
    });

    await saveReminderPreferences('user_B', {
      remindersEnabled: false,
      intervalMinutes: 60,
    });

    const prefsA = await fetchReminderPreferences('user_A');
    const prefsB = await fetchReminderPreferences('user_B');

    assert.equal(prefsA.intervalMinutes, 15);
    assert.equal(prefsA.waterIntervalMinutes, 90);
    assert.equal(prefsA.quietHoursStart, '21:30');
    assert.equal(prefsA.remindersEnabled, true);

    assert.equal(prefsB.remindersEnabled, false);
    assert.equal(prefsB.intervalMinutes, 60);

    // Persist water completion via dailyActivities and verify Dinacharya adherence is unaffected
    const now = createDaytimeMs(14, 0);
    await recordWaterCompletion('user_A', today, `water_intake_${today}_1`);
    await toggleActivityStatus('user_A', 'act-1', today, true);

    const waterDocs = await fetchWaterCompletionsForDate('user_A', today);
    assert.equal(waterDocs.length, 1);
    assert.equal(waterDocs[0].completed, true);

    const allDailyDocs = await fetchDailyActivitiesForDate('user_A', today);
    const mergedDinacharya = mergeDailyActivitiesWithRecords(INITIAL_DAILY_ACTIVITIES, allDailyDocs, false);
    assert.equal(mergedDinacharya.length, INITIAL_DAILY_ACTIVITIES.length);
    assert.equal(calculateAdherence(mergedDinacharya), 20); // 1 of 5 = 20%, water didn't inflate/break adherence

    // Schedule persistence across reload
    const sched = syncScheduleWithActivities(null, 'user_A', today, mergedDinacharya, prefsA, now, waterDocs);
    saveScheduleState(sched);
    const reloadedSched = loadScheduleState('user_A');
    assert.ok(reloadedSched);
    assert.equal(reloadedSched?.water.completedCountToday, 1);
    assert.equal(reloadedSched?.water.occurrenceId, `water_intake_${today}_2`);
  });

  it('7. Quiet hours suppress active alerts overnight and same-day while preserving Notification Centre visibility', () => {
    const prefs = sanitizeReminderPreferences({
      ...DEFAULT_REMINDER_PREFERENCES,
      quietHoursEnabled: true,
      quietHoursStart: '22:00',
      quietHoursEnd: '07:00',
    });

    // 11:15 PM (within overnight quiet hours)
    const lateNight = createDaytimeMs(23, 15);
    assert.equal(isWithinQuietHours(lateNight, prefs), true);

    // 06:30 AM (still within overnight quiet hours)
    const earlyMorning = createDaytimeMs(6, 30);
    assert.equal(isWithinQuietHours(earlyMorning, prefs), true);

    // 07:00 AM (quiet hours ended)
    const wakeTime = createDaytimeMs(7, 0);
    assert.equal(isWithinQuietHours(wakeTime, prefs), false);

    // 02:00 PM (daytime)
    const afternoon = createDaytimeMs(14, 0);
    assert.equal(isWithinQuietHours(afternoon, prefs), false);

    // Alerts are suppressed during quiet hours, but items stay visible in Notification Centre
    const state = syncScheduleWithActivities(null, 'user_1', today, INITIAL_DAILY_ACTIVITIES, prefs, lateNight);
    const quietEval = evaluateDueReminders(state, INITIAL_DAILY_ACTIVITIES, prefs, lateNight);
    assert.equal(quietEval.quietHoursActive, true);
    assert.equal(quietEval.alert, null);

    const center = buildNotificationCenterItems(state, INITIAL_DAILY_ACTIVITIES, prefs, lateNight);
    assert.ok(center.pendingItems.length >= 3);
    assert.equal(center.unreadCount, 0);
    assert.equal(
      center.pendingItems.every((item) => !item.isDue && !item.isUnread),
      true
    );

    // Same-day quiet hours window (e.g. 13:00-15:00)
    const middayPrefs = sanitizeReminderPreferences({
      ...prefs,
      quietHoursStart: '13:00',
      quietHoursEnd: '15:00',
    });
    assert.equal(isWithinQuietHours(createDaytimeMs(14, 0), middayPrefs), true);
    assert.equal(isWithinQuietHours(createDaytimeMs(15, 0), middayPrefs), false);
  });

  it('8. Browser notification permissions and delivery degrade gracefully when unsupported or denied', async () => {
    // Unsupported environment (Node / no Notification global)
    assert.equal(getBrowserNotificationPermission(), 'unsupported');
    assert.equal(await requestBrowserNotificationPermission(), 'unsupported');

    const transportUnsupported = createBrowserNotificationTransport();
    assert.equal(transportUnsupported.isSupported(), false);
    assert.equal(
      transportUnsupported.deliver({ id: '1', title: 'Test', body: 'Body', tag: 'tag' }),
      false
    );

    // Denied environment
    (globalThis as any).window = {};
    (globalThis as any).Notification = class MockNotification {
      static permission = 'denied';
      static async requestPermission() {
        return 'denied';
      }
    };
    assert.equal(getBrowserNotificationPermission(), 'denied');
    assert.equal(await requestBrowserNotificationPermission(), 'denied');
    assert.equal(createBrowserNotificationTransport().isSupported(), false);

    // Granted environment + click handler
    let clickedTarget: string | undefined;
    (globalThis as any).window = { focus: () => {} };
    (globalThis as any).Notification = class MockNotificationGranted {
      static permission = 'granted';
      onclick: (() => void) | null = null;
      constructor(public title: string, public options: any) {
        setTimeout(() => this.onclick?.(), 0);
      }
      close() {}
      static async requestPermission() {
        return 'granted';
      }
    };
    const transportGranted = createBrowserNotificationTransport((id) => {
      clickedTarget = id;
    });
    assert.equal(transportGranted.isSupported(), true);
    const delivered = transportGranted.deliver({
      id: 'n1',
      title: 'Time for Pranayama',
      body: 'Morning ritual',
      tag: 't1',
      targetActivityId: 'act-2',
    });
    assert.equal(delivered, true);
    await new Promise((r) => setTimeout(r, 15));
    assert.equal(clickedTarget, 'act-2');
  });

  it('9. Multiple pending activities never create duplicate Notification Centre items and reset cleanly on date change', () => {
    const tDay1 = createDaytimeMs(15, 0);
    const prefs = sanitizeReminderPreferences(DEFAULT_REMINDER_PREFERENCES);
    const duplicatedActivities = [...INITIAL_DAILY_ACTIVITIES, ...INITIAL_DAILY_ACTIVITIES];
    const stateDay1 = syncScheduleWithActivities(null, 'user_1', '2026-11-26', duplicatedActivities, prefs, tDay1);

    const center = buildNotificationCenterItems(stateDay1, duplicatedActivities, prefs, tDay1);
    const ids = center.pendingItems.map((i) => i.id);
    assert.equal(new Set(ids).size, ids.length, 'No duplicate Notification Centre IDs allowed');

    // Midnight rollover to next date resets schedule cleanly
    const tDay2 = createDaytimeMs(8, 0) + 24 * 60 * 60 * 1000;
    const stateDay2 = syncScheduleWithActivities(stateDay1, 'user_1', '2026-11-27', INITIAL_DAILY_ACTIVITIES, prefs, tDay2);
    assert.equal(stateDay2.dateString, '2026-11-27');
    assert.equal(stateDay2.water.completedCountToday, 0);
    assert.equal(stateDay2.water.occurrenceId, 'water_intake_2026-11-27_1');
  });
});
