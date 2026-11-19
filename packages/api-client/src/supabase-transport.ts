/** Authenticated PostgREST/Storage/RPC calls against one Supabase project. */

import { ApiError } from './errors.js';
import type { SupabaseProfile } from './storage.js';
import type { JsonRecord, SessionProvider } from './supabase-shared.js';

export type SupabaseTransport = ReturnType<typeof createSupabaseTransport>;

export function createSupabaseTransport(profile: SupabaseProfile, getSession: SessionProvider) {
  async function responseFor(
    endpoint: string,
    init: RequestInit = {},
    options: { preflight?: boolean } = {},
  ): Promise<Response> {
    const session = await getSession();
    if (!session) throw new ApiError(401, 'Sign in to the configured Supabase project.');
    let response: Response;
    try {
      response = await fetch(`${profile.projectUrl}${endpoint}`, {
        ...init,
        headers: {
          apikey: profile.publishableKey,
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
          ...(init.headers ?? {}),
        },
      });
    } catch {
      throw new ApiError(503, 'Supabase is unavailable.');
    }
    if (!response.ok) {
      if (options.preflight && response.status === 404) {
        throw new ApiError(409, 'The Supabase BYOC schema is missing or unsupported.');
      }
      const detail = (await response.json().catch(() => undefined)) as
        { message?: string } | undefined;
      if (response.status === 401)
        throw new ApiError(401, 'Supabase session expired. Sign in again.');
      if (response.status === 403) throw new ApiError(403, 'Supabase denied this operation.');
      throw new ApiError(
        response.status,
        options.preflight ? 'Supabase preflight failed.' : detail?.message,
      );
    }
    return response;
  }

  async function request<T>(
    endpoint: string,
    init: RequestInit = {},
    options: { preflight?: boolean } = {},
  ): Promise<T> {
    const response = await responseFor(endpoint, init, options);
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }

  async function blobRequest(endpoint: string, init: RequestInit = {}): Promise<Blob> {
    const response = await responseFor(endpoint, init);
    return response.blob();
  }

  async function table<T>(tableName: string, suffix = '', init: RequestInit = {}): Promise<T> {
    return request<T>(`/rest/v1/${tableName}${suffix}`, {
      ...init,
      headers: { Prefer: 'return=representation', ...(init.headers ?? {}) },
    });
  }

  async function rpc<T>(name: string, payload: JsonRecord): Promise<T> {
    return request<T>(
      `/rest/v1/rpc/${name}`,
      { method: 'POST', body: JSON.stringify(payload) },
      { preflight: name === 'forge_storage_preflight' },
    );
  }

  return { responseFor, request, blobRequest, table, rpc };
}
