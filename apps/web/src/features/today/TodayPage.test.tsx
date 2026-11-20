import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  organizationApi,
  type Epic,
  type Feature,
  type PlanningOverview,
  type Project,
  type Workspace,
} from '@forge-org/api-client';
import { TodayPage } from './TodayPage';
import { formatLocalDate } from './quickCapture';

const stamps = { created_at: '2026-11-01T00:00:00Z', updated_at: '2026-11-01T00:00:00Z' };
const workspace: Workspace = { id: 'w1', name: 'Personal', description: null, ...stamps };
const inbox: Project = {
  id: 'p1',
  workspace_id: 'w1',
  name: 'Inbox',
  description: null,
  status: 'active',
  archived_at: null,
  ...stamps,
};

function addDays(days: number): string {
  const base = new Date();
  return formatLocalDate(new Date(base.getFullYear(), base.getMonth(), base.getDate() + days));
}

function feature(id: string, overrides: Partial<Feature> = {}): Feature {
  return {
    id,
    project_id: 'p1',
    epic_id: null,
    title: id,
    description: null,
    goal: null,
    priority: 'medium',
    status: 'backlog',
    kind: 'story',
    due_date: null,
    ...stamps,
    ...overrides,
  } as Feature;
}

function overview(...features: Feature[]): PlanningOverview {
  return { epics: [], unassigned_features: features };
}

function renderToday() {
  return render(
    <MemoryRouter>
      <TodayPage />
    </MemoryRouter>,
  );
}

