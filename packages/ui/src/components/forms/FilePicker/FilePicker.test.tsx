import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { FilePicker } from './FilePicker';
describe('FilePicker', () => {
  it('supports native file selection constraints', () => {
    render(<FilePicker aria-label="Attach files" accept="image/*" multiple />);
    const input = screen.getByLabelText('Attach files');
    expect(input).toHaveAttribute('type', 'file');
    expect(input).toHaveAttribute('multiple');
    expect(input).toHaveAttribute('accept', 'image/*');
  });
});
