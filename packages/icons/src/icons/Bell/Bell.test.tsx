import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { Bell } from './Bell.js';
it('Bell renders original currentColor SVG geometry with an accessible title', () => {
  const markup = renderToStaticMarkup(<Bell title="Bell" size={20} />);
  expect(markup).toContain('data-icon="Bell"');
  expect(markup).toContain('stroke="currentColor"');
  expect(markup).toContain('>Bell</title>');
  expect(markup).toContain('width="20"');
});
