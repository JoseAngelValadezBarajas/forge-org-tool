import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { Link } from './Link.js';
it('Link renders original currentColor SVG geometry with an accessible title', () => {
  const markup = renderToStaticMarkup(<Link title="Link" size={20} />);
  expect(markup).toContain('data-icon="Link"');
  expect(markup).toContain('stroke="currentColor"');
  expect(markup).toContain('>Link</title>');
  expect(markup).toContain('width="20"');
});
