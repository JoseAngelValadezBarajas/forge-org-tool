import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WorkspaceTagsPanel } from './WorkspaceTagsPanel';

describe('WorkspaceTagsPanel', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('creates, renames, recolors, and deletes normalized workspace tags', async () => {
    const tag = {
      id: 'tag-1',
      workspace_id: 'w1',
      name: 'Desktop',
      color: '#336699',
      created_at: '',
    };
    let current = tag;
    const fetchMock = vi.fn().mockImplementation((input: string, init?: RequestInit) => {
      const path = String(input);
      if (path.endsWith('/tags') && !init?.method)
        return Promise.resolve(new Response(JSON.stringify([current]), { status: 200 }));
      if (path.endsWith('/tags') && init?.method === 'POST') {
        current = { ...tag, id: 'tag-2', name: 'Mobile', color: '#6b7280' };
        return Promise.resolve(new Response(JSON.stringify(current), { status: 201 }));
      }
      if (path.endsWith('/tag-1') && init?.method === 'PATCH') {
        current = { ...current, name: 'Screenshots', color: '#884422' };
        return Promise.resolve(new Response(JSON.stringify(current), { status: 200 }));
      }
      if (path.endsWith('/tag-1') && init?.method === 'DELETE')
        return Promise.resolve(new Response(null, { status: 204 }));
      return Promise.resolve(new Response('{}', { status: 404 }));
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<WorkspaceTagsPanel workspaceId="w1" />);
    expect(screen.getByRole('complementary', { name: 'Tag guidance' })).toBeInTheDocument();

    const input = await screen.findByRole('textbox', { name: 'Name for tag Desktop' });
    fireEvent.change(input, { target: { value: 'Screenshots' } });
    fireEvent.change(screen.getByLabelText('Color for tag Desktop'), {
      target: { value: '#884422' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save tag Desktop' }));
    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: 'Name for tag Screenshots' })).toHaveValue(
        'Screenshots',
      ),
    );

    fireEvent.change(screen.getByRole('textbox', { name: 'New tag name' }), {
      target: { value: 'Mobile' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create workspace tag' }));
    expect(await screen.findByRole('textbox', { name: 'Name for tag Mobile' })).toHaveValue(
      'Mobile',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Delete tag Screenshots' }));
    await waitFor(() =>
      expect(
        screen.queryByRole('textbox', { name: 'Name for tag Screenshots' }),
      ).not.toBeInTheDocument(),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/workspaces/w1/tags/tag-1',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});
