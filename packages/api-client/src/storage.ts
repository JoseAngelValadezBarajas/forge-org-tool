import { ApiError } from './errors.js';
import {
  resetApiRequestHandler,
  setApiRequestHandler,
  type ApiRequestHandler,
} from './transport.js';

export type StorageProvider = 'local' | 'supabase';
export type StorageStatus =
  | 'ready'
  | 'configuration_valid'
  | 'authentication_required'
  | 'schema_missing'
  | 'permissions_denied'
  | 'network_unavailable';

export type SupabaseProfile = {
  projectUrl: string;
  publishableKey: string;
};

export type SupabaseSession = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  userId: string;
  email?: string;
};

export type StorageSnapshot = {
  provider: StorageProvider;
  status: StorageStatus;
  message: string;
  projectUrl?: string;
  userEmail?: string;
};

type StorageConfig = { provider: 'local' } | ({ provider: 'supabase' } & SupabaseProfile);
type StoredSession = { profile: SupabaseProfile; session: SupabaseSession };
type SupabaseHandlerFactory = (
  profile: SupabaseProfile,
  getSession: () => Promise<SupabaseSession | null>,
) => ApiRequestHandler;

const PROFILE_KEY = 'forge-storage-profile';
const SESSION_KEY = 'forge-supabase-session';
const SUPABASE_HOST = /^[a-z0-9][a-z0-9-]*\.supabase\.co$/;
const PUBLISHABLE_KEY = /^sb_publishable_[A-Za-z0-9_-]+$/;

let profile: SupabaseProfile | null = null;
let session: SupabaseSession | null = null;
let handlerFactory: SupabaseHandlerFactory | null = null;
let refreshInFlight: Promise<SupabaseSession | null> | null = null;
let snapshot: StorageSnapshot = {
  provider: 'local',
  status: 'ready',
  message: 'Local SQLite is active.',
};

function browserStorage(kind: 'localStorage' | 'sessionStorage'): Storage | null {
  try {
    return typeof globalThis[kind] === 'object' ? globalThis[kind] : null;
  } catch {
    return null;
  }
}

function readProfile(): SupabaseProfile | null {
  const raw = browserStorage('localStorage')?.getItem(PROFILE_KEY);
  if (!raw) return null;
  try {
    return validateSupabaseProfile(JSON.parse(raw) as SupabaseProfile);
  } catch {
    return null;
  }
}

function profilesEqual(left: SupabaseProfile, right: SupabaseProfile): boolean {
  return left.projectUrl === right.projectUrl && left.publishableKey === right.publishableKey;
}

function readStoredSession(): StoredSession | null {
  const raw = browserStorage('sessionStorage')?.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as {
      profile?: SupabaseProfile;
      session?: Partial<SupabaseSession>;
    };
    const storedProfile = value.profile;
    const sessionValue = value.session;
    if (
      !storedProfile ||
      !sessionValue ||
      typeof sessionValue.accessToken !== 'string' ||
      typeof sessionValue.refreshToken !== 'string' ||
      typeof sessionValue.expiresAt !== 'number' ||
      typeof sessionValue.userId !== 'string'
    ) {
      return null;
    }
    return {
      profile: validateSupabaseProfile(storedProfile),
      session: sessionValue as SupabaseSession,
    };
  } catch {
    return null;
  }
}

function readSession(expectedProfile: SupabaseProfile): SupabaseSession | null {
  const stored = readStoredSession();
  return stored && profilesEqual(stored.profile, expectedProfile) ? stored.session : null;
}

function persistProfile(next: SupabaseProfile | null): void {
  const storage = browserStorage('localStorage');
  if (!storage) return;
  if (next) storage.setItem(PROFILE_KEY, JSON.stringify(next));
  else storage.removeItem(PROFILE_KEY);
}

function persistSession(next: SupabaseSession | null): void {
  const storage = browserStorage('sessionStorage');
  if (!storage) return;
  if (next && profile) storage.setItem(SESSION_KEY, JSON.stringify({ profile, session: next }));
  else storage.removeItem(SESSION_KEY);
}

