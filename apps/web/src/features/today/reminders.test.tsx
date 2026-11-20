import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Feature } from '@forge-org/api-client';
import { ReminderSettings } from './ReminderSettings';
import { REMINDER_STORAGE_KEY, loadReminderPreferences } from './reminderPreferences';
import { useDueReminders } from './useDueReminders';
import type { TodayItem } from './todayModel';

const platform = vi.hoisted(() => ({
  notificationsAvailable: vi.fn(),
  getNotificationPermission: vi.fn(),
  askNotificationPermission: vi.fn(),
  showNotification: vi.fn(),
  reminderDelivery: vi.fn(),
  scheduleDailyNotification: vi.fn(),
  cancelDailyNotification: vi.fn(),
}));
vi.mock('../../platform/nativeNotifications', () => platform);

const data = vi.hoisted(() => ({ loadTodayData: vi.fn() }));
vi.mock('./todayData', () => data);

function item(id: string, due_date: string | null, status = 'backlog'): TodayItem {
  const feature = {
    id,
    title: id,
    status,
    priority: 'medium',
    due_date,
    created_at: 'a',
  } as Feature;
  return { feature, workspaceId: 'w1', projectId: 'p1', projectName: 'Inbox' };
}

beforeEach(() => {
  localStorage.clear();
  platform.notificationsAvailable.mockReturnValue(true);
  platform.reminderDelivery.mockReturnValue('watcher');
  platform.scheduleDailyNotification.mockResolvedValue(true);
  platform.cancelDailyNotification.mockResolvedValue(undefined);
  platform.getNotificationPermission.mockResolvedValue('granted');
  platform.askNotificationPermission.mockResolvedValue('granted');
  platform.showNotification.mockResolvedValue(true);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('ReminderSettings', () => {
  it('is hidden where notifications do not exist', () => {
    platform.notificationsAvailable.mockReturnValue(false);
    render(<ReminderSettings />);
    expect(screen.queryByRole('region', { name: 'Reminders' })).not.toBeInTheDocument();
  });

  it('starts off, asks for permission when turned on, and stores the choice', async () => {
    platform.getNotificationPermission.mockResolvedValue('default');
    render(<ReminderSettings />);
    const toggle = await screen.findByRole('switch', { name: 'Remind me each morning' });
    expect(toggle).not.toBeChecked();
    expect(screen.queryByLabelText('Reminder time')).not.toBeInTheDocument();

    fireEvent.click(toggle);

    await waitFor(() => expect(toggle).toBeChecked());
    expect(platform.askNotificationPermission).toHaveBeenCalledTimes(1);
    expect(loadReminderPreferences()).toMatchObject({ enabled: true, time: '09:00' });
    expect(screen.getByLabelText('Reminder time')).toHaveValue('09:00');
  });

  it('stays off and explains when the system blocks notifications', async () => {
    platform.getNotificationPermission.mockResolvedValue('default');
    platform.askNotificationPermission.mockResolvedValue('denied');
    render(<ReminderSettings />);
    const toggle = await screen.findByRole('switch', { name: 'Remind me each morning' });

    fireEvent.click(toggle);

    expect(await screen.findByRole('status')).toHaveTextContent('Notifications are blocked');
    expect(toggle).not.toBeChecked();
    expect(loadReminderPreferences().enabled).toBe(false);
  });

  it('changes the time, ignores an invalid one, and sends a test', async () => {
    localStorage.setItem(
      REMINDER_STORAGE_KEY,
      JSON.stringify({ enabled: true, time: '09:00', lastDigestDate: null }),
    );
    render(<ReminderSettings />);
    const time = await screen.findByLabelText('Reminder time');

    fireEvent.change(time, { target: { value: '07:45' } });
    expect(loadReminderPreferences().time).toBe('07:45');
    fireEvent.change(time, { target: { value: '' } });
    expect(loadReminderPreferences().time).toBe('07:45');

    fireEvent.click(screen.getByRole('button', { name: 'Send a test' }));
    await waitFor(() => expect(platform.showNotification).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole('status')).toHaveTextContent('Test sent.');
  });

  it('turns off without touching permission', async () => {
    localStorage.setItem(
      REMINDER_STORAGE_KEY,
      JSON.stringify({ enabled: true, time: '09:00', lastDigestDate: null }),
    );
    render(<ReminderSettings />);
    fireEvent.click(await screen.findByRole('switch', { name: 'Remind me each morning' }));
    await waitFor(() => expect(loadReminderPreferences().enabled).toBe(false));
    expect(platform.askNotificationPermission).not.toHaveBeenCalled();
  });
});

describe('useDueReminders', () => {
  function enable(lastDigestDate: string | null = null, time = '09:00') {
    localStorage.setItem(
      REMINDER_STORAGE_KEY,
      JSON.stringify({ enabled: true, time, lastDigestDate }),
    );
  }

  function at(hours: number, minutes = 0) {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 19, hours, minutes));
  }

  async function run() {
    renderHook(() => useDueReminders());
    await act(async () => {
      await Promise.resolve();
    });
  }

  it('sends one digest for what is due or overdue, and never creates anything', async () => {
    at(10);
    enable();
    data.loadTodayData.mockResolvedValue({
      items: [
        item('late', '2026-11-17'),
        item('now', '2026-11-19'),
        item('now-too', '2026-11-19'),
        item('later', '2026-11-25'),
        item('finished', '2026-11-19', 'done'),
      ],
    });

    await run();

    await waitFor(() =>
      expect(platform.showNotification).toHaveBeenCalledWith(
        'Today in FORGE',
        '2 due today · 1 overdue',
      ),
    );
    expect(data.loadTodayData).toHaveBeenCalledWith({ bootstrap: false });
    await waitFor(() => expect(loadReminderPreferences().lastDigestDate).toBe('2026-11-19'));
  });

  it('does nothing while disabled, before the time, or once already sent today', async () => {
    at(10);
    await run();
    expect(data.loadTodayData).not.toHaveBeenCalled();
    cleanup();

    at(8, 30);
    enable();
    await run();
    expect(data.loadTodayData).not.toHaveBeenCalled();
    cleanup();

    at(10);
    enable('2026-11-19');
    await run();
    expect(data.loadTodayData).not.toHaveBeenCalled();
    expect(platform.showNotification).not.toHaveBeenCalled();
  });

  it('does not read data without notification permission', async () => {
    at(10);
    enable();
    platform.getNotificationPermission.mockResolvedValue('denied');
    await run();
    expect(data.loadTodayData).not.toHaveBeenCalled();
    expect(loadReminderPreferences().lastDigestDate).toBeNull();
  });

  it('stays quiet but is done for the day when nothing needs attention', async () => {
    at(10);
    enable();
    data.loadTodayData.mockResolvedValue({ items: [item('later', '2026-12-01')] });
    await run();
    await waitFor(() => expect(loadReminderPreferences().lastDigestDate).toBe('2026-11-19'));
    expect(platform.showNotification).not.toHaveBeenCalled();
  });

  it('keeps trying when the notification could not be shown or the read failed', async () => {
    at(10);
    enable();
    data.loadTodayData.mockResolvedValue({ items: [item('now', '2026-11-19')] });
    platform.showNotification.mockResolvedValue(false);
    await run();
    await waitFor(() => expect(platform.showNotification).toHaveBeenCalled());
    expect(loadReminderPreferences().lastDigestDate).toBeNull();
    cleanup();

    data.loadTodayData.mockRejectedValue(new Error('offline'));
    await run();
    expect(loadReminderPreferences().lastDigestDate).toBeNull();
  });

  it('reads nothing when there is no workspace yet', async () => {
    at(10);
    enable();
    data.loadTodayData.mockResolvedValue(null);
    await run();
    await waitFor(() => expect(loadReminderPreferences().lastDigestDate).toBe('2026-11-19'));
    expect(platform.showNotification).not.toHaveBeenCalled();
  });
});

