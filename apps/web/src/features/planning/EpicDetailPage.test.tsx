import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { organizationApi } from '@forge-org/api-client';
import { EpicDetailPage } from './EpicDetailPage';

vi.mock('@forge-org/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@forge-org/api-client')>();
  return {
    ...actual,
    organizationApi: {
      ...actual.organizationApi,
      getProject: vi.fn(),
      planningOverview: vi.fn(),
      updateEpic: vi.fn(),
    },
  };
});

const project = {
  id: 'p1',
  workspace_id: 'w1',
  name: 'Launch',
  description: null,
  status: 'active',
  created_at: '',
  updated_at: '',
  archived_at: null,
};
const epic = {
  id: 'e1',
  project_id: 'p1',
  title: 'Release',
  description: 'Ship carefully',
  status: 'planning' as const,
  created_at: '',
  updated_at: '',
};
const feature = {
  id: 'f1',
  project_id: 'p1',
  epic_id: 'e1',
  title: 'Board',
  description: null,
  goal: null,
  priority: 'high' as const,
  status: 'backlog' as const,
  created_at: '',
  updated_at: '',
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/planning/w1/p1/epics/e1']}>
      <Routes>
        <Route
          path="/planning/:workspaceId/:projectId/epics/:epicId"
          element={<EpicDetailPage />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('EpicDetailPage', () => {
  afterEach(() => cleanup());
  beforeEach(() => {
    vi.mocked(organizationApi.getProject).mockResolvedValue(project);
    vi.mocked(organizationApi.planningOverview).mockResolvedValue({
      epics: [{ ...epic, features: [feature] }],
      unassigned_features: [],
    });
    vi.mocked(organizationApi.updateEpic).mockResolvedValue({ ...epic, title: 'Release 2' });
  });

  it('renders matching Epic metadata and links its Features', async () => {
    renderPage();
    expect(await screen.findByLabelText('Epic title')).toHaveValue('Release');
    expect(screen.getByRole('link', { name: 'Board' })).toHaveAttribute(
      'href',
      '/planning/w1/p1/features/f1',
    );
  });

  it('saves edited fields and retains submitted values from the response', async () => {
    renderPage();
    fireEvent.change(await screen.findByLabelText('Epic title'), {
      target: { value: 'Release 2' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save Epic' }));
    await waitFor(() =>
      expect(organizationApi.updateEpic).toHaveBeenCalledWith(
        'w1',
        'p1',
        'e1',
        expect.objectContaining({ title: 'Release 2' }),
      ),
    );
    expect(await screen.findByText('Epic saved.')).toBeInTheDocument();
  });

  it('makes archived-project Epic details read-only', async () => {
    vi.mocked(organizationApi.getProject).mockResolvedValue({ ...project, status: 'archived' });
    renderPage();
    expect(await screen.findByText(/archived project/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save Epic' })).not.toBeInTheDocument();
  });

  it('preserves an edited draft when the server rejects the save', async () => {
    vi.mocked(organizationApi.updateEpic).mockRejectedValue(new Error('Conflict'));
    renderPage();
    const input = await screen.findByLabelText('Epic title');
    fireEvent.change(input, { target: { value: 'Draft title' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Epic' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Conflict');
    expect(screen.getByLabelText('Epic title')).toHaveValue('Draft title');
  });

  it('shows a retryable error for an Epic that does not belong to the route project', async () => {
    vi.mocked(organizationApi.planningOverview).mockResolvedValue({
      epics: [{ ...epic, project_id: 'other', features: [] }],
      unassigned_features: [],
    });
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent(/epic.*not found/i);
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('shows an empty Features state', async () => {
    vi.mocked(organizationApi.planningOverview).mockResolvedValue({
      epics: [{ ...epic, features: [] }],
      unassigned_features: [],
    });
    renderPage();
    expect(await screen.findByText(/no features linked/i)).toBeInTheDocument();
  });
});
