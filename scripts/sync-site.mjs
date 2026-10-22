import { copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const protectedNames = new Set([
  'src', 'public', 'scripts', 'tests', 'docs', 'node_modules', 'dist',
  'package.json', 'package-lock.json', 'astro.config.mjs', 'tsconfig.json',
  'readme.md', 'agents.md',
]);

function checkedPath(root, name) {
  const parts = name.split('/');
  if (!name || parts.some((part) => !part || part === '.' || part === '..' || /[. ]$/.test(part)
        || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part)) || /[\\:<>"|?*\u0000-\u001f]/.test(name)
      || protectedNames.has(parts[0].toLowerCase()) || (parts[0].startsWith('.') && name !== '.nojekyll')) {
    throw new Error(`拒绝覆盖非发布路径：${name}`);
  }
  let target = root;
  for (const part of parts) {
    target = join(target, part);
    if (lstatSync(target, { throwIfNoEntry: false })?.isSymbolicLink()) {
      throw new Error(`发布路径含符号链接：${name}`);
    }
  }
  return target;
}

function listFiles(root, prefix = '') {
  return readdirSync(join(root, prefix), { withFileTypes: true }).flatMap((entry) => {
    const name = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isSymbolicLink()) throw new Error(`构建目录含符号链接：${name}`);
    if (entry.isDirectory()) return listFiles(root, name);
    if (!entry.isFile()) throw new Error(`构建目录含特殊文件：${name}`);
    return [name];
  }).sort();
}

export function syncSite(projectRoot, { dryRun = false } = {}) {
  const root = realpathSync(projectRoot);
  const dist = join(root, 'dist');
  const manifestPath = join(root, '.deploy-manifest.json');
  if (lstatSync(manifestPath).isSymbolicLink() || lstatSync(dist).isSymbolicLink()) {
    throw new Error('构建目录和发布清单应为项目内的普通路径');
  }
  const previous = JSON.parse(readFileSync(manifestPath, 'utf8').replace(/^\uFEFF/, ''));
  if (previous.version !== 1 || !Array.isArray(previous.files) || previous.files.some((name) => typeof name !== 'string')
      || new Set(previous.files).size !== previous.files.length) {
    throw new Error('发布清单格式错误');
  }
  const files = listFiles(dist);
  for (const required of ['index.html', '404.html', 'rss.xml', 'sitemap-index.xml', '.nojekyll']) {
    if (!files.includes(required)) throw new Error(`构建缺少 ${required}，请先执行 npm run verify`);
  }
  // 先完整检查所有路径，再进行任何覆盖或清理。
  const aliases = new Map();
  for (const name of new Set([...previous.files, ...files])) {
    const alias = name.toLowerCase();
    if (aliases.has(alias) && aliases.get(alias) !== name) throw new Error(`发布路径大小写冲突：${name}`);
    aliases.set(alias, name);
    const target = checkedPath(root, name);
    if (existsSync(target) && !lstatSync(target).isFile()) throw new Error(`目标应为文件：${name}`);
  }
  const created = files.filter((name) => !existsSync(checkedPath(root, name)));
  const updated = files.filter((name) => existsSync(checkedPath(root, name))
    && !readFileSync(checkedPath(root, name)).equals(readFileSync(join(dist, name))));
  const removed = previous.files.filter((name) => !files.includes(name) && existsSync(checkedPath(root, name)));
  const plan = { created, updated, removed };
  if (dryRun) return plan;

  let backup;
  if (created.length || updated.length || removed.length) {
    backup = join(root, '.deploy-backups', new Date().toISOString().replace(/[:.]/g, '-') + `-${process.pid}`);
    // 备份目录也应位于项目内，拒绝通过链接重定向。
    const backupParent = dirname(backup);
    if (lstatSync(backupParent, { throwIfNoEntry: false })?.isSymbolicLink()) throw new Error('备份目录含符号链接');
    mkdirSync(backup, { recursive: true });
    copyFileSync(manifestPath, join(backup, '.deploy-manifest.json'));
    writeFileSync(join(backup, 'plan.json'), JSON.stringify(plan, null, 2) + '\n');
    for (const name of [...updated, ...removed]) {
      const target = join(backup, name);
      mkdirSync(dirname(target), { recursive: true });
      copyFileSync(checkedPath(root, name), target);
    }
    for (const name of [...created, ...updated]) {
      const target = checkedPath(root, name);
      mkdirSync(dirname(target), { recursive: true });
      copyFileSync(join(dist, name), target);
    }
    for (const name of removed) rmSync(checkedPath(root, name));
  }
  writeFileSync(manifestPath, JSON.stringify({ version: 1, files }, null, 2) + '\n');
  return { ...plan, backup };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const plan = syncSite(fileURLToPath(new URL('../', import.meta.url)), { dryRun: process.argv.includes('--dry-run') });
    console.log(JSON.stringify(plan, null, 2));
    console.log(`新增 ${plan.created.length}，更新 ${plan.updated.length}，清理 ${plan.removed.length}。仅处理本地发布文件。`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