describe('Today', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(organizationApi, 'listWorkspaces').mockResolvedValue([workspace]);
    vi.spyOn(organizationApi, 'listProjects').mockResolvedValue([inbox]);
    vi.spyOn(organizationApi, 'planningOverview').mockResolvedValue(overview());
    vi.spyOn(organizationApi, 'listDependencies').mockResolvedValue([]);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('creates a personal workspace and an Inbox on first use, with no setup screen', async () => {
    const events: string[] = [];
    const listener = (event: Event) => events.push(event.type);
    window.addEventListener('forge:workspace-created', listener);
    window.addEventListener('forge:projects-changed', listener);
    vi.mocked(organizationApi.listWorkspaces).mockResolvedValue([]);
    vi.mocked(organizationApi.listProjects).mockResolvedValue([]);
    const createWorkspace = vi
      .spyOn(organizationApi, 'createWorkspace')
      .mockResolvedValue(workspace);
    const createProject = vi.spyOn(organizationApi, 'createProject').mockResolvedValue(inbox);

    renderToday();

    expect(await screen.findByRole('heading', { name: 'Today' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Capture a task' })).toBeInTheDocument();
    expect(createWorkspace).toHaveBeenCalledWith('Personal');
    expect(createProject).toHaveBeenCalledWith('w1', 'Inbox');
    expect(events).toEqual(['forge:workspace-created', 'forge:projects-changed']);
    expect(localStorage.getItem('forge-active-workspace')).toBe('w1');
    expect(screen.getByText('Nothing to do yet')).toBeInTheDocument();
    window.removeEventListener('forge:workspace-created', listener);
    window.removeEventListener('forge:projects-changed', listener);
  });

  it('does not create a second workspace or Inbox when they already exist', async () => {
    const createWorkspace = vi.spyOn(organizationApi, 'createWorkspace');
    const createProject = vi.spyOn(organizationApi, 'createProject');
    renderToday();
    await screen.findByRole('heading', { name: 'Today' });
    expect(createWorkspace).not.toHaveBeenCalled();
    expect(createProject).not.toHaveBeenCalled();
  });

  it('groups open work by urgency and hides finished work', async () => {
    vi.mocked(organizationApi.planningOverview).mockResolvedValue(
      overview(
        feature('Late invoice', { due_date: addDays(-3) }),
        feature('Ship build', { due_date: addDays(0) }),
        feature('Plan sprint', { due_date: addDays(3) }),
        feature('Learn Rust', { due_date: addDays(30) }),
        feature('Someday idea'),
        feature('Already done', { due_date: addDays(0), status: 'done' }),
      ),
    );
    renderToday();

    const overdue = await screen.findByRole('region', { name: /Overdue/ });
    expect(within(overdue).getByRole('link', { name: 'Late invoice' })).toBeInTheDocument();
    expect(within(overdue).getByText('3 days overdue')).toBeInTheDocument();
    expect(
      within(screen.getByRole('region', { name: /^Today/ })).getByRole('link', {
        name: 'Ship build',
      }),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('region', { name: /Next 7 days/ })).getByRole('link', {
        name: 'Plan sprint',
      }),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('region', { name: /Later/ })).getByRole('link', {
        name: 'Learn Rust',
      }),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('region', { name: /No date/ })).getByRole('link', {
        name: 'Someday idea',
      }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Already done' })).not.toBeInTheDocument();
    expect(screen.getByText('2 need your attention')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ship build' })).toHaveAttribute(
      'href',
      '/planning/w1/p1/features/Ship build',
    );
  });

  it('captures a task with a natural-language date in one step', async () => {
    const created = feature('f-new', { title: 'Fix login', due_date: addDays(1) });
    const createFeature = vi.spyOn(organizationApi, 'createFeature').mockResolvedValue(created);
    renderToday();

    const input = await screen.findByRole('textbox', { name: 'Capture a task' });
    fireEvent.change(input, { target: { value: 'Fix login tomorrow' } });
    expect(screen.getByText('Due Tomorrow')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() =>
      expect(createFeature).toHaveBeenCalledWith('w1', 'p1', 'Fix login', undefined, {
        due_date: addDays(1),
      }),
    );
    expect(await screen.findByRole('link', { name: 'Fix login' })).toBeInTheDocument();
    expect(input).toHaveValue('');
    expect(screen.getByRole('status')).toHaveTextContent('Added “Fix login” · Tomorrow');
  });

  it('captures a task without a date and keeps it in No date', async () => {
    const createFeature = vi
      .spyOn(organizationApi, 'createFeature')
      .mockResolvedValue(feature('f2', { title: 'Read the RFC' }));
    renderToday();
    const input = await screen.findByRole('textbox', { name: 'Capture a task' });
    fireEvent.change(input, { target: { value: 'Read the RFC' } });
    fireEvent.submit(screen.getByRole('form', { name: 'Quick capture' }));

    await waitFor(() =>
      expect(createFeature).toHaveBeenCalledWith('w1', 'p1', 'Read the RFC', undefined, undefined),
    );
    expect(
      within(await screen.findByRole('region', { name: /No date/ })).getByRole('link', {
        name: 'Read the RFC',
      }),
    ).toBeInTheDocument();
  });

  it('does not submit an empty line', async () => {
    const createFeature = vi.spyOn(organizationApi, 'createFeature');
    renderToday();
    await screen.findByRole('textbox', { name: 'Capture a task' });
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();
    fireEvent.submit(screen.getByRole('form', { name: 'Quick capture' }));
    expect(createFeature).not.toHaveBeenCalled();
  });

  it('completes a task and lets the user undo it', async () => {
    vi.mocked(organizationApi.planningOverview).mockResolvedValue(
      overview(feature('Ship build', { due_date: addDays(0) })),
    );
    const updateFeature = vi
      .spyOn(organizationApi, 'updateFeature')
      .mockResolvedValueOnce(feature('Ship build', { due_date: addDays(0), status: 'done' }))
      .mockResolvedValueOnce(feature('Ship build', { due_date: addDays(0), status: 'backlog' }));
    renderToday();

    fireEvent.click(await screen.findByRole('checkbox', { name: 'Complete Ship build' }));

    await waitFor(() =>
      expect(updateFeature).toHaveBeenCalledWith('w1', 'p1', 'Ship build', { status: 'done' }),
    );
    await waitFor(() =>
      expect(screen.queryByRole('link', { name: 'Ship build' })).not.toBeInTheDocument(),
    );
    expect(screen.getByRole('status')).toHaveTextContent('Completed “Ship build”');

    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(await screen.findByRole('link', { name: 'Ship build' })).toBeInTheDocument();
    expect(updateFeature).toHaveBeenLastCalledWith('w1', 'p1', 'Ship build', {
      status: 'backlog',
    });
  });

  it('changes and clears a due date from the row', async () => {
    vi.mocked(organizationApi.planningOverview).mockResolvedValue(
      overview(feature('Plan sprint', { due_date: addDays(3) })),
    );
    const updateFeature = vi
      .spyOn(organizationApi, 'updateFeature')
      .mockResolvedValueOnce(feature('Plan sprint', { due_date: addDays(0) }))
      .mockResolvedValueOnce(feature('Plan sprint', { due_date: null }));
    renderToday();

    const date = await screen.findByLabelText('Due date for Plan sprint');
    fireEvent.change(date, { target: { value: addDays(0) } });
    await waitFor(() =>
      expect(updateFeature).toHaveBeenCalledWith('w1', 'p1', 'Plan sprint', {
        due_date: addDays(0),
      }),
    );
    expect(
      within(await screen.findByRole('region', { name: /^Today/ })).getByRole('link', {
        name: 'Plan sprint',
      }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Due date for Plan sprint'), { target: { value: '' } });
    await waitFor(() =>
      expect(updateFeature).toHaveBeenLastCalledWith('w1', 'p1', 'Plan sprint', {
        due_date: null,
      }),
    );
    expect(
      within(await screen.findByRole('region', { name: /No date/ })).getByRole('link', {
        name: 'Plan sprint',
      }),
    ).toBeInTheDocument();
  });

  it('moves overdue work to today with one click, one task or all of it', async () => {
    vi.mocked(organizationApi.planningOverview).mockResolvedValue(
      overview(
        feature('Late A', { due_date: addDays(-3) }),
        feature('Late B', { due_date: addDays(-1) }),
      ),
    );
    const updateFeature = vi
      .spyOn(organizationApi, 'updateFeature')
      .mockImplementation(async (_w, _p, id, values) =>
        feature(id, { due_date: (values as { due_date: string }).due_date }),
      );
    renderToday();

    fireEvent.click(await screen.findByRole('button', { name: 'Move Late A to today' }));
    await waitFor(() =>
      expect(updateFeature).toHaveBeenCalledWith('w1', 'p1', 'Late A', { due_date: addDays(0) }),
    );
    expect(
      within(await screen.findByRole('region', { name: /^Today/ })).getByRole('link', {
        name: 'Late A',
      }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Move all to today' }));
    await waitFor(() =>
      expect(updateFeature).toHaveBeenCalledWith('w1', 'p1', 'Late B', { due_date: addDays(0) }),
    );
    await waitFor(() => expect(screen.queryByRole('region', { name: /Overdue/ })).toBeNull());
    expect(screen.getByRole('status')).toHaveTextContent('Moved 1 overdue to today');
  });

  it('shows the project name only when there is more than one project', async () => {
    const side: Project = { ...inbox, id: 'p2', name: 'Side project' };
    vi.mocked(organizationApi.listProjects).mockResolvedValue([inbox, side]);
    vi.mocked(organizationApi.planningOverview).mockImplementation(async (_w, projectId) =>
      overview(feature(`from-${projectId}`, { project_id: projectId })),
    );
    renderToday();
    expect(await screen.findByText('Side project')).toBeInTheDocument();
    expect(screen.getAllByText('Inbox').length).toBeGreaterThan(0);
  });

  it('reports a load failure and retries', async () => {
    vi.mocked(organizationApi.planningOverview)
      .mockRejectedValueOnce(new Error('Database is busy'))
      .mockResolvedValue(overview(feature('Recovered')));
    renderToday();

    expect(await screen.findByRole('alert')).toHaveTextContent('Database is busy');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('link', { name: 'Recovered' })).toBeInTheDocument();
  });

  it('focuses the capture field when n is pressed outside a text field', async () => {
    renderToday();
    const input = await screen.findByRole('textbox', { name: 'Capture a task' });
    expect(input).not.toHaveFocus();
    fireEvent.keyDown(document.body, { key: 'n' });
    expect(input).toHaveFocus();
  });
});

describe('Organize', () => {
  const atlas: Project = { ...inbox, id: 'p2', name: 'Atlas' };
  const launch = {
    id: 'e1',
    project_id: 'p2',
    title: 'Launch',
    description: null,
    status: 'backlog',
    priority: 'medium',
    tags: [],
    archived_at: null,
    ...stamps,
  } as unknown as Epic;

  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(organizationApi, 'listWorkspaces').mockResolvedValue([workspace]);
    vi.spyOn(organizationApi, 'listProjects').mockResolvedValue([inbox, atlas]);
    vi.spyOn(organizationApi, 'listDependencies').mockResolvedValue([]);
    vi.spyOn(organizationApi, 'planningOverview').mockImplementation(async (_w, projectId) =>
      projectId === 'p1'
        ? overview(feature('Fix login', { tags: ['auth'] }))
        : { epics: [{ ...launch, features: [] }], unassigned_features: [] },
    );
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  async function openDialog() {
    renderToday();
    fireEvent.click(await screen.findByRole('button', { name: 'Organize Fix login' }));
    return screen.findByRole('dialog', { name: /Organize task/ });
  }

  it('opens with the current project, type, priority and tags', async () => {
    const dialog = await openDialog();
    expect(within(dialog).getByLabelText('Project')).toHaveValue('p1');
    expect(within(dialog).getByLabelText('Epic')).toHaveValue('');
    expect(within(dialog).getByLabelText('Type')).toHaveValue('story');
    expect(within(dialog).getByLabelText('Priority')).toHaveValue('medium');
    expect(within(dialog).getByLabelText('Tags')).toHaveValue('auth');
  });

  it('closes without calling the API when nothing changed', async () => {
    const update = vi.spyOn(organizationApi, 'updateFeature');
    const move = vi.spyOn(organizationApi, 'moveFeature');
    const dialog = await openDialog();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(update).not.toHaveBeenCalled();
    expect(move).not.toHaveBeenCalled();
  });

  it('changes priority, type and tags in place with one update', async () => {
    const update = vi
      .spyOn(organizationApi, 'updateFeature')
      .mockResolvedValue(
        feature('Fix login', { priority: 'high', kind: 'bug', tags: ['auth', 'urgent'] }),
      );
    const dialog = await openDialog();
    fireEvent.change(within(dialog).getByLabelText('Priority'), { target: { value: 'high' } });
    fireEvent.change(within(dialog).getByLabelText('Type'), { target: { value: 'bug' } });
    fireEvent.change(within(dialog).getByLabelText('Tags'), { target: { value: 'auth, urgent' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(update).toHaveBeenCalledWith('w1', 'p1', 'Fix login', {
        priority: 'high',
        kind: 'bug',
        bug_severity: 'medium',
        tags: ['auth', 'urgent'],
      }),
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('status')).toHaveTextContent('Organized “Fix login”');
    expect(screen.getByText('Bug')).toBeInTheDocument();
  });

  it('moves the task to another project and Epic and shows its new project', async () => {
    const move = vi
      .spyOn(organizationApi, 'moveFeature')
      .mockResolvedValue(feature('Fix login', { project_id: 'p2', epic_id: 'e1' }));
    const dialog = await openDialog();
    fireEvent.change(within(dialog).getByLabelText('Project'), { target: { value: 'p2' } });
    expect(within(dialog).getByText('Launch')).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText('Epic'), { target: { value: 'e1' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(move).toHaveBeenCalledWith('w1', 'p1', 'Fix login', 'p2', 'e1'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('Atlas')).toBeInTheDocument();
  });

  it('keeps the dialog open and explains a refused move without changing the task', async () => {
    vi.spyOn(organizationApi, 'moveFeature').mockRejectedValue(
      new Error('This work item has dependencies. Remove them before moving it to another project'),
    );
    const dialog = await openDialog();
    fireEvent.change(within(dialog).getByLabelText('Project'), { target: { value: 'p2' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('has dependencies');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.queryByText('Atlas', { selector: 'span' })).not.toBeInTheDocument();
  });

  it('assigns an Epic inside the same project with a plain update and clears it again', async () => {
    const update = vi
      .spyOn(organizationApi, 'updateFeature')
      .mockResolvedValue(feature('Fix login', { epic_id: 'e1' }));
    vi.mocked(organizationApi.planningOverview).mockImplementation(async (_w, projectId) =>
      projectId === 'p1'
        ? {
            epics: [{ ...launch, project_id: 'p1', features: [] }],
            unassigned_features: [feature('Fix login', { tags: ['auth'] })],
          }
        : { epics: [], unassigned_features: [] },
    );
    const dialog = await openDialog();
    fireEvent.change(within(dialog).getByLabelText('Epic'), { target: { value: 'e1' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(update).toHaveBeenCalledWith('w1', 'p1', 'Fix login', { epic_id: 'e1' }),
    );
  });

  it('refuses tags the API would reject before sending anything', async () => {
    const update = vi.spyOn(organizationApi, 'updateFeature');
    const dialog = await openDialog();
    fireEvent.change(within(dialog).getByLabelText('Tags'), { target: { value: 'x'.repeat(41) } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('up to 40 characters');
    expect(update).not.toHaveBeenCalled();
  });
});

describe('Decision views', () => {
  function renderAt(entry: string) {
    return render(
      <MemoryRouter initialEntries={[entry]}>
        <TodayPage />
      </MemoryRouter>,
    );
  }

  const daysAgo = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString();
  };

  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(organizationApi, 'listWorkspaces').mockResolvedValue([workspace]);
    vi.spyOn(organizationApi, 'listProjects').mockResolvedValue([inbox]);
    vi.spyOn(organizationApi, 'listDependencies').mockResolvedValue([
      {
        id: 'd1',
        project_id: 'p1',
        blocking_feature_id: 'api',
        blocked_feature_id: 'ui',
        ...stamps,
      },
    ] as never);
    vi.spyOn(organizationApi, 'planningOverview').mockResolvedValue(
      overview(
        feature('api', { status: 'in_progress', updated_at: daysAgo(1) }),
        feature('ui', { status: 'ready', updated_at: daysAgo(2) }),
        feature('Review copy', { status: 'verify', due_date: addDays(5), updated_at: daysAgo(1) }),
        feature('Old spike', { status: 'in_progress', updated_at: daysAgo(30) }),
        feature('Loose idea'),
      ),
    );
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('shows how many items each view has before it is opened', async () => {
    renderAt('/');
    const views = await screen.findByRole('group', { name: 'Views' });
    expect(within(views).getByRole('button', { name: /Blocked/ })).toHaveTextContent('1');
    expect(within(views).getByRole('button', { name: /Verify/ })).toHaveTextContent('1');
    expect(within(views).getByRole('button', { name: /Stalled/ })).toHaveTextContent('1');
    expect(within(views).getByRole('button', { name: /Upcoming/ })).toHaveTextContent('1');
    expect(within(views).getByRole('button', { name: /Unorganized/ })).toHaveTextContent('5');
    expect(within(views).getByRole('button', { name: /^Due/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('opens Blocked and says what each item is waiting on', async () => {
    renderAt('/');
    fireEvent.click(await screen.findByRole('button', { name: /Blocked/ }));
    const region = await screen.findByRole('region', { name: /Blocked/ });
    expect(within(region).getByRole('link', { name: 'ui' })).toBeInTheDocument();
    expect(within(region).getByText('Blocked by api')).toBeInTheDocument();
    expect(within(region).queryByRole('link', { name: 'api' })).not.toBeInTheDocument();
  });

  it('opens a view straight from its URL, so it can be linked', async () => {
    renderAt('/?view=verify');
    const region = await screen.findByRole('region', { name: /Verify/ });
    expect(within(region).getByRole('link', { name: 'Review copy' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Verify/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('explains how stale an item is', async () => {
    renderAt('/?view=stalled');
    expect(await screen.findByText('No activity for 30 days')).toBeInTheDocument();
  });

  it('shows an empty message when a view has nothing, and falls back from an unknown view', async () => {
    vi.mocked(organizationApi.planningOverview).mockResolvedValue(overview());
    renderAt('/?view=blocked');
    expect(await screen.findByText('Nothing is waiting on a dependency.')).toBeInTheDocument();
    cleanup();

    renderAt('/?view=everything');
    expect(await screen.findByRole('button', { name: /^Due/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('acts on an item inside a view like anywhere else', async () => {
    const update = vi
      .spyOn(organizationApi, 'updateFeature')
      .mockResolvedValue(feature('Review copy', { status: 'done' }));
    renderAt('/?view=verify');
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Complete Review copy' }));
    await waitFor(() =>
      expect(update).toHaveBeenCalledWith('w1', 'p1', 'Review copy', { status: 'done' }),
    );
    await waitFor(() =>
      expect(screen.queryByRole('link', { name: 'Review copy' })).not.toBeInTheDocument(),
    );
  });
});
