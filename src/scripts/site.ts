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
  themeButton?.setAttribute('aria-label', theme === 'dark' ? '切换浅色主题' : '切换深色主题');
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((meta) => {
    meta.content = theme === 'dark' ? '#10161d' : '#f5f7fa';
  });
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
const mobileViewport = window.matchMedia('(max-width: 680px)');

function setMenuOpen(open: boolean, restoreFocus = false): void {
  if (!menuButton || !mobileMenu) return;
  mobileMenu.hidden = !open;
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? '收起导航' : '展开导航');
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
  button.textContent = '复制';
  button.setAttribute('aria-label', '复制代码');
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
      button.textContent = '已复制';
      button.classList.add('copied');
      status.textContent = '代码已复制到剪贴板。';
    } catch {
      button.textContent = '请手动复制';
      button.classList.add('copy-failed');
      status.textContent = '复制未成功，请选中代码手动复制。';
    } finally {
      button.disabled = false;
      resetTimer = window.setTimeout(() => {
        button.textContent = '复制';
        button.classList.remove('copied', 'copy-failed');
        status.textContent = '';
      }, 2500);
    }
  });

  pre.append(button, status);
});

interface SearchPost {
  title: string;
  excerpt: string;
  tags: string[];
  series: string;
  date: string;
  url: string;
}

const searchDialog = document.querySelector<HTMLDialogElement>('#search-dialog');
const searchInput = document.querySelector<HTMLInputElement>('#site-search');
const searchResults = document.querySelector<HTMLUListElement>('#search-results');
const searchStatus = document.querySelector<HTMLParagraphElement>('#search-status');
const searchEmpty = document.querySelector<HTMLDivElement>('#search-empty');
const searchRetry = document.querySelector<HTMLButtonElement>('#search-retry');
let searchIndex: SearchPost[] | null = null;
let pendingIndex: Promise<SearchPost[]> | null = null;
let searchOpener: HTMLElement | null = null;

const normalizeSearch = (value: string) => value.normalize('NFKC').toLocaleLowerCase('zh-CN');

async function loadSearchIndex(): Promise<SearchPost[]> {
  if (searchIndex) return searchIndex;
  if (pendingIndex) return pendingIndex;
  pendingIndex = fetch('/search-index.json')
    .then(async (response) => {
      if (!response.ok) throw new Error(`Search index: ${response.status}`);
      searchIndex = await response.json() as SearchPost[];
      return searchIndex;
    })
    .finally(() => { pendingIndex = null; });
  return pendingIndex;
}

function renderSearch(): void {
  if (!searchInput || !searchResults || !searchStatus || !searchEmpty || !searchIndex) return;
  const terms = normalizeSearch(searchInput.value.trim()).split(/\s+/).filter(Boolean);
  const ranked = searchIndex.map((post) => {
    const title = normalizeSearch(post.title);
    const tags = normalizeSearch(post.tags.join(' '));
    const series = normalizeSearch(post.series);
    const excerpt = normalizeSearch(post.excerpt);
    let score = 0;
    for (const term of terms) {
      if (![title, tags, series, excerpt].some((field) => field.includes(term))) return { post, score: -1 };
      score += (title.includes(term) ? 20 : 0) + (tags.includes(term) ? 10 : 0) + (series.includes(term) ? 7 : 0) + (excerpt.includes(term) ? 4 : 0);
    }
    return { post, score };
  }).filter(({ score }) => score >= 0).sort((a, b) => b.score - a.score);
  const displayed = ranked.slice(0, terms.length ? 30 : 8);
  const fragment = document.createDocumentFragment();
  for (const { post } of displayed) {
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.className = 'search-result';
    link.href = post.url;
    const label = document.createElement('span');
    label.className = 'search-result-label';
    label.textContent = `${post.date} · ${post.tags.slice(0, 2).join(' / ') || '文章'}`;
    const title = document.createElement('strong');
    title.className = 'search-result-title';
    title.textContent = post.title;
    const excerpt = document.createElement('span');
    excerpt.className = 'search-result-excerpt';
    excerpt.textContent = post.excerpt;
    link.append(label, title, excerpt);
    item.append(link);
    fragment.append(item);
  }
  searchResults.replaceChildren(fragment);
  searchResults.scrollTop = 0;
  searchEmpty.hidden = displayed.length > 0;
  searchStatus.textContent = terms.length
    ? `找到 ${ranked.length} 篇文章${ranked.length > 30 ? '，显示前 30 篇' : ''}`
    : `最近更新 · 共 ${searchIndex.length} 篇文章`;
}

async function prepareSearch(): Promise<void> {
  if (!searchStatus) return;
  searchRetry && (searchRetry.hidden = true);
  if (!searchIndex) searchStatus.textContent = '正在整理文章…';
  try {
    await loadSearchIndex();
    renderSearch();
  } catch {
    searchStatus.textContent = '文章索引加载未成功，请重试。';
    searchRetry && (searchRetry.hidden = false);
  }
}

function openSearch(opener?: HTMLElement): void {
  if (!searchDialog || !searchInput || searchDialog.open) return;
  searchOpener = opener ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
  setMenuOpen(false);
  searchDialog.showModal();
  document.documentElement.classList.add('search-open');
  searchInput.focus();
  searchInput.select();
  void prepareSearch();
}

document.querySelectorAll<HTMLElement>('[data-search-open]').forEach((button) => {
  button.addEventListener('click', () => openSearch(button));
});
searchInput?.addEventListener('input', () => { if (searchIndex) renderSearch(); });
searchRetry?.addEventListener('click', () => { void prepareSearch(); });
document.querySelector('#search-close')?.addEventListener('click', () => searchDialog?.close());
searchDialog?.addEventListener('click', (event) => {
  if (event.target !== searchDialog) return;
  const bounds = searchDialog.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) searchDialog.close();
});
searchDialog?.addEventListener('close', () => {
  document.documentElement.classList.remove('search-open');
  searchOpener?.focus();
});
searchDialog?.addEventListener('keydown', (event) => {
  if (event.isComposing || event.key === 'Process') return;
  if (!searchInput || !searchResults) return;
  const links = [...searchResults.querySelectorAll<HTMLAnchorElement>('a')];
  if (event.key === 'ArrowDown' && document.activeElement === searchInput && links.length) {
    event.preventDefault();
    links[0].focus();
  } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    const current = links.findIndex((link) => link === document.activeElement);
    if (current < 0) return;
    event.preventDefault();
    if (event.key === 'ArrowUp' && current === 0) searchInput.focus();
    else links[Math.min(links.length - 1, Math.max(0, current + (event.key === 'ArrowDown' ? 1 : -1)))].focus();
  }
});
document.addEventListener('keydown', (event) => {
  if (event.isComposing || event.key === 'Process') return;
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    if (searchDialog?.open) searchDialog.close();
    else openSearch();
  }
});

export {};
