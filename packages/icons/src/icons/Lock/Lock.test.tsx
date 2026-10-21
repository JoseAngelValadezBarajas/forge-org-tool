import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { Lock } from './Lock.js';
it('Lock renders original currentColor SVG geometry with an accessible title', () => {
  const markup = renderToStaticMarkup(<Lock title="Lock" size={20} />);
  expect(markup).toContain('data-icon="Lock"');
  expect(markup).toContain('stroke="currentColor"');
  expect(markup).toContain('>Lock</title>');
  expect(markup).toContain('width="20"');
});
