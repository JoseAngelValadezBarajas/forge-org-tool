import { describe, expect, it } from 'vitest';
import { detectDelimiter, csvToTransfer, parseCsv } from './csv';
import { isoDateFor, priorityFor, statusFor } from './document';
import { githubIssuesToTransfer, looksLikeGithubIssues, type GithubIssue } from './githubIssues';
import { convertForeignSource, ImportFileError } from './index';

type Feature = Record<string, unknown>;
const featuresOf = (converted: { document: Record<string, unknown> }) =>
  converted.document.features as Feature[];
const epicsOf = (converted: { document: Record<string, unknown> }) =>
  converted.document.epics as Feature[];

describe('parseCsv', () => {
  it('reads quoted fields, doubled quotes and line breaks inside quotes', () => {
    expect(parseCsv('a,b\r\n"x, y","say ""hi"""\n"two\nlines",z', ',')).toEqual([
      ['a', 'b'],
      ['x, y', 'say "hi"'],
      ['two\nlines', 'z'],
    ]);
  });

  it('drops a BOM and blank lines and keeps a last row without a newline', () => {
    expect(parseCsv(String.fromCharCode(0xfeff) + 'a,b\n\n1,2', ',')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('rejects an unclosed quote instead of swallowing the rest of the file', () => {
    expect(() => parseCsv('a,b\n"open,2', ',')).toThrow(ImportFileError);
  });

  it('detects comma, semicolon and tab from the header', () => {
    expect(detectDelimiter('a,b,c\n')).toBe(',');
    expect(detectDelimiter('a;b;c\n')).toBe(';');
    expect(detectDelimiter('a\tb\tc\n')).toBe('\t');
    expect(detectDelimiter('single\n')).toBe(',');
  });
});

describe('value mapping', () => {
  it.each([
    ['To Do', 'backlog'],
    ['In Progress', 'in_progress'],
    ['Review', 'verify'],
    ['CLOSED', 'done'],
    ['cerrado', 'done'],
    ['mystery', null],
  ])('maps status %s', (input, expected) => expect(statusFor(input)).toBe(expected));

  it.each([
    ['P0', 'critical'],
    ['Urgent', 'critical'],
    ['major', 'high'],
    ['Normal', 'medium'],
    ['alta', 'high'],
    ['whenever', null],
  ])('maps priority %s', (input, expected) => expect(priorityFor(input)).toBe(expected));

  it.each([
    ['2026-12-01', '2026-12-01'],
    ['2026/12/01', '2026-12-01'],
    ['2026-12-01T00:00:00Z', '2026-12-01'],
    ['2026-02-31', null],
    ['12/01/2026', null],
    ['', null],
  ])('reads date %s', (input, expected) => expect(isoDateFor(input)).toBe(expected));
});

describe('csvToTransfer', () => {
  const csv = [
    'Title,Description,Status,Priority,Type,Due,Tags,Epic',
    'Fix login,"Users can\'t sign in",In Progress,High,Bug,2026-12-01,"auth, urgent",Launch',
    'Write docs,,To Do,,,,docs,Launch',
    ',No title here,,,,,,',
    'Plan Q1,,Someday,Whenever,,01/12/2026,,',
  ].join('\n');

  it('builds a transfer v2 document from a spreadsheet export', () => {
    const converted = csvToTransfer(csv, 'Sprint plan.csv');
    expect(converted.document).toMatchObject({
      schema_version: 'forge-project-transfer-v2',
      project: { name: 'Sprint plan', description: 'Imported from Sprint plan.csv' },
      dependencies: [],
    });
    expect(epicsOf(converted)).toEqual([{ ref: 'epic:001', title: 'Launch' }]);
    const [login, docs, plan] = featuresOf(converted);
    expect(login).toMatchObject({
      ref: 'feature:001',
      title: 'Fix login',
      description: "Users can't sign in",
      status: 'in_progress',
      priority: 'high',
      kind: 'bug',
      bug_severity: 'medium',
      due_date: '2026-12-01',
      tags: ['auth', 'urgent'],
      epic_ref: 'epic:001',
    });
    expect(docs).toMatchObject({ status: 'backlog', priority: 'medium', epic_ref: 'epic:001' });
    expect(docs).not.toHaveProperty('due_date');
    expect(docs).not.toHaveProperty('bug_severity');
    expect(plan).toMatchObject({ status: 'backlog', priority: 'medium' });
    expect(plan).not.toHaveProperty('due_date');
    expect(plan).not.toHaveProperty('epic_ref');
  });

  it('reports skipped rows and every guess it made, once each', () => {
    const { summary } = csvToTransfer(csv, 'plan.csv');
    expect(summary).toMatchObject({ source: 'csv', items: 3, epics: 1 });
    expect(summary.skipped).toEqual([{ where: 'Row 4', reason: 'No title' }]);
    expect(summary.notices).toEqual([
      'Unknown status “Someday” imported as backlog',
      'Unknown priority “Whenever” imported as medium',
      'Date “01/12/2026” was not understood (use YYYY-MM-DD) and was left empty',
    ]);
  });

  it('understands Spanish headers and a semicolon delimiter', () => {
    const converted = csvToTransfer(
      'Título;Descripción;Estado;Prioridad;Etiquetas\nArreglar login;Falla;Hecho;Alta;auth|ui',
      'tareas.csv',
    );
    expect(featuresOf(converted)[0]).toMatchObject({
      title: 'Arreglar login',
      status: 'done',
      priority: 'high',
      tags: ['auth', 'ui'],
    });
  });

  it('shares one Epic between rows, ignoring case', () => {
    const converted = csvToTransfer('title,epic\nA,Launch\nB,launch\nC,Other', 'x.csv');
    expect(epicsOf(converted).map((epic) => epic.title)).toEqual(['Launch', 'Other']);
    expect(featuresOf(converted).map((feature) => feature.epic_ref)).toEqual([
      'epic:001',
      'epic:001',
      'epic:002',
    ]);
  });

  it('shortens text that the API would reject, and says so', () => {
    const converted = csvToTransfer(
      `title,description\n${'T'.repeat(300)},${'d'.repeat(5000)}`,
      'x.csv',
    );
    const [feature] = featuresOf(converted);
    expect((feature.title as string).length).toBe(200);
    expect((feature.description as string).length).toBe(4000);
    expect(converted.summary.notices).toHaveLength(2);
  });

  it('refuses a file without a title column, without items, or with too many items', () => {
    expect(() => csvToTransfer('name2,other\nA,B', 'x.csv')).toThrow(/title column/);
    expect(() => csvToTransfer('title\n', 'x.csv')).toThrow(/header row and at least one item/);
    expect(() => csvToTransfer('title\n,\n', 'x.csv')).toThrow(/header row and at least one item/);
    expect(() => csvToTransfer('title,note\n,only a note', 'x.csv')).toThrow(/no items/);
    const many = ['title', ...Array.from({ length: 501 }, (_, i) => `Item ${i}`)].join('\n');
    expect(() => csvToTransfer(many, 'x.csv')).toThrow(/at most 500/);
  });
});

describe('githubIssuesToTransfer', () => {
  const issues: GithubIssue[] = [
    {
      number: 12,
      title: 'Login fails on Safari',
      body: 'Steps…',
      state: 'OPEN',
      labels: [{ name: 'bug' }, { name: 'priority: high' }, { name: 'auth' }],
      milestone: { title: 'v1.0', dueOn: '2026-12-15T00:00:00Z' },
      url: 'https://github.com/acme/app/issues/12',
    },
    {
      number: 13,
      title: 'Add dark mode',
      body: null,
      state: 'CLOSED',
      labels: [{ name: 'enhancement' }],
      milestone: null,
      url: 'https://github.com/acme/app/issues/13',
    },
    {
      number: 14,
      title: 'Fix typo',
      state: 'open',
      url: 'https://github.com/acme/app/pull/14',
      pull_request: {},
    },
    { number: 15, title: '', state: 'open' },
  ];

  it('maps state, labels and milestones, and skips pull requests', () => {
    const converted = githubIssuesToTransfer(issues);
    expect(converted.document).toMatchObject({
      project: {
        name: 'acme/app issues',
        description: 'Imported from the GitHub issues of acme/app',
      },
    });
    const [bug, dark] = featuresOf(converted);
    expect(bug).toMatchObject({
      title: 'Login fails on Safari',
      kind: 'bug',
      bug_severity: 'medium',
      priority: 'high',
      status: 'backlog',
      tags: ['auth'],
      epic_ref: 'epic:001',
      due_date: '2026-12-15',
      notes: 'Imported from GitHub issue #12 (https://github.com/acme/app/issues/12)',
    });
    expect(dark).toMatchObject({
      kind: 'story',
      status: 'done',
      priority: 'medium',
      tags: ['enhancement'],
    });
    expect(dark).not.toHaveProperty('epic_ref');
    expect(epicsOf(converted)).toEqual([{ ref: 'epic:001', title: 'v1.0' }]);
    expect(converted.summary.skipped).toEqual([
      { where: '#14', reason: 'Pull request' },
      { where: '#15', reason: 'No title' },
    ]);
  });

  it('reads the REST API shape too: string-free labels, due_on and lowercase state', () => {
    const converted = githubIssuesToTransfer([
      {
        number: 1,
        title: 'Old bug',
        state: 'closed',
        labels: [{ name: 'Bug' }],
        milestone: { title: 'm', due_on: '2026-11-01T00:00:00Z' },
        html_url: 'https://github.com/o/r/issues/1',
      },
    ]);
    expect(featuresOf(converted)[0]).toMatchObject({
      status: 'done',
      kind: 'bug',
      due_date: '2026-11-01',
    });
  });

  it('refuses an empty list', () => {
    expect(() => githubIssuesToTransfer([])).toThrow(/no GitHub issues/);
    expect(() => githubIssuesToTransfer([{ number: 1, title: 'x', pull_request: {} }])).toThrow(
      /no items/,
    );
  });
});

describe('convertForeignSource', () => {
  it('routes a CSV, GitHub issues and leaves a FORGE document alone', () => {
    expect(convertForeignSource('a.csv', 'title\nX')?.summary.source).toBe('csv');
    expect(
      convertForeignSource(
        'issues.json',
        JSON.stringify([{ number: 1, title: 'X', state: 'open' }]),
      )?.summary.source,
    ).toBe('github');
    expect(
      convertForeignSource(
        'p.json',
        JSON.stringify({ schema_version: 'forge-project-transfer-v2' }),
      ),
    ).toBeNull();
    expect(convertForeignSource('broken.json', '{nope')).toBeNull();
    expect(convertForeignSource('package.zip', 'zip')).toBeNull();
  });

  it('explains how to export when a JSON list is not GitHub issues', () => {
    expect(() => convertForeignSource('list.json', JSON.stringify([{ a: 1 }]))).toThrow(
      /gh issue list/,
    );
  });

  it('recognizes only arrays of numbered, titled objects as GitHub issues', () => {
    expect(looksLikeGithubIssues([{ number: 1, title: 'x' }])).toBe(true);
    expect(looksLikeGithubIssues([{ title: 'x' }])).toBe(false);
    expect(looksLikeGithubIssues([])).toBe(false);
    expect(looksLikeGithubIssues({ number: 1, title: 'x' })).toBe(false);
  });
});
