import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { RevisionHistory } from './RevisionHistory';

describe('RevisionHistory', () => {
  it('renders the supplied auditable revisions in order', () => {
    render(
      <RevisionHistory
        title="Decision history"
        revisions={[
          { revision: 1, text: 'Initial' },
          { revision: 2, text: 'Updated' },
        ]}
      />,
    );
    expect(screen.getByRole('group', { name: 'Decision history' })).toHaveTextContent(
      'Revision 1: Initial',
    );
    expect(screen.getByRole('group')).toHaveTextContent('Revision 2: Updated');
  });
});
