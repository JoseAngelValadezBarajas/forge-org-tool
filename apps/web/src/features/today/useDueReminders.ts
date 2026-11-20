import { useEffect } from 'react';
import { getNotificationPermission, showNotification } from '../../platform/nativeNotifications';
import { formatLocalDate } from './quickCapture';
import {
  REMINDERS_CHANGED_EVENT,
  digestMessage,
  isDigestDue,
  loadReminderPreferences,
  saveReminderPreferences,
} from './reminderPreferences';
import { loadTodayData } from './todayData';
import { groupTodayItems } from './todayModel';

const CHECK_INTERVAL_MS = 60_000;

/**
 * Sends the morning digest once a day when it is enabled and its time has passed. Mounted once
 * in the application shell so it keeps working while the desktop window is hidden in the tray.
 * It only reads: it never creates a workspace or a project, and a failed check is retried on the
 * next tick instead of being reported.
 */
export function useDueReminders() {
  useEffect(() => {
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
