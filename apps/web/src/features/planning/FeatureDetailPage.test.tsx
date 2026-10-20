import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FeatureDetailPage } from './FeatureDetailPage';

describe('FeatureDetailPage', () => {
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it('reorders tasks through the planning API and keeps the action manual', async () => {
    const tasks = [
      { id: 't1', feature_id: 'f1', title: 'First', description: null, status: 'todo', position: 0, created_at: '', updated_at: '' },
      { id: 't2', feature_id: 'f1', title: 'Second', description: null, status: 'todo', position: 1, created_at: '', updated_at: '' },
    ];
    const fetchMock = vi.fn().mockImplementation((input: string) => {
      if (String(input).endsWith('/tasks/reorder')) return Promise.resolve(new Response(JSON.stringify([tasks[1], tasks[0]]), { status: 200 }));
      if (String(input).endsWith('/tasks')) return Promise.resolve(new Response(JSON.stringify(tasks), { status: 200 }));
      if (String(input).endsWith('/acceptance-criteria')) return Promise.resolve(new Response('[]', { status: 200 }));
      if (String(input).endsWith('/dependencies')) return Promise.resolve(new Response('[]', { status: 200 }));
      return Promise.resolve(new Response('{}', { status: 200 }));
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<MemoryRouter initialEntries={['/planning/w1/p1/features/f1']}><Routes><Route path="/planning/:workspaceId/:projectId/features/:featureId" element={<FeatureDetailPage />} /></Routes></MemoryRouter>);

    await screen.findByText('First');
    fireEvent.click(screen.getByRole('button', { name: 'Move First down' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/v1/workspaces/w1/projects/p1/features/f1/tasks/reorder', expect.objectContaining({ method: 'POST', body: JSON.stringify({ ids: ['t2', 't1'] }) })));
    expect(screen.getByText(/planning records only/i)).toBeInTheDocument();
  });
});
