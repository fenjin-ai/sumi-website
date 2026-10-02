import { afterEach, describe, expect, test, vi } from 'vitest';
import { browser } from './browser.js';

afterEach(() => vi.unstubAllGlobals());

async function boot(options) {
  const state = browser(options);
  await import('../../assets/js/appearance.js');
  return state;
}

describe('appearance before first paint', () => {
  test.each(['system', 'light', 'dark'])(
    'restores %s preference',
    async (preference) => {
      const state = await boot({
        dark: true,
        stored: { 'leftblank-appearance': preference },
      });
      expect(state.root.dataset.appearance).toBe(preference);
      expect(state.root.dataset.theme).toBe(
        preference === 'light' ? 'light' : 'dark',
      );
      expect(state.root.classList.contains('js')).toBe(true);
    },
  );
  test('rejects invalid stored appearance', async () => {
    const state = await boot({ stored: { 'leftblank-appearance': 'invalid' } });
    expect(state.root.dataset.appearance).toBe('system');
    expect(state.root.dataset.theme).toBe('light');
  });
  test('works when storage is blocked', async () => {
    const state = browser();
    state.storage.getItem.mockImplementation(() => {
      throw new Error('Blocked');
    });
    await import('../../assets/js/appearance.js');
    expect(state.root.dataset.theme).toBe('light');
  });
});

describe('language routing', () => {
  test('uses browser language on the root path', async () => {
    const state = await boot({
      language: 'zh-SG',
      url: 'https://leftblank.test/#work-report',
    });
    expect(state.location.replace).toHaveBeenCalledWith(
      'https://leftblank.test/zh/#work-report',
    );
  });
  test('prefers the saved choice over browser language', async () => {
    const state = await boot({
      language: 'zh-SG',
      stored: { 'leftblank-language': 'en' },
    });
    expect(state.location.replace).not.toHaveBeenCalled();
  });
  test('ignores invalid saved language', async () => {
    const state = await boot({
      stored: { 'leftblank-language': 'invalid' },
      language: 'zh-CN',
    });
    expect(state.location.replace).toHaveBeenCalledWith(
      'https://leftblank.test/zh/',
    );
  });
  test('honors old explicit links and retains other query parameters', async () => {
    const state = await boot({
      url: 'https://leftblank.test/?lang=zh&ref=demo#work-notes',
    });
    expect(state.location.replace).toHaveBeenCalledWith(
      'https://leftblank.test/zh/?ref=demo#work-notes',
    );
  });
  test('cleans up old links without redirecting the current locale', async () => {
    const state = await boot({
      url: 'https://leftblank.test/zh/?lang=zh#work-report',
    });
    expect(state.location.replace).not.toHaveBeenCalled();
    expect(history.replaceState).toHaveBeenCalledWith(
      null,
      '',
      new URL('https://leftblank.test/zh/#work-report'),
    );
  });
  test('does not redirect direct localized pages', async () => {
    const state = await boot({
      url: 'https://leftblank.test/zh/',
      stored: { 'leftblank-language': 'en' },
    });
    expect(state.location.replace).not.toHaveBeenCalled();
  });
  test('falls back to browser language when storage is unavailable', async () => {
    const state = browser({ language: 'zh-CN' });
    state.storage.getItem.mockImplementation(() => {
      throw new Error('Blocked');
    });
    await import('../../assets/js/appearance.js');
    expect(state.location.replace).toHaveBeenCalledWith(
      'https://leftblank.test/zh/',
    );
  });
  test('does not navigate when a translation is unavailable', async () => {
    const state = browser({ url: 'https://leftblank.test/?lang=zh' });
    delete state.root.dataset.urlZh;
    await import('../../assets/js/appearance.js');
    expect(state.location.replace).not.toHaveBeenCalled();
  });
});
