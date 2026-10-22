import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RepositoryDetailPage } from './RepositoryDetailPage';

const repository = {
  id: 'r1',
  project_id: 'p1',
  root_path: 'C:/private/customer/project-alpha',
  status: 'connected',
  created_at: '',
  updated_at: '',
};
const observation = {
  id: 'o1',
  repository_id: 'r1',
  observed_at: '2026-10-21T10:00:00Z',
  head_sha: '0123456789abcdef',
  branch: 'feature/metadata',
  detached: false,
  unborn: false,
  clean: false,
  tracked_modified_count: 1,
  staged_count: 0,
  untracked_count: 2,
  observer_version: 'forge-git-observer-v1',
  status: 'ok',
  error_code: null,
  source_content_read: false,
};

describe('RepositoryDetailPage', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('loads observation history without exposing the absolute repository path', async () => {
    const fetchMock = vi.fn().mockImplementation((input: string) => {
      const path = String(input);
      if (path.endsWith('/repositories'))
        return Promise.resolve(new Response(JSON.stringify([repository]), { status: 200 }));
      if (path.endsWith('/repositories/r1/observations'))
        return Promise.resolve(new Response(JSON.stringify([observation]), { status: 200 }));
      return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }));
    });
    vi.stubGlobal('fetch', fetchMock);
    render(
      <MemoryRouter initialEntries={['/repositories/w1/p1/r1']}>
        <Routes>
          <Route
            path="/repositories/:workspaceId/:projectId/:repositoryId"
            element={<RepositoryDetailPage />}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('project-alpha')).toBeInTheDocument();
    expect(screen.getAllByText('feature/metadata').length).toBeGreaterThan(0);
    expect(screen.getAllByText('0123456789abcdef').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: 'Back to repositories' })).toHaveAttribute(
      'href',
      '/repositories/w1/p1',
    );
    expect(screen.queryByText(repository.root_path)).not.toBeInTheDocument();
    expect(document.body.textContent).not.toContain(repository.root_path);
  });
});
