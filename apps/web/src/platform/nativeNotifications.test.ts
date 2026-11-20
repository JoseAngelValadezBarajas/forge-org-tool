import { afterEach, describe, expect, it, vi } from 'vitest';

const plugin = vi.hoisted(() => ({
  isPermissionGranted: vi.fn(),
  requestPermission: vi.fn(),
  sendNotification: vi.fn(),
  cancel: vi.fn(),
  Schedule: {
    interval: vi.fn((interval: unknown, allowWhileIdle?: boolean) => ({
      kind: 'interval',
      interval,
      allowWhileIdle,
    })),
  },
}));
vi.mock('@tauri-apps/plugin-notification', () => plugin);

import {
  DAILY_REMINDER_ID,
  askNotificationPermission,
  cancelDailyNotification,
  getNotificationPermission,
  notificationsAvailable,
  reminderDelivery,
  scheduleDailyNotification,
  showNotification,
} from './nativeNotifications';

function runtime(kind: 'desktop' | 'android' | 'browser') {
  if (kind === 'browser') {
    delete (window as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
    return;
  }
  (window as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ = {};
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
    kind === 'android' ? 'Mozilla/5.0 (Linux; Android 15)' : 'Mozilla/5.0 (Windows NT 10.0)',
  );
}

afterEach(() => {
  delete (window as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe('native notifications adapter', () => {
  it('uses the Tauri plugin on desktop and watches the data from the running app', async () => {
    runtime('desktop');
    plugin.isPermissionGranted.mockResolvedValue(true);
    plugin.requestPermission.mockResolvedValue('granted');

    expect(notificationsAvailable()).toBe(true);
    expect(reminderDelivery()).toBe('watcher');
    expect(await getNotificationPermission()).toBe('granted');
    expect(await askNotificationPermission()).toBe('granted');
    expect(await showNotification('Title', 'Body')).toBe(true);
    expect(plugin.sendNotification).toHaveBeenCalledWith({ title: 'Title', body: 'Body' });
  });

  it('does not show a notification without permission', async () => {
    runtime('desktop');
    plugin.isPermissionGranted.mockResolvedValue(false);
    expect(await showNotification('Title', 'Body')).toBe(false);
    expect(plugin.sendNotification).not.toHaveBeenCalled();
  });

  it('uses the same plugin on Android, where the system schedules the reminder', async () => {
    runtime('android');
    plugin.isPermissionGranted.mockResolvedValue(true);
    plugin.requestPermission.mockResolvedValue('granted');

    expect(notificationsAvailable()).toBe(true);
    expect(reminderDelivery()).toBe('scheduled');
    expect(await getNotificationPermission()).toBe('granted');
    expect(await askNotificationPermission()).toBe('granted');
    expect(await showNotification('Title', 'Body')).toBe(true);
  });

  it('uses the Web Notifications API in a browser and watches from the open page', async () => {
    runtime('browser');
    const created: Array<{ title: string; options?: NotificationOptions }> = [];
    class FakeNotification {
      static permission = 'granted';
      static requestPermission = vi.fn().mockResolvedValue('granted');
      constructor(title: string, options?: NotificationOptions) {
        created.push({ title, options });
      }
    }
    vi.stubGlobal('Notification', FakeNotification);

    expect(notificationsAvailable()).toBe(true);
    expect(reminderDelivery()).toBe('watcher');
    expect(await getNotificationPermission()).toBe('granted');
    expect(await showNotification('Title', 'Body')).toBe(true);
    expect(created).toEqual([{ title: 'Title', options: { body: 'Body' } }]);
    expect(plugin.sendNotification).not.toHaveBeenCalled();
  });

  it('reports unsupported when a browser has no Notification API', async () => {
    runtime('browser');
    vi.stubGlobal('Notification', undefined);
    expect(notificationsAvailable()).toBe(false);
    expect(reminderDelivery()).toBe('none');
    expect(await getNotificationPermission()).toBe('unsupported');
    expect(await askNotificationPermission()).toBe('unsupported');
  });
});

describe('daily scheduled reminder (Android)', () => {
  it('replaces the previous schedule with a daily one at the chosen time of day', async () => {
    runtime('android');
    plugin.isPermissionGranted.mockResolvedValue(true);

    const scheduled = await scheduleDailyNotification('07:45', 'FORGE', 'Open FORGE');

    expect(scheduled).toBe(true);
    expect(plugin.cancel).toHaveBeenCalledWith([DAILY_REMINDER_ID]);
    expect(plugin.Schedule.interval).toHaveBeenCalledWith({ hour: 7, minute: 45, second: 0 }, true);
    expect(plugin.sendNotification).toHaveBeenCalledWith({
      id: DAILY_REMINDER_ID,
      title: 'FORGE',
      body: 'Open FORGE',
      schedule: {
        kind: 'interval',
        interval: { hour: 7, minute: 45, second: 0 },
        allowWhileIdle: true,
      },
    });
    // The old schedule is removed before the new one is set, so only one ever exists.
    expect(plugin.cancel.mock.invocationCallOrder[0]).toBeLessThan(
      plugin.sendNotification.mock.invocationCallOrder[0],
    );
  });

  it('schedules nothing without permission, with a bad time, or outside Android', async () => {
    runtime('android');
    plugin.isPermissionGranted.mockResolvedValue(false);
    expect(await scheduleDailyNotification('09:00', 'a', 'b')).toBe(false);

    plugin.isPermissionGranted.mockResolvedValue(true);
    expect(await scheduleDailyNotification('9:00', 'a', 'b')).toBe(false);
    expect(await scheduleDailyNotification('24:00', 'a', 'b')).toBe(false);

    runtime('desktop');
    expect(await scheduleDailyNotification('09:00', 'a', 'b')).toBe(false);
    expect(plugin.sendNotification).not.toHaveBeenCalled();
    expect(plugin.cancel).not.toHaveBeenCalled();
  });

  it('cancels the schedule on Android only', async () => {
    runtime('android');
    await cancelDailyNotification();
    expect(plugin.cancel).toHaveBeenCalledWith([DAILY_REMINDER_ID]);

    plugin.cancel.mockClear();
    runtime('desktop');
    await cancelDailyNotification();
    expect(plugin.cancel).not.toHaveBeenCalled();
  });
});
