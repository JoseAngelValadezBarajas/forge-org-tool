import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TransferPage } from './TransferPage';

const document = {
  schema_version: 'forge-project-transfer-v2',
  project: { name: 'Exported planning project' },
  features: [],
  tasks: [],
  acceptance_criteria: [],
  dependencies: [],
};
const preview = {
  schema_version: 'forge-project-transfer-v2',
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
      if (path.includes('/export?'))
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

    fireEvent.click(screen.getByRole('button', { name: /Download project export/ }));
    expect(await screen.findByText('forge-project-transfer-v2')).toBeInTheDocument();
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

  it('previews and imports a ZIP project package using its reviewed fingerprint', async () => {
    const bytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);
    const file = new File([bytes], 'project-with-bugs.zip', { type: 'application/zip' });
    Object.defineProperty(file, 'arrayBuffer', {
      value: async () => bytes.buffer,
    });
    const fetchMock = vi.fn().mockImplementation((input: string) => {
      if (String(input).endsWith('/projects/import/package/preview'))
        return Promise.resolve(new Response(JSON.stringify(preview), { status: 200 }));
      if (String(input).endsWith('/projects/import/package'))
        return Promise.resolve(
          new Response(JSON.stringify({ project_id: 'package-imported' }), { status: 201 }),
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

    fireEvent.change(screen.getByLabelText('Choose a project transfer file'), {
      target: { files: [file] },
    });
    expect(await screen.findByText('Selected source: project-with-bugs.zip')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Review import' }));
    await waitFor(() =>
      expect(fetchMock.mock.calls.map(([path]) => String(path))).toContain(
        '/api/v1/workspaces/w1/projects/import/package/preview',
      ),
    );
    expect(await screen.findByText('transfer-fp')).toBeInTheDocument();
    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([path]) =>
        String(path).endsWith('/projects/import/package/preview'),
      );
      expect(JSON.parse(String(call?.[1]?.body))).toEqual({ archive_base64: 'UEsDBA==' });
    });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm planning import' }));
    expect(await screen.findByText('Created project: package-imported')).toBeInTheDocument();
    const commit = fetchMock.mock.calls.find(([path]) =>
      String(path).endsWith('/projects/import/package'),
    );
    expect(JSON.parse(String(commit?.[1]?.body))).toEqual({
      archive_base64: 'UEsDBA==',
      expected_fingerprint: 'transfer-fp',
    });
  });

  it('renders the API validation error when preview rejects the document', async () => {
    const fetchMock = vi.fn().mockImplementation((input: string) => {
      if (String(input).includes('/export?'))
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

    fireEvent.click(screen.getByRole('button', { name: /Download project export/ }));
    await screen.findByText('forge-project-transfer-v2');
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
    fireEvent.change(screen.getByLabelText('Choose a project transfer file'), {
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

    fireEvent.click(screen.getByRole('button', { name: /Download project export/ }));
    await waitFor(() => expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob)));
    expect(click).toHaveBeenCalled();
    expect(downloadedFileName).toBe('project-export.json');
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:forge-export');
  });

  it('downloads an attachment-inclusive project package as a ZIP file', async () => {
    const createObjectURL = vi.fn(() => 'blob:forge-package');
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
    let downloadedFileName = '';
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      downloadedFileName = this.download;
    });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(new Blob(['synthetic zip bytes'], { type: 'application/zip' }), {
          status: 200,
        }),
      ),
    );
    render(
      <MemoryRouter initialEntries={['/transfer/w1/p1']}>
        <Routes>
          <Route path="/transfer/:workspaceId/:projectId" element={<TransferPage />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Download ZIP package with screenshots' }));
    await waitFor(() => expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob)));
    expect(click).toHaveBeenCalled();
    expect(downloadedFileName).toBe('forge-project-transfer-v2.zip');
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

  it('presents an Epic transfer as a destination-aware dialog and returns focus/navigation to its project', async () => {
    const contextualPreview = {
      ...preview,
      destination: { scope: 'epics', id: 'p1' },
    };
    const fetchMock = vi.fn().mockImplementation((input: string) => {
      if (String(input).endsWith('/transfer/epics/p1/export'))
        return Promise.resolve(new Response(JSON.stringify(document), { status: 200 }));
      if (String(input).endsWith('/transfer/epics/p1/preview'))
        return Promise.resolve(new Response(JSON.stringify(contextualPreview), { status: 200 }));
      if (String(input).endsWith('/transfer/epics/p1'))
        return Promise.resolve(
          new Response(JSON.stringify({ project_id: 'p1', fingerprint: 'transfer-fp' }), {
            status: 201,
          }),
        );
      return Promise.resolve(new Response('{}', { status: 200 }));
    });
    vi.stubGlobal('fetch', fetchMock);
    render(
      <MemoryRouter initialEntries={['/projects/w1/p1', '/transfer/w1/p1/epics/p1']}>
        <Routes>
          <Route path="/projects/:workspaceId/:projectId" element={<p>Project overview</p>} />
          <Route path="/planning/:workspaceId/:projectId" element={<p>Project board</p>} />
          <Route
            path="/transfer/:workspaceId/:projectId/:scope/:destinationId"
            element={<TransferPage />}
          />
        </Routes>
      </MemoryRouter>,
    );

    const dialog = screen.getByRole('dialog', { name: /Import and export epics/i });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveTextContent('Destination: epics (p1)');
    const closeButton = screen.getByRole('button', { name: /close transfer/i });
    expect(closeButton).toHaveFocus();
    expect(screen.getByLabelText('Choose a project transfer file')).toHaveAttribute(
      'accept',
      'application/json,.json',
    );
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    expect(screen.getByText('Advanced JSON paste')).toHaveFocus();
    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(closeButton).toHaveFocus();

    const file = new File([JSON.stringify(document)], 'epics.json', {
      type: 'application/json',
    });
    Object.defineProperty(file, 'text', { value: async () => JSON.stringify(document) });
    fireEvent.change(screen.getByLabelText('Choose a project transfer file'), {
      target: { files: [file] },
    });
    await waitFor(() =>
      expect(screen.getByText('Selected source: epics.json')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Review import' }));
    expect(await screen.findByText('transfer-fp')).toBeInTheDocument();
    expect(screen.getByText('features: 0')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm planning import' }));

    const returnLink = await screen.findByRole('link', { name: 'Return to project board' });
    expect(returnLink).toHaveAttribute('href', '/planning/w1/p1');
    fireEvent.click(returnLink);
    expect(await screen.findByText('Project board')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/workspaces/w1/projects/p1/transfer/epics/p1',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('closes a contextual transfer dialog with Escape and navigates to the owning Epic', async () => {
    render(
      <MemoryRouter initialEntries={['/planning/w1/p1', '/transfer/w1/p1/work-items/e1']}>
        <Routes>
          <Route path="/planning/:workspaceId/:projectId" element={<p>Project board</p>} />
          <Route
            path="/planning/:workspaceId/:projectId/epics/:epicId"
            element={<p>Epic board</p>}
          />
          <Route
            path="/transfer/:workspaceId/:projectId/:scope/:destinationId"
            element={<TransferPage />}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('dialog', { name: /Import and export work-items/i })).toBeVisible();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(await screen.findByText('Epic board')).toBeInTheDocument();
  });
});
