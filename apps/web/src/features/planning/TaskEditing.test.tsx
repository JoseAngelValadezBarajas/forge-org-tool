import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FeatureDetailPage } from './FeatureDetailPage';

vi.mock('@tauri-apps/api/core', () => ({ isTauri: () => false }));
vi.mock('@tauri-apps/plugin-dialog', () => ({ open: vi.fn() }));
vi.mock('@tauri-apps/plugin-fs', () => ({ readFile: vi.fn() }));

type TaskRow = {
  id: string;
  feature_id: string;
  title: string;
  description: string | null;
  status: string;
  position: number;
  created_at: string;
  updated_at: string;
};

const row = (id: string, title: string, position: number, status = 'todo'): TaskRow => ({
  id,
  feature_id: 'f1',
  title,
  description: null,
  status,
  position,
  created_at: '',
  updated_at: '',
});

function install(tasks: TaskRow[]) {
  const calls: Array<{ url: string; method: string; body?: string }> = [];
  const json = (value: unknown, status = 200) =>
    Promise.resolve(new Response(JSON.stringify(value), { status }));
  vi.stubGlobal(
    'fetch',
    vi.fn((input: string, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? 'GET';
      calls.push({ url, method, body: init?.body as string | undefined });
      if (url.endsWith('/planning/overview')) {
        return json({
          epics: [],
          unassigned_features: [{ id: 'f1', title: 'Feature', kind: 'story', tags: [] }],
        });
      }
      if (/\/tasks\/[^/]+$/.test(url) && method === 'DELETE') {
        const id = url.split('/').pop();
        tasks.splice(
          tasks.findIndex((task) => task.id === id),
          1,
        );
        return Promise.resolve(new Response(null, { status: 204 }));
      }
      if (/\/tasks\/[^/]+$/.test(url) && method === 'PATCH') {
        const task = tasks.find((candidate) => url.endsWith(candidate.id));
        Object.assign(task as TaskRow, JSON.parse(init?.body as string));
        return json(task);
      }
      if (url.endsWith('/tasks') && method === 'POST') {
        const created = {
          ...row(`t${tasks.length + 10}`, '', 0),
          ...JSON.parse(init?.body as string),
        };
        tasks.push(created);
        return json(created, 201);
      }
      if (url.endsWith('/tasks')) {
        return json([...tasks].sort((a, b) => a.position - b.position));
      }
      if (url.endsWith('/dependencies') || url.endsWith('/acceptance-criteria')) return json([]);
      return json({});
    }),
  );
  return calls;
}

function renderDetail() {
  return render(
    <MemoryRouter initialEntries={['/planning/w1/p1/features/f1']}>
      <Routes>
        <Route
          path="/planning/:workspaceId/:projectId/features/:featureId"
          element={<FeatureDetailPage />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('task editing', () => {
  it('renames a task inline with Enter and cancels with Escape', async () => {
    const calls = install([row('t1', 'Write draft', 0)]);
    renderDetail();
    await screen.findByText('Write draft');

    fireEvent.click(screen.getByRole('button', { name: 'Rename Write draft' }));
    const input = screen.getByLabelText('Title for Write draft');
    fireEvent.change(input, { target: { value: 'Escaped' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByLabelText('Title for Write draft')).not.toBeInTheDocument();
    expect(calls.some((call) => call.method === 'PATCH')).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: 'Rename Write draft' }));
    const second = screen.getByLabelText('Title for Write draft');
    fireEvent.change(second, { target: { value: '  Write final draft ' } });
    fireEvent.keyDown(second, { key: 'Enter' });

    await waitFor(() =>
      expect(calls).toContainEqual(
        expect.objectContaining({
          method: 'PATCH',
          url: '/api/v1/workspaces/w1/projects/p1/features/f1/tasks/t1',
          body: JSON.stringify({ title: 'Write final draft' }),
        }),
      ),
    );
    expect(await screen.findByText('Write final draft')).toBeInTheDocument();
  });

  it('does not send a rename when the title is empty or unchanged', async () => {
    const calls = install([row('t1', 'Keep', 0)]);
    renderDetail();
    await screen.findByText('Keep');
    fireEvent.click(screen.getByRole('button', { name: 'Rename Keep' }));
    const input = screen.getByLabelText('Title for Keep');
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(calls.some((call) => call.method === 'PATCH')).toBe(false);
  });

  it('deletes a task and restores it, with its status and position, from Undo', async () => {
    const calls = install([row('t1', 'First', 0), row('t2', 'Second', 1, 'in_progress')]);
    renderDetail();
    await screen.findByText('Second');

    fireEvent.click(screen.getByRole('button', { name: 'Delete Second' }));

    await waitFor(() => expect(screen.queryByText('Second')).not.toBeInTheDocument());
    expect(screen.getByRole('status')).toHaveTextContent('Deleted “Second”');
    expect(calls).toContainEqual(
      expect.objectContaining({
        method: 'DELETE',
        url: '/api/v1/workspaces/w1/projects/p1/features/f1/tasks/t2',
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));

    expect(await screen.findByText('Second')).toBeInTheDocument();
    const restore = calls.filter((call) => call.method === 'POST' && call.url.endsWith('/tasks'));
    expect(JSON.parse(restore[0].body as string)).toMatchObject({
      title: 'Second',
      status: 'in_progress',
      position: 1,
    });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
