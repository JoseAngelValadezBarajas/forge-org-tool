import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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

  it('restores and persists the explicitly selected workspace across a page reload', async () => {
    localStorage.setItem('forge-active-workspace', 'w2');
    const workspaces = [
      { id: 'w1', name: 'One', status: 'active', created_at: '', updated_at: '' },
      { id: 'w2', name: 'Two', status: 'active', created_at: '', updated_at: '' },
    ];
    const fetchMock = vi.fn().mockImplementation((input: string) => {
      const path = String(input);
      const payload =
        path === '/api/v1/workspaces'
          ? workspaces
          : path.includes('/workspaces/w2/')
            ? [
                {
                  id: 'p2',
                  workspace_id: 'w2',
                  name: 'Two project',
                  description: null,
                  status: 'active',
                  created_at: '',
                  updated_at: '',
                  archived_at: null,
                },
              ]
            : [];
      return Promise.resolve(new Response(JSON.stringify(payload), { status: 200 }));
    });
    vi.stubGlobal('fetch', fetchMock);
    const renderPage = () =>
      render(
        <MemoryRouter>
          <OrganizationPage />
        </MemoryRouter>,
      );
    const first = renderPage();
    const selector = await screen.findByRole('combobox', { name: 'Workspace' });
    await waitFor(() => expect(selector).toHaveValue('w2'));
    expect(await screen.findByRole('link', { name: 'Two project' })).toBeInTheDocument();
    fireEvent.change(selector, { target: { value: 'w1' } });
    await waitFor(() => expect(localStorage.getItem('forge-active-workspace')).toBe('w1'));
    first.unmount();

    render(
      <MemoryRouter>
        <OrganizationPage />
      </MemoryRouter>,
    );
    expect(await screen.findByRole('combobox', { name: 'Workspace' })).toHaveValue('w1');
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

  it('edits the selected workspace name and description through the API', async () => {
    const workspace = {
      id: 'w1',
      name: 'Research',
      description: 'Old description',
      created_at: '',
      updated_at: '',
    };
    const fetchMock = vi.fn().mockImplementation((input: string, init?: RequestInit) => {
      const path = String(input);
      if (path === '/api/v1/workspaces')
        return Promise.resolve(new Response(JSON.stringify([workspace]), { status: 200 }));
      if (path === '/api/v1/workspaces/w1' && init?.method === 'PATCH')
        return Promise.resolve(
          new Response(
            JSON.stringify({ ...workspace, name: 'Research Lab', description: 'Updated' }),
            { status: 200 },
          ),
        );
      if (path.endsWith('/tags')) return Promise.resolve(new Response('[]', { status: 200 }));
      return Promise.resolve(new Response('[]', { status: 200 }));
    });
    vi.stubGlobal('fetch', fetchMock);
    render(
      <MemoryRouter>
        <OrganizationPage />
      </MemoryRouter>,
    );

    fireEvent.change(await screen.findByLabelText('Edit workspace name'), {
      target: { value: 'Research Lab' },
    });
    fireEvent.change(screen.getByLabelText('Edit workspace description'), {
      target: { value: 'Updated' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save workspace' }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v1/workspaces/w1',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ name: 'Research Lab', description: 'Updated' }),
        }),
      ),
    );
  });

  it('archives and restores the selected Workspace through its API lifecycle', async () => {
    const active = {
      id: 'w1',
      name: 'Research',
      description: null,
      created_at: '',
      updated_at: '',
      archived_at: null,
    };
    const fetchMock = vi.fn().mockImplementation((input: string) => {
      if (String(input) === '/api/v1/workspaces')
        return Promise.resolve(new Response(JSON.stringify([active]), { status: 200 }));
      if (String(input).endsWith('/archive'))
        return Promise.resolve(
          new Response(JSON.stringify({ ...active, archived_at: '2026-10-23T00:00:00Z' }), {
            status: 200,
          }),
        );
      if (String(input).endsWith('/restore'))
        return Promise.resolve(new Response(JSON.stringify(active), { status: 200 }));
      if (String(input).endsWith('/projects?search=&status=all'))
        return Promise.resolve(new Response('[]', { status: 200 }));
      return Promise.resolve(new Response('[]', { status: 200 }));
    });
    vi.stubGlobal('fetch', fetchMock);
    render(
      <MemoryRouter>
        <OrganizationPage />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Archive workspace' }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v1/workspaces/w1/archive',
        expect.objectContaining({ method: 'POST' }),
      ),
    );
    expect(
      await screen.findByText(
        'This workspace is archived. Restore it to create projects or edit its settings.',
      ),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Restore workspace' }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v1/workspaces/w1/restore',
        expect.objectContaining({ method: 'POST' }),
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
    expect(screen.getByText('1 total')).toBeInTheDocument();
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
    expect(screen.getByText('2 total')).toBeInTheDocument();
    expect(screen.getByText('Active').parentElement).toHaveTextContent(/1\s*currently active/);
    expect(screen.getByText('Archived').parentElement).toHaveTextContent(/1\s*kept for history/);
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search projects' }), {
      target: { value: 'Atlas' },
    });

    expect(screen.getAllByRole('heading', { name: 'Atlas' })).toHaveLength(2);
    expect(screen.queryByRole('heading', { name: 'Legacy' })).not.toBeInTheDocument();
    expect(screen.getByText('2 total')).toBeInTheDocument();
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

    expect(await screen.findByText('No projects in this workspace yet.')).toBeInTheDocument();
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
      expect(screen.getAllByRole('heading', { name: 'Atlas' })).toHaveLength(2);
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

    expect(await screen.findByText('2 planned features')).toBeInTheDocument();
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

  it('does not show a prior workspace project after a selection race', async () => {
    const pending = new Map<string, Array<(response: Response) => void>>();
    const fetchMock = vi.fn().mockImplementation((input: string) => {
      const path = String(input);
      if (path === '/api/v1/workspaces') {
        return Promise.resolve(
          new Response(
            JSON.stringify([
              { id: 'w1', name: 'One', status: 'active', created_at: '', updated_at: '' },
              { id: 'w2', name: 'Two', status: 'active', created_at: '', updated_at: '' },
            ]),
            { status: 200 },
          ),
        );
      }
      const workspaceId = path.match(/workspaces\/(w\d+)\/projects/)?.[1] ?? '';
      return new Promise<Response>((resolve) => {
        pending.set(workspaceId, [...(pending.get(workspaceId) ?? []), resolve]);
      });
    });
    vi.stubGlobal('fetch', fetchMock);
    render(
      <MemoryRouter>
        <OrganizationPage />
      </MemoryRouter>,
    );

    await screen.findByRole('option', { name: 'One' });
    await waitFor(() => expect(pending.get('w1')).toHaveLength(1));
    fireEvent.change(screen.getByLabelText('Workspace'), { target: { value: 'w2' } });
    await waitFor(() => expect(pending.get('w2')).toHaveLength(1));
    pending.get('w2')?.[0]?.(
      new Response(
        JSON.stringify([
          {
            id: 'p2',
            workspace_id: 'w2',
            name: 'Two project',
            description: null,
            status: 'active',
            created_at: '',
            updated_at: '',
            archived_at: null,
          },
        ]),
        { status: 200 },
      ),
    );
    expect(await screen.findByRole('heading', { name: 'Two project' })).toBeInTheDocument();
    pending.get('w1')?.[0]?.(
      new Response(
        JSON.stringify([
          {
            id: 'p1',
            workspace_id: 'w1',
            name: 'Stale project',
            description: null,
            status: 'active',
            created_at: '',
            updated_at: '',
            archived_at: null,
          },
        ]),
        { status: 200 },
      ),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.queryByRole('heading', { name: 'Stale project' })).not.toBeInTheDocument();
  });
});
