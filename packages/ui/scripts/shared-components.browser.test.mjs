import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import react from '@vitejs/plugin-react';
import { createServer } from 'vite';

// Package-only browser fixture: no product routes, API state, or gallery imports.
const fixture = `
import React from 'react';
import { createRoot } from 'react-dom/client';
import { Button, Card } from '/src/index.ts';
const h = React.createElement;
createRoot(document.getElementById('root')).render(h('main', null,
  ...['primary', 'secondary', 'ghost', 'danger'].flatMap(variant =>
    ['default', 'disabled', 'loading'].map(state => h(Button, {
      key: variant + state, variant,
      disabled: state === 'disabled', loading: state === 'loading',
      'data-testid': variant + '-' + state,
    }, 'Save feature'))),
  ...['small', 'medium', 'large'].map(size => h(Button, {
    key: size, size, 'data-testid': 'size-' + size,
  }, 'Size')),
  h('div', { style: { width: '100%', maxWidth: 300 } },
    h(Card, { 'data-testid': 'card' }, 'Reusable surface'),
    h(Card, { as: 'article', variant: 'elevated', 'data-testid': 'elevated-card' }, 'Elevated surface')),
));`;

let server;
let browser;
let page;

before(async () => {
  server = await createServer({
    configFile: false,
    root: fileURLToPath(new URL('..', import.meta.url)),
    plugins: [
      react(),
      {
        name: 'shared-component-test-fixture',
        resolveId(id) {
          if (id === 'virtual:shared-components') return '\0' + id;
        },
        load(id) {
          if (id === '\0virtual:shared-components') return fixture;
        },
        configureServer(vite) {
          vite.middlewares.use(async (request, response, next) => {
            if (request.url !== '/') return next();
            response.setHeader('Content-Type', 'text/html');
            response.end(
              await vite.transformIndexHtml(
                '/',
                '<!doctype html><html data-theme="dark"><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>* { box-sizing: border-box; } body { margin: 0; font: 16px serif; }</style></head><body><div id="root"></div><script type="module" src="/@id/virtual:shared-components"></script></body></html>',
              ),
            );
          });
        },
      },
    ],
    server: { host: '127.0.0.1', port: 0, strictPort: true },
  });
  await server.listen();
  browser = await chromium.launch({ headless: true });
});

beforeEach(async () => {
  await page?.close();
  page = await browser.newPage({ viewport: { width: 1024, height: 768 }, reducedMotion: 'reduce' });
  await page.goto(server.resolvedUrls.local[0]);
  await page.getByTestId('primary-default').waitFor();
  await page.evaluate(() => globalThis.document.fonts.ready);
});

after(async () => {
  await browser?.close();
  await server?.close();
});

test('Button uses the master label typography without inheriting host text size', async () => {
  const style = await page.getByTestId('primary-default').evaluate((element) => {
    const css = getComputedStyle(element);
    return { fontSize: css.fontSize, fontWeight: css.fontWeight, fontFamily: css.fontFamily };
  });
  assert.equal(style.fontSize, '12px');
  assert.equal(style.fontWeight, '500');
  assert.match(style.fontFamily, /Geist/);
});

async function colors(locator) {
  return locator.evaluate((element) => {
    const css = getComputedStyle(element);
    return { background: css.backgroundColor, foreground: css.color, border: css.borderTopColor };
  });
}

for (const [variant, background, foreground, border] of [
  ['primary', 'rgb(216, 135, 77)', 'rgb(17, 19, 21)', 'rgba(0, 0, 0, 0)'],
  ['secondary', 'rgb(32, 36, 40)', 'rgb(245, 243, 238)', 'rgb(48, 54, 61)'],
  ['ghost', 'rgb(23, 26, 29)', 'rgb(245, 243, 238)', 'rgb(48, 54, 61)'],
  ['danger', 'rgb(48, 29, 32)', 'rgb(229, 115, 115)', 'rgba(0, 0, 0, 0)'],
]) {
  test(`Button ${variant} default uses its master surface and foreground`, async () => {
    assert.deepEqual(await colors(page.getByTestId(variant + '-default')), {
      background,
      foreground,
      border,
    });
  });
}

