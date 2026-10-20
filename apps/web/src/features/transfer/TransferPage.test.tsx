import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TransferPage } from './TransferPage';

const document = { schema_version: 'forge-project-import-v1', project: { name: 'Exported planning project' }, features: [], tasks: [], acceptance_criteria: [], dependencies: [] };
const preview = { schema_version: 'forge-project-import-v1', fingerprint: 'transfer-fp', project: { name: 'Exported planning project' }, counts: { features: 0, tasks: 0, acceptance_criteria: 0, dependencies: 0 } };

describe('TransferPage', () => {
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it('previews an exported document and commits only the reviewed fingerprint', async () => {
    const fetchMock = vi.fn().mockImplementation((input: string) => {
      const path = String(input);
      if (path.endsWith('/export')) return Promise.resolve(new Response(JSON.stringify(document), { status: 200 }));
      if (path.endsWith('/projects/import/preview')) return Promise.resolve(new Response(JSON.stringify(preview), { status: 200 }));
      if (path.endsWith('/projects/import')) return Promise.resolve(new Response(JSON.stringify({ project_id: 'imported-1', fingerprint: 'transfer-fp' }), { status: 201 }));
      return Promise.resolve(new Response('{}', { status: 200 }));
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<MemoryRouter initialEntries={['/transfer/w1/p1']}><Routes><Route path="/transfer/:workspaceId/:projectId" element={<TransferPage />} /></Routes></MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: 'Export project' }));
    expect(await screen.findByText('forge-project-import-v1')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Preview import' }));
    expect(await screen.findByText('Fingerprint: transfer-fp')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Commit reviewed import' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Commit reviewed import' }));
    expect(await screen.findByText('IMPORTED_PLANNING_ONLY')).toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/v1/workspaces/w1/projects/import', expect.objectContaining({ method: 'POST', body: JSON.stringify({ document, expected_fingerprint: 'transfer-fp' }) })));
  });

  it('renders the API validation error when preview rejects the document', async () => {
    const fetchMock = vi.fn().mockImplementation((input: string) => {
      if (String(input).endsWith('/export')) return Promise.resolve(new Response(JSON.stringify(document), { status: 200 }));
      return Promise.resolve(new Response(JSON.stringify({ detail: 'Dependency graph contains a cycle' }), { status: 422 }));
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<MemoryRouter initialEntries={['/transfer/w1/p1']}><Routes><Route path="/transfer/:workspaceId/:projectId" element={<TransferPage />} /></Routes></MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: 'Export project' }));
    await screen.findByText('forge-project-import-v1');
    fireEvent.click(screen.getByRole('button', { name: 'Preview import' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Dependency graph contains a cycle');
    expect(screen.getByRole('button', { name: 'Commit reviewed import' })).toBeDisabled();
  });
});
