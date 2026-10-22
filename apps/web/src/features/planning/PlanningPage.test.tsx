import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
      status: 'planning',
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
    vi.restoreAllMocks();
  });

  it('filters the manual board and updates feature planning fields', async () => {
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

  it('creates a feature inside the selected epic without changing manual planning semantics', async () => {
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
    fireEvent.change(screen.getByLabelText('Epic for new feature'), { target: { value: 'e1' } });
    fireEvent.change(screen.getByLabelText('Feature title'), { target: { value: 'Gamma' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Feature' }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v1/workspaces/w1/projects/p1/features',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ title: 'Gamma', epic_id: 'e1' }),
        }),
      ),
    );
    expect(screen.getByText(/manual product records only/i)).toBeInTheDocument();
  });

  it('renders all six API-supported planning workflow columns', async () => {
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

    for (const column of ['Backlog', 'Refining', 'Ready', 'In progress', 'Verify', 'Done']) {
      expect(await screen.findByRole('heading', { name: column })).toBeInTheDocument();
    }
    expect(screen.getByRole('link', { name: 'Gamma' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Delta' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Filter planning by status' })).toHaveDisplayValue(
      'All statuses',
    );
  });

  it('creates and removes a project dependency without implying delivery evidence', async () => {
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

  it('marks a dependency clear when its blocking feature is done', async () => {
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

  it('keeps the latest project response when navigation races an earlier request', async () => {
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
    expect(await screen.findByRole('link', { name: 'Fresh feature' })).toBeInTheDocument();
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
