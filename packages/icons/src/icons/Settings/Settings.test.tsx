import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { Settings } from './Settings.js';
it('Settings renders original currentColor SVG geometry with an accessible title', () => {
  const markup = renderToStaticMarkup(<Settings title="Settings" size={20} />);
  expect(markup).toContain('data-icon="Settings"');
  expect(markup).toContain('stroke="currentColor"');
  expect(markup).toContain('>Settings</title>');
  expect(markup).toContain('width="20"');
});
