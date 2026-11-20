import { addDaysIso, isOpen, type TodayItem } from './todayModel';

/**
 * Decision views over the same data Today already loads: filters, not new modules.
 * - due: what is due (Today's default grouping)
 * - upcoming: due within the next two weeks, after today
 * - blocked: waiting on a dependency that is not done
 * - verify: waiting for verification
 * - stalled: started work with no activity for a while
 * - unorganized: Inbox items that have no Epic yet
 */
export type TodayView = 'due' | 'upcoming' | 'blocked' | 'verify' | 'stalled' | 'unorganized';

export const TODAY_VIEWS: { id: TodayView; label: string; empty: string }[] = [
  { id: 'due', label: 'Due', empty: 'Nothing to do yet' },
  { id: 'upcoming', label: 'Upcoming', empty: 'Nothing is due in the next two weeks.' },
  { id: 'blocked', label: 'Blocked', empty: 'Nothing is waiting on a dependency.' },
  { id: 'verify', label: 'Verify', empty: 'Nothing is waiting for verification.' },
  { id: 'stalled', label: 'Stalled', empty: 'Nothing has gone quiet.' },
  { id: 'unorganized', label: 'Unorganized', empty: 'Every Inbox item has an Epic.' },
];

export const UPCOMING_DAYS = 14;
export const STALLED_AFTER_DAYS = 14;

/** Statuses that mean someone started the work, so silence is worth noticing. */
const STARTED = new Set(['refining', 'ready', 'in_progress', 'verify']);

export type Dependency = { blocking_feature_id: string; blocked_feature_id: string };

export type ViewContext = {
  todayIso: string;
  dependencies: Dependency[];
  /** Project id of the Inbox, where unorganized items are looked for. */
  inboxProjectId: string | null;
};

export type ViewEntry = { item: TodayItem; note?: string };

export function isViewId(value: unknown): value is TodayView {
  return TODAY_VIEWS.some((view) => view.id === value);
}

/** Whole calendar days between the local date of `timestamp` and `todayIso`. */
function daysSince(timestamp: string, todayIso: string): number {
  const then = new Date(timestamp);
  if (Number.isNaN(then.getTime())) return 0;
  const [year, month, day] = todayIso.split('-').map(Number);
  const thenDay = Date.UTC(then.getFullYear(), then.getMonth(), then.getDate());
  return Math.round((Date.UTC(year, month - 1, day) - thenDay) / 86_400_000);
}

function byDueThenTitle(a: TodayItem, b: TodayItem): number {
  const dueA = a.feature.due_date ?? '9999-12-31';
  const dueB = b.feature.due_date ?? '9999-12-31';
  if (dueA !== dueB) return dueA < dueB ? -1 : 1;
  return a.feature.title.localeCompare(b.feature.title);
}

/** The open items that belong to a decision view, each with an optional explanation. */
export function entriesForView(
  view: Exclude<TodayView, 'due'>,
  items: TodayItem[],
  context: ViewContext,
): ViewEntry[] {
  const open = items.filter((candidate) => isOpen(candidate.feature));
  const { todayIso } = context;

  if (view === 'upcoming') {
    const horizon = addDaysIso(todayIso, UPCOMING_DAYS);
    return open
      .filter(
        ({ feature }) =>
          !!feature.due_date && feature.due_date > todayIso && feature.due_date <= horizon,
      )
      .sort(byDueThenTitle)
      .map((item) => ({ item }));
  }

  if (view === 'blocked') {
    const byId = new Map(items.map((candidate) => [candidate.feature.id, candidate]));
    return open
      .map((item) => {
        const blockers = context.dependencies
          .filter((dependency) => dependency.blocked_feature_id === item.feature.id)
          .map((dependency) => byId.get(dependency.blocking_feature_id))
          .filter((blocker): blocker is TodayItem => !!blocker && isOpen(blocker.feature));
        return { item, blockers };
      })
      .filter(({ blockers }) => blockers.length > 0)
      .sort((a, b) => byDueThenTitle(a.item, b.item))
      .map(({ item, blockers }) => ({
        item,
        note: `Blocked by ${blockers.map((blocker) => blocker.feature.title).join(', ')}`,
      }));
  }

  if (view === 'verify') {
    return open
      .filter(({ feature }) => feature.status === 'verify')
      .sort(byDueThenTitle)
      .map((item) => ({ item }));
  }

  if (view === 'stalled') {
    return open
      .map((item) => ({ item, quiet: daysSince(item.feature.updated_at, todayIso) }))
      .filter(({ item, quiet }) => STARTED.has(item.feature.status) && quiet >= STALLED_AFTER_DAYS)
      .sort((a, b) => b.quiet - a.quiet)
      .map(({ item, quiet }) => ({ item, note: `No activity for ${quiet} days` }));
  }

  return open
    .filter(({ projectId, feature }) => projectId === context.inboxProjectId && !feature.epic_id)
    .sort((a, b) => (a.feature.created_at < b.feature.created_at ? -1 : 1))
    .map((item) => ({ item }));
}

/** How many entries each decision view has, for the badges on the view selector. */
export function viewCounts(
  items: TodayItem[],
  context: ViewContext,
  dueAttention: number,
): Record<TodayView, number> {
  const counts = { due: dueAttention } as Record<TodayView, number>;
  for (const { id } of TODAY_VIEWS) {
    if (id !== 'due') counts[id] = entriesForView(id, items, context).length;
  }
  return counts;
}
