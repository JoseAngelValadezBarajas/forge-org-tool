import { useEffect } from 'react';
import {
  cancelDailyNotification,
  getNotificationPermission,
  reminderDelivery,
  scheduleDailyNotification,
  showNotification,
} from '../../platform/nativeNotifications';
import { formatLocalDate } from './quickCapture';
import {
  REMINDERS_CHANGED_EVENT,
  SCHEDULED_REMINDER,
  digestMessage,
  isDigestDue,
  loadReminderPreferences,
  saveReminderPreferences,
} from './reminderPreferences';
import { loadTodayData } from './todayData';
import { groupTodayItems } from './todayModel';

const CHECK_INTERVAL_MS = 60_000;

/**
 * Delivers the morning reminder. On desktop and in a browser it sends one digest a day when it is
 * enabled and its time has passed; mounted once in the application shell, it keeps working while
 * the desktop window is hidden in the tray. On Android it keeps an operating system schedule in
 * step with the preferences instead, because a suspended web page cannot run a timer.
 * It only reads: it never creates a workspace or a project, and a failed check is retried on the
 * next tick instead of being reported.
 */
export function useDueReminders() {
  useEffect(() => {
    // Android: the system fires the reminder, so the app only keeps that schedule in step with the
    // preferences (also after a reinstall, a cleared alarm, or a changed time).
    if (reminderDelivery() === 'scheduled') {
      let syncing = false;
      const sync = async () => {
        if (syncing) return;
        syncing = true;
        try {
          const preferences = loadReminderPreferences();
          const granted = (await getNotificationPermission()) === 'granted';
          if (preferences.enabled && granted) {
            await scheduleDailyNotification(
              preferences.time,
              SCHEDULED_REMINDER.title,
              SCHEDULED_REMINDER.body,
            );
          } else {
            await cancelDailyNotification();
          }
        } catch {
          // Retried the next time the app is opened or the preference changes.
        } finally {
          syncing = false;
        }
      };
      void sync();
      const onWake = () => void sync();
      window.addEventListener('focus', onWake);
      window.addEventListener(REMINDERS_CHANGED_EVENT, onWake);
      return () => {
        window.removeEventListener('focus', onWake);
        window.removeEventListener(REMINDERS_CHANGED_EVENT, onWake);
      };
    }

    let running = false;

    async function check() {
      if (running) return;
      running = true;
      try {
        const preferences = loadReminderPreferences();
        const now = new Date();
        if (!isDigestDue(preferences, now)) return;
        if ((await getNotificationPermission()) !== 'granted') return;

        const todayIso = formatLocalDate(now);
        const loaded = await loadTodayData({ bootstrap: false });
        const groups = groupTodayItems(loaded?.items ?? [], todayIso);
        const message = digestMessage({
          overdue: groups.overdue.length,
          today: groups.today.length,
        });
        const delivered = message ? await showNotification(message.title, message.body) : true;
        if (delivered) saveReminderPreferences({ ...preferences, lastDigestDate: todayIso });
      } catch {
        // Retried on the next tick.
      } finally {
        running = false;
      }
    }

    void check();
    const timer = window.setInterval(() => void check(), CHECK_INTERVAL_MS);
    const onWake = () => void check();
    window.addEventListener('focus', onWake);
    window.addEventListener(REMINDERS_CHANGED_EVENT, onWake);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', onWake);
      window.removeEventListener(REMINDERS_CHANGED_EVENT, onWake);
    };
  }, []);
}
