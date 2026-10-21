import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { StatusChip } from './StatusChip';
describe('StatusChip', () => {
  it('renders a concise status label with a typed semantic tone', () => {
    render(<StatusChip tone="success">Connected</StatusChip>);
    expect(screen.getByText('Connected').tagName).toBe('SPAN');
  });
});
