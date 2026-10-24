import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
  beforeEach(() => {
    const prototype = window.HTMLDialogElement.prototype;
    if (typeof prototype.showModal !== 'function') {
      Object.defineProperty(prototype, 'showModal', {
        configurable: true,
        value(this: HTMLDialogElement) {
          this.setAttribute('open', '');
        },
      });
    }
    if (typeof prototype.close !== 'function') {
      Object.defineProperty(prototype, 'close', {
        configurable: true,
        value(this: HTMLDialogElement) {
          this.removeAttribute('open');
        },
      });
    }
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('shows the approved tag catalog and guidance with contextual CRUD and refreshes after editing', async () => {
    let tags = [
      { id: 't1', workspace_id: 'w1', name: 'research', color: '#d8874d', created_at: '' },
    ];
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string, init?: RequestInit) => {
        const path = String(input);
        if (init?.method === 'PATCH' && path.endsWith('/tags/t1')) {
          tags = [{ ...tags[0]!, name: 'tracking', color: '#336699' }];
          return Promise.resolve(new Response(JSON.stringify(tags[0]), { status: 200 }));
        }
        return Promise.resolve(
          new Response(JSON.stringify(path === '/api/v1/workspaces' ? [workspace] : tags), {
            status: 200,
          }),
        );
      }),
    );
    renderSettings();

    const catalog = await screen.findByRole('region', { name: 'Tags in Research' });
    expect(await within(catalog).findByText('# research')).toBeInTheDocument();
    expect(
      screen.getByText('Create once, reuse across every Project, Epic, Story and Bug.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('complementary', { name: 'Consistency by design' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'New tag name' })).not.toBeInTheDocument();
    expect(within(catalog).getByText(/\d+ items|Usage loading…/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'New tag' }));
    const editor = await screen.findByRole('dialog', { name: 'Edit workspace tags' });
    expect(within(editor).getByRole('textbox', { name: 'New tag name' })).toBeInTheDocument();
    fireEvent.change(await within(editor).findByLabelText('Name for tag research'), {
      target: { value: 'tracking' },
    });
    fireEvent.change(within(editor).getByLabelText('Color for tag research'), {
      target: { value: '#336699' },
    });
    fireEvent.click(within(editor).getByRole('button', { name: 'Save tag research' }));
    await within(editor).findByLabelText('Name for tag tracking');
    fireEvent.click(within(editor).getByRole('button', { name: 'Done' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(await within(catalog).findByText('# tracking')).toBeInTheDocument();
    expect(within(catalog).queryByText('# research')).not.toBeInTheDocument();
    fireEvent.click(within(catalog).getByRole('button', { name: 'Edit tag tracking' }));
    expect(await screen.findByRole('dialog', { name: 'Edit workspace tags' })).toBeInTheDocument();
  });

  it('derives truthful tag usage counts from persisted project records instead of inventing descriptions', async () => {
    const tags = [
      { id: 't1', workspace_id: 'w1', name: 'research', color: '#d8874d', created_at: '' },
      { id: 't2', workspace_id: 'w1', name: 'tracking', color: '#336699', created_at: '' },
    ];
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string) => {
        const path = String(input);
        if (path === '/api/v1/workspaces')
          return Promise.resolve(new Response(JSON.stringify([workspace]), { status: 200 }));
        if (path === '/api/v1/workspaces/w1/tags')
          return Promise.resolve(new Response(JSON.stringify(tags), { status: 200 }));
        if (path === '/api/v1/workspaces/w1/projects/p1/planning/overview')
          return Promise.resolve(
            new Response(
              JSON.stringify({
                epics: [
                  {
                    id: 'e1',
                    tags: ['research'],
                    features: [
                      { id: 'f1', tags: ['research', 'tracking'] },
                      { id: 'f2', tags: ['tracking'] },
                    ],
                  },
                ],
                unassigned_features: [],
              }),
              { status: 200 },
            ),
          );
        if (path.startsWith('/api/v1/workspaces/w1/projects'))
          return Promise.resolve(
            new Response(
              JSON.stringify([{ id: 'p1', workspace_id: 'w1', status: 'active', name: 'FormiAI' }]),
              { status: 200 },
            ),
          );
        return Promise.resolve(new Response('{}', { status: 200 }));
      }),
    );
    renderSettings();

    const catalog = await screen.findByRole('region', { name: 'Tags in Research' });
    expect((await within(catalog).findAllByText('2 items')).length).toBe(2);
    expect(within(catalog).queryByText('Research tasks')).not.toBeInTheDocument();
    expect(
      within(catalog).queryByText('Available throughout this workspace'),
    ).not.toBeInTheDocument();
  });

  it('creates and deletes workspace tags from the contextual editor', async () => {
    const created = {
      id: 't2',
      workspace_id: 'w1',
      name: 'release',
      color: '#336699',
      created_at: '',
    };
    const fetchMock = vi.fn((input: string, init?: RequestInit) => {
      const path = String(input);
      if (path === '/api/v1/workspaces')
        return Promise.resolve(new Response(JSON.stringify([workspace]), { status: 200 }));
      if (path.endsWith('/tags') && init?.method === 'POST')
        return Promise.resolve(new Response(JSON.stringify(created), { status: 201 }));
      if (path.endsWith('/tags/t2') && init?.method === 'DELETE')
        return Promise.resolve(new Response(null, { status: 204 }));
      return Promise.resolve(new Response('[]', { status: 200 }));
    });
    vi.stubGlobal('fetch', fetchMock);
    renderSettings();

    const catalog = await screen.findByRole('region', { name: 'Tags in Research' });
    fireEvent.click(screen.getByRole('button', { name: 'New tag' }));
    const editor = await screen.findByRole('dialog', { name: 'Edit workspace tags' });
    fireEvent.change(within(editor).getByLabelText('New tag name'), {
      target: { value: 'release' },
    });
    fireEvent.click(within(editor).getByRole('button', { name: 'Create workspace tag' }));
    expect(await within(catalog).findByText('# release')).toBeInTheDocument();
    fireEvent.click(within(catalog).getByRole('button', { name: 'Edit tag release' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Delete tag release' }));
    await waitFor(() => expect(within(catalog).queryByText('# release')).not.toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/workspaces/w1/tags/t2',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('keeps a failed tag creation draft and exposes the error inside its active dialog', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string, init?: RequestInit) => {
        if (init?.method === 'POST') return Promise.reject(new Error('Tag name already exists'));
        return Promise.resolve(
          new Response(JSON.stringify(String(input) === '/api/v1/workspaces' ? [workspace] : []), {
            status: 200,
          }),
        );
      }),
    );
    renderSettings();
    fireEvent.click(await screen.findByRole('button', { name: 'New tag' }));
    const editor = screen.getByRole('dialog', { name: 'Edit workspace tags' });
    fireEvent.change(within(editor).getByLabelText('New tag name'), {
      target: { value: 'research' },
    });
    fireEvent.click(within(editor).getByRole('button', { name: 'Create workspace tag' }));
    expect(await within(editor).findByRole('alert')).toHaveTextContent('Tag name already exists');
    expect(within(editor).getByLabelText('New tag name')).toHaveValue('research');
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
    const profile = screen.getByText('Workspace profile and status');
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

    fireEvent.click(await screen.findByText('Workspace profile and status'));
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

    fireEvent.click(await screen.findByText('Workspace profile and status'));
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
