# yyg 博客上传与发布

本文给接手 `E:\MyProject` 的 agent 使用。操作前先读 [README.md](../README.md)、[写作规范](writing-style.md)，再检查仓库中的实际配置；本文不代表已经完成一次新的线上验证。

## 站点与发布方式

| 项目 | 当前约定 |
|---|---|
| 项目目录 | `E:\MyProject` |
| 网站 | <https://yangpeter26-bot.github.io/> |
| Git 仓库 | <https://github.com/yangpeter26-bot/yangpeter26-bot.github.io.git> |
| 发布分支 | `main` |
| GitHub Pages 来源 | Deploy from a branch → `main` → `/ (root)` |
| 实现 | Astro 静态构建；源文件和根目录发布产物一起纳入 Git |

这里既不是只推源码，也不是把 `dist` 单独推到 `gh-pages`。`dist/` 被忽略；发布脚本将它的内容同步到仓库根目录，根目录产物随源码提交到 `main`。

正文、样式、静态资源或构建逻辑的发布顺序是：编辑源文件 → 完整校验 → 查看同步计划 → 本地同步 → 核对差异与清单 → 提交推送 → 确认部署与线上内容。仅仓库文档变更走下方的独立分支。

## 先确定本次范围

本地编辑、构建和预览可以先完成。向 Git 远端推送之前，必须有本次任务中的明确发布指令；以前某次“满意”“提交”或旧发布记录，不代表以后所有改动都可以直接上线。

如果用户本次已经要求“发布到网站”“上传到 Git”，就按这个范围完成发布，不再重复询问。若本次只要求设计预览，先交付预览和检查结果。

进入目录后记录起始分支、提交和已有改动：

```powershell
Set-Location -LiteralPath 'E:\MyProject'
git -c safe.directory=E:/MyProject status --short --branch
git -c safe.directory=E:/MyProject rev-parse HEAD
git -c safe.directory=E:/MyProject remote -v
git -c safe.directory=E:/MyProject branch --show-current
```

上面的 `safe.directory` 只对此次命令生效，适用于这台机器上出现目录所有权检查的情况。不要为了单个项目设置全局 `safe.directory=*`；其他 Git 命令如遇同样提示，继续使用相同的单次 `-c` 参数。

确认远端与分支符合表格。已有改动要先辨认来源；不要通过 `reset --hard`、`clean` 或整库覆盖来获得干净状态，也不要把用户其他工作顺手提交。

若远端分支前进，先取回并查看差异，再决定合并。不要盲目 `pull`、强推或绕过冲突。

```powershell
git -c safe.directory=E:/MyProject fetch origin
git -c safe.directory=E:/MyProject log --oneline --left-right HEAD...origin/main
```

PowerShell 中，`$ErrorActionPreference = 'Stop'` 不等于检查 `git`、`npm`、`node` 这些原生命令的退出码。自动执行时应在每个关键命令后立即检查 `$LASTEXITCODE`，非 0 就停止对应流程；不要等后面的命令覆盖退出码，再把整段操作算作成功。例如：

```powershell
git -c safe.directory=E:/MyProject fetch origin
if ($LASTEXITCODE -ne 0) { throw 'git fetch 失败，先处理错误。' }
```

## 仅仓库文档变更

如果本次只修改 `README.md`、`docs/` 或 `AGENTS.md`，并且没有改变 `src/`、`public/`、站点配置、构建/同步脚本、依赖及锁文件，也没有改变构建会读取的输入，则按文档提交处理。

这一分支无需 `npm run verify`、`publish:plan` 或 `publish:local`，也不应为了提交说明文件去同步已有的旧 `dist`。根目录发布产物和 `.deploy-manifest.json` 保持当前版本，文档修改不应连带生成它们的差异。

步骤如下：

1. 用 `git status --short` 和 `git diff --name-only` 确认范围；包含非文档改动时逐项判断，不要直接套用本分支。
2. 阅读完整文档差异，检查 Markdown 围栏、表格、相对链接、锚点及所引用文件。新链接按文档最终所在位置解析，例如本文件落地在 `docs/PUBLISHING.md` 后，`../README.md` 指向仓库 README。
3. 运行 `git diff --check`，仅暂存本次文档，检查暂存区后提交、推送。
4. 核对本地提交 SHA 与远端 `main` 的 SHA；必要时查看 GitHub 中的文档页面，确认链接及排版。文档提交本身不代表网站正文发生变化。

例如本次更新发布说明与 README 入口时：

