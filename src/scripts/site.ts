type Theme = 'light' | 'dark';

const isTheme = (value: unknown): value is Theme => value === 'light' || value === 'dark';
const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
const themeButton = document.querySelector<HTMLButtonElement>('#theme-toggle');
const giscusOrigin = 'https://giscus.app';
const boundFrames = new WeakSet<HTMLIFrameElement>();
const readyFrames = new WeakSet<HTMLIFrameElement>();
const syncedThemes = new WeakMap<HTMLIFrameElement, Theme>();

let preference: Theme | null = null;
try {
  const saved = window.localStorage.getItem('theme');
  if (isTheme(saved)) preference = saved;
} catch {
  // Keep a working theme toggle even when browser storage is unavailable.
}

function currentTheme(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

function syncFrame(frame: HTMLIFrameElement, force = false): void {
  const theme = currentTheme();
  if (!force && syncedThemes.get(frame) === theme) return;
  frame.contentWindow?.postMessage({ giscus: { setConfig: { theme } } }, giscusOrigin);
  syncedThemes.set(frame, theme);
}

function syncGiscus(): void {
  const theme = currentTheme();
  document.querySelectorAll<HTMLScriptElement>('script[src="https://giscus.app/client.js"]').forEach((script) => {
    script.dataset.theme = theme;
  });
  document.querySelectorAll<HTMLIFrameElement>('iframe.giscus-frame').forEach((frame) => {
    if (!boundFrames.has(frame)) {
      boundFrames.add(frame);
      frame.addEventListener('load', () => syncFrame(frame, true));
    }
    syncFrame(frame);
  });
}

function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  themeButton?.setAttribute('aria-pressed', String(theme === 'dark'));
  themeButton?.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`);
  syncGiscus();
}

applyTheme(preference ?? (systemTheme.matches ? 'dark' : 'light'));

themeButton?.addEventListener('click', () => {
  preference = currentTheme() === 'dark' ? 'light' : 'dark';
  try {
    window.localStorage.setItem('theme', preference);
  } catch {
    // The explicit choice remains active for this page.
  }
  applyTheme(preference);
});

systemTheme.addEventListener('change', (event) => {
  if (preference === null) applyTheme(event.matches ? 'dark' : 'light');
});

window.addEventListener('storage', (event) => {
  if (event.key !== 'theme' && event.key !== null) return;
  preference = isTheme(event.newValue) ? event.newValue : null;
  applyTheme(preference ?? (systemTheme.matches ? 'dark' : 'light'));
});

// Giscus inserts its frame asynchronously; observe insertion and the final load.
const giscusObserver = new MutationObserver(syncGiscus);
giscusObserver.observe(document.body, { childList: true, subtree: true });
window.addEventListener('message', (event: MessageEvent<unknown>) => {
  if (event.origin !== giscusOrigin || !event.data || typeof event.data !== 'object' || !('giscus' in event.data)) return;
  document.querySelectorAll<HTMLIFrameElement>('iframe.giscus-frame').forEach((frame) => {
    if (event.source !== frame.contentWindow || readyFrames.has(frame)) return;
    readyFrames.add(frame);
    syncFrame(frame, true);
  });
});

const menuButton = document.querySelector<HTMLButtonElement>('#hamburger');
const mobileMenu = document.querySelector<HTMLUListElement>('#mobile-menu');
const mobileViewport = window.matchMedia('(max-width: 640px)');

function setMenuOpen(open: boolean, restoreFocus = false): void {
  if (!menuButton || !mobileMenu) return;
  mobileMenu.hidden = !open;
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  if (restoreFocus) menuButton.focus();
}

menuButton?.addEventListener('click', () => setMenuOpen(menuButton.getAttribute('aria-expanded') !== 'true'));
mobileMenu?.addEventListener('click', (event) => {
  if (event.target instanceof Element && event.target.closest('a')) setMenuOpen(false);
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && menuButton?.getAttribute('aria-expanded') === 'true') setMenuOpen(false, true);
});
document.addEventListener('click', (event) => {
  if (event.target instanceof Node && !mobileMenu?.contains(event.target) && !menuButton?.contains(event.target)) setMenuOpen(false);
});
mobileViewport.addEventListener('change', (event) => {
  if (!event.matches) setMenuOpen(false);
});

document.querySelectorAll<HTMLPreElement>('.prose pre').forEach((pre) => {
  const code = pre.querySelector('code')?.textContent ?? pre.textContent ?? '';
  const button = document.createElement('button');
  const status = document.createElement('span');
  button.type = 'button';
  button.className = 'copy-btn';
  button.textContent = 'Copy';
  button.setAttribute('aria-label', 'Copy code');
  status.className = 'sr-only';
  status.setAttribute('role', 'status');
  let resetTimer: number | undefined;

  button.addEventListener('click', async () => {
    window.clearTimeout(resetTimer);
    button.disabled = true;
    button.classList.remove('copied', 'copy-failed');
    try {
      if (!navigator.clipboard) throw new Error('Clipboard is unavailable');
      await navigator.clipboard.writeText(code);
      button.textContent = 'Copied!';
      button.classList.add('copied');
      status.textContent = 'Code copied to clipboard.';
    } catch {
      button.textContent = 'Copy failed';
      button.classList.add('copy-failed');
      status.textContent = 'Copy failed. Select the code and copy it manually.';
    } finally {
      button.disabled = false;
      resetTimer = window.setTimeout(() => {
        button.textContent = 'Copy';
        button.classList.remove('copied', 'copy-failed');
        status.textContent = '';
      }, 2500);
    }
  });

  pre.append(button, status);
});

export {};
