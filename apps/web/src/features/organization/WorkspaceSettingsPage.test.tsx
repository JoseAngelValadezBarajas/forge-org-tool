import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { WorkspaceSettingsPage } from './WorkspaceSettingsPage';

const workspace = {
  id: 'w1',
  name: 'Research',
  description: 'Old description',
  status: 'active',
  archived_at: null,
  created_at: '',
  updated_at: '',
};

function renderSettings() {
  return render(
    <MemoryRouter initialEntries={['/workspaces/w1/settings']}>
      <Routes>
        <Route path="/workspaces/:workspaceId/settings" element={<WorkspaceSettingsPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('WorkspaceSettingsPage', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('places workspace tag management before general profile controls', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string) =>
        Promise.resolve(
          new Response(JSON.stringify(input === '/api/v1/workspaces' ? [workspace] : []), {
            status: 200,
          }),
        ),
      ),
    );
    renderSettings();

    const tags = await screen.findByRole('heading', { name: 'Manage workspace tags' });
    const profile = screen.getByRole('heading', { name: 'Workspace profile' });
    expect(tags.compareDocumentPosition(profile) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('saves workspace profile fields from the dedicated settings screen', async () => {
    const fetchMock = vi.fn().mockImplementation((input: string, init?: RequestInit) => {
      const path = String(input);
      if (path === '/api/v1/workspaces')
        return Promise.resolve(new Response(JSON.stringify([workspace]), { status: 200 }));
      if (path === '/api/v1/workspaces/w1' && init?.method === 'PATCH')
        return Promise.resolve(
          new Response(
            JSON.stringify({ ...workspace, name: 'Research Lab', description: 'Updated' }),
            { status: 200 },
          ),
        );
      return Promise.resolve(new Response('[]', { status: 200 }));
    });
    vi.stubGlobal('fetch', fetchMock);
    renderSettings();

    fireEvent.change(await screen.findByLabelText('Workspace name'), {
      target: { value: 'Research Lab' },
    });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Updated' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Workspace' }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v1/workspaces/w1',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ name: 'Research Lab', description: 'Updated' }),
        }),
      ),
    );
    expect(
      await screen.findByRole('heading', { name: 'Manage workspace tags' }),
    ).toBeInTheDocument();
  });

  it('preserves Workspace archive and restore behavior in settings', async () => {
    const fetchMock = vi.fn().mockImplementation((input: string) => {
      const path = String(input);
      if (path === '/api/v1/workspaces')
        return Promise.resolve(new Response(JSON.stringify([workspace]), { status: 200 }));
      if (path.endsWith('/archive'))
        return Promise.resolve(
          new Response(JSON.stringify({ ...workspace, archived_at: '2026-10-23T00:00:00Z' }), {
            status: 200,
          }),
        );
      if (path.endsWith('/restore'))
        return Promise.resolve(new Response(JSON.stringify(workspace), { status: 200 }));
      return Promise.resolve(new Response('[]', { status: 200 }));
    });
    vi.stubGlobal('fetch', fetchMock);
    renderSettings();

    fireEvent.click(await screen.findByRole('button', { name: 'Archive Workspace' }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v1/workspaces/w1/archive',
        expect.objectContaining({ method: 'POST' }),
      ),
    );
    expect(
      await screen.findByText('Restore this Workspace to manage its shared tags.'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Restore Workspace' }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v1/workspaces/w1/restore',
        expect.objectContaining({ method: 'POST' }),
      ),
    );
    expect(
      await screen.findByRole('heading', { name: 'Manage workspace tags' }),
    ).toBeInTheDocument();
  });
});
