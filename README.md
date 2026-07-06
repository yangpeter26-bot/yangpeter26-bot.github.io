# YangPeter's Blog

基于 Astro 5 构建的个人技术博客，托管于 GitHub Pages。

## 项目结构

```
├── src/
│   ├── content/
│   │   └── posts/                  # Markdown 文章（自动读取 frontmatter）
│   │       ├── vulhub-1.md
│   │       └── d2l-linear-regression.md
│   ├── layouts/Layout.astro        # 全局布局（导航/页脚/暗色模式）
│   └── pages/
│       ├── index.astro             # 首页（自动生成文章卡片）
│       ├── archive.astro           # 归档页（按年分组）
│       ├── 404.astro               # 404 页面
│       └── posts/
│           ├── [slug].astro        # 文章模板（自动路由）
│           ├── about.astro         # 关于我
│           └── guestbook.astro     # 留言板（Giscus）
├── public/                         # 静态资源（图片等）
├── astro.config.mjs                # Astro 配置
└── package.json                    # 依赖
```

## 写文章

在 `src/content/posts/` 下新建 `.md` 文件：

```markdown
---
title: "文章标题"
date: "2026-07-06"
tags: ["标签1", "标签2"]
excerpt: "一句话摘要"
---

正文内容，直接写 Markdown...
```

- 首页卡片自动从 frontmatter 生成
- 代码高亮自动（Shiki, catppuccin-mocha 主题）
- 目录自动从 h2/h3 生成
- 阅读时间自动计算

## 功能

- ✅ Markdown 内容集合（自动读取 frontmatter）
- ✅ 代码高亮（Shiki）
- ✅ 文章目录（TOC）
- ✅ 阅读时间估算
- ✅ 暗色模式切换（🌙/☀️）
- ✅ 移动端汉堡菜单
- ✅ 归档页（按年分组）
- ✅ 404 页面
- ✅ Open Graph 社交分享标签
- ✅ Sitemap 自动生成
- ✅ Giscus 留言板

## 部署上线

```bash
npx astro build
cp -r dist/* .
git add -A; git commit -m "更新"; git push
```

等 30 秒刷新 `https://yangpeter26-bot.github.io`（Ctrl+Shift+R 强制刷新）。

## 注意事项

- GitHub Pages 设置：Settings → Pages → Source: `Deploy from a branch` → `main` → `/ (root)`
- 根目录必须有 `.nojekyll` 文件
