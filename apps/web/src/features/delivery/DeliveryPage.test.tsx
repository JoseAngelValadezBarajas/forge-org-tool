import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DeliveryPage } from './DeliveryPage';

const evidence = {
  id: 'e1',
  project_id: 'p1',
  feature_id: null,
  title: 'Human report',
  summary: 'Reported manually',
  provenance: 'REPORTED',
  reference_kind: 'artifact',
  reference_value: 'report-1',
  status: 'ACTIVE',
  created_at: '',
  updated_at: '',
};
const candidate = {
  id: 'c1',
  project_id: 'p1',
  title: 'Alpha candidate',
  summary: 'Candidate summary',
  status: 'DRAFT',
  revision: 1,
  fingerprint: null,
  created_at: '',
  updated_at: '',
};
const rule = {
  id: 'verified-evidence-present',
  label: 'Verified evidence is present',
  description: 'Active VERIFIED evidence exists.',
};

describe('DeliveryPage', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('filters and invalidates evidence, freezes a candidate, and retains blocked gate history', async () => {
    let currentEvidence = { ...evidence };
    let currentCandidate = { ...candidate, fingerprint: candidate.fingerprint as string | null };
    let gate = {
      id: 'g1',
      candidate_id: 'c1',
      candidate_revision: 1,
      outcome: 'BLOCKED',
      input_fingerprint: 'gate-fp',
      blockers: ['A frozen candidate and active VERIFIED evidence are required'],
    };
    const verification = {
      id: 'v1',
      project_id: 'p1',
      candidate_id: 'c1',
      rule_id: rule.id,
      outcome: 'BLOCKED',
      input_fingerprint: 'verification-fp',
      stale: false,
      blockers: ['No active VERIFIED evidence is available for this rule'],
    };
    const previousVerification = {
      ...verification,
      id: 'v0',
      outcome: 'PASS',
      input_fingerprint: 'historical-verification-fp',
      blockers: [],
    };
    const fetchMock = vi.fn().mockImplementation((input: string, init?: RequestInit) => {
      const path = String(input);
      if (path.includes('/evidence') && init?.method === 'POST') {
        currentEvidence = { ...currentEvidence, status: 'INVALIDATED' };
        return Promise.resolve(new Response(JSON.stringify(currentEvidence), { status: 200 }));
      }
      if (path.includes('/evidence?'))
        return Promise.resolve(new Response(JSON.stringify([currentEvidence]), { status: 200 }));
      if (path.endsWith('/verifications/rules'))
        return Promise.resolve(new Response(JSON.stringify([rule]), { status: 200 }));
      if (path.endsWith('/verifications/evaluate'))
        return Promise.resolve(new Response(JSON.stringify(verification), { status: 201 }));
      if (path.endsWith('/verifications'))
        return Promise.resolve(
          new Response(JSON.stringify([previousVerification]), { status: 200 }),
        );
      if (path.endsWith('/release-candidates/c1') && init?.method === 'PATCH') {
        const values = JSON.parse(String(init.body));
        currentCandidate = { ...currentCandidate, title: values.title, summary: values.summary };
        return Promise.resolve(new Response(JSON.stringify(currentCandidate), { status: 200 }));
      }
      if (path.endsWith('/release-candidates/c1/freeze')) {
        currentCandidate = {
          ...currentCandidate,
          status: 'FROZEN',
          revision: 2,
          fingerprint: 'candidate-fp',
        };
        return Promise.resolve(new Response(JSON.stringify(currentCandidate), { status: 200 }));
      }
      if (path.endsWith('/release-candidates/c1/gates/preview'))
        return Promise.resolve(new Response(JSON.stringify(gate), { status: 200 }));
      if (path.endsWith('/release-candidates/c1/gates/evaluate')) {
        gate = { ...gate, id: 'g2' };
        return Promise.resolve(new Response(JSON.stringify(gate), { status: 201 }));
      }
      if (path.endsWith('/release-candidates/c1/gates'))
        return Promise.resolve(new Response(JSON.stringify([gate]), { status: 200 }));
      if (path.endsWith('/release-candidates/c1/revisions'))
        return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }));
      if (path.endsWith('/release-candidates'))
        return Promise.resolve(new Response(JSON.stringify([currentCandidate]), { status: 200 }));
      return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
    });
    vi.stubGlobal('fetch', fetchMock);
    render(
      <MemoryRouter initialEntries={['/delivery/w1/p1']}>
        <Routes>
          <Route path="/delivery/:workspaceId/:projectId" element={<DeliveryPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Human report')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Delivery overview' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Delivery workflows' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Candidate detail & history' })).toHaveAttribute(
      'href',
      '/delivery/w1/p1/candidates/c1',
    );
    expect(
      screen
        .getAllByRole('link', { name: 'Open verification result' })
        .some((link) => link.getAttribute('href') === '/delivery/w1/p1/verifications/v0'),
    ).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Evidence detail & provenance' }));
    expect(screen.getByText('report-1')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open evidence detail' })).toHaveAttribute(
      'href',
      '/delivery/w1/p1/evidence/e1',
    );
    expect(
      screen.getByRole('heading', { name: 'Release candidates & manifest' }),
    ).toBeInTheDocument();
    expect(screen.getAllByText('NOT_PUBLISHED').length).toBeGreaterThan(0);
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Inspect saved verification for verified-evidence-present',
      }),
    );
    expect(screen.getByText('historical-verification-fp')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('searchbox', { name: 'Evidence search' }), {
      target: { value: 'Human' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Apply evidence filters' }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v1/workspaces/w1/projects/p1/evidence?search=Human&provenance=&status=',
        expect.objectContaining({ credentials: 'same-origin', signal: undefined }),
      ),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Invalidate Human report' }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v1/workspaces/w1/projects/p1/evidence/e1/invalidate',
        expect.objectContaining({ method: 'POST' }),
      ),
    );
    fireEvent.change(screen.getByRole('textbox', { name: 'Candidate title' }), {
      target: { value: 'Edited candidate' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save candidate' }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v1/workspaces/w1/projects/p1/release-candidates/c1',
        expect.objectContaining({ method: 'PATCH' }),
      ),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Freeze Edited candidate' }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v1/workspaces/w1/projects/p1/release-candidates/c1/freeze',
        expect.objectContaining({ method: 'POST' }),
      ),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Inspect candidate Edited candidate' }));
    expect(await screen.findByRole('heading', { name: 'Candidate history' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Preview gates for Edited candidate' }));
    expect(await screen.findByText('BLOCKED')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Verification center' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Evaluate verification' }));
    expect(await screen.findByText('Verification result & trace')).toBeInTheDocument();
    expect(screen.getByText('verification-fp')).toBeInTheDocument();
    expect(
      screen.getByText('No active VERIFIED evidence is available for this rule'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Evaluate gates' }));
    expect(
      await screen.findByText('A frozen candidate and active VERIFIED evidence are required'),
    ).toBeInTheDocument();
  });

  it('does not let an older delivery read undo a completed evidence invalidation', async () => {
    let currentEvidence: typeof evidence | null = null;
    let staleSnapshot: typeof evidence | null = null;
    let evidenceReads = 0;
    let resolveStaleRead: ((response: Response) => void) | undefined;
    const fetchMock = vi.fn().mockImplementation((input: string, init?: RequestInit) => {
      const path = String(input);
      if (path.endsWith('/evidence') && init?.method === 'POST') {
        const values = JSON.parse(String(init.body));
        currentEvidence = {
          ...evidence,
          title: values.title,
          summary: values.summary,
        };
        staleSnapshot = { ...currentEvidence };
        return Promise.resolve(new Response(JSON.stringify(currentEvidence), { status: 201 }));
      }
      if (path.endsWith('/invalidate')) {
        currentEvidence = { ...currentEvidence!, status: 'INVALIDATED' };
        return Promise.resolve(new Response(JSON.stringify(currentEvidence), { status: 200 }));
      }
      if (path.includes('/evidence?')) {
        evidenceReads += 1;
        if (evidenceReads === 1)
          return new Promise<Response>((resolve) => {
            resolveStaleRead = resolve;
          });
        return Promise.resolve(
          new Response(JSON.stringify(currentEvidence ? [currentEvidence] : []), { status: 200 }),
        );
      }
      if (path.endsWith('/verifications/rules'))
        return Promise.resolve(new Response(JSON.stringify([rule]), { status: 200 }));
      return Promise.resolve(new Response('[]', { status: 200 }));
    });
    vi.stubGlobal('fetch', fetchMock);
    render(
      <MemoryRouter initialEntries={['/delivery/w1/p1']}>
        <Routes>
          <Route path="/delivery/:workspaceId/:projectId" element={<DeliveryPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByRole('heading', { name: 'Delivery overview' });
    await screen.findByRole('button', { name: 'Record Evidence' });
    fireEvent.change(screen.getByLabelText('Evidence title'), {
      target: { value: 'Concurrent report' },
    });
    fireEvent.change(screen.getByLabelText('Evidence summary'), {
      target: { value: 'Reported once.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Record Evidence' }));
    const evidenceRow = await screen.findByRole('article');
    await waitFor(() => expect(evidenceRow).toHaveTextContent('REPORTED / ACTIVE'));
    fireEvent.click(
      within(evidenceRow).getByRole('button', { name: 'Invalidate Concurrent report' }),
    );
    await waitFor(() => expect(evidenceRow).toHaveTextContent('REPORTED / INVALIDATED'));

    expect(resolveStaleRead).toBeDefined();
    await act(async () => {
      resolveStaleRead?.(new Response(JSON.stringify([staleSnapshot]), { status: 200 }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(evidenceRow).toHaveTextContent('REPORTED / INVALIDATED');
  });
});
