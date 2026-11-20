import {
  buildDocument,
  ImportFileError,
  type Converted,
  type ImportItem,
  type Skipped,
} from './document';

type Label = string | { name?: string };
type Milestone = { title?: string; dueOn?: string | null; due_on?: string | null } | null;

/** The fields of `gh issue list --json …` or the REST API that the import reads. */
export type GithubIssue = {
  number?: number;
  title?: string;
  body?: string | null;
  state?: string;
  labels?: Label[];
  milestone?: Milestone;
  url?: string;
  html_url?: string;
  pull_request?: unknown;
};

const BUG_LABEL = /^(bug|defect|type:\s*bug|kind\/bug)$/i;
const PRIORITY_LABEL = /^(?:priority[:/\s-]*)?(critical|urgent|blocker|high|medium|low|p[0-3])$/i;

function labelName(label: Label): string {
  return typeof label === 'string' ? label : (label.name ?? '');
}

/** Whether a parsed JSON value looks like a list of GitHub issues. */
export function looksLikeGithubIssues(value: unknown): value is GithubIssue[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (entry) =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as GithubIssue).title === 'string' &&
        typeof (entry as GithubIssue).number === 'number',
    )
  );
}

function repositoryName(issues: GithubIssue[]): string | null {
  for (const issue of issues) {
    const match = /github\.com\/([^/]+\/[^/]+)\/(?:issues|pull)\//.exec(
      issue.url ?? issue.html_url ?? '',
    );
    if (match) return match[1];
  }
  return null;
}

/**
 * Converts GitHub issues into a transfer document. Pull requests are skipped, a closed issue
 * becomes Done, a `bug` label makes it a Bug, a priority label sets its priority, and each
 * milestone becomes an Epic (its due date becomes the deadline of its issues).
 */
export function githubIssuesToTransfer(issues: GithubIssue[]): Converted {
  if (!Array.isArray(issues) || issues.length === 0) {
    throw new ImportFileError('The file has no GitHub issues.');
  }
  const items: ImportItem[] = [];
  const skipped: Skipped[] = [];

  for (const issue of issues) {
    const where = `#${issue.number ?? '?'}`;
    if (issue.pull_request) {
      skipped.push({ where, reason: 'Pull request' });
      continue;
    }
    if (!issue.title?.trim()) {
      skipped.push({ where, reason: 'No title' });
      continue;
    }
    const names = (issue.labels ?? []).map(labelName).filter(Boolean);
    const priority = names.map((name) => PRIORITY_LABEL.exec(name)?.[1]).find(Boolean);
    const milestone = issue.milestone ?? null;
    const link = issue.url ?? issue.html_url;
    items.push({
      title: issue.title,
      description: issue.body ?? '',
      status: (issue.state ?? 'open').toLowerCase(),
      priority,
      kind: names.some((name) => BUG_LABEL.test(name)) ? 'bug' : 'story',
      dueDate: milestone?.dueOn ?? milestone?.due_on ?? null,
      tags: names.filter((name) => !BUG_LABEL.test(name) && !PRIORITY_LABEL.test(name)),
      epic: milestone?.title ?? null,
      source: link ? `GitHub issue #${issue.number} (${link})` : `GitHub issue #${issue.number}`,
    });
  }

  const repository = repositoryName(issues);
  return buildDocument(
    'github',
    repository ? `${repository} issues` : 'GitHub issues',
    repository ? `Imported from the GitHub issues of ${repository}` : 'Imported from GitHub issues',
    items,
    skipped,
  );
}
