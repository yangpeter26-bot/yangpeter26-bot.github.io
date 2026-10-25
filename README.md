# yyg 的笔记

Astro 5 + TypeScript 静态技术博客，使用 GitHub Pages 的 main 分支根目录发布方式。

发布操作与故障处理见 [docs/PUBLISHING.md](docs/PUBLISHING.md)；后续 agent 的维护入口见 [AGENTS.md](AGENTS.md)。

## 目录与职责

```text
src/
  components/              页头、页脚和主题初始化
  content/posts/           Markdown 正文，新文章的唯一来源
  content.config.ts        文章字段与日期校验
  layouts/Layout.astro     公共 HTML 外壳、SEO 和资源引用
  lib/                     文章读取、排序、阅读时间
  pages/                   首页、归档、文章路由、RSS、关于和留言
  scripts/                 主题、导航、搜索和代码复制等浏览器交互
  styles/global.css        全站玻璃风格与响应式样式
public/                    直接复制到构建产物的静态资源
  avatar-yyg.jpg           用户提供的 yyg 头像
  favicon.svg              网站图标
docs/
  drafts/                  未发布草稿，不参与文章集合
  writing-style.md         原有文章风格约定
  PUBLISHING.md            发布、验证与回滚流程
  LIQUID-GLASS-PREVIEW.md   液态玻璃设计与兼容性验证记录
scripts/                   本地发布同步与构建链接检查
tests/                     阅读时间与发布同步的回归检查
dist/                      构建输出，已忽略
.astro/                    Astro 生成的缓存与类型，已忽略
.deploy-manifest.json      根目录发布文件清单，应纳入版本控制
```

根目录的 index.html、posts/、archive/、_astro/、XML 和图片是 GitHub Pages 发布产物，由脚本同步。修改页面请编辑 src，修改图片请编辑 public，再重新构建和同步。

## 本地运行与校验

要求 Node.js 22.18+，推荐 Node.js 24 LTS（测试直接运行 TypeScript）。

```powershell
npm ci
npm run dev
```

发布前运行一次完整校验：

```powershell
npm run verify
```

它依次执行 Astro 类型检查、回归测试、一次构建和内部链接检查；包括 5 篇历史文章及 RSS。npm run preview 可预览这次生成的 dist。

## 写文章

在 src/content/posts/ 新建 .md，例如 new-post.md 对应 /posts/new-post/。

```yaml
---
title: "文章标题"
date: "2026-10-22"
tags: ["标签1", "标签2"]
excerpt: "一句话摘要"
draft: false
series: "d2l"         # 可选
seriesOrder: 8        # 可选，正整数
---
```

日期使用真实的 YYYY-MM-DD，可先用 PowerShell Get-Date -Format yyyy-MM-dd 查看。设置 draft: true 的文章不生成文章页，也不出现在首页、归档和 RSS。

文章列表按日期倒序，同日按系列顺序倒序，再以文件 ID 稳定排序。系列上一篇/下一篇按 seriesOrder 正序排列，未编号条目排在后面。阅读时间按中文字符、英文和代码词元估算。

文章写作约定见 [docs/writing-style.md](docs/writing-style.md)。根目录原有的欠拟合/过拟合草稿已收进 docs/drafts/，不会自动发布。

## 历史文章

5 篇历史文章已从 Git 历史恢复到 src/content/posts/，原网址和正文保留，现在与其他文章一起生成首页、归档、RSS、搜索索引和系列目录。原有 public/posts/ 与旧样式不再需要。

## 设计与阅读

显示名为 yyg，头像使用用户提供的原图。浅色界面以冷白与雾蓝为主，玻璃材质集中在导航和辅助控件；正文使用稳定的阅读背景。桌面采用滑动选中胶囊与局部折射增强，手机采用底部悬浮导航。搜索支持透色面板、开合动画、键盘导航与短视口适配；保留主题、标签、系列、阅读进度、章节目录和数学公式渲染。设计与兼容性检查见 [docs/LIQUID-GLASS-PREVIEW.md](docs/LIQUID-GLASS-PREVIEW.md)。

网站使用统一的 Markdown 内容集合。身份信息在 src/config/site.ts 中维护；首页、文章、标签、系列和搜索索引会随构建一起更新。

## 本地发布与上线

GitHub Pages 保持 Deploy from a branch → main → / (root)。无需修改线上设置。

```powershell
npm run verify
npm run publish:plan
npm run publish:local
git diff --stat
git status --short
```

publish:plan 只预览新增、覆盖和清理清单。publish:local 将 dist 同步到仓库根目录，只清理 .deploy-manifest.json 中已经退出本次构建的文件；源码和未受管文件不参与清理。被覆盖或清理的旧文件、旧清单和操作计划会备份到 .deploy-backups/<时间>/。清单请随发布产物一起提交，保留对旧文件的追踪。

确认差异后再提交并推送：

```powershell
git add -A
git commit -m "更新博客"
git push
```

同步脚本本身只改本地文件，不会提交或推送。推送失败时仅重试推送，无需重新构建。反馈结果请区分本地构建通过与线上部署完成，线上状态应在部署后单独确认。

如需撤销一次本地同步：根据备份中的 plan.json 删除本次 created 文件，将备份内旧文件放回根目录，并恢复备份中的 .deploy-manifest.json。同步前的完整优化备份另存于 .maintenance-backups/，请在检查结果后再自行清理。

## 配置

- astro.config.mjs：站点地址、静态输出、代码高亮与 sitemap；站点地址更改后重新构建。
- src/components/Header.astro：桌面和移动导航共用的数据。
- src/styles/global.css：颜色、布局和响应式样式。
- src/pages/posts/guestbook.astro：Giscus 仓库与分类；主题自动跟随网站。
- .nojekyll 来自 public/.nojekyll，由构建和同步保留。

dist、.astro、依赖与工具目录不提交；根目录发布产物和清单继续提交，以兼容当前托管方式。
