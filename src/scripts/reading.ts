const content = document.querySelector<HTMLElement>('[data-reading-content]');

if (content) {
  const progressBar = document.querySelector<HTMLElement>('[data-reading-progress]');
  const progressLabels = document.querySelectorAll<HTMLElement>('[data-reading-percent]');
  const mobileToc = document.querySelector<HTMLDetailsElement>('[data-mobile-toc]');
  const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('[data-toc-link]'));
  const linksById = new Map<string, HTMLAnchorElement[]>();

  links.forEach((link) => {
    const id = decodeURIComponent(link.hash.slice(1));
    linksById.set(id, [...(linksById.get(id) ?? []), link]);
  });

  const headings = Array.from(content.querySelectorAll<HTMLElement>('h2[id], h3[id]'))
    .filter((heading) => linksById.has(heading.id));
  let positions: number[] = [];
  let start = 0;
  let end = 1;
  let currentId = '';
  let currentPercent = -1;
  let currentProgress = -1;
  let frame = 0;
  let geometryDirty = true;

  function measure() {
    // Cache layout only when dimensions change; scrolling reads these numbers.
    const top = window.scrollY;
    positions = headings.map((heading) => heading.getBoundingClientRect().top + top);
    const bounds = content!.getBoundingClientRect();
    start = Math.max(0, bounds.top + top - 150);
    end = Math.max(start + 1, bounds.bottom + top - window.innerHeight + 48);
    geometryDirty = false;
  }

  function update() {
    frame = 0;
    if (geometryDirty) measure();
    const scrollPosition = window.scrollY;
    const progress = Math.round(Math.max(0, Math.min(1, (scrollPosition - start) / (end - start))) * 1000) / 1000;
    const percent = Math.round(progress * 100);
    if (progress !== currentProgress) {
      if (progressBar) progressBar.style.transform = `scaleX(${progress})`;
      currentProgress = progress;
    }
    if (percent !== currentPercent) {
      progressLabels.forEach((label) => { label.textContent = `${percent}%`; });
      currentPercent = percent;
    }

    // Binary search avoids querying every heading on every scroll event.
    let low = 0;
    let high = positions.length - 1;
    let index = 0;
    while (low <= high) {
      const middle = (low + high) >>> 1;
      if (positions[middle] <= scrollPosition + 160) {
        index = middle;
        low = middle + 1;
      } else high = middle - 1;
    }
    const nextId = headings[index]?.id ?? '';
    if (nextId === currentId) return;
    linksById.get(currentId)?.forEach((link) => {
      link.removeAttribute('data-active');
      link.removeAttribute('aria-current');
    });
    linksById.get(nextId)?.forEach((link) => {
      link.setAttribute('data-active', '');
      link.setAttribute('aria-current', 'location');
    });
    currentId = nextId;
  }

  function schedule() {
    if (!frame) frame = window.requestAnimationFrame(update);
  }

  function invalidate() {
    geometryDirty = true;
    schedule();
  }

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', invalidate, { passive: true });
  window.addEventListener('hashchange', schedule);
  window.addEventListener('load', invalidate, { once: true });
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(invalidate);
    observer.observe(content);
    const article = document.querySelector<HTMLElement>('[data-reading-article]');
    if (article) observer.observe(article);
  }
  document.fonts?.ready.then(invalidate);

  links.forEach((link) => {
    link.addEventListener('click', () => {
      if (mobileToc?.contains(link)) {
        mobileToc.open = false;
        invalidate();
      }
      const heading = document.getElementById(decodeURIComponent(link.hash.slice(1)));
      if (heading) {
        heading.setAttribute('tabindex', '-1');
        window.requestAnimationFrame(() => heading.focus({ preventScroll: true }));
      }
    });
  });

  schedule();
}

export {};
