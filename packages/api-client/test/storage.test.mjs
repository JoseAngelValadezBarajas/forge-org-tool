import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import {
  configureStorage,
  getStorageSnapshot,
  signInSupabase,
  validateSupabaseProfile,
} from '../dist/index.js';

const validProfile = {
  projectUrl: 'https://example123.supabase.co',
  publishableKey: 'sb_publishable_testkey123',
};

afterEach(() => {
  configureStorage({ provider: 'local' });
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
});
