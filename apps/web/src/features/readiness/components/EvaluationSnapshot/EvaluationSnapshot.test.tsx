import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it } from 'vitest';
import { EvaluationSnapshot } from './EvaluationSnapshot';

describe('EvaluationSnapshot', () => {
  afterEach(cleanup);

  it('defaults to the preview state', () => {
    render(<EvaluationSnapshot fingerprint="fp-123" evaluatedAt="2026-10-20" />);
    expect(screen.getByText('PREVIEW')).toBeInTheDocument();
  });

  it('presents the saved state when explicitly supplied', () => {
    render(<EvaluationSnapshot fingerprint="fp-123" evaluatedAt="2026-10-20" state="Saved" />);
    expect(screen.getByText('SAVED')).toBeInTheDocument();
  });

  it('presents a stale state when explicitly supplied', () => {
    render(<EvaluationSnapshot fingerprint="fp-123" evaluatedAt="2026-10-20" state="Stale" />);
    expect(screen.getByText('STALE')).toBeInTheDocument();
  });

  it('preserves the legacy stale prop', () => {
    render(<EvaluationSnapshot fingerprint="fp-123" evaluatedAt="2026-10-20" stale />);
    expect(screen.getByRole('group', { name: 'Evaluation snapshot' })).toHaveTextContent('fp-123');
    expect(screen.getByText('STALE')).toBeInTheDocument();
  });
});
