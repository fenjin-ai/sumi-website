(() => {
  const root = document.documentElement;
  const languageButton = document.querySelector('#language');
  const appearanceButton = document.querySelector('#appearance');
  const system = matchMedia('(prefers-color-scheme: dark)');
  const store = (key, value) => { try { localStorage.setItem(key, value); } catch {} };
  let language = new URLSearchParams(location.search).get('lang');
  if (!['en', 'zh'].includes(language)) {
    try { language = localStorage.getItem('leftblank-language'); } catch {}
    if (!['en', 'zh'].includes(language)) language = navigator.language.startsWith('zh') ? 'zh' : 'en';
  }
  const scenes = {
    '01-essay': { en: ['Room for your next thought.', 'Shape an essay, a journal entry or your next chapter. Keep your outline nearby and see the page as you write.', 'WORDS / OUTLINE / PDF'], zh: ['让想法，慢慢成形。', '写随笔、记日常，或开始下一章。大纲候在页边，页面随文字慢慢成形。', '文字 / 大纲 / PDF'] },
    '02-notes': { en: ['Make a complex idea clear.', 'Bring equations, code and tables into one readable document. Keep the reasoning and the details together.', 'EQUATIONS / CODE / TABLES'], zh: ['把复杂的想法讲清楚。', '让公式、代码与表格，在一份文稿里清楚相遇。把推导的过程和重要的细节，一起留下。', '公式 / 代码 / 表格'] },
    '03-report': { en: ['Give your findings a form.', 'Turn observations into a visual report. Draw a chart, compare the results and share a polished PDF.', 'CHARTS / DATA / PDF'], zh: ['把思路写成一份好报告。', '用图表梳理观察，用表格对照结果。让重要的信息更好理解，再导出一份可以分享的 PDF。', '图表 / 数据 / PDF'] },
    '04-slides': { en: ['A good beginning for your next talk.', 'Compose landscape presentation pages in Typst. Arrange the ideas, set the rhythm and share them as a PDF.', '16:9 / LAYOUT / PDF'], zh: ['给下一次演讲，一个好开场。', '用 Typst 排出横版演示页。安排节奏、梳理观点，导出 PDF 演示稿，讲给更多人听。', '16:9 / 演示排版 / PDF'] },
    '05-diagram': { en: ['Let relationships take shape.', 'Use Typst packages such as CeTZ to draw connections, workflows and diagrams beside the explanation.', 'CETZ / VECTOR / WORKFLOW'], zh: ['让关系，有形可见。', '用 CeTZ 等 Typst 包画出节点与联系。让流程图与说明待在一起，一张图，看懂思路。', 'CeTZ / 矢量 / 流程'] },
    '06-poster': { en: ['The page is part of the expression.', 'Explore geometry, color and type. Build a poster or a visual composition from the same writing space.', 'GEOMETRY / TYPE / COLOR'], zh: ['页面，也是一种表达方式。', '试试几何、色彩与字体。在同一个创作空间里，排一张海报，做一次视觉探索。', '几何 / 字体 / 色彩'] }
  };
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  let selected = '01-essay';
  function renderScene() {
    const copy = scenes[selected][language];
    const locale = language === 'zh' ? 'zh-Hans' : 'en-US';
    const image = document.querySelector('#scene-image');
    const active = tabs.find(tab => tab.dataset.scene === selected);
    tabs.forEach(tab => { const current = tab === active; tab.setAttribute('aria-selected', String(current)); tab.tabIndex = current ? 0 : -1; });
    document.querySelector('#scene-panel').setAttribute('aria-labelledby', active.id);
    document.querySelector('.scene-index').textContent = selected.slice(0, 2);
    document.querySelector('#scene-title').textContent = copy[0];
    document.querySelector('#scene-description').textContent = copy[1];
    document.querySelector('#scene-format').textContent = copy[2];
    image.src = `/assets/works/app-${selected}.${locale}.webp`;
    image.alt = language === 'zh' ? `留白实际编辑与预览画面：${active.textContent.trim()}` : `Editing and live preview in LeftBlank: ${active.textContent.trim()}`;
    document.querySelector('#scene-full').href = image.src;
  }
  function renderAppearance() {
    const preference = root.dataset.appearance;
    root.dataset.theme = preference === 'system' ? (system.matches ? 'dark' : 'light') : preference;
    const names = language === 'zh' ? {system: '跟随系统', light: '浅色', dark: '深色'} : {system: 'System', light: 'Light', dark: 'Dark'};
    const next = {system: 'light', light: 'dark', dark: 'system'}[preference];
    appearanceButton.title = names[preference];
    appearanceButton.setAttribute('aria-label', language === 'zh' ? `外观：${names[preference]}。切换为${names[next]}。` : `Appearance: ${names[preference]}. Change to ${names[next]}.`);
    document.querySelector('meta[name="theme-color"]').content = root.dataset.theme === 'dark' ? '#202729' : '#f4f4ef';
  }
  function renderLanguage() {
    root.lang = language === 'zh' ? 'zh-Hans' : 'en';
    document.querySelectorAll('[data-en][data-zh]').forEach(el => { el.textContent = el.dataset[language]; });
    document.querySelectorAll('[data-work]').forEach(image => {
      image.src = `/assets/works/${image.dataset.work}.${language === 'zh' ? 'zh-Hans' : 'en-US'}.webp`;
      image.alt = image.dataset[language === 'zh' ? 'altZh' : 'altEn'];
    });
    languageButton.textContent = language === 'zh' ? 'EN' : '中文';
    languageButton.lang = language === 'zh' ? 'en' : 'zh-Hans';
    languageButton.setAttribute('aria-label', language === 'zh' ? 'Switch to English' : '切换为中文');
    document.title = language === 'zh' ? '留白 — 此中有真意，欲辨已忘言' : 'LeftBlank — Ink for your thoughts';
    document.querySelector('meta[name="description"]').content = language === 'zh' ? '留白，免费的 Mac Typst 写作与排版编辑器。创作文章、公式、图表、演示稿、图解与海报，实时预览，导出 PDF。' : 'LeftBlank, a free Typst writing and typesetting editor for Mac. Create essays, equations, charts, presentation pages, diagrams and posters, with live preview and PDF export.';
    renderScene(); renderAppearance();
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => { selected = tab.dataset.scene; renderScene(); });
    tab.addEventListener('keydown', event => {
      let target;
      if (event.key === 'ArrowRight') target = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') target = (index + tabs.length - 1) % tabs.length;
      if (event.key === 'Home') target = 0;
      if (event.key === 'End') target = tabs.length - 1;
      if (target === undefined) return;
      event.preventDefault(); selected = tabs[target].dataset.scene; renderScene(); tabs[target].focus();
    });
  });
  languageButton.addEventListener('click', () => {
    language = language === 'zh' ? 'en' : 'zh'; store('leftblank-language', language);
    const url = new URL(location.href); url.searchParams.set('lang', language); history.replaceState(null, '', url); renderLanguage();
  });
  appearanceButton.addEventListener('click', () => { root.dataset.appearance = {system: 'light', light: 'dark', dark: 'system'}[root.dataset.appearance]; store('leftblank-appearance', root.dataset.appearance); renderAppearance(); });
  system.addEventListener('change', renderAppearance);
  renderLanguage();
})();
