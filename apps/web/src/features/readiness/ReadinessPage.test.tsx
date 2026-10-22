import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ReadinessPage } from './ReadinessPage';

const readiness = {
  feature_id: 'f1',
  evaluated_at: '',
  rule_set_version: 'R01-R06',
  input_fingerprint: 'fp',
  outcome: 'NOT_READY',
  passed_checks: [],
  failed_checks: [],
  blockers: [],
  results: [],
};
const decision = {
  id: 'd1',
  project_id: 'p1',
  title: 'Use SQLite',
  context: 'Local first',
  decision: 'Use SQLite',
  rationale: 'Simple',
  status: 'PROPOSED',
  revision: 1,
  superseded_by_id: null,
  created_at: '',
  updated_at: '',
};
const invariant = {
  id: 'i1',
  project_id: 'p1',
  feature_id: 'f1',
  title: 'No fabrication',
  statement: 'Do not fabricate records',
  rationale: 'Truthful UI',
  status: 'ACTIVE',
  revision: 2,
  acknowledged_revision: null,
  created_at: '',
  updated_at: '',
};

describe('ReadinessPage', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('shows revision-aware decisions and feature-scoped invariant acknowledgement', async () => {
    let acknowledged = false;
    const fetchMock = vi.fn().mockImplementation((input: string, init?: RequestInit) => {
      if (String(input).endsWith('/readiness/preview'))
        return Promise.resolve(new Response(JSON.stringify(readiness), { status: 200 }));
      if (String(input).endsWith('/decisions'))
        return Promise.resolve(new Response(JSON.stringify([decision]), { status: 200 }));
      if (String(input).includes('/invariants?feature_id=f1'))
        return Promise.resolve(
          new Response(
            JSON.stringify([{ ...invariant, acknowledged_revision: acknowledged ? 2 : null }]),
            { status: 200 },
          ),
        );
      if (String(input).endsWith('/decisions/d1/revisions'))
        return Promise.resolve(
          new Response(JSON.stringify([{ ...decision, decision_id: 'd1' }]), { status: 200 }),
        );
      if (String(input).includes('/acknowledge')) acknowledged = true;
      return Promise.resolve(
        new Response(JSON.stringify({}), { status: init?.method === 'POST' ? 200 : 200 }),
      );
    });
    vi.stubGlobal('fetch', fetchMock);
    render(
      <MemoryRouter initialEntries={['/readiness/w1/p1/f1']}>
        <Routes>
          <Route path="/readiness/:workspaceId/:projectId/:featureId" element={<ReadinessPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect((await screen.findAllByText('Use SQLite')).length).toBeGreaterThan(0);
    expect(screen.getByText('PREVIEW')).toBeInTheDocument();
    expect(screen.getByText(/revision 1/i)).toBeInTheDocument();
    expect(screen.getByText('No fabrication')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show decision revisions for Use SQLite' }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v1/workspaces/w1/projects/p1/decisions/d1/revisions',
        expect.objectContaining({ credentials: 'same-origin', signal: undefined }),
      ),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Acknowledge invariant No fabrication' }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v1/workspaces/w1/projects/p1/features/f1/invariants/i1/acknowledge',
        expect.objectContaining({ method: 'POST', body: JSON.stringify({ expected_revision: 2 }) }),
      ),
    );
  });

  it('does not let the initial refresh overwrite a newly created invariant', async () => {
    let resolveInitialInvariants: ((response: Response) => void) | undefined;
    const initialInvariants = new Promise<Response>((resolve) => {
      resolveInitialInvariants = resolve;
    });
    const createdInvariant = { ...invariant, id: 'i2', title: 'Fresh invariant' };
    const fetchMock = vi.fn().mockImplementation((input: string, init?: RequestInit) => {
      const path = String(input);
      if (path.endsWith('/readiness/preview')) {
        return Promise.resolve(new Response(JSON.stringify(readiness), { status: 200 }));
      }
      if (path.endsWith('/decisions')) {
        return Promise.resolve(new Response('[]', { status: 200 }));
      }
      if (path.includes('/invariants?feature_id=f1')) {
        if (init?.method === 'POST') {
          return Promise.resolve(new Response(JSON.stringify(createdInvariant), { status: 201 }));
        }
        if (
          fetchMock.mock.calls.filter(([request]) => String(request).includes('/invariants?'))
            .length === 1
        ) {
          return initialInvariants;
        }
        return Promise.resolve(new Response(JSON.stringify([createdInvariant]), { status: 200 }));
      }
      return Promise.resolve(new Response('{}', { status: 200 }));
    });
    vi.stubGlobal('fetch', fetchMock);
    render(
      <MemoryRouter initialEntries={['/readiness/w1/p1/f1']}>
        <Routes>
          <Route path="/readiness/:workspaceId/:projectId/:featureId" element={<ReadinessPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    fireEvent.change(screen.getByLabelText('Invariant title'), {
      target: { value: 'Fresh invariant' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add invariant' }));
    expect(await screen.findByText('Fresh invariant')).toBeInTheDocument();

    resolveInitialInvariants?.(new Response('[]', { status: 200 }));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(screen.getByText('Fresh invariant')).toBeInTheDocument();
  });

  it('recovers a failed readiness request when the user retries evaluation', async () => {
    let failed = false;
    const fetchMock = vi.fn().mockImplementation((input: string) => {
      if (String(input).endsWith('/readiness/preview') && !failed) {
        failed = true;
        return Promise.resolve(
          new Response(JSON.stringify({ detail: 'Temporary outage' }), { status: 503 }),
        );
      }
      if (String(input).endsWith('/readiness/preview'))
        return Promise.resolve(new Response(JSON.stringify(readiness), { status: 200 }));
      return Promise.resolve(new Response('[]', { status: 200 }));
    });
    vi.stubGlobal('fetch', fetchMock);
    render(
      <MemoryRouter initialEntries={['/readiness/w1/p1/f1']}>
        <Routes>
          <Route path="/readiness/:workspaceId/:projectId/:featureId" element={<ReadinessPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('Temporary outage');
    fireEvent.click(screen.getByRole('button', { name: 'Retry readiness evaluation' }));
    expect(await screen.findByText('Outcome: NOT_READY')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
