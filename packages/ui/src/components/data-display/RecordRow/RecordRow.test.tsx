import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { RecordRow } from './RecordRow';
describe('RecordRow', () => {
  it('renders a row with primary label and metadata', () => {
    render(
      <table>
        <tbody>
          <RecordRow title="Repository" metadata="Connected" />
        </tbody>
      </table>,
    );
    expect(screen.getByRole('row')).toHaveTextContent('Repository');
    expect(screen.getByRole('row')).toHaveTextContent('Connected');
  });

  it('exposes the canonical read-only state without making the row interactive', () => {
    const { container } = render(
      <table>
        <tbody>
          <RecordRow title="Repository" readOnly />
        </tbody>
      </table>,
    );

    expect(container.querySelector('tbody tr')).toHaveAttribute('data-read-only', 'true');
  });
});
