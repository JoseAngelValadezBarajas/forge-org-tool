import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

    // The finished import offers a way forward: open it, or start another one.
    expect(screen.getByRole('link', { name: 'Open project' })).toHaveAttribute(
      'href',
      '/projects/w1/imported-1',
    );
    const created = within(screen.getByRole('list', { name: 'Records created' }));
    expect(created.getAllByRole('listitem').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Import another' }));
    expect(screen.queryByText('IMPORTED_PLANNING_ONLY')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Review import' })).toBeDisabled();
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

  it('presents an Epic transfer as a destination-aware page and returns navigation to its project', async () => {
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
            element={<TransferPage projectName="FormiAI" workspaceName="Personal" />}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Import an Epic' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Import source' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Preview · FormiAI' })).toHaveTextContent(
      'Choose a source to see a validated preview.',
    );
    expect(screen.getByRole('heading', { name: 'Import into FormiAI' })).toBeInTheDocument();
    expect(screen.getByText('Destination')).toBeInTheDocument();
    expect(screen.getByText('Personal / FormiAI')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to Project' })).toHaveAttribute(
      'href',
      '/planning/w1/p1',
    );
    expect(screen.getByLabelText('Choose a project transfer file')).toHaveAttribute(
      'accept',
      'application/json,.json',
    );

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
    expect(screen.getByRole('region', { name: 'Preview · FormiAI' })).toHaveTextContent(
      'Import safeguards',
    );
    const featureCount = screen.getByText('features').nextElementSibling;
    expect(featureCount).toHaveTextContent('0');
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Import' }));

    const returnLink = await screen.findByRole('link', { name: 'Return to project board' });
    expect(returnLink).toHaveAttribute('href', '/planning/w1/p1');
    fireEvent.click(returnLink);
    expect(await screen.findByText('Project board')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/workspaces/w1/projects/p1/transfer/epics/p1',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('keeps the contextual preview compact while exposing fingerprint safeguards on demand', async () => {
    const contextualPreview = { ...preview, destination: { scope: 'epics', id: 'p1' } };
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string) => {
        if (String(input).endsWith('/transfer/epics/p1/preview'))
          return Promise.resolve(new Response(JSON.stringify(contextualPreview), { status: 200 }));
        return Promise.resolve(new Response('{}', { status: 200 }));
      }),
    );
    render(
      <MemoryRouter initialEntries={['/transfer/w1/p1/epics/p1']}>
        <Routes>
          <Route
            path="/transfer/:workspaceId/:projectId/:scope/:destinationId"
            element={<TransferPage projectName="FormiAI" workspaceName="Personal" />}
          />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByText('Advanced JSON paste'));
    fireEvent.change(screen.getByRole('textbox', { name: 'Advanced JSON document' }), {
      target: { value: JSON.stringify(document) },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Review import' }));

    const previewRegion = await screen.findByRole('region', { name: 'Preview · FormiAI' });
    expect(within(previewRegion).getByRole('heading', { name: 'Preview · FormiAI' })).toBeVisible();
    expect(within(previewRegion).getByRole('button', { name: 'Confirm Import' })).toBeEnabled();
    expect(screen.getByText('Drop a .json file here')).toBeVisible();
    expect(screen.queryByText('Advanced JSON paste')).not.toBeInTheDocument();
    expect(screen.queryByText('Export existing epics')).not.toBeInTheDocument();
    expect(screen.getByText('FINGERPRINT_REQUIRED')).not.toBeVisible();
    expect(screen.getByText('Import safeguards')).toBeVisible();
    fireEvent.click(screen.getByText('Import safeguards'));
    expect(screen.getByText('FINGERPRINT_REQUIRED')).toBeVisible();
    expect(screen.getByText('transfer-fp')).toBeVisible();
  });

  it('keeps a contextual transfer page in place on Escape and links back to the owning Epic', async () => {
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

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('heading', { name: 'Import work items' }), {
      key: 'Escape',
    });
    expect(screen.queryByText('Epic board')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: 'Back to Epic' }));
    expect(await screen.findByText('Epic board')).toBeInTheDocument();
  });

  describe('files from other tools', () => {
    function pickFile(name: string, content: string, type: string) {
      const file = new File([content], name, { type });
      Object.defineProperty(file, 'text', { value: async () => content });
      fireEvent.change(screen.getByLabelText('Choose a project transfer file'), {
        target: { files: [file] },
      });
    }

    function renderTransfer(path = '/transfer/w1/p1') {
      return render(
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/transfer/:workspaceId/:projectId" element={<TransferPage />} />
            <Route
              path="/transfer/:workspaceId/:projectId/:scope/:destinationId"
              element={<TransferPage />}
            />
          </Routes>
        </MemoryRouter>,
      );
    }

    it('converts a CSV, summarizes it, and reviews the converted document through the normal flow', async () => {
      const fetchMock = vi
        .fn()
        .mockImplementation((input: string) =>
          Promise.resolve(
            new Response(
              String(input).endsWith('/projects/import/preview') ? JSON.stringify(preview) : '{}',
              { status: 200 },
            ),
          ),
        );
      vi.stubGlobal('fetch', fetchMock);
      renderTransfer();

      pickFile(
        'Sprint plan.csv',
        'Title,Status,Due,Epic\nFix login,In Progress,2026-12-01,Launch\n,,,\nWrite docs,,01/12/2026,Launch',
        'text/csv',
      );

      const summary = await screen.findByRole('status', { name: 'Converted file' });
      expect(summary).toHaveTextContent('Converted from CSV');
      expect(summary).toHaveTextContent('2 items and 1 Epic');
      expect(summary).toHaveTextContent('“Sprint plan”');
      expect(within(summary).getByRole('list', { name: 'Adjustments' })).toHaveTextContent(
        'Date “01/12/2026” was not understood',
      );

      fireEvent.click(screen.getByRole('button', { name: 'Review import' }));
      await screen.findByText('transfer-fp');
      const call = fetchMock.mock.calls.find(([path]) =>
        String(path).endsWith('/projects/import/preview'),
      );
      const sent = JSON.parse(String(call?.[1]?.body));
      expect(sent.schema_version).toBe('forge-project-transfer-v2');
      expect(sent.features.map((feature: { title: string }) => feature.title)).toEqual([
        'Fix login',
        'Write docs',
      ]);
      expect(sent.features[0]).toMatchObject({ status: 'in_progress', due_date: '2026-12-01' });
    });

    it('converts GitHub issues exported with gh and skips pull requests', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(new Response(JSON.stringify(preview), { status: 200 })),
      );
      renderTransfer();
      pickFile(
        'issues.json',
        JSON.stringify([
          {
            number: 1,
            title: 'Crash on start',
            state: 'OPEN',
            labels: [{ name: 'bug' }],
            url: 'https://github.com/acme/app/issues/1',
          },
          { number: 2, title: 'Fix typo', state: 'OPEN', pull_request: {} },
        ]),
        'application/json',
      );

      const summary = await screen.findByRole('status', { name: 'Converted file' });
      expect(summary).toHaveTextContent('Converted from GitHub issues');
      expect(summary).toHaveTextContent('1 item and 0 Epics');
      expect(summary).toHaveTextContent('“acme/app issues”');
      expect(within(summary).getByText('1 skipped')).toBeInTheDocument();
    });

    it('leaves a FORGE transfer document untouched, with no conversion summary', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 200 })));
      renderTransfer();
      pickFile('export.json', JSON.stringify(document), 'application/json');
      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'Review import' })).toBeEnabled(),
      );
      expect(screen.queryByRole('status', { name: 'Converted file' })).not.toBeInTheDocument();
    });

    it('explains an unusable file instead of failing silently', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 200 })));
      renderTransfer();
      pickFile('empty.csv', 'name2,other\nA,B', 'text/csv');
      expect(await screen.findByText(/needs a title column/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Review import' })).toBeDisabled();
    });

    it('clears the summary when another file is chosen or the text is edited', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 200 })));
      renderTransfer();
      pickFile('a.csv', 'title\nOne', 'text/csv');
      await screen.findByRole('status', { name: 'Converted file' });
      pickFile('export.json', JSON.stringify(document), 'application/json');
      await waitFor(() =>
        expect(screen.queryByRole('status', { name: 'Converted file' })).not.toBeInTheDocument(),
      );
    });
  });
});
