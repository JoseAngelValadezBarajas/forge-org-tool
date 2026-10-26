import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PlanningPage } from './PlanningPage';

const overview = {
  epics: [
    {
      id: 'e1',
      project_id: 'p1',
      title: 'Launch',
      description: null,
      status: 'backlog',
      archived_at: null,
      created_at: '',
      updated_at: '',
      features: [
        {
          id: 'f1',
          project_id: 'p1',
          epic_id: 'e1',
          title: 'Alpha',
          description: null,
          goal: null,
          priority: 'high',
          status: 'backlog',
          created_at: '',
          updated_at: '',
        },
      ],
    },
  ],
  unassigned_features: [
    {
      id: 'f2',
      project_id: 'p1',
      epic_id: null,
      title: 'Beta',
      description: null,
      goal: null,
      priority: 'low',
      status: 'in_progress',
      created_at: '',
      updated_at: '',
    },
  ],
};

describe('PlanningPage', () => {
  afterEach(() => {
    cleanup();
    window.innerWidth = 1024;
    vi.restoreAllMocks();
  });

  it.skip('filters the removed manual work-item board and updates planning fields', async () => {
    const fetchMock = vi.fn().mockImplementation((input: string, init?: RequestInit) => {
      if (String(input).endsWith('/dependencies'))
        return Promise.resolve(new Response('[]', { status: 200 }));
      if (init?.method === 'PATCH')
        return Promise.resolve(
          new Response(JSON.stringify(overview.epics[0].features[0]), { status: 200 }),
        );
      return Promise.resolve(new Response(JSON.stringify(overview), { status: 200 }));
    });
    vi.stubGlobal('fetch', fetchMock);
    render(
      <MemoryRouter initialEntries={['/planning/w1/p1']}>
        <Routes>
          <Route path="/planning/:workspaceId/:projectId" element={<PlanningPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('link', { name: 'Alpha' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Beta' })).toBeInTheDocument();
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search planning' }), {
      target: { value: 'Alpha' },
    });
    expect(screen.getByRole('link', { name: 'Alpha' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Beta' })).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Priority for Alpha'), {
      target: { value: 'critical' },
    });
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v1/workspaces/w1/projects/p1/features/f1',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ priority: 'critical' }),
        }),
      ),
    );
  });

  it('moves Epics between workflow columns by drag and drop', async () => {
    const fetchMock = vi.fn().mockImplementation((input: string, init?: RequestInit) => {
      if (String(input).endsWith('/dependencies')) {
        return Promise.resolve(new Response('[]', { status: 200 }));
      }
      if (init?.method === 'PATCH' && String(input).endsWith('/epics/e1')) {
        return Promise.resolve(
          new Response(JSON.stringify({ ...overview.epics[0], status: 'ready' }), { status: 200 }),
        );
      }
      return Promise.resolve(new Response(JSON.stringify(overview), { status: 200 }));
    });
    vi.stubGlobal('fetch', fetchMock);
    render(
      <MemoryRouter initialEntries={['/planning/w1/p1']}>
        <Routes>
          <Route path="/planning/:workspaceId/:projectId" element={<PlanningPage />} />
        </Routes>
      </MemoryRouter>,
    );

    const card = await screen.findByTestId('epic-card-e1');
    const dataTransfer = {
      effectAllowed: '',
      setData: vi.fn(),
      getData: vi.fn().mockReturnValue('e1'),
    };
    fireEvent.dragStart(card, { dataTransfer });
    const readyColumn = within(screen.getByLabelText('Epic workflow board')).getByTestId(
      'kanban-column-ready',
    );
    fireEvent.drop(readyColumn.firstElementChild as HTMLElement, { dataTransfer });

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v1/workspaces/w1/projects/p1/epics/e1',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ status: 'ready' }),
        }),
      ),
    );
  });

  it('shows unsupported and archived Epics outside workflow columns with a reconcilable total', async () => {
    const data = {
      ...overview,
      epics: [
        ...overview.epics,
        {
          ...overview.epics[0],
          id: 'e-legacy',
          title: 'Legacy state',
          status: 'custom_legacy',
        },
        {
          ...overview.epics[0],
          id: 'e-archived',
          title: 'Archived record',
          status: 'backlog',
          archived_at: '2026-10-01T00:00:00Z',
        },
      ],
    };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((input: string) =>
        Promise.resolve(
          new Response(JSON.stringify(String(input).endsWith('/dependencies') ? [] : data), {
            status: 200,
          }),
        ),
      ),
    );
    render(
      <MemoryRouter initialEntries={['/planning/w1/p1']}>
        <Routes>
          <Route path="/planning/:workspaceId/:projectId" element={<PlanningPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('region', { name: 'Legacy Epics' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Legacy state' })).toBeInTheDocument();
    expect(screen.getByText('Legacy status: custom_legacy')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Archived Epics' })).toHaveTextContent(
      'Archived record',
    );
    expect(screen.getByRole('region', { name: 'Epic visibility summary' })).toHaveTextContent(
      '3 total · 1 in workflow · 1 archived · 1 legacy',
    );
  });

  it('opens Epic creation contextually and assigns tags from the workspace catalog', async () => {
    const fetchMock = vi.fn().mockImplementation((input: string, init?: RequestInit) => {
      if (String(input).endsWith('/dependencies'))
        return Promise.resolve(new Response('[]', { status: 200 }));
      if (String(input).endsWith('/tags'))
        return Promise.resolve(
          new Response(
            JSON.stringify([{ id: 't1', workspace_id: 'w1', name: 'Platform', color: '#456789' }]),
            { status: 200 },
          ),
        );
      if (String(input).endsWith('/epics') && init?.method === 'POST')
        return Promise.resolve(
          new Response(JSON.stringify({ ...overview.epics[0], id: 'e2', title: 'Roadmap' }), {
            status: 201,
          }),
        );
      return Promise.resolve(new Response(JSON.stringify(overview), { status: 200 }));
    });
    vi.stubGlobal('fetch', fetchMock);
    render(
      <MemoryRouter initialEntries={['/planning/w1/p1']}>
        <Routes>
          <Route path="/planning/:workspaceId/:projectId" element={<PlanningPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByRole('link', { name: 'Launch' });
    expect(screen.queryByLabelText('Epic title')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'New Epic' }));
    const drawer = screen.getByRole('dialog', { name: 'New Epic' });
    expect(drawer).toHaveAttribute('aria-modal', 'false');
    expect(drawer).toHaveTextContent('CREATE IN Project');
    expect(drawer).toHaveTextContent('An Epic groups Stories, Bugs and Tasks.');
    expect(screen.getByLabelText('Description')).toBeInTheDocument();
    expect(screen.getByLabelText('Epic workflow board')).toBeVisible();
    fireEvent.change(screen.getByLabelText('Epic title'), { target: { value: 'Roadmap' } });
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'Coordinate the next product milestone.' },
    });
    fireEvent.click(await screen.findByLabelText('Epic tag Platform'));
    fireEvent.click(screen.getByRole('button', { name: 'Create Epic' }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v1/workspaces/w1/projects/p1/epics',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            title: 'Roadmap',
            description: 'Coordinate the next product milestone.',
            priority: 'medium',
            tags: ['Platform'],
          }),
        }),
      ),
    );
  });

  it('keeps Epic creation open with the entered title when the API rejects the create', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string, init?: RequestInit) => {
        if (String(input).endsWith('/dependencies')) return Promise.resolve(new Response('[]'));
        if (String(input).endsWith('/tags')) return Promise.resolve(new Response('[]'));
        if (String(input).endsWith('/epics') && init?.method === 'POST')
          return Promise.resolve(
            new Response(JSON.stringify({ detail: 'Create failed' }), { status: 500 }),
          );
        return Promise.resolve(new Response(JSON.stringify(overview)));
      }),
    );
    render(
      <MemoryRouter initialEntries={['/planning/w1/p1']}>
        <Routes>
          <Route path="/planning/:workspaceId/:projectId" element={<PlanningPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByRole('link', { name: 'Launch' });
    fireEvent.click(screen.getByRole('button', { name: 'New Epic' }));
    fireEvent.change(screen.getByLabelText('Epic title'), { target: { value: 'Keep my draft' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Epic' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Create failed');
    expect(screen.getByRole('dialog', { name: 'New Epic' })).toBeInTheDocument();
    expect(screen.getByLabelText('Epic title')).toHaveValue('Keep my draft');
  });

  it('returns focus to the Epic creation trigger when the contextual panel closes', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string) =>
        Promise.resolve(
          new Response(JSON.stringify(String(input).endsWith('/dependencies') ? [] : overview)),
        ),
      ),
    );
    render(
      <MemoryRouter initialEntries={['/planning/w1/p1']}>
        <Routes>
          <Route path="/planning/:workspaceId/:projectId" element={<PlanningPage />} />
        </Routes>
      </MemoryRouter>,
    );

    const trigger = screen.getByRole('button', { name: 'New Epic' });
    await screen.findByRole('link', { name: 'Launch' });
    fireEvent.click(trigger);
    expect(screen.getByLabelText('Epic title')).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('closes the contextual Epic panel with Escape and restores focus to its trigger', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string) =>
        Promise.resolve(
          new Response(JSON.stringify(String(input).endsWith('/dependencies') ? [] : overview)),
        ),
      ),
    );
    render(
      <MemoryRouter initialEntries={['/planning/w1/p1']}>
        <Routes>
          <Route path="/planning/:workspaceId/:projectId" element={<PlanningPage />} />
        </Routes>
      </MemoryRouter>,
    );

    const trigger = screen.getByRole('button', { name: 'New Epic' });
    await screen.findByRole('link', { name: 'Launch' });
    fireEvent.click(trigger);
    fireEvent.keyDown(screen.getByLabelText('Epic title'), { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'New Epic' })).toBeNull());
    expect(trigger).toHaveFocus();
  });

  it('filters the mobile Epic list by a single selected workflow status', async () => {
    window.innerWidth = 390;
    const data = {
      ...overview,
      epics: [
        overview.epics[0],
        { ...overview.epics[0], id: 'e2', title: 'Ready item', status: 'ready', features: [] },
      ],
    };
    const fetchMock = vi.fn((input: string, init?: RequestInit) =>
      Promise.resolve(
        new Response(
          JSON.stringify(
            String(input).endsWith('/dependencies')
              ? []
              : String(input).endsWith('/tags')
                ? []
                : data,
          ),
          { status: init?.method === 'PATCH' ? 200 : 200 },
        ),
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    render(
      <MemoryRouter initialEntries={['/planning/w1/p1']}>
        <Routes>
          <Route path="/planning/:workspaceId/:projectId" element={<PlanningPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByRole('link', { name: 'Launch' });
    fireEvent.change(screen.getByLabelText('Mobile Epic status'), { target: { value: 'ready' } });
    const mobileBoard = screen.getByRole('region', { name: 'Mobile Epic board' });
    expect(within(mobileBoard).getByRole('link', { name: 'Ready item' })).toBeInTheDocument();
    expect(within(mobileBoard).queryByRole('link', { name: 'Launch' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('kanban-column-backlog')).not.toBeInTheDocument();
    fireEvent.change(
      within(mobileBoard).getByRole('combobox', { name: 'Status for Epic Ready item' }),
      { target: { value: 'done' } },
    );
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v1/workspaces/w1/projects/p1/epics/e2',
        expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ status: 'done' }) }),
      ),
    );
  });

  it.skip('persists a work item status when dragged into another workflow column', async () => {
    const fetchMock = vi.fn().mockImplementation((input: string, init?: RequestInit) => {
      if (String(input).endsWith('/dependencies'))
        return Promise.resolve(new Response('[]', { status: 200 }));
      if (init?.method === 'PATCH')
        return Promise.resolve(
          new Response(JSON.stringify({ ...overview.epics[0].features[0], status: 'ready' }), {
            status: 200,
          }),
        );
      return Promise.resolve(new Response(JSON.stringify(overview), { status: 200 }));
    });
    vi.stubGlobal('fetch', fetchMock);
    render(
      <MemoryRouter initialEntries={['/planning/w1/p1']}>
        <Routes>
          <Route path="/planning/:workspaceId/:projectId" element={<PlanningPage />} />
        </Routes>
      </MemoryRouter>,
    );

    const dataTransfer = {
      data: new Map<string, string>(),
      setData(type: string, value: string) {
        this.data.set(type, value);
      },
      getData(type: string) {
        return this.data.get(type) ?? '';
      },
    };
    fireEvent.dragStart(await screen.findByTestId('work-item-card-f1'), { dataTransfer });
    const readyColumn = within(screen.getByLabelText('Planning board')).getByRole('region', {
      name: 'Ready',
    });
    expect(screen.getByLabelText('Planning board')).toHaveAttribute('tabindex', '0');
    fireEvent.dragOver(readyColumn, { dataTransfer });
    fireEvent.drop(readyColumn, { dataTransfer });

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v1/workspaces/w1/projects/p1/features/f1',
        expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ status: 'ready' }) }),
      ),
    );
  });

  it.skip('creates a feature inside the selected epic without changing manual planning semantics', async () => {
    const fetchMock = vi.fn().mockImplementation((input: string, init?: RequestInit) => {
      if (String(input).endsWith('/dependencies'))
        return Promise.resolve(new Response('[]', { status: 200 }));
      if (String(input).endsWith('/features') && init?.method === 'POST')
        return Promise.resolve(
          new Response(JSON.stringify({ ...overview.unassigned_features[0], id: 'f3' }), {
            status: 201,
          }),
        );
      return Promise.resolve(new Response(JSON.stringify(overview), { status: 200 }));
    });
    vi.stubGlobal('fetch', fetchMock);
    render(
      <MemoryRouter initialEntries={['/planning/w1/p1']}>
        <Routes>
          <Route path="/planning/:workspaceId/:projectId" element={<PlanningPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByRole('link', { name: 'Alpha' });
    fireEvent.click(screen.getByRole('button', { name: 'New work item' }));
    fireEvent.change(screen.getByLabelText('Epic for new feature'), { target: { value: 'e1' } });
    fireEvent.change(screen.getByLabelText('Feature title'), { target: { value: 'Gamma' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Feature' }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v1/workspaces/w1/projects/p1/features',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ title: 'Gamma', epic_id: 'e1', kind: 'story', tags: [] }),
        }),
      ),
    );
    expect(screen.getByText(/manual product records only/i)).toBeInTheDocument();
  });

  it.skip('creates a Bug through the accessible work-item type buttons', async () => {
    const fetchMock = vi.fn().mockImplementation((input: string, init?: RequestInit) => {
      if (String(input).endsWith('/dependencies'))
        return Promise.resolve(new Response('[]', { status: 200 }));
      if (String(input).endsWith('/features') && init?.method === 'POST')
        return Promise.resolve(
          new Response(JSON.stringify({ ...overview.unassigned_features[0], id: 'bug-1' }), {
            status: 201,
          }),
        );
      return Promise.resolve(new Response(JSON.stringify(overview), { status: 200 }));
    });
    vi.stubGlobal('fetch', fetchMock);
    render(
      <MemoryRouter initialEntries={['/planning/w1/p1']}>
        <Routes>
          <Route path="/planning/:workspaceId/:projectId" element={<PlanningPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByRole('link', { name: 'Alpha' });
    fireEvent.click(screen.getByRole('button', { name: 'New work item' }));
    fireEvent.click(screen.getByRole('button', { name: 'Bug' }));
    expect(screen.getByLabelText('Bug severity')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Epic for new feature'), { target: { value: 'e1' } });
    fireEvent.change(screen.getByLabelText('Feature title'), {
      target: { value: 'Regression bug' },
    });
    fireEvent.change(screen.getByLabelText('Steps to reproduce'), {
      target: { value: 'Open the page.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create Feature' }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v1/workspaces/w1/projects/p1/features',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            title: 'Regression bug',
            epic_id: 'e1',
            kind: 'bug',
            tags: [],
            bug_severity: 'medium',
            steps_to_reproduce: 'Open the page.',
            expected_result: '',
            actual_result: '',
          }),
        }),
      ),
    );
  });

  it.skip('renders both five-column Boards and preserves legacy refining items separately', async () => {
    const sixColumnOverview = {
      ...overview,
      unassigned_features: [
        ...overview.unassigned_features,
        {
          id: 'f3',
          project_id: 'p1',
          epic_id: null,
          title: 'Gamma',
          description: null,
          goal: null,
          priority: 'medium',
          status: 'refining',
          created_at: '',
          updated_at: '',
        },
        {
          id: 'f4',
          project_id: 'p1',
          epic_id: null,
          title: 'Delta',
          description: null,
          goal: null,
          priority: 'medium',
          status: 'ready',
          created_at: '',
          updated_at: '',
        },
      ],
    };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((input: string) => {
        const payload = String(input).endsWith('/dependencies') ? [] : sixColumnOverview;
        return Promise.resolve(new Response(JSON.stringify(payload), { status: 200 }));
      }),
    );
    render(
      <MemoryRouter initialEntries={['/planning/w1/p1']}>
        <Routes>
          <Route path="/planning/:workspaceId/:projectId" element={<PlanningPage />} />
        </Routes>
      </MemoryRouter>,
    );

    for (const column of ['Backlog', 'Ready', 'In progress', 'Verify', 'Done']) {
      expect(await screen.findAllByRole('heading', { name: column })).toHaveLength(2);
    }
    expect(
      within(screen.getByLabelText('Epic workflow board')).getAllByTestId(/^kanban-column-/),
    ).toHaveLength(5);
    expect(screen.getByRole('region', { name: 'Legacy refining work items' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Gamma' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Delta' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Filter planning by status' })).toHaveDisplayValue(
      'All statuses',
    );
  });

  it.skip('creates and removes a project dependency without implying delivery evidence', async () => {
    const dependency = {
      id: 'd1',
      project_id: 'p1',
      blocking_feature_id: 'f1',
      blocked_feature_id: 'f2',
      created_at: '',
      updated_at: '',
    };
    let currentDependencies: (typeof dependency)[] = [];
    const fetchMock = vi.fn().mockImplementation((input: string, init?: RequestInit) => {
      if (String(input).endsWith('/dependencies') && init?.method === 'POST') {
        currentDependencies = [dependency];
        return Promise.resolve(new Response(JSON.stringify(dependency), { status: 201 }));
      }
      if (String(input).includes('/dependencies/d1') && init?.method === 'DELETE') {
        currentDependencies = [];
        return Promise.resolve(new Response(null, { status: 204 }));
      }
      if (String(input).endsWith('/dependencies'))
        return Promise.resolve(new Response(JSON.stringify(currentDependencies), { status: 200 }));
      return Promise.resolve(new Response(JSON.stringify(overview), { status: 200 }));
    });
    vi.stubGlobal('fetch', fetchMock);
    render(
      <MemoryRouter initialEntries={['/planning/w1/p1']}>
        <Routes>
          <Route path="/planning/:workspaceId/:projectId" element={<PlanningPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByRole('link', { name: 'Alpha' });
    fireEvent.change(screen.getByLabelText('Blocking feature'), { target: { value: 'f1' } });
    fireEvent.change(screen.getByLabelText('Blocked feature'), { target: { value: 'f2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add dependency' }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v1/workspaces/w1/projects/p1/dependencies',
        expect.objectContaining({ method: 'POST' }),
      ),
    );
    expect(screen.getByRole('group', { name: 'Alpha blocks Beta' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Remove dependency' }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v1/workspaces/w1/projects/p1/dependencies/d1',
        expect.objectContaining({ method: 'DELETE' }),
      ),
    );
  });

  it.skip('marks a dependency clear when its blocking feature is done', async () => {
    const dependency = {
      id: 'd-complete',
      project_id: 'p1',
      blocking_feature_id: 'f1',
      blocked_feature_id: 'f2',
      created_at: '',
      updated_at: '',
    };
    const completedOverview = {
      ...overview,
      epics: overview.epics.map((epic) => ({
        ...epic,
        features: epic.features.map((feature) =>
          feature.id === 'f1' ? { ...feature, status: 'done' } : feature,
        ),
      })),
    };
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string) =>
        Promise.resolve(
          new Response(
            JSON.stringify(
              String(input).endsWith('/dependencies') ? [dependency] : completedOverview,
            ),
            { status: 200 },
          ),
        ),
      ),
    );

    render(
      <MemoryRouter initialEntries={['/planning/w1/p1']}>
        <Routes>
          <Route path="/planning/:workspaceId/:projectId" element={<PlanningPage />} />
        </Routes>
      </MemoryRouter>,
    );

    const group = await screen.findByRole('group', { name: 'Alpha blocks Beta' });
    expect(group).toHaveAttribute('data-state', 'Clear');
    expect(group).toHaveTextContent('CLEAR');
  });

  it.skip('keeps the latest project response when navigation races an earlier request', async () => {
    const pending = new Map<string, Array<(response: Response) => void>>();
    const fetchMock = vi.fn().mockImplementation((input: string) => {
      const projectId = String(input).match(/projects\/(p\d+)/)?.[1] ?? '';
      return new Promise<Response>((resolve) => {
        pending.set(projectId, [...(pending.get(projectId) ?? []), resolve]);
      });
    });
    vi.stubGlobal('fetch', fetchMock);
    function SwitchProject() {
      const navigate = useNavigate();
      return <button onClick={() => navigate('/planning/w1/p2')}>Switch</button>;
    }

    render(
      <MemoryRouter initialEntries={['/planning/w1/p1']}>
        <Routes>
          <Route
            path="/planning/:workspaceId/:projectId"
            element={
              <>
                <SwitchProject />
                <PlanningPage />
              </>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: 'Switch' }));
    await waitFor(() => expect(pending.get('p2')).toHaveLength(2));
    pending.get('p2')?.[0]?.(
      new Response(
        JSON.stringify({
          epics: [],
          unassigned_features: [
            {
              id: 'fresh',
              project_id: 'p2',
              epic_id: null,
              title: 'Fresh feature',
              description: null,
              goal: null,
              priority: 'low',
              status: 'backlog',
              created_at: '',
              updated_at: '',
            },
          ],
        }),
        { status: 200 },
      ),
    );
    pending.get('p2')?.[1]?.(new Response('[]', { status: 200 }));
    expect(await screen.findByRole('link', { name: 'Fresh epic' })).toBeInTheDocument();
    pending.get('p1')?.[0]?.(
      new Response(
        JSON.stringify({
          epics: [],
          unassigned_features: [
            {
              id: 'stale',
              project_id: 'p1',
              epic_id: null,
              title: 'Stale feature',
              description: null,
              goal: null,
              priority: 'low',
              status: 'backlog',
              created_at: '',
              updated_at: '',
            },
          ],
        }),
        { status: 200 },
      ),
    );
    pending.get('p1')?.[1]?.(new Response('[]', { status: 200 }));

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.queryByRole('link', { name: 'Stale feature' })).not.toBeInTheDocument();
  });
});
