import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { Progress } from './Progress';
describe('Progress', () => {
  it('exposes determinate progress with an accessible name', () => {
    render(<Progress label="Import progress" value={3} max={5} />);
    expect(screen.getByRole('progressbar', { name: 'Import progress' })).toHaveProperty('value', 3);
  });

  it('renders the canonical labeled panel with live determinate values', () => {
    render(
      <Progress
        presentation="panel"
        label="Artifact transfer"
        value={3}
        max={6}
        note="Progress is not a release or CI verification claim."
      />,
    );

    expect(screen.getByRole('progressbar', { name: 'Artifact transfer' })).toHaveAttribute(
      'aria-valuenow',
      '3',
    );
    expect(screen.getByText('3 / 6')).toBeInTheDocument();
    expect(
      screen.getByText('Progress is not a release or CI verification claim.'),
    ).toBeInTheDocument();
  });
});
