import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HandoffDetailPage } from './HandoffDetailPage';

const handoff = {
  id: 'h1',
  project_id: 'p1',
  feature_id: 'f1',
  run_id: 'run1',
  title: 'Release notes',
  summary: 'Observed behavior only',
  next_actions: 'Review manually',
  status: 'READY',
  current_revision: 2,
  version: 4,
  created_at: '2026-10-20T10:00:00Z',
  updated_at: '2026-10-21T10:00:00Z',
};
const revision = {
  id: 'rev2',
  handoff_id: 'h1',
  revision: 2,
  title: 'Release notes',
  summary: 'Observed behavior only',
  next_actions: 'Review manually',
  schema_version: 'forge-handoff-v1',
  fingerprint: 'sha256:immutable-fingerprint',
  payload_json: '{"status":"reported"}',
  markdown: '# Release notes\n\nObserved behavior only',
  created_at: '2026-10-21T10:00:00Z',
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/workbench/w1/p1/handoffs/h1']}>
      <Routes>
        <Route
          path="/workbench/:workspaceId/:projectId/handoffs/:handoffId"
          element={<HandoffDetailPage />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('HandoffDetailPage', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('shows the exact immutable revision snapshot, provenance, downloads, and revision-bound acknowledgement', async () => {
    let acknowledged = false;
    const fetchMock = vi.fn().mockImplementation((input: string, init?: RequestInit) => {
      const path = String(input);
      if (path.endsWith('/projects/p1/handoffs'))
        return Promise.resolve(
          new Response(
            JSON.stringify([acknowledged ? { ...handoff, status: 'ACKNOWLEDGED' } : handoff]),
            { status: 200 },
          ),
        );
      if (path.endsWith('/handoffs/h1/revisions'))
        return Promise.resolve(new Response(JSON.stringify([revision]), { status: 200 }));
      if (path.endsWith('/handoffs/h1/acknowledge')) {
        expect(JSON.parse(String(init?.body))).toEqual({
          expected_revision: 2,
          acknowledged_by: 'Ana',
        });
        acknowledged = true;
        return Promise.resolve(
          new Response(
            JSON.stringify({
              id: 'ack1',
              handoff_id: 'h1',
              revision: 2,
              acknowledged_by: 'Ana',
              acknowledged_at: '2026-10-22T10:00:00Z',
            }),
            { status: 200 },
          ),
        );
      }
      if (path.endsWith('/handoffs/h1'))
        return Promise.resolve(
          new Response(
            JSON.stringify(acknowledged ? { ...handoff, status: 'ACKNOWLEDGED' } : handoff),
            { status: 200 },
          ),
        );
      return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }));
    });
    vi.stubGlobal('fetch', fetchMock);
    renderPage();

    expect(await screen.findByText('sha256:immutable-fingerprint')).toBeInTheDocument();
    expect(screen.getByText('Observed behavior only')).toBeInTheDocument();
    expect(screen.getByText('Review manually')).toBeInTheDocument();
    expect(screen.getByText('{"status":"reported"}')).toBeInTheDocument();
    expect(screen.getByText(/does not indicate technical approval/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Download JSON snapshot' })).toHaveAttribute(
      'href',
      '/api/v1/workspaces/w1/projects/p1/handoffs/h1/revisions/2/download?format=json',
    );
    expect(screen.getByRole('link', { name: 'Download Markdown snapshot' })).toHaveAttribute(
      'href',
      '/api/v1/workspaces/w1/projects/p1/handoffs/h1/revisions/2/download?format=markdown',
    );
    expect(screen.getByRole('link', { name: 'Back to workbench handoffs' })).toHaveAttribute(
      'href',
      '/workbench/w1/p1',
    );
    fireEvent.change(screen.getByRole('textbox', { name: 'Acknowledged by' }), {
      target: { value: 'Ana' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Acknowledge revision 2' }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v1/workspaces/w1/projects/p1/handoffs/h1/acknowledge',
        expect.objectContaining({ method: 'POST' }),
      ),
    );
    expect(await screen.findByText(/Acknowledged by Ana for revision 2/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Acknowledge revision/ })).not.toBeInTheDocument();
    expect(screen.getByText(/does not indicate technical approval/i)).toBeInTheDocument();
  });

  it('renders a retry state when the immutable revision cannot be loaded', async () => {
    let failed = false;
    const fetchMock = vi.fn().mockImplementation((input: string) => {
      if (String(input).endsWith('/projects/p1/handoffs'))
        return Promise.resolve(new Response(JSON.stringify([handoff]), { status: 200 }));
      if (String(input).endsWith('/handoffs/h1/revisions') && !failed) {
        failed = true;
        return Promise.resolve(
          new Response(JSON.stringify({ detail: 'Revision unavailable' }), { status: 503 }),
        );
      }
      if (String(input).endsWith('/handoffs/h1/revisions'))
        return Promise.resolve(new Response(JSON.stringify([revision]), { status: 200 }));
      if (String(input).endsWith('/handoffs/h1'))
        return Promise.resolve(new Response(JSON.stringify(handoff), { status: 200 }));
      return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }));
    });
    vi.stubGlobal('fetch', fetchMock);
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('Revision unavailable');
    fireEvent.click(screen.getByRole('button', { name: 'Retry loading handoff' }));
    expect(await screen.findByText('sha256:immutable-fingerprint')).toBeInTheDocument();
  });
});
