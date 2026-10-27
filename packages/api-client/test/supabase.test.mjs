import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { createHash } from 'node:crypto';
import { strToU8, zipSync } from 'fflate';
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
  delete globalThis.window;
});

describe('Supabase Data API adapter', () => {
  it('preflights Auth, schema and permissions before exposing ready', async () => {
    const calls = [];
    const storageEvents = [];
    globalThis.window = {
      dispatchEvent(event) {
        storageEvents.push(event.type);
      },
    };
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
    assert.equal(storageEvents.at(-1), 'forge:storage-changed');
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

  it('routes workspace deletion through the owner-only RPC', async () => {
    const calls = [];
    globalThis.fetch = async (url, init = {}) => {
      calls.push({ url: String(url), init });
      if (String(url).includes('/auth/v1/token')) return jsonResponse(session);
      if (String(url).includes('/rpc/forge_storage_preflight')) {
        return jsonResponse({ schema_version: 'forge-byoc-v2' });
      }
      if (String(url).includes('/rpc/forge_delete_workspace')) {
        return new globalThis.Response(null, { status: 204 });
      }
      throw new Error(`unexpected request ${String(url)}`);
    };

    configureStorage(profile);
    await signInSupabase('a@example.test', 'temporary-password');
    await inspectStorage();
    await organizationApi.deleteWorkspace('workspace-a');

    const deletion = calls.find(({ url }) => url.includes('/rpc/forge_delete_workspace'));
    assert.ok(deletion);
    assert.deepEqual(JSON.parse(deletion.init.body), { p_workspace_id: 'workspace-a' });
    assert.equal(deletion.init.headers.Authorization, 'Bearer user-access-token');
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

  it('routes the complete planning capability surface through Supabase', async () => {
    const calls = [];
    const task = {
      id: 'task-a',
      feature_id: 'feature-a',
      title: 'Cloud task',
      description: null,
      status: 'todo',
      position: 0,
    };
    const criterion = {
      id: 'criterion-a',
      feature_id: 'feature-a',
      description: 'Cloud criterion',
      satisfied: false,
      position: 0,
    };
    const dependency = {
      id: 'dependency-a',
      project_id: 'project-a',
      blocking_feature_id: 'feature-a',
      blocked_feature_id: 'feature-b',
    };
    globalThis.fetch = async (url, init = {}) => {
      calls.push({ url: String(url), init });
      if (String(url).includes('/auth/v1/token')) return jsonResponse(session);
      if (String(url).includes('/rpc/forge_storage_preflight'))
        return jsonResponse({ schema_version: 'forge-byoc-v2' });
      if (String(url).includes('/rpc/forge_reorder_tasks')) return jsonResponse([task]);
      if (String(url).includes('/rpc/forge_reorder_criteria')) return jsonResponse([criterion]);
      if (String(url).includes('/rpc/forge_create_dependency')) return jsonResponse(dependency);
      if (String(url).includes('/rest/v1/tasks')) return jsonResponse([task]);
      if (String(url).includes('/rest/v1/acceptance_criteria')) return jsonResponse([criterion]);
      if (String(url).includes('/rest/v1/feature_dependencies')) return jsonResponse([dependency]);
      throw new Error(`unexpected request ${String(url)}`);
    };

    configureStorage(profile);
    await signInSupabase('a@example.test', 'temporary-password');
    await inspectStorage();

    await organizationApi.listTasks('workspace-a', 'project-a', 'feature-a');
    await organizationApi.createTask('workspace-a', 'project-a', 'feature-a', 'Cloud task');
    await organizationApi.updateTask('workspace-a', 'project-a', 'feature-a', 'task-a', {
      status: 'done',
    });
    await organizationApi.reorderTasks('workspace-a', 'project-a', 'feature-a', ['task-a']);
    await organizationApi.listCriteria('workspace-a', 'project-a', 'feature-a');
    await organizationApi.createCriterion(
      'workspace-a',
      'project-a',
      'feature-a',
      'Cloud criterion',
    );
    await organizationApi.updateCriterion('workspace-a', 'project-a', 'feature-a', 'criterion-a', {
      satisfied: true,
    });
    await organizationApi.reorderCriteria('workspace-a', 'project-a', 'feature-a', ['criterion-a']);
    await organizationApi.listDependencies('workspace-a', 'project-a');
    await organizationApi.createDependency('workspace-a', 'project-a', 'feature-a', 'feature-b');
    await organizationApi.deleteDependency('workspace-a', 'project-a', 'dependency-a');

    assert.ok(calls.some(({ url }) => url.includes('/rest/v1/tasks')));
    assert.ok(calls.some(({ url }) => url.includes('/rest/v1/acceptance_criteria')));
    assert.ok(calls.some(({ url }) => url.includes('/rest/v1/feature_dependencies')));
    assert.equal(calls.filter(({ url }) => url.includes('/rpc/forge_reorder_tasks')).length, 1);
    assert.equal(calls.filter(({ url }) => url.includes('/rpc/forge_reorder_criteria')).length, 1);
    const dependencyCall = calls.find(({ url }) => url.includes('/rpc/forge_create_dependency'));
    assert.deepEqual(JSON.parse(dependencyCall.init.body), {
      p_project_id: 'project-a',
      p_blocking_feature_id: 'feature-a',
      p_blocked_feature_id: 'feature-b',
    });
  });

  it('uses private Supabase Storage for Bug screenshots and never a public URL', async () => {
    const calls = [];
    const png =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
    const expectedBytes = globalThis.Buffer.from(png, 'base64');
    const expectedHash = createHash('sha256').update(expectedBytes).digest('hex');
    globalThis.fetch = async (url, init = {}) => {
      calls.push({ url: String(url), init });
      if (String(url).includes('/auth/v1/token')) return jsonResponse(session);
      if (String(url).includes('/rpc/forge_storage_preflight'))
        return jsonResponse({ schema_version: 'forge-byoc-v2' });
      if (String(url).includes('/storage/v1/object/forge-bug-attachments/'))
        return jsonResponse({ Key: 'stored' }, 200);
      if (String(url).includes('/rest/v1/bug_attachments') && init.method === 'POST')
        return jsonResponse([
          {
            id: 'attachment-a',
            feature_id: 'feature-a',
            file_name: 'screen.png',
            content_type: 'image/png',
            byte_size: expectedBytes.length,
            sha256: expectedHash,
            storage_path: 'workspace-a/project-a/feature-a/attachment-a-screen.png',
          },
        ]);
      if (String(url).includes('/rest/v1/bug_attachments'))
        return jsonResponse([
          {
            id: 'attachment-a',
            feature_id: 'feature-a',
            file_name: 'screen.png',
            content_type: 'image/png',
            byte_size: expectedBytes.length,
            sha256: expectedHash,
            storage_path: 'workspace-a/project-a/feature-a/attachment-a-screen.png',
          },
        ]);
      if (String(url).includes('/storage/v1/object/authenticated/'))
        return new globalThis.Response(expectedBytes, {
          status: 200,
          headers: { 'Content-Type': 'image/png' },
        });
      throw new Error(`unexpected request ${String(url)}`);
    };

    configureStorage(profile);
    await signInSupabase('a@example.test', 'temporary-password');
    await inspectStorage();
    await organizationApi.uploadBugAttachment('workspace-a', 'project-a', 'feature-a', {
      file_name: 'screen.png',
      content_type: 'image/png',
      data_base64: png,
    });
    await organizationApi.listBugAttachments('workspace-a', 'project-a', 'feature-a');
    const content = await organizationApi.getBugAttachmentContent(
      'workspace-a',
      'project-a',
      'feature-a',
      'attachment-a',
    );

    assert.equal(content.size, expectedBytes.length);
    assert.ok(calls.some(({ url }) => url.includes('/storage/v1/object/forge-bug-attachments/')));
    assert.ok(calls.some(({ url }) => url.includes('/storage/v1/object/authenticated/')));
    assert.equal(
      calls.some(({ url }) => url.includes('/storage/v1/object/public/')),
      false,
    );
  });

  it('uses versioned RPCs for JSON and ZIP transfer instead of FastAPI', async () => {
    const calls = [];
    globalThis.fetch = async (url, init = {}) => {
      calls.push({ url: String(url), init });
      if (String(url).includes('/auth/v1/token')) return jsonResponse(session);
      if (String(url).includes('/rpc/forge_storage_preflight'))
        return jsonResponse({ schema_version: 'forge-byoc-v2' });
      if (String(url).includes('/rpc/forge_transfer_preview'))
        return jsonResponse({
          schema_version: 'forge-project-transfer-v2',
          fingerprint: 'transfer-fingerprint',
          project: { name: 'Imported' },
          counts: { epics: 1, features: 1, tasks: 0, acceptance_criteria: 0, dependencies: 0 },
        });
      if (String(url).includes('/rpc/forge_transfer_commit'))
        return jsonResponse({
          schema_version: 'forge-project-transfer-v2',
          project_id: 'project-imported',
          import_id: 'import-a',
          fingerprint: 'transfer-fingerprint',
          references: [],
          counts: { epics: 1, features: 1, tasks: 0, acceptance_criteria: 0, dependencies: 0 },
        });
      if (String(url).includes('/rpc/forge_finalize_import')) return jsonResponse({});
      if (String(url).includes('/rpc/forge_transfer_export'))
        return jsonResponse({
          schema_version: 'forge-project-transfer-v2',
          project: { name: 'Exported' },
        });
      if (String(url).includes('/rest/v1/features')) return jsonResponse([]);
      throw new Error(`unexpected request ${String(url)}`);
    };

    configureStorage(profile);
    await signInSupabase('a@example.test', 'temporary-password');
    await inspectStorage();
    const document = { schema_version: 'forge-project-transfer-v2', project: { name: 'Imported' } };
    await organizationApi.previewProjectImport('workspace-a', document);
    await organizationApi.importProject('workspace-a', document, 'transfer-fingerprint');
    await organizationApi.exportProject('workspace-a', 'project-a', 'forge-project-transfer-v2');
    await organizationApi.exportProjectPackage('workspace-a', 'project-a');

    assert.equal(
      calls.some(({ url }) => url.startsWith('/api/v1/')),
      false,
    );
    assert.ok(calls.some(({ url }) => url.includes('/rpc/forge_transfer_preview')));
    assert.ok(calls.some(({ url }) => url.includes('/rpc/forge_transfer_commit')));
    const finalizeCall = calls.find(({ url }) => url.includes('/rpc/forge_finalize_import'));
    assert.deepEqual(JSON.parse(finalizeCall.init.body), {
      p_workspace_id: 'workspace-a',
      p_import_id: 'import-a',
      p_project_id: 'project-imported',
    });
    assert.ok(calls.some(({ url }) => url.includes('/rpc/forge_transfer_export')));
    assert.ok(calls.some(({ url }) => url.includes('/rpc/forge_transfer_export')));
  });

  it('compensates a provisional JSON import when finalization fails', async () => {
    const calls = [];
    globalThis.fetch = async (url, init = {}) => {
      calls.push({ url: String(url), init });
      if (String(url).includes('/auth/v1/token')) return jsonResponse(session);
      if (String(url).includes('/rpc/forge_storage_preflight'))
        return jsonResponse({ schema_version: 'forge-byoc-v2' });
      if (String(url).includes('/rpc/forge_transfer_commit'))
        return jsonResponse({ project_id: 'project-imported', import_id: 'import-a' });
      if (String(url).includes('/rpc/forge_finalize_import'))
        return jsonResponse({ message: 'finalization unavailable' }, 503);
      if (String(url).includes('/rpc/forge_delete_imported_project')) return jsonResponse({});
      throw new Error(`unexpected request ${String(url)}`);
    };

    configureStorage(profile);
    await signInSupabase('a@example.test', 'temporary-password');
    await inspectStorage();
    await assert.rejects(
      () =>
        organizationApi.importProject(
          'workspace-a',
          { schema_version: 'forge-project-transfer-v2', project: { name: 'Imported' } },
          'transfer-fingerprint',
        ),
      /finalization unavailable/i,
    );

    const deleteCall = calls.find(({ url }) => url.includes('/rpc/forge_delete_imported_project'));
    assert.deepEqual(JSON.parse(deleteCall.init.body), {
      p_workspace_id: 'workspace-a',
      p_import_id: 'import-a',
      p_project_id: 'project-imported',
    });
  });

  it('routes contextual transfer preview, commit and export through Supabase RPCs', async () => {
    const calls = [];
    const document = {
      schema_version: 'forge-project-transfer-v2',
      project: { name: 'Contextual import' },
      epics: [],
      features: [{ ref: 'feature:001', title: 'Story', tasks: [], acceptance_criteria: [] }],
      dependencies: [],
    };
    globalThis.fetch = async (url, init = {}) => {
      calls.push({ url: String(url), init });
      if (String(url).includes('/auth/v1/token')) return jsonResponse(session);
      if (String(url).includes('/rpc/forge_storage_preflight'))
        return jsonResponse({ schema_version: 'forge-byoc-v2' });
      if (String(url).includes('/rpc/forge_transfer_contextual_preview'))
        return jsonResponse({
          schema_version: 'forge-project-transfer-v2',
          fingerprint: 'contextual-fingerprint',
          destination: { scope: 'work-items', id: 'epic-a' },
          counts: { epics: 0, features: 1, tasks: 0, acceptance_criteria: 0, dependencies: 0 },
        });
      if (String(url).includes('/rpc/forge_transfer_contextual_commit'))
        return jsonResponse({
          project_id: 'project-a',
          fingerprint: 'contextual-fingerprint',
          references: [],
        });
      if (String(url).includes('/rpc/forge_transfer_contextual_export'))
        return jsonResponse(document);
      throw new Error(`unexpected request ${String(url)}`);
    };

    configureStorage(profile);
    await signInSupabase('a@example.test', 'temporary-password');
    await inspectStorage();
    await organizationApi.previewContextualImport(
      'workspace-a',
      'project-a',
      'work-items',
      'epic-a',
      document,
    );
    await organizationApi.importContextual(
      'workspace-a',
      'project-a',
      'work-items',
      'epic-a',
      document,
      'contextual-fingerprint',
    );
    await organizationApi.exportContextual('workspace-a', 'project-a', 'work-items', 'epic-a');

    const previewCall = calls.find(({ url }) =>
      url.includes('/rpc/forge_transfer_contextual_preview'),
    );
    assert.deepEqual(JSON.parse(previewCall.init.body), {
      p_workspace_id: 'workspace-a',
      p_project_id: 'project-a',
      p_scope: 'work-items',
      p_destination_id: 'epic-a',
      p_document: document,
    });
    assert.equal(calls.filter(({ url }) => url.startsWith('/api/v1/')).length, 0);
  });

  it('validates a ZIP manifest and stages screenshot bytes through private Storage', async () => {
    const calls = [];
    const png = Uint8Array.from([
      0x89,
      0x50,
      0x4e,
      0x47,
      0x0d,
      0x0a,
      0x1a,
      0x0a,
      ...new Uint8Array(32),
    ]);
    const attachmentPath = 'attachments/feature-001/attachment-001.png';
    const sha256 = createHash('sha256').update(png).digest('hex');
    const manifest = {
      schema_version: 'forge-project-transfer-v2',
      project: { name: 'ZIP import' },
      epics: [],
      features: [
        {
          ref: 'feature:001',
          title: 'Imported Bug',
          kind: 'bug',
          tasks: [],
          acceptance_criteria: [],
          attachments: [
            {
              path: attachmentPath,
              file_name: 'screen.png',
              content_type: 'image/png',
              byte_size: png.byteLength,
              sha256,
            },
          ],
        },
      ],
      dependencies: [],
    };
    const archive = zipSync({
      'manifest.json': strToU8(JSON.stringify(manifest)),
      [attachmentPath]: png,
    });
    const archiveBase64 = globalThis.Buffer.from(archive).toString('base64');
    globalThis.fetch = async (url, init = {}) => {
      calls.push({ url: String(url), init });
      if (String(url).includes('/auth/v1/token')) return jsonResponse(session);
      if (String(url).includes('/rpc/forge_storage_preflight'))
        return jsonResponse({ schema_version: 'forge-byoc-v2' });
      if (String(url).includes('/rpc/forge_transfer_preview'))
        return jsonResponse({
          schema_version: 'forge-project-transfer-v2',
          fingerprint: 'zip-fingerprint',
          project: { name: 'ZIP import' },
          counts: { epics: 0, features: 1, tasks: 0, acceptance_criteria: 0, dependencies: 0 },
        });
      if (String(url).includes('/rpc/forge_transfer_commit'))
        return jsonResponse({
          schema_version: 'forge-project-transfer-v2',
          project_id: 'project-imported',
          import_id: 'import-a',
          fingerprint: 'zip-fingerprint',
          references: [{ ref: 'feature:001', generated_id: 'feature-imported' }],
          counts: { epics: 0, features: 1, tasks: 0, acceptance_criteria: 0, dependencies: 0 },
        });
      if (String(url).includes('/rpc/forge_finalize_import')) return jsonResponse({});
      if (String(url).includes('/storage/v1/object/forge-bug-attachments/'))
        return jsonResponse({ Key: 'stored' });
      if (String(url).includes('/storage/v1/object/authenticated/'))
        return new globalThis.Response(png, {
          status: 200,
          headers: { 'Content-Type': 'image/png' },
        });
      if (String(url).includes('/rest/v1/bug_attachments')) return jsonResponse([{}]);
      throw new Error(`unexpected request ${String(url)}`);
    };

    configureStorage(profile);
    await signInSupabase('a@example.test', 'temporary-password');
    await inspectStorage();
    const preview = await organizationApi.previewProjectPackageImport('workspace-a', archiveBase64);
    assert.equal(preview.counts.attachments, 1);
    await organizationApi.importProjectPackage('workspace-a', archiveBase64, preview.fingerprint);

    assert.ok(calls.some(({ url }) => url.includes('/rpc/forge_transfer_commit')));
    assert.ok(calls.some(({ url }) => url.includes('/rpc/forge_finalize_import')));
    assert.ok(calls.some(({ url }) => url.includes('/storage/v1/object/forge-bug-attachments/')));
    assert.equal(
      calls.some(({ url }) => url.startsWith('/api/v1/')),
      false,
    );
  });

  it('uses the actor-bound import session when ZIP attachment staging fails', async () => {
    const calls = [];
    const png = Uint8Array.from([
      0x89,
      0x50,
      0x4e,
      0x47,
      0x0d,
      0x0a,
      0x1a,
      0x0a,
      ...new Uint8Array(32),
    ]);
    const attachmentPath = 'attachments/feature-001/attachment-001.png';
    const sha256 = createHash('sha256').update(png).digest('hex');
    const manifest = {
      schema_version: 'forge-project-transfer-v2',
      project: { name: 'ZIP compensation' },
      epics: [],
      features: [
        {
          ref: 'feature:001',
          title: 'Imported Bug',
          kind: 'bug',
          tasks: [],
          acceptance_criteria: [],
          attachments: [
            {
              path: attachmentPath,
              file_name: 'screen.png',
              content_type: 'image/png',
              byte_size: png.byteLength,
              sha256,
            },
          ],
        },
      ],
      dependencies: [],
    };
    const archiveBase64 = globalThis.Buffer.from(
      zipSync({
        'manifest.json': strToU8(JSON.stringify(manifest)),
        [attachmentPath]: png,
      }),
    ).toString('base64');
    globalThis.fetch = async (url, init = {}) => {
      calls.push({ url: String(url), init });
      if (String(url).includes('/auth/v1/token')) return jsonResponse(session);
      if (String(url).includes('/rpc/forge_storage_preflight'))
        return jsonResponse({ schema_version: 'forge-byoc-v2' });
      if (String(url).includes('/rpc/forge_transfer_preview'))
        return jsonResponse({
          schema_version: 'forge-project-transfer-v2',
          fingerprint: 'zip-fingerprint',
          project: { name: 'ZIP compensation' },
          counts: { epics: 0, features: 1, tasks: 0, acceptance_criteria: 0, dependencies: 0 },
        });
      if (String(url).includes('/rpc/forge_transfer_commit'))
        return jsonResponse({
          schema_version: 'forge-project-transfer-v2',
          project_id: 'project-imported',
          import_id: 'import-a',
          fingerprint: 'zip-fingerprint',
          references: [{ ref: 'feature:001', generated_id: 'feature-imported' }],
          counts: { epics: 0, features: 1, tasks: 0, acceptance_criteria: 0, dependencies: 0 },
        });
      if (String(url).includes('/storage/v1/object/authenticated/'))
        return new globalThis.Response(new Uint8Array([1, 2, 3]), {
          status: 200,
          headers: { 'Content-Type': 'image/png' },
        });
      if (String(url).includes('/storage/v1/object/forge-bug-attachments/'))
        return jsonResponse({ Key: 'stored' });
      if (String(url).includes('/rpc/forge_delete_imported_project')) return jsonResponse({});
      throw new Error(`unexpected request ${String(url)} ${init.method ?? 'GET'}`);
    };

    configureStorage(profile);
    await signInSupabase('a@example.test', 'temporary-password');
    await inspectStorage();
    const preview = await organizationApi.previewProjectPackageImport('workspace-a', archiveBase64);
    await assert.rejects(
      () => organizationApi.importProjectPackage('workspace-a', archiveBase64, preview.fingerprint),
      /does not match attachment metadata/i,
    );

    const deleteCall = calls.find(({ url }) => url.includes('/rpc/forge_delete_imported_project'));
    assert.deepEqual(JSON.parse(deleteCall.init.body), {
      p_workspace_id: 'workspace-a',
      p_import_id: 'import-a',
      p_project_id: 'project-imported',
    });
    assert.equal(
      calls.some(({ url }) => url.includes('/rpc/forge_finalize_import')),
      false,
    );
  });

  it('rejects a ZIP whose declared expansion exceeds the decompression budget before extraction', async () => {
    const archive = zipSync({ 'bomb.bin': new Uint8Array(26 * 1024 * 1024) });
    const archiveBase64 = globalThis.Buffer.from(archive).toString('base64');
    globalThis.fetch = async (url) => {
      if (String(url).includes('/auth/v1/token')) return jsonResponse(session);
      if (String(url).includes('/rpc/forge_storage_preflight'))
        return jsonResponse({ schema_version: 'forge-byoc-v2' });
      throw new Error(`unexpected request ${String(url)}`);
    };

    configureStorage(profile);
    await signInSupabase('a@example.test', 'temporary-password');
    await inspectStorage();
    await assert.rejects(
      () => organizationApi.previewProjectPackageImport('workspace-a', archiveBase64),
      /decompression budget/i,
    );
  });

  it('rejects Storage content that disagrees with attachment metadata', async () => {
    const png =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
    const expectedBytes = globalThis.Buffer.from(png, 'base64');
    const expectedHash = createHash('sha256').update(expectedBytes).digest('hex');
    globalThis.fetch = async (url, init = {}) => {
      if (String(url).includes('/auth/v1/token')) return jsonResponse(session);
      if (String(url).includes('/rpc/forge_storage_preflight'))
        return jsonResponse({ schema_version: 'forge-byoc-v2' });
      if (String(url).includes('/rest/v1/bug_attachments'))
        return jsonResponse([
          {
            id: 'attachment-a',
            feature_id: 'feature-a',
            file_name: 'screen.png',
            content_type: 'image/png',
            byte_size: expectedBytes.length,
            sha256: expectedHash,
            storage_path: 'workspace-a/project-a/feature-a/attachment-a-screen.png',
          },
        ]);
      if (String(url).includes('/storage/v1/object/authenticated/'))
        return new globalThis.Response(new Uint8Array([1, 2, 3]), {
          status: 200,
          headers: { 'Content-Type': 'image/png' },
        });
      throw new Error(`unexpected request ${String(url)} ${init.method ?? 'GET'}`);
    };

    configureStorage(profile);
    await signInSupabase('a@example.test', 'temporary-password');
    await inspectStorage();
    await assert.rejects(
      () =>
        organizationApi.getBugAttachmentContent(
          'workspace-a',
          'project-a',
          'feature-a',
          'attachment-a',
        ),
      /does not match attachment metadata/i,
    );
  });

  it('does not create attachment metadata when uploaded Storage bytes fail verification', async () => {
    const calls = [];
    const png =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
    globalThis.fetch = async (url, init = {}) => {
      calls.push({ url: String(url), init });
      if (String(url).includes('/auth/v1/token')) return jsonResponse(session);
      if (String(url).includes('/rpc/forge_storage_preflight'))
        return jsonResponse({ schema_version: 'forge-byoc-v2' });
      if (String(url).includes('/rest/v1/bug_attachments') && init.method === 'POST')
        throw new Error('attachment metadata must not be written');
      if (String(url).includes('/rest/v1/bug_attachments')) return jsonResponse([]);
      if (String(url).includes('/storage/v1/object/authenticated/'))
        return new globalThis.Response(new Uint8Array([1, 2, 3]), {
          status: 200,
          headers: { 'Content-Type': 'image/png' },
        });
      if (String(url).includes('/storage/v1/object/forge-bug-attachments/'))
        return jsonResponse({ Key: 'stored' });
      throw new Error(`unexpected request ${String(url)} ${init.method ?? 'GET'}`);
    };

    configureStorage(profile);
    await signInSupabase('a@example.test', 'temporary-password');
    await inspectStorage();
    await assert.rejects(
      () =>
        organizationApi.uploadBugAttachment('workspace-a', 'project-a', 'feature-a', {
          file_name: 'screen.png',
          content_type: 'image/png',
          data_base64: png,
        }),
      /does not match attachment metadata/i,
    );
    assert.equal(
      calls.some(
        ({ url, init }) => url.includes('/rest/v1/bug_attachments') && init.method === 'POST',
      ),
      false,
    );
    assert.ok(
      calls.some(
        ({ url, init }) =>
          url.includes('/storage/v1/object/forge-bug-attachments/') && init.method === 'DELETE',
      ),
    );
  });

  it('rejects malformed ZIP feature entries as a controlled client error', async () => {
    const archive = zipSync({
      'manifest.json': strToU8(
        JSON.stringify({
          schema_version: 'forge-project-transfer-v2',
          project: { name: 'Invalid ZIP' },
          epics: [],
          features: [null],
          dependencies: [],
        }),
      ),
    });
    const archiveBase64 = globalThis.Buffer.from(archive).toString('base64');
    globalThis.fetch = async (url) => {
      if (String(url).includes('/auth/v1/token')) return jsonResponse(session);
      if (String(url).includes('/rpc/forge_storage_preflight'))
        return jsonResponse({ schema_version: 'forge-byoc-v2' });
      throw new Error(`unexpected request ${String(url)}`);
    };

    configureStorage(profile);
    await signInSupabase('a@example.test', 'temporary-password');
    await inspectStorage();
    await assert.rejects(
      () => organizationApi.previewProjectPackageImport('workspace-a', archiveBase64),
      /features must be objects/i,
    );
  });
});
