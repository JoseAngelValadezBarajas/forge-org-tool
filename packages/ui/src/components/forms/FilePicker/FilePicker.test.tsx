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

  it('renders the canonical file selection panel and accessible native input', () => {
    const { container } = render(
      <FilePicker
        title="Choose JSON file"
        description="Drag a JSON file here or browse locally."
        metadata=".json · Max 8 MiB"
        accept="application/json"
        state="selected"
      />,
    );
    expect(screen.getByText('Choose JSON file')).toBeInTheDocument();
    expect(screen.getByText('Drag a JSON file here or browse locally.')).toBeInTheDocument();
    expect(screen.getByText('.json · Max 8 MiB')).toBeInTheDocument();
    expect(container.querySelector('[data-state="selected"]')).toBeInTheDocument();
    expect(screen.getByLabelText('Choose JSON file')).toHaveAttribute('type', 'file');
  });

  it('exposes an error state without inventing feature-specific validation text', () => {
    const { container } = render(
      <FilePicker title="Choose JSON file" state="error" description="File exceeds the limit." />,
    );
    expect(container.querySelector('[data-state="error"]')).toBeInTheDocument();
    expect(screen.getByText('File exceeds the limit.')).toHaveAttribute('role', 'alert');
  });
});
