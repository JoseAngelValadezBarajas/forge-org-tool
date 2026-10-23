import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CandidateDetailPage } from './CandidateDetailPage';

describe('CandidateDetailPage', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('shows the candidate and exact saved revision snapshots with a return link', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((input: string) =>
        Promise.resolve(
          new Response(
            JSON.stringify(
              String(input).endsWith('/revisions')
                ? [
                    {
                      id: 'rev-1',
                      candidate_id: 'c1',
                      revision: 2,
                      fingerprint: 'rev-fp',
                      status: 'FROZEN',
                      snapshot_json: '{"title":"Stable"}',
                      created_at: '2026-10-22T10:00:00Z',
                    },
                  ]
                : {
                    id: 'c1',
                    project_id: 'p1',
                    title: 'Candidate one',
                    summary: 'Current snapshot',
                    status: 'FROZEN',
                    revision: 2,
                    fingerprint: 'cand-fp',
                    created_at: '2026-10-22T10:00:00Z',
                    updated_at: '2026-10-22T10:00:00Z',
                  },
            ),
            { status: 200 },
          ),
        ),
      ),
    );
    render(
      <MemoryRouter initialEntries={['/delivery/w1/p1/candidates/c1']}>
        <Routes>
          <Route
            path="/delivery/:workspaceId/:projectId/candidates/:candidateId"
            element={<CandidateDetailPage />}
          />
        </Routes>
      </MemoryRouter>,
    );
    expect(
      await screen.findByRole('heading', { name: /candidate detail & history/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('Candidate one')).toBeInTheDocument();
    expect(screen.getByText('cand-fp')).toBeInTheDocument();
    expect(screen.getByText(/\{"title":"Stable"\}/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to delivery/i })).toHaveAttribute(
      'href',
      '/delivery/w1/p1',
    );
  });
});
