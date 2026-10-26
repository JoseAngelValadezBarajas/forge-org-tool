import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { configureStorage, getStorageSnapshot, validateSupabaseProfile } from '../dist/index.js';

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
});