```powershell
git -c safe.directory=E:/MyProject diff -- README.md docs/PUBLISHING.md
git -c safe.directory=E:/MyProject diff --check
git -c safe.directory=E:/MyProject add -- README.md docs/PUBLISHING.md
git -c safe.directory=E:/MyProject diff --cached --stat
git -c safe.directory=E:/MyProject diff --cached --check
git -c safe.directory=E:/MyProject commit -m "补充博客发布说明"
git -c safe.directory=E:/MyProject push origin main
git -c safe.directory=E:/MyProject rev-parse HEAD
git -c safe.directory=E:/MyProject ls-remote origin refs/heads/main
```

以上命令仍需逐条检查退出码、差异和授权范围。新文件尚未跟踪时，`git diff` 不会显示它的正文，要另外打开阅读。若同时维护 `AGENTS.md`，将该文件明确加入检查和暂存范围，不要把其他本地变更一起加入。

GitHub 可能因分支推送触发 Pages 任务；若触发，可检查对应 SHA 的任务结果，但无需宣称网站有新的文章或页面。下文完整构建、同步与页面验证步骤适用于实际影响站点输出的改动。

## 文件放在哪里

| 要修改的内容 | 源文件位置 | 发布后的结果 |
|---|---|---|
| 文章 | `src/content/posts/<slug>.md` | `/posts/<slug>/` |
| 头像、图片、附件、下载脚本 | `public/` 内对应路径 | 同路径复制到站点根目录 |
| 文章附带的可下载脚本 | `public/downloads/<系列>/<文件名>` | `/downloads/<系列>/<文件名>` |
| 页面、导航、样式、交互 | `src/pages/`、`src/components/`、`src/styles/`、`src/scripts/` | 构建后的 HTML、CSS、JS |
| 站点身份与元信息 | `src/config/site.ts` | 导航、页脚、SEO 等 |
| 系列名称与描述 | `src/lib/series.ts` | 系列目录及文章导航 |
| 本地维护工具 | `scripts/` | 不作为下载附件自动发布 |
| 写作及维护说明 | `docs/` | 保留在 Git 仓库，不自动成为文章 |
| 未发布草稿 | `docs/drafts/`，或文章字段 `draft: true` | 草稿不生成文章页 |

例如文章引用 `/downloads/web-basics/example.py` 时，原文件应放在 `public/downloads/web-basics/example.py`。不要只把脚本写进本机工作目录，也不要把 `scripts/` 里的维护工具误当公开下载链接。

不要直接修改根目录的 `index.html`、`posts/`、`archive/`、`_astro/` 等产物。修改源文件并重新构建，否则下次同步会覆盖手工修改。

`public/` 中的普通文件会被直接发布。发布前检查其中是否混入密钥、环境文件、题目账号、个人路径清单、数据库、调试响应或备份。忽略规则不会替你审查公开附件的内容。

## 文章 frontmatter 与链接

```yaml
---
title: "清楚的文章标题"
date: "2026-10-25"
tags: ["Security", "CTF", "Web"]
excerpt: "说明文章内容的一句话摘要。"
draft: false
series: "ctf-web-basics"
seriesOrder: 1
---
```

`title`、`date`、`excerpt` 是当前 schema 的必填字段。`date` 必须是实际存在的 `YYYY-MM-DD` 日期字符串，查看当天日期可以执行 `Get-Date -Format yyyy-MM-dd`，不要继续复制示例日期。

`tags` 缺省为空数组，`draft` 缺省为 `false`。`series` 与 `seriesOrder` 可选，但写了 `seriesOrder` 就必须是大于 0 的整数；系列导读也从 1 开始。加入已有系列时沿用其 ID、标题格式与顺序，新系列需要检查 `src/lib/series.ts` 的显示信息。

现有 Web 基础系列使用 `ctf-web-basics`。三篇正文地址为 `/posts/ctf-web-basics-1-sqli/`、`/posts/ctf-web-basics-2-ruby-open/`、`/posts/ctf-web-basics-3-php-noalnum/`；不要沿用早期草拟的 `web-basics-*` 文章路径。新增篇目先检查现有编号，避免重复。

`draft: true` 会从发布文章集合中排除。发布前检查本次要上线的文章是否仍是草稿，也检查其他草稿是否被意外改成公开；草稿引用的 `public/` 附件仍会被复制。

网站文章使用正常 Markdown 链接，例如 `[下一篇](/posts/example/)`，不要留下 Obsidian 的 `[[双链]]`。标题、图片与下载路径的大小写要和文件一致；本机 Windows 可打开的路径，线上可能区分大小写。

