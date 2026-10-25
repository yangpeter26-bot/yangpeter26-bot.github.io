const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

document.querySelectorAll<HTMLElement>('[data-capsule-track]').forEach((track) => {
  const links = [...track.querySelectorAll<HTMLAnchorElement>('a')];
  const capsule = track.querySelector<HTMLElement>('.nav-capsule');
  if (!links.length || !capsule) return;
  const current = links.find((link) => link.hasAttribute('aria-current'));
  let hovered: HTMLAnchorElement | undefined;
  let frame = 0;

  const focused = (): HTMLAnchorElement | undefined => links.find((link) => link === document.activeElement);

  function place(link: HTMLAnchorElement | undefined, animate = true): void {
    if (!link || track.getBoundingClientRect().width === 0) {
      track.classList.remove('is-enhanced');
      return;
    }
    const trackBounds = track.getBoundingClientRect();
    const linkBounds = link.getBoundingClientRect();
    if (!animate) track.classList.remove('is-moving');
    track.style.setProperty('--capsule-x', (linkBounds.left - trackBounds.left) + 'px');
    track.style.setProperty('--capsule-y', (linkBounds.top - trackBounds.top) + 'px');
    track.style.setProperty('--capsule-width', linkBounds.width + 'px');
    track.style.setProperty('--capsule-height', linkBounds.height + 'px');
    track.classList.add('is-enhanced');
    if (!animate) {
      // Commit the first position before enabling interpolation.
      void capsule?.offsetWidth;
    }
    if (!reducedMotion.matches) track.classList.add('is-moving');
  }

  function restore(): void {
    place(focused() ?? hovered ?? current);
  }

  links.forEach((link) => {
    link.addEventListener('pointerenter', (event) => {
      if (event.pointerType !== 'mouse') return;
      hovered = link;
      place(link);
    });
    link.addEventListener('focus', () => place(link));
    link.addEventListener('pointerdown', () => place(link));

  });
  track.addEventListener('pointerleave', () => { hovered = undefined; restore(); });
  track.addEventListener('focusout', () => { window.requestAnimationFrame(restore); });

  const resize = (): void => {
    window.cancelAnimationFrame(frame);
    frame = window.requestAnimationFrame(() => place(focused() ?? hovered ?? current, false));
  };
  const observer = new ResizeObserver(resize);
  observer.observe(track);
  document.fonts.ready.then(resize).catch(() => {});
  window.addEventListener('pageshow', resize);
  reducedMotion.addEventListener('change', () => {
    track.classList.toggle('is-moving', !reducedMotion.matches);
  });
  place(current, false);
});

export {};
