import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { OrganizationPage } from './OrganizationPage';

describe('OrganizationPage', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('shows an actionable empty state and creates a workspace', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('[]', { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'w1',
            name: 'Research',
            status: 'active',
            created_at: '',
            updated_at: '',
          }),
          { status: 201 },
        ),
      );
    vi.stubGlobal('fetch', fetchMock);
    render(
      <MemoryRouter>
        <OrganizationPage />
      </MemoryRouter>,
    );

    await screen.findByText('No workspaces yet');
    fireEvent.change(screen.getByLabelText('Workspace name'), { target: { value: 'Research' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Workspace' }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v1/workspaces',
        expect.objectContaining({ method: 'POST' }),
      ),
    );
  });

  it('renders projects for the selected workspace', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify([
              { id: 'w1', name: 'Research', status: 'active', created_at: '', updated_at: '' },
            ]),
            { status: 200 },
          ),
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify([
              {
                id: 'p1',
                workspace_id: 'w1',
                name: 'Atlas',
                description: 'Map work',
                status: 'active',
                created_at: '',
                updated_at: '',
                archived_at: null,
              },
            ]),
            { status: 200 },
          ),
        ),
    );
    render(
      <MemoryRouter>
        <OrganizationPage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Atlas' })).toBeInTheDocument();
    expect(screen.getByText('Map work')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Projects' })).toBeInTheDocument();
    expect(screen.getByText('1 total')).toBeInTheDocument();
  });

  it('does not show a prior workspace project after a selection race', async () => {
    const pending = new Map<string, Array<(response: Response) => void>>();
    const fetchMock = vi.fn().mockImplementation((input: string) => {
      const path = String(input);
      if (path === '/api/v1/workspaces') {
        return Promise.resolve(
          new Response(
            JSON.stringify([
              { id: 'w1', name: 'One', status: 'active', created_at: '', updated_at: '' },
              { id: 'w2', name: 'Two', status: 'active', created_at: '', updated_at: '' },
            ]),
            { status: 200 },
          ),
        );
      }
      const workspaceId = path.match(/workspaces\/(w\d+)\/projects/)?.[1] ?? '';
      return new Promise<Response>((resolve) => {
        pending.set(workspaceId, [...(pending.get(workspaceId) ?? []), resolve]);
      });
    });
    vi.stubGlobal('fetch', fetchMock);
    render(
      <MemoryRouter>
        <OrganizationPage />
      </MemoryRouter>,
    );

    await screen.findByRole('option', { name: 'One' });
    await waitFor(() => expect(pending.get('w1')).toHaveLength(1));
    fireEvent.change(screen.getByLabelText('Workspace'), { target: { value: 'w2' } });
    await waitFor(() => expect(pending.get('w2')).toHaveLength(1));
    pending.get('w2')?.[0]?.(
      new Response(
        JSON.stringify([
          {
            id: 'p2',
            workspace_id: 'w2',
            name: 'Two project',
            description: null,
            status: 'active',
            created_at: '',
            updated_at: '',
            archived_at: null,
          },
        ]),
        { status: 200 },
      ),
    );
    expect(await screen.findByRole('heading', { name: 'Two project' })).toBeInTheDocument();
    pending.get('w1')?.[0]?.(
      new Response(
        JSON.stringify([
          {
            id: 'p1',
            workspace_id: 'w1',
            name: 'Stale project',
            description: null,
            status: 'active',
            created_at: '',
            updated_at: '',
            archived_at: null,
          },
        ]),
        { status: 200 },
      ),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.queryByRole('heading', { name: 'Stale project' })).not.toBeInTheDocument();
  });
});
