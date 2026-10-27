import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { WorkspaceManagementPage } from './WorkspaceManagementPage';

const workspaces = [
  {
    id: 'w1',
    name: 'Research',
    description: 'Product work',
    archived_at: null,
    created_at: '',
    updated_at: '',
  },
  {
    id: 'w2',
    name: 'Archive',
    description: null,
    archived_at: '2026-10-26T00:00:00Z',
    created_at: '',
    updated_at: '',
  },
];

describe('WorkspaceManagementPage', () => {
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

  it('lists existing workspaces, creates one, and deletes only after confirmation', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(workspaces), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'w3',
            name: 'New space',
            description: 'Shared',
            archived_at: null,
            created_at: '',
            updated_at: '',
          }),
          { status: 201 },
        ),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    render(
      <MemoryRouter>
        <WorkspaceManagementPage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Manage workspaces' })).toBeInTheDocument();
    expect(screen.getByRole('article', { name: 'Research' })).toBeInTheDocument();
    expect(screen.getByRole('article', { name: 'Archive' })).toHaveTextContent('Archived');

    fireEvent.click(screen.getByRole('button', { name: 'New workspace' }));
    fireEvent.change(screen.getByLabelText('Workspace name'), { target: { value: 'New space' } });
    fireEvent.change(screen.getByLabelText('Workspace description'), {
      target: { value: 'Shared' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create workspace' }));
    expect(await screen.findByRole('article', { name: 'New space' })).toBeInTheDocument();

    fireEvent.click(
      within(screen.getByRole('article', { name: 'Research' })).getByRole('button', {
        name: 'Delete workspace Research',
      }),
    );
    expect(screen.getByRole('dialog', { name: 'Delete workspace Research?' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('article', { name: 'Research' })).toBeInTheDocument();

    fireEvent.click(
      within(screen.getByRole('article', { name: 'Research' })).getByRole('button', {
        name: 'Delete workspace Research',
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Delete permanently' }));
    await waitFor(() =>
      expect(screen.queryByRole('article', { name: 'Research' })).not.toBeInTheDocument(),
    );
    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/v1/workspaces/w1',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('keeps a workspace created while the initial list request is still pending', async () => {
    let resolveList: ((response: Response) => void) | undefined;
    const createdWorkspace = {
      id: 'w3',
      name: 'Created while loading',
      description: null,
      archived_at: null,
      created_at: '',
      updated_at: '',
    };
    const fetchMock = vi.fn((input: string, init?: RequestInit) => {
      if (input === '/api/v1/workspaces' && !resolveList) {
        return new Promise<Response>((resolve) => {
          resolveList = resolve;
        });
      }
      if (input === '/api/v1/workspaces' && init?.method === 'POST') {
        return Promise.resolve(new Response(JSON.stringify(createdWorkspace), { status: 201 }));
      }
      return Promise.resolve(new Response(null, { status: 204 }));
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <MemoryRouter>
        <WorkspaceManagementPage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(resolveList).toBeTypeOf('function'));

    fireEvent.click(screen.getByRole('button', { name: 'New workspace' }));
    fireEvent.change(screen.getByLabelText('Workspace name'), {
      target: { value: createdWorkspace.name },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create workspace' }));
    expect(await screen.findByRole('article', { name: createdWorkspace.name })).toBeInTheDocument();

    await act(async () => {
      resolveList?.(new Response('[]', { status: 200 }));
    });
    expect(screen.getByRole('article', { name: createdWorkspace.name })).toBeInTheDocument();
  });
});
