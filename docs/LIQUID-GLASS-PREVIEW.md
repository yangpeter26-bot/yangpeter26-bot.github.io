# 液态玻璃设计与验证记录

本轮设计从 `102437c` 建立独立预览，并于 2026-10-25 经用户确认发布。预览目录 `E:\MyProject\.design-preview\liquid-glass-20261025` 保留设计快照；正式站点使用 `main` 分支的源码与对应构建产物。发布步骤见 [PUBLISHING.md](PUBLISHING.md)。

## 本轮改动

- 用统一的材质变量管理填充、透色、边缘高光、模糊和阴影。正文和代码区保持稳定阅读背景。
- 桌面导航增加系列入口、滑动选中胶囊、键盘焦点反馈；手机增加底部五项导航，给页脚与安全区留出空间。
- 搜索使用分层玻璃面板，加入开合动画、触发位置原点、短视口高度限制和输入法组合期间的 Escape 保护。
- 首页使用头像中的雾蓝色增加背景层次，简化星芒和轨道装饰，头像原图和既有文章内容保持一致。
- 支持的浏览器使用原生跨文档过渡保持导航稳定；仍然采用整页静态导航，没有引入 SPA 路由。

## 渲染与回退

基础材质由 CSS 实现，不依赖新的 UI 框架或第三方运行库。`liquid-glass.ts` 只在指针移动时更新高光位置，不运行持续动画循环。

桌面 Chromium、精细指针且未启用降低透明度、高对比或减少动效时，对小面积导航增加 SVG 背景位移。位移图按实际圆角和尺寸生成，仅尺寸变化时更新；变形只作用于背景，不扭曲按钮文字。

手机控件使用 CSS 材质，避免移动导航背景采样的重影。Safari、其他非 Chromium 引擎和辅助功能偏好保留基础材质；无背景滤镜支持时回退为实体背景。减少动效时关闭进退场动画和指针高光跟随。

不要仅凭 `CSS.supports` 认为所有引擎都渲染相同的 SVG 背景效果。以后新增浏览器支持应先实测，再放开增强条件。不要把 `filter` 加到整个导航上，否则文字也会被变形。

## 检查记录

- 完整 `npm run verify`：Astro 检查、13 项现有测试、静态构建、内部链接检查。
- 当前构建保持 46 个 HTML 页面、20 篇文章，RSS、搜索索引与既有文章网址均保留。
- 当前桌面 Chromium：首页浅色/深色、搜索结果、方向键导航、Escape 关闭与焦点返回、栏目选中状态、文章阅读页。
- 同浏览器的 320/390 像素 iframe 视口：底部导航、页脚空间、搜索滚动；320 像素下的横向滚动已修复。短视口检查使用 480 像素高的容器。
- 这些窄屏检查不等于 iPhone Safari 真机验证。iOS 软键盘、安全区、降低透明度系统偏好和 Safari 实际渲染仍需真机确认。

临时 `dist/__mobile-preview.html` 仅用于窄屏检查，不是公开页面；交付前移除，不纳入同步或提交。

## 接手与发布

在独立预览目录运行 `npm run preview -- --host 127.0.0.1 --port 4323` 可重新打开预览。已有构建不匹配源码时先运行 `npm run verify`。

后续修改仍应先在独立预览中验证，确认发布范围后将源文件改动合入正式工作区，再依照 [PUBLISHING.md](PUBLISHING.md) 执行完整检查、同步、提交与发布。不要把整个预览目录或其旧构建复制到正式目录；不要提交依赖 junction、`.astro`、`dist` 和截图临时文件。

如果将来引入 Astro ClientRouter，需要重新设计浏览器脚本的初始化与清理。目前脚本和 Observer 按整页生命周期工作。

## 参考

- [Apple 材质设计指南](https://developer.apple.com/design/human-interface-guidelines/materials)
- [SVG 背景位移](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/feDisplacementMap)
- [跨文档视图过渡](https://developer.mozilla.org/en-US/docs/Web/CSS/@view-transition)
- [VisualViewport](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport)
