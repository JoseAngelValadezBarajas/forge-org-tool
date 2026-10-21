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
});
