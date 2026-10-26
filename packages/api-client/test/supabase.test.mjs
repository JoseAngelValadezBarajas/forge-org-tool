import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import {
  configureStorage,
  getStorageSnapshot,
  inspectStorage,
  organizationApi,
  signInSupabase,
} from '../dist/index.js';
import { planningCapability } from '../dist/planning.js';

const profile = {
  provider: 'supabase',
  projectUrl: 'https://example123.supabase.co',
  publishableKey: 'sb_publishable_testkey123',
};

const session = {
  access_token: 'user-access-token',
  refresh_token: 'user-refresh-token',
  expires_in: 3600,
  user: { id: 'user-a', email: 'a@example.test' },
};

function jsonResponse(value, status = 200) {
  return new globalThis.Response(JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

afterEach(() => {
  configureStorage({ provider: 'local' });
  delete globalThis.fetch;
});

describe('Supabase Data API adapter', () => {
  it('preflights Auth, schema and permissions before exposing ready', async () => {
    const calls = [];
    globalThis.fetch = async (url, init = {}) => {
      calls.push({ url: String(url), init });
      if (String(url).includes('/auth/v1/token')) return jsonResponse(session);
      if (String(url).includes('/rpc/forge_storage_preflight')) {
        return jsonResponse({ schema_version: 'forge-byoc-v1' });
      }
      throw new Error(`unexpected request ${String(url)}`);
    };

    configureStorage(profile);
    assert.equal(getStorageSnapshot().status, 'authentication_required');
    await signInSupabase('a@example.test', 'temporary-password');
    assert.equal(getStorageSnapshot().status, 'schema_missing');
    const state = await inspectStorage();

    assert.equal(state.status, 'ready');
    const authCall = calls.find(({ url }) => url.includes('/auth/v1/token'));
    assert.equal(authCall.url, 'https://example123.supabase.co/auth/v1/token?grant_type=password');
    assert.deepEqual(JSON.parse(authCall.init.body), {
      email: 'a@example.test',
      password: 'temporary-password',
    });
    assert.equal(calls.filter(({ url }) => url.includes('/rpc/forge_storage_preflight')).length, 1);
  });

  it('uses the authenticated Supabase Data API for the Workspace vertical slice', async () => {
    const calls = [];
    globalThis.fetch = async (url, init = {}) => {
      calls.push({ url: String(url), init });
      if (String(url).includes('/auth/v1/token')) return jsonResponse(session);
      if (String(url).includes('/rpc/forge_storage_preflight')) {
        return jsonResponse({ schema_version: 'forge-byoc-v1' });
      }
      if (String(url).includes('/rpc/forge_create_workspace')) {
        return jsonResponse({
          id: 'workspace-a',
          name: 'Cloud workspace',
          description: null,
          created_at: '2026-10-26T00:00:00Z',
          updated_at: '2026-10-26T00:00:00Z',
          archived_at: null,
        });
      }
      if (String(url).includes('/rest/v1/workspaces')) {
        return jsonResponse([
          {
            id: 'workspace-a',
            name: 'Cloud workspace',
            description: null,
            created_at: '2026-10-26T00:00:00Z',
            updated_at: '2026-10-26T00:00:00Z',
            archived_at: null,
          },
        ]);
      }
      throw new Error(`unexpected request ${String(url)}`);
    };

    configureStorage(profile);
    await signInSupabase('a@example.test', 'temporary-password');
    await inspectStorage();
    const created = await organizationApi.createWorkspace('Cloud workspace');
    const workspaces = await organizationApi.listWorkspaces();

    assert.equal(created.id, 'workspace-a');
    assert.equal(workspaces[0].name, 'Cloud workspace');
    const dataApiCall = calls.find(({ url }) => url.includes('/rest/v1/workspaces'));
    assert.ok(dataApiCall);
    assert.equal(dataApiCall.init.headers.Authorization, 'Bearer user-access-token');
    assert.equal(dataApiCall.init.headers.apikey, profile.publishableKey);
    assert.equal(
      calls.some(({ url }) => url.startsWith('/api/v1/')),
      false,
    );
  });

  it('surfaces RLS denial and never retries the operation against local SQLite', async () => {
    const calls = [];
    globalThis.fetch = async (url, init = {}) => {
      calls.push({ url: String(url), init });
      if (String(url).includes('/auth/v1/token')) return jsonResponse(session);
      if (String(url).includes('/rpc/forge_storage_preflight')) {
        return jsonResponse({ schema_version: 'forge-byoc-v1' });
      }
      if (String(url).includes('/rest/v1/workspaces'))
        return jsonResponse({ message: 'denied' }, 403);
      throw new Error(`unexpected request ${String(url)}`);
    };

    configureStorage(profile);
    await signInSupabase('a@example.test', 'temporary-password');
    await inspectStorage();

    await assert.rejects(
      () => organizationApi.listWorkspaces(),
      (error) => {
        assert.equal(error.status, 403);
        return true;
      },
    );
    assert.equal(calls.filter(({ url }) => url.startsWith('/api/v1/')).length, 0);
  });

  it('keeps a user without workspace membership isolated from another user', async () => {
    const calls = [];
    const userBSession = {
      ...session,
      access_token: 'user-b-access-token',
      refresh_token: 'user-b-refresh-token',
      user: { id: 'user-b', email: 'b@example.test' },
    };
    globalThis.fetch = async (url, init = {}) => {
      calls.push({ url: String(url), init });
      if (String(url).includes('/auth/v1/token')) return jsonResponse(userBSession);
      if (String(url).includes('/rpc/forge_storage_preflight')) {
        return jsonResponse({ schema_version: 'forge-byoc-v1' });
      }
      if (String(url).includes('/rest/v1/workspaces')) return jsonResponse([]);
      throw new Error(`unexpected request ${String(url)}`);
    };

    configureStorage(profile);
    await signInSupabase('b@example.test', 'temporary-password');
    await inspectStorage();
    const workspaces = await organizationApi.listWorkspaces();

    assert.deepEqual(workspaces, []);
    const workspaceRead = calls.find(({ url }) => url.includes('/rest/v1/workspaces'));
    assert.equal(workspaceRead.init.headers.Authorization, 'Bearer user-b-access-token');
    assert.equal(calls.filter(({ url }) => url.startsWith('/api/v1/')).length, 0);
  });

  it('preserves cross-workspace denial instead of falling back or broadening the update', async () => {
    const calls = [];
    globalThis.fetch = async (url, init = {}) => {
      calls.push({ url: String(url), init });
      if (String(url).includes('/auth/v1/token')) return jsonResponse(session);
      if (String(url).includes('/rpc/forge_storage_preflight')) {
        return jsonResponse({ schema_version: 'forge-byoc-v1' });
      }
      if (String(url).includes('/rest/v1/projects'))
        return jsonResponse({ message: 'denied' }, 403);
      throw new Error(`unexpected request ${String(url)}`);
    };

    configureStorage(profile);
    await signInSupabase('a@example.test', 'temporary-password');
    await inspectStorage();

    await assert.rejects(
      () => organizationApi.updateProject('workspace-b', 'project-a', { name: 'Cross-workspace' }),
      (error) => {
        assert.equal(error.status, 403);
        return true;
      },
    );
    const updateCall = calls.find(
      ({ url, init }) => url.includes('/rest/v1/projects') && init.method === 'PATCH',
    );
    assert.ok(updateCall);
    assert.match(updateCall.url, /workspace_id=eq\.workspace-b/);
    assert.equal(calls.filter(({ url }) => url.startsWith('/api/v1/')).length, 0);
  });

  it('routes Project updates to the project row and preserves the vertical-slice contract', async () => {
    const calls = [];
    globalThis.fetch = async (url, init = {}) => {
      calls.push({ url: String(url), init });
      if (String(url).includes('/auth/v1/token')) return jsonResponse(session);
      if (String(url).includes('/rpc/forge_storage_preflight')) {
        return jsonResponse({ schema_version: 'forge-byoc-v1' });
      }
      if (String(url).includes('/rest/v1/projects')) {
        return jsonResponse([
          {
            id: 'project-a',
            workspace_id: 'workspace-a',
            name: 'Renamed project',
            description: null,
            status: 'active',
          },
        ]);
      }
      throw new Error(`unexpected request ${String(url)}`);
    };

    configureStorage(profile);
    await signInSupabase('a@example.test', 'temporary-password');
    await inspectStorage();
    const updated = await organizationApi.updateProject('workspace-a', 'project-a', {
      name: 'Renamed project',
    });

    assert.equal(updated.id, 'project-a');
    const updateCall = calls.find(
      ({ url, init }) => url.includes('/rest/v1/projects') && init.method === 'PATCH',
    );
    assert.ok(updateCall);
    assert.match(updateCall.url, /id=eq\.project-a/);
    assert.match(updateCall.url, /workspace_id=eq\.workspace-a/);
    assert.deepEqual(JSON.parse(updateCall.init.body), { name: 'Renamed project' });
    assert.equal(
      calls.some(({ url }) => url.startsWith('/api/v1/')),
      false,
    );
  });

  it('supports Epic and Feature creation/status updates through the same adapter', async () => {
    const calls = [];
    const epic = {
      id: 'epic-a',
      project_id: 'project-a',
      title: 'Cloud epic',
      description: null,
      status: 'backlog',
      priority: 'medium',
      tags: [],
    };
    const feature = {
      id: 'feature-a',
      project_id: 'project-a',
      epic_id: 'epic-a',
      title: 'Cloud story',
      status: 'backlog',
      priority: 'medium',
      kind: 'story',
      tags: [],
    };
    globalThis.fetch = async (url, init = {}) => {
      calls.push({ url: String(url), init });
      if (String(url).includes('/auth/v1/token')) return jsonResponse(session);
      if (String(url).includes('/rpc/forge_storage_preflight')) {
        return jsonResponse({ schema_version: 'forge-byoc-v1' });
      }
      if (String(url).includes('/rest/v1/epics') && init.method === 'POST') {
        return jsonResponse([epic]);
      }
      if (String(url).includes('/rest/v1/epics')) return jsonResponse([epic]);
      if (String(url).includes('/rest/v1/features') && init.method === 'POST') {
        return jsonResponse([feature]);
      }
      if (String(url).includes('/rest/v1/features')) return jsonResponse([feature]);
      throw new Error(`unexpected request ${String(url)}`);
    };

    configureStorage(profile);
    await signInSupabase('a@example.test', 'temporary-password');
    await inspectStorage();
    const createdEpic = await planningCapability.createEpic(
      'workspace-a',
      'project-a',
      'Cloud epic',
    );
    const createdFeature = await planningCapability.createFeature(
      'workspace-a',
      'project-a',
      'Cloud story',
      'epic-a',
    );
    const updatedFeature = await planningCapability.updateFeature(
      'workspace-a',
      'project-a',
      'feature-a',
      { status: 'done' },
    );

    assert.equal(createdEpic.id, 'epic-a');
    assert.equal(createdFeature.id, 'feature-a');
    assert.equal(updatedFeature.id, 'feature-a');
    const featureUpdate = calls.find(
      ({ url, init }) => url.includes('/rest/v1/features') && init.method === 'PATCH',
    );
    assert.ok(featureUpdate);
    assert.match(featureUpdate.url, /id=eq\.feature-a/);
    assert.deepEqual(JSON.parse(featureUpdate.init.body), { status: 'done' });
  });

  it('refreshes an expired session before the preflight or a data request', async () => {
    const authCalls = [];
    globalThis.fetch = async (url, init = {}) => {
      if (String(url).includes('/auth/v1/token')) {
        const body = JSON.parse(init.body);
        authCalls.push({ url: String(url), body });
        return jsonResponse(
          String(url).endsWith('?grant_type=password')
            ? { ...session, expires_in: 0 }
            : { ...session, access_token: 'refreshed-access-token', expires_in: 3600 },
        );
      }
      if (String(url).includes('/rpc/forge_storage_preflight')) {
        assert.equal(init.headers.Authorization, 'Bearer refreshed-access-token');
        return jsonResponse({ schema_version: 'forge-byoc-v1' });
      }
      if (String(url).includes('/rest/v1/workspaces')) {
        assert.equal(init.headers.Authorization, 'Bearer refreshed-access-token');
        return jsonResponse([]);
      }
      throw new Error(`unexpected request ${String(url)}`);
    };

    configureStorage(profile);
    await signInSupabase('a@example.test', 'temporary-password');
    await inspectStorage();
    await organizationApi.listWorkspaces();

    assert.deepEqual(authCalls, [
      {
        url: 'https://example123.supabase.co/auth/v1/token?grant_type=password',
        body: { email: 'a@example.test', password: 'temporary-password' },
      },
      {
        url: 'https://example123.supabase.co/auth/v1/token?grant_type=refresh_token',
        body: { refresh_token: 'user-refresh-token' },
      },
    ]);
  });

  it('reports a Supabase outage without switching providers', async () => {
    globalThis.fetch = async (url) => {
      if (String(url).includes('/auth/v1/token')) return jsonResponse(session);
      throw new Error('offline');
    };

    configureStorage(profile);
    await signInSupabase('a@example.test', 'temporary-password');
    const state = await inspectStorage();

    assert.equal(state.provider, 'supabase');
    assert.equal(state.status, 'network_unavailable');
    assert.equal(getStorageSnapshot().provider, 'supabase');
  });
});
