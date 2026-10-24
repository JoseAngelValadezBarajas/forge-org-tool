import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  organizationApi,
  type Criterion,
  type Dependency,
  type Feature,
  type PlanningOverview,
  type Project,
  type Task,
  type Workspace,
} from '@forge-org/api-client';
import { App } from '../../app/App';

const dates = { created_at: '2026-10-20T10:00:00Z', updated_at: '2026-10-22T12:00:00Z' };
const workspace: Workspace = {
  id: 'w1',
  name: 'Research',
  description: 'Workspace notes',
  ...dates,
};
const project: Project = {
  id: 'p1',
  workspace_id: 'w1',
  name: 'Atlas',
  description: 'Persisted project notes',
  status: 'active',
  archived_at: null,
  ...dates,
};
function feature(id: string, priority: string, status: string, updated_at: string): Feature {
  return {
    id,
    project_id: 'p1',
    epic_id: null,
    title: id,
    description: null,
    goal: null,
    priority,
    status,
    ...dates,
    updated_at,
  };
}
const features: Feature[] = [
  feature('Completed critical', 'critical', 'done', '2026-10-23T12:00:00Z'),
  feature('Newest low', 'low', 'backlog', '2026-10-23T12:00:00Z'),
  feature('Older high', 'high', 'in_progress', '2026-10-21T12:00:00Z'),
  { ...feature('Pending critical', 'critical', 'blocked', '2026-10-20T12:00:00Z'), epic_id: 'e1' },
  feature('Medium work', 'medium', 'ready', '2026-10-22T12:00:00Z'),
  feature('Newer high', 'high', 'ready', '2026-10-22T12:00:00Z'),
];
const overview: PlanningOverview = {
  epics: [
    {
      id: 'e1',
      project_id: 'p1',
      title: 'First epic',
      description: null,
      status: 'backlog',
      ...dates,
      features: [features[3]!],
    },
  ],
  unassigned_features: features.filter((item) => item.epic_id === null),
};
const tasks: Task[] = [
  {
    id: 't1',
    feature_id: 'Completed critical',
    title: 'Completed task',
    description: null,
    position: 0,
    status: 'done',
    ...dates,
  },
  {
    id: 't2',
    feature_id: 'Medium work',
    title: 'Pending task',
    description: null,
    position: 0,
    status: 'todo',
    ...dates,
  },
];
const criteria: Criterion[] = [
  {
    id: 'c1',
    feature_id: 'Completed critical',
    description: 'Declared satisfied',
    position: 0,
    satisfied: true,
    ...dates,
  },
  {
    id: 'c2',
    feature_id: 'Medium work',
    description: 'Declared pending',
    position: 0,
    satisfied: false,
    ...dates,
  },
  {
    id: 'c3',
    feature_id: 'Medium work',
    description: 'Also pending',
    position: 1,
    satisfied: false,
    ...dates,
  },
];
const dependencies: Dependency[] = [
  {
    id: 'dep1',
    project_id: 'p1',
    blocking_feature_id: 'Pending critical',
    blocked_feature_id: 'Medium work',
    ...dates,
  },
];

function renderOverview() {
  return render(
    <MemoryRouter initialEntries={['/projects/w1/p1']}>
      <App />
    </MemoryRouter>,
  );
}

