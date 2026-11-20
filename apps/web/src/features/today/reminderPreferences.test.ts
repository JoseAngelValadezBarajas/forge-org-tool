import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_REMINDER_PREFERENCES,
  REMINDER_STORAGE_KEY,
  REMINDERS_CHANGED_EVENT,
  digestMessage,
  isDigestDue,
  isValidTime,
  loadReminderPreferences,
  saveReminderPreferences,
} from './reminderPreferences';

const on = { enabled: true, time: '09:00', lastDigestDate: null };

describe('isDigestDue', () => {
  it('is never due while disabled', () => {
    expect(isDigestDue({ ...on, enabled: false }, new Date(2026, 10, 19, 12, 0))).toBe(false);
  });

  it('waits for the chosen time and then fires', () => {
    expect(isDigestDue(on, new Date(2026, 10, 19, 8, 59))).toBe(false);
    expect(isDigestDue(on, new Date(2026, 10, 19, 9, 0))).toBe(true);
    expect(isDigestDue(on, new Date(2026, 10, 19, 17, 30))).toBe(true);
  });

  it('fires once per day and again the next day', () => {
    const sent = { ...on, lastDigestDate: '2026-11-19' };
    expect(isDigestDue(sent, new Date(2026, 10, 19, 18, 0))).toBe(false);
    expect(isDigestDue(sent, new Date(2026, 10, 20, 9, 0))).toBe(true);
  });
});

describe('digestMessage', () => {
  it.each([
    [{ overdue: 0, today: 0 }, null],
    [{ overdue: 0, today: 3 }, '3 due today'],
    [{ overdue: 2, today: 0 }, '2 overdue'],
    [{ overdue: 2, today: 3 }, '3 due today · 2 overdue'],
  ])('describes %j', (counts, body) => {
    expect(digestMessage(counts)?.body ?? null).toBe(body);
  });
});

describe('isValidTime', () => {
  it.each(['00:00', '09:05', '23:59'])('accepts %s', (value) =>
    expect(isValidTime(value)).toBe(true),
  );
  it.each(['24:00', '9:00', '09:60', '', 'noon', 900, null])('rejects %s', (value) =>
    expect(isValidTime(value)).toBe(false),
  );
});

describe('stored preferences', () => {
  beforeEach(() => localStorage.clear());

  it('defaults to off at 09:00', () => {
    expect(loadReminderPreferences()).toEqual(DEFAULT_REMINDER_PREFERENCES);
  });

  it('round-trips and announces the change', () => {
    let announced = 0;
    const listener = () => (announced += 1);
    window.addEventListener(REMINDERS_CHANGED_EVENT, listener);
    saveReminderPreferences({ enabled: true, time: '07:30', lastDigestDate: '2026-11-19' });
    window.removeEventListener(REMINDERS_CHANGED_EVENT, listener);
    expect(announced).toBe(1);
    expect(loadReminderPreferences()).toEqual({
      enabled: true,
      time: '07:30',
      lastDigestDate: '2026-11-19',
    });
  });

  it('repairs corrupt or hostile stored values instead of trusting them', () => {
    localStorage.setItem(REMINDER_STORAGE_KEY, '{not json');
    expect(loadReminderPreferences()).toEqual(DEFAULT_REMINDER_PREFERENCES);
    localStorage.setItem(
      REMINDER_STORAGE_KEY,
      JSON.stringify({ enabled: 'yes', time: '99:99', lastDigestDate: 'yesterday' }),
    );
    expect(loadReminderPreferences()).toEqual(DEFAULT_REMINDER_PREFERENCES);
  });
});
