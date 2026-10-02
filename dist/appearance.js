// Resolve the preference before first paint. Storage is optional (private browsing).
(() => {
  let appearance = 'system';
  try { appearance = localStorage.getItem('leftblank-appearance') || 'system'; } catch {}
  if (!['system', 'light', 'dark'].includes(appearance)) appearance = 'system';
  document.documentElement.dataset.appearance = appearance;
  document.documentElement.dataset.theme = appearance === 'system'
    ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : appearance;
})();
