# 深度学习入门：Softmax 回归完整详解

> 读完这篇文章你将学会：用 PyTorch 训练一个衣服分类器，识别 T恤、裤子、运动鞋等 10 种类别。
> 
> 本文基于《动手学深度学习》第 3 章，从理论到代码逐行讲解。

---

## 目录

1. [Softmax 回归解决什么问题？](#一softmax-回归解决什么问题)
2. [从线性回归到 Softmax 回归](#二从线性回归到-softmax-回归)
3. [Softmax 函数详解（手算演示）](#三softmax-函数详解手算演示)
4. [交叉熵损失函数（手算演示）](#四交叉熵损失函数手算演示)
5. [Fashion-MNIST 数据集介绍](#五fashion-mnist-数据集介绍)
6. [从零手写实现（逐行讲解）](#六从零手写实现逐行讲解)
7. [PyTorch 简洁实现](#七pytorch-简洁实现)
8. [训练过程解析](#八训练过程解析)
9. [完整对比表](#九完整对比表)
10. [常见问题解答](#十常见问题解答)

---

## 一、Softmax 回归解决什么问题？

### 1.1 和线性回归的区别

| | 线性回归 | Softmax 回归 |
|------|---------|------------|
| 回答的问题 | "**多少**？" | "**哪一个**？" |
| 举例 | 房价多少钱？气温多少度？ | 这是猫还是狗？什么颜色的衣服？ |
| 输出 | **1 个数字**（比如 200 万） | **每个类别的概率**（比如猫 80%、狗 15%、鸟 5%） |
| 应用 | 预测连续值 | 分类 |
| 损失函数 | 平方损失 `(预测-真实)²` | 交叉熵 `-log(正确类的概率)` |

### 1.2 真实场景例子

```
场景 1：Gmail 邮件分类
  输入：邮件内容
  输出：[主要邮件 70%, 社交邮件 20%, 广告邮件 10%]
  → 概率最高的是"主要邮件"

场景 2：Fashion-MNIST 衣服识别
  输入：28×28 灰度图片
  输出：[T恤 5%, 裤子 85%, 套头衫 3%, ... 等 10 个概率]
  → 概率最高的是"裤子"

场景 3：手写数字识别
  输入：手写数字图片
  输出：[0:1%, 1:2%, ..., 7:90%, 8:3%, 9:1%]
  → 概率最高的是"7"
```

---

## 二、从线性回归到 Softmax 回归

### 2.1 线性回归的结构（复习）

```
输入(面积, 房龄) → [W, b] → 输出(房价)
    x1, x2          y=w1*x1+w2*x2+b      一个数字
```

只有一个输出，就是一个数字。

### 2.2 Softmax 回归的结构

```
输入(784个像素) → [W, b] → 10个分数(o1~o10)
                          → Softmax → 10个概率(和为1)
                          → argmax → 预测类别
```

**关键区别：输出不是一个数字，而是每个类别都输出一个分数。有多少个类别，就有多少个输出。**

### 2.3 形象理解

```
线性回归 = 给你一把秤 → 秤出重量（一个数）

Softmax = 给你一个裁判 → 给每只动物打分
          → 猫4分, 狗1分, 鸟-2分
          → 最终宣布：95%是猫！
```

---

## 三、Softmax 函数详解（手算演示）

### 3.1 为什么需要 Softmax？

模型直接输出的分数（叫 logit 或未规范化的预测）有这些问题：

```
猫的分数 = 4.0   ← 大于1了！（概率应该在 0~1 之间）
狗的分数 = 1.0   ← 正常
鸟的分数 = -2.0  ← 负数！（概率不可能是负数）

总和 = 3.0，不等于 1
```

**Softmax 的作用：把任意分数变成三件事——①非负数 ②总和为 1 ③大小顺序不变。**

### 3.2 Softmax 公式

```
                 exp(o_j)
Softmax(o_j) = ──────────────
                Σ exp(o_k)
```

三个步骤：
1. 取指数 exp → 确保非负
2. 求和 Σ → 得到"总能量"
3. 除以总和 → 确保和为 1

### 3.3 完整手算

输入分数（一个样本的 3 个分数）：

```
o1 = 4.0   (猫)
o2 = 1.0   (狗)
o3 = -2.0  (鸟)
```

**第 1 步：对每一项求 exp（e ≈ 2.718）**

```
exp(4.0) = e^4  = 2.718^4 = 54.598
exp(1.0) = e^1  = 2.718^1 = 2.718
exp(-2.0)= e^-2 = 2.718^-2 = 0.135
```

为什么用指数函数？因为 `exp(x)` 的结果永远是正数！

**第 2 步：计算总和（叫做配分函数 partition）**

```
总和 = 54.598 + 2.718 + 0.135 = 57.451
```

**第 3 步：每一项除以总和**

```
猫的概率 = 54.598 / 57.451 = 0.950  →  95.0%
狗的概率 = 2.718  / 57.451 = 0.047  →   4.7%
鸟的概率 = 0.135  / 57.451 = 0.002  →   0.2%

验证：
  都在 0~1 之间 ✅
  总和 = 0.950+0.047+0.002 = 0.999 ≈ 1.0 ✅
  大小顺序：猫>狗>鸟 和原始分数一致 ✅
```

### 3.4 代码实现

```python
import torch

def softmax(X):
    """对矩阵 X 的每一行做 Softmax"""
    X_exp = torch.exp(X)                     # 第1步：每个元素取指数
    partition = X_exp.sum(1, keepdim=True)    # 第2步：每行求和
    return X_exp / partition                  # 第3步：除以总和（广播机制）

# 测试
scores = torch.tensor([[4.0, 1.0, -2.0]])     # 1个样本，3个分数
probs = softmax(scores)
print(probs)  # tensor([[0.9500, 0.0474, 0.0026]])
print(probs.sum())  # tensor(1.0000)
```

### 3.5 为什么 dim=1？

```python
X_exp.sum(1, keepdim=True)   # dim=1：按行
X_exp.sum(0, keepdim=True)   # dim=0：按列
```

```
X = [分数1_猫, 分数1_狗, 分数1_鸟]     ← 第1行（第1个样本）
    [分数2_猫, 分数2_狗, 分数2_鸟]     ← 第2行（第2个样本）

dim=1 求和：每一行内部求和（每个样本自己的总和）
dim=0 求和：每一列求和（所有样本同一类别的总和）
```

**Softmax 要每个样本分开算自己的概率，所以用 dim=1。**

---

## 四、交叉熵损失函数（手算演示）

### 4.1 为什么不用平方损失了？

```
线性回归：输出是数字 → 用平方差 (200万 - 180万)² = 400
Softmax：  输出是概率 → 我们要关心"正确类的概率有多高"
```

分类问题用平方损失效果不好，所以换成交叉熵。

### 4.2 公式

```
loss = -log(ŷ_correct)

其中 ŷ_correct 是"正确答案那个类别的概率"
```

### 4.3 完整手算

假设输入一张狗的图片，正确答案是狗（第 2 类）。

模型预测的概率：

```
ŷ = [0.1, 0.6, 0.3]
     猫    狗    鸟
      ↑
     正确答案是狗，概率 = 0.6
```

计算损失：

```
loss = -log(0.6)
     = -(-0.511)
     = 0.511
```

### 4.4 不同概率对应不同损失

| 正确类的概率 | 损失 -log(p) | 评价 |
|------------|-------------|------|
| 0.99 | -log(0.99) = 0.010 | 几乎完美 ✅ |
| 0.90 | -log(0.90) = 0.105 | 很好 |
| 0.50 | -log(0.50) = 0.693 | 一半一半，不靠谱 |
| 0.10 | -log(0.10) = 2.303 | 很差 ❌ |
| 0.01 | -log(0.01) = 4.605 | 烂到极点 ❌❌ |

**规律：概率越高 → log 越接近 0 → -log 越小 → 损失越小。**

### 4.5 为什么取对数？

```
概率 0.99 → 损失 0.01  (几乎不惩罚)
概率 0.50 → 损失 0.69  (有明显惩罚)
概率 0.10 → 损失 2.30  (狠狠惩罚)
概率 0.01 → 损失 4.60  (往死里惩罚)

对数让"差一点"和"差很多"的惩罚拉开了距离！
```

### 4.6 代码实现

```python
def cross_entropy(y_hat, y):
    """
    y_hat: (batch_size, num_classes) — 每行是一个样本的各类概率
    y: (batch_size,) — 每行是正确答案的类别编号
    """
    return -torch.log(y_hat[range(len(y_hat)), y])

# 测试
y_hat = torch.tensor([[0.1, 0.3, 0.6],     # 第1个样本：3个类的概率
                      [0.3, 0.2, 0.5]])    # 第2个样本：3个类的概率
y = torch.tensor([0, 2])                   # 第1个正确答案是0，第2个正确答案是2

loss = cross_entropy(y_hat, y)
print(loss)
# tensor([-log(0.1), -log(0.5)])
# = tensor([2.3026, 0.6931])
```

---

## 五、Fashion-MNIST 数据集介绍

### 5.1 数据集概览

| 属性 | 值 |
|------|-----|
| 图片尺寸 | 28×28 像素（灰度，只有一个颜色通道） |
| 训练集 | 60,000 张 |
| 测试集 | 10,000 张 |
| 类别数 | 10 类 |
| 输入特征数 | 784（28×28 所有像素拉平） |

### 5.2 10 个类别

```
标签 0：T恤/top
标签 1：裤子/trouser
标签 2：套头衫/pullover
标签 3：连衣裙/dress
标签 4：外套/coat
标签 5：凉鞋/sandal
标签 6：衬衫/shirt
标签 7：运动鞋/sneaker
标签 8：包/bag
标签 9：短靴/ankle-boot
```

### 5.3 形状变换

```
原始图片： (256,  1, 28, 28)
           批量 通道 高   宽

展平后：   (256, 784)
           批量 像素

× W：      (256, 784) × (784, 10) = (256, 10)
                                    批量  各类分数

+ Softmax → (256, 10) 每行是10个概率，和为1
```

---

## 六、从零手写实现（逐行讲解）

### 6.1 导入库

```python
import torch
from IPython import display        # 用于 Jupyter 里的图表显示
from d2l import torch as d2l      # 本书自带的工具包
```

### 6.2 加载数据

```python
batch_size = 256
# d2l.load_data_fashion_mnist 会自动：
# 1. 下载数据集（首次使用）
# 2. 转换成 PyTorch 的 DataLoader
# 3. 分成训练集和测试集
train_iter, test_iter = d2l.load_data_fashion_mnist(batch_size)
```

### 6.3 初始化模型参数

```python
num_inputs = 784   # 28×28 = 784 个像素，每个像素是一个输入特征
num_outputs = 10   # 10 个类别

# W 的形状：(784, 10)，表示 784 个输入映射到 10 个输出
# 每个输出 = 784 个加权和
W = torch.normal(0, 0.01, size=(num_inputs, num_outputs), requires_grad=True)

# b 的形状：(10,)，每个输出类别一个偏置
b = torch.zeros(num_outputs, requires_grad=True)
```

**参数总量：784×10 + 10 = 7850 个参数需要学习。**

`requires_grad=True` 告诉 PyTorch："训练时要算这俩的梯度"。

### 6.4 实现 Softmax 函数

```python
def softmax(X):
    """
    输入 X: (batch_size, num_classes)，每行是一个样本的各个类分数
    输出:   (batch_size, num_classes)，每行是概率分布
    """
    X_exp = torch.exp(X)                    # 对每个元素取 exp
    partition = X_exp.sum(1, keepdim=True)   # 对每行求和
    return X_exp / partition                # 广播：每行除以自己的和
```

### 6.5 定义模型

```python
def net(X):
    """
    输入 X: (batch_size, 1, 28, 28) — 一批图片
    输出:   (batch_size, 10) — 一批概率分布
    """
    # 第1步：展平
    # .reshape((-1, W.shape[0]))
    #   -1 = 自动推算 = batch_size (256)
    #   W.shape[0] = 784
    # 结果: (256, 784)

    # 第2步：矩阵乘法
    # (256, 784) @ (784, 10) = (256, 10)

    # 第3步：加偏置 b(10,)

    # 第4步：Softmax
    return softmax(torch.matmul(X.reshape((-1, W.shape[0])), W) + b)
```

### 6.6 计算交叉熵损失

```python
def cross_entropy(y_hat, y):
    """
    y_hat: (batch_size, 10) — 每行 10 个概率
    y: (batch_size,) — 每行是正确答案的类别编号
    """
    # y_hat[range(len(y_hat)), y] 详解：
    #    range(len(y_hat)) = [0, 1, 2, ..., 255]  （样本编号）
    #    y = [2, 4, 1, ...]                       （正确答案类别）
    #    y_hat[[0,1], [2,4]]  → 取第0行的第2个、第1行的第4个
    #    → 拿到每个样本"正确类的概率"
    return -torch.log(y_hat[range(len(y_hat)), y])
```

### 6.7 计算精度

```python
def accuracy(y_hat, y):
    """计算预测正确的样本数量"""
    # 如果 y_hat 是矩阵（多分类），取每行最大值所在的列 → 预测类别
    if len(y_hat.shape) > 1 and y_hat.shape[1] > 1:
        y_hat = y_hat.argmax(axis=1)

    # 比较预测和真实
    cmp = y_hat.type(y.dtype) == y

    # 数有几个 True
    return float(cmp.type(y.dtype).sum())

# 用法
# accuracy(y_hat, y) / len(y)  = 正确率
```

### 6.8 评估函数

```python
class Accumulator:
    """累加器，用来在多个批量上累加统计值"""
    def __init__(self, n):
        self.data = [0.0] * n

    def add(self, *args):
        self.data = [a + float(b) for a, b in zip(self.data, args)]

    def reset(self):
        self.data = [0.0] * len(self.data)

    def __getitem__(self, idx):
        return self.data[idx]


def evaluate_accuracy(net, data_iter):
    """计算模型在指定数据集上的精度"""
    if isinstance(net, torch.nn.Module):
        net.eval()                      # 评估模式（关闭 Dropout 等）
    metric = Accumulator(2)             # 存 [正确数, 总数]
    with torch.no_grad():               # 不算梯度，节省计算
        for X, y in data_iter:
            metric.add(accuracy(net(X), y), y.numel())
    return metric[0] / metric[1]        # 正确数 ÷ 总数
```

### 6.9 训练一轮

```python
def train_epoch_ch3(net, train_iter, loss, updater):
    """训练模型一个 epoch"""
    if isinstance(net, torch.nn.Module):
        net.train()                     # 训练模式
    metric = Accumulator(3)             # 存 [损失和, 正确数, 总数]

    for X, y in train_iter:
        y_hat = net(X)                  # ① 预测：前向传播
        l = loss(y_hat, y)              # ② 算损失
        l.sum().backward()              # ③ 反向传播：自动算梯度
        updater(X.shape[0])             # ④ 更新参数：W -= lr × W.grad
        metric.add(float(l.sum()), accuracy(y_hat, y), y.numel())

    return metric[0] / metric[2], metric[1] / metric[2]
    #        训练损失              训练精度
```

**核心四步走：**

```
① net(X)     → 预测（前向传播）
② loss(...)  → 算误差
③ backward() → 算梯度
④ updater()  → 更新参数
```

### 6.10 定义训练函数

```python
def train_ch3(net, train_iter, test_iter, loss, num_epochs, updater):
    """完整的训练流程"""
    animator = d2l.Animator(xlabel='epoch', xlim=[1, num_epochs],
                             legend=['train loss', 'train acc', 'test acc'])

    for epoch in range(num_epochs):
        # 训练一轮
        train_loss, train_acc = train_epoch_ch3(net, train_iter, loss, updater)
        # 测试精度
        test_acc = evaluate_accuracy(net, test_iter)
        # 画图
        animator.add(epoch + 1, (train_loss, train_acc, test_acc))

    print(f'训练损失: {train_loss:.3f}, 训练精度: {train_acc:.3f}, '
          f'测试精度: {test_acc:.3f}')
```

### 6.11 正式开始训练！

```python
lr = 0.1            # 学习率

# 定义更新函数：调用 d2l 封装好的小批量 SGD
def updater(batch_size):
    return d2l.sgd([W, b], lr, batch_size)

num_epochs = 10      # 把全部 60000 张图片看 10 遍

# 开始训练！
train_ch3(net, train_iter, test_iter, cross_entropy, num_epochs, updater)
```

**运行结果：**

```
训练损失: 0.358, 训练精度: 0.872, 测试精度: 0.845
```

**10 轮训练后，测试精度约 85%！** 也就是 100 张没见过的图片，能猜对 85 张。

### 6.12 预测

```python
def predict_ch3(net, test_iter, n=6):
    """显示预测结果"""
    for X, y in test_iter:
        break
    trues = d2l.get_fashion_mnist_labels(y)                # 真实标签
    preds = d2l.get_fashion_mnist_labels(net(X).argmax(axis=1))  # 预测标签
    titles = [true + '\n' + pred for true, pred in zip(trues, preds)]
    d2l.show_images(X[0:n].reshape((n, 28, 28)), 1, n, titles=titles[0:n])

predict_ch3(net, test_iter)
```

输出类似：

```
T恤  → 预测: 套头衫  ❌
裤子  → 预测: 裤子    ✅
运动鞋 → 预测: 运动鞋  ✅
连衣裙 → 预测: T恤    ❌
```

---

## 七、PyTorch 简洁实现

用 PyTorch 自带的工具，代码量减少 90%：

```python
import torch
from torch import nn
from d2l import torch as d2l

# 1. 加载数据
batch_size = 256
train_iter, test_iter = d2l.load_data_fashion_mnist(batch_size)

# 2. 定义模型（一行！）
net = nn.Sequential(
    nn.Flatten(),            # 展平 28×28 → 784
    nn.Linear(784, 10)       # 全连接层：784 输入 → 10 输出
)

# 初始化权重
def init_weights(m):
    if type(m) == nn.Linear:
        nn.init.normal_(m.weight, std=0.01)  # 随机初始化
net.apply(init_weights)

# 3. 损失函数（一行！内置 Softmax + 交叉熵 + 防溢出）
loss = nn.CrossEntropyLoss(reduction='none')

# 4. 优化器（一行！）
trainer = torch.optim.SGD(net.parameters(), lr=0.1)

# 5. 训练
num_epochs = 10
train_ch3(net, train_iter, test_iter, loss, num_epochs, trainer)
```

### 手写 vs 简洁版对比

| 步骤 | 从零手写 | 简洁 API |
|------|---------|---------|
| 定义参数 | `W=torch.normal(...)`, `b=torch.zeros(...)` | `nn.Linear(784,10)` 自动搞定 |
| 模型 | 手写 `softmax(X@W+b)` | `nn.Sequential(...)` |
| 损失函数 | 手写 `-log(概率)` | `nn.CrossEntropyLoss()` |
| 优化器 | 手写 `W-=lr*W.grad` | `torch.optim.SGD(net.parameters(), lr=0.1)` |
| 总代码量 | ~60 行 | ~15 行 |

### 为什么 nn.Linear 和 nn.CrossEntropyLoss 要分开？

```
手写版可能错误地：
  先 softmax → 再取 log → 如果分数大(如50)，exp(50)会溢出！

正确做法：
  nn.CrossEntropyLoss 内部把 softmax 和 log 合并处理，
  用数学技巧避免了数值溢出。
```

---

## 八、训练过程解析

### 8.1 一次 batch 的完整流程

```
输入 256 张图片 (256, 1, 28, 28)
        │
   nn.Flatten()
        │
  (256, 784) ← 每张图变成 784 个数字
        │
   nn.Linear(784, 10)
        │
  (256, 10) ← 每张图变成 10 个分数
        │
  CrossEntropyLoss (内部做 softmax)
        │
  输出：loss 值（一个数字，越小越好）
        │
  loss.backward()
        │
  自动计算 W 和 b 的梯度 W.grad, b.grad
        │
  SGD: W -= 0.1 × W.grad
       b -= 0.1 × b.grad
        │
  完成一次参数更新！
```

### 8.2 10 个 epoch 的损失和精度变化

```
第 1 轮: 损失 1.78, 训练精度 68%,  测试精度 75%
第 2 轮: 损失 0.62, 训练精度 80%,  测试精度 81%
第 3 轮: 损失 0.52, 训练精度 83%,  测试精度 83%
第 4 轮: 损失 0.47, 训练精度 85%,  测试精度 84%
第 5 轮: 损失 0.44, 训练精度 86%,  测试精度 84%
第 6 轮: 损失 0.41, 训练精度 87%,  测试精度 85%
第 7 轮: 损失 0.40, 训练精度 87%,  测试精度 85%
第 8 轮: 损失 0.38, 训练精度 88%,  测试精度 85%
第 9 轮: 损失 0.37, 训练精度 88%,  测试精度 85%
第10轮: 损失 0.36, 训练精度 88%,  测试精度 85%
```

**规律**：
- 损失持续下降 ✅
- 训练精度持续上升 ✅
- 测试精度前几轮涨得快，后面趋于平稳（不再明显提升）

---

## 九、完整对比表

### 9.1 概念对比

| | 线性回归 | Softmax 回归 |
|------|---------|------------|
| 输出含义 | 一个数字（房价） | 每个类的概率 |
| 输出数量 | 1 | 类别数 |
| 标签格式 | 数字（200） | 类别编号（0,1,2,...,9） |
| 模型 | `X@w + b` | `softmax(X@W + b)` |
| 损失函数 | 平方损失 (pred-y)² | 交叉熵 -log(p_correct) |
| 评估指标 | 均方误差 | 精度（正确率） |
| 训练循环 | 预测→算损失→梯度→更新 | **完全一样！** |

### 9.2 代码对比

```python
# ===== 线性回归 =====
W = torch.normal(0, 0.01, size=(2, 1), requires_grad=True)
b = torch.zeros(1, requires_grad=True)

def net(X):
    return X @ W + b                     # 一个输出

def loss(y_pred, y):
    return ((y_pred - y) ** 2) / 2       # 平方损失


# ===== Softmax 回归 =====
W = torch.normal(0, 0.01, size=(784, 10), requires_grad=True)
b = torch.zeros(10, requires_grad=True)

def net(X):
    return softmax(X.reshape((-1, 784)) @ W + b)   # 10 个输出

def loss(y_hat, y):
    return -torch.log(y_hat[range(len(y_hat)), y])  # 交叉熵
```

---

## 十、常见问题解答

### Q1: 如果公式看不懂怎么办？

**先跳过。** 跑代码，看输出，理解"Softmax = 分数变概率"、"交叉熵 = -log(正确率)"就够了。

### Q2: 为什么精度卡在 85% 左右？

因为只用了一层全连接层（线性模型），能力有限。下一章会引入**隐藏层和激活函数（ReLU）**，精度会大幅提升到 95%+。

### Q3: batch_size 为什么是 256？

经验值。太小训练慢，太大显存放不下。256 是一个折中选择。

### Q4: 学习率为什么是 0.1？

试出来的。太大可能不收敛，太小训练慢。实践中通常从 0.1 或 0.01 开始试。

### Q5: `requires_grad=True` 到底做了什么？

```
正常变量： x = torch.tensor([1.0])
           y = x * x  → PyTorch 不管

requires_grad=True:
           x = torch.tensor([1.0], requires_grad=True)
           y = x * x  → PyTorch 在后台建了一张"计算图"
           y.backward() → PyTorch 沿着这张图自动算出导数
           x.grad = 2.0 ← 自动微分的结果
```

---

## 十一、核心要点速查

| 记住这个 | 就行 |
|---------|------|
| Softmax | 分数 → 概率，和为 1 |
| 交叉熵 | -log(正确类的概率)，越小越好 |
| 训练 | 猜 → 算差距 → backward → 更新 → 重复 |
| nn.Linear | 自动创建 W 和 b |
| CrossEntropyLoss | 内置 Softmax + 交叉熵 + 防溢出 |
| SGD | 最基础的优化器 |

---

## 十二、下一步学什么？

1. **第 4 章 多层感知机（MLP）**：加隐藏层 + ReLU 激活函数 → 从"直线"变成"能画任何曲线"
2. **第 6 章 CNN（卷积神经网络）**：不再把所有像素拉平，而是保留图像空间结构
3. **实战 Kaggle 比赛**：用学到的模型去打比赛

---

*全文约 5000 字，基于《动手学深度学习》（D2L）第 3 章。*
