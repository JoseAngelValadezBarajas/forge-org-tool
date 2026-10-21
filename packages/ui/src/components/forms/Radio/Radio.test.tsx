import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { Radio } from './Radio';
describe('Radio', () => {
  it('uses native radio-group semantics and shared group name', () => {
    render(
      <fieldset>
        <legend>Mode</legend>
        <label htmlFor="mode-fast">Fast</label>
        <Radio id="mode-fast" name="mode" value="fast" />
        <label htmlFor="mode-safe">Safe</label>
        <Radio id="mode-safe" name="mode" value="safe" />
      </fieldset>,
    );
    expect(screen.getAllByRole('radio')).toHaveLength(2);
    expect(screen.getByLabelText('Fast')).toHaveAttribute('name', 'mode');
  });
});
