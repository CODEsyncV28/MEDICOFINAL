import React, { useEffect, useRef, useState } from 'react';
import {
  Bell,
  BellOff,
  Check,
  CheckCircle2,
  Clock,
  Droplets,
  Moon,
  Settings,
  Sparkles,
  X,
  AlertCircle,
} from 'lucide-react';
import { useOptionalReminders } from '../../contexts/ReminderContext';
import { formatReminderTimeLabel } from '../../utils/reminderLogic';

type TabId = 'pending' | 'completed' | 'settings';

export const NotificationCentre: React.FC = () => {
  const ctx = useOptionalReminders();
  const [activeTab, setActiveTab] = useState<TabId>('pending');
  const [permissionNotice, setPermissionNotice] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ctx?.isNotificationCentreOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        ctx.setNotificationCentreOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        ctx.setNotificationCentreOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [ctx]);

  if (!ctx) return null;

  const {
    preferences,
    pendingItems,
    completedItems,
    unreadCount,
    quietHoursActive,
    browserPermission,
    isNotificationCentreOpen,
    setNotificationCentreOpen,
    updatePreferences,
    toggleBrowserNotifications,
    completeHabitFromReminder,
    completeWaterFromReminder,
    dismissItem,
    dismissAllAlerts,
    navigateToActivity,
  } = ctx;

  const handleBrowserToggle = async () => {
    setPermissionNotice(null);
    const nextEnable = !preferences.browserNotificationsEnabled;
    const perm = await toggleBrowserNotifications(nextEnable);
    if (nextEnable && perm === 'denied') {
      setPermissionNotice(
        'Browser notification permission was denied. In-app reminders remain active, and you can re-enable browser alerts in site settings.'
      );
    } else if (nextEnable && perm === 'unsupported') {
      setPermissionNotice('Browser notifications are not supported in this environment.');
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setNotificationCentreOpen(!isNotificationCentreOpen)}
        aria-label={
          unreadCount > 0
            ? `Open notification centre (${unreadCount} unread)`
            : 'Open notification centre'
        }
        aria-expanded={isNotificationCentreOpen}
        data-testid="notification-centre-trigger"
        className="relative p-2 rounded-xl border border-[#CBD5E1] bg-white hover:bg-[#F1F5F9] text-[#0F172A] hover:text-[#0284C7] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0284C7]"
        title="Wellness Notification Centre"
      >
        <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
        {unreadCount > 0 && (
          <span
            data-testid="notification-unread-badge"
            className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#0284C7] text-white text-[10px] font-bold flex items-center justify-center shadow-xs tabular-nums"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isNotificationCentreOpen && (
        <div
          role="dialog"
          aria-label="Wellness Notification Centre"
          data-testid="notification-centre-panel"
          className="fixed sm:absolute right-2 sm:right-0 left-2 sm:left-auto top-20 sm:top-full sm:mt-2 w-auto sm:w-[400px] max-h-[82vh] bg-white rounded-2xl border border-[#E2E8F0] shadow-xl z-50 flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="px-4 py-3.5 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif font-bold text-base text-[#0F172A]">
                  Wellness Reminders
                </h3>
                {quietHoursActive && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#F1F5F9] text-[#475569] border border-[#CBD5E1]">
                    <Moon className="w-2.5 h-2.5 text-[#0284C7]" />
                    <span>Quiet Hours</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#64748B]">
                {preferences.remindersEnabled
                  ? `Gentle check-ins every ${preferences.intervalMinutes} min`
                  : 'Reminders are currently paused'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setNotificationCentreOpen(false)}
              aria-label="Close notification centre"
              className="p-1.5 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-[#E2E8F0]/60 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="px-4 pt-2.5 pb-2 border-b border-[#E2E8F0] flex items-center gap-1.5 bg-white text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('pending')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === 'pending'
                  ? 'bg-[#0284C7] text-white'
                  : 'bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]'
              }`}
            >
              <span>Pending</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] tabular-nums ${
                  activeTab === 'pending'
                    ? 'bg-white/20 text-white'
                    : 'bg-white text-[#0F172A]'
                }`}
              >
                {pendingItems.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('completed')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === 'completed'
                  ? 'bg-[#0D9488] text-white'
                  : 'bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]'
              }`}
            >
              <span>Completed</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] tabular-nums ${
                  activeTab === 'completed'
                    ? 'bg-white/20 text-white'
                    : 'bg-white text-[#0F172A]'
                }`}
              >
                {completedItems.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`ml-auto px-2.5 py-1.5 rounded-lg font-semibold transition-colors inline-flex items-center gap-1 ${
                activeTab === 'settings'
                  ? 'bg-[#0284C7] text-white'
                  : 'bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]'
              }`}
              aria-label="Reminder settings"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Settings</span>
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F8FAFC]">
            {activeTab === 'pending' && (
              <>
                {!preferences.remindersEnabled && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between gap-2">
                    <span>Daily reminders are paused.</span>
                    <button
                      type="button"
                      onClick={() => updatePreferences({ remindersEnabled: true })}
                      className="px-2.5 py-1 rounded-lg bg-amber-600 text-white font-semibold hover:bg-amber-700"
                    >
                      Resume
                    </button>
                  </div>
                )}

                {unreadCount > 0 && (
                  <div className="flex items-center justify-between text-[11px] text-[#475569] px-0.5">
                    <span>
                      <strong>{unreadCount}</strong> alert{unreadCount === 1 ? '' : 's'} ready for check-in
                    </span>
                    <button
                      type="button"
                      onClick={dismissAllAlerts}
                      className="font-semibold text-[#0284C7] hover:underline"
                    >
                      Dismiss alerts for now
                    </button>
                  </div>
                )}

                {pendingItems.length === 0 ? (
                  <div className="p-6 rounded-xl bg-white border border-[#E2E8F0] text-center space-y-2">
                    <div className="w-10 h-10 rounded-full bg-[#CCFBF1] text-[#0D9488] flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <p className="font-serif font-bold text-sm text-[#0F172A]">
                      All Daily Rituals Completed
                    </p>
                    <p className="text-xs text-[#64748B]">
                      You have fulfilled all scheduled Dinacharya habits for today.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {pendingItems.map((item) => (
                      <div
                        key={item.id}
                        data-testid={`reminder-item-${item.kind === 'water' ? 'water' : item.activityId}`}
                        className={`p-3.5 rounded-xl border transition-all space-y-2.5 ${
                          item.isUnread
                            ? 'bg-white border-[#0284C7] shadow-xs'
                            : 'bg-white border-[#E2E8F0]'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                              item.kind === 'water'
                                ? 'bg-[#CCFBF1] text-[#0D9488]'
                                : 'bg-[#F1F5F9] text-[#0284C7]'
                            }`}
                          >
                            {item.kind === 'water' ? (
                              <Droplets className="w-4 h-4" />
                            ) : (
                              <Sparkles className="w-4 h-4" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <button
                              type="button"
                              onClick={() => navigateToActivity(item.activityId)}
                              className="text-left group w-full focus:outline-none"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-semibold text-xs sm:text-sm text-[#0F172A] group-hover:text-[#0284C7] transition-colors truncate">
                                  {item.title}
                                </span>
                                {item.isUnread && (
                                  <span className="shrink-0 px-1.5 py-0.5 rounded bg-[#CCFBF1] text-[#0F766E] text-[10px] font-bold">
                                    Due
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-[#64748B] mt-0.5">{item.subtitle}</p>
                            </button>

                            <div className="flex items-center gap-2 mt-1.5 text-[11px] text-[#475569]">
                              <Clock className="w-3 h-3 text-[#0284C7] shrink-0" />
                              <span>
                                {!preferences.remindersEnabled
                                  ? 'Reminders paused'
                                  : quietHoursActive && !item.isUnread
                                  ? `Paused during quiet hours (resumes ${preferences.quietHoursEnd})`
                                  : item.lastNotifiedAt !== null && item.isUnread
                                  ? `Reminded at ${formatReminderTimeLabel(item.lastNotifiedAt)} · Next ${formatReminderTimeLabel(item.scheduledAt)}`
                                  : `Next reminder at ${formatReminderTimeLabel(item.scheduledAt)}`}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-1 border-t border-[#F1F5F9]">
                          <button
                            type="button"
                            onClick={() =>
                              dismissItem(
                                item.kind === 'water'
                                  ? { kind: 'water' }
                                  : { kind: 'habit', activityId: item.activityId! }
                              )
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium text-[#475569] bg-[#F1F5F9] hover:bg-[#E2E8F0] transition-colors"
                          >
                            <BellOff className="w-3 h-3" />
                            <span>Dismiss</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              item.kind === 'water'
                                ? completeWaterFromReminder()
                                : completeHabitFromReminder(item.activityId!)
                            }
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-[11px] font-semibold text-white bg-[#0284C7] hover:bg-[#0369A1] transition-colors"
                          >
                            <Check className="w-3 h-3" />
                            <span>Mark Completed</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {activeTab === 'completed' && (
              <>
                {completedItems.length === 0 ? (
                  <div className="p-6 rounded-xl bg-white border border-[#E2E8F0] text-center space-y-1.5">
                    <p className="font-serif font-bold text-sm text-[#0F172A]">
                      No Completed Rituals Yet Today
                    </p>
                    <p className="text-xs text-[#64748B]">
                      Completed Dinacharya habits and hydration check-ins appear here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {completedItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => navigateToActivity(item.activityId)}
                        className="w-full text-left p-3 rounded-xl bg-[#CCFBF1]/35 border border-[#99F6E4] flex items-center gap-3 hover:bg-[#CCFBF1]/55 transition-colors"
                      >
                        <CheckCircle2 className="w-4 h-4 text-[#0D9488] shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-[#0F766E] truncate">
                            {item.title}
                          </p>
                          <p className="text-[11px] text-[#475569] truncate">
                            {item.subtitle}
                            {item.completedAt ? ` · ${formatReminderTimeLabel(item.completedAt)}` : ''}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            {activeTab === 'settings' && (
              <div className="space-y-3 text-xs">
                {/* Master Reminders Toggle */}
                <div className="p-3.5 rounded-xl bg-white border border-[#E2E8F0] space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-[#0F172A]">Enable Wellness Reminders</p>
                      <p className="text-[11px] text-[#64748B]">
                        Gently repeat reminders until daily rituals are marked complete
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      aria-label="Enable Wellness Reminders"
                      checked={preferences.remindersEnabled}
                      onChange={(e) => updatePreferences({ remindersEnabled: e.target.checked })}
                      className="w-4 h-4 accent-[#0284C7] rounded cursor-pointer"
                    />
                  </div>

                  <div className="pt-2 border-t border-[#F1F5F9] flex items-center justify-between gap-2">
                    <label htmlFor="habit-reminder-interval" className="font-medium text-[#0F172A]">
                      Dinacharya reminder interval
                    </label>
                    <select
                      id="habit-reminder-interval"
                      value={preferences.intervalMinutes}
                      disabled={!preferences.remindersEnabled}
                      onChange={(e) =>
                        updatePreferences({ intervalMinutes: Number(e.target.value) })
                      }
                      className="px-2.5 py-1.5 rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] text-xs font-medium text-[#0F172A] disabled:opacity-50"
                    >
                      <option value={15}>Every 15 minutes</option>
                      <option value={30}>Every 30 minutes</option>
                      <option value={45}>Every 45 minutes</option>
                      <option value={60}>Every 60 minutes</option>
                      <option value={120}>Every 2 hours</option>
                    </select>
                  </div>
                </div>

                {/* Water Intake Reminders */}
                <div className="p-3.5 rounded-xl bg-white border border-[#E2E8F0] space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-[#0F172A] flex items-center gap-1.5">
                        <Droplets className="w-3.5 h-3.5 text-[#0D9488]" />
                        <span>Water Intake Reminders</span>
                      </p>
                      <p className="text-[11px] text-[#64748B]">
                        Mindful hydration prompts without fixed daily volume targets
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      aria-label="Enable Water Intake Reminders"
                      checked={preferences.waterRemindersEnabled}
                      disabled={!preferences.remindersEnabled}
                      onChange={(e) =>
                        updatePreferences({ waterRemindersEnabled: e.target.checked })
                      }
                      className="w-4 h-4 accent-[#0D9488] rounded cursor-pointer"
                    />
                  </div>

                  <div className="pt-2 border-t border-[#F1F5F9] flex items-center justify-between gap-2">
                    <label htmlFor="water-reminder-interval" className="font-medium text-[#0F172A]">
                      Water reminder interval
                    </label>
                    <select
                      id="water-reminder-interval"
                      value={preferences.waterIntervalMinutes}
                      disabled={!preferences.remindersEnabled || !preferences.waterRemindersEnabled}
                      onChange={(e) =>
                        updatePreferences({ waterIntervalMinutes: Number(e.target.value) })
                      }
                      className="px-2.5 py-1.5 rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] text-xs font-medium text-[#0F172A] disabled:opacity-50"
                    >
                      <option value={30}>Every 30 minutes</option>
                      <option value={45}>Every 45 minutes</option>
                      <option value={60}>Every 60 minutes</option>
                      <option value={90}>Every 90 minutes</option>
                      <option value={120}>Every 2 hours</option>
                    </select>
                  </div>
                </div>

                {/* Quiet Hours */}
                <div className="p-3.5 rounded-xl bg-white border border-[#E2E8F0] space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-[#0F172A] flex items-center gap-1.5">
                        <Moon className="w-3.5 h-3.5 text-[#0284C7]" />
                        <span>Quiet Hours</span>
                      </p>
                      <p className="text-[11px] text-[#64748B]">
                        Pause active alerts during rest and sleep hours
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      aria-label="Enable Quiet Hours"
                      checked={preferences.quietHoursEnabled}
                      onChange={(e) =>
                        updatePreferences({ quietHoursEnabled: e.target.checked })
                      }
                      className="w-4 h-4 accent-[#0284C7] rounded cursor-pointer"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#F1F5F9]">
                    <div>
                      <label htmlFor="quiet-start" className="block text-[11px] text-[#64748B] mb-1">
                        Start time
                      </label>
                      <input
                        id="quiet-start"
                        type="time"
                        value={preferences.quietHoursStart}
                        disabled={!preferences.quietHoursEnabled}
                        onChange={(e) =>
                          updatePreferences({ quietHoursStart: e.target.value })
                        }
                        className="w-full px-2 py-1.5 rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] text-xs text-[#0F172A] disabled:opacity-50"
                      />
                    </div>
                    <div>
                      <label htmlFor="quiet-end" className="block text-[11px] text-[#64748B] mb-1">
                        End time
                      </label>
                      <input
                        id="quiet-end"
                        type="time"
                        value={preferences.quietHoursEnd}
                        disabled={!preferences.quietHoursEnabled}
                        onChange={(e) =>
                          updatePreferences({ quietHoursEnd: e.target.value })
                        }
                        className="w-full px-2 py-1.5 rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] text-xs text-[#0F172A] disabled:opacity-50"
                      />
                    </div>
                  </div>
                </div>

                {/* Notification Channels */}
                <div className="p-3.5 rounded-xl bg-white border border-[#E2E8F0] space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-[#0F172A]">In-App Alert Banner</p>
                      <p className="text-[11px] text-[#64748B]">
                        Display gentle consolidated banners while using the app
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      aria-label="Enable In-App Alert Banner"
                      checked={preferences.inAppNotificationsEnabled}
                      onChange={(e) =>
                        updatePreferences({ inAppNotificationsEnabled: e.target.checked })
                      }
                      className="w-4 h-4 accent-[#0284C7] rounded cursor-pointer"
                    />
                  </div>

                  <div className="pt-2 border-t border-[#F1F5F9] space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold text-[#0F172A]">Browser Notifications</p>
                        <p className="text-[11px] text-[#64748B]">
                          Alert in background tabs while your browser is running
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        aria-label="Enable Browser Notifications"
                        checked={
                          preferences.browserNotificationsEnabled &&
                          browserPermission === 'granted'
                        }
                        disabled={browserPermission === 'unsupported'}
                        onChange={handleBrowserToggle}
                        className="w-4 h-4 accent-[#0284C7] rounded cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#64748B]">Permission status:</span>
                      <span
                        className={`px-2 py-0.5 rounded font-semibold ${
                          browserPermission === 'granted'
                            ? 'bg-[#CCFBF1] text-[#0F766E]'
                            : browserPermission === 'denied'
                            ? 'bg-[#FFDAD6] text-[#93000A]'
                            : 'bg-[#F1F5F9] text-[#475569]'
                        }`}
                      >
                        {browserPermission === 'granted'
                          ? 'Granted'
                          : browserPermission === 'denied'
                          ? 'Denied'
                          : browserPermission === 'unsupported'
                          ? 'Unsupported'
                          : 'Not Requested'}
                      </span>
                    </div>

                    {permissionNotice && (
                      <div
                        role="alert"
                        className="p-2.5 rounded-lg bg-[#FFDAD6] text-[#93000A] text-[11px] flex items-start gap-1.5"
                      >
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>{permissionNotice}</span>
                      </div>
                    )}

                    <p className="text-[10px] text-[#64748B] leading-relaxed">
                      Browser alerts work across open or inactive tabs while your browser is running. Delivery when the browser is fully closed requires a future push-service worker setup.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
