import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ContextPage } from './ContextPage';

const repository = {
  id: 'r1',
  project_id: 'p1',
  root_path: 'C:/approved/repo',
  status: 'connected',
  created_at: '',
  updated_at: '',
};
const packageRecord = {
  id: 'pkg1',
  project_id: 'p1',
  feature_id: 'f1',
  schema_version: 'forge-context-v1',
  fingerprint: 'abc123',
  payload_json: '{}',
  markdown: '# Context',
  created_at: '',
};

describe('ContextPage', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('links a repository, previews and saves an immutable context package', async () => {
    let saved = false;
    const fetchMock = vi.fn().mockImplementation((input: string, init?: RequestInit) => {
      const path = String(input);
      if (path.includes('/features/f1/repositories') && init?.method === 'POST')
        return Promise.resolve(new Response(JSON.stringify(repository), { status: 201 }));
      if (path.includes('/features/f1/repositories'))
        return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }));
      if (path.endsWith('/repositories'))
        return Promise.resolve(new Response(JSON.stringify([repository]), { status: 200 }));
      if (path.endsWith('/context/packages') && init?.method === 'POST') {
        saved = true;
        return Promise.resolve(new Response(JSON.stringify(packageRecord), { status: 201 }));
      }
      if (path.endsWith('/context/packages'))
        return Promise.resolve(
          new Response(JSON.stringify(saved ? [packageRecord] : []), { status: 200 }),
        );
      if (path.endsWith('/context/preview'))
        return Promise.resolve(
          new Response(
            JSON.stringify({
              schema_version: 'forge-context-v1',
              fingerprint: 'abc123',
              payload: { repositories: [] },
              markdown: '# Context',
            }),
            { status: 200 },
          ),
        );
      return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
    });
    vi.stubGlobal('fetch', fetchMock);
    render(
      <MemoryRouter initialEntries={['/context/w1/p1/f1']}>
        <Routes>
          <Route path="/context/:workspaceId/:projectId/:featureId" element={<ContextPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('repo')).toBeInTheDocument();
    expect(screen.queryByText('C:/approved/repo')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Link C:/approved/repo' }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v1/workspaces/w1/projects/p1/features/f1/repositories',
        expect.objectContaining({ method: 'POST' }),
      ),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Preview context package' }));
    expect(await screen.findByText('abc123')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save context package' }));
    expect(await screen.findByText('Saved context package')).toBeInTheDocument();
    expect(screen.getByText('Fingerprint').nextElementSibling).toHaveTextContent('abc123');
  });
});
