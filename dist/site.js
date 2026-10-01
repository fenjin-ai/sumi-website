(() => {
  const root = document.documentElement;
  const languageButton = document.querySelector('#language');
  const appearanceButton = document.querySelector('#appearance');
  const system = matchMedia('(prefers-color-scheme: dark)');
  const store = (key, value) => { try { localStorage.setItem(key, value); } catch {} };
  let language = new URLSearchParams(location.search).get('lang');
  if (!['en', 'zh'].includes(language)) {
    try { language = localStorage.getItem('sumi-language'); } catch {}
    if (!['en', 'zh'].includes(language)) language = navigator.language.startsWith('zh') ? 'zh' : 'en';
  }
  function renderAppearance() {
    const preference = root.dataset.appearance;
    root.dataset.theme = preference === 'system' ? (system.matches ? 'dark' : 'light') : preference;
    const names = language === 'zh' ? { system: '跟随系统', light: '浅色', dark: '深色' } : { system: 'System', light: 'Light', dark: 'Dark' };
    const next = { system: 'light', light: 'dark', dark: 'system' }[preference];
    appearanceButton.title = language === 'zh' ? `外观：${names[preference]}` : `Appearance: ${names[preference]}`;
    appearanceButton.setAttribute('aria-label', language === 'zh' ? `外观：${names[preference]}。切换为${names[next]}。` : `Appearance: ${names[preference]}. Change to ${names[next]}.`);
    document.querySelector('meta[name="theme-color"]').content = root.dataset.theme === 'dark' ? '#191c1e' : '#fafafa';
  }
  function renderLanguage() {
    root.lang = language === 'zh' ? 'zh-Hans' : 'en';
    const cover = document.querySelector('.document-preview img');
    cover.src = language === 'zh' ? '/assets/welcome-zh.png' : '/assets/welcome.png';
    cover.alt = language === 'zh' ? '留白入门文稿，包含公式、图表与排版示例' : "Sumi's starter document, with a diagram, equations, a table and typeset text";
    document.querySelectorAll('[data-en][data-zh]').forEach(el => { el.textContent = el.dataset[language]; });
    languageButton.textContent = language === 'zh' ? 'EN' : '中文';
    languageButton.lang = language === 'zh' ? 'en' : 'zh-Hans';
    languageButton.setAttribute('aria-label', language === 'zh' ? 'Switch to English' : '切换为中文');
    document.title = language === 'zh' ? '留白 — 此中有真意，欲辨已忘言' : 'Sumi — Ink for your thoughts';
    document.querySelector('meta[name="description"]').content = language === 'zh' ? '留白。此中有真意，欲辨已忘言。一处安静的 Mac 写作空间，从一个念头，到一页好看的文字。' : 'Sumi. Ink for your thoughts. A quiet writing app for Mac, from a first thought to a beautifully finished page.';
    document.querySelector('#privacy-close').setAttribute('aria-label', language === 'zh' ? '关闭隐私说明' : 'Close privacy note');
    renderAppearance();
  }
  languageButton.addEventListener('click', () => {
    language = language === 'zh' ? 'en' : 'zh'; store('sumi-language', language);
    const url = new URL(location.href); url.searchParams.set('lang', language); history.replaceState(null, '', url);
    renderLanguage();
  });
  appearanceButton.addEventListener('click', () => {
    root.dataset.appearance = { system: 'light', light: 'dark', dark: 'system' }[root.dataset.appearance];
    store('sumi-appearance', root.dataset.appearance); renderAppearance();
  });
  system.addEventListener('change', renderAppearance);
  const privacy = document.querySelector('#privacy');
  document.querySelector('#privacy-open').addEventListener('click', () => privacy.showModal());
  document.querySelector('#privacy-close').addEventListener('click', () => privacy.close());
  privacy.addEventListener('click', event => { if (event.target === privacy) { const r = privacy.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) privacy.close(); } });
  renderLanguage();
})();
