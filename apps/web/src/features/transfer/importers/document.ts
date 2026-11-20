/**
 * Shared core of the file importers: turns neutral items into a `forge-project-transfer-v2`
 * document that the existing review-and-fingerprint flow validates. Pure and framework-free.
 *
 * The limits mirror `contracts/transfer/conformance.json` and the Supabase column checks, so
 * a converted file is never accepted here and rejected later.
 */
import { TRANSFER_LIMITS } from '@forge-org/api-client';

export type ImportItem = {
  title: string;
  description?: string | null;
  /** Free text; mapped to a workflow status. */
  status?: string | null;
  priority?: string | null;
  kind?: string | null;
  severity?: string | null;
  dueDate?: string | null;
  tags?: string[];
  /** Name of the Epic to group the item under. */
  epic?: string | null;
  /** Where the item came from, kept in the notes for traceability. */
  source?: string | null;
};

export type Skipped = { where: string; reason: string };

export type ConversionSummary = {
  source: 'csv' | 'github';
  projectName: string;
  items: number;
  epics: number;
  skipped: Skipped[];
  notices: string[];
};

export type Converted = { document: Record<string, unknown>; summary: ConversionSummary };

export class ImportFileError extends Error {}

const MAX_TITLE = 200;
const MAX_DESCRIPTION = 4000;
const MAX_NOTES = 8000;
const MAX_TAGS = 20;
const MAX_TAG_LENGTH = 40;
const MAX_EPICS = TRANSFER_LIMITS.max_epics;

const STATUS_WORDS: Record<string, string> = {
  backlog: 'backlog',
  todo: 'backlog',
  'to do': 'backlog',
  open: 'backlog',
  new: 'backlog',
  pending: 'backlog',
  pendiente: 'backlog',
  refining: 'refining',
  triage: 'refining',
  ready: 'ready',
  'in progress': 'in_progress',
  in_progress: 'in_progress',
  doing: 'in_progress',
  started: 'in_progress',
  'en progreso': 'in_progress',
  verify: 'verify',
  review: 'verify',
  'in review': 'verify',
  testing: 'verify',
  qa: 'verify',
  done: 'done',
  closed: 'done',
  complete: 'done',
  completed: 'done',
  resolved: 'done',
  hecho: 'done',
  cerrado: 'done',
};

const PRIORITY_WORDS: Record<string, string> = {
  low: 'low',
  minor: 'low',
  p3: 'low',
  baja: 'low',
  medium: 'medium',
  normal: 'medium',
  p2: 'medium',
  media: 'medium',
  high: 'high',
  major: 'high',
  p1: 'high',
  alta: 'high',
  critical: 'critical',
  urgent: 'critical',
  blocker: 'critical',
  p0: 'critical',
  critica: 'critical',
  crítica: 'critical',
};

const SEVERITIES = new Set(['low', 'medium', 'high', 'critical']);

function norm(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

export function statusFor(value: string | null | undefined): string | null {
  return STATUS_WORDS[norm(value)] ?? null;
}

export function priorityFor(value: string | null | undefined): string | null {
  return PRIORITY_WORDS[norm(value)] ?? null;
}

/** A real calendar date as YYYY-MM-DD, or null. Accepts YYYY/MM/DD and a full ISO timestamp. */
export function isoDateFor(value: string | null | undefined): string | null {
  const match = /^(\d{4})[-/](\d{2})[-/](\d{2})(?:[T ].*)?$/.exec((value ?? '').trim());
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  const valid =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  return valid ? `${match[1]}-${match[2]}-${match[3]}` : null;
}

function clip(text: string, limit: number): { value: string; clipped: boolean } {
  return text.length <= limit
    ? { value: text, clipped: false }
    : { value: `${text.slice(0, limit - 1)}…`, clipped: true };
}

function cleanTags(tags: string[] | undefined): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of tags ?? []) {
    const tag = raw.trim().slice(0, MAX_TAG_LENGTH);
    if (!tag || seen.has(tag.toLowerCase())) continue;
    seen.add(tag.toLowerCase());
    result.push(tag);
    if (result.length === MAX_TAGS) break;
  }
  return result;
}

