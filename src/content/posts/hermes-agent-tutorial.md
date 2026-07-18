---
title: "Hermes Agent 使用教程 —— 接入小米 MiMo 大模型"
date: "2026-07-18"
tags: ["Tools", "AI", "Hermes"]
excerpt: "从官网下载 Hermes Agent 桌面应用，接入小米 MiMo 大模型 API，像 ChatGPT 一样使用，但能操作你的电脑。"
---

# Hermes Agent 使用教程 —— 接入小米 MiMo 大模型

## 前言

Hermes Agent 是 Nous Research 开源的 AI Agent 框架。和 ChatGPT、Claude 这些网页聊天工具不同，Hermes **能直接操作你的电脑**——读写文件、执行命令、搜索网页、分析图片，而不只是给你文字建议。

Hermes 有原生桌面应用，界面和 ChatGPT 类似，小白也能轻松上手。

---

## 一、下载安装

### Windows 用户

1. 打开官网：https://hermes-agent.nousresearch.com
2. 点击页面上的 **「DOWNLOAD FOR WINDOWS」** 按钮
3. 下载完成后双击安装包，按提示安装即可

### macOS 用户

1. 打开官网：https://hermes-agent.nousresearch.com
2. 找到 Mac OS 区域，点击 **「DOWNLOAD」** 按钮
3. 下载完成后打开 `.dmg` 文件，把 Hermes 拖到 Applications 文件夹

安装完成后，桌面会出现 Hermes 图标，双击即可启动。

---

## 二、获取小米 MiMo API Key

### 第一步：注册小米大模型平台

访问小米大模型 API 平台，注册账号。

> **邀请福利**：通过邀请码注册，双方各得 ¥10 API 体验金 + 首单 9 折。
> 邀请码：**WA8XGT**
> 注册链接：https://platform.xiaomimimo.com?ref=WA8XGT（注册后自动填入，体验金 40 天有效）

![小米大模型平台注册页面](/hermes-01-register.png)

### 第二步：创建 API Key

登录后，进入「API 密钥管理」页面，点击「创建密钥」。

![API 密钥管理页面](/hermes-02-apikey.png)

**API Key 只显示一次，务必复制保存好。**

---

## 三、配置模型

打开 Hermes 桌面应用，点击顶部的**模型选择器**，在配置面板中填入：

| 项目 | 填什么 |
|------|--------|
| 提供商 | `xiaomi`（或 `custom`） |
| 模型名 | `MiMo` |
| API Key | 粘贴你刚才复制的密钥 |
| Base URL | `https://api.xiaomi.com/v1` |

保存后即可开始使用。

---

## 四、开始使用

在桌面应用的对话框中，直接输入问题即可，和 ChatGPT 一样：

```
你：帮我写一个 Python 排序算法
Hermes：[自动生成代码，保存为文件，运行测试]

你：读一下桌面上的 notes.txt
Hermes：[读取文件内容并展示给你]

你：搜一下最新的 Python 框架推荐
Hermes：[联网搜索，返回结果]
```

Hermes 的核心能力是**工具调用**——它不只是聊天，还能真正操作你的电脑。

---

## 五、核心功能

### 5.1 记忆

Hermes 会跨会话记住你的偏好。比如你告诉它「我喜欢中文交流」，下次新开会话它也会用中文回复。

### 5.2 文件操作

Hermes 可以直接读写你电脑上的文件。你可以让它：

- 读取任意文件内容
- 修改代码、文档
- 创建新文件
- 搜索文件

### 5.3 网页搜索

Hermes 可以联网搜索信息，帮你查资料、获取最新资讯。

### 5.4 图片分析

你可以拖拽图片到对话框，让 Hermes 分析图片内容、提取文字、解答问题。

### 5.5 代码执行

Hermes 可以运行 Python 代码并返回结果，适合数据分析、数学计算等场景。

---

## 六、常见问题

### Q1：提示 API Key 无效？

检查三点：

1. API Key 是否复制完整（没有多余空格）
2. Base URL 是否正确
3. 小米平台账号是否欠费或被封

### Q2：Hermes 很慢？

MiMo 模型的响应速度取决于小米服务器。如果很慢：

- 检查网络连接
- 尝试切换其他模型（桌面应用顶部模型选择器）

### Q3：Hermes 能做什么和不能做什么？

**能做的**：读写文件、执行命令、搜索网页、分析图片、生成代码

**不能做的**：不能访问你的银行账号、不能保证代码 100% 正确（建议检查它生成的代码）

---

## 七、总结

Hermes Agent + 小米 MiMo 的组合让你拥有一个能操作电脑的 AI 助手。核心流程：

1. **下载安装**：去官网 https://hermes-agent.nousresearch.com 下载桌面应用
2. **获取 API Key**：在小米大模型平台创建密钥
3. **配置模型**：在桌面应用中填入 API Key
4. **开始使用**：直接在对话框聊天

相比网页版聊天，Hermes 的优势是**能动手**——不只是告诉你怎么做，而是直接帮你做。

---

*基于 Hermes Agent v2.3.0，官方文档：https://hermes-agent.nousresearch.com/docs/*
