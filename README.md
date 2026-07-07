# PeterYang's Blog

基于 Astro 5 构建的个人技术博客，托管于 GitHub Pages。

## 项目结构

```
├── src/
│   ├── content/
│   │   └── posts/                  # Markdown 文章（自动读取 frontmatter）
│   │       ├── vulhub-1.md
│   │       ├── d2l-linear-regression.md
│   │       ├── d2l-linear-regression-concise.md
│   │       └── metasploitable2-vsftpd.md
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

在 `src/content/posts/` 下新建 `.md` 文件，frontmatter 格式：

```markdown
---
title: "文章标题"
date: "2026-07-07"
tags: ["标签1", "标签2"]
excerpt: "一句话摘要"
---

正文内容...
```

首页卡片、归档页自动从 frontmatter 生成，不用手动改。

## 文章风格规范

写文章时保持以下风格，和已有文章保持一致：

### 标题
- 不用 emoji
- 用 `## 代码框 N：描述` 作为代码段标题
- 大章节用 `## 一、二、三` 或 `## 描述性标题`

### 代码块
- 代码块写在前面，解释写在后面
- 代码块标注语言（` ```python `、` ```bash `、` ```yaml ` 等）
- 行内注释用中文，简短直接

### 解释风格
- 人话翻译，不要学术腔
- 每段解释控制在 1-3 句话
- 不用「小贴士」「核心思想」「学习建议」等说教式段落
- 不用 emoji 装饰标题或段落

### 示例

```markdown
## 代码框 1：导入

```python
import torch
from torch import nn
```

导入 PyTorch 核心库和神经网络模块。
```

### 反例（不要这样写）

```markdown
## 📖 1. 导入必要的库

```python
import torch
```

### 💡 小贴士

`torch` 是 PyTorch 的核心库，它提供了...

### 🔍 深入理解

...
```

## 功能

- ✅ Markdown 内容集合（自动读取 frontmatter）
- ✅ 代码高亮（Shiki, catppuccin-mocha 主题）
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
- Python f-string 里的 `{}` 在 Markdown 里直接写就行，不用转义
