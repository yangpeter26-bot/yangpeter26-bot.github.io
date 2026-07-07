---
title: "Metasploitable2 渗透学习（一）—— vsFTPd 2.3.4 后门漏洞"
date: "2026-07-06"
tags: ["Security", "Metasploitable2"]
excerpt: "Metasploitable2 靶机 vsFTPd 2.3.4 后门漏洞复现：信息收集、漏洞分析、Exploit 阅读与手工验证的完整流程记录。"
series: "metasploitable2"
seriesOrder: 1
---

## 一、实验目的

本次实验旨在学习经典漏洞靶机 Metasploitable2 的使用方法，掌握漏洞发现、信息收集、漏洞分析及漏洞利用的基本流程，并尝试复现著名的 vsFTPd 2.3.4 后门漏洞，理解其形成原因及利用原理。

---

## 二、实验环境

* 攻击机：Kali Linux
* 靶机：Metasploitable2
* 网络模式：VMware NAT
* 攻击机 IP：192.168.93.146
* 靶机 IP：192.168.93.148

---

## 三、实验过程

### （一）主机信息收集

首先使用 Nmap 对靶机进行扫描：

```bash
nmap -sV -sC 192.168.93.148
```

扫描结果显示目标开放了多个服务，包括 FTP、SSH、Telnet、HTTP、MySQL、PostgreSQL、Samba、Tomcat 等。其中 FTP 服务版本识别为 **vsFTPd 2.3.4**。

由于该版本曾发生著名的供应链攻击事件，因此决定首先对该漏洞进行学习和复现。

---

### （二）了解漏洞原理

查阅公开资料后了解到，vsFTPd 2.3.4 并非官方发布的软件本身存在漏洞，而是 2011 年官方网站曾短时间内遭到攻击，攻击者将带有后门代码的源码上传至官方下载服务器。

该后门程序的工作流程如下：

1. 攻击者连接 FTP 服务；
2. 用户名中包含 `:)`；
3. 后门程序被触发；
4. 服务器后台启动 6200 端口；
5. 攻击者连接 6200 端口即可获得 Root Shell。

这一事件属于典型的供应链安全事件，也说明软件发布过程同样可能成为攻击目标。

---

### （三）信息验证

为了验证 FTP 服务情况，首先匿名登录 FTP：

```bash
ftp 192.168.93.148
```

实验结果表明：

* 支持匿名登录；
* FTP 服务能够正常工作；
* Banner 显示为 vsFTPd 2.3.4。

随后使用 SearchSploit 查询公开漏洞：

```bash
searchsploit vsftpd 2.3.4
```

查询结果如下：

* Python 漏洞利用脚本
* Metasploit 模块

说明该漏洞存在公开 Exploit。

---

### （四）阅读 Exploit 源码

对 Python Exploit 进行了学习，发现其核心逻辑十分简单：

1. 使用 Telnet 连接 FTP（21端口）；
2. 发送特殊用户名：

```
USER test:)
```

3. 任意输入密码；
4. 再连接 6200 端口；
5. 若连接成功即可进入 Root Shell。

通过阅读源码，对漏洞利用过程有了更加直观的理解，也进一步认识到 Metasploit 本质上只是对这些 Exploit 的封装。

---

### （五）尝试利用

首先尝试使用 Metasploit：

```bash
use exploit/unix/ftp/vsftpd_234_backdoor
```

运行过程中出现 Payload 配置问题。

随后分析发现，新版本 Metasploit 自动选择了 Reverse TCP Meterpreter Payload，需要配置 LHOST，而该漏洞实际属于 Bind Shell，因此 Payload 与漏洞利用方式并不匹配。

之后改用 Python Exploit：

```bash
python3 49757.py 192.168.93.148
```

运行后程序能够连接 FTP，但连接 6200 端口时报错：

```
Connection refused
```

说明目标主机并未开启后门监听端口。

随后又进行了手工验证：

```
USER test:)
PASS test
```

FTP 返回：

```
500 OOPS: priv_sock_get_result
```

之后再次检测 6200 端口，仍然提示连接被拒绝。

---

## 四、实验中遇到的问题

本次实验主要遇到了以下几个问题：

### （1）Metasploit Payload 自动选择问题

新版 Metasploit 自动选择了 Reverse TCP Payload，需要配置 LHOST，而当前漏洞属于 Bind Shell，导致模块无法直接运行。

通过分析，理解了 Exploit 与 Payload 的区别，也了解到不同 Payload 的适用场景。

---

### （2）Python Exploit 无法建立 Shell

Python Exploit 能够成功连接 FTP 服务，但无法连接 6200 端口。

分析认为：

* 后门没有成功启动；
* 或当前靶机环境中的 vsFTPd 并非经典后门版本；
* 也可能与镜像版本存在差异有关。

---

### （3）环境验证困难

由于 Metasploitable2 系统版本较老，部分现代 Linux 命令不可用，同时虚拟机终端复制粘贴也较为不便，导致环境验证效率较低。

因此，本次实验更多采用了逐步验证的方法，对漏洞利用过程进行了分析。

---

## 五、实验收获

虽然本次实验最终未成功获得 Root Shell，但仍然完成了以下学习目标：

1. 掌握了 Nmap 服务探测的方法；
2. 学会利用 SearchSploit 查询公开漏洞；
3. 阅读并理解了 Python Exploit 的实现思路；
4. 理解了 Metasploit 中 Exploit 与 Payload 的关系；
5. 学习了 Reverse Shell 与 Bind Shell 的区别；
6. 初步了解了供应链攻击事件及其安全影响；
7. 学会根据报错信息逐步分析和排查漏洞复现失败的原因，而不是仅依赖工具完成攻击。

---

## 六、总结

本次实验未能成功复现 vsFTPd 2.3.4 后门漏洞，推测原因可能与所使用的 Metasploitable2 镜像版本、vsFTPd 二进制文件差异或实验环境配置有关。

虽然实验未达到预期的利用结果，但整个学习过程中完成了从信息收集、漏洞分析、Exploit 阅读、手工验证到问题排查的完整流程，对漏洞复现的基本方法有了较为系统的认识。

后续计划重新搭建官方实验环境或进一步验证当前镜像中的 FTP 服务版本，在环境确认无误后再次尝试复现该漏洞，并继续学习 Metasploitable2 中的其他经典漏洞，如 Samba、UnrealIRCd、Tomcat 等，不断完善对漏洞分析与利用技术的理解。
