import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.beforeEach(async ({ page }) => {
  await page.route('https://api.github.com/**', (route) => route.abort());
});

for (const [route, language] of [
  ['/', 'en-US'],
  ['/zh/', 'zh-Hans'],
]) {
  for (const theme of ['light', 'dark']) {
    test(`${language} ${theme}: accessible page and stable scene transitions`, async ({
      page,
    }) => {
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.addInitScript(
        (preference) =>
          localStorage.setItem('leftblank-appearance', preference),
        theme,
      );
      await page.goto(route);
      await expect(page.locator('html')).toHaveAttribute('lang', language);
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      await expect
        .poll(() =>
          page
            .locator('.hero-copy')
            .evaluate((element) => getComputedStyle(element).opacity),
        )
        .toBe('1');
      const pageAccessibility = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        // Inactive scene copy is audited separately once it becomes readable.
        .exclude('.atelier-story:not(.is-active)')
        // These labels belong to artwork, whose images already have alternative text.
        .exclude('.hero-art .art-label')
        .exclude('.feature-visual[aria-hidden="true"]')
        .analyze();
      expect(
        pageAccessibility.violations.map((violation) => ({
          rule: violation.id,
          nodes: violation.nodes.map((node) => ({
            target: node.target,
            summary: node.failureSummary,
          })),
        })),
      ).toEqual([]);
      const captures = page.locator('.atelier-stage [data-visual]');
      await expect(captures).toHaveCount(6);
      for (const scene of [
        'report',
        'slides',
        'diagram',
        'poster',
        'notes',
        'essay',
      ]) {
        await page.locator(`[data-story="${scene}"]`).scrollIntoViewIfNeeded();
        await expect(page.locator('[data-atelier]')).toHaveAttribute(
          'data-scene',
          scene,
        );
        await expect(
          page.locator('.atelier-stage .work-visual.is-active'),
        ).toHaveCount(1);
        const inactive = await captures.evaluateAll((elements) =>
          elements
            .filter((element) => !element.classList.contains('is-active'))
            .map((element) => ({
              hidden: getComputedStyle(element).visibility,
              inert: element.inert,
            })),
        );
        expect(
          inactive.every(
            (element) => element.hidden === 'hidden' && element.inert,
          ),
        ).toBe(true);
        await expect
          .poll(() =>
            page
              .locator('.atelier-story.is-active .story-copy')
              .evaluate((element) => getComputedStyle(element).opacity),
          )
          .toBe('1');
        const accessibility = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
          // Scope contrast checks to visible scene copy, away from offscreen overlapping artwork.
          .include('.atelier-story.is-active')
          .analyze();
        expect(
          accessibility.violations.map((violation) => ({
            rule: violation.id,
            targets: violation.nodes.map((node) => node.target),
          })),
        ).toEqual([]);
      }
      expect(errors).toEqual([]);
    });
  }
}

test('mobile cards follow natural height and vertical gestures scroll the page', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const cards = page.locator('.atelier-stories');
  await cards.scrollIntoViewIfNeeded();
  await expect(page.locator('.atelier-stage [data-visual]')).toHaveCount(0);
  for (const scene of ['essay', 'poster', 'report', 'essay']) {
    await page.locator(`[data-story="${scene}"]`).evaluate((element) =>
      element.scrollIntoView({
        block: 'nearest',
        inline: 'start',
        behavior: 'instant',
      }),
    );
    await expect(page.locator('[data-atelier]')).toHaveAttribute(
      'data-scene',
      scene,
    );
    await expect
      .poll(async () =>
        cards.evaluate((element) => {
          const active = element.querySelector('.is-active');
          const style = getComputedStyle(element);
          return Math.abs(
            element.clientHeight -
              active.offsetHeight -
              parseFloat(style.paddingTop) -
              parseFloat(style.paddingBottom),
          );
        }),
      )
      .toBeLessThanOrEqual(18);
  }
  expect(
    await cards.evaluate((element) => getComputedStyle(element).overflowY),
  ).toBe('hidden');
  const bounds = await cards.boundingBox();
  const before = await page.evaluate(() => scrollY);
  await page.mouse.move(
    bounds.x + bounds.width / 2,
    Math.min(bounds.y + 100, 700),
  );
  await page.mouse.wheel(0, 220);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(before);
});

test('native dialog restores keyboard focus when Escape closes it', async ({
  page,
}) => {
  await page.goto('/#work-report');
  const link = page.locator('[data-story="report"] [data-full-view]');
  await link.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('dialog')).toBeVisible();
  await expect(page.locator('dialog img')).toHaveAttribute(
    'src',
    /app-03-report/,
  );
  await page.keyboard.press('Escape');
  await expect(page.locator('dialog')).not.toBeVisible();
  await expect(link).toBeFocused();
});

test('reduced motion stops animations without hiding content', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#work-poster');
  await expect(page.locator('[data-atelier]')).toHaveAttribute(
    'data-scene',
    'poster',
  );
  const animations = await page
    .locator('.is-active .poster-sheet')
    .evaluate((element) => getComputedStyle(element).animationName);
  expect(animations).toBe('none');
  await expect(
    page.locator('.atelier-stage .work-visual.is-active'),
  ).toBeVisible();
});

test('bilingual content and direct download survive without JavaScript', async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4399/zh/');
  await expect(page.locator('[data-story]')).toHaveCount(6);
  await expect(page.locator('[data-visual]').first()).toBeVisible();
  await expect(page.locator('[data-nightly-download]').first()).toHaveAttribute(
    'href',
    /^https:\/\/github.com\/leftblank-app\/leftblank\/releases\/download\//,
  );
  await expect(page.locator('#language')).toHaveAttribute('href', '/');
  await context.close();
});