describe('Android: a reminder the system fires', () => {
  beforeEach(() => {
    platform.reminderDelivery.mockReturnValue('scheduled');
    localStorage.clear();
  });

  function enable(time = '09:00') {
    localStorage.setItem(
      REMINDER_STORAGE_KEY,
      JSON.stringify({ enabled: true, time, lastDigestDate: null }),
    );
  }

  async function mount() {
    renderHook(() => useDueReminders());
    await act(async () => {
      await Promise.resolve();
    });
  }

  it('keeps one daily schedule at the chosen time with text that is always true', async () => {
    enable('07:30');
    await mount();
    await waitFor(() =>
      expect(platform.scheduleDailyNotification).toHaveBeenCalledWith(
        '07:30',
        'FORGE',
        'Open FORGE to see what is due today and what is overdue.',
      ),
    );
    // The system fires it, so the app must not also read data and notify by itself.
    expect(data.loadTodayData).not.toHaveBeenCalled();
    expect(platform.showNotification).not.toHaveBeenCalled();
  });

  it('cancels the schedule when the reminder is off or permission is gone', async () => {
    await mount();
    await waitFor(() => expect(platform.cancelDailyNotification).toHaveBeenCalled());
    expect(platform.scheduleDailyNotification).not.toHaveBeenCalled();
    cleanup();
    platform.cancelDailyNotification.mockClear();

    enable();
    platform.getNotificationPermission.mockResolvedValue('denied');
    await mount();
    await waitFor(() => expect(platform.cancelDailyNotification).toHaveBeenCalled());
    expect(platform.scheduleDailyNotification).not.toHaveBeenCalled();
  });

  it('re-arms the schedule when the preference changes and when the app comes back', async () => {
    enable('09:00');
    await mount();
    await waitFor(() => expect(platform.scheduleDailyNotification).toHaveBeenCalledTimes(1));

    localStorage.setItem(
      REMINDER_STORAGE_KEY,
      JSON.stringify({ enabled: true, time: '18:15', lastDigestDate: null }),
    );
    window.dispatchEvent(new CustomEvent('forge:reminders-changed'));
    await waitFor(() =>
      expect(platform.scheduleDailyNotification).toHaveBeenLastCalledWith(
        '18:15',
        expect.any(String),
        expect.any(String),
      ),
    );

    window.dispatchEvent(new Event('focus'));
    await waitFor(() => expect(platform.scheduleDailyNotification).toHaveBeenCalledTimes(3));
  });

  it('survives a scheduling failure and tries again next time', async () => {
    enable();
    platform.scheduleDailyNotification.mockRejectedValueOnce(new Error('plugin unavailable'));
    await mount();
    await waitFor(() => expect(platform.scheduleDailyNotification).toHaveBeenCalledTimes(1));
    window.dispatchEvent(new Event('focus'));
    await waitFor(() => expect(platform.scheduleDailyNotification).toHaveBeenCalledTimes(2));
  });

  it('tells the user what to expect, in the settings row', async () => {
    enable();
    render(<ReminderSettings />);
    expect(await screen.findByText(/even with the app closed/)).toBeInTheDocument();
    expect(screen.getByText(/cannot include counts/)).toBeInTheDocument();
  });

  it('does not show that note on a platform where the app watches the data itself', async () => {
    platform.reminderDelivery.mockReturnValue('watcher');
    enable();
    render(<ReminderSettings />);
    await screen.findByLabelText('Reminder time');
    expect(screen.queryByText(/even with the app closed/)).not.toBeInTheDocument();
  });
});
