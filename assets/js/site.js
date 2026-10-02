(() => {
  const root = document.documentElement;
  const store = (key, value) => { try { localStorage.setItem(key, value); } catch {} };
  const system = matchMedia('(prefers-color-scheme: dark)');
  const appearance = document.querySelector('#appearance');
  const labels = appearance.dataset;

  function renderAppearance() {
    const preference = root.dataset.appearance;
    root.dataset.theme = preference === 'system' ? (system.matches ? 'dark' : 'light') : preference;
    const next = { system: 'light', light: 'dark', dark: 'system' }[preference];
    appearance.title = labels[preference];
    appearance.setAttribute('aria-label', labels.label.replace('{current}', labels[preference]).replace('{next}', labels[next]));
    document.querySelector('meta[name="theme-color"]').content = root.dataset.theme === 'dark' ? '#202729' : '#f4f4ef';
  }
  appearance.addEventListener('click', () => {
    root.dataset.appearance = { system: 'light', light: 'dark', dark: 'system' }[root.dataset.appearance];
    store('leftblank-appearance', root.dataset.appearance);
    renderAppearance();
  });
  system.addEventListener('change', renderAppearance);
  renderAppearance();
  document.querySelector('#language')?.addEventListener('click', event => {
    store('leftblank-language', event.currentTarget.lang.startsWith('zh') ? 'zh' : 'en');
  });

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const wideScreen = matchMedia('(min-width: 980px)');
  const atelier = document.querySelector('[data-atelier]');
  if (atelier) {
    const stage = atelier.querySelector('.atelier-stage');
    const stories = [...atelier.querySelectorAll('[data-story]')];
    const visuals = stories.map(story => story.querySelector('[data-visual]'));
    const storyList = atelier.querySelector('.atelier-stories');
    const lens = stage.querySelector('.capture-lens');
    let selected = -1;
    let frame;

    function select(index) {
      if (selected === index) return;
      selected = index;
      atelier.dataset.scene = stories[index].dataset.story;
      atelier.classList.remove('is-inspecting');
      lens.style.backgroundImage = `url("${visuals[index].querySelector('img').getAttribute('src')}")`;
      stories.forEach((story, i) => story.classList.toggle('is-active', i === index));
      visuals.forEach((visual, i) => {
        visual.classList.toggle('is-active', i === index);
        if (wideScreen.matches) {
          visual.setAttribute('aria-hidden', String(i !== index));
          visual.inert = i !== index;
        }
      });
      // Warm the next real capture before the reader reaches it.
      [index, Math.min(index + 1, visuals.length - 1)].forEach(i => {
        visuals[i].querySelectorAll('img').forEach(image => { image.loading = 'eager'; });
      });
    }
    function update() {
      frame = undefined;
      if (!wideScreen.matches) return;
      const center = innerHeight * .5;
      const positions = stories.map(story => story.getBoundingClientRect());
      const index = positions.reduce((closest, rect, i) =>
        Math.abs(rect.top + rect.height / 2 - center) < Math.abs(positions[closest].top + positions[closest].height / 2 - center) ? i : closest, 0);
      select(index);
      if (!reducedMotion.matches) {
        const rect = positions[index];
        atelier.style.setProperty('--travel', Math.max(-1, Math.min(1, (rect.top + rect.height / 2 - center) / rect.height)));
      }
    }
    function requestUpdate() {
      if (wideScreen.matches && frame === undefined) frame = requestAnimationFrame(update);
    }
    function setLayout() {
      selected = -1;
      visuals.forEach((visual, i) => {
        (wideScreen.matches ? stage : stories[i]).append(visual);
        visual.removeAttribute('aria-hidden');
        visual.inert = false;
      });
      atelier.classList.toggle('is-enhanced', wideScreen.matches);
      storyList.tabIndex = wideScreen.matches ? -1 : 0;
      if (wideScreen.matches) update();
    }
    wideScreen.addEventListener('change', setLayout);
    addEventListener('scroll', requestUpdate, { passive: true });
    addEventListener('resize', requestUpdate, { passive: true });
    storyList.addEventListener('focusin', event => {
      const story = event.target.closest('[data-story]');
      if (story && wideScreen.matches) select(stories.indexOf(story));
    });
    setLayout();
    const cardsInView = new IntersectionObserver(entries => {
      if (wideScreen.matches) return;
      entries.forEach(entry => {
        if (entry.isIntersecting) select(stories.indexOf(entry.target));
      });
    }, { root: storyList, threshold: .6 });
    stories.forEach(story => cardsInView.observe(story));
    // Native fragment scrolling can run before the desktop stage is assembled.
    const linkedStory = stories.find(story => `#${story.id}` === location.hash);
    if (linkedStory) requestAnimationFrame(() => {
      linkedStory.scrollIntoView({ block: 'center', inline: 'start', behavior: 'instant' });
      update();
    });

    stage.addEventListener('pointermove', event => {
      if (event.pointerType !== 'mouse' || reducedMotion.matches || selected < 0) return;
      const bounds = stage.getBoundingClientRect();
      const image = visuals[selected].querySelector('.work-window').getBoundingClientRect();
      const x = event.clientX - image.left;
      const y = event.clientY - image.top;
      const inside = x >= 0 && y >= 0 && x <= image.width && y <= image.height;
      atelier.classList.toggle('is-inspecting', inside);
      if (!inside) return;
      lens.style.left = `${event.clientX - bounds.left}px`;
      lens.style.top = `${event.clientY - bounds.top}px`;
      lens.style.backgroundSize = `${image.width * 2.4}px ${image.height * 2.4}px`;
      lens.style.backgroundPosition = `${90 - x * 2.4}px ${90 - y * 2.4}px`;
    });
    stage.addEventListener('pointerleave', () => atelier.classList.remove('is-inspecting'));
    reducedMotion.addEventListener('change', () => atelier.classList.remove('is-inspecting'));

    const viewer = atelier.parentElement.querySelector('[data-viewer]');
    const preview = viewer.querySelector('img');
    atelier.querySelectorAll('[data-full-view]').forEach((link, index) => {
      link.addEventListener('click', event => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || !viewer.showModal) return;
        event.preventDefault();
        preview.src = link.href;
        preview.alt = visuals[index].querySelector('img').alt;
        viewer.showModal();
      });
    });
    viewer.querySelector('button').addEventListener('click', () => viewer.close());
    viewer.addEventListener('click', event => {
      const rect = viewer.getBoundingClientRect();
      if (event.target === viewer && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) viewer.close();
    });
  }

  // A small amount of depth, tied to the reader's pointer rather than a timer.
  document.querySelectorAll('[data-paper-art], .atelier-stage').forEach(surface => {
    let pointerFrame;
    let x = 0;
    let y = 0;
    function paint() {
      pointerFrame = undefined;
      surface.style.setProperty('--tilt-x', x);
      surface.style.setProperty('--tilt-y', y);
    }
    surface.addEventListener('pointermove', event => {
      if (event.pointerType !== 'mouse' || reducedMotion.matches) return;
      const rect = surface.getBoundingClientRect();
      x = (event.clientX - rect.left) / rect.width * 2 - 1;
      y = (event.clientY - rect.top) / rect.height * 2 - 1;
      if (pointerFrame === undefined) pointerFrame = requestAnimationFrame(paint);
    });
    surface.addEventListener('pointerleave', () => { x = y = 0; paint(); });
    reducedMotion.addEventListener('change', () => { x = y = 0; paint(); });
  });

  // Resolve only on an ordinary click: new tabs and JavaScript-free browsers
  // retain a verified, direct ZIP link. No request is made on page load.
  let latestDownload;
  document.querySelectorAll('[data-nightly-download]').forEach(link => {
    link.addEventListener('click', async event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      const label = link.textContent;
      link.textContent = link.dataset.loading;
      link.setAttribute('aria-busy', 'true');
      try {
        latestDownload ||= fetch(link.dataset.releasesApi, { signal: AbortSignal.timeout(5000), headers: { Accept: 'application/vnd.github+json' } })
          .then(response => { if (!response.ok) throw new Error('Release lookup failed'); return response.json(); })
          .then(releases => {
            const release = releases.filter(item => !item.draft && /^preview-\d/.test(item.tag_name))
              .sort((a, b) => b.published_at.localeCompare(a.published_at))
              .find(item => item.assets.some(asset => /^LeftBlank-Preview-.*-macOS-arm64\.zip$/.test(asset.name)));
            const asset = release?.assets.find(item => /^LeftBlank-Preview-.*-macOS-arm64\.zip$/.test(item.name));
            if (!asset || !asset.browser_download_url.startsWith('https://github.com/leftblank-app/leftblank/releases/download/')) throw new Error('No nightly archive');
            return asset.browser_download_url;
          });
        location.assign(await latestDownload);
      } catch {
        latestDownload = undefined;
        location.assign(link.href);
      } finally {
        link.textContent = label;
        link.removeAttribute('aria-busy');
      }
    });
  });
})();
