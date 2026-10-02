import { vi } from 'vitest';

export function browser({
  wide = true,
  reduced = false,
  dark = false,
  url = 'https://leftblank.test/',
  language = 'en-US',
  stored = {},
} = {}) {
  vi.resetModules();
  document.documentElement.innerHTML = `<head><meta name="theme-color" content="#f4f4ef"></head><body>
    <button id="appearance" data-system="System" data-light="Light" data-dark="Dark" data-label="{current}; next {next}"></button>
    <a id="language" lang="zh-Hans" href="/zh/">中文</a>
    <section><div data-atelier><div class="atelier-stage"></div><div class="atelier-stories" style="padding: 10px 24px">
    ${['essay', 'notes', 'report', 'slides', 'diagram', 'poster'].map((id) => `<article id="work-${id}" data-story="${id}"><a data-full-view href="/assets/${id}.webp">Preview</a><figure data-visual="${id}"><img src="/assets/${id}.webp" alt="${id} capture" loading="lazy"></figure></article>`).join('')}
    </div></div><dialog data-viewer><button>Close</button><img alt="Preview"></dialog></section>
    <div data-paper-art></div><a data-nightly-download href="https://github.com/leftblank-app/leftblank/releases/download/preview-1/fallback.zip" data-releases-api="https://api.github.com/repos/leftblank-app/leftblank/releases" data-loading="Loading">Download nightly</a>
    </body>`;
  const root = document.documentElement;
  root.dataset.appearance = 'system';
  root.dataset.urlEn = '/';
  root.dataset.urlZh = '/zh/';
  const address = new URL(url);
  const location = {
    href: address.href,
    pathname: address.pathname,
    hash: address.hash,
    assign: vi.fn(),
    replace: vi.fn(),
  };
  vi.stubGlobal('location', location);
  vi.stubGlobal('history', { replaceState: vi.fn() });
  vi.stubGlobal('navigator', { language });
  const storage = {
    getItem: vi.fn((key) => stored[key] ?? null),
    setItem: vi.fn(),
  };
  vi.stubGlobal('localStorage', storage);
  const queries = new Map();
  vi.stubGlobal('matchMedia', (query) => {
    if (!queries.has(query)) {
      const listeners = [];
      const media = {
        matches: query.includes('980px')
          ? wide
          : query.includes('reduced-motion')
            ? reduced
            : dark,
        addEventListener: vi.fn((_event, callback) => listeners.push(callback)),
        change(matches) {
          this.matches = matches;
          listeners.forEach((callback) => callback({ matches }));
        },
      };
      queries.set(query, media);
    }
    return queries.get(query);
  });
  const frames = [];
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn((callback) => {
      frames.push(callback);
      return frames.length;
    }),
  );
  const windowEvents = new Map();
  vi.stubGlobal('addEventListener', (event, callback) =>
    windowEvents.set(event, callback),
  );
  vi.stubGlobal('innerHeight', 800);
  const resizeCallbacks = [];
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback) {
        resizeCallbacks.push(callback);
      }
      observe = vi.fn();
    },
  );
  vi.stubGlobal('fetch', vi.fn());
  const atelier = document.querySelector('[data-atelier]');
  const stories = [...document.querySelectorAll('[data-story]')];
  const visuals = [...document.querySelectorAll('[data-visual]')];
  const storyList = document.querySelector('.atelier-stories');
  const heights = stories.map((_story, index) => 400 + index * 40);
  let current = 0;
  const rect = (left = 0, top = 0, width = 500, height = 600) => ({
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
  });
  stories.forEach((story, index) => {
    story.getBoundingClientRect = () =>
      rect(24 + (index - current) * 500, 100 + (index - current) * 600);
    Object.defineProperty(story, 'offsetHeight', {
      configurable: true,
      get: () => heights[index],
    });
    story.scrollIntoView = vi.fn();
  });
  storyList.getBoundingClientRect = () => rect();
  document
    .querySelectorAll('[data-paper-art], .atelier-stage')
    .forEach((surface) => {
      surface.getBoundingClientRect = () => rect(0, 0, 400, 200);
    });
  const viewer = document.querySelector('[data-viewer]');
  viewer.showModal = vi.fn(() => viewer.setAttribute('open', ''));
  viewer.close = vi.fn(() => viewer.removeAttribute('open'));
  viewer.getBoundingClientRect = () => rect(20, 20, 400, 300);
  return {
    root,
    location,
    storage,
    queries,
    frames,
    windowEvents,
    resizeCallbacks,
    atelier,
    stories,
    visuals,
    storyList,
    heights,
    viewer,
    choose(index) {
      current = index;
    },
    flush() {
      while (frames.length) {
        frames.shift()();
      }
    },
    scroll() {
      windowEvents.get('scroll')();
    },
  };
}

export function click(element, options = {}) {
  const event = new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    ...options,
  });
  // Observe the site handler before suppressing jsdom's unsupported navigation.
  let defaultPrevented;
  const observe = () => {
    defaultPrevented = event.defaultPrevented;
    event.preventDefault();
  };
  document.addEventListener('click', observe, { once: true });
  element.dispatchEvent(event);
  document.removeEventListener('click', observe);
  return { defaultPrevented };
}
