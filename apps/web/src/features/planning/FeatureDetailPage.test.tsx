import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FeatureDetailPage } from './FeatureDetailPage';

const { isTauriMock, openDialogMock, readFileMock } = vi.hoisted(() => ({
  isTauriMock: vi.fn(() => false),
  openDialogMock: vi.fn(),
  readFileMock: vi.fn(),
}));

vi.mock('@tauri-apps/api/core', () => ({ isTauri: isTauriMock }));
vi.mock('@tauri-apps/plugin-dialog', () => ({ open: openDialogMock }));
vi.mock('@tauri-apps/plugin-fs', () => ({ readFile: readFileMock }));

describe('FeatureDetailPage', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    isTauriMock.mockReset().mockReturnValue(false);
    openDialogMock.mockReset();
    readFileMock.mockReset();
  });

  it('shows a readable Story by default and reveals its editor only on request', async () => {
    const story = {
      id: 'story-1',
      project_id: 'p1',
      epic_id: null,
      title: 'Readable story',
      description: 'A clear summary for the team.',
      goal: 'Make the detail easy to scan.',
      priority: 'high',
      status: 'ready',
      kind: 'story',
      tags: ['Design'],
      notes: 'Keep the existing notes.',
      created_at: '',
      updated_at: '',
    };
    const fetchMock = vi.fn().mockImplementation((input: string) => {
      const path = String(input);
      if (path.endsWith('/planning/overview'))
        return Promise.resolve(
          new Response(JSON.stringify({ epics: [], unassigned_features: [story] }), {
            status: 200,
          }),
        );
      if (
        path.endsWith('/tasks') ||
        path.endsWith('/acceptance-criteria') ||
        path.endsWith('/dependencies')
      )
        return Promise.resolve(new Response('[]', { status: 200 }));
      return Promise.resolve(new Response('null', { status: 200 }));
    });
    vi.stubGlobal('fetch', fetchMock);
    render(
      <MemoryRouter initialEntries={['/planning/w1/p1/features/story-1']}>
        <Routes>
          <Route
            path="/planning/:workspaceId/:projectId/features/:featureId"
            element={<FeatureDetailPage />}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Readable story', level: 1 })).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Work item detail' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Description', level: 2 })).toBeVisible();
    expect(screen.getByText('A clear summary for the team.')).toBeVisible();
    expect(screen.getByText('Make the detail easy to scan.')).toBeVisible();
    expect(screen.getByText('Design')).toBeVisible();
    expect(screen.getByText('Keep the existing notes.')).toBeVisible();
    expect(screen.queryByLabelText('Edit feature title')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Edit details' }));
    expect(await screen.findByLabelText('Edit feature title')).toHaveValue('Readable story');
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
    let criterionReads = 0;
    let resolveStaleTaskRead: ((response: Response) => void) | undefined;
    const fetchMock = vi.fn().mockImplementation((input: string, init?: RequestInit) => {
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
      if (String(input).endsWith('/planning/overview'))
        return Promise.resolve(
          new Response(
            JSON.stringify({
              epics: [],
              unassigned_features: [{ id: 'f1', title: 'Feature', kind: 'story', tags: [] }],
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
      if (String(input).endsWith('/acceptance-criteria')) {
        if (init?.method === 'POST') return Promise.resolve(new Response('{}', { status: 201 }));
        criterionReads += 1;
        const criteria =
          criterionReads === 1
            ? []
            : [
                {
                  id: 'c1',
                  feature_id: 'f1',
                  description: 'Concurrent criterion',
                  satisfied: false,
                  created_at: '',
                  updated_at: '',
                },
              ];
        return Promise.resolve(new Response(JSON.stringify(criteria), { status: 200 }));
      }
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
    fireEvent.click(screen.getByText('Add acceptance criterion'));
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
    await screen.findByText('Concurrent criterion');
    expect(
      screen
        .getAllByRole('article')
        .map((article) => within(article).getByText(/First|Second/).textContent),
    ).toEqual(['Second', 'First']);
    expect(
      screen.getByText(/status changes do not claim execution or delivery/i),
    ).toBeInTheDocument();
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

  it('reconciles a task created during a reorder that the API rejects', async () => {
    const persistedTasks = [
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
    const fetchMock = vi.fn().mockImplementation((input: string, init?: RequestInit) => {
      const path = String(input);
      if (path.endsWith('/tasks') && init?.method === 'POST') {
        const created = {
          id: 't3',
          feature_id: 'f1',
          title: 'Created during reorder',
          description: null,
          status: 'todo',
          position: 2,
          created_at: '',
          updated_at: '',
        };
        persistedTasks.push(created);
        return Promise.resolve(new Response(JSON.stringify(created), { status: 201 }));
      }
      if (path.endsWith('/tasks/reorder'))
        return Promise.resolve(
          new Response(JSON.stringify({ detail: 'Task ordering changed' }), { status: 409 }),
        );
      if (path.endsWith('/tasks')) {
        taskReads += 1;
        if (taskReads === 2)
          return new Promise<Response>((resolve) => {
            resolveStaleTaskRead = resolve;
          });
        return Promise.resolve(new Response(JSON.stringify(persistedTasks), { status: 200 }));
      }
      if (path.endsWith('/planning/overview'))
        return Promise.resolve(
          new Response(
            JSON.stringify({ epics: [], unassigned_features: [{ id: 'f1', title: 'Feature' }] }),
            { status: 200 },
          ),
        );
      if (path.endsWith('/acceptance-criteria') || path.endsWith('/dependencies'))
        return Promise.resolve(new Response('[]', { status: 200 }));
      if (path.endsWith('/readiness/preview'))
        return Promise.resolve(new Response('null', { status: 200 }));
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
    fireEvent.click(screen.getByText('Add task', { selector: 'summary' }));
    fireEvent.change(screen.getByLabelText('Task title'), {
      target: { value: 'Created during reorder' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add task' }));
    await waitFor(() => expect(taskReads).toBe(2));
    fireEvent.click(screen.getByRole('button', { name: 'Move First down' }));
    await screen.findByRole('alert');
    await screen.findByText('Created during reorder');
    await act(async () => {
      resolveStaleTaskRead?.(
        new Response(JSON.stringify(persistedTasks.slice(0, 2)), { status: 200 }),
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(screen.getByText('Created during reorder')).toBeInTheDocument();
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
      kind: 'bug',
      bug_severity: 'high',
      steps_to_reproduce: 'Open settings',
      expected_result: 'Panel opens',
      actual_result: 'Application crashes',
      tags: ['Desktop'],
      notes: 'Known desktop regression',
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
      if (path.endsWith('/attachments'))
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

    expect(await screen.findByText('Panel opens')).toBeVisible();
    expect(screen.getByText('Application crashes')).toBeVisible();
    expect(screen.getByText('high')).toBeVisible();
    expect(screen.getByText('backlog')).toBeVisible();
    fireEvent.click(await screen.findByRole('button', { name: 'Edit details' }));
    fireEvent.change(await screen.findByLabelText('Edit feature title'), {
      target: { value: 'Workspace home' },
    });
    fireEvent.change(screen.getByLabelText('Edit feature description'), {
      target: { value: 'Summarize actual records' },
    });
    fireEvent.change(screen.getByLabelText('Edit feature goal'), {
      target: { value: 'Show projects and their current planning state' },
    });
    fireEvent.change(screen.getByLabelText('Actual result'), {
      target: { value: 'Crash on launch' },
    });
    fireEvent.change(screen.getByLabelText('Work item notes'), {
      target: { value: 'Reproduces after restart\nOnly on Windows' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v1/workspaces/w1/projects/p1/features/f2',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({
            title: 'Workspace home',
            description: 'Summarize actual records',
            goal: 'Show projects and their current planning state',
            bug_severity: 'high',
            steps_to_reproduce: 'Open settings',
            expected_result: 'Panel opens',
            actual_result: 'Crash on launch',
            tags: ['Desktop'],
            notes: 'Reproduces after restart\nOnly on Windows',
          }),
        }),
      ),
    );
    expect(await screen.findByRole('heading', { name: 'Workspace home', level: 1 })).toBeVisible();
    expect(screen.getByText('Summarize actual records')).toBeVisible();
    expect(screen.getByText('Show projects and their current planning state')).toBeVisible();
  });

  it('uploads and displays a Bug screenshot using the scoped API endpoint', async () => {
    const bug = {
      id: 'f-bug',
      project_id: 'p1',
      epic_id: null,
      title: 'Crash',
      description: null,
      goal: null,
      priority: 'high',
      status: 'backlog',
      kind: 'bug',
      bug_severity: 'high',
      steps_to_reproduce: 'Open the menu',
      expected_result: 'Menu opens',
      actual_result: 'App exits',
      tags: [],
      created_at: '',
      updated_at: '',
    };
    const attachment = {
      id: 'a1',
      feature_id: 'f-bug',
      file_name: 'screen.png',
      content_type: 'image/png',
      byte_size: 12,
      sha256: 'abc',
      created_at: '',
    };
    let saved = false;
    const fetchMock = vi.fn().mockImplementation((input: string, init?: RequestInit) => {
      const path = String(input);
      if (path.endsWith('/planning/overview'))
        return Promise.resolve(
          new Response(JSON.stringify({ epics: [], unassigned_features: [bug] }), { status: 200 }),
        );
      if (path.endsWith('/attachments') && init?.method === 'POST') {
        saved = true;
        return Promise.resolve(new Response(JSON.stringify(attachment), { status: 201 }));
      }
      if (path.endsWith('/attachments'))
        return Promise.resolve(
          new Response(JSON.stringify(saved ? [attachment] : []), { status: 200 }),
        );
      if (
        path.endsWith('/tasks') ||
        path.endsWith('/acceptance-criteria') ||
        path.endsWith('/dependencies')
      )
        return Promise.resolve(new Response('[]', { status: 200 }));
      return Promise.resolve(new Response('{}', { status: 200 }));
    });
    vi.stubGlobal('fetch', fetchMock);
    const { container } = render(
      <MemoryRouter initialEntries={['/planning/w1/p1/features/f-bug']}>
        <Routes>
          <Route
            path="/planning/:workspaceId/:projectId/features/:featureId"
            element={<FeatureDetailPage />}
          />
        </Routes>
      </MemoryRouter>,
    );

    const nativeFilePicker = vi.spyOn(HTMLInputElement.prototype, 'click');
    fireEvent.click(await screen.findByRole('button', { name: 'Add Bug screenshot' }));
    expect(nativeFilePicker).toHaveBeenCalled();
    const file = new File([new Uint8Array([1, 2, 3])], 'screen.png', { type: 'image/png' });
    const fileInput = container.querySelector<HTMLInputElement>('input[type="file"]');
    expect(fileInput).not.toBeNull();
    fireEvent.change(fileInput!, {
      target: { files: [file] },
    });
    expect(await screen.findByRole('img', { name: 'Bug screenshot: screen.png' })).toHaveAttribute(
      'src',
      '/api/v1/workspaces/w1/projects/p1/features/f-bug/attachments/a1/content',
    );
    const call = fetchMock.mock.calls.find(
      ([path, init]) => String(path).endsWith('/attachments') && init?.method === 'POST',
    );
    expect(call?.[1]?.body).toContain('data_base64');
  });

  it('uses the native, user-scoped Tauri file dialog to upload a Bug screenshot', async () => {
    isTauriMock.mockReturnValue(true);
    openDialogMock.mockResolvedValue('C:\\Users\\operator\\Pictures\\screen.png');
    readFileMock.mockResolvedValue(new Uint8Array([1, 2, 3]));
    const bug = {
      id: 'f-bug',
      project_id: 'p1',
      epic_id: null,
      title: 'Crash',
      description: null,
      goal: null,
      priority: 'high',
      status: 'backlog',
      kind: 'bug',
      bug_severity: 'high',
      steps_to_reproduce: 'Open the menu',
      expected_result: 'Menu opens',
      actual_result: 'App exits',
      tags: [],
      created_at: '',
      updated_at: '',
    };
    const attachment = {
      id: 'a1',
      feature_id: 'f-bug',
      file_name: 'screen.png',
      content_type: 'image/png',
      byte_size: 3,
      sha256: 'abc',
      created_at: '',
    };
    let saved = false;
    const fetchMock = vi.fn().mockImplementation((input: string, init?: RequestInit) => {
      const path = String(input);
      if (path.endsWith('/planning/overview'))
        return Promise.resolve(
          new Response(JSON.stringify({ epics: [], unassigned_features: [bug] }), { status: 200 }),
        );
      if (path.endsWith('/attachments') && init?.method === 'POST') {
        saved = true;
        return Promise.resolve(new Response(JSON.stringify(attachment), { status: 201 }));
      }
      if (path.endsWith('/attachments'))
        return Promise.resolve(
          new Response(JSON.stringify(saved ? [attachment] : []), { status: 200 }),
        );
      if (
        path.endsWith('/tasks') ||
        path.endsWith('/acceptance-criteria') ||
        path.endsWith('/dependencies')
      )
        return Promise.resolve(new Response('[]', { status: 200 }));
      return Promise.resolve(new Response('{}', { status: 200 }));
    });
    vi.stubGlobal('fetch', fetchMock);
    render(
      <MemoryRouter initialEntries={['/planning/w1/p1/features/f-bug']}>
        <Routes>
          <Route
            path="/planning/:workspaceId/:projectId/features/:featureId"
            element={<FeatureDetailPage />}
          />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Add Bug screenshot' }));

    expect(openDialogMock).toHaveBeenCalledWith({
      multiple: false,
      directory: false,
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }],
    });
    await waitFor(() =>
      expect(readFileMock).toHaveBeenCalledWith('C:\\Users\\operator\\Pictures\\screen.png'),
    );
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/features/f-bug/attachments'),
        expect.objectContaining({ method: 'POST' }),
      ),
    );
    const upload = fetchMock.mock.calls.find(
      ([path, init]) => String(path).endsWith('/attachments') && init?.method === 'POST',
    );
    expect(JSON.parse(String(upload?.[1]?.body))).toMatchObject({
      file_name: 'screen.png',
      content_type: 'image/png',
      data_base64: 'AQID',
    });
    expect(await screen.findByRole('img', { name: 'Bug screenshot: screen.png' })).toBeVisible();
  });

  it('removes a Bug screenshot through the durable attachment API', async () => {
    const bug = {
      id: 'f-bug',
      project_id: 'p1',
      epic_id: null,
      title: 'Crash',
      description: null,
      goal: null,
      priority: 'high',
      status: 'backlog',
      kind: 'bug',
      bug_severity: 'high',
      steps_to_reproduce: 'Open the menu',
      expected_result: 'Menu opens',
      actual_result: 'App exits',
      tags: [],
      created_at: '',
      updated_at: '',
    };
    const attachment = {
      id: 'a1',
      feature_id: 'f-bug',
      file_name: 'screen.png',
      content_type: 'image/png',
      byte_size: 12,
      sha256: 'abc',
      created_at: '',
    };
    let saved = true;
    const fetchMock = vi.fn().mockImplementation((input: string, init?: RequestInit) => {
      const path = String(input);
      if (path.endsWith('/planning/overview'))
        return Promise.resolve(
          new Response(JSON.stringify({ epics: [], unassigned_features: [bug] }), { status: 200 }),
        );
      if (path.endsWith('/attachments') && init?.method !== 'DELETE')
        return Promise.resolve(
          new Response(JSON.stringify(saved ? [attachment] : []), { status: 200 }),
        );
      if (path.endsWith('/attachments/a1') && init?.method === 'DELETE') {
        saved = false;
        return Promise.resolve(new Response(null, { status: 204 }));
      }
      if (
        path.endsWith('/tasks') ||
        path.endsWith('/acceptance-criteria') ||
        path.endsWith('/dependencies')
      )
        return Promise.resolve(new Response('[]', { status: 200 }));
      return Promise.resolve(new Response('null', { status: 200 }));
    });
    vi.stubGlobal('fetch', fetchMock);
    render(
      <MemoryRouter initialEntries={['/planning/w1/p1/features/f-bug']}>
        <Routes>
          <Route
            path="/planning/:workspaceId/:projectId/features/:featureId"
            element={<FeatureDetailPage />}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('img', { name: 'Bug screenshot: screen.png' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Remove screen.png' }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v1/workspaces/w1/projects/p1/features/f-bug/attachments/a1',
        expect.objectContaining({ method: 'DELETE' }),
      ),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole('img', { name: 'Bug screenshot: screen.png' }),
      ).not.toBeInTheDocument(),
    );
  });
});
