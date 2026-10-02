import { afterEach, describe, expect, test, vi } from 'vitest';
import { browser, click } from './browser.js';

afterEach(() => vi.unstubAllGlobals());

async function boot(options) {
  const state = browser(options);
  await import('../../assets/js/site.js');
  return state;
}

describe('theme and language controls', () => {
  test('cycles preferences and follows system changes only in system mode', async () => {
    const state = await boot();
    const button = document.querySelector('#appearance');
    click(button);
    expect(state.root.dataset.theme).toBe('light');
    click(button);
    expect(state.root.dataset.theme).toBe('dark');
    state.queries.get('(prefers-color-scheme: dark)').change(false);
    expect(state.root.dataset.theme).toBe('dark');
    click(button);
    state.queries.get('(prefers-color-scheme: dark)').change(true);
    expect(state.root.dataset.theme).toBe('dark');
    expect(button.getAttribute('aria-label')).toBe('System; next Light');
    expect(document.querySelector('meta[name="theme-color"]').content).toBe(
      '#202729',
    );
    expect(state.storage.setItem).toHaveBeenLastCalledWith(
      'leftblank-appearance',
      'system',
    );
  });
  test('continues changing appearance when storage is blocked', async () => {
    const state = await boot();
    state.storage.setItem.mockImplementation(() => {
      throw new Error('Blocked');
    });
    click(document.querySelector('#appearance'));
    expect(state.root.dataset.appearance).toBe('light');
  });
  test.each(['en-US', 'zh-Hans'])(
    'stores the explicit %s language choice',
    async (language) => {
      const state = await boot();
      const link = document.querySelector('#language');
      link.lang = language;
      click(link);
      expect(state.storage.setItem).toHaveBeenCalledWith(
        'leftblank-language',
        language.startsWith('zh') ? 'zh' : 'en',
      );
    },
  );
  test('works on pages without a showcase or language control', async () => {
    const state = browser();
    document.querySelector('[data-atelier]').remove();
    document.querySelector('#language').remove();
    await import('../../assets/js/site.js');
    click(document.querySelector('#appearance'));
    expect(state.root.dataset.theme).toBe('light');
  });
});