for (const [variant, hover, pressed, hoverForeground, pressedForeground, border] of [
  [
    'primary',
    'rgb(229, 155, 100)',
    'rgb(166, 83, 32)',
    'rgb(17, 19, 21)',
    'rgb(255, 255, 255)',
    'rgba(0, 0, 0, 0)',
  ],
  [
    'secondary',
    'rgb(32, 36, 40)',
    'rgb(48, 38, 30)',
    'rgb(245, 243, 238)',
    'rgb(245, 243, 238)',
    'rgb(48, 54, 61)',
  ],
  [
    'ghost',
    'rgb(23, 26, 29)',
    'rgb(48, 38, 30)',
    'rgb(245, 243, 238)',
    'rgb(245, 243, 238)',
    'rgb(48, 54, 61)',
  ],
  [
    'danger',
    'rgb(48, 29, 32)',
    'rgb(48, 29, 32)',
    'rgb(229, 115, 115)',
    'rgb(229, 115, 115)',
    'rgba(0, 0, 0, 0)',
  ],
]) {
  test(`Button ${variant} hover follows its evidenced state`, async () => {
    const button = page.getByTestId(variant + '-default');
    await button.hover();
    assert.deepEqual(await colors(button), {
      background: hover,
      foreground: hoverForeground,
      border,
    });
  });

  test(`Button ${variant} pressed follows its evidenced state without moving the control`, async () => {
    const button = page.getByTestId(variant + '-default');
    await button.hover();
    await page.mouse.down();
    assert.deepEqual(await colors(button), {
      background: pressed,
      foreground: pressedForeground,
      border,
    });
    assert.equal(await button.evaluate((element) => getComputedStyle(element).transform), 'none');
    await page.mouse.up();
  });
}

for (const variant of ['primary', 'secondary', 'ghost', 'danger']) {
  test(`Button ${variant} disabled treatment overrides hover and pressed`, async () => {
    const button = page.getByTestId(variant + '-disabled');
    await button.hover({ force: true });
    await page.mouse.down();
    const style = await button.evaluate((element) => {
      const css = getComputedStyle(element);
      return {
        background: css.backgroundColor,
        foreground: css.color,
        opacity: css.opacity,
        cursor: css.cursor,
      };
    });
    assert.deepEqual(style, {
      background: 'rgb(32, 36, 40)',
      foreground: 'rgb(122, 131, 141)',
      opacity: '0.58',
      cursor: 'not-allowed',
    });
    assert.equal(await button.isDisabled(), true);
    await button.focus();
    assert.equal(
      await button.evaluate((element) => element === globalThis.document.activeElement),
      false,
    );
    await page.mouse.up();
  });
}

for (const [variant, background, foreground, indicator] of [
  ['primary', 'rgb(216, 135, 77)', 'rgb(17, 19, 21)', 'rgb(17, 19, 21)'],
  ['secondary', 'rgb(32, 36, 40)', 'rgb(245, 243, 238)', 'rgb(158, 165, 173)'],
  ['ghost', 'rgb(23, 26, 29)', 'rgb(245, 243, 238)', 'rgb(158, 165, 173)'],
  ['danger', 'rgb(48, 29, 32)', 'rgb(229, 115, 115)', 'rgb(229, 115, 115)'],
]) {
  test(`Button ${variant} loading retains its action, surface and busy indicator`, async () => {
    const button = page.getByTestId(variant + '-loading');
    await button.hover({ force: true });
    await page.mouse.down();
    const style = await button.evaluate((element) => {
      const css = getComputedStyle(element);
      const dots = element.querySelector('[aria-hidden="true"]');
      const dotCss = getComputedStyle(dots);
      return {
        background: css.backgroundColor,
        foreground: css.color,
        opacity: css.opacity,
        indicator: dotCss.color,
        font: dotCss.fontFamily,
        weight: dotCss.fontWeight,
        text: element.textContent,
      };
    });
    assert.equal(style.opacity, '0.82');
    assert.equal(style.background, background);
    assert.equal(style.foreground, foreground);
    assert.equal(style.indicator, indicator);
    assert.match(style.font, /IBM Plex Mono/);
    assert.equal(style.weight, '400');
    assert.match(style.text, /Save feature/);
    assert.equal(await button.getAttribute('aria-busy'), 'true');
    assert.equal(await button.isDisabled(), true);
    await page.mouse.up();
  });
}

for (const [id, background] of [
  ['card', 'rgb(23, 26, 29)'],
  ['elevated-card', 'rgb(30, 34, 38)'],
]) {
  test(`Card ${id} owns only the master container radius and padding`, async () => {
    const style = await page.getByTestId(id).evaluate((element) => {
      const css = getComputedStyle(element);
      return {
        radius: css.borderRadius,
        padding: css.padding,
        background: css.backgroundColor,
        width: css.width,
        minWidth: css.minWidth,
      };
    });
    assert.deepEqual(style, {
      radius: '14px',
      padding: '18px 20px',
      background,
      width: '300px',
      minWidth: '0px',
    });
    await page.setViewportSize({ width: 240, height: 768 });
    assert.equal(
      await page.getByTestId(id).evaluate((element) => element.getBoundingClientRect().width),
      240,
    );
  });
}

