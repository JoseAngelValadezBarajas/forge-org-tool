import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TransferPage } from './TransferPage';

const document = {
  schema_version: 'forge-project-import-v1',
  project: { name: 'Exported planning project' },
  features: [],
  tasks: [],
  acceptance_criteria: [],
  dependencies: [],
};
const preview = {
  schema_version: 'forge-project-import-v1',
  fingerprint: 'transfer-fp',
  project: { name: 'Exported planning project' },
  counts: { features: 0, tasks: 0, acceptance_criteria: 0, dependencies: 0 },
};

describe('TransferPage', () => {
  beforeEach(() => {
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('previews an exported document and commits only the reviewed fingerprint', async () => {
    const fetchMock = vi.fn().mockImplementation((input: string) => {
      const path = String(input);
      if (path.endsWith('/export'))
        return Promise.resolve(new Response(JSON.stringify(document), { status: 200 }));
      if (path.endsWith('/projects/import/preview'))
        return Promise.resolve(new Response(JSON.stringify(preview), { status: 200 }));
      if (path.endsWith('/projects/import'))
        return Promise.resolve(
          new Response(JSON.stringify({ project_id: 'imported-1', fingerprint: 'transfer-fp' }), {
            status: 201,
          }),
        );
      return Promise.resolve(new Response('{}', { status: 200 }));
    });
    vi.stubGlobal('fetch', fetchMock);
    render(
      <MemoryRouter initialEntries={['/transfer/w1/p1']}>
        <Routes>
          <Route path="/transfer/:workspaceId/:projectId" element={<TransferPage />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Download project export' }));
    expect(await screen.findByText('forge-project-import-v1')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Review import' }));
    expect(await screen.findByText('transfer-fp')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm planning import' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm planning import' }));
    expect(await screen.findByText('IMPORTED_PLANNING_ONLY')).toBeInTheDocument();
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v1/workspaces/w1/projects/import',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ document, expected_fingerprint: 'transfer-fp' }),
        }),
      ),
    );
  });

  it('renders the API validation error when preview rejects the document', async () => {
    const fetchMock = vi.fn().mockImplementation((input: string) => {
      if (String(input).endsWith('/export'))
        return Promise.resolve(new Response(JSON.stringify(document), { status: 200 }));
      return Promise.resolve(
        new Response(JSON.stringify({ detail: 'Dependency graph contains a cycle' }), {
          status: 422,
        }),
      );
    });
    vi.stubGlobal('fetch', fetchMock);
    render(
      <MemoryRouter initialEntries={['/transfer/w1/p1']}>
        <Routes>
          <Route path="/transfer/:workspaceId/:projectId" element={<TransferPage />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Download project export' }));
    await screen.findByText('forge-project-import-v1');
    fireEvent.click(screen.getByRole('button', { name: 'Review import' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Dependency graph contains a cycle');
    expect(
      screen.queryByRole('button', { name: 'Confirm planning import' }),
    ).not.toBeInTheDocument();
  });

  it('guides a file import through source, review, and confirmation while invalidating edited previews', async () => {
    const importedDocument = JSON.stringify(document);
    const file = new File([importedDocument], 'planning-export.json', {
      type: 'application/json',
    });
    Object.defineProperty(file, 'text', { value: async () => importedDocument });
    const fetchMock = vi.fn().mockImplementation((input: string) => {
      if (String(input).endsWith('/projects/import/preview')) {
        return Promise.resolve(new Response(JSON.stringify(preview), { status: 200 }));
      }
      return Promise.resolve(new Response('{}', { status: 200 }));
    });
    vi.stubGlobal('fetch', fetchMock);
    render(
      <MemoryRouter initialEntries={['/transfer/w1/p1']}>
        <Routes>
          <Route path="/transfer/:workspaceId/:projectId" element={<TransferPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('list', { name: 'Transfer steps' })).toHaveTextContent(
      /01 Select source.*02 Review planning.*03 Confirm/,
    );
    fireEvent.change(screen.getByLabelText('Choose a project JSON file'), {
      target: { files: [file] },
    });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Review import' })).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Review import' }));
    expect(await screen.findByText('transfer-fp')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm planning import' })).toBeEnabled();

    fireEvent.click(screen.getByText('Advanced JSON paste'));
    fireEvent.change(screen.getByRole('textbox', { name: 'Advanced JSON document' }), {
      target: { value: `${importedDocument} ` },
    });
    expect(
      screen.queryByRole('button', { name: 'Confirm planning import' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('transfer-fp')).not.toBeInTheDocument();
  });

  it('downloads the exported versioned project document as a JSON file', async () => {
    const createObjectURL = vi.fn(() => 'blob:forge-export');
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL });
    let downloadedFileName = '';
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      downloadedFileName = this.download;
    });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify(document), { status: 200 })),
    );
    render(
      <MemoryRouter initialEntries={['/transfer/w1/p1']}>
        <Routes>
          <Route path="/transfer/:workspaceId/:projectId" element={<TransferPage />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Download project export' }));
    await waitFor(() => expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob)));
    expect(click).toHaveBeenCalled();
    expect(downloadedFileName).toBe('project-export.json');
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:forge-export');
  });

  it('shows a stale fingerprint conflict and requires a fresh review before another commit', async () => {
    const fetchMock = vi.fn().mockImplementation((input: string) => {
      if (String(input).endsWith('/projects/import/preview')) {
        return Promise.resolve(new Response(JSON.stringify(preview), { status: 200 }));
      }
      if (String(input).endsWith('/projects/import')) {
        return Promise.resolve(
          new Response(JSON.stringify({ detail: 'Reviewed import fingerprint is stale' }), {
            status: 409,
          }),
        );
      }
      return Promise.resolve(new Response('{}', { status: 200 }));
    });
    vi.stubGlobal('fetch', fetchMock);
    render(
      <MemoryRouter initialEntries={['/transfer/w1/p1']}>
        <Routes>
          <Route path="/transfer/:workspaceId/:projectId" element={<TransferPage />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByText('Advanced JSON paste'));
    fireEvent.change(screen.getByRole('textbox', { name: 'Advanced JSON document' }), {
      target: { value: JSON.stringify(document) },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Review import' }));
    expect(await screen.findByText('transfer-fp')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm planning import' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Reviewed import fingerprint is stale',
    );
    expect(screen.queryByText('transfer-fp')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Confirm planning import' }),
    ).not.toBeInTheDocument();
  });
});
