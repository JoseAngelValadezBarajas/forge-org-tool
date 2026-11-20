import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  organizationApi,
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