test('Button keeps the existing size geometry and reduced-motion behavior', async () => {
  for (const [size, height, padding] of [
    ['small', 32, '4.8px 10.4px'],
    ['medium', 40, '7.2px 13.6px'],
    ['large', 48, '9.6px 17.6px'],
  ]) {
    const actual = await page.getByTestId('size-' + size).evaluate((element) => {
      const css = getComputedStyle(element);
      return {
        height: element.getBoundingClientRect().height,
        padding: css.padding,
        transition: css.transitionDuration,
      };
    });
    assert.deepEqual(actual, { height, padding, transition: '0s' });
  }
});

for (const [theme, ring] of [
  ['dark', 'rgb(216, 135, 77)'],
  ['light', 'rgb(169, 79, 24)'],
]) {
  test(`Button ${theme} keyboard focus stays visible for every variant`, async () => {
    await page.locator('html').evaluate((element, value) => {
      element.dataset.theme = value;
    }, theme);
    await page.keyboard.press('Tab');
    for (const variant of ['primary', 'secondary', 'ghost', 'danger']) {
      const button = page.getByTestId(variant + '-default');
      await button.focus();
      await button.hover();
      await page.keyboard.down('Space');
      const actual = await button.evaluate((element) => {
        const css = getComputedStyle(element);
        return {
          visible: element.matches(':focus-visible'),
          color: css.outlineColor,
          width: css.outlineWidth,
          style: css.outlineStyle,
          offset: css.outlineOffset,
        };
      });
      assert.deepEqual(actual, {
        visible: true,
        color: ring,
        width: '2px',
        style: 'solid',
        offset: '3px',
      });
      await page.keyboard.up('Space');
    }
  });
}

test('Button and Card resolve Light surfaces from semantic tokens', async () => {
  await page.locator('html').evaluate((element) => {
    element.dataset.theme = 'light';
  });
  for (const [variant, background, foreground] of [
    ['primary', 'rgb(169, 79, 24)', 'rgb(255, 255, 255)'],
    ['secondary', 'rgb(229, 226, 221)', 'rgb(24, 26, 29)'],
    ['ghost', 'rgb(255, 255, 255)', 'rgb(24, 26, 29)'],
    ['danger', 'rgb(250, 233, 235)', 'rgb(181, 45, 56)'],
  ]) {
    const actual = await colors(page.getByTestId(variant + '-default'));
    assert.equal(actual.background, background);
    assert.equal(actual.foreground, foreground);
    const disabled = await colors(page.getByTestId(variant + '-disabled'));
    assert.equal(disabled.background, 'rgb(229, 226, 221)');
    assert.equal(disabled.foreground, 'rgb(107, 110, 104)');
  }
  for (const [variant, hoverBackground, pressedBackground] of [
    ['primary', 'rgb(152, 70, 26)', 'rgb(120, 50, 15)'],
    ['secondary', 'rgb(229, 226, 221)', 'rgb(244, 227, 213)'],
    ['ghost', 'rgb(255, 255, 255)', 'rgb(244, 227, 213)'],
  ]) {
    const button = page.getByTestId(variant + '-default');
    await button.hover();
    assert.equal((await colors(button)).background, hoverBackground);
    await page.mouse.down();
    assert.equal((await colors(button)).background, pressedBackground);
    assert.equal(
      (await colors(button)).foreground,
      variant === 'primary' ? 'rgb(255, 255, 255)' : 'rgb(24, 26, 29)',
    );
    await page.mouse.up();
  }
  assert.equal(
    await page.getByTestId('card').evaluate((element) => getComputedStyle(element).backgroundColor),
    'rgb(255, 255, 255)',
  );
  assert.equal(
    await page
      .getByTestId('elevated-card')
      .evaluate((element) => getComputedStyle(element).backgroundColor),
    'rgb(251, 250, 248)',
  );
});

test('Button Dark primary pressed label meets 4.5:1 text contrast', async () => {
  const button = page.getByTestId('primary-default');
  await button.hover();
  await page.mouse.down();
  const ratio = await button.evaluate((element) => {
    const [foreground, background] = [
      getComputedStyle(element).color,
      getComputedStyle(element).backgroundColor,
    ].map((value) =>
      value
        .match(/[\d.]+/g)
        .slice(0, 3)
        .map(Number),
    );
    const luminance = ([r, g, b]) => {
      const linear = [r, g, b].map((channel) => {
        const normalized = channel / 255;
        return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
      });
      return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
    };
    const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
    return (values[0] + 0.05) / (values[1] + 0.05);
  });
  assert.ok(ratio >= 4.5, `Expected at least 4.5:1, received ${ratio.toFixed(2)}:1`);
  await page.mouse.up();
});
