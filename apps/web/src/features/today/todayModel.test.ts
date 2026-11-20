import { describe, expect, it } from 'vitest';
import type { Feature } from '@forge-org/api-client';
import {
  addDaysIso,
  attentionCount,
  dueLabel,
  groupTodayItems,
  sectionFor,
  type TodayItem,
} from './todayModel';

const TODAY = '2026-11-19';

function item(overrides: Partial<Feature> & { id: string }): TodayItem {
  const feature = {
    project_id: 'p1',
    epic_id: null,
    title: overrides.id,
    description: null,
    goal: null,
    priority: 'medium',
    status: 'backlog',
    kind: 'story',
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-11-01T00:00:00Z',
    due_date: null,
    ...overrides,
  } as Feature;
  return { feature, workspaceId: 'w1', projectId: 'p1', projectName: 'Inbox' };
}

describe('sectionFor', () => {
  it.each([
    [null, 'nodate'],
    ['2026-11-18', 'overdue'],
    ['2026-11-19', 'today'],
    ['2026-11-20', 'week'],
    ['2026-11-26', 'week'],
    ['2026-11-27', 'later'],
  ])('puts %s in %s', (due, expected) => {
    expect(sectionFor(due, TODAY)).toBe(expected);
  });
});

describe('groupTodayItems', () => {
  it('hides finished work and groups the rest by urgency', () => {
    const groups = groupTodayItems(
      [
        item({ id: 'late', due_date: '2026-11-10' }),
        item({ id: 'now', due_date: TODAY }),
        item({ id: 'soon', due_date: '2026-11-22' }),
        item({ id: 'far', due_date: '2027-01-01' }),
        item({ id: 'someday' }),
        item({ id: 'finished', due_date: TODAY, status: 'done' }),
      ],
      TODAY,
    );
    expect(groups.overdue.map((i) => i.feature.id)).toEqual(['late']);
    expect(groups.today.map((i) => i.feature.id)).toEqual(['now']);
    expect(groups.week.map((i) => i.feature.id)).toEqual(['soon']);
    expect(groups.later.map((i) => i.feature.id)).toEqual(['far']);
    expect(groups.nodate.map((i) => i.feature.id)).toEqual(['someday']);
    expect(attentionCount(groups)).toBe(2);
  });

  it('orders by date, then priority, then creation time', () => {
    const groups = groupTodayItems(
      [
        item({ id: 'b-low', due_date: '2026-11-21', priority: 'low' }),
        item({ id: 'a-first', due_date: '2026-11-20', priority: 'low' }),
        item({ id: 'b-critical', due_date: '2026-11-21', priority: 'critical' }),
        item({
          id: 'b-low-older',
          due_date: '2026-11-21',
          priority: 'low',
          created_at: '2026-10-01T00:00:00Z',
        }),
      ],
      TODAY,
    );
    expect(groups.week.map((i) => i.feature.id)).toEqual([
      'a-first',
      'b-critical',
      'b-low-older',
      'b-low',
    ]);
  });
});

describe('dueLabel', () => {
  it.each([
    [null, 'No date'],
    ['2026-11-19', 'Today'],
    ['2026-11-20', 'Tomorrow'],
    ['2026-11-18', 'Yesterday'],
    ['2026-11-15', '4 days overdue'],
    ['2026-11-22', 'Sun'],
    ['2026-12-24', 'Dec 24'],
  ])('labels %s as %s', (due, expected) => {
    expect(dueLabel(due, TODAY)).toBe(expected);
  });
});

describe('addDaysIso', () => {
  it('crosses month and year boundaries', () => {
    expect(addDaysIso('2026-12-30', 3)).toBe('2027-01-02');
  });
});
