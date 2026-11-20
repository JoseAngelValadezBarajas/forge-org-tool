import { describe, expect, it } from 'vitest';
import { formatLocalDate, parseQuickCapture } from './quickCapture';

// Thursday, 19 November 2026.
const today = new Date(2026, 10, 19);

describe('parseQuickCapture', () => {
  it('keeps a plain line as a title with no date', () => {
    expect(parseQuickCapture('  Write the release notes ', today)).toEqual({
      title: 'Write the release notes',
      dueDate: null,
    });
    expect(parseQuickCapture('', today)).toEqual({ title: '', dueDate: null });
  });

  it.each([
    ['Fix login today', 'Fix login', '2026-11-19'],
    ['Fix login hoy', 'Fix login', '2026-11-19'],
    ['Fix login tomorrow', 'Fix login', '2026-11-20'],
    ['Arreglar login mañana', 'Arreglar login', '2026-11-20'],
    ['Arreglar login pasado mañana', 'Arreglar login', '2026-11-21'],
    ['Fix login friday', 'Fix login', '2026-11-20'],
    ['Arreglar login el viernes', 'Arreglar login', '2026-11-20'],
    ['Arreglar login para el lunes', 'Arreglar login', '2026-11-23'],
    ['Pagar hosting sábado', 'Pagar hosting', '2026-11-21'],
    ['Pagar hosting miércoles', 'Pagar hosting', '2026-11-25'],
    ['Pay hosting next monday', 'Pay hosting', '2026-11-23'],
    ['Pagar hosting en 3 días', 'Pagar hosting', '2026-11-22'],
    ['Pay hosting in 2 weeks', 'Pay hosting', '2026-12-03'],
    ['Plan sprint next week', 'Plan sprint', '2026-11-23'],
    ['Pagar hosting próxima semana', 'Pagar hosting', '2026-11-23'],
    ['Ship v2 by 2026-12-24', 'Ship v2', '2026-12-24'],
  ])('reads a trailing date: %s', (input, title, dueDate) => {
    expect(parseQuickCapture(input, today)).toEqual({ title, dueDate });
  });

  it('moves the same weekday to next week instead of today', () => {
    expect(parseQuickCapture('Standup notes thursday', today).dueDate).toBe('2026-11-26');
  });

  it('reads a leading date phrase', () => {
    expect(parseQuickCapture('tomorrow call the bank', today)).toEqual({
      title: 'call the bank',
      dueDate: '2026-11-20',
    });
  });

  it('crosses month and year boundaries', () => {
    expect(parseQuickCapture('Renew in 20 days', new Date(2026, 11, 20)).dueDate).toBe(
      '2027-01-09',
    );
  });

  it('does not take a day word from the middle of the title', () => {
    expect(parseQuickCapture('Friday deploy checklist review', today)).toEqual({
      title: 'Friday deploy checklist review',
      dueDate: null,
    });
  });

  it('treats a line that is only a date phrase as a title', () => {
    expect(parseQuickCapture('friday', today)).toEqual({ title: 'friday', dueDate: null });
  });

  it('ignores an impossible calendar date', () => {
    expect(parseQuickCapture('Ship it 2026-02-31', today)).toEqual({
      title: 'Ship it 2026-02-31',
      dueDate: null,
    });
  });

  it('formats local dates without a timezone shift', () => {
    expect(formatLocalDate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});
