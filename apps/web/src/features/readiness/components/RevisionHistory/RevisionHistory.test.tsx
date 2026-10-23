import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it } from 'vitest';
import { RevisionHistory } from './RevisionHistory';

afterEach(cleanup);

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

  it('marks the explicitly current revision and retains ascending list semantics', () => {
    render(
      <RevisionHistory
        title="Decision history"
        currentRevision={2}
        revisions={[
          { revision: 1, text: 'Initial' },
          { revision: 2, text: 'Updated' },
        ]}
      />,
    );

    const list = screen.getAllByRole('list')[0];
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('Revision 1: Initial');
    expect(items[0]).toHaveTextContent('SUPERSEDED');
    expect(items[0]).toHaveAttribute('data-state', 'superseded');
    expect(items[1]).toHaveTextContent('Revision 2: Updated');
    expect(items[1]).toHaveTextContent('CURRENT');
    expect(items[1]).toHaveAttribute('data-state', 'current');
    expect(list).toContainElement(items[0]);
    expect(list).toContainElement(items[1]);
  });

  it('supports explicit per-item states and falls back to the domain revision sequence', () => {
    const { rerender } = render(
      <RevisionHistory
        title="Decision history"
        revisions={[
          { revision: 1, text: 'Initial', status: 'Current' },
          { revision: 2, text: 'Updated', status: 'Superseded' },
        ]}
      />,
    );

    expect(screen.getAllByRole('listitem')[0]).toHaveTextContent('CURRENT');
    expect(screen.getAllByRole('listitem')[1]).toHaveTextContent('SUPERSEDED');

    rerender(
      <RevisionHistory
        title="Decision history"
        revisions={[
          { revision: 1, text: 'Initial' },
          { revision: 2, text: 'Updated' },
        ]}
      />,
    );
    expect(screen.getAllByRole('listitem')[0]).toHaveTextContent('SUPERSEDED');
    expect(screen.getAllByRole('listitem')[1]).toHaveTextContent('CURRENT');
  });
});
