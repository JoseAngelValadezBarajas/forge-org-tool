import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StorageSettings } from './StorageSettings';

type MockSnapshot = {
  provider: 'local' | 'supabase';
  status: string;
  message: string;
  projectUrl?: string;
};

const storageMock = vi.hoisted(() => {
  let snapshot: MockSnapshot = {
    provider: 'local',
    status: 'ready',
    message: 'Local SQLite is active.',
  };
  return {
    snapshot: () => snapshot,
    reset: () => {
      snapshot = {
        provider: 'local',
        status: 'ready',
        message: 'Local SQLite is active.',
      };
    },
    configureStorage: vi.fn((config: { provider: string }) => {
      snapshot =
        config.provider === 'local'
          ? { provider: 'local', status: 'ready', message: 'Local SQLite is active.' }
          : {
              provider: 'supabase',
              status: 'authentication_required',
              message: 'Sign in to the configured Supabase project.',
              projectUrl: 'https://example123.supabase.co',
            };
    }),
    inspectStorage: vi.fn(async () => snapshot),
    signInSupabase: vi.fn(async () => snapshot),
    signOutSupabase: vi.fn(),
    validateSupabaseProfile: vi.fn(
      (profile: { projectUrl: string; publishableKey: string }) => profile,
    ),
  };
});

vi.mock('@forge-org/api-client', () => ({
  configureStorage: storageMock.configureStorage,
  getStorageSnapshot: storageMock.snapshot,
  inspectStorage: storageMock.inspectStorage,
  signInSupabase: storageMock.signInSupabase,
  signOutSupabase: storageMock.signOutSupabase,
}));

afterEach(() => {
  cleanup();
  storageMock.reset();
  delete (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
  vi.clearAllMocks();
});

describe('StorageSettings', () => {
  it('shows local SQLite as the default and exposes Firebase only as future work', () => {
    render(<StorageSettings />);

    expect(screen.getByText('Local SQLite is active.')).toBeInTheDocument();
    expect(screen.getByText(/Firebase/)).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Local SQLite/ })).toBeChecked();
  });

  it('makes local SQLite unavailable in the Android shell', () => {
    Object.defineProperty(window, '__TAURI_INTERNALS__', {
      configurable: true,
      value: { invoke: vi.fn() },
    });
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: 'Mozilla/5.0 (Linux; Android 14; Pixel 8)',
    });

    render(<StorageSettings />);

    expect(screen.getByRole('radio', { name: /Local SQLite/ })).toBeDisabled();
    expect(
      screen.getByText(/Unavailable in Android. Configure Supabase cloud storage/),
    ).toBeInTheDocument();
  });

  it('configures Supabase without presenting ready before authentication', async () => {
    render(<StorageSettings />);

    fireEvent.click(screen.getByRole('radio', { name: /Supabase/ }));
    fireEvent.change(screen.getByLabelText('Supabase project URL'), {
      target: { value: 'https://example123.supabase.co' },
    });
    fireEvent.change(screen.getByLabelText('Supabase publishable key'), {
      target: { value: 'sb_publishable_testkey123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save Supabase settings' }));

    await waitFor(() =>
      expect(storageMock.configureStorage).toHaveBeenCalledWith({
        provider: 'supabase',
        projectUrl: 'https://example123.supabase.co',
        publishableKey: 'sb_publishable_testkey123',
        rememberSession: false,
      }),
    );
    expect(
      await screen.findByText('Sign in to the configured Supabase project.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Supabase storage is ready.')).not.toBeInTheDocument();
  });

  it('offers sign-in and explicit preflight refresh for the configured project', async () => {
    render(<StorageSettings />);
    fireEvent.click(screen.getByRole('radio', { name: /Supabase/ }));
    fireEvent.change(screen.getByLabelText('Supabase project URL'), {
      target: { value: 'https://example123.supabase.co' },
    });
    fireEvent.change(screen.getByLabelText('Supabase publishable key'), {
      target: { value: 'sb_publishable_testkey123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save Supabase settings' }));
    fireEvent.change(await screen.findByLabelText('Supabase email'), {
      target: { value: 'a@example.test' },
    });
    fireEvent.change(screen.getByLabelText('Supabase password'), {
      target: { value: 'temporary-password' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in to Supabase' }));

    await waitFor(() =>
      expect(storageMock.signInSupabase).toHaveBeenCalledWith(
        'a@example.test',
        'temporary-password',
        false,
      ),
    );
    expect(storageMock.inspectStorage).toHaveBeenCalled();
  });

  it('lets the user choose persistence directly in the Supabase sign-in form', async () => {
    render(<StorageSettings />);
    fireEvent.click(screen.getByRole('radio', { name: /Supabase/ }));
    fireEvent.change(screen.getByLabelText('Supabase project URL'), {
      target: { value: 'https://example123.supabase.co' },
    });
    fireEvent.change(screen.getByLabelText('Supabase publishable key'), {
      target: { value: 'sb_publishable_testkey123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save Supabase settings' }));

    await screen.findByRole('heading', { name: 'Sign in to your Supabase project' });
    const remember = screen.getByRole('checkbox', { name: /Remember this session/i });
    fireEvent.click(remember);
    fireEvent.change(screen.getByLabelText('Supabase email'), {
      target: { value: 'a@example.test' },
    });
    fireEvent.change(screen.getByLabelText('Supabase password'), {
      target: { value: 'temporary-password' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in to Supabase' }));

    await waitFor(() =>
      expect(storageMock.signInSupabase).toHaveBeenCalledWith(
        'a@example.test',
        'temporary-password',
        true,
      ),
    );
  });
});
