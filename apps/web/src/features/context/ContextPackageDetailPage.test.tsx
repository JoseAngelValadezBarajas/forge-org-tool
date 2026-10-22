import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ContextPackageDetailPage } from './ContextPackageDetailPage';

const packageRecord = {
  id: 'pkg1',
  project_id: 'p1',
  feature_id: 'f1',
  schema_version: 'forge-context-v1',
  fingerprint: 'snapshot-fingerprint',
  payload_json: '{"feature":{"title":"Historical feature"},"git_observations":[]}',
  markdown: '# Historical context\n\nCaptured planning snapshot.',
  created_at: '2026-10-21T10:00:00Z',
};

describe('ContextPackageDetailPage', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('loads an immutable package snapshot and exposes JSON and Markdown downloads', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify(packageRecord), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    render(
      <MemoryRouter initialEntries={['/context/w1/p1/f1/packages/pkg1']}>
        <Routes>
          <Route
            path="/context/:workspaceId/:projectId/:featureId/packages/:packageId"
            element={<ContextPackageDetailPage />}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole('heading', { name: 'Context package snapshot' }),
    ).toBeInTheDocument();
    expect(screen.getByText('snapshot-fingerprint')).toBeInTheDocument();
    expect(screen.getByText(/Captured planning snapshot/)).toBeInTheDocument();
    expect(screen.getByText(/Historical feature/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Download JSON' })).toHaveAttribute(
      'href',
      '/api/v1/workspaces/w1/projects/p1/features/f1/context/packages/pkg1/download?format=json',
    );
    expect(screen.getByRole('link', { name: 'Download Markdown' })).toHaveAttribute(
      'href',
      '/api/v1/workspaces/w1/projects/p1/features/f1/context/packages/pkg1/download?format=markdown',
    );
    expect(screen.getByRole('link', { name: 'Back to context history' })).toHaveAttribute(
      'href',
      '/context/w1/p1/f1',
    );
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/workspaces/w1/projects/p1/features/f1/context/packages/pkg1',
      expect.objectContaining({ credentials: 'same-origin' }),
    );
  });

  it('allows recovery when a saved package cannot be loaded', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ detail: 'Snapshot unavailable' }), { status: 503 }),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify(packageRecord), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    render(
      <MemoryRouter initialEntries={['/context/w1/p1/f1/packages/pkg1']}>
        <Routes>
          <Route
            path="/context/:workspaceId/:projectId/:featureId/packages/:packageId"
            element={<ContextPackageDetailPage />}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('Snapshot unavailable');
    screen.getByRole('button', { name: 'Retry loading package' }).click();
    expect(await screen.findByText('snapshot-fingerprint')).toBeInTheDocument();
  });
});
