import React from 'react';
import { Bell, Check, Droplets, X, ArrowRight } from 'lucide-react';
import { useOptionalReminders } from '../../contexts/ReminderContext';

export const InAppReminderBanner: React.FC = () => {
  const ctx = useOptionalReminders();
  if (!ctx) return null;

  const {
    activeAlert,
    preferences,
    quietHoursActive,
    completeHabitFromReminder,
    completeWaterFromReminder,
    dismissActiveAlertBanner,
    setNotificationCentreOpen,
    navigateToActivity,
  } = ctx;

  if (
    !activeAlert ||
    !preferences.remindersEnabled ||
    !preferences.inAppNotificationsEnabled ||
    quietHoursActive
  ) {
    return null;
  }

  const singleHabitId =
    activeAlert.dueHabitIds.length === 1 && !activeAlert.includesWater
      ? activeAlert.dueHabitIds[0]
      : null;

  return (
    <div
      role="region"
      aria-label="Wellness Reminder Alert"
      data-testid="in-app-reminder-banner"
      className="fixed bottom-6 left-4 right-4 sm:right-auto sm:left-6 sm:max-w-sm z-40 bg-white border border-[#99F6E4] rounded-2xl shadow-lg p-4 space-y-3"
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-[#CCFBF1] text-[#0D9488] flex items-center justify-center shrink-0">
          {activeAlert.includesWater && activeAlert.dueHabitIds.length === 0 ? (
            <Droplets className="w-4 h-4" />
          ) : (
            <Bell className="w-4 h-4 text-[#0284C7]" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-serif font-bold text-[#0F172A] leading-snug">
            {activeAlert.title}
          </p>
          <p className="text-[11px] text-[#475569] mt-0.5 leading-relaxed">
            {activeAlert.body}
          </p>
        </div>
        <button
          type="button"
          onClick={dismissActiveAlertBanner}
          aria-label="Dismiss reminder alert"
          className="p-1 text-[#64748B] hover:text-[#0F172A] rounded-lg hover:bg-[#F1F5F9] transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 pt-1 border-t border-[#F1F5F9]">
        <button
          type="button"
          onClick={dismissActiveAlertBanner}
          className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-[#475569] bg-[#F1F5F9] hover:bg-[#E2E8F0] transition-colors"
        >
          Remind Later
        </button>

        {activeAlert.includesWater && (
          <button
            type="button"
            onClick={() => completeWaterFromReminder()}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-[#0F766E] bg-[#CCFBF1] hover:bg-[#99F6E4] transition-colors"
          >
            <Droplets className="w-3 h-3" />
            <span>Water Done</span>
          </button>
        )}

        {singleHabitId ? (
          <>
            <button
              type="button"
              onClick={() => navigateToActivity(singleHabitId)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-[#0284C7] bg-[#F1F5F9] hover:bg-[#E2E8F0] transition-colors"
            >
              <span>View</span>
              <ArrowRight className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => completeHabitFromReminder(singleHabitId)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white bg-[#0284C7] hover:bg-[#0369A1] transition-colors"
            >
              <Check className="w-3 h-3" />
              <span>Mark Completed</span>
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setNotificationCentreOpen(true)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white bg-[#0284C7] hover:bg-[#0369A1] transition-colors"
          >
            <span>Open Reminders</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
};
