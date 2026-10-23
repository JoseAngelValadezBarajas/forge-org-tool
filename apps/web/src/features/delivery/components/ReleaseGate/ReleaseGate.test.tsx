import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { expect, it } from 'vitest';
import { ReleaseGate } from './ReleaseGate';
it('keeps the gate outcome and actions together', () => {
  render(
    <ReleaseGate outcome="PASS">
      <button>Save manifest</button>
    </ReleaseGate>,
  );
  expect(screen.getByRole('region', { name: 'Release gate' })).toHaveTextContent('PASS');
  expect(screen.getByRole('button', { name: 'Save manifest' })).toBeInTheDocument();
});
