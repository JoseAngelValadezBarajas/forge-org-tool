import type { Feature } from '@forge-org/api-client';
import type { TodayItem } from './todayModel';

export type OrganizeValues = {
  projectId: string;
  /** Empty string means "no Epic". */
  epicId: string;
  priority: string;
  kind: 'story' | 'bug';
  /** Comma separated. */
  tags: string;
};

export type OrganizeUpdate = {
  epic_id?: string;
  clear_epic?: boolean;
  priority?: string;
  kind?: 'story' | 'bug';
  bug_severity?: string | null;
  tags?: string[];
};

export type OrganizePlan = {
  /** Set when the item must change project (the Epic, if any, travels with the move). */
  move: { projectId: string; epicId: string | null } | null;
  /** Fields to PATCH on the item in its final project; `null` when nothing else changes. */
  update: OrganizeUpdate | null;
};

const MAX_TAGS = 20;
const MAX_TAG_LENGTH = 40;

/** Splits a comma separated list, trims, drops empties and case-insensitive duplicates. */
export function parseTags(text: string): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const raw of text.split(',')) {
    const tag = raw.trim();
    if (!tag || seen.has(tag.toLowerCase())) continue;
    seen.add(tag.toLowerCase());
    tags.push(tag);
  }
  return tags;
}

/** A message when the tags cannot be saved, otherwise `null`. */
export function tagsProblem(text: string): string | null {
  const tags = parseTags(text);
  if (tags.length > MAX_TAGS) return `Use at most ${MAX_TAGS} tags.`;
  if (tags.some((tag) => tag.length > MAX_TAG_LENGTH)) {
    return `Each tag can have up to ${MAX_TAG_LENGTH} characters.`;
  }
  return null;
}

export function organizeDefaults(feature: Feature, projectId: string): OrganizeValues {
  return {
    projectId,
    epicId: feature.epic_id ?? '',
    priority: feature.priority,
    kind: feature.kind === 'bug' ? 'bug' : 'story',
    tags: (feature.tags ?? []).join(', '),
  };
}

function sameTags(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((tag, index) => tag === b[index]);
}

/** Works out the smallest set of API calls that applies the user's choices. */
export function planOrganize(item: TodayItem, values: OrganizeValues): OrganizePlan {
  const { feature } = item;
  const epicId = values.epicId || null;
  const moving = values.projectId !== item.projectId;
  const update: OrganizeUpdate = {};

  if (!moving && epicId !== (feature.epic_id ?? null)) {
    if (epicId) update.epic_id = epicId;
    else update.clear_epic = true;
  }
  if (values.priority !== feature.priority) update.priority = values.priority;
  if (values.kind !== (feature.kind === 'bug' ? 'bug' : 'story')) {
    update.kind = values.kind;
    // A Bug needs a severity and a Story must not keep one.
    update.bug_severity = values.kind === 'bug' ? (feature.bug_severity ?? 'medium') : null;
  }
  const tags = parseTags(values.tags);
  if (!sameTags(tags, feature.tags ?? [])) update.tags = tags;

  return {
    move: moving ? { projectId: values.projectId, epicId } : null,
    update: Object.keys(update).length > 0 ? update : null,
  };
}
