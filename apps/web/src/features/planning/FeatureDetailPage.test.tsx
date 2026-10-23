import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FeatureDetailPage } from './FeatureDetailPage';

describe('FeatureDetailPage', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('reorders tasks through the planning API and keeps the action manual', async () => {
    const tasks = [
      {
        id: 't1',
        feature_id: 'f1',
        title: 'First',
        description: null,
        status: 'todo',
        position: 0,
        created_at: '',
        updated_at: '',
      },
      {
        id: 't2',
        feature_id: 'f1',
        title: 'Second',
        description: null,
        status: 'todo',
        position: 1,
        created_at: '',
        updated_at: '',
      },
    ];
    let taskReads = 0;
    let resolveStaleTaskRead: ((response: Response) => void) | undefined;
    const fetchMock = vi.fn().mockImplementation((input: string) => {
      if (String(input).endsWith('/readiness/preview'))
        return Promise.resolve(
          new Response(
            JSON.stringify({
              feature_id: 'f1',
              evaluated_at: '2026-10-20T12:00:00Z',
              rule_set_version: 'R01-R06',
              input_fingerprint: 'detail-fp',
              outcome: 'NOT_READY',
              passed_checks: ['R01'],
              failed_checks: ['R02'],
              blockers: [{ code: 'DEPENDENCY', message: 'A dependency is incomplete' }],
              results: [],
            }),
            { status: 200 },
          ),
        );
      if (String(input).endsWith('/tasks/reorder'))
        return Promise.resolve(new Response(JSON.stringify([tasks[1], tasks[0]]), { status: 200 }));
      if (String(input).endsWith('/tasks')) {
        taskReads += 1;
        if (taskReads === 2)
          return new Promise<Response>((resolve) => {
            resolveStaleTaskRead = resolve;
          });
        return Promise.resolve(new Response(JSON.stringify(tasks), { status: 200 }));
      }
      if (String(input).endsWith('/acceptance-criteria'))
        return Promise.resolve(new Response('[]', { status: 200 }));
      if (String(input).endsWith('/dependencies'))
        return Promise.resolve(new Response('[]', { status: 200 }));
      return Promise.resolve(new Response('{}', { status: 200 }));
    });
    vi.stubGlobal('fetch', fetchMock);
    render(
      <MemoryRouter initialEntries={['/planning/w1/p1/features/f1']}>
        <Routes>
          <Route
            path="/planning/:workspaceId/:projectId/features/:featureId"
            element={<FeatureDetailPage />}
          />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByText('First');
    expect(
      await screen.findByRole('region', { name: 'Feature readiness overview' }),
    ).toHaveAttribute('data-state', 'Blocked');
    expect(screen.getByText('A dependency is incomplete')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Manage feature context' })).toHaveAttribute(
      'href',
      '/context/w1/p1/f1',
    );
    fireEvent.change(screen.getByLabelText('Acceptance criterion'), {
      target: { value: 'Concurrent criterion' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add criterion' }));
    await waitFor(() => expect(taskReads).toBe(2));
    fireEvent.click(screen.getByRole('button', { name: 'Move First down' }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v1/workspaces/w1/projects/p1/features/f1/tasks/reorder',
        expect.objectContaining({ method: 'POST', body: JSON.stringify({ ids: ['t2', 't1'] }) }),
      ),
    );
    await waitFor(() => {
      expect(
        screen
          .getAllByRole('article')
          .map((article) => within(article).getByText(/First|Second/).textContent),
      ).toEqual(['Second', 'First']);
    });
    expect(resolveStaleTaskRead).toBeDefined();
    await act(async () => {
      resolveStaleTaskRead?.(new Response(JSON.stringify(tasks), { status: 200 }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(
      screen
        .getAllByRole('article')
        .map((article) => within(article).getByText(/First|Second/).textContent),
    ).toEqual(['Second', 'First']);
    expect(screen.getByText(/planning records only/i)).toBeInTheDocument();
  });

  it('renders dependency names from the persisted planning hierarchy', async () => {
    const dependency = {
      id: 'd1',
      project_id: 'p1',
      blocking_feature_id: 'f1',
      blocked_feature_id: 'f2',
      created_at: '',
      updated_at: '',
    };
    const fetchMock = vi.fn().mockImplementation((input: string) => {
      const path = String(input);
      if (path.endsWith('/planning/overview'))
        return Promise.resolve(
          new Response(
            JSON.stringify({
              epics: [],
              unassigned_features: [
                { id: 'f1', title: 'Foundation' },
                { id: 'f2', title: 'Workspace dashboard' },
              ],
            }),
            { status: 200 },
          ),
        );
      if (path.endsWith('/dependencies'))
        return Promise.resolve(new Response(JSON.stringify([dependency]), { status: 200 }));
      if (path.endsWith('/readiness/preview'))
        return Promise.resolve(
          new Response(
            JSON.stringify({
              feature_id: 'f2',
              evaluated_at: '',
              rule_set_version: 'R01-R06',
              input_fingerprint: 'fp',
              outcome: 'NOT_READY',
              passed_checks: [],
              failed_checks: [],
              blockers: [],
              results: [],
            }),
            { status: 200 },
          ),
        );
      return Promise.resolve(new Response('[]', { status: 200 }));
    });
    vi.stubGlobal('fetch', fetchMock);
    render(
      <MemoryRouter initialEntries={['/planning/w1/p1/features/f2']}>
        <Routes>
          <Route
            path="/planning/:workspaceId/:projectId/features/:featureId"
            element={<FeatureDetailPage />}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Foundation blocks Workspace dashboard')).toBeInTheDocument();
    expect(screen.queryByText('f1 blocks f2')).not.toBeInTheDocument();
  });

  it('edits feature details through the existing planning API', async () => {
    const feature = {
      id: 'f2',
      project_id: 'p1',
      epic_id: null,
      title: 'Workspace dashboard',
      description: 'Dashboard summary',
      goal: 'Show the current workspace records',
      priority: 'medium',
      status: 'backlog',
      created_at: '',
      updated_at: '',
    };
    const fetchMock = vi.fn().mockImplementation((input: string, init?: RequestInit) => {
      const path = String(input);
      if (path.endsWith('/planning/overview'))
        return Promise.resolve(
          new Response(JSON.stringify({ epics: [], unassigned_features: [feature] }), {
            status: 200,
          }),
        );
      if (path.endsWith('/readiness/preview'))
        return Promise.resolve(new Response('null', { status: 200 }));
      if (
        path.endsWith('/tasks') ||
        path.endsWith('/acceptance-criteria') ||
        path.endsWith('/dependencies')
      )
        return Promise.resolve(new Response('[]', { status: 200 }));
      if (init?.method === 'PATCH')
        return Promise.resolve(
          new Response(
            JSON.stringify({
              ...feature,
              title: 'Workspace home',
              description: 'Summarize actual records',
              goal: 'Show projects and their current planning state',
            }),
            { status: 200 },
          ),
        );
      return Promise.resolve(new Response('{}', { status: 200 }));
    });
    vi.stubGlobal('fetch', fetchMock);
    render(
      <MemoryRouter initialEntries={['/planning/w1/p1/features/f2']}>
        <Routes>
          <Route
            path="/planning/:workspaceId/:projectId/features/:featureId"
            element={<FeatureDetailPage />}
          />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(await screen.findByLabelText('Edit feature title'), {
      target: { value: 'Workspace home' },
    });
    fireEvent.change(screen.getByLabelText('Edit feature description'), {
      target: { value: 'Summarize actual records' },
    });
    fireEvent.change(screen.getByLabelText('Edit feature goal'), {
      target: { value: 'Show projects and their current planning state' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save feature' }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v1/workspaces/w1/projects/p1/features/f2',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({
            title: 'Workspace home',
            description: 'Summarize actual records',
            goal: 'Show projects and their current planning state',
          }),
        }),
      ),
    );
    expect(await screen.findByLabelText('Edit feature title')).toHaveValue('Workspace home');
    expect(screen.getByLabelText('Edit feature description')).toHaveValue(
      'Summarize actual records',
    );
    expect(screen.getByLabelText('Edit feature goal')).toHaveValue(
      'Show projects and their current planning state',
    );
  });
});
