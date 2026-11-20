import { useEffect, useState } from 'react';
import {
  askNotificationPermission,
  getNotificationPermission,
  notificationsAvailable,
  reminderDelivery,
  showNotification,
  type NotificationPermissionState,
} from '../../platform/nativeNotifications';
import {
  isValidTime,
  loadReminderPreferences,
  saveReminderPreferences,
  type ReminderPreferences,
} from './reminderPreferences';

/** State and actions behind the reminder switch on the Today page. */
export function useReminderSettings() {
  const [preferences, setPreferences] = useState<ReminderPreferences>(loadReminderPreferences);
  const [permission, setPermission] = useState<NotificationPermissionState>('default');
  const [message, setMessage] = useState('');
  const available = notificationsAvailable();
  const delivery = reminderDelivery();

  useEffect(() => {
    let current = true;
    if (!available) return undefined;
    void getNotificationPermission()
      .then((state) => {
        if (current) setPermission(state);
      })
      .catch(() => {
        if (current) setPermission('unsupported');
      });
    return () => {
      current = false;
    };
  }, [available]);

  function update(next: ReminderPreferences) {
    setPreferences(next);
    saveReminderPreferences(next);
  }

  async function setEnabled(enabled: boolean) {
    setMessage('');
    if (!enabled) {
      update({ ...preferences, enabled: false });
      return;
    }
    let state = permission;
    if (state !== 'granted') {
      try {
        state = await askNotificationPermission();
      } catch {
        state = 'unsupported';
      }
      setPermission(state);
    }
    if (state !== 'granted') {
      setMessage(
        state === 'denied'
          ? 'Notifications are blocked. Allow them for FORGE in your system settings.'
          : 'Notifications are not available here.',
      );
      return;
    }
    // Enabling resets today's digest so the user sees it work right away when the time has passed.
    update({ ...preferences, enabled: true, lastDigestDate: null });
  }

  function setTime(time: string) {
    if (isValidTime(time)) update({ ...preferences, time });
  }

  async function sendTest() {
    setMessage('');
    const shown = await showNotification(
      'FORGE reminders are on',
      'You will see what is due each morning.',
    );
    setMessage(shown ? 'Test sent.' : 'Could not show a notification. Check system settings.');
  }

  return { available, delivery, preferences, permission, message, setEnabled, setTime, sendTest };
}