文章页模板已有主标题处理，正文中的开头 H1 会由项目插件处理。写作排版遵循 `docs/writing-style.md`，不要为了迁就发布另造一套格式。

## 运行环境与本地校验

以下流程用于文章、页面、样式、附件及构建相关变更。若只改仓库说明文档，使用前面的“仅仓库文档变更”分支。

README 要求 Node.js 22.18+，推荐 Node.js 24 LTS。先检查实际环境；已有依赖正常时，不需要为了新增文章反复安装。

```powershell
node --version
npm --version
```

首次接手或锁文件发生变更时执行 `npm ci`。如果安装遇到文件占用，先辨认是哪个已知预览进程持有文件，再关闭对应进程；不要批量结束所有 Node 进程。

完成本次源文件修改后，执行：

```powershell
npm run verify
if ($LASTEXITCODE -ne 0) { throw '校验未通过，停止发布。' }
```

当前命令依次运行 Astro 检查、`tests/*.test.*` 回归测试、一次 Astro 构建和 `scripts/verify-build.mjs`。全部通过后才继续同步。若修改了源文件，需要重新构建，不能发布旧的 `dist`。

构建检查会核对生成 HTML 中的内部 `href`、`src` 目标，保留五个历史文章网址和 RSS，并检查 `.nojekyll`。它不验证所有锚点、外部链接、浏览器交互、下载脚本执行结果或文章技术结论，这些需要按本次改动补充检查。

需要查看构建结果时运行：

```powershell
npm run preview -- --host 127.0.0.1
```

使用命令实际显示的地址打开预览。检查新增文章、导航、目录、代码块、移动布局、图片与附件；不要把旧的独立设计预览当作本次构建结果。预览结束后只关闭自己启动的进程。

技术文章应写明验证层级：脚本语法检查、离线模拟、运行环境实验、原平台复现分别代表什么。没有重跑的原题结果要标为历史记录。

## 查看计划，再同步根目录

```powershell
npm run publish:plan
```

这是只读预览，列出 `created`、`updated`、`removed`。检查是否出现预期的新文章、标签、系列、搜索索引、RSS 和静态附件；删除列表也必须逐项合理。

若计划缺少新文章，先检查 `draft`、文件位置和最近一次构建。若出现无关页面删除或大量意外更改，先找原因，不要继续同步。

计划符合预期后执行：

```powershell
npm run publish:local
npm run publish:plan
```

`publish:local` 不提交、不推送，只把当前 `dist` 同步到本地仓库根目录，并更新 `.deploy-manifest.json`。第二次计划的三份列表应为空，表示根目录受管文件与当前构建一致。

脚本只会清理旧 `.deploy-manifest.json` 中已经退出本次构建的文件，未受管文件不参与清理。它会拒绝受保护源码路径、符号链接、大小写冲突及非法路径，不要通过手改清单去绕过检查。

有新增、覆盖或清理时，脚本把旧清单、操作计划和被覆盖或清理的文件备份到 `.deploy-backups/<时间-进程号>/`。现有 `.maintenance-backups/` 用于完整维护备份；二者都被忽略，不应提交，也不要在发布完成前清理。

## 核对差异、清单与提交内容

```powershell
git -c safe.directory=E:/MyProject status --short
git -c safe.directory=E:/MyProject diff --stat
git -c safe.directory=E:/MyProject diff -- .deploy-manifest.json
git -c safe.directory=E:/MyProject diff --check
```

检查源文件和对应产物是否同时出现，清单是否跟踪新页面与附件，旧文章网址是否仍保留。`dist/`、`.astro/`、`node_modules/`、`.design-preview/` 和备份目录不应成为本次提交内容。

`git diff --check` 如报历史文件原有空白问题，应定位是否由本次改动引入；不要为消除提示而重排无关旧文章。提交前至少检查本次修改文件与暂存区的差异。

只暂存本次任务相关文件。如果起始工作区干净，且确认当前所有变化都属于本次发布，可以使用：

```powershell
git -c safe.directory=E:/MyProject add -A
git -c safe.directory=E:/MyProject diff --cached --stat
git -c safe.directory=E:/MyProject diff --cached --check
git -c safe.directory=E:/MyProject status --short
```

若起始已有其他工作，按明确路径执行 `git add -- <文件路径>`。根目录产物及 `.deploy-manifest.json` 也需要暂存；只提交 Markdown 或只提交生成 HTML 都会留下不一致状态。