export function validateSupabaseProfile(input: SupabaseProfile): SupabaseProfile {
  if (!input || typeof input.projectUrl !== 'string' || typeof input.publishableKey !== 'string') {
    throw new Error('Supabase project URL and publishable key are required.');
  }
  let parsed: URL;
  try {
    parsed = new URL(input.projectUrl);
  } catch {
    throw new Error('Supabase project URL must be a valid HTTPS URL.');
  }
  if (
    parsed.protocol !== 'https:' ||
    parsed.port ||
    parsed.username ||
    parsed.password ||
    !SUPABASE_HOST.test(parsed.hostname) ||
    !['', '/'].includes(parsed.pathname) ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error('Supabase project URL must be an HTTPS hosted project URL.');
  }
  if (!PUBLISHABLE_KEY.test(input.publishableKey)) {
    throw new Error('Supabase requires an sb_publishable_* key; privileged keys are not allowed.');
  }
  return { projectUrl: `https://${parsed.hostname}`, publishableKey: input.publishableKey };
}

export function registerSupabaseHandlerFactory(factory: SupabaseHandlerFactory): void {
  handlerFactory = factory;
  if (profile) installSupabaseHandler();
}

function installSupabaseHandler(): void {
  if (!profile || !handlerFactory) {
    setApiRequestHandler({
      async getJson<T>(): Promise<T> {
        throw new ApiError(401, 'Sign in to the configured Supabase project.');
      },
      async getBlob(): Promise<Blob> {
        throw new ApiError(401, 'Sign in to the configured Supabase project.');
      },
      async sendJson<T>(): Promise<T> {
        throw new ApiError(401, 'Sign in to the configured Supabase project.');
      },
    });
    return;
  }
  setApiRequestHandler(handlerFactory(profile, getValidSupabaseSession));
}

export function configureStorage(config: StorageConfig): void {
  if (config.provider === 'local') {
    profile = null;
    session = null;
    refreshInFlight = null;
    persistProfile(null);
    persistSession(null);
    resetApiRequestHandler();
    snapshot = { provider: 'local', status: 'ready', message: 'Local SQLite is active.' };
    return;
  }
  const nextProfile = validateSupabaseProfile(config);
  const previousProfile = profile;
  const storedSession = readStoredSession();
  const profileChanged = Boolean(previousProfile && !profilesEqual(previousProfile, nextProfile));
  profile = nextProfile;
  const sessionMatchesProfile =
    storedSession !== null && profilesEqual(storedSession.profile, nextProfile);
  if (profileChanged || (storedSession !== null && !sessionMatchesProfile)) {
    session = null;
    persistSession(null);
  } else {
    session = readSession(nextProfile);
  }
  persistProfile(profile);
  snapshot = session
    ? {
        provider: 'supabase',
        status: 'schema_missing',
        message: 'Verify the Supabase schema and permissions before using cloud storage.',
        projectUrl: profile.projectUrl,
        ...(session.email ? { userEmail: session.email } : {}),
      }
    : {
        provider: 'supabase',
        status: 'authentication_required',
        message: 'Sign in to the configured Supabase project.',
        projectUrl: profile.projectUrl,
      };
  installSupabaseHandler();
}

export function getStorageSnapshot(): StorageSnapshot {
  return { ...snapshot };
}

export function getActiveSupabaseProfile(): SupabaseProfile | null {
  return profile ? { ...profile } : null;
}

export async function getValidSupabaseSession(): Promise<SupabaseSession | null> {
  if (!session || !profile) return null;
  if (session.expiresAt > Math.floor(Date.now() / 1000) + 30) return session;
  if (!session.refreshToken) return null;
  if (!refreshInFlight) {
    refreshInFlight = refreshSupabaseSession(profile, session.refreshToken).finally(() => {
      refreshInFlight = null;
    });
  }
  session = await refreshInFlight;
  persistSession(session);
  if (!session) {
    snapshot = {
      provider: 'supabase',
      status: 'authentication_required',
      message: 'Supabase session expired. Sign in again.',
      projectUrl: profile.projectUrl,
    };
  }
  return session;
}

function authHeaders(nextProfile: SupabaseProfile): HeadersInit {
  return { apikey: nextProfile.publishableKey, 'Content-Type': 'application/json' };
}

function toSession(value: Record<string, unknown>): SupabaseSession {
  const user = value.user as Record<string, unknown> | undefined;
  const expiresIn = typeof value.expires_in === 'number' ? value.expires_in : 3600;
  const accessToken = value.access_token;
  const refreshToken = value.refresh_token;
  const userId = user?.id;
  if (
    typeof accessToken !== 'string' ||
    typeof refreshToken !== 'string' ||
    typeof userId !== 'string' ||
    !user
  ) {
    throw new Error('Supabase returned an invalid authentication session.');
  }
  return {
    accessToken,
    refreshToken,
    expiresAt: Math.floor(Date.now() / 1000) + expiresIn,
    userId,
    ...(typeof user.email === 'string' ? { email: user.email } : {}),
  };
}

