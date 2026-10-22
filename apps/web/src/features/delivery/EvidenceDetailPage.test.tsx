import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EvidenceDetailPage } from './EvidenceDetailPage';

describe('EvidenceDetailPage', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('shows the API-backed provenance and links back without promoting reported evidence', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            id: 'e1',
            project_id: 'p1',
            feature_id: 'f1',
            title: 'Build report',
            summary: 'CI artifact',
            provenance: 'REPORTED',
            reference_kind: 'artifact',
            reference_value: 'build-42',
            status: 'ACTIVE',
            created_at: '2026-10-22T10:00:00Z',
            updated_at: '2026-10-22T10:00:00Z',
          }),
          { status: 200 },
        ),
      ),
    );
    render(
      <MemoryRouter initialEntries={['/delivery/w1/p1/evidence/e1']}>
        <Routes>
          <Route
            path="/delivery/:workspaceId/:projectId/evidence/:evidenceId"
            element={<EvidenceDetailPage />}
          />
        </Routes>
      </MemoryRouter>,
    );
    expect(
      await screen.findByRole('heading', { name: /evidence detail & provenance/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('REPORTED')).toBeInTheDocument();
    expect(screen.getByText('build-42')).toBeInTheDocument();
    expect(screen.getByText(/does not mean verified/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to delivery/i })).toHaveAttribute(
      'href',
      '/delivery/w1/p1',
    );
  });
});
