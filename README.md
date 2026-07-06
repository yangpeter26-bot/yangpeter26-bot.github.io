# YangPeter's Blog

基于 Astro 5 构建的个人技术博客，托管于 GitHub Pages。

## 项目结构

```
├── src/
│   ├── layouts/Layout.astro          # 全局布局（导航/页脚/CSS）
│   └── pages/
│       ├── index.astro               # 首页
│       └── posts/                    # 文章目录
│           ├── about.astro           # 关于我页面
│           ├── vulhub-1.astro        # Vulhub 漏洞复现
│           └── d2l-linear-regression.astro  # d2l 学习笔记
├── public/                           # 静态资源（图片等）
├── astro.config.mjs                  # Astro 配置
├── package.json                      # 依赖
└── 更新网站.bat                      # 一键部署脚本
```

## 写文章

### 新建文章

在 `src/pages/posts/` 下新建 `.astro` 文件：

```astro
---
import Layout from '../../layouts/Layout.astro';
---

<Layout title="文章标题">
  <div class="prose">
    <a class="back-link" href="/">&larr; Back</a>
    <h1>文章标题</h1>
    <p class="date">2026-XX-XX</p>
    <hr />
    <p>正文...</p>
    <pre><code>代码块...</code></pre>
    <hr />
    <p><a class="back-link" href="/">&larr; Back</a></p>
  </div>
</Layout>

<style>
  pre { background: rgba(0,0,0,0.04); border-radius: 12px; padding: 16px 20px; overflow-x: auto; margin: 12px 0; font-size: 14px; }
  code { font-family: "SF Mono", "Fira Code", Consolas, monospace; font-size: 13px; }
  h2 { font-size: 22px; font-weight: 640; margin-top: 36px; margin-bottom: 10px; }
</style>
```

### 首页加卡片

在 `src/pages/index.astro` 的 `</Layout>` 前插入：

```astro
  <a class="card" href="/posts/文章路径/">
    <div class="card-meta">
      <span class="card-date">日期</span>
      <span class="card-tag accent">标签1</span>
      <span class="card-tag">标签2</span>
    </div>
    <h2 class="card-title">文章标题</h2>
    <p class="card-excerpt">摘要...</p>
    <div class="card-footer"><span>Read &rarr;</span></div>
  </a>
```

## 部署上线

```bash
npx astro build                    # 构建
xcopy dist\* .\ /E /Y             # 复制到根目录
git add -A; git commit -m "更新"; git push   # 推送
```

等 30 秒刷新 `https://yangpeter26-bot.github.io`（Ctrl+Shift+R 强制刷新）。

## 注意事项

- Python f-string 里的 `{}` 必须写成 `&#123;` 和 `&#125;`，否则 Astro 报错
- 不要用 `&&` 连接命令（PowerShell 不支持），用 `;`
- 根目录必须有 `.nojekyll` 文件，否则 GitHub Pages 会尝试 Jekyll 构建导致失败
- GitHub Pages 设置：Settings → Pages → Source: `Deploy from a branch` → `main` → `/ (root)`
