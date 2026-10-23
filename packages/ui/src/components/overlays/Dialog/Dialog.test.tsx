import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { Dialog } from './Dialog';
describe('Dialog', () => {
  it('provides a labeled, modal native dialog', () => {
    render(
      <Dialog open title="Confirm transfer">
        Continue?
      </Dialog>,
    );
    expect(screen.getByRole('dialog', { name: 'Confirm transfer' })).toHaveAttribute(
      'aria-modal',
      'true',
    );
  });
  it('announces the busy canonical variant', () => {
    render(
      <Dialog open variant="busy" title="Importing">
        Please wait
      </Dialog>,
    );
    expect(screen.getByRole('dialog', { name: 'Importing' })).toHaveAttribute('aria-busy', 'true');
  });
});
