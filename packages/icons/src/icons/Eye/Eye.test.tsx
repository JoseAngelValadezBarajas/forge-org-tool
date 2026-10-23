import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { Eye } from './Eye.js';
it('Eye renders original currentColor SVG geometry with an accessible title', () => {
  const markup = renderToStaticMarkup(<Eye title="Eye" size={20} />);
  expect(markup).toContain('data-icon="Eye"');
  expect(markup).toContain('stroke="currentColor"');
  expect(markup).toContain('>Eye</title>');
  expect(markup).toContain('width="20"');
});
