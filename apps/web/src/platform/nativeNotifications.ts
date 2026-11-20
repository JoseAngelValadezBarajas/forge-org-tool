import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from '@tauri-apps/plugin-notification';
import { getForgeRuntimePlatform } from '../runtimePlatform';

/**
 * Platform adapter: system notifications.
 *
 * Inside the desktop host they go through the Tauri notification plugin, whose capability is
 * limited to checking permission, asking for it and showing a notification. In a browser they
 * use the Web Notifications API. Features call this instead of importing `@tauri-apps/*`.
 */
export type NotificationPermissionState = 'granted' | 'denied' | 'default' | 'unsupported';

/** The plugin is registered only by the desktop host; the Android shell has no such command. */
function isDesktop(): boolean {
  return getForgeRuntimePlatform() === 'desktop';
}

function browserNotifications(): typeof Notification | null {
  return typeof Notification === 'undefined' ? null : Notification;
}

export function notificationsAvailable(): boolean {
  const platform = getForgeRuntimePlatform();
  if (platform === 'android') return false;
  return platform === 'desktop' || browserNotifications() !== null;
}

export async function getNotificationPermission(): Promise<NotificationPermissionState> {
  if (getForgeRuntimePlatform() === 'android') return 'unsupported';
  if (isDesktop()) return (await isPermissionGranted()) ? 'granted' : 'default';
  const browser = browserNotifications();
  return browser ? browser.permission : 'unsupported';
}

/** Must be called from a user gesture in a browser. Resolves to the resulting state. */
export async function askNotificationPermission(): Promise<NotificationPermissionState> {
  if (isDesktop()) return requestPermission();
  const browser = browserNotifications();
  return browser ? browser.requestPermission() : 'unsupported';
}

/** Shows a notification when permission is already granted. Resolves to whether it was shown. */
export async function showNotification(title: string, body: string): Promise<boolean> {
  if ((await getNotificationPermission()) !== 'granted') return false;
  if (isDesktop()) {
    sendNotification({ title, body });
    return true;
  }
  const browser = browserNotifications();
  if (!browser) return false;
  new browser(title, { body });
  return true;
}
