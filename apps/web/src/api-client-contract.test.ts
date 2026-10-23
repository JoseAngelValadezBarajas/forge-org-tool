import { afterEach, describe, expect, it, vi } from 'vitest';
import { organizationApi } from '@forge-org/api-client';

describe('organizationApi compatibility facade', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('preserves representative planning and delivery HTTP contracts', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 'p1', name: 'Planning' }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 'rc1', status: 'draft' }), { status: 200 }),
      );
    vi.stubGlobal('fetch', fetchMock);

    await organizationApi.planningOverview('w1', 'p1');
    await organizationApi.createCandidate('w1', 'p1', 'rc1', 'Release candidate');

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/v1/workspaces/w1/projects/p1/planning/overview',
      expect.objectContaining({ credentials: 'same-origin' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/v1/workspaces/w1/projects/p1/release-candidates',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ title: 'rc1', summary: 'Release candidate' }),
      }),
    );
  });

  it('preserves workspace-scoped Project read and update contracts', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 'p1', name: 'Project' }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 'p1', name: 'Renamed' }), { status: 200 }),
      );
    vi.stubGlobal('fetch', fetchMock);

    await organizationApi.getProject('w1', 'p1');
    await organizationApi.updateProject('w1', 'p1', { name: 'Renamed' });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/v1/workspaces/w1/projects/p1',
      expect.objectContaining({ credentials: 'same-origin' }),
    );
    expect(fetchMock.mock.calls[0][1]?.method).toBeUndefined();
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/v1/workspaces/w1/projects/p1',
      expect.objectContaining({
        method: 'PATCH',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ name: 'Renamed' }),
        credentials: 'same-origin',
      }),
    );
  });
});
