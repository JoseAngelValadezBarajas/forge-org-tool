import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { OrganizationPage } from './OrganizationPage';

describe('OrganizationPage', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('keeps the Workspace home project-first and opens project creation contextually', async () => {
    const workspace = {
      id: 'w1',
      name: 'Research',
      description: 'Product work',
      status: 'active',
      created_at: '',
      updated_at: '',
    };
    const project = {
      id: 'p1',
      workspace_id: 'w1',
      name: 'Atlas',
      description: 'Navigation redesign',
      status: 'active',
      archived_at: null,
      created_at: '',
      updated_at: '',
    };
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string) => {
        const path = String(input);
        const payload =
          path === '/api/v1/workspaces'
            ? [workspace]
            : path.includes('/projects?')
              ? [project]
              : path.includes('/planning/overview')
                ? { epics: [], unassigned_features: [] }
                : [];
        return Promise.resolve(new Response(JSON.stringify(payload), { status: 200 }));
      }),
    );
    render(
      <MemoryRouter>
        <OrganizationPage />
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole('heading', { name: 'Your workspace, in focus' }),
    ).toBeInTheDocument();
    const workspaceSummary = screen.getByRole('region', { name: 'Workspace summary' });
    expect(within(workspaceSummary).getByText('Projects')).toBeInTheDocument();
    expect(within(workspaceSummary).getByText('Epics')).toBeInTheDocument();
    expect(within(workspaceSummary).getByText('Work items')).toBeInTheDocument();
    expect(within(workspaceSummary).queryByText('Completed')).not.toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Projects' })).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'Atlas' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Continue working' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New project' })).toBeInTheDocument();
    expect(screen.getByRole('dialog', { hidden: true })).not.toHaveAttribute('open');
    expect(screen.queryByRole('textbox', { name: 'Project name' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Edit workspace name')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Workspace tags' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'New project' }));
    expect(await screen.findByRole('dialog', { name: 'Create project' })).toBeInTheDocument();
    expect(screen.getByLabelText('Project name')).toBeInTheDocument();
  });

  it('shows an actionable empty state and creates a workspace', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('[]', { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'w1',
            name: 'Research',
            status: 'active',
            created_at: '',
            updated_at: '',
          }),
          { status: 201 },
        ),
      );
    vi.stubGlobal('fetch', fetchMock);
    render(
      <MemoryRouter>
        <OrganizationPage />
      </MemoryRouter>,
    );

    await screen.findByText('No workspaces yet');
    fireEvent.change(screen.getByLabelText('Workspace name'), { target: { value: 'Research' } });
    fireEvent.change(screen.getByLabelText('Workspace description'), {
      target: { value: 'Local planning records' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create Workspace' }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v1/workspaces',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'Research', description: 'Local planning records' }),
        }),
      ),
    );
  });

  it('renders projects for the selected workspace', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((input: string) => {
        const path = String(input);
        const payload =
          path === '/api/v1/workspaces'
            ? [{ id: 'w1', name: 'Research', status: 'active', created_at: '', updated_at: '' }]
            : path.endsWith('/tags')
              ? []
              : [
                  {
                    id: 'p1',
                    workspace_id: 'w1',
                    name: 'Atlas',
                    description: 'Map work',
                    status: 'active',
                    created_at: '',
                    updated_at: '',
                    archived_at: null,
                  },
                ];
        return Promise.resolve(new Response(JSON.stringify(payload), { status: 200 }));
      }),
    );
    render(
      <MemoryRouter>
        <OrganizationPage />
      </MemoryRouter>,
    );

    expect(await screen.findAllByRole('heading', { name: 'Atlas' })).toHaveLength(1);
    expect(screen.getByText('Map work')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Projects' })).toBeInTheDocument();
    expect(screen.getByText('1 active · 0 archived')).toBeInTheDocument();
  });

  it('keeps workspace totals truthful while searching across active and archived projects', async () => {
    const fetchMock = vi.fn().mockImplementation((input: string) => {
      const payload =
        String(input) === '/api/v1/workspaces'
          ? [{ id: 'w1', name: 'Research', status: 'active', created_at: '', updated_at: '' }]
          : [
              {
                id: 'p1',
                workspace_id: 'w1',
                name: 'Atlas',
                description: null,
                status: 'active',
                created_at: '',
                updated_at: '',
                archived_at: null,
              },
              {
                id: 'p2',
                workspace_id: 'w1',
                name: 'Legacy',
                description: null,
                status: 'archived',
                created_at: '',
                updated_at: '',
                archived_at: '',
              },
            ];
      const url = new URL(String(input), 'http://localhost');
      const filtered =
        String(input) === '/api/v1/workspaces'
          ? payload
          : payload.filter((project) => {
              const matchesStatus =
                url.searchParams.get('status') === 'all' || project.status === 'active';
              const matchesSearch = project.name
                .toLowerCase()
                .includes((url.searchParams.get('search') ?? '').toLowerCase());
              return matchesStatus && matchesSearch;
            });
      return Promise.resolve(new Response(JSON.stringify(filtered), { status: 200 }));
    });
    vi.stubGlobal('fetch', fetchMock);
    render(
      <MemoryRouter>
        <OrganizationPage />
      </MemoryRouter>,
    );

    expect(await screen.findAllByRole('heading', { name: 'Atlas' })).toHaveLength(1);
    expect(screen.getByText('1 active · 1 archived')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search projects' }), {
      target: { value: 'Atlas' },
    });

    expect(screen.getAllByRole('heading', { name: 'Atlas' })).toHaveLength(1);
    expect(screen.queryByRole('heading', { name: 'Legacy' })).not.toBeInTheDocument();
    expect(screen.getByText('1 active · 1 archived')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search projects' }), {
      target: { value: '' },
    });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Show archived' }));
    expect(await screen.findByRole('heading', { name: 'Legacy' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/workspaces/w1/projects?search=&status=all',
      expect.objectContaining({ credentials: 'same-origin' }),
    );
  });

  it('recovers the workspace dashboard after a temporary loading failure', async () => {
    let failFirstRequest = true;
    const fetchMock = vi.fn().mockImplementation((input: string) => {
      if (failFirstRequest) {
        failFirstRequest = false;
        return Promise.reject(new Error('Connection unavailable'));
      }
      const path = String(input);
      const payload =
        path === '/api/v1/workspaces'
          ? [{ id: 'w1', name: 'Research', status: 'active', created_at: '', updated_at: '' }]
          : [];
      return Promise.resolve(new Response(JSON.stringify(payload), { status: 200 }));
    });
    vi.stubGlobal('fetch', fetchMock);
    render(
      <MemoryRouter>
        <OrganizationPage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('Connection unavailable');
    fireEvent.click(screen.getByRole('button', { name: 'Retry loading workspaces' }));

    expect(await screen.findByText('No projects yet')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('searches project descriptions as well as project names', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((input: string) =>
        Promise.resolve(
          new Response(
            JSON.stringify(
              String(input) === '/api/v1/workspaces'
                ? [{ id: 'w1', name: 'Research', status: 'active', created_at: '', updated_at: '' }]
                : [
                    {
                      id: 'p1',
                      workspace_id: 'w1',
                      name: 'Atlas',
                      description: 'Discovery records',
                      status: 'active',
                      created_at: '',
                      updated_at: '',
                      archived_at: null,
                    },
                  ],
            ),
            { status: 200 },
          ),
        ),
      ),
    );
    render(
      <MemoryRouter>
        <OrganizationPage />
      </MemoryRouter>,
    );

    await screen.findAllByRole('heading', { name: 'Atlas' });
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search projects' }), {
      target: { value: 'Discovery' },
    });

    await waitFor(() => {
      expect(screen.getAllByRole('heading', { name: 'Atlas' })).toHaveLength(1);
    });
  });

  it('summarizes persisted planning and keeps attention links in the planning board', async () => {
    const features = [
      {
        id: 'f-ready',
        project_id: 'p1',
        epic_id: null,
        title: 'Ready work',
        description: null,
        goal: null,
        priority: 'medium',
        status: 'ready',
        created_at: '',
        updated_at: '',
      },
      {
        id: 'f-blocked',
        project_id: 'p1',
        epic_id: null,
        title: 'Needs criteria',
        description: null,
        goal: null,
        priority: 'medium',
        status: 'backlog',
        created_at: '',
        updated_at: '',
      },
    ];
    const fetchMock = vi.fn().mockImplementation((input: string) => {
      const path = String(input);
      if (path === '/api/v1/workspaces')
        return Promise.resolve(
          new Response(
            JSON.stringify([
              { id: 'w1', name: 'Research', status: 'active', created_at: '', updated_at: '' },
            ]),
            { status: 200 },
          ),
        );
      if (path.includes('/planning/overview'))
        return Promise.resolve(
          new Response(JSON.stringify({ epics: [], unassigned_features: features }), {
            status: 200,
          }),
        );
      return Promise.resolve(
        new Response(
          JSON.stringify(
            path.includes('/projects?')
              ? [
                  {
                    id: 'p1',
                    workspace_id: 'w1',
                    name: 'Atlas',
                    description: null,
                    status: 'active',
                    created_at: '',
                    updated_at: '',
                    archived_at: null,
                  },
                ]
              : [],
          ),
          { status: 200 },
        ),
      );
    });
    vi.stubGlobal('fetch', fetchMock);
    render(
      <MemoryRouter>
        <OrganizationPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('2 work items')).toBeInTheDocument();
    expect(
      fetchMock.mock.calls
        .map(([path]) => String(path))
        .some((path) => path.includes('/readiness/')),
    ).toBe(false);
  });

  it('does not request or render retired run and handoff activity', async () => {
    const run = (id: string, title: string, date: string) => ({
      id,
      project_id: 'p1',
      title,
      description: null,
      status: 'completed',
      execution_mode: 'manual',
      executor_type: 'human',
      executor_label: null,
      feature_id: null,
      context_package_id: null,
      version: 1,
      created_at: date,
      updated_at: date,
    });
    const handoff = {
      id: 'h1',
      project_id: 'p1',
      run_id: 'r1',
      title: 'Review handoff',
      summary: '',
      next_actions: '',
      status: 'ready',
      version: 1,
      current_revision: 1,
      feature_id: null,
      context_package_id: null,
      created_at: '2026-10-22T10:00:00Z',
      updated_at: '2026-10-22T10:00:00Z',
    };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((input: string) => {
        const path = String(input);
        if (path === '/api/v1/workspaces')
          return Promise.resolve(
            new Response(
              JSON.stringify([
                { id: 'w1', name: 'Research', status: 'active', created_at: '', updated_at: '' },
              ]),
              { status: 200 },
            ),
          );
        if (path.includes('/runs?'))
          return Promise.resolve(
            new Response(
              JSON.stringify([
                run('r-old', 'Older run', '2026-10-22T08:00:00Z'),
                run('r-new', 'Newest run', '2026-10-22T12:00:00Z'),
              ]),
              { status: 200 },
            ),
          );
        if (path.endsWith('/handoffs'))
          return Promise.resolve(new Response(JSON.stringify([handoff]), { status: 200 }));
        return Promise.resolve(
          new Response(
            JSON.stringify(
              path.includes('/projects?')
                ? [
                    {
                      id: 'p1',
                      workspace_id: 'w1',
                      name: 'Atlas',
                      description: null,
                      status: 'active',
                      created_at: '',
                      updated_at: '',
                      archived_at: null,
                    },
                  ]
                : [],
            ),
            { status: 200 },
          ),
        );
      }),
    );
    render(
      <MemoryRouter>
        <OrganizationPage />
      </MemoryRouter>,
    );

    await screen.findByRole('heading', { name: 'Atlas' });
    expect(screen.queryByText(/recent activity/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Newest run')).not.toBeInTheDocument();
    expect(screen.queryByText('Review handoff')).not.toBeInTheDocument();
  });

  it('does not expose an empty or failed state for the retired activity feed', async () => {
    const workspace = [
      { id: 'w1', name: 'Research', status: 'active', created_at: '', updated_at: '' },
    ];
    const project = {
      id: 'p1',
      workspace_id: 'w1',
      name: 'Atlas',
      description: null,
      status: 'active',
      created_at: '',
      updated_at: '',
      archived_at: null,
    };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((input: string) => {
        const path = String(input);
        if (path === '/api/v1/workspaces')
          return Promise.resolve(new Response(JSON.stringify(workspace), { status: 200 }));
        if (path.includes('/runs?') || path.endsWith('/handoffs'))
          return Promise.resolve(new Response('[]', { status: 200 }));
        return Promise.resolve(
          new Response(JSON.stringify(path.includes('/projects?') ? [project] : []), {
            status: 200,
          }),
        );
      }),
    );
    render(
      <MemoryRouter>
        <OrganizationPage />
      </MemoryRouter>,
    );
    expect(await screen.findByRole('heading', { name: 'Atlas' })).toBeInTheDocument();
    expect(screen.queryByText(/recent activity/i)).not.toBeInTheDocument();
  });
});
