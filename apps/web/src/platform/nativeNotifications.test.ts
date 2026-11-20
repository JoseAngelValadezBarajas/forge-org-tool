import { afterEach, describe, expect, it, vi } from 'vitest';

const plugin = vi.hoisted(() => ({
  isPermissionGranted: vi.fn(),
  requestPermission: vi.fn(),
  sendNotification: vi.fn(),
}));
vi.mock('@tauri-apps/plugin-notification', () => plugin);

import {
  askNotificationPermission,
  getNotificationPermission,
  notificationsAvailable,
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
  it('uses the Tauri plugin on desktop', async () => {
    runtime('desktop');
    plugin.isPermissionGranted.mockResolvedValue(true);
    plugin.requestPermission.mockResolvedValue('granted');

    expect(notificationsAvailable()).toBe(true);
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

  it('is unavailable in the Android shell, which has no such plugin', async () => {
    runtime('android');
    expect(notificationsAvailable()).toBe(false);
    expect(await getNotificationPermission()).toBe('unsupported');
    expect(await showNotification('Title', 'Body')).toBe(false);
    expect(plugin.isPermissionGranted).not.toHaveBeenCalled();
  });

  it('uses the Web Notifications API in a browser', async () => {
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
    expect(await getNotificationPermission()).toBe('granted');
    expect(await showNotification('Title', 'Body')).toBe(true);
    expect(created).toEqual([{ title: 'Title', options: { body: 'Body' } }]);
    expect(plugin.sendNotification).not.toHaveBeenCalled();
  });

  it('reports unsupported when a browser has no Notification API', async () => {
    runtime('browser');
    vi.stubGlobal('Notification', undefined);
    expect(notificationsAvailable()).toBe(false);
    expect(await getNotificationPermission()).toBe('unsupported');
    expect(await askNotificationPermission()).toBe('unsupported');
  });
});
