import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { expect, it } from 'vitest';
import { DownloadAction } from './DownloadAction';
it('does not expose an unusable download as a link', () => {
  render(<DownloadAction label="JSON" href="/manifest.json" state="pending" />);
  expect(screen.queryByRole('link', { name: 'JSON' })).not.toBeInTheDocument();
  expect(screen.getByText('Preparing download')).toBeInTheDocument();
});
