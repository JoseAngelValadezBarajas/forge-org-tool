/**
 * Morning reminder preferences and message. Pure and framework-free apart from the small
 * localStorage wrapper: this is an installation preference (like the theme), not product data.
 */
import { formatLocalDate } from './quickCapture';

export const REMINDER_STORAGE_KEY = 'forge-reminders';
export const REMINDERS_CHANGED_EVENT = 'forge:reminders-changed';

export type ReminderPreferences = {
  enabled: boolean;
  /** Local time of day, `HH:MM`. */
  time: string;
  /** Local date (`YYYY-MM-DD`) of the last digest, so it fires once per day. */
  lastDigestDate: string | null;
};

export const DEFAULT_REMINDER_PREFERENCES: ReminderPreferences = {
  enabled: false,
  time: '09:00',
  lastDigestDate: null,
};

export function isValidTime(value: unknown): value is string {
  return typeof value === 'string' && /^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(value);
}

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function loadReminderPreferences(): ReminderPreferences {
  try {
    const raw = localStorage.getItem(REMINDER_STORAGE_KEY);
    if (!raw) return DEFAULT_REMINDER_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<ReminderPreferences>;
    return {
      enabled: parsed.enabled === true,
      time: isValidTime(parsed.time) ? parsed.time : DEFAULT_REMINDER_PREFERENCES.time,
      lastDigestDate: isIsoDate(parsed.lastDigestDate) ? parsed.lastDigestDate : null,
    };
  } catch {
    return DEFAULT_REMINDER_PREFERENCES;
  }
}

export function saveReminderPreferences(preferences: ReminderPreferences): void {
  try {
    localStorage.setItem(REMINDER_STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // Storage can be unavailable; the reminder simply will not persist.
  }
  window.dispatchEvent(new CustomEvent(REMINDERS_CHANGED_EVENT));
}

function minutesOfDay(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/** True when the digest is enabled, its time has passed today, and it was not sent today. */
export function isDigestDue(preferences: ReminderPreferences, now: Date): boolean {
  if (!preferences.enabled) return false;
  if (preferences.lastDigestDate === formatLocalDate(now)) return false;
  return now.getHours() * 60 + now.getMinutes() >= minutesOfDay(preferences.time);
}

/** The notification text, or `null` when there is nothing that needs attention. */
export function digestMessage(counts: {
  overdue: number;
  today: number;
}): { title: string; body: string } | null {
  const { overdue, today } = counts;
  if (overdue === 0 && today === 0) return null;
  const parts = [
    today > 0 ? `${today} due today` : null,
    overdue > 0 ? `${overdue} overdue` : null,
  ].filter((part): part is string => part !== null);
  return { title: 'Today in FORGE', body: parts.join(' · ') };
}
