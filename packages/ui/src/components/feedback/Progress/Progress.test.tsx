import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { Progress } from './Progress';
describe('Progress', () => {
  it('exposes determinate progress with an accessible name', () => {
    render(<Progress label="Import progress" value={3} max={5} />);
    expect(screen.getByRole('progressbar', { name: 'Import progress' })).toHaveProperty('value', 3);
  });
});
