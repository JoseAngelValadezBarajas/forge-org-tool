import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DeliveryPage } from './DeliveryPage';

const evidence = { id: 'e1', project_id: 'p1', feature_id: null, title: 'Human report', summary: 'Reported manually', provenance: 'REPORTED', reference_kind: 'artifact', reference_value: 'report-1', status: 'ACTIVE', created_at: '', updated_at: '' };
const candidate = { id: 'c1', project_id: 'p1', title: 'Alpha candidate', summary: 'Candidate summary', status: 'DRAFT', revision: 1, fingerprint: null, created_at: '', updated_at: '' };
const rule = { id: 'verified-evidence-present', label: 'Verified evidence is present', description: 'Active VERIFIED evidence exists.' };

describe('DeliveryPage', () => {
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it('filters and invalidates evidence, freezes a candidate, and retains blocked gate history', async () => {
    let currentEvidence = { ...evidence };
    let currentCandidate = { ...candidate, fingerprint: candidate.fingerprint as string | null };
    let gate = { id: 'g1', candidate_id: 'c1', candidate_revision: 1, outcome: 'BLOCKED', input_fingerprint: 'gate-fp', blockers: ['A frozen candidate and active VERIFIED evidence are required'] };
    const fetchMock = vi.fn().mockImplementation((input: string, init?: RequestInit) => {
      const path = String(input);
      if (path.includes('/evidence') && init?.method === 'POST') { currentEvidence = { ...currentEvidence, status: 'INVALIDATED' }; return Promise.resolve(new Response(JSON.stringify(currentEvidence), { status: 200 })); }
      if (path.includes('/evidence?')) return Promise.resolve(new Response(JSON.stringify([currentEvidence]), { status: 200 }));
      if (path.endsWith('/verifications/rules')) return Promise.resolve(new Response(JSON.stringify([rule]), { status: 200 }));
      if (path.endsWith('/verifications')) return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }));
      if (path.endsWith('/release-candidates/c1') && init?.method === 'PATCH') { const values = JSON.parse(String(init.body)); currentCandidate = { ...currentCandidate, title: values.title, summary: values.summary }; return Promise.resolve(new Response(JSON.stringify(currentCandidate), { status: 200 })); }
      if (path.endsWith('/release-candidates/c1/freeze')) { currentCandidate = { ...currentCandidate, status: 'FROZEN', revision: 2, fingerprint: 'candidate-fp' }; return Promise.resolve(new Response(JSON.stringify(currentCandidate), { status: 200 })); }
      if (path.endsWith('/release-candidates/c1/gates/preview')) return Promise.resolve(new Response(JSON.stringify(gate), { status: 200 }));
      if (path.endsWith('/release-candidates/c1/gates/evaluate')) { gate = { ...gate, id: 'g2' }; return Promise.resolve(new Response(JSON.stringify(gate), { status: 201 })); }
      if (path.endsWith('/release-candidates/c1/gates')) return Promise.resolve(new Response(JSON.stringify([gate]), { status: 200 }));
      if (path.endsWith('/release-candidates/c1/revisions')) return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }));
      if (path.endsWith('/release-candidates')) return Promise.resolve(new Response(JSON.stringify([currentCandidate]), { status: 200 }));
      return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<MemoryRouter initialEntries={['/delivery/w1/p1']}><Routes><Route path="/delivery/:workspaceId/:projectId" element={<DeliveryPage />} /></Routes></MemoryRouter>);

    expect(await screen.findByText('Human report')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('searchbox', { name: 'Evidence search' }), { target: { value: 'Human' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply evidence filters' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/v1/workspaces/w1/projects/p1/evidence?search=Human&provenance=&status=', expect.objectContaining({ credentials: 'same-origin', signal: undefined })));
    fireEvent.click(screen.getByRole('button', { name: 'Invalidate Human report' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/v1/workspaces/w1/projects/p1/evidence/e1/invalidate', expect.objectContaining({ method: 'POST' })));
    fireEvent.change(screen.getByRole('textbox', { name: 'Candidate title' }), { target: { value: 'Edited candidate' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save candidate' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/v1/workspaces/w1/projects/p1/release-candidates/c1', expect.objectContaining({ method: 'PATCH' })));
    fireEvent.click(screen.getByRole('button', { name: 'Freeze Edited candidate' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/v1/workspaces/w1/projects/p1/release-candidates/c1/freeze', expect.objectContaining({ method: 'POST' })));
    fireEvent.click(screen.getByRole('button', { name: 'Preview gates for Edited candidate' }));
    expect(await screen.findByText('BLOCKED')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Evaluate gates' }));
    expect(await screen.findByText('A frozen candidate and active VERIFIED evidence are required')).toBeInTheDocument();
  });
});
