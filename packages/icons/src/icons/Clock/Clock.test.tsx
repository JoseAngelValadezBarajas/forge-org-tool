import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { Clock } from './Clock.js';
it('Clock renders original currentColor SVG geometry with an accessible title', () => {
  const markup = renderToStaticMarkup(<Clock title="Clock" size={20} />);
  expect(markup).toContain('data-icon="Clock"');
  expect(markup).toContain('stroke="currentColor"');
  expect(markup).toContain('>Clock</title>');
  expect(markup).toContain('width="20"');
});
