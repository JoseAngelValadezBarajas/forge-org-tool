import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import {
  configureStorage,
  getConfiguredStorageProviders,
  getStorageSnapshot,
  signInSupabase,
  switchStorageProvider,
  validateSupabaseProfile,
} from '../dist/index.js';
import { initializeStoredStorage, resetStorageForTests } from '../dist/storage.js';

const validProfile = {
  projectUrl: 'https://example123.supabase.co',
  publishableKey: 'sb_publishable_testkey123',
};

function memoryStorage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}

beforeEach(() => {
  globalThis.localStorage = memoryStorage();
  globalThis.sessionStorage = memoryStorage();
});

afterEach(() => {
  configureStorage({ provider: 'local' });
  delete globalThis.localStorage;
  delete globalThis.sessionStorage;
});

describe('BYOC storage contracts', () => {
  it('keeps local SQLite ready by default and does not require a cloud config', () => {
    configureStorage({ provider: 'local' });

    assert.deepEqual(getStorageSnapshot(), {
      provider: 'local',
      status: 'ready',
      message: 'Local SQLite is active.',
    });
  });

  it('accepts only a hosted Supabase URL and publishable key', () => {
    assert.deepEqual(validateSupabaseProfile(validProfile), {
      projectUrl: validProfile.projectUrl,
      publishableKey: validProfile.publishableKey,
    });

    for (const profile of [
      { ...validProfile, projectUrl: 'http://example123.supabase.co' },
      { ...validProfile, projectUrl: 'https://example123.supabase.co.evil.test' },
      { ...validProfile, projectUrl: 'https://user:pass@example123.supabase.co' },
      { ...validProfile, publishableKey: 'sb_secret_not_allowed' },
      { ...validProfile, publishableKey: 'service_role_key' },
    ]) {
      assert.throws(() => validateSupabaseProfile(profile), /Supabase/);
    }
  });

  it('does not silently fall back to SQLite when Supabase needs authentication', () => {
    configureStorage({ provider: 'supabase', ...validProfile });

    assert.deepEqual(getStorageSnapshot(), {
      provider: 'supabase',
      status: 'authentication_required',
      message: 'Sign in to the configured Supabase project.',
      projectUrl: validProfile.projectUrl,
    });
  });

  it('does not accept an invalid Supabase token response as a usable session', async () => {
    globalThis.fetch = async () =>
      new globalThis.Response(JSON.stringify({ access_token: 'not-a-session' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

    configureStorage({ provider: 'supabase', ...validProfile });
    await assert.rejects(
      () => signInSupabase('a@example.test', 'temporary-password'),
      /invalid authentication session/i,
    );
    assert.equal(getStorageSnapshot().status, 'authentication_required');
  });

  it('restores a same-profile session after reload and invalidates a changed project', async () => {
    const calls = [];
    globalThis.fetch = async (url, init = {}) => {
      calls.push({ url: String(url), init });
      if (String(url).includes('/auth/v1/token'))
        return new globalThis.Response(
          JSON.stringify({
            ...{
              access_token: 'user-access-token',
              refresh_token: 'user-refresh-token',
              expires_in: 3600,
              user: { id: 'user-a', email: 'a@example.test' },
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      if (String(url).includes('/rpc/forge_storage_preflight')) {
        assert.equal(init.headers.Authorization, 'Bearer user-access-token');
        return new globalThis.Response(JSON.stringify({ schema_version: 'forge-byoc-v1' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`unexpected request ${String(url)}`);
    };

    configureStorage({ provider: 'supabase', ...validProfile });
    await signInSupabase('a@example.test', 'temporary-password');

    resetStorageForTests({ preservePersisted: true });
    initializeStoredStorage();
    assert.equal(getStorageSnapshot().status, 'schema_missing');
    assert.equal(getStorageSnapshot().userEmail, 'a@example.test');
    const { inspectStorage } = await import('../dist/index.js');
    await inspectStorage();
    assert.equal(calls.filter(({ url }) => url.includes('/auth/v1/token')).length, 1);

    configureStorage({
      provider: 'supabase',
      projectUrl: 'https://other-project.supabase.co',
      publishableKey: validProfile.publishableKey,
    });
    assert.equal(getStorageSnapshot().status, 'authentication_required');
    resetStorageForTests({ preservePersisted: true });
    initializeStoredStorage();
    assert.equal(getStorageSnapshot().status, 'authentication_required');

    configureStorage({ provider: 'local' });
    assert.equal(getStorageSnapshot().provider, 'local');
    resetStorageForTests({ preservePersisted: true });
    initializeStoredStorage();
    assert.equal(getStorageSnapshot().provider, 'local');
  });

  it('restores a same-profile session from persistent storage when remember is enabled', async () => {
    globalThis.fetch = async (url) => {
      if (String(url).includes('/auth/v1/token')) {
        return new globalThis.Response(
          JSON.stringify({
            access_token: 'remembered-access-token',
            refresh_token: 'remembered-refresh-token',
            expires_in: 3600,
            user: { id: 'user-a', email: 'a@example.test' },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      throw new Error(`unexpected request ${String(url)}`);
    };

    configureStorage({ provider: 'supabase', ...validProfile, rememberSession: true });
    await signInSupabase('a@example.test', 'temporary-password');
    assert.ok(globalThis.localStorage.getItem('forge-supabase-session'));

    resetStorageForTests({ preservePersisted: true });
    globalThis.sessionStorage = memoryStorage();
    initializeStoredStorage();

    assert.equal(getStorageSnapshot().status, 'schema_missing');
    assert.equal(getStorageSnapshot().userEmail, 'a@example.test');
    assert.equal(getStorageSnapshot().rememberSession, true);
  });

  it('moves a remembered session to session storage when the preference is disabled', async () => {
    globalThis.fetch = async (url) => {
      if (String(url).includes('/auth/v1/token')) {
        return new globalThis.Response(
          JSON.stringify({
            access_token: 'remembered-access-token',
            refresh_token: 'remembered-refresh-token',
            expires_in: 3600,
            user: { id: 'user-a', email: 'a@example.test' },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      throw new Error(`unexpected request ${String(url)}`);
    };

    configureStorage({ provider: 'supabase', ...validProfile, rememberSession: true });
    await signInSupabase('a@example.test', 'temporary-password');
    configureStorage({ provider: 'supabase', ...validProfile, rememberSession: false });

    assert.equal(globalThis.localStorage.getItem('forge-supabase-session'), null);
    assert.ok(globalThis.sessionStorage.getItem('forge-supabase-session'));
    assert.equal(getStorageSnapshot().rememberSession, undefined);

    resetStorageForTests({ preservePersisted: true });
    globalThis.sessionStorage = memoryStorage();
    initializeStoredStorage();
    assert.equal(getStorageSnapshot().status, 'authentication_required');
  });

  it('allows the sign-in choice to enable persistent session storage', async () => {
    globalThis.fetch = async (url) => {
      if (String(url).includes('/auth/v1/token')) {
        return new globalThis.Response(
          JSON.stringify({
            access_token: 'remembered-access-token',
            refresh_token: 'remembered-refresh-token',
            expires_in: 3600,
            user: { id: 'user-a', email: 'a@example.test' },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      throw new Error(`unexpected request ${String(url)}`);
    };

    configureStorage({ provider: 'supabase', ...validProfile, rememberSession: false });
    await signInSupabase('a@example.test', 'temporary-password', true);

    assert.ok(globalThis.localStorage.getItem('forge-supabase-session'));
    assert.equal(globalThis.sessionStorage.getItem('forge-supabase-session'), null);
    assert.equal(getStorageSnapshot().rememberSession, true);
  });

  it('preserves configured providers while switching between local and Supabase', async () => {
    globalThis.fetch = async (url) => {
      if (String(url).includes('/auth/v1/token')) {
        return new globalThis.Response(
          JSON.stringify({
            access_token: 'switch-access-token',
            refresh_token: 'switch-refresh-token',
            expires_in: 3600,
            user: { id: 'user-a', email: 'a@example.test' },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      throw new Error(`unexpected request ${String(url)}`);
    };

    configureStorage({ provider: 'supabase', ...validProfile, rememberSession: true });
    await signInSupabase('a@example.test', 'temporary-password');
    assert.deepEqual(getConfiguredStorageProviders(), ['local', 'supabase']);

    switchStorageProvider('local');
    assert.equal(getStorageSnapshot().provider, 'local');
    assert.deepEqual(getConfiguredStorageProviders(), ['local', 'supabase']);

    resetStorageForTests({ preservePersisted: true });
    initializeStoredStorage();
    assert.equal(getStorageSnapshot().provider, 'local');

    switchStorageProvider('supabase');
    assert.equal(getStorageSnapshot().provider, 'supabase');
    assert.equal(getStorageSnapshot().userEmail, 'a@example.test');
  });

  it('does not switch to an unconfigured Supabase provider', () => {
    configureStorage({ provider: 'local' });

    assert.throws(() => switchStorageProvider('supabase'), /not configured/i);
    assert.equal(getStorageSnapshot().provider, 'local');
  });

  it('keeps direct local configuration as an explicit cloud reset', () => {
    configureStorage({ provider: 'supabase', ...validProfile });
    configureStorage({ provider: 'local' });

    assert.deepEqual(getConfiguredStorageProviders(), ['local']);
  });

  it('does not mark an unknown cloud schema version ready', async () => {
    globalThis.fetch = async (url) => {
      if (String(url).includes('/auth/v1/token')) {
        return new globalThis.Response(
          JSON.stringify({
            access_token: 'user-access-token',
            refresh_token: 'user-refresh-token',
            expires_in: 3600,
            user: { id: 'user-a', email: 'a@example.test' },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      return new globalThis.Response(JSON.stringify({ schema_version: 'forge-byoc-v99' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    configureStorage({ provider: 'supabase', ...validProfile });
    await signInSupabase('a@example.test', 'temporary-password');
    const { inspectStorage } = await import('../dist/index.js');
    const state = await inspectStorage();
    assert.equal(state.status, 'schema_missing');
  });
});
