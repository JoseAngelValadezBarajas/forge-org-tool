import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { History } from './History.js';
it('History renders original currentColor SVG geometry with an accessible title', () => {
  const markup = renderToStaticMarkup(<History title="History" size={20} />);
  expect(markup).toContain('data-icon="History"');
  expect(markup).toContain('stroke="currentColor"');
  expect(markup).toContain('>History</title>');
  expect(markup).toContain('width="20"');
});
