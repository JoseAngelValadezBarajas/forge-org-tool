/**
 * Quick capture: turn one line such as "Fix login friday" or "pagar hosting en 3 días" into a
 * title and an optional due date. Pure and framework-free so it is trivially testable; the
 * current date is always passed in.
 *
 * Understands English and Spanish. Only a trailing date phrase (or a leading one) is taken, so a
 * title that merely contains a day word in the middle is left alone.
 */

export type QuickCapture = { title: string; dueDate: string | null };

const WEEKDAYS: Record<string, number> = {
  domingo: 0,
  dom: 0,
  sunday: 0,
  sun: 0,
  lunes: 1,
  lun: 1,
  monday: 1,
  mon: 1,
  martes: 2,
  tuesday: 2,
  tue: 2,
  miercoles: 3,
  mie: 3,
  wednesday: 3,
  wed: 3,
  jueves: 4,
  jue: 4,
  thursday: 4,
  thu: 4,
  viernes: 5,
  vie: 5,
  friday: 5,
  fri: 5,
  sabado: 6,
  sab: 6,
  saturday: 6,
  sat: 6,
};

const FILLER = '(?:(?:para|por|hasta|el|for|by|on|until|due)\\s+)*';
const WEEKDAY_NAMES = Object.keys(WEEKDAYS).join('|');
const UNAMBIGUOUS = [
  'pasado\\s+manana',
  'day\\s+after\\s+tomorrow',
  'hoy',
  'today',
  'manana',
  'tomorrow',
  'proxima\\s+semana',
  'next\\s+week',
  '(?:en|in)\\s+\\d{1,3}\\s+(?:dias?|days?|semanas?|weeks?)',
  '\\d{4}-\\d{2}-\\d{2}',
];
const WEEKDAY = `(?:(?:proximo|next|este|this)\\s+)?(?:${WEEKDAY_NAMES})`;
// A weekday at the start of a line reads like part of the title ("Friday deploy checklist"), so
// only the unambiguous forms are accepted there.
const TRAILING = new RegExp(`(?:^|\\s)(${FILLER}(?:${[...UNAMBIGUOUS, WEEKDAY].join('|')}))\\s*$`);
const LEADING = new RegExp(`^(${FILLER}(?:${UNAMBIGUOUS.join('|')}))(?:\\s+|$)`);

/** Lowercase and strip accents without changing the string length, so indexes stay valid. */
function fold(value: string): string {
  return Array.from(value.toLowerCase(), (char) => char.normalize('NFD')[0]).join('');
}

export function formatLocalDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function addDays(base: Date, days: number): Date {
  return new Date(base.getFullYear(), base.getMonth(), base.getDate() + days);
}

function daysUntilWeekday(base: Date, weekday: number): number {
  return (weekday - base.getDay() + 7) % 7 || 7;
}

function resolvePhrase(phrase: string, today: Date): string | null {
  const text = phrase.replace(new RegExp(`^${FILLER}`), '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const [year, month, day] = text.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const valid =
      date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
    return valid ? text : null;
  }
  if (text === 'hoy' || text === 'today') return formatLocalDate(today);
  if (text === 'manana' || text === 'tomorrow') return formatLocalDate(addDays(today, 1));
  if (/^(pasado manana|day after tomorrow)$/.test(text)) return formatLocalDate(addDays(today, 2));
  if (/^(proxima semana|next week)$/.test(text)) {
    return formatLocalDate(addDays(today, daysUntilWeekday(today, 1)));
  }
  const relative = text.match(/^(?:en|in)\s+(\d{1,3})\s+(dias?|days?|semanas?|weeks?)$/);
  if (relative) {
    const amount = Number(relative[1]) * (/^(semana|week)/.test(relative[2]) ? 7 : 1);
    return formatLocalDate(addDays(today, amount));
  }
  const weekday = text.replace(/^(?:proximo|next|este|this)\s+/, '');
  if (weekday in WEEKDAYS) {
    return formatLocalDate(addDays(today, daysUntilWeekday(today, WEEKDAYS[weekday])));
  }
  return null;
}

export function parseQuickCapture(input: string, today: Date): QuickCapture {
  const original = input.replace(/\s+/g, ' ').trim();
  if (!original) return { title: '', dueDate: null };
  const folded = fold(original);

  for (const pattern of [TRAILING, LEADING]) {
    const match = pattern.exec(folded);
    if (!match) continue;
    const dueDate = resolvePhrase(match[1], today);
    if (!dueDate) continue;
    const start = match.index + match[0].indexOf(match[1]);
    const title = `${original.slice(0, start)} ${original.slice(start + match[1].length)}`
      .replace(/\s+/g, ' ')
      .trim();
    // A line that is only a date phrase ("viernes") is a title, not a deadline.
    if (!title) return { title: original, dueDate: null };
    return { title, dueDate };
  }
  return { title: original, dueDate: null };
}