async function authRequest(
  nextProfile: SupabaseProfile,
  grantType: 'password' | 'refresh_token',
  credentials: Record<string, string>,
): Promise<SupabaseSession> {
  let response: Response;
  try {
    const endpoint = new URL(`${nextProfile.projectUrl}/auth/v1/token`);
    endpoint.searchParams.set('grant_type', grantType);
    response = await fetch(endpoint.toString(), {
      method: 'POST',
      headers: authHeaders(nextProfile),
      body: JSON.stringify(credentials),
    });
  } catch {
    throw new ApiError(503, 'Supabase authentication is unavailable.');
  }
  if (!response.ok) throw new ApiError(response.status, 'Supabase authentication failed.');
  return toSession((await response.json()) as Record<string, unknown>);
}

async function refreshSupabaseSession(
  nextProfile: SupabaseProfile,
  refreshToken: string,
): Promise<SupabaseSession | null> {
  try {
    return await authRequest(nextProfile, 'refresh_token', { refresh_token: refreshToken });
  } catch {
    return null;
  }
}

export async function signInSupabase(email: string, password: string): Promise<StorageSnapshot> {
  if (!profile) throw new Error('Configure Supabase before signing in.');
  if (!email.trim() || !password) throw new Error('Email and password are required.');
  session = await authRequest(profile, 'password', { email, password });
  persistSession(session);
  installSupabaseHandler();
  snapshot = {
    provider: 'supabase',
    status: 'schema_missing',
    message: 'Signed in. Verify the Supabase schema and permissions.',
    projectUrl: profile.projectUrl,
    ...(session.email ? { userEmail: session.email } : {}),
  };
  return getStorageSnapshot();
}

export function signOutSupabase(): void {
  session = null;
  refreshInFlight = null;
  persistSession(null);
  if (profile) {
    snapshot = {
      provider: 'supabase',
      status: 'authentication_required',
      message: 'Sign in to the configured Supabase project.',
      projectUrl: profile.projectUrl,
    };
    installSupabaseHandler();
  }
}

export async function inspectStorage(): Promise<StorageSnapshot> {
  if (!profile) return getStorageSnapshot();
  if (!(await getValidSupabaseSession())) {
    snapshot = {
      provider: 'supabase',
      status: 'authentication_required',
      message: 'Sign in to the configured Supabase project.',
      projectUrl: profile.projectUrl,
    };
    return getStorageSnapshot();
  }
  const activeHandler = handlerFactory ? handlerFactory(profile, getValidSupabaseSession) : null;
  try {
    const result = activeHandler?.preflight
      ? await activeHandler.preflight()
      : { schemaVersion: '' };
    if (result.schemaVersion !== 'forge-byoc-v1') {
      throw new ApiError(409, 'The Supabase BYOC schema is missing or unsupported.');
    }
    snapshot = {
      provider: 'supabase',
      status: 'ready',
      message: 'Supabase storage is ready.',
      projectUrl: profile.projectUrl,
      ...(session?.email ? { userEmail: session.email } : {}),
    };
  } catch (cause) {
    const error = cause instanceof ApiError ? cause : new ApiError(503, 'Supabase is unavailable.');
    const status: StorageStatus =
      error.status === 401
        ? 'authentication_required'
        : error.status === 403
          ? 'permissions_denied'
          : error.status === 409
            ? 'schema_missing'
            : 'network_unavailable';
    snapshot = {
      provider: 'supabase',
      status,
      message: error.detail ?? 'Supabase storage is unavailable.',
      projectUrl: profile.projectUrl,
      ...(session?.email ? { userEmail: session.email } : {}),
    };
  }
  return getStorageSnapshot();
}

export function initializeStoredStorage(): void {
  const stored = readProfile();
  if (stored) configureStorage({ provider: 'supabase', ...stored });
}

export function resetStorageForTests(options: { preservePersisted?: boolean } = {}): void {
  profile = null;
  session = null;
  refreshInFlight = null;
  if (!options.preservePersisted) {
    persistProfile(null);
    persistSession(null);
  }
  resetApiRequestHandler();
  snapshot = { provider: 'local', status: 'ready', message: 'Local SQLite is active.' };
}
