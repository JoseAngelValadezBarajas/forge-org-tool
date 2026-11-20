import {
  Schedule,
  cancel,
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from '@tauri-apps/plugin-notification';
import { getForgeRuntimePlatform } from '../runtimePlatform';

/**
 * Platform adapter: system notifications.
 *
 * Desktop and Android use the Tauri notification plugin, whose capability is limited to checking
 * permission, asking for it, showing a notification and (on Android) scheduling and cancelling the
 * daily reminder. In a browser they use the Web Notifications API. Features call this instead of
 * importing `@tauri-apps/*`.
 */
export type NotificationPermissionState = 'granted' | 'denied' | 'default' | 'unsupported';

/**
 * How the daily reminder reaches the user:
 * - `watcher`: the app keeps running (desktop tray, an open browser tab) and checks the data;
 * - `scheduled`: the operating system fires it at a time of day, even with the app closed;
 * - `none`: notifications do not exist here.
 */
export type ReminderDelivery = 'watcher' | 'scheduled' | 'none';

/** Stable id so rescheduling replaces the reminder instead of adding another one. */
export const DAILY_REMINDER_ID = 424201;

function usesPlugin(): boolean {
  const platform = getForgeRuntimePlatform();
  return platform === 'desktop' || platform === 'android';
}

function browserNotifications(): typeof Notification | null {
  return typeof Notification === 'undefined' ? null : Notification;
}

export function notificationsAvailable(): boolean {
  return usesPlugin() || browserNotifications() !== null;
}

export function reminderDelivery(): ReminderDelivery {
  if (getForgeRuntimePlatform() === 'android') return 'scheduled';
  return notificationsAvailable() ? 'watcher' : 'none';
}

export async function getNotificationPermission(): Promise<NotificationPermissionState> {
  if (usesPlugin()) return (await isPermissionGranted()) ? 'granted' : 'default';
  const browser = browserNotifications();
  return browser ? browser.permission : 'unsupported';
}

/** Must be called from a user gesture in a browser. Resolves to the resulting state. */
export async function askNotificationPermission(): Promise<NotificationPermissionState> {
  if (usesPlugin()) return requestPermission();
  const browser = browserNotifications();
  return browser ? browser.requestPermission() : 'unsupported';
}

/** Shows a notification when permission is already granted. Resolves to whether it was shown. */
export async function showNotification(title: string, body: string): Promise<boolean> {
  if ((await getNotificationPermission()) !== 'granted') return false;
  if (usesPlugin()) {
    sendNotification({ title, body });
    return true;
  }
  const browser = browserNotifications();
  if (!browser) return false;
  new browser(title, { body });
  return true;
}

/** Splits `HH:MM`; `null` when it is not a valid time of day. */
function parseTime(time: string): { hour: number; minute: number } | null {
  const match = /^([01][0-9]|2[0-3]):([0-5][0-9])$/.exec(time);
  return match ? { hour: Number(match[1]), minute: Number(match[2]) } : null;
}

/**
 * Asks the operating system to show a notification every day at `time` (Android only). It uses the
 * plugin's "date matches" schedule, which the system re-arms after each firing and after a reboot.
 * Android may deliver it a little late in battery saver or Doze; it is not an alarm clock.
 */
export async function scheduleDailyNotification(
  time: string,
  title: string,
  body: string,
): Promise<boolean> {
  const at = parseTime(time);
  if (getForgeRuntimePlatform() !== 'android' || !at) return false;
  if ((await getNotificationPermission()) !== 'granted') return false;
  await cancel([DAILY_REMINDER_ID]);
  sendNotification({
    id: DAILY_REMINDER_ID,
    title,
    body,
    schedule: Schedule.interval({ hour: at.hour, minute: at.minute, second: 0 }, true),
  });
  return true;
}

export async function cancelDailyNotification(): Promise<void> {
  if (getForgeRuntimePlatform() !== 'android') return;
  await cancel([DAILY_REMINDER_ID]);
}
