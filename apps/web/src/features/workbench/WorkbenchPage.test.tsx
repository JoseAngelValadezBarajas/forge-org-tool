import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WorkbenchPage } from './WorkbenchPage';

const run = { id: 'run1', project_id: 'p1', feature_id: null, title: 'Manual report', description: null, execution_mode: 'manual', executor_type: 'human', status: 'PLANNED', version: 1, created_at: '', updated_at: '' };
const draft = { id: 'h1', project_id: 'p1', feature_id: null, run_id: 'run1', title: 'Next handoff', summary: '', next_actions: '', status: 'DRAFT', current_revision: null, version: 1, created_at: '', updated_at: '' };
const ready = { ...draft, title: 'Ready handoff', summary: 'Reported summary', next_actions: 'Review manually', status: 'READY', current_revision: 1, version: 3 };
const revision = { id: 'hr1', handoff_id: 'h1', revision: 1, title: ready.title, summary: ready.summary, next_actions: ready.next_actions, schema_version: 'forge-handoff-v1', fingerprint: 'handoff-fp', payload_json: '{}', markdown: '# Ready handoff', created_at: '' };

describe('WorkbenchPage', () => {
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it('edits, publishes, reviews, acknowledges, and downloads an immutable handoff revision', async () => {
    let handoff = { ...draft, current_revision: null as number | null, status: 'DRAFT' as string };
    let handoffCreated = false;
    let revisionPublished = false;
    let acknowledged = false;
    const fetchMock = vi.fn().mockImplementation((input: string, init?: RequestInit) => {
      const path = String(input);
      if (path.endsWith('/runs?status=&search=')) return Promise.resolve(new Response(JSON.stringify([run]), { status: 200 }));
      if (path.endsWith('/handoffs') && !path.includes('/runs/')) return Promise.resolve(new Response(JSON.stringify(handoffCreated ? [{ ...handoff, ...(acknowledged ? { status: 'ACKNOWLEDGED' } : {}) }] : []), { status: 200 }));
      if (path.endsWith('/runs/run1/handoffs') && init?.method === 'POST') { handoffCreated = true; handoff = { ...draft }; return Promise.resolve(new Response(JSON.stringify(handoff), { status: 201 })); }
      if (path.endsWith('/handoffs/h1') && init?.method === 'PATCH') { handoff = { ...draft, title: 'Ready handoff', summary: 'Reported summary', next_actions: 'Review manually', version: 2 }; return Promise.resolve(new Response(JSON.stringify(handoff), { status: 200 })); }
      if (path.endsWith('/handoffs/h1/ready')) { revisionPublished = true; handoff = { ...ready }; return Promise.resolve(new Response(JSON.stringify(handoff), { status: 200 })); }
      if (path.endsWith('/handoffs/h1/revisions')) return Promise.resolve(new Response(JSON.stringify(revisionPublished ? [revision] : []), { status: 200 }));
      if (path.endsWith('/handoffs/h1/acknowledge')) { acknowledged = true; return Promise.resolve(new Response(JSON.stringify({ id: 'ack1', handoff_id: 'h1', revision: 1, acknowledged_by: 'reviewer' }), { status: 200 })); }
      return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }));
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<MemoryRouter initialEntries={['/workbench/w1/p1']}><Routes><Route path="/workbench/:workspaceId/:projectId" element={<WorkbenchPage />} /></Routes></MemoryRouter>);

    expect(await screen.findByText('Manual report')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Create handoff for Manual report' }));
    expect(await screen.findByText('Next handoff')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: 'Summary for Next handoff' }), { target: { value: 'Reported summary' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Next actions for Next handoff' }), { target: { value: 'Review manually' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save handoff details' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/v1/workspaces/w1/projects/p1/handoffs/h1', expect.objectContaining({ method: 'PATCH' })));
    fireEvent.click(screen.getByRole('button', { name: 'Mark handoff ready' }));
    expect(await screen.findByText('Revision 1')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'JSON' })).toHaveAttribute('href', '/api/v1/workspaces/w1/projects/p1/handoffs/h1/revisions/1/download?format=json');
    fireEvent.change(screen.getByRole('textbox', { name: 'Acknowledged by Ready handoff' }), { target: { value: 'reviewer' } });
    fireEvent.click(screen.getByRole('button', { name: 'Acknowledge revision' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/v1/workspaces/w1/projects/p1/handoffs/h1/acknowledge', expect.objectContaining({ method: 'POST' })));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Acknowledge revision' })).not.toBeInTheDocument());
  });
});
