// Resolve the preference before first paint. Storage is optional (private browsing).
(() => {
  let appearance = 'system';
  try { appearance = localStorage.getItem('leftblank-appearance') || 'system'; } catch {}
  if (!['system', 'light', 'dark'].includes(appearance)) appearance = 'system';
  document.documentElement.dataset.appearance = appearance;
  document.documentElement.dataset.theme = appearance === 'system'
    ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : appearance;
  document.documentElement.classList.add('js');

  // Old shared links still work; each language now has its own canonical URL.
  const root = document.documentElement;
  const url = new URL(location.href);
  const requested = url.searchParams.get('lang');
  let language = requested;
  if (!['en', 'zh'].includes(language) && location.pathname === '/') {
    try { language = localStorage.getItem('leftblank-language'); } catch {}
    if (!['en', 'zh'].includes(language)) language = navigator.language.startsWith('zh') ? 'zh' : 'en';
  }
  const translated = root.dataset[`url${language === 'zh' ? 'Zh' : 'En'}`];
  if (translated && ['en', 'zh'].includes(language)) {
    url.pathname = translated;
    url.searchParams.delete('lang');
    if (url.pathname !== location.pathname) location.replace(url.href);
    else if (requested) history.replaceState(null, '', url);
  }
})();