function ref(prefix: string, index: number): string {
  return `${prefix}:${String(index + 1).padStart(3, '0')}`;
}

/** Counts a notice once per distinct text, with how many times it applied. */
class Notices {
  private readonly counts = new Map<string, number>();
  add(text: string) {
    this.counts.set(text, (this.counts.get(text) ?? 0) + 1);
  }
  list(): string[] {
    return [...this.counts].map(([text, count]) => (count > 1 ? `${text} (${count} items)` : text));
  }
}

export function buildDocument(
  source: ConversionSummary['source'],
  projectName: string,
  description: string,
  items: ImportItem[],
  skipped: Skipped[] = [],
  preNotices: string[] = [],
): Converted {
  if (items.length === 0) {
    throw new ImportFileError('The file has no items to import.');
  }
  if (items.length > TRANSFER_LIMITS.max_features) {
    throw new ImportFileError(
      `A project import takes at most ${TRANSFER_LIMITS.max_features} items; this file has ${items.length}. Split it and import the parts one by one.`,
    );
  }
  const notices = new Notices();
  const epicIndex = new Map<string, number>();
  const epics: Array<Record<string, unknown>> = [];

  const features = items.map((item, index) => {
    const title = clip(item.title.trim(), MAX_TITLE);
    if (title.clipped)
      notices.add(`A title was longer than ${MAX_TITLE} characters and was shortened`);

    const status = item.status ? statusFor(item.status) : 'backlog';
    if (status === null) notices.add(`Unknown status “${item.status}” imported as backlog`);
    const priority = item.priority ? priorityFor(item.priority) : 'medium';
    if (priority === null) notices.add(`Unknown priority “${item.priority}” imported as medium`);
    const isBug = norm(item.kind) === 'bug' || norm(item.kind) === 'defect';
    const dueDate = item.dueDate ? isoDateFor(item.dueDate) : null;
    if (item.dueDate && !dueDate) {
      notices.add(`Date “${item.dueDate}” was not understood (use YYYY-MM-DD) and was left empty`);
    }

    const body = clip((item.description ?? '').trim(), MAX_DESCRIPTION);
    if (body.clipped)
      notices.add(`A description was longer than ${MAX_DESCRIPTION} characters and was shortened`);
    const notes = clip(item.source ? `Imported from ${item.source}` : '', MAX_NOTES).value;

    let epicRef: string | undefined;
    const epicName = item.epic?.trim();
    if (epicName) {
      const key = epicName.toLowerCase();
      if (!epicIndex.has(key)) {
        if (epics.length >= MAX_EPICS) {
          notices.add(`More than ${MAX_EPICS} Epics: the extra groups were imported without one`);
        } else {
          epicIndex.set(key, epics.length);
          epics.push({ ref: ref('epic', epics.length), title: clip(epicName, MAX_TITLE).value });
        }
      }
      const position = epicIndex.get(key);
      if (position !== undefined) epicRef = ref('epic', position);
    }

    const severity = SEVERITIES.has(norm(item.severity)) ? norm(item.severity) : 'medium';
    return {
      ref: ref('feature', index),
      title: title.value,
      description: body.value || null,
      priority: priority ?? 'medium',
      status: status ?? 'backlog',
      kind: isBug ? 'bug' : 'story',
      ...(isBug ? { bug_severity: severity } : {}),
      ...(epicRef ? { epic_ref: epicRef } : {}),
      tags: cleanTags(item.tags),
      notes: notes || null,
      ...(dueDate ? { due_date: dueDate } : {}),
      tasks: [],
      acceptance_criteria: [],
    };
  });

  return {
    document: {
      schema_version: 'forge-project-transfer-v2',
      project: {
        name: clip(projectName.trim() || 'Imported project', MAX_TITLE).value,
        description,
      },
      epics,
      features,
      dependencies: [],
    },
    summary: {
      source,
      projectName,
      items: features.length,
      epics: epics.length,
      skipped,
      notices: [...preNotices, ...notices.list()],
    },
  };
}
