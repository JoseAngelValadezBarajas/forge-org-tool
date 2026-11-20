import type { Feature } from '@forge-org/api-client';

/** A work item plus the place it lives, so Today can span every project of a workspace. */
export type TodayItem = {
  feature: Feature;
  workspaceId: string;
  projectId: string;
  projectName: string;
};

export type TodaySectionId = 'overdue' | 'today' | 'week' | 'later' | 'nodate';

export const TODAY_SECTIONS: { id: TodaySectionId; title: string }[] = [
  { id: 'overdue', title: 'Overdue' },
  { id: 'today', title: 'Today' },
  { id: 'week', title: 'Next 7 days' },
  { id: 'later', title: 'Later' },
  { id: 'nodate', title: 'No date' },
];

const PRIORITY_WEIGHT: Record<string, number> = { critical: 3, high: 2, medium: 1, low: 0 };

function parseIso(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function toIso(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function addDaysIso(iso: string, days: number): string {
  const base = parseIso(iso);
  return toIso(new Date(base.getFullYear(), base.getMonth(), base.getDate() + days));
}

function daysBetween(fromIso: string, toIsoDate: string): number {
  const ms = parseIso(toIsoDate).getTime() - parseIso(fromIso).getTime();
  return Math.round(ms / 86_400_000);
}

export function isOpen(feature: Feature): boolean {
  return feature.status !== 'done';
}

export function sectionFor(dueDate: string | null | undefined, todayIso: string): TodaySectionId {
  if (!dueDate) return 'nodate';
  if (dueDate < todayIso) return 'overdue';
  if (dueDate === todayIso) return 'today';
  return dueDate <= addDaysIso(todayIso, 7) ? 'week' : 'later';
}

function compareItems(a: TodayItem, b: TodayItem): number {
  const dueA = a.feature.due_date ?? '9999-12-31';
  const dueB = b.feature.due_date ?? '9999-12-31';
  if (dueA !== dueB) return dueA < dueB ? -1 : 1;
  const weight =
    (PRIORITY_WEIGHT[b.feature.priority] ?? 1) - (PRIORITY_WEIGHT[a.feature.priority] ?? 1);
  if (weight !== 0) return weight;
  return a.feature.created_at < b.feature.created_at ? -1 : 1;
}

/** Open items only, grouped by how soon they are due and ordered inside each group. */
export function groupTodayItems(
  items: TodayItem[],
  todayIso: string,
): Record<TodaySectionId, TodayItem[]> {
  const groups: Record<TodaySectionId, TodayItem[]> = {
    overdue: [],
    today: [],
    week: [],
    later: [],
    nodate: [],
  };
  for (const item of items.filter((candidate) => isOpen(candidate.feature))) {
    groups[sectionFor(item.feature.due_date, todayIso)].push(item);
  }
  for (const id of Object.keys(groups) as TodaySectionId[]) groups[id].sort(compareItems);
  return groups;
}

/** Short human label for a due date relative to today ("Today", "3 days overdue", "Fri"). */
export function dueLabel(dueDate: string | null | undefined, todayIso: string): string {
  if (!dueDate) return 'No date';
  const delta = daysBetween(todayIso, dueDate);
  if (delta === 0) return 'Today';
  if (delta === 1) return 'Tomorrow';
  if (delta === -1) return 'Yesterday';
  if (delta < -1) return `${-delta} days overdue`;
  const date = parseIso(dueDate);
  if (delta <= 6) return date.toLocaleDateString('en-US', { weekday: 'short' });
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}

/** Open work that still needs attention today: overdue plus due today. */
export function attentionCount(groups: Record<TodaySectionId, TodayItem[]>): number {
  return groups.overdue.length + groups.today.length;
}
