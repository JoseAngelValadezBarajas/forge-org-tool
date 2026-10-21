import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { MetricCard } from './MetricCard';
describe('MetricCard', () => {
  it('groups a metric label, value and optional context', () => {
    render(<MetricCard label="Repositories" value={12} detail="3 connected" />);
    expect(screen.getByText('Repositories')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('3 connected')).toBeInTheDocument();
  });
});
