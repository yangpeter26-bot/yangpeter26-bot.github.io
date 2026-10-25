# 项目维护入口

接手本项目先阅读 [README.md](README.md)、[发布说明](docs/PUBLISHING.md) 和 [写作规范](docs/writing-style.md)。发布步骤以当前仓库配置和发布说明为准。

- 文章源文件位于 `src/content/posts/`，公开附件位于 `public/`。页面、样式和交互修改 `src/`，根目录 HTML 等由构建生成。
- 当前使用 GitHub Pages 的 `main` 分支根目录发布。`dist/` 已忽略；源文件、同步后的根目录产物及 `.deploy-manifest.json` 一起提交。
- 修改站点内容时执行 `npm run verify` → `npm run publish:plan` → 核对计划 → `npm run publish:local`。仅仓库文档的变更遵循发布说明中的对应流程，避免同步旧构建。
- 开始前检查分支、远端和已有改动，保留其他人的工作。提交前检查暂存区，推送后核对远端 SHA、部署任务与线上实际内容。
- 用户本次已明确要求发布时，完成检查后直接提交推送；仅要求设计预览时先交付预览。视觉重设计先提供可运行预览，再按用户当前指令发布。
- 显示名为 `yyg`，头像为 `public/avatar-yyg.jpg`；未经用户要求保留原头像内容。
- 既有文章网址应保留；不要从旧的 `.design-preview/` 同步内容覆盖正式源码。
- 技术文章区分源码分析、离线检查和实际复现，历史结果写明来源，不把构建成功当成实验成功。
