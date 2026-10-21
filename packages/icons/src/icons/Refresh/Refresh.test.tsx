import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { Refresh } from './Refresh.js';
it('Refresh renders original currentColor SVG geometry with an accessible title', () => {
  const markup = renderToStaticMarkup(<Refresh title="Refresh" size={20} />);
  expect(markup).toContain('data-icon="Refresh"');
  expect(markup).toContain('stroke="currentColor"');
  expect(markup).toContain('>Refresh</title>');
  expect(markup).toContain('width="20"');
});