describe('showcase regression cases', () => {
  test('keeps exactly one desktop visual active when scrolling in either direction', async () => {
    const state = await boot();
    expect(
      state.visuals.every((visual) =>
        visual.parentElement.classList.contains('atelier-stage'),
      ),
    ).toBe(true);
    for (const index of [1, 4, 5, 3, 0]) {
      state.choose(index);
      state.scroll();
      state.scroll();
      expect(state.frames).toHaveLength(1);
      state.flush();
      expect(state.atelier.dataset.scene).toBe(
        state.stories[index].dataset.story,
      );
      expect(
        state.visuals.filter((visual) =>
          visual.classList.contains('is-active'),
        ),
      ).toEqual([state.visuals[index]]);
      expect(state.visuals[index].inert).toBe(false);
      expect(state.visuals.filter((visual) => visual.inert)).toHaveLength(5);
      expect(state.visuals[index].querySelector('img').loading).toBe('eager');
    }
  });
  test('adapts mobile height to the selected card and subsequent content resizing', async () => {
    const state = await boot({ wide: false });
    expect(state.storyList.style.getPropertyValue('--story-height')).toBe(
      '420px',
    );
    state.choose(5);
    state.storyList.dispatchEvent(new Event('scroll'));
    state.flush();
    expect(state.atelier.dataset.scene).toBe('poster');
    expect(state.storyList.style.getPropertyValue('--story-height')).toBe(
      '620px',
    );
    state.heights[5] = 700;
    state.resizeCallbacks[0]();
    state.flush();
    expect(state.storyList.style.getPropertyValue('--story-height')).toBe(
      '720px',
    );
    expect(
      state.visuals.every(
        (visual) => !visual.inert && !visual.hasAttribute('aria-hidden'),
      ),
    ).toBe(true);
  });
  test('moves visuals back to cards when crossing the responsive breakpoint', async () => {
    const state = await boot();
    state.queries.get('(min-width: 980px)').change(false);
    expect(
      state.visuals.every(
        (visual, index) => visual.parentElement === state.stories[index],
      ),
    ).toBe(true);
    expect(state.storyList.tabIndex).toBe(0);
    state.queries.get('(min-width: 980px)').change(true);
    expect(state.atelier.classList.contains('is-enhanced')).toBe(true);
    expect(state.storyList.style.getPropertyValue('--story-height')).toBe('');
    expect(state.storyList.tabIndex).toBe(-1);
  });
  test('shows the focused desktop story and handles focus outside a story', async () => {
    const state = await boot();
    state.stories[4]
      .querySelector('a')
      .dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    expect(state.atelier.dataset.scene).toBe('diagram');
    state.storyList.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    expect(state.atelier.dataset.scene).toBe('diagram');
  });
  test('keeps mobile focus from changing the selected card', async () => {
    const state = await boot({ wide: false });
    state.stories[4]
      .querySelector('a')
      .dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    expect(state.atelier.dataset.scene).toBe('essay');
  });
  test('restores a deep-linked story after laying out the desktop stage', async () => {
    const state = await boot({ url: 'https://leftblank.test/#work-report' });
    state.choose(2);
    state.flush();
    expect(state.stories[2].scrollIntoView).toHaveBeenCalledWith({
      block: 'center',
      inline: 'start',
      behavior: 'instant',
    });
    expect(state.atelier.dataset.scene).toBe('report');
  });
  test('does not add scroll motion when reduced motion is enabled', async () => {
    const state = await boot({ reduced: true });
    expect(state.atelier.style.getPropertyValue('--travel')).toBe('');
    state.choose(3);
    state.windowEvents.get('resize')();
    state.flush();
    expect(state.atelier.dataset.scene).toBe('slides');
    expect(state.atelier.style.getPropertyValue('--travel')).toBe('');
  });
});

describe('image dialog', () => {
  test('opens the selected capture with its alternative text and closes via its button', async () => {
    const state = await boot();
    const event = click(state.stories[2].querySelector('a'));
    expect(event.defaultPrevented).toBe(true);
    expect(state.viewer.showModal).toHaveBeenCalledOnce();
    expect(state.viewer.querySelector('img').src).toMatch(
      '/assets/report.webp',
    );
    expect(state.viewer.querySelector('img').alt).toBe('report capture');
    click(state.viewer.querySelector('button'));
    expect(state.viewer.close).toHaveBeenCalledOnce();
  });
  test('only closes backdrop clicks outside the dialog bounds', async () => {
    const state = await boot();
    click(state.viewer, { clientX: 100, clientY: 100 });
    expect(state.viewer.close).not.toHaveBeenCalled();
    click(state.viewer, { clientX: 10, clientY: 10 });
    expect(state.viewer.close).toHaveBeenCalledOnce();
  });
  test('retains the native link when dialogs are unsupported', async () => {
    const state = await boot();
    state.viewer.showModal = undefined;
    expect(click(state.stories[0].querySelector('a')).defaultPrevented).toBe(
      false,
    );
  });
  test.each([
    { ctrlKey: true },
    { metaKey: true },
    { shiftKey: true },
    { altKey: true },
    { button: 1 },
  ])('preserves modified image clicks: %j', async (options) => {
    const state = await boot();
    expect(
      click(state.stories[0].querySelector('a'), options).defaultPrevented,
    ).toBe(false);
    expect(state.viewer.showModal).not.toHaveBeenCalled();
  });
});

