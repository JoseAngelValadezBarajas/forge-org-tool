import { useState, type FormEvent } from 'react';
import { Button, Card, FormField, Input, StatusChip } from '@corefoundry-labs/forge-ui';
import {
  configureStorage,
  getStorageSnapshot,
  inspectStorage,
  signInSupabase,
  signOutSupabase,
  type StorageProvider,
  type StorageSnapshot,
} from '@forge-org/api-client';
import styles from './StorageSettings.module.css';

function toneFor(snapshot: StorageSnapshot): 'success' | 'warning' | 'danger' {
  if (snapshot.status === 'ready') return 'success';
  if (snapshot.status === 'authentication_required' || snapshot.status === 'schema_missing') {
    return 'warning';
  }
  return 'danger';
}

export function StorageSettings() {
  const initial = getStorageSnapshot();
  const [provider, setProvider] = useState<StorageProvider>(initial.provider);
  const [snapshot, setSnapshot] = useState<StorageSnapshot>(initial);
  const [projectUrl, setProjectUrl] = useState(initial.projectUrl ?? '');
  const [publishableKey, setPublishableKey] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function selectProvider(next: StorageProvider) {
    setProvider(next);
    setError('');
    if (next === 'local') {
      configureStorage({ provider: 'local' });
      setSnapshot(getStorageSnapshot());
    }
  }

  async function saveSupabase(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      configureStorage({ provider: 'supabase', projectUrl, publishableKey });
      setSnapshot(await inspectStorage());
      setPublishableKey('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Supabase configuration is invalid.');
    } finally {
      setBusy(false);
    }
  }

  async function signIn(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await signInSupabase(email, password);
      setPassword('');
      setSnapshot(await inspectStorage());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Supabase sign-in failed.');
    } finally {
      setBusy(false);
    }
  }

  async function refreshConnection() {
    setBusy(true);
    setError('');
    try {
      setSnapshot(await inspectStorage());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to verify Supabase storage.');
    } finally {
      setBusy(false);
    }
  }

  function signOut() {
    signOutSupabase();
    setSnapshot(getStorageSnapshot());
  }

  const cloudConfigured = provider === 'supabase';
  const needsSignIn = cloudConfigured && snapshot.status === 'authentication_required';

  return (
    <Card as="section" aria-labelledby="storage-settings-heading" className={styles.card}>
      <div className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>STORAGE</span>
          <h2 id="storage-settings-heading">Where FORGE stores your work</h2>
          <p>
            Local SQLite is private to this installation. Supabase is optional infrastructure owned
            and paid for by you.
          </p>
        </div>
        <StatusChip tone={toneFor(snapshot)}>{snapshot.status.replaceAll('_', ' ')}</StatusChip>
      </div>

      <fieldset className={styles.providers}>
        <legend>Storage provider</legend>
        <div className={styles.providerOption}>
          <input
            id="storage-provider-local"
            aria-label="Local SQLite"
            type="radio"
            name="storage-provider"
            value="local"
            checked={provider === 'local'}
            onChange={() => void selectProvider('local')}
          />
          <span>
            <strong>Local SQLite</strong>
            <small>Default. Existing data stays on this installation.</small>
          </span>
        </div>
        <div className={styles.providerOption}>
          <input
            id="storage-provider-supabase"
            aria-label="Supabase"
            type="radio"
            name="storage-provider"
            value="supabase"
            checked={provider === 'supabase'}
            onChange={() => void selectProvider('supabase')}
          />
          <span>
            <strong>Supabase</strong>
            <small>
              Use a project you own to share authorized workspaces between installations.
            </small>
          </span>
        </div>
        <p className={styles.future}>Firebase · Coming later</p>
      </fieldset>

      <p className={styles.status} role="status">
        {snapshot.message}
        {snapshot.projectUrl && <span> · {snapshot.projectUrl}</span>}
      </p>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      {cloudConfigured && (
        <div className={styles.cloudPanel}>
          <form onSubmit={(event) => void saveSupabase(event)} className={styles.form}>
            <FormField label="Supabase project URL">
              <Input
                aria-label="Supabase project URL"
                type="url"
                value={projectUrl}
                onChange={(event) => setProjectUrl(event.target.value)}
                placeholder="https://your-project.supabase.co"
                required
              />
            </FormField>
            <FormField label="Supabase publishable key">
              <Input
                aria-label="Supabase publishable key"
                type="password"
                value={publishableKey}
                onChange={(event) => setPublishableKey(event.target.value)}
                placeholder="sb_publishable_…"
                autoComplete="off"
                required={!snapshot.projectUrl}
              />
            </FormField>
            <p className={styles.help}>
              Only the public <code>sb_publishable_*</code> key is accepted. Never enter a secret,
              service-role key or PostgreSQL password.
            </p>
            <Button type="submit" disabled={busy || !publishableKey}>
              Save Supabase settings
            </Button>
          </form>

          {needsSignIn && (
            <form onSubmit={(event) => void signIn(event)} className={styles.form}>
              <h3>Sign in to your Supabase project</h3>
              <p className={styles.help}>
                Your password is sent only to Supabase Auth and is never saved by FORGE.
              </p>
              <FormField label="Supabase email">
                <Input
                  aria-label="Supabase email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="username"
                  required
                />
              </FormField>
              <FormField label="Supabase password">
                <Input
                  aria-label="Supabase password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                />
              </FormField>
              <Button type="submit" disabled={busy}>
                Sign in to Supabase
              </Button>
            </form>
          )}

          <div className={styles.actions}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void refreshConnection()}
              disabled={busy}
            >
              Refresh connection
            </Button>
            {snapshot.userEmail && (
              <Button type="button" variant="ghost" onClick={signOut}>
                Sign out {snapshot.userEmail}
              </Button>
            )}
          </div>
          <p className={styles.warning}>
            Switching providers does not copy, merge or delete data. Export or back up local data
            separately before making a deliberate change.
          </p>
        </div>
      )}
    </Card>
  );
}
