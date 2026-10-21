import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { Alert } from './Alert';
describe('Alert', () => {
  it('uses assertive alert semantics only for danger messages', () => {
    render(<Alert tone="danger">Action failed</Alert>);
    expect(screen.getByRole('alert')).toHaveTextContent('Action failed');
  });
});
