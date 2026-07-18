---
title: "Hermes Agent 使用教程 —— 接入小米 MiMo 大模型"
date: "2026-07-18"
tags: ["Tools", "AI", "Hermes"]
excerpt: "从零开始安装配置 Hermes Agent，接入小米 MiMo 大模型 API，掌握终端对话、桌面应用、技能系统、定时任务等核心功能。"
---

# Hermes Agent 使用教程 —— 接入小米 MiMo 大模型

## 前言

Hermes Agent 是 Nous Research 开源的 AI Agent 框架，类似 Claude Code 和 OpenAI Codex，但有一个核心优势：**可以接入任意 LLM 提供商**，包括小米的 MiMo 大模型。

相比直接在网页上聊天，Hermes Agent 的优势在于：

- **能操作你的电脑**：读写文件、执行命令、浏览网页
- **跨会话记忆**：记住你的偏好、项目结构、历史对话
- **多平台**：终端、桌面应用、Telegram、Discord 等
- **技能系统**：积累可复用的工作流程

---

## 一、安装 Hermes Agent

### Windows 安装

打开 PowerShell 或 Git Bash，执行：

```bash
pip install hermes-agent
```

> **注意**：需要 Python 3.10+。如果没有 Python，先去 [python.org](https://python.org) 下载安装。

安装完成后验证：

```bash
hermes --version
```

应该看到版本号输出。

### macOS / Linux 安装

```bash
curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash
```

这个脚本会自动配置 uv、Python 虚拟环境和启动器。

---

## 二、获取小米 MiMo API Key

### 第一步：注册小米大模型平台

访问小米大模型 API 平台，注册账号。

![小米大模型平台注册页面](/hermes-01-register.png)

### 第二步：创建 API Key

登录后，进入"API 密钥管理"页面，点击"创建密钥"。

![API 密钥管理页面](/hermes-02-apikey.png)

### 第三步：记录 API 信息

你需要三个信息：

| 信息 | 值 |
|------|-----|
| API Key | 你刚才复制的密钥 |
| Base URL | `https://api.xiaomi.com/v1`（或平台提供的地址） |
| 模型名 | `MiMo` 或平台上的具体模型标识 |

---

## 三、配置 Hermes Agent

### 方式一：交互式配置（推荐新手）

```bash
hermes setup
```

这个命令会启动一个交互式向导，引导你完成配置。

终端中会显示一个交互式向导，依次询问你选择模型提供商、输入 API Key 等信息。

向导会问你选择哪个模型提供商。选择 **Xiaomi MiMo**。

在模型列表中用方向键选中 **Xiaomi MiMo**，按回车确认。

然后输入你的 API Key。

### 方式二：手动编辑配置文件

配置文件位于：

- **Windows**：`C:\Users\你的用户名\.hermes\config.yaml`
- **macOS/Linux**：`~/.hermes/config.yaml`

用文本编辑器打开，找到 `model` 部分：

```yaml
model:
  default: "MiMo"
  provider: "xiaomi"
  api_key: "你的API Key"
  base_url: "https://api.xiaomi.com/v1"
```

### 方式三：命令行直接设置

```bash
hermes config set model.default "MiMo"
hermes config set model.provider "xiaomi"
hermes config set model.api_key "你的API Key"
```

API Key 也可以写在 `.env` 文件中：

```
XIAOMI_API_KEY=你的API Key
```

`.env` 文件路径：`~/.hermes/.env`

---

## 四、验证配置

运行健康检查：

```bash
hermes doctor
```

会显示各项依赖和配置的检查结果。

如果看到绿色的 ✓ 小米 MiMo 连接成功，说明配置正确。

---

## 五、开始使用

### 启动对话

```bash
hermes
```

直接运行 `hermes` 就会进入交互式对话界面。

终端会显示 Hermes 的启动信息和输入提示符，你可以直接开始输入问题。

### 单次提问

不想进入交互模式，可以一次性提问：

```bash
hermes chat -q "解释一下什么是Transformer"
```

### 对话示例

进入 Hermes 后，你可以像聊天一样使用：

```
你：帮我看看当前目录有什么文件
Hermes：[会自动调用文件工具列出目录内容]

你：写一个 Python 脚本，计算斐波那契数列前20项
Hermes：[会自动写代码、保存文件、运行测试]

你：把这段代码翻译成中文注释版
Hermes：[会读取文件并修改注释]
```

Hermes 的核心能力是**工具调用**——它不只是聊天，还能真正操作你的电脑。

---

## 六、桌面应用

Hermes 有一个原生桌面应用，体验比终端更好。

### 启动桌面应用

```bash
hermes desktop
```

或者：

```bash
hermes gui
```

桌面应用界面类似 ChatGPT，左侧是会话列表，右侧是对话区域。

桌面应用的优势：

- 流式对话显示
- 会话列表管理
- 拖拽上传文件
- 剪贴板粘贴图片
- 顶部模型切换器
- 原生通知

---

## 七、核心功能

### 7.1 持久记忆

Hermes 跨会话记住你的信息：

```
你：我喜欢用中文交流，代码注释也用中文
Hermes：[会保存到记忆中]

# 下次新开会话
你：帮我写个排序算法
Hermes：[自动用中文写代码和注释]
```

### 7.2 技能系统

Hermes 可以把复杂的工作流程保存为"技能"：

```bash
# 浏览可用技能
hermes skills browse

# 安装一个技能
hermes skills install <技能ID>

# 查看已安装技能
hermes skills list
```

会显示社区共享的技能列表，涵盖代码审查、文档生成、数据分析等各种场景。

### 7.3 文件操作

Hermes 可以直接读写你电脑上的文件：

```
你：读一下 E:\MyProject\README.md
Hermes：[会读取文件内容并展示]

你：把 README 里的版本号改成 2.0
Hermes：[会用 patch 工具精确修改]
```

### 7.4 终端命令

Hermes 可以执行终端命令：

```
你：帮我看看 Git 状态
Hermes：[执行 git status 并展示结果]

你：安装 requests 库
Hermes：[执行 pip install requests]
```

### 7.5 网页搜索

```
你：搜一下 2026 年最新的 Python 框架
Hermes：[调用搜索工具，返回结果]
```

### 7.6 定时任务

可以设置定时执行的任务：

```bash
# 创建一个每天早上 9 点的提醒
hermes cron create "0 9 * * *" --prompt "提醒我今天要做的事情"

# 查看所有定时任务
hermes cron list
```

---

## 八、常用命令速查

| 命令 | 作用 |
|------|------|
| `hermes` | 启动交互对话 |
| `hermes chat -q "问题"` | 单次提问 |
| `hermes desktop` | 启动桌面应用 |
| `hermes setup` | 交互式配置向导 |
| `hermes model` | 切换模型/提供商 |
| `hermes doctor` | 健康检查 |
| `hermes config` | 查看当前配置 |
| `hermes skills list` | 查看已安装技能 |
| `hermes sessions list` | 查看历史会话 |
| `hermes update` | 更新到最新版 |

### 对话中的斜杠命令

| 命令 | 作用 |
|------|------|
| `/new` | 新建会话 |
| `/model` | 查看/切换模型 |
| `/help` | 查看所有命令 |
| `/quit` | 退出 |

---

## 九、常见问题

### Q1：提示 API Key 无效？

检查三点：

1. API Key 是否复制完整（没有多余空格）
2. Base URL 是否正确
3. 小米平台账号是否欠费或被封

### Q2：Hermes 很慢？

MiMo 模型的响应速度取决于小米服务器。如果很慢，可以：

- 检查网络连接
- 尝试切换其他模型

### Q3：Hermes 能做什么和不能做什么？

**能做的**：读写文件、执行命令、搜索网页、分析图片、生成代码、管理定时任务

**不能做的**：不能访问你的银行账号、不能帮你点击 GUI 按钮（除非用浏览器工具）、不能保证代码 100% 正确

### Q4：如何更换模型？

```bash
hermes model
```

会弹出交互式选择器，可以随时切换。

---

## 十、总结

Hermes Agent + 小米 MiMo 的组合让你拥有一个能操作电脑的 AI 助手。核心流程就是：

1. **安装**：`pip install hermes-agent`
2. **配置**：`hermes setup` 选 Xiaomi MiMo，输入 API Key
3. **使用**：`hermes` 开始对话

相比网页版聊天，Hermes 的优势是**能动手**——不只是告诉你怎么做，而是直接帮你做。

---

*基于 Hermes Agent v2.3.0，官方文档：https://hermes-agent.nousresearch.com/docs/*
