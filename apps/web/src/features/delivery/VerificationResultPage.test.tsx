import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { VerificationResultPage } from './VerificationResultPage';

describe('VerificationResultPage', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('shows only the recorded result and trace fields the current API actually exposes', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((input: string) =>
        Promise.resolve(
          new Response(
            JSON.stringify(
              String(input).endsWith('/verifications/rules')
                ? [{ id: 'rule-1', label: 'Evidence present', description: 'Rule description' }]
                : [
                    {
                      id: 'v1',
                      project_id: 'p1',
                      candidate_id: 'c1',
                      rule_id: 'rule-1',
                      outcome: 'BLOCKED',
                      input_fingerprint: 'vf-1',
                      stale: true,
                      blockers: ['Evidence is missing'],
                      created_at: '2026-10-22T10:00:00Z',
                    },
                  ],
            ),
            { status: 200 },
          ),
        ),
      ),
    );
    render(
      <MemoryRouter
        initialEntries={[
          { pathname: '/verifications/v1', state: { workspaceId: 'w1', projectId: 'p1' } },
        ]}
      >
        <Routes>
          <Route path="/verifications/:verificationId" element={<VerificationResultPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(
      await screen.findByRole('heading', { name: /verification result & trace/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('BLOCKED')).toBeInTheDocument();
    expect(screen.getByText('vf-1')).toBeInTheDocument();
    expect(screen.getByText('Evidence is missing')).toBeInTheDocument();
    expect(
      screen.getByText(
        /does not expose method, execution inputs, or expected-versus-actual trace/i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to delivery/i })).toHaveAttribute(
      'href',
      '/delivery/w1/p1',
    );
  });

  it('reports an unknown verification id after the history request succeeds', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response(JSON.stringify([]), { status: 200 }))),
    );
    render(
      <MemoryRouter
        initialEntries={[
          { pathname: '/verifications/missing', state: { workspaceId: 'w1', projectId: 'p1' } },
        ]}
      >
        <Routes>
          <Route path="/verifications/:verificationId" element={<VerificationResultPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /not found in this project's history/i,
    );
  });
});