检查暂存区是否包含秘密、临时响应、私有笔记或与任务无关的文件。`.gitignore` 不能排除已经被 Git 跟踪的文件，也不保护被错误放进文章中的文本。

## 提交并推送

Git 身份先读现有配置：

```powershell
git -c safe.directory=E:/MyProject config user.name
git -c safe.directory=E:/MyProject config user.email
```

沿用已有身份。缺失时使用用户明确提供或确认的身份，必要时只设置本仓库配置；不要根据网站名字臆造邮箱，也不要为了完成这次发布改动全局身份。不要在日志、文章或提交里输出认证令牌。

确认当前在 `main`、暂存内容准确且有本次发布授权后：

```powershell
git -c safe.directory=E:/MyProject commit -m "更新文章与发布产物"
git -c safe.directory=E:/MyProject push origin main
git -c safe.directory=E:/MyProject rev-parse HEAD
git -c safe.directory=E:/MyProject ls-remote origin refs/heads/main
```

记录本次提交 SHA，并核对远端 `main` 已指向它。推送失败而本地提交已成功时，先处理认证或网络问题，再重试推送；没有新改动就无需重建或重复提交。不要把令牌写进远端 URL，不要强推。

当前工作流不依赖 `gh`；这台机器此前没有安装它。直接使用 Git、浏览器和公开 GitHub API 即可，不必为了本次发布安装新的客户端。

## 等待部署并检查线上

推送成功只证明代码到达远端，不代表 Pages 已经更新。打开[仓库 Actions](https://github.com/yangpeter26-bot/yangpeter26-bot.github.io/actions)，找到对应本次提交 SHA 的 Pages 构建部署，确认最终成功。

也可以读取公开接口 `https://api.github.com/repos/yangpeter26-bot/yangpeter26-bot.github.io/actions/runs?per_page=10`，核对 `head_sha`、`status`、`conclusion`。API 请求带正常 User-Agent；无需在公开接口请求中暴露凭据。看不到对应任务时回到 Pages 设置和 Actions 页面确认，不要拿旧任务成功当成本次成功。

部署结束后检查：

1. 主站首页和本次新增文章返回正常页面。
2. 页面出现本次标题、日期和正文里的新内容，避免只看 HTTP 200。
3. 系列目录、上一篇/下一篇、标签、搜索和 RSS 包含本次发布内容。
4. 本次新增图片和下载附件能打开，脚本附件内容与源文件一致。
5. 若改了样式或交互，在桌面与窄屏下检查本次触及的行为。

需要排除缓存时给请求加上 `?v=<本次提交SHA>`，并结合部署任务与实际内容判断。不要仅凭查询参数宣称缓存已经清空。

反馈时分别写清“本地校验通过”“已推送到哪个提交”“对应 Pages 部署成功”“已检查哪些线上地址”。某一步尚未确认，就保留这个状态，不把它归并成“已上线”。

## 回滚与故障处理

只包含仓库文档的提交需要撤销时，使用 `git revert <文档提交SHA>` 生成撤销提交，检查撤销范围与链接后推送并核对远端 SHA；不需要为此重建网站或同步 `dist`。以下内容用于已经同步站点产物的发布。

本地同步出现问题、尚未提交时，先保留本次源文件改动和备份路径。根据对应备份中的 `plan.json`，删除本次 `created` 文件，恢复备份中的旧文件与旧 `.deploy-manifest.json`；不要把整个仓库当生成目录删除。

做删除或移动前，先将路径解析成绝对路径，确认目标仍在 `E:\MyProject` 内，并使用 PowerShell 的 `-LiteralPath`。恢复根目录产物之后，源文件仍可能是新版本；要继续编辑后重建，或一并恢复本次源文件，不能直接发布一半新一半旧的状态。

已经推送的发布优先用新提交撤销：找准包含源文件、根目录产物和清单的发布提交，使用 `git revert <提交SHA>`，检查撤销范围，再执行完整校验与同步流程，形成一致的回滚提交后推送。不要改写远端公共历史。

如果发布提交混入了无关工作，不要整笔撤销；先保留这些工作，再准确恢复本次发布涉及的源文件、附件和产物。`.deploy-backups/` 只保存同步涉及的旧产物，并不是源码备份。

失败定位按阶段进行：检查失败先修源码或校验问题；同步失败检查路径和清单；推送失败检查 Git 状态与认证；部署失败查看对应任务日志；线上内容不符则核对提交 SHA、Pages 来源、构建产物和缓存。不要用反复全量重装或重复推送代替定位。
