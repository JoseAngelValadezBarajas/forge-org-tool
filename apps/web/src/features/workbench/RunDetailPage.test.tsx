import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RunDetailPage } from './RunDetailPage';

const run = {
  id: 'run1',
  project_id: 'p1',
  feature_id: 'f1',
  title: 'Manual report',
  description: null,
  execution_mode: 'manual',
  executor_type: 'human',
  status: 'PLANNED',
  version: 1,
  created_at: '2026-10-20T08:00:00Z',
  updated_at: '2026-10-20T08:00:00Z',
};
const earlierEvent = {
  id: 'event-early',
  run_id: 'run1',
  event_type: 'progress',
  title: 'Earlier update',
  description: 'Reported first',
  origin: 'human',
  occurred_at: '2026-10-20T09:00:00Z',
  supersedes_event_id: null,
  created_at: '2026-10-20T09:05:00Z',
};
const laterEvent = {
  ...earlierEvent,
  id: 'event-later',
  title: 'Later update',
  occurred_at: '2026-10-20T11:00:00Z',
  created_at: '2026-10-20T11:05:00Z',
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/workbench/w1/p1/runs/run1']}>
      <Routes>
        <Route path="/workbench/:workspaceId/:projectId/runs/:runId" element={<RunDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RunDetailPage', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('loads a human-reported run and displays its append-only timeline chronologically', async () => {
    const fetchMock = vi.fn().mockImplementation((input: string) => {
      const path = String(input);
      if (path.endsWith('/runs/run1/events'))
        return Promise.resolve(
          new Response(JSON.stringify([laterEvent, earlierEvent]), { status: 200 }),
        );
      if (path.endsWith('/runs/run1'))
        return Promise.resolve(new Response(JSON.stringify(run), { status: 200 }));
      return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }));
    });
    vi.stubGlobal('fetch', fetchMock);
    renderPage();

    expect(
      await screen.findByRole('heading', { name: 'Manual report', level: 2 }),
    ).toBeInTheDocument();
    expect(screen.getByText('Reported · not independently verified')).toBeInTheDocument();
    const timeline = screen.getByRole('list', { name: 'Activity timeline' });
    expect(
      within(timeline)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual([expect.stringContaining('Earlier update'), expect.stringContaining('Later update')]);
    expect(screen.getByRole('link', { name: 'Back to Workbench' })).toHaveAttribute(
      'href',
      '/workbench/w1/p1',
    );
  });

  it('posts an event with the current version, then reloads the run and append-only timeline', async () => {
    let currentRun = { ...run };
    let events: Record<string, unknown>[] = [laterEvent, earlierEvent];
    const fetchMock = vi.fn().mockImplementation((input: string, init?: RequestInit) => {
      const path = String(input);
      if (path.endsWith('/runs/run1/events') && init?.method === 'POST') {
        const payload = JSON.parse(String(init.body)) as Record<string, unknown>;
        expect(payload).toEqual({
          event_type: 'decision',
          title: 'Decision recorded',
          description: 'Operator-reported decision.',
          expected_version: 1,
          occurred_at: null,
          supersedes_event_id: null,
        });
        currentRun = { ...currentRun, version: 2 };
        const created = {
          ...earlierEvent,
          id: 'event-created',
          event_type: payload.event_type,
          title: payload.title,
          description: payload.description,
          occurred_at: null,
          created_at: '2026-10-20T12:05:00Z',
        };
        events = [...events, created];
        return Promise.resolve(new Response(JSON.stringify(created), { status: 201 }));
      }
      if (path.endsWith('/runs/run1/events'))
        return Promise.resolve(new Response(JSON.stringify(events), { status: 200 }));
      if (path.endsWith('/runs/run1'))
        return Promise.resolve(new Response(JSON.stringify(currentRun), { status: 200 }));
      return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }));
    });
    vi.stubGlobal('fetch', fetchMock);
    renderPage();

    expect(
      await screen.findByRole('heading', { name: 'Manual report', level: 2 }),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: 'Event type' }), {
      target: { value: 'decision' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Event title' }), {
      target: { value: 'Decision recorded' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Event description' }), {
      target: { value: 'Operator-reported decision.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Record activity event' }));

    expect(await screen.findByText('Run version 2')).toBeInTheDocument();
    expect(screen.getByText('Decision recorded')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/workspaces/w1/projects/p1/runs/run1/events',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(
      fetchMock.mock.calls.filter(
        ([url, init]) => String(url).endsWith('/runs/run1/events') && init?.method !== 'POST',
      ),
    ).toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/workspaces/w1/projects/p1/runs/run1',
      expect.objectContaining({ credentials: 'same-origin' }),
    );
  });

  it('shows a recoverable error when the run timeline fails to load', async () => {
    let failOnce = true;
    const fetchMock = vi.fn().mockImplementation((input: string) => {
      const path = String(input);
      if (path.endsWith('/runs/run1/events') && failOnce) {
        failOnce = false;
        return Promise.resolve(
          new Response(JSON.stringify({ detail: 'Timeline unavailable' }), { status: 503 }),
        );
      }
      if (path.endsWith('/runs/run1/events'))
        return Promise.resolve(new Response(JSON.stringify([earlierEvent]), { status: 200 }));
      return Promise.resolve(new Response(JSON.stringify(run), { status: 200 }));
    });
    vi.stubGlobal('fetch', fetchMock);
    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent('Timeline unavailable');
    fireEvent.click(screen.getByRole('button', { name: 'Retry loading run timeline' }));
    expect(await screen.findByText('Earlier update')).toBeInTheDocument();
  });
});
