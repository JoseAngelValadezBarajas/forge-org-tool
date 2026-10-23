import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { organizationApi } from '@forge-org/api-client';
import { EpicDetailPage } from './EpicDetailPage';

const api = vi.hoisted(() => ({
  getProject: vi.fn(),
  planningOverview: vi.fn(),
  updateEpic: vi.fn(),
  updateFeature: vi.fn(),
}));
vi.mock('@forge-org/api-client', () => ({ organizationApi: api }));

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
  status: 'backlog' as const,
  archived_at: null,
  priority: 'medium',
  tags: [],
  feature_count: 1,
  completed_feature_count: 0,
  progress: 0,
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
  kind: 'story',
  tags: [],
  notes: null,
  created_at: '',
  updated_at: '',
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/planning/w1/p1/epics/e1']}>
      <NavigateToMissingEpic />
      <Routes>
        <Route
          path="/planning/:workspaceId/:projectId/epics/:epicId"
          element={<EpicDetailPage />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

function NavigateToMissingEpic() {
  const navigate = useNavigate();
  return (
    <button onClick={() => navigate('/planning/w1/p1/epics/missing')}>Open missing Epic</button>
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
    vi.mocked(organizationApi.updateFeature).mockResolvedValue({ ...feature, status: 'done' });
  });

  it('renders matching Epic metadata and links its Features', async () => {
    renderPage();
    expect(await screen.findByLabelText('Epic title')).toHaveValue('Release');
    expect(screen.getByRole('link', { name: 'Board' })).toHaveAttribute(
      'href',
      '/planning/w1/p1/features/f1',
    );
  });

  it('shows an unsupported Epic state and preserves it when editing other fields', async () => {
    vi.mocked(organizationApi.planningOverview).mockResolvedValue({
      epics: [{ ...epic, status: 'custom_legacy', features: [feature] }],
      unassigned_features: [],
    });
    vi.mocked(organizationApi.updateEpic).mockResolvedValue({
      ...epic,
      status: 'custom_legacy',
      title: 'Legacy updated',
    });
    renderPage();
    expect(await screen.findByLabelText('Epic status')).toHaveValue('custom_legacy');
    expect(screen.getByRole('option', { name: 'Unsupported: custom_legacy' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Epic title'), {
      target: { value: 'Legacy updated' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save Epic' }));
    await waitFor(() =>
      expect(organizationApi.updateEpic).toHaveBeenCalledWith('w1', 'p1', 'e1', {
        title: 'Legacy updated',
        description: 'Ship carefully',
      }),
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

  it('does not keep the previous Epic editable after navigating to a missing Epic', async () => {
    renderPage();
    expect(await screen.findByLabelText('Epic title')).toHaveValue('Release');
    fireEvent.click(screen.getByRole('button', { name: 'Open missing Epic' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/epic.*not found/i);
    expect(screen.queryByLabelText('Epic title')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save Epic' })).not.toBeInTheDocument();
  });

  it('shows an empty Features state', async () => {
    vi.mocked(organizationApi.planningOverview).mockResolvedValue({
      epics: [{ ...epic, features: [] }],
      unassigned_features: [],
    });
    renderPage();
    expect(await screen.findByText(/no work items linked/i)).toBeInTheDocument();
  });

  it('renders the five-column Epic Board and persists keyboard status changes', async () => {
    renderPage();
    expect(await screen.findByRole('region', { name: 'Epic Board' })).toBeInTheDocument();
    for (const name of ['Backlog', 'Ready', 'In progress', 'Verify', 'Done']) {
      expect(screen.getByRole('heading', { name })).toBeInTheDocument();
    }
    fireEvent.change(screen.getByLabelText('Status for Board'), { target: { value: 'done' } });
    await waitFor(() =>
      expect(organizationApi.updateFeature).toHaveBeenCalledWith('w1', 'p1', 'f1', {
        status: 'done',
      }),
    );
  });
});