describe('pointer depth', () => {
  test('coalesces mouse movement and resets on leave and reduced-motion changes', async () => {
    const state = await boot();
    const surface = document.querySelector('[data-paper-art]');
    function move(pointerType = 'mouse') {
      const event = new MouseEvent('pointermove', {
        clientX: 300,
        clientY: 50,
      });
      Object.defineProperty(event, 'pointerType', { value: pointerType });
      surface.dispatchEvent(event);
    }
    move('touch');
    expect(state.frames).toHaveLength(0);
    move();
    move();
    state.flush();
    expect(surface.style.getPropertyValue('--tilt-x')).toBe('0.5');
    expect(surface.style.getPropertyValue('--tilt-y')).toBe('-0.5');
    surface.dispatchEvent(new Event('pointerleave'));
    expect(surface.style.getPropertyValue('--tilt-x')).toBe('0');
    move();
    state.flush();
    state.queries.get('(prefers-reduced-motion: reduce)').change(true);
    expect(surface.style.getPropertyValue('--tilt-y')).toBe('0');
    move();
    expect(state.frames).toHaveLength(0);
  });
});

const nightly =
  'https://github.com/leftblank-app/leftblank/releases/download/preview-2/LeftBlank-Preview-2-macOS-arm64.zip';
const release = (tag, date, url = nightly) => ({
  tag_name: tag,
  published_at: date,
  draft: false,
  assets: [
    { name: 'LeftBlank-Preview-2-macOS-arm64.zip', browser_download_url: url },
  ],
});

describe('nightly downloads without live network requests', () => {
  test('resolves the latest eligible nightly and reuses the lookup', async () => {
    const state = await boot();
    const link = document.querySelector('[data-nightly-download]');
    expect(fetch).not.toHaveBeenCalled();
    fetch.mockResolvedValue({
      ok: true,
      json: async () => [
        release('preview-1', '2026-09-01'),
        { ...release('preview-9', '2026-10-02'), draft: true },
        release('stable-2', '2026-10-01'),
        release('preview-2', '2026-10-01'),
      ],
    });
    click(link);
    expect(link.getAttribute('aria-busy')).toBe('true');
    await vi.waitFor(() =>
      expect(state.location.assign).toHaveBeenCalledWith(nightly),
    );
    expect(link.textContent).toBe('Download nightly');
    expect(link.hasAttribute('aria-busy')).toBe(false);
    click(link);
    await vi.waitFor(() =>
      expect(state.location.assign).toHaveBeenCalledTimes(2),
    );
    expect(fetch).toHaveBeenCalledOnce();
  });
  test.each(['http error', 'timeout', 'no archive', 'untrusted URL'])(
    'falls back and allows retry after %s',
    async (failure) => {
      const state = await boot();
      const link = document.querySelector('[data-nightly-download]');
      if (failure === 'timeout') {
        fetch.mockRejectedValue(new DOMException('Timed out', 'TimeoutError'));
      } else {
        fetch.mockResolvedValue({
          ok: failure !== 'http error',
          json: async () =>
            failure === 'no archive'
              ? [{ ...release('preview-2', '2026-10-01'), assets: [] }]
              : [
                  release(
                    'preview-2',
                    '2026-10-01',
                    'https://untrusted.test/archive.zip',
                  ),
                ],
        });
      }
      click(link);
      await vi.waitFor(() =>
        expect(state.location.assign).toHaveBeenCalledWith(link.href),
      );
      expect(link.hasAttribute('aria-busy')).toBe(false);
      fetch.mockResolvedValue({
        ok: true,
        json: async () => [release('preview-2', '2026-10-01')],
      });
      click(link);
      await vi.waitFor(() =>
        expect(state.location.assign).toHaveBeenLastCalledWith(nightly),
      );
      expect(fetch).toHaveBeenCalledTimes(2);
    },
  );
  test.each([
    { ctrlKey: true },
    { metaKey: true },
    { shiftKey: true },
    { altKey: true },
    { button: 1 },
  ])('preserves direct links for modified clicks: %j', async (options) => {
    await boot();
    expect(
      click(document.querySelector('[data-nightly-download]'), options)
        .defaultPrevented,
    ).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });
});
