import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { KeyValueRow } from './KeyValueRow';
describe('KeyValueRow', () => {
  it('associates the definition term and value semantically', () => {
    render(
      <dl>
        <KeyValueRow label="Branch" value="main" />
      </dl>,
    );
    expect(screen.getByText('Branch').tagName).toBe('DT');
    expect(screen.getByText('main').tagName).toBe('DD');
  });
});