describe('Project Overview route', () => {
  beforeEach(() => {
    vi.spyOn(organizationApi, 'getProject').mockResolvedValue(project);
    vi.spyOn(organizationApi, 'listWorkspaces').mockResolvedValue([workspace]);
    vi.spyOn(organizationApi, 'listProjects').mockResolvedValue([project]);
    vi.spyOn(organizationApi, 'planningOverview').mockResolvedValue(overview);
    vi.spyOn(organizationApi, 'listTasks').mockImplementation(async (_w, _p, id) =>
      tasks.filter((item) => item.feature_id === id),
    );
    vi.spyOn(organizationApi, 'listCriteria').mockImplementation(async (_w, _p, id) =>
      criteria.filter((item) => item.feature_id === id),
    );
    vi.spyOn(organizationApi, 'listDependencies').mockResolvedValue(dependencies);
    vi.spyOn(organizationApi, 'updateProject').mockResolvedValue(project);
    vi.spyOn(organizationApi, 'setProjectStatus').mockResolvedValue(project);
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('renders persisted metadata, every real count, bounded priority ordering, and scoped links', async () => {
    renderOverview();
    expect(screen.getByRole('status', { name: 'Loading project overview' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Atlas' })).toBeInTheDocument();
    const details = screen.getByRole('region', { name: 'Project details' });
    expect(details).toHaveTextContent('Research');
    expect(details).toHaveTextContent('Persisted project notes');
    expect(details).toHaveTextContent('active');
    expect(within(details).getByText(dates.created_at)).toBeVisible();
    expect(within(details).getByText(dates.updated_at)).toBeVisible();
    const summary = within(screen.getByRole('region', { name: 'Project summary' }));
    for (const [label, value] of [
      ['Features', '6'],
      ['Tasks', '2'],
      ['Epics', '1'],
      ['Acceptance criteria', '1 / 3'],
      ['Dependencies', '1'],
    ]) {
      expect(summary.getByText(label!).closest('article')).toHaveTextContent(value!);
    }
    const pending = within(screen.getByRole('region', { name: 'Pending Features' }));
    expect(pending.getAllByRole('link').map((link) => link.textContent)).toEqual([
      'Pending critical',
      'Newer high',
      'Older high',
      'Medium work',
    ]);
    expect(pending.getByRole('link', { name: 'Pending critical' })).toHaveAttribute(
      'href',
      '/planning/w1/p1/features/Pending critical',
    );
    expect(screen.getByRole('link', { name: 'Open planning board' })).toHaveAttribute(
      'href',
      '/planning/w1/p1',
    );
    expect(screen.getByRole('link', { name: 'Transfer / export' })).toHaveAttribute(
      'href',
      '/transfer/w1/p1',
    );
    expect(screen.getByRole('link', { name: 'Back to Organization' })).toHaveAttribute('href', '/');
    expect(organizationApi.getProject).toHaveBeenCalledWith('w1', 'p1');
    expect(organizationApi.planningOverview).toHaveBeenCalledWith('w1', 'p1');
    for (const item of features) {
      expect(organizationApi.listTasks).toHaveBeenCalledWith('w1', 'p1', item.id);
      expect(organizationApi.listCriteria).toHaveBeenCalledWith('w1', 'p1', item.id);
    }
    for (const operation of ['listDependencies'] as const) {
      expect(organizationApi[operation]).toHaveBeenCalledWith('w1', 'p1');
    }
  });

  it('reconciles total Epic count across workflow, archived, and unsupported records', async () => {
    vi.mocked(organizationApi.planningOverview).mockResolvedValue({
      epics: [
        { ...overview.epics[0]!, status: 'backlog' },
        {
          ...overview.epics[0]!,
          id: 'e-archived',
          title: 'Archived Epic',
          archived_at: '2026-10-01T00:00:00Z',
        },
        {
          ...overview.epics[0]!,
          id: 'e-legacy',
          title: 'Custom state Epic',
          status: 'custom_legacy',
        },
      ],
      unassigned_features: overview.unassigned_features,
    });
    renderOverview();
    await screen.findByRole('heading', { name: 'Atlas' });
    const summary = within(screen.getByRole('region', { name: 'Project summary' }));
    expect(summary.getByText('Epics').closest('article')).toHaveTextContent('3');
    expect(summary.getByText('Epics').closest('article')).toHaveTextContent(
      '1 in workflow · 1 archived · 1 legacy',
    );
  });

  it('supports all priority levels when fewer than four Features are pending', async () => {
    vi.mocked(organizationApi.planningOverview).mockResolvedValue({
      epics: [],
      unassigned_features: [features[1]!, features[4]!, features[3]!],
    });
    renderOverview();
    await screen.findByRole('heading', { name: 'Atlas' });
    expect(
      within(screen.getByRole('region', { name: 'Pending Features' }))
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['Pending critical', 'Medium work', 'Newest low']);
  });

  it('saves changed fields and displays the returned persisted values', async () => {
    vi.mocked(organizationApi.updateProject).mockResolvedValue({
      ...project,
      name: 'Saved Atlas',
      description: 'Saved description',
      updated_at: '2026-10-23T10:00:00Z',
    });
    renderOverview();
    await screen.findByRole('heading', { name: 'Atlas' });
    fireEvent.click(screen.getByRole('button', { name: 'Edit project' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Project name' }), {
      target: { value: 'New Atlas' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Description' }), {
      target: { value: 'New description' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save project' }));
    expect(await screen.findByRole('heading', { name: 'Saved Atlas' })).toBeInTheDocument();
    expect(screen.getByText('Saved description')).toBeInTheDocument();
    expect(screen.getByText('2026-10-23T10:00:00Z')).toBeVisible();
    expect(within(screen.getByRole('main')).getByRole('status')).toHaveTextContent('Project saved');
    expect(organizationApi.updateProject).toHaveBeenCalledWith('w1', 'p1', {
      name: 'New Atlas',
      description: 'New description',
    });
    expect(screen.queryByRole('textbox', { name: 'Project name' })).not.toBeInTheDocument();
  });

  it('keeps persisted data on update failure, provides retry and never shows success', async () => {
    vi.mocked(organizationApi.updateProject).mockRejectedValueOnce(
      new Error('Duplicate project name'),
    );
    renderOverview();
    await screen.findByRole('heading', { name: 'Atlas' });
    fireEvent.click(screen.getByRole('button', { name: 'Edit project' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Project name' }), {
      target: { value: 'Duplicate' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save project' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Duplicate project name');
    expect(screen.getByRole('heading', { name: 'Atlas' })).toBeInTheDocument();
    expect(screen.queryByText('Project saved')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry update' }));
    expect(await screen.findByText('Project saved')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('cancels archive without writing, confirms once, and restores from returned status', async () => {
    const archived: Project = {
      ...project,
      status: 'archived',
      archived_at: '2026-10-23T11:00:00Z',
    };
    let finishArchive!: (value: Project) => void;
    vi.mocked(organizationApi.setProjectStatus)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finishArchive = resolve;
          }),
      )
      .mockResolvedValueOnce(project);
    renderOverview();
    await screen.findByRole('heading', { name: 'Atlas' });
    fireEvent.click(screen.getByRole('button', { name: 'Archive project' }));
    let dialog = within(screen.getByRole('dialog', { name: 'Archive project?' }));
    fireEvent.click(dialog.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(organizationApi.setProjectStatus).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Archive project' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Archive project' }));
    dialog = within(screen.getByRole('dialog', { name: 'Archive project?' }));
    fireEvent.click(dialog.getByRole('button', { name: 'Confirm archive' }));
    const busy = screen.getByRole('button', { name: 'Archive project' });
    expect(busy).toBeDisabled();
    fireEvent.click(busy);
    expect(organizationApi.setProjectStatus).toHaveBeenCalledTimes(1);
    await act(async () => finishArchive(archived));
    expect(screen.getByRole('region', { name: 'Project details' })).toHaveTextContent('archived');
    expect(screen.getByText(archived.archived_at!)).toBeVisible();
    expect(within(screen.getByRole('main')).getByRole('status')).toHaveTextContent(
      'Project archived',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Restore project' }));
    await screen.findByRole('button', { name: 'Archive project' });
    expect(within(screen.getByRole('main')).getByRole('status')).toHaveTextContent(
      'Project restored',
    );
    expect(screen.queryByText(archived.archived_at!)).not.toBeInTheDocument();
    expect(organizationApi.setProjectStatus).toHaveBeenNthCalledWith(1, 'w1', 'p1', 'archived');
    expect(organizationApi.setProjectStatus).toHaveBeenNthCalledWith(2, 'w1', 'p1', 'active');
  });

  it('shows a status error without changing archived state and allows retry', async () => {
    vi.mocked(organizationApi.getProject).mockResolvedValue({
      ...project,
      status: 'archived',
      archived_at: '2026-10-23T11:00:00Z',
    });
    vi.mocked(organizationApi.setProjectStatus).mockRejectedValueOnce(
      new Error('Restore unavailable'),
    );
    renderOverview();
    fireEvent.click(await screen.findByRole('button', { name: 'Restore project' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Restore unavailable');
    expect(screen.getByRole('region', { name: 'Project details' })).toHaveTextContent('archived');
    expect(screen.queryByText('Project restored')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry update' }));
    expect(await screen.findByRole('button', { name: 'Archive project' })).toBeEnabled();
    expect(within(screen.getByRole('main')).getByRole('status')).toHaveTextContent(
      'Project restored',
    );
  });

  it('recovers from project load failure through a visible retry', async () => {
    vi.mocked(organizationApi.getProject).mockRejectedValueOnce(new Error('Project unavailable'));
    renderOverview();
    expect(await screen.findByRole('alert')).toHaveTextContent('Project unavailable');
    expect(screen.queryByRole('region', { name: 'Project summary' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry loading overview' }));
    expect(await screen.findByRole('heading', { name: 'Atlas' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(organizationApi.getProject).toHaveBeenCalledTimes(2);
  });

  it.each(['wrong workspace', 'wrong project', 'missing workspace', 'missing project'])(
    'rejects an unavailable owner: %s',
    async (kind) => {
      if (kind === 'wrong workspace')
        vi.mocked(organizationApi.getProject).mockResolvedValue({ ...project, workspace_id: 'w2' });
      if (kind === 'wrong project')
        vi.mocked(organizationApi.getProject).mockResolvedValue({ ...project, id: 'p2' });
      if (kind === 'missing workspace')
        vi.mocked(organizationApi.listWorkspaces).mockResolvedValue([]);
      if (kind === 'missing project')
        vi.mocked(organizationApi.getProject).mockRejectedValue(new Error('Project not found'));
      renderOverview();
      expect(await screen.findByRole('alert')).toBeVisible();
      expect(screen.getByRole('button', { name: 'Retry loading overview' })).toBeEnabled();
      expect(screen.queryByRole('heading', { name: 'Atlas' })).not.toBeInTheDocument();
      expect(screen.queryByRole('region', { name: 'Project summary' })).not.toBeInTheDocument();
    },
  );

  it('does not turn a planning failure into successful zero counts', async () => {
    vi.mocked(organizationApi.listCriteria).mockRejectedValueOnce(
      new Error('Criteria unavailable'),
    );
    renderOverview();
    expect(await screen.findByRole('alert')).toHaveTextContent('Criteria unavailable');
    expect(screen.queryByRole('region', { name: 'Project summary' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry loading overview' }));
    expect(await screen.findByRole('region', { name: 'Project summary' })).toBeVisible();
  });

  it('keeps shell project context on Overview while Planning still opens the board', async () => {
    renderOverview();
    await screen.findByRole('heading', { name: 'Atlas' });
    const nav = within(screen.getByRole('navigation', { name: 'Project navigation' }));
    expect(nav.getByRole('link', { name: 'Overview' })).toHaveAttribute('href', '/projects/w1/p1');
    expect(nav.getByRole('link', { name: 'Atlas' })).toHaveAttribute('href', '/planning/w1/p1');
    const breadcrumb = within(screen.getByRole('navigation', { name: 'Breadcrumb' }));
    expect(breadcrumb.getByRole('link', { name: 'Project board' })).toHaveAttribute(
      'href',
      '/planning/w1/p1',
    );
    expect(breadcrumb.getByText('Overview')).toHaveAttribute('aria-current', 'page');
  });

  it('routes Organization project entry points to the Board and retains Overview management access', async () => {
    vi.mocked(organizationApi.planningOverview).mockResolvedValue({
      epics: [],
      unassigned_features: [],
    });
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getAllByRole('link', { name: 'Atlas' })).toHaveLength(2));
    for (const link of screen.getAllByRole('link', { name: 'Atlas' })) {
      expect(link).toHaveAttribute('href', '/planning/w1/p1');
    }
    expect(screen.getByRole('link', { name: 'Open Board' })).toHaveAttribute(
      'href',
      '/planning/w1/p1',
    );
    expect(screen.getByRole('button', { name: 'Archive' })).toBeEnabled();
    const projectNavigation = within(
      screen.getByRole('navigation', { name: 'Project navigation' }),
    );
    expect(projectNavigation.queryByRole('link', { name: 'Overview' })).not.toBeInTheDocument();
    expect(projectNavigation.getByRole('link', { name: 'Projects' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    fireEvent.click(screen.getByRole('link', { name: 'Open Board' }));
    expect(await screen.findByLabelText('Epic workflow board')).toBeInTheDocument();
    expect(projectNavigation.getByRole('link', { name: 'Overview' })).toHaveAttribute(
      'href',
      '/projects/w1/p1',
    );
    fireEvent.click(projectNavigation.getByRole('link', { name: 'Overview' }));
    expect(await screen.findByRole('heading', { name: 'Atlas' })).toBeInTheDocument();
  });
});
