import { describe, expect, it } from 'vitest';
import type { Feature } from '@forge-org/api-client';
import type { TodayItem } from './todayModel';
import { entriesForView, isViewId, viewCounts, type ViewContext } from './viewsModel';

const TODAY = '2026-11-19';

function item(id: string, overrides: Partial<Feature> = {}, projectId = 'inbox'): TodayItem {
  const feature = {
    id,
    title: id,
    project_id: projectId,
    epic_id: null,
    priority: 'medium',
    status: 'backlog',
    kind: 'story',
    due_date: null,
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-11-18T00:00:00Z',
    ...overrides,
  } as Feature;
  return { feature, workspaceId: 'w1', projectId, projectName: projectId };
}

const context = (overrides: Partial<ViewContext> = {}): ViewContext => ({
  todayIso: TODAY,
  dependencies: [],
  inboxProjectId: 'inbox',
  ...overrides,
});

const ids = (entries: { item: TodayItem }[]) => entries.map((entry) => entry.item.feature.id);

describe('upcoming', () => {
  it('lists open work due after today and within two weeks, soonest first', () => {
    const entries = entriesForView(
      'upcoming',
      [
        item('far', { due_date: '2026-12-10' }),
        item('later', { due_date: '2026-12-03' }),
        item('soon', { due_date: '2026-11-20' }),
        item('today', { due_date: TODAY }),
        item('overdue', { due_date: '2026-11-10' }),
        item('undated'),
        item('done', { due_date: '2026-11-25', status: 'done' }),
      ],
      context(),
    );
    expect(ids(entries)).toEqual(['soon', 'later']);
  });
});

describe('blocked', () => {
  it('shows an item only while a dependency it waits on is still open, and says which', () => {
    const items = [
      item('ui'),
      item('api'),
      item('docs'),
      item('shipped', { status: 'done' }),
      item('after-shipped'),
    ];
    const entries = entriesForView(
      'blocked',
      items,
      context({
        dependencies: [
          { blocking_feature_id: 'api', blocked_feature_id: 'ui' },
          { blocking_feature_id: 'docs', blocked_feature_id: 'ui' },
          { blocking_feature_id: 'shipped', blocked_feature_id: 'after-shipped' },
        ],
      }),
    );
    expect(ids(entries)).toEqual(['ui']);
    expect(entries[0].note).toBe('Blocked by api, docs');
  });

  it('ignores a dependency whose blocker is unknown', () => {
    expect(
      entriesForView(
        'blocked',
        [item('ui')],
        context({ dependencies: [{ blocking_feature_id: 'ghost', blocked_feature_id: 'ui' }] }),
      ),
    ).toEqual([]);
  });
});

describe('verify', () => {
  it('lists only open items waiting for verification', () => {
    expect(
      ids(
        entriesForView(
          'verify',
          [
            item('a', { status: 'verify' }),
            item('b', { status: 'in_progress' }),
            item('c', { status: 'done' }),
          ],
          context(),
        ),
      ),
    ).toEqual(['a']);
  });
});

describe('stalled', () => {
  it('lists started work that has been quiet for two weeks, the quietest first', () => {
    const entries = entriesForView(
      'stalled',
      [
        item('fresh', { status: 'in_progress', updated_at: '2026-11-17T12:00:00Z' }),
        item('quiet', { status: 'in_progress', updated_at: '2026-10-25T12:00:00Z' }),
        item('quieter', { status: 'verify', updated_at: '2026-09-01T12:00:00Z' }),
        item('idle-backlog', { status: 'backlog', updated_at: '2026-01-01T12:00:00Z' }),
        item('finished', { status: 'done', updated_at: '2026-01-01T12:00:00Z' }),
      ],
      context(),
    );
    expect(ids(entries)).toEqual(['quieter', 'quiet']);
    expect(entries[1].note).toBe('No activity for 25 days');
  });
});

describe('unorganized', () => {
  it('lists Inbox items without an Epic, oldest first', () => {
    const entries = entriesForView(
      'unorganized',
      [
        item('new', { created_at: '2026-11-10T00:00:00Z' }),
        item('old', { created_at: '2026-10-01T00:00:00Z' }),
        item('has-epic', { epic_id: 'e1' }),
        item('elsewhere', {}, 'atlas'),
        item('done', { status: 'done' }),
      ],
      context(),
    );
    expect(ids(entries)).toEqual(['old', 'new']);
  });
});

describe('helpers', () => {
  it('counts every decision view for the selector badges', () => {
    const counts = viewCounts(
      [item('a', { status: 'verify' }), item('b', { due_date: '2026-11-21' })],
      context(),
      3,
    );
    expect(counts).toMatchObject({ due: 3, upcoming: 1, verify: 1, blocked: 0, stalled: 0 });
    expect(counts.unorganized).toBe(2);
  });

  it('recognises valid view ids only', () => {
    expect(isViewId('blocked')).toBe(true);
    expect(isViewId('everything')).toBe(false);
    expect(isViewId(null)).toBe(false);
  });
});
