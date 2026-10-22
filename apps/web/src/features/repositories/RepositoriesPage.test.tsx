import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RepositoriesPage } from './RepositoriesPage';

const repository = {
  id: 'r1',
  project_id: 'p1',
  root_path: 'C:/approved/repo',
  status: 'connected',
  created_at: '',
  updated_at: '',
};
const observation = {
  id: 'o1',
  repository_id: 'r1',
  observed_at: '',
  head_sha: null,
  branch: 'main',
  detached: false,
  unborn: true,
  clean: true,
  tracked_modified_count: 0,
  staged_count: 0,
  untracked_count: 0,
  observer_version: 'forge-git-observer-v1',
  status: 'ok',
  error_code: null,
  source_content_read: false,
};

describe('RepositoriesPage', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('shows metadata-only observation history and disconnects without deleting it', async () => {
    const previousObservation = {
      ...observation,
      id: 'o0',
      observed_at: '2026-10-21T10:00:00Z',
      branch: 'feature/previous',
      head_sha: '0123456789abcdef',
      unborn: false,
      clean: false,
      tracked_modified_count: 2,
    };
    const fetchMock = vi.fn().mockImplementation((input: string, init?: RequestInit) => {
      const path = String(input);
      if (path.endsWith('/repositories'))
        return Promise.resolve(new Response(JSON.stringify([repository]), { status: 200 }));
      if (path.includes('/observations'))
        return Promise.resolve(
          new Response(JSON.stringify([observation, previousObservation]), { status: 200 }),
        );
      return Promise.resolve(
        new Response(JSON.stringify(repository), { status: init?.method === 'POST' ? 200 : 200 }),
      );
    });
    vi.stubGlobal('fetch', fetchMock);
    render(
      <MemoryRouter initialEntries={['/repositories/w1/p1']}>
        <Routes>
          <Route path="/repositories/:workspaceId/:projectId" element={<RepositoriesPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Latest observation: unborn/)).toBeInTheDocument();
    expect(screen.getByText('Source content').nextElementSibling).toHaveTextContent('not read');
    expect(screen.getByText('feature/previous')).toBeInTheDocument();
    expect(screen.getByText('0123456789abcdef')).toBeInTheDocument();
    expect(screen.getByText(/modified 2/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Disconnect repo' }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v1/workspaces/w1/projects/p1/repositories/r1/disconnect',
        expect.objectContaining({ method: 'POST' }),
      ),
    );
  });
  it('offers a retry after repository loading fails', async () => {
    let failed = false;
    const fetchMock = vi.fn().mockImplementation((input: string) => {
      if (String(input).endsWith('/repositories') && !failed) {
        failed = true;
        return Promise.resolve(
          new Response(JSON.stringify({ detail: 'Repository service unavailable' }), {
            status: 503,
          }),
        );
      }
      if (String(input).endsWith('/repositories'))
        return Promise.resolve(new Response(JSON.stringify([repository]), { status: 200 }));
      return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }));
    });
    vi.stubGlobal('fetch', fetchMock);
    render(
      <MemoryRouter initialEntries={['/repositories/w1/p1']}>
        <Routes>
          <Route path="/repositories/:workspaceId/:projectId" element={<RepositoriesPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('Repository service unavailable');
    fireEvent.click(screen.getByRole('button', { name: 'Retry loading repositories' }));
    expect(
      await screen.findByText('No metadata observation has been recorded.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('links repository inventory entries to a detail route', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockImplementation((input: string) =>
          Promise.resolve(
            new Response(
              JSON.stringify(String(input).endsWith('/repositories') ? [repository] : []),
              { status: 200 },
            ),
          ),
        ),
    );
    render(
      <MemoryRouter initialEntries={['/repositories/w1/p1']}>
        <Routes>
          <Route path="/repositories/:workspaceId/:projectId" element={<RepositoriesPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('link', { name: 'View repository repo' })).toHaveAttribute(
      'href',
      '/repositories/w1/p1/r1',
    );
  });
});
