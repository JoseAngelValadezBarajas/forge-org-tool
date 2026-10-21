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
    const fetchMock = vi.fn().mockImplementation((input: string, init?: RequestInit) => {
      const path = String(input);
      if (path.endsWith('/repositories'))
        return Promise.resolve(new Response(JSON.stringify([repository]), { status: 200 }));
      if (path.includes('/observations'))
        return Promise.resolve(new Response(JSON.stringify([observation]), { status: 200 }));
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

    expect(await screen.findByText(/unborn/i)).toBeInTheDocument();
    expect(screen.getByText(/source content: no/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Disconnect C:/approved/repo' }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v1/workspaces/w1/projects/p1/repositories/r1/disconnect',
        expect.objectContaining({ method: 'POST' }),
      ),
    );
  });
});
