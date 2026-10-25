const surfaces = [...document.querySelectorAll<HTMLElement>('[data-liquid-glass]')];
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
const wideViewport = window.matchMedia('(min-width: 681px)');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const reducedTransparency = window.matchMedia('(prefers-reduced-transparency: reduce)');
const increasedContrast = window.matchMedia('(prefers-contrast: more), (forced-colors: active)');

// Update only the surface being touched. No perpetual animation/render loop.
surfaces.forEach((surface) => {
  let frame = 0;
  let x = 50;
  let y = 20;
  const paint = () => {
    frame = 0;
    surface.style.setProperty('--glass-x', `${x}%`);
    surface.style.setProperty('--glass-y', `${y}%`);
  };
  surface.addEventListener('pointermove', (event) => {
    if (!finePointer.matches || reducedMotion.matches || reducedTransparency.matches || increasedContrast.matches) return;
    const bounds = surface.getBoundingClientRect();
    x = Math.max(0, Math.min(100, (event.clientX - bounds.left) / bounds.width * 100));
    y = Math.max(0, Math.min(100, (event.clientY - bounds.top) / bounds.height * 100));
    if (!frame) frame = window.requestAnimationFrame(paint);
  }, { passive: true });
  surface.addEventListener('pointerleave', () => {
    x = 50;
    y = 20;
    if (!frame) frame = window.requestAnimationFrame(paint);
  }, { passive: true });
});

// SVG backdrop displacement is an enhancement for Chromium. Other engines keep
// the independently styled CSS material; CSS.supports alone can't prove that
// URL-backed backdrop displacement is actually rendered by an engine.
const chromium = /(?:Chrome|Chromium|Edg)\//.test(navigator.userAgent);
const lensSurfaces = chromium && CSS.supports('backdrop-filter', 'url("#lens")')
  ? [...document.querySelectorAll<HTMLElement>('[data-glass-lens]')]
  : [];
const namespace = 'http://www.w3.org/2000/svg';

function makeNode(name: string, attrs: Record<string, string>) {
  const node = document.createElementNS(namespace, name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  return node;
}

function displacementImage(width: number, height: number, radius: number): string | null {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return null;
  const image = context.createImageData(width, height);
  const band = Math.min(18, height / 3);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const px = x + .5 - width / 2;
      const py = y + .5 - height / 2;
      const qx = Math.abs(px) - (width / 2 - radius);
      const qy = Math.abs(py) - (height / 2 - radius);
      const dx = Math.max(qx, 0);
      const dy = Math.max(qy, 0);
      const cornerDistance = Math.hypot(dx, dy);
      const distance = cornerDistance + Math.min(Math.max(qx, qy), 0) - radius;
      const depth = Math.max(0, Math.min(1, -distance / band));
      const strength = distance <= 0 ? Math.sin(depth * Math.PI) : 0;
      let normalX = 0;
      let normalY = 0;
      if (cornerDistance > 0) {
        normalX = Math.sign(px) * dx / cornerDistance;
        normalY = Math.sign(py) * dy / cornerDistance;
      } else if (qx > qy) normalX = Math.sign(px);
      else normalY = Math.sign(py);
      const offset = (y * width + x) * 4;
      image.data[offset] = Math.round(128 + normalX * strength * 127);
      image.data[offset + 1] = Math.round(128 + normalY * strength * 127);
      image.data[offset + 2] = 128;
      image.data[offset + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
  return canvas.toDataURL('image/png');
}

if (lensSurfaces.length) {
  const svg = makeNode('svg', { width: '0', height: '0', 'aria-hidden': 'true', focusable: 'false' });
  svg.style.position = 'absolute';
  svg.style.pointerEvents = 'none';
  const defs = makeNode('defs', {});
  svg.append(defs);
  document.body.append(svg);

  lensSurfaces.forEach((surface, index) => {
    const id = `yyg-glass-lens-${index}`;
    const filter = makeNode('filter', {
      id, x: '0', y: '0', width: '1', height: '1',
      filterUnits: 'userSpaceOnUse', primitiveUnits: 'userSpaceOnUse',
      'color-interpolation-filters': 'sRGB',
    });
    const map = makeNode('feImage', { result: 'edge-map', preserveAspectRatio: 'none', x: '0', y: '0' });
    const soften = makeNode('feGaussianBlur', { in: 'SourceGraphic', stdDeviation: '3.5', result: 'softened' });
    const displace = makeNode('feDisplacementMap', {
      in: 'softened', in2: 'edge-map', scale: '22', xChannelSelector: 'R', yChannelSelector: 'G', result: 'refracted',
    });
    filter.append(map, soften, displace, makeNode('feColorMatrix', { in: 'refracted', type: 'saturate', values: '1.2' }));
    defs.append(filter);
    let measured = '';
    let frame = 0;
    const disable = () => {
      surface.style.removeProperty('backdrop-filter');
      delete surface.dataset.glassRefracted;
    };
    const update = () => {
      frame = 0;
      if (!wideViewport.matches || !finePointer.matches || reducedTransparency.matches || increasedContrast.matches || reducedMotion.matches) {
        disable();
        return;
      }
      const bounds = surface.getBoundingClientRect();
      const width = Math.round(bounds.width);
      const height = Math.round(bounds.height);
      // Only compact control surfaces, never a dialog or full-page canvas.
      if (width < 1 || width > 1000 || height < 1 || height > 120) {
        disable();
        return;
      }
      const radius = Math.min(parseFloat(getComputedStyle(surface).borderTopLeftRadius) || height / 2, height / 2, width / 2);
      const key = `${width}:${height}:${radius}`;
      if (key !== measured) {
        try {
          const href = displacementImage(width, height, radius);
          if (!href) { disable(); return; }
          filter.setAttribute('width', String(width));
          filter.setAttribute('height', String(height));
          map.setAttribute('width', String(width));
          map.setAttribute('height', String(height));
          map.setAttribute('href', href);
          measured = key;
        } catch {
          disable();
          return;
        }
      }
      surface.style.backdropFilter = `url("#${id}")`;
      surface.dataset.glassRefracted = 'true';
    };
    const schedule = () => { if (!frame) frame = window.requestAnimationFrame(update); };
    new ResizeObserver(schedule).observe(surface);
    for (const preference of [wideViewport, finePointer, reducedTransparency, increasedContrast, reducedMotion]) preference.addEventListener('change', schedule);
    schedule();
  });
}

export {};
