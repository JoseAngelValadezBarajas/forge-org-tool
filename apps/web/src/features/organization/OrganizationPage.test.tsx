import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { OrganizationPage } from './OrganizationPage';

describe('OrganizationPage', () => {
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it('shows an actionable empty state and creates a workspace', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('[]', { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'w1', name: 'Research', status: 'active', created_at: '', updated_at: '' }), { status: 201 }));
    vi.stubGlobal('fetch', fetchMock);
    render(<MemoryRouter><OrganizationPage /></MemoryRouter>);

    await screen.findByText('No workspaces yet');
    fireEvent.change(screen.getByLabelText('Workspace name'), { target: { value: 'Research' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Workspace' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/v1/workspaces', expect.objectContaining({ method: 'POST' })));
  });

  it('renders projects for the selected workspace', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify([{ id: 'w1', name: 'Research', status: 'active', created_at: '', updated_at: '' }]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([{ id: 'p1', workspace_id: 'w1', name: 'Atlas', description: 'Map work', status: 'active', created_at: '', updated_at: '', archived_at: null }]), { status: 200 })));
    render(<MemoryRouter><OrganizationPage /></MemoryRouter>);

    expect(await screen.findByRole('heading', { name: 'Atlas' })).toBeInTheDocument();
    expect(screen.getByText('Map work')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Projects' })).toBeInTheDocument();
    expect(screen.getByText('1 total')).toBeInTheDocument();
  });
});
