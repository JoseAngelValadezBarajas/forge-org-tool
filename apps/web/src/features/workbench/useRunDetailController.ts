import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { organizationApi, type Run, type RunEvent } from '@forge-org/api-client';

function chronological(events: RunEvent[]): RunEvent[] {
  return [...events].sort((left, right) => {
    const leftTime = Date.parse(left.occurred_at ?? left.created_at);
    const rightTime = Date.parse(right.occurred_at ?? right.created_at);
    return leftTime - rightTime || left.created_at.localeCompare(right.created_at);
  });
}

export function useRunDetailController(workspaceId: string, projectId: string, runId: string) {
  const [run, setRun] = useState<Run | null>(null);
  const [events, setEvents] = useState<RunEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError('');
    try {
      const [nextRun, nextEvents] = await Promise.all([
        organizationApi.getRun(workspaceId, projectId, runId),
        organizationApi.listRunEvents(workspaceId, projectId, runId),
      ]);
      if (currentRequest !== requestId.current) return;
      setRun(nextRun);
      setEvents(chronological(nextEvents));
    } catch (cause) {
      if (currentRequest === requestId.current) {
        setError(cause instanceof Error ? cause.message : 'Unable to load run details.');
      }
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, [projectId, runId, workspaceId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => {
      window.clearTimeout(timer);
      requestId.current += 1;
    };
  }, [load]);

  async function recordActivity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!run || saving) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    const occurredAt = String(values.get('occurred_at') ?? '');
    setSaving(true);
    setError('');
    try {
      await organizationApi.createRunEvent(workspaceId, projectId, run.id, {
        event_type: String(values.get('event_type') ?? '').trim(),
        title: String(values.get('title') ?? '').trim(),
        description: String(values.get('description') ?? '').trim() || null,
        expected_version: run.version,
        occurred_at: occurredAt ? new Date(occurredAt).toISOString() : null,
        supersedes_event_id: null,
      });
      form.reset();
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to record activity event.');
    } finally {
      setSaving(false);
    }
  }

  return { error, events, load, loading, recordActivity, run, saving };
}
