import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { AlertTriangle } from './AlertTriangle.js';
it('AlertTriangle renders original currentColor SVG geometry with an accessible title', () => {
  const markup = renderToStaticMarkup(<AlertTriangle title="AlertTriangle" size={20} />);
  expect(markup).toContain('data-icon="AlertTriangle"');
  expect(markup).toContain('stroke="currentColor"');
  expect(markup).toContain('>AlertTriangle</title>');
  expect(markup).toContain('width="20"');
});
