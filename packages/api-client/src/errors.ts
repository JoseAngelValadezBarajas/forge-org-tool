export class ApiError extends Error {
  readonly status: number;
  readonly detail?: string;

  constructor(status: number, detail?: string) {
    super(detail ?? `API HTTP ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

export async function apiErrorFromResponse(response: Response): Promise<ApiError> {
  const body = (await response.json().catch(() => undefined)) as { detail?: string } | undefined;
  return new ApiError(response.status, body?.detail);
}
